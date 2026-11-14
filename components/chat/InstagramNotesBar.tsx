import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Music,
  Smile,
  Check,
  Plus,
  Loader2,
  Play,
  Pause,
  Trash2,
  Clock,
  Users,
  ChevronRight,
  MoreHorizontal,
  Send,
  Heart,
  User,
  PlusCircle,
  Flame,
  ThumbsUp,
  SmilePlus
} from 'lucide-react';
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  query,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../../firebase';
import { cn } from '../../lib/utils';
import { triggerHaptic } from '../../lib/haptics';
import { hasImmediateAdminOrStaffRole } from '../../lib/admin';
import { sendPushNotification } from '../../lib/push';

const MAX_NOTE_AGE_MS = 24 * 60 * 60 * 1000;

function isNoteActiveWithin24h(data: any, now: number): boolean {
  if (!data || !String(data.text || '').trim()) return false;
  const createdMs =
    typeof data.createdAtMs === 'number'
      ? data.createdAtMs
      : data.createdAt?.toMillis
      ? data.createdAt.toMillis()
      : 0;
  if (!createdMs) {
    return (
      typeof data.expiresAtMs === 'number' &&
      data.expiresAtMs > now &&
      data.expiresAtMs - now <= MAX_NOTE_AGE_MS
    );
  }
  if (now - createdMs > MAX_NOTE_AGE_MS) return false;
  if (typeof data.expiresAtMs === 'number' && data.expiresAtMs > 0 && data.expiresAtMs <= now) {
    return false;
  }
  return true;
}

export interface UserNoteData {
  userId: string;
  displayName: string;
  photoURL?: string;
  text: string;
  bubbleColor?: string;
  bubbleEmoji?: string;
  moodEmojis?: string[];
  gifUrl?: string;
  musicTitle?: string;
  musicArtist?: string;
  musicCover?: string;
  musicAudioUrl?: string;
  location?: string;
  audience?: 'public' | 'friends_connections' | 'friends' | 'custom';
  durationHours?: number;
  createdAtMs?: number;
  expiresAtMs?: number;
  reactions?: Record<string, { emoji: string; userName: string; userAvatar?: string; createdAtMs?: number }>;
  createdAt?: any;
}

interface InstagramNotesBarProps {
  currentUser: any;
  onlineUsers?: any[];
  onOpenChatWithUser?: (user: any) => void;
  notify?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  hideBar?: boolean;
}

const GIPHY_API_KEY = 'dfU9Rj78ULWD8qWnvDuIXBWpnpawi6tl';

// Exact music tracks from user screenshot IMG_5575.png + IMG_5573.jpeg
const DEFAULT_NOTE_TRACKS = [
  {
    id: 'track_lost_at_sea',
    title: 'Ahyyyyyyyyy...',
    artist: 'Lost At Sea',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=150&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3'
  },
  {
    id: 'track_awarapan_2',
    title: 'The Soul Of Awarapan 2...',
    artist: 'Emrose Percussion',
    cover: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=150&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_c6ccf3232f.mp3?filename=summer-nights-tropical-house-music-11440.mp3'
  },
  {
    id: 'track_tu_dekhey',
    title: 'Tu Dekhey Faasla Kahe...',
    artist: 'Ruhvik Parekh',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3?filename=electronic-future-beats-117997.mp3'
  },
  {
    id: 'track_aajo_miss_kori',
    title: 'Aajo Miss Kori',
    artist: 'Mohammad SHiblu',
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2021/11/24/audio_a1622f98f6.mp3?filename=modern-vlog-140795.mp3'
  },
  {
    id: 'track_chennai_express',
    title: 'Chennai Express (Sad In...',
    artist: 'Jobu Jr.',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=electronic-rock-king-around-here-15045.mp3'
  },
  {
    id: 'track_nasheed',
    title: 'شُكْرًا لَكَ رَبِّي',
    artist: 'Muad Nasheed',
    cover: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=150&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f77b72.mp3?filename=tuesday-glitch-12241.mp3'
  },
  {
    id: 'track_budget_date',
    title: 'Budget Date Forever',
    artist: 'Elio Vantine',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3'
  },
  {
    id: 'track_oniket_prantor',
    title: 'Oniket Prantor (Instrum...',
    artist: 'Jobu Jr.',
    cover: 'https://images.unsplash.com/photo-1445985543470-41fdd5c31447?w=150&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_c6ccf3232f.mp3?filename=summer-nights-tropical-house-music-11440.mp3'
  },
  {
    id: 'track_alvida_alvida',
    title: 'Alvida Alvida (From "Da...',
    artist: 'Nabeel Shaukat Ali',
    cover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=150&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3?filename=electronic-future-beats-117997.mp3'
  },
  {
    id: 'track_tera_mera_rishta',
    title: 'Tera Mera Rishta 2.0',
    artist: 'Mustafa Zahid',
    cover: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=150&auto=format&fit=crop&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2021/11/24/audio_a1622f98f6.mp3?filename=modern-vlog-140795.mp3'
  }
];

// Exact keyboard emoji list matching user screenshot IMG_5577.jpeg
const KEYBOARD_EMOJIS_LIST = [
  '😂', '🥰', '💕', '👍', '🙈', '😴', '😀', '🥺', '😇',
  '❤️', '😊', '😔', '✌️', '😎', '😁', '😃', '😅', '🤗',
  '😍', '😘', '😏', '😉', '🎶', '😜', '😄', '🤣', '😇',
  '😒', '😭', '😆', '😌', '👀', '😋', '😁', '🤣', '🙃',
  '👌', '😩', '😳', '💁‍♂️', '😐', '👏', '😆', '🥲', '😋',
  '🔥', '✨', '💯', '🌸', '🎉', '🌟', '🌙', '💤', '💀',
  '🚀', '💪', '🍕', '☕', '🎧', '🤙', '🙏', '🫠', '🫡'
];

