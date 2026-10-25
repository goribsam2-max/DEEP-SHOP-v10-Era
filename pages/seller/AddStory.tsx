import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  addDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { db, auth } from "../../firebase";
import { useNotify } from "../../components/Notifications";
import { uploadToImgbb } from "../../services/imgbb";
import { canAccessSellerDashboard } from "../../lib/admin";
import { useFooterLogo } from "../../lib/useFooterLogo";
import { triggerHaptic } from "../../lib/haptics";
import { getLocalFollowedIds } from "../../lib/follow";
import { detectAiGeneratedFiles } from "../../lib/aiImageDetector";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ArrowRight,
  Music,
  LayoutGrid,
  Zap,
  ZapOff,
  Smile,
  Sparkles,
  Pencil,
  MoreHorizontal,
  Search,
  Check,
  Plus,
  Loader2,
  Image as ImageIcon,
  Camera,
  RefreshCw,
  Settings,
  Download,
  MessageSquareOff,
  MessageSquare,
  Star,
  AtSign,
  MapPin,
  Hash,
  Link2,
  Clock,
  ShoppingBag,
  Bell,
  HelpCircle,
  BarChart2,
  Sliders,
  Scissors,
  Frame,
  Heart,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Undo2,
  Trash2,
  Eraser,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Send,
  Upload,
  Infinity as InfinityIcon,
  Timer,
  Cpu,
} from "lucide-react";

import parkShowcaseImg from "../../src/assets/images/feed_showcase_park_1792826817616.jpg";
import creatorAvatar1 from "../../src/assets/images/story_avatar_creator_1_1792826814910.jpg";
import creatorAvatar2 from "../../src/assets/images/story_avatar_creator_2_1792826816378.jpg";
import creatorAvatar3 from "../../src/assets/images/story_avatar_creator_3_1792826816863.jpg";
import deepShopLogoFallback from "../../src/assets/images/deep_shop_logo_1783442733929.jpg";

/* ============================================================================
 * TYPES & CONSTANTS (ZERO INLINE STYLES — TAILWIND CLASS MAPS + CANVAS HEX)
 * ========================================================================== */

type StudioStep = "gallery" | "camera" | "collage" | "editor";
type AlbumFilter = "recents" | "videos" | "favourites" | "all";

export interface GalleryMediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  source: "upload" | "deep_shop" | "studio";
  label?: string;
  ownerUid?: string;
}

export interface StoryColorDef {
  id: string;
  label: string;
  hex: string;
  textClass: string;
  swatchClass: string;
  pillSolidClass: string;
  pillSoftClass: string;
}

export const STORY_COLORS: StoryColorDef[] = [
  {
    id: "white",
    label: "White",
    hex: "#FFFFFF",
    textClass: "text-white",
    swatchClass: "bg-white",
    pillSolidClass: "bg-white text-zinc-950",
    pillSoftClass: "bg-black/60 text-white backdrop-blur-md",
  },
  {
    id: "black",
    label: "Black",
    hex: "#111827",
    textClass: "text-zinc-950",
    swatchClass: "bg-zinc-950",
    pillSolidClass: "bg-zinc-950 text-white",
    pillSoftClass: "bg-white/75 text-zinc-950 backdrop-blur-md",
  },
  {
    id: "brand_blue",
    label: "Deep Blue",
    hex: "#1877F2",
    textClass: "text-[#1877F2]",
    swatchClass: "bg-[#1877F2]",
    pillSolidClass: "bg-[#1877F2] text-white",
    pillSoftClass: "bg-[#1877F2]/25 text-white border border-[#1877F2]/50 backdrop-blur-md",
  },
  {
    id: "crimson",
    label: "Crimson",
    hex: "#EF4444",
    textClass: "text-red-500",
    swatchClass: "bg-red-500",
    pillSolidClass: "bg-red-500 text-white",
    pillSoftClass: "bg-red-500/30 text-white backdrop-blur-md",
  },
  {
    id: "orange",
    label: "Sunset",
    hex: "#F97316",
    textClass: "text-orange-500",
    swatchClass: "bg-orange-500",
    pillSolidClass: "bg-orange-500 text-white",
    pillSoftClass: "bg-orange-500/30 text-white backdrop-blur-md",
  },
  {
    id: "amber",
    label: "Gold",
    hex: "#FACC15",
    textClass: "text-yellow-400",
    swatchClass: "bg-yellow-400",
    pillSolidClass: "bg-yellow-400 text-zinc-950",
    pillSoftClass: "bg-yellow-400/30 text-yellow-200 backdrop-blur-md",
  },
  {
    id: "emerald",
    label: "Emerald",
    hex: "#22C55E",
    textClass: "text-green-500",
    swatchClass: "bg-green-500",
    pillSolidClass: "bg-green-500 text-white",
    pillSoftClass: "bg-green-500/30 text-white backdrop-blur-md",
  },
  {
    id: "cyan",
    label: "Aqua",
    hex: "#06B6D4",
    textClass: "text-cyan-400",
    swatchClass: "bg-cyan-400",
    pillSolidClass: "bg-cyan-500 text-zinc-950",
    pillSoftClass: "bg-cyan-500/30 text-white backdrop-blur-md",
  },
  {
    id: "violet",
    label: "Violet",
    hex: "#8B5CF6",
    textClass: "text-violet-400",
    swatchClass: "bg-violet-500",
    pillSolidClass: "bg-violet-600 text-white",
    pillSoftClass: "bg-violet-600/30 text-white backdrop-blur-md",
  },
  {
    id: "rose",
    label: "Magenta",
    hex: "#EC4899",
    textClass: "text-pink-500",
    swatchClass: "bg-pink-500",
    pillSolidClass: "bg-pink-500 text-white",
    pillSoftClass: "bg-pink-500/30 text-white backdrop-blur-md",
  },
];

export const STORY_FONTS = [
  { id: "modern", name: "Modern", className: "font-sans font-bold tracking-tight", canvasFont: "bold {px}px sans-serif" },
  { id: "classic", name: "Classic", className: "font-serif font-semibold", canvasFont: "600 {px}px Georgia, serif" },
  { id: "signature", name: "Signature", className: "font-serif italic font-medium", canvasFont: "italic 500 {px}px Georgia, serif" },
  { id: "editorial", name: "Editorial", className: "font-serif uppercase tracking-widest font-bold", canvasFont: "bold {px}px Georgia, serif" },
  { id: "neon", name: "Neon", className: "font-mono font-bold drop-shadow-[0_0_12px_rgba(24,119,242,0.95)]", canvasFont: "bold {px}px monospace" },
  { id: "strong", name: "Strong", className: "font-sans font-black uppercase tracking-wide", canvasFont: "900 {px}px sans-serif" },
] as const;

export const FONT_SIZE_STEPS = [
  { step: 0, textClass: "text-sm", canvasPx: 30, dotHeight: "h-2" },
  { step: 1, textClass: "text-base", canvasPx: 36, dotHeight: "h-2.5" },
  { step: 2, textClass: "text-xl", canvasPx: 44, dotHeight: "h-3" },
  { step: 3, textClass: "text-2xl", canvasPx: 54, dotHeight: "h-3.5" },
  { step: 4, textClass: "text-3xl", canvasPx: 66, dotHeight: "h-4" },
  { step: 5, textClass: "text-4xl", canvasPx: 80, dotHeight: "h-4.5" },
  { step: 6, textClass: "text-5xl", canvasPx: 96, dotHeight: "h-5" },
] as const;

export const CREATE_GRADIENTS = [
  {
    id: "deep_blue",
    name: "Deep Ocean",
    bgClass: "bg-gradient-to-br from-[#1877F2] via-blue-700 to-slate-950",
    stops: ["#1877F2", "#1D4ED8", "#020617"],
  },
  {
    id: "sunset_glow",
    name: "Sunset",
    bgClass: "bg-gradient-to-br from-rose-500 via-orange-500 to-amber-400",
    stops: ["#F43F5E", "#F97316", "#FBBF24"],
  },
  {
    id: "emerald_mist",
    name: "Emerald",
    bgClass: "bg-gradient-to-br from-emerald-500 via-teal-600 to-slate-950",
    stops: ["#10B981", "#0D9488", "#020617"],
  },
  {
    id: "midnight_ink",
    name: "Midnight",
    bgClass: "bg-gradient-to-br from-zinc-800 via-zinc-900 to-black",
    stops: ["#27272A", "#18181B", "#000000"],
  },
  {
    id: "aurora_sky",
    name: "Aurora",
    bgClass: "bg-gradient-to-br from-sky-400 via-[#1877F2] to-indigo-950",
    stops: ["#38BDF8", "#1877F2", "#1E1B4B"],
  },
  {
    id: "crimson_velvet",
    name: "Velvet",
    bgClass: "bg-gradient-to-br from-red-600 via-rose-700 to-zinc-950",
    stops: ["#DC2626", "#BE123C", "#09090B"],
  },
] as const;

export const STUDIO_EFFECTS = [
  { id: "normal", name: "Normal", filterClass: "", canvasFilter: "none", swatchBg: "bg-zinc-700" },
  { id: "chrome", name: "Chrome", filterClass: "contrast-125 saturate-150", canvasFilter: "contrast(1.25) saturate(1.5)", swatchBg: "bg-sky-500" },
  { id: "warm", name: "Warm", filterClass: "sepia-[.25] saturate-150 brightness-105", canvasFilter: "sepia(0.25) saturate(1.5) brightness(1.05)", swatchBg: "bg-amber-500" },
  { id: "vivid", name: "Vivid", filterClass: "saturate-200 contrast-110", canvasFilter: "saturate(2) contrast(1.1)", swatchBg: "bg-rose-500" },
  { id: "mono", name: "Mono", filterClass: "grayscale contrast-125", canvasFilter: "grayscale(1) contrast(1.25)", swatchBg: "bg-zinc-400" },
  { id: "frost", name: "Frost", filterClass: "hue-rotate-15 saturate-125 brightness-105", canvasFilter: "hue-rotate(15deg) saturate(1.25) brightness(1.05)", swatchBg: "bg-cyan-400" },
] as const;

const BUILTIN_SONGS = [
  {
    id: "preset_lofi",
    title: "Dhaka Midnight LoFi",
    artist: "Deep Shop Studio",
    url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3",
    coverUrl: parkShowcaseImg,
  },
  {
    id: "preset_upbeat",
    title: "Morning Horizon",
    artist: "Creator Beats",
    url: "https://cdn.pixabay.com/download/audio/2022/10/24/audio_34b4ce6dcb.mp3?filename=uplifting-upbeat-corporate-125086.mp3",
    coverUrl: creatorAvatar1,
  },
  {
    id: "preset_future",
    title: "Future Pulse",
    artist: "Neon Syndicate",
    url: "https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3?filename=electronic-future-beats-117997.mp3",
    coverUrl: creatorAvatar2,
  },
  {
    id: "preset_summer",
    title: "Golden Hour Vibe",
    artist: "Coastline",
    url: "https://cdn.pixabay.com/download/audio/2021/08/04/audio_c6ccf3232f.mp3?filename=summer-nights-tropical-house-music-11440.mp3",
    coverUrl: creatorAvatar3,
  },
  {
    id: "preset_vlog",
    title: "Streetwalk Rhythm",
    artist: "Daily Reel",
    url: "https://cdn.pixabay.com/download/audio/2021/11/24/audio_a1622f98f6.mp3?filename=modern-vlog-140795.mp3",
    coverUrl: parkShowcaseImg,
  },
];

const TEXT_PRESETS = [
  "New arrival at Deep Shop",
  "Behind the scenes today",
  "Drop your thoughts below",
  "Limited restock live now",
  "Verified community update",
];

export interface StoryTextLayer {
  id: string;
  text: string;
  fontId: string;
  colorId: string;
  sizeStep: number;
  align: "left" | "center" | "right";
  pillMode: "none" | "solid" | "soft";
  outline: boolean;
  animation: "none" | "pulse" | "bounce";
  caseMode: "normal" | "upper" | "lower";
  texture: "clean" | "shimmer" | "neon";
}

export type StoryStickerKind =
  | "location"
  | "mention"
  | "add_yours"
  | "questions"
  | "notify"
  | "avatar"
  | "reaction"
  | "poll"
  | "slider"
  | "link"
  | "hashtag"
  | "countdown"
  | "shop_order"
  | "gif"
  | "frame"
  | "photo"
  | "cutout"
  | "clock"
  | "heart_count"
  | "sound_on"
  | "day_stamp";

export interface StoryStickerItem {
  id: string;
  kind: StoryStickerKind;
  title: string;
  subtitle?: string;
  optionA?: string;
  optionB?: string;
  emoji?: string;
  url?: string;
  imageUrl?: string;
  productId?: string;
  priceLabel?: string;
  targetUid?: string;
}

interface DrawStroke {
  points: { x: number; y: number }[];
  colorHex: string;
  width: number;
  mode: "pen" | "marker" | "neon" | "eraser";
}

const LEGACY_GALLERY_KEY = "deep_story_gallery_v1";
const LEGACY_FAVS_KEY = "deep_story_favs_v1";
const getScopedGalleryKey = (uid: string) => `deep_story_gallery_v2_${uid}`;
const getScopedFavsKey = (uid: string) => `deep_story_favs_v2_${uid}`;

function getDhakaClockParts() {
  try {
    const now = new Date();
    const timeStr = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Dhaka",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);
    const dayStr = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Dhaka",
      weekday: "long",
    })
      .format(now)
      .toUpperCase();
    const dateStr = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      day: "2-digit",
      month: "short",
    }).format(now);
    const [hh = "12", mm = "00"] = timeStr.split(":");
    return { hh, mm, dayStr, dateStr };
  } catch {
    return { hh: "12", mm: "00", dayStr: "TODAY", dateStr: "Today" };
  }
}

