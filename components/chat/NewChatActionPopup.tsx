import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Loader2,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import {
  MsgBackChevronIcon,
  MsgCloseIcon,
  MsgCommunityIcon,
  MsgPlusIcon,
  MsgSearchIcon,
} from './MessagesSvgIcons';
import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { SuggestedContact } from './NewMessageModal';
import { cn } from '../../lib/utils';

export type NewChatPopupMode = 'menu' | 'new_contact' | 'new_community';

interface NewChatActionPopupProps {
  isOpen: boolean;
  initialMode?: NewChatPopupMode;
  onClose: () => void;
  currentUser: any;
  channels: any[];
  onStartNewChat: () => void;
  onSelectContactForChat: (contact: SuggestedContact) => void;
  onContactSaved?: (contact: SuggestedContact) => void;
  onOpenChannel: (channelId: string) => void;
  onCreateCommunity: () => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const NewChatActionPopup: React.FC<NewChatActionPopupProps> = ({
  isOpen,
  initialMode = 'menu',
  onClose,
  currentUser,
  channels,
  onStartNewChat,
  onSelectContactForChat,
  onContactSaved,
  onOpenChannel,
  onCreateCommunity,
  notify,
}) => {
  const [mode, setMode] = useState<NewChatPopupMode>(initialMode);

  // New Contact state
  const [contactQuery, setContactQuery] = useState('');
  const [contactResults, setContactResults] = useState<SuggestedContact[]>([]);
  const [isSearchingContacts, setIsSearchingContacts] = useState(false);
  const [selectedUserToSave, setSelectedUserToSave] = useState<SuggestedContact | null>(null);
  const [customContactName, setCustomContactName] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);

