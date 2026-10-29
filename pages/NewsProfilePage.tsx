import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Share2,
  MoreHorizontal,
  Pencil,
  BarChart2,
  X,
  UserPlus,
  UserCheck,
  MessageSquare,
  QrCode,
  Copy,
  Check,
  Download,
  Info,
  Shield,
  VolumeX,
  Lock,
  Globe,
  Link2,
  ArrowUpRight,
  ExternalLink,
  Trash2,
  Sparkles,
  Camera,
  AtSign,
  Heart,
  MessageCircle,
  Image as ImageIcon,
  User as UserIcon,
  Search,
  Video as VideoIcon,
  RefreshCw,
  Plus,
  Music,
  Palette,
  MapPin,
  Coins,
  BookOpen,
  Eye,
  Bell,
  Menu,
  Settings,
} from "lucide-react";

const BellRingIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8a6 6 0 0 0-12 0v6l-2 3h16l-2-3V8z" />
    <path d="M9 19a3 3 0 0 0 6 0" />
    <path d="M4 2C2.8 3.7 2 5.7 2 8" />
    <path d="M22 8c0-2.3-.8-4.3-2-6" />
  </svg>
);

/** Inline Topic Icons for Interest Categories */
const UtensilsIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2v20M21 2v6a3 3 0 0 1-3 3M14 2v6a3 3 0 0 0 3 3M3 2v7a4 4 0 0 0 4 4v9h2V13a4 4 0 0 0 4-4V2" />
  </svg>
);

const GamepadIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="11" x2="10" y2="11" />
    <line x1="8" y1="9" x2="8" y2="13" />
    <line x1="15" y1="12" x2="15.01" y2="12" />
    <line x1="18" y1="10" x2="18.01" y2="10" />
    <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.84 7.56 4.2 11.41 9.298 11.41s10.138-3.85 9.298-11.41A4 4 0 0 0 17.32 5z" />
  </svg>
);

const LaptopIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="12" rx="2" />
    <line x1="2" y1="20" x2="22" y2="20" />
  </svg>
);

const ShirtIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
  </svg>
);

const TrophyIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17M14 14.66V17M12 2a8 8 0 0 0-8 8v1a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V10a8 8 0 0 0-8-8z" />
  </svg>
);

const ShoppingBagIconLocal = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const TvIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
    <polyline points="17 2 12 7 7 2" />
  </svg>
);

const PlaneIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.8 19.2 16 11l3.5-3.5a2.12 2.12 0 0 0 0-3 2.12 2.12 0 0 0-3 0L13 8 4.8 6.2a1 1 0 0 0-1.12.37L2.4 8.2a.5.5 0 0 0 .12.67l6.68 4.63-2.6 2.6-2.4-.8a.5.5 0 0 0-.58.17l-.8 1.07a.5.5 0 0 0 .12.67l3.6 2.5 2.5 3.6a.5.5 0 0 0 .67.12l1.07-.8a.5.5 0 0 0 .17-.58l-.8-2.4 2.6-2.6 4.63 6.68a.5.5 0 0 0 .67.12l1.63-1.28a1 1 0 0 0 .37-1.12z" />
  </svg>
);

const DumbbellIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6.5 6.5 11 11M21 21l-1-1M3 3l1 1M18 22l4-4M2 6l4-4M3 10l7-7M14 21l7-7" />
  </svg>
);


const RepeatIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 2l4 4-4 4"></path>
    <path d="M3 11v-1a4 4 0 0 1 4-4h14"></path>
    <path d="M7 22l-4-4 4-4"></path>
    <path d="M21 13v1a4 4 0 0 1-4 4H3"></path>
  </svg>
);
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { ScamPost, StoryHighlightItem } from "../types";
import { NewsPostMedia } from "../components/NewsPostMedia";
import { NewsRichText } from "../components/NewsRichText";
import { NewsBottomDock } from "../components/NewsBottomDock";
import { NewsHubDrawer } from "../components/NewsHubDrawer";
import { LoopPostCard } from "../components/LoopPostCard";
import { LiquidGlassShareModal } from "../components/LiquidGlassPostInteractions";
import { SmoothImage } from "../components/SmoothImage";
import { useNotify, useConfirm } from "../components/Notifications";
import { triggerHaptic } from "../lib/haptics";
import SEO from "../components/SEO";
import { formatDhakaDateTime, formatDhakaFeedTime } from "../lib/dhakaTime";
import { hasImmediateAdminOrStaffRole } from "../lib/admin";
import {
  formatCompactNumber,
  getSafePublicUsername,
  getSafeDisplayName,
  getPublicShareOrigin,
  isPhoneLikeUsername,
} from "../lib/utils";
import { useFooterLogo } from "../lib/useFooterLogo";
import {
  toggleFollowUser,
  useFollowedIds,
  subscribeToFollowerStats,
  getEffectiveFollowersCount,
} from "../lib/follow";
import {
  computeNextPostReactionState,
  toggleMuteUserId,
  toggleRestrictUserId,
  toggleBlockUserId,
} from "../lib/feedAlgorithm";
import { processCleanImage } from "../lib/watermark";
import { uploadDataUrlToImgbb } from "../services/imgbb";
const defaultAvatarImg = "";
const deepShopLogoFallback = "";

const TopicClusterDotsIcon: React.FC<{ className?: string }> = ({
  className = "w-3.5 h-3.5",
}) => (
  <svg className={className} viewBox="0 0 16 16" fill="currentColor">
    <circle cx="4.2" cy="8" r="2.1" />
    <circle cx="9.8" cy="4.6" r="2.1" />
    <circle cx="10.2" cy="11.2" r="1.9" />
  </svg>
);

const ShareUploadBoxSvg: React.FC<{ className?: string }> = ({
  className = "w-4 h-4",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.1"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3v12" />
    <polyline points="7 8 12 3 17 8" />
    <path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
  </svg>
);

const ReportBubbleSvg: React.FC<{ className?: string }> = ({
  className = "w-[22px] h-[22px]",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.95"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    <line x1="12" y1="8" x2="12" y2="12.5" />
    <circle cx="12" cy="15.8" r="0.6" fill="currentColor" />
  </svg>
);

/** Social SVG Icons */
const InstagramIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const YoutubeIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
  </svg>
);

const FacebookIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);

const ProfileChainLinkSvg = ({ className = "w-[18px] h-[18px]" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const LoopsSpiralAtSvg = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 12a4 4 0 1 0-4 4c2.5 0 4.5-1.6 4.5-4.2C16.5 8.2 14.2 6 11.2 6 7.5 6 5 8.8 5 12.4 5 16.8 8.3 20 12.8 20c2.6 0 4.8-.9 6.2-2.3" />
  </svg>
);

const WhatsAppOutlineSvg = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.7-5.2A8.5 8.5 0 1 1 21 11.5Z" />
    <path d="M9.4 8.8c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.6 1.4c.1.2.1.4 0 .6l-.4.6c-.1.2-.2.3 0 .6.3.5.8 1.1 1.4 1.5.6.4 1 .5 1.2.4.2-.1.6-.7.8-.9.2-.2.3-.2.6-.1l1.4.7c.3.1.4.2.5.4.1.3 0 .9-.3 1.3-.4.5-1.1.9-1.8.9-.8 0-1.9-.3-3.2-1.2-1.5-1-2.5-2.5-2.8-3.3-.3-.8-.1-1.5.3-1.9Z" />
  </svg>
);

const TelegramOutlineSvg = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 3-8.97 18-3.51-7.52L2 9.97 22 3Z" />
    <path d="M22 3 9.52 13.48" />
  </svg>
);

const TikTokOutlineSvg = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

/** Reusable User Avatar Component with Clean Fallback Icon */
export const ProfileAvatar: React.FC<{
  src?: string | null;
  name?: string;
  className?: string;
  iconClassName?: string;
  onClick?: () => void;
}> = ({ src, name = "User", className = "w-10 h-10", iconClassName = "w-5 h-5", onClick }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (src && !hasError && src !== defaultAvatarImg) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setHasError(true)}
        onClick={onClick}
        className={`${className} object-cover rounded-full bg-slate-100 dark:bg-zinc-800 ${onClick ? "cursor-pointer" : ""}`}
      />
    );
  }

  return (
    <div
      onClick={onClick}
      className={`${className} rounded-full bg-gradient-to-br from-[#1877F2] to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm ${onClick ? "cursor-pointer" : ""}`}
    >
      <UserIcon className={iconClassName} />
    </div>
  );
};

/** 100% Real, Scannable QR Code Generator Component */
const ScannableQRCodeCard: React.FC<{
  profileUrl: string;
  name: string;
  username: string;
  avatarUrl: string;
  footerLogo: string;
  onCanvasReady?: (dataUrl: string) => void;
}> = ({ profileUrl, name, username, avatarUrl, footerLogo, onCanvasReady }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    QRCode.toCanvas(
      canvas,
      profileUrl,
      {
        width: 200,
        margin: 2,
        color: {
          dark: "#0F172A",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "H",
      },
      (err) => {
        if (err) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Draw Center DEEP SHOP Logo Badge over QR center
        const centerSize = 42;
        const centerX = (canvas.width - centerSize) / 2;
        const centerY = (canvas.height - centerSize) / 2;

        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, centerSize / 2 + 3, 0, Math.PI * 2);
        ctx.fill();

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = footerLogo || deepShopLogoFallback;
        img.onload = () => {
          ctx.save();
          ctx.beginPath();
          ctx.arc(canvas.width / 2, canvas.height / 2, centerSize / 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, centerX, centerY, centerSize, centerSize);
          ctx.restore();

          if (onCanvasReady) {
            onCanvasReady(canvas.toDataURL("image/png"));
          }
        };
      }
    );
  }, [profileUrl, footerLogo, onCanvasReady]);

  return (
    <div className="flex flex-col items-center justify-center p-1">
      <div className="bg-white rounded-[24px] p-3.5 border border-slate-200/80 shadow-sm flex flex-col items-center text-center space-y-2 max-w-[220px] w-full">
        <canvas ref={canvasRef} className="w-44 h-44 rounded-xl" />
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-slate-900 truncate">
            {username
              ? username.startsWith("@")
                ? username
                : `@${username}`
              : name}
          </p>
        </div>
      </div>
    </div>
  );
};

// Preset Interest Categories matching Screenshots IMG_4920 and IMG_4921
const POPULAR_INTEREST_TOPICS = [
  { id: "music_posts", label: "Music Posts", category: "Entertainment", icon: Music },
  { id: "art_posts", label: "Art Posts", category: "Creative", icon: Palette },
  { id: "food_posts", label: "Food Posts", category: "Lifestyle", icon: UtensilsIcon },
  { id: "dallas", label: "Dallas", category: "City & Travel", icon: MapPin },
  { id: "tiktok", label: "TikTok", category: "Social Media", icon: VideoIcon },
  { id: "gaming", label: "Gaming", category: "Entertainment", icon: GamepadIcon },
  { id: "tech_gadgets", label: "Tech & Gadgets", category: "Technology", icon: LaptopIcon },
  { id: "fashion", label: "Fashion & Style", category: "Lifestyle", icon: ShirtIcon },
  { id: "sports", label: "Sports", category: "Sports", icon: TrophyIcon },
  { id: "crypto", label: "Crypto & Finance", category: "Business", icon: Coins },
  { id: "shopping", label: "Shopping & Deals", category: "Commerce", icon: ShoppingBagIconLocal },
  { id: "movies", label: "Movies & TV", category: "Entertainment", icon: TvIcon },
  { id: "travel", label: "Travel & Living", category: "Lifestyle", icon: PlaneIcon },
  { id: "fitness", label: "Fitness & Health", category: "Wellness", icon: DumbbellIcon },
  { id: "books", label: "Books & Culture", category: "Knowledge", icon: BookOpen },
  { id: "photography", label: "Photography", category: "Creative", icon: Camera },
];


