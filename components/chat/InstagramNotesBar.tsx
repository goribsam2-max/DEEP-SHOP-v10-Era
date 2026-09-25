import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  Search,
  Music,
  MapPin,
  Smile,
  Palette,
  Users,
  Star,
  Check,
  Plus,
  Loader2,
  Globe
} from 'lucide-react';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  query,
  limit
} from 'firebase/firestore';
import { db } from '../../firebase';
import { cn } from '../../lib/utils';

export interface UserNoteData {
  userId: string;
  displayName: string;
  photoURL?: string;
  text: string;
  bubbleColor?: string;
  bubbleEmoji?: string;
  gifUrl?: string;
  musicTitle?: string;
  location?: string;
  audience?: 'friends' | 'close_friends';
  createdAt?: any;
}

interface InstagramNotesBarProps {
  currentUser: any;
  onlineUsers?: any[];
  onOpenChatWithUser?: (user: any) => void;
  notify?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// Preset color swatches matching Instagram Bubble Editor (IMG_4008)
const BUBBLE_COLORS = [
  '#2C2D31', // Default Dark Slate
  '#C084FC', // Light Lavender
  '#A855F7', // Vibrant Violet
  '#6366F1', // Deep Royal Blue
  '#F472B6', // Pastel Pink
  '#EC4899', // Hot Magenta
  '#D946EF', // Berry Purple
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Coral Red
  '#3B82F6', // Sky Blue
];

// Popular emojis for bubble badge (IMG_4009)
const POPULAR_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '🥹', '😅', '😂', '🤣', '🥲', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛',
  '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒',
  '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢',
  '😭', '😮‍💨', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨',
  '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🫢', '🫡', '🤫', '🫠', '🤥',
  '😶', '😐', '😑', '🫥', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤',
  '❤️', '🔥', '✨', '💯', '🎉', '🚀', '👑', '👀', '🤙', '🙏', '💀', '👻'
];

