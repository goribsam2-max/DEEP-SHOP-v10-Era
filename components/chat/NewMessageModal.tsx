import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Search, Users, ChevronRight, ChevronLeft, Check, 
  Image as ImageIcon, Camera, Globe, MessageSquareShare, 
  Sparkles, Loader2, ImagePlus
} from 'lucide-react';
import { db } from '../../firebase';
import { 
  collection, getDocs, query, limit, addDoc, 
  serverTimestamp, doc, setDoc 
} from 'firebase/firestore';
import { uploadToImgbb } from '../../services/imgbb';
import { cn } from '../../lib/utils';

export interface SuggestedContact {
  id: string;
  displayName: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
  photoURL?: string;
  isOnline?: boolean;
}

// Default fallback contacts matching the user screenshots
const DEFAULT_SUGGESTED_USERS: SuggestedContact[] = [
  {
    id: 'user_marup',
    displayName: 'Marup Hasan Shanto',
    username: 'maruphshanto',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    isOnline: true
  },
  {
    id: 'user_shadat',
    displayName: 'Shadat Ahmed',
    username: 'shadatahmed',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    isOnline: true
  },
  {
    id: 'user_alif',
    displayName: 'Md Alif',
    username: 'mdalif',
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    isOnline: false
  },
  {
    id: 'user_samiya',
    displayName: 'Samiya Akter',
    username: 'samiyaakter',
    photoURL: '',
    isOnline: false
  },
  {
    id: 'user_ziaur',
    displayName: 'Itz Ziaur',
    username: 'itzziaur',
    photoURL: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80',
    isOnline: false
  },
  {
    id: 'user_ahsan',
    displayName: 'Ahsanul Islam Ahsan',
    username: 'ahsanulislam',
    photoURL: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80',
    isOnline: true
  },
  {
    id: 'user_rabeya',
    displayName: 'Rabeya Boshry',
    username: 'rabeyaboshry',
    photoURL: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
    isOnline: false
  },
  {
    id: 'user_riyadh',
    displayName: 'Abu Saheed Riyadh',
    username: 'abusaheed',
    photoURL: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80',
    isOnline: true
  },
  {
    id: 'user_siyam',
    displayName: 'Siyam Ahmed',
    username: 'siyamahmed',
    photoURL: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
    isOnline: false
  }
];

interface NewMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  suggestedUsers?: SuggestedContact[];
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onSelectUser: (user: SuggestedContact) => void;
  onGroupCreated: (id: string, isCommunity?: boolean) => void;
}

type ModalStep = 'new_message' | 'new_group_select' | 'new_group_details' | 'new_note';

