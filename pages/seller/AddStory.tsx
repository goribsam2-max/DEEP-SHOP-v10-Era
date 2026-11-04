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
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { db, auth } from "../../firebase";
import { useNotify } from "../../components/Notifications";
import { uploadToImgbb, uploadDataUrlToImgbb } from "../../services/imgbb";
import { uploadFileToCatbox } from "../../lib/catboxUpload";
import { toPlayableAudioUrl, toPlayableMediaUrl } from "../../lib/videoEmbed";
import { canAccessSellerDashboard } from "../../lib/admin";
import {
  useFooterLogo,
  DEEP_SHOP_LOGO_DATA_URI,
} from "../../lib/useFooterLogo";
import { triggerHaptic } from "../../lib/haptics";
import { getLocalFollowedIds } from "../../lib/follow";
import { detectAiGeneratedFiles } from "../../lib/aiImageDetector";
import { motion, AnimatePresence } from "framer-motion";
import { LoopsSvgIcon } from "../../components/LoopsSvgIcon";
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
  Shield,
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

const parkShowcaseImg =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1877F2"/><stop offset="100%" stop-color="#0f172a"/></linearGradient></defs><rect width="240" height="240" fill="url(#g)"/></svg>'
  );
const creatorAvatar1 = DEEP_SHOP_LOGO_DATA_URI;
const creatorAvatar2 = DEEP_SHOP_LOGO_DATA_URI;
const creatorAvatar3 = DEEP_SHOP_LOGO_DATA_URI;
const deepShopLogoFallback = DEEP_SHOP_LOGO_DATA_URI;

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

  const fromMessages =
    searchParams.get("from") === "messages" ||
    (location.state as any)?.from === "/messages";
  const storyReturnPath = fromMessages ? "/messages" : "/loops";
  const fromNewsHub =
    fromMessages ||
    searchParams.get("from") === "loops" ||
    searchParams.get("from") === "news-hub" ||
    location.pathname.startsWith("/loops") ||
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

  // Hidden File Inputs & Background Video Upload Tracker
  const galleryUploadInputRef = useRef<HTMLInputElement | null>(null);
  const videoUploadInputRef = useRef<HTMLInputElement | null>(null);
  const stickerPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const cutoutPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const collageSlotInputRef = useRef<HTMLInputElement | null>(null);
  const pendingVideoUploadRef = useRef<Promise<string> | null>(null);
  const pendingVideoFileRef = useRef<File | null>(null);
  const hostedVideoUrlsRef = useRef<Record<string, string>>({});

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

  const safeSmallImageUrl = useCallback(
    (raw?: string | null, fallback = ""): string => {
      if (!raw || typeof raw !== "string") return fallback;
      const trimmed = raw.trim();
      if (!trimmed) return fallback;
      // Prevent oversized base64 data URLs from exceeding Firestore's 1MB document limit
      if (trimmed.startsWith("data:") && trimmed.length > 25000) return fallback;
      return trimmed;
    },
    []
  );

  // Load real songs from Firestore (`story_songs`, `background_music`, creator reels) + built-in tracks
  useEffect(() => {
    let storyTracks: any[] = [];
    let bgTracks: any[] = [];
    let reelAudioTracks: any[] = [];
    const safeLogo = safeSmallImageUrl(footerLogo, deepShopLogoFallback);

    const mergeAndPublish = () => {
      const seen = new Set<string>();
      const merged: any[] = [];
      for (const item of [...storyTracks, ...bgTracks, ...reelAudioTracks, ...BUILTIN_SONGS]) {
        const cleanUrl = String(item?.url || "").trim();
        if (!cleanUrl || seen.has(cleanUrl)) continue;
        seen.add(cleanUrl);
        merged.push({
          id: String(item.id || `trk_${merged.length}`),
          title: String(item.title || "Featured Audio"),
          artist: String(item.artist || "Loops Audio"),
          url: cleanUrl,
          coverUrl: safeSmallImageUrl(item.coverUrl, safeLogo),
        });
      }
      setSongsList(merged.length > 0 ? merged : BUILTIN_SONGS);
    };

    const unsubStorySongs = onSnapshot(
      collection(db, "story_songs"),
      (snap) => {
        storyTracks = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: `ss_${d.id}`,
              title: data.title || data.name || "Featured Audio",
              artist: data.artist || "Loops Audio",
              url: data.url || data.audioUrl || data.mp3Url || "",
              coverUrl: safeSmallImageUrl(data.coverUrl, safeLogo),
            };
          })
          .filter((s) => Boolean(s.url));
        mergeAndPublish();
      },
      () => mergeAndPublish()
    );

    const unsubBgMusic = onSnapshot(
      collection(db, "background_music"),
      (snap) => {
        bgTracks = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: `bg_${d.id}`,
              title: data.title || data.name || "Original Sound",
              artist: data.artist || data.addedBy || "Creator Audio",
              url: data.audioUrl || data.url || data.mp3Url || "",
              coverUrl: safeSmallImageUrl(data.coverUrl, safeLogo),
            };
          })
          .filter((s) => Boolean(s.url));
        mergeAndPublish();
      },
      () => mergeAndPublish()
    );

    getDocs(query(collection(db, "scam_posts"), limit(80)))
      .then((snap) => {
        reelAudioTracks = snap.docs
          .map((d) => {
            const data = d.data() || {};
            const audioCandidate =
              data.music?.audioUrl ||
              data.music?.url ||
              data.audioUrl ||
              (typeof data.videoUrl === "string" &&
              !/youtube\.com|youtu\.be|tiktok\.com|instagram\.com|facebook\.com/i.test(
                data.videoUrl
              )
                ? data.videoUrl
                : "");
            if (!audioCandidate) return null;
            return {
              id: `reel_aud_${d.id}`,
              title:
                data.music?.title ||
                (data.songTitle ? String(data.songTitle).split("·")[0]?.trim() : "") ||
                `Original audio - ${data.reporterName || data.authorName || "Creator"}`,
              artist:
                data.music?.artist ||
                data.reporterName ||
                data.authorName ||
                "Creator",
              url: audioCandidate,
              coverUrl: safeSmallImageUrl(
                data.music?.coverUrl ||
                  data.music?.cover ||
                  data.reporterAvatar ||
                  data.authorPhoto ||
                  data.thumbnailUrl,
                safeLogo
              ),
            };
          })
          .filter(Boolean);
        mergeAndPublish();
      })
      .catch(() => {});

    return () => {
      unsubStorySongs();
      unsubBgMusic();
    };
  }, [footerLogo, safeSmallImageUrl]);

  const displayedSongs = useMemo(() => {
    const q = musicSearch.trim().toLowerCase();
    const localFiltered = songsList.filter((s) =>
      !q ? true : `${s.title} ${s.artist}`.toLowerCase().includes(q)
    );
    const seen = new Set<string>();
    return localFiltered.filter((s) => {
      if (!s?.url || seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });
  }, [songsList, musicSearch]);

  // Load shop products (for sticker tagging only) & community users with fast bounded limits
  useEffect(() => {
    let active = true;
    const hydrateData = async () => {
      try {
        const [prodSnap, usersSnap] = await Promise.all([
          getDocs(query(collection(db, "products"), limit(60))).catch(() => null),
          getDocs(query(collection(db, "users"), limit(80))).catch(() => null),
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
      ? displayedSongs.find((s) => s.id === previewingSongId) ||
        songsList.find((s) => s.id === previewingSongId)
      : null;
    const rawActiveUrl =
      previewTrack?.url || (step === "editor" && !audioMuted ? attachedSong?.url : "");
    const playableUrl = toPlayableAudioUrl(rawActiveUrl);

    if (playableUrl) {
      if (audio.src !== playableUrl && audio.src !== rawActiveUrl) {
        audio.onerror = () => {
          if (rawActiveUrl && audio.src !== rawActiveUrl) {
            audio.onerror = null;
            audio.src = rawActiveUrl;
            audio.play().catch(() => {});
          }
        };
        audio.src = playableUrl;
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
  }, [previewingSongId, attachedSong, step, audioMuted, musicSheetOpen, displayedSongs, songsList]);

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

    const firstVideo = files.find(
      (f) =>
        f.type.startsWith("video/") ||
        /\.(mp4|webm|mov|m4v|3gp|mkv|avi)$/i.test(f.name)
    );
    if (firstVideo) {
      const localBlobUrl = URL.createObjectURL(firstVideo);
      const videoItem: GalleryMediaItem = {
        id: `vid_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        url: localBlobUrl,
        type: "video",
        source: "upload",
        label: firstVideo.name,
      };
      // Open video immediately in Story Editor without blocking spinner
      setCreateMode(false);
      setSelectedMedia(videoItem);
      setStep("editor");
      triggerHaptic();

      pendingVideoFileRef.current = firstVideo;
      const uploadTask = uploadFileToCatbox(firstVideo);
      pendingVideoUploadRef.current = uploadTask;

      uploadTask
        .then((remoteUrl) => {
          hostedVideoUrlsRef.current[videoItem.id] = remoteUrl;
          const persistedItem: GalleryMediaItem = {
            ...videoItem,
            url: remoteUrl,
          };
          persistUploadedItem(persistedItem);
        })
        .catch(() => {
          notify("Video upload encountered a network issue. Will retry on share.", "info");
        })
        .finally(() => {
          if (pendingVideoUploadRef.current === uploadTask) {
            pendingVideoUploadRef.current = null;
          }
        });
      return;
    }

    const imageFiles = files.filter(
      (f) =>
        f.type.startsWith("image/") ||
        /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(f.name)
    );
    if (imageFiles.length === 0) {
      notify("Please select a photo or video for your story.", "info");
      return;
    }

    setUploading(true);
    try {
      const batchSlice = imageFiles.slice(0, 4);
      const aiCheckPromise = detectAiGeneratedFiles(batchSlice).catch(() => false);
      const uploadedResults = await Promise.all(
        batchSlice.map(async (file, idx) => {
          const url = await uploadToImgbb(file, { requireRemote: true }).catch(() =>
            uploadFileToCatbox(file)
          );
          if (!url) return null;
          const item: GalleryMediaItem = {
            id: `up_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
            url,
            type: "image",
            source: "upload",
            label: file.name,
          };
          persistUploadedItem(item);
          return item;
        })
      );
      const uploadedBatch = uploadedResults.filter(
        (x): x is GalleryMediaItem => x !== null
      );
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
      const loadCanvasImage = (srcUrl: string) =>
        new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = srcUrl;
        });

      let bgImg = await loadCanvasImage(selectedMedia.url);
      if (!bgImg && /^https?:\/\//i.test(selectedMedia.url)) {
        bgImg = await loadCanvasImage(
          `/api/stream-media?url=${encodeURIComponent(selectedMedia.url)}`
        );
      }
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

  const uploadDataUrlWithStoryFallback = async (
    rawDataUrl: string,
    sourceCanvas?: HTMLCanvasElement | null
  ): Promise<string> => {
    try {
      const remoteImgbb = await uploadDataUrlToImgbb(
        rawDataUrl,
        `story-${Date.now()}.jpg`,
        { requireRemote: true }
      );
      if (remoteImgbb) return remoteImgbb;
    } catch {}

    try {
      const res = await fetch(rawDataUrl);
      const blob = await res.blob();
      const file = new File([blob], `story-${Date.now()}.jpg`, {
        type: blob.type || "image/jpeg",
      });
      const catboxUrl = await uploadFileToCatbox(file);
      if (catboxUrl) return catboxUrl;
    } catch {}

    // Final fail-safe: compact 540x960 JPEG (<90KB) guaranteed to fit inside Firestore 1MB limit
    if (sourceCanvas) {
      try {
        const compact = document.createElement("canvas");
        compact.width = 540;
        compact.height = 960;
        const cCtx = compact.getContext("2d");
        if (cCtx) {
          cCtx.drawImage(sourceCanvas, 0, 0, 540, 960);
          return compact.toDataURL("image/jpeg", 0.62);
        }
      } catch {}
    }
    return rawDataUrl;
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
      const isVideoStory = !createMode && selectedMedia?.type === "video";
      let finalMediaUrl =
        (selectedMedia?.id && hostedVideoUrlsRef.current[selectedMedia.id]) ||
        selectedMedia?.url ||
        "";

      if (isVideoStory) {
        if (finalMediaUrl.startsWith("blob:")) {
          if (pendingVideoUploadRef.current) {
            finalMediaUrl = await pendingVideoUploadRef.current;
          } else if (pendingVideoFileRef.current) {
            finalMediaUrl = await uploadFileToCatbox(pendingVideoFileRef.current);
          }
          if (selectedMedia?.id && finalMediaUrl && !finalMediaUrl.startsWith("blob:")) {
            hostedVideoUrlsRef.current[selectedMedia.id] = finalMediaUrl;
          }
        }
        if (!finalMediaUrl || finalMediaUrl.startsWith("blob:")) {
          notify("Video is still uploading. Please try sharing again in a moment.", "error");
          setPublishing(false);
          return;
        }
      } else {
        // Bake background if using Create Gradient, Effects filter, Freehand Drawing, or 2-finger Zoom/Pan
        const needsBaseBake =
          createMode ||
          strokes.length > 0 ||
          effectId !== "normal" ||
          hasCustomMediaTransform ||
          !finalMediaUrl;

        if (needsBaseBake) {
          const bakedCanvas = await renderCompositeCanvas(false);
          const bakedDataUrl = bakedCanvas.toDataURL("image/jpeg", 0.85);
          finalMediaUrl = await uploadDataUrlWithStoryFallback(
            bakedDataUrl,
            bakedCanvas
          );
        } else if (finalMediaUrl && !/^https?:\/\//i.test(finalMediaUrl)) {
          finalMediaUrl = await uploadDataUrlWithStoryFallback(finalMediaUrl, null);
        }
      }

      const storyId = `st_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const authorName =
        userProfile?.displayName ||
        userProfile?.name ||
        userProfile?.shopName ||
        currentUser.displayName ||
        "Creator";
      const rawAuthorAvatar =
        userProfile?.photoURL ||
        userProfile?.avatar ||
        userProfile?.shopLogo ||
        currentUser.photoURL ||
        footerLogo ||
        deepShopLogoFallback;
      const authorAvatar = safeSmallImageUrl(
        rawAuthorAvatar,
        safeSmallImageUrl(currentUser.photoURL, "")
      );

      const cleanAttachedSong = attachedSong?.url
        ? {
            id: String(attachedSong.id || `song_${Date.now()}`),
            title: String(attachedSong.title || "Story Audio"),
            artist: String(attachedSong.artist || authorName),
            url: String(attachedSong.url),
            coverUrl: safeSmallImageUrl(attachedSong.coverUrl, ""),
          }
        : null;

      const linkSticker = placedStickers.find(
        (s) => s.kind === "link" || s.kind === "shop_order"
      );

      const rawStoryPayload: Record<string, any> = {
        id: storyId,
        kind: "news_story",
        source: fromNewsHub ? "news_hub" : "deep_shop",
        category: authorName,
        mediaUrl: finalMediaUrl,
        type: isVideoStory ? "video" : "image",
        mediaType: isVideoStory ? "video" : "image",
        userId: currentUser.uid,
        sellerId: currentUser.uid,
        userName: authorName,
        sellerName: authorName,
        userAvatar: authorAvatar,
        sellerLogo: authorAvatar,
        caption: caption.trim(),
        linkUrl: linkSticker?.url || "",
        songTitle: cleanAttachedSong
          ? `${cleanAttachedSong.title} · ${cleanAttachedSong.artist}`
          : "",
        audioUrl: cleanAttachedSong?.url || "",
        music: cleanAttachedSong,
        textLayers,
        stickers: placedStickers,
        aiLabel: Boolean(aiLabel),
        isAiGenerated: Boolean(aiLabel),
        allowCommenting: replyPrivacy !== "off" && allowCommenting,
        replyPrivacy,
        isCloseFriends: audience === "close_friends",
        closeFriendIds: audience === "close_friends" ? closeFriendIds : [],
        isBoomerang: isBoomerangClip,
        isCreateMode: Boolean(createMode),
        createdAt: new Date().toISOString(),
        createdAtMs: Date.now(),
      };

      // Strip any nested undefined properties so Firestore setDoc never rejects the payload
      const storyPayload = JSON.parse(JSON.stringify(rawStoryPayload));

      // Auto-save attached music OR uploaded video story audio into global music library
      if (cleanAttachedSong?.url || (isVideoStory && finalMediaUrl)) {
        try {
          const trackAudioUrl = cleanAttachedSong?.url || finalMediaUrl;
          const bgRef = collection(db, "background_music");
          const qBg = query(bgRef, where("audioUrl", "==", trackAudioUrl));
          const snapBg = await getDocs(qBg);
          if (snapBg.empty) {
            const trackPayload = {
              title:
                cleanAttachedSong?.title ||
                caption.trim().slice(0, 32) ||
                `${authorName}'s Original Audio`,
              artist: cleanAttachedSong?.artist || authorName,
              coverUrl: cleanAttachedSong?.coverUrl || authorAvatar || "",
              cover: cleanAttachedSong?.coverUrl || authorAvatar || "",
              url: trackAudioUrl,
              audioUrl: trackAudioUrl,
              isFromVideo: !cleanAttachedSong?.url && isVideoStory,
              createdAt: Date.now(),
              addedBy: authorName,
              addedByUid: currentUser.uid,
            };
            await Promise.allSettled([
              addDoc(collection(db, "background_music"), trackPayload),
              addDoc(collection(db, "story_songs"), trackPayload),
            ]);
          }
        } catch {}
      }

      // Write to both `creator_videos` and `stories`; succeed as long as at least one write lands
      const [cvResult, stResult] = await Promise.allSettled([
        setDoc(doc(db, "creator_videos", storyId), storyPayload),
        setDoc(doc(db, "stories", storyId), storyPayload),
      ]);

      if (cvResult.status === "rejected" && stResult.status === "rejected") {
        throw cvResult.reason || stResult.reason || new Error("Story write failed");
      }

      // Mirror into local cache for instant zero-latency appearance
      try {
        const prevLocal = JSON.parse(
          localStorage.getItem("deep_news_stories_local") || "[]"
        );
        const nextLocal = [
          storyPayload,
          ...(Array.isArray(prevLocal)
            ? prevLocal.filter((s: any) => s?.id !== storyId)
            : []),
        ].slice(0, 20);
        localStorage.setItem("deep_news_stories_local", JSON.stringify(nextLocal));
      } catch {}

      if (autoSaveArchive && finalMediaUrl) {
        persistUploadedItem({
          id: storyId,
          url: finalMediaUrl,
          type: isVideoStory ? "video" : "image",
          source: "upload",
          label: isVideoStory ? "Archived Video Story" : "Archived Story",
        });
      }

      // Direct message delivery to real chat partners selected in Share Sheet
      if (selectedDmUserIds.length > 0) {
        const storyShareUrl =
          typeof window !== "undefined"
            ? `${window.location.origin}/loops/story/${storyId}`
            : `/loops/story/${storyId}`;
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
                images: !isVideoStory && finalMediaUrl ? [finalMediaUrl] : [],
                imageUrl: !isVideoStory && finalMediaUrl ? finalMediaUrl : null,
                senderId: currentUser.uid,
                senderName: authorName,
                senderPhoto: authorAvatar,
                createdAt: Date.now(),
                timestamp: serverTimestamp(),
                seenBy: [currentUser.uid],
              }).catch(() => {});
            }

            await addDoc(collection(db, "news_hub_notifications"), {
              userId: targetUid,
              fromUserId: currentUser.uid,
              fromUserName: authorName,
              fromUserAvatar: authorAvatar || "",
              title: `${authorName} shared a story with you`,
              body: caption.trim() || "shared a story with you on Loops.",
              message: caption.trim() || "Tap to view story on Loops",
              type: "story",
              storyId,
              targetId: storyId,
              link: `/loops/story/${storyId}`,
              read: false,
              isRead: false,
              createdAt: Date.now(),
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
      navigate(storyReturnPath);
    } catch (err) {
      console.error("Failed to publish story:", err);
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
  const [storyUserProfile, setStoryUserProfile] = useState<any>(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
      if (snap.exists()) {
        setStoryUserProfile(snap.data());
      }
    });
    return () => unsub();
  }, [currentUser]);

  const isPostingBlocked = Boolean(
    storyUserProfile?.loopsPostingBlocked || (storyUserProfile?.loopsStrikeCount || 0) >= 3
  );

  if (isPostingBlocked) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center text-white">
        <Shield className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold">Story Creation Restricted</h2>
        <p className="text-sm text-zinc-400 max-w-sm mt-2">
          Your account has received 3 copyright strikes or severe guideline violations. Creating new Stories is currently disabled.
        </p>
        <button
          type="button"
          onClick={() => navigate('/loops/account-status')}
          className="mt-6 px-6 py-3 bg-red-600 text-white font-bold text-xs rounded-full shadow-lg hover:bg-red-500 transition-colors"
        >
          Check Account Status
        </button>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="story-studio-shell w-full h-[100dvh] flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-[#1877F2]" />
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
    <div className="story-studio-shell w-full h-[100dvh] flex flex-col overflow-hidden select-none relative">
      {/* Hidden File Pickers */}
      <input
        ref={galleryUploadInputRef}
        type="file"
        accept="image/*,video/*,.mp4,.mov,.webm,.m4v,.3gp,.mkv"
        multiple
        className="hidden"
        onClick={(e) => {
          e.currentTarget.value = "";
        }}
        onChange={handleDeviceGalleryUpload}
      />
      <input
        ref={videoUploadInputRef}
        type="file"
        accept="video/*,.mp4,.mov,.webm,.m4v,.3gp,.mkv"
        className="hidden"
        onClick={(e) => {
          e.currentTarget.value = "";
        }}
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

      {/* Global Uploading Overlay Spinner */}
      {uploading && (
        <div className="fixed inset-0 z-50 bg-white/80 dark:bg-black/75 backdrop-blur-md flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl story-studio-panel flex items-center justify-center shadow-xl">
            <Loader2 className="w-7 h-7 animate-spin text-[#1877F2]" />
          </div>
          <p className="text-xs font-bold tracking-tight">Processing studio media...</p>
        </div>
      )}

      {/* =====================================================================
       * UNIFIED RESPONSIVE STUDIO TOP BAR
       * =================================================================== */}
      <header className="story-studio-topbar h-14 px-3.5 sm:px-6 border-b backdrop-blur-xl flex items-center justify-between gap-4 shrink-0 z-30">
        {/* Left: Back / Exit + Studio Context Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              if (step === "gallery") {
                navigate(storyReturnPath);
              } else {
                setDrawModeOpen(false);
                setSelectedLayerId(null);
                setStep("gallery");
              }
            }}
            className="story-studio-circle-btn w-10 h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform"
            aria-label={step === "gallery" ? "Close story studio" : "Back to media"}
          >
            {step === "gallery" ? (
              <X className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>

          <h1 className="text-sm sm:text-base font-extrabold tracking-tight truncate whitespace-nowrap">
            {step === "gallery"
              ? "Create Story"
              : step === "camera"
              ? "Live Camera"
              : step === "collage"
              ? "Collage Studio"
              : "Story Editor"}
          </h1>
        </div>

        {/* Center: Desktop / Tablet Segmented Mode Switcher */}
        <nav
          aria-label="Story studio modes"
          className="hidden md:flex items-center gap-1 p-1 rounded-2xl story-studio-soft"
        >
          <button
            type="button"
            onClick={() => {
              setDrawModeOpen(false);
              setStep("gallery");
              triggerHaptic();
            }}
            className={`h-8 px-3.5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
              step === "gallery"
                ? "story-cta-blue shadow-sm"
                : "story-studio-muted hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            Media
          </button>
          <button
            type="button"
            onClick={() => {
              setDrawModeOpen(false);
              setStep("camera");
              triggerHaptic();
            }}
            className={`h-8 px-3.5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
              step === "camera"
                ? "story-cta-blue shadow-sm"
                : "story-studio-muted hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            Camera
          </button>
          <button
            type="button"
            onClick={() => {
              setDrawModeOpen(false);
              setStep("collage");
              triggerHaptic();
            }}
            className={`h-8 px-3.5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
              step === "collage"
                ? "story-cta-blue shadow-sm"
                : "story-studio-muted hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            Collage
          </button>
          <button
            type="button"
            onClick={() => {
              setDrawModeOpen(false);
              setCreateMode(true);
              setSelectedMedia(null);
              setStep("editor");
              triggerHaptic();
            }}
            className={`h-8 px-3.5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
              step === "editor"
                ? "story-cta-blue shadow-sm"
                : "story-studio-muted hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            Canvas Editor
          </button>
        </nav>

        {/* Right: Contextual Quick Action + Story Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {step === "gallery" && (
            <button
              type="button"
              onClick={() => galleryUploadInputRef.current?.click()}
              className="hidden sm:inline-flex story-cta-blue h-9 px-3.5 rounded-xl text-xs font-bold items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Media</span>
            </button>
          )}

          {step === "editor" && (
            <button
              type="button"
              onClick={handleDownloadStoryPng}
              className="story-studio-circle-btn w-10 h-10 rounded-full flex lg:hidden items-center justify-center cursor-pointer active:scale-95 transition-transform"
              aria-label="Download story PNG"
              title="Download PNG"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setSettingsOpen(true);
              triggerHaptic();
            }}
            className="story-studio-circle-btn w-10 h-10 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            aria-label="Story settings"
            title="Story Controls"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* =====================================================================
       * MAIN RESPONSIVE STUDIO WORKSPACE
       * =================================================================== */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        {/* ===================================================================
         * STEP A: RESPONSIVE CREATION DECK & MEDIA LIBRARY
         * ================================================================= */}
        {step === "gallery" && (
          <div className="flex-1 min-h-0 overflow-y-auto px-3.5 sm:px-6 lg:px-8 py-4 pb-28">
            <div className="max-w-6xl mx-auto w-full space-y-5">
              {/* 1. Creation Mode Deck: 2x2 on mobile, 4-column on tablet/desktop */}
              <section aria-label="Story formats" className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
                <button
                  type="button"
                  onClick={() => {
                    setCreateMode(true);
                    setSelectedMedia(null);
                    setStep("editor");
                    openTextStudioForNew();
                  }}
                  className="story-studio-panel rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 text-left cursor-pointer active:scale-[0.98] transition-transform min-h-[68px]"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1877F2] to-indigo-600 text-white font-serif font-extrabold text-base flex items-center justify-center shrink-0 shadow-sm">
                    Aa
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-extrabold truncate whitespace-nowrap">
                      Text Story
                    </p>
                    <p className="text-[11px] story-studio-muted truncate">
                      Fonts & gradients
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    videoUploadInputRef.current?.click();
                  }}
                  className="story-studio-panel rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 text-left cursor-pointer active:scale-[0.98] transition-transform min-h-[68px]"
                >
                  <div className="w-11 h-11 rounded-2xl bg-[#1877F2]/15 text-[#1877F2] flex items-center justify-center shrink-0">
                    <LoopsSvgIcon name="loops-story-video" className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-extrabold truncate whitespace-nowrap">
                      Video Clip
                    </p>
                    <p className="text-[11px] story-studio-muted truncate">
                      Full-motion reel
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCreateMode(true);
                    setSelectedMedia(null);
                    setStep("editor");
                    setMusicSheetOpen(true);
                  }}
                  className="story-studio-panel rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 text-left cursor-pointer active:scale-[0.98] transition-transform min-h-[68px]"
                >
                  <div className="w-11 h-11 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                    <Music className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-extrabold truncate whitespace-nowrap">
                      Music Card
                    </p>
                    <p className="text-[11px] story-studio-muted truncate">
                      Soundtrack story
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCollageImages([]);
                    setStep("collage");
                    triggerHaptic();
                  }}
                  className="story-studio-panel rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 text-left cursor-pointer active:scale-[0.98] transition-transform min-h-[68px]"
                >
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-extrabold truncate whitespace-nowrap">
                      Photo Grid
                    </p>
                    <p className="text-[11px] story-studio-muted truncate">
                      2, 3 or 4 frames
                    </p>
                  </div>
                </button>
              </section>

              {/* 2. Filter Tabs & Device Upload / Multi-Select Bar */}
              <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1 p-1 rounded-2xl story-studio-soft overflow-x-auto no-scrollbar">
                  {(
                    [
                      { id: "recents", label: "Recents" },
                      { id: "videos", label: "Videos" },
                      { id: "favourites", label: "Saved" },
                      { id: "all", label: "All Media" },
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
                      className={`min-h-[38px] px-3.5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                        albumFilter === alb.id
                          ? "story-cta-blue shadow-sm"
                          : "story-studio-muted hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      {alb.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => galleryUploadInputRef.current?.click()}
                    className="flex-1 sm:flex-none min-h-[40px] px-3.5 rounded-xl story-studio-soft text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#1877F2]" />
                    <span>Upload from Device</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMultiSelectMode((v) => !v);
                      setSelectedIds([]);
                      triggerHaptic();
                    }}
                    className={`min-h-[40px] px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
                      multiSelectMode ? "story-cta-blue" : "story-studio-soft"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{multiSelectMode ? "Cancel Select" : "Multi-Select"}</span>
                  </button>
                </div>
              </section>

              {/* 3. Responsive 9:16 Media Grid (3 cols mobile -> 6 cols desktop) */}
              <section aria-label="Story media gallery">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
                  {/* Tile 1: Live Camera */}
                  <button
                    type="button"
                    onClick={() => {
                      setStep("camera");
                      triggerHaptic();
                    }}
                    className="aspect-[9/16] rounded-2xl story-studio-panel flex flex-col items-center justify-center gap-2.5 cursor-pointer group active:scale-[0.98] transition-transform"
                  >
                    <div className="w-12 h-12 rounded-2xl story-studio-soft flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Camera className="w-5 h-5 text-[#1877F2]" />
                    </div>
                    <div className="text-center px-2">
                      <p className="text-xs font-extrabold whitespace-nowrap">Camera</p>
                      <p className="text-[10px] story-studio-muted hidden sm:block">
                        Capture live
                      </p>
                    </div>
                  </button>

                  {/* Tile 2: Add Yours Prompt Chain */}
                  <button
                    type="button"
                    onClick={() => {
                      setCreateMode(true);
                      setSelectedMedia(null);
                      setStep("editor");
                      openStickerConfigurator("add_yours");
                    }}
                    className="aspect-[9/16] rounded-2xl story-studio-panel flex flex-col items-center justify-center gap-2.5 cursor-pointer group active:scale-[0.98] transition-transform"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-sky-500/15 text-sky-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="text-center px-2">
                      <p className="text-xs font-extrabold whitespace-nowrap">Add Yours</p>
                      <p className="text-[10px] story-studio-muted hidden sm:block">
                        Prompt chain
                      </p>
                    </div>
                  </button>

                  {/* Gallery Media Tiles */}
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
                        className={`aspect-[9/16] relative rounded-2xl bg-zinc-900 overflow-hidden cursor-pointer group border transition-transform active:scale-[0.98] ${
                          isSelected
                            ? "border-[#1877F2] ring-2 ring-[#1877F2]"
                            : "border-black/5 dark:border-white/10"
                        }`}
                      >
                        {item.type === "video" ? (
                          <>
                            {toPlayableMediaUrl(item.url) ? (
                              <video
                                src={toPlayableMediaUrl(item.url)}
                                muted
                                playsInline
                                preload="metadata"
                                className="w-full h-full object-cover pointer-events-none"
                              />
                            ) : null}
                            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/75 via-black/25 to-transparent flex items-center gap-1 text-[10px] font-bold text-white pointer-events-none">
                              <Play className="w-3 h-3 fill-white text-white shrink-0" />
                              <span>Video</span>
                            </div>
                          </>
                        ) : item.url?.trim() ? (
                          <img
                            src={item.url.trim()}
                            alt={item.label || "Story media"}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                        ) : null}

                        {/* Save / Favourite Button */}
                        {!multiSelectMode && (
                          <button
                            type="button"
                            onClick={(e) => toggleFavourite(item.id, e)}
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center cursor-pointer hover:bg-black/65 transition-colors"
                            aria-label="Save media"
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${
                                isFav ? "text-rose-500 fill-rose-500" : "text-white/90"
                              }`}
                            />
                          </button>
                        )}

                        {/* Multi-select Index Indicator */}
                        {multiSelectMode && (
                          <div
                            className={`absolute top-2 right-2 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-extrabold tabular-nums ${
                              isSelected
                                ? "story-cta-blue border-white"
                                : "bg-black/45 border-white/85 text-transparent"
                            }`}
                          >
                            {isSelected ? selIndex + 1 : ""}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Empty Gallery State */}
                {visibleGallery.length === 0 && (
                  <div className="mt-4 story-studio-panel rounded-3xl py-12 px-6 text-center max-w-lg mx-auto space-y-3">
                    <p className="text-sm font-bold">
                      No media found in {albumLabelMap[albumFilter]}
                    </p>
                    <p className="text-xs story-studio-muted">
                      Upload photos or videos from your device, or start with a gradient text card.
                    </p>
                    <div className="pt-1 flex flex-wrap items-center justify-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => galleryUploadInputRef.current?.click()}
                        className="story-cta-blue h-10 px-4 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap"
                      >
                        Upload Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => videoUploadInputRef.current?.click()}
                        className="story-studio-soft h-10 px-4 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap"
                      >
                        Select Video
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Floating Multi-Select Collage Dock */}
            {multiSelectMode && selectedIds.length > 0 && (
              <div className="fixed bottom-5 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-40 story-studio-panel rounded-2xl p-2.5 pl-4 shadow-2xl flex items-center justify-between gap-3">
                <div className="text-xs font-bold tabular-nums">
                  <span>{selectedIds.length} selected</span>
                  <span className="mx-1.5 story-studio-muted">·</span>
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="story-studio-muted hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const chosenUrls = selectedIds
                      .map((id) => visibleGallery.find((g) => g.id === id)?.url)
                      .filter((u): u is string => Boolean(u));
                    buildCollageToEditor(chosenUrls);
                  }}
                  className="story-cta-blue h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <span>Build Collage</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
         * STEP B: RESPONSIVE LIVE CAMERA STUDIO
         * ================================================================= */}
        {step === "camera" && (
          <div className="flex-1 min-h-0 w-full max-w-5xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8 px-2.5 sm:px-6 py-2 sm:py-4 overflow-hidden">
            {/* 9:16 Live Viewfinder */}
            <div className="relative h-full max-h-full aspect-[9/16] w-auto max-w-full rounded-[26px] sm:rounded-[32px] overflow-hidden bg-black shadow-2xl border border-black/10 dark:border-white/15 flex flex-col justify-between">
              <div className="absolute inset-0 z-0">
                {!cameraError ? (
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover bg-black ${
                      facingMode === "user" ? "-scale-x-100" : ""
                    } ${activeEffect.filterClass}`}
                  />
                ) : (
                  <div
                    className={`w-full h-full ${activeCreateGradient.bgClass} flex flex-col items-center justify-center p-8 text-center gap-3`}
                  >
                    <Camera className="w-10 h-10 text-white/85" />
                    <p className="text-sm font-bold text-white">
                      Camera access is unavailable on this browser
                    </p>
                    <button
                      type="button"
                      onClick={() => galleryUploadInputRef.current?.click()}
                      className="story-cta-blue h-10 px-5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap"
                    >
                      Select Photo or Video
                    </button>
                  </div>
                )}
              </div>

              {/* Countdown Overlay */}
              {countdownSec !== null && (
                <div className="absolute inset-0 z-30 bg-black/40 flex items-center justify-center pointer-events-none">
                  <span className="text-7xl font-black text-white tabular-nums drop-shadow-2xl animate-ping">
                    {countdownSec}
                  </span>
                </div>
              )}

              {/* Camera Top Controls */}
              <div className="relative z-20 p-3.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setFlashMode((f) => (f === "off" ? "on" : f === "on" ? "auto" : "off"));
                      triggerHaptic();
                    }}
                    className="h-9 px-3 rounded-xl bg-black/50 backdrop-blur-md border border-white/15 flex items-center gap-1.5 text-xs font-bold text-white cursor-pointer whitespace-nowrap"
                  >
                    {flashMode === "off" ? (
                      <ZapOff className="w-3.5 h-3.5 text-zinc-300" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    )}
                    <span className="capitalize">{flashMode}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBoomerangMode((v) => !v);
                      triggerHaptic();
                    }}
                    className={`h-9 px-3 rounded-xl backdrop-blur-md border flex items-center gap-1.5 text-xs font-bold cursor-pointer whitespace-nowrap ${
                      boomerangMode
                        ? "story-cta-blue border-[#1877F2]"
                        : "bg-black/50 border-white/15 text-white"
                    }`}
                  >
                    <InfinityIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Boomerang</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHandsFreeMode((v) => !v);
                      triggerHaptic();
                    }}
                    className={`h-9 px-3 rounded-xl backdrop-blur-md border flex items-center gap-1.5 text-xs font-bold cursor-pointer whitespace-nowrap ${
                      handsFreeMode
                        ? "story-cta-blue border-[#1877F2]"
                        : "bg-black/50 border-white/15 text-white"
                    }`}
                  >
                    <Timer className="w-3.5 h-3.5" />
                    <span>3s</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFacingMode((m) => (m === "environment" ? "user" : "environment"));
                    triggerHaptic();
                  }}
                  className="w-9 h-9 rounded-xl bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white cursor-pointer shrink-0"
                  aria-label="Flip camera"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Camera Bottom Shutter & Filter Strip */}
              <div className="relative z-20 pt-8 pb-4 px-4 bg-gradient-to-t from-black/85 via-black/45 to-transparent space-y-3.5">
                <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                  {STUDIO_EFFECTS.map((eff) => (
                    <button
                      key={eff.id}
                      type="button"
                      onClick={() => {
                        setEffectId(eff.id);
                        triggerHaptic();
                      }}
                      className={`h-7 px-3 rounded-full text-[11px] font-bold whitespace-nowrap cursor-pointer border ${
                        effectId === eff.id
                          ? "bg-white text-zinc-950 border-white"
                          : "bg-black/45 text-white/85 border-white/20"
                      }`}
                    >
                      {eff.name}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setStep("gallery")}
                    className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-white/80 bg-zinc-900 flex items-center justify-center shadow-md cursor-pointer shrink-0"
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

                  <button
                    type="button"
                    onClick={handleShutterTrigger}
                    className="w-[74px] h-[74px] rounded-full border-4 border-white p-1.5 flex items-center justify-center active:scale-90 transition-transform cursor-pointer shadow-2xl shrink-0"
                    aria-label="Capture story"
                  >
                    <span
                      className={`w-full h-full rounded-full ${
                        boomerangMode || handsFreeMode ? "bg-[#1877F2]" : "bg-white"
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCreateMode(true);
                      setSelectedMedia(null);
                      setStep("editor");
                      openTextStudioForNew();
                    }}
                    className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center font-serif font-extrabold text-sm text-white cursor-pointer shrink-0"
                    aria-label="Text story"
                  >
                    Aa
                  </button>
                </div>

                <div className="flex items-center justify-center gap-5 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => navigate("/news-hub/create")}
                    className="text-zinc-400 hover:text-white cursor-pointer whitespace-nowrap"
                  >
                    Post
                  </button>
                  <span className="text-white border-b-2 border-[#1877F2] pb-0.5 whitespace-nowrap">
                    Story
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate("/news-hub/create?tab=video")}
                    className="text-zinc-400 hover:text-white cursor-pointer whitespace-nowrap"
                  >
                    Reel
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
                    className="text-zinc-400 hover:text-white cursor-pointer whitespace-nowrap"
                  >
                    Live Card
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop Camera Side Controls */}
            <aside className="hidden lg:flex flex-col gap-4 w-72 story-studio-panel rounded-3xl p-5">
              <div className="space-y-1">
                <h2 className="text-sm font-bold">Camera Controls</h2>
                <p className="text-xs story-studio-muted">
                  Capture an instant 9:16 frame or switch capture modes
                </p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setBoomerangMode((v) => !v)}
                  className={`w-full h-11 px-3.5 rounded-2xl flex items-center justify-between text-xs font-bold cursor-pointer ${
                    boomerangMode ? "story-cta-blue" : "story-studio-soft"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <InfinityIcon className="w-4 h-4" />
                    <span>Boomerang Pulse</span>
                  </span>
                  <span>{boomerangMode ? "Active" : "Off"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHandsFreeMode((v) => !v)}
                  className={`w-full h-11 px-3.5 rounded-2xl flex items-center justify-between text-xs font-bold cursor-pointer ${
                    handsFreeMode ? "story-cta-blue" : "story-studio-soft"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Timer className="w-4 h-4" />
                    <span>3-Second Timer</span>
                  </span>
                  <span>{handsFreeMode ? "Active" : "Off"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCollageImages([]);
                    setStep("collage");
                    triggerHaptic();
                  }}
                  className="w-full h-11 px-3.5 rounded-2xl story-studio-soft flex items-center justify-between text-xs font-bold cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-[#1877F2]" />
                    <span>Photo Collage Grid</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 story-studio-muted" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleShutterTrigger}
                className="story-cta-blue w-full h-12 rounded-2xl text-xs font-bold cursor-pointer"
              >
                Capture Photo
              </button>
            </aside>
          </div>
        )}

        {/* ===================================================================
         * STEP C: RESPONSIVE COLLAGE LAYOUT STUDIO
         * ================================================================= */}
        {step === "collage" && (
          <div className="flex-1 min-h-0 w-full max-w-5xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8 px-3.5 sm:px-6 py-3 sm:py-5 overflow-y-auto">
            {/* Live 9:16 Collage Frame */}
            <div
              className={`w-full max-w-[290px] sm:max-w-[340px] aspect-[9/16] shrink-0 story-studio-panel rounded-[28px] p-2 grid gap-2 ${
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
                    className={`relative story-studio-soft rounded-2xl overflow-hidden flex flex-col items-center justify-center cursor-pointer group ${spanFull}`}
                  >
                    {img ? (
                      <>
                        <img
                          src={img}
                          alt={`Collage slot ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/65 flex items-center justify-center">
                          <X className="w-3.5 h-3.5 text-white" />
                        </span>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 story-studio-muted">
                        <Plus className="w-6 h-6" />
                        <span className="text-xs font-semibold">Slot {idx + 1}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Collage Controls & Quick Gallery Picker */}
            <div className="w-full max-w-md lg:w-84 story-studio-panel rounded-3xl p-4 sm:p-5 space-y-4">
              <div className="space-y-1">
                <h2 className="text-sm font-bold">Grid Layout</h2>
                <p className="text-xs story-studio-muted">
                  Tap an empty slot to upload or pick from your gallery below
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {([2, 3, 4] as const).map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => {
                      setCollageSlotsCount(cnt);
                      setCollageImages((prev) => prev.slice(0, cnt));
                    }}
                    className={`h-10 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap ${
                      collageSlotsCount === cnt ? "story-cta-blue" : "story-studio-soft"
                    }`}
                  >
                    {cnt === 2 ? "2 Split" : `${cnt} Grid`}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => collageSlotInputRef.current?.click()}
                  className="flex-1 h-10 px-3 rounded-xl story-studio-soft flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5 text-[#1877F2]" />
                  <span>Upload Photo</span>
                </button>
                {collageImages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCollageImages([])}
                    className="h-10 px-3.5 rounded-xl story-studio-soft text-xs font-bold cursor-pointer whitespace-nowrap"
                  >
                    Clear
                  </button>
                )}
              </div>

              {visibleGallery.filter((g) => g.type === "image").length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold story-studio-muted">Recent Photos</p>
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {visibleGallery
                      .filter((g) => g.type === "image")
                      .slice(0, 12)
                      .map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            if (collageImages.length < collageSlotsCount) {
                              setCollageImages((prev) => [...prev, g.url]);
                              triggerHaptic();
                            }
                          }}
                          className="w-14 h-20 rounded-xl overflow-hidden shrink-0 border border-black/10 dark:border-white/15 cursor-pointer"
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
              )}

              <button
                type="button"
                disabled={collageImages.length === 0}
                onClick={() => buildCollageToEditor(collageImages)}
                className="story-cta-blue w-full h-11 rounded-2xl text-xs font-bold disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Continue to Editor</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================
         * STEP D: RESPONSIVE STORY EDITOR (3-COL DESKTOP + MOBILE DOCK)
         * ================================================================= */}
        {step === "editor" && (
          <div className="flex-1 min-h-0 w-full max-w-7xl mx-auto flex flex-col lg:grid lg:grid-cols-[290px_minmax(0,1fr)_320px] lg:gap-6 px-0 sm:px-4 lg:px-6 py-0 lg:py-4 overflow-hidden">
            {/* ---------------------------------------------------------------
             * DESKTOP LEFT CREATIVE TOOLKIT
             * ------------------------------------------------------------- */}
            <aside className="hidden lg:flex flex-col gap-3.5 overflow-y-auto pr-1">
              <div className="story-studio-panel rounded-3xl p-4 space-y-3">
                <h2 className="text-xs font-bold story-studio-muted">Creative Tools</h2>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={openTextStudioForNew}
                    className="min-h-[46px] px-3 rounded-2xl story-studio-soft flex items-center gap-2.5 text-xs font-bold cursor-pointer whitespace-nowrap"
                  >
                    <span className="w-7 h-7 rounded-xl bg-[#1877F2]/15 text-[#1877F2] font-serif font-extrabold flex items-center justify-center shrink-0">
                      Aa
                    </span>
                    <span>Add Text</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStickerTrayOpen(true)}
                    className="min-h-[46px] px-3 rounded-2xl story-studio-soft flex items-center gap-2.5 text-xs font-bold cursor-pointer whitespace-nowrap"
                  >
                    <span className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                      <Smile className="w-4 h-4" />
                    </span>
                    <span>Stickers</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMusicSheetOpen(true)}
                    className="min-h-[46px] px-3 rounded-2xl story-studio-soft flex items-center gap-2.5 text-xs font-bold cursor-pointer whitespace-nowrap"
                  >
                    <span className="w-7 h-7 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                      <Music className="w-4 h-4" />
                    </span>
                    <span>Audio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDrawModeOpen((v) => !v);
                      triggerHaptic();
                    }}
                    className={`min-h-[46px] px-3 rounded-2xl flex items-center gap-2.5 text-xs font-bold cursor-pointer whitespace-nowrap ${
                      drawModeOpen ? "story-cta-blue" : "story-studio-soft"
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                        drawModeOpen ? "bg-white/20 text-white" : "bg-sky-500/15 text-sky-500"
                      }`}
                    >
                      <Pencil className="w-4 h-4" />
                    </span>
                    <span>Draw</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openStickerConfigurator("mention")}
                    className="min-h-[46px] px-3 rounded-2xl story-studio-soft flex items-center gap-2.5 text-xs font-bold cursor-pointer whitespace-nowrap"
                  >
                    <span className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                      <AtSign className="w-4 h-4" />
                    </span>
                    <span>Mention</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openStickerConfigurator("shop_order")}
                    className="min-h-[46px] px-3 rounded-2xl story-studio-soft flex items-center gap-2.5 text-xs font-bold cursor-pointer whitespace-nowrap"
                  >
                    <span className="w-7 h-7 rounded-xl bg-[#1877F2]/15 text-[#1877F2] flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-4 h-4" />
                    </span>
                    <span>Shop Tag</span>
                  </button>
                </div>
              </div>

              {/* Visual Filters */}
              <div className="story-studio-panel rounded-3xl p-4 space-y-2.5">
                <h2 className="text-xs font-bold story-studio-muted">Color Filters</h2>
                <div className="flex flex-wrap gap-1.5">
                  {STUDIO_EFFECTS.map((eff) => (
                    <button
                      key={eff.id}
                      type="button"
                      onClick={() => {
                        setEffectId(eff.id);
                        triggerHaptic();
                      }}
                      className={`h-9 px-3 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap transition-colors ${
                        effectId === eff.id ? "story-cta-blue" : "story-studio-soft"
                      }`}
                    >
                      {eff.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gradient Picker when in Text/Create Mode */}
              {(createMode || !selectedMedia) && (
                <div className="story-studio-panel rounded-3xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold story-studio-muted">Canvas Backdrop</h2>
                    <button
                      type="button"
                      onClick={() => setStep("gallery")}
                      className="text-[11px] font-bold text-[#1877F2] cursor-pointer"
                    >
                      Use Media
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {CREATE_GRADIENTS.map((g, idx) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setCreateGradientIdx(idx);
                          triggerHaptic();
                        }}
                        className={`w-8 h-8 rounded-full ${g.bgClass} border-2 cursor-pointer transition-transform ${
                          createGradientIdx === idx
                            ? "border-[#1877F2] scale-110 shadow-md"
                            : "border-black/10 dark:border-white/20"
                        }`}
                        aria-label={`Gradient ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Story Preferences & Export */}
              <div className="story-studio-panel rounded-3xl p-4 space-y-2">
                <h2 className="text-xs font-bold story-studio-muted">Canvas Options</h2>
                <button
                  type="button"
                  onClick={() => {
                    setAiLabel((v) => !v);
                    triggerHaptic();
                  }}
                  className="w-full h-10 px-3 rounded-xl story-studio-soft flex items-center justify-between text-xs font-semibold cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#1877F2]" />
                    <span>AI Content Label</span>
                  </span>
                  <span className="text-[11px] font-bold text-[#1877F2]">
                    {aiLabel ? "On" : "Off"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAllowCommenting((v) => !v);
                    triggerHaptic();
                  }}
                  className="w-full h-10 px-3 rounded-xl story-studio-soft flex items-center justify-between text-xs font-semibold cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    {allowCommenting ? (
                      <MessageSquare className="w-4 h-4 text-[#1877F2]" />
                    ) : (
                      <MessageSquareOff className="w-4 h-4 story-studio-muted" />
                    )}
                    <span>Story Replies</span>
                  </span>
                  <span className="text-[11px] font-bold text-[#1877F2]">
                    {allowCommenting ? "Allowed" : "Muted"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadStoryPng}
                  className="w-full h-10 px-3 rounded-xl story-studio-soft flex items-center justify-between text-xs font-semibold cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    <span>Download PNG</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 story-studio-muted" />
                </button>
              </div>
            </aside>

            {/* ---------------------------------------------------------------
             * CENTER 9:16 INTERACTIVE STORY CANVAS STAGE
             * ------------------------------------------------------------- */}
            <div className="flex-1 min-h-0 flex items-center justify-center px-2.5 pt-2 pb-1.5 lg:p-0 overflow-hidden">
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
                className="relative h-full max-h-full aspect-[9/16] w-auto max-w-full rounded-[24px] sm:rounded-[30px] overflow-hidden bg-black shadow-2xl border border-black/10 dark:border-white/15 touch-none"
              >
                {/* Background Media or Create Gradient */}
                <div
                  className={`absolute inset-0 flex items-center justify-center overflow-hidden ${activeEffect.filterClass}`}
                >
                  {createMode || !selectedMedia ? (
                    <div
                      className={`w-full h-full ${activeCreateGradient.bgClass} flex items-center justify-center`}
                    >
                      {attachedSong && textLayers.length === 0 && placedStickers.length === 0 && (
                        <div className="px-5 py-4 rounded-3xl bg-black/45 backdrop-blur-xl border border-white/15 shadow-2xl flex items-center gap-3.5 max-w-[270px] pointer-events-none">
                          {attachedSong.coverUrl ? (
                            <img
                              src={attachedSong.coverUrl}
                              alt={attachedSong.title}
                              referrerPolicy="no-referrer"
                              className="w-14 h-14 rounded-2xl object-cover shrink-0 shadow-lg"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                              <Music className="w-6 h-6 text-white" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold text-white truncate">
                              {attachedSong.title}
                            </p>
                            <p className="text-xs text-white/75 truncate mt-0.5">
                              {attachedSong.artist}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : selectedMedia.type === "video" ? (
                    <motion.video
                      key={selectedMedia.id}
                      src={toPlayableMediaUrl(selectedMedia.url)}
                      autoPlay
                      loop
                      playsInline
                      muted={Boolean(attachedSong) || audioMuted}
                      animate={{
                        scale: mediaScale,
                        x: mediaOffset.x,
                        y: mediaOffset.y,
                      }}
                      transition={{ duration: 0 }}
                      className="w-full h-full object-contain select-none pointer-events-none bg-black"
                    />
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

                {/* Draggable Text Layers & Interactive Stickers */}
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

                {/* Minimal Top Canvas Status Chips (Never obscures artwork) */}
                {!drawModeOpen && !textStudioOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-3 inset-x-3 z-30 flex items-center justify-between gap-2 pointer-events-none"
                  >
                    <div className="flex items-center gap-2 min-w-0 pointer-events-auto">
                      {attachedSong ? (
                        <div
                          onClick={() => setAudioMuted((m) => !m)}
                          className="flex items-center gap-2 bg-black/60 backdrop-blur-xl border border-white/15 rounded-full py-1 pl-1.5 pr-2.5 max-w-[220px] cursor-pointer"
                        >
                          {attachedSong.coverUrl ? (
                            <img
                              src={attachedSong.coverUrl}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-6 h-6 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                              <Music className="w-3 h-3 text-white" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-white truncate">
                              {attachedSong.title}
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
                            aria-label="Remove audio"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setMusicSheetOpen(true)}
                          className="h-8 px-3 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center gap-1.5 text-[11px] font-semibold text-white cursor-pointer whitespace-nowrap"
                        >
                          <Music className="w-3.5 h-3.5" />
                          <span>Add Audio</span>
                        </button>
                      )}

                      {aiLabel && (
                        <span className="h-7 px-2.5 rounded-full bg-black/55 backdrop-blur-md border border-white/15 flex items-center gap-1 text-[10.5px] font-semibold text-white whitespace-nowrap">
                          <Cpu className="w-3 h-3 text-[#1877F2]" />
                          <span>AI</span>
                        </span>
                      )}
                    </div>

                    {!createMode && selectedMedia && hasCustomMediaTransform && (
                      <button
                        type="button"
                        onClick={() => {
                          setMediaScale(1);
                          setMediaOffset({ x: 0, y: 0 });
                          triggerHaptic();
                        }}
                        className="pointer-events-auto h-8 px-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center gap-1 text-[11px] font-bold text-white cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>1:1</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Freehand Drawing HUD */}
                {drawModeOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute inset-0 z-40 pointer-events-none flex flex-col justify-between p-2.5 sm:p-3.5 overflow-hidden"
                  >
                    <div className="pointer-events-auto w-full flex items-center justify-between gap-1.5 bg-black/75 backdrop-blur-xl rounded-2xl px-2.5 py-1.5 border border-white/15">
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
                            className={`h-8 px-2.5 rounded-xl text-[11px] font-bold shrink-0 whitespace-nowrap cursor-pointer transition-colors ${
                              drawBrush === b.id
                                ? "story-cta-blue"
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
                          className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded-xl shrink-0 cursor-pointer"
                          aria-label="Undo stroke"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setStrokes([])}
                          className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded-xl shrink-0 cursor-pointer"
                          aria-label="Clear drawing"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDrawModeOpen(false)}
                          className="story-cta-blue h-8 px-3 rounded-xl text-xs font-bold shrink-0 whitespace-nowrap cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    </div>

                    <div className="pointer-events-auto space-y-2 bg-black/70 backdrop-blur-xl rounded-2xl p-2.5 border border-white/15">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-semibold text-zinc-300">Brush Width</span>
                        <div className="flex items-center gap-1.5">
                          {[4, 8, 14, 22].map((w) => (
                            <button
                              key={w}
                              type="button"
                              onClick={() => setDrawWidth(w)}
                              className={`h-6 px-2.5 rounded-lg text-[11px] font-bold tabular-nums cursor-pointer ${
                                drawWidth === w ? "story-cta-blue" : "bg-white/10 text-zinc-300"
                              }`}
                            >
                              {w}px
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
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
            </div>

            {/* ---------------------------------------------------------------
             * MOBILE ERGONOMIC EDIT DOCK + PUBLISH BAR (Below Canvas, Never Overlapping)
             * ------------------------------------------------------------- */}
            <div className="lg:hidden shrink-0 story-studio-topbar border-t px-2.5 pt-2 pb-2.5 space-y-2 z-30">
              {/* Optional Expandable Filters & Gradient Strip */}
              {effectsBarOpen && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {STUDIO_EFFECTS.map((eff) => (
                    <button
                      key={eff.id}
                      type="button"
                      onClick={() => {
                        setEffectId(eff.id);
                        triggerHaptic();
                      }}
                      className={`h-8 px-3 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                        effectId === eff.id ? "story-cta-blue" : "story-studio-soft"
                      }`}
                    >
                      {eff.name}
                    </button>
                  ))}

                  {(createMode || !selectedMedia) &&
                    CREATE_GRADIENTS.map((g, idx) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setCreateGradientIdx(idx);
                          triggerHaptic();
                        }}
                        className={`w-7 h-7 rounded-full shrink-0 ${g.bgClass} border-2 cursor-pointer ${
                          createGradientIdx === idx
                            ? "border-[#1877F2] scale-110"
                            : "border-black/10 dark:border-white/20"
                        }`}
                        aria-label={`Backdrop ${idx + 1}`}
                      />
                    ))}
                </div>
              )}

              {/* Row 1: Scrollable Single-Line Edit Tools */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={openTextStudioForNew}
                  className="min-h-[38px] px-3 rounded-xl story-studio-soft flex items-center gap-1.5 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span className="font-serif font-extrabold text-sm">Aa</span>
                  <span>Text</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStickerTrayOpen(true)}
                  className="min-h-[38px] px-3 rounded-xl story-studio-soft flex items-center gap-1.5 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Smile className="w-3.5 h-3.5" />
                  <span>Stickers</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMusicSheetOpen(true)}
                  className="min-h-[38px] px-3 rounded-xl story-studio-soft flex items-center gap-1.5 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>Audio</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEffectsBarOpen((v) => !v)}
                  className={`min-h-[38px] px-3 rounded-xl flex items-center gap-1.5 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                    effectsBarOpen ? "story-cta-blue" : "story-studio-soft"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Filters</span>
                </button>

                {(createMode || !selectedMedia) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCreateGradientIdx((i) => (i + 1) % CREATE_GRADIENTS.length);
                      triggerHaptic();
                    }}
                    className="min-h-[38px] px-3 rounded-xl story-studio-soft flex items-center gap-1.5 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span className={`w-3.5 h-3.5 rounded-full ${activeCreateGradient.bgClass}`} />
                    <span>Backdrop</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setDrawModeOpen(true);
                    triggerHaptic();
                  }}
                  className="min-h-[38px] px-3 rounded-xl story-studio-soft flex items-center gap-1.5 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Draw</span>
                </button>

                <button
                  type="button"
                  onClick={() => openStickerConfigurator("mention")}
                  className="min-h-[38px] px-3 rounded-xl story-studio-soft flex items-center gap-1.5 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <AtSign className="w-3.5 h-3.5" />
                  <span>Mention</span>
                </button>

                <button
                  type="button"
                  onClick={() => openStickerConfigurator("shop_order")}
                  className="min-h-[38px] px-3 rounded-xl story-studio-soft flex items-center gap-1.5 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Shop</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAiLabel((v) => !v);
                    triggerHaptic();
                  }}
                  className={`min-h-[38px] px-3 rounded-xl flex items-center gap-1.5 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                    aiLabel ? "story-cta-blue" : "story-studio-soft"
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>AI Label</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAllowCommenting((v) => !v);
                    triggerHaptic();
                  }}
                  className="min-h-[38px] px-3 rounded-xl story-studio-soft flex items-center gap-1.5 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {allowCommenting ? (
                    <MessageSquare className="w-3.5 h-3.5" />
                  ) : (
                    <MessageSquareOff className="w-3.5 h-3.5" />
                  )}
                  <span>{allowCommenting ? "Replies On" : "Replies Off"}</span>
                </button>
              </div>

              {/* Row 2: Caption + Audience Publish Actions */}
              <div className="story-publish-bar flex items-center gap-1.5">
                <div className="flex-1 min-w-0 h-10 px-3 rounded-2xl story-studio-soft flex items-center">
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption..."
                    className="story-clean-input bg-transparent w-full text-xs outline-none"
                  />
                </div>

                <button
                  type="button"
                  disabled={publishing}
                  onClick={() => handlePublishStory("story")}
                  className="story-pill-btn h-10 px-3 rounded-2xl flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 transition-transform"
                >
                  <img
                    src={userAvatarResolved || deepShopLogoFallback}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      if (e.currentTarget.src !== deepShopLogoFallback) {
                        e.currentTarget.src = deepShopLogoFallback;
                      }
                    }}
                    className="w-6 h-6 rounded-full object-cover shrink-0"
                  />
                  <span className="text-xs font-bold whitespace-nowrap">
                    {publishing ? "Posting..." : "Story"}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={publishing}
                  onClick={() => setCloseFriendsOpen(true)}
                  className="story-pill-btn w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform"
                  aria-label="Close Friends"
                >
                  <span className="story-cf-badge w-6 h-6 rounded-full flex items-center justify-center">
                    <Star className="w-3.5 h-3.5 fill-white text-white" />
                  </span>
                </button>

                <button
                  type="button"
                  disabled={publishing}
                  onClick={() => setShareSheetOpen(true)}
                  className="story-cta-blue w-10 h-10 rounded-2xl flex items-center justify-center shadow-md shrink-0 cursor-pointer active:scale-95 transition-transform"
                  aria-label="Share options"
                >
                  {publishing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* ---------------------------------------------------------------
             * DESKTOP RIGHT PUBLISH & AUDIENCE INSPECTOR
             * ------------------------------------------------------------- */}
            <aside className="hidden lg:flex flex-col justify-between story-studio-panel rounded-3xl p-5 overflow-y-auto gap-4">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold story-studio-muted block">
                    Story Caption
                  </label>
                  <div className="rounded-2xl story-studio-soft p-3">
                    <textarea
                      rows={3}
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Write a short note or story caption..."
                      className="story-clean-input bg-transparent w-full text-xs outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Audio Track Card */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold story-studio-muted block">Soundtrack</span>
                  {attachedSong ? (
                    <div className="p-2.5 rounded-2xl story-studio-soft flex items-center gap-2.5">
                      {attachedSong.coverUrl ? (
                        <img
                          src={attachedSong.coverUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-xl object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#1877F2]/15 text-[#1877F2] flex items-center justify-center shrink-0">
                          <Music className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">{attachedSong.title}</p>
                        <p className="text-[11px] story-studio-muted truncate">
                          {attachedSong.artist}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachedSong(null)}
                        className="story-studio-circle-btn w-7 h-7 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
                        aria-label="Remove song"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setMusicSheetOpen(true)}
                      className="w-full h-11 px-3.5 rounded-2xl story-studio-soft flex items-center justify-between text-xs font-bold cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Music className="w-4 h-4 text-[#1877F2]" />
                        <span>Select Song or Audio</span>
                      </span>
                      <Plus className="w-4 h-4 story-studio-muted" />
                    </button>
                  )}
                </div>

                {/* Audience Selection */}
                <div className="space-y-2">
                  <span className="text-xs font-bold story-studio-muted block">Audience</span>
                  <button
                    type="button"
                    onClick={() => setShareTargetAudience("story")}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between cursor-pointer border transition-colors ${
                      shareTargetAudience === "story"
                        ? "border-[#1877F2] story-studio-soft"
                        : "border-transparent story-studio-soft opacity-80"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={userAvatarResolved || deepShopLogoFallback}
                        alt=""
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          if (e.currentTarget.src !== deepShopLogoFallback) {
                            e.currentTarget.src = deepShopLogoFallback;
                          }
                        }}
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                      />
                      <div className="text-left min-w-0">
                        <p className="text-xs font-bold truncate">Your Story</p>
                        <p className="text-[11px] story-studio-muted truncate">Public on Loops</p>
                      </div>
                    </div>
                    <span
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        shareTargetAudience === "story"
                          ? "story-cta-blue border-[#1877F2]"
                          : "border-zinc-300 dark:border-zinc-600"
                      }`}
                    >
                      {shareTargetAudience === "story" && <Check className="w-3 h-3" />}
                    </span>
                  </button>

                  <div
                    className={`w-full p-3 rounded-2xl flex items-center justify-between border transition-colors ${
                      shareTargetAudience === "close_friends"
                        ? "border-[#1877F2] story-studio-soft"
                        : "border-transparent story-studio-soft opacity-80"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setShareTargetAudience("close_friends")}
                      className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                    >
                      <span className="story-cf-badge w-9 h-9 rounded-full flex items-center justify-center shrink-0">
                        <Star className="w-4 h-4 fill-white text-white" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">Close Friends</p>
                        <p className="text-[11px] story-studio-muted tabular-nums truncate">
                          {closeFriendIds.length} members
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setCloseFriendsOpen(true)}
                        className="text-[11px] font-bold text-[#1877F2] cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setShareTargetAudience("close_friends")}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer ${
                          shareTargetAudience === "close_friends"
                            ? "story-cta-blue border-[#1877F2]"
                            : "border-zinc-300 dark:border-zinc-600"
                        }`}
                      >
                        {shareTargetAudience === "close_friends" && <Check className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShareSheetOpen(true)}
                  className="w-full h-10 px-3.5 rounded-2xl story-studio-soft flex items-center justify-between text-xs font-bold cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Send className="w-3.5 h-3.5 text-[#1877F2]" />
                    <span>Send in Direct Message</span>
                  </span>
                  {selectedDmUserIds.length > 0 ? (
                    <span className="text-[11px] text-[#1877F2] tabular-nums">
                      {selectedDmUserIds.length} selected
                    </span>
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 story-studio-muted" />
                  )}
                </button>

                <button
                  type="button"
                  disabled={publishing}
                  onClick={() => handlePublishStory(shareTargetAudience)}
                  className="story-cta-blue w-full h-12 rounded-2xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform"
                >
                  {publishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <span>
                      {shareTargetAudience === "close_friends"
                        ? "Share to Close Friends"
                        : "Publish Story"}
                    </span>
                  )}
                </button>
              </div>
            </aside>
          </div>
        )}

      </main>

      {/* =====================================================================
       * OVERLAY 1: RESPONSIVE TEXT STUDIO COMPOSER
       * =================================================================== */}
      <AnimatePresence>
        {textStudioOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={commitTextStudio}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl h-[86dvh] max-h-[680px] rounded-[28px] bg-zinc-950/95 border border-white/15 shadow-2xl flex flex-col justify-between p-4 sm:p-6 text-white overflow-hidden"
            >
              {/* Top Formatting Toolbar */}
              <header className="flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() =>
                      setDraftCaseMode((m) =>
                        m === "normal" ? "upper" : m === "upper" ? "lower" : "normal"
                      )
                    }
                    className="min-w-[38px] h-9 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-extrabold text-white flex items-center justify-center cursor-pointer whitespace-nowrap"
                    title="Text case"
                  >
                    Aa
                  </button>

                  <button
                    type="button"
                    onClick={() => setTextColorTrayOpen((v) => !v)}
                    className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 via-amber-400 to-[#1877F2] p-0.5 shrink-0 cursor-pointer"
                    title="Colors"
                  >
                    <span className="block w-full h-full rounded-[10px] border-2 border-zinc-950" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setDraftAnimation((a) =>
                        a === "none" ? "pulse" : a === "pulse" ? "bounce" : "none"
                      )
                    }
                    className={`min-w-[38px] h-9 px-2.5 rounded-xl text-xs font-extrabold cursor-pointer whitespace-nowrap ${
                      draftAnimation !== "none"
                        ? "story-cta-blue"
                        : "bg-white/10 hover:bg-white/20 text-white"
                    }`}
                    title="Text motion"
                  >
                    Motion
                  </button>

                  <button
                    type="button"
                    onClick={() => setDraftOutline((v) => !v)}
                    className={`min-w-[38px] h-9 px-2.5 rounded-xl text-xs font-extrabold border cursor-pointer whitespace-nowrap ${
                      draftOutline
                        ? "bg-white text-zinc-950 border-white"
                        : "bg-transparent text-white border-white/25 hover:bg-white/10"
                    }`}
                    title="Outline stroke"
                  >
                    Stroke
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setDraftAlign((a) =>
                        a === "center" ? "left" : a === "left" ? "right" : "center"
                      )
                    }
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shrink-0 cursor-pointer"
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

                  <button
                    type="button"
                    onClick={() =>
                      setDraftPillMode((p) =>
                        p === "none" ? "solid" : p === "solid" ? "soft" : "none"
                      )
                    }
                    className={`min-w-[38px] h-9 px-2.5 rounded-xl text-xs font-extrabold cursor-pointer whitespace-nowrap ${
                      draftPillMode !== "none"
                        ? "bg-white text-zinc-950"
                        : "bg-white/10 hover:bg-white/20 text-white"
                    }`}
                    title="Background highlight"
                  >
                    Box
                  </button>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setTextStudioOpen(false)}
                    className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-zinc-200 cursor-pointer whitespace-nowrap"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={commitTextStudio}
                    className="story-cta-blue h-9 px-4 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap"
                  >
                    Done
                  </button>
                </div>
              </header>

              {/* Center Live Text Stage + 7-Step Size Selector */}
              <div className="flex-1 min-h-0 flex items-center gap-3 sm:gap-4 my-3">
                <div className="flex flex-col items-center gap-1.5 bg-white/10 rounded-2xl py-2.5 px-1.5 shrink-0">
                  {[...FONT_SIZE_STEPS].reverse().map((s) => (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => setDraftSizeStep(s.step)}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer transition-transform ${
                        draftSizeStep === s.step
                          ? "story-cta-blue scale-110"
                          : "bg-white/15 hover:bg-white/30"
                      }`}
                      aria-label={`Text size ${s.step + 1}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    </button>
                  ))}
                </div>

                <div className="flex-1 h-full rounded-2xl bg-white/[0.04] border border-white/10 p-4 flex items-center justify-center overflow-y-auto">
                  <textarea
                    autoFocus
                    rows={4}
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    placeholder="Type your story headline..."
                    className={`story-clean-input bg-transparent w-full outline-none resize-none placeholder-white/35 ${
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

              {/* Bottom Style Inspector */}
              <div className="space-y-3 shrink-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDraftText((t) => `${t}${t ? " " : ""}@deepshop`)}
                      className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <AtSign className="w-3.5 h-3.5 text-[#1877F2]" />
                      <span>Mention</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraftText((t) => `${t}${t ? " · " : ""}Dhaka, BD`)}
                      className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Location</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl">
                    {(
                      [
                        { id: "text", label: "Fonts" },
                        { id: "texts", label: "Phrases" },
                        { id: "texture", label: "Finish" },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTextBottomTab(t.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                          textBottomTab === t.id
                            ? "bg-white text-zinc-950"
                            : "text-zinc-300 hover:text-white"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {textBottomTab === "text" && (
                  <div className="space-y-2.5">
                    {textColorTrayOpen && (
                      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
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

                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                      {STORY_FONTS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setDraftFontId(f.id)}
                          className={`h-8 px-3.5 rounded-xl text-xs whitespace-nowrap cursor-pointer transition-colors ${
                            draftFontId === f.id
                              ? "bg-white text-zinc-950 font-bold"
                              : "bg-white/10 text-white hover:bg-white/20"
                          }`}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {textBottomTab === "texts" && (
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    {TEXT_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDraftText(preset)}
                        className="h-9 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white whitespace-nowrap cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                )}

                {textBottomTab === "texture" && (
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    {(
                      [
                        { id: "clean", label: "Clean Matte" },
                        { id: "shimmer", label: "Gold Shimmer" },
                        { id: "neon", label: "Neon Glow" },
                      ] as const
                    ).map((tx) => (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => setDraftTexture(tx.id)}
                        className={`h-9 px-4 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap ${
                          draftTexture === tx.id
                            ? "story-cta-blue"
                            : "bg-white/10 text-zinc-200 hover:bg-white/20"
                        }`}
                      >
                        {tx.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
       * OVERLAY 2: STICKERS & INTERACTIVE WIDGETS DRAWER
       * =================================================================== */}
      <AnimatePresence>
        {stickerTrayOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setStickerTrayOpen(false)}
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="story-studio-sheet w-full sm:max-w-lg max-h-[70dvh] sm:max-h-[78dvh] rounded-t-[28px] sm:rounded-[28px] flex flex-col p-4 sm:p-5 shadow-2xl overflow-hidden"
            >
              <div className="w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-white/20 mx-auto mb-3 sm:hidden shrink-0" />

              <header className="flex items-center justify-between gap-3 pb-3 shrink-0">
                <div>
                  <h3 className="text-base font-bold">Stickers & Widgets</h3>
                  <p className="text-xs story-studio-muted">
                    Add interactive tags, polls, products, or live badges
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStickerTrayOpen(false)}
                  className="story-studio-circle-btn w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
                  aria-label="Close stickers"
                >
                  <X className="w-4 h-4" />
                </button>
              </header>

              <div className="h-10 rounded-xl story-studio-soft px-3.5 flex items-center gap-2 mb-3.5 shrink-0">
                <Search className="w-4 h-4 story-studio-muted shrink-0" />
                <input
                  type="text"
                  value={stickerSearch}
                  onChange={(e) => setStickerSearch(e.target.value)}
                  placeholder="Search location, poll, mention, shop..."
                  className="story-clean-input bg-transparent w-full text-xs outline-none"
                />
                {stickerSearch && (
                  <button
                    type="button"
                    onClick={() => setStickerSearch("")}
                    className="story-studio-muted hover:opacity-80 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-0.5 pb-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filteredStickerDefs.map((s, idx) => (
                    <button
                      key={`${s.label}_${idx}`}
                      type="button"
                      onClick={s.onSelect}
                      className="min-h-[44px] px-3 py-2 rounded-2xl story-studio-soft flex items-center gap-2 text-xs font-bold text-left active:scale-[0.98] transition-transform cursor-pointer"
                    >
                      <span className={`shrink-0 ${s.badgeClass}`}>{s.icon}</span>
                      <span className="truncate">{s.label}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-3 border-t border-black/5 dark:border-white/10 space-y-2.5">
                  <p className="text-xs font-semibold story-studio-muted">
                    Live Time & Reaction Widgets
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => addStickerInstant({ kind: "clock", title: "Dhaka Time" })}
                      className="min-h-[48px] px-3 rounded-2xl story-studio-soft flex items-center justify-center gap-1 font-mono font-bold text-sm tabular-nums cursor-pointer"
                    >
                      <span>{dhakaClock.hh}</span>
                      <span>:</span>
                      <span>{dhakaClock.mm}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => addStickerInstant({ kind: "day_stamp", title: dhakaClock.dayStr })}
                      className="min-h-[48px] px-3 rounded-2xl story-studio-soft flex items-center justify-center font-serif font-bold text-xs tracking-wider cursor-pointer truncate"
                    >
                      {dhakaClock.dayStr}
                    </button>

                    <button
                      type="button"
                      onClick={() => addStickerInstant({ kind: "heart_count", title: "1" })}
                      className="min-h-[48px] px-3 rounded-2xl story-studio-soft flex items-center justify-center gap-1.5 text-rose-500 font-bold text-xs cursor-pointer"
                    >
                      <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                      <span>Like Meter</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => addStickerInstant({ kind: "sound_on", title: "SOUND ON" })}
                      className="min-h-[48px] px-3 rounded-2xl story-studio-soft flex items-center justify-center gap-1.5 font-bold text-xs cursor-pointer whitespace-nowrap"
                    >
                      <Volume2 className="w-4 h-4 text-[#1877F2]" />
                      <span>Sound On</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
       * STICKER CONFIGURATOR DIALOG
       * =================================================================== */}
      <AnimatePresence>
        {configuringSticker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfiguringSticker(null)}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={(e) => e.stopPropagation()}
              className="story-studio-sheet w-full sm:max-w-md max-h-[74dvh] rounded-t-[28px] sm:rounded-[28px] p-5 space-y-4 shadow-2xl overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold capitalize">
                  Configure {configuringSticker.replace("_", " ")}
                </h3>
                <button
                  type="button"
                  onClick={() => setConfiguringSticker(null)}
                  className="story-studio-circle-btn w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {configuringSticker === "shop_order" ? (
                <div className="space-y-3">
                  <p className="text-xs story-studio-muted">
                    Select a product from Deep Shop so viewers can order directly from your story:
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
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
                            priceLabel: p.price
                              ? `৳${Number(p.price).toLocaleString()}`
                              : "Order now",
                            url: `/product/${p.id}`,
                          })
                        }
                        className="w-full p-2.5 rounded-2xl story-studio-soft flex items-center gap-3 text-left cursor-pointer"
                      >
                        {p.image?.trim() ? (
                          <img
                            src={p.image.trim()}
                            alt={p.name}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-xl object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                            <ShoppingBag className="w-4 h-4 story-studio-muted" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate">{p.name}</p>
                          <p className="text-[11px] font-semibold text-[#1877F2] tabular-nums">
                            ৳{Number(p.price || 0).toLocaleString()}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      addStickerInstant({
                        kind: "shop_order",
                        title: "Explore Featured Deals",
                        priceLabel: "Shop orders →",
                        url: "/products",
                      })
                    }
                    className="story-cta-blue w-full h-11 rounded-2xl text-xs font-bold cursor-pointer"
                  >
                    Link Storefront Catalog
                  </button>
                </div>
              ) : configuringSticker === "mention" ? (
                <div className="space-y-3">
                  <div className="h-10 px-3.5 rounded-xl story-studio-soft flex items-center gap-2">
                    <AtSign className="w-4 h-4 text-[#1877F2] shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      value={configSearchUser}
                      onChange={(e) => setConfigSearchUser(e.target.value)}
                      placeholder="Type username or search member..."
                      className="story-clean-input bg-transparent w-full text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
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
                          className="w-full p-2 rounded-xl story-studio-soft flex items-center gap-2.5 text-left cursor-pointer"
                        >
                          <img
                            src={u.avatar?.trim() || deepShopLogoFallback}
                            alt={u.name}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-full object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{u.name}</p>
                            <p className="text-[11px] story-studio-muted truncate">@{u.handle}</p>
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
                      className="story-cta-blue w-full h-11 rounded-2xl text-xs font-bold cursor-pointer"
                    >
                      Add @{configSearchUser.trim().replace(/^@/, "")}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="h-11 px-3.5 rounded-xl story-studio-soft flex items-center">
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
                      className="story-clean-input bg-transparent w-full text-xs outline-none"
                    />
                  </div>

                  {configuringSticker === "location" && (
                    <div className="flex flex-wrap gap-1.5">
                      {["Dhaka, Bangladesh", "Chattogram", "Sylhet", "Rajshahi"].map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setConfigTitle(loc)}
                          className="h-8 px-3 rounded-xl story-studio-soft text-xs font-medium cursor-pointer whitespace-nowrap"
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  )}

                  {(configuringSticker === "link" || configuringSticker === "countdown") && (
                    <div className="h-11 px-3.5 rounded-xl story-studio-soft flex items-center">
                      <input
                        type="text"
                        value={configSubtitle}
                        onChange={(e) => setConfigSubtitle(e.target.value)}
                        placeholder={
                          configuringSticker === "link"
                            ? "Button label (e.g. Visit Store)"
                            : "Target time (e.g. Tonight · 9:00 PM)"
                        }
                        className="story-clean-input bg-transparent w-full text-xs outline-none"
                      />
                    </div>
                  )}

                  {configuringSticker === "poll" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-10 px-3 rounded-xl story-studio-soft flex items-center">
                        <input
                          type="text"
                          value={configOptA}
                          onChange={(e) => setConfigOptA(e.target.value)}
                          placeholder="Option 1"
                          className="story-clean-input bg-transparent w-full text-xs outline-none"
                        />
                      </div>
                      <div className="h-10 px-3 rounded-xl story-studio-soft flex items-center">
                        <input
                          type="text"
                          value={configOptB}
                          onChange={(e) => setConfigOptB(e.target.value)}
                          placeholder="Option 2"
                          className="story-clean-input bg-transparent w-full text-xs outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {configuringSticker === "slider" && (
                    <div className="flex items-center justify-center gap-2 py-1">
                      {["🔥", "😍", "💯", "🎉", "❤️"].map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setConfigEmoji(em)}
                          className={`w-11 h-11 rounded-2xl text-lg cursor-pointer transition-transform ${
                            configEmoji === em ? "story-cta-blue scale-105" : "story-studio-soft"
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
                        optionA:
                          configuringSticker === "poll" ? configOptA.trim() || "Yes" : undefined,
                        optionB:
                          configuringSticker === "poll" ? configOptB.trim() || "No" : undefined,
                        emoji: configuringSticker === "slider" ? configEmoji : undefined,
                        url: configuringSticker === "link" ? configTitle.trim() : undefined,
                      });
                    }}
                    className="story-cta-blue w-full h-11 rounded-2xl text-xs font-bold cursor-pointer"
                  >
                    Add Sticker
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
       * OVERLAY 3: SONGS & CREATOR VIDEO AUDIO DRAWER
       * =================================================================== */}
      <AnimatePresence>
        {musicSheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setPreviewingSongId(null);
              setMusicSheetOpen(false);
            }}
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="story-studio-sheet w-full sm:max-w-lg max-h-[70dvh] sm:max-h-[78dvh] rounded-t-[28px] sm:rounded-[28px] flex flex-col p-4 sm:p-5 shadow-2xl overflow-hidden"
            >
              <div className="w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-white/20 mx-auto mb-3 sm:hidden shrink-0" />

              <header className="flex items-center justify-between pb-3 shrink-0">
                <div>
                  <h3 className="text-base font-bold">Audio Library</h3>
                  <p className="text-xs story-studio-muted">
                    Pair background songs or original creator audio
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewingSongId(null);
                    setMusicSheetOpen(false);
                  }}
                  className="story-studio-circle-btn w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </header>

              <div className="h-10 rounded-xl story-studio-soft px-3.5 flex items-center gap-2 mb-3 shrink-0">
                <Search className="w-4 h-4 story-studio-muted shrink-0" />
                <input
                  type="text"
                  value={musicSearch}
                  onChange={(e) => setMusicSearch(e.target.value)}
                  placeholder="Search songs or creator audio..."
                  className="story-clean-input bg-transparent w-full text-xs outline-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 pb-2">
                {displayedSongs.map((song) => {
                  const isPlaying = previewingSongId === song.id;
                  const isAttached =
                    attachedSong?.id === song.id ||
                    (Boolean(attachedSong?.url) && attachedSong?.url === song.url);
                  return (
                    <div
                      key={song.id}
                      className="p-2.5 rounded-2xl story-studio-soft flex items-center gap-3"
                    >
                      {song.coverUrl ? (
                        <img
                          src={song.coverUrl}
                          alt={song.title}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.classList.add("hidden");
                          }}
                          className="w-11 h-11 rounded-xl object-cover shrink-0 bg-black/10"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                          <Music className="w-5 h-5 story-studio-muted" />
                        </div>
                      )}

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
                        <p className="text-xs font-bold truncate">{song.title}</p>
                        <p className="text-[11px] story-studio-muted truncate">{song.artist}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setPreviewingSongId((prev) => (prev === song.id ? null : song.id))
                        }
                        className="story-studio-circle-btn w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
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
                        className={`h-9 px-3.5 rounded-xl text-xs font-bold cursor-pointer shrink-0 whitespace-nowrap ${
                          isAttached ? "story-cf-badge" : "story-cta-blue"
                        }`}
                      >
                        {isAttached ? "Added" : "Use"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
       * OVERLAY 4: CLOSE FRIENDS AUDIENCE SHEET
       * =================================================================== */}
      <AnimatePresence>
        {closeFriendsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCloseFriendsOpen(false)}
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="story-studio-sheet w-full sm:max-w-lg max-h-[72dvh] sm:max-h-[80dvh] rounded-t-[28px] sm:rounded-[28px] flex flex-col p-4 sm:p-5 shadow-2xl overflow-hidden"
            >
              <div className="w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-white/20 mx-auto mb-3 sm:hidden shrink-0" />

              <header className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10 shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="story-cf-badge w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4 fill-white text-white" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold">Close Friends</h3>
                    <p className="text-[11px] story-studio-muted tabular-nums">
                      {closeFriendIds.length} selected · Private list
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {closeFriendIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCloseFriendIds([])}
                      className="text-xs font-semibold text-[#1877F2] px-2 py-1 cursor-pointer whitespace-nowrap"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setCloseFriendsOpen(false)}
                    className="story-studio-circle-btn w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </header>

              <div className="h-10 rounded-xl story-studio-soft px-3.5 flex items-center gap-2 my-3 shrink-0">
                <Search className="w-4 h-4 story-studio-muted shrink-0" />
                <input
                  type="text"
                  value={closeFriendsSearch}
                  onChange={(e) => setCloseFriendsSearch(e.target.value)}
                  placeholder="Search followers or following..."
                  className="story-clean-input bg-transparent w-full text-xs outline-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 pb-3">
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
                      <div className="py-10 px-4 text-center space-y-1">
                        <p className="text-xs font-semibold">
                          {closeFriendCandidates.length === 0
                            ? "No followers or following yet"
                            : "No matching members"}
                        </p>
                        <p className="text-[11px] story-studio-muted">
                          People who follow you or whom you follow on Loops appear here.
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
                        className="w-full p-2.5 rounded-2xl story-studio-soft flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={u.avatar?.trim() || deepShopLogoFallback}
                            alt={u.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full object-cover shrink-0"
                          />
                          <div className="text-left min-w-0">
                            <p className="text-xs font-bold truncate">{u.name}</p>
                            <p className="text-[11px] story-studio-muted truncate">
                              @{u.handle}
                              {u.relationLabel ? ` · ${u.relationLabel}` : ""}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            checked
                              ? "story-cta-blue border-[#1877F2]"
                              : "border-zinc-300 dark:border-zinc-600"
                          }`}
                        >
                          {checked && <Check className="w-3.5 h-3.5" />}
                        </span>
                      </button>
                    );
                  });
                })()}
              </div>

              <div className="pt-3 border-t border-black/5 dark:border-white/10 flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setCloseFriendsOpen(false)}
                  className="story-pill-btn h-11 px-5 rounded-2xl text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  Save List
                </button>
                <button
                  type="button"
                  disabled={publishing}
                  onClick={() => handlePublishStory("close_friends")}
                  className="story-cta-blue flex-1 h-11 rounded-2xl text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  {publishing ? "Sharing..." : "Share to Close Friends"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
       * OVERLAY 5: SHARE STORY & DIRECT MESSAGE SHEET
       * =================================================================== */}
      <AnimatePresence>
        {shareSheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShareSheetOpen(false)}
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="story-studio-sheet w-full sm:max-w-lg max-h-[74dvh] sm:max-h-[82dvh] rounded-t-[28px] sm:rounded-[28px] flex flex-col p-4 sm:p-5 shadow-2xl overflow-hidden"
            >
              <div className="w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-white/20 mx-auto mb-3 sm:hidden shrink-0" />

              <header className="flex items-center justify-between pb-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 aspect-[9/16] rounded-xl overflow-hidden border border-black/10 dark:border-white/15 bg-zinc-900 shrink-0">
                    {createMode || !selectedMedia ? (
                      <div
                        className={`w-full h-full ${activeCreateGradient.bgClass} flex items-center justify-center p-1 text-center`}
                      >
                        <span className="text-[7px] font-bold text-white line-clamp-2">
                          {textLayers[0]?.text || caption || "Story"}
                        </span>
                      </div>
                    ) : selectedMedia.type === "video" ? (
                      toPlayableMediaUrl(selectedMedia.url) ? (
                        <video
                          src={toPlayableMediaUrl(selectedMedia.url)}
                          muted
                          playsInline
                          autoPlay
                          loop
                          className={`w-full h-full object-cover ${activeEffect.filterClass}`}
                        />
                      ) : null
                    ) : selectedMedia.url?.trim() ? (
                      <img
                        src={selectedMedia.url.trim()}
                        alt="Story preview"
                        referrerPolicy="no-referrer"
                        className={`w-full h-full object-cover ${activeEffect.filterClass}`}
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold">Share Story</h3>
                    <p className="text-xs story-studio-muted truncate">
                      Choose audience or send directly in chat
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShareSheetOpen(false)}
                  className="story-studio-circle-btn w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-2.5 border-y border-black/5 dark:border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => setShareTargetAudience("story")}
                  className={`p-3 rounded-2xl flex items-center justify-between cursor-pointer border transition-colors ${
                    shareTargetAudience === "story"
                      ? "border-[#1877F2] story-studio-soft"
                      : "border-transparent story-studio-soft opacity-80"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={userAvatarResolved || deepShopLogoFallback}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        if (e.currentTarget.src !== deepShopLogoFallback) {
                          e.currentTarget.src = deepShopLogoFallback;
                        }
                      }}
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                    <div className="text-left min-w-0">
                      <p className="text-xs font-bold truncate">Your Story</p>
                      <p className="text-[11px] story-studio-muted truncate">Public on Loops</p>
                    </div>
                  </div>
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      shareTargetAudience === "story"
                        ? "story-cta-blue border-[#1877F2]"
                        : "border-zinc-300 dark:border-zinc-600"
                    }`}
                  >
                    {shareTargetAudience === "story" && <Check className="w-3 h-3" />}
                  </span>
                </button>

                <div
                  className={`p-3 rounded-2xl flex items-center justify-between border transition-colors ${
                    shareTargetAudience === "close_friends"
                      ? "border-[#1877F2] story-studio-soft"
                      : "border-transparent story-studio-soft opacity-80"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setShareTargetAudience("close_friends")}
                    className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <span className="story-cf-badge w-9 h-9 rounded-full flex items-center justify-center shrink-0">
                      <Star className="w-4 h-4 fill-white text-white" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">Close Friends</p>
                      <p className="text-[11px] story-studio-muted tabular-nums truncate">
                        {closeFriendIds.length} members
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setShareSheetOpen(false);
                        setCloseFriendsOpen(true);
                      }}
                      className="text-[11px] font-bold text-[#1877F2] cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setShareTargetAudience("close_friends")}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer ${
                        shareTargetAudience === "close_friends"
                          ? "story-cta-blue border-[#1877F2]"
                          : "border-zinc-300 dark:border-zinc-600"
                      }`}
                    >
                      {shareTargetAudience === "close_friends" && <Check className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto py-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-[#1877F2]" />
                    <span>Also send in Direct Message</span>
                  </span>
                  {selectedDmUserIds.length > 0 && (
                    <span className="text-[11px] font-semibold text-[#1877F2] tabular-nums">
                      {selectedDmUserIds.length} selected
                    </span>
                  )}
                </div>

                <div className="h-9 rounded-xl story-studio-soft px-3 flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 story-studio-muted shrink-0" />
                  <input
                    type="text"
                    value={shareMessageQuery}
                    onChange={(e) => setShareMessageQuery(e.target.value)}
                    placeholder="Search recent chat partners..."
                    className="story-clean-input bg-transparent w-full text-xs outline-none"
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
                        <p className="py-5 text-center text-xs story-studio-muted">
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
                          className="w-full p-2 rounded-xl story-studio-soft flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={u.avatar?.trim() || deepShopLogoFallback}
                              alt={u.name}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                            />
                            <div className="text-left min-w-0">
                              <p className="text-xs font-semibold truncate">{u.name}</p>
                              <p className="text-[10.5px] story-studio-muted truncate">
                                @{u.handle}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                              sel
                                ? "story-cta-blue border-[#1877F2]"
                                : "border-zinc-300 dark:border-zinc-600"
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

              <button
                type="button"
                disabled={publishing}
                onClick={() => handlePublishStory(shareTargetAudience)}
                className="story-cta-blue w-full h-12 rounded-2xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publishing Story...</span>
                  </>
                ) : (
                  <span>
                    {shareTargetAudience === "close_friends"
                      ? "Publish to Close Friends"
                      : "Publish Story"}
                  </span>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
       * OVERLAY 6: COMPACT STORY CONTROLS SHEET
       * =================================================================== */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSettingsOpen(false)}
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="story-studio-sheet w-full sm:max-w-md max-h-[68dvh] rounded-t-[28px] sm:rounded-[28px] p-5 space-y-4 shadow-2xl overflow-y-auto"
            >
              <div className="w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-white/20 mx-auto mb-1 sm:hidden shrink-0" />

              <header className="flex items-center justify-between">
                <h3 className="text-base font-bold">Story Controls</h3>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="story-cta-blue h-9 px-4 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Done
                </button>
              </header>

              <div className="space-y-2">
                <p className="text-xs font-semibold story-studio-muted">Who can reply</p>
                {(
                  [
                    { id: "everyone", label: "Everyone" },
                    { id: "followers", label: "Followers you follow back" },
                    { id: "off", label: "Turn off replies" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setReplyPrivacy(opt.id)}
                    className="w-full p-3 rounded-2xl story-studio-soft flex items-center justify-between text-xs font-semibold cursor-pointer"
                  >
                    <span>{opt.label}</span>
                    <span
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        replyPrivacy === opt.id
                          ? "story-cta-blue border-[#1877F2]"
                          : "border-zinc-300 dark:border-zinc-600"
                      }`}
                    >
                      {replyPrivacy === opt.id && <Check className="w-3 h-3" />}
                    </span>
                  </button>
                ))}
              </div>

              <div className="p-3.5 rounded-2xl story-studio-soft flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold">Save story to archive</p>
                  <p className="text-[11px] story-studio-muted">
                    Keep published stories in your private Recents gallery
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoSaveArchive((v) => !v)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                    autoSaveArchive ? "story-cta-blue" : "bg-zinc-300 dark:bg-zinc-700"
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
                className="w-full p-3.5 rounded-2xl story-studio-soft flex items-center justify-between text-xs font-bold cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span className="story-cf-badge w-6 h-6 rounded-full flex items-center justify-center">
                    <Star className="w-3.5 h-3.5 fill-white text-white" />
                  </span>
                  <span>Manage Close Friends ({closeFriendIds.length})</span>
                </span>
                <ArrowRight className="w-4 h-4 story-studio-muted" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