export default function AddStory() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const notify = useNotify();
  const footerLogo = useFooterLogo();

  const fromNewsHub =
    searchParams.get("from") === "news-hub" ||
    location.pathname.startsWith("/news-hub");
  const promptParam = searchParams.get("prompt") || "";

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<Record<string, any> | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Primary Studio Mode
  const [step, setStep] = useState<StudioStep>("gallery");

  // Gallery & Album State
  const [albumFilter, setAlbumFilter] = useState<AlbumFilter>("recents");
  const [albumMenuOpen, setAlbumMenuOpen] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);
  const [uploadedItems, setUploadedItems] = useState<GalleryMediaItem[]>([]);
  const [shopProducts, setShopProducts] = useState<any[]>([]);
  const [communityUsers, setCommunityUsers] = useState<any[]>([]);
  const [closeFriendCandidates, setCloseFriendCandidates] = useState<any[]>([]);
  const [chatContacts, setChatContacts] = useState<any[]>([]);

  // Story Settings Sheet
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [replyPrivacy, setReplyPrivacy] = useState<"everyone" | "followers" | "off">("everyone");
  const [autoSaveArchive, setAutoSaveArchive] = useState(true);

  // Camera & Collage State
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [flashMode, setFlashMode] = useState<"off" | "on" | "auto">("off");
  const [cameraRailExpanded, setCameraRailExpanded] = useState(true);
  const [boomerangMode, setBoomerangMode] = useState(false);
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const [countdownSec, setCountdownSec] = useState<number | null>(null);
  const [collageSlotsCount, setCollageSlotsCount] = useState<2 | 3 | 4>(2);
  const [collageImages, setCollageImages] = useState<string[]>([]);

  // Active Canvas Background & 2-Finger Pinch Zoom State
  const [createMode, setCreateMode] = useState(false);
  const [createGradientIdx, setCreateGradientIdx] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState<GalleryMediaItem | null>(null);
  const [mediaScale, setMediaScale] = useState<number>(1);
  const [mediaOffset, setMediaOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const pinchStateRef = useRef<{
    active: boolean;
    initialDist: number;
    initialScale: number;
    initialMidX: number;
    initialMidY: number;
    initialOffsetX: number;
    initialOffsetY: number;
  } | null>(null);
  const [effectId, setEffectId] = useState<string>("normal");
  const [isBoomerangClip, setIsBoomerangClip] = useState(false);

  // Editor Overlays & Tools
  const [railExpanded, setRailExpanded] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [effectsBarOpen, setEffectsBarOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [aiLabel, setAiLabel] = useState(false);
  const [allowCommenting, setAllowCommenting] = useState(true);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  // Text Studio State
  const [textStudioOpen, setTextStudioOpen] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [draftFontId, setDraftFontId] = useState<string>("modern");
  const [draftColorId, setDraftColorId] = useState<string>("white");
  const [draftSizeStep, setDraftSizeStep] = useState<number>(3);
  const [draftAlign, setDraftAlign] = useState<"left" | "center" | "right">("center");
  const [draftPillMode, setDraftPillMode] = useState<"none" | "solid" | "soft">("none");
  const [draftOutline, setDraftOutline] = useState(true);
  const [draftAnimation, setDraftAnimation] = useState<"none" | "pulse" | "bounce">("none");
  const [draftCaseMode, setDraftCaseMode] = useState<"normal" | "upper" | "lower">("normal");
  const [draftTexture, setDraftTexture] = useState<"clean" | "shimmer" | "neon">("clean");
  const [textColorTrayOpen, setTextColorTrayOpen] = useState(true);
  const [textBottomTab, setTextBottomTab] = useState<"text" | "texts" | "texture">("text");
  const [textLayers, setTextLayers] = useState<StoryTextLayer[]>([]);

  // Freehand Drawing State
  const [drawModeOpen, setDrawModeOpen] = useState(false);
  const [drawBrush, setDrawBrush] = useState<"pen" | "marker" | "neon" | "eraser">("pen");
  const [drawColorId, setDrawColorId] = useState<string>("white");
  const [drawWidth, setDrawWidth] = useState<number>(8);
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const activeStrokeRef = useRef<DrawStroke | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Music / Audio State
  const [musicSheetOpen, setMusicSheetOpen] = useState(false);
  const [musicSearch, setMusicSearch] = useState("");
  const [songsList, setSongsList] = useState<any[]>(BUILTIN_SONGS);
  const [attachedSong, setAttachedSong] = useState<{
    id: string;
    title: string;
    artist: string;
    url: string;
    coverUrl: string;
  } | null>(null);
  const [previewingSongId, setPreviewingSongId] = useState<string | null>(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stickers & Sticker Config Modal State
  const [stickerTrayOpen, setStickerTrayOpen] = useState(false);
  const [stickerSearch, setStickerSearch] = useState("");
  const [placedStickers, setPlacedStickers] = useState<StoryStickerItem[]>([]);
  const [configuringSticker, setConfiguringSticker] = useState<StoryStickerKind | null>(null);
  const [configTitle, setConfigTitle] = useState("");
  const [configSubtitle, setConfigSubtitle] = useState("");
  const [configOptA, setConfigOptA] = useState("Yes");
  const [configOptB, setConfigOptB] = useState("Definitely");
  const [configEmoji, setConfigEmoji] = useState("😍");
  const [configSearchUser, setConfigSearchUser] = useState("");

  // Hidden File Inputs
  const galleryUploadInputRef = useRef<HTMLInputElement | null>(null);
  const stickerPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const cutoutPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const collageSlotInputRef = useRef<HTMLInputElement | null>(null);

  // Close Friends & Share Sheet State
  const [closeFriendsOpen, setCloseFriendsOpen] = useState(false);
  const [closeFriendsSearch, setCloseFriendsSearch] = useState("");
  const [closeFriendIds, setCloseFriendIds] = useState<string[]>([]);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareTargetAudience, setShareTargetAudience] = useState<"story" | "close_friends">("story");
  const [shareMessageQuery, setShareMessageQuery] = useState("");
  const [selectedDmUserIds, setSelectedDmUserIds] = useState<string[]>([]);

  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const dhakaClock = useMemo(() => getDhakaClockParts(), [stickerTrayOpen, step]);

  /* --------------------------------------------------------------------------
   * 1. AUTH, PROFILE, CLOSE FRIENDS, SONGS, PRODUCTS & REAL GALLERY HYDRATION
   * ------------------------------------------------------------------------ */
  useEffect(() => {
    // Purge legacy unscoped keys so one user's photos never leak to another user on the same browser
    try {
      localStorage.removeItem(LEGACY_GALLERY_KEY);
      localStorage.removeItem(LEGACY_FAVS_KEY);
    } catch {}

    const unsub = onAuthStateChanged(auth, async (u) => {
      setCurrentUser(u);
      if (!u) {
        setUploadedItems([]);
        setFavouriteIds([]);
        setAuthLoading(false);
        navigate("/signin");
        return;
      }

      // Strictly load ONLY this user's private uploaded/captured gallery items
      try {
        const rawGallery = JSON.parse(
          localStorage.getItem(getScopedGalleryKey(u.uid)) || "[]"
        );
        if (Array.isArray(rawGallery)) {
          setUploadedItems(
            rawGallery.filter((item: any) => item && item.ownerUid === u.uid)
          );
        } else {
          setUploadedItems([]);
        }
      } catch {
        setUploadedItems([]);
      }

      try {
        const rawFavs = JSON.parse(
          localStorage.getItem(getScopedFavsKey(u.uid)) || "[]"
        );
        setFavouriteIds(Array.isArray(rawFavs) ? rawFavs : []);
      } catch {
        setFavouriteIds([]);
      }

      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          const data = snap.data();
          setUserProfile(data);
          if (Array.isArray(data.closeFriends)) {
            setCloseFriendIds(data.closeFriends);
          } else {
            const cachedCf = JSON.parse(
              localStorage.getItem(`deep_close_friends_${u.uid}`) || "[]"
            );
            if (Array.isArray(cachedCf)) setCloseFriendIds(cachedCf);
          }
        }
      } catch {}
      setAuthLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  // Reset pinch zoom & pan to exact 1:1 natural aspect ratio whenever media changes
  useEffect(() => {
    setMediaScale(1);
    setMediaOffset({ x: 0, y: 0 });
  }, [selectedMedia?.id, createMode]);

  // Pre-populate "Add yours" prompt if opened from a viewer's "Add yours" tap
  useEffect(() => {
    if (promptParam && placedStickers.length === 0) {
      setPlacedStickers([
        {
          id: `stk_${Date.now()}`,
          kind: "add_yours",
          title: promptParam,
          subtitle: "Add yours",
        },
      ]);
    }
  }, [promptParam]);

  // Load real songs from Firestore `story_songs` + built-in tracks
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "story_songs"),
      (snap) => {
        const remote = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title || data.name || "Featured Audio",
              artist: data.artist || "Deep Shop Audio",
              url: data.url || data.mp3Url || "",
              coverUrl: data.coverUrl || footerLogo || deepShopLogoFallback,
            };
          })
          .filter((s) => Boolean(s.url));
        setSongsList([...remote, ...BUILTIN_SONGS]);
      },
      () => {
        setSongsList(BUILTIN_SONGS);
      }
    );
    return () => unsub();
  }, [footerLogo]);

  // Load shop products (for sticker tagging only — NEVER mixed into user's private photo gallery) & community users
  useEffect(() => {
    let active = true;
    const hydrateData = async () => {
      try {
        const [prodSnap, usersSnap] = await Promise.all([
          getDocs(collection(db, "products")).catch(() => null),
          getDocs(collection(db, "users")).catch(() => null),
        ]);
        if (!active) return;

        const prods: any[] = [];
        const seenUrls = new Set<string>();

        prodSnap?.docs.forEach((d) => {
          const data = d.data();
          const img =
            data.image ||
            (Array.isArray(data.images) ? data.images[0] : "") ||
            "";
          if (img && !seenUrls.has(img)) {
            seenUrls.add(img);
            prods.push({
              id: d.id,
              name: data.name || data.title || "Deep Shop Product",
              price: data.discountPrice || data.price || 0,
              image: img,
            });
          }
        });

        const usersList: any[] = [];
        usersSnap?.docs.forEach((d) => {
          if (d.id === auth.currentUser?.uid) return;
          const data = d.data();
          const name = data.name || data.displayName || data.shopName || "";
          if (name) {
            usersList.push({
              uid: d.id,
              name,
              handle:
                data.username ||
                String(name)
                  .toLowerCase()
                  .replace(/[^a-z0-9]/g, "")
                  .slice(0, 16) ||
                "member",
              avatar: data.avatar || data.photoURL || creatorAvatar1,
            });
          }
        });

        setShopProducts(prods.slice(0, 24));
        setCommunityUsers(usersList.slice(0, 40));
      } catch {}
    };
    hydrateData();
    return () => {
      active = false;
    };
  }, []);

  // Load ONLY real Followers & Following for Close Friends, and ONLY real Chat Partners for Message Share
  useEffect(() => {
    if (!currentUser?.uid) {
      setCloseFriendCandidates([]);
      setChatContacts([]);
      return;
    }

    let active = true;
    const uid = currentUser.uid;
    const DEMO_EXCLUDED_IDS = new Set([
      uid,
      "system",
      "member_local",
      "guest_local",
      "author_demo",
      "user_marup",
      "user_shadat",
      "user_alif",
      "user_samiya",
      "user_ziaur",
      "user_ahsan",
      "user_rabeya",
      "user_riyadh",
      "user_siyam",
    ]);

    const formatHandle = (data: Record<string, any>, fallbackName: string) =>
      data.username ||
      data.customLink ||
      String(fallbackName)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 16) ||
      "member";

    const loadConnectionsAndChats = async () => {
      try {
        const followingSet = new Set<string>(getLocalFollowedIds(uid));
        const followerSet = new Set<string>();

        if (Array.isArray(userProfile?.following)) {
          userProfile.following.forEach((id: string) => {
            if (id && !DEMO_EXCLUDED_IDS.has(id)) followingSet.add(id);
          });
        }
        if (Array.isArray(userProfile?.followers)) {
          userProfile.followers.forEach((id: string) => {
            if (id && !DEMO_EXCLUDED_IDS.has(id)) followerSet.add(id);
          });
        }

        const [followersQuerySnap, followingQuerySnap, chatsSnap] = await Promise.all([
          getDocs(query(collection(db, "users"), where("following", "array-contains", uid))).catch(() => null),
          getDocs(query(collection(db, "users"), where("followers", "array-contains", uid))).catch(() => null),
          getDocs(query(collection(db, "p2p_chats"), where("participants", "array-contains", uid))).catch(() => null),
        ]);

        if (!active) return;

        followersQuerySnap?.docs.forEach((d) => {
          if (!DEMO_EXCLUDED_IDS.has(d.id)) followerSet.add(d.id);
        });
        followingQuerySnap?.docs.forEach((d) => {
          if (!DEMO_EXCLUDED_IDS.has(d.id)) followingSet.add(d.id);
        });

        // Build Close Friends candidates exclusively from Followers + Following (+ already-selected Close Friends)
        const cfUnionIds = Array.from(
          new Set<string>([
            ...Array.from(followingSet),
            ...Array.from(followerSet),
            ...closeFriendIds.filter((id) => !DEMO_EXCLUDED_IDS.has(id)),
          ])
        ).filter((id) => Boolean(id) && !DEMO_EXCLUDED_IDS.has(id));

        const cfProfiles = await Promise.all(
          cfUnionIds.map(async (targetId) => {
            try {
              const uSnap = await getDoc(doc(db, "users", targetId));
              if (!uSnap.exists()) return null;
              const data = uSnap.data();
              if (data.isBanned || data.isDemo) return null;
              const name = data.displayName || data.shopName || data.name || "";
              if (!name) return null;
              const isFollower = followerSet.has(targetId);
              const isFollowing = followingSet.has(targetId);
              const relationLabel =
                isFollower && isFollowing
                  ? "Mutual"
                  : isFollower
                  ? "Follower"
                  : isFollowing
                  ? "Following"
                  : "Close Friend";
              return {
                uid: targetId,
                name,
                handle: formatHandle(data, name),
                avatar: data.photoURL || data.avatar || data.shopLogo || creatorAvatar1,
                relationLabel,
              };
            } catch {
              return null;
            }
          })
        );

        // Build Message Share contacts exclusively from real 1:1 p2p_chats where users talked
        const rawChatThreads: { chatId: string; otherUid: string; updatedAtMs: number }[] = [];
        const seenChatUids = new Set<string>();

        const sortedChatDocs = [...(chatsSnap?.docs || [])].sort((a, b) => {
          const da = a.data();
          const dbData = b.data();
          const ta = da.updatedAt?.toMillis ? da.updatedAt.toMillis() : Number(da.updatedAt || 0);
          const tb = dbData.updatedAt?.toMillis ? dbData.updatedAt.toMillis() : Number(dbData.updatedAt || 0);
          return tb - ta;
        });

        for (const cDoc of sortedChatDocs) {
          const cData = cDoc.data();
          if (cData.isGroup || cData.type === "group") continue;
          const hasConversation = Boolean(
            cData.lastMessage || cData.lastSenderId || cData.updatedAt
          );
          if (!hasConversation) continue;
          const otherId = Array.isArray(cData.participants)
            ? cData.participants.find((p: string) => p && p !== uid)
            : null;
          if (!otherId || DEMO_EXCLUDED_IDS.has(otherId) || seenChatUids.has(otherId)) continue;
          seenChatUids.add(otherId);
          const updatedAtMs = cData.updatedAt?.toMillis
            ? cData.updatedAt.toMillis()
            : Number(cData.updatedAt || 0);
          rawChatThreads.push({
            chatId: cDoc.id,
            otherUid: otherId,
            updatedAtMs,
          });
        }

        const resolvedChatPartners = await Promise.all(
          rawChatThreads.map(async (item) => {
            try {
              const uSnap = await getDoc(doc(db, "users", item.otherUid));
              if (!uSnap.exists()) return null;
              const data = uSnap.data();
              if (data.isBanned || data.isDemo) return null;
              const name = data.displayName || data.shopName || data.name || "";
              if (!name) return null;
              return {
                uid: item.otherUid,
                chatId: item.chatId,
                name,
                handle: formatHandle(data, name),
                avatar: data.photoURL || data.avatar || data.shopLogo || creatorAvatar1,
              };
            } catch {
              return null;
            }
          })
        );

        if (!active) return;
        setCloseFriendCandidates(cfProfiles.filter(Boolean));
        setChatContacts(resolvedChatPartners.filter(Boolean));
      } catch {}
    };

    loadConnectionsAndChats();
    return () => {
      active = false;
    };
  }, [currentUser?.uid, userProfile]);

  // Privacy-safe gallery: ONLY show the currently logged-in user's own uploaded/captured photos
  const visibleGallery = useMemo(() => {
    const uid = currentUser?.uid;
    if (!uid) return [];
    const ownMedia = uploadedItems.filter((m) => m.ownerUid === uid);
    if (albumFilter === "videos") {
      return ownMedia.filter((m) => m.type === "video");
    }
    if (albumFilter === "favourites") {
      return ownMedia.filter((m) => favouriteIds.includes(m.id));
    }
    return ownMedia;
  }, [uploadedItems, currentUser?.uid, albumFilter, favouriteIds]);

  /* --------------------------------------------------------------------------
   * 2. LIVE CAMERA MANAGEMENT (`getUserMedia` + CLEANUP)
   * ------------------------------------------------------------------------ */
  useEffect(() => {
    if (step !== "camera") {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      setCameraReady(false);
      return;
    }

    let cancelled = false;
    const startCamera = async () => {
      setCameraError(false);
      try {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError(true);
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        mediaStreamRef.current = stream;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          await videoPreviewRef.current.play().catch(() => {});
        }
        setCameraReady(true);
      } catch {
        if (!cancelled) setCameraError(true);
      }
    };

    startCamera();
    return () => {
      cancelled = true;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [step, facingMode]);

  /* --------------------------------------------------------------------------
   * 3. AUDIO PLAYBACK SYNC (EDITOR + SONG PICKER PREVIEW)
   * ------------------------------------------------------------------------ */
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
    }
    const audio = audioRef.current;

    const previewTrack = previewingSongId
      ? songsList.find((s) => s.id === previewingSongId)
      : null;
    const activeUrl = previewTrack?.url || (step === "editor" && !audioMuted ? attachedSong?.url : "");

    if (activeUrl) {
      if (audio.src !== activeUrl) {
        audio.src = activeUrl;
      }
      audio.muted = false;
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }

    return () => {
      if (step !== "editor" && !musicSheetOpen) {
        audio.pause();
      }
    };
  }, [previewingSongId, attachedSong, step, audioMuted, musicSheetOpen, songsList]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  /* --------------------------------------------------------------------------
   * 4. FREEHAND DRAWING CANVAS RENDERER
   * ------------------------------------------------------------------------ */
  const redrawStrokesCanvas = useCallback((strokeList: DrawStroke[]) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokeList.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.lineWidth = stroke.width;

      if (stroke.mode === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else if (stroke.mode === "marker") {
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = stroke.colorHex;
      } else if (stroke.mode === "neon") {
        ctx.globalCompositeOperation = "source-over";
        ctx.shadowColor = stroke.colorHex;
        ctx.shadowBlur = 18;
        ctx.strokeStyle = "#FFFFFF";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = stroke.colorHex;
      }

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    });
  }, []);

  useEffect(() => {
    redrawStrokesCanvas(strokes);
  }, [strokes, redrawStrokesCanvas, step]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(rect.width, 1);
    const scaleY = canvas.height / Math.max(rect.height, 1);
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleDrawPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawModeOpen || pinchStateRef.current?.active) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getCanvasPoint(e);
    const colorObj = STORY_COLORS.find((c) => c.id === drawColorId) || STORY_COLORS[0];
    const newStroke: DrawStroke = {
      points: [pt, { x: pt.x + 0.5, y: pt.y + 0.5 }],
      colorHex: colorObj.hex,
      width: drawBrush === "marker" ? drawWidth * 2.2 : drawBrush === "eraser" ? drawWidth * 3 : drawWidth,
      mode: drawBrush,
    };
    activeStrokeRef.current = newStroke;
    redrawStrokesCanvas([...strokes, newStroke]);
  };

  const handleDrawPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawModeOpen || !activeStrokeRef.current || pinchStateRef.current?.active) return;
    const pt = getCanvasPoint(e);
    activeStrokeRef.current.points.push(pt);
    redrawStrokesCanvas([...strokes, activeStrokeRef.current]);
  };

  const handleDrawPointerUp = () => {
    if (!drawModeOpen || !activeStrokeRef.current) return;
    const finished = activeStrokeRef.current;
    activeStrokeRef.current = null;
    setStrokes((prev) => [...prev, finished]);
  };

  // 2-Finger Pinch-to-Zoom & Two-Finger Pan on Story Stage
  const handleStageTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (createMode || !selectedMedia) return;
    if (e.touches.length === 2) {
      // Cancel any in-progress single-finger brush stroke when 2nd finger touches down
      if (activeStrokeRef.current) {
        activeStrokeRef.current = null;
        redrawStrokesCanvas(strokes);
      }
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const midX = (t0.clientX + t1.clientX) / 2;
      const midY = (t0.clientY + t1.clientY) / 2;
      pinchStateRef.current = {
        active: true,
        initialDist: Math.max(dist, 1),
        initialScale: mediaScale,
        initialMidX: midX,
        initialMidY: midY,
        initialOffsetX: mediaOffset.x,
        initialOffsetY: mediaOffset.y,
      };
    }
  };

  const handleStageTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStateRef.current?.active) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const midX = (t0.clientX + t1.clientX) / 2;
      const midY = (t0.clientY + t1.clientY) / 2;
      const { initialDist, initialScale, initialMidX, initialMidY, initialOffsetX, initialOffsetY } =
        pinchStateRef.current;
      const nextScale = Math.min(4, Math.max(0.4, initialScale * (dist / initialDist)));
      const nextX = initialOffsetX + (midX - initialMidX);
      const nextY = initialOffsetY + (midY - initialMidY);
      setMediaScale(nextScale);
      setMediaOffset({ x: nextX, y: nextY });
    }
  };

  const handleStageTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2 && pinchStateRef.current) {
      pinchStateRef.current = null;
    }
  };

  const handleStageWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (createMode || !selectedMedia) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.008;
      setMediaScale((prev) => Math.min(4, Math.max(0.4, prev + delta)));
    }
  };

  const hasCustomMediaTransform =
    Math.abs(mediaScale - 1) > 0.015 ||
    Math.abs(mediaOffset.x) > 1.5 ||
    Math.abs(mediaOffset.y) > 1.5;

  /* --------------------------------------------------------------------------
   * 5. GALLERY UPLOAD, FAVOURITES, COLLAGE & CAMERA CAPTURE HANDLERS
   * ------------------------------------------------------------------------ */
  const persistUploadedItem = (item: GalleryMediaItem) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const scopedItem: GalleryMediaItem = { ...item, ownerUid: uid };
    setUploadedItems((prev) => {
      const next = [
        scopedItem,
        ...prev.filter((x) => x.ownerUid === uid && x.url !== scopedItem.url),
      ].slice(0, 30);
      try {
        localStorage.setItem(getScopedGalleryKey(uid), JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const toggleFavourite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    triggerHaptic();
    setFavouriteIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(getScopedFavsKey(uid), JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleDeviceGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      notify("Please select a photo for your story.", "info");
      return;
    }

    setUploading(true);
    try {
      const batchSlice = imageFiles.slice(0, 4);
      const aiCheckPromise = detectAiGeneratedFiles(batchSlice).catch(() => false);
      const uploadedBatch: GalleryMediaItem[] = [];
      for (const file of batchSlice) {
        const url = await uploadToImgbb(file);
        if (url) {
          const item: GalleryMediaItem = {
            id: `up_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            url,
            type: "image",
            source: "upload",
            label: file.name,
          };
          persistUploadedItem(item);
          uploadedBatch.push(item);
        }
      }
      const detectedAi = await aiCheckPromise;
      if (detectedAi) {
        setAiLabel(true);
      }
      if (uploadedBatch.length === 1) {
        setCreateMode(false);
        setSelectedMedia(uploadedBatch[0]);
        setStep("editor");
        triggerHaptic();
      } else if (uploadedBatch.length > 1) {
        const urls = uploadedBatch.map((b) => b.url);
        await buildCollageToEditor(urls);
      }
    } catch {
      notify("Could not load selected photo.", "error");
    } finally {
      setUploading(false);
    }
  };

  const buildCollageToEditor = async (urls: string[]) => {
    if (urls.length === 0) return;
    setUploading(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#09090B";
      ctx.fillRect(0, 0, 1080, 1920);

      const loadImg = (src: string) =>
        new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = src;
        });

      const drawCover = (
        img: HTMLImageElement | null,
        dx: number,
        dy: number,
        dw: number,
        dh: number
      ) => {
        if (!img) return;
        const imgRatio = img.width / Math.max(img.height, 1);
        const slotRatio = dw / Math.max(dh, 1);
        let sx = 0;
        let sy = 0;
        let sw = img.width;
        let sh = img.height;
        if (imgRatio > slotRatio) {
          sw = img.height * slotRatio;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / slotRatio;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
      };

      const imgs = await Promise.all(urls.slice(0, 4).map(loadImg));
      const gap = 8;

      if (imgs.length === 1) {
        drawCover(imgs[0], 0, 0, 1080, 1920);
      } else if (imgs.length === 2) {
        drawCover(imgs[0], 0, 0, 1080, 960 - gap / 2);
        drawCover(imgs[1], 0, 960 + gap / 2, 1080, 960 - gap / 2);
      } else if (imgs.length === 3) {
        drawCover(imgs[0], 0, 0, 1080, 960 - gap / 2);
        drawCover(imgs[1], 0, 960 + gap / 2, 540 - gap / 2, 960 - gap / 2);
        drawCover(imgs[2], 540 + gap / 2, 960 + gap / 2, 540 - gap / 2, 960 - gap / 2);
      } else {
        drawCover(imgs[0], 0, 0, 540 - gap / 2, 960 - gap / 2);
        drawCover(imgs[1], 540 + gap / 2, 0, 540 - gap / 2, 960 - gap / 2);
        drawCover(imgs[2], 0, 960 + gap / 2, 540 - gap / 2, 960 - gap / 2);
        drawCover(imgs[3], 540 + gap / 2, 960 + gap / 2, 540 - gap / 2, 960 - gap / 2);
      }

      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob((b) => res(b), "image/jpeg", 0.85)
      );
      let finalUrl = canvas.toDataURL("image/jpeg", 0.82);
      if (blob) {
        const file = new File([blob], `collage-${Date.now()}.jpg`, { type: "image/jpeg" });
        finalUrl = await uploadToImgbb(file);
      }

      const collageItem: GalleryMediaItem = {
        id: `col_${Date.now()}`,
        url: finalUrl,
        type: "image",
        source: "upload",
        label: "Story Collage",
      };
      persistUploadedItem(collageItem);
      setCreateMode(false);
      setSelectedMedia(collageItem);
      setStep("editor");
      triggerHaptic();
    } catch {
      notify("Could not assemble collage.", "error");
    } finally {
      setUploading(false);
    }
  };

  const snapCameraFrame = useCallback(async () => {
    triggerHaptic();
    const canvas = document.createElement("canvas");
    const vid = videoPreviewRef.current;
    const hasLiveVideo = Boolean(vid && cameraReady && vid.videoWidth > 0 && vid.videoHeight > 0);
    const maxEdge = 1440;
    if (hasLiveVideo && vid) {
      const scale = Math.min(1, maxEdge / Math.max(vid.videoWidth, vid.videoHeight, 1));
      canvas.width = Math.max(1, Math.round(vid.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(vid.videoHeight * scale));
    } else {
      canvas.width = 1080;
      canvas.height = 1920;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const activeEff = STUDIO_EFFECTS.find((e) => e.id === effectId) || STUDIO_EFFECTS[0];
    ctx.filter = activeEff.canvasFilter;

    if (hasLiveVideo && vid) {
      if (facingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, "#1877F2");
      grad.addColorStop(0.5, "#1E293B");
      grad.addColorStop(1, "#09090B");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (flashMode === "on") {
      ctx.filter = "none";
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    setUploading(true);
    try {
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob((b) => res(b), "image/jpeg", 0.85)
      );
      let url = canvas.toDataURL("image/jpeg", 0.82);
      if (blob) {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
        url = await uploadToImgbb(file);
      }
      const captured: GalleryMediaItem = {
        id: `cam_${Date.now()}`,
        url,
        type: "image",
        source: "upload",
        label: boomerangMode ? "Boomerang" : "Camera Capture",
      };
      persistUploadedItem(captured);
      setIsBoomerangClip(boomerangMode);
      setCreateMode(false);
      setSelectedMedia(captured);
      setStep("editor");
    } finally {
      setUploading(false);
    }
  }, [cameraReady, effectId, facingMode, flashMode, boomerangMode]);

  const handleShutterTrigger = () => {
    if (handsFreeMode) {
      if (countdownSec !== null) return;
      setCountdownSec(3);
      let rem = 3;
      const timer = window.setInterval(() => {
        rem -= 1;
        if (rem <= 0) {
          window.clearInterval(timer);
          setCountdownSec(null);
          snapCameraFrame();
        } else {
          setCountdownSec(rem);
        }
      }, 950);
      return;
    }
    snapCameraFrame();
  };

  /* --------------------------------------------------------------------------
   * 6. TEXT STUDIO ACTIONS
   * ------------------------------------------------------------------------ */
  const openTextStudioForNew = () => {
    setEditingTextId(null);
    setDraftText("");
    setDraftFontId("modern");
    setDraftColorId("white");
    setDraftSizeStep(3);
    setDraftAlign("center");
    setDraftPillMode("none");
    setDraftOutline(true);
    setDraftAnimation("none");
    setDraftCaseMode("normal");
    setDraftTexture("clean");
    setTextBottomTab("text");
    setTextStudioOpen(true);
    triggerHaptic();
  };

  const openTextStudioForExisting = (layer: StoryTextLayer) => {
    setEditingTextId(layer.id);
    setDraftText(layer.text);
    setDraftFontId(layer.fontId);
    setDraftColorId(layer.colorId);
    setDraftSizeStep(layer.sizeStep);
    setDraftAlign(layer.align);
    setDraftPillMode(layer.pillMode);
    setDraftOutline(layer.outline);
    setDraftAnimation(layer.animation);
    setDraftCaseMode(layer.caseMode);
    setDraftTexture(layer.texture);
    setTextStudioOpen(true);
    triggerHaptic();
  };

  const commitTextStudio = () => {
    const trimmed = draftText.trim();
    if (!trimmed) {
      if (editingTextId) {
        setTextLayers((prev) => prev.filter((l) => l.id !== editingTextId));
      }
      setTextStudioOpen(false);
      return;
    }

    const updatedLayer: StoryTextLayer = {
      id: editingTextId || `txt_${Date.now()}`,
      text: trimmed,
      fontId: draftFontId,
      colorId: draftColorId,
      sizeStep: draftSizeStep,
      align: draftAlign,
      pillMode: draftPillMode,
      outline: draftOutline,
      animation: draftAnimation,
      caseMode: draftCaseMode,
      texture: draftTexture,
    };

    setTextLayers((prev) =>
      editingTextId
        ? prev.map((l) => (l.id === editingTextId ? updatedLayer : l))
        : [...prev, updatedLayer]
    );
    setSelectedLayerId(updatedLayer.id);
    setTextStudioOpen(false);
    triggerHaptic();
  };

  /* --------------------------------------------------------------------------
   * 7. STICKER TRAY ACTIONS (ALL 18 STICKERS + LIVE CLOCK / BADGES)
   * ------------------------------------------------------------------------ */
  const addStickerInstant = (item: Omit<StoryStickerItem, "id">) => {
    const newItem: StoryStickerItem = {
      ...item,
      id: `stk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    setPlacedStickers((prev) => [...prev, newItem]);
    setSelectedLayerId(newItem.id);
    setStickerTrayOpen(false);
    setConfiguringSticker(null);
    triggerHaptic();
  };

  const openStickerConfigurator = (kind: StoryStickerKind) => {
    triggerHaptic();
    setConfigSearchUser("");
    if (kind === "location") {
      setConfigTitle("Dhaka, Bangladesh");
      setConfigSubtitle("Verified Hub");
    } else if (kind === "mention") {
      setConfigTitle("");
      setConfigSubtitle("");
    } else if (kind === "add_yours") {
      setConfigTitle("Share your best Deep Shop find today");
    } else if (kind === "questions") {
      setConfigTitle("Ask me a question");
    } else if (kind === "poll") {
      setConfigTitle("Which drop do you prefer?");
      setConfigOptA("Edition A");
      setConfigOptB("Edition B");
    } else if (kind === "slider") {
      setConfigTitle("Rate today's look");
      setConfigEmoji("🔥");
    } else if (kind === "link") {
      setConfigTitle("https://deepshop.top");
      setConfigSubtitle("Visit Deep Shop");
    } else if (kind === "hashtag") {
      setConfigTitle("DeepShop");
    } else if (kind === "countdown") {
      setConfigTitle("Flash Drop Live");
      setConfigSubtitle("Tonight · 9:00 PM");
    } else if (kind === "shop_order") {
      setConfigTitle("");
    }
    setConfiguringSticker(kind);
  };

  const handleSecondaryStickerUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "photo" | "cutout"
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const [url, isAi] = await Promise.all([
        uploadToImgbb(file),
        detectAiGeneratedFiles([file]).catch(() => false),
      ]);
      if (isAi) {
        setAiLabel(true);
      }
      if (url) {
        addStickerInstant({
          kind,
          title: kind === "cutout" ? "Cutout" : "Photo",
          imageUrl: url,
        });
      }
    } finally {
      setUploading(false);
    }
  };

  /* --------------------------------------------------------------------------
   * 8. CANVAS COMPOSITING FOR DOWNLOAD & BASE MEDIA FLATTENING
   * ------------------------------------------------------------------------ */
  const renderCompositeCanvas = async (includeTextAndStickers: boolean): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    const activeEff = STUDIO_EFFECTS.find((e) => e.id === effectId) || STUDIO_EFFECTS[0];
    ctx.save();
    ctx.filter = activeEff.canvasFilter;

    if (createMode || !selectedMedia?.url) {
      const gradDef = CREATE_GRADIENTS[createGradientIdx % CREATE_GRADIENTS.length];
      const g = ctx.createLinearGradient(0, 0, 1080, 1920);
      g.addColorStop(0, gradDef.stops[0]);
      g.addColorStop(0.5, gradDef.stops[1]);
      g.addColorStop(1, gradDef.stops[2]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 1080, 1920);
    } else {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, 1080, 1920);
      const bgImg = await new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = selectedMedia.url;
      });
      if (bgImg) {
        // Exact natural aspect ratio (object-contain) + user's 2-finger pinch scale & pan
        const fitScale = Math.min(
          1080 / Math.max(bgImg.width, 1),
          1920 / Math.max(bgImg.height, 1)
        );
        const drawW = bgImg.width * fitScale;
        const drawH = bgImg.height * fitScale;
        const stageRect = stageContainerRef.current?.getBoundingClientRect();
        const ratioX = stageRect && stageRect.width > 0 ? 1080 / stageRect.width : 2.5;
        const ratioY = stageRect && stageRect.height > 0 ? 1920 / stageRect.height : 2.5;
        ctx.save();
        ctx.translate(540 + mediaOffset.x * ratioX, 960 + mediaOffset.y * ratioY);
        ctx.scale(mediaScale, mediaScale);
        ctx.drawImage(bgImg, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
      }
    }
    ctx.restore();

    // Composite freehand brush strokes
    if (drawCanvasRef.current && strokes.length > 0) {
      ctx.drawImage(drawCanvasRef.current, 0, 0, 1080, 1920);
    }

    if (includeTextAndStickers) {
      // Render text layers centered cleanly for PNG Download
      textLayers.forEach((layer, idx) => {
        const colorDef = STORY_COLORS.find((c) => c.id === layer.colorId) || STORY_COLORS[0];
        const fontDef = STORY_FONTS.find((f) => f.id === layer.fontId) || STORY_FONTS[0];
        const sizeDef = FONT_SIZE_STEPS[layer.sizeStep] || FONT_SIZE_STEPS[3];
        const displayStr =
          layer.caseMode === "upper"
            ? layer.text.toUpperCase()
            : layer.caseMode === "lower"
            ? layer.text.toLowerCase()
            : layer.text;

        ctx.save();
        ctx.font = fontDef.canvasFont.replace("{px}", String(sizeDef.canvasPx));
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const yPos = 720 + idx * 140;

        if (layer.pillMode !== "none") {
          const metrics = ctx.measureText(displayStr);
          const bw = Math.min(960, metrics.width + 64);
          const bh = sizeDef.canvasPx + 42;
          ctx.fillStyle = layer.pillMode === "solid" ? colorDef.hex : "rgba(0,0,0,0.62)";
          ctx.beginPath();
          ctx.roundRect(540 - bw / 2, yPos - bh / 2, bw, bh, 24);
          ctx.fill();
          ctx.fillStyle =
            layer.pillMode === "solid" && colorDef.id === "white" ? "#09090B" : "#FFFFFF";
        } else {
          if (layer.outline) {
            ctx.shadowColor = "rgba(0,0,0,0.75)";
            ctx.shadowBlur = 12;
          }
          ctx.fillStyle = colorDef.hex;
        }
        ctx.fillText(displayStr, 540, yPos, 940);
        ctx.restore();
      });

      // Render Deep Shop watermark footer stamp on downloaded PNG
      ctx.save();
      ctx.font = "bold 26px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.textAlign = "right";
      ctx.fillText("DEEP SHOP", 1036, 1872);
      ctx.restore();
    }

    return canvas;
  };

  const handleDownloadStoryPng = async () => {
    setMoreMenuOpen(false);
    triggerHaptic();
    try {
      const canvas = await renderCompositeCanvas(true);
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `deepshop-story-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notify("Story saved as PNG!", "success");
    } catch {
      notify("Could not export story PNG.", "error");
    }
  };

  /* --------------------------------------------------------------------------
   * 9. SAVE CLOSE FRIENDS & PUBLISH STORY END-TO-END
   * ------------------------------------------------------------------------ */
  const toggleCloseFriendMember = async (uid: string) => {
    triggerHaptic();
    const next = closeFriendIds.includes(uid)
      ? closeFriendIds.filter((id) => id !== uid)
      : [...closeFriendIds, uid];
    setCloseFriendIds(next);

    if (currentUser?.uid) {
      try {
        localStorage.setItem(`deep_close_friends_${currentUser.uid}`, JSON.stringify(next));
        await updateDoc(doc(db, "users", currentUser.uid), {
          closeFriends: next,
        }).catch(() => {});
      } catch {}
    }
  };

  const handlePublishStory = async (audience: "story" | "close_friends") => {
    if (!currentUser) {
      navigate("/signin");
      return;
    }
    if (!createMode && !selectedMedia) {
      notify("Select or capture a story background first.", "info");
      return;
    }

    setPublishing(true);
    triggerHaptic();

    try {
      let finalMediaUrl = selectedMedia?.url || "";

      // Bake background if using Create Gradient, Effects filter, Freehand Drawing, or 2-finger Zoom/Pan
      const needsBaseBake =
        createMode ||
        strokes.length > 0 ||
        effectId !== "normal" ||
        hasCustomMediaTransform ||
        !finalMediaUrl;

      if (needsBaseBake) {
        const bakedCanvas = await renderCompositeCanvas(false);
        const blob = await new Promise<Blob | null>((res) =>
          bakedCanvas.toBlob((b) => res(b), "image/jpeg", 0.88)
        );
        if (blob) {
          const file = new File([blob], `story-${Date.now()}.jpg`, { type: "image/jpeg" });
          finalMediaUrl = await uploadToImgbb(file);
        } else {
          finalMediaUrl = bakedCanvas.toDataURL("image/jpeg", 0.85);
        }
      }

      const storyId = `st_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const authorName =
        userProfile?.displayName ||
        userProfile?.name ||
        userProfile?.shopName ||
        currentUser.displayName ||
        "Deep Shop Member";
      const authorAvatar =
        userProfile?.photoURL ||
        userProfile?.avatar ||
        userProfile?.shopLogo ||
        currentUser.photoURL ||
        footerLogo ||
        deepShopLogoFallback;

      const linkSticker = placedStickers.find((s) => s.kind === "link" || s.kind === "shop_order");

      const storyPayload: Record<string, any> = {
        id: storyId,
        kind: "news_story",
        source: fromNewsHub ? "news_hub" : "deep_shop",
        category: authorName,
        mediaUrl: finalMediaUrl,
        type: "image",
        userId: currentUser.uid,
        sellerId: currentUser.uid,
        userName: authorName,
        sellerName: authorName,
        userAvatar: authorAvatar,
        sellerLogo: authorAvatar,
        caption: caption.trim(),
        linkUrl: linkSticker?.url || "",
        songTitle: attachedSong ? `${attachedSong.title} · ${attachedSong.artist}` : "",
        audioUrl: attachedSong?.url || "",
        music: attachedSong || null,
        textLayers,
        stickers: placedStickers,
        aiLabel,
        isAiGenerated: Boolean(aiLabel),
        allowCommenting: replyPrivacy !== "off" && allowCommenting,
        replyPrivacy,
        isCloseFriends: audience === "close_friends",
        closeFriendIds: audience === "close_friends" ? closeFriendIds : [],
        isBoomerang: isBoomerangClip,
        createdAt: new Date().toISOString(),
        createdAtMs: Date.now(),
      };

      // Write to `creator_videos` (open to every signed-in community user)
      await setDoc(doc(db, "creator_videos", storyId), storyPayload);

      // Best-effort sync to `stories` collection as well
      await setDoc(doc(db, "stories", storyId), storyPayload).catch(() => {});

      // Mirror into local cache for instant zero-latency appearance
      try {
        const prevLocal = JSON.parse(localStorage.getItem("deep_news_stories_local") || "[]");
        const nextLocal = [
          storyPayload,
          ...(Array.isArray(prevLocal) ? prevLocal.filter((s: any) => s?.id !== storyId) : []),
        ].slice(0, 20);
        localStorage.setItem("deep_news_stories_local", JSON.stringify(nextLocal));
      } catch {}

      if (autoSaveArchive && finalMediaUrl) {
        persistUploadedItem({
          id: storyId,
          url: finalMediaUrl,
          type: "image",
          source: "upload",
          label: "Archived Story",
        });
      }

      // Direct message delivery to real chat partners selected in Share Sheet
      if (selectedDmUserIds.length > 0) {
        const storyShareUrl =
          typeof window !== "undefined"
            ? `${window.location.origin}/news-hub/story/${storyId}`
            : `/news-hub/story/${storyId}`;
        const dmText = caption.trim()
          ? `Shared a story: "${caption.trim()}"\n${storyShareUrl}`
          : `Shared a story with you:\n${storyShareUrl}`;

        await Promise.all(
          selectedDmUserIds.map(async (targetUid) => {
            const partner = chatContacts.find((c) => c.uid === targetUid);
            if (partner?.chatId) {
              await updateDoc(doc(db, "p2p_chats", partner.chatId), {
                updatedAt: serverTimestamp(),
                lastMessage: "Shared a story",
                lastSenderId: currentUser.uid,
                seenBy: [currentUser.uid],
              }).catch(() => {});

              await addDoc(collection(db, "p2p_chats", partner.chatId, "messages"), {
                text: dmText,
                images: finalMediaUrl ? [finalMediaUrl] : [],
                imageUrl: finalMediaUrl || null,
                senderId: currentUser.uid,
                senderName: authorName,
                senderPhoto: authorAvatar,
                createdAt: Date.now(),
                timestamp: serverTimestamp(),
                seenBy: [currentUser.uid],
              }).catch(() => {});
            }

            await addDoc(collection(db, "notifications"), {
              userId: targetUid,
              title: `${authorName} shared a story with you`,
              message: caption.trim() || "Tap to view story on Deep Shop Feed",
              type: "social",
              link: `/news-hub/story/${storyId}`,
              read: false,
              createdAt: new Date().toISOString(),
            }).catch(() => {});
          })
        );
      }

      setShareSheetOpen(false);
      setCloseFriendsOpen(false);
      notify(
        audience === "close_friends"
          ? "Shared to your Close Friends story!"
          : "Your story is now live!",
        "success"
      );
      navigate("/news-hub");
    } catch {
      notify("Could not publish story. Please try again.", "error");
    } finally {
      setPublishing(false);
    }
  };

  /* --------------------------------------------------------------------------
   * RENDER HELPERS FOR STICKERS & TEXT LAYERS
   * ------------------------------------------------------------------------ */
  const renderTextLayerVisual = (layer: StoryTextLayer) => {
    const colorDef = STORY_COLORS.find((c) => c.id === layer.colorId) || STORY_COLORS[0];
    const fontDef = STORY_FONTS.find((f) => f.id === layer.fontId) || STORY_FONTS[0];
    const sizeDef = FONT_SIZE_STEPS[layer.sizeStep] || FONT_SIZE_STEPS[3];

    const alignClass =
      layer.align === "left"
        ? "text-left"
        : layer.align === "right"
        ? "text-right"
        : "text-center";

    const pillClass =
      layer.pillMode === "solid"
        ? `${colorDef.pillSolidClass} px-4 py-2 rounded-2xl shadow-lg`
        : layer.pillMode === "soft"
        ? `${colorDef.pillSoftClass} px-4 py-2 rounded-2xl shadow-md`
        : `${colorDef.textClass}`;

    const outlineClass =
      layer.outline && layer.pillMode === "none"
        ? "drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]"
        : "";

    const animClass =
      layer.animation === "pulse"
        ? "animate-pulse"
        : layer.animation === "bounce"
        ? "animate-bounce"
        : "";

    const textureClass =
      layer.texture === "shimmer" && layer.pillMode === "none"
        ? "bg-gradient-to-r from-white via-amber-200 to-sky-300 bg-clip-text text-transparent"
        : layer.texture === "neon" && layer.pillMode === "none"
        ? "drop-shadow-[0_0_16px_rgba(24,119,242,0.95)]"
        : "";

    const displayText =
      layer.caseMode === "upper"
        ? layer.text.toUpperCase()
        : layer.caseMode === "lower"
        ? layer.text.toLowerCase()
        : layer.text;

    return (
      <div
        className={`max-w-[290px] break-words leading-snug select-none ${fontDef.className} ${sizeDef.textClass} ${alignClass} ${pillClass} ${outlineClass} ${animClass} ${textureClass}`}
      >
        {displayText}
      </div>
    );
  };

  const renderStickerVisual = (stk: StoryStickerItem) => {
    switch (stk.kind) {
      case "location":
        return (
          <div className="px-3.5 py-2 rounded-xl bg-white/95 text-zinc-900 shadow-lg flex items-center gap-1.5 font-bold text-xs whitespace-nowrap">
            <MapPin className="w-3.5 h-3.5 text-[#1877F2] shrink-0" />
            <span>{stk.title}</span>
          </div>
        );
      case "mention":
        return (
          <div className="px-3.5 py-2 rounded-xl bg-white/95 text-[#1877F2] shadow-lg flex items-center gap-1 font-extrabold text-sm whitespace-nowrap">
            <AtSign className="w-4 h-4 shrink-0" />
            <span>{stk.title.replace(/^@/, "")}</span>
          </div>
        );
      case "hashtag":
        return (
          <div className="px-3.5 py-2 rounded-xl bg-zinc-900/85 text-white border border-white/20 backdrop-blur-md shadow-lg flex items-center gap-1 font-bold text-sm whitespace-nowrap">
            <Hash className="w-4 h-4 text-[#1877F2] shrink-0" />
            <span>{stk.title.replace(/^#/, "")}</span>
          </div>
        );
      case "add_yours":
        return (
          <div className="w-56 rounded-2xl bg-white text-zinc-900 p-3.5 shadow-xl space-y-2.5 text-center">
            <p className="text-xs font-bold leading-snug text-zinc-900">{stk.title}</p>
            <div className="py-1.5 px-3 rounded-full bg-[#1877F2] text-white text-[11px] font-bold inline-flex items-center gap-1">
              <Camera className="w-3 h-3" />
              <span>Add yours</span>
            </div>
          </div>
        );
      case "questions":
        return (
          <div className="w-60 rounded-2xl bg-white text-zinc-900 p-4 shadow-xl space-y-2.5">
            <p className="text-xs font-extrabold text-center text-zinc-900">{stk.title}</p>
            <div className="w-full py-2 px-3 rounded-xl bg-zinc-100 text-zinc-400 text-xs text-center font-medium">
              Type something...
            </div>
          </div>
        );
      case "poll":
        return (
          <div className="w-60 rounded-2xl bg-white text-zinc-900 p-3.5 shadow-xl space-y-2">
            <p className="text-xs font-extrabold text-center text-zinc-900 pb-0.5">{stk.title}</p>
            <div className="py-2 px-3 rounded-xl bg-zinc-100 text-zinc-900 text-xs font-bold text-center">
              {stk.optionA || "Yes"}
            </div>
            <div className="py-2 px-3 rounded-xl bg-zinc-100 text-zinc-900 text-xs font-bold text-center">
              {stk.optionB || "No"}
            </div>
          </div>
        );
      case "slider":
        return (
          <div className="w-60 rounded-2xl bg-white text-zinc-900 p-3.5 shadow-xl space-y-2.5">
            <p className="text-xs font-extrabold text-center text-zinc-900">{stk.title}</p>
            <div className="relative h-2.5 rounded-full bg-zinc-200 flex items-center">
              <div className="w-2/3 h-full rounded-full bg-[#1877F2]" />
              <span className="-ml-3 text-xl select-none">{stk.emoji || "🔥"}</span>
            </div>
          </div>
        );
      case "link":
        return (
          <div className="px-4 py-2 rounded-full bg-white text-[#1877F2] shadow-xl flex items-center gap-1.5 font-bold text-xs whitespace-nowrap">
            <Link2 className="w-3.5 h-3.5 shrink-0" />
            <span>{stk.subtitle || "Visit Link"}</span>
          </div>
        );
      case "countdown":
        return (
          <div className="w-56 rounded-2xl bg-zinc-900/90 text-white border border-white/15 backdrop-blur-md p-3.5 shadow-xl text-center space-y-1.5">
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-sky-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{stk.subtitle || "Upcoming"}</span>
            </div>
            <p className="text-sm font-extrabold">{stk.title}</p>
            <div className="grid grid-cols-3 gap-1.5 pt-1 tabular-nums">
              <div className="bg-white/10 rounded-lg py-1 text-xs font-bold">08h</div>
              <div className="bg-white/10 rounded-lg py-1 text-xs font-bold">45m</div>
              <div className="bg-white/10 rounded-lg py-1 text-xs font-bold">12s</div>
            </div>
          </div>
        );
      case "shop_order":
        return (
          <div className="w-60 rounded-2xl bg-white text-zinc-900 p-2.5 shadow-xl flex items-center gap-2.5">
            {stk.imageUrl ? (
              <img
                src={stk.imageUrl}
                alt={stk.title}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl object-cover shrink-0 bg-zinc-100"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold truncate text-zinc-900">{stk.title}</p>
              <p className="text-[11px] font-bold text-[#1877F2] tabular-nums">
                {stk.priceLabel || "Shop on Deep Shop"}
              </p>
            </div>
          </div>
        );
      case "notify":
        return (
          <div className="px-4 py-2.5 rounded-2xl bg-white text-zinc-900 shadow-xl flex items-center gap-2 text-xs font-extrabold whitespace-nowrap">
            <Bell className="w-4 h-4 text-[#1877F2] fill-[#1877F2]" />
            <span>{stk.title || "Notify me"}</span>
          </div>
        );
      case "avatar":
        return (
          <div className="relative w-16 h-16 rounded-full p-1 bg-gradient-to-tr from-[#1877F2] to-cyan-400 shadow-xl">
            <img
              src={stk.imageUrl || userProfile?.avatar || currentUser?.photoURL || footerLogo}
              alt="Avatar"
              referrerPolicy="no-referrer"
              className="w-full h-full rounded-full object-cover bg-zinc-900"
            />
            <span className="absolute -bottom-1 -right-1 text-base">👋</span>
          </div>
        );
      case "reaction":
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const pool = ["😍", "🔥", "💯", "👏", "❤️", "🎉"];
              const nextEmoji = pool[(pool.indexOf(stk.emoji || "😍") + 1) % pool.length];
              setPlacedStickers((prev) =>
                prev.map((x) => (x.id === stk.id ? { ...x, emoji: nextEmoji } : x))
              );
              triggerHaptic();
            }}
            className="w-14 h-14 rounded-full bg-white/95 shadow-xl flex items-center justify-center text-3xl select-none cursor-pointer"
          >
            {stk.emoji || "😍"}
          </button>
        );
      case "gif":
        return (
          <div className="px-4 py-2 rounded-2xl bg-zinc-950/90 border border-white/20 text-white shadow-xl flex items-center gap-2 font-black text-sm tracking-wide animate-bounce">
            <span>{stk.emoji || "⚡"}</span>
            <span>{stk.title}</span>
          </div>
        );
      case "frame":
        return (
          <div className="w-44 bg-white p-2.5 pb-6 rounded-lg shadow-2xl text-zinc-900">
            <img
              src={stk.imageUrl || selectedMedia?.url || parkShowcaseImg}
              alt="Frame"
              referrerPolicy="no-referrer"
              className="w-full aspect-square object-cover rounded-sm"
            />
            <p className="pt-2 text-[10px] font-serif font-bold text-center text-zinc-700">
              {dhakaClock.dateStr} · DEEP SHOP
            </p>
          </div>
        );
      case "photo":
        return (
          <div className="w-36 aspect-[4/5] rounded-2xl overflow-hidden border-2 border-white shadow-2xl bg-zinc-900">
            <img
              src={stk.imageUrl || parkShowcaseImg}
              alt="Overlay"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        );
      case "cutout":
        return (
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-dashed border-white shadow-2xl bg-zinc-900">
            <img
              src={stk.imageUrl || creatorAvatar1}
              alt="Cutout"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        );
      case "clock":
        return (
          <div className="flex items-center gap-1.5 tabular-nums select-none">
            <div className="px-3 py-2 rounded-xl bg-zinc-900/85 border border-white/15 backdrop-blur-md text-white font-mono text-2xl font-black shadow-lg">
              {dhakaClock.hh}
            </div>
            <span className="text-white font-black text-xl">:</span>
            <div className="px-3 py-2 rounded-xl bg-zinc-900/85 border border-white/15 backdrop-blur-md text-white font-mono text-2xl font-black shadow-lg">
              {dhakaClock.mm}
            </div>
          </div>
        );
      case "heart_count":
        return (
          <div className="px-3.5 py-1.5 rounded-full bg-rose-500 text-white shadow-lg flex items-center gap-1.5 font-extrabold text-sm tabular-nums">
            <Heart className="w-4 h-4 fill-white" />
            <span>1</span>
          </div>
        );
      case "sound_on":
        return (
          <div className="px-3.5 py-1.5 rounded-full bg-black/75 border border-white/25 backdrop-blur-md text-white shadow-lg flex items-center gap-1.5 font-extrabold text-xs tracking-wider whitespace-nowrap">
            <Volume2 className="w-3.5 h-3.5 text-[#1877F2]" />
            <span>SOUND ON</span>
          </div>
        );
      case "day_stamp":
        return (
          <div className="px-4 py-1.5 rounded-lg bg-white/90 text-zinc-950 font-serif font-black tracking-widest text-sm shadow-lg whitespace-nowrap">
            {dhakaClock.dayStr}
          </div>
        );
      default:
        return null;
    }
  };

  /* --------------------------------------------------------------------------
   * LOADING STATE
   * ------------------------------------------------------------------------ */
  if (authLoading) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-white/80" />
      </div>
    );
  }

  const activeEffect = STUDIO_EFFECTS.find((e) => e.id === effectId) || STUDIO_EFFECTS[0];
  const activeCreateGradient = CREATE_GRADIENTS[createGradientIdx % CREATE_GRADIENTS.length];
  const userAvatarResolved =
    userProfile?.avatar ||
    userProfile?.photoURL ||
    currentUser?.photoURL ||
    footerLogo ||
    deepShopLogoFallback;

  const stickerDefinitions: {
    kind: StoryStickerKind;
    label: string;
    keywords: string;
    badgeClass: string;
    icon: React.ReactNode;
    onSelect: () => void;
  }[] = [
    {
      kind: "location",
      label: "Location",
      keywords: "location map place dhaka",
      badgeClass: "text-emerald-400",
      icon: <MapPin className="w-4 h-4" />,
      onSelect: () => openStickerConfigurator("location"),
    },
    {
      kind: "mention",
      label: "@mention",
      keywords: "mention tag user friend",
      badgeClass: "text-orange-400",
      icon: <AtSign className="w-4 h-4" />,
      onSelect: () => openStickerConfigurator("mention"),
    },
    {
      kind: "gif",
      label: "Music",
      keywords: "music audio song sound",
      badgeClass: "text-pink-400",
      icon: <Music className="w-4 h-4" />,
      onSelect: () => {
        setStickerTrayOpen(false);
        setMusicSheetOpen(true);
      },
    },
    {
      kind: "gif",
      label: "GIF",
      keywords: "gif hype sticker",
      badgeClass: "text-amber-400",
      icon: <Sparkles className="w-4 h-4" />,
      onSelect: () =>
        addStickerInstant({
          kind: "gif",
          title: "VERIFIED DROP",
          emoji: "⚡",
        }),
    },
    {
      kind: "add_yours",
      label: "Add yours",
      keywords: "add yours prompt chain",
      badgeClass: "text-sky-400",
      icon: <Camera className="w-4 h-4" />,
      onSelect: () => openStickerConfigurator("add_yours"),
    },
    {
      kind: "frame",
      label: "Frames",
      keywords: "frames polaroid border",
      badgeClass: "text-violet-400",
      icon: <Frame className="w-4 h-4" />,
      onSelect: () =>
        addStickerInstant({
          kind: "frame",
          title: "Deep Shop Frame",
          imageUrl: selectedMedia?.url || parkShowcaseImg,
        }),
    },
    {
      kind: "photo",
      label: "Photo",
      keywords: "photo image picture upload",
      badgeClass: "text-cyan-400",
      icon: <ImageIcon className="w-4 h-4" />,
      onSelect: () => stickerPhotoInputRef.current?.click(),
    },
    {
      kind: "cutout",
      label: "Cutouts",
      keywords: "cutouts sticker mask",
      badgeClass: "text-lime-400",
      icon: <Scissors className="w-4 h-4" />,
      onSelect: () => cutoutPhotoInputRef.current?.click(),
    },
    {
      kind: "questions",
      label: "Questions",
      keywords: "questions ask qna",
      badgeClass: "text-rose-400",
      icon: <HelpCircle className="w-4 h-4" />,
      onSelect: () => openStickerConfigurator("questions"),
    },
    {
      kind: "notify",
      label: "Notify",
      keywords: "notify bell alert reminder",
      badgeClass: "text-yellow-400",
      icon: <Bell className="w-4 h-4" />,
      onSelect: () =>
        addStickerInstant({
          kind: "notify",
          title: "Turn on story reminders",
        }),
    },
    {
      kind: "avatar",
      label: "Avatar",
      keywords: "avatar profile badge",
      badgeClass: "text-indigo-400",
      icon: <Star className="w-4 h-4" />,
      onSelect: () =>
        addStickerInstant({
          kind: "avatar",
          title: "Avatar",
          imageUrl: userAvatarResolved,
        }),
    },
    {
      kind: "reaction",
      label: "😍",
      keywords: "emoji reaction love fire",
      badgeClass: "text-amber-300",
      icon: <span className="text-base leading-none">😍</span>,
      onSelect: () =>
        addStickerInstant({
          kind: "reaction",
          title: "Reaction",
          emoji: "😍",
        }),
    },
    {
      kind: "poll",
      label: "Poll",
      keywords: "poll vote choice",
      badgeClass: "text-emerald-400",
      icon: <BarChart2 className="w-4 h-4" />,
      onSelect: () => openStickerConfigurator("poll"),
    },
    {
      kind: "slider",
      label: "Slider",
      keywords: "emoji slider rate",
      badgeClass: "text-pink-400",
      icon: <Sliders className="w-4 h-4" />,
      onSelect: () => openStickerConfigurator("slider"),
    },
    {
      kind: "link",
      label: "Link",
      keywords: "link url website",
      badgeClass: "text-[#1877F2]",
      icon: <Link2 className="w-4 h-4" />,
      onSelect: () => openStickerConfigurator("link"),
    },
    {
      kind: "hashtag",
      label: "#hashtag",
      keywords: "hashtag tag topic",
      badgeClass: "text-fuchsia-400",
      icon: <Hash className="w-4 h-4" />,
      onSelect: () => openStickerConfigurator("hashtag"),
    },
    {
      kind: "countdown",
      label: "Countdown",
      keywords: "countdown timer launch",
      badgeClass: "text-sky-400",
      icon: <Clock className="w-4 h-4" />,
      onSelect: () => openStickerConfigurator("countdown"),
    },
    {
      kind: "shop_order",
      label: "Shop orders",
      keywords: "shop orders product store buy deep shop",
      badgeClass: "text-[#1877F2]",
      icon: <ShoppingBag className="w-4 h-4" />,
      onSelect: () => openStickerConfigurator("shop_order"),
    },
  ];

  const filteredStickerDefs = stickerDefinitions.filter((s) =>
    !stickerSearch.trim()
      ? true
      : `${s.label} ${s.keywords}`.toLowerCase().includes(stickerSearch.toLowerCase())
  );

  const albumLabelMap: Record<AlbumFilter, string> = {
    recents: "Recents",
    videos: "Videos",
    favourites: "Favourites",
    all: "All albums",
  };

  return (
    <div className="story-studio-shell min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center select-none overflow-hidden">
      {/* Hidden File Pickers */}
      <input
        ref={galleryUploadInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleDeviceGalleryUpload}
      />
      <input
        ref={stickerPhotoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleSecondaryStickerUpload(e, "photo")}
      />
      <input
        ref={cutoutPhotoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleSecondaryStickerUpload(e, "cutout")}
      />
      <input
        ref={collageSlotInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file || !file.type.startsWith("image/")) return;
          setUploading(true);
          try {
            const [url, isAi] = await Promise.all([
              uploadToImgbb(file),
              detectAiGeneratedFiles([file]).catch(() => false),
            ]);
            if (isAi) {
              setAiLabel(true);
            }
            if (url) {
              setCollageImages((prev) => [...prev, url].slice(0, collageSlotsCount));
            }
          } finally {
            setUploading(false);
          }
        }}
      />

      {/* Responsive Studio Frame: Full viewport on mobile, sleek studio shell on desktop */}
      <div className="relative w-full max-w-[440px] h-[100dvh] sm:h-[94dvh] sm:rounded-[34px] sm:border sm:border-white/10 bg-black flex flex-col overflow-hidden shadow-2xl">
        {/* Global Uploading Overlay Spinner */}
        {uploading && (
          <div className="absolute inset-0 z-50 bg-black/65 backdrop-blur-sm flex flex-col items-center justify-center gap-2.5">
            <Loader2 className="w-8 h-8 animate-spin text-[#1877F2]" />
            <p className="text-xs font-semibold text-zinc-200">Processing studio media...</p>
          </div>
        )}

        {/* ===================================================================
         * STEP A: "ADD TO STORY" GALLERY PICKER (IMG_4847)
         * ================================================================= */}
        {step === "gallery" && (
          <div className="flex-1 flex flex-col overflow-hidden bg-black">
            {/* Header */}
            <header className="px-4 pt-3 pb-2.5 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => navigate("/news-hub")}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-6 h-6 text-white" />
              </button>
              <h1 className="text-base font-bold tracking-tight text-white">Add to story</h1>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Story settings"
              >
                <Settings className="w-5 h-5 text-white" />
              </button>
            </header>

            {/* 3 Feature Tiles: Add yours · Music · Collage */}
            <div className="px-3.5 pt-1 pb-3 grid grid-cols-3 gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setCreateMode(true);
                  setStep("editor");
                  openStickerConfigurator("add_yours");
                }}
                className="h-20 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 flex flex-col items-center justify-center gap-1.5 transition-colors active:scale-95 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <Camera className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-semibold text-white whitespace-nowrap">Add yours</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCreateMode(true);
                  setStep("editor");
                  setMusicSheetOpen(true);
                }}
                className="h-20 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 flex flex-col items-center justify-center gap-1.5 transition-colors active:scale-95 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <Music className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-semibold text-white whitespace-nowrap">Music</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCollageImages([]);
                  setStep("collage");
                  triggerHaptic();
                }}
                className="h-20 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 flex flex-col items-center justify-center gap-1.5 transition-colors active:scale-95 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <LayoutGrid className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-semibold text-white whitespace-nowrap">Collage</span>
              </button>
            </div>

            {/* Album Dropdown & Multi-Select Row */}
            <div className="px-4 py-2 flex items-center justify-between relative shrink-0 z-20">
              <button
                type="button"
                onClick={() => setAlbumMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-bold text-white cursor-pointer py-1"
              >
                <span>{albumLabelMap[albumFilter]}</span>
                <ChevronDown className="w-4 h-4 text-zinc-300" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => galleryUploadInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5 text-[#1877F2]" />
                  <span>Upload</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMultiSelectMode((v) => !v);
                    setSelectedIds([]);
                    triggerHaptic();
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    multiSelectMode
                      ? "bg-[#1877F2] text-white"
                      : "bg-zinc-900 text-white border border-white/10 hover:bg-zinc-800"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Select</span>
                </button>
              </div>

              {/* Frosted Album Filter Popover (Private User Media Only) */}
              {albumMenuOpen && (
                <div className="absolute left-4 top-11 w-52 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-white/15 shadow-2xl py-1.5 z-30">
                  {(
                    [
                      { id: "recents", label: "Recents" },
                      { id: "videos", label: "Videos" },
                      { id: "favourites", label: "Favourites" },
                      { id: "all", label: "All albums" },
                    ] as { id: AlbumFilter; label: string }[]
                  ).map((alb) => (
                    <button
                      key={alb.id}
                      type="button"
                      onClick={() => {
                        setAlbumFilter(alb.id);
                        setAlbumMenuOpen(false);
                        triggerHaptic();
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-white hover:bg-white/10 flex items-center justify-between cursor-pointer"
                    >
                      <span>{alb.label}</span>
                      {albumFilter === alb.id && <Check className="w-4 h-4 text-[#1877F2]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3-Column 9:16 Media Grid */}
            <div className="flex-1 overflow-y-auto px-1 pb-24">
              <div className="grid grid-cols-3 gap-1">
                {/* Tile 1: Live Camera Studio */}
                <button
                  type="button"
                  onClick={() => {
                    setStep("camera");
                    triggerHaptic();
                  }}
                  className="aspect-[9/16] bg-zinc-900 hover:bg-zinc-800 flex flex-col items-center justify-center gap-2 border border-white/10 cursor-pointer transition-colors"
                >
                  <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-200">Camera</span>
                </button>

                {/* Tile 2: Create Aa Text Mode */}
                <button
                  type="button"
                  onClick={() => {
                    setCreateMode(true);
                    setSelectedMedia(null);
                    setStep("editor");
                    openTextStudioForNew();
                  }}
                  className="aspect-[9/16] bg-gradient-to-br from-[#1877F2] via-blue-700 to-slate-950 flex flex-col items-center justify-center gap-1.5 border border-white/10 cursor-pointer"
                >
                  <span className="text-2xl font-serif font-bold text-white">Aa</span>
                  <span className="text-xs font-semibold text-white/90">Create</span>
                </button>

                {visibleGallery.map((item) => {
                  const selIndex = selectedIds.indexOf(item.id);
                  const isSelected = selIndex !== -1;
                  const isFav = favouriteIds.includes(item.id);

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (multiSelectMode) {
                          setSelectedIds((prev) =>
                            prev.includes(item.id)
                              ? prev.filter((x) => x !== item.id)
                              : [...prev, item.id].slice(0, 4)
                          );
                          triggerHaptic();
                          return;
                        }
                        setCreateMode(false);
                        setSelectedMedia(item);
                        setStep("editor");
                        triggerHaptic();
                      }}
                      className="aspect-[9/16] relative bg-zinc-900 overflow-hidden cursor-pointer group"
                    >
                      <img
                        src={item.url}
                        alt={item.label || "Story media"}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />

                      {/* Favourite toggle */}
                      {!multiSelectMode && (
                        <button
                          type="button"
                          onClick={(e) => toggleFavourite(item.id, e)}
                          className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center cursor-pointer"
                          aria-label="Favourite"
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              isFav ? "text-rose-500 fill-rose-500" : "text-white/80"
                            }`}
                          />
                        </button>
                      )}

                      {/* Multi-select numbered badge */}
                      {multiSelectMode && (
                        <div
                          className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold tabular-nums ${
                            isSelected
                              ? "bg-[#1877F2] border-[#1877F2] text-white"
                              : "bg-black/40 border-white text-transparent"
                          }`}
                        >
                          {isSelected ? selIndex + 1 : ""}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {visibleGallery.length === 0 && (
                <div className="py-16 text-center space-y-3 px-6">
                  <p className="text-sm text-zinc-400">
                    No media in {albumLabelMap[albumFilter]} yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => galleryUploadInputRef.current?.click()}
                    className="px-5 py-2.5 rounded-full bg-[#1877F2] text-white text-xs font-bold cursor-pointer"
                  >
                    Upload Photo from Device
                  </button>
                </div>
              )}
            </div>

            {/* Multi-select Floating Next CTA */}
            {multiSelectMode && selectedIds.length > 0 && (
              <div className="absolute bottom-5 inset-x-4 z-30 flex items-center justify-between bg-zinc-900/95 backdrop-blur-xl border border-white/15 rounded-full p-2 pl-4 shadow-2xl">
                <span className="text-xs font-semibold text-zinc-200 tabular-nums">
                  {selectedIds.length} selected
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const chosenUrls = selectedIds
                      .map((id) => visibleGallery.find((g) => g.id === id)?.url)
                      .filter((u): u is string => Boolean(u));
                    buildCollageToEditor(chosenUrls);
                  }}
                  className="px-5 py-2.5 rounded-full bg-[#1877F2] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
         * STEP B: LIVE CAMERA STUDIO (IMG_4848)
         * ================================================================= */}
        {step === "camera" && (
          <div className="flex-1 flex flex-col justify-between relative bg-zinc-950 overflow-hidden">
            {/* Live Camera Stage */}
            <div className="absolute inset-0 z-0">
              {!cameraError ? (
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-contain bg-black ${
                    facingMode === "user" ? "-scale-x-100" : ""
                  } ${activeEffect.filterClass}`}
                />
              ) : (
                <div className={`w-full h-full ${activeCreateGradient.bgClass} flex flex-col items-center justify-center p-8 text-center gap-3`}>
                  <Camera className="w-10 h-10 text-white/80" />
                  <p className="text-sm font-semibold text-white">
                    Camera preview unavailable on this device
                  </p>
                  <button
                    type="button"
                    onClick={() => galleryUploadInputRef.current?.click()}
                    className="px-4 py-2 rounded-full bg-[#1877F2] text-white text-xs font-bold cursor-pointer"
                  >
                    Choose Photo from Device
                  </button>
                </div>
              )}
            </div>

            {/* Hands-free Countdown Overlay */}
            {countdownSec !== null && (
              <div className="absolute inset-0 z-30 bg-black/35 flex items-center justify-center pointer-events-none">
                <span className="text-7xl font-black text-white tabular-nums drop-shadow-2xl animate-ping">
                  {countdownSec}
                </span>
              </div>
            )}

            {/* Top Bar: X · Flash · Settings */}
            <header className="relative z-20 px-4 pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("gallery")}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center cursor-pointer"
                aria-label="Back to gallery"
              >
                <X className="w-6 h-6 text-white" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setFlashMode((f) => (f === "off" ? "on" : f === "on" ? "auto" : "off"));
                  triggerHaptic();
                }}
                className="px-3.5 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center gap-1.5 text-xs font-bold text-white cursor-pointer"
              >
                {flashMode === "off" ? (
                  <ZapOff className="w-4 h-4 text-zinc-300" />
                ) : (
                  <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                )}
                <span className="capitalize">{flashMode}</span>
              </button>

              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center cursor-pointer"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5 text-white" />
              </button>
            </header>

            {/* Left Rail: Aa Create · ∞ Boomerang · ⊞ Layout · ⦿ Hands-free */}
            <div className="relative z-20 px-4 flex items-center">
              <div className="flex flex-col items-start gap-4 bg-black/35 backdrop-blur-md p-2.5 rounded-3xl border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setCreateMode(true);
                    setSelectedMedia(null);
                    setStep("editor");
                    openTextStudioForNew();
                  }}
                  className="flex items-center gap-2.5 text-white text-xs font-bold cursor-pointer pr-2"
                >
                  <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center font-serif text-sm font-bold">
                    Aa
                  </span>
                  {cameraRailExpanded && <span>Create</span>}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBoomerangMode((v) => !v);
                    triggerHaptic();
                  }}
                  className="flex items-center gap-2.5 text-white text-xs font-bold cursor-pointer pr-2"
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      boomerangMode ? "bg-[#1877F2] text-white" : "bg-white/15 text-white"
                    }`}
                  >
                    <InfinityIcon className="w-4 h-4" />
                  </span>
                  {cameraRailExpanded && <span>Boomerang</span>}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCollageImages([]);
                    setStep("collage");
                    triggerHaptic();
                  }}
                  className="flex items-center gap-2.5 text-white text-xs font-bold cursor-pointer pr-2"
                >
                  <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                    <LayoutGrid className="w-4 h-4" />
                  </span>
                  {cameraRailExpanded && <span>Layout</span>}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHandsFreeMode((v) => !v);
                    triggerHaptic();
                  }}
                  className="flex items-center gap-2.5 text-white text-xs font-bold cursor-pointer pr-2"
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      handsFreeMode ? "bg-[#1877F2] text-white" : "bg-white/15 text-white"
                    }`}
                  >
                    <Timer className="w-4 h-4" />
                  </span>
                  {cameraRailExpanded && <span>Hands-free</span>}
                </button>

                <button
                  type="button"
                  onClick={() => setCameraRailExpanded((v) => !v)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center cursor-pointer"
                  aria-label="Toggle tools"
                >
                  {cameraRailExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Bottom Shutter + Filter Carousel + POST / STORY / REEL / LIVE Switcher */}
            <div className="relative z-20 pb-5 pt-6 bg-gradient-to-t from-black/85 via-black/40 to-transparent space-y-4">
              {/* Filter Circles + Center Shutter Ring */}
              <div className="flex items-center justify-center gap-3 px-4">
                {STUDIO_EFFECTS.slice(0, 2).map((eff) => (
                  <button
                    key={eff.id}
                    type="button"
                    onClick={() => {
                      setEffectId(eff.id);
                      triggerHaptic();
                    }}
                    className={`w-11 h-11 rounded-full ${eff.swatchBg} border-2 flex items-center justify-center text-[10px] font-bold text-white shadow-md cursor-pointer transition-transform ${
                      effectId === eff.id ? "border-white scale-110" : "border-white/40 opacity-80"
                    }`}
                  >
                    {eff.name.slice(0, 4)}
                  </button>
                ))}

                {/* Main Shutter Button */}
                <button
                  type="button"
                  onClick={handleShutterTrigger}
                  className="w-20 h-20 rounded-full border-4 border-white p-1.5 flex items-center justify-center active:scale-90 transition-transform cursor-pointer shadow-2xl"
                  aria-label="Capture story"
                >
                  <div
                    className={`w-full h-full rounded-full ${
                      boomerangMode || handsFreeMode ? "bg-[#1877F2]" : "bg-white"
                    }`}
                  />
                </button>

                {STUDIO_EFFECTS.slice(2, 4).map((eff) => (
                  <button
                    key={eff.id}
                    type="button"
                    onClick={() => {
                      setEffectId(eff.id);
                      triggerHaptic();
                    }}
                    className={`w-11 h-11 rounded-full ${eff.swatchBg} border-2 flex items-center justify-center text-[10px] font-bold text-white shadow-md cursor-pointer transition-transform ${
                      effectId === eff.id ? "border-white scale-110" : "border-white/40 opacity-80"
                    }`}
                  >
                    {eff.name.slice(0, 4)}
                  </button>
                ))}
              </div>

              {/* Bottom Bar: Gallery Thumb · POST / STORY / REEL / LIVE · Flip Camera */}
              <div className="px-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep("gallery")}
                  className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white bg-zinc-900 flex items-center justify-center shadow-md cursor-pointer shrink-0"
                  aria-label="Open gallery"
                >
                  {visibleGallery[0]?.url ? (
                    <img
                      src={visibleGallery[0].url}
                      alt="Gallery"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-white" />
                  )}
                </button>

                <div className="flex items-center gap-4 text-xs font-extrabold tracking-wider">
                  <button
                    type="button"
                    onClick={() => navigate("/news-hub/create")}
                    className="text-zinc-400 hover:text-white cursor-pointer"
                  >
                    POST
                  </button>
                  <span className="text-white border-b-2 border-[#1877F2] pb-0.5">STORY</span>
                  <button
                    type="button"
                    onClick={() => navigate("/news-hub/create?tab=video")}
                    className="text-zinc-400 hover:text-white cursor-pointer"
                  >
                    REEL
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateMode(true);
                      setPlacedStickers([
                        {
                          id: `stk_live_${Date.now()}`,
                          kind: "notify",
                          title: "Going Live Soon on Deep Shop",
                        },
                      ]);
                      setStep("editor");
                    }}
                    className="text-zinc-400 hover:text-white cursor-pointer"
                  >
                    LIVE
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFacingMode((m) => (m === "environment" ? "user" : "environment"));
                    triggerHaptic();
                  }}
                  className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center cursor-pointer shrink-0"
                  aria-label="Flip camera"
                >
                  <RefreshCw className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
         * STEP C: COLLAGE / LAYOUT BUILDER
         * ================================================================= */}
        {step === "collage" && (
          <div className="flex-1 flex flex-col bg-zinc-950 p-4 gap-4 overflow-hidden">
            <header className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("gallery")}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-full border border-white/10">
                {([2, 3, 4] as const).map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => {
                      setCollageSlotsCount(cnt);
                      setCollageImages((prev) => prev.slice(0, cnt));
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${
                      collageSlotsCount === cnt ? "bg-[#1877F2] text-white" : "text-zinc-400"
                    }`}
                  >
                    {cnt} Grid
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={collageImages.length === 0}
                onClick={() => buildCollageToEditor(collageImages)}
                className="px-4 py-2 rounded-full bg-[#1877F2] disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </header>

            {/* Collage Preview Stage */}
            <div
              className={`flex-1 rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 grid gap-1 p-1 ${
                collageSlotsCount === 2 ? "grid-rows-2" : "grid-cols-2 grid-rows-2"
              }`}
            >
              {Array.from({ length: collageSlotsCount }).map((_, idx) => {
                const img = collageImages[idx];
                const spanFull = collageSlotsCount === 3 && idx === 0 ? "col-span-2" : "";
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (img) {
                        setCollageImages((prev) => prev.filter((_, i) => i !== idx));
                      } else {
                        collageSlotInputRef.current?.click();
                      }
                    }}
                    className={`relative bg-zinc-800/80 rounded-2xl overflow-hidden flex flex-col items-center justify-center cursor-pointer ${spanFull}`}
                  >
                    {img ? (
                      <>
                        <img
                          src={img}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                          <X className="w-3.5 h-3.5 text-white" />
                        </span>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-zinc-400">
                        <Plus className="w-6 h-6" />
                        <span className="text-[11px] font-semibold">Add Photo</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Tap Strip from Gallery */}
            <div className="space-y-1.5 shrink-0">
              <p className="text-xs font-semibold text-zinc-400">Tap photos below to fill grid</p>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {visibleGallery.slice(0, 12).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      if (collageImages.length < collageSlotsCount) {
                        setCollageImages((prev) => [...prev, g.url]);
                        triggerHaptic();
                      }
                    }}
                    className="w-14 h-20 rounded-xl overflow-hidden shrink-0 border border-white/15 cursor-pointer"
                  >
                    <img
                      src={g.url}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
         * STEP D: FULL STORY CANVAS EDITOR (IMG_4849, IMG_4850, IMG_4853)
         * ================================================================= */}
        {step === "editor" && (
          <div className="flex-1 flex flex-col bg-black p-2 sm:p-3 gap-2.5 overflow-hidden">
            {/* Rounded 9:16 Interactive Story Stage (Exact Aspect Ratio + 2-Finger Pinch Zoom) */}
            <div
              ref={stageContainerRef}
              onClick={() => {
                setSelectedLayerId(null);
                setMoreMenuOpen(false);
              }}
              onTouchStart={handleStageTouchStart}
              onTouchMove={handleStageTouchMove}
              onTouchEnd={handleStageTouchEnd}
              onTouchCancel={handleStageTouchEnd}
              onWheel={handleStageWheel}
              className="relative flex-1 rounded-[28px] overflow-hidden bg-black shadow-2xl touch-none"
            >
              {/* Background Media (Exact Natural Aspect Ratio) or Create Gradient */}
              <div className={`absolute inset-0 flex items-center justify-center overflow-hidden ${activeEffect.filterClass}`}>
                {createMode || !selectedMedia ? (
                  <div className={`w-full h-full ${activeCreateGradient.bgClass}`} />
                ) : (
                  <motion.img
                    src={selectedMedia.url}
                    alt="Story canvas"
                    referrerPolicy="no-referrer"
                    animate={{
                      scale: isBoomerangClip ? mediaScale * 1.03 : mediaScale,
                      x: mediaOffset.x,
                      y: mediaOffset.y,
                    }}
                    transition={{ duration: 0 }}
                    className={`w-full h-full object-contain select-none pointer-events-none ${
                      isBoomerangClip ? "animate-pulse" : ""
                    }`}
                  />
                )}
              </div>

              {/* HTML5 Freehand Drawing Layer */}
              <canvas
                ref={drawCanvasRef}
                width={1080}
                height={1920}
                onPointerDown={handleDrawPointerDown}
                onPointerMove={handleDrawPointerMove}
                onPointerUp={handleDrawPointerUp}
                onPointerCancel={handleDrawPointerUp}
                className={`absolute inset-0 w-full h-full touch-none ${
                  drawModeOpen ? "z-30 cursor-crosshair" : "z-10 pointer-events-none"
                }`}
              />

              {/* Draggable Text Layers */}
              <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
                {textLayers.map((layer) => {
                  const isSel = selectedLayerId === layer.id;
                  return (
                    <motion.div
                      key={layer.id}
                      drag
                      dragMomentum={false}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSel) {
                          openTextStudioForExisting(layer);
                        } else {
                          setSelectedLayerId(layer.id);
                        }
                      }}
                      className={`pointer-events-auto absolute cursor-grab active:cursor-grabbing p-2 ${
                        isSel ? "ring-2 ring-white/80 rounded-2xl" : ""
                      }`}
                    >
                      {renderTextLayerVisual(layer)}
                      {isSel && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTextLayers((prev) => prev.filter((x) => x.id !== layer.id));
                            setSelectedLayerId(null);
                            triggerHaptic();
                          }}
                          className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-zinc-950 border border-white text-white flex items-center justify-center cursor-pointer"
                          aria-label="Remove text"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </motion.div>
                  );
                })}

                {/* Draggable Interactive Stickers */}
                {placedStickers.map((stk) => {
                  const isSel = selectedLayerId === stk.id;
                  return (
                    <motion.div
                      key={stk.id}
                      drag
                      dragMomentum={false}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLayerId(stk.id);
                      }}
                      className={`pointer-events-auto absolute cursor-grab active:cursor-grabbing ${
                        isSel ? "ring-2 ring-white/80 rounded-2xl p-1" : ""
                      }`}
                    >
                      {renderStickerVisual(stk)}
                      {isSel && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlacedStickers((prev) => prev.filter((x) => x.id !== stk.id));
                            setSelectedLayerId(null);
                            triggerHaptic();
                          }}
                          className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-zinc-950 border border-white text-white flex items-center justify-center cursor-pointer"
                          aria-label="Remove sticker"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* AI Info Badge Indicator */}
              {aiLabel && (
                <div className="absolute top-16 left-4 z-20 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/15 flex items-center gap-1.5 text-[11px] font-semibold text-white">
                  <Cpu className="w-3 h-3 text-[#1877F2]" />
                  <span>AI info</span>
                </div>
              )}

              {/* Editor Top Bar & Collapsible Right Tool Rail (Hidden while Drawing or in Text Studio) */}
              {!drawModeOpen && !textStudioOpen && (
                <>
                  {/* Top Bar: Back/Discard + Attached Music Pill */}
                  <div className="absolute top-3.5 left-3.5 right-16 z-30 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStep("gallery");
                        triggerHaptic();
                      }}
                      className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center text-white shrink-0 cursor-pointer"
                      aria-label="Back"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>

                    {attachedSong ? (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setAudioMuted((m) => !m);
                        }}
                        className="flex items-center gap-2 bg-black/55 backdrop-blur-xl border border-white/15 rounded-full py-1 pl-1.5 pr-2.5 max-w-[230px] cursor-pointer"
                      >
                        <img
                          src={attachedSong.coverUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">
                            {attachedSong.title}
                          </p>
                          <p className="text-[10px] text-zinc-300 truncate">
                            {attachedSong.artist}
                          </p>
                        </div>
                        {audioMuted ? (
                          <VolumeX className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5 text-[#1877F2] shrink-0" />
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAttachedSong(null);
                          }}
                          className="p-0.5 text-zinc-300 hover:text-white cursor-pointer"
                          aria-label="Remove song"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMusicSheetOpen(true);
                        }}
                        className="px-3.5 h-9 rounded-full bg-black/45 backdrop-blur-md border border-white/10 flex items-center gap-1.5 text-xs font-bold text-white cursor-pointer whitespace-nowrap"
                      >
                        <Music className="w-3.5 h-3.5" />
                        <span>Audio</span>
                      </button>
                    )}

                    {!createMode && selectedMedia && hasCustomMediaTransform && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMediaScale(1);
                          setMediaOffset({ x: 0, y: 0 });
                          triggerHaptic();
                        }}
                        className="px-3 h-9 rounded-full bg-black/55 backdrop-blur-md border border-white/15 flex items-center gap-1 text-[11px] font-bold text-white cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>1:1</span>
                      </button>
                    )}
                  </div>

                  {/* Right Vertical Tool Rail (IMG_4849 / IMG_4850) */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-3.5 right-3 z-30 flex flex-col items-end gap-2"
                  >
                    <div className="flex flex-col items-end gap-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-1.5">
                      <button
                        type="button"
                        onClick={openTextStudioForNew}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-full hover:bg-white/10 text-white cursor-pointer"
                      >
                        {railExpanded && <span className="text-xs font-bold">Text</span>}
                        <span className="w-6 h-6 flex items-center justify-center font-serif font-extrabold text-base">
                          Aa
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setStickerTrayOpen(true)}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-full hover:bg-white/10 text-white cursor-pointer"
                      >
                        {railExpanded && <span className="text-xs font-bold">Stickers</span>}
                        <Smile className="w-5 h-5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setMusicSheetOpen(true)}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-full hover:bg-white/10 text-white cursor-pointer"
                      >
                        {railExpanded && <span className="text-xs font-bold">Audio</span>}
                        <Music className="w-5 h-5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setEffectsBarOpen((v) => !v)}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-full cursor-pointer ${
                          effectsBarOpen ? "bg-[#1877F2] text-white" : "hover:bg-white/10 text-white"
                        }`}
                      >
                        {railExpanded && <span className="text-xs font-bold">Effects</span>}
                        <Sparkles className="w-5 h-5" />
                      </button>

                      {railExpanded && (
                        <>
                          <button
                            type="button"
                            onClick={() => openStickerConfigurator("mention")}
                            className="flex items-center gap-2.5 px-2.5 py-2 rounded-full hover:bg-white/10 text-white cursor-pointer"
                          >
                            <span className="text-xs font-bold">Mention</span>
                            <AtSign className="w-5 h-5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDrawModeOpen(true);
                              setRailExpanded(false);
                              triggerHaptic();
                            }}
                            className="flex items-center gap-2.5 px-2.5 py-2 rounded-full hover:bg-white/10 text-white cursor-pointer"
                          >
                            <span className="text-xs font-bold">Draw</span>
                            <Pencil className="w-5 h-5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setMoreMenuOpen((v) => !v)}
                            className="flex items-center gap-2.5 px-2.5 py-2 rounded-full hover:bg-white/10 text-white cursor-pointer"
                          >
                            <span className="text-xs font-bold">More</span>
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setRailExpanded((v) => !v);
                          setMoreMenuOpen(false);
                        }}
                        className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white self-end cursor-pointer"
                        aria-label="Expand tools"
                      >
                        {railExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* More ••• Frosted Popover (IMG_4853: Download, Label AI, Turn off commenting) */}
                    {moreMenuOpen && (
                      <div className="w-56 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-white/15 shadow-2xl py-1.5 overflow-hidden">
                        <button
                          type="button"
                          onClick={handleDownloadStoryPng}
                          className="w-full px-4 py-2.5 text-left text-xs font-bold text-white hover:bg-white/10 flex items-center justify-between cursor-pointer"
                        >
                          <span>Download</span>
                          <Download className="w-4 h-4 text-zinc-300" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAiLabel((v) => !v);
                            setMoreMenuOpen(false);
                            triggerHaptic();
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs font-bold text-white hover:bg-white/10 flex items-center justify-between cursor-pointer"
                        >
                          <span>{aiLabel ? "Remove AI label" : "Label AI"}</span>
                          <Cpu className={`w-4 h-4 ${aiLabel ? "text-[#1877F2]" : "text-zinc-300"}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAllowCommenting((v) => !v);
                            setMoreMenuOpen(false);
                            triggerHaptic();
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs font-bold text-white hover:bg-white/10 flex items-center justify-between cursor-pointer"
                        >
                          <span>
                            {allowCommenting ? "Turn off commenting" : "Turn on commenting"}
                          </span>
                          {allowCommenting ? (
                            <MessageSquareOff className="w-4 h-4 text-zinc-300" />
                          ) : (
                            <MessageSquare className="w-4 h-4 text-[#1877F2]" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Effects Filter Strip */}
                  {effectsBarOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-16 inset-x-3 z-30 bg-black/65 backdrop-blur-xl border border-white/15 rounded-2xl p-2.5 flex items-center gap-2 overflow-x-auto"
                    >
                      {STUDIO_EFFECTS.map((eff) => (
                        <button
                          key={eff.id}
                          type="button"
                          onClick={() => {
                            setEffectId(eff.id);
                            triggerHaptic();
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer ${
                            effectId === eff.id
                              ? "bg-[#1877F2] text-white"
                              : "bg-white/10 text-zinc-200 hover:bg-white/20"
                          }`}
                        >
                          {eff.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Create Mode Gradient Cycle Button + Caption Bar */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-3 inset-x-3 z-20 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Add a caption..."
                      className="flex-1 h-10 px-4 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-xs text-white placeholder-zinc-300 outline-none focus:border-white/40"
                    />
                    {createMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setCreateGradientIdx((i) => (i + 1) % CREATE_GRADIENTS.length);
                          triggerHaptic();
                        }}
                        className="w-10 h-10 rounded-full bg-black/55 backdrop-blur-md border border-white/25 flex items-center justify-center shrink-0 cursor-pointer"
                        title="Change gradient"
                      >
                        <div className={`w-6 h-6 rounded-full ${activeCreateGradient.bgClass}`} />
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Freehand Drawing HUD (Pinned Done Button — Never Overflows Mobile Viewport) */}
              {drawModeOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-x-0 top-0 bottom-0 z-40 pointer-events-none flex flex-col justify-between p-2.5 sm:p-3.5 overflow-hidden"
                >
                  <div className="pointer-events-auto w-full max-w-full box-border flex items-center justify-between gap-1.5 bg-black/75 backdrop-blur-xl rounded-full px-2 py-1.5 border border-white/15 overflow-hidden">
                    <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto no-scrollbar">
                      {(
                        [
                          { id: "pen", label: "Pen" },
                          { id: "marker", label: "Marker" },
                          { id: "neon", label: "Neon" },
                          { id: "eraser", label: "Eraser" },
                        ] as const
                      ).map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setDrawBrush(b.id)}
                          aria-label={b.label}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 whitespace-nowrap cursor-pointer transition-colors ${
                            drawBrush === b.id
                              ? "bg-[#1877F2] text-white"
                              : "text-zinc-300 hover:text-white"
                          }`}
                        >
                          {b.id === "eraser" ? <Eraser className="w-3.5 h-3.5" /> : b.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 pl-1.5 border-l border-white/15">
                      <button
                        type="button"
                        onClick={() => setStrokes((prev) => prev.slice(0, -1))}
                        className="w-7 h-7 flex items-center justify-center text-white hover:bg-white/10 rounded-full shrink-0 cursor-pointer"
                        aria-label="Undo stroke"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setStrokes([])}
                        className="w-7 h-7 flex items-center justify-center text-white hover:bg-white/10 rounded-full shrink-0 cursor-pointer"
                        aria-label="Clear drawing"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrawModeOpen(false)}
                        className="px-3 py-1 rounded-full bg-white text-zinc-950 text-xs font-extrabold shrink-0 whitespace-nowrap cursor-pointer active:scale-95 transition-transform"
                      >
                        Done
                      </button>
                    </div>
                  </div>

                  <div className="pointer-events-auto space-y-2 bg-black/60 backdrop-blur-xl rounded-2xl p-2.5 border border-white/15">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-semibold text-zinc-300">Brush size</span>
                      <div className="flex items-center gap-1.5">
                        {[4, 8, 14, 22].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setDrawWidth(w)}
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums cursor-pointer ${
                              drawWidth === w ? "bg-[#1877F2] text-white" : "bg-white/10 text-zinc-300"
                            }`}
                          >
                            {w}px
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto py-0.5">
                      {STORY_COLORS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setDrawColorId(c.id)}
                          className={`w-7 h-7 rounded-full shrink-0 ${c.swatchClass} border-2 cursor-pointer ${
                            drawColorId === c.id ? "border-white scale-110" : "border-white/25"
                          }`}
                          aria-label={c.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Publish Bar: Your story · Close Friends · #1877F2 → (Zero white background) */}
            <div className="story-publish-bar flex items-center gap-2 shrink-0 pb-1 bg-transparent">
              <button
                type="button"
                disabled={publishing}
                onClick={() => handlePublishStory("story")}
                className="story-pill-btn flex-1 h-12 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/10 flex items-center gap-2.5 px-2.5 transition-colors active:scale-95 cursor-pointer"
              >
                <img
                  src={userAvatarResolved}
                  alt="Your story"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = deepShopLogoFallback;
                  }}
                  className="w-7 h-7 rounded-full object-cover border border-white/30 shrink-0"
                />
                <span className="text-xs font-bold text-white whitespace-nowrap truncate">
                  {publishing ? "Sharing..." : "Your story"}
                </span>
              </button>

              <button
                type="button"
                disabled={publishing}
                onClick={() => setCloseFriendsOpen(true)}
                className="story-pill-btn flex-1 h-12 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/10 flex items-center gap-2 px-2.5 transition-colors active:scale-95 cursor-pointer"
              >
                <span className="story-cf-badge w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                  <Star className="w-3.5 h-3.5 text-white fill-white" />
                </span>
                <span className="text-xs font-bold text-white whitespace-nowrap truncate">
                  Close Friends
                </span>
              </button>

              <button
                type="button"
                disabled={publishing}
                onClick={() => setShareSheetOpen(true)}
                className="story-cta-blue w-12 h-12 rounded-full bg-[#1877F2] hover:bg-blue-600 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all shrink-0 cursor-pointer"
                aria-label="Open share options"
              >
                {publishing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================
         * OVERLAY 1: TEXT STUDIO (IMG_4851)
         * ================================================================= */}
        <AnimatePresence>
          {textStudioOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col justify-between p-4"
            >
              {/* TopFormatting Bar + Done */}
              <header className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {/* 1. Aa Case */}
                  <button
                    type="button"
                    onClick={() =>
                      setDraftCaseMode((m) =>
                        m === "normal" ? "upper" : m === "upper" ? "lower" : "normal"
                      )
                    }
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-xs font-extrabold text-white flex items-center justify-center cursor-pointer"
                    title="Case"
                  >
                    Aa
                  </button>

                  {/* 2. Color Wheel Toggle */}
                  <button
                    type="button"
                    onClick={() => setTextColorTrayOpen((v) => !v)}
                    className="w-9 h-9 rounded-full bg-gradient-to-tr from-rose-500 via-amber-400 to-[#1877F2] p-0.5 cursor-pointer"
                    title="Colors"
                  >
                    <span className="block w-full h-full rounded-full border-2 border-black" />
                  </button>

                  {/* 3. Motion Animation //A */}
                  <button
                    type="button"
                    onClick={() =>
                      setDraftAnimation((a) =>
                        a === "none" ? "pulse" : a === "pulse" ? "bounce" : "none"
                      )
                    }
                    className={`px-2.5 h-9 rounded-full text-xs font-extrabold cursor-pointer ${
                      draftAnimation !== "none"
                        ? "bg-[#1877F2] text-white"
                        : "bg-white/10 text-white"
                    }`}
                    title="Animation"
                  >
                    =A
                  </button>

                  {/* 4. Outline Contrast A */}
                  <button
                    type="button"
                    onClick={() => setDraftOutline((v) => !v)}
                    className={`w-9 h-9 rounded-full text-xs font-extrabold border cursor-pointer ${
                      draftOutline
                        ? "bg-white text-zinc-950 border-white"
                        : "bg-transparent text-white border-white/30"
                    }`}
                    title="Outline"
                  >
                    A
                  </button>

                  {/* 5. Alignment */}
                  <button
                    type="button"
                    onClick={() =>
                      setDraftAlign((a) =>
                        a === "center" ? "left" : a === "left" ? "right" : "center"
                      )
                    }
                    className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center cursor-pointer"
                    title="Alignment"
                  >
                    {draftAlign === "left" ? (
                      <AlignLeft className="w-4 h-4" />
                    ) : draftAlign === "right" ? (
                      <AlignRight className="w-4 h-4" />
                    ) : (
                      <AlignCenter className="w-4 h-4" />
                    )}
                  </button>

                  {/* 6. [A] Pill Highlight */}
                  <button
                    type="button"
                    onClick={() =>
                      setDraftPillMode((p) =>
                        p === "none" ? "solid" : p === "solid" ? "soft" : "none"
                      )
                    }
                    className={`px-2.5 h-9 rounded-xl text-xs font-extrabold cursor-pointer ${
                      draftPillMode !== "none"
                        ? "bg-white text-zinc-950"
                        : "bg-white/10 text-white"
                    }`}
                    title="Background highlight"
                  >
                    [A]
                  </button>
                </div>

                <button
                  type="button"
                  onClick={commitTextStudio}
                  className="px-4 py-1.5 rounded-full bg-[#1877F2] text-white text-sm font-bold cursor-pointer"
                >
                  Done
                </button>
              </header>

              {/* Center Area: Left Vertical 7-Step Size Slider + Live Textarea */}
              <div className="flex-1 flex items-center gap-3 my-4">
                {/* Vertical 7-Step Font Size Slider */}
                <div className="flex flex-col items-center gap-1.5 bg-white/10 rounded-full py-3 px-1.5">
                  {[...FONT_SIZE_STEPS].reverse().map((s) => (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => setDraftSizeStep(s.step)}
                      className={`w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-transform ${
                        draftSizeStep === s.step
                          ? "bg-[#1877F2] scale-125"
                          : "bg-white/25 hover:bg-white/40"
                      }`}
                      aria-label={`Text size ${s.step + 1}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    </button>
                  ))}
                </div>

                {/* Live Styled Textarea */}
                <div className="flex-1 flex items-center justify-center">
                  <textarea
                    autoFocus
                    rows={4}
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    placeholder="Type something..."
                    className={`w-full bg-transparent outline-none resize-none placeholder-white/35 ${
                      (STORY_FONTS.find((f) => f.id === draftFontId) || STORY_FONTS[0]).className
                    } ${FONT_SIZE_STEPS[draftSizeStep].textClass} ${
                      (STORY_COLORS.find((c) => c.id === draftColorId) || STORY_COLORS[0]).textClass
                    } ${
                      draftAlign === "left"
                        ? "text-left"
                        : draftAlign === "right"
                        ? "text-right"
                        : "text-center"
                    }`}
                  />
                </div>
              </div>

              {/* Bottom Controls: Quick Mention/Location, Colors, Fonts, Presets/Texture, Mode Switcher */}
              <div className="space-y-3">
                {/* @ Mention & Location Quick Insert Chips */}
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftText((t) => `${t}${t ? " " : ""}@deepshop`)}
                    className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
                  >
                    <AtSign className="w-3.5 h-3.5 text-[#1877F2]" />
                    <span>Mention</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftText((t) => `${t}${t ? " · " : ""}Dhaka, BD`)}
                    className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Location</span>
                  </button>
                </div>

                {textBottomTab === "text" && (
                  <>
                    {textColorTrayOpen && (
                      <div className="flex items-center gap-2.5 overflow-x-auto py-1">
                        {STORY_COLORS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setDraftColorId(c.id)}
                            className={`w-7 h-7 rounded-full shrink-0 ${c.swatchClass} border-2 cursor-pointer transition-transform ${
                              draftColorId === c.id ? "border-white scale-110" : "border-white/25"
                            }`}
                            aria-label={c.label}
                          />
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {STORY_FONTS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setDraftFontId(f.id)}
                          className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap cursor-pointer ${
                            draftFontId === f.id
                              ? "bg-white text-zinc-950 font-bold"
                              : "bg-white/10 text-white hover:bg-white/20"
                          }`}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {textBottomTab === "texts" && (
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {TEXT_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDraftText(preset)}
                        className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white whitespace-nowrap cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                )}

                {textBottomTab === "texture" && (
                  <div className="flex items-center justify-center gap-2 py-1">
                    {(
                      [
                        { id: "clean", label: "Clean Matte" },
                        { id: "shimmer", label: "Gold Shimmer" },
                        { id: "neon", label: "Deep Neon Glow" },
                      ] as const
                    ).map((tx) => (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => setDraftTexture(tx.id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer ${
                          draftTexture === tx.id
                            ? "bg-[#1877F2] text-white"
                            : "bg-white/10 text-zinc-300"
                        }`}
                      >
                        {tx.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Bottom Switcher: Text · Texts · Texture */}
                <div className="flex items-center justify-center gap-6 pt-1 border-t border-white/10 text-xs font-bold">
                  {(
                    [
                      { id: "text", label: "Text" },
                      { id: "texts", label: "Texts" },
                      { id: "texture", label: "Texture" },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTextBottomTab(t.id)}
                      className={`py-1 cursor-pointer ${
                        textBottomTab === t.id ? "text-white" : "text-zinc-500"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===================================================================
         * OVERLAY 2: STICKER TRAY (IMG_4855) + CONFIGURATOR MODAL
         * ================================================================= */}
        <AnimatePresence>
          {stickerTrayOpen && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute inset-0 z-40 bg-zinc-950/95 backdrop-blur-2xl flex flex-col p-4 overflow-hidden"
            >
              <div className="w-10 h-1 rounded-full bg-white/25 mx-auto mb-3 shrink-0" />

              {/* Search Bar + Close */}
              <div className="flex items-center gap-2 mb-4 shrink-0">
                <div className="flex-1 h-10 rounded-xl bg-zinc-800/90 px-3 flex items-center gap-2">
                  <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                  <input
                    type="text"
                    value={stickerSearch}
                    onChange={(e) => setStickerSearch(e.target.value)}
                    placeholder="Search stickers"
                    className="w-full bg-transparent text-xs text-white placeholder-zinc-400 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setStickerTrayOpen(false)}
                  className="px-3 h-10 rounded-xl bg-white/10 text-xs font-bold text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-5 pb-6">
                {/* 18 Interactive Sticker Pills */}
                <div className="flex flex-wrap gap-2.5 justify-center">
                  {filteredStickerDefs.map((s, idx) => (
                    <button
                      key={`${s.label}_${idx}`}
                      type="button"
                      onClick={s.onSelect}
                      className="px-3.5 py-2.5 rounded-2xl bg-white text-zinc-950 shadow-md hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-tight cursor-pointer whitespace-nowrap"
                    >
                      <span className={s.badgeClass}>{s.icon}</span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>

                {/* Live Dhaka Clock, Heart Counter, SOUND ON, Day Stamp Row */}
                <div className="pt-2 border-t border-white/10 space-y-3">
                  <p className="text-xs font-semibold text-zinc-400">Live badges & widgets</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => addStickerInstant({ kind: "clock", title: "Dhaka Time" })}
                      className="p-3 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center gap-1.5 font-mono font-black text-lg text-white tabular-nums cursor-pointer hover:bg-zinc-800"
                    >
                      <span className="px-2 py-1 rounded bg-white/10">{dhakaClock.hh}</span>
                      <span>:</span>
                      <span className="px-2 py-1 rounded bg-white/10">{dhakaClock.mm}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => addStickerInstant({ kind: "day_stamp", title: dhakaClock.dayStr })}
                      className="p-3 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center font-serif font-black tracking-widest text-sm text-white cursor-pointer hover:bg-zinc-800"
                    >
                      {dhakaClock.dayStr}
                    </button>

                    <button
                      type="button"
                      onClick={() => addStickerInstant({ kind: "heart_count", title: "1" })}
                      className="p-3 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center gap-1.5 text-rose-400 font-extrabold text-sm cursor-pointer hover:bg-zinc-800"
                    >
                      <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                      <span>1</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => addStickerInstant({ kind: "sound_on", title: "SOUND ON" })}
                      className="p-3 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center gap-1.5 text-white font-extrabold text-xs cursor-pointer hover:bg-zinc-800"
                    >
                      <Volume2 className="w-4 h-4 text-[#1877F2]" />
                      <span>SOUND ON</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sticker Configurator Dialog */}
        <AnimatePresence>
          {configuringSticker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/85 backdrop-blur-xl flex flex-col justify-center p-5"
            >
              <div className="bg-zinc-900 border border-white/15 rounded-3xl p-5 space-y-4 shadow-2xl max-h-[82vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white capitalize">
                    {configuringSticker.replace("_", " ")} sticker
                  </h3>
                  <button
                    type="button"
                    onClick={() => setConfiguringSticker(null)}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {configuringSticker === "shop_order" ? (
                  <div className="space-y-2.5">
                    <p className="text-xs text-zinc-400">
                      Attach a verified Deep Shop product card to your story:
                    </p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {shopProducts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            addStickerInstant({
                              kind: "shop_order",
                              title: p.name,
                              imageUrl: p.image,
                              productId: p.id,
                              priceLabel: p.price ? `৳${Number(p.price).toLocaleString()}` : "Order now",
                              url: `/product/${p.id}`,
                            })
                          }
                          className="w-full p-2 rounded-2xl bg-zinc-800 hover:bg-zinc-700 flex items-center gap-3 text-left cursor-pointer"
                        >
                          <img
                            src={p.image}
                            alt={p.name}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-xl object-cover shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white truncate">{p.name}</p>
                            <p className="text-[11px] font-semibold text-[#1877F2] tabular-nums">
                              ৳{Number(p.price || 0).toLocaleString()}
                            </p>
                          </div>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          addStickerInstant({
                            kind: "shop_order",
                            title: "Explore Deep Shop Deals",
                            priceLabel: "Shop orders →",
                            url: "/products",
                          })
                        }
                        className="w-full py-2.5 rounded-xl bg-[#1877F2] text-white text-xs font-bold cursor-pointer"
                      >
                        Link All Deep Shop Products
                      </button>
                    </div>
                  </div>
                ) : configuringSticker === "mention" ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      autoFocus
                      value={configSearchUser}
                      onChange={(e) => setConfigSearchUser(e.target.value)}
                      placeholder="Type @username or search member..."
                      className="w-full h-10 px-3.5 rounded-xl bg-zinc-800 text-xs text-white outline-none border border-white/10"
                    />
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {communityUsers
                        .filter((u) =>
                          !configSearchUser.trim()
                            ? true
                            : `${u.name} ${u.handle}`
                                .toLowerCase()
                                .includes(configSearchUser.toLowerCase())
                        )
                        .slice(0, 8)
                        .map((u) => (
                          <button
                            key={u.uid}
                            type="button"
                            onClick={() =>
                              addStickerInstant({
                                kind: "mention",
                                title: u.handle,
                                targetUid: u.uid,
                              })
                            }
                            className="w-full p-2 rounded-xl hover:bg-white/10 flex items-center gap-2.5 text-left cursor-pointer"
                          >
                            <img
                              src={u.avatar}
                              alt={u.name}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{u.name}</p>
                              <p className="text-[11px] text-zinc-400 truncate">@{u.handle}</p>
                            </div>
                          </button>
                        ))}
                    </div>
                    {configSearchUser.trim() && (
                      <button
                        type="button"
                        onClick={() =>
                          addStickerInstant({
                            kind: "mention",
                            title: configSearchUser.trim().replace(/^@/, ""),
                          })
                        }
                        className="w-full py-2.5 rounded-xl bg-[#1877F2] text-white text-xs font-bold cursor-pointer"
                      >
                        Add @{configSearchUser.trim().replace(/^@/, "")}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      autoFocus
                      value={configTitle}
                      onChange={(e) => setConfigTitle(e.target.value)}
                      placeholder={
                        configuringSticker === "link"
                          ? "https://..."
                          : configuringSticker === "hashtag"
                          ? "Topic name"
                          : "Enter title or prompt..."
                      }
                      className="w-full h-10 px-3.5 rounded-xl bg-zinc-800 text-xs text-white outline-none border border-white/10"
                    />

                    {configuringSticker === "location" && (
                      <div className="flex flex-wrap gap-1.5">
                        {["Dhaka, Bangladesh", "Chattogram", "Sylhet", "Deep Shop Verified"].map(
                          (loc) => (
                            <button
                              key={loc}
                              type="button"
                              onClick={() => setConfigTitle(loc)}
                              className="px-2.5 py-1 rounded-full bg-zinc-800 text-[11px] text-zinc-200 cursor-pointer"
                            >
                              {loc}
                            </button>
                          )
                        )}
                      </div>
                    )}

                    {(configuringSticker === "link" || configuringSticker === "countdown") && (
                      <input
                        type="text"
                        value={configSubtitle}
                        onChange={(e) => setConfigSubtitle(e.target.value)}
                        placeholder={
                          configuringSticker === "link"
                            ? "Sticker button text (e.g. Shop Now)"
                            : "Time label (e.g. Tonight · 9:00 PM)"
                        }
                        className="w-full h-10 px-3.5 rounded-xl bg-zinc-800 text-xs text-white outline-none border border-white/10"
                      />
                    )}

                    {configuringSticker === "poll" && (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={configOptA}
                          onChange={(e) => setConfigOptA(e.target.value)}
                          placeholder="Option 1"
                          className="h-10 px-3 rounded-xl bg-zinc-800 text-xs text-white outline-none border border-white/10"
                        />
                        <input
                          type="text"
                          value={configOptB}
                          onChange={(e) => setConfigOptB(e.target.value)}
                          placeholder="Option 2"
                          className="h-10 px-3 rounded-xl bg-zinc-800 text-xs text-white outline-none border border-white/10"
                        />
                      </div>
                    )}

                    {configuringSticker === "slider" && (
                      <div className="flex items-center justify-center gap-2">
                        {["🔥", "😍", "💯", "🎉", "❤️"].map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => setConfigEmoji(em)}
                            className={`w-10 h-10 rounded-full text-lg cursor-pointer ${
                              configEmoji === em ? "bg-[#1877F2]" : "bg-zinc-800"
                            }`}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (!configTitle.trim()) return;
                        addStickerInstant({
                          kind: configuringSticker,
                          title: configTitle.trim(),
                          subtitle: configSubtitle.trim() || undefined,
                          optionA: configuringSticker === "poll" ? configOptA.trim() || "Yes" : undefined,
                          optionB: configuringSticker === "poll" ? configOptB.trim() || "No" : undefined,
                          emoji: configuringSticker === "slider" ? configEmoji : undefined,
                          url: configuringSticker === "link" ? configTitle.trim() : undefined,
                        });
                      }}
                      className="w-full py-2.5 rounded-full bg-[#1877F2] hover:bg-blue-600 text-white text-xs font-bold cursor-pointer"
                    >
                      Add to Story
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===================================================================
         * OVERLAY 3: MUSIC & AUDIO SHEET
         * ================================================================= */}
        <AnimatePresence>
          {musicSheetOpen && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-2xl flex flex-col p-4"
            >
              <header className="flex items-center justify-between pb-3">
                <h3 className="text-base font-bold text-white">For you · Audio</h3>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewingSongId(null);
                    setMusicSheetOpen(false);
                  }}
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </header>

              <div className="h-10 rounded-xl bg-zinc-800/90 px-3 flex items-center gap-2 mb-3 shrink-0">
                <Search className="w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={musicSearch}
                  onChange={(e) => setMusicSearch(e.target.value)}
                  placeholder="Search music"
                  className="w-full bg-transparent text-xs text-white placeholder-zinc-400 outline-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pb-4">
                {songsList
                  .filter((s) =>
                    !musicSearch.trim()
                      ? true
                      : `${s.title} ${s.artist}`
                          .toLowerCase()
                          .includes(musicSearch.toLowerCase())
                  )
                  .map((song) => {
                    const isPlaying = previewingSongId === song.id;
                    const isAttached = attachedSong?.id === song.id;
                    return (
                      <div
                        key={song.id}
                        className="p-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800/90 border border-white/5 flex items-center gap-3"
                      >
                        <img
                          src={song.coverUrl}
                          alt={song.title}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src = deepShopLogoFallback;
                          }}
                          className="w-12 h-12 rounded-xl object-cover shrink-0 bg-zinc-800"
                        />
                        <div
                          onClick={() => {
                            setAttachedSong(song);
                            setAudioMuted(false);
                            setPreviewingSongId(null);
                            setMusicSheetOpen(false);
                            triggerHaptic();
                          }}
                          className="min-w-0 flex-1 cursor-pointer"
                        >
                          <p className="text-xs font-bold text-white truncate">{song.title}</p>
                          <p className="text-[11px] text-zinc-400 truncate">{song.artist}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setPreviewingSongId((prev) => (prev === song.id ? null : song.id))
                          }
                          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white cursor-pointer shrink-0"
                          aria-label={isPlaying ? "Pause preview" : "Play preview"}
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAttachedSong(song);
                            setAudioMuted(false);
                            setPreviewingSongId(null);
                            setMusicSheetOpen(false);
                            triggerHaptic();
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer shrink-0 ${
                            isAttached ? "bg-green-500 text-white" : "bg-[#1877F2] text-white"
                          }`}
                        >
                          {isAttached ? "Added" : "Use"}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===================================================================
         * OVERLAY 4: CLOSE FRIENDS SHEET (IMG_4852)
         * ================================================================= */}
        <AnimatePresence>
          {closeFriendsOpen && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute inset-0 z-50 bg-zinc-950 flex flex-col p-4"
            >
              <header className="flex items-center justify-between pb-3 border-b border-white/10">
                <button
                  type="button"
                  onClick={() => setCloseFriendsOpen(false)}
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Star className="w-3.5 h-3.5 text-white fill-white" />
                  </span>
                  <h3 className="text-sm font-bold text-white">Close Friends</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCloseFriendIds([])}
                  className="text-xs font-semibold text-[#1877F2] cursor-pointer"
                >
                  Clear all
                </button>
              </header>

              <p className="text-xs text-zinc-400 py-2.5 leading-relaxed">
                We don't send notifications when you edit your Close Friends list.{" "}
                <span className="text-white font-semibold tabular-nums">
                  {closeFriendIds.length} selected
                </span>
              </p>

              <div className="h-10 rounded-xl bg-zinc-900 px-3 flex items-center gap-2 mb-3 border border-white/10 shrink-0">
                <Search className="w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={closeFriendsSearch}
                  onChange={(e) => setCloseFriendsSearch(e.target.value)}
                  placeholder="Search followers or following"
                  className="w-full bg-transparent text-xs text-white placeholder-zinc-400 outline-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pb-4">
                {(() => {
                  const filteredCf = closeFriendCandidates.filter((u) =>
                    !closeFriendsSearch.trim()
                      ? true
                      : `${u.name} ${u.handle} ${u.relationLabel || ""}`
                          .toLowerCase()
                          .includes(closeFriendsSearch.toLowerCase())
                  );
                  if (filteredCf.length === 0) {
                    return (
                      <div className="py-10 px-4 text-center space-y-1.5">
                        <p className="text-xs font-semibold text-zinc-300">
                          {closeFriendCandidates.length === 0
                            ? "No followers or following yet"
                            : "No matching followers or following"}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          People who follow you or whom you follow on Feed will appear here.
                        </p>
                      </div>
                    );
                  }
                  return filteredCf.map((u) => {
                    const checked = closeFriendIds.includes(u.uid);
                    return (
                      <button
                        key={u.uid}
                        type="button"
                        onClick={() => toggleCloseFriendMember(u.uid)}
                        className="w-full p-2.5 rounded-2xl hover:bg-zinc-900 flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={u.avatar}
                            alt={u.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full object-cover shrink-0 bg-zinc-800"
                          />
                          <div className="text-left min-w-0">
                            <p className="text-xs font-bold text-white truncate">{u.name}</p>
                            <p className="text-[11px] text-zinc-400 truncate">
                              @{u.handle}
                              {u.relationLabel ? ` · ${u.relationLabel}` : ""}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            checked
                              ? "story-cta-blue bg-[#1877F2] border-[#1877F2] text-white"
                              : "border-zinc-600"
                          }`}
                        >
                          {checked && <Check className="w-3.5 h-3.5" />}
                        </span>
                      </button>
                    );
                  });
                })()}
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setCloseFriendsOpen(false)}
                  className="story-pill-btn px-5 py-3 rounded-full bg-zinc-900 text-white text-xs font-bold cursor-pointer"
                >
                  Save List
                </button>
                <button
                  type="button"
                  disabled={publishing}
                  onClick={() => handlePublishStory("close_friends")}
                  className="story-cta-blue flex-1 py-3 rounded-full bg-[#1877F2] hover:bg-blue-600 text-white text-xs font-bold cursor-pointer"
                >
                  {publishing ? "Sharing..." : "Share to Close Friends"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===================================================================
         * OVERLAY 5: SHARE SHEET (IMG_4854)
         * ================================================================= */}
        <AnimatePresence>
          {shareSheetOpen && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute inset-0 z-50 bg-zinc-950 flex flex-col p-4"
            >
              <header className="flex items-center justify-between pb-3">
                <button
                  type="button"
                  onClick={() => setShareSheetOpen(false)}
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-sm font-bold text-white">Share story</h3>
                <span className="w-9" />
              </header>

              {/* Shrunk Story Preview Card */}
              <div className="flex justify-center py-2 shrink-0">
                <div className="w-24 aspect-[9/16] rounded-2xl overflow-hidden border border-white/20 shadow-xl bg-zinc-900">
                  {createMode || !selectedMedia ? (
                    <div className={`w-full h-full ${activeCreateGradient.bgClass} flex items-center justify-center p-2 text-center`}>
                      <span className="text-[9px] font-bold text-white line-clamp-3">
                        {textLayers[0]?.text || caption || "DEEP SHOP"}
                      </span>
                    </div>
                  ) : (
                    <img
                      src={selectedMedia.url}
                      alt="Story preview"
                      referrerPolicy="no-referrer"
                      className={`w-full h-full object-cover ${activeEffect.filterClass}`}
                    />
                  )}
                </div>
              </div>

              {/* Audience Selection Rows */}
              <div className="space-y-2 py-3 border-b border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => setShareTargetAudience("story")}
                  className="w-full p-2.5 rounded-2xl bg-zinc-900 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={userAvatarResolved}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = deepShopLogoFallback;
                      }}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="text-left">
                      <p className="text-xs font-bold text-white">Your story</p>
                      <p className="text-[11px] text-zinc-400">Visible on Deep Shop Feed</p>
                    </div>
                  </div>
                  <span
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      shareTargetAudience === "story"
                        ? "bg-[#1877F2] border-[#1877F2] text-white"
                        : "border-zinc-600"
                    }`}
                  >
                    {shareTargetAudience === "story" && <Check className="w-3.5 h-3.5" />}
                  </span>
                </button>

                <div className="w-full p-2.5 rounded-2xl bg-zinc-900 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShareTargetAudience("close_friends")}
                    className="flex items-center gap-3 flex-1 text-left cursor-pointer"
                  >
                    <span className="story-cf-badge w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                      <Star className="w-5 h-5 text-white fill-white" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-white">Close Friends</p>
                      <p className="text-[11px] text-zinc-400 tabular-nums">
                        {closeFriendIds.length} people
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShareSheetOpen(false);
                        setCloseFriendsOpen(true);
                      }}
                      className="text-xs font-semibold text-[#1877F2] cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setShareTargetAudience("close_friends")}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer ${
                        shareTargetAudience === "close_friends"
                          ? "story-cta-blue bg-[#1877F2] border-[#1877F2] text-white"
                          : "border-zinc-600"
                      }`}
                    >
                      {shareTargetAudience === "close_friends" && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Send in Message Section (Strictly Real Chat Conversations Only) */}
              <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-[#1877F2]" />
                    <span>Message</span>
                  </span>
                </div>
                <div className="h-9 rounded-xl bg-zinc-900 px-3 flex items-center gap-2 border border-white/10">
                  <Search className="w-3.5 h-3.5 text-zinc-400" />
                  <input
                    type="text"
                    value={shareMessageQuery}
                    onChange={(e) => setShareMessageQuery(e.target.value)}
                    placeholder="Search recent chats..."
                    className="w-full bg-transparent text-xs text-white placeholder-zinc-400 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  {(() => {
                    const filteredChats = chatContacts.filter((u) =>
                      !shareMessageQuery.trim()
                        ? true
                        : `${u.name} ${u.handle}`
                            .toLowerCase()
                            .includes(shareMessageQuery.toLowerCase())
                    );
                    if (filteredChats.length === 0) {
                      return (
                        <p className="py-5 text-center text-xs text-zinc-500">
                          {chatContacts.length === 0
                            ? "No recent chat conversations yet."
                            : "No matching chats found."}
                        </p>
                      );
                    }
                    return filteredChats.slice(0, 12).map((u) => {
                      const sel = selectedDmUserIds.includes(u.uid);
                      return (
                        <button
                          key={u.uid}
                          type="button"
                          onClick={() =>
                            setSelectedDmUserIds((prev) =>
                              prev.includes(u.uid)
                                ? prev.filter((x) => x !== u.uid)
                                : [...prev, u.uid]
                            )
                          }
                          className="w-full p-2 rounded-xl hover:bg-zinc-900 flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={u.avatar}
                              alt={u.name}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full object-cover shrink-0 bg-zinc-800"
                            />
                            <div className="text-left min-w-0">
                              <p className="text-xs font-semibold text-white truncate">
                                {u.name}
                              </p>
                              <p className="text-[10.5px] text-zinc-400 truncate">
                                @{u.handle}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                              sel
                                ? "story-cta-blue bg-[#1877F2] border-[#1877F2] text-white"
                                : "border-zinc-600"
                            }`}
                          >
                            {sel && <Check className="w-3 h-3" />}
                          </span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Primary #1877F2 Share Button */}
              <button
                type="button"
                disabled={publishing}
                onClick={() => handlePublishStory(shareTargetAudience)}
                className="story-cta-blue w-full py-3.5 rounded-full bg-[#1877F2] hover:bg-blue-600 text-white text-sm font-bold shadow-lg flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sharing...</span>
                  </>
                ) : (
                  <span>Share</span>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===================================================================
         * OVERLAY 6: STORY SETTINGS SHEET
         * ================================================================= */}
        <AnimatePresence>
          {settingsOpen && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute inset-0 z-50 bg-zinc-950 flex flex-col justify-between p-5"
            >
              <div className="space-y-5">
                <header className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">Story controls</h3>
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(false)}
                    className="px-3.5 py-1.5 rounded-full bg-[#1877F2] text-white text-xs font-bold cursor-pointer"
                  >
                    Done
                  </button>
                </header>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-zinc-300">Allow story replies</p>
                  {(
                    [
                      { id: "everyone", label: "Everyone" },
                      { id: "followers", label: "Followers you follow back" },
                      { id: "off", label: "Off" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setReplyPrivacy(opt.id)}
                      className="w-full p-3 rounded-2xl bg-zinc-900 flex items-center justify-between text-xs font-semibold text-white cursor-pointer"
                    >
                      <span>{opt.label}</span>
                      <span
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          replyPrivacy === opt.id
                            ? "bg-[#1877F2] border-[#1877F2]"
                            : "border-zinc-600"
                        }`}
                      >
                        {replyPrivacy === opt.id && <Check className="w-3 h-3 text-white" />}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-900 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">Save story to archive</p>
                    <p className="text-[11px] text-zinc-400">
                      Automatically keep published stories in Recents
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoSaveArchive((v) => !v)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                      autoSaveArchive ? "bg-[#1877F2]" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                        autoSaveArchive ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false);
                    setCloseFriendsOpen(true);
                  }}
                  className="w-full p-3.5 rounded-2xl bg-zinc-900 flex items-center justify-between text-xs font-bold text-white cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-green-500 fill-green-500" />
                    <span>Manage Close Friends ({closeFriendIds.length})</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-zinc-400" />
                </button>
              </div>

              <p className="text-[11px] text-center text-zinc-500">
                DEEP SHOP Story Studio
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