export const NewMessageModal: React.FC<NewMessageModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  suggestedUsers = [],
  notify,
  onSelectUser,
  onGroupCreated
}) => {
  const [step, setStep] = useState<ModalStep>('new_message');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [usersList, setUsersList] = useState<SuggestedContact[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Group creation state
  const [selectedUsers, setSelectedUsers] = useState<SuggestedContact[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState<'group' | 'community'>('group');
  const [groupImageFile, setGroupImageFile] = useState<File | null>(null);
  const [groupImagePreview, setGroupImagePreview] = useState<string>('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Note creation state
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Fetch real users from Firestore and merge with suggested
  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, limit(60));
        const snap = await getDocs(q);
        
        const fetched: SuggestedContact[] = [];
        snap.forEach(d => {
          if (d.id !== currentUser?.uid) {
            const data = d.data();
            fetched.push({
              id: d.id,
              displayName: data.displayName || data.shopName || 'Marketplace User',
              username: data.username || data.customLink || '',
              email: data.email || '',
              phoneNumber: data.phoneNumber || data.phone || '',
              photoURL: data.photoURL || '',
              isOnline: !!data.isOnline
            });
          }
        });

        // First priority: people the user has chatted with (suggestedUsers)
        const existingIds = new Set<string>();
        const merged: SuggestedContact[] = [];

        if (suggestedUsers && suggestedUsers.length > 0) {
          for (const s of suggestedUsers) {
            if (s.id !== currentUser?.uid && !existingIds.has(s.id)) {
              existingIds.add(s.id);
              merged.push(s);
            }
          }
        }

        // Second: add fetched users
        for (const u of fetched) {
          if (!existingIds.has(u.id) && u.id !== currentUser?.uid) {
            existingIds.add(u.id);
            merged.push(u);
          }
        }

        // Third: fallback defaults
        for (const def of DEFAULT_SUGGESTED_USERS) {
          if (!existingIds.has(def.id) && def.id !== currentUser?.uid) {
            existingIds.add(def.id);
            merged.push(def);
          }
        }
        setUsersList(merged);
      } catch (err) {
        console.error("Error fetching users for new message:", err);
        setUsersList(suggestedUsers.length > 0 ? suggestedUsers : DEFAULT_SUGGESTED_USERS);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [isOpen, currentUser?.uid, suggestedUsers]);

  // Reset modal state on close
  const handleModalClose = () => {
    setStep('new_message');
    setSearchQuery('');
    setGroupSearchQuery('');
    setSelectedUsers([]);
    setGroupName('');
    setGroupType('group');
    setGroupImageFile(null);
    setGroupImagePreview('');
    setNoteText('');
    onClose();
  };

  // Filtered users for Screen 1 ("To: ...")
  const filteredUsers = usersList.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      u.displayName.toLowerCase().includes(q) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phoneNumber && u.phoneNumber.includes(q))
    );
  });

  // Filtered users for Screen 2 ("New group -> Search")
  const filteredGroupUsers = usersList.filter(u => {
    if (!groupSearchQuery.trim()) return true;
    const q = groupSearchQuery.toLowerCase().trim();
    return (
      u.displayName.toLowerCase().includes(q) ||
      (u.username && u.username.toLowerCase().includes(q))
    );
  });

  // Toggle selection for group members
  const toggleUserSelection = (user: SuggestedContact) => {
    setSelectedUsers(prev => {
      const exists = prev.some(u => u.id === user.id);
      if (exists) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  // Handle group image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setGroupImageFile(file);
      setGroupImagePreview(URL.createObjectURL(file));
    }
  };

  // Handle group creation
  const handleCreateGroup = async () => {
    if (!currentUser) return;
    if (selectedUsers.length === 0) {
      notify("Please select at least one member", "error");
      return;
    }

    setIsCreatingGroup(true);
    try {
      let finalImageUrl = groupImagePreview;
      if (groupImageFile) {
        try {
          finalImageUrl = await uploadToImgbb(groupImageFile);
        } catch {
          // fallback to preview or default
        }
      }
      if (!finalImageUrl) {
        finalImageUrl = 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=200&q=80';
      }

      const trimmedName = groupName.trim() || 'New Group';

      if (groupType === 'group') {
        // Create in p2p_chats
        const participantIds = [currentUser.uid, ...selectedUsers.map(u => u.id)];
        const newGroupChat = {
          participants: participantIds,
          type: 'group',
          isGroup: true,
          name: trimmedName,
          photoURL: finalImageUrl,
          createdBy: currentUser.uid,
          admins: [currentUser.uid],
          settings: {
            onlyAdminsCanEditInfo: true,
            onlyAdminsCanSend: false,
            requireApproval: false
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: `${currentUser.displayName || 'You'} created the group`,
          lastSenderId: currentUser.uid,
          seenBy: [currentUser.uid]
        };

        const docRef = await addDoc(collection(db, 'p2p_chats'), newGroupChat);
        notify("Group created successfully!", "success");
        onGroupCreated(docRef.id, false);
        handleModalClose();
      } else {
        // Create in community_channels
        const customLink = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(1000 + Math.random() * 9000);
        const channelDoc = {
          name: trimmedName,
          description: 'Community channel with members.',
          customLink,
          imageUrl: finalImageUrl,
          creatorId: currentUser.uid,
          creatorName: currentUser.displayName || 'Creator',
          subscriberCount: 1 + selectedUsers.length,
          createdAt: Date.now(),
          isPrivate: true
        };

        const chanRef = await addDoc(collection(db, 'community_channels'), channelDoc);
        
        // Subscribe creator
        await setDoc(doc(db, 'community_channels', chanRef.id, 'subscriptions', currentUser.uid), {
          uid: currentUser.uid,
          displayName: currentUser.displayName || 'Creator',
          photoURL: currentUser.photoURL || '',
          muted: false,
          joinedAt: Date.now()
        });

        // Subscribe members
        for (const member of selectedUsers) {
          await setDoc(doc(db, 'community_channels', chanRef.id, 'subscriptions', member.id), {
            uid: member.id,
            displayName: member.displayName,
            photoURL: member.photoURL || '',
            muted: false,
            joinedAt: Date.now()
          });
        }

        notify("Community group created successfully!", "success");
        onGroupCreated(chanRef.id, true);
        handleModalClose();
      }
    } catch (err) {
      console.error("Error creating group:", err);
      notify("Failed to create group. Please try again.", "error");
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // Handle note sharing (Instagram/Messenger style thought note)
  const handleShareNote = async () => {
    if (!noteText.trim()) return;
    setIsSavingNote(true);
    try {
      const noteData = {
        text: noteText.trim().slice(0, 60),
        createdAt: Date.now(),
        userId: currentUser?.uid,
        userName: currentUser?.displayName || 'User'
      };
      localStorage.setItem(`user_note_${currentUser?.uid}`, JSON.stringify(noteData));
      notify("Note shared to contacts!", "success");
      handleModalClose();
    } catch {
      notify("Failed to share note", "error");
    } finally {
      setIsSavingNote(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={handleModalClose}
        className="absolute inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md"
      />

      {/* Main Container - Exact iOS/Messenger style matching screenshots */}
      <motion.div 
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative z-10 w-full sm:max-w-[460px] h-[92vh] sm:h-[680px] bg-white dark:bg-[#121214] text-zinc-900 dark:text-white rounded-t-[32px] sm:rounded-[32px] overflow-hidden flex flex-col font-sans shadow-2xl border border-zinc-200 dark:border-white/10"
      >
        {/* ============================================================== */}
        {/* SCREEN 1: NEW MESSAGE (Screenshot 1: IMG_3989.jpeg)            */}
        {/* ============================================================== */}
        {step === 'new_message' && (
          <div className="flex flex-col h-full">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-200 dark:border-zinc-800/80 shrink-0">
              <button 
                type="button"
                onClick={handleModalClose}
                className="text-[#007AFF] hover:text-[#0A84FF] font-medium text-[16px] cursor-pointer active:opacity-70 transition-opacity"
              >
                Cancel
              </button>
              <h2 className="text-[17px] font-bold text-zinc-900 dark:text-white tracking-tight">
                New message
              </h2>
              <div className="w-12" /> {/* Balancing spacer */}
            </div>

            {/* "To:" search bar */}
            <div className="flex items-center px-5 py-3 border-b border-zinc-200 dark:border-zinc-800/80 gap-2 shrink-0">
              <span className="text-zinc-500 font-normal text-[15px] select-none">
                To:
              </span>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user, name, email or number..."
                autoFocus
                className="w-full bg-transparent text-[15px] text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none"
              />
              {searchQuery && (
                <button 
                  type="button" 
                  onClick={() => setSearchQuery('')}
                  className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700/80 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/40">
              {/* Quick Actions (Screenshot 1: New note, Group chat) */}
              {!searchQuery && (
                <div className="py-1">
                  {/* Action 1: New note */}
                  <button 
                    type="button"
                    onClick={() => setStep('new_note')}
                    className="w-full px-5 py-3 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800/40 active:bg-zinc-200 dark:active:bg-zinc-800/60 transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-800 dark:text-white shrink-0 group-hover:scale-105 transition-transform">
                        <MessageSquareShare className="w-5 h-5 text-zinc-700 dark:text-zinc-200" />
                      </div>
                      <span className="text-[16px] font-medium text-zinc-900 dark:text-white">
                        New note
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  {/* Action 2: Group chat */}
                  <button 
                    type="button"
                    onClick={() => setStep('new_group_select')}
                    className="w-full px-5 py-3 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800/40 active:bg-zinc-200 dark:active:bg-zinc-800/60 transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-800 dark:text-white shrink-0 group-hover:scale-105 transition-transform">
                        <Users className="w-5 h-5 text-zinc-700 dark:text-zinc-200" />
                      </div>
                      <span className="text-[16px] font-medium text-zinc-900 dark:text-white">
                        Group chat
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>
              )}

              {/* Suggested Section Header */}
              <div className="px-5 pt-4 pb-2">
                <span className="text-[14px] font-semibold text-zinc-500 dark:text-zinc-400">
                  Suggested
                </span>
              </div>

              {/* Users List */}
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/40 pb-6">
                {isLoadingUsers ? (
                  <div className="flex items-center justify-center py-12 text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    <span>Loading suggested users...</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-sm">
                    No users found matching "{searchQuery}"
                  </div>
                ) : (
                  filteredUsers.map((item, uIdx) => (
                    <button 
                      key={`msg-user-${item.id || uIdx}-${uIdx}`}
                      type="button"
                      onClick={() => {
                        onSelectUser(item);
                        handleModalClose();
                      }}
                      className="w-full px-5 py-3.5 flex items-center gap-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 active:bg-zinc-100 dark:active:bg-zinc-800/70 transition-colors text-left cursor-pointer"
                    >
                      {/* Avatar */}
                      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 border border-zinc-200 dark:border-white/5">
                        {item.photoURL ? (
                          <img src={item.photoURL} alt={item.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-white font-bold text-base">
                            {item.displayName[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                        {item.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#121214]" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[16px] font-semibold text-zinc-900 dark:text-white truncate">
                          {item.displayName}
                        </h4>
                        {item.username && (
                          <p className="text-[12px] text-zinc-500 dark:text-zinc-400 truncate">
                            @{item.username}
                          </p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN 2: NEW GROUP SELECT (Screenshots 2 & 3: IMG_3990/3991) */}
        {/* ============================================================== */}
        {step === 'new_group_select' && (
          <div className="flex flex-col h-full">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-200 dark:border-zinc-800/80 shrink-0">
              <button 
                type="button"
                onClick={() => setStep('new_message')}
                className="text-[#007AFF] hover:text-[#0A84FF] font-medium text-[16px] cursor-pointer active:opacity-70 transition-opacity"
              >
                Cancel
              </button>
              <h2 className="text-[17px] font-bold text-zinc-900 dark:text-white tracking-tight">
                New group
              </h2>
              <button 
                type="button"
                disabled={selectedUsers.length === 0}
                onClick={() => setStep('new_group_details')}
                className={cn(
                  "font-semibold text-[16px] transition-all cursor-pointer",
                  selectedUsers.length > 0 
                    ? "text-[#007AFF] hover:text-[#0A84FF] active:scale-95" 
                    : "text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                )}
              >
                Next
              </button>
            </div>

            {/* Search Pill Input (Screenshot 2: IMG_3990) */}
            <div className="px-5 py-3 shrink-0">
              <div className="w-full bg-zinc-100 dark:bg-[#1E1F24] rounded-xl flex items-center px-3.5 py-2.5 gap-2 border border-zinc-200 dark:border-white/5">
                <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                <input 
                  type="text"
                  value={groupSearchQuery}
                  onChange={(e) => setGroupSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full bg-transparent text-[15px] text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none"
                />
                {groupSearchQuery && (
                  <button 
                    type="button" 
                    onClick={() => setGroupSearchQuery('')}
                    className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Selected Users Horizontal Strip (Screenshot 3: IMG_3991) */}
            {selectedUsers.length > 0 && (
              <div className="px-5 py-2 flex items-center gap-4 overflow-x-auto no-scrollbar border-b border-zinc-200 dark:border-zinc-800/80 shrink-0">
                {selectedUsers.map((user, suIdx) => (
                  <div 
                    key={`sel-user-${user.id || suIdx}-${suIdx}`}
                    className="flex flex-col items-center gap-1 shrink-0 relative group animate-in fade-in zoom-in-95 duration-200"
                  >
                    <div className="relative w-14 h-14 rounded-full">
                      <div className="w-full h-full rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-white font-bold text-sm">
                            {user.displayName[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                      {/* Delete (X) button on top-right */}
                      <button 
                        type="button"
                        onClick={() => toggleUserSelection(user)}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-zinc-900 dark:bg-zinc-900 border border-white/30 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-sm cursor-pointer"
                        title="Remove member"
                      >
                        <X className="w-3 h-3 stroke-[3]" />
                      </button>
                    </div>
                    <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 w-16 text-center truncate">
                      {user.displayName.split(' ')[0]}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Suggested Section Header */}
            <div className="px-5 pt-3 pb-1 shrink-0">
              <span className="text-[14px] font-semibold text-zinc-500 dark:text-zinc-400">
                Suggested
              </span>
            </div>

            {/* User Checkbox Selection List */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/40 pb-6">
              {filteredGroupUsers.map((user, fguIdx) => {
                const isSelected = selectedUsers.some(u => u.id === user.id);
                return (
                  <button 
                    key={`grp-user-${user.id || fguIdx}-${fguIdx}`}
                    type="button"
                    onClick={() => toggleUserSelection(user)}
                    className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/40 active:bg-zinc-100 dark:active:bg-zinc-800/70 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Avatar */}
                      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 border border-zinc-200 dark:border-white/5">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-white font-bold text-base">
                            {user.displayName[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                        {user.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#121214]" />
                        )}
                      </div>

                      {/* Name */}
                      <span className="text-[16px] font-semibold text-zinc-900 dark:text-white truncate">
                        {user.displayName}
                      </span>
                    </div>

                    {/* Radio Checkbox (Screenshot 2/3) */}
                    <div className="shrink-0 ml-3">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-[#007AFF] text-white flex items-center justify-center shadow-xs transition-transform scale-105">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-zinc-300 dark:border-zinc-600 transition-colors" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN 3: NEW GROUP DETAILS (Screenshot 4: IMG_3992.jpeg)      */}
        {/* ============================================================== */}
        {step === 'new_group_details' && (
          <div className="flex flex-col h-full">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-200 dark:border-zinc-800/80 shrink-0">
              <button 
                type="button"
                onClick={() => setStep('new_group_select')}
                className="text-[#007AFF] hover:text-[#0A84FF] flex items-center -ml-1 text-[16px] cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
              </button>
              <h2 className="text-[17px] font-bold text-zinc-900 dark:text-white tracking-tight">
                New group
              </h2>
              <button 
                type="button"
                disabled={isCreatingGroup}
                onClick={handleCreateGroup}
                className="font-bold text-[16px] text-[#007AFF] hover:text-[#0A84FF] active:scale-95 transition-all cursor-pointer flex items-center gap-1"
              >
                {isCreatingGroup && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Create
              </button>
            </div>

            {/* Scrollable Setup Options */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Group Name Card with Photo (Screenshot 4) */}
              <div className="bg-zinc-100 dark:bg-[#1E1F24] rounded-2xl p-3.5 flex items-center gap-3 border border-zinc-200 dark:border-white/5">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-13 h-13 rounded-2xl bg-zinc-200 dark:bg-zinc-800/90 hover:bg-zinc-300 dark:hover:bg-zinc-700/80 transition-colors flex items-center justify-center text-zinc-700 dark:text-zinc-300 relative overflow-hidden shrink-0 border border-zinc-300 dark:border-white/10 group cursor-pointer"
                  title="Upload group picture"
                >
                  {groupImagePreview ? (
                    <img src={groupImagePreview} alt="Group Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center">
                      <ImagePlus className="w-6 h-6 text-zinc-600 dark:text-zinc-300 group-hover:scale-110 transition-transform" />
                    </div>
                  )}
                </button>

                <input 
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name (optional)"
                  className="w-full bg-transparent text-[16px] text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none font-medium"
                />
              </div>

              {/* Group / Community Selector Card (Screenshot 4) */}
              <div className="bg-zinc-100 dark:bg-[#1E1F24] rounded-2xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800/80 border border-zinc-200 dark:border-white/5">
                {/* Option 1: Group */}
                <button 
                  type="button"
                  onClick={() => setGroupType('group')}
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-zinc-200/50 dark:hover:bg-zinc-800/30 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                    <span className="text-[16px] font-semibold text-zinc-900 dark:text-white">
                      Group
                    </span>
                  </div>
                  {groupType === 'group' ? (
                    <div className="w-5 h-5 rounded-full bg-[#007AFF] text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-zinc-400 dark:border-zinc-600" />
                  )}
                </button>

                {/* Option 2: Community */}
                <button 
                  type="button"
                  onClick={() => setGroupType('community')}
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-zinc-200/50 dark:hover:bg-zinc-800/30 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                    <span className="text-[16px] font-semibold text-zinc-900 dark:text-white">
                      Community
                    </span>
                  </div>
                  {groupType === 'community' ? (
                    <div className="w-5 h-5 rounded-full bg-[#007AFF] text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-zinc-400 dark:border-zinc-600" />
                  )}
                </button>
              </div>

              {/* Helper Notice Text */}
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400 px-1 leading-snug">
                Members must be added directly or join through an invitation link.{' '}
                <span className="text-[#007AFF] hover:underline cursor-pointer">Learn more</span>
              </p>

              {/* Invited Members Section (Screenshot 4) */}
              <div className="pt-2">
                <h4 className="text-[14px] font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                  Invited members ({selectedUsers.length})
                </h4>
                <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
                  {selectedUsers.map((user, dsuIdx) => (
                    <div 
                      key={`detail-sel-user-${user.id || dsuIdx}-${dsuIdx}`}
                      className="flex flex-col items-center gap-1 shrink-0 relative"
                    >
                      <div className="relative w-14 h-14 rounded-full">
                        <div className="w-full h-full rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-white font-bold text-sm">
                              {user.displayName[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                        <button 
                          type="button"
                          onClick={() => toggleUserSelection(user)}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-zinc-900 border border-white/30 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-sm cursor-pointer"
                          title="Remove member"
                        >
                          <X className="w-3 h-3 stroke-[3]" />
                        </button>
                      </div>
                      <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 w-16 text-center truncate">
                        {user.displayName.split(' ')[0]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN 4: NEW NOTE                                             */}
        {/* ============================================================== */}
        {step === 'new_note' && (
          <div className="flex flex-col h-full">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-200 dark:border-zinc-800/80 shrink-0">
              <button 
                type="button"
                onClick={() => setStep('new_message')}
                className="text-[#007AFF] hover:text-[#0A84FF] font-medium text-[16px] cursor-pointer"
              >
                Cancel
              </button>
              <h2 className="text-[17px] font-bold text-zinc-900 dark:text-white tracking-tight">
                New note
              </h2>
              <button 
                type="button"
                disabled={!noteText.trim() || isSavingNote}
                onClick={handleShareNote}
                className={cn(
                  "font-bold text-[16px] transition-all cursor-pointer",
                  noteText.trim() ? "text-[#007AFF] hover:text-[#0A84FF]" : "text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                )}
              >
                Share
              </button>
            </div>

            {/* Note Composer Screen */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center space-y-6">
              {/* Comic bubble thought above avatar */}
              <div className="relative">
                <div className="bg-zinc-100 dark:bg-[#1E1F24] border border-zinc-200 dark:border-white/10 rounded-2xl px-5 py-3 shadow-xl max-w-[260px] relative after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-transparent after:border-t-zinc-100 dark:after:border-t-[#1E1F24]">
                  <textarea 
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value.slice(0, 60))}
                    placeholder="Share a thought..."
                    rows={2}
                    className="w-full bg-transparent text-zinc-900 dark:text-white text-center text-sm placeholder-zinc-400 dark:placeholder-zinc-500 outline-none resize-none font-medium"
                    autoFocus
                  />
                  <div className="text-[10px] text-zinc-400 dark:text-zinc-500 text-right mt-1">
                    {60 - noteText.length} left
                  </div>
                </div>

                {/* Current User Avatar */}
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-indigo-500 mx-auto mt-4 shadow-lg bg-zinc-100 dark:bg-zinc-800">
                  <img 
                    src={currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.uid || 'User'}`} 
                    alt="User" 
                    className="w-full h-full object-cover" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-[16px] font-bold text-zinc-900 dark:text-white">
                  {currentUser?.displayName || 'Your Profile'}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">
                  Your note will be visible to your contacts and friends for 24 hours.
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
