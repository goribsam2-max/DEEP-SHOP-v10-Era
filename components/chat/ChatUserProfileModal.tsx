import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  User,
  Search,
  Bell,
  BellOff,
  MoreHorizontal,
  EyeOff,
  Ban,
  MessageSquareWarning,
  MessageCircle,
  Lock,
  Users,
  Clock,
  Edit3,
  Check,
  X,
  Shield,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

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
    realUserData?.displayName ||
    realUserData?.shopName ||
    otherUser.displayName ||
    otherUser.shopName ||
    otherUser.name ||
    'User';

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
    <div className="fixed inset-0 z-[10000] flex flex-col bg-white dark:bg-[#121214] text-zinc-900 dark:text-white overflow-y-auto no-scrollbar font-inter">
      {/* Top Header with circular Back button matching Image 1 */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#121214]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800/80">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition active:scale-95 cursor-pointer shadow-xs"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
        </button>
        <div className="w-10" />
      </div>

      <div className="w-full max-w-lg mx-auto px-4 py-6 flex flex-col items-center">
        {/* Centered Large Circular Avatar */}
        <div className="w-28 h-28 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700/70 flex items-center justify-center text-zinc-400 dark:text-zinc-500 shadow-md">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={realName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <svg className="w-16 h-16 fill-current text-zinc-400 dark:text-zinc-500" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          )}
        </div>

        {/* Real User Name */}
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mt-4 text-center tracking-tight">
          {realName}
        </h2>
        {userNickname ? (
          <div className="flex items-center gap-1.5 mt-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-200 dark:border-indigo-800/60">
            <span>Nickname set by you: <strong>{userNickname}</strong></span>
            <button
              type="button"
              onClick={() => {
                setNicknameInput(userNickname);
                setShowNicknameModal(true);
              }}
              className="ml-1 text-[11px] underline hover:text-indigo-900 dark:hover:text-indigo-100 cursor-pointer"
            >
              Edit
            </button>
          </div>
        ) : (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            @{otherUser.displayName?.toLowerCase().replace(/\s+/g, '') || otherUid?.slice(0, 8) || 'username'}
          </p>
        )}

        {/* 4 Action Buttons Row: Profile, Search, Mute, Options (Image 1) */}
        <div className="grid grid-cols-4 gap-4 mt-6 w-full max-w-sm relative">
          {/* 1. Profile */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (otherUser.id || otherUser.uid) {
                navigate(`/store/${otherUser.id || otherUser.uid}`);
              }
            }}
            className="flex flex-col items-center justify-center group active:scale-95 transition cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-zinc-800 dark:text-zinc-200 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition shadow-xs">
              <User className="w-5 h-5 stroke-[2]" />
            </div>
            <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300 mt-1.5">Profile</span>
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
            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-zinc-800 dark:text-zinc-200 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition shadow-xs">
              <Search className="w-5 h-5 stroke-[2]" />
            </div>
            <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300 mt-1.5">Search</span>
          </button>

          {/* 3. Mute */}
          <button
            type="button"
            onClick={toggleMute}
            className="flex flex-col items-center justify-center group active:scale-95 transition cursor-pointer"
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center transition border shadow-xs ${
                isMuted
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200/60 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-200 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700'
              }`}
            >
              {isMuted ? <BellOff className="w-5 h-5 stroke-[2]" /> : <Bell className="w-5 h-5 stroke-[2]" />}
            </div>
            <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300 mt-1.5">
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
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-zinc-800 dark:text-zinc-200 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition shadow-xs">
                <MoreHorizontal className="w-5 h-5 stroke-[2]" />
              </div>
              <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300 mt-1.5">Options</span>
            </button>

            {/* Options Dropdown Menu (Image 1: Restrict, Block, Report) */}
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
                    className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1E1F24] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-750 py-2 z-40 overflow-hidden text-left"
                  >
                    <button
                      type="button"
                      onClick={toggleRestrict}
                      className="w-full text-left px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-3 transition cursor-pointer"
                    >
                      <EyeOff className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                      <span>{isRestricted ? 'Unrestrict' : 'Restrict'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        onBlockUser();
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-3 transition cursor-pointer"
                    >
                      <Ban className="w-4 h-4 text-rose-500" />
                      <span>{isBlocked ? 'Unblock' : 'Block'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        setShowReportModal(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-3 transition cursor-pointer"
                    >
                      <MessageSquareWarning className="w-4 h-4 text-rose-500" />
                      <span>Report</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Feature Rows (Image 1: Theme, Nicknames, Disappearing messages, Chat controls, Privacy, Group chat, Something isn't working) */}
        <div className="w-full mt-8 space-y-1">
          {/* Row 1: Theme */}
          <div
            onClick={onOpenThemeModal}
            className="flex items-center justify-between py-3 px-3 rounded-2xl hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 cursor-pointer transition group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center shrink-0">
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-fuchsia-500 via-purple-500 to-indigo-500 shadow-sm border border-white/20" />
              </div>
              <div>
                <h4 className="text-[15px] font-medium text-zinc-900 dark:text-white">Theme</h4>
                <p className="text-[12px] text-zinc-500 dark:text-zinc-400">{activeThemeName}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-400 dark:text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Row 2: Nicknames */}
          <div
            onClick={() => {
              setNicknameInput(userNickname);
              setShowNicknameModal(true);
            }}
            className="flex items-center justify-between py-3 px-3 rounded-2xl hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 cursor-pointer transition group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shrink-0">
                <Edit3 className="w-4.5 h-4.5" />
              </div>
              <h4 className="text-[15px] font-medium text-zinc-900 dark:text-white">Nicknames</h4>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-400 dark:text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Row 3: Disappearing messages */}
          <div
            onClick={() => setShowDisappearingModal(true)}
            className="flex items-center justify-between py-3 px-3 rounded-2xl hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 cursor-pointer transition group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shrink-0">
                <Clock className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-[15px] font-medium text-zinc-900 dark:text-white">Disappearing messages</h4>
                <p className="text-[12px] text-zinc-500 dark:text-zinc-400">{getDisappearingLabel()}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-400 dark:text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Row 4: Chat controls */}
          <div
            onClick={() => setShowChatControlsModal(true)}
            className="flex items-center justify-between py-3 px-3 rounded-2xl hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 cursor-pointer transition group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shrink-0">
                <MessageCircle className="w-4.5 h-4.5" />
              </div>
              <h4 className="text-[15px] font-medium text-zinc-900 dark:text-white">Chat controls</h4>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-400 dark:text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Row 5: Privacy and safety */}
          <div
            onClick={() => setShowPrivacyModal(true)}
            className="flex items-center justify-between py-3 px-3 rounded-2xl hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 cursor-pointer transition group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shrink-0">
                <Lock className="w-4.5 h-4.5" />
              </div>
              <h4 className="text-[15px] font-medium text-zinc-900 dark:text-white">Privacy and safety</h4>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-400 dark:text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Row 6: Create a group chat */}
          <div
            onClick={() => {
              onClose();
              onOpenGroupModal();
            }}
            className="flex items-center justify-between py-3 px-3 rounded-2xl hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 cursor-pointer transition group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shrink-0">
                <Users className="w-4.5 h-4.5" />
              </div>
              <h4 className="text-[15px] font-medium text-zinc-900 dark:text-white">Create a group chat</h4>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-400 dark:text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Row 7: Something isn't working */}
          <div
            onClick={() => setShowFeedbackModal(true)}
            className="flex items-center justify-between py-3 px-3 rounded-2xl hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 cursor-pointer transition group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shrink-0">
                <MessageSquareWarning className="w-4.5 h-4.5" />
              </div>
              <h4 className="text-[15px] font-medium text-zinc-900 dark:text-white">Something isn&apos;t working</h4>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-400 dark:text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* SUB-MODAL: Nicknames */}
      {showNicknameModal && (
        <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#1E1F24] rounded-3xl p-6 border border-zinc-200 dark:border-zinc-750 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Set Nickname</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Only you will see this nickname in your chats with this user.
            </p>
            <input
              type="text"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              placeholder="Enter nickname..."
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#5B51D8]"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNicknameModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNickname}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#5B51D8] hover:bg-[#4E44C4] text-white shadow-sm cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL: Disappearing Messages */}
      {showDisappearingModal && (
        <div className="fixed inset-0 z-[10020] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#1E1F24] rounded-t-3xl sm:rounded-3xl p-6 border border-zinc-200 dark:border-zinc-750 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Disappearing Messages</h3>
              <button
                type="button"
                onClick={() => setShowDisappearingModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              When enabled, new messages sent in this chat will disappear after the selected period.
            </p>
            <div className="space-y-2 pt-2">
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
                  className={`w-full p-3.5 rounded-2xl flex items-center justify-between text-sm font-semibold transition cursor-pointer ${
                    currentAutoDeleteDuration === opt.val
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-400/50 shadow-xs'
                      : 'bg-zinc-50 dark:bg-zinc-800/70 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span>{opt.label}</span>
                  {currentAutoDeleteDuration === opt.val && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL: Chat Controls */}
      {showChatControlsModal && (
        <div className="fixed inset-0 z-[10020] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#1E1F24] rounded-t-3xl sm:rounded-3xl p-6 border border-zinc-200 dark:border-zinc-750 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Chat Controls</h3>
              <button
                type="button"
                onClick={() => setShowChatControlsModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800/70 rounded-2xl border border-zinc-200/80 dark:border-zinc-700">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Read Receipts</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Let others know when you&apos;ve seen their messages</p>
                </div>
                <input
                  type="checkbox"
                  checked={readReceipts}
                  onChange={(e) => {
                    setReadReceipts(e.target.checked);
                    notify(`Read receipts ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
                  }}
                  className="w-5 h-5 accent-[#5B51D8] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800/70 rounded-2xl border border-zinc-200/80 dark:border-zinc-700">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Sound Effects</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Play chime when messages arrive or send</p>
                </div>
                <input
                  type="checkbox"
                  checked={soundEffects}
                  onChange={(e) => {
                    setSoundEffects(e.target.checked);
                    notify(`Sound effects ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
                  }}
                  className="w-5 h-5 accent-[#5B51D8] rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL: Privacy and Safety */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#1E1F24] rounded-3xl p-6 border border-zinc-200 dark:border-zinc-750 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Privacy & Safety</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-zinc-650 dark:text-zinc-300">
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/70 rounded-2xl border border-zinc-200/80 dark:border-zinc-700">
                <p className="font-bold text-zinc-900 dark:text-white">🔒 End-to-End Chat Encryption</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Messages and calls are secured with transport encryption and private token validation.
                </p>
              </div>
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/70 rounded-2xl border border-zinc-200/80 dark:border-zinc-700">
                <p className="font-bold text-zinc-900 dark:text-white">🛡️ Scam Prevention Guarantee</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  DeepShop automatically scans suspicious review fraud and protects consumer transactions.
                </p>
              </div>
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/70 rounded-2xl border border-zinc-200/80 dark:border-zinc-700">
                <p className="font-bold text-zinc-900 dark:text-white">🚫 Restrict & Block Control</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  You can restrict or block accounts at any time without alerting the other party.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL: Report */}
      {showReportModal && (
        <div className="fixed inset-0 z-[10025] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#1E1F24] rounded-3xl p-6 border border-zinc-200 dark:border-zinc-750 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-rose-600 flex items-center gap-2">
              <MessageSquareWarning className="w-5 h-5" />
              <span>Report User</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Please tell us why you are reporting this conversation.
            </p>
            <textarea
              rows={3}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Describe the issue (e.g. spam, harassment, counterfeit)..."
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendReport}
                disabled={!reportReason.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 cursor-pointer"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL: Something isn't working */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-[10025] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#1E1F24] rounded-3xl p-6 border border-zinc-200 dark:border-zinc-750 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Report a Problem</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Briefly explain what happened and what wasn&apos;t working as expected.
            </p>
            <textarea
              rows={4}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Write your feedback..."
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#5B51D8] resize-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendFeedback}
                disabled={!feedbackText.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#5B51D8] hover:bg-[#4E44C4] text-white disabled:opacity-50 cursor-pointer"
              >
                Send Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