export const InstagramNotesBar: React.FC<InstagramNotesBarProps> = ({
  currentUser,
  onlineUsers = [],
  onOpenChatWithUser,
  notify = () => {},
  hideBar = false
}) => {
  // Real Firestore Notes (No demo notes)
  const [myNote, setMyNote] = useState<UserNoteData | null>(null);
  const [allNotes, setAllNotes] = useState<Record<string, UserNoteData>>({});

  // Modals & Sheets matching screenshots IMG_5573 - IMG_5580
  const [showNoteCreator, setShowNoteCreator] = useState(false);
  const [showNoteSettings, setShowNoteSettings] = useState(false);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [showGiphyModal, setShowGiphyModal] = useState(false);
  const [viewingNote, setViewingNote] = useState<UserNoteData | null>(null);
  const [showActivitySheet, setShowActivitySheet] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // Note Creator Fields
  const [noteText, setNoteText] = useState('');
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedGifUrl, setSelectedGifUrl] = useState<string>('');
  const [selectedMusic, setSelectedMusic] = useState<any>(DEFAULT_NOTE_TRACKS[0]);
  const [noteAudience, setNoteAudience] = useState<'public' | 'friends_connections' | 'friends' | 'custom'>('friends');
  const [noteDurationHours, setNoteDurationHours] = useState<number>(24);
  const [isSaving, setIsSaving] = useState(false);
  const [noteReplyText, setNoteReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isAdmin = useMemo(() => hasImmediateAdminOrStaffRole(null, currentUser), [currentUser]);

  // Loops Music Library (background_music, story_songs, reel video audio)
  const [loopsTracks, setLoopsTracks] = useState<any[]>([]);
  const [musicSearchQuery, setMusicSearchQuery] = useState('');

  // Fetch real Loops music from Firestore
  useEffect(() => {
    try {
      const unsubBg = onSnapshot(query(collection(db, 'background_music'), limit(80)), (snap) => {
        const bgList = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: `bg_${d.id}`,
            title: data.title || data.name || 'Loops Audio Track',
            artist: data.artist || data.addedBy || 'Loops Artist',
            cover: data.coverUrl || data.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80',
            audioUrl: data.audioUrl || data.url || data.mp3Url || ''
          };
        }).filter((t) => Boolean(t.audioUrl));
        setLoopsTracks((prev) => {
          const combined = [...bgList, ...prev];
          const uniqueMap = new Map();
          combined.forEach((item) => uniqueMap.set(item.audioUrl, item));
          return Array.from(uniqueMap.values());
        });
      });

      const unsubStory = onSnapshot(query(collection(db, 'story_songs'), limit(80)), (snap) => {
        const storyList = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: `story_${d.id}`,
            title: data.title || data.name || 'Loops Story Song',
            artist: data.artist || data.addedBy || 'Loops Artist',
            cover: data.coverUrl || data.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150&auto=format&fit=crop&q=80',
            audioUrl: data.audioUrl || data.url || data.mp3Url || ''
          };
        }).filter((t) => Boolean(t.audioUrl));
        setLoopsTracks((prev) => {
          const combined = [...prev, ...storyList];
          const uniqueMap = new Map();
          combined.forEach((item) => uniqueMap.set(item.audioUrl, item));
          return Array.from(uniqueMap.values());
        });
      });

      return () => {
        unsubBg();
        unsubStory();
      };
    } catch (e) {
      console.warn('Error listening to Loops music:', e);
    }
  }, []);

  const availableMusicTracks = useMemo(() => {
    const seenUrls = new Set<string>();
    const list: any[] = [];

    // First add Firestore Loops tracks
    for (const t of loopsTracks) {
      if (t.audioUrl && !seenUrls.has(t.audioUrl)) {
        seenUrls.add(t.audioUrl);
        list.push(t);
      }
    }

    // Then add fallback tracks
    for (const t of DEFAULT_NOTE_TRACKS) {
      if (t.audioUrl && !seenUrls.has(t.audioUrl)) {
        seenUrls.add(t.audioUrl);
        list.push(t);
      }
    }

    if (musicSearchQuery.trim()) {
      const q = musicSearchQuery.trim().toLowerCase();
      return list.filter((t) =>
        (t.title || '').toLowerCase().includes(q) || (t.artist || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [loopsTracks, musicSearchQuery]);

  // Real-time listener for user_notes from Firestore (strict 24h TTL + Admin auto-cleanup)
  useEffect(() => {
    try {
      const q = query(collection(db, 'user_notes'), limit(50));
      const unsub = onSnapshot(q, (snapshot) => {
        const notesMap: Record<string, UserNoteData> = {};
        const now = Date.now();

        snapshot.forEach((d) => {
          const data = d.data() as UserNoteData;
          if (!isNoteActiveWithin24h(data, now)) {
            if (isAdmin) {
              deleteDoc(doc(db, 'user_notes', d.id)).catch(() => {});
            }
            return;
          }
          notesMap[d.id] = { ...data, userId: d.id };
          if (currentUser?.uid && d.id === currentUser.uid) {
            setMyNote({ ...data, userId: d.id });
          }
        });

        if (currentUser?.uid && !notesMap[currentUser.uid]) {
          setMyNote(null);
        }

        setAllNotes(notesMap);
      });

      return () => unsub();
    } catch (e) {
      console.error('Error listening to user_notes:', e);
    }
  }, [currentUser?.uid, isAdmin]);

  // Hide mobile/PWA bottom navigation whenever any Note add/view/sub-sheet is open
  const isAnyNoteOverlayOpen = Boolean(
    showNoteCreator ||
    showNoteSettings ||
    showMoodPicker ||
    showMusicPicker ||
    showGiphyModal ||
    viewingNote ||
    showActivitySheet
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isAnyNoteOverlayOpen) {
      document.body.dataset.hideBottomNav = 'true';
    } else {
      delete document.body.dataset.hideBottomNav;
    }
    window.dispatchEvent(new CustomEvent('deepshop:bottom-nav-visibility'));
    return () => {
      delete document.body.dataset.hideBottomNav;
      window.dispatchEvent(new CustomEvent('deepshop:bottom-nav-visibility'));
    };
  }, [isAnyNoteOverlayOpen]);

  // Global event listener to open Note Creator when triggered elsewhere in app (e.g. NewMessageModal)
  useEffect(() => {
    const handleOpenCustomNote = (e: any) => {
      handleOpenCreator(e?.detail?.replaceExisting || false);
    };
    const handleOpenCustomViewer = (e: any) => {
      if (e?.detail) {
        setViewingNote(e.detail);
      }
    };
    window.addEventListener('open_note_creator', handleOpenCustomNote);
    window.addEventListener('open_note_viewer', handleOpenCustomViewer);
    return () => {
      window.removeEventListener('open_note_creator', handleOpenCustomNote);
      window.removeEventListener('open_note_viewer', handleOpenCustomViewer);
    };
  }, [myNote]);

  // Auto-play attached music immediately when viewing a Note
  useEffect(() => {
    setNoteReplyText('');
    if (!viewingNote) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingAudioUrl(null);
      return;
    }
    const url = viewingNote.musicAudioUrl;
    if (!url) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingAudioUrl(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingAudioUrl(url);
    audio.play().catch(() => {
      setPlayingAudioUrl(null);
    });
    audio.onended = () => setPlayingAudioUrl(null);
    return () => {
      audio.pause();
    };
  }, [viewingNote?.userId, viewingNote?.musicAudioUrl]);

  // Audio helper
  const handleTogglePlayAudio = (url: string) => {
    if (playingAudioUrl === url) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingAudioUrl(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play().catch(() => {});
      audio.onended = () => setPlayingAudioUrl(null);
      setPlayingAudioUrl(url);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Open note creator
  const handleOpenCreator = (replaceExisting: boolean = false) => {
    if (myNote && !replaceExisting) {
      setViewingNote(myNote);
      return;
    }

    if (myNote && replaceExisting) {
      setNoteText(myNote.text || '');
      setSelectedMoods(myNote.moodEmojis || []);
      setSelectedGifUrl(myNote.gifUrl || '');
      setSelectedMusic(
        myNote.musicTitle
          ? {
              title: myNote.musicTitle,
              artist: myNote.musicArtist || '',
              cover: myNote.musicCover || '',
              audioUrl: myNote.musicAudioUrl || ''
            }
          : DEFAULT_NOTE_TRACKS[0]
      );
      setNoteAudience(myNote.audience || 'friends');
      setNoteDurationHours(myNote.durationHours || 24);
    } else {
      setNoteText('');
      setSelectedMoods([]);
      setSelectedGifUrl('');
      setSelectedMusic(DEFAULT_NOTE_TRACKS[0]);
      setNoteAudience('friends');
      setNoteDurationHours(24);
    }
    setViewingNote(null);
    setShowNoteCreator(true);
  };

  // Share Note (Writes to real Firestore `user_notes`)
  const handleShareNote = async () => {
    if (!currentUser) {
      notify('Please sign in to share a note', 'error');
      return;
    }
    if (!noteText.trim()) {
      notify('Please write a thought for your note', 'error');
      return;
    }

    setIsSaving(true);
    triggerHaptic();
    try {
      const nowMs = Date.now();
      const expiresAtMs = nowMs + noteDurationHours * 60 * 60 * 1000;

      const notePayload: UserNoteData = {
        userId: currentUser.uid,
        displayName: currentUser.displayName || 'You',
        photoURL: currentUser.photoURL || '',
        text: noteText.trim().slice(0, 60),
        moodEmojis: selectedMoods.slice(0, 3),
        gifUrl: selectedGifUrl || '',
        musicTitle: selectedMusic?.title || '',
        musicArtist: selectedMusic?.artist || '',
        musicCover: selectedMusic?.cover || '',
        musicAudioUrl: selectedMusic?.audioUrl || '',
        audience: noteAudience,
        durationHours: noteDurationHours,
        createdAtMs: nowMs,
        expiresAtMs: expiresAtMs,
        reactions: myNote?.reactions || {},
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'user_notes', currentUser.uid), notePayload);
      setMyNote(notePayload);
      notify('Note shared successfully!', 'success');
      setShowNoteCreator(false);
    } catch (e: any) {
      console.error('Error saving note:', e);
      notify('Failed to share note. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete note (Strictly Admin only)
  const handleDeleteNote = async (noteId?: string) => {
    if (!isAdmin) {
      notify('Only admins can delete notes', 'error');
      return;
    }
    const targetId = noteId || currentUser?.uid;
    if (!targetId) return;
    triggerHaptic();
    try {
      await deleteDoc(doc(db, 'user_notes', targetId));
      if (targetId === currentUser?.uid) {
        setMyNote(null);
      }
      setViewingNote(null);
      setShowOptionsMenu(false);
      setShowNoteCreator(false);
      notify('Note deleted', 'info');
    } catch (e) {
      console.error('Error deleting note:', e);
      notify('Failed to delete note', 'error');
    }
  };

  // Reply to Note -> sends real DM in p2p_chats + push notification
  const handleReplyToNote = async (note: UserNoteData) => {
    const trimmed = noteReplyText.trim();
    if (!trimmed) return;
    if (!currentUser?.uid) {
      notify('Please sign in to reply', 'error');
      return;
    }
    if (!note?.userId || note.userId === currentUser.uid) return;

    setIsSendingReply(true);
    triggerHaptic();
    try {
      const qExisting = query(
        collection(db, 'p2p_chats'),
        where('participants', 'array-contains', currentUser.uid)
      );
      const snapExisting = await getDocs(qExisting);
      let chatId = '';
      const foundDoc = snapExisting.docs.find((d) => {
        const data = d.data();
        const p = data.participants;
        return Array.isArray(p) && p.includes(note.userId) && !data.isGroup && data.type !== 'group';
      });
      if (foundDoc) {
        chatId = foundDoc.id;
      }

      const lastMsgPreview = `Replied to your note: ${trimmed}`.slice(0, 140);
      if (!chatId) {
        const chatRef = await addDoc(collection(db, 'p2p_chats'), {
          participants: [currentUser.uid, note.userId],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: lastMsgPreview,
          lastSenderId: currentUser.uid,
          seenBy: [currentUser.uid]
        });
        chatId = chatRef.id;
      }

      const senderName =
        currentUser.displayName || currentUser.email?.split('@')[0] || 'Friend';
      await Promise.all([
        addDoc(collection(db, 'p2p_chats', chatId, 'messages'), {
          text: trimmed,
          senderId: currentUser.uid,
          senderName,
          senderPhoto: currentUser.photoURL || '',
          createdAt: Date.now(),
          timestamp: serverTimestamp(),
          seenBy: [currentUser.uid],
          noteReply: {
            noteText: note.text,
            noteOwnerId: note.userId,
            noteOwnerName: note.displayName || 'Friend'
          }
        }),
        updateDoc(doc(db, 'p2p_chats', chatId), {
          updatedAt: serverTimestamp(),
          lastMessage: lastMsgPreview,
          lastSenderId: currentUser.uid,
          seenBy: [currentUser.uid]
        }).catch(() => {})
      ]);

      sendPushNotification(note.userId, {
        title: `${senderName} replied to your note`,
        body: trimmed,
        url: `/messages?chatId=${chatId}`
      });

      setNoteReplyText('');
      notify('Reply sent to Messages', 'success');
    } catch (e) {
      console.error('Error replying to note:', e);
      notify('Failed to send reply', 'error');
    } finally {
      setIsSendingReply(false);
    }
  };

  // React to Note (Firestore reactions map)
  const handleReactToNote = async (note: UserNoteData, emoji: string) => {
    if (!currentUser) {
      notify('Please sign in to react', 'error');
      return;
    }
    triggerHaptic();
    try {
      const updatedReactions = {
        ...(note.reactions || {}),
        [currentUser.uid]: {
          emoji,
          userName: currentUser.displayName || 'Friend',
          userAvatar: currentUser.photoURL || '',
          createdAtMs: Date.now()
        }
      };

      await setDoc(
        doc(db, 'user_notes', note.userId),
        { reactions: updatedReactions },
        { merge: true }
      );

      const updated = { ...note, reactions: updatedReactions };
      setViewingNote(updated);
      setAllNotes((prev) => ({ ...prev, [note.userId]: updated }));
      if (note.userId === currentUser.uid) {
        setMyNote(updated);
      }
      notify(`Reacted with ${emoji}`, 'success');
    } catch (e) {
      console.error('Error reacting to note:', e);
    }
  };

  const formatExpiresIn = (expiresAtMs?: number) => {
    if (!expiresAtMs) return '24h';
    const remainingMs = expiresAtMs - Date.now();
    if (remainingMs <= 0) return 'Expired';
    const hours = Math.ceil(remainingMs / (1000 * 60 * 60));
    return `${hours}h`;
  };

  return (
    <>
      {!hideBar && (
        <div className="w-full border-b border-zinc-100 dark:border-zinc-800/80 py-3 px-3.5 bg-white dark:bg-[#121214] select-none">
          {/* Horizontal Story / Note Avatars Row (IMG_4006 & IMG_5573) */}
          <div className="flex items-start gap-4 overflow-x-auto no-scrollbar scroll-smooth">
        {/* ======================================================== */}
        {/* ITEM 1: "Your note" (Pure White Pill in Light Mode) */}
        {/* ======================================================== */}
        <div
          onClick={() => handleOpenCreator(false)}
          className="flex flex-col items-center shrink-0 cursor-pointer group"
        >
          {/* Speech Bubble Pill: Pure White Cloud in Light Mode */}
          <div className="h-8 mb-1.5 flex items-center justify-center">
            {myNote?.text ? (
              <div className="relative max-w-[104px] px-3 py-1 rounded-[18px] text-[11px] font-semibold text-zinc-900 dark:text-white bg-white dark:bg-[#2C2D31] border border-zinc-200/80 dark:border-white/10 shadow-[0_4px_14px_rgba(0,0,0,0.08)] leading-tight text-center flex items-center gap-1 group-hover:scale-105 transition">
                {myNote.musicTitle && (
                  <span className="flex items-end gap-[1.5px] h-2.5 shrink-0" aria-hidden="true">
                    <span className="w-[2px] h-1.5 bg-[#0064E0] rounded-full animate-pulse" />
                    <span className="w-[2px] h-2.5 bg-[#0064E0] rounded-full animate-pulse [animation-delay:150ms]" />
                    <span className="w-[2px] h-1 bg-[#0064E0] rounded-full animate-pulse [animation-delay:300ms]" />
                  </span>
                )}
                {myNote.moodEmojis && myNote.moodEmojis.length > 0 && (
                  <span className="text-[10px] shrink-0">{myNote.moodEmojis[0]}</span>
                )}
                <span className="truncate">{myNote.text}</span>
                {/* Staggered 2-circle comic cloud tail */}
                <span className="absolute -bottom-[6px] left-3.5 w-2.5 h-2.5 rounded-full bg-white dark:bg-[#2C2D31] border border-zinc-200/80 dark:border-white/10 shadow-xs pointer-events-none" />
                <span className="absolute -bottom-[11px] left-2.5 w-1.5 h-1.5 rounded-full bg-white dark:bg-[#2C2D31] border border-zinc-200/80 dark:border-white/10 shadow-xs pointer-events-none" />
              </div>
            ) : (
              <div className="relative px-3 py-1 rounded-[18px] bg-white dark:bg-[#2C2D31] text-[11px] font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10 shadow-[0_4px_14px_rgba(0,0,0,0.08)] leading-tight text-center group-hover:scale-105 transition">
                <span>Note...</span>
                <span className="absolute -bottom-[6px] left-3.5 w-2.5 h-2.5 rounded-full bg-white dark:bg-[#2C2D31] border border-zinc-200/80 dark:border-white/10 shadow-xs pointer-events-none" />
                <span className="absolute -bottom-[11px] left-2.5 w-1.5 h-1.5 rounded-full bg-white dark:bg-[#2C2D31] border border-zinc-200/80 dark:border-white/10 shadow-xs pointer-events-none" />
              </div>
            )}
          </div>

          {/* User Avatar Circle */}
          <div className="relative w-15 h-15 rounded-full p-0.5 bg-zinc-200 dark:bg-zinc-800 shadow-sm transition-transform group-hover:scale-105 active:scale-95">
            <div className="w-full h-full rounded-full overflow-hidden bg-zinc-300 dark:bg-zinc-700">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="You"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-zinc-600 dark:text-zinc-300 text-base">
                  {(currentUser?.displayName || 'Y')[0]?.toUpperCase()}
                </div>
              )}
            </div>

            {/* Plus / Add Note Badge */}
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#0064E0] text-white flex items-center justify-center border-2 border-white dark:border-[#121214] shadow-xs">
              <Plus className="w-3 h-3 stroke-[3]" />
            </div>
          </div>

          {/* Label underneath */}
          <span className="text-xs font-semibold text-zinc-900 dark:text-white mt-1">
            Your note
          </span>
        </div>

        {/* ======================================================== */}
        {/* OTHER USERS WITH REAL ACTIVE NOTES (Pure White Cloud Pills) */}
        {/* ======================================================== */}
        {Object.values(allNotes)
          .filter((note) => !currentUser?.uid || note.userId !== currentUser.uid)
          .map((note) => (
            <div
              key={`user-note-${note.userId}`}
              onClick={() => {
                triggerHaptic();
                setViewingNote(note);
              }}
              className="flex flex-col items-center shrink-0 cursor-pointer group"
            >
              {/* Friend's thought bubble: Pure White Cloud in Light Mode */}
              <div className="h-8 mb-1.5 flex items-center justify-center">
                <div className="relative max-w-[104px] px-3 py-1 rounded-[18px] text-[11px] font-semibold text-zinc-900 dark:text-white bg-white dark:bg-[#2C2D31] border border-zinc-200/80 dark:border-white/10 shadow-[0_4px_14px_rgba(0,0,0,0.08)] leading-tight text-center flex items-center gap-1 group-hover:scale-105 transition">
                  {note.musicTitle && (
                    <span className="flex items-end gap-[1.5px] h-2.5 shrink-0" aria-hidden="true">
                      <span className="w-[2px] h-1.5 bg-[#0064E0] rounded-full animate-pulse" />
                      <span className="w-[2px] h-2.5 bg-[#0064E0] rounded-full animate-pulse [animation-delay:150ms]" />
                      <span className="w-[2px] h-1 bg-[#0064E0] rounded-full animate-pulse [animation-delay:300ms]" />
                    </span>
                  )}
                  {note.moodEmojis && note.moodEmojis.length > 0 && (
                    <span className="text-[10px] shrink-0">{note.moodEmojis[0]}</span>
                  )}
                  <span className="truncate">{note.text}</span>
                  <span className="absolute -bottom-[6px] left-3.5 w-2.5 h-2.5 rounded-full bg-white dark:bg-[#2C2D31] border border-zinc-200/80 dark:border-white/10 shadow-xs pointer-events-none" />
                  <span className="absolute -bottom-[11px] left-2.5 w-1.5 h-1.5 rounded-full bg-white dark:bg-[#2C2D31] border border-zinc-200/80 dark:border-white/10 shadow-xs pointer-events-none" />
                </div>
              </div>

              {/* Friend Avatar */}
              <div className="relative w-15 h-15 rounded-full p-0.5 bg-gradient-to-tr from-[#0064E0] to-sky-400 shadow-sm transition-transform group-hover:scale-105 active:scale-95">
                <div className="w-full h-full rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                  {note.photoURL ? (
                    <img src={note.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-300 text-sm">
                      {(note.displayName || 'U')[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              {/* Friend Name */}
              <span className="text-xs font-semibold text-zinc-900 dark:text-white mt-1 truncate max-w-[72px]">
                {note.displayName?.split(' ')[0] || 'Friend'}
              </span>
            </div>
          ))}

        {/* Online contacts without notes */}
        {onlineUsers
          .filter((friend) => {
            const fid = friend.id || friend.uid;
            return !allNotes[fid] && (!currentUser?.uid || fid !== currentUser.uid);
          })
          .slice(0, 10)
          .map((friend) => (
            <div
              key={`online-friend-${friend.id || friend.uid}`}
              onClick={() => onOpenChatWithUser && onOpenChatWithUser(friend)}
              className="flex flex-col items-center shrink-0 cursor-pointer group"
            >
              <div className="h-7 mb-1.5" />
              <div className="relative w-15 h-15 rounded-full p-0.5 bg-zinc-200 dark:bg-zinc-800 shadow-sm transition-transform group-hover:scale-105 active:scale-95">
                <div className="w-full h-full rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                  {friend.photoURL ? (
                    <img src={friend.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-300 text-sm">
                      {(friend.displayName || friend.shopName || 'U')[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                {Boolean(friend.isOnline) && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#121214]" />
                )}
              </div>
              <span className="text-xs font-semibold text-zinc-900 dark:text-white mt-1 truncate max-w-[72px]">
                {friend.displayName?.split(' ')[0] || 'Friend'}
              </span>
            </div>
          ))}
      </div>
    </div>
  )}

      {/* ========================================================================= */}
      {/* 1. NEW NOTE CREATOR MODAL (Portaled above BottomNav) */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showNoteCreator && (
            <div className="fixed inset-0 z-[10020] flex flex-col bg-white dark:bg-[#121214] text-zinc-900 dark:text-white font-sans animate-fadeIn">
            {/* Top Bar: Close (X) | "New note" | "Share" */}
            <div className="p-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={() => setShowNoteCreator(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
              >
                <X className="w-6 h-6 stroke-[2.5]" />
              </button>

              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                New note
              </h2>

              <button
                type="button"
                onClick={handleShareNote}
                disabled={!noteText.trim() || isSaving}
                className={cn(
                  "font-bold text-base transition px-2 py-1 rounded-lg cursor-pointer",
                  noteText.trim() && !isSaving
                    ? "text-[#0064E0] hover:opacity-80 active:scale-95"
                    : "text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
                )}
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Share'}
              </button>
            </div>

            {/* Center Stage: Floating Thought Bubble + Avatar + 3 Circle Buttons + Strip */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 relative max-w-md mx-auto w-full">
              <div className="relative flex flex-col items-center w-full">
                {/* Floating Thought Bubble: Pure White in Light Mode with Thought Dots */}
                <motion.div
                  initial={{ scale: 0.95, y: 8 }}
                  animate={{ scale: 1, y: 0 }}
                  className="relative mb-4 w-full max-w-[280px] p-4 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.09)] bg-white dark:bg-[#1E1F23] border border-zinc-200/90 dark:border-white/10 flex flex-col items-center"
                >
                  <textarea
                    autoFocus
                    maxLength={60}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Share a thought..."
                    rows={2}
                    className="w-full bg-transparent text-base font-semibold text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none text-center resize-none leading-relaxed"
                  />

                  {/* Character Counter */}
                  <span className="text-[10px] text-zinc-400 self-end mt-1 font-medium">
                    {noteText.length}/60
                  </span>

                  {/* Attached GIF preview if selected */}
                  {selectedGifUrl && (
                    <div className="mt-2 w-28 h-28 rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/10 relative">
                      <img src={selectedGifUrl} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setSelectedGifUrl('')}
                        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/75 text-white flex items-center justify-center text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Thought Bubble Dots pointing down to Avatar (IMG_5573) */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className="w-3.5 h-3.5 rounded-full bg-white dark:bg-[#1E1F23] border border-zinc-200/80 dark:border-white/10 shadow-xs" />
                    <span className="w-2 h-2 rounded-full bg-white dark:bg-[#1E1F23] border border-zinc-200/80 dark:border-white/10 mt-0.5 shadow-xs" />
                  </div>
                </motion.div>

                {/* Avatar */}
                <div className="relative w-32 h-32 rounded-full p-1 bg-zinc-100 dark:bg-zinc-800 shadow-xl border-2 border-white dark:border-zinc-800">
                  <div className="w-full h-full rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700">
                    {currentUser?.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-3xl text-zinc-600 dark:text-zinc-300">
                        {(currentUser?.displayName || 'Y')[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3 Circular Action Buttons (Exact IMG_5573) */}
                <div className="flex items-center justify-center gap-4 mt-6">
                  {/* 1. Music Button */}
                  <button
                    type="button"
                    onClick={() => setShowMusicPicker(true)}
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs",
                      selectedMusic
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    )}
                    title="Add music"
                  >
                    <Music className="w-5 h-5 stroke-[2.2]" />
                  </button>

                  {/* 2. GIF Button */}
                  <button
                    type="button"
                    onClick={() => setShowGiphyModal(true)}
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs",
                      selectedGifUrl
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    )}
                    title="Add GIF"
                  >
                    <span className="text-[12px] font-black tracking-wider">GIF</span>
                  </button>

                  {/* 3. Mood Smiley Button */}
                  <button
                    type="button"
                    onClick={() => setShowMoodPicker(true)}
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs",
                      selectedMoods.length > 0
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    )}
                    title="Choose mood"
                  >
                    <Smile className="w-5 h-5 stroke-[2.2]" />
                  </button>
                </div>

                {/* Horizontal Features Strip: Recent Emojis + Music Chip (Exact IMG_5573) */}
                <div className="flex items-center gap-2.5 mt-5 max-w-full overflow-x-auto no-scrollbar py-1">
                  {/* Recent Emojis: 😂, 🥰, 🙂 */}
                  {['😂', '🥰', '🙂'].map((emoji) => {
                    const isSelected = selectedMoods.includes(emoji);
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          if (isSelected) {
                            setSelectedMoods((prev) => prev.filter((e) => e !== emoji));
                          } else {
                            setSelectedMoods((prev) => [...prev.slice(-2), emoji]);
                          }
                        }}
                        className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition cursor-pointer shrink-0 border",
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-950/40 border-[#0064E0] scale-105"
                            : "bg-[#F2F3F5] dark:bg-zinc-800/80 border-transparent hover:bg-zinc-200/80 dark:hover:bg-zinc-700"
                        )}
                      >
                        {emoji}
                      </button>
                    );
                  })}

                  {/* Selected Music Pill Chip (Exact IMG_5573) */}
                  {selectedMusic ? (
                    <div
                      onClick={() => setShowMusicPicker(true)}
                      className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-2xl bg-[#F2F3F5] dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 shrink-0 cursor-pointer hover:bg-zinc-200/80 transition"
                    >
                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-zinc-300 dark:bg-zinc-700 relative shrink-0">
                        {selectedMusic.cover ? (
                          <img src={selectedMusic.cover} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Music className="w-5 h-5 m-auto text-zinc-500" />
                        )}
                        {selectedMusic.audioUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePlayAudio(selectedMusic.audioUrl);
                            }}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center text-white"
                          >
                            {playingAudioUrl === selectedMusic.audioUrl ? (
                              <Pause className="w-3.5 h-3.5 fill-white" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                            )}
                          </button>
                        )}
                      </div>
                      <div className="text-left max-w-[130px] truncate">
                        <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                          {selectedMusic.title}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate">
                          {selectedMusic.artist}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowMusicPicker(true)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-[#F2F3F5] dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 shrink-0"
                    >
                      <Music className="w-4 h-4 text-zinc-500" />
                      <span>Add music</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Footer Notice (Exact IMG_5573) */}
            <div className="p-4 pb-8 text-center text-xs text-zinc-500 border-t border-zinc-100 dark:border-zinc-800/80">
              <p>
                Friends can see your note on Loops for {noteDurationHours} hours.{' '}
                <button
                  type="button"
                  onClick={() => setShowNoteSettings(true)}
                  className="font-bold text-[#0064E0] hover:underline cursor-pointer"
                >
                  Change
                </button>
              </p>
            </div>
          </div>
        )}
      </AnimatePresence>
      , document.body
      )}

      {/* ========================================================================= */}
      {/* 2. NOTE SETTINGS SHEET (Portaled above BottomNav) */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showNoteSettings && (
            <div className="fixed inset-0 z-[10030] flex flex-col bg-[#F2F2F7] dark:bg-black font-sans animate-fadeIn">
            {/* Header: Cancel | Note settings | Save */}
            <div className="p-4 flex items-center justify-between bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowNoteSettings(false)}
                className="text-base text-[#0064E0] font-medium cursor-pointer"
              >
                Cancel
              </button>

              <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                Note settings
              </h3>

              <button
                type="button"
                onClick={() => setShowNoteSettings(false)}
                className="text-base text-[#0064E0] font-bold cursor-pointer"
              >
                Save
              </button>
            </div>

            {/* Settings Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 max-w-lg mx-auto w-full">
              {/* Section 1: Who can see your note? */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-500 uppercase px-2">
                  Who can see your note?
                </span>

                <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800">
                  <div
                    onClick={() => setNoteAudience('public')}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <div>
                      <p className="font-semibold text-sm text-zinc-900 dark:text-white">Public</p>
                      <p className="text-xs text-zinc-500">Anyone on Loops</p>
                    </div>
                    {noteAudience === 'public' && <Check className="w-5 h-5 text-[#0064E0] stroke-[2.5]" />}
                  </div>

                  <div
                    onClick={() => setNoteAudience('friends_connections')}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <div>
                      <p className="font-semibold text-sm text-zinc-900 dark:text-white">Friends and connections</p>
                      <p className="text-xs text-zinc-500">Your Loops friends and connections</p>
                    </div>
                    {noteAudience === 'friends_connections' && <Check className="w-5 h-5 text-[#0064E0] stroke-[2.5]" />}
                  </div>

                  <div
                    onClick={() => setNoteAudience('friends')}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <div>
                      <p className="font-semibold text-sm text-zinc-900 dark:text-white">Friends</p>
                      <p className="text-xs text-zinc-500">Your Loops friends</p>
                    </div>
                    {noteAudience === 'friends' && <Check className="w-5 h-5 text-[#0064E0] stroke-[2.5]" />}
                  </div>

                  <div
                    onClick={() => setNoteAudience('custom')}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <div>
                      <p className="font-semibold text-sm text-zinc-900 dark:text-white">Custom</p>
                      <p className="text-xs text-zinc-500">Choose who can see your note</p>
                    </div>
                    {noteAudience === 'custom' && <Check className="w-5 h-5 text-[#0064E0] stroke-[2.5]" />}
                  </div>

                  <div className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <p className="font-semibold text-sm text-zinc-900 dark:text-white">Hide note from</p>
                    <div className="flex items-center gap-1 text-xs text-zinc-400">
                      <span>0 people</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 px-2">
                  Your note will be visible on Loops.
                </p>
              </div>

              {/* Section 2: Show note for */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-500 uppercase px-2">
                  Show note for
                </span>

                <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800">
                  {[
                    { label: '24 hours', val: 24 },
                    { label: '12 hours', val: 12 },
                    { label: '6 hours', val: 6 },
                    { label: '3 hours', val: 3 }
                  ].map((dur) => (
                    <div
                      key={dur.val}
                      onClick={() => setNoteDurationHours(dur.val)}
                      className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <p className="font-semibold text-sm text-zinc-900 dark:text-white">{dur.label}</p>
                      {noteDurationHours === dur.val && (
                        <Check className="w-5 h-5 text-[#0064E0] stroke-[2.5]" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
      , document.body
      )}

      {/* ========================================================================= */}
      {/* 3. MOOD EMOJI PICKER (Portaled above BottomNav) */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showMoodPicker && (
            <div className="fixed inset-0 z-[10030] flex flex-col bg-white dark:bg-[#121214] font-sans animate-fadeIn">
            {/* Header: X | New note | Share */}
            <div className="p-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={() => setShowMoodPicker(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition active:scale-95"
              >
                <X className="w-6 h-6 stroke-[2.5]" />
              </button>

              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                New note
              </h2>

              <button
                type="button"
                onClick={() => setShowMoodPicker(false)}
                className="font-bold text-base text-[#0064E0] cursor-pointer"
              >
                Done
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col items-center max-w-md mx-auto w-full">
              {/* Subtitle (Exact IMG_5577) */}
              <p className="text-sm font-bold text-zinc-900 dark:text-white pt-4 pb-2 px-6 text-center">
                Choose up to three emojis to reveal your mood:
              </p>

              {/* Avatar with Thought Bubble & 3 Emoji Slots (Exact IMG_5577) */}
              <div className="relative flex flex-col items-center my-4">
                {/* Thought Bubble with "Mood" and 3 Circle Slots */}
                <div className="relative mb-3 px-5 py-3 rounded-3xl bg-white dark:bg-zinc-800 shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-zinc-200/90 dark:border-zinc-700 flex flex-col items-center min-w-[180px]">
                  {/* Top Close Icon inside bubble (Exact IMG_5577) */}
                  <button
                    type="button"
                    onClick={() => setSelectedMoods([])}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-zinc-500 text-white flex items-center justify-center text-xs shadow-xs hover:bg-zinc-600 transition"
                  >
                    ✕
                  </button>

                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-2">Mood</span>

                  {/* 3 Emoji Slots (Exact IMG_5577) */}
                  <div className="flex items-center gap-2">
                    {[0, 1, 2].map((slotIdx) => {
                      const emoji = selectedMoods[slotIdx];
                      return (
                        <div
                          key={slotIdx}
                          onClick={() => {
                            if (emoji) {
                              setSelectedMoods((prev) => prev.filter((_, idx) => idx !== slotIdx));
                            }
                          }}
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-lg cursor-pointer transition",
                            emoji
                              ? "bg-zinc-100 dark:bg-zinc-700 shadow-xs hover:scale-105"
                              : "border border-zinc-300 dark:border-zinc-600 text-zinc-400"
                          )}
                        >
                          {emoji || '😊'}
                        </div>
                      );
                    })}
                  </div>

                  {/* Connector dots */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className="w-3 h-3 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 shadow-xs" />
                  </div>
                </div>

                {/* Avatar */}
                <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 shadow-xl border-2 border-white dark:border-zinc-800">
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-2xl">
                      {(currentUser?.displayName || 'Y')[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              {/* Notice under avatar */}
              <p className="text-[11px] text-zinc-500 text-center px-4 mb-4">
                Friends can see your note on Loops for 24 hours.{' '}
                <button
                  type="button"
                  onClick={() => setShowNoteSettings(true)}
                  className="font-bold text-[#0064E0]"
                >
                  Change
                </button>
              </p>

              {/* Search emoji input (Exact IMG_5577) */}
              <div className="w-full px-4 mb-2">
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#F2F3F5] dark:bg-zinc-800/90 border border-zinc-200/60 dark:border-zinc-700">
                  <Search className="w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search emoji"
                    className="w-full bg-transparent text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Full Emoji Keyboard Grid (Exact IMG_5577) */}
              <div className="w-full px-4 py-2 grid grid-cols-9 gap-y-3 gap-x-1 text-center">
                {KEYBOARD_EMOJIS_LIST.map((emoji, idx) => {
                  const isSelected = selectedMoods.includes(emoji);
                  return (
                    <button
                      key={`emoji-kb-${idx}`}
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        if (isSelected) {
                          setSelectedMoods((prev) => prev.filter((e) => e !== emoji));
                        } else {
                          if (selectedMoods.length < 3) {
                            setSelectedMoods((prev) => [...prev, emoji]);
                          } else {
                            setSelectedMoods((prev) => [...prev.slice(1), emoji]);
                          }
                        }
                      }}
                      className={cn(
                        "text-2xl p-1 hover:scale-125 active:scale-95 transition cursor-pointer rounded-xl",
                        isSelected && "bg-blue-100 dark:bg-blue-950/40"
                      )}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
      , document.body
      )}

      {/* ========================================================================= */}
      {/* 4. NOTE VIEWER MODAL (Portaled, Auto-play music, Admin-only delete, Reply) */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {viewingNote && (
            <div className="fixed inset-0 z-[10060] flex flex-col bg-white dark:bg-[#121214] font-sans animate-fadeIn">
            {/* Top Bar: Author (Avatar + Name + "Just now") | "..." | "X" */}
            <div className="p-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700">
                  {viewingNote.photoURL ? (
                    <img src={viewingNote.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-sm">
                      {(viewingNote.displayName || 'U')[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white leading-tight">
                    {viewingNote.displayName}
                  </h3>
                  <span className="text-[11px] text-zinc-400">Just now</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 relative">
                {/* 3-dots Menu Button */}
                <button
                  type="button"
                  onClick={() => setShowOptionsMenu((prev) => !prev)}
                  className="w-10 h-10 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200 transition cursor-pointer"
                >
                  <MoreHorizontal className="w-6 h-6" />
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => {
                    setViewingNote(null);
                    setShowOptionsMenu(false);
                  }}
                  className="w-10 h-10 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200 transition cursor-pointer"
                >
                  <X className="w-6 h-6 stroke-[2.5]" />
                </button>

                {/* Options Menu Popover with Tail (Exact Screenshot IMG_5579.jpeg) */}
                <AnimatePresence>
                  {showOptionsMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 5 }}
                      className="absolute right-0 top-12 p-3 rounded-3xl bg-[#F2F3F5] dark:bg-zinc-900 shadow-2xl border border-zinc-200 dark:border-zinc-800 z-50 min-w-[200px]"
                    >
                      {/* Bubble tail pointing up to ... */}
                      <div className="absolute -top-2 right-4 w-0 h-0 border-x-6 border-x-transparent border-b-8 border-b-[#F2F3F5] dark:border-b-zinc-900" />

                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(viewingNote.userId)}
                          className="w-full py-3 px-6 rounded-2xl bg-[#E4E6EB] dark:bg-zinc-800 text-red-500 font-bold text-sm text-center hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                        >
                          Delete
                        </button>
                      ) : viewingNote.userId === currentUser?.uid ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowOptionsMenu(false);
                            handleOpenCreator(true);
                          }}
                          className="w-full py-3 px-6 rounded-2xl bg-[#E4E6EB] dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-sm text-center hover:bg-zinc-300 dark:hover:bg-zinc-700 transition cursor-pointer"
                        >
                          Replace Note
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            notify('Reported note', 'info');
                            setShowOptionsMenu(false);
                          }}
                          className="w-full py-3 px-6 rounded-2xl bg-[#E4E6EB] dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-sm text-center hover:bg-zinc-300 dark:hover:bg-zinc-700 transition cursor-pointer"
                        >
                          Report
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Center Area: Redesigned Pure White Cloud Thought Bubble + Avatar + Auto-playing Music */}
            <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full">
              <div className="relative flex flex-col items-center text-center">
                {/* Redesigned White Cloud Thought Bubble */}
                <div className="relative mb-5 px-6 py-3.5 rounded-[26px] bg-white dark:bg-zinc-800 shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-zinc-200/80 dark:border-zinc-700 flex flex-col items-center max-w-[290px]">
                  {viewingNote.moodEmojis && viewingNote.moodEmojis.length > 0 && (
                    <div className="flex items-center gap-1 mb-1 text-lg">
                      {viewingNote.moodEmojis.map((e, idx) => (
                        <span key={idx}>{e}</span>
                      ))}
                    </div>
                  )}
                  <p className="text-base font-semibold text-zinc-900 dark:text-white leading-relaxed">
                    {viewingNote.text}
                  </p>
                  {/* Staggered Cloud Connector Circles */}
                  <span className="w-3.5 h-3.5 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 shadow-xs absolute -bottom-2.5 left-8 pointer-events-none" />
                  <span className="w-2 h-2 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 shadow-xs absolute -bottom-4 left-6 pointer-events-none" />
                </div>

                {/* Large Avatar */}
                <div className="w-32 h-32 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 shadow-xl border-2 border-white dark:border-zinc-800">
                  {viewingNote.photoURL ? (
                    <img src={viewingNote.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-3xl">
                      {(viewingNote.displayName || 'U')[0]?.toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Author Name */}
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white mt-4">
                  {viewingNote.displayName}
                </h2>

                {/* "Shared with Friends" & "Expires in 24h" (Exact IMG_5578) */}
                <p className="text-sm text-zinc-500 mt-1">
                  Shared with <span className="font-bold text-zinc-800 dark:text-zinc-200">Friends</span>
                </p>
                <p className="text-sm text-zinc-400 mt-0.5">
                  Expires in {formatExpiresIn(viewingNote.expiresAtMs)}
                </p>

                {/* Attached Music Chip with Auto-play + Spinning Vinyl Cover + 4-bar Equalizer */}
                {viewingNote.musicTitle && (
                  <div className="mt-4 flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-[#F2F3F5] dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700 shadow-xs">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full overflow-hidden bg-zinc-300 dark:bg-zinc-700 relative shrink-0 ring-2 ring-white dark:ring-zinc-900",
                        playingAudioUrl === viewingNote.musicAudioUrl && "animate-[spin_6s_linear_infinite]"
                      )}
                    >
                      {viewingNote.musicCover ? (
                        <img src={viewingNote.musicCover} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Music className="w-5 h-5 m-auto text-zinc-500" />
                      )}
                      {viewingNote.musicAudioUrl && (
                        <button
                          type="button"
                          onClick={() => handleTogglePlayAudio(viewingNote.musicAudioUrl!)}
                          className="absolute inset-0 bg-black/35 flex items-center justify-center text-white cursor-pointer"
                          aria-label="Toggle music"
                        >
                          {playingAudioUrl === viewingNote.musicAudioUrl ? (
                            <Pause className="w-3.5 h-3.5 fill-white" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                          )}
                        </button>
                      )}
                    </div>
                    <div className="text-left min-w-0 max-w-[165px]">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                        {viewingNote.musicTitle}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate">
                        {viewingNote.musicArtist || 'Music track'}
                      </p>
                    </div>
                    {/* 4-Bar Animated Music Equalizer */}
                    <div className="flex items-end gap-[2.5px] h-4 px-1 shrink-0" aria-hidden="true">
                      {[0, 1, 2, 3].map((barIdx) => (
                        <motion.span
                          key={barIdx}
                          className="w-[2.5px] rounded-full bg-[#0064E0]"
                          animate={
                            playingAudioUrl === viewingNote.musicAudioUrl
                              ? { height: ['4px', '15px', '7px', '14px', '5px'] }
                              : { height: '5px' }
                          }
                          transition={
                            playingAudioUrl === viewingNote.musicAudioUrl
                              ? {
                                  duration: 0.85,
                                  repeat: Infinity,
                                  repeatType: 'reverse',
                                  delay: barIdx * 0.14
                                }
                              : { duration: 0.2 }
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Attached GIF (if present) */}
                {viewingNote.gifUrl && (
                  <img
                    src={viewingNote.gifUrl}
                    alt=""
                    className="mt-4 max-h-36 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-700 shadow-sm"
                  />
                )}

                {/* Reactions Pill Counter */}
                {viewingNote.reactions && Object.keys(viewingNote.reactions).length > 0 && (
                  <div
                    onClick={() => setShowActivitySheet(true)}
                    className="mt-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 cursor-pointer hover:bg-zinc-200 transition"
                  >
                    <div className="flex -space-x-1">
                      {Object.values(viewingNote.reactions).slice(0, 3).map((r, i) => (
                        <span key={i} className="text-base">{r.emoji}</span>
                      ))}
                    </div>
                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                      {Object.keys(viewingNote.reactions).length}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Note Reactions Bar: "note aa react dite parbe" */}
            <div className="px-6 py-2 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center justify-around max-w-md mx-auto">
                {['❤️', '😂', '😮', '😢', '🔥', '👍', '👏', '🥳'].map((emoji) => {
                  const hasReacted = viewingNote.reactions?.[currentUser?.uid]?.emoji === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleReactToNote(viewingNote, emoji)}
                      className={cn(
                        "text-2xl p-1.5 rounded-full hover:scale-125 active:scale-95 transition cursor-pointer",
                        hasReacted && "bg-blue-100 dark:bg-blue-950/60 ring-2 ring-[#0064E0]"
                      )}
                      title={`React ${emoji}`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions Bar: Own note -> Activity + Replace; Friend note -> Reply DM Input */}
            <div className="p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] border-t border-zinc-100 dark:border-zinc-800/80 bg-white dark:bg-[#121214]">
              {viewingNote.userId === currentUser?.uid ? (
                <div className="flex items-center justify-around max-w-md mx-auto">
                  <button
                    type="button"
                    onClick={() => setShowActivitySheet(true)}
                    className="flex flex-col items-center gap-1 text-zinc-900 dark:text-white cursor-pointer group hover:opacity-80 transition"
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <User className="w-5 h-5 fill-current" />
                    </div>
                    <span className="text-xs font-bold">See activity</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenCreator(true)}
                    className="flex flex-col items-center gap-1 text-zinc-900 dark:text-white cursor-pointer group hover:opacity-80 transition"
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <PlusCircle className="w-5 h-5 fill-current" />
                    </div>
                    <span className="text-xs font-bold">Replace note</span>
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleReplyToNote(viewingNote);
                  }}
                  className="flex items-center gap-2 max-w-md mx-auto"
                >
                  <input
                    type="text"
                    value={noteReplyText}
                    onChange={(e) => setNoteReplyText(e.target.value)}
                    placeholder={`Reply to ${viewingNote.displayName?.split(' ')[0] || 'Friend'}'s note...`}
                    className="flex-1 h-11 px-4 rounded-full bg-[#F2F3F5] dark:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-[#0064E0]"
                  />
                  <button
                    type="submit"
                    disabled={!noteReplyText.trim() || isSendingReply}
                    className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition cursor-pointer",
                      noteReplyText.trim() && !isSendingReply
                        ? "bg-[#0064E0] text-white hover:bg-[#0057C2] active:scale-95"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                    )}
                    aria-label="Send note reply"
                  >
                    {isSendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
      , document.body
      )}

      {/* ========================================================================= */}
      {/* 5. "SEE ACTIVITY" SHEET (Portaled above BottomNav) */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showActivitySheet && viewingNote && (
            <div className="fixed inset-0 z-[10070] flex flex-col bg-white dark:bg-[#121214] font-sans animate-fadeIn">
            {/* Top Bar: Done (Right) (Exact IMG_5580) */}
            <div className="p-4 flex items-center justify-end border-b border-zinc-100 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={() => setShowActivitySheet(false)}
                className="text-base text-[#0064E0] font-bold cursor-pointer"
              >
                Done
              </button>
            </div>

            {/* Note Center Display (Exact IMG_5580) */}
            <div className="flex-1 overflow-y-auto p-4 max-w-md mx-auto w-full">
              <div className="flex flex-col items-center text-center my-6">
                {/* Speech Bubble */}
                <div className="relative mb-2 px-6 py-2.5 rounded-3xl bg-white dark:bg-zinc-800 shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-zinc-200/90 dark:border-zinc-700 flex flex-col items-center">
                  <p className="text-base font-semibold text-zinc-900 dark:text-white">
                    {viewingNote.text}
                  </p>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className="w-3 h-3 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 shadow-xs" />
                  </div>
                </div>

                {/* Avatar */}
                <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 shadow-lg border-2 border-white dark:border-zinc-800">
                  {viewingNote.photoURL ? (
                    <img src={viewingNote.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-2xl">
                      {(viewingNote.displayName || 'Y')[0]?.toUpperCase()}
                    </div>
                  )}
                </div>

                <h3 className="text-base font-bold text-zinc-900 dark:text-white mt-3">
                  {viewingNote.displayName}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Shared with <span className="font-bold text-zinc-700 dark:text-zinc-300">Friends</span>
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Expires in {formatExpiresIn(viewingNote.expiresAtMs)}
                </p>
              </div>

              {/* Reactions Section Header (Exact IMG_5580) */}
              <div className="mt-8 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                <h4 className="font-bold text-sm text-zinc-500 uppercase tracking-wider mb-3">
                  Reactions
                </h4>

                {viewingNote.reactions && Object.keys(viewingNote.reactions).length > 0 ? (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {Object.entries(viewingNote.reactions).map(([uid, r]) => (
                      <div key={uid} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700">
                            {r.userAvatar ? (
                              <img src={r.userAvatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-sm">
                                {r.userName[0]?.toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-zinc-900 dark:text-white">
                              {r.userName}
                            </p>
                            <span className="text-[11px] text-zinc-400">Reacted to note</span>
                          </div>
                        </div>
                        <span className="text-2xl">{r.emoji}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-zinc-500 py-3">
                    No one has reacted yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
      , document.body
      )}

      {/* ========================================================================= */}
      {/* 6. MUSIC SEARCH MODAL (Portaled above BottomNav) */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showMusicPicker && (
            <div className="fixed inset-0 z-[10030] flex flex-col bg-white dark:bg-[#121214] font-sans animate-fadeIn">
            {/* Search Bar + Cancel (Exact IMG_5575) */}
            <div className="p-4 flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#F2F3F5] dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700">
                <Search className="w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search music"
                  value={musicSearchQuery}
                  onChange={(e) => setMusicSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none"
                />
                {musicSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setMusicSearchQuery('')}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowMusicPicker(false)}
                className="text-base text-[#0064E0] font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Tracks List (Real Loops tracks + Default tracks) */}
            <div className="flex-1 overflow-y-auto p-4 max-w-md mx-auto w-full divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {availableMusicTracks.length === 0 ? (
                <div className="py-14 text-center text-zinc-400">
                  <Music className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                  <p className="text-sm font-semibold">No music tracks found</p>
                </div>
              ) : (
                availableMusicTracks.map((track) => (
                  <div
                    key={track.id || track.audioUrl}
                    onClick={() => {
                      setSelectedMusic(track);
                      setShowMusicPicker(false);
                      notify(`Added ${track.title}`, 'success');
                    }}
                    className="py-3 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 px-2 rounded-2xl transition"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-700 shrink-0">
                        {track.cover ? (
                          <img src={track.cover} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Music className="w-6 h-6 m-auto text-zinc-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">{track.title}</p>
                        <p className="text-xs text-zinc-500 truncate">{track.artist}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePlayAudio(track.audioUrl);
                      }}
                      className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-800 dark:text-zinc-200 hover:scale-105 shrink-0"
                    >
                      {playingAudioUrl === track.audioUrl ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5 fill-current" />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
      , document.body
      )}

      {/* ========================================================================= */}
      {/* 7. GIPHY SEARCH MODAL (Portaled above BottomNav) */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showGiphyModal && (
            <NoteGiphySheet
              isOpen={showGiphyModal}
              onClose={() => setShowGiphyModal(false)}
              onSelectGif={(url) => {
                setSelectedGifUrl(url);
                setShowGiphyModal(false);
              }}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

// Giphy Search Component for Notes (Exact Screenshot IMG_5576.png)
const NoteGiphySheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelectGif: (url: string) => void;
}> = ({ isOpen, onClose, onSelectGif }) => {
  const [search, setSearch] = useState('');
  const [gifs, setGifs] = useState<Array<{ id: string; title: string; url: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const endpoint = search.trim()
          ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(
              search
            )}&limit=24&rating=g`
          : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=g`;

        const res = await fetch(endpoint);
        if (res.ok) {
          const json = await res.json();
          if (active && Array.isArray(json?.data)) {
            setGifs(
              json.data.map((g: any) => ({
                id: g.id,
                title: g.title,
                url: g.images?.fixed_height?.url || g.images?.original?.url
              }))
            );
          }
        }
      } catch (e) {
        console.warn(e);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, search]);

  return (
    <div className="fixed inset-0 z-[10030] flex flex-col bg-white dark:bg-[#121214] font-sans animate-fadeIn">
      {/* Search Bar + Cancel (Exact IMG_5576) */}
      <div className="p-4 flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#F2F3F5] dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700">
          <Search className="w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search GIPHY"
            className="w-full bg-transparent text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-base text-[#0064E0] font-medium cursor-pointer"
        >
          Cancel
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 max-w-md mx-auto w-full space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#0064E0]" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {gifs.map((g) => (
              <div
                key={g.id}
                onClick={() => onSelectGif(g.url)}
                className="aspect-square rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 cursor-pointer hover:opacity-85 transition relative"
              >
                <img src={g.url} alt={g.title} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
