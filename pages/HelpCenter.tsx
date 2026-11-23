import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Phone, Video, VideoOff, Paperclip, Send, X, PhoneOff, Mic, MicOff, Volume2, Image as ImageIcon, CheckCheck, Clock, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { subscribeToWebPush } from '../lib/push';
import SEO from '../components/SEO';
import { audioHelper } from '../lib/AudioHelper';
import { APPLE_SPRING_DEFAULT, APPLE_SPRING_SNAPPY } from '../lib/shoppingRoute';
import { triggerHaptic } from '../lib/haptics';

import { useNotify } from '../components/Notifications';
import { db, auth } from '../firebase';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, collection, addDoc, getDoc, increment, getDocs, deleteDoc } from 'firebase/firestore';

const CallBubble = ({ msg }: { msg: any }) => {
  const isVideo = msg.text?.toLowerCase().includes('video') || msg.systemType === 'video';
  const timestamp = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let icon = <Phone className="w-4 h-4 text-emerald-500" />;
  let title = "Voice Call";
  let subtitle = "Call logged";
  let bgClass = "bg-zinc-100 dark:bg-zinc-800 border-zinc-200/50 dark:border-zinc-700/50";
  let iconBg = "bg-emerald-500/10 dark:bg-emerald-500/20";

  if (isVideo) {
    icon = <Video className="w-4 h-4 text-blue-500" />;
    title = "Video Call";
    iconBg = "bg-blue-500/10 dark:bg-blue-500/20";
  }

  const isMissed = msg.systemType === 'missed' || msg.text?.toLowerCase().includes('missed');
  const isDeclined = msg.systemType === 'declined' || msg.systemType === 'call_declined' || msg.text?.toLowerCase().includes('declined');
  const isEnded = msg.systemType === 'ended' || msg.text?.toLowerCase().includes('ended');
  const isStarted = msg.systemType === 'started' || msg.text?.toLowerCase().includes('started');

  if (isStarted) {
    title = isVideo ? "Video Call Started" : "Voice Call Started";
    subtitle = "Connected";
    iconBg = isVideo ? "bg-blue-500/10 dark:bg-blue-500/20" : "bg-emerald-500/10 dark:bg-emerald-500/20";
    icon = isVideo ? <Video className="w-4 h-4 text-blue-500" /> : <Phone className="w-4 h-4 text-emerald-500" />;
  } else if (isEnded) {
    title = isVideo ? "Video Call Ended" : "Voice Call Ended";
    const dur = msg.duration || msg.text?.split(' - ')[1] || "Ended";
    subtitle = `Duration: ${dur}`;
    iconBg = "bg-zinc-500/10 dark:bg-zinc-500/20";
    icon = <PhoneOff className="w-4 h-4 text-zinc-500" />;
  } else if (isDeclined) {
    title = isVideo ? "Video Call Declined" : "Voice Call Declined";
    subtitle = "Declined";
    iconBg = "bg-red-500/10 dark:bg-red-500/20";
    icon = <PhoneOff className="w-4 h-4 text-red-500" />;
  } else if (isMissed) {
    title = isVideo ? "Missed Video Call" : "Missed Voice Call";
    subtitle = "No answer";
    iconBg = "bg-orange-500/10 dark:bg-orange-500/20";
    icon = <PhoneOff className="w-4 h-4 text-orange-500" />;
  }

  return (
    <div className="flex justify-center my-2 w-full">
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl max-w-xs w-full ds-apple-surface border ${bgClass} transition-shadow`}>
        <div className={`p-2 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#1D1D1F] dark:text-white truncate">{title}</p>
          <p className="text-[11px] ds-apple-muted mt-0.5 font-medium tabular-nums">{subtitle}</p>
        </div>
        <div className="text-[10px] ds-apple-muted self-end shrink-0 tabular-nums">
          {timestamp}
        </div>
      </div>
    </div>
  );
};

