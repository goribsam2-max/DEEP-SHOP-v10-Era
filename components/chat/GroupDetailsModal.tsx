import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  BellOff,
  UserPlus,
  LogOut,
  Trash2,
  Pin,
  PinOff,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  Shield,
  Clock,
  Camera,
  Edit3,
  Check,
  MoreVertical,
  Crown,
  ShieldCheck,
  UserMinus,
  ExternalLink,
  MessageCircle,
  Loader2,
  Users,
  Palette,
  AlertCircle
} from 'lucide-react';
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  getDoc,
  getDocs,
  collection,
  query,
  limit,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import { uploadToImgbb } from '../../services/imgbb';
import { cn } from '../../lib/utils';

export interface GroupMember {
  id: string;
  displayName: string;
  username?: string;
  email?: string;
  photoURL?: string;
  isOnline?: boolean;
  role?: 'owner' | 'admin' | 'member';
}

interface GroupDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeChat: any;
  currentUser: any;
  messages: any[];
  activeThemeName?: string;
  onOpenThemeModal?: () => void;
  onJumpToMessage?: (messageId: string) => void;
  onSelectUserForDirectChat?: (user: any) => void;
  onChatDeletedOrLeft?: () => void;
  notify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

type ModalView =
  | 'main'
  | 'members'
  | 'add_members'
  | 'pinned_messages'
  | 'shared_media'
  | 'admin_controls'
  | 'edit_info'
  | 'leave_confirm'
  | 'delete_confirm';

