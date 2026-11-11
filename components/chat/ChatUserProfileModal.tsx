import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import Icon from '../Icon';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getSafeDisplayName, getSafePublicUsername } from '../../lib/utils';

interface ChatUserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeChat: any;
  currentUser: any;
  activeThemeName?: string;
  onOpenThemeModal: () => void;
  onStartSearch: () => void;
  onBlockUser: () => void;
  isBlocked: boolean;
  onSetAutoDelete: (duration: number | null) => void;
  currentAutoDeleteDuration?: number | null;
  onOpenGroupModal: () => void;
  onOpenWallpaperModal?: () => void;
  onOpenClearChatModal?: () => void;
  notify: (msg: string, type: string) => void;
}

export const ChatUserProfileModal: React.FC<ChatUserProfileModalProps> = ({
  isOpen,
  onClose,
  activeChat,
  currentUser,
  activeThemeName = 'Default',
  onOpenThemeModal,
  onStartSearch,
  onBlockUser,
  isBlocked,
  onSetAutoDelete,
  currentAutoDeleteDuration,
  onOpenGroupModal,
  onOpenWallpaperModal,
  onOpenClearChatModal,
  notify,
}) => {
  const navigate = useNavigate();
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    return activeChat?.id ? localStorage.getItem(`chat_muted_${activeChat.id}`) === 'true' : false;
  });
  const [isRestricted, setIsRestricted] = useState(() => {
    return activeChat?.id ? localStorage.getItem(`chat_restricted_${activeChat.id}`) === 'true' : false;
  });

  const otherUser = activeChat?.otherUser || {};
  const isGroupChat = Boolean(activeChat?.isGroup || activeChat?.type === 'group');
  const otherUid = (!isGroupChat && otherUser?.id && otherUser.id !== 'system') 
    ? otherUser.id 
    : (!isGroupChat && otherUser?.uid && otherUser.uid !== 'system') 
      ? otherUser.uid 
      : (!isGroupChat && activeChat?.participants) 
        ? activeChat.participants.find((p: string) => p !== currentUser?.uid && p !== 'system') || ''
        : '';
  
  const nicknameKey = (currentUser?.uid && otherUid) ? `chat_nickname_${currentUser.uid}_${otherUid}` : '';

  // Sub-modal states
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [userNickname, setUserNickname] = useState('');

  const [realUserData, setRealUserData] = useState<any>(null);

  // Fetch true database user profile so real name is always accurate
  React.useEffect(() => {
    if (!isOpen || !otherUid || otherUid === 'system') {
      setRealUserData(null);
      return;
    }
    let isMounted = true;
    getDoc(doc(db, 'users', otherUid))
      .then((dSnap) => {
        if (isMounted && dSnap.exists()) {
          setRealUserData(dSnap.data());
        }
      })
      .catch((err) => console.error('Error fetching real user data:', err));
    return () => {
      isMounted = false;
    };
  }, [isOpen, otherUid]);

  // Keep nickname in sync whenever the target user or modal opens
  React.useEffect(() => {
    // Clean up any stale or corrupted generic keys
    if (currentUser?.uid) {
      localStorage.removeItem(`chat_nickname_${currentUser.uid}_`);
      localStorage.removeItem(`chat_nickname_${currentUser.uid}_undefined`);
      localStorage.removeItem(`chat_nickname_${currentUser.uid}_null`);
    }
    if (nicknameKey) {
      const stored = localStorage.getItem(nicknameKey) || '';
      setUserNickname(stored);
      setNicknameInput(stored);
    } else {
      setUserNickname('');
      setNicknameInput('');
    }
  }, [nicknameKey, isOpen, currentUser?.uid]);

  const [showDisappearingModal, setShowDisappearingModal] = useState(false);
  const [showChatControlsModal, setShowChatControlsModal] = useState(false);
  const [readReceipts, setReadReceipts] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  if (!isOpen || !activeChat) return null;

  // Real account name is the primary name in user details modal
  const realName =
    getSafeDisplayName(realUserData, '') ||
    getSafeDisplayName(otherUser, '') ||
    'User';
  const publicUsername =
    getSafePublicUsername(realUserData) || getSafePublicUsername(otherUser);

  const avatarUrl = otherUser.photoURL || otherUser.avatar || otherUser.image;

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem(`chat_muted_${activeChat.id}`, next.toString());
    notify(next ? 'Chat muted' : 'Chat unmuted', 'info');
  };

  const toggleRestrict = () => {
    const next = !isRestricted;
    setIsRestricted(next);
    localStorage.setItem(`chat_restricted_${activeChat.id}`, next.toString());
    setShowOptionsMenu(false);
    notify(next ? 'Account restricted' : 'Restriction removed', 'info');
  };

  const handleSaveNickname = () => {
    const clean = nicknameInput.trim();
    if (!nicknameKey || !otherUid) {
      notify('Cannot set nickname for this user', 'error');
      return;
    }
    setUserNickname(clean);
    if (clean) {
      localStorage.setItem(nicknameKey, clean);
    } else {
      localStorage.removeItem(nicknameKey);
    }
    window.dispatchEvent(new CustomEvent('chat_nickname_updated', { detail: { otherUid: otherUid, nickname: clean } }));
    setShowNicknameModal(false);
    notify(clean ? `Nickname set to "${clean}"` : 'Nickname cleared', 'success');
  };

  const handleSendFeedback = () => {
    if (!feedbackText.trim()) return;
    notify('Thank you! Your feedback has been submitted to the support team.', 'success');
    setFeedbackText('');
    setShowFeedbackModal(false);
  };

  const handleSendReport = () => {
    if (!reportReason.trim()) return;
    notify('Report received. Our moderation team will investigate within 24 hours.', 'info');
    setReportReason('');
    setShowReportModal(false);
    setShowOptionsMenu(false);
  };

  const getDisappearingLabel = () => {
    if (!currentAutoDeleteDuration) return 'Off';
    if (currentAutoDeleteDuration <= 86400000) return '24 hours';
    if (currentAutoDeleteDuration <= 604800000) return '7 days';
    return '4 weeks';
  };

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col ambient-dynamic-bg text-zinc-900 dark:text-white overflow-y-auto no-scrollbar font-inter">
      {/* Top Header with circular Back button */}
      <div className="sticky top-0 z-20 bg-transparent backdrop-blur-md px-4 py-3 flex items-center justify-between border-0">
        <button
          type="button"
          onClick={onClose}
          className="w-11 h-11 rounded-full bg-white/95 dark:bg-zinc-800/90 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.06)] flex items-center justify-center text-zinc-900 dark:text-zinc-100 hover:bg-white dark:hover:bg-zinc-700/60 transition active:scale-95 cursor-pointer"
        >
          <Icon name="chevron-left" className="w-5 h-5 stroke-[2.2]" />
        </button>
        <div className="w-11" />
      </div>

      <div className="w-full max-w-lg mx-auto px-4 py-4 pb-12 flex flex-col items-center">
        {/* Centered Large Circular Avatar */}
        <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-[#F246F5] to-purple-500 p-[2.5px] shadow-[0_10px_28px_rgba(242,70,245,0.16)]">
          <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={realName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Icon name="user" className="w-12 h-12 text-zinc-400 dark:text-zinc-500" />
            )}
          </div>
        </div>

        {/* Real User Name */}
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white mt-4 text-center tracking-tight">
          {realName}
        </h2>
        {userNickname ? (
          <div className="flex items-center gap-1.5 mt-1.5 bg-[#F246F5]/10 text-[#C026D3] dark:text-[#F472B6] px-3.5 py-1 rounded-full text-xs font-semibold border-0">
            <span>Nickname set by you: <strong>{userNickname}</strong></span>
            <button
              type="button"
              onClick={() => {
                setNicknameInput(userNickname);
                setShowNicknameModal(true);
              }}
              className="ml-1 text-[11px] underline hover:opacity-80 cursor-pointer"
            >
              Edit
            </button>
          </div>
        ) : publicUsername ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            @{publicUsername}
          </p>
        ) : null}

        {/* 4 Action Buttons Row: Profile, Search, Mute, Options */}
        <div className="grid grid-cols-4 gap-4 mt-6 w-full max-w-sm relative">
          {/* 1. Profile */}
          <button
            type="button"
            onClick={() => {
              onClose();
              const targetId = otherUser.id || otherUser.uid || otherUid;
              if (targetId) {
                const isSeller = realUserData?.role === 'seller';
                if (isSeller) {
                  navigate(`/store/${targetId}`);
                } else {
                  navigate(`/news-hub/profile/${targetId}`);
                }
              }
            }}
            className="flex flex-col items-center justify-center group active:scale-95 transition cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-white/95 dark:bg-zinc-800/90 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.06)] flex items-center justify-center text-zinc-900 dark:text-zinc-100 group-hover:bg-white dark:group-hover:bg-zinc-700 transition">
              <Icon name="user" className="w-5 h-5 stroke-[2]" />
            </div>
            <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300 mt-1.5">Profile</span>
          </button>

          {/* 2. Search */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onStartSearch();
            }}
            className="flex flex-col items-center justify-center group active:scale-95 transition cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-white/95 dark:bg-zinc-800/90 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.06)] flex items-center justify-center text-zinc-900 dark:text-zinc-100 group-hover:bg-white dark:group-hover:bg-zinc-700 transition">
              <Icon name="search" className="w-5 h-5 stroke-[2]" />
            </div>
            <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300 mt-1.5">Search</span>
          </button>

          {/* 3. Mute */}
          <button
            type="button"
            onClick={toggleMute}
            className="flex flex-col items-center justify-center group active:scale-95 transition cursor-pointer"
          >
            <div
              className={`w-12 h-12 rounded-full border-0 flex items-center justify-center transition ${
                isMuted
                  ? 'bg-[#F246F5]/15 text-[#F246F5] shadow-[0_4px_16px_rgba(242,70,245,0.14)]'
                  : 'bg-white/95 dark:bg-zinc-800/90 shadow-[0_4px_16px_rgba(120,90,160,0.06)] text-zinc-900 dark:text-zinc-100 group-hover:bg-white dark:group-hover:bg-zinc-700'
              }`}
            >
              {isMuted ? <Icon name="bell-slash" className="w-5 h-5 stroke-[2]" /> : <Icon name="bell" className="w-5 h-5 stroke-[2]" />}
            </div>
            <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300 mt-1.5">
              {isMuted ? 'Muted' : 'Mute'}
            </span>
          </button>

          {/* 4. Options */}
          <div className="relative flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className="flex flex-col items-center justify-center group active:scale-95 transition cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-white/95 dark:bg-zinc-800/90 border-0 shadow-[0_4px_16px_rgba(120,90,160,0.06)] flex items-center justify-center text-zinc-900 dark:text-zinc-100 group-hover:bg-white dark:group-hover:bg-zinc-700 transition">
                <Icon name="more-horizontal" className="w-5 h-5 stroke-[2]" />
              </div>
              <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300 mt-1.5">Options</span>
            </button>

            {/* Options Dropdown Menu */}
            <AnimatePresence>
              {showOptionsMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowOptionsMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    className="absolute right-0 top-full mt-2 w-52 bg-white/95 dark:bg-[#1E1C26]/95 backdrop-blur-xl rounded-2xl shadow-[0_14px_38px_rgba(120,90,160,0.18)] border-0 py-2 z-40 overflow-hidden text-left"
                  >
                    <button
                      type="button"
                      onClick={toggleRestrict}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100/70 dark:hover:bg-white/[0.06] flex items-center gap-3 transition cursor-pointer"
                    >
                      <Icon name="eye-slash" className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                      <span>{isRestricted ? 'Unrestrict' : 'Restrict'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        onBlockUser();
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100/70 dark:hover:bg-white/[0.06] flex items-center gap-3 transition cursor-pointer"
                    >
                      <Icon name="ban" className="w-4 h-4 text-rose-500" />
                      <span>{isBlocked ? 'Unblock' : 'Block'}</span>
                    </button>
                    {onOpenWallpaperModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowOptionsMenu(false);
                          onClose();
                          onOpenWallpaperModal();
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100/70 dark:hover:bg-white/[0.06] flex items-center gap-3 transition cursor-pointer"
                      >
                        <Icon name="message-circle" className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                        <span>Change Wallpaper</span>
                      </button>
                    )}
                    {onOpenClearChatModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowOptionsMenu(false);
                          onClose();
                          onOpenClearChatModal();
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-amber-600 hover:bg-zinc-100/70 dark:hover:bg-white/[0.06] flex items-center gap-3 transition cursor-pointer"
                      >
                        <Icon name="clock" className="w-4 h-4 text-amber-600" />
                        <span>Clear / Delete Chat</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        setShowReportModal(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-50/70 dark:hover:bg-rose-500/10 flex items-center gap-3 transition cursor-pointer"
                    >
                      <Icon name="message-square-warning" className="w-4 h-4 text-rose-500" />
                      <span>Report</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Grouped Frosted Card Feature Rows */}
        <div className="w-full mt-7 bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md border-0 rounded-[26px] shadow-[0_4px_20px_rgba(120,90,160,0.05)] overflow-hidden divide-y divide-zinc-100/70 dark:divide-white/[0.06]">
          {/* Row 1: Theme */}
          <div
            onClick={onOpenThemeModal}
            className="flex items-center justify-between py-3.5 px-4 hover:bg-zinc-100/50 dark:hover:bg-white/[0.04] cursor-pointer transition group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-[#F5F3FA] dark:bg-white/[0.06] border-0 flex items-center justify-center shrink-0">
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#F246F5] via-purple-500 to-indigo-500 shadow-sm" />
              </div>
              <div>
                <h4 className="text-[15px] font-semibold text-zinc-950 dark:text-white">Theme</h4>
                <p className="text-[12px] text-zinc-500 dark:text-zinc-400">{activeThemeName}</p>
              </div>
            </div>
            <Icon name="chevron-right" className="w-5 h-5 text-zinc-400 dark:text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Row 2: Nicknames */}
          <div
            onClick={() => {
              setNicknameInput(userNickname);
              setShowNicknameModal(true);
            }}
            className="flex items-center justify-between py-3.5 px-4 hover:bg-zinc-100/50 dark:hover:bg-white/[0.04] cursor-pointer transition group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-[#F5F3FA] dark:bg-white/[0.06] border-0 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shrink-0">
                <Icon name="edit-3" className="w-4.5 h-4.5" />
              </div>
              <h4 className="text-[15px] font-semibold text-zinc-950 dark:text-white">Nicknames</h4>
            </div>
            <Icon name="chevron-right" className="w-5 h-5 text-zinc-400 dark:text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Row 3: Disappearing messages */}
          <div
            onClick={() => setShowDisappearingModal(true)}
            className="flex items-center justify-between py-3.5 px-4 hover:bg-zinc-100/50 dark:hover:bg-white/[0.04] cursor-pointer transition group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-[#F5F3FA] dark:bg-white/[0.06] border-0 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shrink-0">
                <Icon name="clock" className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-[15px] font-semibold text-zinc-950 dark:text-white">Disappearing messages</h4>
                <p className="text-[12px] text-zinc-500 dark:text-zinc-400">{getDisappearingLabel()}</p>
              </div>
            </div>
            <Icon name="chevron-right" className="w-5 h-5 text-zinc-400 dark:text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Row 4: Chat controls */}
          <div
            onClick={() => setShowChatControlsModal(true)}
            className="flex items-center justify-between py-3.5 px-4 hover:bg-zinc-100/50 dark:hover:bg-white/[0.04] cursor-pointer transition group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-[#F5F3FA] dark:bg-white/[0.06] border-0 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shrink-0">
                <Icon name="message-circle" className="w-4.5 h-4.5" />
              </div>
              <h4 className="text-[15px] font-semibold text-zinc-950 dark:text-white">Chat controls</h4>
            </div>
            <Icon name="chevron-right" className="w-5 h-5 text-zinc-400 dark:text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Row 5: Privacy and safety */}
          <div
            onClick={() => setShowPrivacyModal(true)}
            className="flex items-center justify-between py-3.5 px-4 hover:bg-zinc-100/50 dark:hover:bg-white/[0.04] cursor-pointer transition group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-[#F5F3FA] dark:bg-white/[0.06] border-0 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shrink-0">
                <Icon name="lock" className="w-4.5 h-4.5" />
              </div>
              <h4 className="text-[15px] font-semibold text-zinc-950 dark:text-white">Privacy and safety</h4>
            </div>
            <Icon name="chevron-right" className="w-5 h-5 text-zinc-400 dark:text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Row 6: Create a group chat */}
          <div
            onClick={() => {
              onClose();
              onOpenGroupModal();
            }}
            className="flex items-center justify-between py-3.5 px-4 hover:bg-zinc-100/50 dark:hover:bg-white/[0.04] cursor-pointer transition group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-[#F5F3FA] dark:bg-white/[0.06] border-0 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shrink-0">
                <Icon name="users" className="w-4.5 h-4.5" />
              </div>
              <h4 className="text-[15px] font-semibold text-zinc-950 dark:text-white">Create a group chat</h4>
            </div>
            <Icon name="chevron-right" className="w-5 h-5 text-zinc-400 dark:text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Row 7: Something isn't working */}
          <div
            onClick={() => setShowFeedbackModal(true)}
            className="flex items-center justify-between py-3.5 px-4 hover:bg-zinc-100/50 dark:hover:bg-white/[0.04] cursor-pointer transition group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-[#F5F3FA] dark:bg-white/[0.06] border-0 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shrink-0">
                <Icon name="message-square-warning" className="w-4.5 h-4.5" />
              </div>
              <h4 className="text-[15px] font-semibold text-zinc-950 dark:text-white">Something isn&apos;t working</h4>
            </div>
            <Icon name="chevron-right" className="w-5 h-5 text-zinc-400 dark:text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* SUB-MODAL: Nicknames */}
      {showNicknameModal && (
        <div
          className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/45 backdrop-blur-sm p-5"
          onClick={() => setShowNicknameModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="bg-white/95 dark:bg-[#1C1A24]/95 backdrop-blur-xl rounded-[28px] border-0 shadow-[0_20px_50px_rgba(120,90,160,0.18)] w-full max-w-[356px] px-6 pt-7 pb-6 text-left space-y-4"
          >
            <div>
              <h3 className="text-[20px] font-bold text-zinc-950 dark:text-white leading-[1.28] tracking-[-0.02em]">Set nickname</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-[14px] mt-1.5 leading-[1.44]">
                Only you will see this nickname in your chats with this user.
              </p>
            </div>
            <input
              type="text"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              placeholder="Enter nickname..."
              className="w-full rounded-2xl bg-[#F5F3FA] dark:bg-white/[0.06] border-0 px-4 py-3.5 text-[15px] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#F246F5]/30"
            />
            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleSaveNickname}
                className="w-full min-h-[48px] px-5 rounded-full bg-[#F246F5] hover:opacity-95 text-white text-[15px] font-semibold active:scale-[0.985] transition-transform cursor-pointer"
              >
                Save nickname
              </button>
              <button
                type="button"
                onClick={() => setShowNicknameModal(false)}
                className="w-full min-h-[48px] px-5 rounded-full bg-[#F5F3FA] dark:bg-white/[0.08] text-zinc-800 dark:text-zinc-200 text-[15px] font-semibold active:scale-[0.985] transition-transform cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL: Disappearing Messages */}
      {showDisappearingModal && (
        <div
          className="fixed inset-0 z-[10020] flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setShowDisappearingModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white/95 dark:bg-[#1C1A24]/95 backdrop-blur-xl rounded-t-[28px] sm:rounded-[28px] p-6 border-0 shadow-[0_20px_50px_rgba(120,90,160,0.18)] space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-950 dark:text-white">Disappearing Messages</h3>
              <button
                type="button"
                onClick={() => setShowDisappearingModal(false)}
                className="w-9 h-9 rounded-full bg-[#F5F3FA] dark:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 hover:opacity-80 flex items-center justify-center cursor-pointer"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              When enabled, new messages sent in this chat will disappear after the selected period.
            </p>
            <div className="space-y-2 pt-1">
              {[
                { label: 'Off', val: null },
                { label: '24 hours', val: 86400000 },
                { label: '7 days', val: 604800000 },
                { label: '4 weeks', val: 2419200000 },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    onSetAutoDelete(opt.val);
                    setShowDisappearingModal(false);
                  }}
                  className={`w-full p-3.5 rounded-2xl flex items-center justify-between text-sm font-semibold transition cursor-pointer border-0 ${
                    currentAutoDeleteDuration === opt.val
                      ? 'bg-[#F246F5]/12 text-[#C026D3] dark:text-[#F472B6]'
                      : 'bg-[#F5F3FA] dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-200 hover:opacity-90'
                  }`}
                >
                  <span>{opt.label}</span>
                  {currentAutoDeleteDuration === opt.val && <Icon name="check" className="w-4 h-4 text-[#F246F5]" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL: Chat Controls */}
      {showChatControlsModal && (
        <div
          className="fixed inset-0 z-[10020] flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setShowChatControlsModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white/95 dark:bg-[#1C1A24]/95 backdrop-blur-xl rounded-t-[28px] sm:rounded-[28px] p-6 border-0 shadow-[0_20px_50px_rgba(120,90,160,0.18)] space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-950 dark:text-white">Chat Controls</h3>
              <button
                type="button"
                onClick={() => setShowChatControlsModal(false)}
                className="w-9 h-9 rounded-full bg-[#F5F3FA] dark:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 hover:opacity-80 flex items-center justify-center cursor-pointer"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between p-4 bg-[#F5F3FA] dark:bg-white/[0.06] rounded-2xl border-0">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-950 dark:text-white">Read Receipts</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Let others know when you&apos;ve seen their messages</p>
                </div>
                <input
                  type="checkbox"
                  checked={readReceipts}
                  onChange={(e) => {
                    setReadReceipts(e.target.checked);
                    notify(`Read receipts ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
                  }}
                  className="w-5 h-5 accent-[#F246F5] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-[#F5F3FA] dark:bg-white/[0.06] rounded-2xl border-0">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-950 dark:text-white">Sound Effects</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Play chime when messages arrive or send</p>
                </div>
                <input
                  type="checkbox"
                  checked={soundEffects}
                  onChange={(e) => {
                    setSoundEffects(e.target.checked);
                    notify(`Sound effects ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
                  }}
                  className="w-5 h-5 accent-[#F246F5] rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL: Privacy and Safety */}
      {showPrivacyModal && (
        <div
          className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/45 backdrop-blur-sm p-5"
          onClick={() => setShowPrivacyModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="bg-white/95 dark:bg-[#1C1A24]/95 backdrop-blur-xl rounded-[28px] border-0 shadow-[0_20px_50px_rgba(120,90,160,0.18)] w-full max-w-[390px] px-6 pt-7 pb-6 text-left space-y-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#F246F5]/12 text-[#F246F5] flex items-center justify-center shrink-0">
                <Icon name="shield" className="w-5 h-5" />
              </div>
              <h3 className="text-[20px] font-bold text-zinc-950 dark:text-white leading-[1.28] tracking-[-0.02em]">Privacy &amp; Safety</h3>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 bg-[#F5F3FA] dark:bg-white/[0.06] rounded-2xl border-0">
                <p className="font-bold text-zinc-950 dark:text-white">End-to-End Chat Encryption</p>
                <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Messages and calls are secured with transport encryption and private token validation.
                </p>
              </div>
              <div className="p-3.5 bg-[#F5F3FA] dark:bg-white/[0.06] rounded-2xl border-0">
                <p className="font-bold text-zinc-950 dark:text-white">Scam Prevention Guarantee</p>
                <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  DEEP SHOP automatically scans suspicious review fraud and protects consumer transactions.
                </p>
              </div>
              <div className="p-3.5 bg-[#F5F3FA] dark:bg-white/[0.06] rounded-2xl border-0">
                <p className="font-bold text-zinc-950 dark:text-white">Restrict &amp; Block Control</p>
                <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  You can restrict or block accounts at any time without alerting the other party.
                </p>
              </div>
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="w-full min-h-[48px] px-5 rounded-full bg-[#F246F5] hover:opacity-95 text-white text-[15px] font-semibold active:scale-[0.985] transition-transform cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL: Report */}
      {showReportModal && (
        <div
          className="fixed inset-0 z-[10025] flex items-center justify-center bg-black/45 backdrop-blur-sm p-5"
          onClick={() => setShowReportModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="bg-white/95 dark:bg-[#1C1A24]/95 backdrop-blur-xl rounded-[28px] border-0 shadow-[0_20px_50px_rgba(120,90,160,0.18)] w-full max-w-[356px] px-6 pt-7 pb-6 text-left space-y-4"
          >
            <div>
              <h3 className="text-[20px] font-bold text-zinc-950 dark:text-white leading-[1.28] tracking-[-0.02em] flex items-center gap-2">
                <Icon name="message-square-warning" className="w-5 h-5 text-rose-500" />
                <span>Report user</span>
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-[14px] mt-1.5 leading-[1.44]">
                Please tell us why you are reporting this conversation.
              </p>
            </div>
            <textarea
              rows={3}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Describe the issue (e.g. spam, harassment, counterfeit)..."
              className="w-full rounded-2xl bg-[#F5F3FA] dark:bg-white/[0.06] border-0 p-3.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#F246F5]/30 resize-none"
            />
            <div className="pt-1 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleSendReport}
                disabled={!reportReason.trim()}
                className="w-full min-h-[48px] px-5 rounded-full bg-[#F246F5] hover:opacity-95 text-white text-[15px] font-semibold disabled:opacity-50 active:scale-[0.985] transition-transform cursor-pointer"
              >
                Submit report
              </button>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="w-full min-h-[48px] px-5 rounded-full bg-[#F5F3FA] dark:bg-white/[0.08] text-zinc-800 dark:text-zinc-200 text-[15px] font-semibold active:scale-[0.985] transition-transform cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL: Something isn't working */}
      {showFeedbackModal && (
        <div
          className="fixed inset-0 z-[10025] flex items-center justify-center bg-black/45 backdrop-blur-sm p-5"
          onClick={() => setShowFeedbackModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="bg-white/95 dark:bg-[#1C1A24]/95 backdrop-blur-xl rounded-[28px] border-0 shadow-[0_20px_50px_rgba(120,90,160,0.18)] w-full max-w-[356px] px-6 pt-7 pb-6 text-left space-y-4"
          >
            <div>
              <h3 className="text-[20px] font-bold text-zinc-950 dark:text-white leading-[1.28] tracking-[-0.02em]">Report a problem</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-[14px] mt-1.5 leading-[1.44]">
                Briefly explain what happened and what wasn&apos;t working as expected.
              </p>
            </div>
            <textarea
              rows={4}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Write your feedback..."
              className="w-full rounded-2xl bg-[#F5F3FA] dark:bg-white/[0.06] border-0 p-3.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#F246F5]/30 resize-none"
            />
            <div className="pt-1 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleSendFeedback}
                disabled={!feedbackText.trim()}
                className="w-full min-h-[48px] px-5 rounded-full bg-[#F246F5] hover:opacity-95 text-white text-[15px] font-semibold disabled:opacity-50 active:scale-[0.985] transition-transform cursor-pointer"
              >
                Send feedback
              </button>
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                className="w-full min-h-[48px] px-5 rounded-full bg-[#F5F3FA] dark:bg-white/[0.08] text-zinc-800 dark:text-zinc-200 text-[15px] font-semibold active:scale-[0.985] transition-transform cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
