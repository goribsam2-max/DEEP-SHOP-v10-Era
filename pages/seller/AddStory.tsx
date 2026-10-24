import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, addDoc, getDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../../firebase";
import { useNotify } from "../../components/Notifications";
import { uploadToImgbb } from "../../services/imgbb";
import {
  X,
  ChevronDown,
  Music,
  LayoutGrid,
  Zap,
  Smile,
  Sparkles,
  Pencil,
  MoreHorizontal,
  Search,
  Check,
  ChevronRight,
  Plus,
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  Camera,
  History,
  Send,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic } from "../../lib/haptics";

type Step = "picker" | "editor";

interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
}

const FONTS = [
  { id: "classic", name: "Classic", className: "font-sans" },
  { id: "modern", name: "Modern", className: "font-serif" },
  { id: "neon", name: "Neon", className: "font-mono" },
  { id: "typewriter", name: "Typewriter", className: "font-mono italic" },
  { id: "strong", name: "Strong", className: "font-sans font-black" },
];

const COLORS = [
  "#FFFFFF", "#000000", "#FF3B30", "#FF9500", "#FFCC00", "#4CD964", "#5AC8FA", "#007AFF", "#5856D6", "#FF2D55"
];

const STICKERS = [
  { id: "location", label: "LOCATION", icon: "📍" },
  { id: "mention", label: "@MENTION", icon: "@" },
  { id: "add_yours", label: "ADD YOURS", icon: "📸" },
  { id: "questions", label: "QUESTIONS", icon: "❓" },
  { id: "music", label: "MUSIC", icon: "🎵" },
  { id: "poll", label: "POLL", icon: "📊" },
  { id: "quiz", label: "QUIZ", icon: "📝" },
  { id: "link", label: "LINK", icon: "🔗" },
  { id: "emoji", label: "😍", icon: "😍" },
];