  // New Community state
  const [communitySearch, setCommunitySearch] = useState('');
  const [joiningChannelId, setJoiningChannelId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    } else {
      setContactQuery('');
      setContactResults([]);
      setSelectedUserToSave(null);
      setCustomContactName('');
      setCommunitySearch('');
    }
  }, [isOpen, initialMode]);

  // Search Firestore users for "New Contact"
  useEffect(() => {
    if (!isOpen || mode !== 'new_contact') return;
    const q = contactQuery.trim().toLowerCase();
    if (q.length < 2) {
      setContactResults([]);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setIsSearchingContacts(true);
      try {
        const snap = await getDocs(query(collection(db, 'users'), limit(40)));
        if (!active) return;
        const matches: SuggestedContact[] = [];
        snap.forEach((d) => {
          if (d.id === currentUser?.uid || d.id === 'system' || String(d.id).startsWith('demo_')) return;
          const data = d.data();
          if (data.isBanned || data.isDemo) return;
          const displayName = data.displayName || data.shopName || data.name || 'User';
          const username = data.username || data.customLink || '';
          const email = data.email || '';
          const phoneNumber = data.phoneNumber || data.phone || '';

          if (
            displayName.toLowerCase().includes(q) ||
            username.toLowerCase().includes(q) ||
            email.toLowerCase().includes(q) ||
            phoneNumber.toLowerCase().includes(q)
          ) {
            matches.push({
              id: d.id,
              displayName,
              username,
              email,
              phoneNumber,
              photoURL: data.photoURL || '',
              isOnline: Boolean(data.isOnline),
            });
          }
        });
        setContactResults(matches);
      } catch (err) {
        console.error('Contact lookup error:', err);
      } finally {
        if (active) setIsSearchingContacts(false);
      }
    }, 280);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, mode, contactQuery, currentUser?.uid]);

  const handleSaveContact = async (openChatAfter: boolean) => {
    if (!selectedUserToSave || !currentUser?.uid) return;
    setIsSavingContact(true);
    try {
      const finalName = customContactName.trim() || selectedUserToSave.displayName || 'Contact';
      const contactRecord: SuggestedContact = {
        ...selectedUserToSave,
        displayName: finalName,
      };

      // Save custom nickname locally so Messages displays it everywhere
      if (customContactName.trim()) {
        localStorage.setItem(`chat_nickname_${currentUser.uid}_${selectedUserToSave.id}`, customContactName.trim());
        window.dispatchEvent(new Event('chat_nickname_updated'));
      }

      // Persist in localStorage cache
      try {
        const key = `deepshop_saved_contacts_${currentUser.uid}`;
        const existing: SuggestedContact[] = JSON.parse(localStorage.getItem(key) || '[]');
        const deduped = [contactRecord, ...existing.filter((c) => c.id !== contactRecord.id)];
        localStorage.setItem(key, JSON.stringify(deduped));
      } catch {}

      // Persist on current user's Firestore doc
      await setDoc(
        doc(db, 'users', currentUser.uid),
        {
          savedContacts: arrayUnion({
            id: contactRecord.id,
            displayName: contactRecord.displayName,
            username: contactRecord.username || '',
            email: contactRecord.email || '',
            phoneNumber: contactRecord.phoneNumber || '',
            photoURL: contactRecord.photoURL || '',
            addedAt: Date.now(),
          }),
        },
        { merge: true }
      ).catch(() => {});

      onContactSaved?.(contactRecord);
      notify(`${finalName} added to your contacts`, 'success');
      onClose();
      if (openChatAfter) {
        onSelectContactForChat(contactRecord);
      }
    } catch (err) {
      console.error('Save contact error:', err);
      notify('Could not save contact', 'error');
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleJoinAndOpenCommunity = async (channel: any) => {
    if (!channel?.id) return;
    if (!currentUser?.uid) {
      onClose();
      onOpenChannel(channel.id);
      return;
    }
    setJoiningChannelId(channel.id);
    try {
      const subRef = doc(db, 'community_channels', channel.id, 'subscribers', currentUser.uid);
      await setDoc(
        subRef,
        {
          uid: currentUser.uid,
          displayName: currentUser.displayName || 'Member',
          email: currentUser.email || '',
          photoURL: currentUser.photoURL || '',
          joinedAt: Date.now(),
          muted: false,
        },
        { merge: true }
      );
      if (channel.creatorId !== currentUser.uid) {
        await updateDoc(doc(db, 'community_channels', channel.id), {
          subscriberCount: Math.max(1, Number(channel.subscriberCount || 0) + 1),
        }).catch(() => {});
      }
    } catch {}
    setJoiningChannelId(null);
    onClose();
    onOpenChannel(channel.id);
  };

  const discoverableCommunities = (channels || []).filter((ch) => {
    if (ch.isPrivate && ch.creatorId !== currentUser?.uid) return false;
    if (!communitySearch.trim()) return true;
    const q = communitySearch.trim().toLowerCase();
    return (
      String(ch.name || '').toLowerCase().includes(q) ||
      String(ch.customLink || '').toLowerCase().includes(q) ||
      String(ch.description || '').toLowerCase().includes(q)
    );
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Dimmed + Frosted Overlay (z-30 on mobile so bottom Cancel bar stays crisp above at z-40, matching IMG_5360 right) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className={cn(
              'fixed inset-0 bg-black/20 dark:bg-black/55 backdrop-blur-[3px]',
              mode === 'menu' ? 'z-30 md:z-40' : 'z-[9600]'
            )}
          />

          {mode === 'menu' ? (
            /* Floating 3-Option Card matching IMG_5360 right on mobile & anchored beside left rail on desktop */
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="msg-v2-popup fixed bottom-[88px] inset-x-4 max-w-[400px] mx-auto z-40 md:z-50 md:bottom-auto md:top-[205px] md:left-[94px] md:inset-x-auto md:w-[360px] md:mx-0 bg-white dark:bg-[#181A22] rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.16)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.55)] border border-zinc-100 dark:border-white/10 overflow-hidden"
            >
              <div className="divide-y divide-zinc-100 dark:divide-white/[0.06] px-2 py-1.5">
                {/* 1. New Chat */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartNewChat();
                  }}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-zinc-50 dark:hover:bg-white/[0.05] active:scale-[0.99] transition text-left cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-900 dark:text-zinc-100 shrink-0">
                    {/* Chat bubble with dots outline icon matching IMG_5360 */}
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      <circle cx="8.5" cy="11.5" r="0.8" fill="currentColor" />
                      <circle cx="12" cy="11.5" r="0.8" fill="currentColor" />
                      <circle cx="15.5" cy="11.5" r="0.8" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold text-zinc-950 dark:text-white leading-snug">
                      New Chat
                    </p>
                    <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                      Send a message to your contact
                    </p>
                  </div>
                </button>

                {/* 2. New Contact */}
                <button
                  type="button"
                  onClick={() => setMode('new_contact')}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-zinc-50 dark:hover:bg-white/[0.05] active:scale-[0.99] transition text-left cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-900 dark:text-zinc-100 shrink-0">
                    {/* Contact book outline icon matching IMG_5360 */}
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="2" width="15" height="20" rx="2.5" />
                      <line x1="2.5" y1="7" x2="5" y2="7" />
                      <line x1="2.5" y1="12" x2="5" y2="12" />
                      <line x1="2.5" y1="17" x2="5" y2="17" />
                      <circle cx="12.5" cy="10" r="2.3" />
                      <path d="M9 16.5c.7-1.6 2-2.5 3.5-2.5s2.8.9 3.5 2.5" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold text-zinc-950 dark:text-white leading-snug">
                      New Contact
                    </p>
                    <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                      Add a contact to be able to send messages
                    </p>
                  </div>
                </button>

                {/* 3. New Community */}
                <button
                  type="button"
                  onClick={() => setMode('new_community')}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-zinc-50 dark:hover:bg-white/[0.05] active:scale-[0.99] transition text-left cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-900 dark:text-zinc-100 shrink-0">
                    <MsgCommunityIcon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold text-zinc-950 dark:text-white leading-snug">
                      New Community
                    </p>
                    <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                      Join the community around you
                    </p>
                  </div>
                </button>
              </div>
            </motion.div>
          ) : mode === 'new_contact' ? (
            /* Add New Contact Sub-Modal */
            <div className="fixed inset-0 z-[9650] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, y: 28, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 28, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                onClick={(e) => e.stopPropagation()}
                 className="msg-v2-popup pointer-events-auto w-full sm:max-w-[440px] bg-white dark:bg-[#161820] rounded-t-[30px] sm:rounded-[30px] shadow-2xl border border-zinc-200/80 dark:border-white/10 overflow-hidden flex flex-col max-h-[85vh]"
              >
                <div className="px-5 py-4 border-b border-zinc-100 dark:border-white/[0.07] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedUserToSave) {
                          setSelectedUserToSave(null);
                        } else {
                          setMode('menu');
                        }
                      }}
                      className="w-8 h-8 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 flex items-center justify-center text-zinc-700 dark:text-zinc-200 cursor-pointer"
                    >
                      <MsgBackChevronIcon className="w-5 h-5" />
                    </button>
                    <div>
                      <h3 className="text-[16px] font-bold text-zinc-950 dark:text-white leading-tight">
                        New Contact
                      </h3>
                      <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
                        Find by name, @username, email, or phone
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center text-zinc-600 dark:text-zinc-300 cursor-pointer"
                  >
                    <MsgCloseIcon className="w-4 h-4" />
                  </button>
                </div>

                {selectedUserToSave ? (
                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200/70 dark:border-white/10">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0 flex items-center justify-center">
                        {selectedUserToSave.photoURL ? (
                          <img src={selectedUserToSave.photoURL} alt={selectedUserToSave.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold text-base text-[#2F80ED]">
                            {(selectedUserToSave.displayName || 'U')[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-zinc-950 dark:text-white truncate">
                          {selectedUserToSave.displayName}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {selectedUserToSave.username
                            ? `@${selectedUserToSave.username}`
                            : selectedUserToSave.email || selectedUserToSave.phoneNumber || 'Verified Member'}
                        </p>
                      </div>
                      <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                        Contact Display Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={customContactName}
                        onChange={(e) => setCustomContactName(e.target.value)}
                        placeholder={selectedUserToSave.displayName}
                        className="w-full rounded-2xl bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200 dark:border-white/10 px-4 py-3 text-sm text-zinc-950 dark:text-white outline-none focus:ring-2 focus:ring-[#2F80ED]/30"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-2">
                      <button
                        type="button"
                        disabled={isSavingContact}
                        onClick={() => handleSaveContact(false)}
                        className="py-3 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-900 dark:text-white text-sm font-semibold transition cursor-pointer"
                      >
                        Save Only
                      </button>
                      <button
                        type="button"
                        disabled={isSavingContact}
                        onClick={() => handleSaveContact(true)}
                        className="py-3 rounded-2xl bg-[#16181D] dark:bg-white text-white dark:text-zinc-950 text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isSavingContact ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                        <span>Save & Chat</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 flex-1 overflow-y-auto space-y-3">
                    <div className="relative">
                      <MsgSearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        type="text"
                        value={contactQuery}
                        onChange={(e) => setContactQuery(e.target.value)}
                        placeholder="Type name, email, phone, or @username..."
                        autoFocus
                        className="w-full rounded-2xl bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200/80 dark:border-white/10 pl-10 pr-4 py-3 text-sm text-zinc-950 dark:text-white outline-none focus:ring-2 focus:ring-[#2F80ED]/30"
                      />
                    </div>

                    <div className="min-h-[190px] max-h-[320px] overflow-y-auto space-y-1">
                      {contactQuery.trim().length < 2 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/[0.05] flex items-center justify-center text-zinc-500 mb-2.5">
                            <UserPlus className="w-5 h-5" />
                          </div>
                          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                            Search to add a contact
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            Enter at least 2 characters to find registered members or sellers.
                          </p>
                        </div>
                      ) : isSearchingContacts ? (
                        <div className="flex items-center justify-center py-12 text-zinc-400 gap-2 text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Searching directory...</span>
                        </div>
                      ) : contactResults.length === 0 ? (
                        <div className="text-center py-12 text-xs text-zinc-500">
                          No user found matching "{contactQuery}"
                        </div>
                      ) : (
                        contactResults.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setSelectedUserToSave(u);
                              setCustomContactName(u.displayName);
                            }}
                            className="w-full flex items-center justify-between gap-3 p-3 rounded-2xl hover:bg-zinc-100/80 dark:hover:bg-white/[0.06] transition text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0 flex items-center justify-center">
                                {u.photoURL ? (
                                  <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="font-bold text-sm text-[#2F80ED]">
                                    {(u.displayName || 'U')[0].toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-zinc-950 dark:text-white truncate">
                                  {u.displayName}
                                </p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                  {u.username ? `@${u.username}` : u.email || 'Member'}
                                </p>
                              </div>
                            </div>
                            <span className="px-3 py-1.5 rounded-full bg-[#16181D] dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold shrink-0">
                              Add
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          ) : (
            /* Join or Create Community Sub-Modal */
            <div className="fixed inset-0 z-[9650] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, y: 28, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 28, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                onClick={(e) => e.stopPropagation()}
                className="msg-v2-popup pointer-events-auto w-full sm:max-w-[460px] bg-white dark:bg-[#161820] rounded-t-[30px] sm:rounded-[30px] shadow-2xl border border-zinc-200/80 dark:border-white/10 overflow-hidden flex flex-col max-h-[85vh]"
              >
                <div className="px-5 py-4 border-b border-zinc-100 dark:border-white/[0.07] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setMode('menu')}
                      className="w-8 h-8 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 flex items-center justify-center text-zinc-700 dark:text-zinc-200 cursor-pointer"
                    >
                      <MsgBackChevronIcon className="w-5 h-5" />
                    </button>
                    <div>
                      <h3 className="text-[16px] font-bold text-zinc-950 dark:text-white leading-tight">
                        Communities
                      </h3>
                      <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
                        Join communities around you or start one
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center text-zinc-600 dark:text-zinc-300 cursor-pointer"
                  >
                    <MsgCloseIcon className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <MsgSearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        type="text"
                        value={communitySearch}
                        onChange={(e) => setCommunitySearch(e.target.value)}
                        placeholder="Search communities..."
                        className="w-full rounded-2xl bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200/80 dark:border-white/10 pl-10 pr-3 py-2.5 text-sm text-zinc-950 dark:text-white outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onCreateCommunity();
                      }}
                      className="h-[42px] px-4 rounded-2xl msg-new-chat-pill text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer hover:opacity-90 transition"
                    >
                      <MsgPlusIcon className="w-4 h-4" />
                      <span>Create</span>
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-[340px] overflow-y-auto">
                    {discoverableCommunities.length === 0 ? (
                      <div className="text-center py-12 px-4">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/[0.05] flex items-center justify-center mx-auto mb-2.5 text-zinc-400">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                          No communities found
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          Create the first community to gather members around shared topics.
                        </p>
                      </div>
                    ) : (
                      discoverableCommunities.map((ch) => (
                        <div
                          key={ch.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-white/[0.04] border border-zinc-100 dark:border-white/[0.06] transition"
                        >
                          <div
                            onClick={() => {
                              onClose();
                              onOpenChannel(ch.id);
                            }}
                            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          >
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0 flex items-center justify-center">
                              {ch.imageUrl ? (
                                <img src={ch.imageUrl} alt={ch.name} className="w-full h-full object-cover" />
                              ) : (
                                <MsgCommunityIcon className="w-5 h-5 text-zinc-500" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-sm text-zinc-950 dark:text-white truncate">
                                {ch.name}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                {ch.description || `@${ch.customLink || 'community'}`}
                              </p>
                              <p className="text-[11px] font-medium text-[#2F80ED] mt-0.5">
                                {ch.subscriberCount || 1} members
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={joiningChannelId === ch.id}
                            onClick={() => handleJoinAndOpenCommunity(ch)}
                            className="px-4 py-2 rounded-full bg-[#2F80ED] hover:bg-[#256ad1] text-white text-xs font-semibold shrink-0 transition cursor-pointer"
                          >
                            {joiningChannelId === ch.id ? 'Joining...' : 'Join'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
};
