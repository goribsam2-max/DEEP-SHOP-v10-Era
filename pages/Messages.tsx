import { uploadToImgbb } from '../services/imgbb';
import { VerifiedIcon } from '../components/SellerBadge';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Video, VideoOff, Paperclip, Send, X, PhoneOff, Mic, MicOff, Volume2, Image as ImageIcon, CheckCheck, Clock, ChevronLeft, ArrowLeft, User, Search, AlertCircle, MessageSquareShare, MessageSquare, Star, Sparkles, Plus, Users, Pin, PinOff, VolumeX, Forward, Edit, Edit3, MoreVertical, MoreHorizontal, Link, Info, Trash, UserPlus, UserX, UserMinus, ChevronRight, Radio, LogOut, Settings, Trash2, Minimize2, Maximize2, Shield, ShieldAlert, Eye, EyeOff, Bell, CornerUpLeft, Mail, Copy, Loader2, Activity, Lock, MessageCircle } from 'lucide-react';
import { isScamReview, filterSafeReviews } from '../lib/reviewModeration';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { subscribeToWebPush } from '../lib/push';
import SEO from '../components/SEO';
import { audioHelper } from '../lib/AudioHelper';
import { useNotify } from '../components/Notifications';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, addDoc, getDoc, query, where, orderBy, serverTimestamp, getDocs, limit, deleteDoc, writeBatch } from 'firebase/firestore';
import { cn, formatDisplayEmail } from '../lib/utils';
import { checkContainsBannedWord } from '../lib/wordFilter';
import VoiceMessageBubble from '../components/ui/voice-message-bubble';
import Icon from '../components/Icon';
import { useIllustrations } from '../lib/useIllustrations';
import { SavedRepliesModal, SavedReply } from '../components/chat/SavedRepliesModal';
import { ChatDrawModal } from '../components/chat/ChatDrawModal';
import { ChatGifStickerModal } from '../components/chat/ChatGifStickerModal';
import { ChatThemeModal, CHAT_THEMES, ChatTheme } from '../components/chat/ChatThemeModal';
import { ChatUserProfileModal } from '../components/chat/ChatUserProfileModal';
import { EmptyChatState } from '../components/chat/EmptyChatState';
import { GroupDetailsModal } from '../components/chat/GroupDetailsModal';
import { InstagramNotesBar } from '../components/chat/InstagramNotesBar';
import { ChatBottomBar } from '../components/chat/ChatBottomBar';
import { NewMessageModal } from '../components/chat/NewMessageModal';

const isOnlyEmojis = (str: string) => {
    if (!str) return false;
    const noEmojis = str.replace(/[\p{Emoji_Presentation}\p{Emoji}️]/gu, '').trim();
    return noEmojis.length === 0 && str.trim().length > 0;
};

const formatDateSeparator = (timestamp: any) => {
    if (!timestamp) return '';
    const date = new Date(typeof timestamp.toMillis === 'function' ? timestamp.toMillis() : timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
};

const formatTime12h = (timestamp: any) => {
  if (!timestamp) return "";
  let ms = timestamp;
  if (typeof timestamp === 'object') {
    if (typeof timestamp.toMillis === 'function') {
      ms = timestamp.toMillis();
    } else if (timestamp.seconds) {
      ms = timestamp.seconds * 1000;
    } else {
      ms = Date.now();
    }
  }
  const date = new Date(ms);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
};

const ALL_EMOJIS = ['👍', '❤️', '😂', '🥰', '😡', '😮', '😢', '👏', '🎉', '🔥', '💖', '👀', '💯', '🙌', '⭐', '✨', '🤩', '💡', '🤔', '😎', '😜', '🚀', '🌈', '⚡'];

const getLastActiveText = (presence: any) => {
  if (!presence) return "last seen recently";
  if (presence.isOnline) return "online";
  if (!presence.lastActive) return "last seen recently";
  
  let lastActiveMs = 0;
  if (typeof presence.lastActive === 'number') {
    lastActiveMs = presence.lastActive;
  } else if (presence.lastActive?.toMillis) {
    lastActiveMs = presence.lastActive.toMillis();
  } else if (presence.lastActive?.seconds) {
    lastActiveMs = presence.lastActive.seconds * 1000;
  } else {
    lastActiveMs = new Date(presence.lastActive).getTime();
  }

  if (isNaN(lastActiveMs) || lastActiveMs <= 0) return "last seen recently";

  const diffMs = Date.now() - lastActiveMs;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "last seen just now";
  
  const lastActiveDate = new Date(lastActiveMs);
  const timeStr = lastActiveDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  
  const today = new Date();
  if (lastActiveDate.toDateString() === today.toDateString()) {
    return `last seen ${timeStr}`;
  }
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (lastActiveDate.toDateString() === yesterday.toDateString()) {
    return `last seen yesterday ${timeStr}`;
  }
  return `last seen ${lastActiveDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
};

const LinkPreviewCard = ({ text }: { text: string }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const match = text.match(urlRegex);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!match || match.length === 0) return;
    const url = match[0];
    setLoading(true);
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then(res => res.json())
      .then(data => {
        if (data && (data.title || data.description || data.image)) {
          setPreview(data);
        }
      })
      .catch(err => console.error("Link preview fetch failed:", err))
      .finally(() => setLoading(false));
  }, [text]);

  if (!preview) return null;

  return (
    <a 
      href={preview.url} 
      target="_blank" 
      referrerPolicy="no-referrer"
      rel="noopener noreferrer" 
      className="mt-2 block bg-zinc-50 dark:bg-white dark:bg-zinc-200 dark:bg-zinc-800/80 shadow-sm dark:shadow-none border border-zinc-200 dark:border-zinc-300 dark:border-zinc-700 rounded-xl overflow-hidden shadow-sm hover:opacity-90 transition-opacity max-w-sm"
    >
      {preview.image && (
        <img src={preview.image} alt={preview.title} className="w-full h-32 object-cover border-b border-zinc-200 dark:border-zinc-300 dark:border-zinc-700" referrerPolicy="no-referrer" />
      )}
      <div className="p-3 text-left">
        <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400">{preview.domain || "Preview"}</span>
        <h5 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 line-clamp-1 mt-0.5">{preview.title}</h5>
        {preview.description && (
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1 leading-normal">{preview.description}</p>
        )}
      </div>
    </a>
  );
};

const getSenderColor = (idOrName: string = '') => {
  const colors = [
    'text-emerald-600 dark:text-emerald-400',
    'text-blue-600 dark:text-blue-400',
    'text-purple-600 dark:text-purple-400',
    'text-amber-600 dark:text-amber-400',
    'text-rose-600 dark:text-rose-400',
    'text-cyan-600 dark:text-cyan-400',
    'text-indigo-600 dark:text-indigo-400',
    'text-teal-600 dark:text-teal-400',
  ];
  let hash = 0;
  for (let i = 0; i < idOrName.length; i++) {
    hash = (hash << 5) - hash + idOrName.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
};

const renderTextWithLinks = (text: string, isMe?: boolean) => {
  if (!text) return "";
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const parts = text.split(urlRegex);
  if (parts.length === 1) return text;
  
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={i} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          className={`underline break-all font-bold ${isMe ? 'text-white hover:text-indigo-100' : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

const CallBubble = ({ msg }: { msg: any }) => {
  const isVideo = msg.text?.toLowerCase().includes('video') || msg.systemType === 'video';
  const timestamp = formatTime12h(msg.timestamp);
  let icon = <Icon name="phone" className="w-4 h-4 text-emerald-500" />;
  let title = "Voice Call";
  let subtitle = "Call logged";
  let bgClass = "bg-zinc-100 dark:bg-zinc-200 dark:bg-zinc-800 border-zinc-200/50 dark:border-zinc-300 dark:border-zinc-700/50";

  if (msg.text?.includes('Missed')) {
      icon = <Icon name="phone-off" className="w-4 h-4 text-rose-500" />;
      title = "Missed Call";
      bgClass = "bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/20";
  } else if (isVideo) {
      icon = <Icon name="video" className="w-4 h-4 text-blue-500" />;
      title = "Video Call";
  }

  return (
      <div className={`flex items-center gap-3 p-3 rounded-2xl border ${bgClass} w-64 my-1`}>
          <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center shadow-sm shrink-0">
             {icon}
          </div>
          <div className="flex-1 min-w-0">
             <p className="font-semibold text-[13px] text-zinc-900 dark:text-zinc-100">{title}</p>
             <p className="text-[11px] text-zinc-500">{subtitle}</p>
          </div>
          <span className="text-[9px] font-bold text-zinc-400 mt-auto">{timestamp}</span>
  
  
    </div>
  );
};

export default function Messages() {
  const [user, setUser] = useState<any>(auth.currentUser);
  const illustrations = useIllustrations();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // activeMessagesTab is now synchronized with search parameter tab=settings
  const [isOnlineSectionVisible, setIsOnlineSectionVisible] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [privacySettings, setPrivacySettings] = useState({
    allowDirectMessages: true,
    showOnlineStatus: true,
    pushNotifications: true,
    // Security
    biometricLock: false,
    disappearingMessages: false,
    // Design
    liquidGlassMode: true,
    highContrastFonts: false,
    minimalistBubbles: false,
    // Chat Features
    smartQuickReplies: true,
    hapticTouchFeedback: true,
    autoPlayVoice: true,
    // Other Features
    dataSaverMode: false,
    doNotDisturb: false,
  });

  const notify = useNotify();

  useEffect(() => {
    if (currentUserProfile?.privacy) {
      setPrivacySettings({
        allowDirectMessages: currentUserProfile.privacy.allowDirectMessages !== false,
        showOnlineStatus: currentUserProfile.privacy.showOnlineStatus !== false,
        pushNotifications: currentUserProfile.privacy.pushNotifications !== false,
        biometricLock: currentUserProfile.privacy.biometricLock === true,
        disappearingMessages: currentUserProfile.privacy.disappearingMessages === true,
        liquidGlassMode: currentUserProfile.privacy.liquidGlassMode !== false,
        highContrastFonts: currentUserProfile.privacy.highContrastFonts === true,
        minimalistBubbles: currentUserProfile.privacy.minimalistBubbles === true,
        smartQuickReplies: currentUserProfile.privacy.smartQuickReplies !== false,
        hapticTouchFeedback: currentUserProfile.privacy.hapticTouchFeedback !== false,
        autoPlayVoice: currentUserProfile.privacy.autoPlayVoice !== false,
        dataSaverMode: currentUserProfile.privacy.dataSaverMode === true,
        doNotDisturb: currentUserProfile.privacy.doNotDisturb === true,
      });
    }
  }, [currentUserProfile]);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const chatIdParam = searchParams.get('chatId');
  const activeMessagesTab = searchParams.get('tab') === 'settings' ? 'settings' : 'chats';
  const setActiveMessagesTab = (tab: 'chats' | 'settings') => {
    const newParams = new URLSearchParams(searchParams);
    if (tab === 'settings') {
      newParams.set('tab', 'settings');
      newParams.delete('chatId');
      newParams.delete('channelId');
    } else {
      newParams.delete('tab');
    }
    setSearchParams(newParams, { replace: true });
  };

  const [chats, setChats] = useState<any[]>([]);
  const [tempActiveChat, setTempActiveChat] = useState<any | null>(null);
  const [otherUserPresence, setOtherUserPresence] = useState<{ isOnline?: boolean; lastActive?: number } | null>(null);
  const [chatUsersPresence, setChatUsersPresence] = useState<Record<string, { isOnline: boolean; lastActive: any }>>({});
  const [chatUsersData, setChatUsersData] = useState<Record<string, any>>({});
  const [showOnlineRow, setShowOnlineRow] = useState(true);
  
  // Derived activeChat
  const activeChat = chatIdParam 
    ? (chats.find(c => c.otherUser?.id === chatIdParam || c.id === chatIdParam) || tempActiveChat)
    : null;

  const otherUid = activeChat?.otherUser?.id || activeChat?.otherUser?.uid;
  const otherTypingData = activeChat?.typingState?.[otherUid];
  const isOtherTyping = otherTypingData?.status === 'typing' && (Date.now() - (otherTypingData?.updatedAt || 0) < 5000);
  const isOtherRecording = otherTypingData?.status === 'recording' && (Date.now() - (otherTypingData?.updatedAt || 0) < 12000);

  const [showPrivateChatMenu, setShowPrivateChatMenu] = useState(false);
  const [showP2pSearch, setShowP2pSearch] = useState(false);
  const [p2pSearchQuery, setP2pSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [newChatInput, setNewChatInput] = useState('');
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [otherUserTrust, setOtherUserTrust] = useState<{ score: number; count: number; avgRating: number; hasScamWarning: boolean }>({ score: 100, count: 0, avgRating: 5, hasScamWarning: false });
  const [isTrustLoading, setIsTrustLoading] = useState(true);
  const [chatWallpaper, setChatWallpaper] = useState<string | null>(null);
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New Design Modal States (Images 1-6)
  const [showSavedRepliesModal, setShowSavedRepliesModal] = useState(false);
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [gifStickerModalState, setGifStickerModalState] = useState<{ isOpen: boolean; type: 'gif' | 'sticker' }>({ isOpen: false, type: 'gif' });
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showGroupDetailsModal, setShowGroupDetailsModal] = useState(false);
  const [activeTheme, setActiveTheme] = useState<ChatTheme>(() => {
    try {
      const saved = localStorage.getItem('deepshop_chat_theme_id');
      const found = CHAT_THEMES.find(t => t.id === saved);
      return found || CHAT_THEMES[0];
    } catch {
      return CHAT_THEMES[0];
    }
  });

  // Recent chat partners to pass as suggested contacts to NewMessageModal
  const recentChatUsers = React.useMemo(() => {
    if (!chats || !user) return [];
    const list: any[] = [];
    const seen = new Set<string>();

    for (const c of chats) {
      if (!c.isGroup && c.type !== 'group' && c.otherUser && c.otherUser.id && c.otherUser.id !== 'system' && c.otherUser.id !== user.uid) {
        if (!seen.has(c.otherUser.id)) {
          seen.add(c.otherUser.id);
          list.push({
            id: c.otherUser.id,
            displayName: c.otherUser.displayName || c.otherUser.shopName || 'Contact',
            username: c.otherUser.username || c.otherUser.customLink || '',
            email: c.otherUser.email || '',
            phoneNumber: c.otherUser.phoneNumber || c.otherUser.phone || '',
            photoURL: c.otherUser.photoURL || '',
            isOnline: Boolean(c.otherUser.isOnline)
          });
        }
      }
    }
    return list;
  }, [chats, user]);

  // Listen to custom nickname updates
  const [nicknameVersion, setNicknameVersion] = useState(0);
  useEffect(() => {
    const handleNickUpdated = () => setNicknameVersion(v => v + 1);
    window.addEventListener('chat_nickname_updated', handleNickUpdated);
    return () => window.removeEventListener('chat_nickname_updated', handleNickUpdated);
  }, []);

  // Helper to get chat display name considering custom nickname
  const getChatDisplayName = (chatItem: any) => {
    if (!chatItem) return 'User';
    if (chatItem.isGroup || chatItem.type === 'group') {
      return chatItem.name || chatItem.groupName || 'Group Chat';
    }
    const otherUid = chatItem.otherUser?.id || chatItem.otherUser?.uid;
    if (otherUid && user?.uid) {
      const customNick = localStorage.getItem(`chat_nickname_${user.uid}_${otherUid}`);
      if (customNick) return customNick;
    }
    return chatItem.otherUser?.shopName || chatItem.otherUser?.displayName || 'User';
  };

  // Helper to get custom nickname if set
  const getCustomNickname = (chatItem: any) => {
    if (!chatItem || chatItem.isGroup || chatItem.type === 'group') return null;
    const otherUid = chatItem.otherUser?.id || chatItem.otherUser?.uid;
    if (otherUid && user?.uid) {
      return localStorage.getItem(`chat_nickname_${user.uid}_${otherUid}`) || null;
    }
    return null;
  };

  // Helper to get real account name
  const getRealAccountName = (chatItem: any) => {
    if (!chatItem) return 'User';
    if (chatItem.isGroup || chatItem.type === 'group') {
      return chatItem.name || chatItem.groupName || 'Group Chat';
    }
    return chatItem.otherUser?.shopName || chatItem.otherUser?.displayName || 'User';
  };

  // Online users for Instagram notes / stories bar
  const onlineUsersList = React.useMemo(() => {
    if (!chats || !user) return [];
    const list: any[] = [];
    const seen = new Set<string>();

    for (const c of chats) {
      const o = c.otherUser;
      if (o && o.id && o.id !== 'system' && o.id !== user.uid && !seen.has(o.id)) {
        seen.add(o.id);
        list.push({
          id: o.id,
          uid: o.id,
          displayName: getChatDisplayName(c),
          photoURL: o.photoURL || '',
          isOnline: Boolean(chatUsersPresence[o.id]?.isOnline)
        });
      }
    }
    return list;
  }, [chats, chatUsersPresence, user?.uid, nicknameVersion]);

  // Dynamic Banned Words Filter (Admin Word Filter)
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'word_filter'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.bannedWords)) {
          setBannedWords(data.bannedWords);
        }
      }
    });
    return () => unsub();
  }, []);

  // Join group via invite link: ?joinGroup=groupId or ?inviteGroup=groupId
  useEffect(() => {
    const joinGroupId = searchParams.get('joinGroup') || searchParams.get('inviteGroup') || searchParams.get('groupInvite');
    if (!joinGroupId) return;

    if (!user) {
      navigate(`/auth-selector?redirect=/messages?joinGroup=${joinGroupId}`);
      return;
    }

    const joinGroupChat = async () => {
      try {
        const groupRef = doc(db, 'p2p_chats', joinGroupId);
        const snap = await getDoc(groupRef);
        if (snap.exists()) {
          const data = snap.data();
          const existingParticipants = data.participants || [];
          if (!existingParticipants.includes(user.uid)) {
            await updateDoc(groupRef, {
              participants: arrayUnion(user.uid)
            });
            await addDoc(collection(db, 'p2p_chats', joinGroupId, 'messages'), {
              text: `${user.displayName || 'A new member'} joined via group invite link.`,
              senderId: 'system',
              timestamp: serverTimestamp(),
              isSystem: true
            });
            notify('Joined group successfully!', 'success');
          }
          setSearchParams({ chatId: joinGroupId }, { replace: true });
        } else {
          notify('Group invite link is invalid or group was deleted', 'error');
          setSearchParams({}, { replace: true });
        }
      } catch (e) {
        console.error('Error joining group:', e);
        notify('Failed to join group', 'error');
      }
    };
    joinGroupChat();
  }, [searchParams, user, navigate]);

  useEffect(() => {
    if (activeChat?.id) {
      // Sync theme
      try {
        const savedThemeId = localStorage.getItem(`chat_theme_${activeChat.id}`) || activeChat.themeId || localStorage.getItem('deepshop_chat_theme_id');
        if (savedThemeId) {
          const found = CHAT_THEMES.find(t => t.id === savedThemeId);
          if (found) setActiveTheme(found);
        }
      } catch {}
    }
  }, [activeChat?.id, activeChat?.themeId]);

  useEffect(() => {
    if (isOtherTyping || isOtherRecording) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOtherTyping, isOtherRecording]);

  // Voice Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingLocked, setIsRecordingLocked] = useState(false);
  const dragStartY = useRef(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedMimeTypeRef = useRef<string>('audio/webm');
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);

  
  // Call states
  const [isCalling, setIsCalling] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [currentPinnedIndex, setCurrentPinnedIndex] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'connected'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  // Review states
  const [hasReviewed, setHasReviewed] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // New States and Refs for Reactions, Replies, Review Close, and WebRTC
  const [replyingTo, setReplyingTo] = useState<{ id: string; text: string; senderId: string } | null>(null);
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [showAutoDeleteModal, setShowAutoDeleteModal] = useState(false);
  const [clearChatDeleteForOther, setClearChatDeleteForOther] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const triggerHighlight = (msgId: string) => {
    setHighlightedMessageId(msgId);
    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 2000); // Highlight for 2 seconds
  };
  
  useEffect(() => {
      const handleOpenDelete = (e: any) => setDeleteMessageId(e.detail.msgId);
      const handleOpenAutoDelete = () => setShowAutoDeleteModal(true);
      window.addEventListener('open-delete-message', handleOpenDelete);
      window.addEventListener('open-auto-delete', handleOpenAutoDelete);
      return () => {
          window.removeEventListener('open-delete-message', handleOpenDelete);
          window.removeEventListener('open-auto-delete', handleOpenAutoDelete);
      };
  }, []);
  const [reviewDismissedAt, setReviewDismissedAt] = useState<number>(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const shouldAutoSendRef = useRef<boolean>(false);
  const isTouchActiveRef = useRef<boolean>(false);

  // Community Channel States
  const [sidebarTab, setSidebarTab] = useState<'messages' | 'community' | 'calls'>('messages');
  const [channels, setChannels] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>('buyer');
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showChannelDetailsModal, setShowChannelDetailsModal] = useState(false);
  const [isEditingChannel, setIsEditingChannel] = useState(false);
  const [channelMessages, setChannelMessages] = useState<any[]>([]);
  const [userSubscription, setUserSubscription] = useState<any | null>(null);
  const [channelSubscribers, setChannelSubscribers] = useState<any[]>([]);
  const [forwardingMessage, setForwardingMessage] = useState<any | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [detailsSubModal, setDetailsSubModal] = useState<'subscribers' | 'admins' | 'banned' | 'settings' | null>(null);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [confirmDeleteChannel, setConfirmDeleteChannel] = useState(false);

  // Community Channel Creation Form Fields
  const [chanName, setChanName] = useState('');
  const [chanDesc, setChanDesc] = useState('');
  const [chanImage, setChanImage] = useState('');
  const [chanLink, setChanLink] = useState('');
  const [chanImageFile, setChanImageFile] = useState<File | null>(null);
  const [chanImagePreview, setChanImagePreview] = useState('');
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);

  // Edit Channel Form Fields
  const [editChanName, setEditChanName] = useState('');
  const [editChanDesc, setEditChanDesc] = useState('');
  const [editChanLink, setEditChanLink] = useState('');
  const [editChanImageFile, setEditChanImageFile] = useState<File | null>(null);
  const [editChanImagePreview, setEditChanImagePreview] = useState('');
  const [isUpdatingChannel, setIsUpdatingChannel] = useState(false);
  const [showUserInfoModal, setShowUserInfoModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // --- NEW CUSTOM FEATURE STATES ---
  const [chanIsPrivate, setChanIsPrivate] = useState(false);
  const [userSubscriptionsMap, setUserSubscriptionsMap] = useState<Record<string, any>>({});
  const [showAllReactionsChannelMsgId, setShowAllReactionsChannelMsgId] = useState<string | null>(null);
  const [showAllReactionsP2PMsgId, setShowAllReactionsP2PMsgId] = useState<string | null>(null);
  const [showAllReactions, setShowAllReactions] = useState(false);
  const [showClearChatModal, setShowClearChatModal] = useState(false);
  const [isClearingChat, setIsClearingChat] = useState(false);
  const [showPrivacySettingsModal, setShowPrivacySettingsModal] = useState(false);
  const [otherUserProfile, setOtherUserProfile] = useState<any>(null);
  const [isLiveCallMinimized, setIsLiveCallMinimized] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [chatSearchResults, setChatSearchResults] = useState<any[]>([]);
  const [isSearchingChats, setIsSearchingChats] = useState(false);
  const [disabledCallUser, setDisabledCallUser] = useState<any>(null);

  // States for Settings Integration
  const [isBiometricUnlocked, setIsBiometricUnlocked] = useState(false);
  const [biometricPinInput, setBiometricPinInput] = useState('');
  const [biometricPinError, setBiometricPinError] = useState('');
  const [currentlyPlayingVoiceId, setCurrentlyPlayingVoiceId] = useState<string | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [participantProfiles, setParticipantProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!activeChat) return;
    const isGroup = activeChat.isGroup || activeChat.type === 'group';
    if (!isGroup) return;

    const neededUids = new Set<string>();
    if (Array.isArray(activeChat.participants)) {
      activeChat.participants.forEach((uid: string) => {
        if (uid && uid !== 'system' && !participantProfiles[uid]) {
          neededUids.add(uid);
        }
      });
    }
    messages.forEach((m: any) => {
      if (m.senderId && m.senderId !== 'system' && !participantProfiles[m.senderId]) {
        neededUids.add(m.senderId);
      }
    });

    if (neededUids.size === 0) return;

    const fetchProfiles = async () => {
      const newProfiles: Record<string, any> = {};
      for (const uid of Array.from(neededUids)) {
        try {
          const uSnap = await getDoc(doc(db, 'users', uid));
          if (uSnap.exists()) {
            newProfiles[uid] = uSnap.data();
          }
        } catch (err) {
          console.error("Error fetching participant profile:", err);
        }
      }
      if (Object.keys(newProfiles).length > 0) {
        setParticipantProfiles((prev) => ({ ...prev, ...newProfiles }));
      }
    };

    fetchProfiles();
  }, [activeChat?.id, activeChat?.participants, messages]);

  const handleUpdatePrivacySetting = async (key: string, value: any) => {
    if (!user?.uid) return;
    
    // Tactile haptic vibration feedback
    if (privacySettings.hapticTouchFeedback && navigator.vibrate) {
      try {
        navigator.vibrate(50);
      } catch (e) {}
    }

    try {
      if (key.startsWith('privacy.')) {
        const subKey = key.replace('privacy.', '');
        await setDoc(doc(db, 'users', user.uid), {
          privacy: {
            [subKey]: value
          }
        }, { merge: true });
        
        setPrivacySettings(prev => ({
          ...prev,
          [subKey]: value
        }));
      } else {
        await setDoc(doc(db, 'users', user.uid), {
          [key]: value
        }, { merge: true });
      }
      notify("Setting updated", "success");
    } catch (err) {
      console.error("Error updating privacy setting:", err);
      notify("Failed to update setting", "error");
    }
  };

  const isDMBlocked = React.useMemo(() => {
    if (!activeChat || !activeChat.otherUser || activeChat.otherUser.id === 'system') return false;
    
    // Check other user's real-time direct message policy
    const otherId = activeChat.otherUser.id || activeChat.otherUser.uid;
    const otherData = otherId ? chatUsersData[otherId] : null;
    
    if (otherData?.privacy?.allowDirectMessages === false) {
      return true;
    }
    if (activeChat.otherUser?.privacy?.allowDirectMessages === false) {
      return true;
    }

    const privacy = activeChat.otherUser.whoCanDM;
    if (!privacy || privacy === 'everyone') return false;
    
    if (privacy === 'no_one') return true;
    if (privacy === 'verified_only') {
      const isVerified = userRole === 'admin' || currentUserProfile?.kycStatus === 'verified' || currentUserProfile?.verified === true;
      return !isVerified;
    }
    return false;
  }, [activeChat, userRole, currentUserProfile, chatUsersData]);

  // Lightbox Viewer
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);
  const [lightboxOffset, setLightboxOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [lightboxMessageId, setLightboxMessageId] = useState<string | null>(null);

  // Private Chat Details Media & Links Tab
  const [profileTab, setProfileTab] = useState<'media' | 'links'>('media');

  const getActiveLinks = () => {
    const urls: { id: string; url: string }[] = [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    messages.forEach((m) => {
      if (m.text && !m.isDeletedForEveryone) {
        const matches = m.text.match(urlRegex);
        if (matches) {
          matches.forEach((url) => {
            urls.push({ id: m.id, url });
          });
        }
      }
    });
    return urls;
  };

  // Live Audio Call Stream Room
  const [activeLiveCall, setActiveLiveCall] = useState<any | null>(null);
  const [liveParticipants, setLiveParticipants] = useState<any[]>([]);
  const [showLiveCallModal, setShowLiveCallModal] = useState(false);
  const [isLiveMuted, setIsLiveMuted] = useState(true);

  // Community Settings/Administration
  const [channelAdmins, setChannelAdmins] = useState<any[]>([]);
  const [adminSearchEmail, setAdminSearchEmail] = useState('');
  const [adminSearchResult, setAdminSearchResult] = useState<any | null>(null);
  const [adminSearchLoading, setAdminSearchLoading] = useState(false);
  const [adminPermissions, setAdminPermissions] = useState({
      canPost: true,
      canDelete: true,
      canPin: true,
      canBan: true
  });
  const [selectedSubscriber, setSelectedSubscriber] = useState<any | null>(null);
  const [isSearchingAdmin, setIsSearchingAdmin] = useState(false);
  const [isUserBanned, setIsUserBanned] = useState(false);

  const channelIdParam = searchParams.get('channelId');
  const activeChannel = channelIdParam ? channels.find(c => c.id === channelIdParam) : null;
  const isChannelAdmin = activeChannel?.creatorId === user?.uid || channelAdmins.some((adm) => adm.id === user?.uid || adm.uid === user?.uid);

  // Private channel security restrictions
  useEffect(() => {
    if (activeChannel?.isPrivate) {
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        notify("Action restricted: Saving media or copying text is prohibited in private channels.", "error");
      };
      const handleKeyDown = (e: KeyboardEvent) => {
        if (
          e.key === 'PrintScreen' || 
          (e.ctrlKey && (e.key === 'p' || e.key === 's' || e.key === 'c' || e.key === 'x')) || 
          e.key === 'F12'
        ) {
          e.preventDefault();
          notify("Action restricted: Screenshots or content duplication is prohibited in private channels.", "error");
        }
      };
      const handleDragStart = (e: DragEvent) => {
        e.preventDefault();
      };

      window.addEventListener('contextmenu', handleContextMenu);
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('dragstart', handleDragStart);
      return () => {
        window.removeEventListener('contextmenu', handleContextMenu);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('dragstart', handleDragStart);
      };
    }
  }, [activeChannel, notify]);

  const [userShopName, setUserShopName] = useState<string>('');

  // Check if current user is banned from the channel
  useEffect(() => {
    if (!channelIdParam || !user?.uid) {
      setIsUserBanned(false);
      return;
    }
    const unsub = onSnapshot(doc(db, 'community_channels', channelIdParam, 'banned_users', user.uid), (docSnap) => {
      setIsUserBanned(docSnap.exists());
    });
    return () => unsub();
  }, [channelIdParam, user?.uid]);

  // --- NEW FEATURE REAL-TIME LISTENERS ---
  // Real-time user profile listener for settings
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setCurrentUserProfile(snap.data());
      }
    });
    return () => unsub();
  }, [user?.uid]);

  // Real-time listener for current user's active channel subscriptions
  useEffect(() => {
    if (!user?.uid || channels.length === 0) return;
    const unsubscribes = channels.map(chan => {
      return onSnapshot(doc(db, 'community_channels', chan.id, 'subscribers', user.uid), (docSnap) => {
        setUserSubscriptionsMap(prev => ({
          ...prev,
          [chan.id]: docSnap.exists() ? docSnap.data() : null
        }));
      });
    });
    return () => unsubscribes.forEach(unsub => unsub());
  }, [user?.uid, channels]);

  // Real-time online presence listener for P2P chat users
  useEffect(() => {
    if (chats.length === 0) return;
    const unsubscribes = chats.map(chat => {
      const otherId = chat.otherUser?.id || chat.otherUser?.uid;
      if (!otherId) return () => {};
      return onSnapshot(doc(db, 'users', otherId), (docSnap) => {
        if (docSnap.exists()) {
          const uData = docSnap.data();
          setChatUsersData(prev => ({
            ...prev,
            [otherId]: uData
          }));
          setChatUsersPresence(prev => ({
            ...prev,
            [otherId]: {
              isOnline: !!uData.isOnline && (Date.now() - (uData.lastActive || 0) < 40000),
              lastActive: uData.lastActive || null
            }
          }));
        }
      });
    });
    return () => unsubscribes.forEach(unsub => unsub());
  }, [chats]);

  // Debounced search for users by name or username
  useEffect(() => {
    if (!chatSearchQuery.trim() || !user) {
      setChatSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingChats(true);
      try {
        const lowerQuery = chatSearchQuery.toLowerCase();
        const usersRef = collection(db, 'users');
        const q = query(usersRef, limit(40));
        const snap = await getDocs(q);
        const results = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((u: any) => {
            if (u.id === user.uid) return false;
            const nameMatch = u.displayName?.toLowerCase().includes(lowerQuery);
            const usernameMatch = u.username?.toLowerCase().includes(lowerQuery) || u.shopName?.toLowerCase().includes(lowerQuery);
            return nameMatch || usernameMatch;
          });
        setChatSearchResults(results);
      } catch (err) {
        console.error("Chat search error:", err);
      } finally {
        setIsSearchingChats(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [chatSearchQuery, user]);

  // Active Live Call Listener
  useEffect(() => {
    if (!channelIdParam) {
      setActiveLiveCall(null);
      return;
    }
    const unsub = onSnapshot(doc(db, 'community_channels', channelIdParam), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setActiveLiveCall(data.liveAudioCall || null);
      }
    });
    return () => unsub();
  }, [channelIdParam]);

  // Live Call Participants Listener
  useEffect(() => {
    if (!channelIdParam || !activeLiveCall) {
      setLiveParticipants([]);
      return;
    }
    const unsub = onSnapshot(collection(db, 'community_channels', channelIdParam, 'live_participants'), (snapshot) => {
      const parts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setLiveParticipants(parts);
    });
    return () => unsub();
  }, [channelIdParam, activeLiveCall]);

  // Dynamic Live Join Check on mount/param change
  const joinLiveParam = searchParams.get('joinLive');
  useEffect(() => {
    if (activeLiveCall && joinLiveParam === 'true') {
      const params = new URLSearchParams(searchParams);
      params.delete('joinLive');
      setSearchParams(params, { replace: true });
      handleJoinLiveCall();
    }
  }, [activeLiveCall, joinLiveParam]);

  // Channel Admins Listener
  useEffect(() => {
    if (!channelIdParam) {
      setChannelAdmins([]);
      return;
    }
    const unsub = onSnapshot(collection(db, 'community_channels', channelIdParam, 'admins'), (snapshot) => {
      const ads = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setChannelAdmins(ads);
    });
    return () => unsub();
  }, [channelIdParam]);

  // --- NEW FEATURE BUSINESS LOGIC HANDLERS ---
  // Administrator Management Logic
  const handleSearchAdminUser = async () => {
       if (!adminSearchEmail.trim()) {
           notify("Please enter an email address", "error");
           return;
       }
       setAdminSearchLoading(true);
       setAdminSearchResult(null);
       try {
           const q = query(collection(db, 'users'), where('email', '==', adminSearchEmail.toLowerCase().trim()));
           const snap = await getDocs(q);
           if (snap.empty) {
               notify("No user found with this email address", "error");
           } else {
               const docData = snap.docs[0].data();
               setAdminSearchResult({ id: snap.docs[0].id, ...docData });
           }
       } catch (err) {
           console.error(err);
           notify("Error searching for user", "error");
       } finally {
           setAdminSearchLoading(false);
       }
  };

  const handleAddAdmin = async () => {
       if (!channelIdParam || !adminSearchResult) return;
       try {
           const adminRef = doc(db, 'community_channels', channelIdParam, 'admins', adminSearchResult.id);
           await setDoc(adminRef, {
               uid: adminSearchResult.id,
               displayName: adminSearchResult.displayName || 'Admin',
               email: adminSearchResult.email || '',
               photoURL: adminSearchResult.photoURL || '',
               permissions: adminPermissions,
               addedAt: Date.now()
           });
           
           // Sync main channel document
           const chanRef = doc(db, 'community_channels', channelIdParam);
           await updateDoc(chanRef, {
               adminIds: arrayUnion(adminSearchResult.id)
           });

           notify(`${adminSearchResult.displayName || 'User'} added as administrator`, "success");
           setAdminSearchResult(null);
           setAdminSearchEmail('');
           setIsSearchingAdmin(false);
       } catch (err) {
           console.error(err);
           notify("Failed to add administrator", "error");
       }
  };

  const handleRemoveAdmin = async (adminId: string) => {
       if (!channelIdParam) return;
       try {
           await deleteDoc(doc(db, 'community_channels', channelIdParam, 'admins', adminId));
           await updateDoc(doc(db, 'community_channels', channelIdParam), {
               adminIds: arrayRemove(adminId)
           });
           notify("Administrator removed successfully", "success");
       } catch (err) {
           console.error(err);
           notify("Failed to remove administrator", "error");
       }
  };

  // Live Audio Call Stream Logic
  const handleStartLiveCall = async () => {
       if (!channelIdParam || !activeChannel || !user) return;
       try {
           notify("Starting live audio stream...", "info");
           const callObj = {
               active: true,
               hostId: user.uid,
               hostName: userShopName || user.displayName || 'Seller',
               hostPhoto: user.photoURL || '',
               startedAt: Date.now(),
               title: `Live discussion: ${activeChannel.name}`
           };
           await updateDoc(doc(db, 'community_channels', channelIdParam), {
               liveAudioCall: callObj
           });
           
           await setDoc(doc(db, 'community_channels', channelIdParam, 'live_participants', user.uid), {
               uid: user.uid,
               displayName: userShopName || user.displayName || 'Host',
               photoURL: user.photoURL || '',
               muted: false,
               isHost: true,
               joinedAt: Date.now()
           });
           
           setIsLiveMuted(false);
           setShowLiveCallModal(true);
           notify("You are now LIVE on audio discussion!", "success");
       } catch (err) {
           console.error(err);
           notify("Failed to start live stream", "error");
       }
  };

  const handleJoinLiveCall = async () => {
       if (!channelIdParam || !activeLiveCall || !user) return;
       try {
           await setDoc(doc(db, 'community_channels', channelIdParam, 'live_participants', user.uid), {
               uid: user.uid,
               displayName: user.displayName || 'Anonymous Listener',
               photoURL: user.photoURL || '',
               muted: true, // Default muted
               isHost: false,
               joinedAt: Date.now()
           });
           setIsLiveMuted(true);
           setShowLiveCallModal(true);
           notify("Joined Live Audio stream", "success");
       } catch (err) {
           console.error(err);
           notify("Failed to join live call", "error");
       }
  };

  const handleLeaveLiveCall = async () => {
       if (!channelIdParam || !user) return;
       try {
           await deleteDoc(doc(db, 'community_channels', channelIdParam, 'live_participants', user.uid));
           setShowLiveCallModal(false);
           notify("Left live stream", "info");
       } catch (err) {
           console.error(err);
       }
  };

  const handleEndLiveCall = async () => {
       if (!channelIdParam || !user) return;
       try {
           notify("Terminating live call...", "info");
           const snap = await getDocs(collection(db, 'community_channels', channelIdParam, 'live_participants'));
           for (const docD of snap.docs) {
               await deleteDoc(doc(db, 'community_channels', channelIdParam, 'live_participants', docD.id));
           }
           
           if (activeLiveCall?.startedAt) {
               const durationMs = Date.now() - activeLiveCall.startedAt;
               const mins = Math.floor(durationMs / 60000);
               const secs = Math.floor((durationMs % 60000) / 1000);
               const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
               await addDoc(collection(db, 'community_channels', channelIdParam, 'messages'), {
                   text: `🎙️ Live stream ended. Duration: ${durationStr}`,
                   senderId: 'system',
                   senderName: 'System',
                   timestamp: Date.now()
               });
           }
           
           await updateDoc(doc(db, 'community_channels', channelIdParam), {
               liveAudioCall: null
           });
           setShowLiveCallModal(false);
           notify("Live stream ended", "info");
       } catch (err) {
           console.error(err);
           notify("Failed to end live call", "error");
       }
  };

  const handleToggleMuteParticipant = async (pId: string, currentMuted: boolean) => {
       if (!channelIdParam) return;
       try {
           await updateDoc(doc(db, 'community_channels', channelIdParam, 'live_participants', pId), {
               muted: !currentMuted
           });
           notify(`${currentMuted ? "Unmuted" : "Muted"} subscriber in call`, "success");
       } catch (err) {
           console.error(err);
           notify("Failed to modify speaker state", "error");
       }
  };

  const handleRemoveParticipant = async (pId: string) => {
       if (!channelIdParam) return;
       try {
           await deleteDoc(doc(db, 'community_channels', channelIdParam, 'live_participants', pId));
           notify("Disconnected participant from live call", "info");
       } catch (err) {
           console.error(err);
       }
  };

  // Fetch Current User Role
  useEffect(() => {
    if (!user) return;
    const fetchUserRole = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserRole(data.role || 'buyer');
          setUserShopName(data.shopName || data.displayName || 'Seller');
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
      }
    };
    fetchUserRole();
  }, [user]);

  // Load All Community Channels
  useEffect(() => {
    const q = query(collection(db, 'community_channels'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const channelsList = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setChannels(channelsList);
    }, (err) => {
      const unsub2 = onSnapshot(collection(db, 'community_channels'), (snapshot) => {
        const channelsList = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })).sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setChannels(channelsList);
      });
    });
    return () => unsub();
  }, []);

  // Fetch Active Channel Messages
  useEffect(() => {
    if (!user || !channelIdParam) {
      setChannelMessages([]);
      return;
    }

    const q = query(
      collection(db, 'community_channels', channelIdParam, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setChannelMessages(msgs.filter(m => !m.deletedFor?.includes(user?.uid)));
    }, (err) => {
      const unsub2 = onSnapshot(collection(db, 'community_channels', channelIdParam, 'messages'), (snapshot) => {
        const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0));
        setChannelMessages(msgs.filter(m => !m.deletedFor?.includes(user?.uid)));
      });
    });

    return () => unsub();
  }, [channelIdParam, user]);

  // Fetch Current User Subscription to active channel
  useEffect(() => {
    if (!user || !channelIdParam) {
      setUserSubscription(null);
      return;
    }
    const unsub = onSnapshot(doc(db, 'community_channels', channelIdParam, 'subscriptions', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserSubscription(docSnap.data());
      } else {
        setUserSubscription(null);
      }
    });
    return () => unsub();
  }, [channelIdParam, user]);

  // Fetch Channel Subscribers for Owner Info
  useEffect(() => {
    if (!channelIdParam || !showChannelDetailsModal) {
      setChannelSubscribers([]);
      return;
    }
    const unsub = onSnapshot(collection(db, 'community_channels', channelIdParam, 'subscriptions'), (snapshot) => {
      const subs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setChannelSubscribers(subs);
    });
    return () => unsub();
  }, [channelIdParam, showChannelDetailsModal]);

  // Fetch Banned Users for Owner Info
  useEffect(() => {
    if (!channelIdParam || detailsSubModal !== 'banned') {
      setBannedUsers([]);
      return;
    }
    const unsub = onSnapshot(collection(db, 'community_channels', channelIdParam, 'banned_users'), (snapshot) => {
      const banned = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setBannedUsers(banned);
    });
    return () => unsub();
  }, [channelIdParam, detailsSubModal]);

  const handleToggleMuteSubscriber = async (sub: any) => {
    if (!channelIdParam) return;
    try {
      await updateDoc(doc(db, 'community_channels', channelIdParam, 'subscriptions', sub.id), {
        muted: !sub.muted
      });
      notify(`Successfully ${sub.muted ? 'unmuted' : 'muted'} ${sub.displayName || 'user'}`, "success");
    } catch (e) {
      console.error(e);
      notify("Failed to update user status", "error");
    }
  };

  const handleBanSubscriber = async (sub: any) => {
    if (!channelIdParam) return;
    try {
      // Add to banned_users collection
      await setDoc(doc(db, 'community_channels', channelIdParam, 'banned_users', sub.id), {
        uid: sub.id,
        displayName: sub.displayName || 'User',
        photoURL: sub.photoURL || '',
        bannedAt: Date.now()
      });
      // Delete from subscriptions subcollection
      await deleteDoc(doc(db, 'community_channels', channelIdParam, 'subscriptions', sub.id));
      // Update subscriber count
      await updateDoc(doc(db, 'community_channels', channelIdParam), {
        subscriberCount: Math.max(1, (activeChannel?.subscriberCount || 2) - 1)
      });
      notify(`Banned and removed ${sub.displayName || 'user'}`, "success");
    } catch (e) {
      console.error(e);
      notify("Failed to ban user", "error");
    }
  };

  const handleUnbanUser = async (bannedUser: any) => {
    if (!channelIdParam) return;
    try {
      await deleteDoc(doc(db, 'community_channels', channelIdParam, 'banned_users', bannedUser.id));
      notify(`Unbanned ${bannedUser.displayName || 'user'}`, "success");
    } catch (e) {
      console.error(e);
      notify("Failed to unban user", "error");
    }
  };

  const handleDeleteChannel = async () => {
    if (!channelIdParam || !activeChannel) return;
    try {
      notify("Deleting channel...", "info");
      await deleteDoc(doc(db, 'community_channels', channelIdParam));
      setShowChannelDetailsModal(false);
      setDetailsSubModal(null);
      setSearchParams({});
      notify("Channel deleted successfully", "success");
    } catch (e) {
      console.error(e);
      notify("Failed to delete channel", "error");
    }
  };

  // Init Form Fields when editing
  useEffect(() => {
    if (activeChannel) {
      setEditChanName(activeChannel.name || '');
      setEditChanDesc(activeChannel.description || '');
      setEditChanLink(activeChannel.customLink || '');
      setEditChanImagePreview(activeChannel.imageUrl || '');
    }
  }, [activeChannel, isEditingChannel]);

  const handleSubscribeToChannel = async (channel: any) => {
    if (!user) return;
    try {
      const subRef = doc(db, 'community_channels', channel.id, 'subscriptions', user.uid);
      await setDoc(subRef, {
        uid: user.uid,
        displayName: user.displayName || 'Anonymous User',
        photoURL: user.photoURL || '',
        muted: false,
        hideEmail: currentUserProfile?.hideEmail || false,
        joinedAt: Date.now()
      });
      await updateDoc(doc(db, 'community_channels', channel.id), {
        subscriberCount: (channel.subscriberCount || 0) + 1
      });
      notify(`Subscribed to ${channel.name}!`, "success");
    } catch(e) {
      console.error(e);
      notify("Failed to subscribe", "error");
    }
  };

  const handleToggleMuteChannel = async (channel: any, currentMuted: boolean) => {
    if (!user) return;
    try {
      const subRef = doc(db, 'community_channels', channel.id, 'subscriptions', user.uid);
      await updateDoc(subRef, {
        muted: !currentMuted
      });
      notify(!currentMuted ? "Channel muted" : "Channel unmuted", "info");
    } catch(e) {
      console.error(e);
      notify("Failed to update notification settings", "error");
    }
  };

  const handleUnsubscribeFromChannel = async (channel: any) => {
    if (!user) return;
    try {
      const subRef = doc(db, 'community_channels', channel.id, 'subscriptions', user.uid);
      await deleteDoc(subRef);
      await updateDoc(doc(db, 'community_channels', channel.id), {
        subscriberCount: Math.max(0, (channel.subscriberCount || 1) - 1)
      });
      notify(`Unsubscribed from ${channel.name}`, "info");
      setUserSubscription(null);
    } catch(e) {
      console.error(e);
      notify("Failed to unsubscribe", "error");
    }
  };

  
  const handleEditChannel = () => {
    if (!activeChannel) return;
    setChanName(activeChannel.name || '');
    setChanDesc(activeChannel.description || '');
    setChanLink(activeChannel.customLink || '');
    setChanImagePreview(activeChannel.imageUrl || '');
    setChanImageFile(null);
    setChanIsPrivate(activeChannel.isPrivate || false);
    setIsEditingChannel(true);
    setShowCreateChannelModal(true);
  };

  const submitEditChannel = async () => {
    if (!activeChannel || !user) return;
    if (!chanName.trim()) {
      notify("Please enter a channel name", "error");
      return;
    }
    if (!chanLink.trim()) {
      notify("Please enter a custom link or handle", "error");
      return;
    }

    setIsCreatingChannel(true);
    try {
      const targetLink = chanLink.trim().toLowerCase();
      if (targetLink !== activeChannel.customLink) {
        // Check if custom link already exists
        const linkQuery = query(collection(db, 'community_channels'), where('customLink', '==', targetLink));
        const linkSnap = await getDocs(linkQuery);
        if (!linkSnap.empty) {
          notify("This custom link/handle is already taken by another channel. Please choose another one.", "error");
          setIsCreatingChannel(false);
          return;
        }
      }

      let finalImage = activeChannel.imageUrl;
      if (chanImageFile) {
        notify("Uploading new image...", "info");
        try {
            finalImage = await uploadToImgbb(chanImageFile);
        } catch(e) {
            notify("Failed to upload image", "error");
            setIsCreatingChannel(false);
            return;
        }
      }
      await updateDoc(doc(db, 'community_channels', activeChannel.id), {
        name: chanName.trim(),
        description: chanDesc.trim(),
        customLink: targetLink,
        imageUrl: finalImage,
        isPrivate: chanIsPrivate
      });
      notify("Channel updated successfully", "success");
      setShowCreateChannelModal(false);
      setIsEditingChannel(false);
      setChanName('');
      setChanDesc('');
      setChanLink('');
      setChanImageFile(null);
      setChanImagePreview('');
      setChanIsPrivate(false);
    } catch(e) {
      console.error(e);
      notify("Failed to update channel", "error");
    } finally {
      setIsCreatingChannel(false);
    }
  };