export default function AddStory() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromNewsHub = searchParams.get("from") === "news-hub";
  const notify = useNotify();
  const [step, setStep] = useState<Step>("picker");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Selection state
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [gallery, setGallery] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);

  // Editor state
  const [textStudioOpen, setTextStudioOpen] = useState(false);
  const [stickersOpen, setStickersOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  
  const [storyText, setStoryText] = useState("");
  const [selectedFont, setSelectedFont] = useState(FONTS[0]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [textAlignment, setTextAlignment] = useState<"left" | "center" | "right">("center");
  const [textBg, setTextBg] = useState(false);

  const [placedStickers, setPlacedStickers] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
      setLoading(false);
      if (!u) navigate("/signin");
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    // Mock gallery data
    const mockGallery: MediaItem[] = Array.from({ length: 24 }).map((_, i) => ({
      id: `mock-${i}`,
      url: `https://picsum.photos/seed/${i + 100}/1080/1920`,
      type: "image",
    }));
    setGallery(mockGallery);
  }, []);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadToImgbb(file);
      const newItem: MediaItem = {
        id: Date.now().toString(),
        url,
        type: file.type.startsWith("video/") ? "video" : "image",
      };
      setGallery([newItem, ...gallery]);
      setSelectedMedia(newItem);
      setStep("editor");
      triggerHaptic();
    } catch (err) {
      notify("Failed to upload media", "error");
    } finally {
      setUploading(false);
    }
  };

  const handlePublish = async (isCloseFriends = false) => {
    if (!selectedMedia) return;
    setUploading(true);
    try {
      const storyPayload = {
        mediaUrl: selectedMedia.url,
        type: selectedMedia.type,
        userId: currentUser.uid,
        userName: currentUser.displayName || "Member",
        userAvatar: currentUser.photoURL || "",
        createdAt: new Date().toISOString(),
        createdAtMs: Date.now(),
        isCloseFriends,
        text: storyText,
        font: selectedFont.id,
        color: selectedColor,
        stickers: placedStickers,
        source: "news_hub",
      };

      await addDoc(collection(db, "stories"), storyPayload);
      notify("Story shared!", "success");
      navigate(fromNewsHub ? "/news-hub" : "/");
    } catch (err) {
      notify("Failed to share story", "error");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <div className="h-screen bg-black flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  );

  return (
    <div className="h-screen bg-black text-white overflow-hidden relative font-sans">
      <AnimatePresence mode="wait">
        {step === "picker" ? (
          <motion.div
            key="picker"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="h-full flex flex-col"
          >
            {/* Picker Header */}
            <header className="px-4 py-3 flex items-center justify-between z-10 bg-black/50 backdrop-blur-md">
              <button onClick={() => navigate(-1)} className="p-2">
                <X className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-1 font-bold text-lg cursor-pointer">
                <span>Recents</span>
                <ChevronDown className="w-4 h-4" />
              </div>
              <button className="p-2 bg-white/10 rounded-full">
                <LayoutGrid className="w-5 h-5" />
              </button>
            </header>

            {/* Feature Buttons */}
            <div className="px-4 py-3 flex items-center gap-3 overflow-x-auto no-scrollbar">
              <button className="px-4 py-2 bg-white/10 rounded-full flex items-center gap-2 whitespace-nowrap text-sm font-bold border border-white/5">
                <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                Add yours
              </button>
              <button className="px-4 py-2 bg-white/10 rounded-full flex items-center gap-2 whitespace-nowrap text-sm font-bold border border-white/5">
                <Music className="w-4 h-4" />
                Music
              </button>
              <button className="px-4 py-2 bg-white/10 rounded-full flex items-center gap-2 whitespace-nowrap text-sm font-bold border border-white/5">
                <LayoutGrid className="w-4 h-4" />
                Collage
              </button>
            </div>

            {/* Gallery Grid */}
            <div className="flex-1 overflow-y-auto px-1">
              <div className="grid grid-cols-3 gap-1">
                {/* Camera Cell */}
                <label className="aspect-[9/16] bg-zinc-900 flex flex-col items-center justify-center gap-2 cursor-pointer border border-white/5">
                  <Camera className="w-8 h-8 text-zinc-400" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Camera</span>
                  <input type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={handleMediaUpload} />
                </label>
                
                {gallery.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedMedia(item);
                      setStep("editor");
                      triggerHaptic();
                    }}
                    className="aspect-[9/16] relative bg-zinc-900 cursor-pointer overflow-hidden group"
                  >
                    <img
                      src={item.url}
                      className="w-full h-full object-cover transition-transform group-active:scale-95"
                      alt=""
                      loading="lazy"
                    />
                    {item.type === "video" && (
                      <div className="absolute top-2 right-2">
                        <Zap className="w-3 h-3 text-white fill-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="editor"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="h-full flex flex-col relative"
          >
            {/* Media Preview */}
            <div className="absolute inset-0 z-0">
              {selectedMedia?.type === "image" ? (
                <img src={selectedMedia.url} className="w-full h-full object-cover" alt="" />
              ) : (
                <video src={selectedMedia?.url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
              )}
            </div>

            {/* Editor Overlay */}
            <div className="absolute inset-0 z-10 flex flex-col p-4 bg-gradient-to-b from-black/20 via-transparent to-black/20">
              {/* Editor Header */}
              <header className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setStep("picker");
                    triggerHaptic();
                  }}
                  className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-4">
                  <button onClick={() => setStickersOpen(true)} className="p-1"><Smile className="w-7 h-7 drop-shadow-md" /></button>
                  <button onClick={() => setTextStudioOpen(true)} className="p-1">
                    <svg viewBox="0 0 24 24" className="w-7 h-7 drop-shadow-md" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M4 18l4-12 4 12M5.3 15h5.4M15 12a3 3 0 100 6 3 3 0 000-6zM18 12v6" />
                    </svg>
                  </button>
                  <button className="p-1"><Sparkles className="w-7 h-7 drop-shadow-md" /></button>
                  <button className="p-1"><Pencil className="w-7 h-7 drop-shadow-md" /></button>
                  <button className="p-1"><MoreHorizontal className="w-7 h-7 drop-shadow-md" /></button>
                </div>
              </header>

              {/* Placed Text/Stickers */}
              <div className="flex-1 relative flex items-center justify-center">
                {storyText && (
                  <motion.div
                    drag
                    dragConstraints={{ top: -200, bottom: 200, left: -150, right: 150 }}
                    onClick={() => setTextStudioOpen(true)}
                    className={`p-3 rounded-lg text-center cursor-move max-w-[80%] ${selectedFont.className}`}
                    style={{
                      color: selectedColor,
                      backgroundColor: textBg ? (selectedColor === "#FFFFFF" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)") : "transparent",
                      fontSize: "2rem",
                      fontWeight: "bold",
                    }}
                  >
                    {storyText}
                  </motion.div>
                )}
              </div>

              {/* Editor Footer */}
              <footer className="flex items-center justify-between gap-3 pb-8">
                <div className="flex items-center gap-2 flex-1">
                   <button 
                    onClick={() => setShareSheetOpen(true)}
                    className="flex-1 h-14 bg-white/20 backdrop-blur-xl rounded-full flex items-center gap-3 pl-2 pr-6 border border-white/10 group active:scale-95 transition-all"
                   >
                     <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20">
                       <img src={currentUser?.photoURL || "https://picsum.photos/200"} className="w-full h-full object-cover" alt="" />
                     </div>
                     <span className="text-sm font-bold">Your Story</span>
                   </button>
                   
                   <button 
                    onClick={() => handlePublish(true)}
                    className="h-14 aspect-square bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/10 active:scale-95 transition-all"
                   >
                     <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center border border-white/20">
                       <Users className="w-4 h-4 text-white fill-white" />
                     </div>
                   </button>
                </div>

                <button 
                  onClick={() => setShareSheetOpen(true)}
                  className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-black shadow-xl active:scale-90 transition-all"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </footer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Text Studio Modal */}
      <AnimatePresence>
        {textStudioOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex flex-col p-4"
          >
            <header className="flex items-center justify-between">
              <button onClick={() => setTextAlignment(prev => prev === "left" ? "center" : prev === "center" ? "right" : "left")} className="p-2">
                <LayoutGrid className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setTextBg(!textBg)}
                className={`px-3 py-1 rounded-md text-xs font-bold border ${textBg ? 'bg-white text-black border-white' : 'text-white border-white/30'}`}
              >
                A
              </button>
              <button 
                onClick={() => {
                  setTextStudioOpen(false);
                  triggerHaptic();
                }}
                className="text-lg font-bold"
              >
                Done
              </button>
            </header>

            <div className="flex-1 flex items-center justify-center">
              <textarea
                autoFocus
                value={storyText}
                onChange={(e) => setStoryText(e.target.value)}
                placeholder="Type something..."
                className={`w-full bg-transparent text-center text-4xl font-bold outline-none placeholder-white/30 resize-none ${selectedFont.className}`}
                style={{ color: selectedColor, textAlign: textAlignment }}
              />
            </div>

            <div className="pb-8 space-y-6">
              {/* Color Picker */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
                {COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full flex-shrink-0 border-2 ${selectedColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {/* Font Selector */}
              <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-2">
                {FONTS.map(font => (
                  <button
                    key={font.id}
                    onClick={() => setSelectedFont(font)}
                    className={`px-6 py-2 rounded-full flex-shrink-0 text-sm font-bold border transition-all ${selectedFont.id === font.id ? 'bg-white text-black border-white' : 'bg-black/50 text-white border-white/30'}`}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stickers Tray */}
      <AnimatePresence>
        {stickersOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStickersOpen(false)}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-[70] h-[85vh] bg-zinc-900 rounded-t-[40px] flex flex-col p-6 overflow-hidden"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />
              
              <div className="relative mb-6">
                <Search className="w-5 h-5 absolute left-4 top-3.5 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Search" 
                  className="w-full h-12 bg-white/10 rounded-2xl pl-12 pr-4 text-white font-bold outline-none border border-white/5 focus:border-white/20"
                />
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-3 gap-4">
                  {STICKERS.map(sticker => (
                    <button
                      key={sticker.id}
                      onClick={() => {
                        setPlacedStickers([...placedStickers, sticker]);
                        setStickersOpen(false);
                        triggerHaptic();
                      }}
                      className="aspect-square bg-white/10 rounded-3xl flex flex-col items-center justify-center gap-2 border border-white/5 active:scale-90 transition-all"
                    >
                      <span className="text-3xl">{sticker.icon}</span>
                      <span className="text-[10px] font-black tracking-widest text-zinc-400">{sticker.label}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-8">
                   <h3 className="text-sm font-bold text-zinc-500 mb-4 px-2">RECENT EMOJIS</h3>
                   <div className="grid grid-cols-6 gap-2">
                     {["😍", "😂", "🔥", "🙌", "❤️", "✨", "💯", "😭", "😮", "🙏", "👏", "✔️"].map((emoji, i) => (
                       <button key={i} className="text-3xl p-2 active:scale-75 transition-transform">{emoji}</button>
                     ))}
                   </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Share Sheet */}
      <AnimatePresence>
        {shareSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShareSheetOpen(false)}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-[70] bg-zinc-900 rounded-t-[40px] flex flex-col p-8 pb-12 space-y-6"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-2" />
              
              <h2 className="text-xl font-black text-center">Share</h2>

              <div className="space-y-3">
                <button 
                  onClick={() => handlePublish(false)}
                  className="w-full h-16 bg-white rounded-2xl flex items-center justify-between px-5 group active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-black/5">
                      <img src={currentUser?.photoURL || "https://picsum.photos/200"} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-black">Your Story</p>
                      <p className="text-[11px] font-bold text-zinc-500">Everyone on Deep Shop</p>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-zinc-200 flex items-center justify-center group-focus:bg-blue-500 group-focus:border-blue-500 transition-colors">
                    <Check className="w-3 h-3 text-white hidden group-focus:block" />
                  </div>
                </button>

                <button 
                  onClick={() => handlePublish(true)}
                  className="w-full h-16 bg-white/10 rounded-2xl flex items-center justify-between px-5 group active:scale-[0.98] transition-all border border-white/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center border-2 border-white/10">
                      <Users className="w-5 h-5 text-white fill-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-white">Close Friends</p>
                      <p className="text-[11px] font-bold text-zinc-500">Only your close friends</p>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-white/20" />
                </button>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => handlePublish(false)}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-500 rounded-full font-black text-sm transition-all shadow-xl shadow-blue-600/20"
                >
                  Share Story
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Global Uploading Overlay */}
      {uploading && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="font-black text-lg animate-pulse">Publishing Story...</p>
        </div>
      )}
    </div>
  );
}
