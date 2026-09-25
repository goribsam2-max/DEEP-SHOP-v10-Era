import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
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
  getDoc
} from 'firebase/firestore';
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
  ExternalLink
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface GroupItem {
  id: string;
  name?: string;
  photoURL?: string;
  createdBy?: string;
  creatorName?: string;
  creatorEmail?: string;
  admins?: string[];
  participants?: string[];
  createdAt?: any;
  updatedAt?: any;
  lastMessage?: string;
}

interface GroupMessage {
  id: string;
  text?: string;
  senderId?: string;
  senderName?: string;
  imageUrl?: string;
  images?: string[];
  audioUrl?: string;
  timestamp?: any;
  isSystem?: boolean;
  isEdited?: boolean;
}

export default function ManageGroups() {
  const notify = useNotify();
  const [activeTab, setActiveTab] = useState<'groups' | 'word_filter'>('groups');
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Group for viewing messages
  const [selectedGroup, setSelectedGroup] = useState<GroupItem | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Edit Message Modal
  const [editingMessage, setEditingMessage] = useState<GroupMessage | null>(null);
  const [editedText, setEditedText] = useState('');

  // Word Filter State
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [newBannedWord, setNewBannedWord] = useState('');
  const [isSavingWordFilter, setIsSavingWordFilter] = useState(false);

  // Fetch groups
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'p2p_chats'), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(q, async (snap) => {
      const groupList: GroupItem[] = [];
      const userCache: Record<string, { name: string; email: string }> = {};

      for (const d of snap.docs) {
        const data = d.data();
        if (data.isGroup || data.type === 'group') {
          let creatorName = 'Unknown User';
          let creatorEmail = '';
          const cId = data.createdBy;
          if (cId) {
            if (userCache[cId]) {
              creatorName = userCache[cId].name;
              creatorEmail = userCache[cId].email;
            } else {
              try {
                const uDoc = await getDoc(doc(db, 'users', cId));
                if (uDoc.exists()) {
                  const uData = uDoc.data();
                  creatorName = uData.displayName || uData.shopName || uData.name || 'User';
                  creatorEmail = uData.email || '';
                  userCache[cId] = { name: creatorName, email: creatorEmail };
                }
              } catch (e) {}
            }
          }

          groupList.push({
            id: d.id,
            ...data,
            creatorName,
            creatorEmail
          } as GroupItem);
        }
      }
      setGroups(groupList);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Fetch Word Filter
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

  // Listen to messages of selected group (WITHOUT JOINING)
  useEffect(() => {
    if (!selectedGroup) {
      setGroupMessages([]);
      return;
    }

    setLoadingMessages(true);
    const msgQ = query(
      collection(db, 'p2p_chats', selectedGroup.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsub = onSnapshot(msgQ, (snap) => {
      const msgs = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as GroupMessage));
      setGroupMessages(msgs);
      setLoadingMessages(false);
    });

    return () => unsub();
  }, [selectedGroup]);

  // Admin delete message in group
  const handleDeleteMessage = async (msgId: string) => {
    if (!selectedGroup) return;
    if (!window.confirm("Are you sure you want to delete this message from the group?")) return;
    try {
      await deleteDoc(doc(db, 'p2p_chats', selectedGroup.id, 'messages', msgId));
      notify("Message deleted by admin", "success");
    } catch (e) {
      console.error(e);
      notify("Failed to delete message", "error");
    }
  };

  // Admin save edited message
  const handleSaveEditedMessage = async () => {
    if (!selectedGroup || !editingMessage) return;
    if (!editedText.trim()) return;

    try {
      await updateDoc(doc(db, 'p2p_chats', selectedGroup.id, 'messages', editingMessage.id), {
        text: editedText.trim(),
        isEdited: true,
        editedByAdmin: true,
        editedAt: serverTimestamp()
      });
      notify("Message updated by admin", "success");
      setEditingMessage(null);
      setEditedText('');
    } catch (e) {
      console.error(e);
      notify("Failed to edit message", "error");
    }
  };

  // Admin delete entire group
  const handleDeleteGroup = async (group: GroupItem) => {
    if (!window.confirm(`Are you sure you want to permanently delete the group "${group.name || 'Unnamed'}"? All chat history will be removed.`)) return;
    try {
      await deleteDoc(doc(db, 'p2p_chats', group.id));
      if (selectedGroup?.id === group.id) setSelectedGroup(null);
      notify("Group deleted successfully", "success");
    } catch (e) {
      console.error(e);
      notify("Failed to delete group", "error");
    }
  };

  // Add banned word
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

  // Remove banned word
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

  const filteredGroups = groups.filter(g => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (g.name && g.name.toLowerCase().includes(q)) ||
      (g.creatorName && g.creatorName.toLowerCase().includes(q)) ||
      (g.creatorEmail && g.creatorEmail.toLowerCase().includes(q)) ||
      g.id.includes(q)
    );
  });

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-10 min-h-screen bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-1.5 flex items-center gap-2">
            <Users className="w-6 h-6 text-pink-600 dark:text-pink-400" />
            <span>Groups & Content Moderation</span>
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
            Inspect all platform groups without joining • Moderate/edit messages • Global word filter
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-200 dark:bg-zinc-700/60 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'groups'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            All Groups ({groups.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('word_filter')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'word_filter'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
            <span>Word Filter ({bannedWords.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'groups' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Group List */}
          <div className="lg:col-span-5 space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search groups by name or creator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-medium outline-none focus:border-pink-500"
              />
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-400 font-bold">Loading groups...</div>
            ) : filteredGroups.length === 0 ? (
              <div className="p-12 text-center text-xs text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                No groups found on the platform.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
                {filteredGroups.map((g) => {
                  const isSelected = selectedGroup?.id === g.id;
                  const memberCount = g.participants?.length || 0;
                  const adminCount = g.admins?.length || 1;

                  return (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGroup(g)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-pink-50/70 dark:bg-pink-950/20 border-pink-400 dark:border-pink-800 shadow-xs'
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0 border border-zinc-200 dark:border-zinc-700">
                          {g.photoURL ? (
                            <img src={g.photoURL} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-pink-600 bg-pink-100 dark:bg-pink-900/30 text-base">
                              {(g.name || 'G')[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm truncate text-zinc-900 dark:text-white">
                              {g.name || 'Unnamed Group'}
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
                              {memberCount} members
                            </span>
                          </div>

                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Creator:</span> {g.creatorName} ({g.creatorEmail || g.createdBy?.slice(0, 8)})
                          </p>

                          <div className="flex items-center gap-3 text-[10px] text-zinc-400 mt-1">
                            <span>{adminCount} Admin{adminCount > 1 ? 's' : ''}</span>
                            <span>•</span>
                            <span>ID: #{g.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(g)}
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Delete entire group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-pink-600' : 'text-zinc-400'}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Messages Inspector (Without Joining) */}
          <div className="lg:col-span-7">
            {selectedGroup ? (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col h-[750px] overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-zinc-150 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                      {selectedGroup.photoURL ? (
                        <img src={selectedGroup.photoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-pink-600">
                          {(selectedGroup.name || 'G')[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                        <span>{selectedGroup.name || 'Unnamed Group'}</span>
                        <span className="text-[10px] bg-pink-100 dark:bg-pink-950 text-pink-600 dark:text-pink-400 font-bold px-2 py-0.5 rounded-full">
                          Admin Inspector Mode
                        </span>
                      </h3>
                      <p className="text-[11px] text-zinc-400">
                        {groupMessages.length} total messages • Inspecting without joining group
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedGroup(null)}
                      className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC] dark:bg-[#0B0C0E]">
                  {loadingMessages ? (
                    <div className="p-8 text-center text-xs text-zinc-400">Loading group messages...</div>
                  ) : groupMessages.length === 0 ? (
                    <div className="p-12 text-center text-xs text-zinc-400">No messages sent in this group yet.</div>
                  ) : (
                    groupMessages.map((msg) => {
                      return (
                        <div
                          key={msg.id}
                          className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 group hover:border-pink-300 dark:hover:border-pink-900 transition"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                {msg.senderName || msg.senderId?.slice(0, 8) || 'User'}
                              </span>
                              <span className="text-[10px] text-zinc-400">
                                {msg.timestamp?.toMillis
                                  ? new Date(msg.timestamp.toMillis()).toLocaleString()
                                  : 'Recently'}
                              </span>
                              {msg.isEdited && (
                                <span className="text-[9px] text-amber-500 font-bold px-1.5 py-0.2 bg-amber-500/10 rounded">
                                  Edited
                                </span>
                              )}
                            </div>

                            {msg.text && (
                              <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                {msg.text}
                              </p>
                            )}

                            {msg.imageUrl && (
                              <div className="w-32 h-28 rounded-xl overflow-hidden mt-1 border border-zinc-200 dark:border-zinc-800">
                                <img src={msg.imageUrl} alt="" className="w-full h-full object-cover" />
                              </div>
                            )}

                            {msg.audioUrl && (
                              <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 font-semibold flex items-center gap-2 mt-1">
                                <span>🎙️ Voice Note</span>
                                <audio src={msg.audioUrl} controls className="h-6 max-w-[200px]" />
                              </div>
                            )}
                          </div>

                          {/* Admin Action Buttons on Message */}
                          <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                            {msg.text && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMessage(msg);
                                  setEditedText(msg.text || '');
                                }}
                                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                                title="Edit message text"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition"
                              title="Delete message"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-12 text-center flex flex-col items-center justify-center h-[750px] text-zinc-400">
                <Users className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3" />
                <h3 className="font-bold text-base text-zinc-700 dark:text-zinc-300">No Group Selected</h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                  Select any group from the left column to inspect its complete message history without needing to join. You can edit or remove any message.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Tab 2: Word Filter / Prohibited Words Manager */
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Filter className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                <span>Prohibited Words & Content Moderation</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Any word added here will be automatically blocked in all chat messages, groups, and store/product reviews across the entire platform.
              </p>
            </div>

            {/* Add Word Form */}
            <form onSubmit={handleAddBannedWord} className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Enter word to block (e.g. scam, offensive word)..."
                value={newBannedWord}
                onChange={(e) => setNewBannedWord(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold outline-none focus:border-pink-500"
              />
              <button
                type="submit"
                disabled={isSavingWordFilter || !newBannedWord.trim()}
                className="px-5 py-2.5 rounded-2xl bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Word</span>
              </button>
            </form>

            {/* List of active banned words */}
            <div>
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-3">
                Active Blocked Words ({bannedWords.length})
              </p>

              {bannedWords.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700 text-center text-xs text-zinc-400">
                  No prohibited words defined yet. Add words above to prevent spam and abuse.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {bannedWords.map((word) => (
                    <span
                      key={word}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-bold text-rose-700 dark:text-rose-300"
                    >
                      <span>{word}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBannedWord(word)}
                        className="p-0.5 rounded-full hover:bg-rose-200 dark:hover:bg-rose-900 text-rose-500 hover:text-rose-800 dark:hover:text-white transition cursor-pointer"
                        title="Remove word from filter"
                      >
                        <X className="w-3 h-3 stroke-[3]" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Message Modal */}
      <AnimatePresence>
        {editingMessage && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-150 dark:border-zinc-800">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Edit Group Message (Admin)</h3>
                <button
                  type="button"
                  onClick={() => setEditingMessage(null)}
                  className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  Message Content
                </label>
                <textarea
                  rows={4}
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium outline-none focus:border-pink-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMessage(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedMessage}
                  className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-md transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