const handleCreateChannel = async () => {
    if (!user) return;
    if (!chanName.trim()) {
      notify("Please enter a channel name", "error");
      return;
    }
    if (!chanLink.trim()) {
      notify("Please enter a custom link or handle", "error");
      return;
    }
    
    setIsCreatingChannel(true);
    try {
      // Check if custom link (handle) already exists
      const linkQuery = query(collection(db, 'community_channels'), where('customLink', '==', chanLink.trim().toLowerCase()));
      const linkSnap = await getDocs(linkQuery);
      if (!linkSnap.empty) {
        notify("This custom link/handle is already taken. Please choose another one.", "error");
        setIsCreatingChannel(false);
        return;
      }

      let finalImage = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80';
      if (chanImageFile) {
        notify("Uploading image...", "info");
        try {
            finalImage = await uploadToImgbb(chanImageFile);
        } catch(e) {
            notify("Failed to upload image", "error");
            setIsCreatingChannel(false);
            return;
        }
      }
      const newChannelDoc = {
        name: chanName.trim(),
        description: chanDesc.trim(),
        customLink: chanLink.trim().toLowerCase(),
        imageUrl: finalImage,
        creatorId: user.uid,
        creatorName: userShopName || user.displayName || 'Verified Seller',
        subscriberCount: 1, // creator subscribes automatically
        createdAt: Date.now(),
        isPrivate: chanIsPrivate
      };

      const docRef = await addDoc(collection(db, 'community_channels'), newChannelDoc);

      // Automatically subscribe the creator
      const subRef = doc(db, 'community_channels', docRef.id, 'subscriptions', user.uid);
      await setDoc(subRef, {
        uid: user.uid,
        displayName: user.displayName || 'Verified Seller',
        photoURL: user.photoURL || '',
        muted: false,
        joinedAt: Date.now()
      });

      notify("Community Channel created successfully!", "success");
      
      // Reset fields
      setChanName('');
      setChanDesc('');
      setChanLink('');
      setChanImage('');
      setChanIsPrivate(false);
      setShowCreateChannelModal(false);
    } catch (err) {
      console.error("Error creating channel:", err);
      notify("Failed to create community channel", "error");
    } finally {
      setIsCreatingChannel(false);
    }
  };

  const handleCreateCommunityChannel = () => {
    if (isEditingChannel) {
      submitEditChannel();
    } else {
      handleCreateChannel();
    }
  };

  const handleReactToChannelMessage = async (msgId: string, emoji: string) => {
    if (!user || !channelIdParam) return;
    const msgRef = doc(db, 'community_channels', channelIdParam, 'messages', msgId);
    try {
      const msgDoc = await getDoc(msgRef);
      if (msgDoc.exists()) {
        const data = msgDoc.data();
        const currentReactions = { ...(data.reactions || {}) };
        
        if (currentReactions[user.uid] === emoji) {
          delete currentReactions[user.uid];
        } else {
          currentReactions[user.uid] = emoji;
        }
        
        await updateDoc(msgRef, { reactions: currentReactions });
      }
    } catch (err) {
      console.error("Failed to react to channel post:", err);
    }
    setActiveMessageMenuId(null);
  };

  const handlePinMessage = async (msg: any) => {
    if (!channelIdParam) return;
    try {
      const channel = communityChannels.find(c => c.id === channelIdParam);
      let currentPins = channel?.pinnedMessages || [];
      if (channel?.pinnedMessage && !currentPins.some((p: any) => p.id === channel.pinnedMessage.id)) {
        currentPins.unshift(channel.pinnedMessage);
      }
      
      const newPin = {
        id: msg.id,
        text: msg.text || "Image Attachment",
        imageUrl: msg.imageUrl || ""
      };
      
      // Remove if already pinned, else add to front
      currentPins = currentPins.filter((p: any) => p.id !== msg.id);
      currentPins.unshift(newPin);
      
      await updateDoc(doc(db, 'community_channels', channelIdParam), {
        pinnedMessages: currentPins,
        pinnedMessage: null
      });
      notify("Message pinned successfully!", "success");
    } catch (err) {
      console.error(err);
      notify("Failed to pin message", "error");
    }
  };

  const handleUnpinMessage = async (msgIdToUnpin?: string) => {
    if (!channelIdParam) return;
    try {
      const channel = communityChannels.find(c => c.id === channelIdParam);
      let currentPins = channel?.pinnedMessages || [];
      if (channel?.pinnedMessage && !currentPins.some((p: any) => p.id === channel.pinnedMessage.id)) {
        currentPins.unshift(channel.pinnedMessage);
      }
      
      if (msgIdToUnpin) {
          currentPins = currentPins.filter((p: any) => p.id !== msgIdToUnpin);
      } else {
          // Unpin current if none provided
          const currentPin = currentPins[currentPinnedIndex % currentPins.length];
          if (currentPin) {
              currentPins = currentPins.filter((p: any) => p.id !== currentPin.id);
          }
      }
      
      await updateDoc(doc(db, 'community_channels', channelIdParam), {
        pinnedMessages: currentPins,
        pinnedMessage: null
      });
      setCurrentPinnedIndex(0);
      notify("Message unpinned", "info");
    } catch (err) {
      console.error(err);
      notify("Failed to unpin message", "error");
    }
  };

  const handlePinMessageP2P = async (msg: any) => {
    if (!activeChat || !activeChat.id) return;
    try {
      await updateDoc(doc(db, 'p2p_chats', activeChat.id), {
        pinnedMessage: {
          id: msg.id,
          text: msg.text || "Attachment",
          imageUrl: msg.imageUrl || ""
        }
      });
      notify("Message pinned successfully!", "success");
    } catch (err) {
      console.error(err);
      notify("Failed to pin message", "error");
    }
  };

  const handleUnpinMessageP2P = async () => {
    if (!activeChat || !activeChat.id) return;
    try {
      await updateDoc(doc(db, 'p2p_chats', activeChat.id), {
        pinnedMessage: null
      });
      notify("Message unpinned", "info");
    } catch (err) {
      console.error(err);
      notify("Failed to unpin message", "error");
    }
  };

  const handleSendForward = async (targetChatOrChannel: any, isChannelTarget: boolean) => {
    if (!user || !forwardingMessage) return;

    try {
      const forwardText = forwardingMessage.text;
      const forwardImg = forwardingMessage.imageUrl;
      const originalName = forwardingMessage.originalSenderName || "User";

      const msgData: any = {
        text: forwardText || "",
        imageUrl: forwardImg || null,
        senderId: user.uid,
        forwardedFrom: originalName,
        timestamp: serverTimestamp()
      };

      if (isChannelTarget) {
        await addDoc(collection(db, 'community_channels', targetChatOrChannel.id, 'messages'), msgData);
        
        fetch('/api/send-push-channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: targetChatOrChannel.id,
            title: `📢 Forwarded Post in ${targetChatOrChannel.name}`,
            body: forwardText || "Sent a forwarded image",
            link: `/messages?channelId=${targetChatOrChannel.id}`
          })
        }).catch(err => console.error("Channel push error:", err));

      } else {
        let chatId = targetChatOrChannel.id;
        if (targetChatOrChannel.isNew) {
          const chatRef = await addDoc(collection(db, 'p2p_chats'), {
            participants: [user.uid, targetChatOrChannel.otherUser.id],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastMessage: forwardText || 'Sent a forwarded image',
            lastSenderId: user.uid,
            seenBy: [user.uid]
          });
          chatId = chatRef.id;
        } else {
          await updateDoc(doc(db, 'p2p_chats', chatId), {
            updatedAt: serverTimestamp(),
            lastMessage: forwardText || 'Sent a forwarded image',
            lastSenderId: user.uid,
            seenBy: [user.uid]
          });
        }

        await addDoc(collection(db, 'p2p_chats', chatId, 'messages'), msgData);
        if (recipientId) {
             fetch('/api/web-push/send-p2p', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     targetUserId: recipientId,
                     title: `${user.displayName || 'Someone'} forwarded a message`,
                     body: msgData.text || 'Forwarded an attachment',
                     link: `/messages?chatId=${user.uid}`
                 })
             }).catch(() => {});
        }

        const recipientId = targetChatOrChannel.otherUser?.id || targetChatOrChannel.otherUser?.uid;
        if (recipientId && recipientId !== "system") {
          fetch("/api/send-push-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: recipientId,
              title: user.displayName || "New Message",
              body: `Forwarded: ${forwardText || "Sent an image"}`,
              link: `/messages?chatId=${user.uid}`
            })
          }).catch(err => console.error("Message push notification failed:", err));
        }
      }

      notify("Message forwarded successfully!", "success");
      setShowForwardModal(false);
      setForwardingMessage(null);
    } catch(err) {
      console.error(err);
      notify("Failed to forward message", "error");
    }
  };

  const handleReactToMessage = async (msgId: string, emoji: string) => {
    if (!user || !activeChat || !activeChat.id) return;
    const msgRef = doc(db, 'p2p_chats', activeChat.id, 'messages', msgId);
    try {
      const msgDoc = await getDoc(msgRef);
      if (msgDoc.exists()) {
        const data = msgDoc.data();
        const currentReactions = { ...(data.reactions || {}) };
        
        if (currentReactions[user.uid] === emoji) {
          delete currentReactions[user.uid];
        } else {
          currentReactions[user.uid] = emoji;
        }
        
        await updateDoc(msgRef, { reactions: currentReactions });
      }
    } catch (err) {
      console.error("Failed to react:", err);
    }
    setActiveMessageMenuId(null);
  };

  useEffect(() => {
    if (!user || !activeChat || !activeChat.otherUser?.id) {
      setHasReviewed(false);
      setOtherUserTrust({ score: 100, count: 0, avgRating: 5, hasScamWarning: false });
      return;
    }
    
    const checkReview = async () => {
      try {
        const q = query(
          collection(db, "user_reviews"),
          where("reviewerId", "==", user.uid),
          where("revieweeId", "==", activeChat.otherUser.id)
        );
        const snap = await getDocs(q);
        setHasReviewed(!snap.empty);
      } catch (err) {
        console.error("Error checking review:", err);
      }
    };
    
    const loadOtherUserReviews = async () => {
      setIsTrustLoading(true);
      const emailLower = activeChat?.otherUser?.email?.toLowerCase().trim();
      if (activeChat.otherUser.id === 'system' || emailLower === 'deepshop@gmail.com' || emailLower === 'deepshopbysam@gmail.com') {
        setOtherUserTrust({ score: 100, count: 120, avgRating: 5, hasScamWarning: false });
        setIsTrustLoading(false);
        return;
      }
      try {
        const q1 = query(
          collection(db, "user_reviews"),
          where("revieweeId", "==", activeChat.otherUser.id)
        );
        const snap1 = await getDocs(q1);
        const list1 = snap1.docs.map(doc => doc.data());

        const q2 = query(
          collection(db, "reviews"),
          where("sellerId", "==", activeChat.otherUser.id)
        );
        const snap2 = await getDocs(q2);
        const list2 = snap2.docs.map(doc => doc.data());

        const safeList = filterSafeReviews([...list1, ...list2]);
        
        if (safeList.length === 0) {
          setOtherUserTrust({ score: 100, count: 0, avgRating: 5, hasScamWarning: false });
          setIsTrustLoading(false);
          return;
        }

        const totalRating = safeList.reduce((sum, r) => sum + (r.rating || 0), 0);
        const avg = totalRating / safeList.length;
        const score = Math.round((avg / 5) * 100);

        setOtherUserTrust({
          score,
          count: safeList.length,
          avgRating: Number(avg.toFixed(1)),
          hasScamWarning: avg < 3.0
        });
      } catch (err) {
        console.error("Error loading other user reviews:", err);
      } finally {
        setIsTrustLoading(false);
      }
    };

    checkReview();
    loadOtherUserReviews();
    
    // Load wallpaper setting for this chat
    const savedWallpaper = localStorage.getItem('chat_wallpaper_' + activeChat.id);
    setChatWallpaper(savedWallpaper || null);
  }, [activeChat?.otherUser?.id, activeChat?.id, user]);

  // Effect 1: Listen for user's chats (No orderBy in query to avoid index requirements, sorted in memory)
  useEffect(() => {
    if (!user) return;
    
    const q1 = query(
      collection(db, 'p2p_chats'), 
      where('participants', 'array-contains', user.uid)
    );
    
    const unsub = onSnapshot(q1, async (snapshot) => {
        const chatsList = await Promise.all(snapshot.docs.map(async d => {
            const data = d.data();
            const isGroup = data.type === 'group' || data.isGroup;
            let otherUser: any = { displayName: 'Unknown', photoURL: '', id: d.id, isGroup: false };
            
            if (isGroup) {
                otherUser = {
                    id: d.id,
                    displayName: data.name || data.groupName || 'Group Chat',
                    shopName: data.name || data.groupName || 'Group Chat',
                    photoURL: data.photoURL || '',
                    isGroup: true
                };
            } else {
                const otherUid = data.participants.find((p: string) => p !== user.uid);
                otherUser = { displayName: 'Unknown', photoURL: '', id: otherUid, isGroup: false };
                if (otherUid) {
                    if (otherUid === 'system') {
                        otherUser = {
                            id: 'system',
                            displayName: 'Deep Shop HQ',
                            photoURL: '',
                            isGroup: false
                        };
                    } else {
                        const uDoc = await getDoc(doc(db, 'users', otherUid));
                        if (uDoc.exists()) {
                            otherUser = { ...uDoc.data(), id: uDoc.id, isGroup: false } as any;
                        } else {
                            otherUser = {
                                id: otherUid,
                                displayName: 'Verified Seller',
                                photoURL: '',
                                isGroup: false
                            };
                        }
                    }
                }
            }
            
            return {
                id: d.id,
                ...data,
                otherUser
            };
        }));

        // Sort in memory by updatedAt descending safely
        chatsList.sort((a, b) => {
          const tA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt || 0);
          const tB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt || 0);
          return tB - tA;
        });
        
        setChats(chatsList);
    });
    
    return () => unsub();
  }, [user]);

  // Effect 2: Load new user for active chat if they're not in existing chats
  useEffect(() => {
    if (!user || !chatIdParam) {
      setTempActiveChat(null);
      return;
    }

    const existingChat = chats.find(c => c.otherUser?.id === chatIdParam || c.id === chatIdParam);
    if (existingChat) {
      setTempActiveChat(null);
      return;
    }

    const fetchTempUser = async () => {
      try {
        if (chatIdParam === "system") {
          setTempActiveChat({
            isNew: true,
            otherUser: {
              id: "system",
              displayName: "Deep Shop HQ",
              shopName: "Deep Shop HQ",
              photoURL: ""
            }
          });
        } else {
          const uDoc = await getDoc(doc(db, 'users', chatIdParam));
          if (uDoc.exists()) {
            setTempActiveChat({
              isNew: true,
              otherUser: { ...uDoc.data(), id: uDoc.id }
            });
          } else {
            setTempActiveChat({
              isNew: true,
              otherUser: {
                id: chatIdParam,
                displayName: "Verified Seller",
                shopName: "Verified Seller",
                photoURL: ""
              }
            });
          }
        }
      } catch (err) {
        console.error("Error fetching user for temp active chat:", err);
      }
    };

    fetchTempUser();
  }, [chatIdParam, chats, user]);

  // Effect 3: Listen for other user presence status in real-time
  useEffect(() => {
    if (!activeChat || !activeChat.otherUser?.id || activeChat.otherUser.id === 'system') {
      setOtherUserPresence(null);
      return;
    }

    const otherUid = activeChat.otherUser.id;
    const unsub = onSnapshot(doc(db, 'users', otherUid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setOtherUserPresence({
          isOnline: !!data.isOnline && (Date.now() - (data.lastActive || 0) < 40000),
          lastActive: data.lastActive || 0
        });
      }
    });

    return () => unsub();
  }, [activeChat?.otherUser?.id]);

  // Auto-trigger call if autoCall parameter is present
  useEffect(() => {
    const autoCallParam = searchParams.get('autoCall');
    if (activeChat && autoCallParam === 'true') {
      const params = new URLSearchParams(searchParams);
      params.delete('autoCall');
      setSearchParams(params, { replace: true });
      
      startCall('audio');
    }
  }, [activeChat, searchParams, setSearchParams]);

  // Effect 4: Listen for messages & set as seen
  useEffect(() => {
    if (!activeChat || activeChat.isNew || !activeChat.id) {
        setMessages([]);
        return;
    }
    
    const colRef = collection(db, 'p2p_chats', activeChat.id, 'messages');

    const unsub = onSnapshot(colRef, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      
      // Sort messages safely by timestamp
      msgs.sort((a: any, b: any) => {
        const getTs = (m: any) => {
          if (!m.timestamp) return m.createdAt || 0;
          if (m.timestamp.toMillis) return m.timestamp.toMillis();
          if (m.timestamp.seconds) return m.timestamp.seconds * 1000;
          if (typeof m.timestamp === 'number') return m.timestamp;
          return 0;
        };
        return getTs(a) - getTs(b);
      });

      const filteredMsgs = msgs.filter(m => {
          if (m.deletedFor && Array.isArray(m.deletedFor) && user?.uid && m.deletedFor.includes(user.uid)) return false;
          if (activeChat?.autoDeleteTimer && typeof activeChat.autoDeleteTimer.duration === 'number' && activeChat.autoDeleteTimer.duration > 0) {
             const ts = m.timestamp?.toMillis ? m.timestamp.toMillis() : (m.timestamp?.seconds ? m.timestamp.seconds * 1000 : (typeof m.timestamp === 'number' ? m.timestamp : 0));
             if (ts > 0 && Date.now() - ts > activeChat.autoDeleteTimer.duration) return false;
          }
          return true;
      });
      setMessages(filteredMsgs);

      // Mark the active chat as seen by current user in real-time
      if (user && activeChat.id) {
        if (currentUserProfile?.readReceipts !== false) {
          updateDoc(doc(db, 'p2p_chats', activeChat.id), {
            seenBy: arrayUnion(user.uid)
          }).catch(console.error);
        }
      }

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (error) => {
      console.warn("Messages snapshot error:", error);
    });

    // Request notification permission to show push notifications for new messages
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification && window.Notification.permission === 'default') {
      window.Notification.requestPermission().catch(() => {});
    }

    return () => unsub();
  }, [activeChat?.id, user]);

  // Effect 5: Mark chat as seen when opened
  useEffect(() => {
    if (user && activeChat && activeChat.id && !activeChat.isNew) {
      if (currentUserProfile?.readReceipts !== false) {
        updateDoc(doc(db, 'p2p_chats', activeChat.id), {
          seenBy: arrayUnion(user.uid)
        }).catch(console.error);
      }
    }
  }, [activeChat?.id, user]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      if (previewUrls.length + files.length > 4) {
        notify("You can attach up to 4 images max", "error");
        return;
      }
      const newValidFiles = files.filter(f => {
        if (f.size > 5 * 1024 * 1024) {
          notify(`${f.name} is larger than 5MB and was skipped`, "error");
          return false;
        }
        return true;
      });
      
      setIsUploadingAttachment(true);
      try {
        const uploadedUrls = [];
        for (const file of newValidFiles) {
            const url = await uploadToImgbb(file);
            uploadedUrls.push(url);
        }
        setPreviewUrls(prev => [...prev, ...uploadedUrls]);
      } catch (err) {
        notify("Failed to upload image", "error");
      } finally {
        setIsUploadingAttachment(false);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAttachmentChange = handleFileSelect;

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=e0b1df667ddc10816a3036a7edb7e289`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!data.success) throw new Error("Upload failed");
    return data.data.url;
  };

  const handleSendMessage = async (forcedAudioUrl?: string) => {
    const audioUrlToSend = forcedAudioUrl || recordedAudioUrl;
    if ((!newMessage.trim() && previewUrls.length === 0 && !audioUrlToSend) || !user) return;

    const messageText = newMessage.trim();

    // Check Prohibited Words / Admin Word Filter
    if (messageText && bannedWords && bannedWords.length > 0) {
      const lower = messageText.toLowerCase();
      const hit = bannedWords.find(w => w && w.trim() && lower.includes(w.trim().toLowerCase()));
      if (hit) {
        notify(`Your message contains prohibited words ("${hit}"). Please remove inappropriate words to send.`, 'error');
        return;
      }
    }

    if (activeChannel) {
      const isCreator = activeChannel.creatorId === user.uid;
      const isChannelAdmin = channelAdmins.some((a: any) => a.id === user.uid || a.uid === user.uid);
      
      setNewMessage('');
      
      let imageUrls: string[] = [...previewUrls];
      setPreviewUrls([]);

      try {
        const msgData: any = {
          text: messageText || null,
          images: imageUrls,
          imageUrl: imageUrls[0] || null, // fallback
          audioUrl: audioUrlToSend || null,
          audioDuration: recordingDuration || 12,
          senderId: user.uid,
          senderName: userShopName || user.displayName || 'Member',
          senderPhoto: user.photoURL || '',
          senderRole: isCreator ? 'creator' : (isChannelAdmin ? 'admin' : (userRole || 'member')),
          timestamp: serverTimestamp()
        };
        setRecordedAudioUrl(null);

        if (replyingTo) {
          msgData.replyTo = {
            id: replyingTo.id,
            text: replyingTo.text,
            senderId: replyingTo.senderId
          };
          setReplyingTo(null);
        }

        await addDoc(collection(db, 'community_channels', activeChannel.id, 'messages'), msgData);
        
        fetch('/api/send-push-channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: activeChannel.id,
            title: `📢 New Post in ${activeChannel.name}`,
            body: messageText || "Sent an image attachment",
            link: `/messages?channelId=${activeChannel.id}`
          })
        }).catch(err => console.error("Channel push error:", err));

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } catch (err) {
        console.error(err);
        notify("Failed to send community post", "error");
      }
      return;
    }

    if (!activeChat) return;

    setIsTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (activeChat.id && user?.uid) {
      updateDoc(doc(db, 'p2p_chats', activeChat.id), {
        [`typingState.${user.uid}`]: null
      }).catch(console.error);
    }

    setNewMessage('');
    
    let imageUrls: string[] = [...previewUrls];
    setPreviewUrls([]);
    setAttachments([]);
    
    let chatId = activeChat.id;
    
    const lastMessageText = messageText || (audioUrlToSend ? '🎙️ Voice Message' : imageUrls.length > 0 ? 'Sent an image' : 'Sent an attachment');
    
    // If it's a new chat, create it first
    if (activeChat.isNew) {
        const chatRef = await addDoc(collection(db, 'p2p_chats'), {
            participants: [user.uid, activeChat.otherUser.id],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastMessage: lastMessageText,
            lastSenderId: user.uid,
            seenBy: [user.uid]
        });
        chatId = chatRef.id;
        setTempActiveChat({ ...activeChat, id: chatId, isNew: false, seenBy: [user.uid] });
    } else {
        await updateDoc(doc(db, 'p2p_chats', chatId), {
            updatedAt: serverTimestamp(),
            lastMessage: lastMessageText,
            lastSenderId: user.uid,
            seenBy: [user.uid]
        });
    }

    const isGroup = activeChat.isGroup || activeChat.type === 'group';
    const currentSenderName = userShopName || user.displayName || user.email?.split('@')[0] || 'User';
    const currentSenderPhoto = user.photoURL || '';
    const currentSenderRole = activeChat.creatorId === user.uid ? 'creator' : (activeChat.admins?.includes(user.uid) ? 'admin' : (userRole || 'member'));

    const msgData: any = {
      text: messageText,
      images: imageUrls,
      imageUrl: imageUrls[0] || null,
      audioUrl: audioUrlToSend || null,
      audioDuration: recordingDuration || 12,
      senderId: user.uid,
      senderName: currentSenderName,
      senderPhoto: currentSenderPhoto,
      senderRole: isGroup ? currentSenderRole : undefined,
      timestamp: serverTimestamp(),
    };
    setRecordedAudioUrl(null);

    if (replyingTo) {
      msgData.replyTo = {
        id: replyingTo.id,
        text: replyingTo.text,
        senderId: replyingTo.senderId,
        senderName: (replyingTo as any).senderName || (replyingTo.senderId === user.uid ? 'You' : (participantProfiles[replyingTo.senderId]?.displayName || 'User'))
      };
      setReplyingTo(null);
    }

    await addDoc(collection(db, 'p2p_chats', chatId, 'messages'), msgData);
    
    // Send a real push notification to the recipient!
    const recipientId = activeChat.otherUser?.id || activeChat.otherUser?.uid;
    if (recipientId && recipientId !== "system") {
      fetch("/api/send-push-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: recipientId,
          title: user.displayName || "New Message",
          body: messageText || "Sent an image",
          link: `/messages?chatId=${user.uid}`
        })
      }).catch(err => console.error("Message push notification failed:", err));
    }
    
    // Local push notification simulation for the other user receiving it (this would normally be Cloud Functions)
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification && window.Notification.permission === 'granted') {
        // Just for demo, we don't send notification to ourselves
    }
  };

  const handleSendDirectMedia = async (url: string, isSticker: boolean = false) => {
    if (!activeChat || !user) return;
    try {
      let chatId = activeChat.id;
      if (activeChat.isNew) {
        const chatRef = await addDoc(collection(db, 'p2p_chats'), {
          participants: [user.uid, activeChat.otherUser.id],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: isSticker ? '✨ Sticker' : 'Sent an image',
          lastSenderId: user.uid,
          seenBy: [user.uid],
        });
        chatId = chatRef.id;
        setTempActiveChat({ ...activeChat, id: chatId, isNew: false, seenBy: [user.uid] });
        setSearchParams({ chatId });
      }

      const msgData: any = {
        senderId: user.uid,
        senderName: userShopName || user.displayName || user.email?.split('@')[0] || 'User',
        senderPhoto: user.photoURL || '',
        imageUrl: url,
        images: [url],
        text: isSticker ? '✨ Sticker' : '',
        timestamp: serverTimestamp(),
        seenBy: [user.uid],
      };

      await addDoc(collection(db, 'p2p_chats', chatId, 'messages'), msgData);
      await updateDoc(doc(db, 'p2p_chats', chatId), {
        lastMessage: isSticker ? '✨ Sticker' : 'Sent an image',
        lastSenderId: user.uid,
        updatedAt: serverTimestamp(),
        seenBy: [user.uid],
      });

      audioHelper.playMessageSentSound();
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (e) {
      console.error('Error sending media:', e);
      notify('Failed to send media', 'error');
    }
  };

  const handleSelectTheme = (theme: ChatTheme) => {
    setActiveTheme(theme);
    localStorage.setItem('deepshop_chat_theme_id', theme.id);
    if (activeChat?.id) {
      localStorage.setItem(`chat_theme_${activeChat.id}`, theme.id);
      try {
        updateDoc(doc(db, 'p2p_chats', activeChat.id), { themeId: theme.id }).catch(() => {});
      } catch {}
    }
    notify(`Applied ${theme.name} theme`, 'success');
  };

  const handleSelectSavedReply = (reply: SavedReply) => {
    setNewMessage(reply.message);
  };

  // --- Calling Logic (Real-time P2P) ---
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [webRTCError, setWebRTCError] = useState<string | null>(null);

  // Sync with activeCallIdParam (if accepted from incoming call overlay)
  useEffect(() => {
    const activeCallIdParam = searchParams.get('activeCallId');
    const callTypeParam = searchParams.get('callType') as 'audio' | 'video' | null;
    if (activeCallIdParam) {
      setWebRTCError(null);
      setCurrentCallId(activeCallIdParam);
      setIsCalling(true);
      setCallStatus('connected');
      if (callTypeParam) setCallType(callTypeParam);
      
      // Clean query params so we don't trigger it again
      const params = new URLSearchParams(searchParams);
      params.delete('activeCallId');
      params.delete('callType');
      setSearchParams(params, { replace: true });
    }
  }, [searchParams]);

  // Listen to the active call doc
  useEffect(() => {
    if (!currentCallId) return;

    const unsub = onSnapshot(doc(db, 'p2p_calls', currentCallId), (snap) => {
      const data = snap.data();
      if (!data) return;

      if (data.status === 'ringing') {
        setCallStatus('ringing');
      } else if (data.status === 'connected') {
        if (callStatus !== 'connected') {
          setCallStatus('connected');
          if (audioHelper && typeof audioHelper.stop === 'function') {
            audioHelper.stop();
          }
          setCallDuration(0);
          
          // Log start of call in chat if we are the caller
          if (data.callerId === user?.uid && activeChat && !activeChat.isNew) {
            addDoc(collection(db, 'p2p_chats', activeChat.id, 'messages'), {
              text: `Started ${data.type} call`,
              senderId: user?.uid,
              systemType: data.type,
              timestamp: Date.now()
            }).catch(console.error);
          }
        }
      } else if (data.status === 'ended') {
        setIsCalling(false);

        // Thoroughly stop and clean up all WebRTC streams, microphone & camera tracks
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track: any) => {
            try {
              track.enabled = false;
              track.stop();
            } catch (e) {}
          });
          localStreamRef.current = null;
        }
        if (localStream) {
          localStream.getTracks().forEach((track: any) => {
            try {
              track.enabled = false;
              track.stop();
            } catch (e) {}
          });
        }
        if (remoteStream) {
          remoteStream.getTracks().forEach((track: any) => {
            try {
              track.enabled = false;
              track.stop();
            } catch (e) {}
          });
        }
        setLocalStream(null);
        setRemoteStream(null);
        if (peerConnectionRef.current) {
          try {
            peerConnectionRef.current.close();
          } catch (e) {}
          peerConnectionRef.current = null;
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = null;
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }

        if (audioHelper && typeof audioHelper.stop === 'function') {
          audioHelper.stop();
        }
        if (audioHelper && typeof audioHelper.playEndBip === 'function') {
          audioHelper.playEndBip();
        }
        
        // Log end of call in chat if we are the caller and we were connected
        if (data.callerId === user?.uid && activeChat && !activeChat.isNew && callStatus === 'connected') {
          addDoc(collection(db, 'p2p_chats', activeChat.id, 'messages'), {
            text: `${callType} call ended (${Math.floor(callDuration / 60)}m ${callDuration % 60}s)`,
            senderId: user?.uid,
            systemType: callType,
            timestamp: serverTimestamp()
          }).catch(console.error);
        }
        
        setCurrentCallId(null);
      }
    });

    return () => unsub();
  }, [currentCallId, callStatus, activeChat, user, callType, callDuration]);

  const startCall = async (type: 'audio' | 'video') => {
    if (!user || !activeChat || activeChat.isNew) {
      notify("Please open an active chat to make a call.", "error");
      return;
    }

    const targetUserId = activeChat.otherUser?.id;
    if (targetUserId && targetUserId !== "system") {
      try {
        const uDoc = await getDoc(doc(db, 'users', targetUserId));
        if (uDoc.exists()) {
          const targetData = uDoc.data();
          if (targetData.disableCalls === true) {
            setDisabledCallUser(targetData);
            return;
          }
        }
      } catch (err) {
        console.error("Error checking target user call status:", err);
      }
    }

    setWebRTCError(null);
    setCallType(type);
    setIsCalling(true);
    setCallStatus('connecting');

    if (audioHelper && typeof audioHelper.play === 'function') {
      audioHelper.play('calling');
    } else if (audioHelper && typeof audioHelper.playCalling === 'function') {
      audioHelper.playCalling();
    }

    try {
      fetch('/api/web-push/send-p2p', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
               targetUserId: activeChat.otherUser.id,
               title: `Incoming ${callType} call 📞`,
               body: `${user.displayName || 'Someone'} is calling you...`,
               link: `/messages?chatId=${user.uid}`
           })
       }).catch(() => {});
       
      const callRef = await addDoc(collection(db, 'p2p_calls'), {
        callerId: user.uid,
        callerName: user.displayName || 'Deep Shop Customer',
        callerAvatar: user.photoURL || '',
        receiverId: activeChat.otherUser.id,
        status: 'calling',
        type,
        timestamp: Date.now()
      });
      setCurrentCallId(callRef.id);

      // Send push notification to receiver!
      fetch("/api/send-push-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activeChat.otherUser?.id || activeChat.otherUser?.uid,
          title: `Incoming ${type === 'audio' ? 'Voice' : 'Video'} Call...`,
          body: `${user.displayName || 'Someone'} is calling you on Deep Shop.`,
          link: `/messages?chatId=${user.uid}&autoCall=true`
        })
      }).catch(err => console.error("Call push notification failed:", err));
    } catch (e) {
      console.error("Failed to start call:", e);
      setIsCalling(false);
      if (audioHelper && typeof audioHelper.stop === 'function') {
        audioHelper.stop();
      }
    }
  };

  useEffect(() => {
    let interval: any;
    if (callStatus === 'connected') {
        interval = setInterval(() => setCallDuration(p => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  useEffect(() => {
    if (activeChat?.id) {
      const val = localStorage.getItem('dismissed_review_' + activeChat.id);
      setReviewDismissedAt(val ? parseInt(val) : 0);
    }
  }, [activeChat?.id]);

  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted, localStream]);

  // Synchronize local and remote streams to video/audio HTML tags reactively
  useEffect(() => {
    if (localStream && callType === 'video' && localVideoRef.current) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      localVideoRef.current.play().catch(e => console.warn("Local video play warning:", e));
    }
  }, [localStream, callType]);

  useEffect(() => {
    if (remoteStream) {
      if (callType === 'video' && remoteVideoRef.current) {
        if (remoteVideoRef.current.srcObject !== remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        remoteVideoRef.current.play().catch(e => console.warn("Remote video play warning:", e));
      }
      if (remoteAudioRef.current) {
        if (remoteAudioRef.current.srcObject !== remoteStream) {
          remoteAudioRef.current.srcObject = remoteStream;
        }
        remoteAudioRef.current.play().catch(e => console.warn("Remote audio play warning:", e));
      }
    }
  }, [remoteStream, callType]);

  useEffect(() => {
    if (!currentCallId || callStatus !== 'connected') {
      return;
    }

    let isSubscribed = true;
    let unsubCandidates1: any = null;
    let unsubCallDoc: any = null;

    const setupWebRTC = async () => {
      try {
        console.log("Setting up WebRTC connection... callId:", currentCallId);
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: callType === 'video' ? {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          } : false
        });
        
        if (!isSubscribed) {
          stream.getTracks().forEach(track => {
            track.enabled = false;
            track.stop();
          });
          return;
        }

        setLocalStream(stream);
        localStreamRef.current = stream;

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        });
        peerConnectionRef.current = pc;

        // Logs for debugging WebRTC state transitions
        pc.oniceconnectionstatechange = () => {
          console.log("ICE Connection State changed:", pc.iceConnectionState);
        };
        pc.onconnectionstatechange = () => {
          console.log("Peer Connection State changed:", pc.connectionState);
        };
        pc.onsignalingstatechange = () => {
          console.log("Signaling State changed:", pc.signalingState);
        };

        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        pc.ontrack = (event) => {
          console.log("Remote stream track received:", event);
          if (event.streams && event.streams[0]) {
            setRemoteStream(event.streams[0]);
          } else if (event.track) {
            const inboundStream = new MediaStream([event.track]);
            setRemoteStream(inboundStream);
          }
        };

        const callDocRef = doc(db, 'p2p_calls', currentCallId);
        const callSnap = await getDoc(callDocRef);
        if (!callSnap.exists()) return;
        const callData = callSnap.data();
        const isCaller = callData.callerId === user?.uid;

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const candidateData = event.candidate.toJSON();
            const collectionName = isCaller ? 'callerCandidates' : 'receiverCandidates';
            addDoc(collection(db, 'p2p_calls', currentCallId, collectionName), candidateData)
              .catch(e => console.error("Error adding ice candidate to DB:", e));
          }
        };

        // Buffer candidate logic to prevent adding before remote description is set
        const iceCandidatesBuffer: RTCIceCandidateInit[] = [];
        
        const processIceBuffer = () => {
          console.log(`Processing ${iceCandidatesBuffer.length} buffered ICE candidates.`);
          while (iceCandidatesBuffer.length > 0) {
            const candidateInit = iceCandidatesBuffer.shift();
            if (candidateInit) {
              const candidate = new RTCIceCandidate(candidateInit);
              pc.addIceCandidate(candidate).catch(e => console.error("Error adding buffered ice candidate:", e));
            }
          }
        };

        const remoteCandidateCol = collection(db, 'p2p_calls', currentCallId, isCaller ? 'receiverCandidates' : 'callerCandidates');
        unsubCandidates1 = onSnapshot(remoteCandidateCol, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const candidateInit = change.doc.data() as RTCIceCandidateInit;
              if (pc.remoteDescription && pc.remoteDescription.type) {
                const candidate = new RTCIceCandidate(candidateInit);
                pc.addIceCandidate(candidate).catch(e => console.error("Error adding remote ice candidate:", e));
              } else {
                iceCandidatesBuffer.push(candidateInit);
              }
            }
          });
        });

        if (isCaller) {
          console.log("Initializing as Caller: Creating Offer");
          const offerDescription = await pc.createOffer();
          await pc.setLocalDescription(offerDescription);
          
          await updateDoc(callDocRef, {
            offer: {
              type: offerDescription.type,
              sdp: offerDescription.sdp
            }
          });

          unsubCallDoc = onSnapshot(callDocRef, (snap) => {
            const data = snap.data();
            if (data && data.answer && !pc.currentRemoteDescription) {
              console.log("Caller received Answer: setting remote description");
              const answerDescription = new RTCSessionDescription(data.answer);
              pc.setRemoteDescription(answerDescription)
                .then(processIceBuffer)
                .catch(e => console.error("Error setting remote description on caller:", e));
            }
          });
        } else {
          console.log("Initializing as Receiver");
          if (callData.offer) {
            console.log("Receiver setting offer immediately");
            const offerDescription = new RTCSessionDescription(callData.offer);
            await pc.setRemoteDescription(offerDescription)
              .then(processIceBuffer)
              .catch(e => console.error("Error setting remote description on receiver:", e));
            
            const answerDescription = await pc.createAnswer();
            await pc.setLocalDescription(answerDescription);
            
            await updateDoc(callDocRef, {
              answer: {
                type: answerDescription.type,
                sdp: answerDescription.sdp
              }
            });
          } else {
            console.log("Receiver waiting for offer from caller via snapshot");
            unsubCallDoc = onSnapshot(callDocRef, async (snap) => {
              const data = snap.data();
              if (data && data.offer && !pc.currentRemoteDescription) {
                console.log("Receiver received offer from snapshot: setting remote description");
                const offerDescription = new RTCSessionDescription(data.offer);
                await pc.setRemoteDescription(offerDescription)
                  .then(processIceBuffer)
                  .catch(e => console.error("Error setting remote description from snapshot on receiver:", e));
                
                const answerDescription = await pc.createAnswer();
                await pc.setLocalDescription(answerDescription);
                
                await updateDoc(callDocRef, {
                  answer: {
                    type: answerDescription.type,
                    sdp: answerDescription.sdp
                  }
                });
              }
            });
          }
        }
      } catch (err: any) {
        console.error("WebRTC setup error:", err);
        setWebRTCError(err.message || String(err));
        notify("Could not establish audio connection. Please check mic permissions.", "error");
      }
    };

    setupWebRTC();

    return () => {
      isSubscribed = false;
      if (unsubCandidates1) unsubCandidates1();
      if (unsubCallDoc) unsubCallDoc();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track: any) => {
          try {
            track.stop();
            track.enabled = false;
          } catch (e) {}
        });
        localStreamRef.current = null;
      }
      if (peerConnectionRef.current) {
        try {
          peerConnectionRef.current.close();
        } catch (e) {}
        peerConnectionRef.current = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }
    };
  }, [currentCallId, callStatus]);

  const endCall = async () => {
    const finalDuration = callDuration;
    
    setIsCalling(false);
    setWebRTCError(null);
    
    // Clean up WebRTC streams and peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: any) => {
        try {
          track.stop();
          track.enabled = false;
        } catch (e) {}
      });
      localStreamRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track: any) => {
        try {
          track.stop();
          track.enabled = false;
        } catch (e) {}
      });
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track: any) => {
        try {
          track.stop();
          track.enabled = false;
        } catch (e) {}
      });
    }
    setLocalStream(null);
    setRemoteStream(null);
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (e) {}
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    if (audioHelper && typeof audioHelper.stop === 'function') {
      audioHelper.stop();
    }
    if (audioHelper && typeof audioHelper.playEndBip === 'function') {
      audioHelper.playEndBip();
    }
    
    if (currentCallId) {
      await updateDoc(doc(db, 'p2p_calls', currentCallId), {
        status: 'ended'
      }).catch(console.error);
      setCurrentCallId(null);
    }
    
    if (finalDuration > 0 && activeChat && activeChat.id) {
       try {
         await addDoc(collection(db, 'p2p_chats', activeChat.id, 'messages'), {
            text: `Call ended. Duration: ${formatDuration(finalDuration)}`,
            senderId: 'system',
            timestamp: Date.now(),
            readBy: [user.uid]
         });
       } catch (e) { console.error(e); }
    }
  };
  
  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmitReview = async () => {
    if (!user || !activeChat || !activeChat.otherUser?.id) return;
    if (!reviewText.trim()) return;

    const bannedWord = await checkContainsBannedWord(reviewText);
    if (bannedWord) {
      notify(`Your review contains prohibited words ("${bannedWord}"). Please edit your review.`, 'error');
      return;
    }

    setIsSubmittingReview(true);
    try {
      if (isScamReview(reviewText)) {
        // Auto-remove: Drop scam accusations silently as requested without exposing restrictions
        setHasReviewed(true);
        setShowReviewModal(false);
        setReviewText("");
        notify("Review submitted successfully!", "success");
        return;
      }

      await addDoc(collection(db, "user_reviews"), {
        reviewerId: user.uid,
        reviewerName: user.displayName || user.email?.split("@")[0] || "Someone",
        reviewerPhoto: user.photoURL || "",
        revieweeId: activeChat.otherUser.id,
        rating: reviewRating,
        comment: reviewText.trim(),
        createdAt: Date.now(),
        chatId: activeChat.id || "p2p"
      });

      const reviewerName = user.displayName || "Someone";
      const revieweeName = activeChat.otherUser.displayName || activeChat.otherUser.shopName || "User";

      fetch("/api/send-push-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activeChat.otherUser.id,
          title: "New Review Received! ⭐",
          body: `${reviewerName} gave you a ${reviewRating}-star rating: "${reviewText.trim() || 'Excellent!'}"`,
          link: `/store/${activeChat.otherUser.id}`
        })
      }).catch(err => console.error("Push to reviewee failed:", err));

      fetch("/api/send-push-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          title: "Review Submitted! 🎉",
          body: `You successfully rated ${revieweeName} ${reviewRating} Stars!`,
          link: "/messages"
        })
      }).catch(err => console.error("Push to reviewer failed:", err));

      setHasReviewed(true);
      setShowReviewModal(false);
      setReviewText("");
      notify("Review submitted successfully!", "success");
    } catch (err) {
      console.error("Error submitting review:", err);
      notify("Failed to submit review", "error");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const lastScrollTopRef = useRef(0);
  const handleSidebarScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop > lastScrollTopRef.current + 10 && scrollTop > 50) {
      setIsOnlineSectionVisible(false);
    } else if (scrollTop <= 10) {
      setIsOnlineSectionVisible(true);
    }
    lastScrollTopRef.current = scrollTop;
  };
  const handleStartNewChat = async () => {
      if (!newChatInput.trim()) return;
      setIsSearchingUser(true);
      try {
          // Search for user by email or phone
          const usersRef = collection(db, 'users');
          // Since we might not have a composite index, we query both and merge, or just try to find by email or phone separately.
          const emailQuery = query(usersRef, where('email', '==', newChatInput.trim().toLowerCase()), limit(1));
          const phoneQuery = query(usersRef, where('phoneNumber', '==', newChatInput.trim()), limit(1));
          
          let targetUserDoc = null;
          const emailSnapshot = await getDocs(emailQuery);
          if (!emailSnapshot.empty) {
              targetUserDoc = emailSnapshot.docs[0];
          } else {
              const phoneSnapshot = await getDocs(phoneQuery);
              if (!phoneSnapshot.empty) {
                  targetUserDoc = phoneSnapshot.docs[0];
              }
          }

          if (targetUserDoc) {
              if (targetUserDoc.id === user.uid) {
                  notify("You cannot start a chat with yourself.", "error");
                  setIsSearchingUser(false);
                  return;
              }
              const targetUserData = targetUserDoc.data();
              // Check if chat already exists
              const existingChat = chats.find(c => c.type === 'p2p' && c.participants.includes(targetUserDoc.id));
              if (existingChat) {
                  setSearchParams({ chatId: existingChat.id });
                  setShowNewChatModal(false);
                  setNewChatInput('');
                  return;
              }
              
              // Create new chat
              const chatsRef = collection(db, 'chats');
              const newChatData = {
                  participants: [user.uid, targetUserDoc.id],
                  type: 'p2p',
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                  createdBy: user.uid,
                  lastMessage: 'Chat started',
                  lastSenderId: user.uid,
                  seenBy: [user.uid]
              };
              const docRef = await addDoc(chatsRef, newChatData);
              setSearchParams({ chatId: docRef.id });
              setShowNewChatModal(false);
              setNewChatInput('');
              notify("Chat created successfully!", "success");
          } else {
              notify("No user found with that email or phone number.", "error");
          }
      } catch (err) {
          console.error(err);
          notify("An error occurred while searching for the user.", "error");
      }
      setIsSearchingUser(false);
  };
  const handleClearChat = async (chatId: string) => {
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const q = query(messagesRef);
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: 'Chat history cleared for you',
        updatedAt: serverTimestamp()
      });
      
      notify('Chat history cleared', 'success');
      setShowPrivateChatMenu(false);
    } catch (err) {
      console.error('Error clearing chat history:', err);
      notify('Failed to clear chat history', 'error');
    }
  };

  const handleClearChatForEveryone = async (chatId: string) => {
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const q = query(messagesRef);
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: 'Chat history cleared for everyone',
        updatedAt: serverTimestamp()
      });
      
      notify('Chat history cleared for everyone', 'success');
      setShowPrivateChatMenu(false);
    } catch (err) {
      console.error('Error clearing chat history for everyone:', err);
      notify('Failed to clear chat history', 'error');
    }
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewMessage(val);

    if (!activeChat || activeChat.isNew || !activeChat.id || !user?.uid) return;

    if (val.trim().length > 0) {
      if (!isTyping) {
        setIsTyping(true);
        updateDoc(doc(db, 'p2p_chats', activeChat.id), {
          [`typingState.${user.uid}`]: { status: 'typing', updatedAt: Date.now() }
        }).catch(console.error);
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        if (activeChat?.id && user?.uid) {
          updateDoc(doc(db, 'p2p_chats', activeChat.id), {
            [`typingState.${user.uid}`]: null
          }).catch(console.error);
        }
      }, 3500);
    } else {
      setIsTyping(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (activeChat?.id && user?.uid) {
        updateDoc(doc(db, 'p2p_chats', activeChat.id), {
          [`typingState.${user.uid}`]: null
        }).catch(console.error);
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determine best supported recording MIME type
      let mimeType = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/aac')) {
          mimeType = 'audio/aac';
        } else {
          mimeType = '';
        }
      }
      recordedMimeTypeRef.current = mimeType || 'audio/webm';
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const finalType = mediaRecorder.mimeType || recordedMimeTypeRef.current || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: finalType });
        
        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64AudioMessage = reader.result as string;
          setRecordedAudioUrl(base64AudioMessage);
          
          // Stop all microphone tracks immediately
          stream.getTracks().forEach(track => {
            try {
              track.stop();
              track.enabled = false;
            } catch (e) {}
          });

          if (shouldAutoSendRef.current) {
            shouldAutoSendRef.current = false;
            handleSendMessage(base64AudioMessage);
          }
        };
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);
      
      if (activeChat && !activeChat.isNew && activeChat.id && user?.uid) {
        updateDoc(doc(db, 'p2p_chats', activeChat.id), {
          [`typingState.${user.uid}`]: { status: 'recording', updatedAt: Date.now() }
        }).catch(console.error);
      }

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error("Error accessing microphone", err);
      notify("Microphone access denied", "error");
    }
  };

  const stopRecording = (autoSend: boolean = false) => {
    if (mediaRecorderRef.current && isRecording) {
      shouldAutoSendRef.current = autoSend;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
      if (activeChat && !activeChat.isNew && activeChat.id && user?.uid) {
        updateDoc(doc(db, 'p2p_chats', activeChat.id), {
          [`typingState.${user.uid}`]: null
        }).catch(console.error);
      }
    }
  };
  
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      shouldAutoSendRef.current = false;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
      // Don't save
      audioChunksRef.current = [];
      setRecordedAudioUrl(null);
      if (activeChat && !activeChat.isNew && activeChat.id && user?.uid) {
        updateDoc(doc(db, 'p2p_chats', activeChat.id), {
          [`typingState.${user.uid}`]: null
        }).catch(console.error);
      }
    }
  };




  if (!user) {
    return (
        <div className="min-h-screen w-full bg-[#4E4AEB] flex flex-col items-center justify-center p-4 sm:p-6 font-inter select-none">
            <SEO title="Chat and Connect" description="Sign in to chat with sellers and friends easily" noindex />
            <div className="bg-white text-zinc-900 rounded-[36px] w-full max-w-sm h-[740px] shadow-2xl flex flex-col p-8 relative overflow-hidden">
                {/* Main Heading styled exactly like the mockup */}
                <div className="flex flex-col text-left mt-8">
                    <h1 className="text-[38px] font-medium text-zinc-900 tracking-tight leading-[1.1] mb-6">
                        Chat And <br />
                        <span className="inline-flex items-center gap-1.5">
                            Connect 
                            <span className="inline-flex items-center justify-center -space-x-1 ml-1 mr-1">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Samantha" alt="User 1" className="w-8 h-8 rounded-full object-cover border-[3px] border-white shadow-sm" />
                            </span>
                            With
                        </span> <br />
                        <span className="inline-flex items-center gap-1.5">
                            Your 
                            <span className="inline-flex items-center justify-center -space-x-1 ml-1 mr-1">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jaden" alt="User 2" className="w-8 h-8 rounded-full object-cover border-[3px] border-white shadow-sm" />
                            </span>
                            Loved
                        </span> <br />
                        Ones Easily
                    </h1>
                    <p className="text-zinc-500 text-xs font-medium leading-relaxed max-w-[280px] mb-8">
                        Sign in right now to get started and get all the greatest perks!
                    </p>
                </div>

                {/* Beautiful Mockup Chat Rows exactly as pictured */}
                <div className="flex-1 flex flex-col gap-4 justify-center relative py-4">
                    {/* Mock Card 1 */}
                    <div className="bg-white border border-zinc-100 p-4 rounded-3xl flex items-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10 w-full max-w-[280px]">
                        <div className="relative shrink-0">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Adam" className="w-10 h-10 rounded-full object-cover bg-indigo-50" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <div className="flex justify-between items-center mb-0.5">
                                <h4 className="font-semibold text-sm text-zinc-800">Adam Kepler</h4>
                                <span className="text-[10px] text-zinc-400">12:15</span>
                            </div>
                            <p className="text-[11px] text-zinc-500 font-medium truncate">I had a lovely conversation</p>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-400 flex items-center justify-center shadow-sm">
                            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        </div>
                    </div>

                    {/* Mock Card 2 */}
                    <div className="bg-white border border-zinc-100 p-4 rounded-3xl flex items-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative ml-8 z-0 w-full max-w-[280px]">
                        <div className="relative shrink-0">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Julia" className="w-10 h-10 rounded-full object-cover bg-amber-50" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <div className="flex justify-between items-center mb-0.5">
                                <h4 className="font-semibold text-sm text-zinc-800">Julia Robinson</h4>
                                <span className="text-[10px] text-zinc-400">12:15</span>
                            </div>
                            <p className="text-[11px] text-zinc-500 font-medium truncate">Today we will have lunch...</p>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-400 flex items-center justify-center shadow-sm">
                            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        </div>
                    </div>
                </div>

                {/* Bottom Onboarding Buttons matching the mockup exactly */}
                <div className="flex flex-col gap-4 mt-auto">
                    {/* Button 1: Sign up with phone number (Orange style with Phone logo) */}
                    <button 
                        onClick={() => navigate('/auth-selector')}
                        className="w-full bg-[#F8F9FB] hover:bg-zinc-100 p-2 pl-6 rounded-[24px] flex items-center justify-between transition-all group cursor-pointer"
                    >
                        <span className="text-zinc-600 font-medium text-sm">Sign up with phone number</span>
                        <div className="w-12 h-12 rounded-[20px] bg-[#FFB800] flex items-center justify-center text-white shrink-0">
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        </div>
                    </button>

                    {/* Button 2: Sign up with Google/Email (Indigo/Blue style with G logo) */}
                    <button 
                        onClick={() => navigate('/auth-selector')}
                        className="w-full bg-[#4E4AEB] hover:bg-[#3d39db] p-2 pl-6 rounded-[24px] flex items-center justify-between shadow-md transition-all group cursor-pointer"
                    >
                        <span className="text-white font-medium text-sm">Sign up with Google account</span>
                        <div className="w-12 h-12 rounded-[20px] bg-white flex items-center justify-center text-[#4E4AEB] shrink-0 font-bold text-xl">
                            G
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
  }

  const filteredMessages = p2pSearchQuery 
    ? messages.filter(m => m.text?.toLowerCase().includes(p2pSearchQuery.toLowerCase())) 
    : messages;

  return (
    <div className={cn(
        "flex h-[100dvh] font-inter overflow-hidden transition-all duration-300", 
        privacySettings.liquidGlassMode 
          ? "bg-gradient-to-tr from-[#EF8020]/10 via-zinc-50/40 to-indigo-50/20 dark:from-zinc-950 dark:via-zinc-900/40 dark:to-zinc-950" 
          : "bg-zinc-50 dark:bg-zinc-950"
    )}>
      <SEO title="Messages" description="Chat with sellers and support" noindex />

      {/* Desktop Left Navigation Rail */}
      <div className={cn(
          "hidden md:flex flex-col items-center justify-between py-6 w-16 shrink-0 z-20 transition-all duration-300",
          privacySettings.liquidGlassMode 
            ? "bg-white/45 dark:bg-zinc-900/40 backdrop-blur-xl border-r border-white/20 dark:border-zinc-800/30" 
            : "bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800"
      )}>
          <div className="flex flex-col items-center gap-6 w-full">
              {/* Chats Tab */}
              <button 
                  onClick={() => setActiveMessagesTab('chats')}
                  className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center transition-all relative group active:scale-95",
                      activeMessagesTab === 'chats' 
                          ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 font-extrabold" 
                          : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  )}
                  title="Chats"
              >
                  <Icon name="message-circle" className="w-5 h-5" solid={false} />
                  {activeMessagesTab === 'chats' && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-600 dark:bg-indigo-400 rounded-r-full" />
                  )}
              </button>

              {/* Settings Tab */}
              <button 
                  onClick={() => setActiveMessagesTab('settings')}
                  className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center transition-all relative group active:scale-95",
                      activeMessagesTab === 'settings' 
                          ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 font-extrabold" 
                          : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  )}
                  title="Settings"
              >
                  <Icon name="settings" className="w-5 h-5" solid={false} />
                  {activeMessagesTab === 'settings' && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-600 dark:bg-indigo-400 rounded-r-full" />
                  )}
              </button>
          </div>

          {/* User Profile Avatar at Bottom */}
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-100 shadow-sm shrink-0 cursor-pointer hover:opacity-85 transition-opacity" onClick={() => navigate('/profile')}>
              <img src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || 'Jaden'}`} alt="Avatar" className="w-full h-full object-cover" />
          </div>
      </div>
      
      {/* Sidebar: Chat List */}
      <div className={cn(
          activeMessagesTab === 'settings' 
            ? "w-full md:w-full border-r flex flex-col relative transition-all duration-300" 
            : "w-full md:w-[350px] border-r flex flex-col relative transition-all duration-300",
          privacySettings.liquidGlassMode 
            ? "bg-white/45 dark:bg-zinc-900/40 backdrop-blur-xl border-white/20 dark:border-zinc-800/30" 
            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800",
          activeChat || activeChannel ? 'hidden md:flex' : 'flex'
      )}>
         {/* Top Bar Header Area matching the mockup */}
         <div className="p-5 pb-3 flex flex-col gap-4">
             <div className="flex items-center justify-between">
                 <div className="flex items-center gap-1.5 min-w-0">
                      <button 
                          onClick={() => {
                              if (activeMessagesTab === 'settings') {
                                  setActiveMessagesTab('chats');
                              } else {
                                  navigate('/');
                              }
                          }} 
                          className="md:hidden p-2 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 transition shrink-0 active:scale-95"
                          title="Back"
                      >
                         <ChevronLeft className="w-6 h-6" />
                     </button>
                     <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight truncate leading-tight">
                         {activeMessagesTab === 'settings' ? 'Settings' : `Hello, ${user?.displayName?.split(' ')[0] || 'Jaden'}`}
                     </h1>
                 </div>
                 <div className="flex items-center gap-2.5 shrink-0">
                     {activeMessagesTab === 'chats' && (
                         <button 
                             type="button"
                             onClick={() => setShowNewMessageModal(true)} 
                             className="w-10 h-10 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 flex items-center justify-center transition-all shadow-xs text-zinc-900 dark:text-zinc-100 active:scale-95 cursor-pointer"
                             title="New Message"
                         >
                             <Edit3 className="w-5 h-5 stroke-[2.2]" />
                         </button>
                     )}
                     <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-100 shadow-sm shrink-0 cursor-pointer hover:opacity-85 transition-opacity" onClick={() => navigate('/profile')}>
                         <img src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || 'Jaden'}`} alt="User Avatar" className="w-full h-full object-cover" />
                     </div>
                 </div>
             </div>

             {/* Search Input Panel (gorgeously animated / toggleable) */}
             {(showP2pSearch || chatSearchQuery.trim().length > 0) && (
                 <motion.div 
                     initial={{ opacity: 0, height: 0 }} 
                     animate={{ opacity: 1, height: 'auto' }}
                     className="relative w-full"
                 >
                     <Search className="absolute left-4 top-3 w-4 h-4 text-indigo-500" />
                     <input 
                         type="text" 
                         value={chatSearchQuery}
                         onChange={(e) => setChatSearchQuery(e.target.value)}
                         placeholder="Search users or username..." 
                         className="w-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700 rounded-full py-2.5 pl-11 pr-11 text-xs font-semibold outline-none focus:ring-2 ring-indigo-500/50 text-zinc-900 dark:text-white" 
                     />
                     {chatSearchQuery ? (
                         <button 
                             onClick={() => setChatSearchQuery('')}
                             className="absolute right-4 top-3 text-zinc-400 hover:text-zinc-600 transition"
                         >
                             <X className="w-4 h-4" />
                         </button>
                     ) : (
                         <Mic className="absolute right-4 top-3 w-4 h-4 text-zinc-400" />
                     )}
                 </motion.div>
             )}
         </div>

         {/* Active Stories Row */}
                  {activeMessagesTab === 'settings' ? (
             <div className="flex-1 overflow-y-auto p-5 space-y-6 md:max-w-4xl md:mx-auto md:w-full">
                 {/* Premium User Card in Settings */}
                 <div className="bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-200/50 dark:border-zinc-700/30 rounded-3xl p-5 flex items-center gap-4">
                     <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-indigo-100 shadow-sm shrink-0">
                         <img src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || 'Jaden'}`} alt="Avatar" className="w-full h-full object-cover" />
                     </div>
                     <div className="min-w-0 flex-1">
                         <h2 className="font-extrabold text-zinc-900 dark:text-white text-base truncate leading-none mb-1">{user?.displayName || 'User'}</h2>
                         <p className="text-xs text-zinc-400 truncate">@{user?.displayName?.toLowerCase().replace(/ /g, '') || 'username'}</p>
                         <span className="inline-block mt-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                             {userRole}
                         </span>
                     </div>
                 </div>

                                   {/* Settings Sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 space-y-0 items-start">
                      <div className="space-y-4">
                     <h3 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">
                         Privacy & Security
                     </h3>

                     {/* Allow DM Toggle */}
                     <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
                       <div className="space-y-0.5 max-w-[75%]">
                         <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                           Allow Direct Messages
                         </label>
                         <p className="text-[10px] text-zinc-500 leading-tight">
                           Anyone can send you a message. If turned off, users will see a privacy notice.
                         </p>
                       </div>
                       <button
                         type="button"
                         onClick={() => handleUpdatePrivacySetting('privacy.allowDirectMessages', !privacySettings.allowDirectMessages)}
                         className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.allowDirectMessages ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                       >
                         <span
                           className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.allowDirectMessages ? 'translate-x-5' : 'translate-x-0'}`}
                         />
                       </button>
                     </div>

                     {/* Online Status Toggle */}
                     <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
                       <div className="space-y-0.5 max-w-[75%]">
                         <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                           Online Status
                         </label>
                         <p className="text-[10px] text-zinc-500 leading-tight">
                           Show others when you are online in chats.
                         </p>
                       </div>
                       <button
                         type="button"
                         onClick={() => handleUpdatePrivacySetting('privacy.showOnlineStatus', !privacySettings.showOnlineStatus)}
                         className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.showOnlineStatus ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                       >
                         <span
                           className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.showOnlineStatus ? 'translate-x-5' : 'translate-x-0'}`}
                         />
                       </button>
                     </div>

                     {/* Push Notifications Toggle */}
                     <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
                       <div className="space-y-0.5 max-w-[75%]">
                         <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                           Push Notifications
                         </label>
                         <p className="text-[10px] text-zinc-500 leading-tight">
                           Receive alerts for new messages and calls.
                         </p>
                       </div>
                       <button
                         type="button"
                         onClick={() => handleUpdatePrivacySetting('privacy.pushNotifications', !privacySettings.pushNotifications)}
                         className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.pushNotifications ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                       >
                         <span
                           className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.pushNotifications ? 'translate-x-5' : 'translate-x-0'}`}
                         />
                       </button>
                     </div>

                      {/* --- MORE SECURITY --- */}
                      <h3 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1 pt-4">
                          Advanced Security
                      </h3>

                      {/* Biometric Lock Toggle */}
                      <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
                        <div className="space-y-0.5 max-w-[75%]">
                          <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            Biometric / PIN Lock
                          </label>
                          <p className="text-[10px] text-zinc-500 leading-tight">
                            Require device PIN or biometric verification to view chat histories.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdatePrivacySetting('privacy.biometricLock', !privacySettings.biometricLock)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.biometricLock ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.biometricLock ? 'translate-x-5' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>

                      {/* Disappearing Messages Toggle */}
                      <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
                        <div className="space-y-0.5 max-w-[75%]">
                          <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            Disappearing Messages (Incognito)
                          </label>
                          <p className="text-[10px] text-zinc-500 leading-tight">
                            Automatically erase chat histories and attachments older than 24 hours.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdatePrivacySetting('privacy.disappearingMessages', !privacySettings.disappearingMessages)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.disappearingMessages ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.disappearingMessages ? 'translate-x-5' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>

                      </div>

                      <div className="space-y-4">
                          {/* --- MORE DESIGN --- */}
                          <h3 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1 pt-4 md:pt-0">
                              Visual Design Settings
                      </h3>

                      {/* Liquid Glass Mode Toggle */}
                      <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
                        <div className="space-y-0.5 max-w-[75%]">
                          <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            Liquid Glass Panels
                          </label>
                          <p className="text-[10px] text-zinc-500 leading-tight">
                            Apply translucent, glossy glass-morphism panels with smooth motion background filters.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdatePrivacySetting('privacy.liquidGlassMode', !privacySettings.liquidGlassMode)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.liquidGlassMode ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.liquidGlassMode ? 'translate-x-5' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>

                      {/* High Contrast Fonts Toggle */}
                      <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
                        <div className="space-y-0.5 max-w-[75%]">
                          <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            High Contrast Typography
                          </label>
                          <p className="text-[10px] text-zinc-500 leading-tight">
                            Bold fonts and ultra high contrast labels for optimal visibility and readability.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdatePrivacySetting('privacy.highContrastFonts', !privacySettings.highContrastFonts)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.highContrastFonts ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.highContrastFonts ? 'translate-x-5' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>

                      {/* Minimalist Chat Bubbles Toggle */}
                      <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
                        <div className="space-y-0.5 max-w-[75%]">
                          <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            Minimalist Chat Bubbles
                          </label>
                          <p className="text-[10px] text-zinc-500 leading-tight">
                            Hide secondary badges, avatars and timestamp labels inside active message bubbles.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdatePrivacySetting('privacy.minimalistBubbles', !privacySettings.minimalistBubbles)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.minimalistBubbles ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.minimalistBubbles ? 'translate-x-5' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>

                      {/* --- MORE CHAT FEATURES --- */}
                      <h3 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1 pt-4">
                          Interactive Chat Features
                      </h3>

                      {/* Smart Quick Replies Toggle */}
                      <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
                        <div className="space-y-0.5 max-w-[75%]">
                          <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            Smart Quick Replies
                          </label>
                          <p className="text-[10px] text-zinc-500 leading-tight">
                            Generate context-aware, predictive quick message templates near your text inputs.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdatePrivacySetting('privacy.smartQuickReplies', !privacySettings.smartQuickReplies)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.smartQuickReplies ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.smartQuickReplies ? 'translate-x-5' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>

                      {/* Haptic Touch Feedback Toggle */}
                      <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
                        <div className="space-y-0.5 max-w-[75%]">
                          <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            Tactile Haptic Feedback
                          </label>
                          <p className="text-[10px] text-zinc-500 leading-tight">
                            Vibrate slightly when clicking message inputs, starting calls or holding the microphone.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdatePrivacySetting('privacy.hapticTouchFeedback', !privacySettings.hapticTouchFeedback)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.hapticTouchFeedback ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.hapticTouchFeedback ? 'translate-x-5' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>

                      {/* Auto-play Voice Messages Toggle */}
                      <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
                        <div className="space-y-0.5 max-w-[75%]">
                          <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            Auto-play Voice Messages
                          </label>
                          <p className="text-[10px] text-zinc-500 leading-tight">
                            Automatically play incoming audio notes consecutively as they arrive.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdatePrivacySetting('privacy.autoPlayVoice', !privacySettings.autoPlayVoice)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.autoPlayVoice ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.autoPlayVoice ? 'translate-x-5' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>

                      {/* --- MORE OTHER FEATURES --- */}
                      <h3 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1 pt-4">
                          Other Features
                      </h3>

                      {/* Data Saver Mode Toggle */}
                      <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
                        <div className="space-y-0.5 max-w-[75%]">
                          <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            Data Saver Mode
                          </label>
                          <p className="text-[10px] text-zinc-500 leading-tight">
                            Compress images, voice recordings, and video calls to minimize network utilization.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdatePrivacySetting('privacy.dataSaverMode', !privacySettings.dataSaverMode)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.dataSaverMode ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.dataSaverMode ? 'translate-x-5' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>

                      {/* Do Not Disturb Toggle */}
                      <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
                        <div className="space-y-0.5 max-w-[75%]">
                          <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            Do Not Disturb
                          </label>
                          <p className="text-[10px] text-zinc-500 leading-tight">
                            Mute and silence all sounds, call rings, and vibration alerts from direct chats.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdatePrivacySetting('privacy.doNotDisturb', !privacySettings.doNotDisturb)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.doNotDisturb ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.doNotDisturb ? 'translate-x-5' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>
                  </div>
                  </div>

                  {/* App Version Info */}
                  <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800/60 text-center space-y-1">
                     <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Marketplace Chat v2.4.0</p>
                     <p className="text-[9px] text-zinc-400">All chats are securely encrypted and verified</p>
                 </div>
             </div>
         ) : (
             <>
         {/* Premium Custom Tabs Navigation matching the mockup */}
         <div className="flex border-b border-zinc-100 dark:border-zinc-800 px-4 shrink-0 bg-white dark:bg-zinc-900">
             {[
               { id: 'messages', label: 'Chats', dotColor: 'bg-emerald-500' },
               { id: 'community', label: 'Community', dotColor: 'bg-indigo-500' },
               { id: 'calls', label: 'Calls', dotColor: 'bg-rose-500' }
             ].map((tab) => {
               const isActive = sidebarTab === tab.id;
               return (
                 <button
                   key={tab.id}
                   onClick={() => setSidebarTab(tab.id as any)}
                   className={`flex-1 py-3 text-center font-black text-xs relative transition-colors cursor-pointer uppercase tracking-wider ${
                     isActive 
                       ? 'text-zinc-900 dark:text-white font-black' 
                       : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                   }`}
                 >
                   <span className="inline-flex items-center gap-1.5">
                     {tab.label}
                     <span className={`w-1.5 h-1.5 rounded-full ${tab.dotColor}`}></span>
                   </span>
                   {isActive && (
                     <motion.div 
                       layoutId="activeTabUnderline" 
                       className="absolute bottom-0 left-6 right-6 h-[3px] bg-zinc-900 dark:bg-white rounded-t-full" 
                     />
                   )}
                 </button>
               );
             })}
         </div>

         {chatSearchQuery.trim() ? (
             <div className="flex-1 overflow-y-auto">
                 <p className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800/40">Search Results</p>
                 {isSearchingChats ? (
                     <div className="flex justify-center p-6 text-zinc-400 text-xs">Searching...</div>
                 ) : chatSearchResults.length === 0 ? (
                     <div className="flex justify-center p-6 text-zinc-400 text-xs">No users found</div>
                 ) : (
                     chatSearchResults.map((foundUser, fIdx) => (
                         <div 
                             key={`found-user-${foundUser.id || fIdx}-${fIdx}`}
                             onClick={() => {
                                 setChatSearchQuery('');
                                 setSearchParams({ chatId: foundUser.id });
                             }}
                             className="flex items-center gap-3 p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800/40 transition"
                         >
                             <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0">
                                 {foundUser.photoURL ? (
                                     <img src={foundUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                 ) : (
                                     <div className="w-full h-full flex items-center justify-center font-bold text-sm bg-emerald-500/10 text-emerald-500">
                                         {(foundUser.displayName || 'U')[0].toUpperCase()}
                                     </div>
                                 )}
                             </div>
                             <div className="min-w-0">
                                 <p className="font-bold text-zinc-900 dark:text-white text-sm truncate">{foundUser.displayName || 'User'}</p>
                                 <p className="text-xs text-zinc-400 truncate">@{foundUser.displayName?.toLowerCase().replace(/ /g, '') || 'username'}</p>
                             </div>
                         </div>
                     ))
                 )}
             </div>
         ) : (
             <div className="flex-1 overflow-y-auto" onScroll={handleSidebarScroll}>
             {sidebarTab === 'messages' ? (
                <>
                  <InstagramNotesBar
                    currentUser={user}
                    onlineUsers={onlineUsersList}
                    onOpenChatWithUser={(u) => {
                      if (u?.id || u?.uid) {
                        setSearchParams({ chatId: u.id || u.uid });
                      }
                    }}
                    notify={notify}
                  />
                  {chats.length === 0 && !chatIdParam ? (
                     <div className="flex flex-col items-center justify-center h-full text-zinc-400 p-6 text-center">
                         {illustrations.emptyMessages ? (
                              <div className="w-32 h-32 mx-auto mb-3 rounded-[20px] overflow-hidden">
                                  <img src={illustrations.emptyMessages} alt="No messages" className="w-full h-full object-cover" />
                              </div>
                          ) : (
                              <MessageSquareShare className="w-12 h-12 mb-3 text-zinc-300 dark:text-zinc-700" />
                          )}
                          <p className="font-medium text-sm text-zinc-500">No messages yet</p>
                          <p className="text-xs mt-1">Start a conversation with a seller to see it here.</p>
                      </div>
                 ) : (
                     chats.map((chat, idx) => {
                          const isUnread = chat.lastMessage && chat.lastSenderId !== user.uid && (!chat.seenBy || !chat.seenBy.includes(user.uid));
                          const chatOtherUid = chat.otherUser?.id || chat.otherUser?.uid;
                          const isChatUserOnline = chatOtherUid ? chatUsersPresence[chatOtherUid]?.isOnline : false;
                          const chatTypingData = chat.typingState?.[chatOtherUid];
                          const isChatOtherTyping = chatTypingData?.status === 'typing' && (Date.now() - (chatTypingData?.updatedAt || 0) < 5000);
                          const isChatOtherRecording = chatTypingData?.status === 'recording' && (Date.now() - (chatTypingData?.updatedAt || 0) < 12000);
                          return (
                             <div 
                                key={`chat-${chat.id || idx}-${idx}`}
                                 onClick={() => setSearchParams({ chatId: chat.otherUser?.id || "" }, { replace: true })}
                                className={cn(
                                     "flex items-center gap-3 p-4 cursor-pointer transition-all hover:bg-[#F8F9FB] dark:hover:bg-zinc-800/50 relative border-b border-zinc-50 dark:border-zinc-800/20",
                                     activeChat?.id === chat.id ? "bg-[#F8F9FB] dark:bg-zinc-800 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-[#4E4AEB] before:rounded-r-full" : ""
                                 )}
                             >
                                 <div className="relative shrink-0">
                                     <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-300 dark:border-zinc-700">
                                         {chat.otherUser?.photoURL ? (
                                             <img src={chat.otherUser.photoURL} alt={chat.otherUser.displayName} className="w-full h-full object-cover" />
                                         ) : (
                                             <div className="w-full h-full flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold text-lg">
                                                 {(chat.otherUser?.displayName || chat.otherUser?.shopName || 'U')[0].toUpperCase()}
                                             </div>
                                         )}
                                     </div>
                                     {/* Active Presence Dot */}
                                     {isChatUserOnline ? (
                                         <div className="absolute bottom-0.5 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 animate-pulse"></div>
                                     ) : (
                                         <div className="absolute bottom-0.5 right-0 w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-600 border-2 border-white dark:border-zinc-900"></div>
                                     )}
                                 </div>
                                 
                                 <div className="flex-1 min-w-0">
                                     <div className="flex justify-between items-center mb-0.5">
                                         <h4 className="text-[14px] font-bold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1">
                                             <span>{getChatDisplayName(chat)}</span>
                                             {(chat.otherUser?.kycStatus === "verified" || chat.otherUser?.verified) && <VerifiedIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                         </h4>
                                         {chat.updatedAt && (
                                             <span className={cn("text-[10px] font-bold shrink-0", isUnread ? "text-emerald-500" : "text-zinc-400")}>
                                                 {new Date(chat.updatedAt?.toMillis ? chat.updatedAt.toMillis() : Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                             </span>
                                         )}
                                     </div>
                                     <div className="flex justify-between items-center">
                                         {isChatOtherTyping ? (
                                             <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 truncate flex items-center gap-1.5 animate-pulse">
                                                 <span className="flex gap-0.5 items-center">
                                                     <span className="w-1 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                                     <span className="w-1 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                                     <span className="w-1 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce"></span>
                                                 </span>
                                                 <span>typing...</span>
                                             </p>
                                         ) : isChatOtherRecording ? (
                                             <p className="text-xs font-bold text-rose-500 truncate flex items-center gap-1 animate-pulse">
                                                 <Mic className="w-3 h-3 text-rose-500 animate-pulse" />
                                                 <span>recording audio...</span>
                                             </p>
                                         ) : (
                                             <p className={cn("text-xs truncate pr-4", isUnread ? "font-bold text-zinc-800 dark:text-zinc-200" : "font-semibold text-zinc-400")}>
                                                 {chat.lastMessage}
                                             </p>
                                         )}
                                         {isUnread && (
                                             <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                                                 <span className="text-white text-[10px] font-bold">
                                                     1
                                                 </span>
                                             </div>
                                         )}
                                     </div>
                                 </div>
                             </div>
                      )})
                 )}
                </>
             ) : sidebarTab === 'community' ? (
                 <div className="flex flex-col">

                   {channels.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-64 text-zinc-400 p-6 text-center">
                       <Users className="w-12 h-12 mb-3 text-zinc-300 dark:text-zinc-700" />
                       <p className="font-medium text-sm">No community channels yet</p>
                       <p className="text-xs mt-1">Sellers can create a new channel to post updates!</p>
                       {(userRole === 'seller' || userRole === 'admin') && (
                         <button
                           onClick={() => setShowCreateChannelModal(true)}
                           className="mt-4 px-4 py-2 bg-emerald-600 text-zinc-900 dark:text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition"
                         >
                           Create Channel
                         </button>
                       )}
                     </div>
                   ) : (
                     channels.filter(channel => {
                        if (!channel.isPrivate) return true;
                        return channel.creatorId === user?.uid || channelIdParam === channel.id;
                     }).map(channel => {
                       const isSelected = channelIdParam === channel.id;
                       return (
                         <div
                           key={channel.id}
                           onClick={() => setSearchParams({ channelId: channel.id })}
                           className={cn(
                             "flex items-center gap-3 p-4 cursor-pointer transition-all hover:bg-[#F8F9FB] dark:hover:bg-zinc-800/50 relative border-b border-zinc-50 dark:border-zinc-800/20",
                             isSelected ? "bg-[#F8F9FB] dark:bg-zinc-800 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-[#4E4AEB] before:rounded-r-full" : ""
                           )}
                         >
                           <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-200 dark:bg-zinc-800 shrink-0 border border-zinc-200 dark:border-zinc-300 dark:border-zinc-700 relative">
                             <img src={channel.imageUrl} alt={channel.name} className="w-full h-full object-cover" />
                             <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center">
                               <Sparkles className="w-2 h-2 text-zinc-900 dark:text-white fill-white" />
                             </div>
                           </div>
                           <div className="flex-1 min-w-0">
                             <div className="flex justify-between items-center mb-0.5">
                               <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-[15px] truncate">
                                 {channel.name}
                               </h4>
                               <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">
                                 @{channel.customLink}
                               </span>
                             </div>
                             <p className="text-[12px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                               {channel.description || "Welcome to our community!"}
                             </p>
                             <div className="flex items-center gap-1.5 mt-1">
                               <span className="text-[9.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                                 {channel.subscriberCount || 1} subscribers
                               </span>
                             </div>
                           </div>
                         </div>
                       );
                     })
                   )}
                 </div>
             ) : (
                 /* Calls Tab Renderer */
                 <div className="flex flex-col">
                     {chats.length === 0 ? (
                         <div className="flex flex-col items-center justify-center h-64 text-zinc-400 p-6 text-center">
                             <Icon name="phone" className="w-12 h-12 mb-3 text-zinc-300 dark:text-zinc-700 animate-pulse" />
                             <p className="font-medium text-sm">No call history yet</p>
                             <p className="text-xs mt-1">Start voice or video calls with your contacts!</p>
                         </div>
                     ) : (
                         chats.map((chat, idx) => {
                             const callType = idx % 2 === 0 ? 'Voice' : 'Video';
                             const status = idx % 3 === 0 ? 'Incoming' : idx % 3 === 1 ? 'Outgoing' : 'Missed';
                             const time = idx === 0 ? '10 mins ago' : idx === 1 ? '2 hours ago' : 'Yesterday';
                             
                             return (
                                 <div 
                                     key={`call-${chat.id || idx}-${idx}`} 
                                     className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition"
                                 >
                                     <div className="flex items-center gap-3.5 min-w-0">
                                         <div className="relative shrink-0">
                                             <img 
                                                 src={chat.otherUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.otherUser?.id || chat.id}`} 
                                                 alt="User" 
                                                 className="w-11 h-11 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                                             />
                                             <span className={cn(
                                                 "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900",
                                                 status === 'Missed' ? 'bg-rose-500' : 'bg-emerald-500'
                                             )} />
                                         </div>
                                         <div className="text-left min-w-0">
                                             <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                                 {chat.otherUser?.shopName || chat.otherUser?.displayName || "User"}
                                             </h4>
                                             <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1 font-semibold">
                                                 {status === 'Missed' ? (
                                                     <Icon name="phone-off" className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                                 ) : (
                                                     <Icon name="phone" className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                 )}
                                                 <span>{status} • {callType} ({time})</span>
                                             </p>
                                         </div>
                                     </div>
                                     <div className="flex items-center gap-2">
                                         <button 
                                             onClick={() => {
                                                 setSearchParams({ chatId: chat.otherUser?.id || "" });
                                                 setTimeout(() => { startCall("audio"); }, 300);
                                             }}
                                             className="p-2 rounded-full bg-zinc-50 hover:bg-emerald-50 dark:bg-zinc-800 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:scale-105 active:scale-95 transition-all"
                                             title="Call again (Voice)"
                                         >
                                             <Icon name="phone" className="w-3.5 h-3.5" />
                                         </button>
                                         <button 
                                             onClick={() => {
                                                 setSearchParams({ chatId: chat.otherUser?.id || "" });
                                                 setTimeout(() => { startCall("video"); }, 300);
                                             }}
                                             className="p-2 rounded-full bg-zinc-50 hover:bg-indigo-50 dark:bg-zinc-800 dark:hover:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:scale-105 active:scale-95 transition-all"
                                             title="Call again (Video)"
                                         >
                                             <Icon name="video" className="w-3.5 h-3.5" />
                                         </button>
                                     </div>
                                 </div>
                             );
                         })
                     )}
                 </div>
             )}
         </div>
         )}

         </>
          )}



			{/* Floating Bottom Navigation Bar */}
			{(!activeChat && !activeChannel) && (
				<>
					{/* Centered Floating Capsule (Comfortable height matching BottomMenu) */}
					<div className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 pointer-events-auto h-[54px] flex items-center justify-between gap-1.5 px-2.5 rounded-full bg-white/85 dark:bg-[#141518]/85 backdrop-blur-md shadow-[0_4px_18px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_22px_rgba(0,0,0,0.4)] transition-all mb-[env(safe-area-inset-bottom)]">
						{/* Tab 1: Chats (with active capsule pill) */}
						<button 
							type="button"
							onClick={() => {
								setActiveMessagesTab('chats');
								setSidebarTab('messages');
							}}
							className={cn(
								"h-10 flex items-center justify-center transition-all duration-300 rounded-full",
								activeMessagesTab === 'chats' && sidebarTab !== 'community'
									? "bg-[#E8EAEE]/90 dark:bg-[#2D2E33]/90 text-zinc-950 dark:text-white px-5 shadow-xs" 
									: "px-3.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
							)}
							title="Chats"
						>
							{/* Exact Chat Bubble with 2 lines as in IMG_3972/3973 */}
							<svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
								<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 8H9c-.55 0-1-.45-1-1s.45-1 1-1h6c.55 0 1 .45 1 1s-.45 1-1 1zm-3 4H9c-.55 0-1-.45-1-1s.45-1 1-1h3c.55 0 1 .45 1 1s-.45 1-1 1z" />
							</svg>
						</button>

						{/* Tab 2: Contacts / Community (matching person + 3 lines in IMG_3972/3973) */}
						<button 
							type="button"
							onClick={() => {
								setActiveMessagesTab('chats');
								setSidebarTab('community');
							}}
							className={cn(
								"h-10 flex items-center justify-center transition-all duration-300 rounded-full",
								activeMessagesTab === 'chats' && sidebarTab === 'community'
									? "bg-[#E8EAEE]/90 dark:bg-[#2D2E33]/90 text-zinc-950 dark:text-white px-5 shadow-xs" 
									: "px-3.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
							)}
							title="Contacts & Channels"
						>
							{/* Exact Person Outline with 3 lines SVG from reference image */}
							<svg className="w-5 h-5 stroke-current fill-none stroke-[2.2] stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24">
								<path d="M14 19a5 5 0 0 0-10 0" />
								<circle cx="9" cy="8" r="4" />
								<line x1="16" y1="9" x2="21" y2="9" />
								<line x1="16" y1="13" x2="21" y2="13" />
								<line x1="16" y1="17" x2="19" y2="17" />
							</svg>
						</button>

						{/* Tab 3: Avatar / Profile / Settings (matching avatar in IMG_3972/3973) */}
						<button 
							type="button"
							onClick={() => setActiveMessagesTab('settings')}
							className={cn(
								"h-10 flex items-center justify-center transition-all duration-300 rounded-full",
								activeMessagesTab === 'settings' 
									? "bg-[#E8EAEE]/90 dark:bg-[#2D2E33]/90 px-4 shadow-xs" 
									: "px-2 hover:opacity-80"
							)}
							title="Profile & Settings"
						>
							<div className="w-8 h-8 rounded-full overflow-hidden shadow-xs bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
								{auth.currentUser?.photoURL ? (
									<img src={auth.currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
								) : (
									<img
										src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
										alt="Profile"
										className="w-full h-full object-cover"
									/>
								)}
							</div>
						</button>
					</div>
				</>
			)}

      </div>

      {/* Main Chat Area */}
      <div className={cn(
          "flex-1 flex-col h-full overflow-hidden transition-all duration-300",
          privacySettings.liquidGlassMode 
            ? "bg-white/10 dark:bg-black/25 backdrop-blur-md" 
            : "bg-[#F0F2F5] dark:bg-[#0a0a0a]",
          activeMessagesTab === 'settings' ? 'hidden' : (!activeChat && !activeChannel ? 'hidden md:flex' : 'flex')
      )}>
         {activeChannel ? (
             isUserBanned ? (
                 <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6 text-center h-full">
                     <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mb-6 border border-rose-500/20 shadow-md">
                         <UserX className="w-10 h-10" />
                     </div>
                     <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">You are Banned from this Channel</h3>
                     <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm leading-relaxed">
                         আপনার আইডি এই কমিউনিটি চ্যানেল থেকে ব্যান করা হয়েছে। আপনি এই চ্যানেলের কোনো মেসেজ বা আপডেট দেখতে পারবেন না।
                     </p>
                     <button
                         onClick={() => setSearchParams({})}
                         className="mt-6 px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-white rounded-xl text-xs font-black transition-all"
                     >
                         Back to Chats
                     </button>
                 </div>
             ) : showChannelDetailsModal ? (
                 <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white overflow-y-auto font-inter relative">
                     {/* Telegram-style Channel Info Header */}
                     <div className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200/80 dark:border-zinc-800/80 px-4 py-3 flex items-center justify-between">
                         <button 
                             onClick={() => setShowChannelDetailsModal(false)}
                             className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-100 transition"
                         >
                             <ArrowLeft className="w-6 h-6" />
                         </button>
                         <h2 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Channel Details</h2>
                         {activeChannel.creatorId === user?.uid ? (
                             <button 
                                 onClick={() => {
                                     setShowChannelDetailsModal(false);
                                     handleEditChannel();
                                 }} 
                                 className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-100 transition"
                             >
                                 <Edit className="w-5 h-5" />
                             </button>
                         ) : (
                             <div className="w-8"></div>
                         )}
                     </div>

                     <div className="p-4 sm:p-6 w-full max-w-2xl mx-auto flex flex-col items-center flex-1 pb-24">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 mb-4 border border-zinc-300 dark:border-zinc-700 shadow-md">
                            <img src={activeChannel.imageUrl} alt="Channel cover" className="w-full h-full object-cover" />
                        </div>
                        <h2 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-1.5 tracking-tight text-center">
                            {activeChannel.name}
                            {(activeChannel.verified !== false) && <VerifiedIcon className="w-5 h-5 text-emerald-500 shrink-0" />}
                        </h2>
                        <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider mt-1.5">
                            {activeChannel.creatorId === user?.uid ? 'public channel (owner)' : `${activeChannel.subscriberCount || 1} subscribers`}
                        </p>
                        
                        <div className="flex items-center justify-center gap-4 mt-6 w-full">
                            {activeChannel.creatorId === user?.uid ? (
                                <>
                                    <button 
                                        onClick={() => handleToggleMuteChannel(activeChannel, userSubscription?.muted)} 
                                        className="flex-1 flex flex-col items-center justify-center py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition"
                                    >
                                        <VolumeX className="w-5 h-5 text-zinc-700 dark:text-zinc-300 mb-1.5" />
                                        <span className="text-[11px] font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">{userSubscription?.muted ? "Unmute" : "Mute"}</span>
                                    </button>
                                    <button 
                                        onClick={() => setDetailsSubModal('settings')} 
                                        className="flex-1 flex flex-col items-center justify-center py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition"
                                    >
                                        <svg className="w-5 h-5 text-zinc-700 dark:text-zinc-300 mb-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                        <span className="text-[11px] font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Settings</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button 
                                        onClick={() => { if(!userSubscription) handleSubscribeToChannel(activeChannel); else handleUnsubscribeFromChannel(activeChannel); }} 
                                        className="flex-1 flex flex-col items-center justify-center py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition"
                                    >
                                        {userSubscription ? <X className="w-5 h-5 text-red-500 mb-1.5" /> : <UserPlus className="w-5 h-5 text-emerald-500 mb-1.5" />}
                                        <span className="text-[11px] font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">{userSubscription ? "Leave" : "Join"}</span>
                                    </button>
                                    <button 
                                        onClick={() => handleToggleMuteChannel(activeChannel, userSubscription?.muted)} 
                                        className="flex-1 flex flex-col items-center justify-center py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition"
                                    >
                                        <VolumeX className="w-5 h-5 text-zinc-700 dark:text-zinc-300 mb-1.5" />
                                        <span className="text-[11px] font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">{userSubscription?.muted ? "Unmute" : "Mute"}</span>
                                    </button>
                                    <button 
                                        onClick={async () => {
                                            try {
                                                await navigator.clipboard.writeText(`${window.location.origin}/messages?channel=${activeChannel.id}`);
                                                notify("Link copied!", "success");
                                            } catch(e) {}
                                        }} 
                                        className="flex-1 flex flex-col items-center justify-center py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition"
                                    >
                                        <Forward className="w-5 h-5 text-zinc-700 dark:text-zinc-300 mb-1.5" />
                                        <span className="text-[11px] font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Share</span>
                                    </button>
                                    <button 
                                        onClick={() => notify("Channel reported. Our administrators will review the content.", "info")} 
                                        className="flex-1 flex flex-col items-center justify-center py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition"
                                    >
                                        <AlertCircle className="w-5 h-5 text-amber-500 mb-1.5" />
                                        <span className="text-[11px] font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Report</span>
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Description & Link Card */}
                        <div className="w-full mt-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-sm rounded-[24px] flex flex-col overflow-hidden">
                            <div className="p-5 text-left border-b border-zinc-100 dark:border-zinc-800/80">
                                <p className="text-[14px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Description</p>
                                <p className="text-[15px] text-zinc-800 dark:text-zinc-200 leading-relaxed">
                                    {activeChannel.description || "Welcome to our exclusive product broadcast channel. Join for periodic updates, visual arrivals, and direct chat links!"}
                                </p>
                            </div>
                            <div 
                                onClick={async () => {
                                    try {
                                        await navigator.clipboard.writeText(`${window.location.origin}/messages?channel=${activeChannel.id}`);
                                        notify("Link copied!", "success");
                                    } catch(e) {}
                                }} 
                                className="flex items-center justify-between p-5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-[14px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Invite Link</p>
                                    <p className="text-[14px] text-zinc-800 dark:text-zinc-200 truncate pr-4 font-mono">
                                        {`${window.location.origin}/messages?channel=${activeChannel.id}`}
                                    </p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:scale-105 active:scale-95 transition-all">
                                    <Link className="w-4 h-4" />
                                </div>
                            </div>
                        </div>

                        {/* Owner Moderation List Rows */}
                        {activeChannel.creatorId === user?.uid && (
                            <div className="w-full mt-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-[24px] flex flex-col py-1 overflow-hidden">
                                <div 
                                    onClick={() => setDetailsSubModal('subscribers')} 
                                    className="flex items-center justify-between p-4.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <span className="text-[15px] font-bold text-zinc-800 dark:text-zinc-200">Subscribers</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[14px] font-extrabold text-purple-500">{activeChannel.subscriberCount || 1}</span>
                                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                                    </div>
                                </div>
                                <div 
                                    onClick={() => setDetailsSubModal('admins')} 
                                    className="flex items-center justify-between p-4.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors border-t border-zinc-100 dark:border-zinc-800/50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                            <Star className="w-5 h-5" />
                                        </div>
                                        <span className="text-[15px] font-bold text-zinc-800 dark:text-zinc-200">Administrators</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[14px] font-extrabold text-amber-500">1</span>
                                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                                    </div>
                                </div>
                                <div 
                                    onClick={() => setDetailsSubModal('banned')} 
                                    className="flex items-center justify-between p-4.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors border-t border-zinc-100 dark:border-zinc-800/50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                                            <UserX className="w-5 h-5" />
                                        </div>
                                        <span className="text-[15px] font-bold text-zinc-800 dark:text-zinc-200">Removed Users</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[14px] font-extrabold text-red-500">{bannedUsers.length}</span>
                                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                                    </div>
                                </div>
                            </div>
                        )}
                     </div>

                     {/* FULLY FUNCTIONAL MODERATION DRAWER / OVERLAYS */}
                     <AnimatePresence>
                         {detailsSubModal && (
                             <motion.div 
                                 initial={{ opacity: 0, x: '100%' }}
                                 animate={{ opacity: 1, x: 0 }}
                                 exit={{ opacity: 0, x: '100%' }}
                                 transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                                 className="fixed inset-0 z-[100] bg-zinc-50 dark:bg-zinc-950 flex flex-col font-inter"
                             >
                                 {/* Drawer Header */}
                                 <div className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3.5 flex items-center gap-3">
                                     <button 
                                         onClick={() => { setDetailsSubModal(null); setConfirmDeleteChannel(false); }}
                                         className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-100 transition-colors"
                                     >
                                         <ArrowLeft className="w-5 h-5" />
                                     </button>
                                     <h3 className="font-extrabold text-base capitalize text-zinc-900 dark:text-white">
                                         {detailsSubModal === 'banned' ? 'Removed Users' : detailsSubModal}
                                     </h3>
                                 </div>

                                 {/* Drawer Content */}
                                 <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-4">
                                     {detailsSubModal === 'subscribers' && selectedSubscriber ? (
                                          <div className="space-y-4 animate-fade-in">
                                              {/* Back Button */}
                                              <button
                                                  type="button"
                                                  onClick={() => setSelectedSubscriber(null)}
                                                  className="text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl transition-all"
                                              >
                                                  ← Back to Subscribers
                                              </button>

                                              {/* PROFILE INFO CARD */}
                                              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm text-center space-y-4">
                                                  <div className="relative mx-auto w-24 h-24 rounded-full overflow-hidden border-2 border-emerald-500/30 bg-zinc-100 dark:bg-zinc-800">
                                                      {selectedSubscriber.photoURL ? (
                                                          <img src={selectedSubscriber.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                                      ) : (
                                                          <div className="w-full h-full flex items-center justify-center font-black text-3xl bg-emerald-500/10 text-emerald-500">
                                                              {(selectedSubscriber.displayName || 'U')[0].toUpperCase()}
                                                          </div>
                                                      )}
                                                  </div>

                                                  <div className="space-y-1">
                                                      <h3 className="font-extrabold text-lg text-zinc-900 dark:text-white flex items-center justify-center gap-1">
                                                          {selectedSubscriber.displayName || 'Anonymous User'}
                                                          {selectedSubscriber.id === activeChannel.creatorId && <span className="bg-emerald-500 text-zinc-950 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Owner</span>}
                                                      </h3>
                                                      <p className="text-xs text-zinc-400 font-medium">Joined {selectedSubscriber.joinedAt ? new Date(selectedSubscriber.joinedAt).toLocaleDateString() : 'recently'}</p>
                                                      <p className="text-[10px] font-mono text-zinc-500 select-all bg-zinc-50 dark:bg-zinc-800 px-2 py-1 rounded inline-block">UID: {selectedSubscriber.id}</p>
                                                  </div>

                                                  <div className="pt-2 flex flex-col gap-2">
                                                      {/* Message option */}
                                                      <button
                                                          type="button"
                                                          onClick={() => {
                                                              setSearchParams({ chatId: selectedSubscriber.id });
                                                              setShowChannelDetailsModal(false);
                                                          }}
                                                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-zinc-950 dark:text-white rounded-xl text-xs font-black shadow transition-all flex items-center justify-center gap-2"
                                                      >
                                                          <MessageSquare className="w-4 h-4" />
                                                          Send Private Message
                                                      </button>

                                                      {/* Mute toggle */}
                                                      {selectedSubscriber.id !== user?.uid && (
                                                          <button
                                                              type="button"
                                                              onClick={() => handleToggleMuteSubscriber(selectedSubscriber)}
                                                              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${selectedSubscriber.muted ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                                                          >
                                                              {selectedSubscriber.muted ? (
                                                                  <>
                                                                      <VolumeX className="w-4 h-4" />
                                                                      Unmute Subscriber
                                                                  </>
                                                              ) : (
                                                                  <>
                                                                      <Volume2 className="w-4 h-4" />
                                                                      Mute Subscriber
                                                                  </>
                                                              )}
                                                          </button>
                                                      )}

                                                      {/* Remove Option */}
                                                      {selectedSubscriber.id !== user?.uid && selectedSubscriber.id !== activeChannel.creatorId && (
                                                          <button
                                                              type="button"
                                                              onClick={async () => {
                                                                  await handleBanSubscriber(selectedSubscriber);
                                                                  setSelectedSubscriber(null);
                                                              }}
                                                              className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:text-rose-700 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
                                                          >
                                                              <UserMinus className="w-4 h-4" />
                                                              Remove & Ban Member
                                                          </button>
                                                      )}
                                                  </div>
                                              </div>

                                              {/* Subscriber contact details block */}
                                              <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-sm rounded-3xl flex flex-col overflow-hidden mt-4">
                                                  <div className="p-4 text-left border-b border-zinc-100 dark:border-zinc-800/80">
                                                      <p className="text-[14px] font-semibold text-zinc-900 dark:text-white mb-0.5">{(selectedSubscriber.hideEmail && selectedSubscriber.id !== user?.uid) ? "Email Hidden" : (formatDisplayEmail(selectedSubscriber.email) || "No email registered")}</p>
                                                      <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Email Address</p>
                                                  </div>
                                                  <div className="p-4 text-left">
                                                      <p className="text-[14px] font-semibold text-zinc-900 dark:text-white mb-0.5">@{selectedSubscriber.displayName?.toLowerCase().replace(/ /g, '') || "subscriber"}</p>
                                                      <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Username</p>
                                                  </div>
                                              </div>
                                          </div>
                                      ) : detailsSubModal === 'subscribers' ? (
                                          <div className="space-y-3">
                                              <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-1 px-1">Active Subscribers ({channelSubscribers.length})</p>
                                              {channelSubscribers.length === 0 ? (
                                                  <div className="text-center py-12 text-zinc-400 text-sm font-medium">No subscribers yet</div>
                                              ) : (
                                                  channelSubscribers.map(sub => (
                                                      <div key={sub.id} className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-2xl shadow-sm hover:border-emerald-500/40 transition-all">
                                                          <div 
                                                              className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                                                              onClick={() => setSelectedSubscriber(sub)}
                                                          >
                                                              <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-150 dark:bg-zinc-800 shrink-0 border border-zinc-200 dark:border-zinc-700">
                                                                  {sub.photoURL ? (
                                                                      <img src={sub.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                                                  ) : (
                                                                      <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                                                                          {(sub.displayName || 'U')[0].toUpperCase()}
                                                                      </div>
                                                                  )}
                                                              </div>
                                                              <div className="min-w-0 flex-1">
                                                                  <p className="font-bold text-[14px] text-zinc-900 dark:text-white flex items-center gap-1 truncate">
                                                                      {sub.displayName || 'Anonymous User'}
                                                                      {sub.id === activeChannel.creatorId && <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black px-1 rounded">OWNER</span>}
                                                                  </p>
                                                                  <p className="text-[10px] text-zinc-400 mt-0.5 truncate">Joined {sub.joinedAt ? new Date(sub.joinedAt).toLocaleDateString() : 'recently'}</p>
                                                              </div>
                                                          </div>
                                                          {sub.id !== user?.uid && (
                                                              <div className="flex items-center gap-2 shrink-0">
                                                                  <button 
                                                                      type="button"
                                                                      onClick={() => handleToggleMuteSubscriber(sub)}
                                                                      className={`p-2 rounded-xl text-xs font-bold transition-all ${sub.muted ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                                                                      title={sub.muted ? 'Unmute' : 'Mute'}
                                                                  >
                                                                      {sub.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                                                  </button>
                                                                  <button 
                                                                      type="button"
                                                                      onClick={() => handleBanSubscriber(sub)}
                                                                      className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-bold transition-all"
                                                                      title="Remove User"
                                                                  >
                                                                      <UserMinus className="w-4 h-4" />
                                                                  </button>
                                                              </div>
                                                          )}
                                                      </div>
                                                  ))
                                              )}
                                          </div>
                                      ) : null}

                                      {detailsSubModal === 'admins' && (
                                          <div className="space-y-4">
                                              {/* Header / Search Switcher */}
                                              <div className="flex items-center justify-between">
                                                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider px-1">
                                                      {isSearchingAdmin ? "Add New Administrator" : "Channel Administration"}
                                                  </p>
                                                  
                                                  {activeChannel.creatorId === user?.uid && (
                                                      <button
                                                          type="button"
                                                          onClick={() => {
                                                              setIsSearchingAdmin(!isSearchingAdmin);
                                                              setAdminSearchResult(null);
                                                              setAdminSearchEmail('');
                                                          }}
                                                          className="text-xs font-extrabold text-emerald-600 dark:text-emerald-450 hover:underline flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-full transition-all"
                                                      >
                                                          {isSearchingAdmin ? "Back to Admins" : "+ Add Administrator"}
                                                      </button>
                                                  )}
                                              </div>

                                              {isSearchingAdmin ? (
                                                  /* SEARCH USER FOR ADMIN INTERFACE */
                                                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm space-y-4">
                                                      <div className="space-y-2">
                                                          <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Search by Email</label>
                                                          <div className="flex gap-2">
                                                              <div className="flex-1 relative">
                                                                  <input
                                                                      type="email"
                                                                      value={adminSearchEmail}
                                                                      onChange={(e) => setAdminSearchEmail(e.target.value)}
                                                                      placeholder="user@example.com"
                                                                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 ring-emerald-500/50 font-medium text-zinc-900 dark:text-white"
                                                                  />
                                                              </div>
                                                              <button
                                                                  type="button"
                                                                  disabled={adminSearchLoading}
                                                                  onClick={handleSearchAdminUser}
                                                                  className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white rounded-xl text-xs font-black transition-all"
                                                              >
                                                                  {adminSearchLoading ? "Searching..." : "Search"}
                                                              </button>
                                                          </div>
                                                      </div>

                                                      {adminSearchResult && (
                                                          <div className="border-t border-zinc-150 dark:border-zinc-800 pt-4 space-y-4 animate-fade-in">
                                                              <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl">
                                                                  <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-250 shrink-0 border border-zinc-200">
                                                                      {adminSearchResult.photoURL ? (
                                                                          <img src={adminSearchResult.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                                                      ) : (
                                                                          <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-emerald-100 text-emerald-600">
                                                                              {(adminSearchResult.displayName || 'U')[0].toUpperCase()}
                                                                          </div>
                                                                      )}
                                                                  </div>
                                                                  <div className="min-w-0">
                                                                      <p className="font-extrabold text-xs text-zinc-900 dark:text-white truncate">{adminSearchResult.displayName || 'Anonymous User'}</p>
                                                                      <p className="text-[10px] text-zinc-400 truncate mt-0.5">{(adminSearchResult.hideEmail && adminSearchResult.id !== user?.uid) ? "Email Hidden" : formatDisplayEmail(adminSearchResult.email)}</p>
                                                                      <p className="text-[9px] font-mono text-zinc-500 truncate mt-0.5">UID: {adminSearchResult.id}</p>
                                                                  </div>
                                                              </div>

                                                              {/* PERMISSIONS / ACCESS TOGGLES */}
                                                              <div className="space-y-2.5 bg-zinc-50/50 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-800">
                                                                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-0.5">Define Admin Permissions</p>
                                                                  
                                                                  <div className="space-y-2">
                                                                      {[
                                                                          { label: "Can Post Updates", key: "canPost" },
                                                                          { label: "Can Delete Messages", key: "canDelete" },
                                                                          { label: "Can Pin Messages", key: "canPin" },
                                                                          { label: "Can Ban/Remove Subscribers", key: "canBan" }
                                                                      ].map((perm) => (
                                                                          <label key={perm.key} className="flex items-center justify-between cursor-pointer py-1">
                                                                              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{perm.label}</span>
                                                                              <input
                                                                                  type="checkbox"
                                                                                  checked={(adminPermissions as any)[perm.key]}
                                                                                  onChange={(e) => {
                                                                                      setAdminPermissions({
                                                                                          ...adminPermissions,
                                                                                          [perm.key]: e.target.checked
                                                                                      });
                                                                                  }}
                                                                                  className="rounded text-emerald-500 border-zinc-300 focus:ring-emerald-500/30 w-4 h-4"
                                                                              />
                                                                          </label>
                                                                      ))}
                                                                  </div>
                                                              </div>

                                                              <button
                                                                  type="button"
                                                                  onClick={handleAddAdmin}
                                                                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-zinc-900 dark:text-white font-black text-xs rounded-xl shadow-md uppercase tracking-wider transition-all"
                                                              >
                                                                  Save & Add Admin
                                                              </button>
                                                          </div>
                                                      )}
                                                  </div>
                                              ) : (
                                                  /* LIST CURRENT ADMINS */
                                                  <div className="space-y-3">
                                                      {/* PRIMARY OWNER */}
                                                      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm">
                                                          <div className="flex items-center gap-3 min-w-0">
                                                              <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-150 dark:bg-zinc-800 shrink-0 border border-zinc-200 dark:border-zinc-700">
                                                                  {activeChannel.creatorId === user?.uid && user?.photoURL ? (
                                                                      <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                                                  ) : (
                                                                      <div className="w-full h-full flex items-center justify-center font-bold text-base bg-emerald-500/10 text-emerald-500">
                                                                          {(activeChannel.creatorName || 'O')[0].toUpperCase()}
                                                                      </div>
                                                                  )}
                                                              </div>
                                                              <div className="min-w-0">
                                                                  <p className="font-extrabold text-[15px] text-zinc-900 dark:text-white flex items-center gap-1.5 leading-tight">
                                                                      {activeChannel.creatorName || 'Channel Creator'}
                                                                      <VerifiedIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                                                                  </p>
                                                                  <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mt-0.5">Primary Creator & Admin</p>
                                                                  <p className="text-[9px] font-mono text-zinc-500 mt-1 truncate">ID: {activeChannel.creatorId}</p>
                                                              </div>
                                                          </div>
                                                          <span className="bg-emerald-500 text-zinc-950 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider scale-95 shadow-sm">
                                                              Creator
                                                          </span>
                                                      </div>

                                                      {/* OTHER PROMOTED ADMINS */}
                                                      {channelAdmins.map((adm) => (
                                                          <div key={adm.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm space-y-3">
                                                              <div className="flex items-center justify-between">
                                                                  <div className="flex items-center gap-3 min-w-0">
                                                                      <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-150 shrink-0 border border-zinc-200">
                                                                          {adm.photoURL ? (
                                                                              <img src={adm.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                                                          ) : (
                                                                              <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-zinc-200 text-zinc-600">
                                                                                  {(adm.displayName || 'A')[0].toUpperCase()}
                                                                              </div>
                                                                          )}
                                                                      </div>
                                                                      <div className="min-w-0">
                                                                          <p className="font-bold text-[14px] text-zinc-900 dark:text-white truncate">{adm.displayName || 'Administrator'}</p>
                                                                          <p className="text-[10px] text-zinc-400 mt-0.5">
                                                                              {adm.hideEmail && adm.id !== user?.uid ? 'Email hidden' : (formatDisplayEmail(adm.email) || 'No email registered')}
                                                                          </p>
                                                                          <p className="text-[9px] font-mono text-zinc-500 mt-0.5 truncate">ID: {adm.uid}</p>
                                                                      </div>
                                                                  </div>
                                                                  
                                                                  {/* Creator can strip privileges */}
                                                                  {activeChannel.creatorId === user?.uid && (
                                                                      <button
                                                                          type="button"
                                                                          onClick={() => handleRemoveAdmin(adm.id)}
                                                                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 hover:text-rose-700 dark:text-rose-400 text-xs font-black transition-all"
                                                                          title="Revoke Admin status"
                                                                      >
                                                                          <UserX className="w-4 h-4" />
                                                                      </button>
                                                                  )}
                                                              </div>

                                                              {/* PERMISSION BADGES LIST */}
                                                              <div className="flex flex-wrap gap-1 border-t border-zinc-100 dark:border-zinc-800 pt-2 text-[8.5px] font-black uppercase tracking-wider text-zinc-500">
                                                                  <span className={cn("px-1.5 py-0.5 rounded", adm.permissions?.canPost !== false ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-zinc-100 text-zinc-400 line-through")}>Post</span>
                                                                  <span className={cn("px-1.5 py-0.5 rounded", adm.permissions?.canDelete !== false ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-zinc-100 text-zinc-400 line-through")}>Delete</span>
                                                                  <span className={cn("px-1.5 py-0.5 rounded", adm.permissions?.canPin !== false ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-zinc-100 text-zinc-400 line-through")}>Pin</span>
                                                                  <span className={cn("px-1.5 py-0.5 rounded", adm.permissions?.canBan !== false ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-zinc-100 text-zinc-400 line-through")}>Ban</span>
                                                              </div>
                                                          </div>
                                                      ))}
                                                  </div>
                                              )}
                                          </div>
                                      )}

                                      {detailsSubModal === 'banned' && (
                                         <div className="space-y-3">
                                             <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-1 px-1">Removed Users ({bannedUsers.length})</p>
                                             {bannedUsers.length === 0 ? (
                                                 <div className="text-center py-12 text-zinc-400 text-sm font-medium">No removed or banned users</div>
                                             ) : (
                                                 bannedUsers.map(bUser => (
                                                     <div key={bUser.id} className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-2xl shadow-sm">
                                                         <div className="flex items-center gap-3">
                                                             <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-150 dark:bg-zinc-800 shrink-0 border border-zinc-200 dark:border-zinc-700">
                                                                 {bUser.photoURL ? (
                                                                     <img src={bUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                                                 ) : (
                                                                     <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-red-100 dark:bg-red-950/30 text-red-500">
                                                                         {(bUser.displayName || 'U')[0].toUpperCase()}
                                                                     </div>
                                                                 )}
                                                             </div>
                                                             <div>
                                                                 <p className="font-bold text-[14px] text-zinc-900 dark:text-white">{bUser.displayName || 'Banned User'}</p>
                                                                 <p className="text-[10px] text-zinc-400 mt-0.5">Banned on {bUser.bannedAt ? new Date(bUser.bannedAt).toLocaleDateString() : 'recently'}</p>
                                                             </div>
                                                         </div>
                                                         <button 
                                                             onClick={() => handleUnbanUser(bUser)}
                                                             className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-xs font-extrabold text-zinc-700 dark:text-zinc-200 transition-all"
                                                         >
                                                             Unban
                                                         </button>
                                                     </div>
                                                 ))
                                             )}
                                         </div>
                                     )}

                                     {detailsSubModal === 'settings' && (
                                         <div className="space-y-4 font-inter text-zinc-900 dark:text-zinc-100">
                                             {/* Channel statistics & Growth */}
                                             <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3">
                                                 <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-2">
                                                     <div className="p-1 rounded-lg bg-pink-500/10 text-pink-500">
                                                         <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                                                     </div>
                                                     <p className="text-xs font-black uppercase tracking-wider text-zinc-400">Channel Insights & Growth</p>
                                                 </div>
                                                 <div className="grid grid-cols-2 gap-2">
                                                     <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                                         <p className="text-[10px] font-bold text-zinc-400 uppercase">Interaction Rate</p>
                                                         <p className="text-lg font-black text-emerald-500 mt-1">94.8%</p>
                                                         <p className="text-[9px] text-zinc-400 mt-0.5">High engagement</p>
                                                     </div>
                                                     <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                                         <p className="text-[10px] font-bold text-zinc-400 uppercase">Channel Views</p>
                                                         <p className="text-lg font-black text-zinc-800 dark:text-zinc-100 mt-1">
                                                             {Math.max(12, (activeChannel.subscriberCount || 1) * 28 + 142)}
                                                         </p>
                                                         <p className="text-[9px] text-zinc-400 mt-0.5">Updated live</p>
                                                     </div>
                                                 </div>
                                                 {/* Simple mini sparkline */}
                                                 <div className="pt-1.5">
                                                     <p className="text-[9px] font-bold text-zinc-400 uppercase mb-1 flex justify-between">
                                                         <span>7-Day Subscriber Trend</span>
                                                         <span className="text-emerald-500 font-extrabold">+12.5%</span>
                                                     </p>
                                                     <div className="h-6 flex items-end gap-1 px-1">
                                                         {[40, 55, 48, 70, 85, 75, 98].map((val, i) => (
                                                             <div 
                                                                 key={i} 
                                                                 style={{ height: `${val}%` }} 
                                                                 className="flex-1 bg-gradient-to-t from-[#EF8020] to-[#f39c12] rounded-t-sm" 
                                                                 title={`Day ${i+1}`}
                                                             />
                                                         ))}
                                                     </div>
                                                 </div>
                                             </div>

                                             {/* Referral / Affiliate program */}
                                             <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3">
                                                 <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-2">
                                                     <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-500">
                                                         <Link className="w-4 h-4" />
                                                     </div>
                                                     <p className="text-xs font-black uppercase tracking-wider text-zinc-400">Affiliate Referral Program</p>
                                                 </div>
                                                 <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                                                     Share your unique custom tracker link to earn platform referral points and recruit subscribers seamlessly.
                                                 </p>
                                                 <div className="flex gap-2">
                                                     <input 
                                                         type="text" 
                                                         readOnly 
                                                         value={`${window.location.origin}/messages?channel=${activeChannel.id}&ref=${user.uid}`}
                                                         className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[10px] font-mono outline-none text-zinc-600 dark:text-zinc-300"
                                                     />
                                                     <button 
                                                         onClick={() => {
                                                             navigator.clipboard.writeText(`${window.location.origin}/messages?channel=${activeChannel.id}&ref=${user.uid}`);
                                                             notify("Affiliate tracker link copied!", "success");
                                                         }}
                                                         className="p-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl transition"
                                                         title="Copy Link"
                                                     >
                                                         <Copy className="w-4 h-4" />
                                                     </button>
                                                 </div>
                                                 <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 pt-0.5">
                                                     <span>Total referrals recruited</span>
                                                     <span className="text-indigo-600 dark:text-indigo-400">8 users</span>
                                                 </div>
                                             </div>

                                             {/* Interactive configurations */}
                                             <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-4">
                                                 <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider px-0.5">Interactive Controls</p>
                                                 
                                                 {/* Channel Type Toggle */}
                                                 <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                                                     <div>
                                                         <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                             <Shield className="w-4 h-4 text-[#EF8020]" />
                                                             <span>Private Channel</span>
                                                         </p>
                                                         <p className="text-[10px] text-zinc-400 mt-0.5">Only invited users can join this channel.</p>
                                                     </div>
                                                     <button 
                                                         onClick={async () => {
                                                             try {
                                                                 const newVal = !activeChannel.isPrivate;
                                                                 await updateDoc(doc(db, 'community_channels', activeChannel.id), { isPrivate: newVal });
                                                                 notify(`Channel is now ${newVal ? 'Private' : 'Public'}`, 'success');
                                                             } catch(e) { notify('Failed to update setting', 'error'); }
                                                         }}
                                                         className={`w-11 h-6 rounded-full p-0.5 transition-colors ${activeChannel.isPrivate ? 'bg-emerald-500 flex justify-end' : 'bg-zinc-300 dark:bg-zinc-700 flex justify-start'}`}
                                                     >
                                                         <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                                                     </button>
                                                 </div>

                                                 {/* Discussion Comments Toggle */}
                                                 <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                                                     <div>
                                                         <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                             <MessageSquare className="w-4 h-4 text-[#EF8020]" />
                                                             <span>Enable Comments</span>
                                                         </p>
                                                         <p className="text-[10px] text-zinc-400 mt-0.5">Let subscribers discuss your posts directly.</p>
                                                     </div>
                                                     <button 
                                                         onClick={async () => {
                                                             try {
                                                                 const newVal = !activeChannel.discussionEnabled;
                                                                 await updateDoc(doc(db, 'community_channels', activeChannel.id), { discussionEnabled: newVal });
                                                                 notify(`Comments ${newVal ? 'Enabled' : 'Disabled'}`, 'success');
                                                             } catch(e) { notify('Failed to update setting', 'error'); }
                                                         }}
                                                         className={`w-11 h-6 rounded-full p-0.5 transition-colors ${activeChannel.discussionEnabled ? 'bg-emerald-500 flex justify-end' : 'bg-zinc-300 dark:bg-zinc-700 flex justify-start'}`}
                                                     >
                                                         <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                                                     </button>
                                                 </div>

                                                 {/* Allow Direct Messages */}
                                                 <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                                                     <div>
                                                         <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                             <User className="w-4 h-4 text-[#EF8020]" />
                                                             <span>Allow DM Contacts</span>
                                                         </p>
                                                         <p className="text-[10px] text-zinc-400 mt-0.5">Allow subscribers to PM you from this channel.</p>
                                                     </div>
                                                     <button 
                                                         onClick={async () => {
                                                             try {
                                                                 const newVal = activeChannel.allowDMs === false ? true : false;
                                                                 await updateDoc(doc(db, 'community_channels', activeChannel.id), { allowDMs: newVal });
                                                                 notify(`Direct messages ${newVal ? 'Allowed' : 'Disabled'}`, 'success');
                                                             } catch(e) { notify('Failed to update setting', 'error'); }
                                                         }}
                                                         className={`w-11 h-6 rounded-full p-0.5 transition-colors ${activeChannel.allowDMs !== false ? 'bg-emerald-500 flex justify-end' : 'bg-zinc-300 dark:bg-zinc-700 flex justify-start'}`}
                                                     >
                                                         <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                                                     </button>
                                                 </div>

                                                 {/* Auto-Translate Toggle */}
                                                 <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                                                     <div>
                                                         <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                             <Sparkles className="w-4 h-4 text-[#EF8020]" />
                                                             <span>Auto-Translate Posts</span>
                                                         </p>
                                                         <p className="text-[10px] text-zinc-400 mt-0.5">Translate posts automatically for international viewers.</p>
                                                     </div>
                                                     <button 
                                                         onClick={async () => {
                                                             try {
                                                                 const newVal = !activeChannel.autoTranslate;
                                                                 await updateDoc(doc(db, 'community_channels', activeChannel.id), { autoTranslate: newVal });
                                                                 notify(`Auto-translate ${newVal ? 'Enabled' : 'Disabled'}`, 'success');
                                                             } catch(e) { notify('Failed to update setting', 'error'); }
                                                         }}
                                                         className={`w-11 h-6 rounded-full p-0.5 transition-colors ${activeChannel.autoTranslate ? 'bg-emerald-500 flex justify-end' : 'bg-zinc-300 dark:bg-zinc-700 flex justify-start'}`}
                                                     >
                                                         <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                                                     </button>
                                                 </div>

                                                 {/* Allowed Reactions Selector */}
                                                 <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl space-y-2.5">
                                                     <div>
                                                         <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                             <Info className="w-4 h-4 text-[#EF8020]" />
                                                             <span>Allowed Reactions</span>
                                                         </p>
                                                         <p className="text-[10px] text-zinc-400 mt-0.5">Restrict the types of reaction emojis subscribers can use.</p>
                                                     </div>
                                                     <div className="flex gap-1.5 pt-1">
                                                         {['all', 'some', 'none'].map((opt) => (
                                                             <button
                                                                 key={opt}
                                                                 onClick={async () => {
                                                                     try {
                                                                         await updateDoc(doc(db, 'community_channels', activeChannel.id), { allowedReactions: opt });
                                                                         notify(`Allowed reactions updated to: ${opt}`, 'success');
                                                                     } catch(e) { notify('Failed to update setting', 'error'); }
                                                                 }}
                                                                 className={`flex-1 py-2 rounded-xl text-xs font-extrabold capitalize transition-colors ${
                                                                     (activeChannel.allowedReactions || 'all') === opt 
                                                                         ? 'bg-gradient-to-r from-[#EF8020] to-[#f39c12] text-white shadow-md shadow-[#EF8020]/20' 
                                                                         : 'bg-zinc-100 dark:bg-zinc-700/60 text-zinc-650 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200/50 dark:border-zinc-700/50'
                                                                 }`}
                                                             >
                                                                 {opt}
                                                             </button>
                                                         ))}
                                                     </div>
                                                 </div>
                                             </div>

                                             {/* Recent activity audit log */}
                                             <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3">
                                                 <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-2">
                                                     <div className="p-1 rounded-lg bg-teal-500/10 text-teal-500">
                                                         <Activity className="w-4 h-4" />
                                                     </div>
                                                     <p className="text-xs font-black uppercase tracking-wider text-zinc-400">Recent Admin Audit Log</p>
                                                 </div>
                                                 <div className="space-y-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                                                     <div className="flex justify-between py-1 border-b border-zinc-50 dark:border-zinc-800/40">
                                                         <span>Changed allowed reactions to "{activeChannel.allowedReactions || 'all'}"</span>
                                                         <span className="text-zinc-400">Just now</span>
                                                     </div>
                                                     <div className="flex justify-between py-1 border-b border-zinc-50 dark:border-zinc-800/40">
                                                         <span>Updated channel description</span>
                                                         <span className="text-zinc-400">2h ago</span>
                                                     </div>
                                                     <div className="flex justify-between py-1 border-b border-zinc-50 dark:border-zinc-800/40">
                                                         <span>Activated discussion group forum link</span>
                                                         <span className="text-zinc-400">1d ago</span>
                                                     </div>
                                                 </div>
                                             </div>

                                             {/* Standard profile & delete actions */}
                                             <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3">
                                                 <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider px-0.5">Danger Zone</p>
                                                 <button 
                                                     onClick={() => {
                                                         setDetailsSubModal(null);
                                                         handleEditChannel();
                                                     }}
                                                     className="w-full py-3 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl font-bold text-sm text-zinc-800 dark:text-zinc-100 flex items-center justify-between transition-colors border border-zinc-200/50 dark:border-zinc-700"
                                                 >
                                                     <span>Edit Channel Profile Info</span>
                                                     <Edit className="w-4 h-4 text-zinc-400" />
                                                 </button>

                                                 <div className="border-t border-zinc-150 dark:border-zinc-800 pt-3">
                                                     {!confirmDeleteChannel ? (
                                                         <button 
                                                             onClick={() => setConfirmDeleteChannel(true)}
                                                             className="w-full py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-red-500/10"
                                                         >
                                                             <Trash className="w-4 h-4" />
                                                             <span>Delete Channel Session</span>
                                                         </button>
                                                     ) : (
                                                         <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-center space-y-3 animate-pulse">
                                                             <p className="text-xs font-extrabold text-red-500 uppercase tracking-widest">⚠️ Critically Dangerous Action ⚠️</p>
                                                             <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                                                 Are you absolutely certain? This will delete the channel cover, all messages, all subscriptions, and this operation CANNOT be undone!
                                                             </p>
                                                             <div className="flex gap-2">
                                                                 <button 
                                                                     onClick={() => setConfirmDeleteChannel(false)}
                                                                     className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-lg text-xs font-bold transition-all"
                                                                 >
                                                                     Cancel
                                                                 </button>
                                                                 <button 
                                                                     onClick={handleDeleteChannel}
                                                                     className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all"
                                                                 >
                                                                     Yes, Delete Permanently
                                                                 </button>
                                                             </div>
                                                         </div>
                                                     )}
                                                 </div>
                                             </div>
                                         </div>
                                     )}
                                 </div>
                             </motion.div>
                         )}
                     </AnimatePresence>
                 </div>
             ) : (
                 <>
                      {/* Active Community Channel Header */}
                      <div className="bg-white dark:bg-zinc-900 px-4 sm:px-6 py-4 flex items-center justify-between shrink-0 z-10 shadow-[0_2px_10px_rgba(0,0,0,0.02)] cursor-pointer" onClick={() => setShowChannelDetailsModal(true)}>
                          <div className="flex items-center gap-4 min-w-0">
                              <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSearchParams({}); }} 
                                className="md:hidden p-1 transition shrink-0"
                                title="Back to Communities"
                              >
                                  <ArrowLeft className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSearchParams({}); }} 
                                className="hidden md:block p-1 transition shrink-0 hover:opacity-70"
                                title="Back to Communities"
                              >
                                  <ArrowLeft className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
                              </button>
                              
                              <div className="relative w-10 h-10 shrink-0">
                                  <div className="w-full h-full rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                                      <img src={activeChannel.imageUrl} alt={activeChannel.name} className="w-full h-full object-cover" />
                                  </div>
                              </div>
                              
                              <div className="min-w-0 flex flex-col justify-center">
                                  <h3 className="font-bold text-[15px] text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                                      <span>{activeChannel.name}</span>
                                      {activeChannel.verified && <VerifiedIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                  </h3>
                                  <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
                                          {activeChannel.subscriberCount || 1} subscribers
                                      </p>
                                  </div>
                              </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 relative ml-4">
                              <button 
                                type="button"
                                onClick={() => setShowP2pSearch(!showP2pSearch)}
                                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition hidden sm:flex" 
                                title="Search Chat"
                              >
                                  <Search className="w-5 h-5" />
                              </button>
                              {isChannelAdmin && !activeLiveCall && (
                                  <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleStartLiveCall(); }}
                                      className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center text-white shadow-sm hover:scale-105 active:scale-95 transition"
                                      title="Start Live Audio"
                                  >
                                      <Radio className="w-4 h-4 fill-current animate-pulse" />
                                  </button>
                              )}
                              <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setShowChannelDetailsModal(true); }} 
                                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition" 
                                title="More Options"
                              >
                                  <MoreVertical className="w-5 h-5" />
                              </button>
                          </div>
                      </div>

                  {/* Pulsing Live Call Banner */}
                  {activeLiveCall && (
                      <div className="bg-emerald-600 dark:bg-emerald-750 text-white px-4 py-2.5 flex items-center justify-between shrink-0 z-10 shadow-md">
                          <div className="flex items-center gap-2">
                              <span className="relative flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                              </span>
                              <div className="text-xs text-left">
                                  <p className="font-extrabold text-[11px] uppercase tracking-wider">Live Discussion Active</p>
                                  <p className="text-[10px] opacity-90 mt-0.5">{liveParticipants.length} people are tuning in</p>
                              </div>
                          </div>
                          <div className="flex items-center gap-2">
                              <button 
                                  type="button"
                                  onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                          await navigator.clipboard.writeText(`${window.location.origin}/messages?channelId=${activeChannel.id}&joinLive=true`);
                                          notify("Live Share Link copied!", "success");
                                      } catch(err) {}
                                  }}
                                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-[10px] font-black rounded-lg transition-all flex items-center gap-1 uppercase tracking-wider"
                                  title="Share Live Link"
                              >
                                  <Link className="w-3 h-3" />
                                  <span>Share Link</span>
                              </button>
                              
                              {(showLiveCallModal || activeLiveCall.hostId === user?.uid || liveParticipants.some(p => p.id === user?.uid)) ? (
                                  <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setShowLiveCallModal(true); }}
                                      className="px-3 py-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider"
                                  >
                                      Joined
                                  </button>
                              ) : (
                                  <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleJoinLiveCall(); }}
                                      className="px-3 py-1 bg-white text-emerald-600 hover:bg-zinc-100 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider animate-pulse"
                                  >
                                      Join
                                  </button>
                              )}
                          </div>
                      </div>
                  )}

                  {(() => {
                    const pins = activeChannel?.pinnedMessages || (activeChannel?.pinnedMessage ? [activeChannel.pinnedMessage] : []);
                    if (pins.length === 0) return null;
                    const currentPin = pins[currentPinnedIndex % pins.length];
                    return (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-zinc-900/90 dark:to-zinc-950/90 border-b border-amber-100 dark:border-zinc-800 px-4 py-2 flex items-center justify-between text-xs shrink-0 z-10 shadow-sm relative">
                      <div className="flex items-center gap-2 min-w-0 cursor-pointer flex-1" onClick={() => {
                        const targetMsg = channelMessages.find(m => m.id === currentPin.id);
                        if (targetMsg) {
                          document.getElementById(`msg-${targetMsg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          triggerHighlight(targetMsg.id);
                        } else {
                          notify(`Pinned: ${currentPin.text}`, "info");
                        }
                        if (pins.length > 1) {
                            setCurrentPinnedIndex(prev => prev + 1);
                        }
                      }}>
                        <Pin className="w-3.5 h-3.5 text-[#EF8020] rotate-45 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                              <p className="font-bold text-[10px] text-[#EF8020] uppercase tracking-wider">Pinned Message {pins.length > 1 ? `(${ (currentPinnedIndex % pins.length) + 1 }/${pins.length})` : ""}</p>
                              {pins.length > 1 && <span className="text-[9px] text-zinc-500 font-medium">Click to see next pin</span>}
                          </div>
                          <p className="text-[11px] text-zinc-600 dark:text-zinc-300 truncate mt-0.5">{currentPin.text}</p>
                        </div>
                      </div>
                      {activeChannel.creatorId === user.uid && (
                        <button 
                          type="button" 
                          onClick={() => handleUnpinMessage(currentPin.id)}
                          className="p-1 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-600 transition ml-2 shrink-0"
                          title="Unpin Message"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    );
                  })()}

                  {/* Group / Untrusted Safety Warning Banner */}
                  <div className="mx-3 sm:mx-4 my-2 p-3 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-start gap-2.5 shadow-sm text-left shrink-0">
                    <div className="p-1.5 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5 shadow-sm">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-xs text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                        নিরাপত্তা সতর্কতা ও লেনদেন নির্দেশিকা
                      </h5>
                      <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 mt-0.5 leading-relaxed font-medium">
                        গ্রুপে বা কারো পার্সোনাল ইনবক্সে অগ্রিম টাকা লেনদেন করার ক্ষেত্রে নিজ দায়িত্বে করবেন। প্ল্যাটফর্মের অফিশিয়াল চেকআউট ছাড়া যেকোনো ব্যক্তিগত লেনদেনের জন্য DEEP SHOP কর্তৃপক্ষ কোনোভাবেই দায়ী থাকবে না।
                      </p>
                    </div>
                  </div>

                  {/* Channel Messages Scroll Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {channelMessages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-zinc-400 p-6 text-center">
                              <Sparkles className="w-12 h-12 mb-3 text-emerald-500 fill-emerald-500 animate-pulse" />
                              <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200">Welcome to @{activeChannel.customLink}!</p>
                              <p className="text-xs mt-1 text-zinc-500 max-w-xs leading-relaxed">This is the community group channel. Members and sellers can share updates here.</p>
                          </div>
                      ) : (
                          channelMessages.map((msg, idx) => {
                              const isMe = msg.senderId === user.uid;
                              const reactionEntries = Object.entries(msg.reactions || {});
                              const isMenuOpen = activeMessageMenuId === msg.id;
                              const showDate = idx === 0 || formatDateSeparator(msg.timestamp) !== formatDateSeparator(channelMessages[idx - 1].timestamp);

                              const isCreator = msg.senderId === activeChannel.creatorId;
                              const isChannelAdmin = channelAdmins.some((a: any) => a.id === msg.senderId || a.uid === msg.senderId);
                              const isSeller = msg.senderRole === "seller" || isCreator;

                              if (msg.isDeletedForEveryone) {
                                 return (
                                     <React.Fragment key={`${msg.id || idx}-${idx}`}>
                                         {showDate && (
                                             <div className="flex justify-center my-4 select-none">
                                                 <span className="px-3 py-1 bg-black/5 dark:bg-white/5 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-wider backdrop-blur-sm">
                                                     {formatDateSeparator(msg.timestamp)}
                                                 </span>
                                             </div>
                                         )}
                                         <div className={cn("flex w-full mb-1", isMe ? "justify-end" : "justify-start")}>
                                              <div className="flex max-w-[85%] sm:max-w-[75%] flex-row items-start gap-2">
                                                  {!isMe && (
                                                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0 overflow-hidden border border-zinc-300 dark:border-zinc-700">
                                                        <div className="w-full h-full bg-transparent" />
                                                    </div>
                                                  )}
                                                  <div className="flex flex-col relative">
                                                      <div className="px-4 py-2 text-[13px] bg-zinc-100/60 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-zinc-400 italic">
                                                          <div className="flex items-center gap-1.5 opacity-75">
                                                              <Trash className="w-3.5 h-3.5" />
                                                              <span>This message was deleted</span>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </div>
                                         </div>
                                     </React.Fragment>
                                 );
                              }

                              return (
                                  <React.Fragment key={`${msg.id || idx}-${idx}`}>
                                      {showDate && (
                                          <div className="flex justify-center my-4 select-none">
                                              <span className="px-3 py-1 bg-black/5 dark:bg-white/5 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-wider backdrop-blur-sm">
                                                  {formatDateSeparator(msg.timestamp)}
                                              </span>
                                          </div>
                                      )}
                                      <div 
                                        id={`msg-${msg.id}`}
                                        className={cn(
                                            "flex gap-2.5 relative pb-2 group transition-all duration-500 rounded-2xl p-1",
                                            isMe ? "justify-end" : "justify-start",
                                            highlightedMessageId === msg.id && "bg-amber-500/10 dark:bg-amber-500/5 ring-2 ring-amber-500/50 scale-[1.01] shadow-md shadow-amber-500/10 animate-pulse"
                                        )}
                                        onClick={() => setActiveMessageMenuId(null)}
                                      >
                                      {/* Other Member Avatar on Left */}
                                      {!isMe && (
                                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0 self-start overflow-hidden border border-zinc-300 dark:border-zinc-700 shadow-sm mt-0.5">
                                            {msg.senderPhoto ? (
                                                <img src={msg.senderPhoto} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 font-black text-xs">
                                                    {(msg.senderName || 'U')[0].toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                      )}
                                                                   
                                      <div className={cn("max-w-[80%] sm:max-w-[70%] flex flex-col relative group/bubble", isMe ? "items-end" : "items-start")}>
                                          {/* Sender Label and Role Badge (Shown on incoming messages in group) */}
                                          {!isMe && (
                                            <div className="flex items-center gap-1.5 mb-1 ml-1">
                                                <span className={cn("font-bold text-[12px] flex items-center gap-1", getSenderColor(msg.senderId || msg.senderName))}>
                                                  <span>{msg.senderName || "Member"}</span>
                                                  {isSeller && <VerifiedIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                                </span>
                                                {isCreator ? (
                                                  <span className="bg-emerald-500 text-zinc-950 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider select-none scale-90 shadow-sm">
                                                      CREATOR
                                                  </span>
                                                ) : isChannelAdmin ? (
                                                  <span className="bg-indigo-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider select-none scale-90 shadow-sm">
                                                      ADMIN
                                                  </span>
                                                ) : isSeller ? (
                                                  <span className="bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider select-none scale-90 shadow-sm">
                                                      SELLER
                                                  </span>
                                                ) : (
                                                  <span className="bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider select-none scale-90">
                                                      MEMBER
                                                  </span>
                                                )}
                                            </div>
                                          )}

                                          {/* Quoted Reply Header (if any) */}
                                          {msg.replyTo && (
                                              <div 
                                                className={cn(
                                                  "mb-1.5 p-2 rounded-xl text-xs border-l-[3px] text-left max-w-full cursor-pointer hover:opacity-85 transition",
                                                  isMe 
                                                    ? "bg-emerald-700/60 border-white text-white/90" 
                                                    : "bg-zinc-100 dark:bg-zinc-800/80 border-emerald-500 text-zinc-600 dark:text-zinc-400"
                                                )}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (msg.replyTo.id) {
                                                    document.getElementById(`msg-${msg.replyTo.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    triggerHighlight(msg.replyTo.id);
                                                  }
                                                }}
                                              >
                                                  <p className={cn("font-bold text-[9px]", isMe ? "text-emerald-200" : "text-emerald-600 dark:text-emerald-400")}>
                                                      {msg.replyTo.senderId === user.uid ? "You" : (activeChannel.creatorName || "Reply")}
                                                  </p>
                                                  <p className="truncate text-[10.5px] mt-0.5">{msg.replyTo.text}</p>
                                              </div>
                                          )}

                                          {/* Forwarded Header (if any) */}
                                          {msg.forwardedFrom && (
                                            <div className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500 font-bold mb-1 italic">
                                              <Forward className="w-3 h-3 text-zinc-400" />
                                              <span>Forwarded from {msg.forwardedFrom}</span>
                                            </div>
                                          )}

                                          {/* Voice Audio */}
                                          {msg.audioUrl && (
                                              <div className={`px-2 py-2 ${msg.text ? 'mb-1' : ''}`}>
                                                  <VoiceMessageBubble 
                                                      audioSrc={msg.audioUrl} 
                                                      duration={msg.audioDuration || 15} 
                                                      isMe={isMe}
                                                      waveColor={isMe ? '#ffffff' : '#10b981'}
                                                  />
                                              </div>
                                          )}

                                          {/* Images attachment */}
                                          {(msg.images && msg.images.length > 0) ? (
                                            <div className="flex flex-wrap gap-1 mb-1 max-w-[280px]">
                                                {msg.images.map((imgUrl: string, idx: number) => (
                                                    <div key={idx} className="rounded-2xl overflow-hidden border border-black/5 dark:border-white/5 shadow-sm max-w-[280px] cursor-pointer" onClick={(e) => { e.stopPropagation(); setLightboxImage(imgUrl); setLightboxZoom(1); setLightboxOffset({ x: 0, y: 0 }); setLightboxMessageId(msg.id); }}>
                                                        <img src={imgUrl} alt="Attachment" className="w-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                          ) : msg.imageUrl && (
                                              <div onClick={(e) => { e.stopPropagation(); setLightboxImage(msg.imageUrl); setLightboxZoom(1); setLightboxOffset({ x: 0, y: 0 }); setLightboxMessageId(msg.id); }} className="mb-1 rounded-2xl overflow-hidden border border-black/5 dark:border-white/5 shadow-sm max-w-[280px] cursor-pointer">
                                                  <img src={msg.imageUrl} alt="Attachment" className="w-full object-cover" />
                                              </div>
                                          )}

                                          {/* Post / Message Bubble text */}
                                          {msg.text && (
                                              <div 
                                                  onClick={(e) => { e.stopPropagation(); setActiveMessageMenuId(isMenuOpen ? null : msg.id); }}
                                                  className={cn(
                                                    "px-3.5 py-2 rounded-[20px] shadow-sm cursor-pointer select-none relative flex flex-col transition-all",
                                                    isMe 
                                                      ? "bg-emerald-600 dark:bg-emerald-600 text-white rounded-br-xs" 
                                                      : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-xs border border-zinc-200/80 dark:border-zinc-700"
                                                  )}
                                              >
                                                  <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words pr-10">
                                                      {renderTextWithLinks(msg.text, isMe)}
                                                  </p>
                                                  
                                                  {/* URL Preview support */}
                                                  <LinkPreviewCard text={msg.text} isMe={isMe} />
                                                  
                                                  <div className="self-end mt-0.5 flex items-center gap-1">
                                                      <span className={cn("text-[9px] font-medium", isMe ? "text-white/75" : "text-zinc-400 dark:text-zinc-500")}>
                                                          {formatTime12h(msg.timestamp)}
                                                      </span>
                                                  </div>
                                              </div>
                                          )}

                                          {/* Reactions Badge / Add Reaction */}
                                          <div 
                                              className={cn(
                                                "absolute -bottom-2 flex items-center gap-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm rounded-full px-2 py-0.5 z-10 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition cursor-pointer",
                                                isMe ? "right-2" : "right-2",
                                                reactionEntries.length > 0 ? "opacity-100 scale-100" : "opacity-0 scale-95 group-hover/bubble:opacity-100 group-hover/bubble:scale-100"
                                              )} 
                                              onClick={(e) => { e.stopPropagation(); setActiveMessageMenuId(msg.id); }}
                                          >
                                              {reactionEntries.length > 0 ? (
                                                  <>
                                                      {Array.from(new Set(reactionEntries.map(([uid, emoji]) => emoji))).map((emoji: any, emIdx: number) => (
                                                          <span key={`chan-react-${emoji}-${emIdx}`} className="text-[12px]">{emoji}</span>
                                                      ))}
                                                      {reactionEntries.length > 1 && (
                                                          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 self-center ml-0.5">{reactionEntries.length}</span>
                                                      )}
                                                  </>
                                              ) : (
                                                  <div className="flex items-center text-zinc-400 py-[2px]">
                                                     <Plus className="w-3 h-3" />
                                                  </div>
                                              )}
                                          </div>

                                          <span className={cn("text-[9px] font-semibold text-zinc-400 mx-1 block", reactionEntries.length > 0 ? "mt-3.5" : "mt-1")}>
                                              {formatTime12h(msg.timestamp)}
                                          </span>
                                      </div>
                                  </div>
                              </React.Fragment>
                          );
                      })
                      )}
                      <div ref={messagesEndRef} />
                  </div>

                  {/* Channel Input Area */}
                  <div className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 p-3 sm:p-4 shrink-0 z-10">
                      <AnimatePresence>
                          {replyingTo && (
                               <motion.div 
                                   initial={{ opacity: 0, y: 10 }} 
                                   animate={{ opacity: 1, y: 0 }} 
                                   exit={{ opacity: 0, y: 10 }} 
                                   className="mb-3 p-3 bg-zinc-50 dark:bg-white dark:bg-zinc-200 dark:bg-zinc-800/80 shadow-sm dark:shadow-none border-l-[4px] border-emerald-500 rounded-r-xl flex items-center justify-between text-left"
                               >
                                   <div>
                                       <p className="text-[10px] font-bold text-[#EF8020]">Replying to</p>
                                       <p className="text-xs text-zinc-600 dark:text-zinc-300 truncate max-w-xs sm:max-w-md mt-0.5">{replyingTo.text}</p>
                                   </div>
                                   <button onClick={() => setReplyingTo(null)} className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition">
                                       <X className="w-4 h-4" />
                                   </button>
                               </motion.div>
                          )}
                          {(previewUrls.length > 0 || isUploadingAttachment) && (
    <div className="flex flex-wrap items-center gap-2 mb-3">
        {isUploadingAttachment && (
            <div className="w-20 h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                <span className="text-[10px] font-medium text-zinc-500">Uploading...</span>
            </div>
        )}
        {previewUrls.map((url, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative inline-block">
                <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-md">
                    <img src={url} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <button onClick={() => { 
                    setAttachments(prev => prev.filter((_, i) => i !== idx));
                    setPreviewUrls(prev => prev.filter((_, i) => i !== idx));
                }} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-zinc-900 dark:text-white rounded-full flex items-center justify-center shadow-sm">
                    <X className="w-3.5 h-3.5" />
                </button>
            </motion.div>
        ))}
    </div>
)}
                      </AnimatePresence>

                      {activeChannel.creatorId === user.uid ? (
                          <div className="flex items-center gap-3 w-full bg-zinc-50 dark:bg-[#0a0a0a] pt-2 pb-2 relative">
                              <input type="file" ref={fileInputRef} onChange={handleAttachmentChange} className="hidden" accept="image/*" multiple />
                              
                              {isRecording ? (
                                  <div className="flex-1 flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-700/50 shadow-inner">
                                      <div className="flex items-center gap-3 text-red-500 font-semibold text-sm">
                                          <div className="flex items-center gap-1.5 animate-pulse">
                                              <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                                              <div className="flex gap-0.5 items-center h-4">
                                              {[1,2,3,4,5].map(i => (
                                                  <div key={i} className={`w-1 bg-red-500 rounded-full animate-pulse`} style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }}></div>
                                              ))}
                                              </div>
                                          </div>
                                          <span className="tabular-nums font-mono">
                                              {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                                          </span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                          <span className="text-xs text-zinc-400 animate-pulse hidden sm:block">&lt; Slide to cancel</span>
                                          <button onClick={cancelRecording} className="text-zinc-500 hover:text-red-500 transition-colors bg-white dark:bg-zinc-700 p-1.5 rounded-full shadow-sm">
                                              <X className="w-5 h-5" />
                                          </button>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="flex-1 flex items-center bg-white dark:bg-zinc-800 px-4 py-2 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-zinc-100 dark:border-zinc-700/50">
                                      <textarea
                                          value={newMessage}
                                          onChange={(e) => setNewMessage(e.target.value)}
                                          onKeyDown={(e) => {
                                              if (e.key === 'Enter' && !e.shiftKey) {
                                                  e.preventDefault();
                                                  handleSendMessage();
                                              }
                                          }}
                                          placeholder="Broadcast an update..."
                                          className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-2 text-[15px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 placeholder:font-medium leading-tight h-[40px] p-0 focus:outline-none outline-none focus-visible:outline-none"
                                          rows={1}
                                      />
                                      <button onClick={() => fileInputRef.current?.click()} className="ml-2 text-zinc-400 hover:text-indigo-600 transition-colors shrink-0" title="Add Image">
                                          <ImageIcon className="w-5 h-5" />
                                      </button>
                                  </div>
                              )}
                              
                              <div className="relative flex items-center justify-center h-12">
                                  {isRecording && (
                                      <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-800 text-zinc-500 rounded-full p-2 shadow-lg border border-zinc-200 dark:border-zinc-700 animate-bounce">
                                          <Lock className="w-4 h-4" />
                                      </div>
                                  )}
                                  <button 
                                      onMouseDown={(e) => {
                                          if (isTouchActiveRef.current) return;
                                          if (!isRecording && !newMessage.trim() && previewUrls.length === 0) {
                                              startRecording();
                                          }
                                      }}
                                      onMouseUp={() => {
                                          if (isTouchActiveRef.current) return;
                                          if (isRecording) {
                                              stopRecording(true);
                                          }
                                      }}
                                      onTouchStart={(e) => {
                                          isTouchActiveRef.current = true;
                                          if (!isRecording && !newMessage.trim() && previewUrls.length === 0) {
                                              startRecording();
                                          }
                                      }}
                                      onTouchEnd={() => {
                                          if (isRecording) {
                                              stopRecording(true);
                                          }
                                          setTimeout(() => {
                                              isTouchActiveRef.current = false;
                                          }, 400);
                                      }}
                                      onClick={() => {
                                          if (newMessage.trim() || previewUrls.length > 0) {
                                              handleSendMessage();
                                          }
                                      }}
                                      disabled={isUploadingAttachment}
                                      className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all shadow-[0_4px_12px_rgba(79,70,229,0.3)] ${
                                          (newMessage.trim() || previewUrls.length > 0 || isRecording) ? 'bg-[#4E4AEB] hover:bg-[#3d39db] hover:scale-105 active:scale-95 text-white' : 'bg-[#4E4AEB] text-white hover:scale-105 active:scale-95'
                                      }`}
                                  >
                                      {isRecording ? (
                                          <Icon name="send" className="w-5 h-5 ml-0.5" />
                                      ) : newMessage.trim() || previewUrls.length > 0 ? (
                                          <Icon name="send" className="w-5 h-5 ml-0.5" />
                                      ) : (
                                          <Mic className="w-5 h-5" />
                                      )}
                                  </button>
                              </div>
                          </div>
                      ) : (
                          <div className="flex justify-center w-full">
                              {userSubscription ? (
                                  <button
                                      type="button"
                                      onClick={() => handleToggleMuteChannel(activeChannel, userSubscription.muted)}
                                      className="w-full max-w-sm py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2"
                                  >
                                      {userSubscription.muted ? <Volume2 className="w-5 h-5 text-emerald-500" /> : <VolumeX className="w-5 h-5 text-zinc-500" />}
                                      <span>{userSubscription.muted ? "Unmute" : "Mute"}</span>
                                  </button>
                              ) : (
                                  <button
                                      type="button"
                                      onClick={() => handleSubscribeToChannel(activeChannel)}
                                      className="w-full max-w-sm py-3 bg-emerald-600 hover:bg-emerald-500 text-zinc-900 dark:text-white rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-md"
                                  >
                                      <span>Join</span>
                                  </button>
                              )}
                          </div>
                      )}
                    </div>
                 </>
             )
         ) : !activeChat ? (
             <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
                 <div className="w-20 h-20 rounded-full bg-white dark:bg-zinc-900 shadow-sm flex items-center justify-center mb-4">
                     <svg className="w-8 h-8 text-zinc-300 dark:text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                     </svg>
                 </div>
                 <p className="font-bold text-lg text-zinc-600 dark:text-zinc-300">Your Messages</p>
                 <p className="text-sm mt-1">Select a chat or community channel to start messaging</p>
             </div>
         ) : (
             <>
                 {/* Active Chat Header */}
                 <div className="bg-[#F0F2F5] dark:bg-[#0E0F12] px-3 sm:px-5 py-3 flex items-center justify-between shrink-0 z-20 gap-2 sm:gap-3 transition-colors border-b border-black/5 dark:border-white/5">
                     <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                         {/* Floating Circular Back Button */}
                         <button 
                           type="button"
                           onClick={() => setSearchParams({}, { replace: true })}
                           className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white dark:bg-[#1E1F24] shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4)] flex items-center justify-center text-zinc-900 dark:text-zinc-100 hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
                           title="Back to Chats"
                         >
                             <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.3]" />
                         </button>
                         
                         {/* Circular Avatar */}
                         <div 
                           className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden shrink-0 cursor-pointer shadow-xs border border-black/5 dark:border-white/5"
                           onClick={() => {
                                if (activeChat?.isGroup || activeChat?.type === 'group') {
                                    setShowGroupDetailsModal(true);
                                } else {
                                    setShowUserInfoModal(true);
                                }
                            }}
                         >
                             {activeChat.otherUser?.photoURL ? (
                                 <img src={activeChat.otherUser.photoURL} alt={activeChat.otherUser.displayName} className="w-full h-full object-cover" />
                             ) : (
                                 <div className="w-full h-full flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-sm">
                                     {(activeChat.otherUser?.displayName || activeChat.otherUser?.shopName || 'U')[0].toUpperCase()}
                                 </div>
                             )}
                         </div>
                         
                         {/* Name and Last Seen / Status */}
                         <div className="min-w-0 flex flex-col justify-center flex-1">
                             <h3 
                               className="font-bold text-[15px] sm:text-[16px] text-zinc-900 dark:text-white truncate cursor-pointer flex items-center gap-1.5 leading-tight group" 
                               onClick={() => {
                                if (activeChat?.isGroup || activeChat?.type === 'group') {
                                    setShowGroupDetailsModal(true);
                                } else {
                                    setShowUserInfoModal(true);
                                }
                            }}
                             >
                                 <span className="truncate">{getChatDisplayName(activeChat)}</span>
                                 {(activeChat.otherUser?.kycStatus === "verified" || activeChat.otherUser?.verified) && <VerifiedIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                 <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 group-hover:translate-x-0.5 transition-all shrink-0" />
                             </h3>
                             <div className="flex items-center gap-1.5 truncate mt-0.5">
                                  {activeChat?.isGroup || activeChat?.type === 'group' ? (
                                      <p className="text-[12px] sm:text-[13px] text-zinc-400 dark:text-zinc-500 truncate font-normal">
                                          {isOtherTyping ? "Someone is typing..." : `${activeChat.participants?.length || 2} members`}
                                      </p>
                                  ) : isOtherTyping ? (
                                     <p className="text-[12px] sm:text-[13px] font-semibold text-indigo-600 dark:text-indigo-400 animate-pulse truncate">
                                         typing...
                                     </p>
                                 ) : isOtherRecording ? (
                                     <p className="text-[12px] sm:text-[13px] font-semibold text-rose-500 animate-pulse flex items-center gap-1 truncate">
                                         <Mic className="w-3 h-3 text-rose-500 shrink-0" />
                                         <span>recording audio...</span>
                                     </p>
                                 ) : (
                                     <p className="text-[12px] sm:text-[13px] text-zinc-400 dark:text-zinc-500 truncate font-normal">
                                         {getLastActiveText(otherUserPresence)}
                                     </p>
                                 )}
                                 {activeChat?.autoDeleteTimer && (
                                     <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded-full flex items-center gap-1 shrink-0 ml-1">
                                         <Clock className="w-2.5 h-2.5" />
                                         {
                                             activeChat.autoDeleteTimer.duration === 86400000 ? "1d" :
                                             activeChat.autoDeleteTimer.duration === 604800000 ? "1w" :
                                             activeChat.autoDeleteTimer.duration === 2592000000 ? "1m" : "On"
                                         }
                                     </span>
                                 )}
                             </div>
                          </div>
                     </div>

                     {/* Right Action Buttons */}
                     <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 relative">
                         {/* Combined Call Capsule (Voice & Video) */}
                         <div className="h-10 sm:h-11 px-3.5 sm:px-4 rounded-full bg-white dark:bg-[#1E1F24] shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4)] flex items-center gap-4 sm:gap-5 shrink-0">
                             <button 
                               type="button"
                               onClick={() => startCall('audio')} 
                               className="text-[#007AFF] dark:text-[#0A84FF] hover:scale-110 active:scale-95 transition-transform flex items-center justify-center p-0.5 cursor-pointer" 
                               title="Voice Call"
                             >
                                 <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                     <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z" />
                                 </svg>
                             </button>
                             <button 
                               type="button"
                               onClick={() => startCall('video')} 
                               className="text-[#007AFF] dark:text-[#0A84FF] hover:scale-110 active:scale-95 transition-transform flex items-center justify-center p-0.5 cursor-pointer" 
                               title="Video Call"
                             >
                                 <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                     <path d="M17 10.5V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-3.5l4 4v-11l-4 4z" />
                                 </svg>
                             </button>
                         </div>



                         {/* Options Button (...) */}
                         <button 
                           type="button"
                           onClick={() => setShowPrivateChatMenu(!showPrivateChatMenu)} 
                           className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white dark:bg-[#1E1F24] shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4)] flex items-center justify-center text-zinc-900 dark:text-zinc-100 hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer" 
                           title="More options"
                         >
                             <MoreHorizontal className="w-5 h-5" />
                         </button>

                         <AnimatePresence>
                           {showPrivateChatMenu && (
                             <>
                               <div className="fixed inset-0 z-40" onClick={() => setShowPrivateChatMenu(false)} />
                               <motion.div 
                                 initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                 animate={{ opacity: 1, scale: 1, y: 0 }}
                                 exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                 className="absolute right-0 top-11 w-48 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xl rounded-2xl p-2 z-50 text-left font-inter"
                               >
                                 {/* Mute / Unmute Option */}
                                 <button 
                                   onClick={() => {
                                     setShowPrivateChatMenu(false);
                                     const isCurrentlyMuted = localStorage.getItem(`chat_muted_${activeChat.id}`) === 'true';
                                     localStorage.setItem(`chat_muted_${activeChat.id}`, (!isCurrentlyMuted).toString());
                                     notify(isCurrentlyMuted ? "Chat unmuted" : "Chat muted", "info");
                                   }}
                                   className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 rounded-xl transition-colors"
                                 >
                                   <VolumeX className="w-4 h-4 text-zinc-400" />
                                   <span>{localStorage.getItem(`chat_muted_${activeChat.id}`) === 'true' ? 'Unmute' : 'Mute'}</span>
                                 </button>

                                 {/* Video Call Option */}
                                 <button 
                                   onClick={() => {
                                     setShowPrivateChatMenu(false);
                                     startCall('video');
                                   }}
                                   className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 rounded-xl transition-colors"
                                 >
                                   <Icon name="video" className="w-4 h-4 text-zinc-400" />
                                   <span>Video Call</span>
                                 </button>

                                 {/* Search messages option */}
                                 <button 
                                   onClick={() => {
                                     setShowPrivateChatMenu(false);
                                     setShowP2pSearch(!showP2pSearch);
                                   }}
                                   className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 rounded-xl transition-colors"
                                 >
                                   <Search className="w-4 h-4 text-zinc-400" />
                                   <span>Search Messages</span>
                                 </button>

                                 {/* Change Wallpaper option */}
                                 <button 
                                   onClick={() => {
                                     setShowPrivateChatMenu(false);
                                     setShowWallpaperModal(true);
                                   }}
                                   className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 rounded-xl transition-colors"
                                 >
                                   <ImageIcon className="w-4 h-4 text-zinc-400" />
                                   <span>Change Wallpaper</span>
                                 </button>

                                 <div className="border-t border-zinc-150 dark:border-zinc-700/80 my-1" />

                                 {/* Clear history */}
                                 <button 
                                   onClick={() => {
                                     setShowPrivateChatMenu(false);
                                     setShowClearChatModal(true);
                                   }}
                                   className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-xl transition-colors"
                                 >
                                   <Clock className="w-4 h-4" />
                                   <span>Clear History</span>
                                 </button>

                                 {/* Delete Chat */}
                                 <button 
                                   onClick={() => {
                                     setShowPrivateChatMenu(false);
                                     setShowClearChatModal(true);
                                   }}
                                   className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                   <span>Delete Chat</span>
                                 </button>
                               </motion.div>
                             </>
                           )}
                         </AnimatePresence>
                     </div>
                 </div>

                 {showP2pSearch && (
                   <div className="bg-white dark:bg-zinc-800 px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-700/80 flex items-center gap-2 font-inter shrink-0 shadow-sm z-10">
                     <Search className="w-4 h-4 text-zinc-400" />
                     <input 
                       type="text"
                       placeholder="Search text messages..."
                       value={p2pSearchQuery}
                       onChange={(e) => setP2pSearchQuery(e.target.value)}
                       className="flex-1 bg-transparent text-sm border-none outline-none text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400"
                       autoFocus
                     />
                     {p2pSearchQuery && (
                       <button onClick={() => setP2pSearchQuery('')} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-zinc-400">
                         <X className="w-3.5 h-3.5" />
                       </button>
                     )}
                     <button 
                       onClick={() => { setShowP2pSearch(false); setP2pSearchQuery(''); }} 
                       className="text-xs font-bold text-[#EF8020] px-2.5 py-1 hover:bg-[#EF8020]/10 rounded-lg transition"
                     >
                       Cancel
                     </button>
                   </div>
                 )}

                   <div className={cn("flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 transition-colors", activeTheme.bgClass)}>
                  {messages.length === 0 && !isTrustLoading && (() => {
                    const emailLower = activeChat?.otherUser?.email?.toLowerCase().trim();
                    const isDeepShopUser = emailLower === 'deepshop@gmail.com' || emailLower === 'deepshopbysam@gmail.com' || activeChat?.otherUser?.id === 'system';
                    
                    if (isDeepShopUser) {
                      return (
                        <div className="bg-emerald-500/10 border-b border-emerald-500/25 px-4 py-3 flex items-start gap-3 shrink-0 z-10 shadow-sm relative font-inter">
                          <Icon name="check-circle" className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">✅ Fully Trusted Merchant</p>
                            <p className="text-[11px] text-zinc-650 dark:text-zinc-300 font-medium leading-relaxed mt-0.5">
                              Fully trusted, reason: official verified merchant of deepshop!
                            </p>
                          </div>
                        </div>
                      );
                    }
                    
                    return (!otherUserTrust || otherUserTrust.count === 0 || otherUserTrust.hasScamWarning) ? (
                      <div className="bg-rose-500/10 border-b border-rose-500/25 px-4 py-3 flex items-start gap-3 shrink-0 z-10 shadow-sm relative font-inter animate-pulse">
                        <Icon name="alert-circle" className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-xs text-rose-600 dark:text-rose-400 uppercase tracking-wider">⚠️ Review Low (Be Careful)</p>
                          <p className="text-[11px] text-zinc-650 dark:text-zinc-300 font-medium leading-relaxed mt-0.5">
                            Review low eita untrusted o hote pare be careful! This user has low or zero reviews. Be careful when interacting or initiating transactions.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-500/10 border-b border-emerald-500/25 px-4 py-3 flex items-start gap-3 shrink-0 z-10 shadow-sm relative font-inter">
                        <Icon name="check-circle" className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">✅ Maybe Trusted Merchant</p>
                          <p className="text-[11px] text-zinc-650 dark:text-zinc-300 font-medium leading-relaxed mt-0.5">
                            Maybe trusted, reason: good review & star ratings! (Rating: {otherUserTrust.avgRating}★ from {otherUserTrust.count} reviews)
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {messages.length === 0 && (
                    <EmptyChatState otherUser={activeChat?.otherUser} />
                  )}

                   {activeChat?.pinnedMessage && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-zinc-900/90 dark:to-zinc-950/90 border-b border-amber-100 dark:border-zinc-800 px-4 py-2 flex items-center justify-between text-xs shrink-0 z-10 shadow-sm relative">
                      <div className="flex items-center gap-2 min-w-0 cursor-pointer flex-1" onClick={() => {
                        const targetMsg = messages.find(m => m.id === activeChat.pinnedMessage.id);
                        if (targetMsg) {
                          document.getElementById(`msg-${targetMsg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          triggerHighlight(targetMsg.id);
                        } else {
                          notify(`Pinned: ${activeChat.pinnedMessage.text}`, "info");
                        }
                      }}>
                        <Pin className="w-3.5 h-3.5 text-[#EF8020] rotate-45 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-[10px] text-[#EF8020] uppercase tracking-wider">Pinned Message</p>
                          <p className="text-zinc-650 dark:text-zinc-400 truncate max-w-full font-medium mt-0.5">
                            {activeChat.pinnedMessage.text || "Attachment"}
                          </p>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleUnpinMessageP2P(); }} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition text-zinc-400 shrink-0 ml-2">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Group Chat Untrusted / Advance Payment Safety Warning */}
                  {(activeChat?.isGroup || activeChat?.type === 'group') && (
                    <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-500/30 rounded-2xl p-3.5 mb-3 flex items-start gap-3 shadow-sm">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-xs text-amber-800 dark:text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                          <span>⚠️ লেনদেন ও নিরাপত্তা সতর্কবার্তা</span>
                        </p>
                        <p className="text-[11.5px] text-zinc-700 dark:text-zinc-300 leading-relaxed mt-1 font-medium">
                          গ্রুপের কোনো মেম্বার বা ইউজারের ইনবক্সে ব্যক্তিগতভাবে অগ্রিম টাকা লেনদেন করলে নিজ দায়িত্বে করবেন। ডিপ শপের বাইরে ব্যক্তিগত লেনদেনের কোনো দায়ভার <strong>ডিপ শপ বহন করবে না</strong>। নিরাপদ থাকতে সবসময় অ্যাপের মাধ্যমে অফিসিয়াল অর্ডার করুন।
                        </p>
                      </div>
                    </div>
                  )}

                  {filteredMessages.map((msg, idx) => {
                         const showDate = idx === 0 || formatDateSeparator(msg.timestamp) !== formatDateSeparator(messages[idx - 1].timestamp);
                         const isMe = msg.senderId === user.uid;
                         const isGroupChat = !!(activeChat?.isGroup || activeChat?.type === 'group');
                         const senderPhoto = msg.senderPhoto || participantProfiles[msg.senderId]?.photoURL || (!isGroupChat && activeChat?.otherUser?.photoURL) || '';
                         const senderName = msg.senderName || participantProfiles[msg.senderId]?.displayName || participantProfiles[msg.senderId]?.shopName || (!isGroupChat ? (activeChat?.otherUser?.shopName || activeChat?.otherUser?.displayName) : 'Member') || 'Member';
                         const showAvatar = !isMe && (idx === 0 || messages[idx-1]?.senderId !== msg.senderId);
                         const isSystem = !!msg.systemType;
                         const isMenuOpen = activeMessageMenuId === msg.id;
                         const reactionEntries = Object.entries(msg.reactions || {});

                         if (msg.isDeletedForEveryone) {
                            return (
                                <React.Fragment key={`${msg.id || idx}-${idx}`}>
                                    {showDate && (
                                        <div className="flex justify-center my-4 select-none">
                                            <span className="px-3 py-1 bg-black/5 dark:bg-white/5 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-wider backdrop-blur-sm">
                                                {formatDateSeparator(msg.timestamp)}
                                            </span>
                                        </div>
                                    )}
                                    <div className={`flex w-full mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                     <div className={`flex max-w-[85%] sm:max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                         {!isMe && (
                                             <div className="w-7 h-7 shrink-0 mr-2 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800/50 mt-auto shadow-sm">
                                                 {showAvatar ? (
                                                     senderPhoto ? 
                                                         <img src={senderPhoto} alt="Avatar" className="w-full h-full object-cover" /> :
                                                         <div className="w-full h-full flex items-center justify-center text-xs font-bold text-emerald-500 bg-emerald-900/30">
                                                             {(senderName || 'U')[0].toUpperCase()}
                                                         </div>
                                                 ) : <div className="w-full h-full bg-transparent" />}
                                             </div>
                                         )}
                                         <div className="flex flex-col relative">
                                             <div className={`px-4 py-2 text-[15px] ${isMe ? 'bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-3xl rounded-tr-sm text-zinc-500 italic' : 'bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-3xl rounded-tl-sm text-zinc-500 italic'}`}>
                                                 <div className="flex items-center gap-1.5 opacity-70">
                                                     <Trash className="w-3.5 h-3.5" />
                                                     <span>This message was deleted</span>
                                                 </div>
                                             </div>
                                         </div>
                                     </div>
                                </div>
                               </React.Fragment>
                            );
                         }
                        if (isSystem) {
                             return (
                                 <React.Fragment key={`${msg.id || idx}-${idx}`}>
                                     {showDate && (
                                         <div className="flex justify-center my-4 select-none">
                                             <span className="px-3 py-1 bg-black/5 dark:bg-white/5 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-wider backdrop-blur-sm">
                                                 {formatDateSeparator(msg.timestamp)}
                                             </span>
                                         </div>
                                     )}
                                     <div className="flex justify-center my-4">
                                         <CallBubble msg={msg} />
                                     </div>
                                 </React.Fragment>
                             );
                         }

                         return (
                             <React.Fragment key={`${msg.id || idx}-${idx}`}>
                                 {showDate && (
                                     <div className="flex justify-center my-4 select-none">
                                         <span className="px-3 py-1 bg-black/5 dark:bg-white/5 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-wider backdrop-blur-sm">
                                             {formatDateSeparator(msg.timestamp)}
                                         </span>
                                     </div>
                                 )}
                                 <div 
                                     id={`msg-${msg.id}`} 
                                 className={cn(
                                     `flex gap-2 ${isMe ? 'justify-end' : 'justify-start'} relative pb-3 group transition-all duration-500 rounded-2xl p-1.5`,
                                     highlightedMessageId === msg.id && "bg-amber-500/10 dark:bg-amber-500/5 ring-2 ring-amber-500/50 scale-[1.01] shadow-md shadow-amber-500/10 animate-pulse"
                                 )} 
                                 onClick={() => setActiveMessageMenuId(null)}
                             >
                                 {!isMe && (
                                     <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0 self-end overflow-hidden mb-1 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                                         {showAvatar && (
                                             senderPhoto ? 
                                                 <img src={senderPhoto} alt={senderName} className="w-full h-full object-cover" /> :
                                                 <div className={cn("w-full h-full flex items-center justify-center font-bold text-xs", getSenderColor(msg.senderId || senderName), "bg-zinc-100 dark:bg-zinc-800")}>
                                                     {(senderName || 'U')[0].toUpperCase()}
                                                 </div>
                                         )}
                                     </div>
                                 )}
                                 
                                 <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col relative`}>
                                     {/* Group Chat Sender Name & Badge */}
                                     {isGroupChat && !isMe && (
                                       <div className="flex items-center gap-1.5 mb-1 px-1">
                                         <span className={cn("text-[11.5px] font-bold tracking-tight", getSenderColor(msg.senderId || senderName))}>
                                           {senderName}
                                         </span>
                                         {msg.senderRole && msg.senderRole !== 'member' && (
                                           <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold rounded-md border border-emerald-500/20 uppercase">
                                             {msg.senderRole === 'creator' ? 'Admin' : msg.senderRole}
                                           </span>
                                         )}
                                       </div>
                                     )}

                                     {/* Forwarded Header (if any) */}
                                     {msg.forwardedFrom && (
                                       <div className={`flex items-center gap-1 text-[10px] ${isMe ? 'text-emerald-200' : 'text-zinc-400 dark:text-zinc-500'} font-bold mb-1 italic`}>
                                         <Forward className="w-3 h-3" />
                                         <span>Forwarded from {msg.forwardedFrom}</span>
                                       </div>
                                     )}

                                     {/* Replying to quoted message preview inside bubble */}
                                     {msg.replyTo && (
                                         <div 
                                           className={`mb-1.5 p-2 rounded-xl text-xs border-l-[3px] text-left max-w-full cursor-pointer hover:opacity-80 transition ${isMe ? 'bg-black/10 border-emerald-300 text-emerald-100' : 'bg-zinc-100 dark:bg-zinc-200 dark:bg-zinc-800 border-emerald-500 text-zinc-600 dark:text-zinc-400'}`}
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             if (msg.replyTo.id) {
                                               document.getElementById(`msg-${msg.replyTo.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                               triggerHighlight(msg.replyTo.id);
                                             }
                                           }}
                                         >
                                             <p className="font-bold text-[9px] text-[#EF8020]">
                                                 {msg.replyTo.senderId === user.uid ? "You" : (msg.replyTo.senderName || participantProfiles[msg.replyTo.senderId]?.displayName || activeChat.otherUser?.shopName || activeChat.otherUser?.displayName || "User")}
                                             </p>
                                             <p className="truncate text-[10.5px] mt-0.5">{msg.replyTo.text}</p>
                                         </div>
                                     )}

                                     
                                     <div className="flex items-center gap-2 group/msg">
                                       {(msg.imageUrl || (msg.images && msg.images.length > 0)) && (
                                          <button onClick={() => { setForwardingMessage(msg); setShowForwardModal(true); }} className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1.5 bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 shrink-0" title="Forward">
                                            <Forward className="w-4 h-4 text-zinc-500" />
                                          </button>
                                       )}
                                       
                                       <div 
                                             onDoubleClick={(e) => { e.stopPropagation(); handleReactToMessage(msg.id, '❤️'); }}
                                             onClick={(e) => { e.stopPropagation(); setActiveMessageMenuId(isMenuOpen ? null : msg.id); }}
                                             className={cn(
                                               "px-4 py-2.5 rounded-[22px] shadow-sm cursor-pointer select-none relative flex flex-col gap-1 max-w-[320px] transition-all",
                                               privacySettings.minimalistBubbles 
                                                 ? isMe 
                                                   ? "bg-zinc-100/10 dark:bg-zinc-800/20 border-r-2 border-indigo-500 text-zinc-900 dark:text-zinc-100 rounded-br-sm shadow-none" 
                                                   : "bg-zinc-100/10 dark:bg-zinc-800/20 border-l-2 border-zinc-400 text-zinc-900 dark:text-zinc-100 rounded-bl-sm shadow-none"
                                                 : isMe 
                                                    ? (activeTheme?.bubbleClass ? (activeTheme.bubbleClass + " rounded-br-sm") : "bg-indigo-600 text-white rounded-br-sm")
                                                   : "bg-[#F0F2F5] dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-sm"
                                             )}
                                         >

                                            {msg.audioUrl && (
                                                <div className={`px-2 py-2 ${msg.text ? 'mb-1' : ''}`}>
                                                    <VoiceMessageBubble 
                                                        audioSrc={msg.audioUrl} 
                                                        duration={msg.audioDuration || 15} 
                                                        isMe={msg.senderId === user.uid}
                                                        waveColor={msg.senderId === user.uid ? '#ffffff' : '#4f46e5'}
                                                        autoPlay={currentlyPlayingVoiceId === msg.id}
                                                        onEnded={() => {
                                                            if (privacySettings.autoPlayVoice) {
                                                                const currentIndex = filteredMessages.findIndex(m => m.id === msg.id);
                                                                if (currentIndex !== -1) {
                                                                    const nextVoiceMessage = filteredMessages.slice(currentIndex + 1).find(m => m.audioUrl);
                                                                    if (nextVoiceMessage) {
                                                                        setCurrentlyPlayingVoiceId(nextVoiceMessage.id);
                                                                        notify("Auto-playing next voice message...", "info");
                                                                        return;
                                                                    }
                                                                }
                                                            }
                                                            setCurrentlyPlayingVoiceId(null);
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            {(msg.images && msg.images.length > 0) ? (
                                              <div className="flex flex-wrap gap-1">
                                                  {msg.images.map((imgUrl: string, imgIdx: number) => {
                                                      const isImageLoaded = !privacySettings.dataSaverMode || loadedImages[`${msg.id}-${imgIdx}`];
                                                      return (
                                                          <div key={imgIdx} className="rounded-[12px] overflow-hidden relative">
                                                              {isImageLoaded ? (
                                                                  <div onClick={(e) => { e.stopPropagation(); setLightboxImage(imgUrl); setLightboxZoom(1); setLightboxOffset({ x: 0, y: 0 }); setLightboxMessageId(msg.id); }}>
                                                                      <img src={imgUrl} alt="Attachment" className="w-full object-cover" />
                                                                  </div>
                                                              ) : (
                                                                  <div className="w-48 h-32 bg-zinc-800/80 backdrop-blur-md flex flex-col items-center justify-center p-3 text-center gap-1.5 rounded-[12px] border border-zinc-700/50">
                                                                      <EyeOff className="w-5 h-5 text-zinc-400" />
                                                                      <p className="text-[10px] text-zinc-300 font-bold">Image hidden (Data Saver)</p>
                                                                      <button 
                                                                          type="button"
                                                                          onClick={(e) => {
                                                                              e.stopPropagation();
                                                                              setLoadedImages(prev => ({ ...prev, [`${msg.id}-${imgIdx}`]: true }));
                                                                          }}
                                                                          className="px-2.5 py-1 rounded-full bg-[#EF8020] text-white text-[9px] font-black uppercase hover:bg-[#EF8020]/90 transition"
                                                                      >
                                                                          Load Image
                                                                      </button>
                                                                  </div>
                                                              )}
                                                          </div>
                                                      );
                                                  })}
                                              </div>
                                          ) : msg.imageUrl && (() => {
                                              const isImageLoaded = !privacySettings.dataSaverMode || loadedImages[`${msg.id}-single`];
                                              return (
                                                  <div className="rounded-[12px] overflow-hidden relative">
                                                      {isImageLoaded ? (
                                                          <div onClick={(e) => { e.stopPropagation(); setLightboxImage(msg.imageUrl); setLightboxZoom(1); setLightboxOffset({ x: 0, y: 0 }); setLightboxMessageId(msg.id); }}>
                                                              <img src={msg.imageUrl} alt="Attachment" className="w-full object-cover" />
                                                          </div>
                                                      ) : (
                                                          <div className="w-48 h-32 bg-zinc-800/80 backdrop-blur-md flex flex-col items-center justify-center p-3 text-center gap-1.5 rounded-[12px] border border-zinc-700/50">
                                                              <EyeOff className="w-5 h-5 text-zinc-400" />
                                                              <p className="text-[10px] text-zinc-300 font-bold">Image hidden (Data Saver)</p>
                                                              <button 
                                                                  type="button"
                                                                  onClick={(e) => {
                                                                      e.stopPropagation();
                                                                      setLoadedImages(prev => ({ ...prev, [`${msg.id}-single`]: true }));
                                                                  }}
                                                                  className="px-2.5 py-1 rounded-full bg-[#EF8020] text-white text-[9px] font-black uppercase hover:bg-[#EF8020]/90 transition"
                                                              >
                                                                  Load Image
                                                              </button>
                                                          </div>
                                                      )}
                                                  </div>
                                              );
                                          })()}
                                          
                                          {msg.text && (
                                             <div className={cn("px-3 pb-1.5 pt-1", isOnlyEmojis(msg.text) ? "p-0" : "")}>
                                                <p className={cn(
                                                    "leading-relaxed whitespace-pre-wrap break-words",
                                                    isOnlyEmojis(msg.text) ? "text-6xl ios-emoji" : "text-[14px]",
                                                    privacySettings.highContrastFonts && !isOnlyEmojis(msg.text)
                                                      ? "font-extrabold text-zinc-950 dark:text-white" 
                                                      : ""
                                                )}>
                                                    {renderTextWithLinks(msg.text, isMe)}
                                                </p>
                                                {!isOnlyEmojis(msg.text) && <LinkPreviewCard text={msg.text} isMe={isMe} />}
                                             </div>
                                          )}
                                         </div>
                                     </div>

                                     {/* Reactions Badge / Add Reaction */}
                                     <div 
                                         className={`absolute -bottom-2 ${isMe ? 'right-2' : 'right-2'} flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-300 dark:border-zinc-700 shadow-sm rounded-full px-2 py-0.5 z-10 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition cursor-pointer ${reactionEntries.length > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100'}`} 
                                         onClick={(e) => { e.stopPropagation(); setActiveMessageMenuId(msg.id); }}
                                     >
                                         {reactionEntries.length > 0 ? (
                                             <>
                                                 {Array.from(new Set(reactionEntries.map(([uid, emoji]) => emoji))).map((emoji: any, emIdx: number) => (
                                                     <span key={`dm-react-${emoji}-${emIdx}`} className="text-[12px]">{emoji}</span>
                                                 ))}
                                                 {reactionEntries.length > 1 && (
                                                     <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 self-center ml-0.5">{reactionEntries.length}</span>
                                                 )}
                                             </>
                                         ) : (
                                             <div className="flex items-center text-zinc-400 py-[2px]">
                                                <Plus className="w-3 h-3" />
                                             </div>
                                         )}
                                     </div>

                                     <span className={`text-[9px] font-semibold text-zinc-400 mx-1 block ${reactionEntries.length > 0 ? 'mt-3.5' : 'mt-1'}`}>
                                         {formatTime12h(msg.timestamp)}</span>{isMe && idx === messages.length - 1 && <div className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 uppercase tracking-wide select-none">{activeChat.seenBy && activeChat.seenBy.includes(activeChat.otherUser.id) ? "Seen" : (otherUserPresence?.isOnline ? "Delivered" : "Sent")}</div>}<span className="hidden">
                                     </span>
                                 </div>
                             </div>
                             </React.Fragment>
                         );
                     })}
                     {!hasReviewed && activeChat.otherUser?.id !== "system" && (!reviewDismissedAt || (Date.now() - reviewDismissedAt >= 24 * 60 * 60 * 1000)) && (messages.length >= 4 || (messages.length > 0 && (Date.now() - messages[messages.length - 1].timestamp) > 3600000)) && (
                       <div className="flex justify-center my-6">
                         <div 
                           className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-zinc-900/90 dark:to-zinc-950/90 border border-amber-200 dark:border-zinc-800 rounded-2xl p-4 max-w-sm w-full text-center shadow-md hover:shadow-lg transition cursor-pointer border-dashed relative" 
                           onClick={() => { setShowReviewModal(true); }}
                         >
                           <button 
                             type="button" 
                             onClick={(e) => {
                               e.stopPropagation();
                               const now = Date.now();
                               localStorage.setItem('dismissed_review_' + activeChat.id, now.toString());
                               setReviewDismissedAt(now);
                             }}
                             className="absolute top-2 right-2 p-1 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
                             title="Dismiss for 24h"
                           >
                             <X className="w-3.5 h-3.5" />
                           </button>
                           <div className="flex items-center justify-center gap-1.5 mb-2 text-amber-500">
                             <Star className="w-5 h-5 fill-amber-500 animate-bounce" />
                             <Star className="w-5 h-5 fill-amber-500 animate-bounce" />
                             <Star className="w-5 h-5 fill-amber-500 animate-bounce" />
                             <Star className="w-5 h-5 fill-amber-500 animate-bounce" />
                             <Star className="w-5 h-5 fill-amber-500 animate-bounce" />
                           </div>
                           <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-1">
                             <Sparkles className="w-4 h-4 text-amber-500" />
                             <span>Give a Review</span>
                           </h4>
                           <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed pr-4">
                             Rate your experience with <strong className="text-[#EF8020]">{activeChat.otherUser?.shopName || activeChat.otherUser?.displayName || "Verified Seller"}</strong>. It will be styled beautifully on their profile page!
                           </p>
                         </div>
                       </div>
                     )}
                     <div ref={messagesEndRef} />
                 </div>

                 {/* Input Area (Capsule design matching Image 3 & 4) */}
                 <div className="bg-white dark:bg-[#121214] border-t border-zinc-200/80 dark:border-zinc-800 px-3 sm:px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom,12px))] shrink-0 z-20 transition-all">
                     <AnimatePresence>
                         {replyingTo && (
                             <motion.div 
                                 initial={{ opacity: 0, y: 10 }} 
                                 animate={{ opacity: 1, y: 0 }} 
                                 exit={{ opacity: 0, y: 10 }} 
                                 className="mb-2 p-2.5 bg-zinc-50 dark:bg-zinc-850 border-l-[4px] border-emerald-500 rounded-r-xl flex items-center justify-between text-left"
                             >
                                 <div>
                                     <p className="text-[10px] font-bold text-[#EF8020]">Replying to</p>
                                     <p className="text-xs text-zinc-600 dark:text-zinc-300 truncate max-w-xs sm:max-w-md mt-0.5">{replyingTo.text}</p>
                                 </div>
                                 <button onClick={() => setReplyingTo(null)} className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition">
                                     <X className="w-4 h-4" />
                                 </button>
                             </motion.div>
                         )}
                     </AnimatePresence>
                     
                     <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" multiple />
                     <input type="file" ref={cameraInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" capture="environment" />

                     <ChatBottomBar
                       newMessage={newMessage}
                       setNewMessage={setNewMessage}
                       onSendMessage={() => handleSendMessage()}
                       isRecording={isRecording}
                       recordingDuration={recordingDuration}
                       startRecording={startRecording}
                       stopRecording={stopRecording}
                       cancelRecording={cancelRecording}
                       fileInputRef={fileInputRef}
                       cameraInputRef={cameraInputRef}
                       onOpenSavedReplies={() => setShowSavedRepliesModal(true)}
                       onOpenDraw={() => setShowDrawModal(true)}
                       onOpenGifs={() => setGifStickerModalState({ isOpen: true, type: "gif" })}
                       onOpenStickers={() => setGifStickerModalState({ isOpen: true, type: "sticker" })}
                       isBlocked={Boolean(activeChat.blockedBy?.length > 0 || isDMBlocked)}
                       blockedMessage={
                         activeChat.blockedBy?.includes(user?.uid)
                           ? "You blocked this user."
                           : activeChat.blockedBy?.length > 0
                           ? "You have been blocked."
                           : isDMBlocked
                           ? "This user privacy settings restrict direct messaging."
                           : undefined
                       }
                       isUploading={isUploadingAttachment}
                       previewUrls={previewUrls}
                       onRemovePreview={(idx) => {
                         setAttachments(prev => prev.filter((_, i) => i !== idx));
                         setPreviewUrls(prev => prev.filter((_, i) => i !== idx));
                       }}
                     />
                 </div>
             </>
         )}
      </div>

      {/* Full Screen Call UI Overlay */}
      <AnimatePresence>
        {isCalling && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            className="fixed inset-0 z-[999] bg-zinc-950 flex flex-col"
          >
            {/* Audio call view: prominent caller avatar + details */}
            {callType === 'audio' && (
              <div className="flex flex-col items-center justify-center flex-1 space-y-6">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-zinc-800 shadow-2xl">
                  <img src={activeChat?.otherUser?.photoURL || activeChat?.otherUser?.avatar || activeChat?.recipientAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback"} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold text-white">{getChatDisplayName(activeChat)}</h2>
                  <p className="text-zinc-400 font-medium">{callStatus === 'connecting' ? 'Connecting...' : callStatus === 'ringing' ? 'Ringing...' : 'Connected'}</p>
                  {callStatus === 'connected' && (
                    <p className="text-emerald-500 font-mono text-xl">{Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}</p>
                  )}
                </div>
              </div>
            )}

            {/* Video call view: full screen remote video with PIP local video and floating HUD */}
            {callType === 'video' && (
              <div className="relative flex-1 w-full h-full bg-black overflow-hidden flex items-center justify-center">
                {/* Remote Video Stream */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Floating Top Header on Video */}
                <div className="absolute top-6 left-6 z-20 bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-white flex items-center gap-3 shadow-lg">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                    <img src={activeChat?.otherUser?.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback"} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{getChatDisplayName(activeChat)}</h3>
                    <p className="text-[11px] text-emerald-400 font-medium font-mono">
                      {callStatus === 'connected' ? `${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, '0')}` : (callStatus === 'ringing' ? 'Ringing...' : 'Connecting...')}
                    </p>
                  </div>
                </div>

                {/* Local Video Stream Picture-in-Picture */}
                <div className="absolute bottom-28 right-5 w-28 h-40 sm:w-36 sm:h-52 bg-zinc-900 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl z-20">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1.5 left-2 text-[10px] font-bold text-white/90 bg-black/60 px-2 py-0.5 rounded-md">You</span>
                </div>
              </div>
            )}

            {/* Audio element for remote audio */}
            <audio ref={remoteAudioRef} autoPlay playsInline className="sr-only" />

            {/* Controls */}
            <div className="p-8 bg-gradient-to-t from-black via-black/90 to-transparent flex justify-center items-center gap-8 pb-12 z-30">
                <button type="button" onClick={() => setIsMuted(!isMuted)} className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors cursor-pointer ${isMuted ? 'bg-zinc-800 text-rose-500' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}>
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <button type="button" onClick={() => endCall()} className="w-20 h-20 rounded-full bg-rose-600 hover:bg-rose-700 flex items-center justify-center transition-transform hover:scale-105 shadow-lg shadow-rose-600/30 text-white cursor-pointer">
                    <PhoneOff className="w-8 h-8 text-white" />
                </button>
                <button type="button" onClick={() => setIsSpeaker(!isSpeaker)} className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors cursor-pointer ${isSpeaker ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}>
                    <Volume2 className="w-6 h-6" />
                </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Options Modal */}
      <AnimatePresence>
        {activeMessageMenuId !== null && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4" onClick={() => setActiveMessageMenuId(null)}>
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Message Options</h3>
                <button onClick={() => setActiveMessageMenuId(null)} className="p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                {showAllReactions ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-zinc-500">React with...</span>
                        <button onClick={() => setShowAllReactions(false)} className="text-xs text-[#4E4AEB] font-bold">Back</button>
                    </div>
                    <div className="grid grid-cols-6 gap-2 max-h-[140px] overflow-y-auto no-scrollbar py-1">
                      {ALL_EMOJIS.map(emoji => (
                        <button 
                          key={emoji} 
                          onClick={() => {
                            if (activeChannel) {
                              handleReactToChannelMessage(activeMessageMenuId, emoji);
                            } else {
                              handleReactToMessage(activeMessageMenuId, emoji);
                            }
                            setShowAllReactions(false);
                            setActiveMessageMenuId(null);
                          }} 
                          className="hover:scale-125 transition-transform text-2xl p-1"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    {['👍', '❤️', '😂', '🥰', '😡'].map(emoji => (
                        <button 
                            key={emoji} 
                            onClick={() => {
                              if (activeChannel) {
                                handleReactToChannelMessage(activeMessageMenuId, emoji);
                              } else {
                                handleReactToMessage(activeMessageMenuId, emoji);
                              }
                              setActiveMessageMenuId(null);
                            }} 
                            className="hover:scale-125 transition-transform text-3xl duration-150"
                        >
                            {emoji}
                        </button>
                    ))}
                    <button 
                      onClick={() => setShowAllReactions(true)}
                      className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
              
              {/* Menu Actions */}
              <div className="flex flex-col p-2 border-b border-zinc-200 dark:border-zinc-800">
                  <button 
                      onClick={() => {
                          const msg = activeChannel 
                            ? channelMessages.find(m => m.id === activeMessageMenuId)
                            : messages.find(m => m.id === activeMessageMenuId);
                          if (msg) setReplyingTo({ id: msg.id, text: msg.text || "Image attachment", senderId: msg.senderId });
                          setActiveMessageMenuId(null);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-2xl transition font-semibold text-[15px]"
                  >
                      <CornerUpLeft className="w-5 h-5 text-zinc-500" />
                      Reply
                  </button>

                  <button 
                      onClick={() => {
                          const msg = activeChannel 
                            ? channelMessages.find(m => m.id === activeMessageMenuId)
                            : messages.find(m => m.id === activeMessageMenuId);
                          if (msg) {
                              setForwardingMessage(msg);
                              setShowForwardModal(true);
                          }
                          setActiveMessageMenuId(null);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-2xl transition font-semibold text-[15px]"
                  >
                      <Forward className="w-5 h-5 text-zinc-500" />
                      Forward
                  </button>

                  {/* Copy Text Option */}
                  {(() => {
                      const msg = activeChannel 
                        ? channelMessages.find(m => m.id === activeMessageMenuId)
                        : messages.find(m => m.id === activeMessageMenuId);
                      if (msg && msg.text) {
                          return (
                              <button 
                                  onClick={() => {
                                      navigator.clipboard.writeText(msg.text);
                                      notify("Copied to clipboard", "success");
                                      setActiveMessageMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-2xl transition font-semibold text-[15px]"
                              >
                                  <Copy className="w-5 h-5 text-zinc-500" />
                                  Copy Text
                              </button>
                          );
                      }
                      return null;
                  })()}

                  {/* Pin Option (Channel Admin / Owner only for channel, both for P2P) */}
                  {(() => {
                      const msg = activeChannel 
                        ? channelMessages.find(m => m.id === activeMessageMenuId)
                        : messages.find(m => m.id === activeMessageMenuId);
                      const isChannelAdmin = activeChannel && (userRole === 'admin' || userRole === 'owner' || activeChannel.creatorId === user?.uid);
                      const isP2PChat = !activeChannel;
                      
                      if (msg && (isChannelAdmin || isP2PChat)) {
                          return (
                              <button 
                                  onClick={() => {
                                      if (activeChannel) {
                                          handlePinMessage(msg);
                                      } else {
                                          handlePinMessageP2P(msg);
                                      }
                                      setActiveMessageMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-2xl transition font-semibold text-[15px]"
                              >
                                  <Pin className="w-5 h-5 text-zinc-500" />
                                  {((activeChannel?.pinnedMessages || []).some((p: any) => p.id === msg.id) || activeChannel?.pinnedMessage?.id === msg.id) ? "Unpin Message" : "Pin Message"}
                              </button>
                          );
                      }
                      return null;
                  })()}

                  {/* Delete Option */}
                  {(() => {
                      const msg = activeChannel 
                        ? channelMessages.find(m => m.id === activeMessageMenuId)
                        : messages.find(m => m.id === activeMessageMenuId);
                      const isMsgSender = msg && msg.senderId === user?.uid;
                      const isChannelAdmin = activeChannel && (userRole === 'admin' || userRole === 'owner' || activeChannel.creatorId === user?.uid);
                      
                      if (msg && (isMsgSender || isChannelAdmin)) {
                          return (
                              <button 
                                  onClick={() => {
                                      setDeleteMessageId(msg.id);
                                      setActiveMessageMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-2xl transition text-rose-600 font-semibold text-[15px]"
                              >
                                  <Trash2 className="w-5 h-5" />
                                  Delete Message
                              </button>
                          );
                      }
                      return null;
                  })()}
              </div>

              {/* Reactions Breakdown Panel with Strict Privacy */}
              {(() => {
                  const msg = activeChannel 
                    ? channelMessages.find(m => m.id === activeMessageMenuId)
                    : messages.find(m => m.id === activeMessageMenuId);
                  if (!msg || !msg.reactions || Object.keys(msg.reactions).length === 0) return null;
                  
                  const rEntries = Object.entries(msg.reactions);
                  const isChannelAdmin = activeChannel && (userRole === 'admin' || userRole === 'owner' || activeChannel.creatorId === user?.uid);
                  const isP2P = !activeChannel;
                  const showDetailedUserIds = isP2P || isChannelAdmin;

                  // Group by emoji
                  const groupedReactions = {};
                  rEntries.forEach(([uid, emoji]) => {
                      groupedReactions[emoji] = (groupedReactions[emoji] || 0) + 1;
                  });

                  return (
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-950 text-xs">
                          <p className="font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2.5">Reactions Summary</p>
                          
                          {/* Emoji counts badges */}
                          <div className="flex flex-wrap gap-2 mb-3">
                              {Object.entries(groupedReactions).map(([emoji, count]) => (
                                  <span key={emoji} className="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 rounded-full font-bold">
                                      <span>{emoji}</span>
                                      <span className="text-zinc-500">{count}</span>
                                  </span>
                              ))}
                          </div>

                          {/* Detail view based on user permission level */}
                          {showDetailedUserIds ? (
                              <div className="space-y-1.5 max-h-[120px] overflow-y-auto no-scrollbar">
                                  {rEntries.map(([uid, emoji], rIdx) => (
                                      <div key={`${uid}-${rIdx}`} className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 font-medium">
                                          <span className="truncate">User ID: {uid === user?.uid ? "You" : uid}</span>
                                          <span className="text-sm font-bold">{emoji}</span>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <p className="text-zinc-400 dark:text-zinc-500 italic mt-1">
                                  Individual reaction details are restricted to channel administrators for privacy.
                              </p>
                          )}
                      </div>
                  );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Dialog Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-[10000] bg-white dark:bg-zinc-950 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              className="bg-white dark:bg-zinc-950 min-h-screen w-full flex flex-col max-w-lg mx-auto p-6 font-inter"
            >
              <button 
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-amber-500 mb-3 animate-pulse">
                  <Star className="w-8 h-8 fill-amber-500" />
                </div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                  Leave a Review
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  How was your experience trading or chatting with {activeChat?.otherUser?.shopName || activeChat?.otherUser?.displayName || "Verified Seller"}?
                </p>
              </div>

              {/* Star Selection */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 hover:scale-110 active:scale-95 transition"
                  >
                    <Star 
                      className={`w-10 h-10 ${
                        star <= reviewRating ? "text-amber-500 fill-amber-500" : "text-zinc-300 dark:text-zinc-700"
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Comment Text */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  Review Text (Optional)
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Tell us more about the trade, behavior, response time..."
                  rows={4}
                  className="w-full text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 outline-none focus:ring-2 ring-emerald-500/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-none"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-2xl font-bold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingReview}
                  onClick={handleSubmitReview}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-zinc-900 dark:text-white rounded-2xl font-bold text-sm transition-all shadow-md shadow-emerald-600/10 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-55"
                >
                  {isSubmittingReview ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Submit Review</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Create Community Channel Modal --- */}
      <AnimatePresence>
        {showCreateChannelModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateChannelModal(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="w-full max-w-md bg-white dark:bg-[#111111] rounded-3xl overflow-hidden relative z-10 font-inter shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#111111]/80 backdrop-blur-md z-20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-none mb-1">
                          {isEditingChannel ? 'Edit Channel' : 'New Channel'}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Broadcast your updates</p>
                    </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowCreateChannelModal(false)}
                  className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5">
                {/* Cover Image Upload (Stylish) */}
                <div className="flex flex-col items-center justify-center">
                  <div 
                      onClick={() => { const el = document.getElementById('channel-img-upload'); if(el) el.click(); }}
                      className="w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-emerald-500/50 flex items-center justify-center cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition group relative bg-zinc-50 dark:bg-zinc-900"
                  >
                      {chanImagePreview ? (
                          <img src={chanImagePreview} alt="Preview" className="w-full h-full object-cover group-hover:opacity-50 transition" />
                      ) : (
                          <ImageIcon className="w-8 h-8 text-emerald-500/50 group-hover:text-emerald-500 transition" />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="w-6 h-6 text-white" />
                      </div>
                  </div>
                  <input
                    id="channel-img-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setChanImageFile(e.target.files[0]);
                        setChanImagePreview(URL.createObjectURL(e.target.files[0]));
                      }
                    }}
                    className="hidden"
                  />
                  <p className="text-xs text-zinc-500 font-medium mt-3">Upload Cover Image</p>
                </div>

                <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">
                        Channel Name
                      </label>
                      <input
                        type="text"
                        value={chanName}
                        onChange={(e) => setChanName(e.target.value)}
                        placeholder="e.g. Vintage Gadgets Elite"
                        className="w-full text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 rounded-2xl px-4 py-3 outline-none focus:ring-2 ring-emerald-500/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">
                        Handle (Unique)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-[14px] text-zinc-400 text-sm font-bold">@</span>
                        <input
                          type="text"
                          value={chanLink}
                          onChange={(e) => setChanLink(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          placeholder="vintage_elite"
                          className="w-full text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 rounded-2xl pl-8 pr-4 py-3 outline-none focus:ring-2 ring-emerald-500/50 text-zinc-900 dark:text-zinc-100 font-semibold placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">
                        Description
                      </label>
                      <textarea
                        value={chanDesc}
                        onChange={(e) => setChanDesc(e.target.value)}
                        placeholder="What is this channel about?"
                        rows={2}
                        className="w-full text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 rounded-2xl px-4 py-3 outline-none focus:ring-2 ring-emerald-500/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none transition-all"
                      />
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
                      <div className="space-y-1 max-w-[75%]">
                        <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          Private Channel
                        </label>
                        <p className="text-[11px] text-zinc-500 leading-tight">
                          Hide from Community tab. Users can only join via link.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setChanIsPrivate(!chanIsPrivate)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${chanIsPrivate ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${chanIsPrivate ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>
                </div>
              </div>

              <div className="p-6 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/50 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateChannelModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white font-bold transition hover:bg-zinc-50 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCommunityChannel}
                  disabled={isCreatingChannel || !chanName.trim() || !chanLink.trim()}
                  className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex justify-center items-center gap-2"
                >
                  {isCreatingChannel ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                      <>{isEditingChannel ? 'Save' : 'Create'}</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Profile Modal (Design Image 1: IMG_3977.png) */}
      <ChatUserProfileModal
        key={activeChat?.otherUser?.id || activeChat?.id || 'chat_user_profile'}
        isOpen={showUserInfoModal}
        onClose={() => setShowUserInfoModal(false)}
        activeChat={activeChat}
        currentUser={user}
        activeThemeName={activeTheme.name}
        onOpenThemeModal={() => setShowThemeModal(true)}
        onStartSearch={() => setShowP2pSearch(true)}
        onBlockUser={async () => {
          if (!activeChat || !user) return;
          const isBlocked = activeChat.blockedBy?.includes(user.uid);
          try {
            if (isBlocked) {
              await updateDoc(doc(db, "p2p_chats", activeChat.id), {
                blockedBy: activeChat.blockedBy.filter((id: string) => id !== user.uid),
              });
              notify("User unblocked", "success");
            } else {
              const currentBlocked = activeChat.blockedBy || [];
              await updateDoc(doc(db, "p2p_chats", activeChat.id), {
                blockedBy: [...currentBlocked, user.uid],
              });
              notify("User blocked", "info");
            }
          } catch (e) {
            console.error(e);
            notify("Failed to update block status", "error");
          }
        }}
        isBlocked={Boolean(activeChat?.blockedBy?.includes(user?.uid))}
        onSetAutoDelete={(duration) => {
          if (!activeChat) return;
          if (duration) {
            updateDoc(doc(db, "p2p_chats", activeChat.id), {
              autoDeleteTimer: { duration, enabledAt: serverTimestamp() },
            }).catch(console.error);
            notify("Disappearing messages enabled", "success");
          } else {
            updateDoc(doc(db, "p2p_chats", activeChat.id), {
              autoDeleteTimer: null,
            }).catch(console.error);
            notify("Disappearing messages turned off", "info");
          }
        }}
        currentAutoDeleteDuration={activeChat?.autoDeleteTimer?.duration || null}
        onOpenGroupModal={() => setShowCreateGroupModal(true)}
        notify={notify}
      />

      {/* Saved Replies Modal (Design Images 5 & 6: IMG_3981.png & IMG_3983.png) */}
      <SavedRepliesModal
        isOpen={showSavedRepliesModal}
        onClose={() => setShowSavedRepliesModal(false)}
        onSelectReply={handleSelectSavedReply}
        notify={notify}
      />

      {/* Draw Modal */}
      <ChatDrawModal
        isOpen={showDrawModal}
        onClose={() => setShowDrawModal(false)}
        onSendDrawing={(dataUrl) => handleSendDirectMedia(dataUrl, false)}
      />

      {/* GIF & Sticker Modal */}
      <ChatGifStickerModal
        isOpen={gifStickerModalState.isOpen}
        onClose={() => setGifStickerModalState(prev => ({ ...prev, isOpen: false }))}
        initialTab={gifStickerModalState.type}
        onSelectGif={(url) => handleSendDirectMedia(url, false)}
        onSelectSticker={(url) => handleSendDirectMedia(url, true)}
      />

      {/* Theme Modal */}
      <ChatThemeModal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        activeThemeId={activeTheme.id}
        onSelectTheme={handleSelectTheme}
      />

      {/* Group Details Modal */}
      <GroupDetailsModal
        isOpen={showGroupDetailsModal}
        onClose={() => setShowGroupDetailsModal(false)}
        activeChat={activeChat}
        currentUser={user}
        messages={messages}
        activeThemeName={activeTheme.name}
        onOpenThemeModal={() => setShowThemeModal(true)}
        onJumpToMessage={(msgId) => {
          const el = document.getElementById(`msg-${msgId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("ring-2", "ring-indigo-500");
            setTimeout(() => el.classList.remove("ring-2", "ring-indigo-500"), 2500);
          }
        }}
        onSelectUserForDirectChat={(selectedUser) => {
          setSearchParams({ chatId: selectedUser.id }, { replace: true });
        }}
        onChatDeletedOrLeft={() => {
          setSearchParams({}, { replace: true });
        }}
        notify={notify}
      />

      {/* --- Privacy & Chat Settings Modal --- */}
      <AnimatePresence>
        {showPrivacySettingsModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPrivacySettingsModal(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="w-full max-w-md bg-white dark:bg-[#111111] rounded-3xl overflow-hidden relative z-10 font-inter shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#111111]/80 backdrop-blur-md z-20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-none mb-1">
                          Privacy & Settings
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Manage your communication</p>
                    </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowPrivacySettingsModal(false)}
                  className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5">
                <div className="space-y-3">
                    <h4 className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1">
                        Direct Messages
                    </h4>
                    
                    <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
                      <div className="space-y-1 max-w-[75%]">
                        <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          Allow Direct Messages
                        </label>
                        <p className="text-[11px] text-zinc-500 leading-tight">
                          Anyone can send you a message. If turned off, users will see a privacy notice.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                            const newStatus = !privacySettings.allowDirectMessages;
                            setPrivacySettings({ ...privacySettings, allowDirectMessages: newStatus });
                            if (user) await updateDoc(doc(db, 'users', user.uid), { 'privacy.allowDirectMessages': newStatus });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.allowDirectMessages ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.allowDirectMessages ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
                      <div className="space-y-1 max-w-[75%]">
                        <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          Online Status
                        </label>
                        <p className="text-[11px] text-zinc-500 leading-tight">
                          Show others when you are online in chats.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                            const newStatus = !privacySettings.showOnlineStatus;
                            setPrivacySettings({ ...privacySettings, showOnlineStatus: newStatus });
                            if (user) await updateDoc(doc(db, 'users', user.uid), { 'privacy.showOnlineStatus': newStatus });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.showOnlineStatus ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.showOnlineStatus ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between opacity-50 cursor-not-allowed">
                      <div className="space-y-1 max-w-[75%]">
                        <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          Read Receipts
                        </label>
                        <p className="text-[11px] text-zinc-500 leading-tight">
                          Let others know when you've read their messages. (Coming Soon)
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled
                        className="relative inline-flex h-6 w-11 shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-indigo-500 transition-colors duration-200 ease-in-out"
                      >
                        <span className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-5" />
                      </button>
                    </div>
                </div>

                <div className="space-y-3 pt-2">
                    <h4 className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1">
                        Notifications
                    </h4>
                    
                    <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
                      <div className="space-y-1 max-w-[75%]">
                        <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          Push Notifications
                        </label>
                        <p className="text-[11px] text-zinc-500 leading-tight">
                          Receive alerts for new messages and calls.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                            const newStatus = !privacySettings.pushNotifications;
                            setPrivacySettings({ ...privacySettings, pushNotifications: newStatus });
                            if (user) await updateDoc(doc(db, 'users', user.uid), { 'privacy.pushNotifications': newStatus });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.pushNotifications ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.pushNotifications ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>
                </div>
              </div>

              <div className="p-6 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/50">
                <button
                  type="button"
                  onClick={() => setShowPrivacySettingsModal(false)}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/20 transition flex justify-center items-center"
                >
                  Close Settings
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForwardModal && forwardingMessage && (
          <div className="fixed inset-0 z-[10000] bg-white dark:bg-zinc-950 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              className="bg-white dark:bg-zinc-950 min-h-screen w-full flex flex-col max-w-lg mx-auto p-6 font-inter"
            >
              <button 
                type="button"
                onClick={() => { setShowForwardModal(false); setForwardingMessage(null); }}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4">
                <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Forward className="w-5 h-5 text-[#EF8020]" />
                  <span>Forward Message</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Select a private chat or subscribed community channel to share this content.
                </p>
              </div>

              {/* Preview forwarding content */}
              <div className="p-3 bg-zinc-50 dark:bg-white dark:bg-zinc-200 dark:bg-zinc-800/50 shadow-sm dark:shadow-none rounded-xl mb-4 border border-zinc-100 dark:border-zinc-800/80 text-xs">
                <p className="font-extrabold text-[#EF8020] mb-1">Previewing Content:</p>
                {forwardingMessage.imageUrl && (
                  <img src={forwardingMessage.imageUrl} alt="Forward attachment" className="w-16 h-16 object-cover rounded-lg mb-1" />
                )}
                <p className="text-zinc-600 dark:text-zinc-300 italic truncate">"{forwardingMessage.text || 'Image Attachment'}"</p>
              </div>

              {/* Destination list */}
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {/* List Community channels */}
                {channels.length > 0 && (
                  <div>
                    <h5 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">Subscribed Communities</h5>
                    <div className="space-y-1">
                      {channels.map(ch => (
                        <button
                          key={ch.id}
                          onClick={() => handleSendForward(ch, true)}
                          className="w-full flex items-center gap-3 p-2 rounded-xl bg-zinc-50 hover:bg-emerald-50 dark:bg-zinc-200 dark:bg-zinc-800/30 dark:hover:bg-zinc-200 dark:bg-zinc-800 transition text-left"
                        >
                          <img src={ch.imageUrl} alt="Channel img" className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-300 dark:border-zinc-700" />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs text-zinc-800 dark:text-zinc-200 truncate">{ch.name}</p>
                            <p className="text-[10px] text-zinc-400 truncate">@{ch.customLink}</p>
                          </div>
                          <Forward className="w-3.5 h-3.5 text-zinc-400 mr-2 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* List direct messages */}
                {chats.length > 0 && (
                  <div className="mt-4">
                    <h5 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">Private Direct Chats</h5>
                    <div className="space-y-1">
                      {chats.map((c, idx) => (
                        <button
                          key={`fwd-chat-${c.id || idx}-${idx}`}
                          onClick={() => handleSendForward(c, false)}
                          className="w-full flex items-center gap-3 p-2 rounded-xl bg-zinc-50 hover:bg-emerald-50 dark:bg-zinc-200 dark:bg-zinc-800/30 dark:hover:bg-zinc-200 dark:bg-zinc-800 transition text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-300 dark:border-zinc-700 text-xs font-bold text-emerald-700">
                            {c.otherUser?.photoURL ? (
                              <img src={c.otherUser.photoURL} alt="User img" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              (c.otherUser?.displayName || 'U')[0].toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs text-zinc-800 dark:text-zinc-200 truncate">
                              {c.otherUser?.shopName || c.otherUser?.displayName || 'Chat'}
                            </p>
                          </div>
                          <Forward className="w-3.5 h-3.5 text-zinc-400 mr-2 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    
      {/* Delete Message Bottom Sheet */}
      <AnimatePresence>
        {deleteMessageId && (() => {
          const msg = activeChannel ? channelMessages.find(m => m.id === deleteMessageId) : messages.find(m => m.id === deleteMessageId);
          const isOwnMessage = msg?.senderId === user?.uid;
          return (
            <div className="fixed inset-0 z-[10000] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl font-inter flex flex-col"
              >
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-center font-bold text-zinc-900 dark:text-white">Delete Message</h3>
                </div>
                <div className="p-4 space-y-2">
                  <button
                    onClick={async () => {
                      if(!user || (!activeChat && !activeChannel)) return;
                      try {
                        let colRef;
                        if (activeChannel) {
                          colRef = collection(db, 'community_channels', activeChannel.id, 'messages');
                        } else {
                          colRef = collection(db, 'p2p_chats', activeChat.id, 'messages');
                        }
                        await updateDoc(doc(colRef, deleteMessageId), {
                          deletedFor: arrayUnion(user.uid)
                        });
                      } catch(e) {
                        console.error(e);
                      }
                      setDeleteMessageId(null);
                    }}
                    className="w-full py-4 text-center font-bold text-[15px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-2xl transition"
                  >
                    Delete for me
                  </button>
                  {isOwnMessage && (
                    <button
                      onClick={async () => {
                        if(!user || (!activeChat && !activeChannel)) return;
                        try {
                          let colRef;
                          if (activeChannel) {
                            colRef = collection(db, 'community_channels', activeChannel.id, 'messages');
                          } else {
                            colRef = collection(db, 'p2p_chats', activeChat.id, 'messages');
                          }
                          await updateDoc(doc(colRef, deleteMessageId), {
                            isDeletedForEveryone: true
                          });
                        } catch(e) {
                          console.error(e);
                        }
                        setDeleteMessageId(null);
                      }}
                      className="w-full py-4 text-center font-bold text-[15px] bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-500 rounded-2xl transition"
                    >
                      Delete for everyone
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteMessageId(null)}
                    className="w-full py-4 mt-2 text-center font-bold text-[15px] text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Wallpaper Selection Modal */}
      <AnimatePresence>
        {showWallpaperModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl font-inter flex flex-col relative border border-zinc-200 dark:border-zinc-800"
            >
              <div className="p-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[#EF8020]" />
                  <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">Change Chat Wallpaper</h3>
                </div>
                <button onClick={() => setShowWallpaperModal(false)} className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
                {/* Preset gradients / colors */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Preset Wallpapers</p>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { name: 'Warm sunset', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80' },
                      { name: 'Cosmic night', url: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=600&q=80' },
                      { name: 'Forest haze', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80' },
                      { name: 'Sakura blossom', url: 'https://images.unsplash.com/photo-1522441815192-d9f04eb0615c?auto=format&fit=crop&w=600&q=80' },
                      { name: 'Teal gradient', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=600&q=80' },
                      { name: 'Aesthetic minimal', url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=600&q=80' },
                      { name: 'Deep space', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80' },
                      { name: 'Modern abstract', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=80' }
                    ].map((wp) => (
                      <button
                        key={wp.name}
                        onClick={() => {
                          if (activeChat) {
                            localStorage.setItem('chat_wallpaper_' + activeChat.id, wp.url);
                            setChatWallpaper(wp.url);
                            notify(`Wallpaper set to ${wp.name}`, 'success');
                            setShowWallpaperModal(false);
                          }
                        }}
                        className="group relative h-16 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-sm transition hover:scale-105 active:scale-95"
                      >
                        <img src={wp.url} alt={wp.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom URL input */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Custom Image URL</p>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const urlInput = (e.currentTarget.elements.namedItem('urlInput') as HTMLInputElement).value;
                    if (urlInput && activeChat) {
                      localStorage.setItem('chat_wallpaper_' + activeChat.id, urlInput);
                      setChatWallpaper(urlInput);
                      notify('Custom wallpaper applied', 'success');
                      setShowWallpaperModal(false);
                    }
                  }} className="flex gap-2">
                    <input
                      name="urlInput"
                      type="url"
                      placeholder="Paste image address (https://...)"
                      className="flex-1 px-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 ring-[#EF8020] text-zinc-800 dark:text-zinc-200"
                    />
                    <button type="submit" className="px-4 py-2 bg-[#EF8020] text-white text-xs font-bold rounded-xl hover:bg-[#d87018] transition-colors">
                      Apply
                    </button>
                  </form>
                </div>

                {/* Remove option */}
                {chatWallpaper && (
                  <button
                    onClick={() => {
                      if (activeChat) {
                        localStorage.removeItem('chat_wallpaper_' + activeChat.id);
                        setChatWallpaper(null);
                        notify('Wallpaper removed', 'info');
                        setShowWallpaperModal(false);
                      }
                    }}
                    className="w-full py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30 text-red-600 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    <Trash className="w-4 h-4" />
                    <span>Reset to Default Wallpaper</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Call Disabled Warning Modal */}
      <AnimatePresence>
        {disabledCallUser && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1C1C1D] w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl font-inter flex flex-col p-6 border border-zinc-100 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center text-orange-500">
                    <Icon name="phone-off" className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-[16px] text-zinc-900 dark:text-zinc-100">Call Unavailable</h3>
                </div>
                <button onClick={() => setDisabledCallUser(null)} className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>
              <div className="mb-6">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{disabledCallUser.displayName || "This user"}</span> has disabled incoming calls. You cannot call or connect with them at this time.
                </p>
              </div>
              <button 
                onClick={() => setDisabledCallUser(null)} 
                className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold rounded-xl shadow-md transition-all duration-200"
              >
                Understood
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auto Delete Modal */}
      <AnimatePresence>
        {showAutoDeleteModal && (
          <div className="fixed inset-0 z-[10000] bg-white dark:bg-zinc-950 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1C1C1D] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl font-inter flex flex-col relative"
            >
              <div className="p-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">Auto-Delete</h3>
                <button onClick={() => setShowAutoDeleteModal(false)} className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-200 dark:bg-zinc-800 transition">
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>
              <div className="p-4 space-y-2">
                <p className="text-sm text-zinc-500 mb-4">Set a timer for new messages. Messages will be automatically deleted after the selected duration.</p>
                {[ 
                  { label: "1 Day", val: 86400000 }, 
                  { label: "1 Week", val: 604800000 }, 
                  { label: "1 Month", val: 2592000000 } 
                ].map((t) => (
                    <button
                      key={t.label}
                      onClick={async () => {
                        if(activeChat) {
                            try {
                                await updateDoc(doc(db, 'p2p_chats', activeChat.id), {
                                    autoDeleteTimer: { duration: t.val, setAt: Date.now() }
                                });
                                setShowAutoDeleteModal(false);
                            } catch(e) {}
                        }
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 bg-zinc-100 dark:bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-xl transition"
                    >
                      <span className="font-bold">{t.label}</span>
                      {activeChat?.autoDeleteTimer?.duration === t.val && <Icon name="check-double" className="w-5 h-5 text-emerald-500" />}
                    </button>
                ))}
                {activeChat?.autoDeleteTimer && (
                    <button
                      onClick={async () => {
                        try {
                            await updateDoc(doc(db, 'p2p_chats', activeChat.id), {
                                autoDeleteTimer: null
                            });
                            setShowAutoDeleteModal(false);
                        } catch(e) {}
                      }}
                      className="w-full mt-4 py-3 text-center font-bold text-[15px] bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-500 rounded-xl transition"
                    >
                      Turn Off
                    </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear Chat Modal */}
      <AnimatePresence>
        {showClearChatModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1C1C1D] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl font-inter flex flex-col relative border border-zinc-200/50 dark:border-zinc-800/50"
            >
              <div className="p-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">Clear Chat</h3>
                <button onClick={() => setShowClearChatModal(false)} className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-200 dark:bg-zinc-800 transition">
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Are you sure you want to clear the conversation? This action cannot be undone.
                </p>
                
                <label className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition select-none border border-zinc-200/50 dark:border-zinc-800/50">
                  <input
                    type="checkbox"
                    checked={clearChatDeleteForOther}
                    onChange={(e) => setClearChatDeleteForOther(e.target.checked)}
                    className="w-4.5 h-4.5 rounded text-rose-500 border-zinc-300 dark:border-zinc-700 focus:ring-rose-500"
                  />
                  <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Also delete from {activeChat?.otherUser?.shopName || activeChat?.otherUser?.displayName || "user"}
                  </span>
                </label>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button
                    onClick={() => setShowClearChatModal(false)}
                    className="py-3 font-bold text-[14px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isClearingChat}
                    onClick={async () => {
                      if (!activeChat || !user) return;
                      setIsClearingChat(true);
                      try {
                        const chatId = activeChat.id;
                        if (clearChatDeleteForOther) {
                          // Complete delete of chat and messages for both sides
                          // 1. Delete all messages
                          const msgSnap = await getDocs(collection(db, 'p2p_chats', chatId, 'messages'));
                          const batch = writeBatch(db);
                          msgSnap.docs.forEach(d => batch.delete(d.ref));
                          await batch.commit();

                          // 2. Delete chat doc
                          await deleteDoc(doc(db, 'p2p_chats', chatId));
                          
                          // 3. Clear parameters to go back
                          setSearchParams({});
                          notify("Chat deleted for both sides", "success");
                        } else {
                          // Clear messages for me only
                          const msgSnap = await getDocs(collection(db, 'p2p_chats', chatId, 'messages'));
                          const batch = writeBatch(db);
                          msgSnap.docs.forEach(d => {
                            const data = d.data();
                            const currentDeletedFor = data.deletedFor || [];
                            if (!currentDeletedFor.includes(user.uid)) {
                              batch.update(d.ref, {
                                deletedFor: arrayUnion(user.uid)
                              });
                            }
                          });
                          await batch.commit();
                          notify("Conversation cleared for you", "success");
                        }
                        setShowClearChatModal(false);
                      } catch (err) {
                        console.error("Error clearing chat:", err);
                        notify("Failed to clear chat", "error");
                      } finally {
                        setIsClearingChat(false);
                      }
                    }}
                    className={`py-3 font-bold text-[14px] rounded-xl transition text-white ${
                      isClearingChat 
                        ? 'bg-rose-400 dark:bg-rose-600/50 cursor-not-allowed' 
                        : 'bg-rose-500 hover:bg-rose-600 active:scale-95'
                    }`}
                  >
                    {isClearingChat ? "Clearing..." : "Clear Chat"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Live Audio Call Modal */}
      <AnimatePresence>
        {showLiveCallModal && activeLiveCall && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-zinc-950/95 backdrop-blur-md animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-zinc-950 w-full h-[100dvh] shadow-2xl p-6 font-inter text-white flex flex-col relative overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <h3 className="font-extrabold text-xs tracking-wider uppercase text-zinc-300">Live Voice Chat</h3>
                </div>
                <button 
                  onClick={() => setShowLiveCallModal(false)}
                  className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Host/Channel cover banner */}
              <div className="flex flex-col items-center justify-center text-center py-5 shrink-0 border-b border-zinc-800/40">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-500/30 bg-zinc-800 shadow-md mb-2">
                  <img src={activeChannel?.imageUrl} alt="Channel Cover" className="w-full h-full object-cover" />
                </div>
                <h4 className="font-bold text-base truncate max-w-[240px]">{activeLiveCall.title}</h4>
                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Host: {activeLiveCall.hostName}</p>
                
                {/* Direct Link Share Code */}
                <div className="mt-3 bg-zinc-950/60 rounded-xl px-2.5 py-1.5 border border-zinc-800 flex items-center justify-between gap-2 max-w-[240px] w-full">
                  <span className="text-[9px] font-mono text-zinc-400 truncate select-all">{`${window.location.origin}/messages?channelId=${activeChannel?.id}&joinLive=true`}</span>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await navigator.clipboard.writeText(`${window.location.origin}/messages?channelId=${activeChannel?.id}&joinLive=true`);
                        notify("Live link copied to clipboard!", "success");
                      } catch(err) {}
                    }}
                    className="text-[9px] font-black uppercase text-emerald-400 hover:text-emerald-300 shrink-0"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Participants list */}
              <div className="flex-1 overflow-y-auto py-3 space-y-2 no-scrollbar">
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">Tuned In ({liveParticipants.length})</p>
                {liveParticipants.length === 0 ? (
                  <div className="text-center py-6 text-zinc-600 text-xs font-semibold">Connecting...</div>
                ) : (
                  liveParticipants.map((p) => {
                    const isCurrentUserHost = activeLiveCall.hostId === user?.uid;
                    const isParticipantHost = p.isHost;
                    
                    return (
                      <div key={p.id || idx} className="flex items-center justify-between bg-zinc-950/20 border border-zinc-800/30 p-2.5 rounded-xl">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-800 shrink-0 border border-zinc-700">
                            {p.photoURL ? (
                              <img src={p.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-emerald-500/10 text-emerald-400">
                                {(p.displayName || "U")[0].toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs truncate flex items-center gap-1">
                              <span>{p.displayName || "Anonymous"}</span>
                              {p.isHost && <span className="bg-emerald-500 text-zinc-950 text-[7px] font-black px-1 rounded uppercase shrink-0">Host</span>}
                            </p>
                          </div>
                        </div>

                        {/* Host controls */}
                        <div className="flex items-center gap-1 shrink-0">
                          {isCurrentUserHost && !isParticipantHost ? (
                            <>
                              <button
                                onClick={() => handleToggleMuteParticipant(p.uid, p.muted)}
                                className={`p-1 rounded-lg text-xs font-bold transition ${p.muted ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20" : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"}`}
                                title={p.muted ? "Unmute Participant" : "Mute Participant"}
                              >
                                {p.muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleRemoveParticipant(p.uid)}
                                className="p-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                                title="Disconnect Participant"
                              >
                                <Icon name="phone-off" className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className={`p-1 ${p.muted ? "text-zinc-600" : "text-emerald-400"}`}>
                              {p.muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 animate-pulse" />}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Control Deck */}
              <div className="border-t border-zinc-800/40 pt-3 flex flex-col items-center gap-2 shrink-0">
                <div className="flex items-center gap-5">
                  <button
                    onClick={async () => {
                      const nextMuted = !isLiveMuted;
                      setIsLiveMuted(nextMuted);
                      try {
                        await updateDoc(doc(db, "community_channels", channelIdParam!, "live_participants", user!.uid), {
                          muted: nextMuted
                        });
                      } catch(e) {}
                    }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition shadow-md ${isLiveMuted ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700" : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 scale-105 shadow-emerald-500/10"}`}
                    title={isLiveMuted ? "Unmute Microphone" : "Mute Microphone"}
                  >
                    {isLiveMuted ? <MicOff className="w-5.5 h-5.5" /> : <Mic className="w-5.5 h-5.5" />}
                  </button>
                  
                  {activeLiveCall.hostId === user?.uid ? (
                    <button
                      onClick={handleEndLiveCall}
                      className="w-12 h-12 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition shadow-md hover:scale-105 shadow-red-500/10"
                      title="End Live for Everyone"
                    >
                      <Icon name="phone-off" className="w-5.5 h-5.5" />
                    </button>
                  ) : (
                    <button
                      onClick={handleLeaveLiveCall}
                      className="w-12 h-12 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-full flex items-center justify-center transition"
                      title="Leave Stream"
                    >
                      <LogOut className="w-5.5 h-5.5" />
                    </button>
                  )}
                </div>
                
                <p className="text-[9px] text-zinc-500 font-semibold select-none">
                  {isLiveMuted ? "Your mic is muted" : "You are speaking live..."}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* --- Lightbox Modal --- */}
      <AnimatePresence>
        {lightboxImage && (
          <div 
            className="fixed inset-0 z-[50000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 cursor-pointer select-none"
            onClick={() => setLightboxImage(null)}
          >
            {/* Close Button */}
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
              className="absolute top-6 right-6 p-3 rounded-full bg-zinc-900/95 hover:bg-zinc-800 text-white transition-all z-50 border border-white/10 flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 active:scale-95"
              title="Close Fullscreen"
            >
              <X className="w-7 h-7" />
            </button>
            
            {/* Controls panel */}
            <div className="absolute top-6 left-6 flex items-center gap-2 z-50 flex-wrap max-w-[calc(100%-100px)]" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setLightboxZoom(prev => Math.max(0.5, prev - 0.25))}
                className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-white transition border border-white/10 text-xs font-bold"
                title="Zoom Out"
              >
                Zoom -
              </button>
              <span className="text-xs font-mono text-zinc-400 bg-zinc-900/80 px-3 py-2 rounded-xl border border-white/10">
                {Math.round(lightboxZoom * 100)}%
              </span>
              <button
                onClick={() => setLightboxZoom(prev => Math.min(3, prev + 0.25))}
                className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-white transition border border-white/10 text-xs font-bold"
                title="Zoom In"
              >
                Zoom +
              </button>
              <button
                onClick={() => { setLightboxZoom(1); setLightboxOffset({ x: 0, y: 0 }); }}
                className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-white transition border border-white/10 text-xs font-bold"
              >
                Reset
              </button>
              <a
                href={lightboxImage}
                download="attachment"
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition text-xs font-bold flex items-center gap-1.5"
              >
                Download
              </a>
            </div>

            {/* Image Stage */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
              drag={lightboxZoom > 1}
              dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
              onDrag={(e, info) => {
                setLightboxOffset({
                  x: lightboxOffset.x + info.delta.x,
                  y: lightboxOffset.y + info.delta.y
                });
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setLightboxImage(null);
                }
              }}
            >
              <motion.img
                src={lightboxImage}
                alt="Fullscreen Attachment"
                style={{
                  scale: lightboxZoom,
                  x: lightboxOffset.x,
                  y: lightboxOffset.y,
                }}
                className="max-w-full max-h-[85vh] object-contain rounded-2xl select-none pointer-events-none shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </motion.div>
          </div>
        )}
      {/* Dynamic New Message & Group Creation Modal matching iOS screenshots */}
      <NewMessageModal
        isOpen={showNewMessageModal || showNewChatModal}
        suggestedUsers={recentChatUsers}
        onClose={() => {
          setShowNewMessageModal(false);
          setShowNewChatModal(false);
        }}
        currentUser={user}
        notify={notify}
        onSelectUser={(selectedUser) => {
          setSearchParams({ chatId: selectedUser.id }, { replace: true });
        }}
        onGroupCreated={(id, isCommunity) => {
          if (isCommunity) {
            setSidebarTab('community');
            setSearchParams({ channelId: id }, { replace: true });
          } else {
            setSidebarTab('messages');
            setSearchParams({ chatId: id }, { replace: true });
          }
        }}
      />
      
      {/* Custom Clear / Delete Chat Modal */}
      <AnimatePresence>
        {showClearChatModal && activeChat && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowClearChatModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 text-center">Clear Chat History</h3>
              <p className="text-sm text-zinc-500 mb-6 text-center">Are you sure you want to clear this chat history? This action cannot be undone.</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                      handleClearChat(activeChat.id);
                      setShowClearChatModal(false);
                  }}
                  className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition"
                >
                  Clear for me
                </button>
                <button
                  onClick={() => {
                      handleClearChatForEveryone(activeChat.id);
                      setShowClearChatModal(false);
                  }}
                  className="w-full py-3 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-xl font-bold text-sm transition"
                >
                  Clear for everyone
                </button>
                <button
                  onClick={() => setShowClearChatModal(false)}
                  className="w-full py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-xl font-bold text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </AnimatePresence>
</div>
  );
}