// Popular Reaction GIFs (IMG_4010)
const POPULAR_GIFS = [
  { id: '1', title: 'Hey Cutie', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1eHhhbWp6cnF1anoxNjh5b3dtcWRudm9tcWJ6cjEycGV5d3QxMyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3ogwFGEHrVxusDbDjO/giphy.gif' },
  { id: '2', title: 'Well Played', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaG9yY3pnMjZqMWJmbXo2bWJmbnZzMjFmbnZzMjFmbnZzMjFmbnZzMiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/6t4gwsShYLni8/giphy.gif' },
  { id: '3', title: 'Cheers', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2Fma3JmMGN0b3pxaHFxM3R3amU2NThsN3R6aDNpa3hkNDFkMGlxMyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/g9582DNuQppxC/giphy.gif' },
  { id: '4', title: 'Cat Dance', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHU3a2ZlY2h0NG45dzdtMG9pZTN1cHRpbm02OXl4bnhrY2Jscmd4YSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/jpbnoe3UIa8TU8LM13/giphy.gif' },
  { id: '5', title: 'Excited', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeGJ3aW1zNHk0OXE1YWJ4M3R1dDZxNmR1bnRsd3A0anFrc3NldzJzciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/artj92V8o75VPL7AeQ/giphy.gif' },
  { id: '6', title: 'Mind Blown', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGNoc2V5NXJ4aHlzMW02aWN3Z2RreGtlN2FycWFqZ2c1M3Foa3A5eiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/26ufdipQqU2lhNA4g/giphy.gif' }
];

export const InstagramNotesBar: React.FC<InstagramNotesBarProps> = ({
  currentUser,
  onlineUsers = [],
  onOpenChatWithUser,
  notify = () => {}
}) => {
  // Current user's active note
  const [myNote, setMyNote] = useState<UserNoteData | null>(null);
  const [allNotes, setAllNotes] = useState<Record<string, UserNoteData>>({});

  // Modals & Sheets
  const [showNoteCreator, setShowNoteCreator] = useState(false);
  const [showBubbleEditor, setShowBubbleEditor] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGiphySheet, setShowGiphySheet] = useState(false);
  const [showShareWithSheet, setShowShareWithSheet] = useState(false);
  const [showMapSheet, setShowMapSheet] = useState(false);
  const [selectedFriendNote, setSelectedFriendNote] = useState<UserNoteData | null>(null);

  // Note Creator Fields
  const [noteText, setNoteText] = useState('');
  const [selectedBubbleColor, setSelectedBubbleColor] = useState<string>('#2C2D31');
  const [selectedBubbleEmoji, setSelectedBubbleEmoji] = useState<string>('💭');
  const [selectedGifUrl, setSelectedGifUrl] = useState<string>('');
  const [musicTitle, setMusicTitle] = useState<string>('');
  const [locationName, setLocationName] = useState<string>('Location off');
  const [isLocationOn, setIsLocationOn] = useState(false);
  const [shareAudience, setShareAudience] = useState<'friends' | 'close_friends'>('friends');
  const [isSaving, setIsSaving] = useState(false);

  // Giphy & Emoji search state
  const [giphySearch, setGiphySearch] = useState('');
  const [emojiSearch, setEmojiSearch] = useState('');

  // Fetch real-time notes
  useEffect(() => {
    try {
      const q = query(collection(db, 'user_notes'), limit(30));
      const unsub = onSnapshot(q, (snapshot) => {
        const notesMap: Record<string, UserNoteData> = {};
        snapshot.forEach((d) => {
          const data = d.data() as UserNoteData;
          notesMap[d.id] = data;
          if (currentUser?.uid && d.id === currentUser.uid) {
            setMyNote(data);
          }
        });
        setAllNotes(notesMap);
      });
      return () => unsub();
    } catch (e) {
      console.error('Error listening to notes:', e);
    }
  }, [currentUser?.uid]);

  // Open note creator
  const handleOpenCreator = () => {
    if (myNote) {
      setNoteText(myNote.text || '');
      setSelectedBubbleColor(myNote.bubbleColor || '#2C2D31');
      setSelectedBubbleEmoji(myNote.bubbleEmoji || '💭');
      setSelectedGifUrl(myNote.gifUrl || '');
      setMusicTitle(myNote.musicTitle || '');
      setLocationName(myNote.location || 'Location off');
      setIsLocationOn(myNote.location && myNote.location !== 'Location off' ? true : false);
      setShareAudience(myNote.audience || 'friends');
    } else {
      setNoteText('');
      setSelectedBubbleColor('#2C2D31');
      setSelectedBubbleEmoji('💭');
      setSelectedGifUrl('');
      setMusicTitle('');
      setLocationName('Location off');
      setIsLocationOn(false);
      setShareAudience('friends');
    }
    setShowNoteCreator(true);
  };

  // Toggle Location
  const handleToggleLocation = () => {
    if (isLocationOn) {
      setIsLocationOn(false);
      setLocationName('Location off');
      notify('Location turned off', 'info');
    } else {
      setIsLocationOn(true);
      setLocationName('Dhaka, Bangladesh');
      notify('Location set to Dhaka', 'success');
    }
  };

  // Toggle Music Prompt
  const handleToggleMusic = () => {
    if (musicTitle) {
      setMusicTitle('');
      notify('Music removed', 'info');
    } else {
      const title = window.prompt('Enter song or artist name:', 'The Weeknd - Blinding Lights');
      if (title && title.trim()) {
        setMusicTitle(title.trim());
        notify(`Added music: ${title.trim()}`, 'success');
      }
    }
  };

  // Share Note
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
    try {
      const notePayload: UserNoteData = {
        userId: currentUser.uid,
        displayName: currentUser.displayName || 'You',
        photoURL: currentUser.photoURL || '',
        text: noteText.trim(),
        bubbleColor: selectedBubbleColor,
        bubbleEmoji: selectedBubbleEmoji,
        gifUrl: selectedGifUrl,
        musicTitle: musicTitle,
        location: locationName,
        audience: shareAudience,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'user_notes', currentUser.uid), notePayload);
      setMyNote(notePayload);
      notify('Your note has been shared!', 'success');
      setShowNoteCreator(false);
    } catch (e) {
      console.error('Error saving note:', e);
      notify('Failed to share note', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete note
  const handleDeleteNote = async () => {
    if (!currentUser) return;
    try {
      await setDoc(doc(db, 'user_notes', currentUser.uid), {
        text: '',
        deletedAt: serverTimestamp()
      }, { merge: true });
      setMyNote(null);
      notify('Note removed', 'info');
      setShowNoteCreator(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered GIPHY results
  const filteredGifs = POPULAR_GIFS.filter(g =>
    !giphySearch.trim() || g.title.toLowerCase().includes(giphySearch.toLowerCase())
  );

  // Filtered Emojis
  const filteredEmojis = POPULAR_EMOJIS.filter(e =>
    !emojiSearch.trim() || e.includes(emojiSearch)
  );

  return (
    <div className="w-full border-b border-zinc-100 dark:border-white/5 py-3 px-3.5 bg-white dark:bg-[#121214] select-none">
      {/* Horizontal Story / Note Avatars Row (IMG_4006) */}
      <div className="flex items-start gap-4 overflow-x-auto no-scrollbar scroll-smooth">
        {/* ======================================================== */}
        {/* ITEM 1: "Your note" (IMG_4006) */}
        {/* ======================================================== */}
        <div
          onClick={handleOpenCreator}
          className="flex flex-col items-center shrink-0 cursor-pointer group"
        >
          {/* Speech Bubble on top of avatar */}
          <div className="relative mb-1 flex flex-col items-center">
            {myNote?.text ? (
              <div
                style={{ backgroundColor: myNote.bubbleColor || '#2C2D31' }}
                className="relative max-w-[90px] px-2.5 py-1 rounded-2xl text-[11px] font-semibold text-white shadow-md leading-tight text-center truncate flex items-center gap-1 border border-white/10"
              >
                {myNote.bubbleEmoji && <span className="text-[10px]">{myNote.bubbleEmoji}</span>}
                <span className="truncate">{myNote.text}</span>
                {/* Speech tail */}
                <div
                  style={{ borderTopColor: myNote.bubbleColor || '#2C2D31' }}
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-6"
                />
              </div>
            ) : (
              <div className="relative px-2.5 py-1 rounded-2xl bg-[#2C2D31] text-[11px] font-semibold text-zinc-300 shadow-md leading-tight text-center border border-white/10">
                <span>Note...</span>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-6 border-t-[#2C2D31]" />
              </div>
            )}
          </div>

          {/* User Avatar */}
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

            {/* Plus / Edit Badge */}
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center border-2 border-white dark:border-[#121214] shadow-xs">
              <Plus className="w-3 h-3 stroke-[3]" />
            </div>
          </div>

          {/* Labels underneath */}
          <span className="text-xs font-semibold text-zinc-900 dark:text-white mt-1">
            Your note
          </span>

          <div className="flex items-center gap-0.5 text-[10px] text-zinc-400 mt-0.5">
            <MapPin className="w-2.5 h-2.5 text-rose-500" />
            <span className="truncate max-w-[70px]">{myNote?.location || 'Location off'}</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* ITEM 2: "Map" (IMG_4006) */}
        {/* ======================================================== */}
        <div
          onClick={() => setShowMapSheet(true)}
          className="flex flex-col items-center shrink-0 cursor-pointer group"
        >
          {/* "New" Pill Bubble on top of map */}
          <div className="relative mb-1 flex flex-col items-center">
            <div className="relative px-2.5 py-0.5 rounded-full bg-[#3B82F6] text-[10px] font-bold text-white shadow-md leading-tight text-center">
              New
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-x-3 border-x-transparent border-t-4 border-t-[#3B82F6]" />
            </div>
          </div>

          {/* Earth / Globe Map Circle */}
          <div className="relative w-15 h-15 rounded-full p-0.5 bg-gradient-to-tr from-blue-700 via-emerald-600 to-indigo-800 shadow-sm transition-transform group-hover:scale-105 active:scale-95">
            <div className="w-full h-full rounded-full overflow-hidden bg-cover bg-center flex items-center justify-center bg-[#1E3A8A]">
              <Globe className="w-8 h-8 text-sky-300 opacity-90 animate-spin-slow" />
            </div>
          </div>

          {/* Label */}
          <span className="text-xs font-semibold text-zinc-900 dark:text-white mt-1">
            Map
          </span>
          <span className="text-[10px] text-zinc-400 mt-0.5">Explore</span>
        </div>

        {/* ======================================================== */}
        {/* ITEM 3, 4, 5...: Online Friends with Notes */}
        {/* ======================================================== */}
        {onlineUsers
          .filter((friend) => {
            const friendNote = allNotes[friend.id || friend.uid];
            // Only show users who are genuinely online OR have an active note
            return Boolean(friend.isOnline) || Boolean(friendNote?.text);
          })
          .map((friend, fIdx) => {
          const friendNote = allNotes[friend.id || friend.uid];
          return (
            <div
              key={`online-friend-${friend.id || friend.uid || fIdx}-${fIdx}`}
              onClick={() => {
                if (friendNote?.text) {
                  setSelectedFriendNote(friendNote);
                } else if (onOpenChatWithUser) {
                  onOpenChatWithUser(friend);
                }
              }}
              className="flex flex-col items-center shrink-0 cursor-pointer group"
            >
              {/* Friend's thought bubble if available */}
              <div className="relative mb-1 flex flex-col items-center min-h-[22px]">
                {friendNote?.text ? (
                  <div
                    style={{ backgroundColor: friendNote.bubbleColor || '#2C2D31' }}
                    className="relative max-w-[85px] px-2 py-0.5 rounded-2xl text-[10px] font-semibold text-white shadow-md leading-tight text-center truncate border border-white/10"
                  >
                    {friendNote.bubbleEmoji && <span className="mr-0.5">{friendNote.bubbleEmoji}</span>}
                    <span className="truncate">{friendNote.text}</span>
                    <div
                      style={{ borderTopColor: friendNote.bubbleColor || '#2C2D31' }}
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-x-3 border-x-transparent border-t-4"
                    />
                  </div>
                ) : (
                  <div className="h-4" />
                )}
              </div>

              {/* Friend Avatar */}
              <div className="relative w-15 h-15 rounded-full p-0.5 bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-sm transition-transform group-hover:scale-105 active:scale-95">
                <div className="w-full h-full rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                  {friend.photoURL ? (
                    <img src={friend.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-300 text-sm">
                      {(friend.displayName || friend.shopName || 'U')[0]?.toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Online indicator dot - ONLY shown when user is actually online */}
                {Boolean(friend.isOnline) && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#121214] animate-pulse" />
                )}
              </div>

              {/* Friend Name */}
              <span className="text-xs font-semibold text-zinc-900 dark:text-white mt-1 truncate max-w-[70px]">
                {friend.displayName?.split(' ')[0] || 'Friend'}
              </span>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: NOTE CREATOR / EDITOR (IMG_4007) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showNoteCreator && (
          <div className="fixed inset-0 z-[150] flex flex-col bg-zinc-950/90 backdrop-blur-xl text-white font-inter animate-fadeIn">
            {/* Top Bar with (X) Close */}
            <div className="p-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowNoteCreator(false)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition active:scale-95"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
              <span className="text-sm font-bold text-zinc-400">New note</span>
              <div className="w-10" />
            </div>

            {/* Centered Area: Large Avatar + Speech Bubble + Palette Badge */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 relative">
              <div className="relative flex flex-col items-center">
                {/* Speech Bubble */}
                <motion.div
                  initial={{ scale: 0.9, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  style={{ backgroundColor: selectedBubbleColor }}
                  className="relative mb-2 w-64 max-w-[85vw] p-3 rounded-3xl shadow-2xl border border-white/15 flex flex-col items-center"
                >
                  {/* Top Emoji badge if chosen */}
                  <div className="flex items-center gap-1.5 w-full">
                    {selectedBubbleEmoji && (
                      <span className="text-lg leading-none">{selectedBubbleEmoji}</span>
                    )}
                    <input
                      type="text"
                      autoFocus
                      maxLength={60}
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Share a thought..."
                      className="w-full bg-transparent text-sm font-semibold text-white placeholder-zinc-400 focus:outline-none text-center"
                    />
                  </div>

                  {/* Character limit counter */}
                  <span className="text-[9px] text-zinc-400 self-end mt-1">
                    {noteText.length}/60
                  </span>

                  {/* Attached GIF preview if selected */}
                  {selectedGifUrl && (
                    <div className="mt-2 w-28 h-28 rounded-xl overflow-hidden border border-white/20 relative">
                      <img src={selectedGifUrl} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setSelectedGifUrl('')}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center text-[10px]"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Speech bubble tail pointing down */}
                  <div
                    style={{ borderTopColor: selectedBubbleColor }}
                    className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-x-6 border-x-transparent border-t-8"
                  />
                </motion.div>

                {/* Big Avatar */}
                <div className="relative w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-2xl">
                  <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800">
                    {currentUser?.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-2xl text-white">
                        {(currentUser?.displayName || 'Y')[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Palette / Bubble Editor Badge (IMG_4007) */}
                  <button
                    type="button"
                    onClick={() => setShowBubbleEditor(true)}
                    className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 text-white flex items-center justify-center shadow-lg border-2 border-zinc-950 hover:scale-110 active:scale-95 transition"
                    title="Customize bubble style"
                  >
                    <Palette className="w-4 h-4" />
                  </button>
                </div>

                {/* Attached music / location indicators */}
                <div className="flex items-center gap-2 mt-2">
                  {musicTitle && (
                    <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 text-[10px] font-bold flex items-center gap-1 border border-pink-500/30">
                      <Music className="w-2.5 h-2.5" />
                      <span className="truncate max-w-[120px]">{musicTitle}</span>
                    </span>
                  )}
                  {locationName && locationName !== 'Location off' && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold flex items-center gap-1 border border-purple-500/30">
                      <MapPin className="w-2.5 h-2.5" />
                      <span className="truncate max-w-[100px]">{locationName}</span>
                    </span>
                  )}
                </div>

                {/* 3 Circular Action Buttons under avatar (IMG_4007) */}
                <div className="flex items-center justify-center gap-4 mt-6">
                  {/* 1. Music (Pink) */}
                  <button
                    type="button"
                    onClick={handleToggleMusic}
                    className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center transition border active:scale-95",
                      musicTitle
                        ? "bg-pink-500 text-white border-pink-500 shadow-md shadow-pink-500/30"
                        : "bg-white/10 text-pink-400 border-pink-500/40 hover:bg-white/15"
                    )}
                    title="Add music"
                  >
                    <Music className="w-5 h-5" />
                  </button>

                  {/* 2. Location (Purple) */}
                  <button
                    type="button"
                    onClick={handleToggleLocation}
                    className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center transition border active:scale-95",
                      isLocationOn
                        ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/30"
                        : "bg-white/10 text-purple-400 border-purple-500/40 hover:bg-white/15"
                    )}
                    title="Toggle location"
                  >
                    <MapPin className="w-5 h-5" />
                  </button>

                  {/* 3. GIF (Green) */}
                  <button
                    type="button"
                    onClick={() => setShowGiphySheet(true)}
                    className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center transition border active:scale-95",
                      selectedGifUrl
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30"
                        : "bg-white/10 text-emerald-400 border-emerald-500/40 hover:bg-white/15"
                    )}
                    title="Search GIF"
                  >
                    <span className="text-[11px] font-black tracking-wider">GIF</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Bar: Audience selector + Share Button (IMG_4007) */}
            <div className="p-4 border-t border-white/10 flex items-center justify-between bg-zinc-950/80">
              <button
                type="button"
                onClick={() => setShowShareWithSheet(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition"
              >
                <span>Share with {shareAudience === 'friends' ? 'friends' : 'close friends'}</span>
                <span>›</span>
              </button>

              <div className="flex items-center gap-2">
                {myNote && (
                  <button
                    type="button"
                    onClick={handleDeleteNote}
                    className="px-3 py-2 rounded-full bg-white/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleShareNote}
                  disabled={!noteText.trim() || isSaving}
                  className="px-6 py-2.5 rounded-full bg-[#0064E0] hover:bg-[#0057C2] disabled:opacity-50 text-white font-bold text-sm transition shadow-lg flex items-center gap-1.5 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Share'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 2: BUBBLE EDITOR (IMG_4008) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showBubbleEditor && (
          <div className="fixed inset-0 z-[160] flex flex-col bg-zinc-950 text-white font-inter animate-fadeIn">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-white/10">
              <button
                type="button"
                onClick={() => setShowBubbleEditor(false)}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-base">Bubble editor</h3>
              <div className="w-9" />
            </div>

            {/* Bubble Preview Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-4">
              <div className="relative flex flex-col items-center">
                {/* Speech Bubble */}
                <div
                  style={{ backgroundColor: selectedBubbleColor }}
                  className="relative mb-2 w-64 max-w-[80vw] p-3.5 rounded-3xl shadow-2xl border border-white/20 flex flex-col items-center"
                >
                  {/* Emoji Button on bubble corner (IMG_4008) */}
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(true)}
                    className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-400 flex items-center justify-center text-sm shadow-md hover:scale-110 active:scale-95 transition"
                    title="Change bubble emoji"
                  >
                    {selectedBubbleEmoji || '😊'}
                  </button>

                  <p className="text-sm font-semibold text-white text-center">
                    {noteText || 'Unpopular opinion...'}
                  </p>

                  {/* Speech bubble tail */}
                  <div
                    style={{ borderTopColor: selectedBubbleColor }}
                    className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-x-6 border-x-transparent border-t-8"
                  />
                </div>

                {/* Big Avatar */}
                <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-white/20 shadow-2xl bg-zinc-800">
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-2xl">
                      {(currentUser?.displayName || 'Y')[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Swatches & Apply Bar (IMG_4008) */}
            <div className="p-6 border-t border-white/10 space-y-5 bg-zinc-950">
              {/* Color Swatches Grid */}
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {BUBBLE_COLORS.map((c, cIdx) => (
                  <button
                    key={`color-swatch-${c}-${cIdx}`}
                    type="button"
                    onClick={() => setSelectedBubbleColor(c)}
                    style={{ backgroundColor: c }}
                    className={cn(
                      "w-11 h-11 rounded-2xl transition-all relative border",
                      selectedBubbleColor === c
                        ? "border-white ring-2 ring-indigo-500 scale-110 shadow-lg"
                        : "border-white/10 opacity-80 hover:opacity-100"
                    )}
                  >
                    {selectedBubbleColor === c && (
                      <Check className="w-4 h-4 text-white absolute inset-0 m-auto stroke-[3]" />
                    )}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowBubbleEditor(false)}
                  className="w-full py-3 rounded-2xl bg-[#0064E0] hover:bg-[#0057C2] text-white font-bold text-sm transition shadow-md"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBubbleColor('#2C2D31');
                    setSelectedBubbleEmoji('💭');
                  }}
                  className="w-full py-2 text-center text-xs font-semibold text-zinc-400 hover:text-white transition"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* SHEET 1: EMOJI PICKER (IMG_4009) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showEmojiPicker && (
          <div className="fixed inset-0 z-[170] flex items-end justify-center bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-lg bg-zinc-900 border-t border-white/10 rounded-t-3xl p-4 max-h-[60vh] flex flex-col text-white font-inter">
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3" />

              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="font-bold text-sm">Smileys & people</span>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(false)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Done
                </button>
              </div>

              {/* Emoji Grid */}
              <div className="flex-1 overflow-y-auto grid grid-cols-7 gap-3 py-4 text-2xl text-center custom-scrollbar">
                {filteredEmojis.map((emoji, emIdx) => (
                  <button
                    key={`emoji-item-${emoji}-${emIdx}`}
                    type="button"
                    onClick={() => {
                      setSelectedBubbleEmoji(emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="p-2 hover:bg-white/10 rounded-xl transition"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* SHEET 2: SEARCH GIPHY (IMG_4010) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showGiphySheet && (
          <div className="fixed inset-0 z-[170] flex items-end justify-center bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-lg bg-zinc-900 border-t border-white/10 rounded-t-3xl p-4 max-h-[70vh] flex flex-col text-white font-inter">
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3" />

              {/* Search input */}
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={giphySearch}
                  onChange={(e) => setGiphySearch(e.target.value)}
                  placeholder="Search GIPHY"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Giphy Grid */}
              <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2.5 custom-scrollbar">
                {filteredGifs.map((gif, gIdx) => (
                  <div
                    key={`giphy-${gif.id || gIdx}-${gIdx}`}
                    onClick={() => {
                      setSelectedGifUrl(gif.url);
                      setShowGiphySheet(false);
                    }}
                    className="aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/10 cursor-pointer hover:opacity-80 transition relative"
                  >
                    <img src={gif.url} alt={gif.title} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* SHEET 3: SHARE WITH AUDIENCE (IMG_4011) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showShareWithSheet && (
          <div className="fixed inset-0 z-[170] flex items-end justify-center bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-lg bg-[#18191B] border-t border-white/10 rounded-t-3xl p-5 text-white font-inter">
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3" />

              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <button
                  type="button"
                  onClick={() => setShowShareWithSheet(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
                <h3 className="font-bold text-base">Share with</h3>
                <div className="w-8" />
              </div>

              <div className="divide-y divide-white/5 py-2">
                {/* Option 1: Friends */}
                <div
                  onClick={() => {
                    setShareAudience('friends');
                    setShowShareWithSheet(false);
                  }}
                  className="py-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5 px-2 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Friends</p>
                      <p className="text-xs text-zinc-400">Followers you follow back</p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      shareAudience === 'friends'
                        ? "border-[#0064E0] bg-[#0064E0]"
                        : "border-zinc-500"
                    )}
                  >
                    {shareAudience === 'friends' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>

                {/* Option 2: Close Friends */}
                <div
                  onClick={() => {
                    setShareAudience('close_friends');
                    setShowShareWithSheet(false);
                  }}
                  className="py-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5 px-2 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                      <Star className="w-5 h-5 fill-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Close Friends</p>
                      <p className="text-xs text-zinc-400">Add people ›</p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      shareAudience === 'close_friends'
                        ? "border-[#0064E0] bg-[#0064E0]"
                        : "border-zinc-500"
                    )}
                  >
                    {shareAudience === 'close_friends' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* SHEET 4: MAP PREVIEW SHEET (Map Item in IMG_4006) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showMapSheet && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-white font-inter">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-sky-400" />
                  <h3 className="font-bold text-base">Friends Map</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMapSheet(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Map Preview Graphic */}
              <div className="h-64 relative bg-[#0B192C] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
                <div className="relative text-center p-6 space-y-2">
                  <div className="w-16 h-16 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center mx-auto border border-sky-500/30 animate-pulse">
                    <MapPin className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-lg text-white">Live Location Sharing</h4>
                  <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                    See where your friends are sharing thoughts around Dhaka and across Bangladesh.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-zinc-950 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowMapSheet(false)}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* DIALOG: VIEW FRIEND NOTE */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedFriendNote && (
          <div
            className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
            onClick={() => setSelectedFriendNote(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs bg-zinc-900 border border-white/10 rounded-3xl p-5 text-white flex flex-col items-center shadow-2xl animate-scaleUp text-center"
            >
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-indigo-500 mb-3 bg-zinc-800">
                {selectedFriendNote.photoURL ? (
                  <img src={selectedFriendNote.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-xl">
                    {selectedFriendNote.displayName[0]?.toUpperCase()}
                  </div>
                )}
              </div>

              <h4 className="font-bold text-base">{selectedFriendNote.displayName}</h4>

              <div
                style={{ backgroundColor: selectedFriendNote.bubbleColor || '#2C2D31' }}
                className="mt-3 p-3.5 rounded-2xl border border-white/15 text-sm font-semibold max-w-full"
              >
                {selectedFriendNote.bubbleEmoji && (
                  <span className="mr-1.5">{selectedFriendNote.bubbleEmoji}</span>
                )}
                <span>"{selectedFriendNote.text}"</span>
              </div>

              {selectedFriendNote.gifUrl && (
                <img
                  src={selectedFriendNote.gifUrl}
                  alt=""
                  className="mt-3 w-32 h-32 rounded-xl object-cover border border-white/15"
                />
              )}

              <button
                type="button"
                onClick={() => setSelectedFriendNote(null)}
                className="mt-4 px-5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
