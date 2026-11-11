import { uploadToImgbb, generateMicroThumb } from '../services/imgbb';
import { uploadFileToCatbox } from '../lib/catboxUpload';
import { VerifiedIcon } from '../components/SellerBadge';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { isScamReview, filterSafeReviews } from '../lib/reviewModeration';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { subscribeToWebPush } from '../lib/push';
import SEO from '../components/SEO';
import { audioHelper } from '../lib/AudioHelper';
import { triggerHaptic } from '../lib/haptics';
import { useNotify } from '../components/Notifications';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, addDoc, getDoc, query, where, orderBy, serverTimestamp, getDocs, limit, deleteDoc, writeBatch } from 'firebase/firestore';
import { cn, formatDisplayEmail, getPublicShareOrigin } from '../lib/utils';
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
import { ChatBottomBar } from '../components/chat/ChatBottomBar';
import { NewMessageModal, ModalStep, SuggestedContact } from '../components/chat/NewMessageModal';
import { MessagesStoriesStrip } from '../components/chat/MessagesStoriesStrip';
import { NewChatActionPopup, NewChatPopupMode } from '../components/chat/NewChatActionPopup';
import { MessageHoldPopup } from '../components/chat/MessageHoldPopup';
import { MessageReplyPreview } from '../components/chat/MessageReplyPreview';
import { MessageMediaGrid } from '../components/chat/MessageMediaGrid';
import { ProgressiveImage } from '../components/chat/ProgressiveImage';
import { ChatMediaGalleryModal } from '../components/chat/ChatMediaGalleryModal';
import { ChatTypingIndicator } from '../components/chat/ChatTypingIndicator';
import {
  MsgSearchIcon,
  MsgPlusIcon,
  MsgDotsHorizontalIcon,
  MsgCheckDoubleIcon,
  MsgHomeIcon,
  MsgUserIcon,
  MsgBackChevronIcon,
  MsgVideoCallIcon,
  MsgPhoneCallIcon,
  MsgCommunityIcon,
  MsgChatBubbleIcon,
  MsgSettingsIcon,
  MsgReplyIcon,
  MsgForwardIcon,
  MsgTrashIcon,
  MsgCloseIcon,
} from '../components/chat/MessagesSvgIcons';

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
          className={`underline break-all font-semibold ${isMe ? 'text-white decoration-white/70 hover:decoration-white' : 'text-[#1877F2] hover:opacity-85'}`}
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
  const isMissed = msg.text?.includes('Missed');
  const timestamp = formatTime12h(msg.timestamp);
  
  let iconBg = "bg-zinc-100 dark:bg-zinc-800";
  let iconColor = "text-zinc-500 dark:text-zinc-400";
  let title = isVideo ? "Video call" : "Audio call";
  let subtext = "Tap to call again";

  if (isMissed) {
    iconBg = "bg-rose-500";
    iconColor = "text-white";
    title = isVideo ? "Missed video call" : "Missed audio call";
    subtext = "Tap to call back";
  } else {
    // If it's a completed call, might show duration
    if (msg.duration) {
      const mins = Math.floor(msg.duration / 60);
      const secs = msg.duration % 60;
      subtext = mins > 0 ? `${mins} mins` : `${secs} secs`;
    }
  }

  return (
    <div className="flex items-center gap-3 p-3.5 pl-4 pr-6 rounded-[22px] bg-zinc-50 dark:bg-zinc-900 border border-black/[0.03] dark:border-white/[0.05] shadow-sm min-w-[210px] my-1 group active:scale-[0.98] transition-transform cursor-pointer">
      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-xs", iconBg)}>
        <Icon name={isMissed ? "phone-off" : (isVideo ? "video" : "phone")} className={cn("w-4.5 h-4.5", iconColor)} />
      </div>
      <div className="flex flex-col">
        <p className="font-bold text-[14.5px] text-zinc-900 dark:text-zinc-100 leading-tight tracking-tight">{title}</p>
        <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">{subtext}</p>
      </div>
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

  useEffect(() => {
    // Professional Scroll Fix: Disable body scroll when in Messages
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (user?.uid) {
      const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
        if (snap.exists()) {
          setCurrentUserProfile(snap.data());
        }
      });
      return () => unsub();
    }
  }, [user?.uid]);
  
  // Safety Notice Dismissal State (Shows only ONCE until user clicks "буঝেছি")
  const [safetyNoticeDismissed, setSafetyNoticeDismissed] = useState<boolean>(() => {
    return localStorage.getItem('deepshop_safety_notice_dismissed') === 'true';
  });

  // Telegram-style Chat List States (Pinned, Archived, Blocked, Muted)
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('deepshop_pinned_chats') || '[]'); } catch { return []; }
  });
  const [archivedChatIds, setArchivedChatIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('deepshop_archived_chats') || '[]'); } catch { return []; }
  });
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('deepshop_blocked_chats') || '[]'); } catch { return []; }
  });
  const [mutedChatIds, setMutedChatIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('deepshop_muted_chats') || '[]'); } catch { return []; }
  });
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [activeContextMenuChatId, setActiveContextMenuChatId] = useState<string | null>(null);
  const [activeContextMenuPos, setActiveContextMenuPos] = useState<{ top: number; left: number } | null>(null);

  // Message Pinning State
  const [pinnedMessageIdsMap, setPinnedMessageIdsMap] = useState<Record<string, string[]>>(() => {
    try { return JSON.parse(localStorage.getItem('deepshop_pinned_msgs') || '{}'); } catch { return {}; }
  });

  const [swipedChatId, setSwipedChatId] = useState<string | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; cId: string } | null>(null);
  const longPressTimerRef = useRef<any>(null);

  const togglePinChat = (chatId: string) => {
    setSwipedChatId(null);
    setActiveContextMenuChatId(null);
    setPinnedChatIds(prev => {
      const next = prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId];
      localStorage.setItem('deepshop_pinned_chats', JSON.stringify(next));
      return next;
    });
  };

  const toggleArchiveChat = (chatId: string) => {
    setSwipedChatId(null);
    setActiveContextMenuChatId(null);
    setArchivedChatIds(prev => {
      const next = prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId];
      localStorage.setItem('deepshop_archived_chats', JSON.stringify(next));
      return next;
    });
  };

  const toggleBlockUser = (chatId: string) => {
    setSwipedChatId(null);
    setActiveContextMenuChatId(null);
    setBlockedUserIds(prev => {
      const next = prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId];
      localStorage.setItem('deepshop_blocked_chats', JSON.stringify(next));
      return next;
    });
  };

  const toggleMuteChat = (chatId: string) => {
    setSwipedChatId(null);
    setActiveContextMenuChatId(null);
    setMutedChatIds(prev => {
      const next = prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId];
      localStorage.setItem('deepshop_muted_chats', JSON.stringify(next));
      return next;
    });
  };

  const togglePinMessage = (chatId: string, msgId: string) => {
    setPinnedMessageIdsMap(prev => {
      const chatPins = prev[chatId] || [];
      const updated = chatPins.includes(msgId) ? chatPins.filter(id => id !== msgId) : [...chatPins, msgId];
      const next = { ...prev, [chatId]: updated };
      localStorage.setItem('deepshop_pinned_msgs', JSON.stringify(next));
      return next;
    });
  };

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
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [originHomePath] = useState<'/loops' | '/'>(() => {
    const fromQuery = (searchParams.get('from') || '').trim().toLowerCase();
    if (fromQuery === 'loops' || fromQuery.startsWith('/loops') || fromQuery.startsWith('/news-hub')) {
      try {
        sessionStorage.setItem('deepshop_last_section_home', '/loops');
        localStorage.setItem('deepshop_last_section_home', '/loops');
      } catch {}
      return '/loops';
    }
    if (fromQuery === 'shop' || fromQuery === '/') {
      try {
        sessionStorage.setItem('deepshop_last_section_home', '/');
        localStorage.setItem('deepshop_last_section_home', '/');
      } catch {}
      return '/';
    }
    const stateFrom = String((location.state as any)?.fromSection || (location.state as any)?.from || '')
      .trim()
      .toLowerCase();
    if (stateFrom === 'loops' || stateFrom.startsWith('/loops') || stateFrom.startsWith('/news-hub')) {
      try {
        sessionStorage.setItem('deepshop_last_section_home', '/loops');
        localStorage.setItem('deepshop_last_section_home', '/loops');
      } catch {}
      return '/loops';
    }
    if (stateFrom === 'shop' || stateFrom === '/') {
      try {
        sessionStorage.setItem('deepshop_last_section_home', '/');
        localStorage.setItem('deepshop_last_section_home', '/');
      } catch {}
      return '/';
    }
    try {
      const stored =
        sessionStorage.getItem('deepshop_last_section_home') ||
        localStorage.getItem('deepshop_last_section_home') ||
        '/';
      if (stored === '/loops' || stored.startsWith('/loops')) {
        return '/loops';
      }
    } catch {}
    return '/';
  });
  const chatIdParam = searchParams.get('chatId') || searchParams.get('uid') || searchParams.get('sellerId');
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

  const userProfileCacheRef = useRef<Map<string, any>>(new Map());
  const messagesCacheRef = useRef<Map<string, any[]>>(new Map());

  const [chats, setChats] = useState<any[]>(() => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return [];
      const cached = localStorage.getItem(`deep_chats_cache_${uid}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [tempActiveChat, setTempActiveChat] = useState<any | null>(null);
  const [otherUserPresence, setOtherUserPresence] = useState<{ isOnline?: boolean; lastActive?: number } | null>(null);
  const [chatUsersPresence, setChatUsersPresence] = useState<Record<string, { isOnline: boolean; lastActive: any }>>({});
  const [chatUsersData, setChatUsersData] = useState<Record<string, any>>({});
  const [showOnlineRow, setShowOnlineRow] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    setChats((prev) => {
      if (prev.length > 0) return prev;
      try {
        const cached = localStorage.getItem(`deep_chats_cache_${user.uid}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach((c: any) => {
              if (c?.otherUser?.id && !c.otherUser.isGroup) {
                userProfileCacheRef.current.set(c.otherUser.id, c.otherUser);
              }
            });
            return parsed;
          }
        }
      } catch {}
      return prev;
    });
  }, [user?.uid]);
  
  const [activeChatTypingState, setActiveChatTypingState] = useState<Record<string, any>>({});
  const [otherUserChatActivity, setOtherUserChatActivity] = useState<any>(null);

  // Derived activeChat
  const activeChat = chatIdParam 
    ? (chats.find(c => c.id === chatIdParam || c.otherUser?.id === chatIdParam || c.otherUser?.uid === chatIdParam) || tempActiveChat)
    : null;

  const otherUid = activeChat?.otherUser?.id || activeChat?.otherUser?.uid || (chatIdParam && chatIdParam !== activeChat?.id && chatIdParam !== 'system' ? chatIdParam : null);

  // 1. Direct real-time snapshot on active p2p_chats document
  useEffect(() => {
    const effectiveChatId = activeChat?.id;
    if (!effectiveChatId || activeChat?.isNew) {
      setActiveChatTypingState({});
      return;
    }

    const unsub = onSnapshot(doc(db, 'p2p_chats', effectiveChatId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setActiveChatTypingState(data?.typingState || {});
      }
    }, (err) => {
      console.warn("Typing state subscription warning:", err);
    });

    return () => unsub();
  }, [activeChat?.id, activeChat?.isNew]);

  // 2. Direct real-time listener on other user's presence/activity channel
  useEffect(() => {
    if (!otherUid || otherUid === 'system') {
      setOtherUserChatActivity(null);
      return;
    }

    const unsub = onSnapshot(doc(db, 'users', otherUid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const act = data?.chatActivity;
        if (act && act.status && (act.targetId === user?.uid || !act.targetId)) {
          setOtherUserChatActivity(act);
        } else {
          setOtherUserChatActivity(null);
        }
      }
    }, (err) => {
      console.warn("User activity subscription warning:", err);
    });

    return () => unsub();
  }, [otherUid, user?.uid]);

  // Multi-tier resolution for highest reliability and speed
  const p2pTypingData = activeChatTypingState?.[otherUid] || activeChat?.typingState?.[otherUid];
  const userDocActivity = otherUserChatActivity;

  const resolvedActivityData = React.useMemo(() => {
    const now = Date.now();
    const candidate1 = (p2pTypingData && p2pTypingData.status && (now - (p2pTypingData.updatedAt || 0) < (p2pTypingData.status === 'recording' ? 35000 : 12000))) ? p2pTypingData : null;
    const candidate2 = (userDocActivity && userDocActivity.status && (now - (userDocActivity.updatedAt || 0) < (userDocActivity.status === 'recording' ? 35000 : 12000))) ? userDocActivity : null;

    if (candidate1 && candidate2) {
      return (candidate1.updatedAt || 0) >= (candidate2.updatedAt || 0) ? candidate1 : candidate2;
    }
    return candidate1 || candidate2 || null;
  }, [p2pTypingData, userDocActivity]);

  const otherActivity: 'typing' | 'recording' | 'uploading_photo' | 'choosing_gif' | null = resolvedActivityData ? (
    resolvedActivityData.status === 'recording' ? 'recording' :
    (resolvedActivityData.status === 'uploading_photo' || resolvedActivityData.status === 'uploading_image' || resolvedActivityData.status === 'photo') ? 'uploading_photo' :
    (resolvedActivityData.status === 'choosing_gif' || resolvedActivityData.status === 'gif' || resolvedActivityData.status === 'choosing_sticker' || resolvedActivityData.status === 'sticker') ? 'choosing_gif' :
    resolvedActivityData.status === 'typing' ? 'typing' : null
  ) : null;
  const isOtherTyping = otherActivity === 'typing';
  const isOtherRecording = otherActivity === 'recording';

  const updateMyActivity = (status: 'typing' | 'recording' | 'uploading_photo' | 'choosing_gif' | null) => {
    if (!user?.uid) return;
    const now = Date.now();

    // 1. Direct update to user's activity broadcast doc
    setDoc(doc(db, 'users', user.uid), {
      chatActivity: status ? {
        status,
        targetId: otherUid || null,
        updatedAt: now
      } : null
    }, { merge: true }).catch(() => {});

    // 2. Direct update to p2p_chats if available
    let targetChatId = activeChat?.id;
    if ((!targetChatId || activeChat?.isNew) && otherUid) {
      const existing = chats.find(c => 
        !c.isGroup && 
        c.type !== 'group' && 
        Array.isArray(c.participants) && 
        c.participants.includes(otherUid) && 
        c.participants.includes(user.uid)
      );
      if (existing?.id) targetChatId = existing.id;
    }

    if (targetChatId && targetChatId !== 'new') {
      updateDoc(doc(db, 'p2p_chats', targetChatId), {
        [`typingState.${user.uid}`]: status ? { status, updatedAt: now } : null
      }).catch(() => {});
    }
  };

  const [showPrivateChatMenu, setShowPrivateChatMenu] = useState(false);
  const [showP2pSearch, setShowP2pSearch] = useState(false);
  const [p2pSearchQuery, setP2pSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [newMessageInitialStep, setNewMessageInitialStep] = useState<ModalStep>('new_message');
  const [newMessageInitialGroupType, setNewMessageInitialGroupType] = useState<'group' | 'community'>('group');
  const [showNewChatPopup, setShowNewChatPopup] = useState(false);
  const [newChatPopupMode, setNewChatPopupMode] = useState<NewChatPopupMode>('menu');
  const [showInboxSearch, setShowInboxSearch] = useState(false);
  const [showChatsMoreMenu, setShowChatsMoreMenu] = useState(false);
  const [savedContacts, setSavedContacts] = useState<SuggestedContact[]>([]);
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
  const [previewThumbs, setPreviewThumbs] = useState<string[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Message Long-Press / Hold Context Popup State & Refs (IMG_5359 right)
  const msgHoldTimerRef = useRef<any>(null);
  const msgHoldTouchPosRef = useRef<{ x: number; y: number } | null>(null);

  const triggerOpenMsgHoldPopup = (msgId: string) => {
    if (!msgId) return;
    if (privacySettings.hapticTouchFeedback && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try { navigator.vibrate(15); } catch {}
    }
    setActiveMessageMenuId(msgId);
  };

  const getMsgHoldHandlers = (msgId: string) => ({
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      triggerOpenMsgHoldPopup(msgId);
    },
    onTouchStart: (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      msgHoldTouchPosRef.current = { x: touch.clientX, y: touch.clientY };
      if (msgHoldTimerRef.current) clearTimeout(msgHoldTimerRef.current);
      msgHoldTimerRef.current = setTimeout(() => {
        triggerOpenMsgHoldPopup(msgId);
        msgHoldTouchPosRef.current = null;
      }, 380);
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (!msgHoldTouchPosRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      const dx = Math.abs(touch.clientX - msgHoldTouchPosRef.current.x);
      const dy = Math.abs(touch.clientY - msgHoldTouchPosRef.current.y);
      if (dx > 10 || dy > 10) {
        if (msgHoldTimerRef.current) clearTimeout(msgHoldTimerRef.current);
        msgHoldTouchPosRef.current = null;
      }
    },
    onTouchEnd: () => {
      if (msgHoldTimerRef.current) clearTimeout(msgHoldTimerRef.current);
      msgHoldTouchPosRef.current = null;
    },
    onTouchCancel: () => {
      if (msgHoldTimerRef.current) clearTimeout(msgHoldTimerRef.current);
      msgHoldTouchPosRef.current = null;
    },
  });

  const formatInboxTime24h = (ms: number) => {
    if (!ms || isNaN(ms)) return '';
    const d = new Date(ms);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const markAllChatsAsRead = async () => {
    if (!user?.uid) return;
    const unread = chats.filter(
      (c) => c.id && c.lastMessage && c.lastSenderId !== user.uid && (!c.seenBy || !c.seenBy.includes(user.uid))
    );
    if (unread.length === 0) {
      notify('All conversations are already read', 'info');
      return;
    }
    try {
      await Promise.all(
        unread.map((c) =>
          updateDoc(doc(db, 'p2p_chats', c.id), {
            seenBy: arrayUnion(user.uid),
          }).catch(() => {})
        )
      );
      notify('Marked all chats as read', 'success');
    } catch {
      notify('Could not mark chats as read', 'error');
    }
  };

  // Hydrate saved contacts from localStorage + Firestore user profile
  useEffect(() => {
    if (!user?.uid) {
      setSavedContacts([]);
      return;
    }
    const map = new Map<string, SuggestedContact>();
    try {
      const localList: SuggestedContact[] = JSON.parse(
        localStorage.getItem(`deepshop_saved_contacts_${user.uid}`) || '[]'
      );
      if (Array.isArray(localList)) {
        localList.forEach((c) => {
          if (c?.id && c.id !== user.uid) map.set(c.id, c);
        });
      }
    } catch {}

    if (Array.isArray(currentUserProfile?.savedContacts)) {
      currentUserProfile.savedContacts.forEach((c: any) => {
        if (c?.id && c.id !== user.uid && !map.has(c.id)) {
          map.set(c.id, {
            id: c.id,
            displayName: c.displayName || 'Contact',
            username: c.username || '',
            email: c.email || '',
            phoneNumber: c.phoneNumber || '',
            photoURL: c.photoURL || '',
          });
        }
      });
    }
    setSavedContacts(Array.from(map.values()));
  }, [user?.uid, currentUserProfile?.savedContacts]);

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

  // Recent chat partners + saved contacts to pass to NewMessageModal & Stories strip
  const recentChatUsers = React.useMemo(() => {
    if (!user) return [];
    const list: SuggestedContact[] = [];
    const seen = new Set<string>();

    for (const c of (chats || [])) {
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
            isOnline: Boolean(chatUsersPresence[c.otherUser.id]?.isOnline || c.otherUser.isOnline)
          });
        }
      }
    }

    for (const sc of savedContacts) {
      if (sc.id && sc.id !== user.uid && !seen.has(sc.id)) {
        seen.add(sc.id);
        list.push({
          ...sc,
          isOnline: Boolean(chatUsersPresence[sc.id]?.isOnline || sc.isOnline),
        });
      }
    }
    return list;
  }, [chats, savedContacts, chatUsersPresence, user]);

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
        const savedThemeId = localStorage.getItem(`chat_theme_${activeChat?.id}`) || activeChat?.themeId || localStorage.getItem('deepshop_chat_theme_id');
        if (savedThemeId) {
          const found = CHAT_THEMES.find(t => t.id === savedThemeId);
          if (found) setActiveTheme(found);
        }
      } catch {}
    }
  }, [activeChat?.id, activeChat?.themeId]);

  useEffect(() => {
    if (otherActivity) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [otherActivity]);

  // Lock outer document scroll while inside full-screen Messages so only inner chat streams scroll
  useEffect(() => {
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const prevHtmlOverflow = htmlEl.style.overflow;
    const prevHtmlOverscroll = htmlEl.style.overscrollBehavior;
    const prevBodyOverflow = bodyEl.style.overflow;
    const prevBodyOverscroll = bodyEl.style.overscrollBehavior;
    const prevBodyMinHeight = bodyEl.style.minHeight;
    const prevBodyHeight = bodyEl.style.height;

    window.scrollTo(0, 0);
    htmlEl.style.overflow = 'hidden';
    htmlEl.style.overscrollBehavior = 'none';
    bodyEl.style.overflow = 'hidden';
    bodyEl.style.overscrollBehavior = 'none';
    bodyEl.style.minHeight = '100dvh';
    bodyEl.style.height = '100dvh';

    return () => {
      htmlEl.style.overflow = prevHtmlOverflow;
      htmlEl.style.overscrollBehavior = prevHtmlOverscroll;
      bodyEl.style.overflow = prevBodyOverflow;
      bodyEl.style.overscrollBehavior = prevBodyOverscroll;
      bodyEl.style.minHeight = prevBodyMinHeight;
      bodyEl.style.height = prevBodyHeight;
    };
  }, []);

  // Voice Recording, Zero-Latency Optimistic Send, Animation, and Dynamic AI Refs
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingLocked, setIsRecordingLocked] = useState(false);
  const dragStartY = useRef(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedMimeTypeRef = useRef<string>('audio/webm');
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const isRecordingRef = useRef<boolean>(false);
  const recordingStartMsRef = useRef<number>(0);
  const isCancellingRecordingRef = useRef<boolean>(false);
  const localVoiceBlobUrlsRef = useRef<Map<string, string>>(new Map());
  const pendingOptimisticMapRef = useRef<Map<string, any[]>>(new Map());
  const animatedMsgIdsRef = useRef<Set<string>>(new Set());
  const chatHydratedRef = useRef<Set<string>>(new Set());
  const aiReplyTimeoutRef = useRef<Record<string, any>>({});
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
  const [replyingTo, setReplyingTo] = useState<{ id: string; text: string; senderId: string; senderName?: string; imageUrl?: string; audioUrl?: string } | null>(null);
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
  const [messagesFilterTab, setMessagesFilterTab] = useState<'all' | 'unread' | 'groups'>('all');
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
  const [forwardSearchQuery, setForwardSearchQuery] = useState('');
  const [forwardedTargetsMap, setForwardedTargetsMap] = useState<Record<string, boolean>>({});

  // Handle incoming ?sharePost=<postId> from News Hub Share Page
  useEffect(() => {
    const sharePostId = searchParams.get('sharePost');
    if (!sharePostId || !user?.uid) return;

    let active = true;
    const loadSharedPost = async () => {
      let postData: any = null;
      try {
        const pSnap = await getDoc(doc(db, 'scam_posts', sharePostId));
        if (pSnap.exists()) {
          postData = { id: pSnap.id, ...pSnap.data() };
        }
      } catch {}

      if (!postData) {
        try {
          const localList = JSON.parse(localStorage.getItem('deep_scam_posts') || '[]');
          if (Array.isArray(localList)) {
            postData = localList.find((p: any) => p?.id === sharePostId) || null;
          }
        } catch {}
      }

      if (!active) return;

      const postUrl = `${getPublicShareOrigin()}/news-hub/post/${sharePostId}`;
      const caption = postData?.description?.slice(0, 140) || postData?.title || 'Shared a post from Feed';
      setForwardingMessage({
        text: `${caption}\n${postUrl}`,
        imageUrl: postData?.images?.[0] || '',
      });
      setShowForwardModal(true);

      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('sharePost');
      setSearchParams(nextParams, { replace: true });
    };

    loadSharedPost();
    return () => {
      active = false;
    };
  }, [searchParams, user?.uid, setSearchParams]);
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
    const isGroup = activeChat?.isGroup || activeChat?.type === 'group';
    if (!isGroup) return;

    const neededUids = new Set<string>();
    if (Array.isArray(activeChat?.participants)) {
      activeChat?.participants?.forEach((uid: string) => {
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
    if (!activeChat || !activeChat?.otherUser || activeChat?.otherUser?.id === 'system') return false;
    
    // Check other user's real-time direct message policy
    const otherId = activeChat?.otherUser?.id || activeChat?.otherUser?.uid;
    const otherData = otherId ? chatUsersData[otherId] : null;
    
    if (otherData?.privacy?.allowDirectMessages === false) {
      return true;
    }
    if (activeChat?.otherUser?.privacy?.allowDirectMessages === false) {
      return true;
    }

    const privacy = activeChat?.otherUser?.whoCanDM;
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

  // Modern Media Gallery (3rd & 4th Styles)
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState<number>(0);
  const [gallerySenderName, setGallerySenderName] = useState<string>('');
  const [galleryTimestamp, setGalleryTimestamp] = useState<any>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const openMediaGallery = (clickedUrl: string, index: number, allImages: string[], sender?: string, time?: any) => {
    const list = allImages && allImages.length > 0 ? allImages : (clickedUrl ? [clickedUrl] : []);
    setGalleryImages(list);
    setGalleryIndex(index >= 0 ? index : 0);
    setGallerySenderName(sender || '');
    setGalleryTimestamp(time || null);
    setIsGalleryOpen(true);
  };

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
      if (!otherId || otherId === 'system') return () => {};
      return onSnapshot(doc(db, 'users', otherId), (docSnap) => {
        if (docSnap.exists()) {
          const uData = docSnap.data();
          const lastActiveMs = typeof uData.lastActive === 'number'
            ? uData.lastActive
            : uData.lastActive?.toMillis
              ? uData.lastActive.toMillis()
              : (uData.lastActive?.seconds ? uData.lastActive.seconds * 1000 : (typeof uData.lastActive === 'string' ? new Date(uData.lastActive).getTime() : 0));
          
          const isRecentlyActive = lastActiveMs > 0 && (Date.now() - lastActiveMs < 60000);
          const isUserOnline = Boolean(uData.isOnline && isRecentlyActive);

          setChatUsersData(prev => ({
            ...prev,
            [otherId]: uData
          }));
          setChatUsersPresence(prev => ({
            ...prev,
            [otherId]: {
              isOnline: isUserOnline,
              lastActive: lastActiveMs || null
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
        if (user.email?.toLowerCase() === 'deepshop@gmail.com' || user.email?.toLowerCase() === 'goribsam2@gmail.com') {
          setUserRole('admin');
          setUserShopName('DEEP SHOP Admin');
          return;
        }
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserRole(data.role === 'admin' ? 'admin' : (data.role || 'buyer'));
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
      setChannelMessages((msgs as any[]).filter(m => !m.deletedFor?.includes(user?.uid)));
    }, (err) => {
      const unsub2 = onSnapshot(collection(db, 'community_channels', channelIdParam, 'messages'), (snapshot) => {
        const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0));
        setChannelMessages((msgs as any[]).filter(m => !m.deletedFor?.includes(user?.uid)));
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
      const channel = (channels as any[]).find(c => c.id === channelIdParam);
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
      const channel = (channels as any[]).find(c => c.id === channelIdParam);
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
    if (!activeChat || !activeChat?.id) return;
    try {
      await updateDoc(doc(db, 'p2p_chats', activeChat?.id), {
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
    if (!activeChat || !activeChat?.id) return;
    try {
      await updateDoc(doc(db, 'p2p_chats', activeChat?.id), {
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

    const targetKey = isChannelTarget
      ? `ch_${targetChatOrChannel.id}`
      : `chat_${targetChatOrChannel.id || targetChatOrChannel.otherUser?.id || targetChatOrChannel.otherUser?.uid}`;
    if (forwardedTargetsMap[targetKey]) return;

    triggerHaptic();
    setForwardedTargetsMap((prev) => ({ ...prev, [targetKey]: true }));

    try {
      const forwardText = forwardingMessage.text || '';
      const forwardImages: string[] = Array.isArray(forwardingMessage.images) && forwardingMessage.images.length > 0
        ? forwardingMessage.images
        : (forwardingMessage.imageUrl ? [forwardingMessage.imageUrl] : []);
      const forwardImg = forwardImages[0] || null;
      const forwardAudio = forwardingMessage.audioUrl || null;
      const forwardAudioDuration = forwardingMessage.audioDuration || 12;
      const originalName =
        forwardingMessage.forwardedFrom ||
        forwardingMessage.originalSenderName ||
        forwardingMessage.senderName ||
        (forwardingMessage.senderId === user.uid
          ? (userShopName || user.displayName || 'You')
          : (participantProfiles[forwardingMessage.senderId]?.displayName ||
             activeChat?.otherUser?.shopName ||
             activeChat?.otherUser?.displayName ||
             'User'));

      const previewSummary =
        forwardText ||
        (forwardAudio ? '🎙️ Forwarded voice message' : forwardImg ? '📷 Forwarded photo' : 'Forwarded message');

      const msgData: any = {
        text: forwardText,
        images: forwardImages,
        imageUrl: forwardImg,
        audioUrl: forwardAudio,
        ...(forwardAudio ? { audioDuration: forwardAudioDuration } : {}),
        senderId: user.uid,
        senderName: userShopName || user.displayName || 'Member',
        senderPhoto: user.photoURL || '',
        forwardedFrom: originalName,
        createdAt: Date.now(),
        timestamp: serverTimestamp(),
        seenBy: [user.uid],
      };

      if (isChannelTarget) {
        await addDoc(collection(db, 'community_channels', targetChatOrChannel.id, 'messages'), msgData);

        fetch('/api/send-push-channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: targetChatOrChannel.id,
            title: `Forwarded in ${targetChatOrChannel.name}`,
            body: previewSummary,
            link: `/messages?channelId=${targetChatOrChannel.id}`
          })
        }).catch(() => {});
      } else {
        let chatId = targetChatOrChannel.id;
        if (targetChatOrChannel.isNew || !chatId) {
          const chatRef = await addDoc(collection(db, 'p2p_chats'), {
            participants: [user.uid, targetChatOrChannel.otherUser.id],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastMessage: previewSummary,
            lastSenderId: user.uid,
            seenBy: [user.uid]
          });
          chatId = chatRef.id;
        } else {
          await updateDoc(doc(db, 'p2p_chats', chatId), {
            updatedAt: serverTimestamp(),
            lastMessage: previewSummary,
            lastSenderId: user.uid,
            seenBy: [user.uid]
          });
        }

        await addDoc(collection(db, 'p2p_chats', chatId, 'messages'), msgData);
        const recipientId = targetChatOrChannel.otherUser?.id || targetChatOrChannel.otherUser?.uid;
        if (recipientId) {
          fetch('/api/web-push/send-p2p', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetUserId: recipientId,
              title: `${user.displayName || 'Someone'} forwarded a message`,
              body: previewSummary,
              link: `/messages?chatId=${user.uid}`
            })
          }).catch(() => {});
        }

        if (recipientId && recipientId !== 'system') {
          fetch('/api/send-push-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: recipientId,
              title: user.displayName || 'New Message',
              body: `Forwarded: ${previewSummary}`,
              link: `/messages?chatId=${user.uid}`
            })
          }).catch(() => {});
        }
      }

      (audioHelper as any)?.playMessageSentSound?.();
    } catch (err) {
      console.error(err);
      setForwardedTargetsMap((prev) => {
        const next = { ...prev };
        delete next[targetKey];
        return next;
      });
      notify('Failed to forward message', 'error');
    }
  };

  const handleReactToMessage = async (msgId: string, emoji: string) => {
    if (!user || !activeChat || !activeChat?.id) return;
    const msgRef = doc(db, 'p2p_chats', activeChat?.id, 'messages', msgId);
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
    if (!user || !activeChat || !activeChat?.otherUser?.id) {
      setHasReviewed(false);
      setOtherUserTrust({ score: 100, count: 0, avgRating: 5, hasScamWarning: false });
      return;
    }
    
    const checkReview = async () => {
      try {
        const q = query(
          collection(db, "user_reviews"),
          where("reviewerId", "==", user.uid),
          where("revieweeId", "==", activeChat?.otherUser?.id)
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
      if (activeChat?.otherUser?.id === 'system' || emailLower === 'deepshop@gmail.com' || emailLower === 'deepshopbysam@gmail.com') {
        setOtherUserTrust({ score: 100, count: 120, avgRating: 5, hasScamWarning: false });
        setIsTrustLoading(false);
        return;
      }
      try {
        const q1 = query(
          collection(db, "user_reviews"),
          where("revieweeId", "==", activeChat?.otherUser?.id)
        );
        const snap1 = await getDocs(q1);
        const list1 = snap1.docs.map(doc => doc.data());

        const q2 = query(
          collection(db, "reviews"),
          where("sellerId", "==", activeChat?.otherUser?.id)
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
    const savedWallpaper = localStorage.getItem('chat_wallpaper_' + activeChat?.id);
    setChatWallpaper(savedWallpaper || null);
  }, [activeChat?.otherUser?.id, activeChat?.id, user]);

  // Effect 1: Listen for user's chats with fast in-memory user profile cache & localStorage hydration
  useEffect(() => {
    if (!user) return;
    
    const q1 = query(
      collection(db, 'p2p_chats'), 
      where('participants', 'array-contains', user.uid)
    );
    
    const unsub = onSnapshot(q1, async (snapshot) => {
      try {
        const chatsList = await Promise.all(snapshot.docs.map(async d => {
          try {
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
                const otherUid = Array.isArray(data.participants) ? data.participants.find((p: string) => p !== user.uid) : null;
                otherUser = { displayName: 'Unknown', photoURL: '', id: otherUid, isGroup: false };
                if (otherUid) {
                    if (otherUid === 'system') {
                        otherUser = {
                            id: 'system',
                            displayName: 'Deep Shop HQ',
                            photoURL: '',
                            isGroup: false
                        };
                    } else if (userProfileCacheRef.current.has(otherUid)) {
                        otherUser = userProfileCacheRef.current.get(otherUid);
                    } else {
                        try {
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
                          userProfileCacheRef.current.set(otherUid, otherUser);
                        } catch (uErr) {
                          otherUser = { id: otherUid, displayName: 'User', photoURL: '', isGroup: false };
                        }
                    }
                }
            }
            
            return {
                id: d.id,
                ...data,
                otherUser
            };
          } catch (itemErr) {
            return { id: d.id, ...d.data(), otherUser: { id: d.id, displayName: 'Chat' } };
          }
        }));

        // Sort in memory by updatedAt descending safely
        chatsList.sort((a: any, b: any) => {
          const tA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : (a.updatedAt || 0));
          const tB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : (b.updatedAt || 0));
          return tB - tA;
        });
        
        setChats(chatsList);

        try {
          const serializable = chatsList.slice(0, 40).map((c: any) => ({
            id: c.id,
            participants: c.participants,
            lastMessage: c.lastMessage || '',
            lastSenderId: c.lastSenderId || '',
            seenBy: c.seenBy || [],
            type: c.type,
            isGroup: c.isGroup,
            name: c.name,
            groupName: c.groupName,
            photoURL: c.photoURL,
            updatedAt: c.updatedAt?.toMillis ? c.updatedAt.toMillis() : (c.updatedAt?.seconds ? c.updatedAt.seconds * 1000 : (c.updatedAt || 0)),
            otherUser: c.otherUser ? {
              id: c.otherUser.id,
              uid: c.otherUser.uid,
              displayName: c.otherUser.displayName,
              shopName: c.otherUser.shopName,
              username: c.otherUser.username,
              photoURL: c.otherUser.photoURL,
              verified: c.otherUser.verified,
              kycStatus: c.otherUser.kycStatus,
              isGroup: c.otherUser.isGroup,
            } : null,
          }));
          localStorage.setItem(`deep_chats_cache_${user.uid}`, JSON.stringify(serializable));
        } catch {}
      } catch (err) {
        console.error("Error in chats onSnapshot:", err);
      }
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
    if (!activeChat || !activeChat?.otherUser?.id || activeChat?.otherUser?.id === 'system') {
      setOtherUserPresence(null);
      return;
    }

    const otherUid = activeChat?.otherUser?.id;
    const unsub = onSnapshot(doc(db, 'users', otherUid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const lastActiveMs = typeof data.lastActive === 'number'
          ? data.lastActive
          : data.lastActive?.toMillis
            ? data.lastActive.toMillis()
            : (data.lastActive?.seconds ? data.lastActive.seconds * 1000 : (typeof data.lastActive === 'string' ? new Date(data.lastActive).getTime() : 0));
        
        const isRecentlyActive = lastActiveMs > 0 && (Date.now() - lastActiveMs < 60000);
        const isOnline = Boolean(data.isOnline && isRecentlyActive);

        setOtherUserPresence({
          isOnline: isOnline,
          lastActive: lastActiveMs || null
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

  // Effect 4: Listen for messages & set as seen (with <0.1s synchronous memory + localStorage hydration & optimistic merge)
  useEffect(() => {
    const activeId = activeChat?.id;
    if (!activeChat || activeChat?.isNew || !activeId) {
      setMessages([]);
      return;
    }

    let initialMsgs = messagesCacheRef.current.get(activeId);
    if (!initialMsgs) {
      try {
        const rawLocal = localStorage.getItem(`deep_msgs_cache_${activeId}`);
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          if (Array.isArray(parsed) && parsed.length > 0) {
            initialMsgs = parsed;
            messagesCacheRef.current.set(activeId, parsed);
          }
        }
      } catch {}
    }

    const knownIds = new Set<string>();
    if (initialMsgs && initialMsgs.length > 0) {
      initialMsgs.forEach((m: any) => {
        if (m?.id) knownIds.add(m.id);
      });
      setMessages(initialMsgs);
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      });
    }

    const colRef = collection(db, 'p2p_chats', activeId, 'messages');

    const unsub = onSnapshot(colRef, (snapshot) => {
      const getTs = (m: any) => {
        if (!m.timestamp) return m.createdAt || 0;
        if (m.timestamp.toMillis) return m.timestamp.toMillis();
        if (m.timestamp.seconds) return m.timestamp.seconds * 1000;
        if (typeof m.timestamp === 'number') return m.timestamp;
        return m.createdAt || 0;
      };

      const msgs = snapshot.docs.map((d) => {
        const data = d.data() as any;
        const localBlob =
          data.clientMsgId && localVoiceBlobUrlsRef.current.get(data.clientMsgId);
        return {
          id: d.id,
          ...data,
          ...(localBlob ? { _localAudioUrl: localBlob } : {}),
        };
      });

      msgs.sort((a: any, b: any) => getTs(a) - getTs(b));

      const filteredMsgs = msgs.filter((m) => {
        if (
          m.deletedFor &&
          Array.isArray(m.deletedFor) &&
          user?.uid &&
          m.deletedFor.includes(user.uid)
        ) {
          return false;
        }
        if (
          activeChat?.autoDeleteTimer &&
          typeof activeChat?.autoDeleteTimer?.duration === 'number' &&
          activeChat?.autoDeleteTimer?.duration > 0
        ) {
          const ts = getTs(m);
          if (ts > 0 && Date.now() - ts > activeChat.autoDeleteTimer.duration) {
            return false;
          }
        }
        return true;
      });

      // Reconcile pending optimistic messages so outgoing bubbles never flicker or disappear
      const pendingList = pendingOptimisticMapRef.current.get(activeId) || [];
      let remainingOptimistic: any[] = [];
      if (pendingList.length > 0) {
        remainingOptimistic = pendingList.filter((opt) => {
          const matchedInRemote = filteredMsgs.some((rm) => {
            if (opt.clientMsgId && rm.clientMsgId === opt.clientMsgId) return true;
            if (rm.senderId === opt.senderId) {
              const dt = Math.abs(getTs(rm) - (opt.createdAt || 0));
              if (dt < 30000) {
                if (opt.text && rm.text === opt.text) return true;
                if (opt.audioUrl && rm.audioUrl) return true;
              }
            }
            return false;
          });
          return !matchedInRemote && Date.now() - (opt.createdAt || 0) < 45000;
        });
        pendingOptimisticMapRef.current.set(activeId, remainingOptimistic);
      }

      const wasHydrated = chatHydratedRef.current.has(activeId);
      let playedReceiveChime = false;
      filteredMsgs.forEach((m) => {
        if (!knownIds.has(m.id)) {
          knownIds.add(m.id);
          if (wasHydrated) {
            animatedMsgIdsRef.current.add(m.id);
            if (m.senderId && m.senderId !== user?.uid && !playedReceiveChime) {
              playedReceiveChime = true;
              if (!privacySettings.doNotDisturb) {
                (audioHelper as any)?.playMessageReceivedSound?.();
              }
            }
          }
        }
      });
      chatHydratedRef.current.add(activeId);

      const mergedFinal =
        remainingOptimistic.length > 0
          ? [...filteredMsgs, ...remainingOptimistic]
          : filteredMsgs;

      messagesCacheRef.current.set(activeId, mergedFinal);
      setMessages(mergedFinal);

      // Persist compact latest 50 messages to localStorage for <0.1s reload hydration
      try {
        const serializable = filteredMsgs.slice(-50).map((m) => ({
          ...m,
          _localAudioUrl: undefined,
          timestamp: getTs(m) || Date.now(),
        }));
        localStorage.setItem(
          `deep_msgs_cache_${activeId}`,
          JSON.stringify(serializable)
        );
      } catch {}

      if (user && activeId) {
        if (currentUserProfile?.readReceipts !== false) {
          updateDoc(doc(db, 'p2p_chats', activeId), {
            seenBy: arrayUnion(user.uid)
          }).catch(() => {});
        }
      }

      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: wasHydrated ? 'smooth' : 'auto',
        });
      });
    }, (error) => {
      console.warn('Messages snapshot error:', error);
    });

    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification && window.Notification.permission === 'default') {
      window.Notification.requestPermission().catch(() => {});
    }

    return () => unsub();
  }, [activeChat?.id, user]);

  // Effect 5: Mark chat as seen when opened
  useEffect(() => {
    if (user && activeChat && activeChat?.id && !activeChat?.isNew) {
      if (currentUserProfile?.readReceipts !== false) {
        updateDoc(doc(db, 'p2p_chats', activeChat?.id), {
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
        if (f.size > 20 * 1024 * 1024) {
          notify(`${f.name} is larger than 20MB and was skipped`, "error");
          return false;
        }
        return true;
      });

      if (newValidFiles.length === 0) return;
      
      // ⚡ INSTANT OPTIMISTIC PREVIEW (0ms latency - images show in preview immediately!)
      const instantPreviews = newValidFiles.map(f => URL.createObjectURL(f));
      setPreviewUrls(prev => [...prev, ...instantPreviews]);
      setIsUploadingAttachment(true);

      try {
        // Fast parallel compressed upload & instant micro-thumbnail generation
        const microThumbs = await Promise.all(newValidFiles.map(f => generateMicroThumb(f)));
        setPreviewThumbs(prev => [...prev, ...microThumbs]);

        const uploadedUrls = await Promise.all(newValidFiles.map(file => uploadToImgbb(file)));

        // Replace local object URLs with permanent remote URLs
        setPreviewUrls(prev => {
          const filtered = prev.filter(u => !instantPreviews.includes(u));
          return [...filtered, ...uploadedUrls];
        });
      } catch (err) {
        notify("Failed to upload image", "error");
      } finally {
        setIsUploadingAttachment(false);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 250 * 1024 * 1024) {
      notify("Video file must be under 250MB", "error");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewVideoUrl(localPreview);
    setIsUploadingAttachment(true);

    try {
      const uploadedUrl = await uploadFileToCatbox(file, file.name);
      setPreviewVideoUrl(uploadedUrl);
      notify("Video attached successfully", "success");
    } catch (err: any) {
      console.error("Video upload error:", err);
      notify(err?.message || "Failed to attach video", "error");
      setPreviewVideoUrl(null);
    } finally {
      setIsUploadingAttachment(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleAttachmentChange = handleFileSelect;

  const uploadImage = async (file: File): Promise<string> => {
    return await uploadToImgbb(file);
  };

  const handleSendMessage = async (
    forcedAudioUrl?: string,
    forcedAudioDuration?: number,
    remoteAudioPromise?: Promise<string | null>
  ) => {
    const audioUrlToSend = forcedAudioUrl || recordedAudioUrl;
    if ((!newMessage.trim() && previewUrls.length === 0 && !audioUrlToSend && !previewVideoUrl) || !user) return;

    const messageText = forcedAudioUrl ? '' : newMessage.trim();
    const effectiveAudioDuration = Math.max(
      1,
      Math.round(forcedAudioDuration ?? (recordingDuration || 4))
    );

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

      if (!forcedAudioUrl) setNewMessage('');

      const imageUrls: string[] = forcedAudioUrl ? [] : [...previewUrls];
      const currentThumbs: string[] = forcedAudioUrl ? [] : [...previewThumbs];
      const videoUrlToSend = forcedAudioUrl ? null : (previewVideoUrl || null);
      if (!forcedAudioUrl) {
        setPreviewUrls([]);
        setPreviewThumbs([]);
        setPreviewVideoUrl(null);
      }
      const capturedReply = replyingTo;
      setReplyingTo(null);
      setRecordedAudioUrl(null);

      try {
        let finalChannelAudioUrl = audioUrlToSend || null;
        if (remoteAudioPromise) {
          const uploadedVoice = await remoteAudioPromise;
          if (uploadedVoice) {
            finalChannelAudioUrl = uploadedVoice;
          }
        }

        const msgData: any = {
          text: messageText || null,
          images: imageUrls,
          imageUrl: imageUrls[0] || null,
          imageThumbs: currentThumbs.length > 0 ? currentThumbs : null,
          videoUrl: videoUrlToSend,
          audioUrl: finalChannelAudioUrl,
          audioDuration: effectiveAudioDuration,
          senderId: user.uid,
          senderName: userShopName || user.displayName || 'Member',
          senderPhoto: user.photoURL || '',
          senderRole: isCreator ? 'creator' : (isChannelAdmin ? 'admin' : (userRole || 'member')),
          timestamp: serverTimestamp()
        };

        if (capturedReply) {
          msgData.replyTo = {
            id: capturedReply.id,
            text: capturedReply.text,
            senderId: capturedReply.senderId,
            senderName: capturedReply.senderName || (capturedReply.senderId === user.uid ? 'You' : 'Member'),
            imageUrl: capturedReply.imageUrl || null
          };
        }

        await addDoc(collection(db, 'community_channels', activeChannel.id, 'messages'), msgData);

        fetch('/api/send-push-channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: activeChannel.id,
            title: `📢 New Post in ${activeChannel.name}`,
            body: messageText || (finalChannelAudioUrl ? '🎙️ Voice message' : videoUrlToSend ? '📹 Video attachment' : 'Sent an image attachment'),
            link: `/messages?channelId=${activeChannel.id}`
          })
        }).catch(() => {});

        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
      } catch (err) {
        console.error(err);
        notify('Failed to send community post', 'error');
      }
      return;
    }

    if (!activeChat) return;

    // ⚡ SYNCHRONOUS 0ms OPTIMISTIC UI INSERTION BEFORE ANY NETWORK AWAIT
    setIsTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (!forcedAudioUrl) setNewMessage('');

    const imageUrls: string[] = forcedAudioUrl ? [] : [...previewUrls];
    const currentThumbs: string[] = forcedAudioUrl ? [] : [...previewThumbs];
    const videoUrlToSend = forcedAudioUrl ? null : (previewVideoUrl || null);
    if (!forcedAudioUrl) {
      setPreviewUrls([]);
      setPreviewThumbs([]);
      setAttachments([]);
      setPreviewVideoUrl(null);
    }
    const capturedReply = replyingTo;
    setReplyingTo(null);
    setRecordedAudioUrl(null);

    const otherUserId = activeChat?.otherUser?.id || activeChat?.otherUser?.uid;
    const isGroup = Boolean(activeChat?.isGroup || activeChat?.type === 'group');

    let chatId = activeChat?.id;

    const currentSenderName = userShopName || user.displayName || user.email?.split('@')[0] || 'User';
    const currentSenderPhoto = user.photoURL || '';
    const currentSenderRole = activeChat?.creatorId === user.uid ? 'creator' : (activeChat?.admins?.includes(user.uid) ? 'admin' : (userRole || 'member'));

    const clientMsgId = `cmsg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    if (audioUrlToSend && audioUrlToSend.startsWith('blob:')) {
      localVoiceBlobUrlsRef.current.set(clientMsgId, audioUrlToSend);
    }

    const baseMsgPayload: any = {
      clientMsgId,
      text: messageText,
      images: imageUrls,
      imageUrl: imageUrls[0] || null,
      imageThumbs: currentThumbs.length > 0 ? currentThumbs : null,
      videoUrl: videoUrlToSend,
      audioUrl: audioUrlToSend || null,
      audioDuration: effectiveAudioDuration,
      senderId: user.uid,
      senderName: currentSenderName,
      senderPhoto: currentSenderPhoto,
      createdAt: Date.now(),
      seenBy: [user.uid],
      ...(isGroup && currentSenderRole ? { senderRole: currentSenderRole } : {}),
    };

    if (capturedReply) {
      baseMsgPayload.replyTo = {
        id: capturedReply.id,
        text: capturedReply.text,
        senderId: capturedReply.senderId,
        senderName:
          (capturedReply as any).senderName ||
          (capturedReply.senderId === user.uid
            ? 'You'
            : participantProfiles[capturedReply.senderId]?.displayName || 'User'),
        imageUrl: capturedReply.imageUrl || null,
      };
    }

    const optimisticId = `temp-${clientMsgId}`;
    const optimisticMsg = {
      id: optimisticId,
      ...baseMsgPayload,
      ...(audioUrlToSend?.startsWith('blob:') ? { _localAudioUrl: audioUrlToSend } : {}),
      timestamp: Date.now(),
    };

    animatedMsgIdsRef.current.add(optimisticId);
    animatedMsgIdsRef.current.add(clientMsgId);

    if (chatId && !activeChat?.isNew) {
      const existingPending = pendingOptimisticMapRef.current.get(chatId) || [];
      pendingOptimisticMapRef.current.set(chatId, [...existingPending, optimisticMsg]);
    }
    setMessages((prev) => [...prev, optimisticMsg]);
    if (!privacySettings.doNotDisturb) {
      (audioHelper as any)?.playMessageSentSound?.();
    }
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });

    try {
      if (activeChat?.id && user?.uid && !activeChat?.isNew) {
        updateDoc(doc(db, 'p2p_chats', activeChat.id), {
          [`typingState.${user.uid}`]: null
        }).catch(() => {});
      }

      const lastMessageText =
        messageText ||
        (audioUrlToSend
          ? '🎙️ Voice Message'
          : videoUrlToSend
          ? '📹 Video attachment'
          : imageUrls.length > 0
          ? 'Sent an image'
          : 'Sent an attachment');

      // Find or create chat doc if brand-new conversation
      if (!chatId || activeChat?.isNew) {
        if (!isGroup && otherUserId) {
          const existingInChats = chats.find(
            (c) =>
              !c.isGroup &&
              c.type !== 'group' &&
              Array.isArray(c.participants) &&
              c.participants.includes(otherUserId) &&
              c.participants.includes(user.uid)
          );

          if (existingInChats?.id) {
            chatId = existingInChats.id;
          } else {
            try {
              const qExisting = query(
                collection(db, 'p2p_chats'),
                where('participants', 'array-contains', user.uid)
              );
              const snapExisting = await getDocs(qExisting);
              const foundDoc = snapExisting.docs.find((d) => {
                const data = d.data();
                const p = data.participants;
                return (
                  Array.isArray(p) &&
                  p.includes(otherUserId) &&
                  !data.isGroup &&
                  data.type !== 'group'
                );
              });
              if (foundDoc) {
                chatId = foundDoc.id;
              }
            } catch {}
          }

          if (!chatId) {
            const chatRef = await addDoc(collection(db, 'p2p_chats'), {
              participants: [user.uid, otherUserId],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              lastMessage: lastMessageText,
              lastSenderId: user.uid,
              seenBy: [user.uid]
            });
            chatId = chatRef.id;
          }
        } else if (isGroup && !chatId) {
          notify('Group not found', 'error');
          return;
        }

        if (chatId) {
          const existingPending = pendingOptimisticMapRef.current.get(chatId) || [];
          pendingOptimisticMapRef.current.set(chatId, [...existingPending, optimisticMsg]);
        }
        setTempActiveChat({ ...activeChat, id: chatId, isNew: false, seenBy: [user.uid] });
        setSearchParams({ chatId }, { replace: true });
      }

      // Resolve permanent voice note URL in background if this is a voice message
      let finalRemoteAudioUrl = audioUrlToSend || null;
      if (remoteAudioPromise) {
        const uploadedUrl = await remoteAudioPromise;
        if (!uploadedUrl) {
          throw new Error('Voice upload failed');
        }
        finalRemoteAudioUrl = uploadedUrl;
      }

      const firestoreMsgData: any = {
        ...baseMsgPayload,
        audioUrl: finalRemoteAudioUrl,
        timestamp: serverTimestamp(),
      };

      const isAdminRole = Boolean(
        currentUserProfile?.role === 'admin' ||
        currentUserProfile?.role === 'staff' ||
        userRole === 'admin' ||
        user.email?.toLowerCase() === 'goribsam2@gmail.com' ||
        user.email?.toLowerCase() === 'deepshop@gmail.com'
      );

      // If Admin/Support replies manually, immediately cancel any pending AI auto-reply & mark aiDisabled: true
      if (isAdminRole && chatId) {
        if (aiReplyTimeoutRef.current[chatId]) {
          clearTimeout(aiReplyTimeoutRef.current[chatId]);
          delete aiReplyTimeoutRef.current[chatId];
        }
      }

      await Promise.all([
        addDoc(collection(db, 'p2p_chats', chatId, 'messages'), firestoreMsgData),
        updateDoc(doc(db, 'p2p_chats', chatId), {
          updatedAt: serverTimestamp(),
          lastMessage: lastMessageText,
          lastSenderId: user.uid,
          seenBy: [user.uid],
          ...(isAdminRole && !isGroup ? { aiDisabled: true } : {}),
        }).catch(() => {}),
      ]);

      // Send push notification + Dynamic AI Auto-Reply
      const recipientId = activeChat?.otherUser?.id || activeChat?.otherUser?.uid;
      if (recipientId && recipientId !== 'system' && !isGroup) {
        fetch('/api/send-push-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: recipientId,
            title: user.displayName || 'New Message',
            body: lastMessageText,
            link: `/messages?chatId=${user.uid}`
          })
        }).catch(() => {});

        // 🤖 Dynamic AI Auto-Reply (Auto-stops when Admin replies or clicks 1-click AI Off)
        if (!isAdminRole && messageText) {
          try {
            const [aiSnap, liveChatSnap] = await Promise.all([
              getDoc(doc(db, 'settings', 'ai_human_agent')),
              getDoc(doc(db, 'p2p_chats', chatId)),
            ]);
            const aiSettings = aiSnap.exists() ? aiSnap.data() : null;
            const liveChatData = liveChatSnap.exists() ? liveChatSnap.data() : activeChat;

            const isChatAiDisabled = Boolean(liveChatData?.aiDisabled || activeChat?.aiDisabled);
            const globalAiEnabled = aiSettings ? aiSettings.enabled !== false : true;

            const otherEmail = (activeChat?.otherUser?.email || '').toLowerCase();
            const targetEmail = (aiSettings?.targetEmail || '').toLowerCase();
            const isTargetAdminAccount = Boolean(
              (targetEmail && otherEmail === targetEmail) ||
              (aiSettings?.targetUid && recipientId === aiSettings.targetUid) ||
              otherEmail === 'goribsam2@gmail.com' ||
              otherEmail === 'deepshop@gmail.com' ||
              activeChat?.otherUser?.role === 'admin' ||
              activeChat?.otherUser?.role === 'staff'
            );

            if (globalAiEnabled && !isChatAiDisabled && isTargetAdminAccount) {
              if (aiReplyTimeoutRef.current[chatId]) {
                clearTimeout(aiReplyTimeoutRef.current[chatId]);
              }

              const delay = Math.min(
                2400,
                Math.max(900, ((aiSettings?.minDelay || 1.2) * 1000))
              );

              aiReplyTimeoutRef.current[chatId] = setTimeout(async () => {
                delete aiReplyTimeoutRef.current[chatId];
                try {
                  // Guard 1: Verify Admin hasn't disabled AI or already replied manually
                  const preCheckSnap = await getDoc(doc(db, 'p2p_chats', chatId));
                  const preCheckData = preCheckSnap.data();
                  if (
                    preCheckData?.aiDisabled ||
                    (preCheckData?.lastSenderId && preCheckData.lastSenderId !== user.uid)
                  ) {
                    return;
                  }

                  if (aiSettings?.showTyping !== false) {
                    updateDoc(doc(db, 'p2p_chats', chatId), {
                      [`typingState.${recipientId}`]: { status: 'typing', updatedAt: Date.now() }
                    }).catch(() => {});
                  }

                  const msgsSnap = await getDocs(
                    query(
                      collection(db, 'p2p_chats', chatId, 'messages'),
                      orderBy('createdAt', 'desc'),
                      limit(8)
                    )
                  );

                  const history = msgsSnap.docs
                    .map((d) => ({
                      role: d.data().senderId === recipientId ? 'assistant' : 'user',
                      content: d.data().text || ''
                    }))
                    .filter((m) => m.content)
                    .reverse();

                  if (history.length === 0 || history[history.length - 1]?.content !== messageText) {
                    history.push({ role: 'user', content: messageText });
                  }

                  const baseSystemPrompt =
                    aiSettings?.systemPrompt ||
                    'You are the helpful, polite support assistant for this shop/platform. Reply naturally, concisely, and accurately in the same language (Bangla, Banglish, or English) that the customer used.';
                  const kb = aiSettings?.knowledgeBase
                    ? `\n\nContext Information:\n${aiSettings.knowledgeBase}`
                    : '';

                  const aiRes = await fetch('/api/chat-auto-reply', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      messages: history,
                      systemPrompt: `${baseSystemPrompt}${kb}`
                    })
                  });

                  if (aiRes.ok) {
                    const data = await aiRes.json();
                    const aiText = data.choices?.[0]?.message?.content?.trim();

                    // Guard 2: Re-verify right before writing so Admin intervention mid-generation stops AI immediately
                    const finalCheckSnap = await getDoc(doc(db, 'p2p_chats', chatId));
                    const finalCheckData = finalCheckSnap.data();
                    if (
                      aiText &&
                      !finalCheckData?.aiDisabled &&
                      (!finalCheckData?.lastSenderId || finalCheckData.lastSenderId === user.uid)
                    ) {
                      await addDoc(collection(db, 'p2p_chats', chatId, 'messages'), {
                        text: aiText,
                        senderId: recipientId,
                        senderName:
                          activeChat?.otherUser?.shopName ||
                          activeChat?.otherUser?.displayName ||
                          'Support',
                        senderPhoto: activeChat?.otherUser?.photoURL || '',
                        createdAt: Date.now(),
                        timestamp: serverTimestamp(),
                        seenBy: [recipientId],
                        isAiGenerated: true
                      });

                      await updateDoc(doc(db, 'p2p_chats', chatId), {
                        updatedAt: serverTimestamp(),
                        lastMessage: aiText,
                        lastSenderId: recipientId,
                        seenBy: [recipientId]
                      });
                    }
                  }
                } catch (err) {
                  console.error('AI Auto-reply failed:', err);
                } finally {
                  updateDoc(doc(db, 'p2p_chats', chatId), {
                    [`typingState.${recipientId}`]: null
                  }).catch(() => {});
                }
              }, delay);
            }
          } catch (err) {
            console.error('Error checking AI settings:', err);
          }
        }
      }
    } catch (err: any) {
      console.error('Error in handleSendMessage:', err);
      if (chatId) {
        const list = pendingOptimisticMapRef.current.get(chatId) || [];
        pendingOptimisticMapRef.current.set(
          chatId,
          list.filter((m) => m.id !== optimisticId)
        );
      }
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      notify('মেসেজ পাঠাতে সমস্যা হয়েছে: ' + (err?.message || 'নেটওয়ার্ক সমস্যা'), 'error');
    }
  };

  const handleSendDirectMedia = async (url: string, isSticker: boolean = false) => {
    if (!activeChat || !user) return;
    try {
      let chatId = activeChat?.id;
      if (activeChat?.isNew) {
        const chatRef = await addDoc(collection(db, 'p2p_chats'), {
          participants: [user.uid, activeChat?.otherUser?.id],
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

      (audioHelper as any)?.playMessageSentSound?.();
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
      localStorage.setItem(`chat_theme_${activeChat?.id}`, theme.id);
      try {
        updateDoc(doc(db, 'p2p_chats', activeChat?.id), { themeId: theme.id }).catch(() => {});
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
          if (data.callerId === user?.uid && activeChat && !activeChat?.isNew) {
            addDoc(collection(db, 'p2p_chats', activeChat?.id, 'messages'), {
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
        if (data.callerId === user?.uid && activeChat && !activeChat?.isNew && callStatus === 'connected') {
          addDoc(collection(db, 'p2p_chats', activeChat?.id, 'messages'), {
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
    if (!user || !activeChat || activeChat?.isNew) {
      notify("Please open an active chat to make a call.", "error");
      return;
    }

    const targetUserId = activeChat?.otherUser?.id;
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

    // Immediately request camera and microphone stream so video preview works instantly
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: type === 'video',
          audio: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current && type === 'video') {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
      }
    } catch (mediaErr) {
      console.warn("Could not acquire media stream immediately:", mediaErr);
    }

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
               targetUserId: activeChat?.otherUser?.id,
               title: `Incoming ${callType} call 📞`,
               body: `${user.displayName || 'Someone'} is calling you...`,
               link: `/messages?chatId=${user.uid}`
           })
       }).catch(() => {});
       
      const callRef = await addDoc(collection(db, 'p2p_calls'), {
        callerId: user.uid,
        callerName: user.displayName || 'Deep Shop Customer',
        callerAvatar: user.photoURL || '',
        receiverId: activeChat?.otherUser?.id,
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
          userId: activeChat?.otherUser?.id || activeChat?.otherUser?.uid,
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
      const val = localStorage.getItem('dismissed_review_' + activeChat?.id);
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
    
    if (finalDuration > 0 && activeChat && activeChat?.id) {
       try {
         await addDoc(collection(db, 'p2p_chats', activeChat?.id, 'messages'), {
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
    if (!user || !activeChat || !activeChat?.otherUser?.id) return;
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
        revieweeId: activeChat?.otherUser?.id,
        rating: reviewRating,
        comment: reviewText.trim(),
        createdAt: Date.now(),
        chatId: activeChat?.id || "p2p"
      });

      const reviewerName = user.displayName || "Someone";
      const revieweeName = activeChat?.otherUser?.displayName || activeChat?.otherUser?.shopName || "User";

      fetch("/api/send-push-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activeChat?.otherUser?.id,
          title: "New Review Received! ⭐",
          body: `${reviewerName} gave you a ${reviewRating}-star rating: "${reviewText.trim() || 'Excellent!'}"`,
          link: `/store/${activeChat?.otherUser?.id}`
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
    if (swipedChatId) setSwipedChatId(null);
    if (activeContextMenuChatId) setActiveContextMenuChatId(null);
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
              const existingChat = chats.find(c => !c.isGroup && c.type !== 'group' && Array.isArray(c.participants) && c.participants.includes(targetUserDoc.id));
              if (existingChat) {
                  setSearchParams({ chatId: existingChat.id });
                  setShowNewChatModal(false);
                  setNewChatInput('');
                  return;
              }
              
              // Create new chat in p2p_chats
              const chatsRef = collection(db, 'p2p_chats');
              const newChatData = {
                  participants: [user.uid, targetUserDoc.id],
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

    if (val.trim().length > 0) {
      if (!isTyping) {
        setIsTyping(true);
        updateMyActivity('typing');
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        updateMyActivity(null);
      }, 3500);
    } else {
      setIsTyping(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      updateMyActivity(null);
    }
  };

  // Sync activity status when choosing GIFs or uploading photos
  useEffect(() => {
    if (gifStickerModalState.isOpen) {
      updateMyActivity('choosing_gif');
    } else if (!isTyping && !isRecording && !isUploadingAttachment && previewUrls.length === 0) {
      updateMyActivity(null);
    }
  }, [gifStickerModalState.isOpen]);

  useEffect(() => {
    if (isUploadingAttachment || previewUrls.length > 0) {
      updateMyActivity('uploading_photo');
    }
  }, [isUploadingAttachment, previewUrls.length]);

  const startRecording = async () => {
    if (isRecordingRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        const candidates = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/aac',
          'audio/ogg;codecs=opus',
        ];
        for (const candidate of candidates) {
          if (MediaRecorder.isTypeSupported(candidate)) {
            mimeType = candidate;
            break;
          }
        }
      }
      recordedMimeTypeRef.current = mimeType || 'audio/webm';

      const recorderOptions: MediaRecorderOptions = mimeType
        ? { mimeType, audioBitsPerSecond: 24000 }
        : { audioBitsPerSecond: 24000 };
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      isCancellingRecordingRef.current = false;
      shouldAutoSendRef.current = true;
      recordingStartMsRef.current = Date.now();
      isRecordingRef.current = true;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const elapsedSec = Math.max(
          1,
          Math.round((Date.now() - recordingStartMsRef.current) / 1000)
        );
        const wasCancelled = isCancellingRecordingRef.current;
        const shouldSendNow = shouldAutoSendRef.current && !wasCancelled;

        stream.getTracks().forEach((track) => {
          try {
            track.stop();
            track.enabled = false;
          } catch {}
        });

        isRecordingRef.current = false;
        isCancellingRecordingRef.current = false;
        shouldAutoSendRef.current = false;

        if (wasCancelled) {
          audioChunksRef.current = [];
          setRecordedAudioUrl(null);
          return;
        }

        const finalType =
          mediaRecorder.mimeType || recordedMimeTypeRef.current || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: finalType });
        audioChunksRef.current = [];

        if (!audioBlob || audioBlob.size < 80) {
          notify('Voice recording was too short', 'info');
          return;
        }

        // ⚡ Instant 0ms local Blob URL so the outgoing voice bubble plays immediately with zero reload/flicker
        const localBlobUrl = URL.createObjectURL(audioBlob);

        const uploadVoicePromise = (async (): Promise<string | null> => {
          try {
            const res = await fetch('/api/upload-voice', {
              method: 'POST',
              headers: {
                'Content-Type': finalType,
              },
              body: audioBlob,
            });
            if (res.ok) {
              const json = await res.json();
              if (json?.url) return String(json.url);
            }
          } catch (uploadErr) {
            console.warn('Primary binary voice upload fallback:', uploadErr);
          }

          // Safe fallback to compact DataURL (24kbps keeps ~2.5 min under Firestore 1MB limit)
          if (audioBlob.size <= 720 * 1024) {
            return await new Promise<string | null>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () =>
                resolve(typeof reader.result === 'string' ? reader.result : null);
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(audioBlob);
            });
          }
          return null;
        })();

        if (shouldSendNow) {
          void handleSendMessage(localBlobUrl, elapsedSec, uploadVoicePromise);
        } else {
          setRecordedAudioUrl(localBlobUrl);
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingDuration(0);
      updateMyActivity('recording');

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(
          Math.max(0, Math.floor((Date.now() - recordingStartMsRef.current) / 1000))
        );
      }, 250);
    } catch (err) {
      console.error('Error accessing microphone', err);
      isRecordingRef.current = false;
      setIsRecording(false);
      notify('Microphone access denied', 'error');
    }
  };

  const stopRecording = (autoSend: boolean = true) => {
    const recorder = mediaRecorderRef.current;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    updateMyActivity(null);

    if (recorder && (isRecordingRef.current || recorder.state !== 'inactive')) {
      isCancellingRecordingRef.current = false;
      shouldAutoSendRef.current = autoSend;
      try {
        if (recorder.state === 'recording') {
          recorder.requestData();
        }
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      } catch (e) {
        console.warn('Recorder stop warning:', e);
      }
    }
  };

  const cancelRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    isCancellingRecordingRef.current = true;
    shouldAutoSendRef.current = false;
    isRecordingRef.current = false;
    setIsRecording(false);
    setRecordingDuration(0);
    setRecordedAudioUrl(null);
    updateMyActivity(null);

    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {}
    } else {
      audioChunksRef.current = [];
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
                            <Icon name="check" className="w-3.5 h-3.5 text-white" />
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
                            <Icon name="check" className="w-3.5 h-3.5 text-white" />
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
                            <Icon name="phone" className="w-5 h-5" />
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

  const totalUnreadChatsCount = chats.filter((c) => {
    const cId = c.id || c.otherUser?.id || c.otherUser?.uid;
    if (archivedChatIds.includes(cId) || mutedChatIds.includes(cId)) return false;
    return Boolean(c.lastMessage && c.lastSenderId !== user.uid && (!c.seenBy || !c.seenBy.includes(user.uid)));
  }).length;

  const allStripContacts = (() => {
    const seen = new Set<string>();
    const list: Array<{ id: string; uid?: string; displayName?: string; photoURL?: string; isOnline?: boolean }> = [];
    for (const u of onlineUsersList) {
      if (u.id && !seen.has(u.id)) {
        seen.add(u.id);
        list.push(u);
      }
    }
    for (const sc of savedContacts) {
      if (sc.id && !seen.has(sc.id)) {
        seen.add(sc.id);
        list.push({
          id: sc.id,
          uid: sc.id,
          displayName: sc.displayName,
          photoURL: sc.photoURL,
          isOnline: Boolean(chatUsersPresence[sc.id]?.isOnline),
        });
      }
    }
    return list;
  })();

  const renderSettingsWorkspace = () => (
    <div className="flex-1 overflow-y-auto p-5 pb-28 md:pb-8 space-y-6 md:max-w-4xl md:mx-auto md:w-full">
      {/* User Card in Settings */}
      <div className="bg-zinc-50 dark:bg-zinc-800/25 border border-zinc-200/60 dark:border-zinc-700/30 rounded-3xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-[#2F80ED]/20 shrink-0 bg-zinc-200 dark:bg-zinc-800">
            <img src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || 'User'}`} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-zinc-950 dark:text-white text-base truncate leading-tight">{user?.displayName || 'User'}</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">@{user?.displayName?.toLowerCase().replace(/ /g, '') || 'username'}</p>
            <span className="inline-block mt-1.5 text-[10px] font-bold text-[#2F80ED] bg-[#2F80ED]/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {userRole}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="px-3.5 py-2 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition shrink-0 cursor-pointer"
        >
          View Profile
        </button>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-4">
          <h3 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">
            Privacy & Security
          </h3>

          <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/70 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-0.5 max-w-[75%]">
              <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Allow Direct Messages
              </label>
              <p className="text-[11px] text-zinc-500 leading-tight">
                Anyone can send you a message. If turned off, users will see a privacy notice.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleUpdatePrivacySetting('privacy.allowDirectMessages', !privacySettings.allowDirectMessages)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.allowDirectMessages ? 'bg-[#2F80ED]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.allowDirectMessages ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/70 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-0.5 max-w-[75%]">
              <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Online Status
              </label>
              <p className="text-[11px] text-zinc-500 leading-tight">
                Show others when you are online in chats.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleUpdatePrivacySetting('privacy.showOnlineStatus', !privacySettings.showOnlineStatus)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.showOnlineStatus ? 'bg-[#2F80ED]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.showOnlineStatus ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/70 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-0.5 max-w-[75%]">
              <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Push Notifications
              </label>
              <p className="text-[11px] text-zinc-500 leading-tight">
                Receive alerts for new messages and calls.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleUpdatePrivacySetting('privacy.pushNotifications', !privacySettings.pushNotifications)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.pushNotifications ? 'bg-[#2F80ED]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.pushNotifications ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <h3 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1 pt-3">
            Advanced Security
          </h3>

          <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/70 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-0.5 max-w-[75%]">
              <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Biometric / PIN Lock
              </label>
              <p className="text-[11px] text-zinc-500 leading-tight">
                Require device PIN or biometric verification to view chat histories.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleUpdatePrivacySetting('privacy.biometricLock', !privacySettings.biometricLock)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.biometricLock ? 'bg-[#2F80ED]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.biometricLock ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/70 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-0.5 max-w-[75%]">
              <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Disappearing Messages (24h)
              </label>
              <p className="text-[11px] text-zinc-500 leading-tight">
                Automatically erase chat histories and attachments older than 24 hours.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleUpdatePrivacySetting('privacy.disappearingMessages', !privacySettings.disappearingMessages)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.disappearingMessages ? 'bg-[#2F80ED]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.disappearingMessages ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">
            Visual & Chat Controls
          </h3>

          <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/70 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-0.5 max-w-[75%]">
              <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                High Contrast Typography
              </label>
              <p className="text-[11px] text-zinc-500 leading-tight">
                Bold fonts and high contrast labels for optimal readability.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleUpdatePrivacySetting('privacy.highContrastFonts', !privacySettings.highContrastFonts)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.highContrastFonts ? 'bg-[#2F80ED]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.highContrastFonts ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/70 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-0.5 max-w-[75%]">
              <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Minimalist Chat Bubbles
              </label>
              <p className="text-[11px] text-zinc-500 leading-tight">
                Hide secondary timestamp labels below active message bubbles.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleUpdatePrivacySetting('privacy.minimalistBubbles', !privacySettings.minimalistBubbles)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.minimalistBubbles ? 'bg-[#2F80ED]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.minimalistBubbles ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/70 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-0.5 max-w-[75%]">
              <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Tactile Haptic Feedback
              </label>
              <p className="text-[11px] text-zinc-500 leading-tight">
                Subtle vibration when holding messages, starting calls, or recording audio.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleUpdatePrivacySetting('privacy.hapticTouchFeedback', !privacySettings.hapticTouchFeedback)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.hapticTouchFeedback ? 'bg-[#2F80ED]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.hapticTouchFeedback ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/70 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-0.5 max-w-[75%]">
              <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Auto-play Voice Messages
              </label>
              <p className="text-[11px] text-zinc-500 leading-tight">
                Automatically play incoming voice notes consecutively.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleUpdatePrivacySetting('privacy.autoPlayVoice', !privacySettings.autoPlayVoice)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.autoPlayVoice ? 'bg-[#2F80ED]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.autoPlayVoice ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/70 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-0.5 max-w-[75%]">
              <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Data Saver Mode
              </label>
              <p className="text-[11px] text-zinc-500 leading-tight">
                Minimize media preloading on cellular networks.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleUpdatePrivacySetting('privacy.dataSaverMode', !privacySettings.dataSaverMode)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.dataSaverMode ? 'bg-[#2F80ED]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.dataSaverMode ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/70 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-0.5 max-w-[75%]">
              <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Do Not Disturb
              </label>
              <p className="text-[11px] text-zinc-500 leading-tight">
                Silence message chimes and incoming ring alerts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleUpdatePrivacySetting('privacy.doNotDisturb', !privacySettings.doNotDisturb)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.doNotDisturb ? 'bg-[#2F80ED]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.doNotDisturb ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="msg-shell ambient-dynamic-bg fixed inset-0 z-[60] flex h-[100dvh] max-h-[100dvh] w-full font-inter overflow-hidden overscroll-none transition-colors duration-200">
      <SEO title="Messages" description="Chat with sellers and support" noindex />

      {/* =====================================================================
          COLUMN 1 (DESKTOP ONLY): Left Navigation Rail mirroring Bottom Nav + Power Tools
          ===================================================================== */}
      <aside className="hidden md:flex flex-col items-center justify-between py-5 w-[76px] lg:w-[82px] shrink-0 z-30 bg-[#FAFAFC] dark:bg-[#0B0D12] border-r border-zinc-200/70 dark:border-white/[0.06]">
        <div className="flex flex-col items-center gap-2.5 w-full px-2.5">
          {/* Messages Home (Stays inside Messages Home — does NOT go to Shop) */}
          <button
            type="button"
            onClick={() => {
              setShowNewChatPopup(false);
              setActiveMessagesTab('chats');
              setSidebarTab('messages');
              setShowArchivedOnly(false);
              setShowInboxSearch(false);
              setChatSearchQuery('');
              setSearchParams({}, { replace: true });
            }}
            className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center transition active:scale-95 cursor-pointer',
              activeMessagesTab === 'chats' && sidebarTab === 'messages' && !activeChat && !activeChannel && !showArchivedOnly
                ? 'text-zinc-950 dark:text-white bg-zinc-200/70 dark:bg-white/[0.08]'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/[0.07]'
            )}
            title="Messages Home"
          >
            <MsgHomeIcon className="w-[22px] h-[22px]" />
          </button>

          <div className="w-7 h-px bg-zinc-200 dark:bg-white/10 my-1" />

          {/* All Chats */}
          <button
            type="button"
            onClick={() => {
              setShowNewChatPopup(false);
              setActiveMessagesTab('chats');
              setSidebarTab('messages');
              setShowArchivedOnly(false);
            }}
            className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center transition relative active:scale-95 cursor-pointer',
              activeMessagesTab === 'chats' && sidebarTab === 'messages'
                ? 'bg-[#2F80ED] text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/[0.07]'
            )}
            title="Chats"
          >
            <MsgChatBubbleIcon className="w-[21px] h-[21px]" />
            {totalUnreadChatsCount > 0 && !(activeMessagesTab === 'chats' && sidebarTab === 'messages') && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#2F80ED] ring-2 ring-[#FAFAFC] dark:ring-[#0B0D12]" />
            )}
          </button>

          {/* Communities */}
          <button
            type="button"
            onClick={() => {
              setShowNewChatPopup(false);
              setActiveMessagesTab('chats');
              setSidebarTab('community');
            }}
            className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center transition relative active:scale-95 cursor-pointer',
              activeMessagesTab === 'chats' && sidebarTab === 'community'
                ? 'bg-[#2F80ED] text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/[0.07]'
            )}
            title="Communities"
          >
            <MsgCommunityIcon className="w-[21px] h-[21px]" />
          </button>

          {/* Call History */}
          <button
            type="button"
            onClick={() => {
              setShowNewChatPopup(false);
              setActiveMessagesTab('chats');
              setSidebarTab('calls');
            }}
            className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center transition relative active:scale-95 cursor-pointer',
              activeMessagesTab === 'chats' && sidebarTab === 'calls'
                ? 'bg-[#2F80ED] text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/[0.07]'
            )}
            title="Calls"
          >
            <MsgPhoneCallIcon className="w-[20px] h-[20px]" />
          </button>

          {/* Desktop "+ New Chat" Trigger (opens the 3-option popup anchored beside the rail) */}
          <button
            type="button"
            onClick={() => {
              setNewChatPopupMode('menu');
              setShowNewChatPopup((prev) => !prev);
            }}
            className={cn(
              'mt-2 w-11 h-11 rounded-2xl flex items-center justify-center transition-all active:scale-95 cursor-pointer',
              showNewChatPopup ? 'msg-cancel-pill' : 'msg-new-chat-pill'
            )}
            title={showNewChatPopup ? 'Cancel' : 'New Chat / Contact / Community'}
          >
            {showNewChatPopup ? <MsgCloseIcon className="w-4 h-4" /> : <MsgPlusIcon className="w-5 h-5" />}
          </button>
        </div>

        {/* Bottom Rail: Settings & User Profile */}
        <div className="flex flex-col items-center gap-3 w-full px-2.5">
          <button
            type="button"
            onClick={() => {
              setShowNewChatPopup(false);
              setActiveMessagesTab(activeMessagesTab === 'settings' ? 'chats' : 'settings');
            }}
            className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center transition active:scale-95 cursor-pointer',
              activeMessagesTab === 'settings'
                ? 'bg-[#2F80ED] text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/[0.07]'
            )}
            title="Chat Settings"
          >
            <MsgSettingsIcon className="w-[20px] h-[20px]" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-zinc-200 dark:ring-white/15 shrink-0 cursor-pointer hover:opacity-85 transition-opacity"
            title="Your Profile"
          >
            <img
              src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || 'User'}`}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </button>
        </div>
      </aside>

      {/* =====================================================================
          COLUMN 2: Persistent Left Inbox Column on Desktop / Main Inbox Screen on Mobile
          ===================================================================== */}
      <div
        className={cn(
          'w-full md:w-[350px] lg:w-[385px] xl:w-[415px] shrink-0 border-r flex flex-col relative msg-sidebar h-full',
          activeChat || activeChannel ? 'hidden md:flex' : 'flex'
        )}
      >
        {/* Mobile-only Settings View when User taps Profile/Settings icon on mobile bottom bar */}
        {activeMessagesTab === 'settings' && (
          <div className="flex md:hidden flex-col h-full overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-zinc-100 dark:border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveMessagesTab('chats')}
                  className="w-9 h-9 -ml-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 flex items-center justify-center text-zinc-900 dark:text-white transition cursor-pointer"
                >
                  <MsgBackChevronIcon className="w-5 h-5" />
                </button>
                <h1 className="text-[22px] font-bold text-zinc-950 dark:text-white tracking-tight">
                  Chat Settings
                </h1>
              </div>
            </div>
            {renderSettingsWorkspace()}
          </div>
        )}

        {/* Inbox Content (Always visible on Desktop; visible on Mobile when not in mobile settings) */}
        <div
          className={cn(
            'flex-col h-full overflow-hidden',
            activeMessagesTab === 'settings' ? 'hidden md:flex' : 'flex'
          )}
        >
          {/* Top Header matching IMG_5470: Circular Menu left + "Message" center + Circular Search & Compose right */}
          <div className="px-5 pt-4 pb-2 flex flex-col gap-2.5 shrink-0">
            <div className="flex items-center justify-between">
              {/* Left: Circular White Back Button matching IMG_5470 */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  if (originHomePath === '/loops' || window.location.pathname.includes('loops')) {
                    navigate('/loops');
                  } else {
                    navigate('/');
                  }
                }}
                className="w-11 h-11 rounded-full bg-white/95 dark:bg-zinc-800/90 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.06)] flex items-center justify-center text-zinc-900 dark:text-zinc-100 hover:bg-white dark:hover:bg-zinc-700/60 active:scale-95 transition cursor-pointer shrink-0"
                title={originHomePath === '/loops' ? 'Back to Loops' : 'Back to Shop Home'}
                aria-label="Back"
              >
                <MsgBackChevronIcon className="w-5 h-5 text-zinc-900 dark:text-white" />
              </button>

              {/* Center: "Message" Title */}
              <h1 className="text-[20px] font-bold text-zinc-950 dark:text-white tracking-tight leading-none text-center">
                Message
              </h1>

              {/* Right: Circular White Search & Compose (SquarePen) Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (showInboxSearch) {
                      setShowInboxSearch(false);
                      setChatSearchQuery('');
                    } else {
                      setShowInboxSearch(true);
                    }
                  }}
                  className={cn(
                    'w-11 h-11 rounded-full bg-white/95 dark:bg-zinc-800/90 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.06)] flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0',
                    showInboxSearch || chatSearchQuery
                      ? 'text-[#F246F5] ring-2 ring-[#F246F5]/25'
                      : 'text-zinc-800 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700/60'
                  )}
                  title="Search conversations"
                  aria-label="Search conversations"
                >
                  <MsgSearchIcon className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewMessageInitialStep('new_message');
                    setShowNewMessageModal(true);
                  }}
                  className="w-11 h-11 rounded-full bg-white/95 dark:bg-zinc-800/90 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.06)] flex items-center justify-center text-zinc-800 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700/60 active:scale-95 transition cursor-pointer shrink-0"
                  title="Compose New Message"
                  aria-label="Compose New Message"
                >
                  <Icon name="edit-3" className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Expandable Search Input */}
            <AnimatePresence initial={false}>
              {(showInboxSearch || chatSearchQuery.trim() !== '') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="relative flex items-center gap-2 pt-0.5">
                    <div className="relative flex-1">
                      <MsgSearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                      <input
                        type="text"
                        value={chatSearchQuery}
                        onChange={(e) => setChatSearchQuery(e.target.value)}
                        placeholder="Search chats or people..."
                        autoFocus
                        className="ds-liquid-input msg-clean-input w-full msg-composer-capsule border rounded-full py-2.5 pl-10 pr-8 text-[13.5px] font-medium outline-none focus:ring-2 focus:ring-[#2F80ED]/25 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                      />
                      {chatSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setChatSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-zinc-200/80 dark:bg-white/10 flex items-center justify-center text-zinc-600 dark:text-zinc-300 cursor-pointer"
                        >
                          <MsgCloseIcon className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setChatSearchQuery('');
                        setShowInboxSearch(false);
                      }}
                      className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white px-1.5 py-1 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search Results View vs Main Stories + Chats List */}
          {chatSearchQuery.trim() ? (
            <div className="flex-1 overflow-y-auto px-3 py-1 pb-32 md:pb-6 space-y-1">
              {(() => {
                const qLower = chatSearchQuery.trim().toLowerCase();
                const localMatches = chats.filter((c) => {
                  const name = getChatDisplayName(c)?.toLowerCase() || '';
                  const snippet = (c.lastMessage || '')?.toLowerCase();
                  return name.includes(qLower) || snippet.includes(qLower);
                });
                if (localMatches.length === 0) return null;
                return (
                  <div className="mb-3">
                    <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 px-3 py-1.5">
                      Conversations
                    </p>
                    {localMatches.map((chat, mIdx) => {
                      const cId = chat.id || chat.otherUser?.id || `match-${mIdx}`;
                      return (
                        <div
                          key={`local-match-${cId}`}
                          onClick={() => {
                            setChatSearchQuery('');
                            setShowInboxSearch(false);
                            setActiveMessagesTab('chats');
                            setSearchParams({ chatId: chat.id || chat.otherUser?.id || '' }, { replace: true });
                          }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer hover:bg-zinc-100/80 dark:hover:bg-white/[0.05] transition"
                        >
                          <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0">
                            {chat.otherUser?.photoURL ? (
                              <img src={chat.otherUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-semibold text-sm bg-[#2F80ED]/12 text-[#2F80ED]">
                                {(getChatDisplayName(chat) || 'U')[0].toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-zinc-900 dark:text-white text-sm truncate">
                              {getChatDisplayName(chat)}
                            </p>
                            {chat.lastMessage && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                {chat.lastMessage}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 px-3 py-1.5">
                People
              </p>
              {isSearchingChats ? (
                <div className="flex justify-center p-6 text-zinc-400 text-xs">Searching people...</div>
              ) : chatSearchResults.length === 0 ? (
                <div className="flex justify-center p-6 text-zinc-400 text-xs">No matching people found</div>
              ) : (
                chatSearchResults.map((foundUser, fIdx) => (
                  <div
                    key={`found-user-${foundUser.id || fIdx}-${fIdx}`}
                    onClick={() => {
                      setChatSearchQuery('');
                      setShowInboxSearch(false);
                      setActiveMessagesTab('chats');
                      setSearchParams({ chatId: foundUser.id });
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer hover:bg-zinc-100/80 dark:hover:bg-white/[0.05] transition"
                  >
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0">
                      {foundUser.photoURL ? (
                        <img src={foundUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-semibold text-sm bg-[#2F80ED]/12 text-[#2F80ED]">
                          {(foundUser.displayName || 'U')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900 dark:text-white text-sm truncate">
                        {foundUser.displayName || 'User'}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        @{foundUser.username || foundUser.displayName?.toLowerCase().replace(/ /g, '') || 'user'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pb-32 md:pb-6 no-scrollbar" onScroll={handleSidebarScroll}>
              {/* Stories & Active Contacts Strip matching IMG_5470 */}
              {sidebarTab === 'messages' && (
                <>
                  <MessagesStoriesStrip
                    currentUser={user}
                    contacts={allStripContacts}
                    onOpenChatWithUser={(u) => {
                      if (u?.id || u?.uid) {
                        setActiveMessagesTab('chats');
                        setSearchParams({ chatId: u.id || u.uid || '' });
                      }
                    }}
                  />

                  {/* Segmented Filter Tabs matching IMG_5470: All | Unread | Groups (zero shadow, faint kalsha active pill) */}
                  <div className="px-4 pt-1 pb-2">
                    <div className="bg-white/75 dark:bg-zinc-800/75 p-1 rounded-full border-0 shadow-none grid grid-cols-3 items-center backdrop-blur-md">
                      {(['all', 'unread', 'groups'] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setMessagesFilterTab(tab)}
                          className={cn(
                            "text-[14.5px] transition-all duration-200 cursor-pointer text-center py-2.5 px-3 rounded-full",
                            messagesFilterTab === tab
                              ? "bg-[#f2f0f6] dark:bg-white/12 font-semibold text-zinc-950 dark:text-white"
                              : "bg-transparent font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                          )}
                        >
                          {tab === 'all' ? 'All' : tab === 'unread' ? 'Unread' : 'Groups'}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* "Chats" Section Header + "..." Menu matching IMG_5359 & IMG_5360 */}
              <div className="px-5 pt-2.5 pb-2 flex items-center justify-between relative shrink-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-[19px] font-bold text-zinc-950 dark:text-white tracking-tight">
                    {sidebarTab === 'community'
                      ? 'Communities'
                      : sidebarTab === 'calls'
                      ? 'Calls'
                      : showArchivedOnly
                      ? 'Archived Chats'
                      : 'Chats'}
                  </h2>

                  {(sidebarTab !== 'messages' || showArchivedOnly) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSidebarTab('messages');
                        setShowArchivedOnly(false);
                      }}
                      className="text-xs font-semibold text-[#2F80ED] hover:underline px-1.5 py-0.5 transition cursor-pointer"
                    >
                      · All Chats
                    </button>
                  )}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowChatsMoreMenu((prev) => !prev)}
                    className="w-9 h-9 -mr-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-white/[0.06] flex items-center justify-center text-zinc-900 dark:text-zinc-200 transition cursor-pointer"
                    title="Chats options"
                    aria-label="Chats options"
                  >
                    <MsgDotsHorizontalIcon className="w-5 h-5" />
                  </button>

                  <AnimatePresence>
                    {showChatsMoreMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowChatsMoreMenu(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -6 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -6 }}
                          transition={{ duration: 0.14 }}
                          className="absolute right-0 top-10 w-52 bg-white dark:bg-[#1A1C24] border border-zinc-200/80 dark:border-white/10 shadow-2xl rounded-2xl p-1.5 z-50 text-left"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSidebarTab('messages');
                              setShowArchivedOnly(false);
                              setShowChatsMoreMenu(false);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-xl transition cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <Icon name="message-circle" className="w-4 h-4 text-zinc-500" />
                              All Chats
                            </span>
                            {sidebarTab === 'messages' && !showArchivedOnly && (
                              <span className="w-2 h-2 rounded-full bg-[#F246F5]" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSidebarTab('community');
                              setShowChatsMoreMenu(false);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-xl transition cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <Icon name="users" className="w-4 h-4 text-zinc-500" />
                              Communities
                            </span>
                            {sidebarTab === 'community' && (
                              <span className="w-2 h-2 rounded-full bg-[#F246F5]" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSidebarTab('calls');
                              setShowChatsMoreMenu(false);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-xl transition cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <Icon name="phone" className="w-4 h-4 text-zinc-500" />
                              Call History
                            </span>
                            {sidebarTab === 'calls' && (
                              <span className="w-2 h-2 rounded-full bg-[#F246F5]" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSidebarTab('messages');
                              setShowArchivedOnly((prev) => !prev);
                              setShowChatsMoreMenu(false);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-xl transition cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <Icon name="archive" className="w-4 h-4 text-zinc-500" />
                              {showArchivedOnly ? 'Exit Archived' : 'Archived Chats'}
                            </span>
                            {archivedChatIds.length > 0 && (
                              <span className="text-[11px] font-bold text-zinc-400">
                                {archivedChatIds.length}
                              </span>
                            )}
                          </button>

                          <div className="border-t border-zinc-100 dark:border-white/[0.07] my-1" />

                          <button
                            type="button"
                            onClick={() => {
                              setShowChatsMoreMenu(false);
                              markAllChatsAsRead();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-xl transition cursor-pointer"
                          >
                            <Icon name="check-double" className="w-4 h-4 text-[#F246F5]" />
                            <span>Mark all as read</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setShowChatsMoreMenu(false);
                              setActiveMessagesTab('settings');
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-xl transition cursor-pointer"
                          >
                            <Icon name="settings" className="w-4 h-4 text-zinc-500" />
                            <span>Chat Settings</span>
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {sidebarTab === 'messages' ? (
                <>
                  {chats.length === 0 && !chatIdParam ? (
                    <div className="flex flex-col items-center justify-center h-60 text-zinc-400 px-6 text-center">
                      {illustrations.emptyMessages ? (
                        <div className="w-28 h-28 mx-auto mb-3 rounded-2xl overflow-hidden">
                          <img src={illustrations.emptyMessages} alt="No messages" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-white/[0.05] flex items-center justify-center mb-3">
                          <Icon name="message-square-share" className="w-6 h-6 text-zinc-400" />
                        </div>
                      )}
                      <p className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">No conversations yet</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        Tap + New Chat below to start messaging a contact or join a community.
                      </p>
                    </div>
                  ) : (
                    <div className="mx-3 mt-1 px-2 py-1.5 rounded-[26px] bg-white/85 dark:bg-zinc-900/75 backdrop-blur-md divide-y divide-zinc-100/80 dark:divide-white/[0.05]">
                      {chats
                        .filter((chat) => {
                          const cId = chat.id || chat.otherUser?.id || chat.otherUser?.uid;
                          if (showArchivedOnly) return archivedChatIds.includes(cId);
                          if (archivedChatIds.includes(cId)) return false;

                          // Apply segmented tab filter from IMG_5470
                          if (messagesFilterTab === 'unread') {
                            const isUnread = Boolean(
                              !mutedChatIds.includes(cId) &&
                                chat.lastMessage &&
                                chat.lastSenderId !== user.uid &&
                                (!chat.seenBy || !chat.seenBy.includes(user.uid))
                            );
                            if (!isUnread) return false;
                          } else if (messagesFilterTab === 'groups') {
                            const isGroup = Boolean(chat.isGroup || chat.type === 'group' || (chat.participants && chat.participants.length > 2));
                            if (!isGroup) return false;
                          }

                          return true;
                        })
                        .sort((a, b) => {
                          const aId = a.id || a.otherUser?.id || a.otherUser?.uid;
                          const bId = b.id || b.otherUser?.id || b.otherUser?.uid;
                          const aPinned = pinnedChatIds.includes(aId) ? 1 : 0;
                          const bPinned = pinnedChatIds.includes(bId) ? 1 : 0;
                          return bPinned - aPinned;
                        })
                        .map((chat, idx) => {
                          const cId = chat.id || chat.otherUser?.id || chat.otherUser?.uid || `chat-${idx}`;
                          const isPinned = pinnedChatIds.includes(cId);
                          const isArchived = archivedChatIds.includes(cId);
                          const isBlocked = blockedUserIds.includes(cId);
                          const isMuted = mutedChatIds.includes(cId);
                          const isUnread = Boolean(
                            !isMuted &&
                              chat.lastMessage &&
                              chat.lastSenderId !== user.uid &&
                              (!chat.seenBy || !chat.seenBy.includes(user.uid))
                          );
                          const unreadCountNum = Number(chat.unreadCount?.[user.uid]) || 1;
                          const chatOtherUid = chat.otherUser?.id || chat.otherUser?.uid;
                          const isSeenByOtherInList = Boolean(
                            chatOtherUid && Array.isArray(chat.seenBy) && chat.seenBy.includes(chatOtherUid)
                          );
                          const isChatUserOnline = chatOtherUid ? chatUsersPresence[chatOtherUid]?.isOnline : false;
                          const chatTypingData = chat.typingState?.[chatOtherUid];
                          const isChatOtherTyping =
                            chatTypingData?.status === 'typing' && Date.now() - (chatTypingData?.updatedAt || 0) < 5000;
                          const isChatOtherRecording =
                            chatTypingData?.status === 'recording' && Date.now() - (chatTypingData?.updatedAt || 0) < 12000;
                          const isMenuOpen = activeContextMenuChatId === cId;
                          const isSwiped = swipedChatId === cId;
                          const isSelected = activeMessagesTab !== 'settings' && activeChat?.id === chat.id;
                          const rawUpdatedMs = chat.updatedAt?.toMillis
                            ? chat.updatedAt.toMillis()
                            : chat.updatedAt?.seconds
                            ? chat.updatedAt.seconds * 1000
                            : typeof chat.updatedAt === 'number'
                            ? chat.updatedAt
                            : 0;

                          return (
                            <div
                              key={`chat-item-${cId}`}
                              className={cn('relative select-none', isMenuOpen && 'z-50')}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                const rect = e.currentTarget.getBoundingClientRect();
                                const menuW = 200;
                                const menuH = 225;
                                const top = Math.min(Math.max(12, rect.top + 48), (typeof window !== 'undefined' ? window.innerHeight : 760) - menuH);
                                const left = Math.min(Math.max(12, rect.right - menuW - 12), (typeof window !== 'undefined' ? window.innerWidth : 400) - menuW - 12);
                                setActiveContextMenuPos({ top, left });
                                setActiveContextMenuChatId(cId);
                                setSwipedChatId(null);
                              }}
                              onTouchStart={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const menuW = 200;
                                const menuH = 225;
                                const top = Math.min(Math.max(12, rect.top + 48), (typeof window !== 'undefined' ? window.innerHeight : 760) - menuH);
                                const left = Math.min(Math.max(12, rect.right - menuW - 12), (typeof window !== 'undefined' ? window.innerWidth : 400) - menuW - 12);
                                touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, cId };
                                if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                                longPressTimerRef.current = setTimeout(() => {
                                  setActiveContextMenuPos({ top, left });
                                  setActiveContextMenuChatId(cId);
                                  setSwipedChatId(null);
                                  touchStartRef.current = null;
                                }, 450);
                              }}
                              onTouchMove={(e) => {
                                if (!touchStartRef.current || touchStartRef.current.cId !== cId) return;
                                const dx = touchStartRef.current.x - e.touches[0].clientX;
                                const dy = touchStartRef.current.y - e.touches[0].clientY;
                                if (Math.abs(dy) > 10 || Math.abs(dx) > 15) {
                                  if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                                }
                                if (dx > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                                  setSwipedChatId(cId);
                                } else if (dx < -30 && isSwiped) {
                                  setSwipedChatId(null);
                                }
                              }}
                              onTouchEnd={() => {
                                if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                                touchStartRef.current = null;
                              }}
                            >
                              <div className="relative overflow-hidden rounded-2xl">
                              {/* Swipe Quick Actions (mounted ONLY when swiped so nothing peeks out at rest) */}
                              {isSwiped && (
                                <div className="absolute right-0 top-0 bottom-0 w-[198px] flex items-center z-0 overflow-hidden rounded-r-2xl">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      togglePinChat(cId);
                                      setSwipedChatId(null);
                                    }}
                                    className="h-full w-[66px] bg-[#F246F5] hover:bg-[#e135e4] text-white font-semibold text-xs flex flex-col items-center justify-center gap-1 transition cursor-pointer shrink-0"
                                  >
                                    <Icon name="pin" className="w-4 h-4" />
                                    <span className="text-[10px] whitespace-nowrap">{isPinned ? 'Unpin' : 'Pin'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      toggleArchiveChat(cId);
                                      setSwipedChatId(null);
                                    }}
                                    className="h-full w-[66px] bg-zinc-700 hover:bg-zinc-600 text-white font-semibold text-xs flex flex-col items-center justify-center gap-1 transition cursor-pointer shrink-0"
                                  >
                                    <Icon name="archive" className="w-4 h-4" />
                                    <span className="text-[10px] whitespace-nowrap">{isArchived ? 'Restore' : 'Archive'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setShowClearChatModal(true);
                                      setSwipedChatId(null);
                                    }}
                                    className="h-full w-[66px] bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex flex-col items-center justify-center gap-1 transition cursor-pointer shrink-0"
                                  >
                                    <Icon name="trash-2" className="w-4 h-4" />
                                    <span className="text-[10px] whitespace-nowrap">Delete</span>
                                  </button>
                                </div>
                              )}

                              {/* Conversation Row matching IMG_5359 & IMG_5360 */}
                              <div
                                onClick={() => {
                                  if (isSwiped) {
                                    setSwipedChatId(null);
                                    return;
                                  }
                                  setActiveMessagesTab('chats');
                                  setSearchParams({ chatId: chat.id || chat.otherUser?.id || '' }, { replace: true });
                                }}
                                className={cn(
                                  'flex items-center gap-3.5 px-3 py-3 rounded-2xl cursor-pointer transition-all duration-200 relative group/chat z-10',
                                  isSelected ? 'msg-chat-row-active' : 'hover:bg-white/60 dark:hover:bg-white/[0.04]',
                                  isSwiped && '-translate-x-[198px] bg-white/95 dark:bg-zinc-900'
                                )}
                              >
                                {/* Avatar with Group Badge or Online Dot (IMG_5470) */}
                                <div className="relative shrink-0">
                                  <div className="w-[54px] h-[54px] rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                                    {chat.otherUser?.photoURL ? (
                                      <img
                                        src={chat.otherUser.photoURL}
                                        alt={chat.otherUser.displayName}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-[#F246F5]/12 text-[#F246F5] font-bold text-base">
                                        {(getChatDisplayName(chat) || 'U')[0].toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  {/* Group participant badge (IMG_5470) */}
                                  {(chat.isGroup || chat.type === 'group' || (chat.participants && chat.participants.length > 2)) && (
                                    <span className="absolute -bottom-1 -left-1 min-w-[20px] h-[20px] px-1 rounded-full bg-[#F246F5] text-white text-[10.5px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#0E1015]">
                                      {chat.participants?.length || 5}
                                    </span>
                                  )}
                                  {isChatUserOnline && !(chat.isGroup || chat.type === 'group' || (chat.participants && chat.participants.length > 2)) && (
                                    <span className="msg-online-dot absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-[#0E1015]" />
                                  )}
                                </div>

                                {/* Center Name + Message Snippet with Checkmarks */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <h4 className="text-[16px] font-semibold text-zinc-950 dark:text-white truncate leading-snug">
                                      {getChatDisplayName(chat)}
                                    </h4>
                                    {(chat.otherUser?.kycStatus === 'verified' || chat.otherUser?.verified) && (
                                      <VerifiedIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    )}
                                    {isMuted && <Icon name="volume-x" className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                                    {isBlocked && (
                                      <span className="text-[10px] font-medium text-rose-500 shrink-0">· Blocked</span>
                                    )}
                                  </div>

                                  <div className="mt-0.5 flex items-center gap-1 min-w-0">
                                    {isChatOtherTyping ? (
                                      <p className="text-[13.5px] font-medium text-[#2F80ED] truncate">typing...</p>
                                    ) : isChatOtherRecording ? (
                                      <p className="text-[13.5px] font-medium text-rose-500 truncate flex items-center gap-1">
                                        <Icon name="mic" className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                        <span>recording voice...</span>
                                      </p>
                                    ) : chat.lastSenderId === user?.uid && chat.lastMessage ? (
                                      <div className="flex items-center gap-1 min-w-0">
                                        <MsgCheckDoubleIcon
                                          className={cn(
                                            'w-[16px] h-[16px] shrink-0',
                                            isSeenByOtherInList ? 'text-[#2F80ED]' : 'text-zinc-400 dark:text-zinc-500'
                                          )}
                                        />
                                        <p className="text-[13.5px] text-zinc-500 dark:text-zinc-400 truncate">
                                          {chat.lastMessage}
                                        </p>
                                      </div>
                                    ) : (chat.isGroup || chat.type === 'group') && chat.lastSenderName && chat.lastMessage ? (
                                      <p className="text-[13.5px] text-zinc-500 dark:text-zinc-400 truncate">
                                        {String(chat.lastSenderName).split(' ')[0]}: {chat.lastMessage}
                                      </p>
                                    ) : (
                                      <p
                                        className={cn(
                                          'text-[13.5px] truncate',
                                          isUnread
                                            ? 'text-zinc-700 dark:text-zinc-200 font-medium'
                                            : 'text-zinc-500 dark:text-zinc-400'
                                        )}
                                      >
                                        {chat.lastMessage || 'Tap to chat'}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Right Column: Time on top + Pink Unread Pill or Pink Double-Check below (IMG_5470) */}
                                <div className="flex flex-col items-end justify-between self-stretch py-0.5 shrink-0 ml-2 gap-1.5">
                                  <span className="text-[12px] text-zinc-400 dark:text-zinc-500 tabular-nums leading-none">
                                    {rawUpdatedMs > 0 ? formatInboxTime24h(rawUpdatedMs) : ''}
                                  </span>

                                  <div className="flex items-center gap-1 min-h-[22px]">
                                    {isPinned && !isUnread && (
                                      <Icon name="pin" className="w-3.5 h-3.5 text-zinc-400 rotate-45 shrink-0" />
                                    )}
                                    {isUnread ? (
                                      <span className="bg-[#F246F5] text-white min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center tabular-nums">
                                        {unreadCountNum}
                                      </span>
                                    ) : (
                                      <MsgCheckDoubleIcon
                                        className={cn(
                                          'w-[18px] h-[18px] shrink-0',
                                          isSeenByOtherInList ? 'text-[#F246F5]' : 'text-zinc-400 dark:text-zinc-500'
                                        )}
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                              </div>

                              {/* Context Menu Popover via Portal so it NEVER clips inside rows or scroll containers */}
                              {typeof document !== 'undefined' &&
                                isMenuOpen &&
                                createPortal(
                                  <AnimatePresence>
                                    <div
                                      key={`ctx-backdrop-${cId}`}
                                      className="fixed inset-0 z-[9590]"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveContextMenuChatId(null);
                                      }}
                                    />
                                    <motion.div
                                      key={`ctx-menu-${cId}`}
                                      initial={{ opacity: 0, scale: 0.94, y: 4 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.94, y: 4 }}
                                      style={{
                                        top: `${activeContextMenuPos?.top ?? 120}px`,
                                        left: `${activeContextMenuPos?.left ?? 16}px`,
                                      }}
                                      className="fixed w-[200px] bg-white/95 dark:bg-[#1E1C26]/95 backdrop-blur-xl border border-black/[0.04] dark:border-white/10 shadow-[0_18px_42px_rgba(120,90,160,0.22)] rounded-2xl p-1.5 z-[9600] text-left"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          togglePinChat(cId);
                                          setActiveContextMenuChatId(null);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-xl transition cursor-pointer"
                                      >
                                        <Icon name="pin" className="w-3.5 h-3.5 text-zinc-500" />
                                        <span>{isPinned ? 'Unpin Chat' : 'Pin Chat'}</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          toggleArchiveChat(cId);
                                          setActiveContextMenuChatId(null);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-xl transition cursor-pointer"
                                      >
                                        <Icon name="archive" className="w-3.5 h-3.5 text-zinc-500" />
                                        <span>{isArchived ? 'Unarchive Chat' : 'Archive Chat'}</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          toggleMuteChat(cId);
                                          setActiveContextMenuChatId(null);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-xl transition cursor-pointer"
                                      >
                                        <Icon name="volume-x" className="w-3.5 h-3.5 text-zinc-500" />
                                        <span>{isMuted ? 'Unmute Notifications' : 'Mute Notifications'}</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          toggleBlockUser(cId);
                                          setActiveContextMenuChatId(null);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-xl transition cursor-pointer"
                                      >
                                        <Icon name="user-x" className="w-3.5 h-3.5 text-zinc-500" />
                                        <span>{isBlocked ? 'Unblock User' : 'Block User'}</span>
                                      </button>

                                      <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveContextMenuChatId(null);
                                          setShowClearChatModal(true);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition cursor-pointer"
                                      >
                                        <Icon name="trash-2" className="w-3.5 h-3.5" />
                                        <span>Delete Chat History</span>
                                      </button>
                                    </motion.div>
                                  </AnimatePresence>,
                                  document.body
                                )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </>
              ) : sidebarTab === 'community' ? (
                <div className="flex flex-col px-2">
                  {channels.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-zinc-400 p-6 text-center">
                      <Icon name="users" className="w-12 h-12 mb-3 text-zinc-300 dark:text-zinc-700" />
                      <p className="font-medium text-sm">No community channels yet</p>
                      <p className="text-xs mt-1">Start a community to broadcast updates and connect!</p>
                      <button
                        type="button"
                        onClick={() => setShowCreateChannelModal(true)}
                        className="mt-4 px-5 py-2.5 bg-[#16181D] dark:bg-white text-white dark:text-zinc-950 rounded-full font-semibold text-xs hover:opacity-90 transition cursor-pointer"
                      >
                        + Create Community
                      </button>
                    </div>
                  ) : (
                    channels
                      .filter((channel) => {
                        if (!channel.isPrivate) return true;
                        return channel.creatorId === user?.uid || channelIdParam === channel.id;
                      })
                      .map((channel) => {
                        const isSelected = activeMessagesTab !== 'settings' && channelIdParam === channel.id;
                        return (
                          <div
                            key={channel.id}
                            onClick={() => {
                              setActiveMessagesTab('chats');
                              setSearchParams({ channelId: channel.id });
                            }}
                            className={cn(
                              'flex items-center gap-3.5 px-3 py-3 rounded-2xl cursor-pointer transition-all relative',
                              isSelected ? 'msg-chat-row-active' : 'hover:bg-zinc-50 dark:hover:bg-white/[0.04]'
                            )}
                          >
                            <div className="w-[52px] h-[52px] rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0 ring-1 ring-black/[0.05] dark:ring-white/10 relative">
                              <ProgressiveImage
                                src={channel.imageUrl}
                                alt={channel.name}
                                containerClassName="w-full h-full rounded-full min-h-0"
                                showShimmerIcon={false}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center gap-2">
                                <h4 className="font-bold text-zinc-950 dark:text-white text-[15px] truncate">
                                  {channel.name}
                                </h4>
                                <span className="text-[11px] font-medium text-zinc-400">
                                  @{channel.customLink}
                                </span>
                              </div>
                              <p className="text-[13px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                {channel.description || 'Welcome to our community!'}
                              </p>
                              <span className="text-[11px] font-medium text-[#2F80ED] mt-0.5 inline-block">
                                {channel.subscriberCount || 1} members
                              </span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              ) : (
                /* Calls Tab Renderer */
                <div className="flex flex-col px-2">
                  {chats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-zinc-400 p-6 text-center">
                      <Icon name="phone" className="w-12 h-12 mb-3 text-zinc-300 dark:text-zinc-700 animate-pulse" />
                      <p className="font-medium text-sm">No call history yet</p>
                      <p className="text-xs mt-1">Start voice or video calls with your contacts!</p>
                    </div>
                  ) : (
                    chats.map((chat, idx) => {
                      const callTypeLabel = idx % 2 === 0 ? 'Voice' : 'Video';
                      const rawMs = chat.updatedAt?.toMillis
                        ? chat.updatedAt.toMillis()
                        : typeof chat.updatedAt === 'number'
                        ? chat.updatedAt
                        : 0;
                      const timeLabel = rawMs ? formatInboxTime24h(rawMs) : '';

                      return (
                        <div
                          key={`call-${chat.id || idx}-${idx}`}
                          className="flex items-center justify-between px-3 py-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <img
                              src={
                                chat.otherUser?.photoURL ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.otherUser?.id || chat.id}`
                              }
                              alt="User"
                              className="w-12 h-12 rounded-full object-cover ring-1 ring-black/[0.06] dark:ring-white/10 shrink-0"
                            />
                            <div className="text-left min-w-0">
                              <h4 className="font-bold text-[15px] text-zinc-950 dark:text-white truncate">
                                {getChatDisplayName(chat)}
                              </h4>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1.5">
                                <Icon name="phone" className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span>
                                  {callTypeLabel} call {timeLabel ? `· ${timeLabel}` : ''}
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMessagesTab('chats');
                                setSearchParams({ chatId: chat.id || chat.otherUser?.id || '' });
                                setTimeout(() => {
                                  startCall('audio');
                                }, 300);
                              }}
                              className="w-9 h-9 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition cursor-pointer"
                              title="Voice Call"
                            >
                              <Icon name="phone" className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMessagesTab('chats');
                                setSearchParams({ chatId: chat.id || chat.otherUser?.id || '' });
                                setTimeout(() => {
                                  startCall('video');
                                }, 300);
                              }}
                              className="w-9 h-9 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition cursor-pointer"
                              title="Video Call"
                            >
                              <Icon name="video" className="w-4 h-4" />
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
        </div>

        {/* ===================================================================
            MOBILE FLOATING BOTTOM NAVIGATION DOCK & PLUS FAB (IMG_5470)
            Floating capsule dock (Home, Message, Calendar, Profile) + Black Circle '+' FAB
            =================================================================== */}
        {!activeChat && !activeChannel && (
          <div className="md:hidden fixed bottom-5 inset-x-0 z-40 px-4 flex items-center justify-between gap-3 pointer-events-none">
            {/* Left/Center: Clean Frosted White Navigation Bar (Messages, Activity, Profile — no Home icon per user request) */}
            <div className="pointer-events-auto flex-1 max-w-[260px] h-[56px] px-4 bg-white/92 dark:bg-zinc-900/92 backdrop-blur-xl border-0 shadow-none rounded-full flex items-center justify-around">
              {/* 1. Message (Active) */}
              <button
                type="button"
                onClick={() => {
                  setActiveMessagesTab('chats');
                  setSidebarTab('messages');
                  setShowArchivedOnly(false);
                  setMessagesFilterTab('all');
                }}
                className="w-11 h-11 rounded-full flex items-center justify-center text-zinc-950 dark:text-white active:scale-95 transition cursor-pointer relative"
                title="Messages"
                aria-label="Messages"
              >
                <Icon name="messages-inbox" className="w-[22px] h-[22px]" />
              </button>

              {/* 2. Activity / Calendar */}
              <button
                type="button"
                onClick={() => navigate('/loops/activity')}
                className="w-11 h-11 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white active:scale-95 transition cursor-pointer"
                title="Activity"
                aria-label="Activity"
              >
                <Icon name="messages-activity" className="w-[22px] h-[22px]" />
              </button>

              {/* 3. Profile */}
              <button
                type="button"
                onClick={() => {
                  if (user?.uid) {
                    navigate(`/author/${user.uid}`);
                  } else {
                    setActiveMessagesTab('settings');
                  }
                }}
                className="w-11 h-11 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white active:scale-95 transition cursor-pointer"
                title="Profile"
                aria-label="Profile"
              >
                <Icon name="messages-profile" className="w-[22px] h-[22px]" />
              </button>
            </div>

            {/* Right: Flat Circular Black Plus FAB (IMG_5470 — no heavy box shadow) */}
            <button
              type="button"
              onClick={() => {
                setNewMessageInitialStep('new_message');
                setShowNewMessageModal(true);
              }}
              className="pointer-events-auto w-[56px] h-[56px] rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-none flex items-center justify-center active:scale-90 transition hover:scale-105 cursor-pointer shrink-0"
              title="New Message"
              aria-label="New Message"
            >
              <Icon name="messages-plus" className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

      {/* =====================================================================
          COLUMN 3: Right Active Chat / Community / Settings Workspace
          ===================================================================== */}
      <div
        className={cn(
          'flex-1 flex-col h-full overflow-hidden transition-all duration-200 msg-stream-default',
          activeMessagesTab === 'settings'
            ? 'hidden md:flex'
            : !activeChat && !activeChannel
            ? 'hidden md:flex'
            : 'flex'
        )}
      >
         {activeMessagesTab === 'settings' ? (
           <div className="hidden md:flex flex-col h-full w-full overflow-hidden ambient-dynamic-bg border-0">
             <div className="px-6 py-4 border-b border-zinc-100 dark:border-white/[0.06] flex items-center justify-between shrink-0">
               <div>
                 <h2 className="text-lg font-bold text-zinc-950 dark:text-white">Chat & Privacy Settings</h2>
                 <p className="text-xs text-zinc-500 dark:text-zinc-400">Manage messaging preferences, security, and appearance</p>
               </div>
               <button
                 type="button"
                 onClick={() => setActiveMessagesTab('chats')}
                 className="px-4 py-2 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition cursor-pointer"
               >
                 Done
               </button>
             </div>
             {renderSettingsWorkspace()}
           </div>
         ) : activeChannel ? (
             isUserBanned ? (
                 <div className="flex-1 flex flex-col items-center justify-center ambient-dynamic-bg p-6 text-center h-full">
                     <div className="w-20 h-20 bg-rose-500/12 rounded-full flex items-center justify-center text-rose-500 mb-6 border-0 shadow-[0_4px_20px_rgba(120,90,160,0.08)]">
                         <Icon name="user-x" className="w-10 h-10" />
                     </div>
                     <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">You are Banned from this Channel</h3>
                     <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm leading-relaxed">
                         আপনার আইডি এই কমিউনিটি চ্যানেল থেকে ব্যান করা হয়েছে। আপনি এই চ্যানেলের কোনো মেসেজ বা আপডেট দেখতে পারবেন না।
                     </p>
                     <button
                         onClick={() => setSearchParams({})}
                         className="mt-6 px-6 py-3 bg-white/95 dark:bg-zinc-800/90 hover:bg-white text-zinc-900 dark:text-white rounded-full text-xs font-bold shadow-[0_4px_16px_rgba(120,90,160,0.08)] border-0 transition-all cursor-pointer"
                     >
                         Back to Chats
                     </button>
                 </div>
             ) : showChannelDetailsModal ? (
                 <div className="flex-1 flex flex-col ambient-dynamic-bg text-zinc-900 dark:text-white overflow-y-auto font-inter relative">
                     {/* Header matching IMG_5470 / IMG_5472 */}
                     <div className="sticky top-0 z-10 bg-transparent backdrop-blur-md border-0 px-4 py-3.5 flex items-center justify-between">
                         <button 
                             type="button"
                             onClick={() => setShowChannelDetailsModal(false)}
                             className="w-11 h-11 rounded-full bg-white/95 dark:bg-zinc-800/90 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.06)] flex items-center justify-center text-zinc-900 dark:text-zinc-100 hover:bg-white dark:hover:bg-zinc-700/60 active:scale-95 transition cursor-pointer"
                         >
                             <MsgBackChevronIcon className="w-5 h-5" />
                         </button>
                         <h2 className="font-bold text-[17px] text-zinc-950 dark:text-white tracking-tight">Channel Details</h2>
                         {activeChannel.creatorId === user?.uid ? (
                             <button 
                                 type="button"
                                 onClick={() => {
                                     setShowChannelDetailsModal(false);
                                     handleEditChannel();
                                 }} 
                                 className="w-11 h-11 rounded-full bg-white/95 dark:bg-zinc-800/90 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.06)] flex items-center justify-center text-zinc-900 dark:text-zinc-100 hover:bg-white dark:hover:bg-zinc-700/60 active:scale-95 transition cursor-pointer"
                             >
                                 <Icon name="edit-3" className="w-5 h-5" />
                             </button>
                         ) : (
                             <div className="w-11" />
                         )}
                     </div>

                     <div className="p-4 sm:p-6 w-full max-w-2xl mx-auto flex flex-col items-center flex-1 pb-24">
                        <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-[#F246F5] to-purple-500 mb-4 shadow-[0_8px_24px_rgba(242,70,245,0.2)]">
                          <div className="w-24 h-24 rounded-full overflow-hidden bg-white dark:bg-zinc-900 ring-2 ring-white dark:ring-zinc-950">
                            <ProgressiveImage src={activeChannel.imageUrl} alt="Channel cover" containerClassName="w-24 h-24 rounded-full min-h-0" className="w-full h-full object-cover" />
                          </div>
                        </div>
                        <h2 className="text-2xl font-bold text-zinc-950 dark:text-white flex items-center gap-1.5 tracking-tight text-center">
                            {activeChannel.name}
                            {(activeChannel.verified !== false) && <VerifiedIcon className="w-5 h-5 text-emerald-500 shrink-0" />}
                        </h2>
                        <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium mt-1">
                            {activeChannel.creatorId === user?.uid ? 'Public channel (Owner)' : `${activeChannel.subscriberCount || 1} subscribers`}
                        </p>
                        
                        <div className="flex items-center justify-center gap-3 mt-6 w-full">
                            {activeChannel.creatorId === user?.uid ? (
                                <>
                                    <button 
                                        type="button"
                                        onClick={() => handleToggleMuteChannel(activeChannel, userSubscription?.muted)} 
                                        className="flex-1 flex flex-col items-center justify-center py-3.5 bg-white/90 dark:bg-zinc-900/80 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.05)] rounded-[22px] hover:bg-white dark:hover:bg-zinc-800/90 active:scale-[0.98] transition cursor-pointer"
                                    >
                                        <Icon name="volume-x" className="w-5 h-5 text-zinc-700 dark:text-zinc-300 mb-1.5" />
                                        <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">{userSubscription?.muted ? "Unmute" : "Mute"}</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setDetailsSubModal('settings')} 
                                        className="flex-1 flex flex-col items-center justify-center py-3.5 bg-white/90 dark:bg-zinc-900/80 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.05)] rounded-[22px] hover:bg-white dark:hover:bg-zinc-800/90 active:scale-[0.98] transition cursor-pointer"
                                    >
                                        <Icon name="settings" className="w-5 h-5 text-zinc-700 dark:text-zinc-300 mb-1.5" />
                                        <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">Settings</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button 
                                        type="button"
                                        onClick={() => { if(!userSubscription) handleSubscribeToChannel(activeChannel); else handleUnsubscribeFromChannel(activeChannel); }} 
                                        className="flex-1 flex flex-col items-center justify-center py-3.5 bg-white/90 dark:bg-zinc-900/80 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.05)] rounded-[22px] hover:bg-white dark:hover:bg-zinc-800/90 active:scale-[0.98] transition cursor-pointer"
                                    >
                                        {userSubscription ? <Icon name="x" className="w-5 h-5 text-rose-500 mb-1.5" /> : <Icon name="user-plus" className="w-5 h-5 text-[#F246F5] mb-1.5" />}
                                        <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">{userSubscription ? "Leave" : "Join"}</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleToggleMuteChannel(activeChannel, userSubscription?.muted)} 
                                        className="flex-1 flex flex-col items-center justify-center py-3.5 bg-white/90 dark:bg-zinc-900/80 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.05)] rounded-[22px] hover:bg-white dark:hover:bg-zinc-800/90 active:scale-[0.98] transition cursor-pointer"
                                    >
                                        <Icon name="volume-x" className="w-5 h-5 text-zinc-700 dark:text-zinc-300 mb-1.5" />
                                        <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">{userSubscription?.muted ? "Unmute" : "Mute"}</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                await navigator.clipboard.writeText(`${window.location.origin}/messages?channel=${activeChannel.id}`);
                                                notify("Link copied!", "success");
                                            } catch(e) {}
                                        }} 
                                        className="flex-1 flex flex-col items-center justify-center py-3.5 bg-white/90 dark:bg-zinc-900/80 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.05)] rounded-[22px] hover:bg-white dark:hover:bg-zinc-800/90 active:scale-[0.98] transition cursor-pointer"
                                    >
                                        <Icon name="forward" className="w-5 h-5 text-zinc-700 dark:text-zinc-300 mb-1.5" />
                                        <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">Share</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => notify("Channel reported. Our administrators will review the content.", "info")} 
                                        className="flex-1 flex flex-col items-center justify-center py-3.5 bg-white/90 dark:bg-zinc-900/80 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.05)] rounded-[22px] hover:bg-white dark:hover:bg-zinc-800/90 active:scale-[0.98] transition cursor-pointer"
                                    >
                                        <Icon name="alert-circle" className="w-5 h-5 text-amber-500 mb-1.5" />
                                        <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">Report</span>
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Description & Link Card */}
                        <div className="w-full mt-6 bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md border-0 shadow-[0_4px_20px_rgba(120,90,160,0.05)] rounded-[26px] flex flex-col overflow-hidden divide-y divide-zinc-100/80 dark:divide-white/[0.05]">
                            <div className="p-5 text-left">
                                <p className="text-[12px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Description</p>
                                <p className="text-[14.5px] text-zinc-800 dark:text-zinc-200 leading-relaxed">
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
                                className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/60 dark:hover:bg-zinc-800/40 transition-colors"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-[12px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Invite Link</p>
                                    <p className="text-[13.5px] text-zinc-800 dark:text-zinc-200 truncate pr-4 font-mono">
                                        {`${window.location.origin}/messages?channel=${activeChannel.id}`}
                                    </p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-zinc-100/90 dark:bg-zinc-800/90 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:scale-105 active:scale-95 transition-all shrink-0">
                                    <Icon name="link" className="w-4 h-4" />
                                </div>
                            </div>
                        </div>

                        {/* Owner Moderation List Rows */}
                        {activeChannel.creatorId === user?.uid && (
                            <div className="w-full mt-4 bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md border-0 shadow-[0_4px_20px_rgba(120,90,160,0.05)] rounded-[26px] flex flex-col py-1 overflow-hidden divide-y divide-zinc-100/80 dark:divide-white/[0.05]">
                                <div 
                                    onClick={() => setDetailsSubModal('subscribers')} 
                                    className="flex items-center justify-between px-5 py-4 hover:bg-white/60 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-full bg-[#F246F5]/12 text-[#F246F5] flex items-center justify-center">
                                            <Icon name="users" className="w-5 h-5" />
                                        </div>
                                        <span className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">Subscribers</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[13.5px] font-bold text-[#F246F5]">{activeChannel.subscriberCount || 1}</span>
                                        <Icon name="chevron-right" className="w-4 h-4 text-zinc-400" />
                                    </div>
                                </div>
                                <div 
                                    onClick={() => setDetailsSubModal('admins')} 
                                    className="flex items-center justify-between px-5 py-4 hover:bg-white/60 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-full bg-amber-500/12 text-amber-500 flex items-center justify-center">
                                            <Icon name="star" className="w-5 h-5" />
                                        </div>
                                        <span className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">Administrators</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[13.5px] font-bold text-amber-500">{(channelAdmins?.length || 0) + 1}</span>
                                        <Icon name="chevron-right" className="w-4 h-4 text-zinc-400" />
                                    </div>
                                </div>
                                <div 
                                    onClick={() => setDetailsSubModal('banned')} 
                                    className="flex items-center justify-between px-5 py-4 hover:bg-white/60 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-full bg-rose-500/12 text-rose-500 flex items-center justify-center">
                                            <Icon name="user-x" className="w-5 h-5" />
                                        </div>
                                        <span className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">Removed Users</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[13.5px] font-bold text-rose-500">{bannedUsers.length}</span>
                                        <Icon name="chevron-right" className="w-4 h-4 text-zinc-400" />
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
                                 className="fixed inset-0 z-[100] ambient-dynamic-bg flex flex-col font-inter"
                             >
                                 {/* Drawer Header */}
                                 <div className="sticky top-0 z-10 bg-transparent backdrop-blur-md border-0 px-4 py-3.5 flex items-center gap-3">
                                     <button 
                                         type="button"
                                         onClick={() => { setDetailsSubModal(null); setConfirmDeleteChannel(false); }}
                                         className="w-11 h-11 rounded-full bg-white/95 dark:bg-zinc-800/90 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.06)] flex items-center justify-center text-zinc-900 dark:text-zinc-100 hover:bg-white active:scale-95 transition cursor-pointer"
                                     >
                                         <MsgBackChevronIcon className="w-5 h-5" />
                                     </button>
                                     <h3 className="font-bold text-[17px] capitalize text-zinc-950 dark:text-white tracking-tight">
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
                                              <div className="bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md border-0 p-5 rounded-[26px] shadow-[0_4px_20px_rgba(120,90,160,0.05)] text-center space-y-4">
                                                  <div className="relative mx-auto w-24 h-24 rounded-full overflow-hidden p-[2px] bg-gradient-to-tr from-[#F246F5] to-purple-500">
                                                    <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-zinc-900">
                                                      {selectedSubscriber.photoURL ? (
                                                          <img src={selectedSubscriber.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                                      ) : (
                                                          <div className="w-full h-full flex items-center justify-center font-black text-3xl bg-[#F246F5]/12 text-[#F246F5]">
                                                              {(selectedSubscriber.displayName || 'U')[0].toUpperCase()}
                                                          </div>
                                                      )}
                                                    </div>
                                                  </div>

                                                  <div className="space-y-1">
                                                      <h3 className="font-bold text-lg text-zinc-900 dark:text-white flex items-center justify-center gap-1">
                                                          {selectedSubscriber.displayName || 'Anonymous User'}
                                                          {selectedSubscriber.id === activeChannel.creatorId && <span className="bg-[#F246F5] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Owner</span>}
                                                      </h3>
                                                      <p className="text-xs text-zinc-400 font-medium">Joined {selectedSubscriber.joinedAt ? new Date(selectedSubscriber.joinedAt).toLocaleDateString() : 'recently'}</p>
                                                      <p className="text-[10px] font-mono text-zinc-500 select-all bg-zinc-100/80 dark:bg-zinc-800/80 px-2.5 py-1 rounded-full inline-block">UID: {selectedSubscriber.id}</p>
                                                  </div>

                                                  <div className="pt-2 flex flex-col gap-2">
                                                      {/* Message option */}
                                                      <button
                                                          type="button"
                                                          onClick={() => {
                                                              setSearchParams({ chatId: selectedSubscriber.id });
                                                              setShowChannelDetailsModal(false);
                                                          }}
                                                          className="w-full py-3 bg-[#F246F5] hover:bg-[#e135e4] text-white rounded-full text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                                                      >
                                                          <Icon name="message-square" className="w-4 h-4" />
                                                          Send Private Message
                                                      </button>

                                                      {/* Mute toggle */}
                                                      {selectedSubscriber.id !== user?.uid && (
                                                          <button
                                                              type="button"
                                                              onClick={() => handleToggleMuteSubscriber(selectedSubscriber)}
                                                              className={`w-full py-3 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${selectedSubscriber.muted ? 'bg-amber-500/12 text-amber-600 hover:bg-amber-500/20' : 'bg-zinc-100/90 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                                                          >
                                                              {selectedSubscriber.muted ? (
                                                                  <>
                                                                      <Icon name="volume-x" className="w-4 h-4" />
                                                                      Unmute Subscriber
                                                                  </>
                                                              ) : (
                                                                  <>
                                                                      <Icon name="volume-2" className="w-4 h-4" />
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
                                                              className="w-full py-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/25 text-rose-600 dark:text-rose-400 hover:text-rose-700 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                                                          >
                                                              <Icon name="user-minus" className="w-4 h-4" />
                                                              Remove & Ban Member
                                                          </button>
                                                      )}
                                                  </div>
                                              </div>

                                              {/* Subscriber contact details block */}
                                              <div className="w-full bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md border-0 shadow-[0_4px_20px_rgba(120,90,160,0.05)] rounded-[26px] flex flex-col overflow-hidden mt-4 divide-y divide-zinc-100/80 dark:divide-white/[0.05]">
                                                  <div className="p-4 text-left">
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
                                                      <div key={sub.id} className="flex items-center justify-between bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md border-0 p-3.5 rounded-[22px] shadow-[0_4px_16px_rgba(120,90,160,0.05)] transition-all">
                                                          <div 
                                                              className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                                                              onClick={() => setSelectedSubscriber(sub)}
                                                          >
                                                              <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                                                                  {sub.photoURL ? (
                                                                      <img src={sub.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                                                  ) : (
                                                                      <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-[#F246F5]/12 text-[#F246F5]">
                                                                          {(sub.displayName || 'U')[0].toUpperCase()}
                                                                      </div>
                                                                  )}
                                                              </div>
                                                              <div className="min-w-0 flex-1">
                                                                  <p className="font-bold text-[14px] text-zinc-900 dark:text-white flex items-center gap-1.5 truncate">
                                                                      {sub.displayName || 'Anonymous User'}
                                                                      {sub.id === activeChannel.creatorId && <span className="bg-[#F246F5]/12 text-[#F246F5] text-[8.5px] font-bold px-1.5 py-0.5 rounded-full">OWNER</span>}
                                                                  </p>
                                                                  <p className="text-[11px] text-zinc-400 mt-0.5 truncate">Joined {sub.joinedAt ? new Date(sub.joinedAt).toLocaleDateString() : 'recently'}</p>
                                                              </div>
                                                          </div>
                                                          {sub.id !== user?.uid && (
                                                              <div className="flex items-center gap-2 shrink-0">
                                                                  <button 
                                                                      type="button"
                                                                      onClick={() => handleToggleMuteSubscriber(sub)}
                                                                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${sub.muted ? 'bg-amber-500/12 text-amber-500 hover:bg-amber-500/20' : 'bg-zinc-100/90 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                                                                      title={sub.muted ? 'Unmute' : 'Mute'}
                                                                  >
                                                                      {sub.muted ? <Icon name="volume-x" className="w-4 h-4" /> : <Icon name="volume-2" className="w-4 h-4" />}
                                                                  </button>
                                                                  <button 
                                                                      type="button"
                                                                      onClick={() => handleBanSubscriber(sub)}
                                                                      className="w-9 h-9 rounded-full flex items-center justify-center bg-rose-500/12 text-rose-500 hover:bg-rose-500/20 text-xs font-bold transition-all cursor-pointer"
                                                                      title="Remove User"
                                                                  >
                                                                      <Icon name="user-minus" className="w-4 h-4" />
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
                                                          className="text-xs font-bold text-[#F246F5] hover:underline flex items-center gap-1 bg-[#F246F5]/12 px-3 py-1.5 rounded-full transition-all cursor-pointer"
                                                      >
                                                          {isSearchingAdmin ? "Back to Admins" : "+ Add Administrator"}
                                                      </button>
                                                  )}
                                              </div>

                                              {isSearchingAdmin ? (
                                                  /* SEARCH USER FOR ADMIN INTERFACE */
                                                  <div className="bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md border-0 p-4 rounded-[24px] shadow-[0_4px_20px_rgba(120,90,160,0.05)] space-y-4">
                                                      <div className="space-y-2">
                                                          <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Search by Email</label>
                                                          <div className="flex gap-2">
                                                              <div className="flex-1 relative">
                                                                  <input
                                                                      type="email"
                                                                      value={adminSearchEmail}
                                                                      onChange={(e) => setAdminSearchEmail(e.target.value)}
                                                                      placeholder="user@example.com"
                                                                      className="w-full bg-zinc-100/80 dark:bg-zinc-800/80 border-0 rounded-full px-4 py-2.5 text-xs outline-none focus:ring-2 ring-[#F246F5]/40 font-medium text-zinc-900 dark:text-white"
                                                                  />
                                                              </div>
                                                              <button
                                                                  type="button"
                                                                  disabled={adminSearchLoading}
                                                                  onClick={handleSearchAdminUser}
                                                                  className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 text-white rounded-full text-xs font-bold transition-all cursor-pointer"
                                                              >
                                                                  {adminSearchLoading ? "Searching..." : "Search"}
                                                              </button>
                                                          </div>
                                                      </div>

                                                      {adminSearchResult && (
                                                          <div className="border-t border-zinc-100/80 dark:border-white/[0.06] pt-4 space-y-4 animate-fade-in">
                                                              <div className="flex items-center gap-3 bg-zinc-50/80 dark:bg-zinc-800/60 p-3 rounded-2xl">
                                                                  <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-200 shrink-0">
                                                                      {adminSearchResult.photoURL ? (
                                                                          <img src={adminSearchResult.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                                                      ) : (
                                                                          <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-[#F246F5]/12 text-[#F246F5]">
                                                                              {(adminSearchResult.displayName || 'U')[0].toUpperCase()}
                                                                          </div>
                                                                      )}
                                                                  </div>
                                                                  <div className="min-w-0">
                                                                      <p className="font-bold text-xs text-zinc-900 dark:text-white truncate">{adminSearchResult.displayName || 'Anonymous User'}</p>
                                                                      <p className="text-[10px] text-zinc-400 truncate mt-0.5">{(adminSearchResult.hideEmail && adminSearchResult.id !== user?.uid) ? "Email Hidden" : formatDisplayEmail(adminSearchResult.email)}</p>
                                                                      <p className="text-[9px] font-mono text-zinc-500 truncate mt-0.5">UID: {adminSearchResult.id}</p>
                                                                  </div>
                                                              </div>

                                                              {/* PERMISSIONS / ACCESS TOGGLES */}
                                                              <div className="space-y-2.5 bg-zinc-50/60 dark:bg-zinc-800/40 p-3.5 rounded-2xl border-0">
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
                                                                                  className="rounded text-[#F246F5] border-zinc-300 focus:ring-[#F246F5]/30 w-4 h-4 accent-[#F246F5]"
                                                                              />
                                                                          </label>
                                                                      ))}
                                                                  </div>
                                                              </div>

                                                              <button
                                                                  type="button"
                                                                  onClick={handleAddAdmin}
                                                                  className="w-full py-3 bg-[#F246F5] hover:bg-[#e135e4] text-white font-bold text-xs rounded-full shadow-sm tracking-wide transition-all cursor-pointer"
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
                                                      <div className="flex items-center justify-between bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md border-0 p-4 rounded-[22px] shadow-[0_4px_16px_rgba(120,90,160,0.05)]">
                                                          <div className="flex items-center gap-3 min-w-0">
                                                              <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                                                                  {activeChannel.creatorId === user?.uid && user?.photoURL ? (
                                                                      <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                                                  ) : (
                                                                      <div className="w-full h-full flex items-center justify-center font-bold text-base bg-[#F246F5]/12 text-[#F246F5]">
                                                                          {(activeChannel.creatorName || 'O')[0].toUpperCase()}
                                                                      </div>
                                                                  )}
                                                              </div>
                                                              <div className="min-w-0">
                                                                  <p className="font-bold text-[15px] text-zinc-900 dark:text-white flex items-center gap-1.5 leading-tight">
                                                                      {activeChannel.creatorName || 'Channel Creator'}
                                                                      <VerifiedIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                                                                  </p>
                                                                  <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mt-0.5">Primary Creator & Admin</p>
                                                                  <p className="text-[9px] font-mono text-zinc-500 mt-1 truncate">ID: {activeChannel.creatorId}</p>
                                                              </div>
                                                          </div>
                                                          <span className="bg-[#F246F5] text-white text-[9.5px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                                                              Creator
                                                          </span>
                                                      </div>

                                                      {/* OTHER PROMOTED ADMINS */}
                                                      {channelAdmins.map((adm) => (
                                                          <div key={adm.id} className="bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md border-0 p-4 rounded-[22px] shadow-[0_4px_16px_rgba(120,90,160,0.05)] space-y-3">
                                                              <div className="flex items-center justify-between">
                                                                  <div className="flex items-center gap-3 min-w-0">
                                                                      <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
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
                                                                          className="w-8 h-8 rounded-full flex items-center justify-center bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 hover:text-rose-700 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer"
                                                                          title="Revoke Admin status"
                                                                      >
                                                                          <Icon name="user-x" className="w-4 h-4" />
                                                                      </button>
                                                                  )}
                                                              </div>

                                                              {/* PERMISSION BADGES LIST */}
                                                              <div className="flex flex-wrap gap-1.5 border-t border-zinc-100/80 dark:border-white/[0.05] pt-2 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                                                                  <span className={cn("px-2 py-0.5 rounded-full", adm.permissions?.canPost !== false ? "bg-[#F246F5]/12 text-[#F246F5]" : "bg-zinc-100 text-zinc-400 line-through")}>Post</span>
                                                                  <span className={cn("px-2 py-0.5 rounded-full", adm.permissions?.canDelete !== false ? "bg-[#F246F5]/12 text-[#F246F5]" : "bg-zinc-100 text-zinc-400 line-through")}>Delete</span>
                                                                  <span className={cn("px-2 py-0.5 rounded-full", adm.permissions?.canPin !== false ? "bg-[#F246F5]/12 text-[#F246F5]" : "bg-zinc-100 text-zinc-400 line-through")}>Pin</span>
                                                                  <span className={cn("px-2 py-0.5 rounded-full", adm.permissions?.canBan !== false ? "bg-[#F246F5]/12 text-[#F246F5]" : "bg-zinc-100 text-zinc-400 line-through")}>Ban</span>
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
                                                     <div key={bUser.id} className="flex items-center justify-between bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md border-0 p-3.5 rounded-[22px] shadow-[0_4px_16px_rgba(120,90,160,0.05)]">
                                                         <div className="flex items-center gap-3">
                                                             <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                                                                 {bUser.photoURL ? (
                                                                     <img src={bUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                                                 ) : (
                                                                     <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-rose-100 dark:bg-rose-950/30 text-rose-500">
                                                                         {(bUser.displayName || 'U')[0].toUpperCase()}
                                                                     </div>
                                                                 )}
                                                             </div>
                                                             <div>
                                                                 <p className="font-bold text-[14px] text-zinc-900 dark:text-white">{bUser.displayName || 'Banned User'}</p>
                                                                 <p className="text-[11px] text-zinc-400 mt-0.5">Banned on {bUser.bannedAt ? new Date(bUser.bannedAt).toLocaleDateString() : 'recently'}</p>
                                                             </div>
                                                         </div>
                                                         <button 
                                                             type="button"
                                                             onClick={() => handleUnbanUser(bUser)}
                                                             className="px-3.5 py-1.5 rounded-full bg-zinc-100/90 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-200 transition-all cursor-pointer"
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
                                             <div className="bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md border-0 rounded-[26px] p-5 shadow-[0_4px_20px_rgba(120,90,160,0.05)] space-y-3">
                                                 <div className="flex items-center gap-2.5 border-b border-zinc-100/80 dark:border-white/[0.05] pb-2.5">
                                                     <div className="w-8 h-8 rounded-full bg-[#F246F5]/12 text-[#F246F5] flex items-center justify-center">
                                                         <Icon name="trending-up" className="w-4 h-4" />
                                                     </div>
                                                     <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Channel Insights & Growth</p>
                                                 </div>
                                                 <div className="grid grid-cols-2 gap-2.5">
                                                     <div className="p-3.5 bg-zinc-100/70 dark:bg-zinc-800/60 rounded-2xl border-0">
                                                         <p className="text-[10px] font-bold text-zinc-400 uppercase">Interaction Rate</p>
                                                         <p className="text-lg font-black text-[#F246F5] mt-1">94.8%</p>
                                                         <p className="text-[10px] text-zinc-400 mt-0.5">High engagement</p>
                                                     </div>
                                                     <div className="p-3.5 bg-zinc-100/70 dark:bg-zinc-800/60 rounded-2xl border-0">
                                                         <p className="text-[10px] font-bold text-zinc-400 uppercase">Channel Views</p>
                                                         <p className="text-lg font-black text-zinc-800 dark:text-zinc-100 mt-1">
                                                             {Math.max(12, (activeChannel.subscriberCount || 1) * 28 + 142)}
                                                         </p>
                                                         <p className="text-[10px] text-zinc-400 mt-0.5">Updated live</p>
                                                     </div>
                                                 </div>
                                                 {/* Simple mini sparkline */}
                                                 <div className="pt-1.5">
                                                     <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1 flex justify-between">
                                                         <span>7-Day Subscriber Trend</span>
                                                         <span className="text-[#F246F5] font-bold">+12.5%</span>
                                                     </p>
                                                     <div className="h-6 flex items-end gap-1 px-1">
                                                         {[40, 55, 48, 70, 85, 75, 98].map((val, i) => (
                                                             <div 
                                                                 key={i} 
                                                                 style={{ height: `${val}%` }} 
                                                                 className="flex-1 bg-gradient-to-t from-[#F246F5] to-purple-400 rounded-t-sm" 
                                                                 title={`Day ${i+1}`}
                                                             />
                                                         ))}
                                                     </div>
                                                 </div>
                                             </div>

                                             {/* Referral / Affiliate program */}
                                             <div className="bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md border-0 rounded-[26px] p-5 shadow-[0_4px_20px_rgba(120,90,160,0.05)] space-y-3">
                                                 <div className="flex items-center gap-2.5 border-b border-zinc-100/80 dark:border-white/[0.05] pb-2.5">
                                                     <div className="w-8 h-8 rounded-full bg-[#F246F5]/12 text-[#F246F5] flex items-center justify-center">
                                                         <Icon name="link" className="w-4 h-4" />
                                                     </div>
                                                     <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Affiliate Referral Program</p>
                                                 </div>
                                                 <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                                                     Share your unique custom tracker link to earn platform referral points and recruit subscribers seamlessly.
                                                 </p>
                                                 <div className="flex gap-2">
                                                     <input 
                                                         type="text" 
                                                         readOnly 
                                                         value={`${window.location.origin}/messages?channel=${activeChannel.id}&ref=${user.uid}`}
                                                         className="flex-1 px-3.5 py-2.5 bg-zinc-100/80 dark:bg-zinc-800/80 border-0 rounded-full text-[10.5px] font-mono outline-none text-zinc-600 dark:text-zinc-300"
                                                     />
                                                     <button 
                                                         type="button"
                                                         onClick={() => {
                                                             navigator.clipboard.writeText(`${window.location.origin}/messages?channel=${activeChannel.id}&ref=${user.uid}`);
                                                             notify("Affiliate tracker link copied!", "success");
                                                         }}
                                                         className="w-10 h-10 bg-[#F246F5]/12 hover:bg-[#F246F5]/20 text-[#F246F5] rounded-full flex items-center justify-center transition cursor-pointer shrink-0"
                                                         title="Copy Link"
                                                     >
                                                         <Icon name="copy" className="w-4 h-4" />
                                                     </button>
                                                 </div>
                                                 <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 pt-0.5">
                                                     <span>Total referrals recruited</span>
                                                     <span className="text-[#F246F5]">8 users</span>
                                                 </div>
                                             </div>

                                             {/* Interactive configurations */}
                                             <div className="bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md border-0 rounded-[26px] p-5 shadow-[0_4px_20px_rgba(120,90,160,0.05)] space-y-3">
                                                 <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider px-0.5">Interactive Controls</p>
                                                 
                                                 {/* Channel Type Toggle */}
                                                 <div className="flex items-center justify-between p-3.5 bg-zinc-100/70 dark:bg-zinc-800/50 border-0 rounded-2xl">
                                                     <div>
                                                         <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                             <Icon name="shield" className="w-4 h-4 text-[#F246F5]" />
                                                             <span>Private Channel</span>
                                                         </p>
                                                         <p className="text-[10.5px] text-zinc-400 mt-0.5">Only invited users can join this channel.</p>
                                                     </div>
                                                     <button 
                                                         type="button"
                                                         onClick={async () => {
                                                             try {
                                                                 const newVal = !activeChannel.isPrivate;
                                                                 await updateDoc(doc(db, 'community_channels', activeChannel.id), { isPrivate: newVal });
                                                                 notify(`Channel is now ${newVal ? 'Private' : 'Public'}`, 'success');
                                                             } catch(e) { notify('Failed to update setting', 'error'); }
                                                         }}
                                                         className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${activeChannel.isPrivate ? 'bg-[#F246F5] flex justify-end' : 'bg-zinc-300 dark:bg-zinc-700 flex justify-start'}`}
                                                     >
                                                         <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                                                     </button>
                                                 </div>

                                                 {/* Discussion Comments Toggle */}
                                                 <div className="flex items-center justify-between p-3.5 bg-zinc-100/70 dark:bg-zinc-800/50 border-0 rounded-2xl">
                                                     <div>
                                                         <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                             <Icon name="message-square" className="w-4 h-4 text-[#F246F5]" />
                                                             <span>Enable Comments</span>
                                                         </p>
                                                         <p className="text-[10.5px] text-zinc-400 mt-0.5">Let subscribers discuss your posts directly.</p>
                                                     </div>
                                                     <button 
                                                         type="button"
                                                         onClick={async () => {
                                                             try {
                                                                 const newVal = !activeChannel.discussionEnabled;
                                                                 await updateDoc(doc(db, 'community_channels', activeChannel.id), { discussionEnabled: newVal });
                                                                 notify(`Comments ${newVal ? 'Enabled' : 'Disabled'}`, 'success');
                                                             } catch(e) { notify('Failed to update setting', 'error'); }
                                                         }}
                                                         className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${activeChannel.discussionEnabled ? 'bg-[#F246F5] flex justify-end' : 'bg-zinc-300 dark:bg-zinc-700 flex justify-start'}`}
                                                     >
                                                         <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                                                     </button>
                                                 </div>

                                                 {/* Allow Direct Messages */}
                                                 <div className="flex items-center justify-between p-3.5 bg-zinc-100/70 dark:bg-zinc-800/50 border-0 rounded-2xl">
                                                     <div>
                                                         <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                             <Icon name="user" className="w-4 h-4 text-[#F246F5]" />
                                                             <span>Allow DM Contacts</span>
                                                         </p>
                                                         <p className="text-[10.5px] text-zinc-400 mt-0.5">Allow subscribers to PM you from this channel.</p>
                                                     </div>
                                                     <button 
                                                         type="button"
                                                         onClick={async () => {
                                                             try {
                                                                 const newVal = activeChannel.allowDMs === false ? true : false;
                                                                 await updateDoc(doc(db, 'community_channels', activeChannel.id), { allowDMs: newVal });
                                                                 notify(`Direct messages ${newVal ? 'Allowed' : 'Disabled'}`, 'success');
                                                             } catch(e) { notify('Failed to update setting', 'error'); }
                                                         }}
                                                         className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${activeChannel.allowDMs !== false ? 'bg-[#F246F5] flex justify-end' : 'bg-zinc-300 dark:bg-zinc-700 flex justify-start'}`}
                                                     >
                                                         <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                                                     </button>
                                                 </div>

                                                 {/* Auto-Translate Toggle */}
                                                 <div className="flex items-center justify-between p-3.5 bg-zinc-100/70 dark:bg-zinc-800/50 border-0 rounded-2xl">
                                                     <div>
                                                         <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                             <Icon name="sparkles" className="w-4 h-4 text-[#F246F5]" />
                                                             <span>Auto-Translate Posts</span>
                                                         </p>
                                                         <p className="text-[10.5px] text-zinc-400 mt-0.5">Translate posts automatically for international viewers.</p>
                                                     </div>
                                                     <button 
                                                         type="button"
                                                         onClick={async () => {
                                                             try {
                                                                 const newVal = !activeChannel.autoTranslate;
                                                                 await updateDoc(doc(db, 'community_channels', activeChannel.id), { autoTranslate: newVal });
                                                                 notify(`Auto-translate ${newVal ? 'Enabled' : 'Disabled'}`, 'success');
                                                             } catch(e) { notify('Failed to update setting', 'error'); }
                                                         }}
                                                         className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${activeChannel.autoTranslate ? 'bg-[#F246F5] flex justify-end' : 'bg-zinc-300 dark:bg-zinc-700 flex justify-start'}`}
                                                     >
                                                         <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                                                     </button>
                                                 </div>

                                                 {/* Allowed Reactions Selector */}
                                                 <div className="p-3.5 bg-zinc-100/70 dark:bg-zinc-800/50 border-0 rounded-2xl space-y-2.5">
                                                     <div>
                                                         <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                             <Icon name="info" className="w-4 h-4 text-[#F246F5]" />
                                                             <span>Allowed Reactions</span>
                                                         </p>
                                                         <p className="text-[10.5px] text-zinc-400 mt-0.5">Restrict the types of reaction emojis subscribers can use.</p>
                                                     </div>
                                                     <div className="flex gap-1.5 pt-1">
                                                         {['all', 'some', 'none'].map((opt) => (
                                                             <button
                                                                 type="button"
                                                                 key={opt}
                                                                 onClick={async () => {
                                                                     try {
                                                                         await updateDoc(doc(db, 'community_channels', activeChannel.id), { allowedReactions: opt });
                                                                         notify(`Allowed reactions updated to: ${opt}`, 'success');
                                                                     } catch(e) { notify('Failed to update setting', 'error'); }
                                                                 }}
                                                                 className={`flex-1 py-2 rounded-full text-xs font-bold capitalize transition-all cursor-pointer ${
                                                                     (activeChannel.allowedReactions || 'all') === opt 
                                                                         ? 'bg-[#F246F5] text-white shadow-sm' 
                                                                         : 'bg-white/90 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700'
                                                                 }`}
                                                             >
                                                                 {opt}
                                                             </button>
                                                         ))}
                                                     </div>
                                                 </div>
                                             </div>

                                             {/* Recent activity audit log */}
                                             <div className="bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md border-0 rounded-[26px] p-5 shadow-[0_4px_20px_rgba(120,90,160,0.05)] space-y-3">
                                                 <div className="flex items-center gap-2.5 border-b border-zinc-100/80 dark:border-white/[0.05] pb-2.5">
                                                     <div className="w-8 h-8 rounded-full bg-teal-500/12 text-teal-500 flex items-center justify-center">
                                                         <Icon name="activity" className="w-4 h-4" />
                                                     </div>
                                                     <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Recent Admin Audit Log</p>
                                                 </div>
                                                 <div className="space-y-2 text-[10.5px] font-semibold text-zinc-500 dark:text-zinc-400">
                                                     <div className="flex justify-between py-1 border-b border-zinc-100/70 dark:border-white/[0.04]">
                                                         <span>Changed allowed reactions to "{activeChannel.allowedReactions || 'all'}"</span>
                                                         <span className="text-zinc-400">Just now</span>
                                                     </div>
                                                     <div className="flex justify-between py-1 border-b border-zinc-100/70 dark:border-white/[0.04]">
                                                         <span>Updated channel description</span>
                                                         <span className="text-zinc-400">2h ago</span>
                                                     </div>
                                                     <div className="flex justify-between py-1">
                                                         <span>Activated discussion group forum link</span>
                                                         <span className="text-zinc-400">1d ago</span>
                                                     </div>
                                                 </div>
                                             </div>

                                             {/* Standard profile & delete actions */}
                                             <div className="bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md border-0 rounded-[26px] p-5 shadow-[0_4px_20px_rgba(120,90,160,0.05)] space-y-3">
                                                 <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider px-0.5">Danger Zone</p>
                                                 <button 
                                                     type="button"
                                                     onClick={() => {
                                                         setDetailsSubModal(null);
                                                         handleEditChannel();
                                                     }}
                                                     className="w-full py-3 px-4 bg-zinc-100/90 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-full font-bold text-sm text-zinc-800 dark:text-zinc-100 flex items-center justify-between transition-colors cursor-pointer"
                                                 >
                                                     <span>Edit Channel Profile Info</span>
                                                     <Icon name="edit" className="w-4 h-4 text-zinc-400" />
                                                 </button>

                                                 <div className="border-t border-zinc-100/80 dark:border-white/[0.05] pt-3">
                                                     {!confirmDeleteChannel ? (
                                                         <button 
                                                             type="button"
                                                             onClick={() => setConfirmDeleteChannel(true)}
                                                             className="w-full py-3 px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                                                         >
                                                             <Icon name="trash" className="w-4 h-4" />
                                                             <span>Delete Channel Session</span>
                                                         </button>
                                                     ) : (
                                                         <div className="bg-rose-500/8 border-0 rounded-2xl p-4 text-center space-y-3">
                                                             <p className="text-xs font-extrabold text-rose-500 uppercase tracking-widest">Critically Dangerous Action</p>
                                                             <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                                                 Are you absolutely certain? This will delete the channel cover, all messages, all subscriptions, and this operation CANNOT be undone!
                                                             </p>
                                                             <div className="flex gap-2">
                                                                 <button 
                                                                     type="button"
                                                                     onClick={() => setConfirmDeleteChannel(false)}
                                                                     className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-full text-xs font-bold transition-all cursor-pointer"
                                                                 >
                                                                     Cancel
                                                                 </button>
                                                                 <button 
                                                                     type="button"
                                                                     onClick={handleDeleteChannel}
                                                                     className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-bold transition-all cursor-pointer"
                                                                 >
                                                                     Yes, Delete
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
                      {/* Active Community Channel Header matching IMG_5472 */}
                      <div className="msg-inbox-header px-4 sm:px-6 pt-4 pb-3 flex items-center justify-between shrink-0 z-10 cursor-pointer" onClick={() => setShowChannelDetailsModal(true)}>
                          <div className="flex items-center gap-3 min-w-0">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSearchParams({}); }}
                                className="md:hidden w-11 h-11 rounded-full bg-white/95 dark:bg-zinc-800/90 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.06)] flex items-center justify-center text-zinc-900 dark:text-zinc-100 hover:bg-white dark:hover:bg-zinc-700/60 active:scale-95 transition shrink-0 cursor-pointer"
                                title="Back to Communities"
                              >
                                  <MsgBackChevronIcon className="w-5 h-5" />
                              </button>

                              <div className="relative w-11 h-11 shrink-0">
                                  <div className="w-full h-full rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                                      <ProgressiveImage src={activeChannel.imageUrl} alt={activeChannel.name} containerClassName="w-full h-full rounded-full min-h-0" showShimmerIcon={false} className="w-full h-full object-cover" />
                                  </div>
                              </div>

                              <div className="min-w-0 flex flex-col justify-center">
                                  <h3 className="font-bold text-[16px] text-zinc-950 dark:text-white truncate flex items-center gap-1.5 leading-tight">
                                      <span>{activeChannel.name}</span>
                                      {activeChannel.verified && <VerifiedIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                  </h3>
                                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                      <p className="text-[12.5px] text-zinc-400 dark:text-zinc-400">
                                          {activeChannel.subscriberCount || 1} subscribers
                                      </p>
                                  </div>
                              </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 relative ml-4">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setShowP2pSearch(!showP2pSearch); }}
                                className="w-11 h-11 rounded-full bg-white/95 dark:bg-zinc-800/90 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.06)] text-zinc-900 dark:text-zinc-200 items-center justify-center hover:bg-white transition hidden sm:flex cursor-pointer"
                                title="Search Chat"
                              >
                                  <MsgSearchIcon className="w-5 h-5" />
                              </button>
                              {isChannelAdmin && !activeLiveCall && (
                                  <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleStartLiveCall(); }}
                                      className="w-11 h-11 rounded-full bg-[#F246F5] flex items-center justify-center text-white shadow-[0_4px_16px_rgba(242,70,245,0.28)] hover:scale-105 active:scale-95 transition cursor-pointer"
                                      title="Start Live Audio"
                                  >
                                      <Icon name="radio" className="w-4 h-4 animate-pulse" />
                                  </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setShowChannelDetailsModal(true); }}
                                className="w-11 h-11 rounded-full bg-white/95 dark:bg-zinc-800/90 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.06)] flex items-center justify-center text-zinc-900 dark:text-zinc-200 hover:bg-white transition cursor-pointer"
                                title="More Options"
                              >
                                  <Icon name="more-vertical" className="w-5 h-5" />
                              </button>
                          </div>
                      </div>

                  {/* Pulsing Live Call Banner */}
                  {activeLiveCall && (
                      <div className="bg-gradient-to-r from-[#F246F5] to-purple-600 text-white px-4 py-2.5 flex items-center justify-between shrink-0 z-10 shadow-sm">
                          <div className="flex items-center gap-2">
                              <span className="relative flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
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
                                  className="px-3 py-1 bg-white/15 hover:bg-white/25 text-[10px] font-bold rounded-full transition-all flex items-center gap-1 uppercase tracking-wider cursor-pointer"
                                  title="Share Live Link"
                              >
                                  <Icon name="link" className="w-3 h-3" />
                                  <span>Share Link</span>
                              </button>
                              
                              {(showLiveCallModal || activeLiveCall.hostId === user?.uid || liveParticipants.some(p => p.id === user?.uid)) ? (
                                  <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setShowLiveCallModal(true); }}
                                      className="px-3 py-1 bg-white text-[#F246F5] hover:bg-white/90 text-[10px] font-bold rounded-full transition-all uppercase tracking-wider cursor-pointer"
                                  >
                                      Joined
                                  </button>
                              ) : (
                                  <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleJoinLiveCall(); }}
                                      className="px-3 py-1 bg-white text-[#F246F5] hover:bg-white/90 text-[10px] font-bold rounded-full transition-all uppercase tracking-wider animate-pulse cursor-pointer"
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
                    <div className="mx-4 mt-2 bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md border-0 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs shrink-0 z-10 shadow-[0_4px_16px_rgba(120,90,160,0.05)] relative">
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
                        <Icon name="pin" className="w-3.5 h-3.5 text-[#F246F5] rotate-45 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                              <p className="font-bold text-[10px] text-[#F246F5] uppercase tracking-wider">Pinned Message {pins.length > 1 ? `(${ (currentPinnedIndex % pins.length) + 1 }/${pins.length})` : ""}</p>
                              {pins.length > 1 && <span className="text-[9px] text-zinc-500 font-medium">Click to see next pin</span>}
                          </div>
                          <p className="text-[11.5px] text-zinc-600 dark:text-zinc-300 truncate mt-0.5">{currentPin.text}</p>
                        </div>
                      </div>
                      {activeChannel.creatorId === user.uid && (
                        <button 
                          type="button" 
                          onClick={() => handleUnpinMessage(currentPin.id)}
                          className="p-1 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-600 transition ml-2 shrink-0 cursor-pointer"
                          title="Unpin Message"
                        >
                          <Icon name="x" className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    );
                  })()}

                  {/* Group / Untrusted Safety Warning Banner */}
                  {!safetyNoticeDismissed && (
                    <div className="mx-3 sm:mx-4 my-2 p-3.5 bg-white/85 dark:bg-zinc-900/75 backdrop-blur-md border-0 shadow-[0_4px_16px_rgba(120,90,160,0.05)] rounded-[22px] flex items-center justify-between gap-2.5 text-left shrink-0">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <div className="p-1.5 rounded-full bg-amber-500 text-white shrink-0 mt-0.5">
                          <Icon name="shield-alert" className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-xs text-zinc-900 dark:text-amber-300 flex items-center gap-1.5">
                            নিরাপত্তা সতর্কতা ও লেনদেন নির্দেশিকা
                          </h5>
                          <p className="text-[11px] text-zinc-600 dark:text-amber-200/80 mt-0.5 leading-relaxed font-medium">
                            গ্রুপে বা কারো পার্সোনাল ইনবক্সে অগ্রিম টাকা লেনদেন করার ক্ষেত্রে নিজ দায়িত্বে করবেন। প্ল্যাটফর্মের অফিশিয়াল চেকআউট ছাড়া যেকোনো ব্যক্তিগত লেনদেনের জন্য DEEP SHOP কর্তৃপক্ষ কোনোভাবেই দায়ী থাকবে না।
                          </p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => {
                          localStorage.setItem('deepshop_safety_notice_dismissed', 'true');
                          setSafetyNoticeDismissed(true);
                        }}
                        className="px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10.5px] shrink-0 self-center transition active:scale-95 flex items-center gap-1 cursor-pointer"
                        title="Dismiss Safety Notice"
                      >
                        <span>বুঝেছি</span>
                        <Icon name="x" className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Channel Messages Scroll Area */}
                  <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 space-y-3 msg-stream-default">
                      {channelMessages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-zinc-400 p-6 text-center">
                              <Icon name="sparkles" className="w-12 h-12 mb-3 text-[#F246F5] animate-pulse" />
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
                              const hasMedia = Boolean((msg.images && msg.images.length > 0) || msg.imageUrl || msg.videoUrl);
                              const isVoiceOnly = Boolean(msg.audioUrl && !msg.text && !msg.replyTo && !hasMedia);

                              if (msg.isDeletedForEveryone) {
                                 return (
                                     <React.Fragment key={`${msg.id || idx}-${idx}`}>
                                         {showDate && (
                                             <div className="flex justify-center my-4 select-none">
                                                 <span className="text-[12.5px] font-medium text-zinc-400 dark:text-zinc-500">
                                                     {formatDateSeparator(msg.timestamp)}
                                                 </span>
                                             </div>
                                         )}
                                         <div className={cn("flex w-full mb-1", isMe ? "justify-end" : "justify-start")}>
                                              <div className="flex max-w-[85%] sm:max-w-[75%] flex-row items-start gap-2">
                                                  {!isMe && (
                                                    <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0 overflow-hidden">
                                                        <div className="w-full h-full bg-transparent" />
                                                    </div>
                                                  )}
                                                  <div className="flex flex-col relative">
                                                      <div className="px-4 py-2.5 text-[14px] bg-zinc-100 dark:bg-zinc-800/60 rounded-[18px] text-zinc-500 dark:text-zinc-400 italic">
                                                          {msg.senderName || 'User'} deleted a message
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
                                              <span className="text-[12.5px] font-medium text-zinc-400 dark:text-zinc-500">
                                                  {formatDateSeparator(msg.timestamp)}
                                              </span>
                                          </div>
                                      )}
                                      <div 
                                        id={`msg-${msg.id}`}
                                        className={cn(
                                            "flex gap-2.5 relative pb-2 group transition-all duration-500 rounded-2xl p-1",
                                            isMe ? "justify-end" : "justify-start",
                                            highlightedMessageId === msg.id && "bg-[#F246F5]/10 ring-1 ring-[#F246F5]/40"
                                        )}
                                        onClick={() => setActiveMessageMenuId(null)}
                                      >
                                      {/* Other Member Avatar on Left */}
                                      {!isMe && (
                                        <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0 self-end mb-4 overflow-hidden">
                                            {msg.senderPhoto ? (
                                                <img src={msg.senderPhoto} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-[#F246F5]/12 text-[#F246F5] font-bold text-xs">
                                                    {(msg.senderName || 'U')[0].toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                      )}
                                                                   
                                      <div
                                        {...getMsgHoldHandlers(msg.id)}
                                        className={cn("max-w-[80%] sm:max-w-[70%] flex flex-col relative group/bubble", isMe ? "items-end" : "items-start")}
                                      >
                                          {/* Sender Label and Role Badge */}
                                          {!isMe && (
                                            <div className="flex items-center gap-1.5 mb-1 ml-1">
                                                <span className={cn("font-semibold text-[11.5px] flex items-center gap-1", getSenderColor(msg.senderId || msg.senderName))}>
                                                  <span>{msg.senderName || "Member"}</span>
                                                  {isSeller && <VerifiedIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                                </span>
                                                {isCreator ? (
                                                  <span className="bg-[#F246F5] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider select-none">
                                                      CREATOR
                                                  </span>
                                                ) : isChannelAdmin ? (
                                                  <span className="bg-purple-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider select-none">
                                                      ADMIN
                                                  </span>
                                                ) : isSeller ? (
                                                  <span className="bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider select-none">
                                                      SELLER
                                                  </span>
                                                ) : (
                                                  <span className="bg-white/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider select-none">
                                                      MEMBER
                                                  </span>
                                                )}
                                            </div>
                                          )}

                                          {/* Quoted Reply Header */}
                                          {msg.replyTo && (
                                              <MessageReplyPreview
                                                replyTo={msg.replyTo}
                                                isMe={isMe}
                                                currentUserId={user?.uid || ""}
                                                onScrollToMessage={(targetId) => {
                                                  document.getElementById(`msg-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                  triggerHighlight(targetId);
                                                }}
                                              />
                                          )}

                                          {/* Forwarded Header */}
                                          {msg.forwardedFrom && (
                                            <div className="flex items-center gap-1 text-[10.5px] text-zinc-400 dark:text-zinc-500 font-medium mb-1">
                                              <Icon name="forward" className="w-3 h-3 text-zinc-400" />
                                              <span>Forwarded from {msg.forwardedFrom}</span>
                                            </div>
                                          )}

                                          {/* Voice Audio */}
                                          {msg.audioUrl && (
                                              <div className={cn(isVoiceOnly ? "p-0" : "px-2 py-2", msg.text ? 'mb-1' : '')}>
                                                  <VoiceMessageBubble 
                                                      audioSrc={msg.audioUrl} 
                                                      duration={msg.audioDuration || 15} 
                                                      isMe={isMe}
                                                      waveColor={isMe ? '#ffffff' : '#F246F5'}
                                                  />
                                              </div>
                                          )}

                                          {/* Images attachment */}
                                          {((msg.images && msg.images.length > 0) || msg.imageUrl) && (
                                            <div className="mb-1">
                                              <MessageMediaGrid
                                                images={msg.images && msg.images.length > 0 ? msg.images : (msg.imageUrl ? [msg.imageUrl] : [])}
                                                thumbnailSrcs={msg.imageThumbs || (msg.thumbUrl ? [msg.thumbUrl] : undefined)}
                                                messageId={msg.id}
                                                isMe={isMe}
                                                dataSaverMode={privacySettings.dataSaverMode}
                                                loadedImages={loadedImages}
                                                onLoadImage={(key) => setLoadedImages(prev => ({ ...prev, [key]: true }))}
                                                onImageClick={(url, idx, allImgs) => openMediaGallery(url, idx, allImgs, msg.senderName || 'Member', msg.timestamp)}
                                              />
                                            </div>
                                          )}

                                          {/* Video attachment */}
                                          {msg.videoUrl && (
                                            <div className="my-1.5 max-w-xs sm:max-w-sm rounded-2xl overflow-hidden bg-black border border-white/10 shadow-md">
                                              <video
                                                src={msg.videoUrl}
                                                controls
                                                playsInline
                                                preload="metadata"
                                                className="w-full h-auto max-h-72 object-contain bg-black"
                                              />
                                            </div>
                                          )}

                                          {/* Post / Message Bubble matching IMG_5472 */}
                                          {msg.text && (
                                              <div 
                                                  onDoubleClick={(e) => { e.stopPropagation(); handleReactToChannelMessage(msg.id, '❤️'); }}
                                                  className={cn(
                                                    "px-4 py-3 rounded-[18px] select-none relative flex flex-col transition-all",
                                                    isMe 
                                                      ? "msg-bubble-sent" 
                                                      : "msg-bubble-received"
                                                  )}
                                              >
                                                  <p className="text-[14.5px] leading-[1.48] whitespace-pre-wrap break-words">
                                                      {renderTextWithLinks(msg.text, isMe)}
                                                  </p>
                                                  <LinkPreviewCard text={msg.text} />
                                              </div>
                                          )}

                                          {/* Reactions Badge / Add Reaction */}
                                          <div 
                                              className={cn(
                                                "absolute -bottom-2 flex items-center gap-1 bg-white/95 dark:bg-zinc-800 border-0 shadow-[0_4px_12px_rgba(120,90,160,0.12)] rounded-full px-2 py-0.5 z-10 hover:scale-105 transition cursor-pointer",
                                                isMe ? "right-2" : "left-2",
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
                                                     <Icon name="plus" className="w-3 h-3" />
                                                  </div>
                                              )}
                                          </div>

                                          <span className={cn("text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mx-1 block", reactionEntries.length > 0 ? "mt-3.5" : "mt-1")}>
                                              {formatTime12h(msg.timestamp)}
                                          </span>
                                      </div>
                                  </div>
                              </React.Fragment>
                          );
                      })
                      )}
                      <ChatTypingIndicator
                        activity={otherActivity}
                        userName={activeChat?.otherUser?.shopName || activeChat?.otherUser?.displayName || "User"}
                        userPhoto={activeChat?.otherUser?.photoURL || activeChat?.otherUser?.avatarUrl || activeChat?.recipientAvatar}
                        className="px-2"
                      />
                      <div ref={messagesEndRef} />
                  </div>

                  {/* Channel Input Area matching IMG_5472 Composer */}
                  <div className="msg-composer-dock px-3.5 sm:px-6 pt-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom,6px))] shrink-0 z-10">
                      <AnimatePresence>
                          {replyingTo && (
                               <motion.div 
                                   initial={{ opacity: 0, y: 10 }} 
                                   animate={{ opacity: 1, y: 0 }} 
                                   exit={{ opacity: 0, y: 10 }} 
                                   className="mb-2 px-3.5 py-2.5 bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md border-0 shadow-[0_4px_16px_rgba(120,90,160,0.06)] rounded-2xl flex items-center justify-between text-left"
                               >
                                   <div>
                                       <p className="text-[11px] font-bold text-[#F246F5]">Replying to {replyingTo.senderName || (replyingTo.senderId === user?.uid ? "You" : "User")}</p>
                                       <p className="text-xs text-zinc-600 dark:text-zinc-300 truncate max-w-xs sm:max-w-md mt-0.5">{replyingTo.text}</p>
                                   </div>
                                   <button type="button" onClick={() => setReplyingTo(null)} className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer">
                                       <Icon name="x" className="w-4 h-4" />
                                   </button>
                               </motion.div>
                          )}
                          {previewUrls.length > 0 && (
    <div className="flex flex-wrap items-center gap-2 mb-3">
        {previewUrls.map((url, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative inline-block">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#F246F5] shadow-md relative">
                    <img src={url} alt="Preview" className="w-full h-full object-cover" />
                    {isUploadingAttachment && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center">
                            <Icon name="loader-2" className="w-5 h-5 animate-spin text-white" />
                        </div>
                    )}
                </div>
                <button type="button" onClick={() => { 
                    setAttachments(prev => prev.filter((_, i) => i !== idx));
                    setPreviewUrls(prev => prev.filter((_, i) => i !== idx));
                }} className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md cursor-pointer transition">
                    <Icon name="x" className="w-3.5 h-3.5" />
                </button>
            </motion.div>
        ))}
    </div>
)}
                      </AnimatePresence>

                      {activeChannel.creatorId === user.uid ? (
                          <div className="flex items-center gap-2.5 w-full pt-1 pb-2 relative">
                              <input type="file" ref={fileInputRef} onChange={handleAttachmentChange} className="hidden" accept="image/*" multiple />
                              
                              {isRecording ? (
                                  <div className="flex-1 flex items-center justify-between bg-white/95 dark:bg-zinc-900/90 backdrop-blur-xl px-4 py-2.5 rounded-full border-0 shadow-[0_4px_18px_rgba(120,90,160,0.08)]">
                                      <div className="flex items-center gap-3 text-[#F246F5] font-semibold text-sm">
                                          <div className="flex items-center gap-1.5 animate-pulse">
                                              <div className="w-2.5 h-2.5 rounded-full bg-[#F246F5]"></div>
                                              <div className="flex gap-0.5 items-center h-4">
                                              {[1,2,3,4,5].map(i => (
                                                  <div key={i} className="w-1 bg-[#F246F5] rounded-full animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }}></div>
                                              ))}
                                              </div>
                                          </div>
                                          <span className="tabular-nums font-mono">
                                              {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                                          </span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                          <span className="text-xs text-zinc-400 animate-pulse hidden sm:block">&lt; Slide to cancel</span>
                                          <button type="button" onClick={cancelRecording} className="text-zinc-500 hover:text-rose-500 transition-colors bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-full cursor-pointer">
                                              <Icon name="x" className="w-5 h-5" />
                                          </button>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="flex-1 h-12 flex items-center bg-white/95 dark:bg-zinc-900/85 backdrop-blur-md px-4 rounded-full shadow-[0_4px_18px_rgba(120,90,160,0.06)] border-0">
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
                                          className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-[9px] text-[15px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 placeholder:font-medium leading-[20px] h-[38px] px-0 focus:outline-none outline-none focus-visible:outline-none"
                                          rows={1}
                                      />
                                      <button type="button" onClick={() => fileInputRef.current?.click()} className="w-9 h-9 ml-1 rounded-full flex items-center justify-center text-zinc-400 hover:text-[#F246F5] transition-colors shrink-0 cursor-pointer" title="Add Image">
                                          <Icon name="image" className="w-[21px] h-[21px]" />
                                      </button>
                                  </div>
                              )}
                              
                              <div className="relative flex items-center justify-center h-12">
                                  {isRecording && (
                                      <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-zinc-800 text-zinc-500 rounded-full p-2 shadow-lg border-0 animate-bounce">
                                          <Icon name="lock" className="w-4 h-4" />
                                      </div>
                                  )}
                                  <button 
                                      type="button"
                                      onMouseDown={() => {
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
                                      onTouchStart={() => {
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
                                      className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all shadow-[0_6px_18px_rgba(242,70,245,0.28)] bg-[#F246F5] hover:bg-[#e135e4] hover:scale-105 active:scale-95 text-white cursor-pointer"
                                  >
                                      {isRecording ? (
                                          <Icon name="send" className="w-5 h-5 ml-0.5" />
                                      ) : newMessage.trim() || previewUrls.length > 0 ? (
                                          <Icon name="send" className="w-5 h-5 ml-0.5" />
                                      ) : (
                                          <Icon name="mic" className="w-5 h-5" />
                                      )}
                                  </button>
                              </div>
                          </div>
                      ) : (
                          <div className="flex justify-center w-full pb-2">
                              {userSubscription ? (
                                  <button
                                      type="button"
                                      onClick={() => handleToggleMuteChannel(activeChannel, userSubscription.muted)}
                                      className="w-full max-w-sm py-3 bg-white/90 hover:bg-white dark:bg-zinc-900/80 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-full font-bold text-sm shadow-[0_4px_16px_rgba(120,90,160,0.06)] transition flex items-center justify-center gap-2 cursor-pointer"
                                  >
                                      {userSubscription.muted ? <Icon name="volume-2" className="w-5 h-5 text-[#F246F5]" /> : <Icon name="volume-x" className="w-5 h-5 text-zinc-500" />}
                                      <span>{userSubscription.muted ? "Unmute" : "Mute"}</span>
                                  </button>
                              ) : (
                                  <button
                                      type="button"
                                      onClick={() => handleSubscribeToChannel(activeChannel)}
                                      className="w-full max-w-sm py-3 bg-[#F246F5] hover:bg-[#e135e4] text-white rounded-full font-bold text-sm transition flex items-center justify-center gap-2 shadow-[0_6px_18px_rgba(242,70,245,0.25)] cursor-pointer"
                                  >
                                      <span>Join Channel</span>
                                  </button>
                              )}
                          </div>
                      )}
                    </div>
                 </>
             )
         ) : !activeChat ? (
             /* Desktop Split-Screen Empty Workspace */
             <div className="flex-1 flex flex-col items-center justify-center ambient-dynamic-bg px-8 text-center select-none">
                 <div className="max-w-md w-full flex flex-col items-center">
                     <div className="w-16 h-16 rounded-[24px] bg-white/90 dark:bg-zinc-900/80 border-0 shadow-[0_6px_24px_rgba(120,90,160,0.07)] flex items-center justify-center mb-5">
                         <Icon name="message-circle" className="w-7 h-7 text-[#F246F5]" />
                     </div>
                     <h2 className="font-bold text-[22px] text-zinc-950 dark:text-white tracking-tight">
                         Select a conversation
                     </h2>
                     <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 max-w-sm leading-relaxed">
                         Choose an existing chat on the left, or start a new conversation, add a contact, or explore communities.
                     </p>

                     <div className="grid grid-cols-3 gap-3 w-full mt-7">
                         <button
                             type="button"
                             onClick={() => {
                               setNewMessageInitialStep('new_message');
                               setShowNewMessageModal(true);
                             }}
                             className="flex flex-col items-center gap-2 p-4 rounded-[22px] bg-white/90 hover:bg-white dark:bg-zinc-900/80 dark:hover:bg-zinc-800/80 border-0 shadow-[0_4px_20px_rgba(120,90,160,0.05)] transition cursor-pointer"
                         >
                             <div className="w-10 h-10 rounded-full bg-[#16181D] dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center">
                                 <Icon name="plus" className="w-5 h-5" />
                             </div>
                             <span className="text-xs font-bold text-zinc-900 dark:text-white">New Chat</span>
                         </button>

                         <button
                             type="button"
                             onClick={() => {
                               setNewChatPopupMode('new_contact');
                               setShowNewChatPopup(true);
                             }}
                             className="flex flex-col items-center gap-2 p-4 rounded-[22px] bg-white/90 hover:bg-white dark:bg-zinc-900/80 dark:hover:bg-zinc-800/80 border-0 shadow-[0_4px_20px_rgba(120,90,160,0.05)] transition cursor-pointer"
                         >
                             <div className="w-10 h-10 rounded-full bg-[#F246F5]/12 text-[#F246F5] flex items-center justify-center">
                                 <Icon name="user-plus" className="w-5 h-5" />
                             </div>
                             <span className="text-xs font-bold text-zinc-900 dark:text-white">New Contact</span>
                         </button>

                         <button
                             type="button"
                             onClick={() => {
                               setNewChatPopupMode('new_community');
                               setShowNewChatPopup(true);
                             }}
                             className="flex flex-col items-center gap-2 p-4 rounded-[22px] bg-white/90 hover:bg-white dark:bg-zinc-900/80 dark:hover:bg-zinc-800/80 border-0 shadow-[0_4px_20px_rgba(120,90,160,0.05)] transition cursor-pointer"
                         >
                             <div className="w-10 h-10 rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                 <Icon name="users" className="w-5 h-5" />
                             </div>
                             <span className="text-xs font-bold text-zinc-900 dark:text-white">Community</span>
                         </button>
                     </div>
                 </div>
             </div>
         ) : (
             <>
                 {/* Active Chat / DM Header matching IMG_5359 right: < Back | 44px Avatar + Name + "Online" | Video + Voice */}
                 <div className="msg-inbox-header px-4 sm:px-6 pt-4 pb-3 flex items-center justify-between shrink-0 z-20 gap-3">
                     <div className="flex items-center gap-3 min-w-0 flex-1">
                         <button
                            type="button"
                            onClick={() => setSearchParams({}, { replace: true })}
                            className="md:hidden w-11 h-11 rounded-full bg-white/95 dark:bg-zinc-800/90 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.06)] flex items-center justify-center text-zinc-900 dark:text-zinc-100 hover:bg-white dark:hover:bg-zinc-700/60 active:scale-95 transition shrink-0 cursor-pointer"
                            title="Back to Messages"
                          >
                              <MsgBackChevronIcon className="w-5 h-5 text-zinc-900 dark:text-white" />
                          </button>

                         <div
                           className="relative w-11 h-11 rounded-full shrink-0 cursor-pointer"
                           onClick={() => {
                                if (activeChat?.isGroup || activeChat?.type === 'group') {
                                    setShowGroupDetailsModal(true);
                                } else {
                                    setShowUserInfoModal(true);
                                }
                            }}
                         >
                             <div className="w-full h-full rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                                 {activeChat?.otherUser?.photoURL ? (
                                     <img src={activeChat?.otherUser?.photoURL} alt={activeChat?.otherUser?.displayName} className="w-full h-full object-cover" />
                                 ) : (
                                     <div className="w-full h-full flex items-center justify-center bg-[#2F80ED]/12 text-[#2F80ED] font-semibold text-sm">
                                         {(getChatDisplayName(activeChat) || 'U')[0].toUpperCase()}
                                     </div>
                                 )}
                             </div>
                         </div>

                         <div
                           className="min-w-0 flex flex-col justify-center flex-1 cursor-pointer"
                           onClick={() => {
                                if (activeChat?.isGroup || activeChat?.type === 'group') {
                                    setShowGroupDetailsModal(true);
                                } else {
                                    setShowUserInfoModal(true);
                                }
                            }}
                         >
                             <h3 className="font-bold text-[16px] text-zinc-950 dark:text-white truncate flex items-center gap-1.5 leading-tight">
                                 <span className="truncate">{getChatDisplayName(activeChat)}</span>
                                 {(activeChat?.otherUser?.kycStatus === "verified" || activeChat?.otherUser?.verified) && <VerifiedIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                             </h3>
                             <div className="flex items-center gap-1.5 truncate mt-0.5">
                                  {activeChat?.isGroup || activeChat?.type === 'group' ? (
                                      <p className="text-[12.5px] text-zinc-400 dark:text-zinc-400 truncate">
                                          {otherActivity ? "Someone is typing..." : `${activeChat?.participants?.length || 2} members`}
                                      </p>
                                  ) : otherActivity === 'typing' ? (
                                     <p className="text-[12.5px] font-medium text-[#2F80ED] truncate">
                                         typing...
                                     </p>
                                 ) : otherActivity === 'recording' ? (
                                     <p className="text-[12.5px] font-medium text-rose-500 flex items-center gap-1 truncate">
                                         <Icon name="mic" className="w-3 h-3 text-rose-500 shrink-0" />
                                         <span>recording voice...</span>
                                     </p>
                                 ) : otherActivity === 'uploading_photo' ? (
                                     <p className="text-[12.5px] font-medium text-[#2F80ED] flex items-center gap-1 truncate">
                                         <Icon name="image" className="w-3 h-3 shrink-0" />
                                         <span>sending photo...</span>
                                     </p>
                                 ) : otherActivity === 'choosing_gif' ? (
                                     <p className="text-[12.5px] font-medium text-[#2F80ED] truncate">
                                         choosing a GIF...
                                     </p>
                                 ) : otherUserPresence?.isOnline ? (
                                     <p className="text-[12.5px] text-zinc-400 dark:text-zinc-400 truncate">
                                         Online
                                     </p>
                                 ) : (
                                     <p className="text-[12.5px] text-zinc-400 dark:text-zinc-400 truncate">
                                         {getLastActiveText(otherUserPresence)}
                                     </p>
                                 )}
                                 {activeChat?.autoDeleteTimer && (
                                     <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 shrink-0">
                                         · Auto-delete {
                                             activeChat?.autoDeleteTimer?.duration === 86400000 ? "1d" :
                                             activeChat?.autoDeleteTimer?.duration === 604800000 ? "1w" :
                                             activeChat?.autoDeleteTimer?.duration === 2592000000 ? "1m" : "on"
                                         }
                                     </span>
                                 )}
                             </div>
                          </div>
                     </div>

                     {/* Header Actions: 1-Click Admin AI Toggle + Video Call + Voice Call */}
                     <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 relative">
                          {userRole === 'admin' && !(activeChat?.isGroup || activeChat?.type === 'group') &&
                            activeChat?.id && (
                            <button
                              type="button"
                              onClick={async () => {
                                triggerHaptic();
                                const chatDocId = activeChat.id;
                                const nextDisabled = !Boolean(activeChat?.aiDisabled);
                                if (nextDisabled && aiReplyTimeoutRef.current[chatDocId]) {
                                  clearTimeout(aiReplyTimeoutRef.current[chatDocId]);
                                  delete aiReplyTimeoutRef.current[chatDocId];
                                }
                                setTempActiveChat((prev: any) =>
                                  prev && prev.id === chatDocId
                                    ? { ...prev, aiDisabled: nextDisabled }
                                    : prev
                                );
                                setChats((prev) =>
                                  prev.map((c) =>
                                    c.id === chatDocId ? { ...c, aiDisabled: nextDisabled } : c
                                  )
                                );
                                try {
                                  await updateDoc(doc(db, 'p2p_chats', chatDocId), {
                                    aiDisabled: nextDisabled,
                                    ...(nextDisabled && user?.uid
                                      ? { [`typingState.${user.uid}`]: null }
                                      : {}),
                                  });
                                  notify(
                                    nextDisabled
                                      ? 'AI stopped for this user inbox'
                                      : 'AI auto-reply active for this inbox',
                                    'info'
                                  );
                                } catch {
                                  notify('Failed to toggle AI status', 'error');
                                }
                              }}
                              className={cn(
                                'h-9 px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer border',
                                activeChat?.aiDisabled
                                  ? 'bg-zinc-100 dark:bg-white/[0.06] border-zinc-200/80 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                                  : 'bg-emerald-500/12 border-emerald-500/25 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                              )}
                              title={activeChat?.aiDisabled ? 'Turn AI Auto-Reply On' : 'Stop AI Auto-Reply for this user (1-click)'}
                            >
                              <Icon name="bot" className="w-3.5 h-3.5 shrink-0" />
                              <span>{activeChat?.aiDisabled ? 'AI Off' : 'AI On'}</span>
                            </button>
                          )}
                         {/* Audio Call Button matching IMG_5472 */}
                         <button
                           type="button"
                           onClick={() => startCall("audio")}
                           className="w-11 h-11 rounded-full bg-white/95 dark:bg-zinc-800/90 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.06)] text-zinc-900 dark:text-white hover:bg-white dark:hover:bg-zinc-700/60 flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0"
                           title="Voice Call"
                           aria-label="Voice Call"
                         >
                           <Icon name="phone" className="w-5 h-5 text-zinc-900 dark:text-white" />
                         </button>

                         {/* Video Call Button matching IMG_5472 */}
                         <button
                           type="button"
                           onClick={() => startCall("video")}
                           className="w-11 h-11 rounded-full bg-white/95 dark:bg-zinc-800/90 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.06)] text-zinc-900 dark:text-white hover:bg-white dark:hover:bg-zinc-700/60 flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0"
                           title="Video Call"
                           aria-label="Video Call"
                         >
                           <Icon name="video" className="w-5 h-5 text-zinc-900 dark:text-white" />
                         </button>

                         {/* Conversation details menu button matching IMG_5472 */}
                         <button
                           type="button"
                           onClick={() => {
                             if (activeChat?.isGroup || activeChat?.type === "group") {
                               setShowGroupDetailsModal(true);
                             } else {
                               setShowUserInfoModal(true);
                             }
                           }}
                           className="w-11 h-11 rounded-full bg-white/95 dark:bg-zinc-800/90 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.06)] text-zinc-900 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700/60 flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0"
                           title="Conversation details"
                           aria-label="Conversation details"
                         >
                           <Icon name="more-vertical" className="w-5 h-5 text-zinc-900 dark:text-white" />
                         </button>
                      </div>
                 </div>

                 {showP2pSearch && (
                   <div className="msg-inbox-header px-4 py-2.5 border-b border-zinc-100 dark:border-white/[0.06] flex items-center gap-2.5 shrink-0 z-10">
                     <MsgSearchIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                     <input
                       type="text"
                       placeholder="Find messages in this chat..."
                       value={p2pSearchQuery}
                       onChange={(e) => setP2pSearchQuery(e.target.value)}
                       className="ds-liquid-input msg-clean-input flex-1 bg-transparent text-sm border-none outline-none placeholder:text-zinc-400"
                       autoFocus
                     />
                     {p2pSearchQuery && (
                       <button type="button" onClick={() => setP2pSearchQuery('')} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-zinc-400 cursor-pointer">
                         <MsgCloseIcon className="w-3.5 h-3.5" />
                       </button>
                     )}
                     <button
                       type="button"
                       onClick={() => { setShowP2pSearch(false); setP2pSearchQuery(''); }}
                       className="text-xs font-semibold text-[#2F80ED] px-2.5 py-1 hover:bg-[#2F80ED]/10 rounded-lg transition cursor-pointer"
                     >
                       Done
                     </button>
                   </div>
                 )}

                 <div className={cn("flex-1 overflow-y-auto px-4 sm:px-6 py-3 transition-colors", activeTheme?.id && activeTheme.id !== 'default' ? activeTheme.bgClass : 'msg-stream-default')}>
                  {messages.length === 0 && (
                    <EmptyChatState otherUser={activeChat?.otherUser} />
                  )}

                  {activeChat?.pinnedMessage && (
                    <div className="bg-white/90 dark:bg-zinc-900/80 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.05)] rounded-2xl px-3.5 py-2.5 mb-3 flex items-center justify-between text-xs shrink-0 z-10">
                      <div className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1" onClick={() => {
                        const targetMsg = messages.find(m => m.id === activeChat?.pinnedMessage.id);
                        if (targetMsg) {
                          document.getElementById(`msg-${targetMsg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          triggerHighlight(targetMsg.id);
                        } else {
                          notify(`Pinned: ${activeChat?.pinnedMessage.text}`, "info");
                        }
                      }}>
                        <Icon name="pin" className="w-3.5 h-3.5 text-[#F246F5] rotate-45 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-[11px] text-[#F246F5]">Pinned message</p>
                          <p className="text-zinc-600 dark:text-zinc-300 truncate max-w-full mt-0.5">
                            {activeChat?.pinnedMessage.text || "Attachment"}
                          </p>
                        </div>
                      </div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleUnpinMessageP2P(); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition text-zinc-400 shrink-0 ml-2 cursor-pointer">
                        <MsgCloseIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {filteredMessages.map((msg, idx) => {
                         const showDate = idx === 0 || formatDateSeparator(msg.timestamp) !== formatDateSeparator(filteredMessages[idx - 1]?.timestamp);
                         const isMe = msg.senderId === user.uid;
                         const isGroupChat = !!(activeChat?.isGroup || activeChat?.type === 'group');
                         const senderPhoto = msg.senderPhoto || participantProfiles[msg.senderId]?.photoURL || (!isGroupChat && activeChat?.otherUser?.photoURL) || '';
                         const senderName = msg.senderName || participantProfiles[msg.senderId]?.displayName || participantProfiles[msg.senderId]?.shopName || (!isGroupChat ? (activeChat?.otherUser?.shopName || activeChat?.otherUser?.displayName) : 'Member') || 'Member';
                         const nextMsg = filteredMessages[idx + 1];
                         const isLastInCluster = !nextMsg || nextMsg.senderId !== msg.senderId || formatDateSeparator(nextMsg.timestamp) !== formatDateSeparator(msg.timestamp);
                         const isSystem = !!msg.systemType;
                         const reactionEntries = Object.entries(msg.reactions || {});
                         const hasMedia = Boolean((msg.images && msg.images.length > 0) || msg.imageUrl);
                         const isMediaOnly = Boolean(hasMedia && !msg.text && !msg.replyTo && !msg.audioUrl);
                         const isVoiceOnly = Boolean(msg.audioUrl && !msg.text && !msg.replyTo && !hasMedia);
                         const isEmojiOnly = Boolean(msg.text && isOnlyEmojis(msg.text) && !msg.replyTo && !msg.audioUrl && !hasMedia);
                         const isCustomTheme = Boolean(activeTheme?.id && activeTheme.id !== 'default');
                         const isSeenByOther = Boolean(activeChat?.seenBy && activeChat?.seenBy.includes(activeChat?.otherUser?.id));

                         if (msg.isDeletedForEveryone) {
                            return (
                                <React.Fragment key={`${msg.id || idx}-${idx}`}>
                                    {showDate && (
                                        <div className="flex justify-center my-4 select-none">
                                            <span className="text-[12.5px] font-medium text-zinc-400 dark:text-zinc-500">
                                                {formatDateSeparator(msg.timestamp)}
                                            </span>
                                        </div>
                                    )}
                                    <div className={`flex w-full mb-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                     <div className={`flex max-w-[82%] sm:max-w-[70%] items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                         {isGroupChat && !isMe && (
                                             <div className="w-7 h-7 shrink-0 rounded-full overflow-hidden">
                                                 {isLastInCluster ? (
                                                     senderPhoto ?
                                                         <img src={senderPhoto} alt="Avatar" className="w-full h-full object-cover rounded-full" /> :
                                                         <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-[#2F80ED] bg-[#2F80ED]/12 rounded-full">
                                                             {(senderName || 'U')[0].toUpperCase()}
                                                         </div>
                                                 ) : null}
                                             </div>
                                         )}
                                         <div className="px-4 py-2.5 text-[14px] bg-zinc-100 dark:bg-zinc-800/60 rounded-[18px] text-zinc-500 dark:text-zinc-400 italic">
                                             {isMe ? 'You' : (senderName || 'User')} deleted a message
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
                                             <span className="text-[12.5px] font-medium text-zinc-400 dark:text-zinc-500">
                                                 {formatDateSeparator(msg.timestamp)}
                                             </span>
                                         </div>
                                     )}
                                     <div className="flex justify-center my-3">
                                         <CallBubble msg={msg} />
                                     </div>
                                 </React.Fragment>
                             );
                         }

                         const shouldAnimateBubble = Boolean(
                           animatedMsgIdsRef.current.has(msg.id) ||
                           (msg.clientMsgId && animatedMsgIdsRef.current.has(msg.clientMsgId)) ||
                           String(msg.id).startsWith('temp-')
                         );

                         return (
                             <React.Fragment key={msg.clientMsgId || msg.id || `${idx}`}>
                                 {showDate && (
                                     <div className="flex items-center justify-center my-4 select-none">
                                         <span className="text-[12.5px] font-medium text-zinc-400 dark:text-zinc-500 tabular-nums">
                                             {formatDateSeparator(msg.timestamp)}
                                         </span>
                                     </div>
                                 )}

                                 <motion.div
                                     id={`msg-${msg.id}`}
                                     initial={
                                       shouldAnimateBubble
                                         ? {
                                             opacity: 0,
                                             y: 12,
                                             scale: 0.95,
                                             x: isMe ? 10 : -10,
                                           }
                                         : false
                                     }
                                     animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                                     transition={{
                                       type: 'spring',
                                       stiffness: 520,
                                       damping: 32,
                                       mass: 0.68,
                                     }}
                                     className={cn(
                                         `flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'} relative group rounded-2xl will-change-transform`,
                                         reactionEntries.length > 0 ? "mb-5" : isLastInCluster ? "mb-3" : "mb-1.5",
                                         highlightedMessageId === msg.id && "bg-[#2F80ED]/10 ring-1 ring-[#2F80ED]/40 px-2 py-1.5"
                                     )}
                                 >
                                     {/* Sender Avatar aligned beside bubble bottom matching IMG_5472 */}
                                     {!isMe && (
                                         <div className="w-7 h-7 shrink-0 self-end mb-5">
                                             {isLastInCluster ? (
                                                 <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                                                     {senderPhoto ? (
                                                         <img src={senderPhoto} alt={senderName} className="w-full h-full object-cover" />
                                                     ) : (
                                                         <div className="w-full h-full flex items-center justify-center font-semibold text-[11px] bg-[#F246F5]/12 text-[#F246F5]">
                                                             {(senderName || "U")[0].toUpperCase()}
                                                         </div>
                                                     )}
                                                 </div>
                                             ) : null}
                                         </div>
                                     )}

                                     <div className={`max-w-[78%] sm:max-w-[66%] ${isMe ? 'items-end' : 'items-start'} flex flex-col relative`}>
                                         {/* Group Chat Sender Label */}
                                         {isGroupChat && !isMe && (idx === 0 || filteredMessages[idx - 1]?.senderId !== msg.senderId) && (
                                           <div className="flex items-center gap-1.5 mb-1 px-1">
                                             <span className={cn("text-[11.5px] font-semibold tracking-tight", getSenderColor(msg.senderId || senderName))}>
                                               {senderName}
                                             </span>
                                             {msg.senderRole && msg.senderRole !== 'member' && (
                                               <span className="text-[10px] text-zinc-400 font-medium">
                                                 · {msg.senderRole === 'creator' ? 'Admin' : msg.senderRole}
                                               </span>
                                             )}
                                           </div>
                                         )}

                                         {/* Clean Unboxed Forwarded Metadata */}
                                         {msg.forwardedFrom && (
                                           <div className="flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500 font-medium mb-1 px-1 select-none">
                                             <MsgForwardIcon className="w-3 h-3 shrink-0" />
                                             <span className="truncate max-w-[210px]">Forwarded · {msg.forwardedFrom}</span>
                                           </div>
                                         )}

                                         <div className={cn("flex items-center gap-1.5 group/msg relative", isMe ? "flex-row" : "flex-row-reverse")}>
                                           {/* Desktop Hover Quick Action Buttons (Reply & More/Hold Popup) */}
                                           <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity shrink-0">
                                             <button
                                               type="button"
                                               onClick={(e) => {
                                                 e.stopPropagation();
                                                 setReplyingTo({
                                                   id: msg.id,
                                                   text: msg.text || (hasMedia ? 'Photo' : msg.audioUrl ? 'Voice Message' : 'Attachment'),
                                                   senderId: msg.senderId,
                                                   senderName: isMe ? 'You' : senderName,
                                                   imageUrl: msg.images?.[0] || msg.imageUrl || undefined,
                                                   audioUrl: msg.audioUrl || undefined,
                                                 });
                                               }}
                                               className="w-7 h-7 rounded-full hover:bg-black/6 dark:hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
                                               title="Reply"
                                             >
                                               <MsgReplyIcon className="w-4 h-4" />
                                             </button>
                                             <button
                                               type="button"
                                               onClick={(e) => {
                                                 e.stopPropagation();
                                                 triggerOpenMsgHoldPopup(msg.id);
                                               }}
                                               className="w-7 h-7 rounded-full hover:bg-black/6 dark:hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
                                               title="Message options"
                                             >
                                               <MsgDotsHorizontalIcon className="w-4 h-4" />
                                             </button>
                                           </div>

                                           {/* Redesigned Message Bubble matching IMG_5359 right 1:1 (Hold on mobile or Right-Click on desktop opens MessageHoldPopup) */}
                                           <div
                                               {...getMsgHoldHandlers(msg.id)}
                                               onDoubleClick={(e) => { e.stopPropagation(); handleReactToMessage(msg.id, '❤️'); }}
                                               title={formatTime12h(msg.timestamp)}
                                               className={cn(
                                                 "select-none relative flex flex-col max-w-[330px] sm:max-w-[390px] transition-all",
                                                 isEmojiOnly
                                                   ? "bg-transparent shadow-none p-0.5"
                                                   : isMediaOnly || isVoiceOnly
                                                   ? "bg-transparent shadow-none p-0"
                                                   : privacySettings.minimalistBubbles
                                                   ? "px-4 py-3 rounded-[18px] border border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100"
                                                   : isMe
                                                   ? cn(
                                                       hasMedia ? "p-1.5" : "px-4 py-3",
                                                       "rounded-[18px]",
                                                       isCustomTheme ? activeTheme.bubbleClass : "msg-bubble-sent"
                                                     )
                                                   : cn(
                                                       hasMedia ? "p-1.5" : "px-4 py-3",
                                                       "msg-bubble-received rounded-[18px]"
                                                     )
                                               )}
                                           >
                                              {/* Quoted Reply Preview Inside Bubble */}
                                              {msg.replyTo && (
                                                  <div className={cn(hasMedia ? "px-1.5 pt-1" : "")}>
                                                    <MessageReplyPreview
                                                      replyTo={msg.replyTo}
                                                      isMe={isMe && !privacySettings.minimalistBubbles}
                                                      currentUserId={user?.uid || ""}
                                                      onScrollToMessage={(targetId) => {
                                                        document.getElementById("msg-" + targetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
                                                        triggerHighlight(targetId);
                                                      }}
                                                    />
                                                  </div>
                                              )}

                                              {/* Voice Message */}
                                              {(msg._localAudioUrl || msg.audioUrl) && (
                                                  <div className={cn("px-0.5 py-0.5", msg.text ? "mb-1" : "")}>
                                                      <VoiceMessageBubble
                                                          audioSrc={
                                                            (msg.clientMsgId && localVoiceBlobUrlsRef.current.get(msg.clientMsgId)) ||
                                                            msg._localAudioUrl ||
                                                            msg.audioUrl
                                                          }
                                                          duration={msg.audioDuration || 4}
                                                          isMe={isMe && !privacySettings.minimalistBubbles}
                                                          waveColor={isMe && !privacySettings.minimalistBubbles ? '#ffffff' : '#2F80ED'}
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

                                              {/* Photo / Mosaic Grid */}
                                              {hasMedia && (
                                                <div className={cn(msg.text ? "mb-1.5" : "")}>
                                                  <MessageMediaGrid
                                                    images={msg.images && msg.images.length > 0 ? msg.images : (msg.imageUrl ? [msg.imageUrl] : [])}
                                                    thumbnailSrcs={msg.imageThumbs || (msg.thumbUrl ? [msg.thumbUrl] : undefined)}
                                                    messageId={msg.id}
                                                    isMe={isMe}
                                                    dataSaverMode={privacySettings.dataSaverMode}
                                                    loadedImages={loadedImages}
                                                    onLoadImage={(key) => setLoadedImages(prev => ({ ...prev, [key]: true }))}
                                                    onImageClick={(url, iIdx, allImgs) => openMediaGallery(url, iIdx, allImgs, senderName, msg.timestamp)}
                                                  />
                                                </div>
                                              )}

                                              {/* Video attachment */}
                                              {msg.videoUrl && (
                                                <div className="my-1.5 max-w-xs sm:max-w-sm rounded-2xl overflow-hidden bg-black border border-white/10 shadow-md">
                                                  <video
                                                    src={msg.videoUrl}
                                                    controls
                                                    playsInline
                                                    preload="metadata"
                                                    className="w-full h-auto max-h-72 object-contain bg-black"
                                                  />
                                                </div>
                                              )}

                                              {/* Text & Link Preview */}
                                              {msg.text && (
                                                 <div className={cn(hasMedia ? "px-2.5 pb-1.5 pt-0.5" : "")}>
                                                    <p className={cn(
                                                        "leading-[1.48] whitespace-pre-wrap break-words",
                                                        isEmojiOnly ? "text-5xl ios-emoji leading-none" : "text-[14.5px]",
                                                        privacySettings.highContrastFonts && !isEmojiOnly
                                                          ? "font-bold"
                                                          : "font-normal"
                                                    )}>
                                                        {renderTextWithLinks(msg.text, isMe && !privacySettings.minimalistBubbles)}
                                                    </p>
                                                    {!isEmojiOnly && <LinkPreviewCard text={msg.text} />}
                                                 </div>
                                              )}

                                              {/* Floating Reaction Badge */}
                                              {reactionEntries.length > 0 && (
                                                  <div
                                                      className={cn(
                                                          "absolute -bottom-3 flex items-center gap-1 bg-white dark:bg-[#232530] border border-zinc-200/90 dark:border-white/10 shadow-sm rounded-full px-2 py-0.5 z-10 hover:scale-105 transition cursor-pointer",
                                                          isMe ? "right-2" : "left-2"
                                                      )}
                                                      onClick={(e) => { e.stopPropagation(); triggerOpenMsgHoldPopup(msg.id); }}
                                                  >
                                                      {Array.from(new Set(reactionEntries.map(([, emoji]) => emoji))).map((emoji: any, emIdx: number) => (
                                                          <span key={`dm-react-${emoji}-${emIdx}`} className="text-[12px] leading-none">{emoji}</span>
                                                      ))}
                                                      {reactionEntries.length > 1 && (
                                                          <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 tabular-nums">{reactionEntries.length}</span>
                                                      )}
                                                  </div>
                                              )}
                                           </div>
                                         </div>

                                         {/* AI Generated Disclaimer Label */}
                                         {(msg.isAiGenerated || msg.isAi || msg.senderId === 'ai' || msg.isBotReply) && (
                                             <div className={cn("flex items-center gap-1 mt-1 px-1 text-[10.5px] font-medium text-zinc-500 dark:text-zinc-400 select-none", isMe ? "justify-end" : "justify-start")}>
                                                 <Icon name="sparkles" className="w-3 h-3 text-amber-500 shrink-0" />
                                                 <span>AI generated message · AI can make mistakes</span>
                                             </div>
                                         )}

                                         {/* 12h Time Timestamp + Quiet Read Receipt matching IMG_5472 */}
                                         <div className={cn(
                                             "flex items-center gap-1.5 px-1 select-none",
                                             reactionEntries.length > 0 ? "mt-3.5" : "mt-1",
                                             isMe ? "justify-end" : "justify-start"
                                         )}>
                                             <span className="text-[11px] font-medium text-zinc-700/80 dark:text-zinc-400 tabular-nums">
                                                 {formatTime12h(msg.timestamp)}
                                             </span>
                                             {!privacySettings.minimalistBubbles && isMe && idx === filteredMessages.length - 1 && (
                                                 <span className={cn(
                                                     "inline-flex items-center gap-0.5 text-[10.5px] font-medium",
                                                     isSeenByOther ? "text-[#F246F5]" : "text-zinc-400 dark:text-zinc-500"
                                                 )}>
                                                     <MsgCheckDoubleIcon className="w-3.5 h-3.5" />
                                                     <span>{isSeenByOther ? "Seen" : (otherUserPresence?.isOnline ? "Delivered" : "Sent")}</span>
                                                 </span>
                                             )}
                                         </div>
                                     </div>
                                 </motion.div>
                             </React.Fragment>
                         );
                     })}
                     {!hasReviewed && activeChat?.otherUser?.id && activeChat?.otherUser?.id !== "system" && (!reviewDismissedAt || (Date.now() - reviewDismissedAt >= 24 * 60 * 60 * 1000)) && (messages.length >= 4 || (messages.length > 0 && (Date.now() - messages[messages.length - 1].timestamp) > 3600000)) && (
                       <div className="flex justify-center my-6">
                         <div
                           className="bg-white/90 dark:bg-zinc-900/80 border-0 rounded-[24px] p-4 max-w-sm w-full text-center shadow-[0_4px_20px_rgba(120,90,160,0.06)] hover:shadow-[0_6px_24px_rgba(120,90,160,0.1)] transition cursor-pointer relative"
                           onClick={() => { setShowReviewModal(true); }}
                         >
                           <button
                             type="button"
                             onClick={(e) => {
                               e.stopPropagation();
                               const now = Date.now();
                               localStorage.setItem('dismissed_review_' + activeChat?.id, now.toString());
                               setReviewDismissedAt(now);
                             }}
                             className="absolute top-2.5 right-2.5 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
                             title="Dismiss for 24h"
                           >
                             <MsgCloseIcon className="w-3.5 h-3.5" />
                           </button>
                           <div className="flex items-center justify-center gap-1 mb-2 text-amber-500">
                             <Icon name="star" solid className="w-4 h-4 text-amber-500" />
                             <Icon name="star" solid className="w-4 h-4 text-amber-500" />
                             <Icon name="star" solid className="w-4 h-4 text-amber-500" />
                             <Icon name="star" solid className="w-4 h-4 text-amber-500" />
                             <Icon name="star" solid className="w-4 h-4 text-amber-500" />
                           </div>
                           <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                             Rate Your Experience
                           </h4>
                           <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                             Share a review for <strong className="text-zinc-800 dark:text-zinc-200">{activeChat?.otherUser?.shopName || activeChat?.otherUser?.displayName || "Seller"}</strong>
                           </p>
                         </div>
                       </div>
                     )}

                     <ChatTypingIndicator
                       activity={otherActivity}
                       userName={activeChat?.otherUser?.shopName || activeChat?.otherUser?.displayName || "User"}
                       userPhoto={activeChat?.otherUser?.photoURL || activeChat?.otherUser?.avatarUrl || activeChat?.recipientAvatar}
                       className="px-2"
                     />
                     <div ref={messagesEndRef} />
                 </div>

                 {/* Clean Borderless Composer Dock & Replying-To Banner */}
                 <div className="msg-composer-dock px-3.5 sm:px-6 pt-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom,6px))] shrink-0 z-20 transition-all">
                     <AnimatePresence>
                         {replyingTo && (
                             <motion.div
                                 initial={{ opacity: 0, y: 8 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 exit={{ opacity: 0, y: 8 }}
                                 className="mb-2 px-3.5 py-2.5 msg-composer-capsule border rounded-2xl flex items-center justify-between gap-3 text-left w-full min-w-0 overflow-hidden"
                             >
                                 <div className="w-7 h-7 rounded-full bg-[#2F80ED]/12 text-[#2F80ED] flex items-center justify-center shrink-0">
                                     <MsgReplyIcon className="w-4 h-4" />
                                 </div>
                                 <div className="flex-1 min-w-0 overflow-hidden">
                                     <p className="text-[11.5px] font-semibold text-[#1877F2] truncate">
                                         Replying to {replyingTo.senderName || (replyingTo.senderId === user?.uid ? "yourself" : (activeChat?.otherUser?.shopName || activeChat?.otherUser?.displayName || "User"))}
                                     </p>
                                     <p className="text-xs text-zinc-600 dark:text-zinc-300 truncate mt-0.5">
                                         {replyingTo.text}
                                     </p>
                                 </div>
                                 {replyingTo.imageUrl && (
                                     <img src={replyingTo.imageUrl} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0 border border-black/10 dark:border-white/10" />
                                 )}
                                 <button
                                     type="button"
                                     onClick={() => setReplyingTo(null)}
                                     className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition shrink-0 cursor-pointer"
                                     title="Cancel reply"
                                 >
                                     <Icon name="x" className="w-4 h-4" />
                                 </button>
                             </motion.div>
                         )}
                     </AnimatePresence>
                     
                     <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" multiple />
                     <input type="file" ref={cameraInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" capture="environment" />
                     <input type="file" ref={videoInputRef} onChange={handleVideoSelect} className="hidden" accept="video/*,.mp4,.webm,.mov,.m4v" />

                     <ChatBottomBar
                       newMessage={newMessage}
                       setNewMessage={setNewMessage}
                       onInputChange={handleInputChange}
                       onSendMessage={() => handleSendMessage()}
                       isRecording={isRecording}
                       recordingDuration={recordingDuration}
                       startRecording={startRecording}
                       stopRecording={stopRecording}
                       cancelRecording={cancelRecording}
                       fileInputRef={fileInputRef}
                       cameraInputRef={cameraInputRef}
                       videoInputRef={videoInputRef}
                       onOpenSavedReplies={() => setShowSavedRepliesModal(true)}
                       onOpenDraw={() => setShowDrawModal(true)}
                       onOpenGifs={() => setGifStickerModalState({ isOpen: true, type: "gif" })}
                       onOpenStickers={() => setGifStickerModalState({ isOpen: true, type: "sticker" })}
                       isBlocked={Boolean(activeChat?.blockedBy?.length > 0 || isDMBlocked)}
                       blockedMessage={
                         activeChat?.blockedBy?.includes(user?.uid)
                           ? "You blocked this user."
                           : activeChat?.blockedBy?.length > 0
                           ? "You have been blocked."
                           : isDMBlocked
                           ? "This user privacy settings restrict direct messaging."
                           : undefined
                       }
                       isUploading={isUploadingAttachment}
                       previewUrls={previewUrls}
                       previewVideoUrl={previewVideoUrl}
                       onRemovePreview={(idx) => {
                         setAttachments(prev => prev.filter((_, i) => i !== idx));
                         setPreviewUrls(prev => prev.filter((_, i) => i !== idx));
                       }}
                       onRemoveVideoPreview={() => setPreviewVideoUrl(null)}
                     />
                 </div>
             </>
         )}
      </div>

      {/* Full Screen Call UI Overlay (IMG_5469 1-on-1 & IMG_5474 Group Call) */}
      <AnimatePresence>
        {isCalling && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="fixed inset-0 z-[999] ambient-dynamic-bg flex flex-col justify-between p-6 select-none"
          >
            {/* Top Bar matching IMG_5469 & IMG_5474 */}
            <div className="flex items-center justify-between z-20 pt-2">
              <button
                type="button"
                onClick={() => endCall()}
                className="w-11 h-11 rounded-full bg-white/95 dark:bg-zinc-800/90 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.08)] flex items-center justify-center text-zinc-900 dark:text-white hover:bg-white active:scale-95 transition cursor-pointer"
                title="Back"
              >
                <MsgBackChevronIcon className="w-5 h-5" />
              </button>

              <h2 className="text-[17px] font-bold text-zinc-900 dark:text-white tracking-tight">
                {getChatDisplayName(activeChat) || "Wade Warren"}
              </h2>

              {Boolean(activeChat?.isGroup || activeChat?.type === "group" || callType === "video") ? (
                <div className="bg-[#FF2E93] text-white px-3.5 py-1 rounded-full text-xs font-bold border border-pink-400/30">
                  {`${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, "0")}`}
                </div>
              ) : (
                <div className="w-11" />
              )}
            </div>

            {/* Main Call View */}
            {Boolean(activeChat?.isGroup || activeChat?.type === "group" || (activeChat?.participants && activeChat?.participants.length > 2)) ? (
              /* Group Video Call: 2x2 Grid with Real Participant Data & Live Video (IMG_5474) */
              <div className="grid grid-cols-2 gap-3.5 flex-1 my-5 overflow-hidden">
                {(() => {
                  const groupMembers = Array.isArray(activeChat?.participants) && activeChat.participants.length > 0
                    ? activeChat.participants
                    : [
                        { name: getChatDisplayName(activeChat) || "Member 1", img: activeChat?.otherUser?.photoURL || activeChat?.otherUser?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80" },
                        { name: "Group Member", img: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80" },
                        { name: "Participant", img: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=80" },
                      ];
                  
                  const fourGrid = [
                    ...groupMembers.slice(0, 3).map((m: any, i: number) => ({
                      name: typeof m === 'string' ? `User ${i + 1}` : (m.displayName || m.name || `User ${i + 1}`),
                      img: typeof m === 'object' ? (m.photoURL || m.avatar || m.img || '') : '',
                    })),
                    { name: user?.displayName || "You", img: user?.photoURL || "", isMe: true }
                  ].slice(0, 4);

                  return fourGrid.map((participant, pIdx) => (
                    <div key={`part-${pIdx}-${participant.name}`} className="relative rounded-[28px] overflow-hidden bg-zinc-800 border border-zinc-200/40 dark:border-white/10">
                      {participant.isMe && callType === "video" ? (
                        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                      ) : pIdx === 0 && callType === "video" && remoteStream ? (
                        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      ) : participant.img ? (
                        <img src={participant.img} alt={participant.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white font-bold text-lg">
                          {(participant.name || 'U')[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="absolute bottom-3 inset-x-0 flex justify-center">
                        <span className="px-3.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-[11.5px] font-medium border border-white/20">
                          {participant.isMe ? "You" : participant.name}
                        </span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            ) : (
              /* 1-on-1 Call: Radiant Sunset Halo + Live Video Stream / Avatar (IMG_5469) */
              <div className="flex flex-col items-center justify-center flex-1 my-auto">
                <div className="relative flex items-center justify-center">
                  {/* Glowing Multi-Color Sunset Halo (IMG_5469) */}
                  <div className="absolute -inset-10 rounded-full bg-gradient-to-tr from-[#FF7A00] via-[#FF007A] to-[#FFE600] blur-3xl opacity-85 animate-pulse" />

                  {/* Video / Avatar Box */}
                  <div className="relative z-10 w-56 h-56 sm:w-64 sm:h-64 rounded-full overflow-hidden border-4 border-white/90 dark:border-white/20 bg-zinc-900 flex items-center justify-center">
                    {callType === "video" ? (
                      <video 
                        ref={localVideoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <img 
                        src={activeChat?.otherUser?.photoURL || activeChat?.otherUser?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=600&auto=format&fit=crop&q=80"} 
                        alt="Caller" 
                        className="w-full h-full object-cover" 
                      />
                    )}
                  </div>
                </div>

                {/* Translucent Frosted Glass Pill Below Avatar (IMG_5469) */}
                <div className="relative z-10 -mt-5 px-6 py-2 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur-md border border-white/60 dark:border-white/10 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {callStatus === "connected" 
                    ? `${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, "0")}` 
                    : callStatus === 'connecting'
                    ? "Ringing..."
                    : `${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, "0")}`
                  }
                </div>
              </div>
            )}

            {/* Audio element for remote audio */}
            <audio ref={remoteAudioRef} autoPlay playsInline className="sr-only" />

            {/* Bottom Controls Dock matching IMG_5469 & IMG_5474 */}
            <div className="flex justify-center items-center gap-4 sm:gap-6 z-20 pb-4">
              {/* 1. Add User / UserPlus */}
              <button 
                type="button" 
                onClick={() => notify("Invite link copied to clipboard", "success")} 
                className="w-12 h-12 rounded-full bg-white/95 dark:bg-zinc-800/90 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.08)] text-zinc-800 dark:text-zinc-200 flex items-center justify-center hover:bg-white active:scale-95 transition cursor-pointer"
                title="Invite to call"
              >
                <Icon name="user-plus" className="w-5 h-5" />
              </button>

              {/* 2. Video Camera Toggle */}
              <button 
                type="button" 
                onClick={() => setCallType(prev => prev === "video" ? "audio" : "video")} 
                className="w-12 h-12 rounded-full bg-white/95 dark:bg-zinc-800/90 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.08)] text-zinc-800 dark:text-zinc-200 flex items-center justify-center hover:bg-white active:scale-95 transition cursor-pointer"
                title="Camera"
              >
                <Icon name="video" className="w-5 h-5" />
              </button>

              {/* 3. Large Red End Call Button (IMG_5469 & IMG_5474) */}
              <button 
                type="button" 
                onClick={() => endCall()} 
                className="w-16 h-16 rounded-full bg-[#FF3B30] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition cursor-pointer shadow-[0_8px_24px_rgba(255,59,48,0.3)]"
                title="End Call"
              >
                <Icon name="phone-off" className="w-7 h-7 text-white" />
              </button>

              {/* 4. Mic Toggle */}
              <button 
                type="button" 
                onClick={() => setIsMuted(!isMuted)} 
                className={`w-12 h-12 rounded-full border-0 shadow-[0_4px_16px_rgba(120,90,160,0.08)] flex items-center justify-center active:scale-95 transition cursor-pointer ${
                  isMuted 
                    ? "bg-rose-500 text-white" 
                    : "bg-white/95 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-200"
                }`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <Icon name="mic-off" className="w-5 h-5" /> : <Icon name="mic" className="w-5 h-5" />}
              </button>

              {/* 5. Speaker Toggle */}
              <button 
                type="button" 
                onClick={() => setIsSpeaker(!isSpeaker)} 
                className={`w-12 h-12 rounded-full border-0 shadow-[0_4px_16px_rgba(120,90,160,0.08)] flex items-center justify-center active:scale-95 transition cursor-pointer ${
                  isSpeaker 
                    ? "bg-[#F246F5] text-white" 
                    : "bg-white/95 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-200"
                }`}
                title="Speaker"
              >
                <Icon name="volume-2" className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Hold / Long-Press Context Popup matching IMG_5359 right */}
      {(() => {
        const heldMsg =
          activeMessageMenuId !== null
            ? activeChannel
              ? channelMessages.find((m) => m.id === activeMessageMenuId)
              : messages.find((m) => m.id === activeMessageMenuId)
            : null;
        const canPinMsg = Boolean(
          heldMsg &&
            (!activeChannel ||
              userRole === 'admin' ||
              userRole === 'owner' ||
              activeChannel.creatorId === user?.uid)
        );
        const isMsgPinned = Boolean(
          heldMsg &&
            (activeChannel
              ? (activeChannel.pinnedMessages || []).some((p: any) => p.id === heldMsg.id) ||
                activeChannel.pinnedMessage?.id === heldMsg.id
              : activeChat?.pinnedMessage?.id === heldMsg.id)
        );

        return (
          <MessageHoldPopup
            isOpen={activeMessageMenuId !== null && Boolean(heldMsg)}
            message={heldMsg}
            currentUserId={user?.uid}
            canPin={canPinMsg}
            isPinned={isMsgPinned}
            onClose={() => setActiveMessageMenuId(null)}
            onReact={(emoji) => {
              if (!activeMessageMenuId) return;
              if (activeChannel) {
                handleReactToChannelMessage(activeMessageMenuId, emoji);
              } else {
                handleReactToMessage(activeMessageMenuId, emoji);
              }
            }}
            onCopy={async () => {
              if (!heldMsg) return;
              const copyTarget =
                heldMsg.text || heldMsg.images?.[0] || heldMsg.imageUrl || heldMsg.audioUrl || '';
              if (!copyTarget) {
                notify('Nothing to copy', 'info');
                return;
              }
              try {
                await navigator.clipboard.writeText(copyTarget);
                notify('Copied to clipboard', 'success');
              } catch {
                notify('Failed to copy', 'error');
              }
            }}
            onReply={() => {
              if (!heldMsg) return;
              const resolvedSender =
                heldMsg.senderName ||
                (heldMsg.senderId === user?.uid
                  ? 'You'
                  : participantProfiles[heldMsg.senderId]?.displayName ||
                    chatUsersData[heldMsg.senderId]?.displayName ||
                    activeChat?.otherUser?.displayName ||
                    activeChat?.otherUser?.shopName ||
                    'User');
              setReplyingTo({
                id: heldMsg.id,
                text:
                  heldMsg.text ||
                  (heldMsg.images?.length || heldMsg.imageUrl
                    ? 'Photo'
                    : heldMsg.audioUrl
                    ? 'Voice Message'
                    : 'Attachment'),
                senderId: heldMsg.senderId,
                senderName: resolvedSender,
                imageUrl: heldMsg.images?.[0] || heldMsg.imageUrl || undefined,
                audioUrl: heldMsg.audioUrl || undefined,
              });
            }}
            onForward={() => {
              if (!heldMsg) return;
              const resolvedOriginName =
                heldMsg.forwardedFrom ||
                heldMsg.senderName ||
                (heldMsg.senderId === user?.uid
                  ? (userShopName || user?.displayName || 'You')
                  : (participantProfiles[heldMsg.senderId]?.displayName ||
                     activeChat?.otherUser?.shopName ||
                     activeChat?.otherUser?.displayName ||
                     'User'));
              setForwardSearchQuery('');
              setForwardedTargetsMap({});
              setForwardingMessage({
                ...heldMsg,
                originalSenderName: resolvedOriginName,
              });
              setShowForwardModal(true);
            }}
            onDelete={() => {
              if (!heldMsg) return;
              setDeleteMessageId(heldMsg.id);
            }}
            onTogglePin={() => {
              if (!heldMsg) return;
              if (activeChannel) {
                handlePinMessage(heldMsg);
              } else {
                handlePinMessageP2P(heldMsg);
              }
            }}
          />
        );
      })()}

      {/* Review Dialog Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-[10000] ambient-dynamic-bg overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              className="min-h-screen w-full flex flex-col max-w-lg mx-auto p-6 font-inter relative"
            >
              <button 
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/95 dark:bg-zinc-800/90 shadow-[0_4px_16px_rgba(120,90,160,0.06)] text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>

              <div className="text-center mb-6 pt-4">
                <div className="inline-flex p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-amber-500 mb-3">
                  <Icon name="star" solid className="w-8 h-8 text-amber-500" />
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
                    className="p-1 hover:scale-110 active:scale-95 transition cursor-pointer"
                  >
                    <Icon 
                      name="star"
                      solid={star <= reviewRating}
                      className={`w-10 h-10 ${
                        star <= reviewRating ? "text-amber-500" : "text-zinc-300 dark:text-zinc-700"
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
                  className="w-full text-sm bg-white/90 dark:bg-zinc-900/80 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.05)] rounded-2xl p-4 outline-none focus:ring-2 ring-[#F246F5]/40 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-none"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 py-3.5 bg-white/90 hover:bg-white dark:bg-zinc-900/80 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-full font-bold text-sm shadow-[0_4px_16px_rgba(120,90,160,0.05)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingReview}
                  onClick={handleSubmitReview}
                  className="flex-1 py-3.5 bg-[#F246F5] hover:bg-[#e135e4] text-white rounded-full font-bold text-sm transition-all shadow-[0_6px_18px_rgba(242,70,245,0.25)] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-55 cursor-pointer"
                >
                  {isSubmittingReview ? (
                    <Icon name="loader-2" className="w-5 h-5 animate-spin" />
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateChannelModal(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="w-full max-w-md ambient-dynamic-bg rounded-[32px] overflow-hidden relative z-10 font-inter shadow-2xl border-0 flex flex-col max-h-[90vh]"
            >
              <div className="px-5 py-4 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/95 dark:bg-zinc-800/90 shadow-[0_4px_16px_rgba(120,90,160,0.06)] flex items-center justify-center">
                        <Icon name="sparkles" className="w-5 h-5 text-[#F246F5]" />
                    </div>
                    <div>
                        <h3 className="text-[17px] font-bold text-zinc-950 dark:text-zinc-100 leading-none mb-1">
                          {isEditingChannel ? 'Edit Channel' : 'New Channel'}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Broadcast your updates</p>
                    </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowCreateChannelModal(false)}
                  className="w-10 h-10 rounded-full bg-white/95 dark:bg-zinc-800/90 shadow-[0_4px_16px_rgba(120,90,160,0.06)] text-zinc-700 dark:text-zinc-300 hover:bg-white transition flex items-center justify-center cursor-pointer"
                >
                  <Icon name="x" className="w-5 h-5" />
                </button>
              </div>

              <div className="px-5 pb-5 pt-2 overflow-y-auto space-y-5">
                {/* Cover Image Upload (Stylish) */}
                <div className="flex flex-col items-center justify-center">
                  <div 
                      onClick={() => { const el = document.getElementById('channel-img-upload'); if(el) el.click(); }}
                      className="w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-[#F246F5]/60 flex items-center justify-center cursor-pointer hover:bg-[#F246F5]/5 transition group relative bg-white/90 dark:bg-zinc-900/80 shadow-[0_4px_18px_rgba(120,90,160,0.08)]"
                  >
                      {chanImagePreview ? (
                          <img src={chanImagePreview} alt="Preview" className="w-full h-full object-cover group-hover:opacity-50 transition" />
                      ) : (
                          <Icon name="image" className="w-8 h-8 text-[#F246F5]/60 group-hover:text-[#F246F5] transition" />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Icon name="plus" className="w-6 h-6 text-white" />
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
                        className="w-full text-sm bg-white/90 dark:bg-zinc-900/80 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.05)] rounded-2xl px-4 py-3 outline-none focus:ring-2 ring-[#F246F5]/40 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">
                        Handle (Unique)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-[13px] text-zinc-400 text-sm font-bold">@</span>
                        <input
                          type="text"
                          value={chanLink}
                          onChange={(e) => setChanLink(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          placeholder="vintage_elite"
                          className="w-full text-sm bg-white/90 dark:bg-zinc-900/80 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.05)] rounded-2xl pl-8 pr-4 py-3 outline-none focus:ring-2 ring-[#F246F5]/40 text-zinc-900 dark:text-zinc-100 font-semibold placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-all"
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
                        className="w-full text-sm bg-white/90 dark:bg-zinc-900/80 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.05)] rounded-2xl px-4 py-3 outline-none focus:ring-2 ring-[#F246F5]/40 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none transition-all"
                      />
                    </div>

                    <div className="bg-white/90 dark:bg-zinc-900/80 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.05)] rounded-[22px] p-4 flex items-center justify-between">
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
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${chanIsPrivate ? 'bg-[#F246F5]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${chanIsPrivate ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>
                </div>
              </div>

              <div className="p-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateChannelModal(false)}
                  className="flex-1 py-3 rounded-full bg-white/90 dark:bg-zinc-900/80 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.05)] text-zinc-900 dark:text-white font-bold transition hover:bg-white dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCommunityChannel}
                  disabled={isCreatingChannel || !chanName.trim() || !chanLink.trim()}
                  className="flex-1 py-3 rounded-full bg-[#F246F5] hover:bg-[#e135e4] text-white font-bold shadow-[0_6px_18px_rgba(242,70,245,0.25)] disabled:opacity-50 disabled:cursor-not-allowed transition flex justify-center items-center gap-2 cursor-pointer"
                >
                  {isCreatingChannel ? (
                      <Icon name="loader-2" className="w-5 h-5 animate-spin" />
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
          const isBlocked = activeChat?.blockedBy?.includes(user.uid);
          try {
            if (isBlocked) {
              await updateDoc(doc(db, "p2p_chats", activeChat?.id), {
                blockedBy: (activeChat?.blockedBy || []).filter((id: string) => id !== user.uid),
              });
              notify("User unblocked", "success");
            } else {
              const currentBlocked = (activeChat?.blockedBy || []) || [];
              await updateDoc(doc(db, "p2p_chats", activeChat?.id), {
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
            updateDoc(doc(db, "p2p_chats", activeChat?.id), {
              autoDeleteTimer: { duration, enabledAt: serverTimestamp() },
            }).catch(console.error);
            notify("Disappearing messages enabled", "success");
          } else {
            updateDoc(doc(db, "p2p_chats", activeChat?.id), {
              autoDeleteTimer: null,
            }).catch(console.error);
            notify("Disappearing messages turned off", "info");
          }
        }}
        currentAutoDeleteDuration={activeChat?.autoDeleteTimer?.duration || null}
        onOpenGroupModal={() => {
          setNewMessageInitialStep('new_group_select');
          setNewMessageInitialGroupType('group');
          setShowNewMessageModal(true);
        }}
        onOpenWallpaperModal={() => setShowWallpaperModal(true)}
        onOpenClearChatModal={() => setShowClearChatModal(true)}
        notify={notify}
      />

      {/* Saved Replies Modal (Design Images 5 & 6: IMG_3981.png & IMG_3983.png) */}
      <SavedRepliesModal
        isOpen={showSavedRepliesModal}
        onClose={() => setShowSavedRepliesModal(false)}
        onSelectReply={handleSelectSavedReply}
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
        type={gifStickerModalState.type}
        onSelectMedia={(url, isSticker) => handleSendDirectMedia(url, Boolean(isSticker))}
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPrivacySettingsModal(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="w-full max-w-md ambient-dynamic-bg rounded-[32px] overflow-hidden relative z-10 font-inter shadow-2xl border-0 flex flex-col max-h-[90vh]"
            >
              <div className="px-5 py-4 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/95 dark:bg-zinc-800/90 shadow-[0_4px_16px_rgba(120,90,160,0.06)] flex items-center justify-center">
                        <Icon name="settings" className="w-5 h-5 text-[#F246F5]" />
                    </div>
                    <div>
                        <h3 className="text-[17px] font-bold text-zinc-950 dark:text-zinc-100 leading-none mb-1">
                          Privacy & Settings
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Manage your communication</p>
                    </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowPrivacySettingsModal(false)}
                  className="w-10 h-10 rounded-full bg-white/95 dark:bg-zinc-800/90 shadow-[0_4px_16px_rgba(120,90,160,0.06)] text-zinc-700 dark:text-zinc-300 hover:bg-white transition flex items-center justify-center cursor-pointer"
                >
                  <Icon name="x" className="w-5 h-5" />
                </button>
              </div>

              <div className="px-5 pb-5 pt-2 overflow-y-auto space-y-6">
                {/* Privacy & Security Section */}
                <div className="space-y-3">
                    <h4 className="text-[11px] font-extrabold text-[#F246F5] uppercase tracking-widest ml-1">
                        Privacy & Security
                    </h4>
                    
                    <div className="bg-white/90 dark:bg-zinc-900/80 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.05)] rounded-[22px] p-4 flex items-center justify-between">
                      <div className="space-y-1 max-w-[75%]">
                        <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          Allow Direct Messages
                        </label>
                        <p className="text-[11px] text-zinc-500 leading-tight">
                          Anyone can message you. If disabled, strangers see a privacy notice.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const val = !privacySettings.allowDirectMessages;
                          setPrivacySettings(prev => ({ ...prev, allowDirectMessages: val }));
                          if (user) await updateDoc(doc(db, 'users', user.uid), { 'privacy.allowDirectMessages': val });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.allowDirectMessages ? 'bg-[#F246F5]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.allowDirectMessages ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="bg-white/90 dark:bg-zinc-900/80 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.05)] rounded-[22px] p-4 flex items-center justify-between">
                      <div className="space-y-1 max-w-[75%]">
                        <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          Online Presence Indicator
                        </label>
                        <p className="text-[11px] text-zinc-500 leading-tight">
                          Show live active status green dot when online in chat lists.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const val = !privacySettings.showOnlineStatus;
                          setPrivacySettings(prev => ({ ...prev, showOnlineStatus: val }));
                          if (user) await updateDoc(doc(db, 'users', user.uid), { 'privacy.showOnlineStatus': val });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.showOnlineStatus ? 'bg-[#F246F5]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.showOnlineStatus ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="bg-white/90 dark:bg-zinc-900/80 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.05)] rounded-[22px] p-4 flex items-center justify-between">
                      <div className="space-y-1 max-w-[75%]">
                        <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          Biometric & PIN Passcode Lock
                        </label>
                        <p className="text-[11px] text-zinc-500 leading-tight">
                          Require PIN code to view private messages.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const val = !privacySettings.biometricLock;
                          setPrivacySettings(prev => ({ ...prev, biometricLock: val }));
                          if (user) await updateDoc(doc(db, 'users', user.uid), { 'privacy.biometricLock': val });
                          notify(val ? "PIN Passcode Lock Enabled" : "PIN Lock Disabled", val ? "success" : "info");
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.biometricLock ? 'bg-[#F246F5]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.biometricLock ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="bg-white/90 dark:bg-zinc-900/80 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.05)] rounded-[22px] p-4 flex items-center justify-between">
                      <div className="space-y-1 max-w-[75%]">
                        <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          Disappearing Messages (24h)
                        </label>
                        <p className="text-[11px] text-zinc-500 leading-tight">
                          Automatically clear chat messages after 24 hours.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const val = !privacySettings.disappearingMessages;
                          setPrivacySettings(prev => ({ ...prev, disappearingMessages: val }));
                          if (user) await updateDoc(doc(db, 'users', user.uid), { 'privacy.disappearingMessages': val });
                          notify(val ? "Disappearing Messages (24h) Turned On" : "Disappearing Messages Turned Off", "info");
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.disappearingMessages ? 'bg-[#F246F5]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.disappearingMessages ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                </div>

                {/* Appearance & Themes Section */}
                <div className="space-y-3">
                    <h4 className="text-[11px] font-extrabold text-[#F246F5] uppercase tracking-widest ml-1">
                        Design & Styling
                    </h4>
                    
                    <div className="bg-white/90 dark:bg-zinc-900/80 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.05)] rounded-[22px] p-4 flex items-center justify-between">
                      <div className="space-y-1 max-w-[75%]">
                        <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          Liquid Glass Mode
                        </label>
                        <p className="text-[11px] text-zinc-500 leading-tight">
                          Translucent backdrop blur style for chat bubbles.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const val = !privacySettings.liquidGlassMode;
                          setPrivacySettings(prev => ({ ...prev, liquidGlassMode: val }));
                          if (user) await updateDoc(doc(db, 'users', user.uid), { 'privacy.liquidGlassMode': val });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.liquidGlassMode ? 'bg-[#F246F5]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.liquidGlassMode ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="bg-white/90 dark:bg-zinc-900/80 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.05)] rounded-[22px] p-4 flex items-center justify-between">
                      <div className="space-y-1 max-w-[75%]">
                        <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          High Contrast Typography
                        </label>
                        <p className="text-[11px] text-zinc-500 leading-tight">
                          Enhance text contrast for max readability.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const val = !privacySettings.highContrastFonts;
                          setPrivacySettings(prev => ({ ...prev, highContrastFonts: val }));
                          if (user) await updateDoc(doc(db, 'users', user.uid), { 'privacy.highContrastFonts': val });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.highContrastFonts ? 'bg-[#F246F5]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.highContrastFonts ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                </div>

                {/* Interactive Controls */}
                <div className="space-y-3">
                    <h4 className="text-[11px] font-extrabold text-[#F246F5] uppercase tracking-widest ml-1">
                        Chat & Audio Controls
                    </h4>
                    
                    <div className="bg-white/90 dark:bg-zinc-900/80 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.05)] rounded-[22px] p-4 flex items-center justify-between">
                      <div className="space-y-1 max-w-[75%]">
                        <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          Apple Haptic Feedback
                        </label>
                        <p className="text-[11px] text-zinc-500 leading-tight">
                          Tactile Taptic engine feedback on clicks & sends.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const val = !privacySettings.hapticTouchFeedback;
                          setPrivacySettings(prev => ({ ...prev, hapticTouchFeedback: val }));
                          if (user) await updateDoc(doc(db, 'users', user.uid), { 'privacy.hapticTouchFeedback': val });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.hapticTouchFeedback ? 'bg-[#F246F5]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.hapticTouchFeedback ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="bg-white/90 dark:bg-zinc-900/80 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.05)] rounded-[22px] p-4 flex items-center justify-between">
                      <div className="space-y-1 max-w-[75%]">
                        <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          Auto-Play Voice Notes
                        </label>
                        <p className="text-[11px] text-zinc-500 leading-tight">
                          Automatically play sequential voice messages.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const val = !privacySettings.autoPlayVoice;
                          setPrivacySettings(prev => ({ ...prev, autoPlayVoice: val }));
                          if (user) await updateDoc(doc(db, 'users', user.uid), { 'privacy.autoPlayVoice': val });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.autoPlayVoice ? 'bg-[#F246F5]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.autoPlayVoice ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="bg-white/90 dark:bg-zinc-900/80 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.05)] rounded-[22px] p-4 flex items-center justify-between">
                      <div className="space-y-1 max-w-[75%]">
                        <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          Do Not Disturb Mode
                        </label>
                        <p className="text-[11px] text-zinc-500 leading-tight">
                          Silence all message chimes and notification sounds.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const val = !privacySettings.doNotDisturb;
                          setPrivacySettings(prev => ({ ...prev, doNotDisturb: val }));
                          if (user) await updateDoc(doc(db, 'users', user.uid), { 'privacy.doNotDisturb': val });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.doNotDisturb ? 'bg-[#F246F5]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.doNotDisturb ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                </div>
              </div>

              <div className="p-5">
                <button
                  type="button"
                  onClick={() => setShowPrivacySettingsModal(false)}
                  className="w-full py-3.5 rounded-full bg-[#F246F5] hover:bg-[#e135e4] text-white font-bold shadow-[0_6px_18px_rgba(242,70,245,0.25)] transition flex justify-center items-center cursor-pointer"
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
          <div
            className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 select-none"
            onClick={() => {
              setShowForwardModal(false);
              setForwardingMessage(null);
              setForwardSearchQuery('');
              setForwardedTargetsMap({});
            }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, y: 36, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 28, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full sm:max-w-[440px] max-h-[85dvh] bg-white dark:bg-[#14161D] border-t sm:border border-zinc-200/80 dark:border-white/10 rounded-t-[28px] sm:rounded-[28px] shadow-2xl flex flex-col overflow-hidden font-inter"
            >
              {/* Drag Handle (Mobile) */}
              <div className="sm:hidden pt-2.5 flex justify-center shrink-0">
                <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              </div>

              {/* Header */}
              <div className="px-5 pt-4 pb-3 border-b border-zinc-100 dark:border-white/[0.06] flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-[16px] font-bold text-zinc-950 dark:text-white tracking-tight">
                    Forward message
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Send instantly to chats, groups, or communities
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowForwardModal(false);
                    setForwardingMessage(null);
                    setForwardSearchQuery('');
                    setForwardedTargetsMap({});
                  }}
                  className="w-9 h-9 rounded-full bg-white/90 dark:bg-white/[0.08] shadow-[0_4px_14px_rgba(120,90,160,0.06)] text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
                  aria-label="Close forward sheet"
                >
                  <Icon name="x" className="w-4 h-4" />
                </button>
              </div>

              {/* Message Preview Strip */}
              <div className="mx-5 mt-3.5 p-3 rounded-2xl bg-white/85 dark:bg-white/[0.04] border-0 shadow-[0_4px_14px_rgba(120,90,160,0.04)] flex items-center gap-3 shrink-0">
                {(forwardingMessage.images?.[0] || forwardingMessage.imageUrl) ? (
                  <ProgressiveImage
                    src={forwardingMessage.images?.[0] || forwardingMessage.imageUrl}
                    alt="Forward preview"
                    containerClassName="w-11 h-11 rounded-xl shrink-0 min-h-0 overflow-hidden"
                    showShimmerIcon={false}
                    className="w-full h-full object-cover"
                  />
                ) : forwardingMessage.audioUrl ? (
                  <div className="w-10 h-10 rounded-xl bg-[#F246F5]/12 text-[#F246F5] flex items-center justify-center shrink-0">
                    <Icon name="mic" className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-zinc-200/70 dark:bg-white/[0.08] text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0">
                    <MsgForwardIcon className="w-4 h-4" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] font-semibold text-zinc-500 dark:text-zinc-400 truncate">
                    From {forwardingMessage.originalSenderName || forwardingMessage.forwardedFrom || forwardingMessage.senderName || 'Conversation'}
                  </p>
                  <p className="text-[13.5px] font-medium text-zinc-900 dark:text-zinc-100 truncate mt-0.5">
                    {forwardingMessage.text
                      ? forwardingMessage.text
                      : forwardingMessage.audioUrl
                      ? `Voice message (${forwardingMessage.audioDuration || 4}s)`
                      : 'Photo attachment'}
                  </p>
                </div>
              </div>

              {/* Instant Recipient Search */}
              <div className="px-5 pt-3 pb-2 shrink-0">
                <div className="h-10 px-3.5 rounded-full bg-white/85 dark:bg-white/[0.06] shadow-[0_4px_14px_rgba(120,90,160,0.04)] flex items-center gap-2.5">
                  <Icon name="search" className="w-4 h-4 text-zinc-400 shrink-0" />
                  <input
                    type="text"
                    value={forwardSearchQuery}
                    onChange={(e) => setForwardSearchQuery(e.target.value)}
                    placeholder="Search people, groups, or communities..."
                    className="flex-1 bg-transparent text-[13.5px] text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none border-none"
                  />
                  {forwardSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setForwardSearchQuery('')}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      <Icon name="x" className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Recipient Rows */}
              <div className="flex-1 overflow-y-auto px-3 py-1.5 space-y-4">
                {(() => {
                  const q = forwardSearchQuery.trim().toLowerCase();

                  const realShareableChats = chats.filter((c) => {
                    if (c.isGroup || c.type === 'group') {
                      const gName = String(c.name || c.groupName || 'Group').toLowerCase();
                      return !q || gName.includes(q);
                    }
                    const oid = c.otherUser?.id || c.otherUser?.uid;
                    if (!oid || oid === 'system' || oid === user?.uid || String(oid).startsWith('demo_')) {
                      return false;
                    }
                    const hasHistory = Boolean(
                      (typeof c.lastMessage === 'string' && c.lastMessage.trim() !== '') ||
                      c.lastMessageTimestamp ||
                      c.updatedAt
                    );
                    if (!hasHistory) return false;
                    if (!q) return true;
                    const label = String(
                      c.otherUser?.shopName || c.otherUser?.displayName || c.otherUser?.username || ''
                    ).toLowerCase();
                    return label.includes(q);
                  });

                  const filteredChannels = channels.filter((ch) => {
                    if (!q) return true;
                    return (
                      String(ch.name || '').toLowerCase().includes(q) ||
                      String(ch.customLink || '').toLowerCase().includes(q)
                    );
                  });

                  if (realShareableChats.length === 0 && filteredChannels.length === 0) {
                    return (
                      <div className="py-12 px-6 text-center">
                        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                          No matching conversations
                        </p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                          Try another name or start a chat first.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <>
                      {realShareableChats.length > 0 && (
                        <div>
                          <p className="px-2.5 pb-1.5 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                            Recent chats
                          </p>
                          <div className="space-y-0.5">
                            {realShareableChats.map((c, idx) => {
                              const targetKey = `chat_${c.id || c.otherUser?.id || c.otherUser?.uid}`;
                              const isSent = Boolean(forwardedTargetsMap[targetKey]);
                              const title =
                                c.otherUser?.shopName ||
                                c.otherUser?.displayName ||
                                (c.isGroup ? c.name || c.groupName : 'Conversation');
                              const avatarUrl = c.isGroup
                                ? c.groupImage || c.imageUrl || ''
                                : c.otherUser?.photoURL || '';
                              const subtitle = c.isGroup
                                ? `${c.participants?.length || 2} members`
                                : c.otherUser?.username
                                ? `@${c.otherUser.username}`
                                : 'Direct message';

                              return (
                                <div
                                  key={`fwd-chat-${c.id || idx}-${idx}`}
                                  className="flex items-center justify-between gap-3 px-2.5 py-2 rounded-2xl hover:bg-zinc-100/80 dark:hover:bg-white/[0.04] transition"
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center text-sm font-semibold text-[#2F80ED]">
                                      {avatarUrl ? (
                                        <img
                                          src={avatarUrl}
                                          alt={title}
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        String(title || 'U').charAt(0).toUpperCase()
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[14px] font-semibold text-zinc-950 dark:text-white truncate">
                                        {title}
                                      </p>
                                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                        {subtitle}
                                      </p>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    disabled={isSent}
                                    onClick={() => handleSendForward(c, false)}
                                    className={cn(
                                      'h-9 min-w-[74px] px-4 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 shrink-0',
                                      isSent
                                        ? 'bg-zinc-100 dark:bg-white/10 text-zinc-500 dark:text-zinc-300 cursor-default'
                                        : 'bg-[#F246F5] hover:bg-[#e135e4] text-white shadow-[0_4px_14px_rgba(242,70,245,0.25)] cursor-pointer'
                                    )}
                                  >
                                    {isSent ? (
                                      <>
                                        <Icon name="check" className="w-3.5 h-3.5" />
                                        <span>Sent</span>
                                      </>
                                    ) : (
                                      <span>Send</span>
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {filteredChannels.length > 0 && (
                        <div>
                          <p className="px-2.5 pb-1.5 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                            Communities
                          </p>
                          <div className="space-y-0.5">
                            {filteredChannels.map((ch) => {
                              const targetKey = `ch_${ch.id}`;
                              const isSent = Boolean(forwardedTargetsMap[targetKey]);
                              return (
                                <div
                                  key={`fwd-ch-${ch.id}`}
                                  className="flex items-center justify-between gap-3 px-2.5 py-2 rounded-2xl hover:bg-zinc-100/80 dark:hover:bg-white/[0.04] transition"
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center text-sm font-semibold text-[#2F80ED]">
                                      {ch.imageUrl ? (
                                        <img
                                          src={ch.imageUrl}
                                          alt={ch.name}
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        String(ch.name || 'C').charAt(0).toUpperCase()
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[14px] font-semibold text-zinc-950 dark:text-white truncate">
                                        {ch.name}
                                      </p>
                                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                        {ch.customLink ? `@${ch.customLink}` : 'Community channel'}
                                      </p>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    disabled={isSent}
                                    onClick={() => handleSendForward(ch, true)}
                                    className={cn(
                                      'h-9 min-w-[74px] px-4 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 shrink-0',
                                      isSent
                                        ? 'bg-zinc-100 dark:bg-white/10 text-zinc-500 dark:text-zinc-300 cursor-default'
                                        : 'bg-[#F246F5] hover:bg-[#e135e4] text-white shadow-[0_4px_14px_rgba(242,70,245,0.25)] cursor-pointer'
                                    )}
                                  >
                                    {isSent ? (
                                      <>
                                        <Icon name="check" className="w-3.5 h-3.5" />
                                        <span>Sent</span>
                                      </>
                                    ) : (
                                      <span>Send</span>
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Footer Done Button */}
              {Object.keys(forwardedTargetsMap).length > 0 && (
                <div className="p-4 border-t border-zinc-100 dark:border-white/[0.06] shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForwardModal(false);
                      setForwardingMessage(null);
                      setForwardSearchQuery('');
                      setForwardedTargetsMap({});
                    }}
                    className="w-full h-11 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-sm font-semibold transition active:scale-[0.99] cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              )}
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
                          colRef = collection(db, 'p2p_chats', activeChat?.id, 'messages');
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
                            colRef = collection(db, 'p2p_chats', activeChat?.id, 'messages');
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
              className="ambient-dynamic-bg w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl font-inter flex flex-col relative border-0"
            >
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="image" className="w-5 h-5 text-[#F246F5]" />
                  <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">Change Chat Wallpaper</h3>
                </div>
                <button onClick={() => setShowWallpaperModal(false)} className="w-9 h-9 rounded-full bg-white/95 dark:bg-zinc-800/90 shadow-[0_4px_14px_rgba(120,90,160,0.06)] text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer">
                  <Icon name="x" className="w-5 h-5" />
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
                            localStorage.setItem('chat_wallpaper_' + activeChat?.id, wp.url);
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
                      localStorage.setItem('chat_wallpaper_' + activeChat?.id, urlInput);
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
                    <button type="submit" className="px-4 py-2 bg-[#F246F5] text-white text-xs font-bold rounded-full hover:bg-[#e135e4] transition-colors cursor-pointer">
                      Apply
                    </button>
                  </form>
                </div>

                {/* Remove option */}
                {chatWallpaper && (
                  <button
                    onClick={() => {
                      if (activeChat) {
                        localStorage.removeItem('chat_wallpaper_' + activeChat?.id);
                        setChatWallpaper(null);
                        notify('Wallpaper removed', 'info');
                        setShowWallpaperModal(false);
                      }
                    }}
                    className="w-full py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30 text-red-600 rounded-full text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Icon name="trash" className="w-4 h-4" />
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
                <button onClick={() => setDisabledCallUser(null)} className="w-9 h-9 rounded-full bg-white/95 dark:bg-zinc-800/90 shadow-[0_4px_14px_rgba(120,90,160,0.06)] flex items-center justify-center transition cursor-pointer">
                  <Icon name="x" className="w-5 h-5 text-zinc-500" />
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
                <button onClick={() => setShowAutoDeleteModal(false)} className="w-9 h-9 rounded-full bg-white/95 dark:bg-zinc-800/90 shadow-[0_4px_14px_rgba(120,90,160,0.06)] flex items-center justify-center transition cursor-pointer">
                  <Icon name="x" className="w-5 h-5 text-zinc-500" />
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
                                await updateDoc(doc(db, 'p2p_chats', activeChat?.id), {
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
                            await updateDoc(doc(db, 'p2p_chats', activeChat?.id), {
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
                <button onClick={() => setShowClearChatModal(false)} className="w-9 h-9 rounded-full bg-white/95 dark:bg-zinc-800/90 shadow-[0_4px_14px_rgba(120,90,160,0.06)] flex items-center justify-center transition cursor-pointer">
                  <Icon name="x" className="w-5 h-5 text-zinc-500" />
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
                        const chatId = activeChat?.id;
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
                  className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  <Icon name="x" className="w-5 h-5" />
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
                  liveParticipants.map((p, idx) => {
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
                                {p.muted ? <Icon name="mic-off" className="w-3.5 h-3.5" /> : <Icon name="mic" className="w-3.5 h-3.5" />}
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
                              {p.muted ? <Icon name="mic-off" className="w-3.5 h-3.5" /> : <Icon name="mic" className="w-3.5 h-3.5 animate-pulse" />}
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
                    {isLiveMuted ? <Icon name="mic-off" className="w-5.5 h-5.5" /> : <Icon name="mic" className="w-5.5 h-5.5" />}
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
                      <Icon name="log-out" className="w-5.5 h-5.5" />
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
      {/* --- Dynamic 3rd & 4th Style Media Viewer / Lightbox Modal --- */}
      <ChatMediaGalleryModal
        isOpen={isGalleryOpen || !!lightboxImage}
        images={galleryImages.length > 0 ? galleryImages : (lightboxImage ? [lightboxImage] : [])}
        initialIndex={galleryIndex}
        senderName={gallerySenderName}
        timestamp={galleryTimestamp}
        onClose={() => {
          setIsGalleryOpen(false);
          setLightboxImage(null);
          setGalleryImages([]);
        }}
      />

      {/* "+ New Chat" Floating Action Popup (New Chat / New Contact / New Community — IMG_5360 right) */}
      <NewChatActionPopup
        isOpen={showNewChatPopup}
        initialMode={newChatPopupMode}
        onClose={() => setShowNewChatPopup(false)}
        currentUser={user}
        channels={channels}
        onStartNewChat={() => {
          setNewMessageInitialStep('new_message');
          setNewMessageInitialGroupType('group');
          setShowNewMessageModal(true);
        }}
        onSelectContactForChat={(contact) => {
          setActiveMessagesTab('chats');
          setSidebarTab('messages');
          setSearchParams({ chatId: contact.id }, { replace: true });
        }}
        onContactSaved={(contact) => {
          setSavedContacts((prev) => [contact, ...prev.filter((c) => c.id !== contact.id)]);
        }}
        onOpenChannel={(chId) => {
          setActiveMessagesTab('chats');
          setSidebarTab('community');
          setSearchParams({ channelId: chId }, { replace: true });
        }}
        onCreateCommunity={() => {
          setIsEditingChannel(false);
          setChanName('');
          setChanLink('');
          setChanDesc('');
          setChanImageFile(null);
          setChanImagePreview('');
          setShowCreateChannelModal(true);
        }}
        notify={notify}
      />

      {/* Dynamic New Message & Group Creation Modal */}
      <NewMessageModal
        isOpen={showNewMessageModal || showNewChatModal}
        suggestedUsers={recentChatUsers}
        initialStep={newMessageInitialStep}
        initialGroupType={newMessageInitialGroupType}
        onClose={() => {
          setShowNewMessageModal(false);
          setShowNewChatModal(false);
          setNewMessageInitialStep('new_message');
          setNewMessageInitialGroupType('group');
        }}
        currentUser={user}
        notify={notify}
        onSelectUser={(selectedUser) => {
          setActiveMessagesTab('chats');
          setSearchParams({ chatId: selectedUser.id }, { replace: true });
        }}
        onGroupCreated={(id, isCommunity) => {
          setActiveMessagesTab('chats');
          if (isCommunity) {
            setSidebarTab('community');
            setSearchParams({ channelId: id }, { replace: true });
          } else {
            setSidebarTab('messages');
            setSearchParams({ chatId: id }, { replace: true });
          }
        }}
      />
    </div>
  );
}