export const GroupDetailsModal: React.FC<GroupDetailsModalProps> = ({
  isOpen,
  onClose,
  activeChat,
  currentUser,
  messages = [],
  activeThemeName = 'Default',
  onOpenThemeModal,
  onJumpToMessage,
  onSelectUserForDirectChat,
  onChatDeletedOrLeft,
  notify,
}) => {
  // Navigation stack state
  const [currentView, setCurrentView] = useState<ModalView>('main');
  const [previousView, setPreviousView] = useState<ModalView>('main');

  // Mute state
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return activeChat?.id ? localStorage.getItem(`chat_muted_${activeChat.id}`) === 'true' : false;
  });

  // Members data state
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberTab, setMemberTab] = useState<'all' | 'admins'>('all');
  const [activeMemberActionMenu, setActiveMemberActionMenu] = useState<string | null>(null);

  // Add members state
  const [availableContacts, setAvailableContacts] = useState<GroupMember[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState('');
  const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);

  // Edit group info state
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupDescInput, setGroupDescInput] = useState('');
  const [groupImageFile, setGroupImageFile] = useState<File | null>(null);
  const [groupImagePreview, setGroupImagePreview] = useState('');
  const [isSavingGroupInfo, setIsSavingGroupInfo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Admin controls state
  const [onlyAdminsCanEdit, setOnlyAdminsCanEdit] = useState<boolean>(
    Boolean(activeChat?.settings?.onlyAdminsCanEditInfo ?? true)
  );
  const [onlyAdminsCanSend, setOnlyAdminsCanSend] = useState<boolean>(
    Boolean(activeChat?.settings?.onlyAdminsCanSend ?? false)
  );
  const [requireApproval, setRequireApproval] = useState<boolean>(
    Boolean(activeChat?.settings?.requireApproval ?? false)
  );
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Shared media tab
  const [mediaTab, setMediaTab] = useState<'media' | 'files' | 'links'>('media');

  // Lightbox preview for media
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);

  // Disappearing messages timer
  const [showTimerSelector, setShowTimerSelector] = useState(false);

  // Reset when modal closes or activeChat changes
  useEffect(() => {
    if (isOpen && activeChat) {
      setCurrentView('main');
      setGroupNameInput(activeChat.name || activeChat.groupName || 'Group Chat');
      setGroupDescInput(activeChat.description || '');
      setGroupImagePreview(activeChat.photoURL || '');
      setOnlyAdminsCanEdit(Boolean(activeChat?.settings?.onlyAdminsCanEditInfo ?? true));
      setOnlyAdminsCanSend(Boolean(activeChat?.settings?.onlyAdminsCanSend ?? false));
      setRequireApproval(Boolean(activeChat?.settings?.requireApproval ?? false));
      fetchMembers();
    }
  }, [isOpen, activeChat?.id]);

  // Determine owner & admin status
  const creatorId = activeChat?.createdBy || activeChat?.creatorId || (activeChat?.participants ? activeChat.participants[0] : '');
  const adminsList: string[] = useMemo(() => {
    if (Array.isArray(activeChat?.admins) && activeChat.admins.length > 0) {
      return activeChat.admins;
    }
    return creatorId ? [creatorId] : [];
  }, [activeChat?.admins, creatorId]);

  const isCurrentUserOwner = currentUser?.uid === creatorId;
  const isCurrentUserAdmin = isCurrentUserOwner || adminsList.includes(currentUser?.uid);

  // Fetch full details of group members
  const fetchMembers = async () => {
    if (!activeChat?.participants || !Array.isArray(activeChat.participants)) return;
    setIsLoadingMembers(true);
    try {
      const fetched: GroupMember[] = [];
      for (const uid of activeChat.participants) {
        if (uid === currentUser?.uid) {
          fetched.push({
            id: currentUser.uid,
            displayName: (currentUser.displayName || 'You') + (currentUser.uid === creatorId ? ' (You)' : ' (You)'),
            username: currentUser.email?.split('@')[0] || '',
            photoURL: currentUser.photoURL || '',
            isOnline: true,
            role: currentUser.uid === creatorId ? 'owner' : (adminsList.includes(currentUser.uid) ? 'admin' : 'member')
          });
          continue;
        }

        try {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            fetched.push({
              id: uid,
              displayName: data.displayName || data.shopName || data.name || 'Member',
              username: data.username || data.customLink || data.email?.split('@')[0] || '',
              email: data.email || '',
              photoURL: data.photoURL || '',
              isOnline: Boolean(data.isOnline),
              role: uid === creatorId ? 'owner' : (adminsList.includes(uid) ? 'admin' : 'member')
            });
          } else {
            fetched.push({
              id: uid,
              displayName: 'Group Member',
              photoURL: '',
              isOnline: false,
              role: uid === creatorId ? 'owner' : (adminsList.includes(uid) ? 'admin' : 'member')
            });
          }
        } catch {
          fetched.push({
            id: uid,
            displayName: 'Group Member',
            photoURL: '',
            isOnline: false,
            role: uid === creatorId ? 'owner' : (adminsList.includes(uid) ? 'admin' : 'member')
          });
        }
      }

      // Sort: owner first, then admins, then members, then alphabetically
      fetched.sort((a, b) => {
        if (a.role === 'owner') return -1;
        if (b.role === 'owner') return 1;
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (b.role === 'admin' && a.role !== 'admin') return 1;
        return a.displayName.localeCompare(b.displayName);
      });

      setMembers(fetched);
    } catch (err) {
      console.error('Error fetching group members:', err);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  // Fetch available contacts for "Add Members"
  const fetchAvailableContacts = async () => {
    setIsLoadingContacts(true);
    try {
      const existingIds = new Set(activeChat?.participants || []);
      const usersRef = collection(db, 'users');
      const snap = await getDocs(query(usersRef, limit(40)));
      const available: GroupMember[] = [];
      snap.forEach(d => {
        if (!existingIds.has(d.id)) {
          const data = d.data();
          available.push({
            id: d.id,
            displayName: data.displayName || data.shopName || data.name || 'User',
            username: data.username || data.customLink || '',
            photoURL: data.photoURL || '',
            isOnline: !!data.isOnline
          });
        }
      });
      setAvailableContacts(available);
    } catch (err) {
      console.error('Error fetching available contacts:', err);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleOpenAddMembers = () => {
    setSelectedNewMembers([]);
    setAddMemberSearch('');
    fetchAvailableContacts();
    goToView('add_members');
  };

  const goToView = (view: ModalView) => {
    setPreviousView(currentView);
    setCurrentView(view);
    setActiveMemberActionMenu(null);
  };

  // Toggle Mute
  const handleToggleMute = () => {
    if (!activeChat?.id) return;
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem(`chat_muted_${activeChat.id}`, next.toString());
    notify(next ? 'Notifications muted for this group' : 'Notifications unmuted', 'info');
  };

  // Handle Promoting to Admin (Admins only)
  const handlePromoteToAdmin = async (targetUserId: string, targetName: string) => {
    if (!isCurrentUserAdmin) {
      notify('Only group admins can assign other admins', 'error');
      return;
    }
    try {
      await updateDoc(doc(db, 'p2p_chats', activeChat.id), {
        admins: arrayUnion(targetUserId)
      });
      notify(`${targetName} is now a group admin`, 'success');
      // Post announcement message
      await addDoc(collection(db, 'p2p_chats', activeChat.id, 'messages'), {
        text: `${currentUser?.displayName || 'An admin'} assigned ${targetName} as a group admin.`,
        senderId: 'system',
        timestamp: serverTimestamp(),
        isSystem: true
      });
      // Update local member
      setMembers(prev =>
        prev.map(m => (m.id === targetUserId ? { ...m, role: 'admin' } : m))
      );
      setActiveMemberActionMenu(null);
    } catch (err) {
      console.error(err);
      notify('Failed to promote user', 'error');
    }
  };

  // Handle Demoting Admin
  const handleDemoteAdmin = async (targetUserId: string, targetName: string) => {
    if (!isCurrentUserAdmin) {
      notify('Only group admins can remove admin permissions', 'error');
      return;
    }
    if (targetUserId === creatorId) {
      notify('The group owner cannot be dismissed as admin', 'error');
      return;
    }
    try {
      await updateDoc(doc(db, 'p2p_chats', activeChat.id), {
        admins: arrayRemove(targetUserId)
      });
      notify(`${targetName} is no longer an admin`, 'info');
      await addDoc(collection(db, 'p2p_chats', activeChat.id, 'messages'), {
        text: `${currentUser?.displayName || 'An admin'} removed ${targetName} as a group admin.`,
        senderId: 'system',
        timestamp: serverTimestamp(),
        isSystem: true
      });
      setMembers(prev =>
        prev.map(m => (m.id === targetUserId ? { ...m, role: 'member' } : m))
      );
      setActiveMemberActionMenu(null);
    } catch (err) {
      console.error(err);
      notify('Failed to demote admin', 'error');
    }
  };

  // Handle Removing Member from Group
  const handleRemoveMember = async (targetUserId: string, targetName: string) => {
    if (!isCurrentUserAdmin) {
      notify('Only group admins can remove members', 'error');
      return;
    }
    if (targetUserId === creatorId) {
      notify('The group owner cannot be removed', 'error');
      return;
    }
    try {
      await updateDoc(doc(db, 'p2p_chats', activeChat.id), {
        participants: arrayRemove(targetUserId),
        admins: arrayRemove(targetUserId)
      });
      notify(`${targetName} was removed from the group`, 'info');
      await addDoc(collection(db, 'p2p_chats', activeChat.id, 'messages'), {
        text: `${currentUser?.displayName || 'An admin'} removed ${targetName} from the group.`,
        senderId: 'system',
        timestamp: serverTimestamp(),
        isSystem: true
      });
      setMembers(prev => prev.filter(m => m.id !== targetUserId));
      setActiveMemberActionMenu(null);
    } catch (err) {
      console.error(err);
      notify('Failed to remove member', 'error');
    }
  };

  // Handle Adding Selected Members
  const handleAddMembersSubmit = async () => {
    if (selectedNewMembers.length === 0) return;
    setIsAddingMembers(true);
    try {
      const addedNames = availableContacts
        .filter(c => selectedNewMembers.includes(c.id))
        .map(c => c.displayName)
        .join(', ');

      await updateDoc(doc(db, 'p2p_chats', activeChat.id), {
        participants: arrayUnion(...selectedNewMembers)
      });

      await addDoc(collection(db, 'p2p_chats', activeChat.id, 'messages'), {
        text: `${currentUser?.displayName || 'Someone'} added ${addedNames} to the group.`,
        senderId: 'system',
        timestamp: serverTimestamp(),
        isSystem: true
      });

      notify(`Added ${selectedNewMembers.length} member(s)`, 'success');
      await fetchMembers();
      goToView('members');
    } catch (err) {
      console.error(err);
      notify('Failed to add members', 'error');
    } finally {
      setIsAddingMembers(false);
    }
  };

  // Handle Group Photo Selection
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setGroupImageFile(file);
      setGroupImagePreview(URL.createObjectURL(file));
    }
  };

  // Handle Saving Group Info (Name, Photo, Description)
  const handleSaveGroupInfo = async () => {
    if (!isCurrentUserAdmin) {
      notify('Only group admins can edit group details', 'error');
      return;
    }
    const trimmed = groupNameInput.trim();
    if (!trimmed) {
      notify('Group name cannot be empty', 'error');
      return;
    }

    setIsSavingGroupInfo(true);
    try {
      let finalPhoto = groupImagePreview;
      if (groupImageFile) {
        try {
          finalPhoto = await uploadToImgbb(groupImageFile);
        } catch {
          // fallback
        }
      }

      const updates: any = {
        name: trimmed,
        groupName: trimmed,
        description: groupDescInput.trim(),
        updatedAt: serverTimestamp()
      };
      if (finalPhoto) {
        updates.photoURL = finalPhoto;
      }

      await updateDoc(doc(db, 'p2p_chats', activeChat.id), {
        ...updates
      });

      // System log
      await addDoc(collection(db, 'p2p_chats', activeChat.id, 'messages'), {
        text: `${currentUser?.displayName || 'An admin'} updated the group details.`,
        senderId: 'system',
        timestamp: serverTimestamp(),
        isSystem: true
      });

      notify('Group info updated successfully!', 'success');
      goToView('main');
    } catch (err) {
      console.error(err);
      notify('Failed to save group details', 'error');
    } finally {
      setIsSavingGroupInfo(false);
    }
  };

  // Handle Saving Admin Permissions / Controls
  const handleSaveAdminSettings = async () => {
    if (!isCurrentUserAdmin) {
      notify('Only group admins can change settings', 'error');
      return;
    }

    setIsSavingSettings(true);
    try {
      await updateDoc(doc(db, 'p2p_chats', activeChat.id), {
        settings: {
          onlyAdminsCanEditInfo: onlyAdminsCanEdit,
          onlyAdminsCanSend: onlyAdminsCanSend,
          requireApproval: requireApproval
        }
      });
      notify('Admin controls updated', 'success');
      goToView('main');
    } catch (err) {
      console.error(err);
      notify('Failed to save settings', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Handle Unpinning Message
  const handleUnpin = async (msgId: string) => {
    try {
      const currentPins = activeChat?.pinnedMessages || [];
      const updated = currentPins.filter((p: any) => p.id !== msgId);
      await updateDoc(doc(db, 'p2p_chats', activeChat.id), {
        pinnedMessages: updated,
        pinnedMessage: updated[0] || null
      });
      notify('Message unpinned', 'info');
    } catch (err) {
      console.error(err);
      notify('Failed to unpin message', 'error');
    }
  };

  // Handle Disappearing Messages Timer
  const handleSetTimer = async (duration: number | null) => {
    try {
      if (duration) {
        await updateDoc(doc(db, 'p2p_chats', activeChat.id), {
          autoDeleteTimer: { duration, enabledAt: serverTimestamp() }
        });
        notify('Disappearing messages turned on', 'success');
      } else {
        await updateDoc(doc(db, 'p2p_chats', activeChat.id), {
          autoDeleteTimer: null
        });
        notify('Disappearing messages turned off', 'info');
      }
      setShowTimerSelector(false);
    } catch (err) {
      console.error(err);
      notify('Failed to update disappearing messages', 'error');
    }
  };

  // Handle Leave Group
  const handleLeaveGroup = async () => {
    if (!activeChat?.id || !currentUser) return;
    try {
      // If user is owner and only member, delete doc
      if (isCurrentUserOwner && (activeChat.participants?.length || 1) <= 1) {
        await deleteDoc(doc(db, 'p2p_chats', activeChat.id));
        notify('Group deleted', 'info');
        onClose();
        if (onChatDeletedOrLeft) onChatDeletedOrLeft();
        return;
      }

      await updateDoc(doc(db, 'p2p_chats', activeChat.id), {
        participants: arrayRemove(currentUser.uid),
        admins: arrayRemove(currentUser.uid)
      });

      await addDoc(collection(db, 'p2p_chats', activeChat.id, 'messages'), {
        text: `${currentUser.displayName || 'A member'} left the group.`,
        senderId: 'system',
        timestamp: serverTimestamp(),
        isSystem: true
      });

      notify('You left the group', 'info');
      onClose();
      if (onChatDeletedOrLeft) onChatDeletedOrLeft();
    } catch (err) {
      console.error(err);
      notify('Failed to leave group', 'error');
    }
  };

  // Handle Delete Group (Owner / Admin)
  const handleDeleteGroup = async () => {
    if (!isCurrentUserAdmin) {
      notify('Only group admins can delete this group', 'error');
      return;
    }
    try {
      await deleteDoc(doc(db, 'p2p_chats', activeChat.id));
      notify('Group deleted successfully', 'success');
      onClose();
      if (onChatDeletedOrLeft) onChatDeletedOrLeft();
    } catch (err) {
      console.error(err);
      notify('Failed to delete group', 'error');
    }
  };

  // Extract shared media, files, and links from message history
  const sharedMediaItems = useMemo(() => {
    return messages.filter(
      m => m.imageUrl || m.mediaUrl || m.photoURL || (m.type === 'image' && m.url)
    );
  }, [messages]);

  const sharedFilesItems = useMemo(() => {
    return messages.filter(
      m => m.fileUrl || m.documentUrl || m.type === 'file' || m.fileName
    );
  }, [messages]);

  const sharedLinksItems = useMemo(() => {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const links: { id: string; url: string; text?: string; date?: any }[] = [];
    messages.forEach(m => {
      if (m.text) {
        const matches = m.text.match(urlRegex);
        if (matches) {
          matches.forEach((u: string) => {
            links.push({
              id: `${m.id}_${u}`,
              url: u,
              text: m.text,
              date: m.timestamp
            });
          });
        }
      }
    });
    return links;
  }, [messages]);

  // Extract pinned messages
  const pinnedMessagesList = useMemo(() => {
    if (Array.isArray(activeChat?.pinnedMessages) && activeChat.pinnedMessages.length > 0) {
      return activeChat.pinnedMessages;
    }
    if (activeChat?.pinnedMessage) {
      return [activeChat.pinnedMessage];
    }
    return [];
  }, [activeChat?.pinnedMessages, activeChat?.pinnedMessage]);

  // Filtered members for member view
  const filteredMembers = members.filter(m => {
    const matchesSearch =
      m.displayName.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      (m.username && m.username.toLowerCase().includes(memberSearchQuery.toLowerCase()));
    if (memberTab === 'admins') {
      return matchesSearch && (m.role === 'owner' || m.role === 'admin');
    }
    return matchesSearch;
  });

  // Filtered available contacts for add member view
  const filteredContacts = availableContacts.filter(c => {
    return (
      c.displayName.toLowerCase().includes(addMemberSearch.toLowerCase()) ||
      (c.username && c.username.toLowerCase().includes(addMemberSearch.toLowerCase()))
    );
  });

  if (!isOpen || !activeChat) return null;

  const currentGroupName = activeChat.name || activeChat.groupName || 'Group Chat';
  const currentGroupAvatar = activeChat.photoURL || '';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Background click to close if on desktop */}
      <div className="hidden sm:block absolute inset-0 -z-10" onClick={onClose} />

      {/* Main Dialog / Card Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2 }}
        className="w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-md bg-white dark:bg-[#121214] text-zinc-900 dark:text-white sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-white/10 flex flex-col overflow-hidden font-inter"
      >
        {/* Top App Bar Header */}
        <div className="px-4 py-3.5 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between shrink-0 bg-white/80 dark:bg-[#121214]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-2">
            {currentView !== 'main' ? (
              <button
                type="button"
                onClick={() => goToView('main')}
                className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="Back"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
              </button>
            ) : null}

            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white leading-tight">
              {currentView === 'main' && 'Group Info'}
              {currentView === 'members' && `Members (${members.length})`}
              {currentView === 'add_members' && 'Add Members'}
              {currentView === 'pinned_messages' && 'Pinned Messages'}
              {currentView === 'shared_media' && 'Media, Files & Links'}
              {currentView === 'admin_controls' && 'Admin Controls'}
              {currentView === 'edit_info' && 'Edit Group Info'}
              {currentView === 'leave_confirm' && 'Leave Group'}
              {currentView === 'delete_confirm' && 'Delete Group'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {currentView === 'members' && isCurrentUserAdmin && (
              <button
                type="button"
                onClick={handleOpenAddMembers}
                className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:scale-105 active:scale-95 transition cursor-pointer"
                title="Add member"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-all cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 space-y-5 custom-scrollbar">
          {/* ========================================================================= */}
          {/* VIEW: MAIN (Group Profile Details) */}
          {/* ========================================================================= */}
          {currentView === 'main' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Group Hero (Avatar + Title + Subtitle) */}
              <div className="flex flex-col items-center text-center pt-2 pb-1">
                <div className="relative group">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-500 to-purple-600 p-0.5 shadow-lg border-2 border-white dark:border-zinc-800">
                    {currentGroupAvatar ? (
                      <img
                        src={currentGroupAvatar}
                        alt={currentGroupName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-3xl">
                        {currentGroupName[0]?.toUpperCase() || 'G'}
                      </div>
                    )}
                  </div>

                  {/* Camera overlay button for admins */}
                  {isCurrentUserAdmin && (
                    <button
                      type="button"
                      onClick={() => goToView('edit_info')}
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#5B51D8] text-white shadow-md flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-2 border-white dark:border-zinc-900 cursor-pointer"
                      title="Change group photo & name"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 mt-3.5 max-w-full">
                  <h3 className="font-extrabold text-xl sm:text-2xl text-zinc-900 dark:text-white truncate">
                    {currentGroupName}
                  </h3>
                  {isCurrentUserAdmin && (
                    <button
                      type="button"
                      onClick={() => goToView('edit_info')}
                      className="p-1 rounded-full text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-white/10 transition"
                      title="Edit group name"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                  Group · {activeChat.participants?.length || members.length || 0} members
                </p>

                {activeChat.description && (
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 mt-2 max-w-xs line-clamp-2 px-2 italic">
                    "{activeChat.description}"
                  </p>
                )}
              </div>

              {/* Quick Action Capsules (Messenger Style) */}
              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {/* Search */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 transition active:scale-95 cursor-pointer text-zinc-700 dark:text-zinc-200"
                >
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-white/10 flex items-center justify-center shadow-xs">
                    <Search className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-semibold">Search</span>
                </button>

                {/* Mute */}
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 transition active:scale-95 cursor-pointer text-zinc-700 dark:text-zinc-200"
                >
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-white/10 flex items-center justify-center shadow-xs">
                    {isMuted ? <BellOff className="w-4 h-4 text-amber-500" /> : <Bell className="w-4 h-4" />}
                  </div>
                  <span className="text-[11px] font-semibold">{isMuted ? 'Muted' : 'Mute'}</span>
                </button>

                {/* Add Member */}
                <button
                  type="button"
                  onClick={handleOpenAddMembers}
                  className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 transition active:scale-95 cursor-pointer text-zinc-700 dark:text-zinc-200"
                >
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-white/10 flex items-center justify-center shadow-xs">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-semibold">Add</span>
                </button>

                {/* Group Invite Link */}
                <button
                  type="button"
                  onClick={() => {
                    const link = `${window.location.origin}/messages?joinGroup=${activeChat.id}`;
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(link);
                      notify("Group invite link copied to clipboard! Share it with anyone.", "success");
                    } else {
                      notify(link, "info");
                    }
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition active:scale-95 cursor-pointer text-emerald-600 dark:text-emerald-400"
                  title="Copy shareable group link"
                >
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-white/10 flex items-center justify-center shadow-xs">
                    <LinkIcon className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className="text-[11px] font-semibold">Link</span>
                </button>

                {/* Leave */}
                <button
                  type="button"
                  onClick={() => goToView('leave_confirm')}
                  className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition active:scale-95 cursor-pointer text-rose-600 dark:text-rose-400"
                >
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-white/10 flex items-center justify-center shadow-xs">
                    <LogOut className="w-4 h-4 text-rose-500" />
                  </div>
                  <span className="text-[11px] font-semibold">Leave</span>
                </button>
              </div>

              {/* Grouped Section: Chat Customization */}
              <div className="bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-zinc-200/60 dark:divide-white/5">
                <div className="px-4 py-2 bg-zinc-100/60 dark:bg-white/[0.02]">
                  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Chat Customization</p>
                </div>

                {/* Theme */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenThemeModal) onOpenThemeModal();
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-white/5 transition text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                      <Palette className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">Theme</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{activeThemeName}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>

                {/* Invite link */}
                <button
                  type="button"
                  onClick={() => {
                    const link = `${window.location.origin}/messages?joinGroup=${activeChat.id}`;
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(link);
                      notify("Group invite link copied to clipboard! Anyone with this link can join.", "success");
                    } else {
                      notify(link, "info");
                    }
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-white/5 transition text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <LinkIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">Invite via link</p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Tap to copy shareable group link</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-zinc-400" />
                </button>

                {/* Change name & photo (Admin only) */}
                {isCurrentUserAdmin ? (
                  <button
                    type="button"
                    onClick={() => goToView('edit_info')}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-white/5 transition text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
                        <Edit3 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">Change name and photo</p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Admin privilege</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>
                ) : (
                  <div className="w-full px-4 py-3 flex items-center justify-between opacity-60 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-white/10 text-zinc-400 flex items-center justify-center">
                        <Edit3 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">Change name and photo</p>
                        <p className="text-[11px] text-zinc-400">Only admins can edit</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Group Invite Link */}
                <button
                  type="button"
                  onClick={async () => {
                    const link = `${window.location.origin}/messages?joinGroup=${activeChat.id}`;
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: `Join ${currentGroupName} on Deep Shop`,
                          text: `Join our group chat: ${currentGroupName}`,
                          url: link
                        });
                        return;
                      } catch {}
                    }
                    if (navigator.clipboard) {
                      await navigator.clipboard.writeText(link);
                      notify('Group invite link copied to clipboard!', 'success');
                    } else {
                      window.prompt('Copy group invite link:', link);
                    }
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-white/5 transition text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <LinkIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">Group invite link</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Share link to let others join</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    <span>Copy</span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </div>
                </button>

                {/* Pinned Messages */}
                <button
                  type="button"
                  onClick={() => goToView('pinned_messages')}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-white/5 transition text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <Pin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">Pinned messages</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {pinnedMessagesList.length === 0
                          ? 'No pinned messages'
                          : `${pinnedMessagesList.length} pinned`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pinnedMessagesList.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                        {pinnedMessagesList.length}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </div>
                </button>
              </div>

              {/* Grouped Section: Chat Members */}
              <div className="bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-zinc-200/60 dark:divide-white/5">
                <div className="px-4 py-2 bg-zinc-100/60 dark:bg-white/[0.02] flex items-center justify-between">
                  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Chat Members</p>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    {members.length}
                  </span>
                </div>

                {/* See Group Members */}
                <button
                  type="button"
                  onClick={() => goToView('members')}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-white/5 transition text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">See group members</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        {members.slice(0, 3).map(m => m.displayName.replace(' (You)', '')).join(', ')}
                        {members.length > 3 ? ` and ${members.length - 3} others` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Tiny avatar overlap preview */}
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {members.slice(0, 3).map((m, idx) => (
                        <div
                          key={m.id || idx}
                          className="w-6 h-6 rounded-full overflow-hidden border border-white dark:border-zinc-800 bg-zinc-200 dark:bg-zinc-700"
                        >
                          {m.photoURL ? (
                            <img src={m.photoURL} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-zinc-600 dark:text-zinc-300">
                              {m.displayName[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </div>
                </button>

                {/* Add People */}
                <button
                  type="button"
                  onClick={handleOpenAddMembers}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-white/5 transition text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">Add people</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Invite new members to join</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>
              </div>

              {/* Grouped Section: Shared Content */}
              <div className="bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-zinc-200/60 dark:divide-white/5">
                <div className="px-4 py-2 bg-zinc-100/60 dark:bg-white/[0.02]">
                  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Shared Content</p>
                </div>

                <button
                  type="button"
                  onClick={() => goToView('shared_media')}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-white/5 transition text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-500 flex items-center justify-center">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">Media, files and links</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {sharedMediaItems.length} media · {sharedFilesItems.length} files · {sharedLinksItems.length} links
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>
              </div>

              {/* Grouped Section: Privacy & Settings */}
              <div className="bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-zinc-200/60 dark:divide-white/5">
                <div className="px-4 py-2 bg-zinc-100/60 dark:bg-white/[0.02]">
                  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Privacy & Permissions</p>
                </div>

                {/* Admin controls */}
                <button
                  type="button"
                  onClick={() => {
                    if (isCurrentUserAdmin) {
                      goToView('admin_controls');
                    } else {
                      notify('Admin controls are restricted to group admins', 'info');
                    }
                  }}
                  className={cn(
                    "w-full px-4 py-3 flex items-center justify-between transition text-left",
                    isCurrentUserAdmin ? "hover:bg-zinc-100 dark:hover:bg-white/5 cursor-pointer" : "opacity-80"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">Admin controls</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {isCurrentUserAdmin ? 'Edit member permissions & settings' : 'View admin permission rules'}
                      </p>
                    </div>
                  </div>
                  {isCurrentUserAdmin && <ChevronRight className="w-4 h-4 text-zinc-400" />}
                </button>

                {/* Disappearing Messages */}
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">Disappearing messages</p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {activeChat?.autoDeleteTimer?.duration ? 'Active' : 'Off'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowTimerSelector(!showTimerSelector)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-200 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-white/20 transition"
                    >
                      {activeChat?.autoDeleteTimer?.duration === 86400000
                        ? '24 hours'
                        : activeChat?.autoDeleteTimer?.duration === 604800000
                        ? '7 days'
                        : activeChat?.autoDeleteTimer?.duration === 7776000000
                        ? '90 days'
                        : 'Off'}
                    </button>
                  </div>

                  {showTimerSelector && (
                    <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-white/10 grid grid-cols-4 gap-1.5">
                      {[
                        { label: 'Off', val: null },
                        { label: '24h', val: 86400000 },
                        { label: '7d', val: 604800000 },
                        { label: '90d', val: 7776000000 }
                      ].map(opt => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => handleSetTimer(opt.val)}
                          className={cn(
                            "py-1.5 text-xs font-bold rounded-lg border transition",
                            activeChat?.autoDeleteTimer?.duration === opt.val
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Grouped Section: Actions / Danger Zone */}
              <div className="bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-zinc-200/60 dark:divide-white/5">
                {/* Leave Group */}
                <button
                  type="button"
                  onClick={() => goToView('leave_confirm')}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-rose-50 dark:hover:bg-rose-500/10 transition text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Leave group</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">You won't receive future messages</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition" />
                </button>

                {/* Delete Group (Owner / Admin) */}
                {isCurrentUserAdmin && (
                  <button
                    type="button"
                    onClick={() => goToView('delete_confirm')}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-rose-50 dark:hover:bg-rose-500/10 transition text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                        <Trash2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Delete group</p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Permanently delete group and messages</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: MEMBERS LIST */}
          {/* ========================================================================= */}
          {currentView === 'members' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Search Members */}
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={memberSearchQuery}
                  onChange={e => setMemberSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Tabs: All / Admins */}
              <div className="flex gap-2 p-1 rounded-xl bg-zinc-100 dark:bg-white/5">
                <button
                  type="button"
                  onClick={() => setMemberTab('all')}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-bold rounded-lg transition",
                    memberTab === 'all'
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  All ({members.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMemberTab('admins')}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-bold rounded-lg transition",
                    memberTab === 'admins'
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  Admins ({members.filter(m => m.role === 'owner' || m.role === 'admin').length})
                </button>
              </div>

              {/* Members List */}
              {isLoadingMembers ? (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <p className="text-xs">Loading members...</p>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="py-10 text-center text-zinc-400 text-sm">
                  No members found matching your search.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-white/5">
                  {filteredMembers.map((member, mIdx) => {
                    const isSelf = member.id === currentUser?.uid;
                    const isTargetOwner = member.id === creatorId;
                    const isTargetAdmin = member.role === 'admin' || isTargetOwner;

                    return (
                      <div
                        key={`grp-mem-${member.id || mIdx}-${mIdx}`}
                        className="py-3 flex items-center justify-between gap-3 relative"
                      >
                        {/* Avatar + Info */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 bg-zinc-200 dark:bg-zinc-700">
                            {member.photoURL ? (
                              <img src={member.photoURL} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-sm text-zinc-700 dark:text-zinc-300">
                                {member.displayName[0]?.toUpperCase()}
                              </div>
                            )}
                            {member.isOnline && (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-semibold text-sm text-zinc-900 dark:text-white truncate">
                                {member.displayName}
                              </p>

                              {/* Badges */}
                              {isTargetOwner && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                                  <Crown className="w-3 h-3 text-indigo-500 fill-indigo-500" />
                                  <span>Owner</span>
                                </span>
                              )}

                              {!isTargetOwner && isTargetAdmin && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
                                  <Shield className="w-3 h-3" />
                                  <span>Admin</span>
                                </span>
                              )}
                            </div>

                            {member.username && (
                              <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
                                @{member.username}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Menu (3 dots) */}
                        <div className="shrink-0 relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMemberActionMenu(
                                activeMemberActionMenu === member.id ? null : member.id
                              )
                            }
                            className="w-8 h-8 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Dropdown Menu */}
                          {activeMemberActionMenu === member.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setActiveMemberActionMenu(null)}
                              />
                              <div className="absolute right-0 top-9 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 shadow-xl rounded-2xl p-1.5 z-50 text-left space-y-1 animate-fadeIn">
                                {/* Message privately */}
                                {!isSelf && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMemberActionMenu(null);
                                      onClose();
                                      if (onSelectUserForDirectChat) {
                                        onSelectUserForDirectChat(member);
                                      }
                                    }}
                                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5 flex items-center gap-2.5 text-zinc-700 dark:text-zinc-200"
                                  >
                                    <MessageCircle className="w-4 h-4 text-indigo-500" />
                                    <span>Message privately</span>
                                  </button>
                                )}

                                {/* Admin Promotion / Demotion (If current user is admin) */}
                                {isCurrentUserAdmin && !isSelf && (
                                  <>
                                    {!isTargetAdmin ? (
                                      <button
                                        type="button"
                                        onClick={() => handlePromoteToAdmin(member.id, member.displayName)}
                                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5 flex items-center gap-2.5 text-zinc-700 dark:text-zinc-200"
                                      >
                                        <ShieldCheck className="w-4 h-4 text-blue-500" />
                                        <span>Make group admin</span>
                                      </button>
                                    ) : !isTargetOwner ? (
                                      <button
                                        type="button"
                                        onClick={() => handleDemoteAdmin(member.id, member.displayName)}
                                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5 flex items-center gap-2.5 text-amber-600 dark:text-amber-400"
                                      >
                                        <Shield className="w-4 h-4 text-amber-500" />
                                        <span>Dismiss as admin</span>
                                      </button>
                                    ) : null}

                                    {/* Remove from group */}
                                    {!isTargetOwner && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveMember(member.id, member.displayName)}
                                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2.5 text-rose-600 dark:text-rose-400"
                                      >
                                        <UserMinus className="w-4 h-4 text-rose-500" />
                                        <span>Remove from group</span>
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: ADD MEMBERS */}
          {/* ========================================================================= */}
          {currentView === 'add_members' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={addMemberSearch}
                  onChange={e => setAddMemberSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {isLoadingContacts ? (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <p className="text-xs">Loading contacts...</p>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="py-10 text-center text-zinc-400 text-sm">
                  No new contacts found to add.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-white/5 max-h-[50vh] overflow-y-auto custom-scrollbar">
                  {filteredContacts.map((contact, cIdx) => {
                    const isSelected = selectedNewMembers.includes(contact.id);

                    return (
                      <div
                        key={`grp-contact-${contact.id || cIdx}-${cIdx}`}
                        onClick={() => {
                          setSelectedNewMembers(prev =>
                            prev.includes(contact.id)
                              ? prev.filter(id => id !== contact.id)
                              : [...prev, contact.id]
                          );
                        }}
                        className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/[0.02] px-2 rounded-xl transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 shrink-0">
                            {contact.photoURL ? (
                              <img src={contact.photoURL} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-sm text-zinc-700 dark:text-zinc-300">
                                {contact.displayName[0]?.toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-zinc-900 dark:text-white truncate">
                              {contact.displayName}
                            </p>
                            {contact.username && (
                              <p className="text-xs text-zinc-400 truncate">@{contact.username}</p>
                            )}
                          </div>
                        </div>

                        {/* Checkbox circle */}
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center border transition-all shrink-0",
                            isSelected
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-zinc-300 dark:border-zinc-600 bg-transparent"
                          )}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Submit button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddMembersSubmit}
                  disabled={selectedNewMembers.length === 0 || isAddingMembers}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  {isAddingMembers ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Adding members...</span>
                    </>
                  ) : (
                    <span>Add {selectedNewMembers.length > 0 ? `(${selectedNewMembers.length})` : ''} Members</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: PINNED MESSAGES */}
          {/* ========================================================================= */}
          {currentView === 'pinned_messages' && (
            <div className="space-y-4 animate-fadeIn">
              {pinnedMessagesList.length === 0 ? (
                /* Empty state matching iOS Messenger / Screenshots */
                <div className="py-14 flex flex-col items-center justify-center text-center px-6">
                  <div className="w-20 h-20 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                    <Pin className="w-9 h-9 rotate-45" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No pinned messages</h3>
                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 max-w-xs leading-relaxed">
                    Pin important messages so everyone in the chat can easily find them.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pinnedMessagesList.map((pinItem: any, idx: number) => (
                    <div
                      key={pinItem.id || idx}
                      className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/5 flex items-start justify-between gap-3 group hover:border-amber-500/30 transition"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                          <Pin className="w-4 h-4 rotate-45" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                            {pinItem.senderName || 'Pinned Message'}
                          </p>
                          <p className="text-sm text-zinc-800 dark:text-zinc-200 mt-0.5 line-clamp-3">
                            {pinItem.text || 'Photo / Attachment'}
                          </p>
                          {pinItem.imageUrl && (
                            <img
                              src={pinItem.imageUrl}
                              alt=""
                              className="mt-2 w-24 h-24 object-cover rounded-xl border border-zinc-200 dark:border-zinc-700"
                            />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {onJumpToMessage && pinItem.id && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onJumpToMessage(pinItem.id);
                            }}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition"
                          >
                            Jump
                          </button>
                        )}

                        {isCurrentUserAdmin && (
                          <button
                            type="button"
                            onClick={() => handleUnpin(pinItem.id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                            title="Unpin message"
                          >
                            <PinOff className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: SHARED MEDIA, FILES & LINKS */}
          {/* ========================================================================= */}
          {currentView === 'shared_media' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Tab Selector */}
              <div className="flex gap-2 p-1 rounded-xl bg-zinc-100 dark:bg-white/5">
                <button
                  type="button"
                  onClick={() => setMediaTab('media')}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-bold rounded-lg transition",
                    mediaTab === 'media'
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  Media ({sharedMediaItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMediaTab('files')}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-bold rounded-lg transition",
                    mediaTab === 'files'
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  Files ({sharedFilesItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMediaTab('links')}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-bold rounded-lg transition",
                    mediaTab === 'links'
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  Links ({sharedLinksItems.length})
                </button>
              </div>

              {/* MEDIA GRID */}
              {mediaTab === 'media' && (
                <div>
                  {sharedMediaItems.length === 0 ? (
                    <div className="py-14 text-center text-zinc-400">
                      <ImageIcon className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                      <p className="text-sm font-semibold">No shared photos or videos</p>
                      <p className="text-xs text-zinc-500 mt-1">Photos sent in this chat will appear here.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {sharedMediaItems.map((m: any, idx: number) => {
                        const src = m.imageUrl || m.mediaUrl || m.photoURL || m.url;
                        return (
                          <div
                            key={m.id || idx}
                            onClick={() => setPreviewMediaUrl(src)}
                            className="aspect-square rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/5 cursor-pointer hover:opacity-90 transition relative group"
                          >
                            <img src={src} alt="" className="w-full h-full object-cover" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* FILES LIST */}
              {mediaTab === 'files' && (
                <div>
                  {sharedFilesItems.length === 0 ? (
                    <div className="py-14 text-center text-zinc-400">
                      <FileText className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                      <p className="text-sm font-semibold">No files shared</p>
                      <p className="text-xs text-zinc-500 mt-1">Documents sent in this chat will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sharedFilesItems.map((f: any, idx: number) => (
                        <a
                          key={f.id || idx}
                          href={f.fileUrl || f.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/5 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-white/10 transition"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                                {f.fileName || 'Attachment Document'}
                              </p>
                              <p className="text-xs text-zinc-400">
                                {f.fileSize ? `${Math.round(f.fileSize / 1024)} KB` : 'Document file'}
                              </p>
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-zinc-400 shrink-0" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* LINKS LIST */}
              {mediaTab === 'links' && (
                <div>
                  {sharedLinksItems.length === 0 ? (
                    <div className="py-14 text-center text-zinc-400">
                      <LinkIcon className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                      <p className="text-sm font-semibold">No links shared</p>
                      <p className="text-xs text-zinc-500 mt-1">Links shared in this chat will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sharedLinksItems.map((l: any, idx: number) => (
                        <a
                          key={l.id || idx}
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/5 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-white/10 transition"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
                              <LinkIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                                {l.url}
                              </p>
                              {l.text && (
                                <p className="text-xs text-zinc-400 truncate mt-0.5">{l.text}</p>
                              )}
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-zinc-400 shrink-0" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: EDIT GROUP INFO (Name, Photo, Description - Admin Only) */}
          {/* ========================================================================= */}
          {currentView === 'edit_info' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Group Photo Change */}
              <div className="flex flex-col items-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-24 h-24 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 cursor-pointer group shadow-md border-2 border-indigo-500/30"
                >
                  {groupImagePreview ? (
                    <img src={groupImagePreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400">
                      <Camera className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Camera className="w-6 h-6" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Change Photo
                </button>
              </div>

              {/* Group Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Group Name
                </label>
                <input
                  type="text"
                  value={groupNameInput}
                  onChange={e => setGroupNameInput(e.target.value)}
                  placeholder="Enter group name..."
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Group Description Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Description / Topic
                </label>
                <textarea
                  rows={3}
                  value={groupDescInput}
                  onChange={e => setGroupDescInput(e.target.value)}
                  placeholder="Describe what this group is about..."
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSaveGroupInfo}
                disabled={isSavingGroupInfo}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                {isSavingGroupInfo ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving changes...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: ADMIN CONTROLS */}
          {/* ========================================================================= */}
          {currentView === 'admin_controls' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-3.5 flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  As an admin, you can set permissions for members and customize what users can do inside this group.
                </p>
              </div>

              <div className="bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/5 rounded-2xl divide-y divide-zinc-200/60 dark:divide-white/5 overflow-hidden">
                {/* Toggle: Only admins can edit info */}
                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      Edit group info
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Only admins can change group name, icon, and description.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOnlyAdminsCanEdit(!onlyAdminsCanEdit)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0",
                      onlyAdminsCanEdit ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
                    )}
                  >
                    <span
                      className={cn(
                        "w-5 h-5 rounded-full bg-white shadow-md block transition-transform absolute top-0.5",
                        onlyAdminsCanEdit ? "right-0.5" : "left-0.5"
                      )}
                    />
                  </button>
                </div>

                {/* Toggle: Only admins can send messages */}
                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      Send messages
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Choose if only admins can send messages (Announcement mode).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOnlyAdminsCanSend(!onlyAdminsCanSend)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0",
                      onlyAdminsCanSend ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
                    )}
                  >
                    <span
                      className={cn(
                        "w-5 h-5 rounded-full bg-white shadow-md block transition-transform absolute top-0.5",
                        onlyAdminsCanSend ? "right-0.5" : "left-0.5"
                      )}
                    />
                  </button>
                </div>

                {/* Toggle: Require approval to join */}
                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      Approve new members
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Require an admin to approve anyone who wants to join.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRequireApproval(!requireApproval)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0",
                      requireApproval ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
                    )}
                  >
                    <span
                      className={cn(
                        "w-5 h-5 rounded-full bg-white shadow-md block transition-transform absolute top-0.5",
                        requireApproval ? "right-0.5" : "left-0.5"
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* Save Admin Settings */}
              <button
                type="button"
                onClick={handleSaveAdminSettings}
                disabled={isSavingSettings}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                {isSavingSettings ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving settings...</span>
                  </>
                ) : (
                  <span>Save Permissions</span>
                )}
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: LEAVE CONFIRMATION */}
          {/* ========================================================================= */}
          {currentView === 'leave_confirm' && (
            <div className="py-6 space-y-4 text-center animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Leave this group?</h3>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
                  You won't be able to send or receive messages in this group unless an admin adds you again.
                </p>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => goToView('main')}
                  className="flex-1 py-3 rounded-2xl bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-200 font-bold text-sm hover:bg-zinc-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLeaveGroup}
                  className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition shadow-md shadow-rose-600/20"
                >
                  Leave
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: DELETE GROUP CONFIRMATION */}
          {/* ========================================================================= */}
          {currentView === 'delete_confirm' && (
            <div className="py-6 space-y-4 text-center animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Delete this group?</h3>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
                  This will permanently delete the group, messages, and shared media for everyone. This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => goToView('main')}
                  className="flex-1 py-3 rounded-2xl bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-200 font-bold text-sm hover:bg-zinc-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteGroup}
                  className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition shadow-md shadow-rose-600/20"
                >
                  Delete Forever
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Lightbox / Fullscreen Media Preview Modal */}
      {previewMediaUrl && (
        <div
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewMediaUrl(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewMediaUrl(null)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewMediaUrl}
            alt="Preview"
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