export const NewsProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotify();
  const confirm = useConfirm();
  const footerLogo = useFooterLogo();

  const isEditView = location.pathname.endsWith("/edit");
  const isLinksView = location.pathname.endsWith("/links");
  const isInterestsView = location.pathname.endsWith("/interests");

  const [authInitializing, setAuthInitializing] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(() => auth.currentUser);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<ScamPost[]>([]);
  const [userMedia, setUserMedia] = useState<ScamPost[]>([]);
  const [repostedPosts, setRepostedPosts] = useState<ScamPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"posts" | "replies" | "media" | "reposts">("posts");

  const followedIds = useFollowedIds(currentUser?.uid);
  const [suggestedProfiles, setSuggestedProfiles] = useState<any[]>([]);
  const [dismissedSuggested, setDismissedSuggested] = useState<string[]>([]);

  // Sheets, Modals, & Image Viewers
  const [showFeedsDrawer, setShowFeedsDrawer] = useState(false);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const [showAboutSheet, setShowAboutSheet] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showAvatarViewerModal, setShowAvatarViewerModal] = useState(false);
  const [showNotifBellSheet, setShowNotifBellSheet] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<{
    threads: boolean;
    replies: boolean;
    push: boolean;
  }>({
    threads: true,
    replies: false,
    push: false,
  });
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Edit Profile Form State
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editInterests, setEditInterests] = useState("");
  const [editLinks, setEditLinks] = useState("");
  const [editPodcast, setEditPodcast] = useState("");
  const [editShowInstagramBadge, setEditShowInstagramBadge] = useState(true);
  const [editShowRecentViews, setEditShowRecentViews] = useState(true);
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Interest Selection State
  const [selectedInterestsList, setSelectedInterestsList] = useState<string[]>([]);
  const [interestSearchQuery, setInterestSearchQuery] = useState("");
  const [savingInterests, setSavingInterests] = useState(false);

  // Social Links & Custom Profile Links Sub-Page Form State
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialTikTok, setSocialTikTok] = useState("");
  const [socialFacebook, setSocialFacebook] = useState("");
  const [socialYouTube, setSocialYouTube] = useState("");
  const [socialWhatsApp, setSocialWhatsApp] = useState("");
  const [socialTelegram, setSocialTelegram] = useState("");
  const [socialThreads, setSocialThreads] = useState("");
  const [editShowLoopsBadge, setEditShowLoopsBadge] = useState(true);
  const [customLinks, setCustomLinks] = useState<
    { id: string; title: string; url: string }[]
  >([]);
  const [userComments, setUserComments] = useState<any[]>([]);
  const [socialWebsite, setSocialWebsite] = useState("");
  const [savingLinks, setSavingLinks] = useState(false);

  const videoScannerRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [liveFollowersCount, setLiveFollowersCount] = useState<number | null>(null);
  const [shareSheetTarget, setShareSheetTarget] = useState<{
    post?: Partial<ScamPost>;
    url?: string;
    title?: string;
  } | null>(null);
  const [showTopicsSheet, setShowTopicsSheet] = useState(false);
  const [showLinksSheet, setShowLinksSheet] = useState(false);
  const [userStoriesViews30d, setUserStoriesViews30d] = useState(0);
  const [storyHighlights, setStoryHighlights] = useState<StoryHighlightItem[]>([]);

  const targetUid = id || currentUser?.uid;
  const isOwnProfile = Boolean(currentUser?.uid && targetUid === currentUser.uid);

  // Load 30-day story view count for own profile "Your dashboard" summary card
  useEffect(() => {
    if (!isOwnProfile || !targetUid) {
      setUserStoriesViews30d(0);
      return;
    }
    const cutoff30d = Date.now() - 30 * 86_400_000;
    getDocs(query(collection(db, "stories"), where("userId", "==", targetUid)))
      .then((snap) => {
        let total = 0;
        snap.forEach((d) => {
          const data = d.data();
          const ts = Number(data.createdAtMs || data.createdAt || 0);
          if (!ts || ts >= cutoff30d) {
            const vb = Array.isArray(data.viewedBy) ? data.viewedBy.length : 0;
            total += Math.max(vb, Number(data.views || 0));
          }
        });
        setUserStoriesViews30d(total);
      })
      .catch(() => {});
  }, [isOwnProfile, targetUid]);

  // Sync Story Highlights (persists permanently on Profile even after 24h feed expiry)
  useEffect(() => {
    if (!targetUid) {
      setStoryHighlights([]);
      return;
    }
    const localKey = `deep_story_highlights_${targetUid}`;
    let localItems: StoryHighlightItem[] = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(localKey) || "[]");
      if (Array.isArray(parsed)) localItems = parsed;
    } catch {}

    const remoteItems: StoryHighlightItem[] = Array.isArray(
      profileUser?.storyHighlights
    )
      ? profileUser.storyHighlights
      : [];

    if (remoteItems.length > 0) {
      setStoryHighlights(remoteItems);
      try {
        localStorage.setItem(localKey, JSON.stringify(remoteItems));
      } catch {}
    } else {
      setStoryHighlights(localItems);
    }
  }, [targetUid, profileUser?.storyHighlights]);

  // Load saved creator activity notification preferences (Threads, Replies, Push)
  useEffect(() => {
    if (!targetUid || isOwnProfile) return;
    const storageKey = `deep_profile_notif_prefs_${currentUser?.uid || "guest"}`;
    try {
      const map = JSON.parse(localStorage.getItem(storageKey) || "{}");
      if (map[targetUid]) {
        setNotifPrefs({
          threads: Boolean(map[targetUid].threads ?? true),
          replies: Boolean(map[targetUid].replies ?? false),
          push: Boolean(map[targetUid].push ?? false),
        });
      } else {
        setNotifPrefs({ threads: true, replies: false, push: false });
      }
    } catch {}

    if (currentUser?.uid) {
      getDoc(doc(db, "users", currentUser.uid))
        .then((snap) => {
          if (!snap.exists()) return;
          const remotePrefs = snap.data()?.profileNotificationPrefs?.[targetUid];
          if (remotePrefs) {
            setNotifPrefs({
              threads: Boolean(remotePrefs.threads ?? true),
              replies: Boolean(remotePrefs.replies ?? false),
              push: Boolean(remotePrefs.push ?? false),
            });
          }
        })
        .catch(() => {});
    }
  }, [targetUid, isOwnProfile, currentUser?.uid]);

  const updateProfileNotifPrefs = (
    partial: Partial<{ threads: boolean; replies: boolean; push: boolean }>
  ) => {
    if (!targetUid) return;
    triggerHaptic();
    const next = { ...notifPrefs, ...partial };
    setNotifPrefs(next);

    if (partial.push && typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const storageKey = `deep_profile_notif_prefs_${currentUser?.uid || "guest"}`;
    try {
      const map = JSON.parse(localStorage.getItem(storageKey) || "{}");
      map[targetUid] = next;
      localStorage.setItem(storageKey, JSON.stringify(map));
    } catch {}

    if (currentUser?.uid) {
      setDoc(
        doc(db, "users", currentUser.uid),
        {
          profileNotificationPrefs: {
            [targetUid]: {
              ...next,
              updatedAt: Date.now(),
            },
          },
        },
        { merge: true }
      ).catch(() => {});
    }
  };

  useEffect(() => {
    if (!targetUid) {
      setLiveFollowersCount(null);
      return;
    }
    const unsub = subscribeToFollowerStats(
      targetUid,
      currentUser?.uid,
      (stats) => {
        setLiveFollowersCount(stats.followersCount);
      }
    );
    return () => unsub();
  }, [targetUid, currentUser?.uid]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setCurrentUser(u);
      setAuthInitializing(false);
    });
    return () => unsub();
  }, []);

  // Auth Protection Fix: Wait until auth initialization completes before triggering signin redirect!
  useEffect(() => {
    if (authInitializing) return;
    if (!loading && !currentUser && (!id || isOwnProfile)) {
      notify("Please sign in to access your profile", "info");
      navigate("/signin");
    }
  }, [authInitializing, loading, currentUser, id, isOwnProfile, navigate, notify]);

  // Load Target User Profile
  useEffect(() => {
    if (!targetUid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "users", targetUid),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setProfileUser({ uid: snap.id, ...d });
          setEditName(d.displayName || d.shopName || "");
          setEditUsername(getSafePublicUsername(d));
          setEditBio(d.bio || "");
          setEditLocation(d.location || "");

          const userInts = Array.isArray(d.interests)
            ? d.interests
            : typeof d.interests === "string" && d.interests.length > 0
            ? d.interests.split(",").map((s: string) => s.trim())
            : [];
          setSelectedInterestsList(userInts);
          setEditInterests(userInts.join(", "));

          const loadedWebsite =
            d.website || d.link || d.socialLinks?.website || "";
          setEditLinks(loadedWebsite);
          setEditPodcast(d.podcast || "");
          setEditShowInstagramBadge(d.showInstagramBadge !== false);
          setEditShowLoopsBadge(d.showLoopsBadge !== false);
          setEditShowRecentViews(d.showRecentViews !== false);
          setEditIsPrivate(Boolean(d.isPrivate));
          setEditAvatarUrl(d.photoURL || d.shopLogo || "");

          if (d.socialLinks) {
            setSocialInstagram(d.socialLinks.instagram || "");
            setSocialTikTok(d.socialLinks.tiktok || "");
            setSocialFacebook(d.socialLinks.facebook || "");
            setSocialYouTube(d.socialLinks.youtube || "");
            setSocialWhatsApp(d.socialLinks.whatsapp || "");
            setSocialTelegram(d.socialLinks.telegram || "");
            setSocialThreads(d.socialLinks.threads || "");
          }

          if (Array.isArray(d.profileLinks) && d.profileLinks.length > 0) {
            setCustomLinks(
              d.profileLinks
                .filter((item: any) => item && typeof item.url === "string")
                .map((item: any, idx: number) => ({
                  id: item.id || `plink_${idx}_${Date.now()}`,
                  title: item.title || "",
                  url: item.url || "",
                }))
            );
          } else if (loadedWebsite) {
            setCustomLinks([
              {
                id: "primary_web",
                title: "",
                url: loadedWebsite,
              },
            ]);
          } else {
            setCustomLinks([]);
          }

          setSocialWebsite(loadedWebsite);
        } else if (isOwnProfile && currentUser) {
          const fallbackObj = {
            uid: currentUser.uid,
            displayName: currentUser.displayName || "Member",
            email: currentUser.email || "",
            photoURL: currentUser.photoURL || "",
          };
          setProfileUser(fallbackObj);
          setEditName(fallbackObj.displayName);
          setEditUsername("");
          setEditAvatarUrl(fallbackObj.photoURL || "");
        }
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [targetUid, currentUser, isOwnProfile]);

  // Load User Posts, Media, and Reposts
  useEffect(() => {
    if (!targetUid) return;

    const qAll = query(collection(db, "scam_posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      qAll,
      (snap) => {
        const allList = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ScamPost, "id">),
        }));

        const ownPosts = allList.filter((p) => p.reporterId === targetUid);
        setUserPosts(ownPosts);
        setUserMedia(ownPosts.filter((p) => (p.images && p.images.length > 0) || p.videoUrl || p.audioUrl));

        const rPosts = allList.filter((p) => p.repostedByUserIds?.includes(targetUid));
        setRepostedPosts(rPosts);
      },
      () => {}
    );

    return () => unsub();
  }, [targetUid]);

  // Load User Comments / Replies for Replies tab
  useEffect(() => {
    if (!targetUid) return;
    const qComments = query(
      collection(db, "comments"),
      where("userId", "==", targetUid)
    );
    const unsub = onSnapshot(
      qComments,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setUserComments(list);
      },
      () => {}
    );
    return () => unsub();
  }, [targetUid]);

  // Load Suggested Profiles STRICTLY from real users who have published posts (postsCount >= 1)
  useEffect(() => {
    getDocs(collection(db, "scam_posts"))
      .then((pSnap) => {
        const postingUsersMap = new Map<string, number>();
        pSnap.docs.forEach((d) => {
          const reporterId = d.data()?.reporterId;
          if (reporterId) {
            postingUsersMap.set(reporterId, (postingUsersMap.get(reporterId) || 0) + 1);
          }
        });

        getDocs(collection(db, "users")).then((uSnap) => {
          const list = uSnap.docs
            .map((d) => ({ uid: d.id, ...(d.data() as Record<string, any>) }))
            .filter((u) => {
              const pCount = postingUsersMap.get(u.uid) || 0;
              return (
                u.uid !== currentUser?.uid &&
                u.uid !== targetUid &&
                pCount >= 1 &&
                !dismissedSuggested.includes(u.uid) &&
                Boolean(u.displayName || u.shopName)
              );
            })
            .slice(0, 8);
          setSuggestedProfiles(list);
        });
      })
      .catch(() => {});
  }, [currentUser?.uid, targetUid, dismissedSuggested]);

  // Save Social Links & Custom Profile Links Handler
  const handleSaveSocialLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid) return;
    triggerHaptic();
    setSavingLinks(true);

    const normalizedCustomLinks = customLinks
      .map((item, idx) => ({
        id: item.id || `link_${Date.now()}_${idx}`,
        title: (item.title || "").trim(),
        url: (item.url || "").trim(),
      }))
      .filter((item) => item.url.length > 0);

    const fallbackWeb = socialWebsite.trim();
    if (
      fallbackWeb &&
      !normalizedCustomLinks.some(
        (l) => l.url.toLowerCase() === fallbackWeb.toLowerCase()
      )
    ) {
      normalizedCustomLinks.unshift({
        id: `link_web_${Date.now()}`,
        title: "",
        url: fallbackWeb,
      });
    }

    const primaryWebsite = normalizedCustomLinks[0]?.url || "";
    const rawIg = socialInstagram.trim();
    const cleanedIg = /^https?:\/\//i.test(rawIg)
      ? rawIg
      : rawIg.replace(/^@+/, "");

    const updatePayload = {
      profileLinks: normalizedCustomLinks,
      showLoopsBadge: editShowLoopsBadge,
      showInstagramBadge: editShowInstagramBadge,
      socialLinks: {
        instagram: cleanedIg,
        tiktok: socialTikTok.trim().replace(/^@+/, ""),
        facebook: socialFacebook.trim(),
        youtube: socialYouTube.trim(),
        whatsapp: socialWhatsApp.trim(),
        telegram: socialTelegram.trim(),
        threads: socialThreads.trim().replace(/^@+/, ""),
        website: primaryWebsite,
      },
      website: primaryWebsite,
      link: primaryWebsite,
      updatedAt: Date.now(),
    };

    try {
      await setDoc(doc(db, "users", currentUser.uid), updatePayload, { merge: true });
      setCustomLinks(normalizedCustomLinks);
      setSocialWebsite(primaryWebsite);
      setEditLinks(primaryWebsite);
      notify("Profile links & social badges saved!", "success");
      const returnTarget = (location.state as any)?.from || "/loops/profile";
      navigate(returnTarget);
    } catch {
      notify("Could not save links. Please try again.", "error");
    } finally {
      setSavingLinks(false);
    }
  };

  // Save Interests Sub-Page Handler (Matching IMG_4920 & IMG_4921)
  const handleSaveInterests = async () => {
    if (!currentUser?.uid) return;
    triggerHaptic();
    setSavingInterests(true);

    try {
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          interests: selectedInterestsList,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      notify("Interests saved successfully!", "success");
      navigate("/loops/profile");
    } catch {
      notify("Could not save interests.", "error");
    } finally {
      setSavingInterests(false);
    }
  };

  // Toggle Interest Pill Selection
  const toggleInterestSelection = (topicLabel: string) => {
    triggerHaptic();
    setSelectedInterestsList((prev) =>
      prev.includes(topicLabel) ? prev.filter((t) => t !== topicLabel) : [...prev, topicLabel]
    );
  };

  // Save Main Profile Form Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid) return;
    triggerHaptic();
    setSavingEdit(true);

    const cleanedUsername = editUsername.trim().replace(/^@+/, "");
    if (cleanedUsername && isPhoneLikeUsername(cleanedUsername)) {
      setSavingEdit(false);
      notify("Phone numbers cannot be used as a public username. Please choose a custom username.", "error");
      return;
    }

    const cleanInterests = editInterests
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const resolvedWebsite = (editLinks.trim() || socialWebsite.trim()).trim();

    const updatePayload = {
      displayName: editName.trim() || "Community Member",
      username: cleanedUsername,
      bio: editBio.trim(),
      location: editLocation.trim(),
      interests: cleanInterests.length > 0 ? cleanInterests : selectedInterestsList,
      website: resolvedWebsite,
      link: resolvedWebsite,
      podcast: editPodcast.trim(),
      showInstagramBadge: editShowInstagramBadge,
      showRecentViews: editShowRecentViews,
      isPrivate: editIsPrivate,
      photoURL: typeof editAvatarUrl === "string" ? editAvatarUrl : "",
      updatedAt: Date.now(),
    };

    try {
      await setDoc(doc(db, "users", currentUser.uid), updatePayload, { merge: true });
      notify("Profile updated successfully!", "success");
      navigate("/loops/profile");
    } catch {
      notify("Could not update profile.", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // Avatar Image Picker — properly pass File to processCleanImage & host as URL string
  const handleAvatarFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    triggerHaptic();

    try {
      const processed = await processCleanImage(file, 640);
      const hostedUrl = await uploadDataUrlToImgbb(
        processed.dataUrl,
        `avatar-${Date.now()}.jpg`
      ).catch(() => "");
      setEditAvatarUrl(hostedUrl || processed.dataUrl);
      notify("Photo updated!", "info");
    } catch {
      notify("Could not load selected photo", "error");
    }
    e.target.value = "";
  };

  const handleToggleLikePost = async (post: ScamPost) => {
    if (!currentUser?.uid) {
      notify("Please sign in to like Loops!", "info");
      navigate("/signin");
      return;
    }
    triggerHaptic();
    const uid = currentUser.uid;
    const nextState = computeNextPostReactionState(
      post,
      uid,
      {
        userName: getSafeDisplayName(currentUser, "Member"),
        userAvatar: currentUser.photoURL || "",
      },
      "love"
    );

    try {
      await updateDoc(doc(db, "scam_posts", post.id), {
        reactions: nextState.reactions,
        reactionsCount: nextState.reactionsCount,
        reactionsUsers: nextState.reactionsUsers,
        votedUserIds: nextState.votedUserIds,
        votes: nextState.votes,
      });
    } catch {}
  };

  const handleDeleteProfilePost = async (post: ScamPost) => {
    triggerHaptic();
    const ok = await confirm({
      title: "Delete Loop?",
      message:
        "Are you sure you want to permanently delete this Loop? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "scam_posts", post.id));
    } catch {}
    try {
      const raw = localStorage.getItem("deep_scam_posts");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          localStorage.setItem(
            "deep_scam_posts",
            JSON.stringify(parsed.filter((item: any) => item?.id !== post.id))
          );
        }
      }
    } catch {}
    setUserPosts((prev) => prev.filter((p) => p.id !== post.id));
    notify("Loop deleted", "success");
  };

  // Repost Handler
  const handleToggleRepost = async (post: ScamPost) => {
    if (!currentUser?.uid) {
      notify("Please sign in to repost!", "error");
      navigate("/signin");
      return;
    }
    triggerHaptic();

    const isReposted = post.repostedByUserIds?.includes(currentUser.uid);
    const updatedUserIds = isReposted
      ? (post.repostedByUserIds || []).filter((u) => u !== currentUser.uid)
      : Array.from(new Set([...(post.repostedByUserIds || []), currentUser.uid]));

    const nextCount = isReposted
      ? Math.max(0, (post.repostsCount || 1) - 1)
      : (post.repostsCount || 0) + 1;

    try {
      await updateDoc(doc(db, "scam_posts", post.id), {
        repostedByUserIds: updatedUserIds,
        repostsCount: nextCount,
      });

      if (!isReposted && post.reporterId && post.reporterId !== currentUser.uid) {
        const actorIsAdmin = hasImmediateAdminOrStaffRole(null, currentUser);
        if (actorIsAdmin) {
          setDoc(
            doc(db, "news_hub_notifications", `milestone_reposts_${post.id}`),
            {
              userId: post.reporterId,
              fromUserId: "system_milestone",
              fromUserName: "Loops",
              fromUserUsername: "",
              fromUserAvatar: "",
              type: "milestone",
              milestoneKind: "reposts",
              totalCount: nextCount,
              title: "Congratulations!",
              body: `Your Loop now has ${nextCount.toLocaleString()} total reposts.`,
              mediaThumbnail: post.images?.[0] || "",
              targetId: post.id,
              isRead: false,
              read: false,
              createdAt: Date.now(),
              link: `/loops/post/${post.id}`,
            },
            { merge: true }
          ).catch(() => {});
        } else {
          addDoc(collection(db, "news_hub_notifications"), {
            userId: post.reporterId,
            fromUserId: currentUser.uid,
            fromUserName: getSafeDisplayName(currentUser, "Someone"),
            fromUserUsername: getSafePublicUsername(currentUser),
            fromUserAvatar: currentUser.photoURL || "",
            type: "repost",
            title: "Reposted your Loop",
            body: `reposted your Loop: "${(post.description || post.title || "").slice(0, 36)}"`,
            mediaThumbnail: post.images?.[0] || "",
            targetId: post.id,
            isRead: false,
            read: false,
            createdAt: Date.now(),
            link: `/loops/post/${post.id}`,
          }).catch(() => {});
        }
      }

      notify(isReposted ? "Repost removed" : "Reposted to Loops!", "success");
    } catch {}
  };

  // Live Camera QR Scanner Handler
  const startCameraScanner = async () => {
    triggerHaptic();
    setShowScannerModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      mediaStreamRef.current = stream;
      if (videoScannerRef.current) {
        videoScannerRef.current.srcObject = stream;
        videoScannerRef.current.play().catch(() => {});
      }
    } catch {
      notify("Camera permission required to scan QR code.", "error");
    }
  };

  const stopCameraScanner = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setShowScannerModal(false);
  };

  // Download QR Code Image
  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    triggerHaptic();
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `QR_${username || displayName || "PROFILE"}_DEEPSHOP.png`;
    a.click();
    notify("QR code downloaded!", "success");
  };

  const handleCopyProfileLink = () => {
    triggerHaptic();
    const url = getPublicShareOrigin() + "/loops/profile/" + targetUid;
    navigator.clipboard.writeText(url);
    notify("Profile link copied to clipboard!", "success");
  };

  const displayName =
    profileUser?.displayName ||
    profileUser?.shopName ||
    (isOwnProfile ? currentUser?.displayName || "Community Member" : "User");

  const username = getSafePublicUsername(profileUser);

  const rawBioText =
    typeof profileUser?.bio === "string" ? profileUser.bio.trim() : "";
  const hasRealBio = Boolean(
    rawBioText.length > 0 &&
      rawBioText.toLowerCase() !== "no bio added yet." &&
      rawBioText.toLowerCase() !== "no bio added yet"
  );
  const bio = hasRealBio ? rawBioText : "";
  const avatarUrl = profileUser?.photoURL || profileUser?.shopLogo || "";
  const followersCount =
    liveFollowersCount !== null
      ? liveFollowersCount
      : getEffectiveFollowersCount(profileUser);

  // Loading indicator for auth initializing or target profile load
  if (authInitializing || (loading && !profileUser)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center space-y-3">
        <div className="w-9 h-9 border-3 border-[#1877F2] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-400">Loading profile...</p>
      </div>
    );
  }

  /* ============================================================================
   * 1. INTERESTS SELECTION PAGE VIEW (/news-hub/profile/interests) — MATCHING IMG_4920 & IMG_4921
   * ========================================================================== */
  if (isInterestsView) {
    const filteredTopics = POPULAR_INTEREST_TOPICS.filter(
      (t) =>
        t.label.toLowerCase().includes(interestSearchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(interestSearchQuery.toLowerCase())
    );

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans pb-28">
        <SEO title="Select Interests — Loops" description="Choose topics you care about to customize your Loops experience." exactTitle />

        <div className="max-w-xl mx-auto px-4 pt-4 sm:pt-6">
          <header className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                navigate("/loops/profile");
              }}
              className="text-sm font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Select interests
            </h1>
            <button
              type="button"
              onClick={handleSaveInterests}
              disabled={savingInterests}
              className="text-sm font-bold text-[#1877F2] hover:underline cursor-pointer disabled:opacity-50"
            >
              {savingInterests ? "Saving..." : "Done"}
            </button>
          </header>

          {/* Search Box */}
          <div className="mt-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={interestSearchQuery}
              onChange={(e) => setInterestSearchQuery(e.target.value)}
              placeholder="Search topics or interests..."
              className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-900 dark:text-white border border-slate-200/80 dark:border-zinc-800 outline-none focus:border-[#1877F2] shadow-sm"
            />
          </div>

          <div className="mt-6 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Popular Topics & Categories
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
              {filteredTopics.map((topic) => {
                const isSelected = selectedInterestsList.includes(topic.label);
                const IconComp = topic.icon;

                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => toggleInterestSelection(topic.label)}
                    className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer shadow-sm ${
                      isSelected
                        ? "bg-[#1877F2]/10 border-[#1877F2] text-[#1877F2] dark:bg-[#1877F2]/20"
                        : "bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 text-slate-900 dark:text-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-[#1877F2] text-white" : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300"
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">{topic.label}</p>
                        <p className="text-[10px] text-slate-400 truncate">{topic.category}</p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition ${
                        isSelected
                          ? "bg-[#1877F2] border-[#1877F2] text-white"
                          : "border-slate-300 dark:border-zinc-700 bg-transparent"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 text-center">
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 max-w-sm mx-auto leading-relaxed">
                Selecting topics helps personalize your Loops feed experience and highlights relevant updates.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================================
   * 2. LINKS SUB-PAGE VIEW (/loops/profile/links) — CUSTOM LINKS & SOCIAL CHIPS
   * ========================================================================== */
  if (isLinksView) {
    const returnToPath = (location.state as any)?.from || "/loops/profile";

    const addEmptyCustomLink = () => {
      triggerHaptic();
      setCustomLinks((prev) => [
        ...prev,
        { id: `link_${Date.now()}_${prev.length}`, title: "", url: "" },
      ]);
    };

    const updateCustomLinkItem = (
      id: string,
      field: "title" | "url",
      val: string
    ) => {
      setCustomLinks((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
      );
    };

    const removeCustomLinkItem = (id: string) => {
      triggerHaptic();
      setCustomLinks((prev) => prev.filter((item) => item.id !== id));
    };

    return (
      <div className="min-h-screen loops-surface text-[#0f0f0f] dark:text-zinc-100 font-sans pb-28">
        <SEO title="Links & Socials — Loops" description="Manage profile links, WhatsApp, Instagram, and social badges." exactTitle />

        <header className="sticky top-0 z-30 loops-surface/90 backdrop-blur-xl border-b loops-divider">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  navigate(returnToPath);
                }}
                className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-[#0f0f0f] dark:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition cursor-pointer shrink-0"
                aria-label="Back"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2.1]" />
              </button>
              <h1 className="text-[17px] font-bold tracking-tight truncate">
                Links & social badges
              </h1>
            </div>

            <button
              type="button"
              onClick={handleSaveSocialLinks}
              disabled={savingLinks}
              className="px-4 py-1.5 rounded-full bg-[#0f0f0f] dark:bg-white text-white dark:text-[#0f0f0f] text-[13.5px] font-semibold hover:opacity-90 transition cursor-pointer disabled:opacity-50 shrink-0"
            >
              {savingLinks ? "Saving..." : "Done"}
            </button>
          </div>
        </header>

        <form
          onSubmit={handleSaveSocialLinks}
          className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 space-y-5"
        >
          {/* Section 1: Custom Links (Telegram invite, Shop, Portfolio, etc.) */}
          <section className="loops-about-card rounded-[26px] p-5 border loops-divider space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <h2 className="text-[15.5px] font-bold text-[#0f0f0f] dark:text-white flex items-center gap-2">
                  <ProfileChainLinkSvg className="w-4 h-4 shrink-0" />
                  <span>Profile links</span>
                </h2>
                <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400">
                  Add Telegram invite links (t.me/...), websites, or store links. Multiple links display as &ldquo;link and X more&rdquo; on your profile.
                </p>
              </div>
              <button
                type="button"
                onClick={addEmptyCustomLink}
                className="px-3 py-1.5 rounded-full border loops-divider text-[12.5px] font-semibold text-[#0f0f0f] dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] inline-flex items-center gap-1 shrink-0 cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add link</span>
              </button>
            </div>

            {customLinks.length === 0 ? (
              <button
                type="button"
                onClick={addEmptyCustomLink}
                className="w-full py-3.5 px-4 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 text-[13.5px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-400 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add your first external link</span>
              </button>
            ) : (
              <div className="space-y-3">
                {customLinks.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border loops-divider space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-400">
                        Link {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCustomLinkItem(item.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                        aria-label="Remove link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={item.url}
                      onChange={(e) =>
                        updateCustomLinkItem(item.id, "url", e.target.value)
                      }
                      placeholder="https://t.me/+jBB7zRRjuF5hYWY1 or yoursite.com"
                      className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border loops-divider text-[13.5px] font-medium text-[#0f0f0f] dark:text-white placeholder:text-zinc-400 outline-none focus:border-zinc-900 dark:focus:border-white"
                    />
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) =>
                        updateCustomLinkItem(item.id, "title", e.target.value)
                      }
                      placeholder="Optional title (e.g. Official Channel)"
                      className="w-full h-9 px-3.5 rounded-xl bg-white/70 dark:bg-zinc-900/70 border loops-divider text-[12.5px] text-[#0f0f0f] dark:text-white placeholder:text-zinc-400 outline-none focus:border-zinc-900 dark:focus:border-white"
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section 2: Instagram Header Shortcut */}
          <section className="loops-about-card rounded-[26px] p-5 border loops-divider space-y-3.5">
            <div className="space-y-0.5">
              <h2 className="text-[15.5px] font-bold text-[#0f0f0f] dark:text-white flex items-center gap-2">
                <InstagramIcon className="w-4 h-4 text-pink-500 shrink-0" />
                <span>Instagram header button</span>
              </h2>
              <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400">
                When linked, the Instagram icon replaces the Shop icon in your profile top bar and opens your Instagram directly.
              </p>
            </div>

            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-zinc-400 font-semibold text-[14px]">
                @
              </span>
              <input
                type="text"
                value={socialInstagram}
                onChange={(e) => setSocialInstagram(e.target.value)}
                placeholder="instagram_username or profile URL"
                className="w-full h-11 pl-8 pr-4 rounded-2xl bg-black/[0.035] dark:bg-white/[0.055] border border-transparent focus:border-zinc-900 dark:focus:border-white text-[14px] font-medium text-[#0f0f0f] dark:text-white placeholder:text-zinc-400 outline-none transition"
              />
            </div>
          </section>

          {/* Section 3: Profile Pill Badges (Loops Handle, WhatsApp, Telegram, TikTok, Facebook, YouTube) */}
          <section className="loops-about-card rounded-[26px] p-5 border loops-divider space-y-4">
            <div className="space-y-0.5">
              <h2 className="text-[15.5px] font-bold text-[#0f0f0f] dark:text-white">
                Profile pill chips
              </h2>
              <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400">
                Displayed as interactive pill buttons right below your bio links.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pb-3 border-b loops-divider">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-[#0f0f0f] dark:text-white flex items-center gap-1.5">
                  <LoopsSpiralAtSvg className="w-4 h-4 shrink-0" />
                  <span>Show Loops handle chip</span>
                </p>
                <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
                  Displays your @handle pill on your profile bio area.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={editShowLoopsBadge}
                onClick={() => setEditShowLoopsBadge((v) => !v)}
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                  editShowLoopsBadge
                    ? "bg-[#0f0f0f] dark:bg-white"
                    : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full transition-all shadow-xs ${
                    editShowLoopsBadge
                      ? "left-[22px] bg-white dark:bg-[#0f0f0f]"
                      : "left-0.5 bg-white"
                  }`}
                />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="font-semibold text-[13px] text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <LoopsSpiralAtSvg className="w-4 h-4 shrink-0" />
                  <span>Custom Loops / Threads handle (optional)</span>
                </label>
                <input
                  type="text"
                  value={socialThreads}
                  onChange={(e) => setSocialThreads(e.target.value)}
                  placeholder={username || "deep.shop.official"}
                  className="w-full h-11 px-3.5 rounded-2xl bg-black/[0.035] dark:bg-white/[0.055] border border-transparent focus:border-zinc-900 dark:focus:border-white text-[14px] font-medium text-[#0f0f0f] dark:text-white placeholder:text-zinc-400 outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[13px] text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <WhatsAppOutlineSvg className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>WhatsApp Number or Link</span>
                </label>
                <input
                  type="text"
                  value={socialWhatsApp}
                  onChange={(e) => setSocialWhatsApp(e.target.value)}
                  placeholder="+8801XXXXXXXXX or https://wa.me/..."
                  className="w-full h-11 px-3.5 rounded-2xl bg-black/[0.035] dark:bg-white/[0.055] border border-transparent focus:border-zinc-900 dark:focus:border-white text-[14px] font-medium text-[#0f0f0f] dark:text-white placeholder:text-zinc-400 outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[13px] text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <TelegramOutlineSvg className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>Telegram Username or Channel</span>
                </label>
                <input
                  type="text"
                  value={socialTelegram}
                  onChange={(e) => setSocialTelegram(e.target.value)}
                  placeholder="https://t.me/yourchannel or @username"
                  className="w-full h-11 px-3.5 rounded-2xl bg-black/[0.035] dark:bg-white/[0.055] border border-transparent focus:border-zinc-900 dark:focus:border-white text-[14px] font-medium text-[#0f0f0f] dark:text-white placeholder:text-zinc-400 outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[13px] text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <TikTokOutlineSvg className="w-4 h-4 shrink-0" />
                  <span>TikTok Username</span>
                </label>
                <input
                  type="text"
                  value={socialTikTok}
                  onChange={(e) => setSocialTikTok(e.target.value)}
                  placeholder="@username"
                  className="w-full h-11 px-3.5 rounded-2xl bg-black/[0.035] dark:bg-white/[0.055] border border-transparent focus:border-zinc-900 dark:focus:border-white text-[14px] font-medium text-[#0f0f0f] dark:text-white placeholder:text-zinc-400 outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[13px] text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <FacebookIcon className="w-4 h-4 text-[#1877F2] shrink-0" />
                  <span>Facebook Profile / Page URL</span>
                </label>
                <input
                  type="text"
                  value={socialFacebook}
                  onChange={(e) => setSocialFacebook(e.target.value)}
                  placeholder="https://facebook.com/yourpage"
                  className="w-full h-11 px-3.5 rounded-2xl bg-black/[0.035] dark:bg-white/[0.055] border border-transparent focus:border-zinc-900 dark:focus:border-white text-[14px] font-medium text-[#0f0f0f] dark:text-white placeholder:text-zinc-400 outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[13px] text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <YoutubeIcon className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>YouTube Channel URL</span>
                </label>
                <input
                  type="text"
                  value={socialYouTube}
                  onChange={(e) => setSocialYouTube(e.target.value)}
                  placeholder="https://youtube.com/@channel"
                  className="w-full h-11 px-3.5 rounded-2xl bg-black/[0.035] dark:bg-white/[0.055] border border-transparent focus:border-zinc-900 dark:focus:border-white text-[14px] font-medium text-[#0f0f0f] dark:text-white placeholder:text-zinc-400 outline-none transition"
                />
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={savingLinks}
            className="w-full h-12 rounded-full bg-[#0f0f0f] dark:bg-white text-white dark:text-[#0f0f0f] font-semibold text-[15px] hover:opacity-90 active:scale-[0.99] transition cursor-pointer disabled:opacity-50"
          >
            {savingLinks ? "Saving links..." : "Save links"}
          </button>
        </form>
      </div>
    );
  }

  /* ============================================================================
   * 3. EDIT PROFILE PAGE VIEW (/loops/profile/edit) — REDESIGNED STUDIO LAYOUT
   * ========================================================================== */
  if (isEditView) {
    const cleanEditHandle = editUsername.replace(/^@+/, "").trim();
    const connectedSocialCount = [
      socialInstagram,
      socialWhatsApp,
      socialTelegram,
      socialThreads,
      socialTikTok,
      socialFacebook,
      socialYouTube,
    ].filter((v) => Boolean(v && v.trim())).length + customLinks.filter((l) => l.url.trim()).length;

    return (
      <div className="min-h-screen loops-surface text-[#0f0f0f] dark:text-zinc-100 font-sans pb-28">
        <SEO title="Edit Profile — Loops" description="Update your Loops profile details and preferences." exactTitle />

        {/* Sticky Frosted Header */}
        <header className="sticky top-0 z-30 loops-surface/90 backdrop-blur-xl border-b loops-divider">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  navigate("/loops/profile");
                }}
                className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-[#0f0f0f] dark:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition cursor-pointer shrink-0"
                aria-label="Back to profile"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2.1]" />
              </button>
              <h1 className="text-[17px] font-bold tracking-tight truncate">
                Edit profile
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  navigate("/loops/profile");
                }}
                disabled={savingEdit}
                className="hidden sm:inline-flex items-center justify-center h-9 px-4 rounded-full text-[13.5px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingEdit}
                className="inline-flex items-center justify-center h-9 px-5 rounded-full bg-[#0f0f0f] dark:bg-white text-white dark:text-[#0f0f0f] text-[13.5px] font-semibold hover:opacity-90 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
              >
                {savingEdit ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </header>

        <form
          onSubmit={handleSaveProfile}
          className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-5"
        >
          {/* Identity Banner & Avatar Studio Card */}
          <section className="loops-about-card rounded-[28px] p-5 sm:p-6 border loops-divider flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileSelected}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative group shrink-0 cursor-pointer"
                title="Change profile photo"
              >
                <ProfileAvatar
                  src={editAvatarUrl}
                  name={editName || displayName}
                  className="w-20 h-20 ring-2 ring-black/[0.06] dark:ring-white/10"
                  iconClassName="w-9 h-9"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-[#0f0f0f] dark:bg-white text-white dark:text-[#0f0f0f] ring-2 ring-white dark:ring-[#181818] flex items-center justify-center">
                  <Camera className="w-3.5 h-3.5" />
                </span>
              </button>

              <div className="min-w-0 space-y-0.5">
                <h2 className="text-[18px] font-bold text-[#0f0f0f] dark:text-white truncate">
                  {editName.trim() || "Your Name"}
                </h2>
                <p className="text-[14px] text-zinc-500 dark:text-zinc-400 truncate">
                  {cleanEditHandle ? `@${cleanEditHandle}` : "Choose a username"}
                  <span aria-hidden="true"> · </span>
                  <span>{editIsPrivate ? "Private profile" : "Public profile"}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-10 px-4 rounded-full loops-gray-pill text-[13.5px] font-semibold text-[#0f0f0f] dark:text-white hover:opacity-85 transition cursor-pointer shrink-0 self-start sm:self-center"
            >
              Change photo
            </button>
          </section>

          {/* Main Profile Information Card */}
          <section className="loops-about-card rounded-[28px] p-5 sm:p-6 border loops-divider space-y-4">
            <div className="space-y-0.5">
              <h3 className="text-[16px] font-bold text-[#0f0f0f] dark:text-white">
                Profile information
              </h3>
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
                Visible on your Loops profile and across community conversations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Display name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Display name"
                  className="w-full h-11 px-3.5 rounded-2xl bg-black/[0.035] dark:bg-white/[0.055] border border-transparent focus:border-zinc-900 dark:focus:border-white text-[14.5px] font-medium text-[#0f0f0f] dark:text-white placeholder:text-zinc-400 outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Username
                </label>
                <div className="relative flex items-center">
                  <AtSign className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="username"
                    className="w-full h-11 pl-9 pr-3.5 rounded-2xl bg-black/[0.035] dark:bg-white/[0.055] border border-transparent focus:border-zinc-900 dark:focus:border-white text-[14.5px] font-medium text-[#0f0f0f] dark:text-white placeholder:text-zinc-400 outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Bio
                </label>
                <span className="text-[12px] text-zinc-400 tabular-nums">
                  {editBio.length}/160
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={160}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Write a short bio about what you loop about..."
                className="w-full p-3.5 rounded-2xl bg-black/[0.035] dark:bg-white/[0.055] border border-transparent focus:border-zinc-900 dark:focus:border-white text-[14.5px] leading-relaxed font-normal text-[#0f0f0f] dark:text-white placeholder:text-zinc-400 outline-none resize-none transition"
              />
            </div>

            {/* Location & Website */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Location
                </label>
                <div className="relative flex items-center">
                  <MapPin className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="e.g. Dhaka, Bangladesh"
                    className="w-full h-11 pl-10 pr-3.5 rounded-2xl bg-black/[0.035] dark:bg-white/[0.055] border border-transparent focus:border-zinc-900 dark:focus:border-white text-[14.5px] font-medium text-[#0f0f0f] dark:text-white placeholder:text-zinc-400 outline-none transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Website
                </label>
                <div className="relative flex items-center">
                  <Globe className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={editLinks}
                    onChange={(e) => {
                      setEditLinks(e.target.value);
                      setSocialWebsite(e.target.value);
                    }}
                    placeholder="yoursite.com"
                    className="w-full h-11 pl-10 pr-3.5 rounded-2xl bg-black/[0.035] dark:bg-white/[0.055] border border-transparent focus:border-zinc-900 dark:focus:border-white text-[14.5px] font-medium text-[#0f0f0f] dark:text-white placeholder:text-zinc-400 outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Podcast */}
            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
                Podcast link
              </label>
              <div className="relative flex items-center">
                <Music className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={editPodcast}
                  onChange={(e) => setEditPodcast(e.target.value)}
                  placeholder="Link to your podcast show"
                  className="w-full h-11 pl-10 pr-3.5 rounded-2xl bg-black/[0.035] dark:bg-white/[0.055] border border-transparent focus:border-zinc-900 dark:focus:border-white text-[14.5px] font-medium text-[#0f0f0f] dark:text-white placeholder:text-zinc-400 outline-none transition"
                />
              </div>
            </div>
          </section>

          {/* Topics & Connected Social Links Navigation Card */}
          <section className="loops-about-card rounded-[28px] p-2 border loops-divider divide-y loops-divider">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                navigate("/loops/profile/interests");
              }}
              className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.05] rounded-t-[20px] transition cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center shrink-0">
                  <TopicClusterDotsIcon className="w-4 h-4 text-[#0095F6]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-[#0f0f0f] dark:text-white">
                    Interests & topics
                  </p>
                  <p className="text-[13px] text-zinc-500 dark:text-zinc-400 truncate">
                    {selectedInterestsList.length > 0
                      ? selectedInterestsList.join(" · ")
                      : "Choose topics you loop about"}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4.5 h-4.5 text-zinc-400 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                navigate("/loops/profile/links", {
                  state: { from: "/loops/profile/edit" },
                });
              }}
              className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.05] rounded-b-[20px] transition cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center shrink-0">
                  <Link2 className="w-4.5 h-4.5 text-[#0f0f0f] dark:text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-[#0f0f0f] dark:text-white">
                    Social links & handles
                  </p>
                  <p className="text-[13px] text-zinc-500 dark:text-zinc-400 truncate">
                    {connectedSocialCount > 0
                      ? `${connectedSocialCount} social ${connectedSocialCount === 1 ? "account" : "accounts"} linked`
                      : "Connect Instagram, TikTok, Facebook or YouTube"}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4.5 h-4.5 text-zinc-400 shrink-0" />
            </button>
          </section>

          {/* Privacy & Visibility Preferences Card */}
          <section className="loops-about-card rounded-[28px] p-5 sm:p-6 border loops-divider space-y-4">
            <h3 className="text-[16px] font-bold text-[#0f0f0f] dark:text-white">
              Privacy & display
            </h3>

            <div className="divide-y loops-divider">
              <div className="pb-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-[#0f0f0f] dark:text-white">
                    Private profile
                  </p>
                  <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-snug">
                    Only approved followers can view and reply to your loops.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={editIsPrivate}
                  onClick={() => setEditIsPrivate((v) => !v)}
                  className={`w-12 h-7 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                    editIsPrivate
                      ? "bg-[#0f0f0f] dark:bg-white"
                      : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-5 h-5 rounded-full transition-all shadow-xs ${
                      editIsPrivate
                        ? "left-6 bg-white dark:bg-[#0f0f0f]"
                        : "left-1 bg-white"
                    }`}
                  />
                </button>
              </div>

              <div className="py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-[#0f0f0f] dark:text-white">
                    Show Instagram badge
                  </p>
                  <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-snug">
                    Display your linked Instagram shortcut on your Loops header.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={editShowInstagramBadge}
                  onClick={() => setEditShowInstagramBadge((v) => !v)}
                  className={`w-12 h-7 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                    editShowInstagramBadge
                      ? "bg-[#0f0f0f] dark:bg-white"
                      : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-5 h-5 rounded-full transition-all shadow-xs ${
                      editShowInstagramBadge
                        ? "left-6 bg-white dark:bg-[#0f0f0f]"
                        : "left-1 bg-white"
                    }`}
                  />
                </button>
              </div>

              <div className="pt-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-[#0f0f0f] dark:text-white">
                    Show recent views
                  </p>
                  <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-snug">
                    Publicly display view activity in About this profile once you pass 1K+ views.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={editShowRecentViews}
                  onClick={() => setEditShowRecentViews((v) => !v)}
                  className={`w-12 h-7 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                    editShowRecentViews
                      ? "bg-[#0f0f0f] dark:bg-white"
                      : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-5 h-5 rounded-full transition-all shadow-xs ${
                      editShowRecentViews
                        ? "left-6 bg-white dark:bg-[#0f0f0f]"
                        : "left-1 bg-white"
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={savingEdit}
            className="w-full h-12 rounded-full bg-[#0f0f0f] dark:bg-white text-white dark:text-[#0f0f0f] font-semibold text-[15px] hover:opacity-90 active:scale-[0.99] transition cursor-pointer disabled:opacity-50"
          >
            {savingEdit ? "Saving profile..." : "Save changes"}
          </button>
        </form>
      </div>
    );
  }

  /* ============================================================================
   * 4. MAIN PROFILE VIEW PAGE (Matching IMG_5097, IMG_5106 & IMG_5107)
   * ========================================================================== */
  const normalizeExternalHref = (rawUrl: string): string => {
    const trimmed = String(rawUrl || "").trim();
    if (!trimmed) return "";
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const formatCleanLinkLabel = (rawUrl: string): string =>
    String(rawUrl || "")
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .replace(/\/+$/, "");

  const rawWebsiteUrl = String(
    profileUser?.website ||
      profileUser?.link ||
      profileUser?.socialLinks?.website ||
      ""
  ).trim();

  const displayProfileLinks: {
    id: string;
    title: string;
    href: string;
    cleanLabel: string;
  }[] = (() => {
    const list: { id: string; title: string; href: string; cleanLabel: string }[] = [];
    const seen = new Set<string>();

    const storedArr = Array.isArray(profileUser?.profileLinks)
      ? profileUser.profileLinks
      : [];
    storedArr.forEach((item: any, idx: number) => {
      const raw = String(item?.url || "").trim();
      if (!raw) return;
      const clean = formatCleanLinkLabel(raw);
      const key = clean.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      list.push({
        id: item.id || `plink_${idx}`,
        title: String(item.title || "").trim(),
        href: normalizeExternalHref(raw),
        cleanLabel: clean,
      });
    });

    if (rawWebsiteUrl) {
      const clean = formatCleanLinkLabel(rawWebsiteUrl);
      const key = clean.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          id: "legacy_website",
          title: "",
          href: normalizeExternalHref(rawWebsiteUrl),
          cleanLabel: clean,
        });
      }
    }

    return list;
  })();

  // Linked Instagram URL for Top Header (replaces Shop icon when linked)
  const rawLinkedInstagram = String(
    profileUser?.socialLinks?.instagram || ""
  ).trim();
  const instagramHeaderHref = (() => {
    if (!rawLinkedInstagram || profileUser?.showInstagramBadge === false) {
      return "";
    }
    if (/^https?:\/\//i.test(rawLinkedInstagram)) return rawLinkedInstagram;
    const handle = rawLinkedInstagram
      .replace(/^@+/, "")
      .replace(/^(?:www\.)?instagram\.com\//i, "")
      .replace(/\/+$/, "")
      .trim();
    return handle ? `https://www.instagram.com/${handle}` : "";
  })();

  // Social Pill Chips below links (matching IMG_5140)
  const loopsHandleBadgeText = (() => {
    if (profileUser?.showLoopsBadge === false) return "";
    const customThreads = String(
      profileUser?.socialLinks?.threads || ""
    )
      .trim()
      .replace(/^@+/, "");
    if (customThreads) return customThreads;
    return username ? username.replace(/^@+/, "") : "";
  })();

  const externalSocialChips: {
    id: string;
    label: string;
    href: string;
    icon: React.ReactNode;
  }[] = (() => {
    const chips: {
      id: string;
      label: string;
      href: string;
      icon: React.ReactNode;
    }[] = [];

    const rawWa = String(profileUser?.socialLinks?.whatsapp || "").trim();
    if (rawWa) {
      const waHref = /^https?:\/\//i.test(rawWa)
        ? rawWa
        : /^(?:wa\.me|chat\.whatsapp\.com)\//i.test(rawWa)
        ? `https://${rawWa}`
        : `https://wa.me/${rawWa.replace(/[^\d]/g, "")}`;
      chips.push({
        id: "whatsapp",
        label: "WhatsApp",
        href: waHref,
        icon: <WhatsAppOutlineSvg className="w-[15px] h-[15px] shrink-0" />,
      });
    }

    const rawTg = String(profileUser?.socialLinks?.telegram || "").trim();
    if (rawTg) {
      const tgHref = /^https?:\/\//i.test(rawTg)
        ? rawTg
        : /^t\.me\//i.test(rawTg)
        ? `https://${rawTg}`
        : `https://t.me/${rawTg.replace(/^@+/, "")}`;
      chips.push({
        id: "telegram",
        label: "Telegram",
        href: tgHref,
        icon: <TelegramOutlineSvg className="w-[15px] h-[15px] shrink-0" />,
      });
    }

    const rawTt = String(profileUser?.socialLinks?.tiktok || "").trim();
    if (rawTt) {
      const ttHref = /^https?:\/\//i.test(rawTt)
        ? rawTt
        : `https://www.tiktok.com/@${rawTt.replace(/^@+/, "")}`;
      chips.push({
        id: "tiktok",
        label: "TikTok",
        href: ttHref,
        icon: <TikTokOutlineSvg className="w-[15px] h-[15px] shrink-0" />,
      });
    }

    const rawFb = String(profileUser?.socialLinks?.facebook || "").trim();
    if (rawFb) {
      chips.push({
        id: "facebook",
        label: "Facebook",
        href: normalizeExternalHref(rawFb),
        icon: <FacebookIcon className="w-[15px] h-[15px] shrink-0" />,
      });
    }

    const rawYt = String(profileUser?.socialLinks?.youtube || "").trim();
    if (rawYt) {
      chips.push({
        id: "youtube",
        label: "YouTube",
        href: normalizeExternalHref(rawYt),
        icon: <YoutubeIcon className="w-[15px] h-[15px] shrink-0" />,
      });
    }

    return chips;
  })();

  // Real 30-day views count for "Your dashboard" card on own profile
  const cutoff30DaysMs = Date.now() - 30 * 86_400_000;
  const recentPostsViews = userPosts.reduce((sum, p) => {
    const created = Number(p.createdAt || 0);
    if (!created || created >= cutoff30DaysMs) {
      return sum + Number(p.views || 0);
    }
    return sum;
  }, 0);
  const allPostsViews = userPosts.reduce((sum, p) => sum + Number(p.views || 0), 0);
  const last30DaysViews =
    (recentPostsViews > 0 ? recentPostsViews : allPostsViews) + userStoriesViews30d;

  const profileTopics: string[] =
    selectedInterestsList.length > 0
      ? selectedInterestsList
      : isOwnProfile
      ? ["Music Loops"]
      : [];
  const primaryTopic = profileTopics[0] || "";
  const extraTopicsCount = Math.max(0, profileTopics.length - 1);
  const profileShareUrl = `${getPublicShareOrigin()}/loops/profile/${targetUid || ""}`;

  const hasRealAvatar = Boolean(avatarUrl && avatarUrl.trim().length > 0);
  const hasFollowedEnough = followedIds.length >= 10;
  const hasRealInterests =
    (Array.isArray(profileUser?.interests) && profileUser.interests.length > 0) ||
    selectedInterestsList.length > 0;

  const incompleteSetupSteps = isOwnProfile
    ? [
        ...(!hasFollowedEnough
          ? [
              {
                id: "follow",
                title: "Follow 10 profiles",
                description: "Fill your feed with loops that interest you.",
                cta: "See profiles",
                icon: <UserPlus className="w-6 h-6 stroke-[1.8]" />,
                onClick: () => navigate("/loops/search"),
              },
            ]
          : []),
        ...(!hasRealBio
          ? [
              {
                id: "bio",
                title: "Add bio",
                description:
                  "Introduce yourself and tell people what you're interested in.",
                cta: "Add",
                icon: <Pencil className="w-6 h-6 stroke-[1.8]" />,
                onClick: () => navigate("/loops/profile/edit"),
              },
            ]
          : []),
        ...(!hasRealAvatar
          ? [
              {
                id: "avatar",
                title: "Add profile photo",
                description:
                  "Make it easier for friends and followers to recognize you.",
                cta: "Upload",
                icon: <Camera className="w-6 h-6 stroke-[1.8]" />,
                onClick: () => navigate("/loops/profile/edit"),
              },
            ]
          : []),
        ...(!hasRealInterests
          ? [
              {
                id: "interests",
                title: "Select interests",
                description:
                  "Pick topics you enjoy so Loops can tailor your feed.",
                cta: "Choose",
                icon: <Sparkles className="w-6 h-6 stroke-[1.8]" />,
                onClick: () => navigate("/loops/profile/interests"),
              },
            ]
          : []),
      ]
    : [];

  return (
    <div className="min-h-screen loops-surface text-zinc-950 dark:text-zinc-100 font-sans pb-32">
      <SEO
        title={
          username
            ? `${displayName} (@${username}) — Loops`
            : `${displayName} — Loops`
        }
        description={(bio || `${displayName} on Loops`).slice(0, 160)}
        exactTitle
      />

      <div className="max-w-[620px] mx-auto px-4 pt-3 sm:pt-5">
        {/* Top Header Row matching IMG_5097 & IMG_5106 (Back on left; Search, Visit Shop, Settings on right) */}
        <header className="flex items-center justify-between gap-3 pb-3">
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate("/loops");
              }
            }}
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-zinc-950 dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer active:scale-95 transition"
            aria-label="Back"
            title="Back"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
          </button>

          <div className="flex items-center gap-1.5 -mr-1.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                navigate("/loops/search");
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-950 dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer active:scale-95 transition"
              aria-label="Search"
              title="Search"
            >
              <Search className="w-[22px] h-[22px] stroke-[2]" />
            </button>

            {instagramHeaderHref ? (
              <a
                href={instagramHeaderHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => triggerHaptic()}
                className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-950 dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer active:scale-95 transition"
                aria-label="Instagram profile"
                title="Instagram"
              >
                <InstagramIcon className="w-[21px] h-[21px]" />
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  navigate("/");
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-950 dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer active:scale-95 transition"
                aria-label="Visit Shop"
                title="Visit Shop"
              >
                <ShoppingBagIconLocal className="w-[21px] h-[21px]" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setShowOptionsSheet(true);
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-950 dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer active:scale-95 transition"
              aria-label="Settings & Options"
              title="Settings"
            >
              <Settings className="w-[22px] h-[22px] stroke-[2]" />
            </button>
          </div>
        </header>

        {/* Feeds Drawer */}
        <NewsHubDrawer
          isOpen={showFeedsDrawer}
          onClose={() => setShowFeedsDrawer(false)}
          userData={profileUser}
        />

        {/* Flat Loops Profile Header matching IMG_5097 & IMG_5106 */}
        <div className="pt-1 pb-2 space-y-3.5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5 min-w-0 flex-1 pt-1">
              <h1 className="text-[23px] sm:text-[26px] font-bold tracking-tight text-zinc-950 dark:text-white leading-tight truncate">
                {displayName}
              </h1>
              {username && (
                <p className="text-[15px] font-normal text-zinc-900 dark:text-zinc-200 truncate">
                  {username.replace(/^@+/, "")}
                </p>
              )}

              {/* Topic Pills Row matching IMG_5097 & IMG_5106 */}
              {(primaryTopic || isOwnProfile) && (
                <div className="pt-2.5 flex items-center gap-2 flex-wrap">
                  {primaryTopic && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        navigate(
                          `/loops/search?q=${encodeURIComponent(primaryTopic)}`
                        );
                      }}
                      className="px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#0095F6] text-[13.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                    >
                      <TopicClusterDotsIcon className="w-3.5 h-3.5 text-[#0095F6] shrink-0" />
                      <span>{primaryTopic}</span>
                    </button>
                  )}

                  {extraTopicsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        setShowTopicsSheet(true);
                      }}
                      className="px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 text-[13.5px] font-semibold cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                    >
                      +{extraTopicsCount}
                    </button>
                  )}

                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        navigate("/loops/profile/interests");
                      }}
                      className="h-[34px] px-3.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-300 flex items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
                      title="Edit topics"
                      aria-label="Edit topics"
                    >
                      <Plus className="w-4 h-4 stroke-[2.3]" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right Circular Avatar + Dashed '+' Speech Bubble Badge (IMG_5097) */}
            <div className="relative shrink-0">
              <div
                onClick={() => {
                  triggerHaptic();
                  setShowAvatarViewerModal(true);
                }}
                className="w-[76px] h-[76px] sm:w-[84px] sm:h-[84px] rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-1 ring-black/[0.06] dark:ring-white/10 cursor-pointer flex items-center justify-center"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#B2FF00] flex flex-col items-center justify-center text-black font-black text-center leading-none p-1">
                    <span className="text-[22px] tracking-tighter">DS</span>
                    <span className="text-[8.5px] uppercase tracking-widest font-bold mt-0.5">
                      DEEP SHOP
                    </span>
                  </div>
                )}
              </div>

              {isOwnProfile && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    navigate("/loops/create?ghost=1");
                  }}
                  className="absolute -bottom-0.5 -left-2.5 w-8 h-8 rounded-full bg-white dark:bg-zinc-900 border-[1.6px] border-dashed border-zinc-400 dark:border-zinc-500 flex items-center justify-center text-zinc-900 dark:text-zinc-100 shadow-xs active:scale-90 transition cursor-pointer"
                  title="Share a Ghost post"
                  aria-label="Share a Ghost post"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>

          {/* Bio Row (IMG_5106) */}
          {bio && bio.trim().length > 0 && (
            <p className="text-[15px] leading-[1.42] text-zinc-900 dark:text-zinc-100 whitespace-pre-line break-words">
              <NewsRichText text={bio} />
            </p>
          )}

          {/* Followers Row */}
          <div className="flex items-center gap-1.5 flex-wrap text-[14.5px] text-zinc-400 dark:text-zinc-500">
            <span className="tabular-nums">
              {formatCompactNumber(followersCount)}{" "}
              {followersCount === 1 ? "follower" : "followers"}
            </span>
          </div>

          {/* Custom Links Row (IMG_5140: chain icon + "t.me/... and 2 more") */}
          {displayProfileLinks.length > 0 && (
            <div className="pt-0.5">
              {displayProfileLinks.length === 1 ? (
                <a
                  href={displayProfileLinks[0].href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => triggerHaptic()}
                  className="inline-flex items-center gap-2 text-[14.5px] font-semibold text-zinc-950 dark:text-white hover:opacity-80 transition max-w-full"
                >
                  <ProfileChainLinkSvg className="w-[17px] h-[17px] shrink-0 text-zinc-950 dark:text-white" />
                  <span className="truncate">
                    {displayProfileLinks[0].cleanLabel}
                  </span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setShowLinksSheet(true);
                  }}
                  className="inline-flex items-center gap-2 text-[14.5px] font-semibold text-zinc-950 dark:text-white hover:opacity-80 transition max-w-full cursor-pointer text-left"
                >
                  <ProfileChainLinkSvg className="w-[17px] h-[17px] shrink-0 text-zinc-950 dark:text-white" />
                  <span className="truncate">
                    {displayProfileLinks[0].cleanLabel} and{" "}
                    {displayProfileLinks.length - 1} more
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Social Pill Chips + "+ Add" Chip Row (IMG_5140) */}
          {(Boolean(loopsHandleBadgeText) ||
            externalSocialChips.length > 0 ||
            isOwnProfile) && (
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              {loopsHandleBadgeText && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    navigator.clipboard
                      .writeText(`@${loopsHandleBadgeText}`)
                      .catch(() => {});
                    notify(`Copied @${loopsHandleBadgeText}`, "info");
                  }}
                  className="h-[34px] px-3.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-zinc-950 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LoopsSpiralAtSvg className="w-[15px] h-[15px] shrink-0 text-zinc-950 dark:text-white" />
                  <span>{loopsHandleBadgeText}</span>
                </button>
              )}

              {externalSocialChips.map((chip) => (
                <a
                  key={chip.id}
                  href={chip.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => triggerHaptic()}
                  className="h-[34px] px-3.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-zinc-950 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {chip.icon}
                  <span>{chip.label}</span>
                </a>
              ))}

              {isOwnProfile && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    navigate("/loops/profile/links", {
                      state: { from: "/loops/profile" },
                    });
                  }}
                  className="h-[34px] px-3.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 inline-flex items-center gap-1 text-[13.5px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.2] shrink-0" />
                  <span>Add</span>
                </button>
              )}
            </div>
          )}

          {/* Own Profile "Your dashboard" Summary Card (IMG_5140) */}
          {isOwnProfile && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                navigate("/creator-dashboard");
              }}
              className="w-full rounded-2xl bg-[#F2F4F7] dark:bg-zinc-900/90 hover:bg-[#E8ECEF] dark:hover:bg-zinc-800/90 px-4 py-3.5 text-left transition cursor-pointer block"
            >
              <span className="block text-[15.5px] font-bold text-zinc-950 dark:text-white leading-snug">
                Your dashboard
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[13.5px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                <ArrowUpRight className="w-4 h-4 text-[#16A34A] stroke-[2.3] shrink-0" />
                <span>
                  {formatCompactNumber(last30DaysViews)} views in the last 30 days.
                </span>
              </span>
            </button>
          )}

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2 pt-1">
            {isOwnProfile ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    navigate("/loops/profile/edit");
                  }}
                  className="flex-1 h-10 rounded-xl loops-gray-pill hover:opacity-90 text-zinc-950 dark:text-white text-[14.5px] font-semibold transition flex items-center justify-center cursor-pointer"
                >
                  Edit profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setShareSheetTarget({
                      url: profileShareUrl,
                      title: `Check out ${displayName} on Loops`,
                    });
                  }}
                  className="flex-1 h-10 rounded-xl loops-gray-pill hover:opacity-90 text-zinc-950 dark:text-white text-[14.5px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Share profile</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    triggerHaptic();
                    const isF = followedIds.includes(targetUid);
                    await toggleFollowUser({
                      targetUid,
                      targetName: displayName,
                      currentUser,
                      currentlyFollowing: isF,
                    });
                  }}
                  className={`flex-1 h-10 rounded-xl text-[14.5px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    followedIds.includes(targetUid)
                      ? "loops-gray-pill text-zinc-950 dark:text-white"
                      : "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950"
                  }`}
                >
                  {followedIds.includes(targetUid) ? "Following" : "Follow"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    navigate(`/messages?uid=${targetUid}`);
                  }}
                  className="flex-1 h-10 rounded-xl loops-gray-pill hover:opacity-90 text-zinc-950 dark:text-white text-[14.5px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Message</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setShareSheetTarget({
                      url: profileShareUrl,
                      title: `Check out ${displayName} on Loops`,
                    });
                  }}
                  className="w-10 h-10 rounded-xl loops-gray-pill hover:opacity-90 text-zinc-950 dark:text-white flex items-center justify-center shrink-0 cursor-pointer"
                  aria-label="Share Profile"
                >
                  <ShareUploadBoxSvg className="w-[18px] h-[18px]" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Finish your profile Cards Section — Only shown when setup steps are genuinely incomplete */}
        {isOwnProfile && incompleteSetupSteps.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Finish your profile
              </h3>
              <span className="text-xs font-semibold text-slate-400 tabular-nums">
                {incompleteSetupSteps.length} left
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {incompleteSetupSteps.map((step) => (
                <div
                  key={step.id}
                  className="bg-zinc-100/80 dark:bg-zinc-900/80 rounded-[24px] p-5 flex flex-col items-center text-center justify-between space-y-3 border border-black/5 dark:border-white/5"
                >
                  <div className="w-13 h-13 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-800 dark:text-zinc-200 shadow-xs">
                    {step.icon}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                      {step.title}
                    </h4>
                    <p className="text-[11.5px] text-zinc-400 leading-snug">
                      {step.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      step.onClick();
                    }}
                    className="w-full py-2.5 rounded-2xl bg-black dark:bg-white text-white dark:text-black text-xs font-bold cursor-pointer active:scale-95 transition"
                  >
                    {step.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested For You (Only Real Users with postsCount >= 1 - Matching IMG_4922) */}
        {suggestedProfiles.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[13px] font-extrabold text-slate-800 dark:text-zinc-200">
                Suggested for you
              </h3>
              <button
                type="button"
                onClick={() => setSuggestedProfiles([])}
                className="text-xs font-bold text-slate-400 hover:text-[#1877F2] transition cursor-pointer"
              >
                See all
              </button>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-none">
              {suggestedProfiles.map((sProf) => {
                const sName = sProf.displayName || sProf.shopName || "Creator";
                const sUser = getSafePublicUsername(sProf);
                const sAvatar = sProf.photoURL || sProf.shopLogo || "";
                const isSFollowing = followedIds.includes(sProf.uid);

                return (
                  <div
                    key={sProf.uid}
                    className="relative w-[156px] shrink-0 bg-[#F8FAFC] dark:bg-zinc-900/50 rounded-[28px] p-5 border border-slate-200/80 dark:border-zinc-800/80 shadow-2xs flex flex-col items-center text-center space-y-3 cursor-pointer"
                    onClick={() => navigate(`/loops/profile/${sProf.uid}`)}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDismissedSuggested((prev) => [...prev, sProf.uid]);
                      }}
                      className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                      aria-label="Dismiss"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <ProfileAvatar src={sAvatar} name={sName} className="w-[72px] h-[72px] ring-2 ring-white dark:ring-zinc-800 shadow-sm" iconClassName="w-8 h-8" />

                    <div className="w-full space-y-0.5">
                      <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{sName}</p>
                      {sUser && (
                        <p className="text-[11px] font-medium text-slate-400 dark:text-zinc-500 truncate">@{sUser}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        triggerHaptic();
                        await toggleFollowUser({
                          targetUid: sProf.uid,
                          targetName: sName,
                          currentUser,
                          currentlyFollowing: isSFollowing,
                        });
                      }}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer ${
                        isSFollowing
                          ? "bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                          : "bg-black dark:bg-white text-white dark:text-black"
                      }`}
                    >
                      {isSFollowing ? "Following" : "Follow"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Story Highlights Row (IMG_5137 1:1 — stays on Profile permanently after 24h feed expiry) */}
        {storyHighlights.length > 0 && (
          <div className="pt-4 pb-1 -mx-4 px-4 flex items-start gap-4 overflow-x-auto no-scrollbar">
            {storyHighlights.map((hl) => {
              const firstStoryId =
                hl.storiesSnapshot?.[0]?.id ||
                hl.storyIds?.[0] ||
                hl.id;
              return (
                <button
                  key={hl.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    navigate(
                      `/loops/story/${encodeURIComponent(
                        firstStoryId
                      )}?highlightId=${encodeURIComponent(
                        hl.id
                      )}&uid=${encodeURIComponent(targetUid || "")}`
                    );
                  }}
                  onContextMenu={async (e) => {
                    if (!isOwnProfile || !currentUser?.uid) return;
                    e.preventDefault();
                    const ok = await confirm({
                      title: "Remove Highlight",
                      message: `Remove "${hl.title}" from your profile highlights?`,
                      confirmText: "Remove",
                    });
                    if (!ok) return;
                    const nextList = storyHighlights.filter(
                      (item) => item.id !== hl.id
                    );
                    setStoryHighlights(nextList);
                    try {
                      localStorage.setItem(
                        `deep_story_highlights_${currentUser.uid}`,
                        JSON.stringify(nextList)
                      );
                    } catch {}
                    await setDoc(
                      doc(db, "users", currentUser.uid),
                      { storyHighlights: nextList },
                      { merge: true }
                    ).catch(() => {});
                    notify("Highlight removed.", "success");
                  }}
                  className="flex flex-col items-center shrink-0 cursor-pointer active:scale-95 transition-transform select-none"
                >
                  <div className="loops-highlight-ring w-[74px] h-[74px] rounded-full p-[3.5px] flex items-center justify-center">
                    <div className="loops-highlight-inner w-full h-full rounded-full flex items-center justify-center px-1.5 text-center overflow-hidden">
                      <span className="text-[9.5px] font-extrabold tracking-[0.04em] uppercase leading-[1.15] line-clamp-2 break-words">
                        {hl.title}
                      </span>
                    </div>
                  </div>
                  <span className="mt-1.5 text-[12px] font-normal tracking-[0.03em] text-zinc-900 dark:text-zinc-100 uppercase truncate w-[78px] text-center">
                    {hl.title}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Profile Tabs Bar (Loops, Replies, Media, Reposts matching IMG_5097) */}
        <div className="mt-5 -mx-4 px-4 border-b loops-divider flex items-center justify-around">
          {[
            { id: "posts", label: "Loops" },
            { id: "replies", label: "Replies" },
            { id: "media", label: "Media" },
            { id: "reposts", label: "Reposts" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setActiveTab(tab.id as any);
                }}
                className={`flex-1 py-3 text-[15px] font-semibold relative cursor-pointer transition-colors text-center ${
                  isActive
                    ? "text-zinc-950 dark:text-white"
                    : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700"
                }`}
              >
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeProfileTabUnderline"
                    className="absolute bottom-0 inset-x-3 h-[2px] bg-zinc-950 dark:bg-white rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Display */}
        <div className="mt-6 space-y-4">
          {activeTab === "posts" && (
            userPosts.length === 0 ? (
              isOwnProfile ? (
                <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-[32px] p-6 sm:p-8 border border-slate-200/80 dark:border-zinc-800 shadow-sm space-y-8 flex flex-col items-center text-center">
                  <div className="space-y-2">
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                      Start your first Loop
                    </h3>
                    <p className="text-sm text-slate-400 dark:text-zinc-500 font-medium max-w-[280px] mx-auto">
                      Need inspiration? Pick a prompt to get going.
                    </p>
                  </div>

                  {/* Prompt Suggestions Horizontal Loop */}
                  <div className="flex flex-col gap-3 w-full max-w-sm">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                      {[
                        "What are you watching right now?",
                        "Share a photo and a thought.",
                        "What's your hot take today?",
                        "Ask the community a question.",
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            navigate(`/loops/create?text=${encodeURIComponent(suggestion)}`);
                          }}
                          className="px-5 py-3 rounded-full bg-white dark:bg-zinc-800 text-xs font-bold text-slate-900 dark:text-white border border-slate-200/80 dark:border-zinc-700 shadow-2xs whitespace-nowrap cursor-pointer hover:border-[#0095F6] transition"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      navigate("/loops/create");
                    }}
                    className="w-full py-4 rounded-[20px] bg-black dark:bg-white text-white dark:text-black font-extrabold text-sm shadow-lg active:scale-[0.98] transition cursor-pointer"
                  >
                    Create Loop
                  </button>
                </div>
              ) : (
                <div className="text-center py-12 text-xs font-semibold text-slate-500 dark:text-zinc-400 bg-white/60 dark:bg-zinc-900/60 rounded-3xl p-6 border border-slate-200/60 dark:border-zinc-800">
                  No Loops available
                </div>
              )
            ) : (
              <div className="-mx-4 loops-surface border-t loops-divider">
                {userPosts.map((post) => (
                  <LoopPostCard
                    key={post.id}
                    post={post}
                    authorProfile={profileUser}
                    currentUser={currentUser}
                    isFollowingAuthor={followedIds.includes(targetUid)}
                    canManage={isOwnProfile}
                    onToggleLike={handleToggleLikePost}
                    onToggleRepost={handleToggleRepost}
                    onOpenShare={(p) => setShareSheetTarget({ post: p })}
                    onCopyLink={(pid) => {
                      navigator.clipboard.writeText(`${getPublicShareOrigin()}/loops/post/${pid}`);
                      notify("Link copied to clipboard!", "success");
                    }}
                    onEditPost={(p) => navigate(`/loops/edit/${p.id}`)}
                    onDeletePost={handleDeleteProfilePost}
                    onRequireAuth={() => navigate("/signin")}
                  />
                ))}
              </div>
            )
          )}

          {activeTab === "reposts" && (
            repostedPosts.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500 bg-white/60 dark:bg-zinc-900/60 rounded-3xl p-6">
                No reposted Loops yet.
              </div>
            ) : (
              <div className="-mx-4 loops-surface border-t loops-divider">
                {repostedPosts.map((rPost) => (
                  <LoopPostCard
                    key={rPost.id}
                    post={rPost}
                    currentUser={currentUser}
                    isFollowingAuthor={Boolean(
                      rPost.reporterId && followedIds.includes(rPost.reporterId)
                    )}
                    repostedHeaderLabel={`${username || displayName} reposted`}
                    onToggleLike={handleToggleLikePost}
                    onToggleRepost={handleToggleRepost}
                    onOpenShare={(p) => setShareSheetTarget({ post: p })}
                    onCopyLink={(pid) => {
                      navigator.clipboard.writeText(`${getPublicShareOrigin()}/loops/post/${pid}`);
                      notify("Link copied to clipboard!", "success");
                    }}
                    onRequireAuth={() => navigate("/signin")}
                  />
                ))}
              </div>
            )
          )}

          {activeTab === "media" && (
            userMedia.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500 bg-white/60 dark:bg-zinc-900/60 rounded-3xl p-6">
                No media attachments found.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                {userMedia.map((mPost) => (
                  <div
                    key={mPost.id}
                    onClick={() => navigate(`/loops/post/${mPost.id}`)}
                    className="relative aspect-square rounded-none overflow-hidden bg-slate-100 dark:bg-zinc-800 cursor-pointer group"
                  >
                    {mPost.images?.[0] ? (
                      <SmoothImage
                        src={mPost.images[0]}
                        alt=""
                        wrapperClassName="w-full h-full min-h-0 rounded-none"
                        className="w-full h-full object-cover rounded-none group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === "replies" && (
            userComments.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500 bg-white/60 dark:bg-zinc-900/60 rounded-3xl p-6">
                No replies to display.
              </div>
            ) : (
              <div className="space-y-3">
                {userComments.map((comment) => (
                  <div
                    key={comment.id}
                    onClick={() => {
                      if (comment.postId) navigate(`/loops/post/${comment.postId}#comments`);
                    }}
                    className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-[24px] p-4 shadow-sm border border-slate-200/80 dark:border-zinc-800 space-y-2 cursor-pointer hover:border-slate-300 transition"
                  >
                    <div className="flex items-center gap-2">
                      <ProfileAvatar src={comment.userAvatar || avatarUrl} name={comment.userName || displayName} className="w-8 h-8" iconClassName="w-4 h-4" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{comment.userName || displayName}</p>
                        <p className="text-[10px] text-slate-400">{comment.createdAt ? formatDhakaFeedTime(comment.createdAt) : "Recently"}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-zinc-200 leading-relaxed font-medium">
                      {comment.text}
                    </p>
                    {comment.imageUrl && (
                      <SmoothImage
                        src={comment.imageUrl}
                        alt=""
                        wrapperClassName="max-w-[220px] min-h-[96px] mt-1 rounded-none"
                        className="max-h-36 rounded-none object-cover"
                      />
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* ALL PROFILE POPUPS UNIFIED TO POST CARD BOTTOM-SHEET DESIGN (LoopPostOptionsSheet) */}
      {typeof document !== "undefined" &&
        createPortal(
          <>
            {/* 1. PROFILE OPTIONS BOTTOM SHEET */}
            <AnimatePresence>
              {showOptionsSheet && (
                <div
                  className="fixed inset-0 z-[280] flex flex-col justify-end"
                  onClick={() => setShowOptionsSheet(false)}
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="fixed inset-0 bg-black/45 backdrop-blur-[1.5px]"
                  />

                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", stiffness: 390, damping: 34 }}
                    onClick={(e) => e.stopPropagation()}
                    className="loops-about-sheet relative z-[281] w-full max-w-lg mx-auto rounded-t-[32px] px-5 pt-3 pb-8 space-y-4 max-h-[88vh] overflow-y-auto overscroll-contain shadow-[0_-12px_40px_rgba(0,0,0,0.16)] border-t loops-divider"
                  >
                    <div className="w-11 h-1 rounded-full bg-zinc-400/75 dark:bg-zinc-600 mx-auto mb-1 shrink-0" />

                    <div className="space-y-1 pt-0.5">
                      <h3 className="text-[16.5px] font-bold text-[#0f0f0f] dark:text-white tracking-tight">
                        {isOwnProfile ? "Profile options" : `Options for ${displayName}`}
                      </h3>
                      {username && (
                        <p className="text-[14px] text-zinc-500 dark:text-zinc-400">
                          @{username.replace(/^@+/, "")}
                        </p>
                      )}
                    </div>

                    {/* Group 1: Own Profile Shortcuts OR Add to Feed */}
                    {isOwnProfile ? (
                      <div className="loops-about-card rounded-[22px] py-1.5 px-1.5 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setShowOptionsSheet(false);
                            navigate("/loops/profile/edit");
                          }}
                          className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                        >
                          <Pencil className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                          <span>Edit profile</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setShowOptionsSheet(false);
                            setShowNotifBellSheet(true);
                          }}
                          className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                        >
                          <Bell className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                          <span>Notification preferences</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setShowOptionsSheet(false);
                            navigate("/loops/saved");
                          }}
                          className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                        >
                          <BookOpen className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                          <span>Saved loops</span>
                        </button>
                      </div>
                    ) : (
                      <div className="loops-about-card rounded-[22px] py-1.5 px-1.5 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setShowOptionsSheet(false);
                            notify("Added profile updates to feed", "success");
                          }}
                          className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                        >
                          <Plus className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                          <span>Add to feed</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setShowOptionsSheet(false);
                            setShowNotifBellSheet(true);
                          }}
                          className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                        >
                          <Bell className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                          <span>Activity notifications</span>
                        </button>
                      </div>
                    )}

                    {/* Group 2: Share, Copy Link, QR Code, About */}
                    <div className="loops-about-card rounded-[22px] py-1.5 px-1.5 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          setShowOptionsSheet(false);
                          setShowQrModal(true);
                        }}
                        className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                      >
                        <QrCode className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                        <span>QR code</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          setShowOptionsSheet(false);
                          handleCopyProfileLink();
                        }}
                        className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                      >
                        <Link2 className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                        <span>Copy link</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          setShowOptionsSheet(false);
                          setShareSheetTarget({
                            url: profileShareUrl,
                            title: `Check out ${displayName} on Loops`,
                          });
                        }}
                        className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                      >
                        <ShareUploadBoxSvg className="w-[22px] h-[22px] text-[#0f0f0f] dark:text-white shrink-0" />
                        <span>Share profile</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          setShowOptionsSheet(false);
                          setShowAboutSheet(true);
                        }}
                        className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                      >
                        <Info className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                        <span>About this profile</span>
                      </button>
                    </div>

                    {/* Group 3: Mute, Restrict, Block, Report for Other Profiles */}
                    {!isOwnProfile && (
                      <div className="loops-about-card rounded-[22px] py-1.5 px-1.5 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setShowOptionsSheet(false);
                            const nowMuted = toggleMuteUserId(targetUid);
                            notify(
                              nowMuted ? `Muted ${displayName}` : `Unmuted ${displayName}`,
                              "info"
                            );
                          }}
                          className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                        >
                          <VolumeX className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                          <span>Mute</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setShowOptionsSheet(false);
                            const nowRestricted = toggleRestrictUserId(targetUid);
                            notify(
                              nowRestricted
                                ? `Restricted ${displayName}`
                                : `Unrestricted ${displayName}`,
                              "info"
                            );
                          }}
                          className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                        >
                          <Lock className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                          <span>Restrict</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setShowOptionsSheet(false);
                            const nowBlocked = toggleBlockUserId(targetUid);
                            notify(
                              nowBlocked
                                ? `Blocked ${displayName}`
                                : `Unblocked ${displayName}`,
                              "info"
                            );
                          }}
                          className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-rose-500/10 text-[16px] font-normal text-[#FF3040] cursor-pointer text-left transition"
                        >
                          <Shield className="w-[22px] h-[22px] stroke-[1.95] text-[#FF3040] shrink-0" />
                          <span>Block</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setShowOptionsSheet(false);
                            notify("Profile reported for review.", "info");
                          }}
                          className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-rose-500/10 text-[16px] font-normal text-[#FF3040] cursor-pointer text-left transition"
                        >
                          <ReportBubbleSvg className="w-[22px] h-[22px] text-[#FF3040] shrink-0" />
                          <span>Report</span>
                        </button>
                      </div>
                    )}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* 2. ABOUT THIS PROFILE BOTTOM SHEET */}
            <AnimatePresence>
              {showAboutSheet && (
                <div
                  className="fixed inset-0 z-[280] flex flex-col justify-end"
                  onClick={() => setShowAboutSheet(false)}
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="fixed inset-0 bg-black/45 backdrop-blur-[1.5px]"
                  />

                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", stiffness: 390, damping: 34 }}
                    onClick={(e) => e.stopPropagation()}
                    className="loops-about-sheet relative z-[281] w-full max-w-lg mx-auto rounded-t-[32px] px-5 pt-3 pb-8 space-y-4 max-h-[88vh] overflow-y-auto overscroll-contain shadow-[0_-12px_40px_rgba(0,0,0,0.16)] border-t loops-divider"
                  >
                    <div className="w-11 h-1 rounded-full bg-zinc-400/75 dark:bg-zinc-600 mx-auto mb-1 shrink-0" />

                    <div className="space-y-1 pt-0.5">
                      <h3 className="text-[16.5px] font-bold text-[#0f0f0f] dark:text-white tracking-tight">
                        About this profile
                      </h3>
                      <p className="text-[14.5px] leading-snug text-zinc-500 dark:text-zinc-400">
                        Verified account details and community activity on Loops.
                      </p>
                    </div>

                    <div className="loops-about-card rounded-[22px] p-4 space-y-4 divide-y loops-divider">
                      <div className="flex items-center justify-between gap-3 pb-3.5">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <UserIcon className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400">
                              Name
                            </p>
                            <p className="text-[15.5px] font-semibold text-[#0f0f0f] dark:text-white truncate">
                              {displayName}
                              {username ? ` (@${username.replace(/^@+/, "")})` : ""}
                            </p>
                          </div>
                        </div>
                        <ProfileAvatar
                          src={avatarUrl}
                          name={displayName}
                          className="w-11 h-11 shrink-0"
                          iconClassName="w-5 h-5"
                        />
                      </div>

                      <div className="flex items-start gap-3.5 py-3.5">
                        <Eye className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400">
                            Joined & activity
                          </p>
                          <p className="text-[15px] font-semibold text-[#0f0f0f] dark:text-white">
                            Joined{" "}
                            {profileUser?.createdAt
                              ? formatDhakaDateTime(profileUser.createdAt)
                              : "September 2026"}
                            {profileUser?.showRecentViews !== false
                              ? ` · ${(() => {
                                  const totalViews =
                                    Number(profileUser?.views || 0) +
                                    userPosts.reduce(
                                      (acc, p) => acc + Number(p.views || 0),
                                      0
                                    );
                                  return `${formatCompactNumber(totalViews)} recent views`;
                                })()}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3.5 pt-3.5">
                        <MapPin className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400">
                            Based in
                          </p>
                          <p className="text-[15px] font-semibold text-[#0f0f0f] dark:text-white">
                            {profileUser?.location ||
                              profileUser?.address ||
                              "Bangladesh"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="loops-about-card rounded-[22px] py-1.5 px-1.5">
                      <button
                        type="button"
                        onClick={() => setShowAboutSheet(false)}
                        className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                      >
                        <X className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                        <span>Close</span>
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* 3. PROFILE QR CODE BOTTOM SHEET */}
            <AnimatePresence>
              {showQrModal && (
                <div
                  className="fixed inset-0 z-[280] flex flex-col justify-end"
                  onClick={() => setShowQrModal(false)}
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="fixed inset-0 bg-black/45 backdrop-blur-[1.5px]"
                  />

                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", stiffness: 390, damping: 34 }}
                    onClick={(e) => e.stopPropagation()}
                    className="loops-about-sheet relative z-[281] w-full max-w-lg mx-auto rounded-t-[32px] px-5 pt-3 pb-8 space-y-4 max-h-[88vh] overflow-y-auto overscroll-contain shadow-[0_-12px_40px_rgba(0,0,0,0.16)] border-t loops-divider"
                  >
                    <div className="w-11 h-1 rounded-full bg-zinc-400/75 dark:bg-zinc-600 mx-auto mb-1 shrink-0" />

                    <div className="space-y-1 pt-0.5">
                      <h3 className="text-[16.5px] font-bold text-[#0f0f0f] dark:text-white tracking-tight">
                        Profile QR code
                      </h3>
                      <p className="text-[14.5px] text-zinc-500 dark:text-zinc-400">
                        {username
                          ? `Scan to follow @${username.replace(/^@+/, "")} on Loops`
                          : `Scan to follow ${displayName} on Loops`}
                      </p>
                    </div>

                    <div className="loops-about-card rounded-[22px] p-5 flex items-center justify-center">
                      <div className="bg-white p-3.5 rounded-[24px] border border-black/[0.06]">
                        <ScannableQRCodeCard
                          profileUrl={
                            getPublicShareOrigin() + "/loops/profile/" + targetUid
                          }
                          name={displayName}
                          username={username}
                          avatarUrl={avatarUrl}
                          footerLogo={footerLogo}
                          onCanvasReady={setQrDataUrl}
                        />
                      </div>
                    </div>

                    <div className="loops-about-card rounded-[22px] py-1.5 px-1.5 space-y-0.5">
                      <button
                        type="button"
                        onClick={handleDownloadQR}
                        className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                      >
                        <Download className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                        <span>Save QR image</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyProfileLink}
                        className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                      >
                        <Copy className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                        <span>Copy profile link</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowQrModal(false);
                          startCameraScanner();
                        }}
                        className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                      >
                        <Camera className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                        <span>Scan another QR code</span>
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* 4. AVATAR PREVIEW & PHOTO OPTIONS BOTTOM SHEET */}
            <AnimatePresence>
              {showAvatarViewerModal && (
                <div
                  className="fixed inset-0 z-[280] flex flex-col justify-end"
                  onClick={() => setShowAvatarViewerModal(false)}
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="fixed inset-0 bg-black/45 backdrop-blur-[1.5px]"
                  />

                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", stiffness: 390, damping: 34 }}
                    onClick={(e) => e.stopPropagation()}
                    className="loops-about-sheet relative z-[281] w-full max-w-lg mx-auto rounded-t-[32px] px-5 pt-3 pb-8 space-y-4 max-h-[88vh] overflow-y-auto overscroll-contain shadow-[0_-12px_40px_rgba(0,0,0,0.16)] border-t loops-divider"
                  >
                    <div className="w-11 h-1 rounded-full bg-zinc-400/75 dark:bg-zinc-600 mx-auto mb-1 shrink-0" />

                    <div className="space-y-0.5 pt-0.5">
                      <h3 className="text-[16.5px] font-bold text-[#0f0f0f] dark:text-white tracking-tight truncate">
                        {displayName}
                      </h3>
                      {username && (
                        <p className="text-[14px] text-zinc-500 dark:text-zinc-400 truncate">
                          @{username.replace(/^@+/, "")}
                        </p>
                      )}
                    </div>

                    <div className="loops-about-card rounded-[22px] p-5 flex items-center justify-center">
                      <div className="w-52 h-52 sm:w-60 sm:h-60 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-1 ring-black/[0.08] dark:ring-white/10 flex items-center justify-center">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserIcon className="w-20 h-20 text-zinc-400" />
                        )}
                      </div>
                    </div>

                    <div className="loops-about-card rounded-[22px] py-1.5 px-1.5 space-y-0.5">
                      {isOwnProfile && (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setShowAvatarViewerModal(false);
                            navigate("/loops/profile/edit");
                          }}
                          className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                        >
                          <Camera className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                          <span>Change profile photo</span>
                        </button>
                      )}

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            notify("Image saved to gallery", "success");
                            setShowAvatarViewerModal(false);
                          }}
                          className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                        >
                          <Download className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                          <span>Save photo</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          setShowAvatarViewerModal(false);
                          setShareSheetTarget({
                            url: profileShareUrl,
                            title: `Check out ${displayName} on Loops`,
                          });
                        }}
                        className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                      >
                        <ShareUploadBoxSvg className="w-[22px] h-[22px] text-[#0f0f0f] dark:text-white shrink-0" />
                        <span>Share profile</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleCopyProfileLink();
                          setShowAvatarViewerModal(false);
                        }}
                        className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                      >
                        <Link2 className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                        <span>Copy profile link</span>
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* 5. LIVE CAMERA QR SCANNER BOTTOM SHEET */}
            <AnimatePresence>
              {showScannerModal && (
                <div
                  className="fixed inset-0 z-[280] flex flex-col justify-end"
                  onClick={stopCameraScanner}
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="fixed inset-0 bg-black/45 backdrop-blur-[1.5px]"
                  />

                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", stiffness: 390, damping: 34 }}
                    onClick={(e) => e.stopPropagation()}
                    className="loops-about-sheet relative z-[281] w-full max-w-lg mx-auto rounded-t-[32px] px-5 pt-3 pb-8 space-y-4 max-h-[88vh] overflow-y-auto overscroll-contain shadow-[0_-12px_40px_rgba(0,0,0,0.16)] border-t loops-divider"
                  >
                    <div className="w-11 h-1 rounded-full bg-zinc-400/75 dark:bg-zinc-600 mx-auto mb-1 shrink-0" />

                    <div className="space-y-1 pt-0.5">
                      <h3 className="text-[16.5px] font-bold text-[#0f0f0f] dark:text-white tracking-tight">
                        Scan profile QR code
                      </h3>
                      <p className="text-[14px] text-zinc-500 dark:text-zinc-400">
                        Align a Loops QR code inside the camera frame to open their profile.
                      </p>
                    </div>

                    <div className="loops-about-card rounded-[22px] p-3">
                      <div className="relative w-full aspect-square max-w-[300px] mx-auto rounded-[18px] overflow-hidden bg-zinc-950 flex items-center justify-center">
                        <video
                          ref={videoScannerRef}
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-6 border-2 border-dashed border-white/75 rounded-2xl pointer-events-none" />
                      </div>
                    </div>

                    <div className="loops-about-card rounded-[22px] py-1.5 px-1.5">
                      <button
                        type="button"
                        onClick={stopCameraScanner}
                        className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                      >
                        <X className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                        <span>Close camera</span>
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* 6. ACTIVITY NOTIFICATIONS BOTTOM SHEET */}
            <AnimatePresence>
              {showNotifBellSheet && (
                <div
                  className="fixed inset-0 z-[280] flex flex-col justify-end"
                  onClick={() => setShowNotifBellSheet(false)}
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="fixed inset-0 bg-black/45 backdrop-blur-[1.5px]"
                  />

                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", stiffness: 390, damping: 34 }}
                    onClick={(e) => e.stopPropagation()}
                    className="loops-about-sheet relative z-[281] w-full max-w-lg mx-auto rounded-t-[32px] px-5 pt-3 pb-8 space-y-4 max-h-[88vh] overflow-y-auto overscroll-contain shadow-[0_-12px_40px_rgba(0,0,0,0.16)] border-t loops-divider"
                  >
                    <div className="w-11 h-1 rounded-full bg-zinc-400/75 dark:bg-zinc-600 mx-auto mb-1 shrink-0" />

                    <div className="space-y-1 pt-0.5">
                      <h3 className="text-[16.5px] font-bold text-[#0f0f0f] dark:text-white tracking-tight">
                        Activity notifications
                      </h3>
                      <p className="text-[14px] text-zinc-500 dark:text-zinc-400">
                        Manage alerts for{" "}
                        <span className="font-medium text-[#0f0f0f] dark:text-zinc-200">
                          {username ? `@${username.replace(/^@+/, "")}` : displayName}
                        </span>
                        .
                      </p>
                    </div>

                    <div className="loops-about-card rounded-[22px] py-1.5 px-1.5 space-y-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateProfileNotifPrefs({ threads: !notifPrefs.threads })
                        }
                        className="w-full flex items-center justify-between gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                      >
                        <span className="flex items-center gap-3.5">
                          <Bell className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                          <span>Loops</span>
                        </span>
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                            notifPrefs.threads
                              ? "bg-[#0f0f0f] dark:bg-white text-white dark:text-[#0f0f0f]"
                              : "border-2 border-zinc-300 dark:border-zinc-600"
                          }`}
                        >
                          {notifPrefs.threads && (
                            <Check className="w-3.5 h-3.5 stroke-[2.8]" />
                          )}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateProfileNotifPrefs({ replies: !notifPrefs.replies })
                        }
                        className="w-full flex items-center justify-between gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                      >
                        <span className="flex items-center gap-3.5">
                          <MessageCircle className="w-[22px] h-[22px] stroke-[1.95] text-[#0f0f0f] dark:text-white shrink-0" />
                          <span>Replies</span>
                        </span>
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                            notifPrefs.replies
                              ? "bg-[#0f0f0f] dark:bg-white text-white dark:text-[#0f0f0f]"
                              : "border-2 border-zinc-300 dark:border-zinc-600"
                          }`}
                        >
                          {notifPrefs.replies && (
                            <Check className="w-3.5 h-3.5 stroke-[2.8]" />
                          )}
                        </span>
                      </button>
                    </div>

                    <div className="loops-about-card rounded-[22px] py-1.5 px-1.5">
                      <div className="flex items-center justify-between gap-3.5 px-3.5 py-3.5">
                        <span className="flex items-center gap-3.5 text-[16px] font-normal text-[#0f0f0f] dark:text-white">
                          <BellRingIcon className="w-[22px] h-[22px] text-[#0f0f0f] dark:text-white shrink-0" />
                          <span>Push notifications</span>
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={notifPrefs.push}
                          onClick={() =>
                            updateProfileNotifPrefs({ push: !notifPrefs.push })
                          }
                          className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer shrink-0 ${
                            notifPrefs.push
                              ? "bg-[#0f0f0f] dark:bg-white"
                              : "bg-zinc-300 dark:bg-zinc-700"
                          }`}
                        >
                          <span
                            className={`absolute top-1 w-5 h-5 rounded-full transition-all shadow-xs ${
                              notifPrefs.push
                                ? "left-6 bg-white dark:bg-[#0f0f0f]"
                                : "left-1 bg-white"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* 7. USER TOPICS BOTTOM SHEET */}
            <AnimatePresence>
              {showTopicsSheet && (
                <div
                  className="fixed inset-0 z-[280] flex flex-col justify-end"
                  onClick={() => setShowTopicsSheet(false)}
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="fixed inset-0 bg-black/45 backdrop-blur-[1.5px]"
                  />

                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", stiffness: 390, damping: 34 }}
                    onClick={(e) => e.stopPropagation()}
                    className="loops-about-sheet relative z-[281] w-full max-w-lg mx-auto rounded-t-[32px] px-5 pt-3 pb-8 space-y-4 max-h-[88vh] overflow-y-auto overscroll-contain shadow-[0_-12px_40px_rgba(0,0,0,0.16)] border-t loops-divider"
                  >
                    <div className="w-11 h-1 rounded-full bg-zinc-400/75 dark:bg-zinc-600 mx-auto mb-1 shrink-0" />

                    <div className="space-y-1 pt-0.5">
                      <h3 className="text-[16.5px] font-bold text-[#0f0f0f] dark:text-white tracking-tight">
                        Topics that{" "}
                        {username ? username.replace(/^@+/, "") : displayName} loops about
                      </h3>
                    </div>

                    <div className="loops-about-card rounded-[22px] py-1.5 px-1.5 space-y-0.5">
                      {profileTopics.map((topic) => (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setShowTopicsSheet(false);
                            navigate(`/loops/search?q=${encodeURIComponent(topic)}`);
                          }}
                          className="w-full flex items-center justify-between gap-3.5 px-3.5 py-3.5 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[16px] font-normal text-[#0f0f0f] dark:text-white cursor-pointer text-left transition"
                        >
                          <span className="flex items-center gap-3.5">
                            <TopicClusterDotsIcon className="w-[20px] h-[20px] text-[#0095F6] shrink-0" />
                            <span>{topic}</span>
                          </span>
                          <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* 8. PROFILE LINKS BOTTOM SHEET (When >1 links added) */}
            <AnimatePresence>
              {showLinksSheet && (
                <div
                  className="fixed inset-0 z-[280] flex flex-col justify-end"
                  onClick={() => setShowLinksSheet(false)}
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="fixed inset-0 bg-black/45 backdrop-blur-[1.5px]"
                  />

                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", stiffness: 390, damping: 34 }}
                    onClick={(e) => e.stopPropagation()}
                    className="loops-about-sheet relative z-[281] w-full max-w-lg mx-auto rounded-t-[32px] px-5 pt-3 pb-8 space-y-4 max-h-[85vh] overflow-y-auto overscroll-contain shadow-[0_-12px_40px_rgba(0,0,0,0.16)] border-t loops-divider"
                  >
                    <div className="w-11 h-1 rounded-full bg-zinc-400/75 dark:bg-zinc-600 mx-auto mb-1 shrink-0" />

                    <div className="flex items-center justify-between gap-3 pt-0.5">
                      <h3 className="text-[16.5px] font-bold text-[#0f0f0f] dark:text-white tracking-tight">
                        Links
                      </h3>
                      {isOwnProfile && (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setShowLinksSheet(false);
                            navigate("/loops/profile/links", {
                              state: { from: "/loops/profile" },
                            });
                          }}
                          className="text-[13.5px] font-semibold text-[#0095F6] hover:opacity-80 cursor-pointer"
                        >
                          Edit links
                        </button>
                      )}
                    </div>

                    <div className="loops-about-card rounded-[22px] py-1.5 px-1.5 divide-y loops-divider">
                      {displayProfileLinks.map((lnk) => (
                        <div
                          key={lnk.id}
                          className="flex items-center justify-between gap-3 px-3.5 py-3"
                        >
                          <a
                            href={lnk.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => triggerHaptic()}
                            className="flex items-center gap-3 min-w-0 flex-1 group"
                          >
                            <div className="w-9 h-9 rounded-full bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center shrink-0">
                              <ProfileChainLinkSvg className="w-4 h-4 text-[#0f0f0f] dark:text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[15px] font-semibold text-[#0f0f0f] dark:text-white truncate group-hover:underline">
                                {lnk.title || lnk.cleanLabel}
                              </p>
                              {lnk.title && (
                                <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400 truncate">
                                  {lnk.cleanLabel}
                                </p>
                              )}
                            </div>
                            <ExternalLink className="w-4 h-4 text-zinc-400 shrink-0" />
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic();
                              navigator.clipboard
                                .writeText(lnk.href)
                                .catch(() => {});
                              notify("Link copied to clipboard", "success");
                            }}
                            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-500 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition cursor-pointer shrink-0"
                            aria-label="Copy link"
                            title="Copy link"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </>,
          document.body
        )}

      {/* SHARE SHEET (IMG_5099 — Supports both Profile Share & Post Share) */}
      <LiquidGlassShareModal
        isOpen={Boolean(shareSheetTarget)}
        post={shareSheetTarget?.post || {}}
        customShareUrl={shareSheetTarget?.url}
        customShareTitle={shareSheetTarget?.title}
        onClose={() => setShareSheetTarget(null)}
        onRepost={
          shareSheetTarget?.post?.id
            ? () => handleToggleRepost(shareSheetTarget.post as ScamPost)
            : undefined
        }
        onQuotePost={
          shareSheetTarget?.post?.id
            ? () =>
                navigate(
                  `/loops/create?quotePostId=${shareSheetTarget.post?.id}`
                )
            : undefined
        }
      />

      <NewsBottomDock />
    </div>
  );
};