const DEPARTMENTS = [
  { id: 'general', name: 'General Support', status: 'Online', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=General' },
  { id: 'tech', name: 'Technical Support', status: 'Online', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tech' },
  { id: 'sales', name: 'Sales & Billing', status: 'Offline', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sales' },
];

const HelpCenter: React.FC = () => {
  const user = auth.currentUser;
  const notify = useNotify();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const query = new URLSearchParams(window.location.search);
  const acceptCallParam = query.get('accept_call') === 'true';
  const deptParam = query.get('dept');
  const typeParam = (query.get('type') || 'audio') as 'audio' | 'video';

  const [activeChat, setActiveChat] = useState(() => {
    if (deptParam) {
      const targetDept = DEPARTMENTS.find(d => d.id === deptParam);
      if (targetDept) return targetDept;
    }
    return DEPARTMENTS[0];
  });
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  
  // Call states
  const [callState, setCallState] = useState<'idle' | 'calling' | 'ringing' | 'incoming' | 'active'>(
    acceptCallParam ? 'active' : 'idle'
  );
  const [callType, setCallType] = useState<'audio' | 'video'>(typeParam);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<any>(null);
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const callStartTimeRef = useRef<number>(Date.now());
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const candidateUnsubRef = useRef<(() => void) | null>(null);
  const offerAnswerUnsubRef = useRef<(() => void) | null>(null);
  
  const callStateRef = useRef(callState);
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const callTypeRef = useRef(callType);
  useEffect(() => {
    callTypeRef.current = callType;
  }, [callType]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream && callType === 'video' && !isVideoOff) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callType, isVideoOff, callState]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream && callType === 'video') {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callType, callState]);

  const toggleVideo = () => {
    if (localStreamRef.current) {
      triggerHaptic('toggle');
      localStreamRef.current.getVideoTracks().forEach(t => t.enabled = isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };
  
  
  useEffect(() => {
    if (callState === 'active') {
      timerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [callState]);

  const formatCallDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const [guestId] = useState(() => {
    let gid = localStorage.getItem('vg_guest_id');
    if (!gid) {
      gid = 'guest_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('vg_guest_id', gid);
    }
    return gid;
  });
  const myId = user?.uid || guestId;
  const chatId = `${myId}_${activeChat.id}`;

  useEffect(() => {
    if (deptParam) {
      const targetDept = DEPARTMENTS.find(d => d.id === deptParam);
      if (targetDept) {
        setActiveChat(targetDept);
      }
    }
  }, [deptParam]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification) {
      window.Notification.requestPermission().then(perm => { if (perm === 'granted') subscribeToWebPush(user?.uid); }).catch(() => {});
    }
  }, [user]);

  const showNotification = (title: string, body: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification && window.Notification.permission === 'granted') {
      try {
        new window.Notification(title, { body, icon: '/favicon.ico' });
      } catch (e) {
        console.warn('Constructing Notification failed, attempting service worker registration fallback...', e);
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, { body, icon: '/favicon.ico' });
          }).catch(err => {
            console.error('Service worker notification failed too', err);
          });
        }
      }
    }
  };

  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    let os = "Unknown OS";
    let browser = "Unknown Browser";
    
    if (ua.indexOf("Win") !== -1) os = "Windows";
    else if (ua.indexOf("Mac") !== -1) os = "macOS";
    else if (ua.indexOf("X11") !== -1) os = "Linux";
    else if (ua.indexOf("Android") !== -1) os = "Android";
    else if (ua.indexOf("iPhone") !== -1) os = "iOS";
    
    if (ua.indexOf("Chrome") !== -1) browser = "Chrome";
    else if (ua.indexOf("Safari") !== -1) browser = "Safari";
    else if (ua.indexOf("Firefox") !== -1) browser = "Firefox";
    else if (ua.indexOf("Edge") !== -1) browser = "Edge";
    
    return `${os} (${browser})`;
  };

  useEffect(() => {
    if (acceptCallParam) {
      const newUrl = window.location.pathname + (deptParam ? `?dept=${deptParam}` : '');
      window.history.replaceState({}, '', newUrl);
      acceptCall();
    }
  }, [acceptCallParam, chatId]);

  useEffect(() => {
    const docRef = doc(db, 'helpline_chats', chatId);
    
    const initChat = async () => {
      let displayName = 'Guest ' + myId.replace('guest_', '').substring(0, 5);
      let email = 'Guest Session';
      
      if (user) {
        try {
          const userSnap = await getDoc(doc(db, 'users', user.uid));
          if (userSnap.exists()) {
            const uData = userSnap.data();
            displayName = uData.displayName || user.displayName || user.email?.split('@')[0] || displayName;
            email = uData.email || user.email || email;
          } else {
            displayName = user.displayName || user.email?.split('@')[0] || displayName;
            email = user.email || email;
          }
        } catch (e) {
          displayName = user.displayName || user.email?.split('@')[0] || displayName;
          email = user.email || email;
        }
      }
      
      const snap = await getDoc(docRef);
      const defaultData: any = {
        userId: myId,
        userName: displayName,
        userEmail: email,
        deviceInfo: getDeviceInfo(),
        updatedAt: Date.now()
      };
      if (!snap.exists()) {
        defaultData.messages = [];
      }
      await setDoc(docRef, defaultData, { merge: true });
    };
    initChat();

    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const newMessages = data.messages || [];
        
        // Check for new messages from agent to notify
        if (newMessages.length > messages.length && messages.length > 0) {
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg.senderId !== myId) {
            showNotification(`New message from ${activeChat.name}`, lastMsg.text || 'Sent an attachment');
          }
        }
        
        setMessages(newMessages);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    });

    // Listen for incoming calls
    const callRef = doc(db, 'helpline_calls', chatId);
    const unsubCall = onSnapshot(callRef, (snap) => {
      const data = snap.data();
      if (!data) return;

      // Ignore stale snapshots from previous calls
      if (data.timestamp && data.timestamp < callStartTimeRef.current) {
        console.log("Ignoring stale call snapshot:", data);
        return;
      }

      const currentCallState = callStateRef.current;

      if (data.callerId !== myId) {
        // Someone else (admin) is calling me (user)
        if (data.status === 'calling') {
          // I am online and active on site! Automatically upgrade status to ringing.
          updateDoc(callRef, { status: 'ringing' }).catch(console.error);
        } else if (data.status === 'ringing' && currentCallState === 'idle') {
          setCallType(data.type);
          setCallState('incoming');
          callStartTimeRef.current = data.timestamp || Date.now();
          audioHelper.playRingtone();
          showNotification('Incoming Call', `Incoming ${data.type} call from ${activeChat.name}`);
        } else if (data.status === 'accepted' && currentCallState === 'calling') {
          setCallState('active');
          audioHelper.stop();
        } else if (data.status === 'ended' && currentCallState !== 'idle') {
          audioHelper.playEndBip();
          endCallLocal();
          notify('Call ended', 'info');
        }
      } else {
        // I (user) initiated the call to the admin
        if (data.status === 'ringing' && currentCallState === 'calling') {
          setCallState('ringing');
          audioHelper.playCalling(); // Play calling ringback feedback tone
        } else if (data.status === 'accepted' && (currentCallState === 'calling' || currentCallState === 'ringing')) {
          setCallState('active');
          audioHelper.stop();
        } else if (data.status === 'ended' && currentCallState !== 'idle') {
          audioHelper.playEndBip();
          endCallLocal();
          notify('Call ended', 'info');
        }
      }
    });

    return () => {
      unsub();
      unsubCall();
      endCallLocal();
    };
  }, [chatId, activeChat]);

  useEffect(() => {
    const isAutoCall = new URLSearchParams(window.location.search).get('autoCall') === 'true';
    if (isAutoCall && myId && callState === 'idle') {
      window.history.replaceState(null, "", window.location.pathname);
      setTimeout(() => {
        startCall('audio');
      }, 1500);
    }
  }, [myId, callState]);

  const sendMessage = async (text: string, imageUrl?: string) => {
    if ((!text.trim() && !imageUrl) || !chatId) return;
    triggerHaptic('light');
    
    const docRef = doc(db, 'helpline_chats', chatId);
    const newMsg = {
      senderId: myId,
      text: text.trim(),
      imageUrl: imageUrl || null,
      timestamp: Date.now()
    };
    
    await updateDoc(docRef, {
      messages: arrayUnion(newMsg),
      unreadCountAdmin: increment(1)
    });
    
      fetch("/api/send-push-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "New Message",
        body: `New message from ${user?.displayName || "a user"}`
      })
    }).catch(console.error);
    
    setInputMsg('');
    
    
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      // Using a public API key for ImgBB (replace in production)
      const res = await fetch('https://api.imgbb.com/1/upload?key=648600c017bc76b0051e5e0a6d213898', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.success) {
        await sendMessage('', data.data.url);
      } else {
        notify('Failed to upload image', 'error');
      }
    } catch (err) {
      console.error(err);
      notify('Upload failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const addSystemCallMessage = async (type: 'started' | 'ended' | 'declined' | 'missed', duration?: string) => {
    if (!chatId) return;
    const docRef = doc(db, 'helpline_chats', chatId);
    const labelMap = {
      started: `Call started (${callType})`,
      ended: `Call ended - ${duration || '00:00'}`,
      declined: `Call declined`,
      missed: `Missed call`
    };
    
    await updateDoc(docRef, {
      messages: arrayUnion({
        senderId: 'system',
        text: labelMap[type],
        isSystem: true,
        systemType: type,
        duration: duration || null,
        timestamp: Date.now()
      })
    }).catch(console.error);
  };

  const clearCallSession = async (cId: string) => {
    try {
      const callRef = doc(db, 'helpline_calls', cId);
      await setDoc(callRef, { status: 'idle' }, { merge: true });
      const candRef = collection(db, 'helpline_calls', cId, 'candidates');
      const snap = await getDocs(candRef);
      const promises = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(promises);
    } catch (e) {
      console.error('Error clearing call session:', e);
    }
  };

  const startCall = async (type: 'audio' | 'video') => {
    triggerHaptic('medium');
    setCallType(type);
    setCallState('calling');
    audioHelper.playCalling();
    const now = Date.now();
    callStartTimeRef.current = now;
    
    try {
      await clearCallSession(chatId);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
      localStreamRef.current = stream;
      setLocalStream(stream);
      
      const callRef = doc(db, 'helpline_calls', chatId);
      await setDoc(callRef, {
        status: 'calling', // Symmetrical presence calling status
        type,
        callerId: myId,
        timestamp: now
      });
      
      await addSystemCallMessage('started');

      setupWebRTC(stream, type, true);
      fetch("/api/send-push-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Incoming Call",
          body: `Incoming ${type} call from ${user?.displayName || "a user"}`
        })
      }).catch(console.error);

    } catch (err) {
      console.error(err);
      notify('Microphone/Camera access denied', 'error');
      setCallState('idle');
    }
  };

  const acceptCall = async () => {
    triggerHaptic('success');
    try {
      const callRef = doc(db, 'helpline_calls', chatId);
      const callSnap = await getDoc(callRef);
      const callData = callSnap.data();
      const actualType = callData?.type || 'audio';
      setCallType(actualType);

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: actualType === 'video' 
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      
      await setDoc(callRef, { status: 'active' }, { merge: true });
      setCallState('active');
      setupWebRTC(stream, actualType, false);
      
    } catch (err) {
      console.error(err);
      notify('Microphone/Camera access denied', 'error');
      declineCall();
    }
  };

  const setupWebRTC = async (stream: MediaStream, type: 'audio' | 'video', isCaller: boolean) => {
    // Clean up any stale subscription
    if (offerAnswerUnsubRef.current) {
      try { offerAnswerUnsubRef.current(); } catch (e) {}
      offerAnswerUnsubRef.current = null;
    }
    if (candidateUnsubRef.current) {
      try { candidateUnsubRef.current(); } catch (e) {}
      candidateUnsubRef.current = null;
    }

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pcRef.current = pc;
    
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    
    pc.ontrack = (event) => {
      const typeStr = typeof type !== 'undefined' ? type : callType;
      const rStream = event.streams[0];
      remoteStreamRef.current = rStream;
      setRemoteStream(rStream);

      if (typeStr === 'video') {
        // Handled by state -> rendering video elements
      } else {
        if (remoteAudioRef.current) {
          try {
            remoteAudioRef.current.pause();
            remoteAudioRef.current.srcObject = null;
          } catch (e) {}
        }
        const audio = new Audio();
        remoteAudioRef.current = audio;
        audio.srcObject = rStream;
        audio.play().catch(console.error);
      }
    };
    
    const callRef = doc(db, 'helpline_calls', chatId);
    const candidateRef = collection(db, 'helpline_calls', chatId, 'candidates');

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(candidateRef, {
          candidate: event.candidate.toJSON(),
          sender: myId
        });
      }
    };

    const queuedCandidates: any[] = [];

    const applyCandidate = async (candidateInit: any) => {
      try {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
        } else {
          queuedCandidates.push(candidateInit);
        }
      } catch (err) {
        console.warn('Error adding ICE candidate:', err);
      }
    };

    const drainCandidates = async () => {
      while (queuedCandidates.length > 0) {
        const cand = queuedCandidates.shift();
        if (cand) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (err) {
            console.warn('Error draining ICE candidate:', err);
          }
        }
      }
    };

    if (isCaller) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await updateDoc(callRef, { offer: { type: offer.type, sdp: offer.sdp } });
      
      const unsubOfferAnswer = onSnapshot(callRef, async (snap) => {
        const data = snap.data();
        if (data?.answer && !pc.currentRemoteDescription) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            await drainCandidates();
          } catch (err) {
            console.error('Error setting remote description:', err);
          }
        }
      });
      offerAnswerUnsubRef.current = unsubOfferAnswer;
    } else {
      const snap = await getDoc(callRef);
      const data = snap.data();
      if (data?.offer) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          await drainCandidates();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await updateDoc(callRef, { answer: { type: answer.type, sdp: answer.sdp } });
        } catch (err) {
          console.error('Error setting remote description:', err);
        }
      }
    }

    const unsubCand = onSnapshot(candidateRef, (snap) => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data.sender !== myId) {
            applyCandidate(data.candidate);
          }
        }
      });
    });
    candidateUnsubRef.current = unsubCand;
  };

  const declineCall = async () => {
    triggerHaptic('warning');
    endCallLocal();
    const callRef = doc(db, 'helpline_calls', chatId);
    try {
      const snap = await getDoc(callRef);
      if (snap.exists()) {
        const cData = snap.data();
        if (cData.status === 'ringing' || cData.status === 'calling') {
          if (cData.callerId === myId) {
            await addSystemCallMessage('missed');
          } else {
            await addSystemCallMessage('declined');
          }
        } else if (callState === 'active') {
          await addSystemCallMessage('ended', formatCallDuration(callDuration));
        }
      }
    } catch (e) {
      console.error(e);
    }
    await setDoc(callRef, { status: 'ended', timestamp: Date.now() }, { merge: true });
  };

  const endCallLocal = () => {
    audioHelper.stop();
    
    // Stop local tracks
    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      } catch (e) {}
      localStreamRef.current = null;
    }
    setLocalStream(null);

    // Stop remote tracks
    if (remoteStreamRef.current) {
      try {
        remoteStreamRef.current.getTracks().forEach(t => t.stop());
      } catch (e) {}
      remoteStreamRef.current = null;
    }
    setRemoteStream(null);

    // Pause remote audio
    if (remoteAudioRef.current) {
      try {
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
      } catch (e) {}
      remoteAudioRef.current = null;
    }

    // Unsubscribe from candidates snapshot
    if (candidateUnsubRef.current) {
      try {
        candidateUnsubRef.current();
      } catch (e) {}
      candidateUnsubRef.current = null;
    }

    // Unsubscribe from offer/answer snapshot
    if (offerAnswerUnsubRef.current) {
      try {
        offerAnswerUnsubRef.current();
      } catch (e) {}
      offerAnswerUnsubRef.current = null;
    }

    if (pcRef.current) {
      try {
        pcRef.current.getSenders().forEach(sender => {
          if (sender.track) {
            try { sender.track.stop(); } catch (e) {}
          }
        });
        pcRef.current.getReceivers().forEach(receiver => {
          if (receiver.track) {
            try { receiver.track.stop(); } catch (e) {}
          }
        });
        pcRef.current.close();
      } catch (e) {}
    }
    pcRef.current = null;
    
    callStartTimeRef.current = Date.now(); // Ignore any late snapshots from the previous call
    setCallState('idle');
    setIsMuted(false);
    setIsSpeaker(false);
    setIsVideoOff(false);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      triggerHaptic('toggle');
      localStreamRef.current.getAudioTracks().forEach(t => t.enabled = isMuted);
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="ds-apple-shop-canvas h-[100dvh] bg-[#F5F5F7] dark:bg-black w-full flex flex-col">
      <SEO title="Helpline | DEEP SHOP" description="Live support and help center." />
      
      <div className="w-full h-full flex">
        <div className="bg-[#F5F5F7] dark:bg-black h-full w-full flex overflow-hidden">
          
          {/* Left Sidebar - Department List */}
          <div className="w-full md:w-80 border-r border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#1C1C1E] flex-col hidden md:flex">
            <div className="p-6 border-b border-black/[0.06] dark:border-white/[0.08]">
              <p className="ds-apple-eyebrow">Support</p>
              <h2 className="text-xl font-semibold text-[#1D1D1F] dark:text-white tracking-[-0.02em] mt-0.5">DEEP SHOP Helpline</h2>
              <p className="text-xs ds-apple-muted font-medium mt-1">Live Support & Audio/Video Care</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
              {DEPARTMENTS.map((dept) => {
                const isSelected = activeChat.id === dept.id;
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      setActiveChat(dept);
                    }}
                    className={`w-full p-3.5 rounded-2xl flex items-center gap-3.5 transition-all cursor-pointer active:scale-[0.98] ${
                      isSelected
                        ? 'bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 ring-1 ring-[#0071E3]/25 dark:ring-[#0A84FF]/30'
                        : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img src={dept.avatar} alt={dept.name} className="w-11 h-11 rounded-full bg-[#F5F5F7] dark:bg-[#2C2C2E]" />
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#1C1C1E] ${dept.status === 'Online' ? 'bg-emerald-500' : 'bg-[#8E8E93]'}`} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <h3 className={`font-semibold text-sm truncate ${isSelected ? 'text-[#0071E3] dark:text-[#0A84FF]' : 'text-[#1D1D1F] dark:text-white'}`}>{dept.name}</h3>
                      <p className="text-xs ds-apple-muted truncate mt-0.5">{dept.status === 'Online' ? 'Typically replies instantly' : 'Currently offline'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Area - Chat Window */}
          <div className="flex-1 flex flex-col bg-[#F5F5F7] dark:bg-black relative">
            {/* Chat Header */}
            <header className="ds-apple-topbar h-16 px-4 sm:px-6 flex items-center justify-between z-10 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    navigate('/');
                  }}
                  className="ds-apple-icon-btn w-10 h-10 flex items-center justify-center shrink-0"
                  aria-label="Back to Store"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="relative shrink-0">
                  <img src={activeChat.avatar} alt={activeChat.name} className="w-10 h-10 rounded-full bg-black/[0.05] dark:bg-white/[0.08]" />
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#1C1C1E] ${activeChat.status === 'Online' ? 'bg-emerald-500' : 'bg-[#8E8E93]'}`} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-[#1D1D1F] dark:text-white text-sm sm:text-[15px] tracking-[-0.01em] truncate">{activeChat.name}</h3>
                  <p className={`text-xs font-medium ${activeChat.status === 'Online' ? 'text-emerald-600 dark:text-emerald-400' : 'ds-apple-muted'}`}>{activeChat.status}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => startCall('audio')}
                  disabled={activeChat.status !== 'Online' || callState !== 'idle'}
                  className="ds-apple-icon-btn w-10 h-10 flex items-center justify-center disabled:opacity-40"
                  aria-label="Start Audio Call"
                >
                  <Phone className="w-4.5 h-4.5" />
                </button>
              </div>
            </header>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-3.5">
              <div className="text-center my-3">
                <span className="ds-apple-surface-subtle text-[#6E6E73] dark:text-[#98989D] text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full">Today</span>
              </div>
              
              <div className="flex justify-start">
                <div className="ds-apple-surface text-[#1D1D1F] dark:text-[#F5F5F7] px-4 py-3 rounded-[20px] rounded-tl-md max-w-[78%] text-sm leading-relaxed">
                  <p>Welcome to DEEP SHOP Helpline! I'm your assistant from {activeChat.name}. How can I help you today?</p>
                  <p className="text-[10px] ds-apple-muted text-right mt-1 tabular-nums">{formatTime(Date.now())}</p>
                </div>
              </div>

              {messages.map((msg, i) => {
                if (msg.senderId === 'system' || msg.isSystem) {
                  return <CallBubble key={i} msg={msg} />;
                }
                const isMe = msg.senderId === myId;
                return (
                  <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`px-4 py-2.5 rounded-[20px] max-w-[78%] text-sm leading-relaxed ${
                        isMe
                          ? 'bg-[#0071E3] dark:bg-[#0A84FF] text-white rounded-tr-md shadow-sm'
                          : 'ds-apple-surface text-[#1D1D1F] dark:text-[#F5F5F7] rounded-tl-md'
                      }`}
                    >
                      {msg.imageUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setPreviewImageUrl(msg.imageUrl);
                          }}
                          className="block mb-2 rounded-xl overflow-hidden cursor-pointer hover:opacity-95 active:scale-[0.99] transition-transform"
                        >
                          <img src={msg.imageUrl} alt="Attachment" className="max-w-full max-h-64 object-cover rounded-xl" />
                        </button>
                      )}
                      {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className={`text-[10px] tabular-nums ${isMe ? 'text-white/75' : 'ds-apple-muted'}`}>{formatTime(msg.timestamp)}</span>
                        {isMe && <CheckCheck className="w-3.5 h-3.5 text-white/90" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="ds-apple-topbar border-t border-black/[0.06] dark:border-white/[0.08] border-b-0 px-3 sm:px-5 py-3 flex items-center gap-2.5 shrink-0">
              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                accept="image/*"
                onChange={handleImageUpload}
              />
              <label
                htmlFor="file-upload"
                onClick={() => triggerHaptic('light')}
                className={`ds-apple-icon-btn w-10 h-10 flex items-center justify-center cursor-pointer shrink-0 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {isUploading ? <div className="w-4 h-4 border-2 border-[#0071E3] border-t-transparent rounded-full animate-spin" /> : <Paperclip className="w-4.5 h-4.5" />}
              </label>
              
              <div className="flex-1 ds-apple-input rounded-full min-h-[42px] flex items-center px-4">
                <input
                  type="text"
                  value={inputMsg}
                  onChange={e => setInputMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage(inputMsg)}
                  placeholder="Type a message..."
                  className="w-full bg-transparent border-none outline-none text-sm text-[#1D1D1F] dark:text-white placeholder:text-[#8E8E93]"
                />
              </div>
              
              <button 
                type="button"
                onClick={() => sendMessage(inputMsg)}
                disabled={!inputMsg.trim() && !isUploading}
                className="w-10 h-10 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] text-white flex items-center justify-center shadow-sm hover:opacity-95 active:scale-95 transition-all disabled:opacity-40 cursor-pointer shrink-0"
                aria-label="Send Message"
              >
                <Send className="w-4.5 h-4.5 ml-0.5" />
              </button>
            </div>

            {/* Call Overlay */}
            <AnimatePresence>
              {callState !== 'idle' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={prefersReducedMotion ? { duration: 0.16 } : APPLE_SPRING_DEFAULT}
                  onClick={() => setShowControls(p => !p)}
                  className="absolute inset-0 bg-black/92 backdrop-blur-2xl z-50 flex flex-col"
                >
                  {/* Call Header */}
                  <AnimatePresence>
                    {showControls && (
                      <motion.div
                        initial={prefersReducedMotion ? { opacity: 0 } : { y: -16, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { y: -16, opacity: 0 }}
                        transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_SNAPPY}
                        className="p-8 text-center mt-10"
                      >
                        <img src={activeChat.avatar} alt="Avatar" className="w-24 h-24 rounded-full mx-auto mb-4 bg-[#1C1C1E] border-2 border-white/15 shadow-lg" />
                        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-white">{activeChat.name}</h2>
                        <p className="text-[#0A84FF] mt-2 text-sm font-medium tracking-wide uppercase tabular-nums">
                          {callState === 'calling' && 'Calling Support...'}
                          {callState === 'ringing' && 'Ringing...'}
                          {callState === 'incoming' && 'Incoming Call...'}
                          {callState === 'active' && formatCallDuration(callDuration)}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Video Area (if active video call) */}
                  {(callState === 'active' || callState === 'calling' || callState === 'ringing' || callState === 'incoming') && callType === 'video' && (
                    <div className="flex-1 relative p-4 flex items-center justify-center bg-black">
                      <video 
                        ref={(el) => {
                          remoteVideoRef.current = el;
                          if (el && remoteStream) {
                            el.srcObject = remoteStream;
                          }
                        }} 
                        autoPlay 
                        playsInline 
                        className="w-full h-full object-cover rounded-[24px] bg-[#1C1C1E]" 
                      />
                      
                      <div className="absolute bottom-8 right-8 w-32 h-48 rounded-[20px] overflow-hidden border border-white/20 bg-[#1C1C1E] shadow-2xl">
                        {isVideoOff ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-[#1C1C1E] text-[#8E8E93] text-xs gap-2">
                            <VideoOff className="w-5 h-5 text-[#8E8E93]" />
                            <span>Video Off</span>
                          </div>
                        ) : (
                          <video 
                            ref={(el) => {
                              localVideoRef.current = el;
                              if (el && localStream) {
                                el.srcObject = localStream;
                              }
                            }} 
                            autoPlay 
                            playsInline 
                            muted 
                            className="w-full h-full object-cover" 
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Controls */}
                  <AnimatePresence>
                    {showControls && (
                      <motion.div
                        initial={prefersReducedMotion ? { opacity: 0 } : { y: 32, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { y: 32, opacity: 0 }}
                        transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_SNAPPY}
                        onClick={e => e.stopPropagation()}
                        className="mt-auto p-10 flex justify-center gap-5"
                      >
                        {callState === 'incoming' ? (
                          <>
                            <button type="button" onClick={declineCall} className="w-14 h-14 rounded-full bg-[#FF3B30] text-white flex items-center justify-center active:scale-95 transition-transform shadow-lg">
                              <PhoneOff className="w-6 h-6" />
                            </button>
                            <button type="button" onClick={acceptCall} className="w-14 h-14 rounded-full bg-[#34C759] text-white flex items-center justify-center active:scale-95 transition-transform shadow-lg">
                              <Phone className="w-6 h-6" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center active:scale-95 transition-all ${isMuted ? 'bg-white text-black' : 'bg-[#2C2C2E] text-white hover:bg-[#3A3A3C]'}`}>
                              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                            </button>
                            
                            {callType === 'video' && (
                              <button type="button" onClick={toggleVideo} className={`w-14 h-14 rounded-full flex items-center justify-center active:scale-95 transition-all ${isVideoOff ? 'bg-[#FF3B30] text-white' : 'bg-[#2C2C2E] text-white hover:bg-[#3A3A3C]'}`}>
                                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('toggle');
                                setIsSpeaker(!isSpeaker);
                              }}
                              className={`w-14 h-14 rounded-full flex items-center justify-center active:scale-95 transition-all ${isSpeaker ? 'bg-white text-black' : 'bg-[#2C2C2E] text-white hover:bg-[#3A3A3C]'}`}
                            >
                              <Volume2 className="w-6 h-6" />
                            </button>

                            <button type="button" onClick={declineCall} className="w-14 h-14 rounded-full bg-[#FF3B30] text-white flex items-center justify-center active:scale-95 transition-transform shadow-lg ml-2">
                              <PhoneOff className="w-6 h-6" />
                            </button>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>

      {/* Portaled Image Lightbox Modal */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {previewImageUrl && (
              <div className="ds-apple-portal fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => setPreviewImageUrl(null)}
                  className="ds-apple-backdrop fixed inset-0"
                />
                <motion.div
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                  transition={prefersReducedMotion ? { duration: 0.15 } : APPLE_SPRING_DEFAULT}
                  className="ds-apple-modal relative z-10 max-w-2xl w-full p-3 sm:p-4 overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-semibold ds-apple-muted flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" />
                      Attachment Preview
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setPreviewImageUrl(null);
                      }}
                      className="ds-apple-icon-btn w-8 h-8 flex items-center justify-center"
                      aria-label="Close Preview"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <img
                    src={previewImageUrl}
                    alt="Attachment Preview"
                    className="w-full max-h-[75vh] object-contain rounded-[16px] bg-black/5 dark:bg-black/40"
                  />
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

export default HelpCenter;
