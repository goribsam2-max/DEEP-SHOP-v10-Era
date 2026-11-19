import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { Users, Phone, PhoneOff, Mic, MicOff, X, Send, MousePointer2 } from 'lucide-react';
import { useNotify } from './Notifications';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, getDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { APPLE_SPRING_DEFAULT, APPLE_SPRING_SNAPPY } from '../lib/shoppingRoute';
import { triggerHaptic } from '../lib/haptics';

const LiveCoShopping = () => {
  const prefersReducedMotion = useReducedMotion();
  const [isActive, setIsActive] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<{senderId: string, senderName: string, text: string}[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [friends, setFriends] = useState<{id: string, name: string, scrollY: number}[]>([]);
  
  const location = useLocation();
  const notify = useNotify();
  const searchParams = new URLSearchParams(location.search);
  const isSession = searchParams.get('session');
  
  const myIdRef = useRef(Math.random().toString(36).substring(7));
  const sessionIdRef = useRef(isSession || '');
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
    if (isSession) {
      setIsActive(true);
      setIsOpen(true);
      joinSession(isSession);
    }
  }, [isSession]);

  const joinSession = async (id: string) => {
    sessionIdRef.current = id;
    const docRef = doc(db, 'co_shopping_sessions', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, { messages: [], users: {} });
    }
    
    await updateDoc(docRef, {
      [`users.${myIdRef.current}`]: { name: isSession ? 'Friend' : 'Host', scrollY: window.scrollY, lastActive: Date.now() }
    });

    onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMessages(data.messages || []);
        
        const otherUsers = Object.entries(data.users || {})
          .filter(([uid]) => uid !== myIdRef.current)
          .map(([uid, val]: [string, any]) => ({ id: uid, name: val.name, scrollY: val.scrollY || 0 }));
          
        setFriends(otherUsers);
      }
    });

    const handleScroll = () => {
      updateDoc(docRef, {
        [`users.${myIdRef.current}.scrollY`]: window.scrollY
      });
    };
    
    let scrollTimeout: any;
    window.addEventListener('scroll', () => {
      if (scrollTimeout) return;
      scrollTimeout = setTimeout(() => {
        handleScroll();
        scrollTimeout = null;
      }, 500);
    });
  };

  const handleInvite = async () => {
    const newSessionId = Math.random().toString(36).substring(7);
    sessionIdRef.current = newSessionId;
    const url = window.location.origin + window.location.pathname + '?session=' + newSessionId;
    navigator.clipboard.writeText(url);
    notify('Invite link copied! Send it to your friend.', 'success');
    setIsActive(true);
    setIsOpen(true);
    
    const docRef = doc(db, 'co_shopping_sessions', newSessionId);
    await setDoc(docRef, { messages: [], users: {} });
    joinSession(newSessionId);
  };

  const sendMessage = async () => {
    if (!inputMsg.trim() || !sessionIdRef.current) return;
    
    const docRef = doc(db, 'co_shopping_sessions', sessionIdRef.current);
    await updateDoc(docRef, {
      messages: arrayUnion({ senderId: myIdRef.current, senderName: isSession ? 'Friend' : 'You', text: inputMsg })
    });
    
    setInputMsg('');
  };

  const startCall = async () => {
    if (!sessionIdRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setInCall(true);
      setIsMuted(false);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }]
      });
      pcRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        const remoteAudio = new Audio();
        remoteAudio.autoplay = true;
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.play().catch(e => console.error("Audio play error", e));
      };

      const callDocRef = doc(db, 'co_shopping_sessions', sessionIdRef.current, 'calls', 'voice');
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(collection(db, 'co_shopping_sessions', sessionIdRef.current, 'calls', 'voice', 'candidates'), {
            candidate: event.candidate.toJSON(),
            sender: myIdRef.current
          });
        }
      };

      if (!isSession) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await setDoc(callDocRef, { offer: { type: offer.type, sdp: offer.sdp } });
        
        onSnapshot(callDocRef, (snap) => {
          const data = snap.data();
          if (data?.answer && !pc.currentRemoteDescription) {
            const rtcAnswer = new RTCSessionDescription(data.answer);
            pc.setRemoteDescription(rtcAnswer).catch(console.error);
          }
        });
      } else {
        const snap = await getDoc(callDocRef);
        const data = snap.data();
        if (data?.offer) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await updateDoc(callDocRef, { answer: { type: answer.type, sdp: answer.sdp } });
        } else {
          onSnapshot(callDocRef, async (s) => {
            const d = s.data();
            if (d?.offer && !pc.currentRemoteDescription) {
              await pc.setRemoteDescription(new RTCSessionDescription(d.offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await updateDoc(callDocRef, { answer: { type: answer.type, sdp: answer.sdp } });
            }
          });
        }
      }

      onSnapshot(collection(db, 'co_shopping_sessions', sessionIdRef.current, 'calls', 'voice', 'candidates'), (snap) => {
        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (data.sender !== myIdRef.current) {
              pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(console.error);
            }
          }
        });
      });
    } catch (err) {
      console.error("Mic error:", err);
      notify("Microphone access denied or error.", "error");
    }
  };

  const endCall = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    setInCall(false);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks()[0].enabled = isMuted;
      setIsMuted(!isMuted);
    }
  };

  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pcRef.current?.close();
    };
  }, []);

  const isAllowedPage = location.pathname === "/" || location.pathname.startsWith("/product/");
  if (!isActive && !isSession && !isAllowedPage) return null;

  if (!isActive && !isSession) {
    return (
      <div className="fixed bottom-24 right-4 z-[90]">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            handleInvite();
          }}
          className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.1] dark:border-white/[0.14] p-3.5 rounded-full shadow-[0_10px_28px_rgba(0,0,0,0.14)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
          aria-label="Start Co-Shopping"
        >
          <Users className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <>
      {friends.map(f => (
        <motion.div
          key={f.id}
          animate={{ y: f.scrollY - window.scrollY + (window.innerHeight / 2) }}
          transition={prefersReducedMotion ? { duration: 0.1 } : APPLE_SPRING_SNAPPY}
          className="fixed right-2 z-[80] pointer-events-none flex items-center gap-1 opacity-85"
        >
          <div className="bg-[#0071E3] dark:bg-[#0A84FF] text-white text-[10px] px-2.5 py-1 rounded-full font-semibold shadow-md whitespace-nowrap">
            {f.name} here
          </div>
          <MousePointer2 className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF] fill-current" />
        </motion.div>
      ))}

      <div className="fixed bottom-24 right-4 z-[90] flex flex-col items-end pointer-events-none">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.94 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
              transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_DEFAULT}
              className="bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl w-80 rounded-[26px] shadow-[0_24px_60px_rgba(0,0,0,0.2)] border border-black/[0.08] dark:border-white/[0.12] mb-4 overflow-hidden flex flex-col pointer-events-auto h-[400px]"
            >
              <div className="bg-[#F5F5F7]/90 dark:bg-[#2C2C2E]/85 backdrop-blur-xl px-4 py-3.5 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                      {friends.length > 0 ? friends[0].name.charAt(0) : 'F'}
                    </div>
                    {friends.length > 0 && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#30D158] border-2 border-white dark:border-[#1C1C1E] rounded-full"></div>
                    )}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight tracking-[-0.01em]">
                      Co-Shopping
                    </p>
                    <p className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6] font-medium">
                      {friends.length > 0 ? 'Online' : 'Waiting...'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {!inCall ? (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('medium');
                        startCall();
                      }}
                      className="p-2 rounded-full bg-[#248A3D]/12 text-[#248A3D] dark:bg-[#30D158]/18 dark:text-[#30D158] hover:opacity-85 active:scale-95 transition-all cursor-pointer"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          toggleMute();
                        }}
                        className={`p-2 rounded-full transition-all active:scale-95 cursor-pointer ${
                          isMuted
                            ? 'bg-[#FF9500]/15 text-[#FF9500]'
                            : 'bg-black/[0.07] dark:bg-white/[0.12] text-[#1D1D1F] dark:text-[#F5F5F7]'
                        }`}
                      >
                        {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('medium');
                          endCall();
                        }}
                        className="p-2 rounded-full bg-[#FF3B30]/12 text-[#FF3B30] dark:bg-[#FF453A]/18 dark:text-[#FF453A] active:scale-95 transition-all cursor-pointer"
                      >
                        <PhoneOff className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setIsOpen(false);
                    }}
                    className="p-2 rounded-full bg-black/[0.06] dark:bg-white/[0.1] text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F] dark:hover:text-white active:scale-95 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-[#1C1C1E] relative">
                {inCall && (
                  <div className="sticky top-0 mb-3 bg-[#248A3D]/10 dark:bg-[#30D158]/15 border border-[#248A3D]/20 text-[#248A3D] dark:text-[#30D158] text-[11px] font-semibold text-center py-1.5 rounded-full flex items-center justify-center gap-1.5 backdrop-blur-md">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse" /> Call in progress
                  </div>
                )}
                {messages.length === 0 && (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-[#86868B] text-xs font-medium">
                      Send a message to your friend
                    </div>
                  </div>
                )}
                {messages.map((m, i) => {
                  const isMe = m.senderId === myIdRef.current;
                  return (
                    <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`px-3.5 py-2 rounded-[18px] text-[13px] max-w-[85%] ${
                          isMe
                            ? 'bg-[#0071E3] dark:bg-[#0A84FF] text-white rounded-br-[4px]'
                            : 'bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] rounded-bl-[4px]'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 border-t border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] flex gap-2">
                <input
                  value={inputMsg}
                  onChange={e => setInputMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Message..."
                  className="flex-1 bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] rounded-full px-4 py-2 text-[13px] outline-none text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B]"
                />
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    sendMessage();
                  }}
                  disabled={!inputMsg.trim()}
                  className={`p-2.5 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                    inputMsg.trim()
                      ? 'bg-[#0071E3] dark:bg-[#0A84FF] text-white cursor-pointer'
                      : 'bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#86868B]'
                  }`}
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2 pointer-events-auto">
          {!isOpen && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsOpen(true);
              }}
              className="bg-[#0071E3] dark:bg-[#0A84FF] text-white px-5 py-3 rounded-full shadow-[0_12px_32px_rgba(0,113,227,0.34)] flex items-center justify-center gap-2 hover:scale-[1.03] active:scale-[0.96] transition-all cursor-pointer"
            >
              {inCall && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
              <Users className="w-4 h-4" />
              <span className="text-[13px] font-semibold">Co-Shopping</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default LiveCoShopping;
