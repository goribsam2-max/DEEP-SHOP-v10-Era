import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import {
  collection,
  query,
  onSnapshot,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  orderBy,
  serverTimestamp,
  getDoc,
  arrayRemove,
  arrayUnion,
  addDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNotify } from '../../components/Notifications';
import {
  Users,
  Search,
  Trash2,
  Edit3,
  MessageSquare,
  Shield,
  Clock,
  X,
  Check,
  Filter,
  Plus,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  UserMinus,
  Crown,
  ArrowLeft,
  Volume2,
  Send,
  Eye,
  Lock,
  Link,
  Settings,
  Image as ImageIcon,
  Sparkles,
  UserCheck,
  RefreshCw,
  Radio,
  Share2,
  Info
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface GroupItem {
  id: string;
  type?: 'community' | 'p2p';
  name?: string;
  photoURL?: string;
  imageUrl?: string;
  createdBy?: string;
  creatorId?: string;
  creatorName?: string;
  creatorEmail?: string;
  admins?: string[];
  participants?: string[];
  members?: string[];
  subscribers?: string[];
  createdAt?: any;
  updatedAt?: any;
  lastMessage?: string;
  description?: string;
  customLink?: string;
  category?: string;
  isPrivate?: boolean;
  membersCount?: number;
  subscribersCount?: number;
}

interface GroupMessage {
  id: string;
  text?: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  imageUrl?: string;
  images?: string[];
  audioUrl?: string;
  timestamp?: any;
  isSystem?: boolean;
  isEdited?: boolean;
  isAdminBroadcast?: boolean;
}

interface GroupMemberInfo {
  id: string;
  displayName: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  role: 'owner' | 'admin' | 'member';
  joinedSource?: string;
  joinedAt?: any;
  status?: string;
}

export default function ManageGroups() {
  const notify = useNotify();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Main Page View State
  const [activeTab, setActiveTab] = useState<'groups' | 'word_filter'>('groups');
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Group Inspector Sub-Page State
  const [selectedGroup, setSelectedGroup] = useState<GroupItem | null>(null);
  const [inspectorSubTab, setInspectorSubTab] = useState<'messages' | 'members' | 'settings'>('messages');
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [groupMembersList, setGroupMembersList] = useState<GroupMemberInfo[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Message Search & Filter within Inspector
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [messageTypeFilter, setMessageTypeFilter] = useState<'all' | 'text' | 'media' | 'audio'>('all');

  // Member Search & Filter within Inspector
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState<'all' | 'owner' | 'admin' | 'member' | 'added_by_admin'>('all');

  // Stealth Edit Message Modal/State
  const [editingMessage, setEditingMessage] = useState<GroupMessage | null>(null);
  const [editedText, setEditedText] = useState('');

  // Super Admin Broadcast Composer
  const [adminBroadcastText, setAdminBroadcastText] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // Search & Add User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Edit Group Identity State
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [editGroupLink, setEditGroupLink] = useState('');
  const [editGroupAvatar, setEditGroupAvatar] = useState('');
  const [editGroupCategory, setEditGroupCategory] = useState('');
  const [editGroupIsPrivate, setEditGroupIsPrivate] = useState(false);
  const [isSavingGroupInfo, setIsSavingGroupInfo] = useState(false);

  // Word Filter State
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [newBannedWord, setNewBannedWord] = useState('');
  const [isSavingWordFilter, setIsSavingWordFilter] = useState(false);
  const [filterTestText, setFilterTestText] = useState('');

  // Check auth state for Site Super Admin access
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const uDoc = await getDoc(doc(db, 'users', u.uid));
          if (uDoc.exists()) {
            setCurrentUser({ uid: u.uid, email: u.email, ...uDoc.data() });
          } else {
            setCurrentUser({ uid: u.uid, email: u.email });
          }
        } catch {
          setCurrentUser({ uid: u.uid, email: u.email });
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const isSiteAdmin = Boolean(
    currentUser?.email === 'deepshop@gmail.com' ||
    currentUser?.email === 'goribsam2@gmail.com' ||
    currentUser?.email === 'admin@gmail.com' ||
    currentUser?.role === 'admin' ||
    currentUser?.isAdmin ||
    (currentUser as any)?.type === 'admin'
  );

  // Fetch all platform groups (both p2p_chats groups and community_channels)
  useEffect(() => {
    setLoading(true);
    
    // 1. p2p_chats listener
    const qP2P = query(collection(db, 'p2p_chats'), orderBy('updatedAt', 'desc'));
    const unsubP2P = onSnapshot(qP2P, (snapP2P) => {
      const p2pGroups: GroupItem[] = [];
      for (const d of snapP2P.docs) {
        const data = d.data();
        if (data.isGroup || data.type === 'group' || (data.participants && data.participants.length > 2)) {
          p2pGroups.push({
            id: d.id,
            type: 'p2p',
            ...data,
            name: data.name || data.groupName || 'P2P Group Chat',
            photoURL: data.photoURL || data.imageUrl || '',
            participants: data.participants || [],
            admins: data.admins || [data.createdBy || ''],
            createdBy: data.createdBy,
            membersCount: (data.participants || []).length
          } as any);
        }
      }

      // 2. community_channels listener
      const qComm = query(collection(db, 'community_channels'), orderBy('createdAt', 'desc'));
      const unsubComm = onSnapshot(qComm, (snapComm) => {
        const commGroups: GroupItem[] = [];
        for (const d of snapComm.docs) {
          const data = d.data();
          commGroups.push({
            id: d.id,
            type: 'community',
            ...data,
            name: data.name || 'Community Channel',
            photoURL: data.imageUrl || data.photoURL || '',
            createdBy: data.creatorId || data.createdBy,
            participants: data.participants || [],
            admins: data.admins || [data.creatorId || data.createdBy || ''],
            membersCount: data.membersCount || data.subscribersCount || (data.participants || []).length || 1
          } as any);
        }

        const combined = [...commGroups, ...p2pGroups];
        setGroups(combined);
        setLoading(false);
      });

      return () => unsubComm();
    });

    return () => unsubP2P();
  }, []);

  // Fetch Prohibited Word Filter List
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

  // Listen to live message feed of selected group (Stealth stream without joining)
  useEffect(() => {
    if (!selectedGroup) {
      setGroupMessages([]);
      return;
    }

    setLoadingMessages(true);
    const colName = selectedGroup.type === 'community' ? 'community_channels' : 'p2p_chats';
    const msgQ = query(
      collection(db, colName, selectedGroup.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsub = onSnapshot(msgQ, (snap) => {
      const msgs = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as GroupMessage));
      setGroupMessages(msgs);
      setLoadingMessages(false);
    }, (err) => {
      console.error("Error loading group messages:", err);
      setLoadingMessages(false);
    });

    return () => unsub();
  }, [selectedGroup?.id, selectedGroup?.type]);

  // Robust Fetch of ALL Group Members across all collections & subcollections
  useEffect(() => {
    if (!selectedGroup) {
      setGroupMembersList([]);
      return;
    }

    const loadGroupMembers = async () => {
      setLoadingMembers(true);
      const creatorId = selectedGroup.createdBy || selectedGroup.creatorId;
      const admins = selectedGroup.admins || [];
      
      const memberMap = new Map<string, { role: 'owner' | 'admin' | 'member'; joinedSource: string; rawData?: any }>();

      // 1. Add Creator
      if (creatorId) {
        memberMap.set(creatorId, { role: 'owner', joinedSource: 'Group Creator' });
      }

      // 2. Add Admins
      admins.forEach(admId => {
        if (admId) {
          memberMap.set(admId, {
            role: admId === creatorId ? 'owner' : 'admin',
            joinedSource: memberMap.get(admId)?.joinedSource || 'Group Admin'
          });
        }
      });

      // 3. Add from direct doc arrays
      (selectedGroup.participants || []).forEach(p => {
        if (p && !memberMap.has(p)) {
          memberMap.set(p, { role: 'member', joinedSource: 'Member' });
        }
      });
      (selectedGroup.members || []).forEach(m => {
        if (m && !memberMap.has(m)) {
          memberMap.set(m, { role: 'member', joinedSource: 'Member' });
        }
      });
      (selectedGroup.subscribers || []).forEach(s => {
        if (s && !memberMap.has(s)) {
          memberMap.set(s, { role: 'member', joinedSource: 'Joined as Subscriber' });
        }
      });

      // 4. Query all possible subcollections for community channels & groups
      if (selectedGroup.type === 'community') {
        try {
          // Subscriptions subcollection
          const subSnap = await getDocs(collection(db, 'community_channels', selectedGroup.id, 'subscriptions'));
          subSnap.docs.forEach(d => {
            const data = d.data();
            const uid = d.id || data.uid;
            if (uid) {
              const src = data.joinedSource === 'added_by_admin' 
                ? 'Added by Site Admin' 
                : data.joinedSource === 'link' 
                ? 'Joined via Link' 
                : data.joinedSource === 'search' 
                ? 'Joined via Search' 
                : 'Joined as Subscriber';
              
              const current = memberMap.get(uid);
              memberMap.set(uid, {
                role: current?.role || (data.role === 'admin' ? 'admin' : (uid === creatorId ? 'owner' : 'member')),
                joinedSource: current?.joinedSource || src,
                rawData: data
              });
            }
          });
        } catch (e) {
          console.warn("Subscriptions subcollection read:", e);
        }

        try {
          // Subscribers subcollection
          const subsSnap = await getDocs(collection(db, 'community_channels', selectedGroup.id, 'subscribers'));
          subsSnap.docs.forEach(d => {
            const data = d.data();
            const uid = d.id || data.uid;
            if (uid && !memberMap.has(uid)) {
              memberMap.set(uid, {
                role: uid === creatorId ? 'owner' : 'member',
                joinedSource: 'Joined as Subscriber',
                rawData: data
              });
            }
          });
        } catch (e) {
          console.warn("Subscribers subcollection read:", e);
        }

        try {
          // Live participants subcollection
          const liveSnap = await getDocs(collection(db, 'community_channels', selectedGroup.id, 'live_participants'));
          liveSnap.docs.forEach(d => {
            const data = d.data();
            const uid = d.id || data.uid;
            if (uid && !memberMap.has(uid)) {
              memberMap.set(uid, {
                role: uid === creatorId ? 'owner' : (admins.includes(uid) ? 'admin' : 'member'),
                joinedSource: 'Active Participant',
                rawData: data
              });
            }
          });
        } catch (e) {
          console.warn("Live participants subcollection read:", e);
        }
      }

      // 5. Fetch user profiles for all gathered UIDs in parallel
      const uidsArray = Array.from(memberMap.keys());
      const fetchedMembers: GroupMemberInfo[] = await Promise.all(
        uidsArray.map(async (uid) => {
          const entry = memberMap.get(uid)!;
          try {
            const uDoc = await getDoc(doc(db, 'users', uid));
            if (uDoc.exists()) {
              const uData = uDoc.data();
              return {
                id: uid,
                displayName: uData.displayName || uData.name || uData.shopName || entry.rawData?.displayName || 'User',
                email: uData.email || entry.rawData?.email || '',
                phone: uData.phone || uData.phoneNumber || '',
                photoURL: uData.photoURL || entry.rawData?.photoURL || '',
                role: entry.role,
                joinedSource: entry.joinedSource
              };
            }
          } catch (e) {
            console.warn(`User profile fetch error for ${uid}:`, e);
          }

          return {
            id: uid,
            displayName: entry.rawData?.displayName || (uid === creatorId ? (selectedGroup.creatorName || 'Group Creator') : `Member (${uid.slice(0, 6)})`),
            email: entry.rawData?.email || (uid === creatorId ? selectedGroup.creatorEmail : ''),
            photoURL: entry.rawData?.photoURL || '',
            role: entry.role,
            joinedSource: entry.joinedSource
          };
        })
      );

      // Sort: Owner first, then Admins, then by name
      fetchedMembers.sort((a, b) => {
        if (a.role === 'owner') return -1;
        if (b.role === 'owner') return 1;
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (b.role === 'admin' && a.role !== 'admin') return 1;
        return a.displayName.localeCompare(b.displayName);
      });

      setGroupMembersList(fetchedMembers);
      setLoadingMembers(false);
    };

    loadGroupMembers();
  }, [selectedGroup?.id, selectedGroup?.type, selectedGroup?.participants, selectedGroup?.admins, selectedGroup?.createdBy]);

  // Super Admin Stealth Message Deletion
  const handleDeleteMessage = async (msgId: string) => {
    if (!selectedGroup) return;
    const colName = selectedGroup.type === 'community' ? 'community_channels' : 'p2p_chats';
    try {
      await deleteDoc(doc(db, colName, selectedGroup.id, 'messages', msgId));
      notify("Message deleted stealthily by Super Admin", "success");
    } catch (e) {
      console.error(e);
      notify("Failed to delete message", "error");
    }
  };

  // Super Admin Stealth Message Edit
  const handleSaveEditedMessage = async () => {
    if (!selectedGroup || !editingMessage) return;
    if (!editedText.trim()) return;
    const colName = selectedGroup.type === 'community' ? 'community_channels' : 'p2p_chats';

    try {
      await updateDoc(doc(db, colName, selectedGroup.id, 'messages', editingMessage.id), {
        text: editedText.trim(),
        updatedAt: serverTimestamp()
      });
      notify("Message edited stealthily (zero trace left)", "success");
      setEditingMessage(null);
      setEditedText('');
    } catch (e) {
      console.error(e);
      notify("Failed to edit message", "error");
    }
  };

  // Super Admin Broadcast Announcement to Group
  const handleSendAdminBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !adminBroadcastText.trim()) return;
    setIsSendingBroadcast(true);

    const colName = selectedGroup.type === 'community' ? 'community_channels' : 'p2p_chats';
    try {
      await addDoc(collection(db, colName, selectedGroup.id, 'messages'), {
        text: adminBroadcastText.trim(),
        senderId: currentUser?.uid || 'super_admin',
        senderName: 'DEEP SHOP Official Super Admin',
        isAdminBroadcast: true,
        isSystem: true,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, colName, selectedGroup.id), {
        lastMessage: `[Official Notice] ${adminBroadcastText.trim().slice(0, 60)}...`,
        updatedAt: serverTimestamp()
      });

      notify("Super Admin Announcement broadcasted to group!", "success");
      setAdminBroadcastText('');
    } catch (e) {
      console.error(e);
      notify("Failed to broadcast announcement", "error");
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // Super Admin Kick Member Override (Can remove ANY member, even creator or group admin)
  const handleKickMember = async (targetUserId: string, targetName: string) => {
    if (!selectedGroup) return;
    if (!window.confirm(`Super Admin Override: Remove "${targetName}" from group "${selectedGroup.name || 'Group'}"?`)) return;

    const colName = selectedGroup.type === 'community' ? 'community_channels' : 'p2p_chats';
    try {
      await updateDoc(doc(db, colName, selectedGroup.id), {
        participants: arrayRemove(targetUserId),
        admins: arrayRemove(targetUserId),
        members: arrayRemove(targetUserId),
        subscribers: arrayRemove(targetUserId)
      });

      if (selectedGroup.type === 'community') {
        await deleteDoc(doc(db, 'community_channels', selectedGroup.id, 'subscriptions', targetUserId)).catch(() => {});
        await deleteDoc(doc(db, 'community_channels', selectedGroup.id, 'subscribers', targetUserId)).catch(() => {});
        await deleteDoc(doc(db, 'community_channels', selectedGroup.id, 'live_participants', targetUserId)).catch(() => {});
      }

      notify(`Removed ${targetName} from the group (Super Admin Override)`, "success");
      setGroupMembersList(prev => prev.filter(m => m.id !== targetUserId));
    } catch (e) {
      console.error(e);
      notify("Failed to remove member", "error");
    }
  };

  // Super Admin Demote Admin
  const handleDemoteAdmin = async (targetUserId: string, targetName: string) => {
    if (!selectedGroup) return;
    const colName = selectedGroup.type === 'community' ? 'community_channels' : 'p2p_chats';
    try {
      await updateDoc(doc(db, colName, selectedGroup.id), {
        admins: arrayRemove(targetUserId)
      });
      notify(`Demoted ${targetName} to regular member`, "info");
      setGroupMembersList(prev => prev.map(m => m.id === targetUserId ? { ...m, role: 'member' } : m));
    } catch (e) {
      console.error(e);
      notify("Failed to demote admin", "error");
    }
  };

  // Super Admin Promote Admin
  const handlePromoteAdmin = async (targetUserId: string, targetName: string) => {
    if (!selectedGroup) return;
    const colName = selectedGroup.type === 'community' ? 'community_channels' : 'p2p_chats';
    try {
      await updateDoc(doc(db, colName, selectedGroup.id), {
        admins: arrayUnion(targetUserId)
      });
      notify(`Promoted ${targetName} to group admin`, "success");
      setGroupMembersList(prev => prev.map(m => m.id === targetUserId ? { ...m, role: 'admin' } : m));
    } catch (e) {
      console.error(e);
      notify("Failed to promote admin", "error");
    }
  };

  // Super Admin Search Platform Users
  const handleSearchUsers = async (queryStr: string) => {
    setUserSearchQuery(queryStr);
    if (!queryStr.trim() || queryStr.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearchingUsers(true);
    try {
      const snap = await getDocs(query(collection(db, 'users')));
      const q = queryStr.toLowerCase().trim();
      const matched = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((u: any) => {
          const name = (u.displayName || u.shopName || u.name || '').toLowerCase();
          const email = (u.email || '').toLowerCase();
          const phone = (u.phone || u.phoneNumber || '').toLowerCase();
          return name.includes(q) || email.includes(q) || phone.includes(q) || u.id.includes(q);
        });
      setSearchResults(matched.slice(0, 15));
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  // Super Admin Add User to Group (Ensures group appears in user's Messages/Communities & enables full messaging)
  const handleAddUserToGroup = async (userObj: any) => {
    if (!selectedGroup) return;
    const colName = selectedGroup.type === 'community' ? 'community_channels' : 'p2p_chats';
    try {
      const uId = userObj.id || userObj.uid;
      const uName = userObj.displayName || userObj.name || userObj.shopName || 'Member';
      const uEmail = userObj.email || '';
      const uPhoto = userObj.photoURL || '';

      // 1. Update Group Main Document
      await updateDoc(doc(db, colName, selectedGroup.id), {
        participants: arrayUnion(uId),
        members: arrayUnion(uId),
        subscribers: arrayUnion(uId),
        updatedAt: serverTimestamp()
      });

      // 2. If community channel, populate subscriptions & live_participants subcollection
      if (selectedGroup.type === 'community') {
        const subRef = doc(db, 'community_channels', selectedGroup.id, 'subscriptions', uId);
        await setDoc(subRef, {
          id: uId,
          uid: uId,
          displayName: uName,
          email: uEmail,
          photoURL: uPhoto,
          role: 'member',
          joinedAt: serverTimestamp(),
          joinedSource: 'added_by_admin'
        }, { merge: true });

        const liveRef = doc(db, 'community_channels', selectedGroup.id, 'live_participants', uId);
        await setDoc(liveRef, {
          id: uId,
          uid: uId,
          displayName: uName,
          email: uEmail,
          photoURL: uPhoto,
          role: 'member',
          status: 'active'
        }, { merge: true });
      }

      notify(`Added ${uName} to "${selectedGroup.name}"! Group will appear in their Messages immediately.`, "success");
      
      setGroupMembersList(prev => [
        ...prev.filter(m => m.id !== uId),
        {
          id: uId,
          displayName: uName,
          email: uEmail,
          photoURL: uPhoto,
          role: 'member',
          joinedSource: 'Added by Site Admin'
        }
      ]);
    } catch (e) {
      console.error(e);
      notify("Failed to add user to group", "error");
    }
  };

  // Open Group Settings / Edit Tab
  const handleOpenGroupSettings = (grp: GroupItem) => {
    setSelectedGroup(grp);
    setEditGroupName(grp.name || '');
    setEditGroupDesc(grp.description || '');
    setEditGroupLink(grp.customLink || '');
    setEditGroupAvatar(grp.photoURL || grp.imageUrl || '');
    setEditGroupCategory(grp.category || 'General');
    setEditGroupIsPrivate(Boolean(grp.isPrivate));
    setInspectorSubTab('settings');
  };

  // Save Group Identity & Settings
  const handleSaveGroupSettings = async () => {
    if (!selectedGroup || !editGroupName.trim()) return;
    setIsSavingGroupInfo(true);
    const colName = selectedGroup.type === 'community' ? 'community_channels' : 'p2p_chats';

    try {
      const updates: any = {
        name: editGroupName.trim(),
        description: editGroupDesc.trim(),
        photoURL: editGroupAvatar.trim(),
        imageUrl: editGroupAvatar.trim(),
        category: editGroupCategory.trim(),
        isPrivate: editGroupIsPrivate,
        updatedAt: serverTimestamp()
      };
      if (editGroupLink.trim()) {
        updates.customLink = editGroupLink.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      }

      await updateDoc(doc(db, colName, selectedGroup.id), updates);
      notify("Group Title, Description & Identity updated successfully!", "success");
      
      setSelectedGroup(prev => prev ? {
        ...prev,
        name: editGroupName.trim(),
        description: editGroupDesc.trim(),
        photoURL: editGroupAvatar.trim(),
        imageUrl: editGroupAvatar.trim(),
        customLink: editGroupLink.trim(),
        category: editGroupCategory.trim(),
        isPrivate: editGroupIsPrivate
      } : null);
    } catch (e) {
      console.error(e);
      notify("Failed to update group information", "error");
    } finally {
      setIsSavingGroupInfo(false);
    }
  };

  // Super Admin Delete Entire Group
  const handleDeleteGroup = async (group: GroupItem) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE the group "${group.name || 'Unnamed'}"? All messages and member records will be removed.`)) return;
    const colName = group.type === 'community' ? 'community_channels' : 'p2p_chats';
    try {
      await deleteDoc(doc(db, colName, group.id));
      if (selectedGroup?.id === group.id) setSelectedGroup(null);
      notify("Group deleted permanently by Super Admin", "success");
    } catch (e) {
      console.error(e);
      notify("Failed to delete group", "error");
    }
  };

  // Add Prohibited Word
  const handleAddBannedWord = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newBannedWord.trim().toLowerCase();
    if (!clean) return;
    if (bannedWords.includes(clean)) {
      notify("Word is already in the filter list", "info");
      return;
    }

    const updated = [...bannedWords, clean];
    setIsSavingWordFilter(true);
    try {
      await setDoc(doc(db, 'settings', 'word_filter'), {
        bannedWords: updated,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setBannedWords(updated);
      setNewBannedWord('');
      notify(`Added "${clean}" to prohibited words list`, "success");
    } catch (e) {
      console.error(e);
      notify("Failed to update word filter", "error");
    } finally {
      setIsSavingWordFilter(false);
    }
  };

  // Remove Prohibited Word
  const handleRemoveBannedWord = async (wordToRemove: string) => {
    const updated = bannedWords.filter(w => w !== wordToRemove);
    try {
      await setDoc(doc(db, 'settings', 'word_filter'), {
        bannedWords: updated,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setBannedWords(updated);
      notify(`Removed "${wordToRemove}" from prohibited words`, "info");
    } catch (e) {
      console.error(e);
      notify("Failed to remove word", "error");
    }
  };

  // Filter messages based on query & type
  const filteredMessages = groupMessages.filter(msg => {
    const matchesSearch = !messageSearchQuery.trim() || 
      (msg.text && msg.text.toLowerCase().includes(messageSearchQuery.toLowerCase())) ||
      (msg.senderName && msg.senderName.toLowerCase().includes(messageSearchQuery.toLowerCase())) ||
      (msg.senderId && msg.senderId.toLowerCase().includes(messageSearchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (messageTypeFilter === 'text') return Boolean(msg.text && !msg.imageUrl && !msg.audioUrl);
    if (messageTypeFilter === 'media') return Boolean(msg.imageUrl || (msg.images && msg.images.length > 0));
    if (messageTypeFilter === 'audio') return Boolean(msg.audioUrl);
    return true;
  });

  // Filter members based on query & role
  const filteredMembers = groupMembersList.filter(m => {
    const matchesSearch = !memberSearchQuery.trim() ||
      m.displayName.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      (m.email && m.email.toLowerCase().includes(memberSearchQuery.toLowerCase())) ||
      (m.phone && m.phone.toLowerCase().includes(memberSearchQuery.toLowerCase())) ||
      m.id.toLowerCase().includes(memberSearchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (memberRoleFilter === 'owner') return m.role === 'owner';
    if (memberRoleFilter === 'admin') return m.role === 'admin';
    if (memberRoleFilter === 'member') return m.role === 'member';
    if (memberRoleFilter === 'added_by_admin') return m.joinedSource?.includes('Admin');
    return true;
  });

  // Main list filtered groups
  const filteredGroups = groups.filter(g => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (g.name && g.name.toLowerCase().includes(q)) ||
      (g.creatorName && g.creatorName.toLowerCase().includes(q)) ||
      (g.creatorEmail && g.creatorEmail.toLowerCase().includes(q)) ||
      (g.description && g.description.toLowerCase().includes(q)) ||
      g.id.includes(q)
    );
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090A0F] text-white font-bold text-sm">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
          <span>Verifying Super Admin Authorization...</span>
        </div>
      </div>
    );
  }

  // Restrict access strictly to Super Admin
  if (!isSiteAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#090A0F] text-white">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#11131A] border border-zinc-800 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-white">Access Restricted</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            This Group Management & Word Filter Inspector is strictly reserved for the Main Site Administrator (<span className="text-emerald-400 font-mono">deepshop@gmail.com</span>). Regular users and group admins do not have access.
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: FULL-PAGE DEDICATED HIGH-LEVEL GROUP INSPECTOR
  // =========================================================================
  if (selectedGroup) {
    return (
      <div className="min-h-screen bg-[#090A0F] text-zinc-100 flex flex-col font-inter">
        {/* Full Page Header with Group Identity & Sub-Tab Switcher */}
        <header className="px-4 sm:px-6 py-3.5 bg-[#11131A] border-b border-zinc-800/90 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 sticky top-0 z-30 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setSelectedGroup(null)}
              className="px-3 py-2 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs border border-zinc-700/60 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Groups</span>
            </button>

            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-800 border-2 border-emerald-500/40 shrink-0">
                {selectedGroup.photoURL || selectedGroup.imageUrl ? (
                  <img src={selectedGroup.photoURL || selectedGroup.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-emerald-400 text-lg bg-emerald-950/50">
                    {(selectedGroup.name || 'G')[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-black text-white flex items-center gap-2 truncate">
                  <span className="truncate">{selectedGroup.name || 'Unnamed Group'}</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Super Admin
                  </span>
                </h1>
                <p className="text-[11px] text-zinc-400 font-medium truncate">
                  {selectedGroup.type === 'community' ? 'Community Channel' : 'P2P Group'} • {groupMembersList.length} Members Loaded • Creator: {selectedGroup.creatorName || selectedGroup.createdBy || 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Sub-Tabs: Messages / Members / Settings */}
          <div className="flex items-center justify-between md:justify-end gap-2 shrink-0">
            <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-2xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setInspectorSubTab('messages')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer",
                  inspectorSubTab === 'messages'
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Live Messages ({groupMessages.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectorSubTab('members')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer",
                  inspectorSubTab === 'members'
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Members ({groupMembersList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditGroupName(selectedGroup.name || '');
                  setEditGroupDesc(selectedGroup.description || '');
                  setEditGroupLink(selectedGroup.customLink || '');
                  setEditGroupAvatar(selectedGroup.photoURL || selectedGroup.imageUrl || '');
                  setEditGroupCategory(selectedGroup.category || 'General');
                  setEditGroupIsPrivate(Boolean(selectedGroup.isPrivate));
                  setInspectorSubTab('settings');
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer",
                  inspectorSubTab === 'settings'
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Identity & Settings</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleDeleteGroup(selectedGroup)}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Delete Entire Group"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </header>

        {/* Sub-Page Body */}
        <div className="flex-1 overflow-y-auto">
          {/* =========================================================================
              SUB-PAGE 1: LIVE MESSAGES STREAM & MODERATION
              ========================================================================= */}
          {inspectorSubTab === 'messages' && (
            <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
              {/* Message Search & Filter Bar */}
              <div className="p-4 rounded-3xl bg-[#11131A] border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search messages by text, sender..."
                    value={messageSearchQuery}
                    onChange={(e) => setMessageSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setMessageTypeFilter('all')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer",
                      messageTypeFilter === 'all' ? "bg-zinc-700 text-white" : "text-zinc-400 hover:bg-zinc-800"
                    )}
                  >
                    All ({groupMessages.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageTypeFilter('text')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer",
                      messageTypeFilter === 'text' ? "bg-zinc-700 text-white" : "text-zinc-400 hover:bg-zinc-800"
                    )}
                  >
                    Text Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageTypeFilter('media')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer",
                      messageTypeFilter === 'media' ? "bg-zinc-700 text-white" : "text-zinc-400 hover:bg-zinc-800"
                    )}
                  >
                    Media / Images
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageTypeFilter('audio')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer",
                      messageTypeFilter === 'audio' ? "bg-zinc-700 text-white" : "text-zinc-400 hover:bg-zinc-800"
                    )}
                  >
                    Voice Notes
                  </button>
                </div>
              </div>

              {/* Super Admin Announcement Composer */}
              <form onSubmit={handleSendAdminBroadcast} className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950/30 to-indigo-950/30 border border-emerald-500/30 space-y-3">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">Send Super Admin Announcement / Notice to this Group</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Write official message or warning to all group members..."
                    value={adminBroadcastText}
                    onChange={(e) => setAdminBroadcastText(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-2xl bg-zinc-900/90 border border-zinc-700 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500 font-medium"
                  />
                  <button
                    type="submit"
                    disabled={isSendingBroadcast || !adminBroadcastText.trim()}
                    className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Broadcast</span>
                  </button>
                </div>
              </form>

              {/* Message Feed */}
              <div className="space-y-3">
                {loadingMessages ? (
                  <div className="py-20 text-center text-xs text-zinc-400 font-bold flex flex-col items-center gap-2">
                    <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
                    <span>Connecting live message stream...</span>
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="py-16 text-center text-xs text-zinc-500 bg-[#11131A] rounded-3xl border border-zinc-800/80">
                    {messageSearchQuery.trim() ? "No messages matched search criteria." : "No messages recorded in this group yet."}
                  </div>
                ) : (
                  filteredMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "p-4 rounded-3xl bg-[#141722] border transition group/msg flex items-start justify-between gap-4 shadow-sm",
                        msg.isAdminBroadcast 
                          ? "border-emerald-500/50 bg-emerald-950/20" 
                          : "border-zinc-800/80 hover:border-zinc-700"
                      )}
                    >
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 border border-zinc-700/60 overflow-hidden">
                          {msg.senderAvatar ? (
                            <img src={msg.senderAvatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{(msg.senderName || 'U')[0]?.toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-extrabold text-zinc-200">{msg.senderName || msg.senderId || 'User'}</span>
                            {msg.isAdminBroadcast && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500 text-black">Official Admin</span>
                            )}
                            <span className="text-[10px] text-zinc-500">
                              {msg.timestamp?.seconds 
                                ? new Date(msg.timestamp.seconds * 1000).toLocaleString() 
                                : msg.timestamp?.toDate 
                                ? msg.timestamp.toDate().toLocaleString() 
                                : 'Just now'}
                            </span>
                          </div>

                          {msg.text && (
                            <p className="text-xs text-zinc-300 leading-relaxed break-words font-medium whitespace-pre-wrap">
                              {msg.text}
                            </p>
                          )}

                          {msg.imageUrl && (
                            <div className="w-48 h-36 rounded-2xl overflow-hidden mt-2 border border-zinc-800">
                              <img src={msg.imageUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}

                          {msg.audioUrl && (
                            <div className="p-2.5 rounded-2xl bg-zinc-800/90 text-xs text-zinc-300 flex items-center gap-2 mt-2 w-fit border border-zinc-700/50">
                              <span>🎙️ Voice Note</span>
                              <audio src={msg.audioUrl} controls className="h-7 max-w-[220px]" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stealth Message Controls */}
                      <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover/msg:opacity-100 transition">
                        {msg.text && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMessage(msg);
                              setEditedText(msg.text || '');
                            }}
                            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-emerald-500/20 text-emerald-400 border border-zinc-700/50 transition cursor-pointer"
                            title="Stealth Edit Message (No trace)"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="p-2 rounded-xl bg-zinc-800/80 hover:bg-rose-500/20 text-rose-400 border border-zinc-700/50 transition cursor-pointer"
                          title="Stealth Delete Message (No trace)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              SUB-PAGE 2: MEMBERS & ACCESS CONTROL (70+ MEMBERS SUPPORT)
              ========================================================================= */}
          {inspectorSubTab === 'members' && (
            <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
              {/* Member Search, Filter & Add Member Header */}
              <div className="p-4 rounded-3xl bg-[#11131A] border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search members by name, email, phone, UID..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end flex-wrap">
                  <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setMemberRoleFilter('all')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer",
                        memberRoleFilter === 'all' ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
                      )}
                    >
                      All ({groupMembersList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMemberRoleFilter('admin')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer",
                        memberRoleFilter === 'admin' ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
                      )}
                    >
                      Admins
                    </button>
                    <button
                      type="button"
                      onClick={() => setMemberRoleFilter('added_by_admin')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer",
                        memberRoleFilter === 'added_by_admin' ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
                      )}
                    >
                      Admin Added
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAddUserModal(true);
                      setUserSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-600/20 transition flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Search & Add Member</span>
                  </button>
                </div>
              </div>

              {/* Members Grid / List */}
              {loadingMembers ? (
                <div className="py-20 text-center text-xs text-zinc-400 font-bold flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
                  <span>Loading full group member registry...</span>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="py-16 text-center text-xs text-zinc-500 bg-[#11131A] rounded-3xl border border-zinc-800">
                  {memberSearchQuery.trim() ? "No group members matched your query." : "No members found in this group."}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredMembers.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 rounded-3xl bg-[#141722] border border-zinc-800/90 hover:border-zinc-700 transition flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-800 shrink-0 border border-zinc-700 relative">
                          {m.photoURL ? (
                            <img src={m.photoURL} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-xs text-zinc-300">
                              {(m.displayName || 'U')[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="text-xs font-extrabold text-zinc-100 truncate flex items-center gap-1.5">
                            <span className="truncate">{m.displayName}</span>
                            {m.role === 'owner' && (
                              <span className="px-1.5 py-0.2 text-[9px] font-black uppercase rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 shrink-0">
                                <Crown className="w-2.5 h-2.5" /> Owner
                              </span>
                            )}
                            {m.role === 'admin' && (
                              <span className="px-1.5 py-0.2 text-[9px] font-black uppercase rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center gap-1 shrink-0">
                                <ShieldCheck className="w-2.5 h-2.5" /> Admin
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-zinc-400 truncate font-mono">{m.email || m.phone || `#${m.id.slice(0, 10)}`}</p>
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <span className={cn(
                              "text-[9px] font-bold px-2 py-0.2 rounded-full",
                              m.joinedSource?.includes('Admin')
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : m.joinedSource?.includes('Creator')
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-zinc-800 text-zinc-400"
                            )}>
                              {m.joinedSource || "Member"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Super Admin Actions on Member */}
                      <div className="flex items-center gap-1 shrink-0">
                        {m.role === 'admin' ? (
                          <button
                            type="button"
                            onClick={() => handleDemoteAdmin(m.id, m.displayName)}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-extrabold transition cursor-pointer"
                            title="Demote to Member"
                          >
                            Demote
                          </button>
                        ) : m.role === 'member' ? (
                          <button
                            type="button"
                            onClick={() => handlePromoteAdmin(m.id, m.displayName)}
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-extrabold transition cursor-pointer"
                            title="Make Group Admin"
                          >
                            Make Admin
                          </button>
                        ) : null}

                        {/* Kick from Group Override */}
                        <button
                          type="button"
                          onClick={() => handleKickMember(m.id, m.displayName)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 transition cursor-pointer"
                          title="Remove from group (Super Admin Override)"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              SUB-PAGE 3: GROUP IDENTITY, SETTINGS & STATS
              ========================================================================= */}
          {inspectorSubTab === 'settings' && (
            <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
              <div className="p-6 rounded-3xl bg-[#11131A] border border-zinc-800 space-y-6 shadow-xl">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                  <div>
                    <h2 className="text-base font-black text-white flex items-center gap-2">
                      <Settings className="w-5 h-5 text-emerald-400" />
                      <span>Group Identity & Configuration</span>
                    </h2>
                    <p className="text-xs text-zinc-400">Edit title, description, custom link handle, avatar, and category</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5">Group Title / Name</label>
                    <input
                      type="text"
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      placeholder="Group Title"
                      className="w-full p-3 rounded-2xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-white outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1.5">Group Handle / Custom Link</label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-zinc-500 text-xs font-bold">@</span>
                        <input
                          type="text"
                          value={editGroupLink}
                          onChange={(e) => setEditGroupLink(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          placeholder="group_handle"
                          className="w-full pl-7 pr-3 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-700 text-xs font-semibold text-white outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1.5">Category</label>
                      <input
                        type="text"
                        value={editGroupCategory}
                        onChange={(e) => setEditGroupCategory(e.target.value)}
                        placeholder="e.g. Technology, Gadgets, Gaming..."
                        className="w-full p-2.5 rounded-2xl bg-zinc-900 border border-zinc-700 text-xs font-semibold text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5">Group Avatar / Image URL</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={editGroupAvatar}
                        onChange={(e) => setEditGroupAvatar(e.target.value)}
                        placeholder="https://..."
                        className="flex-1 p-2.5 rounded-2xl bg-zinc-900 border border-zinc-700 text-xs font-medium text-white outline-none focus:border-emerald-500"
                      />
                      {editGroupAvatar && (
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700 shrink-0">
                          <img src={editGroupAvatar} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5">Description & Guidelines</label>
                    <textarea
                      rows={4}
                      value={editGroupDesc}
                      onChange={(e) => setEditGroupDesc(e.target.value)}
                      placeholder="Write group rules, guidelines, or bio..."
                      className="w-full p-3 rounded-2xl bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-emerald-500 resize-none font-medium"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                    <div>
                      <p className="text-xs font-bold text-white">Private Group Mode</p>
                      <p className="text-[10px] text-zinc-400">Require invitation or approval to join</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditGroupIsPrivate(!editGroupIsPrivate)}
                      className={cn(
                        "w-12 h-6 rounded-full p-1 transition-colors cursor-pointer flex items-center",
                        editGroupIsPrivate ? "bg-emerald-600 justify-end" : "bg-zinc-700 justify-start"
                      )}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    disabled={isSavingGroupInfo}
                    onClick={handleSaveGroupSettings}
                    className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-black shadow-lg shadow-emerald-600/20 transition cursor-pointer flex items-center gap-2"
                  >
                    {isSavingGroupInfo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Save All Changes</span>
                  </button>
                </div>
              </div>

              {/* Group Technical Stats */}
              <div className="p-6 rounded-3xl bg-[#11131A] border border-zinc-800 space-y-4">
                <h3 className="text-xs font-black uppercase text-zinc-400 tracking-wider">Group Technical Metadata</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Total Members</p>
                    <p className="text-lg font-black text-emerald-400">{groupMembersList.length}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Total Messages</p>
                    <p className="text-lg font-black text-indigo-400">{groupMessages.length}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Admins</p>
                    <p className="text-lg font-black text-amber-400">{selectedGroup.admins?.length || 1}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Type</p>
                    <p className="text-xs font-bold text-white uppercase mt-1">{selectedGroup.type}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stealth Edit Message Modal */}
        <AnimatePresence>
          {editingMessage && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#141722] border border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 text-white"
              >
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <h3 className="font-black text-sm text-white flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-emerald-400" />
                    <span>Stealth Edit Message (Super Admin)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditingMessage(null)}
                    className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">Message Content</label>
                  <textarea
                    rows={4}
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-emerald-500 resize-none font-medium"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    * This update changes the message directly without adding an "edited" tag.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingMessage(null)}
                    className="px-4 py-2 rounded-xl border border-zinc-700 text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditedMessage}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold shadow-md transition cursor-pointer"
                  >
                    Save Stealth Edit
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Site-Wide Search & Add User Modal */}
        <AnimatePresence>
          {showAddUserModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#141722] border border-zinc-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-white"
              >
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div>
                    <h3 className="font-black text-sm text-white flex items-center gap-2">
                      <Plus className="w-4 h-4 text-emerald-400" />
                      <span>Add Member to "{selectedGroup.name}"</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400">Added user will immediately see this group in their Messages and can chat normally.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowAddUserModal(false); setUserSearchQuery(''); setSearchResults([]); }}
                    className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-2">
                    Search Platform Users by Name, Email, or Phone
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="e.g. John, john@gmail.com, 017..."
                      value={userSearchQuery}
                      onChange={(e) => handleSearchUsers(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-emerald-500"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
                  {isSearchingUsers ? (
                    <div className="py-8 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                      <span>Searching users...</span>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <p className="text-center py-8 text-xs text-zinc-500">
                      {userSearchQuery.trim() ? "No platform users found matching your search" : "Type at least 2 characters to search"}
                    </p>
                  ) : (
                    searchResults.map((u: any) => {
                      const isAlreadyIn = groupMembersList.some(m => m.id === u.id);
                      return (
                        <div
                          key={u.id}
                          className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3 hover:border-zinc-700 transition"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 shrink-0 border border-zinc-700">
                              {u.photoURL ? (
                                <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-xs text-zinc-300">
                                  {(u.displayName || u.name || 'U')[0]?.toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white truncate">{u.displayName || u.name || 'User'}</p>
                              <p className="text-[10px] text-zinc-400 truncate">{u.email || u.phone || `#${u.id.slice(0, 8)}`}</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isAlreadyIn}
                            onClick={() => handleAddUserToGroup(u)}
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0",
                              isAlreadyIn 
                                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
                                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
                            )}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{isAlreadyIn ? "In Group" : "Add to Group"}</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // =========================================================================
  // VIEW: ALL GROUPS LIST & WORD FILTER
  // =========================================================================
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-inter">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-zinc-900 dark:text-white mb-1.5 flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>Group Management & Content Moderation</span>
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
            Main Site Administrator Panel (<span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">deepshop@gmail.com</span>) • Inspect all group live message streams without joining • Full member and message moderation
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-200 dark:bg-zinc-900 rounded-2xl border border-zinc-300 dark:border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('groups')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer",
              activeTab === 'groups'
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            All Platform Groups ({groups.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('word_filter')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer",
              activeTab === 'word_filter'
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Word Filter ({bannedWords.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'groups' ? (
        <div className="space-y-6">
          {/* Search Input */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search platform groups by name, creator, handle, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold outline-none focus:border-emerald-500 shadow-xs"
            />
          </div>

          {loading ? (
            <div className="p-20 text-center text-xs text-zinc-400 font-bold flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
              <span>Loading all platform groups...</span>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="p-16 text-center text-xs text-zinc-400 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              No groups found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredGroups.map((g) => (
                <div
                  key={g.id}
                  className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50 transition-all duration-200 shadow-xs flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shrink-0">
                          {g.photoURL || g.imageUrl ? (
                            <img src={g.photoURL || g.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-black text-emerald-600 dark:text-emerald-400 text-base bg-emerald-50 dark:bg-emerald-950/40">
                              {(g.name || 'G')[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white truncate group-hover:text-emerald-500 transition">
                            {g.name || 'Unnamed Group'}
                          </h3>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                            Creator: {g.creatorName || g.creatorEmail || (g.createdBy ? `#${g.createdBy.slice(0, 6)}` : 'Unknown')}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                        {g.type === 'community' ? 'Channel' : 'Group'}
                      </span>
                    </div>

                    {g.description && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        {g.description}
                      </p>
                    )}

                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{g.membersCount || (g.participants || []).length || 1} Members</span>
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {g.createdAt?.seconds ? new Date(g.createdAt.seconds * 1000).toLocaleDateString() : 'Active'}
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGroup(g);
                        setInspectorSubTab('messages');
                      }}
                      className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Group</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenGroupSettings(g)}
                      className="p-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
                      title="Group Settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(g)}
                      className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 transition cursor-pointer"
                      title="Delete Group"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* =========================================================================
            WORD FILTER & CONTENT MODERATION TAB
            ========================================================================= */
        <div className="max-w-4xl space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
            <h2 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <Filter className="w-5 h-5 text-emerald-500" />
              <span>Prohibited Words & Bad Word Filter</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Any word added to this list will be automatically blocked or sanitized in real-time across all direct chats, group messages, reviews, and community channels.
            </p>

            <form onSubmit={handleAddBannedWord} className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="Enter prohibited word (e.g. scam, fraud, spam...)"
                value={newBannedWord}
                onChange={(e) => setNewBannedWord(e.target.value)}
                className="flex-1 p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white outline-none focus:border-emerald-500 font-semibold"
              />
              <button
                type="submit"
                disabled={isSavingWordFilter || !newBannedWord.trim()}
                className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Prohibited Word</span>
              </button>
            </form>
          </div>

          {/* Word Filter Testing Simulator */}
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-xs">
            <h3 className="text-xs font-black uppercase text-zinc-400 tracking-wider">Test Word Filter Simulator</h3>
            <input
              type="text"
              placeholder="Type any test sentence here to check if it contains banned words..."
              value={filterTestText}
              onChange={(e) => setFilterTestText(e.target.value)}
              className="w-full p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white outline-none focus:border-emerald-500"
            />
            {filterTestText.trim() && (
              <div className="p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                {bannedWords.some(w => filterTestText.toLowerCase().includes(w.toLowerCase())) ? (
                  <span className="text-rose-500 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Blocked: Contains prohibited word: "{bannedWords.find(w => filterTestText.toLowerCase().includes(w.toLowerCase()))}"
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    Passed: Clean message (No prohibited words detected)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Word List Chips */}
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-zinc-400 tracking-wider">Active Prohibited Words ({bannedWords.length})</h3>
            </div>

            {bannedWords.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-6">No prohibited words configured yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {bannedWords.map((word) => (
                  <div
                    key={word}
                    className="pl-3 pr-2 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-bold flex items-center gap-2"
                  >
                    <span>{word}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBannedWord(word)}
                      className="p-1 rounded-md hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400 transition cursor-pointer"
                      title="Remove word"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
