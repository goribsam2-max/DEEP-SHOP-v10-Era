import React, { useState, useEffect, useRef } from "react";
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
  collection,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { ScamPost } from "../types";
import { NewsPostMedia } from "../components/NewsPostMedia";
import { NewsRichText } from "../components/NewsRichText";
import { NewsBottomDock } from "../components/NewsBottomDock";
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
import { processCleanImage } from "../lib/watermark";
import defaultAvatarImg from "../src/assets/images/story_avatar_creator_1_1792826814910.jpg";
import deepShopLogoFallback from "../src/assets/images/deep_shop_logo_1783442733929.jpg";

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

  // Social Links Sub-Page Form State
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialTikTok, setSocialTikTok] = useState("");
  const [socialFacebook, setSocialFacebook] = useState("");
  const [socialYouTube, setSocialYouTube] = useState("");
  const [userComments, setUserComments] = useState<any[]>([]);
  const [socialWebsite, setSocialWebsite] = useState("");
  const [savingLinks, setSavingLinks] = useState(false);

  const videoScannerRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [liveFollowersCount, setLiveFollowersCount] = useState<number | null>(null);

  const targetUid = id || currentUser?.uid;
  const isOwnProfile = Boolean(currentUser?.uid && targetUid === currentUser.uid);

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

          setEditLinks(d.website || d.link || "");
          setEditPodcast(d.podcast || "");
          setEditShowInstagramBadge(d.showInstagramBadge !== false);
          setEditShowRecentViews(d.showRecentViews !== false);
          setEditIsPrivate(Boolean(d.isPrivate));
          setEditAvatarUrl(d.photoURL || d.shopLogo || "");

          if (d.socialLinks) {
            setSocialInstagram(d.socialLinks.instagram || "");
            setSocialTikTok(d.socialLinks.tiktok || "");
            setSocialFacebook(d.socialLinks.facebook || "");
            setSocialYouTube(d.socialLinks.youtube || "");
          }
          setSocialWebsite(d.website || d.link || "");
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
            .map((d) => ({ uid: d.id, ...d.data() }))
            .filter((u) => {
              const pCount = postingUsersMap.get(u.uid) || 0;
              return (
                u.uid !== currentUser?.uid &&
                u.uid !== targetUid &&
                pCount >= 1 &&
                !dismissedSuggested.includes(u.uid) &&
                (u.displayName || u.shopName)
              );
            })
            .slice(0, 8);
          setSuggestedProfiles(list);
        });
      })
      .catch(() => {});
  }, [currentUser?.uid, targetUid, dismissedSuggested]);

  // Save Social Links Handler
  const handleSaveSocialLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid) return;
    triggerHaptic();
    setSavingLinks(true);

    const updatePayload = {
      socialLinks: {
        instagram: socialInstagram.trim().replace(/^@/, ""),
        tiktok: socialTikTok.trim().replace(/^@/, ""),
        facebook: socialFacebook.trim(),
        youtube: socialYouTube.trim(),
      },
      website: socialWebsite.trim(),
      updatedAt: Date.now(),
    };

    try {
      await setDoc(doc(db, "users", currentUser.uid), updatePayload, { merge: true });
      notify("Links saved successfully!", "success");
      navigate("/news-hub/profile/edit");
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
      navigate("/news-hub/profile");
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

    const updatePayload = {
      displayName: editName.trim() || "Community Member",
      username: cleanedUsername,
      bio: editBio.trim(),
      location: editLocation.trim(),
      interests: cleanInterests.length > 0 ? cleanInterests : selectedInterestsList,
      website: editLinks.trim() || socialWebsite.trim(),
      podcast: editPodcast.trim(),
      showInstagramBadge: editShowInstagramBadge,
      showRecentViews: editShowRecentViews,
      isPrivate: editIsPrivate,
      photoURL: editAvatarUrl || "",
      updatedAt: Date.now(),
    };

    try {
      await setDoc(doc(db, "users", currentUser.uid), updatePayload, { merge: true });
      notify("Profile updated successfully!", "success");
      navigate("/news-hub/profile");
    } catch {
      notify("Could not update profile.", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // Avatar Image Picker
  const handleAvatarFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    triggerHaptic();

    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });

      const processed = await processCleanImage(dataUrl);
      setEditAvatarUrl(processed);
      notify("Photo updated!", "info");
    } catch {
      notify("Could not load selected photo", "error");
    }
    e.target.value = "";
  };

  // Repost Handler
  const handleToggleRepost = async (post: ScamPost) => {
    if (!currentUser?.uid) {
      notify("Please sign in to repost!", "error");
      navigate("/signin");
      return;
    }
    if (post.reporterId === currentUser.uid) {
      notify("You cannot repost your own post!", "info");
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
              fromUserName: "News Hub",
              fromUserUsername: "",
              fromUserAvatar: "",
              type: "milestone",
              milestoneKind: "reposts",
              totalCount: nextCount,
              title: "Congratulations! 🎉",
              body: `Congratulations! Your post now has ${nextCount.toLocaleString()} total reposts.`,
              mediaThumbnail: post.images?.[0] || "",
              targetId: post.id,
              isRead: false,
              read: false,
              createdAt: Date.now(),
              link: `/news-hub/post/${post.id}`,
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
            title: "New Repost",
            body: `reposted your post: "${(post.description || post.title || "").slice(0, 30)}..."`,
            mediaThumbnail: post.images?.[0] || "",
            targetId: post.id,
            isRead: false,
            read: false,
            createdAt: Date.now(),
            link: `/news-hub/post/${post.id}`,
          }).catch(() => {});
        }
      }

      notify(isReposted ? "Repost removed" : "Post reposted to your profile!", "success");
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
    const url = getPublicShareOrigin() + "/news-hub/profile/" + targetUid;
    navigator.clipboard.writeText(url);
    notify("Profile link copied to clipboard!", "success");
  };

  const displayName =
    profileUser?.displayName ||
    profileUser?.shopName ||
    (isOwnProfile ? currentUser?.displayName || "Community Member" : "User");

  const username = getSafePublicUsername(profileUser);

  const bio = profileUser?.bio || "No bio added yet.";
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
        <SEO title="Select Interests — News Hub" description="Choose topics you care about to customize your News Hub experience." />

        <div className="max-w-xl mx-auto px-4 pt-4 sm:pt-6">
          <header className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                navigate("/news-hub/profile");
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
                Selecting topics helps personalize your News Hub feed experience and highlights relevant updates.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================================
   * 2. LINKS SUB-PAGE VIEW (/news-hub/profile/links)
   * ========================================================================== */
  if (isLinksView) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans pb-24">
        <SEO title="Add Links — Edit Profile" description="Manage social IDs and profile links." />

        <div className="max-w-xl mx-auto px-4 pt-4 sm:pt-6">
          <header className="flex items-center justify-between pb-5 border-b border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                navigate("/news-hub/profile/edit");
              }}
              className="text-sm font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Social Links & IDs
            </h1>
            <button
              type="button"
              onClick={handleSaveSocialLinks}
              disabled={savingLinks}
              className="text-sm font-bold text-[#1877F2] hover:underline cursor-pointer disabled:opacity-50"
            >
              {savingLinks ? "Saving..." : "Done"}
            </button>
          </header>

          <form onSubmit={handleSaveSocialLinks} className="mt-6 space-y-4">
            <div className="bg-white dark:bg-zinc-900 rounded-[28px] p-5 border border-slate-200/80 dark:border-zinc-800 space-y-4 shadow-sm">
              <div className="space-y-1">
                <label className="font-bold text-xs text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <InstagramIcon className="w-4 h-4 text-pink-500" />
                  <span>Instagram Username</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-slate-400 font-bold text-xs">@</span>
                  <input
                    type="text"
                    value={socialInstagram}
                    onChange={(e) => setSocialInstagram(e.target.value)}
                    placeholder="username"
                    className="w-full h-11 pl-8 pr-4 rounded-xl bg-slate-50 dark:bg-zinc-800 text-xs font-semibold text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-700 outline-none focus:border-[#1877F2]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-xs text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <VideoIcon className="w-4 h-4 text-cyan-500" />
                  <span>TikTok Username</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-slate-400 font-bold text-xs">@</span>
                  <input
                    type="text"
                    value={socialTikTok}
                    onChange={(e) => setSocialTikTok(e.target.value)}
                    placeholder="username"
                    className="w-full h-11 pl-8 pr-4 rounded-xl bg-slate-50 dark:bg-zinc-800 text-xs font-semibold text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-700 outline-none focus:border-[#1877F2]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-xs text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <FacebookIcon className="w-4 h-4 text-blue-600" />
                  <span>Facebook Profile Link</span>
                </label>
                <input
                  type="url"
                  value={socialFacebook}
                  onChange={(e) => setSocialFacebook(e.target.value)}
                  placeholder="https://facebook.com/yourprofile"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800 text-xs font-semibold text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-700 outline-none focus:border-[#1877F2]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-xs text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <YoutubeIcon className="w-4 h-4 text-red-600" />
                  <span>YouTube Channel</span>
                </label>
                <input
                  type="url"
                  value={socialYouTube}
                  onChange={(e) => setSocialYouTube(e.target.value)}
                  placeholder="https://youtube.com/@channel"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800 text-xs font-semibold text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-700 outline-none focus:border-[#1877F2]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-xs text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-[#1877F2]" />
                  <span>Website URL</span>
                </label>
                <input
                  type="url"
                  value={socialWebsite}
                  onChange={(e) => setSocialWebsite(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800 text-xs font-semibold text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-700 outline-none focus:border-[#1877F2]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingLinks}
              className="w-full py-3.5 rounded-2xl bg-[#1877F2] text-white font-bold text-sm shadow-md cursor-pointer disabled:opacity-50"
            >
              {savingLinks ? "Saving links..." : "Save links"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ============================================================================
   * 3. EDIT PROFILE PAGE VIEW (/news-hub/profile/edit) — MATCHING IMG_4887.png
   * ========================================================================== */
  if (isEditView) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans pb-28">
        <SEO title="Edit Profile — News Hub" description="Edit your profile parameters." />

        <div className="max-w-xl mx-auto px-4 pt-4 sm:pt-6">
          <header className="flex items-center justify-between pb-5 border-b border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                navigate("/news-hub/profile");
              }}
              className="text-sm font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Edit profile
            </h1>
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={savingEdit}
              className="text-sm font-bold text-[#1877F2] hover:underline cursor-pointer disabled:opacity-50"
            >
              {savingEdit ? "Saving..." : "Done"}
            </button>
          </header>

          <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
            <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 border border-slate-200/80 dark:border-zinc-800 space-y-5 shadow-sm">
              {/* Name Row + Avatar Badge on the right */}
              <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-zinc-200">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Display Name"
                    className="w-full text-sm font-bold text-slate-900 dark:text-white bg-transparent outline-none"
                  />
                </div>

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
                  title="Change avatar"
                >
                  <ProfileAvatar src={editAvatarUrl} name={editName} className="w-12 h-12" iconClassName="w-6 h-6" />
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Camera className="w-4 h-4" />
                  </div>
                </button>
              </div>

              {/* Username */}
              <div className="pb-3 border-b border-slate-100 dark:border-zinc-800 space-y-1">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200">Username</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Set a username"
                  className="w-full text-sm font-semibold text-slate-900 dark:text-white bg-transparent outline-none"
                />
              </div>

              {/* Bio */}
              <div className="pb-3 border-b border-slate-100 dark:border-zinc-800 space-y-1">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200">Bio</label>
                <textarea
                  rows={2}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="+ Write bio"
                  className="w-full text-sm font-medium text-slate-800 dark:text-zinc-200 bg-transparent outline-none resize-none"
                />
              </div>

              {/* Location */}
              <div className="pb-3 border-b border-slate-100 dark:border-zinc-800 space-y-1">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200">Location</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="e.g. Dhaka, Bangladesh"
                  className="w-full text-sm font-medium text-slate-800 dark:text-zinc-200 bg-transparent outline-none"
                />
              </div>

              {/* Interests Navigates to Interests Sub-Page */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  navigate("/news-hub/profile/interests");
                }}
                className="w-full pb-3 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between text-left cursor-pointer"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Interests</p>
                  <p className="text-xs text-slate-400">
                    {selectedInterestsList.length > 0 ? selectedInterestsList.join(", ") : "+ Select interests & topics"}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Links -> Navigates to Links Sub-page */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  navigate("/news-hub/profile/links");
                }}
                className="w-full pb-3 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between text-left cursor-pointer"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Links</p>
                  <p className="text-xs text-slate-400">
                    {socialInstagram || socialTikTok || socialWebsite ? "Social IDs added" : "+ Add links & social IDs"}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Podcast */}
              <div className="pb-3 border-b border-slate-100 dark:border-zinc-800 space-y-1">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200">Podcast</label>
                <input
                  type="text"
                  value={editPodcast}
                  onChange={(e) => setEditPodcast(e.target.value)}
                  placeholder="+ Link to your podcast"
                  className="w-full text-sm font-medium text-slate-800 dark:text-zinc-200 bg-transparent outline-none"
                />
              </div>

              {/* Show Instagram badge toggle */}
              <div className="pb-3 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">Show Instagram badge</span>
                <button
                  type="button"
                  onClick={() => setEditShowInstagramBadge((v) => !v)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    editShowInstagramBadge ? "bg-black dark:bg-white" : "bg-slate-300 dark:bg-zinc-700"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full transition-transform ${
                      editShowInstagramBadge
                        ? "left-7 bg-white dark:bg-black"
                        : "left-1 bg-white"
                    }`}
                  />
                </button>
              </div>

              {/* Show recent views toggle */}
              <div className="pb-3 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Show recent views</p>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    This will be public on your profile when you get 1K+ recent views.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditShowRecentViews((v) => !v)}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                    editShowRecentViews ? "bg-black dark:bg-white" : "bg-slate-300 dark:bg-zinc-700"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full transition-transform ${
                      editShowRecentViews
                        ? "left-7 bg-white dark:bg-black"
                        : "left-1 bg-white"
                    }`}
                  />
                </button>
              </div>

              {/* Profile Privacy */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Profile privacy</p>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    If you switch to private, only followers can see your posts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditIsPrivate((v) => !v)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <span>{editIsPrivate ? "Private" : "Public"}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingEdit}
              className="w-full py-3.5 rounded-2xl bg-[#1877F2] text-white font-bold text-sm shadow-md cursor-pointer disabled:opacity-50"
            >
              {savingEdit ? "Saving profile..." : "Save changes"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ============================================================================
   * 4. MAIN PROFILE VIEW PAGE (Matching IMG_4885.png & IMG_4922.png)
   * ========================================================================== */
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#BCE0FD]/70 via-[#E8F3FF]/35 to-transparent dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans pb-32">
      <SEO
        title={
          username
            ? `${displayName} (@${username}) — News Hub`
            : `${displayName} — News Hub`
        }
        description={bio.slice(0, 160)}
      />

      <div className="max-w-3xl mx-auto px-4 pt-4 sm:pt-6">
        {/* Top Header Row with DEEP SHOP Logo & Action Buttons */}
        <header className="flex items-center justify-between gap-3 pb-4">
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              navigate("/news-hub");
            }}
            className="w-10 h-10 rounded-full bg-white/90 dark:bg-zinc-900/90 shadow-sm flex items-center justify-center text-zinc-800 dark:text-zinc-200 cursor-pointer active:scale-95 transition"
            aria-label="Back to Feed"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white shadow-sm ring-1 ring-slate-200/80 dark:ring-zinc-700 flex items-center justify-center">
              <img
                src={footerLogo}
                alt="DEEP SHOP"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = deepShopLogoFallback;
                }}
              />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              News Hub
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isOwnProfile && targetUid && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  if (!currentUser) {
                    notify("Please sign in to manage profile notifications", "info");
                    navigate("/signin");
                    return;
                  }
                  setShowNotifBellSheet(true);
                }}
                className={`w-10 h-10 rounded-full shadow-sm flex items-center justify-center cursor-pointer active:scale-95 transition ${
                  notifPrefs.push || notifPrefs.replies
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                    : "bg-white/90 dark:bg-zinc-900/90 text-zinc-800 dark:text-zinc-200"
                }`}
                aria-label="Activity notifications"
                title="Activity notifications"
              >
                {notifPrefs.push ? (
                  <BellRingIcon className="w-4 h-4" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setShowQrModal(true);
              }}
              className="w-10 h-10 rounded-full bg-white/90 dark:bg-zinc-900/90 shadow-sm flex items-center justify-center text-zinc-800 dark:text-zinc-200 cursor-pointer active:scale-95 transition"
              aria-label="Show QR Code"
              title="QR Code"
            >
              <QrCode className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setShowOptionsSheet(true);
              }}
              className="w-10 h-10 rounded-full bg-white/90 dark:bg-zinc-900/90 shadow-sm flex items-center justify-center text-zinc-800 dark:text-zinc-200 cursor-pointer active:scale-95 transition"
              aria-label="More options"
              title="Options"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Profile Card Header */}
        <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-[32px] p-5 sm:p-7 shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-white/80 dark:border-zinc-800 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
                {displayName}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                {username && (
                  <span className="text-sm font-semibold text-slate-500 dark:text-zinc-400">
                    @{username}
                  </span>
                )}

                {/* Social Badges / Pills */}
                {profileUser?.socialLinks?.instagram && (
                  <a
                    href={`https://instagram.com/${profileUser.socialLinks.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-600 dark:bg-pink-950/30 dark:text-pink-400 text-[11px] font-bold inline-flex items-center gap-1 hover:underline"
                  >
                    <InstagramIcon className="w-3 h-3" />
                    <span>@{profileUser.socialLinks.instagram}</span>
                  </a>
                )}
                {profileUser?.socialLinks?.tiktok && (
                  <a
                    href={`https://tiktok.com/@${profileUser.socialLinks.tiktok}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400 text-[11px] font-bold inline-flex items-center gap-1 hover:underline"
                  >
                    <VideoIcon className="w-3 h-3" />
                    <span>@{profileUser.socialLinks.tiktok}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Clickable Profile Avatar -> opens full screen viewer IMG_4923 */}
            <ProfileAvatar
              src={avatarUrl}
              name={displayName}
              onClick={() => {
                triggerHaptic();
                setShowAvatarViewerModal(true);
              }}
              className="w-20 h-20 sm:w-24 sm:h-24 ring-4 ring-white dark:ring-zinc-800 shadow-md cursor-pointer hover:opacity-90 transition"
              iconClassName="w-10 h-10"
            />
          </div>

          {/* Bio */}
          {bio && (
            <p className="text-sm sm:text-base text-slate-800 dark:text-zinc-200 leading-relaxed whitespace-pre-line">
              {bio}
            </p>
          )}

          {/* Selected Interest Badges (Matching IMG_4922_4f91a0b7.png) */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {selectedInterestsList.map((interest) => (
              <span
                key={interest}
                className="px-3.5 py-1.5 rounded-full bg-[#1877F2]/5 text-[#1877F2] dark:bg-[#1877F2]/10 dark:text-[#58A6FF] text-[11px] font-bold border border-[#1877F2]/20 flex items-center gap-1.5 shadow-2xs"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#1877F2] dark:bg-[#58A6FF]" />
                <span>{interest}</span>
              </span>
            ))}
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  navigate("/news-hub/profile/interests");
                }}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-[#1877F2] flex items-center justify-center border border-slate-200/80 dark:border-zinc-700 transition cursor-pointer"
                title="Edit interests"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
            <span>{formatCompactNumber(followersCount)} followers</span>
            {profileUser?.showRecentViews !== false && (
              <>
                <span>·</span>
                <span>
                  {(() => {
                    const totalViews =
                      Number(profileUser?.views || 0) +
                      userPosts.reduce((acc, p) => acc + Number(p.views || 0), 0);
                    return (
                      <span>
                        {formatCompactNumber(totalViews)} recent views
                      </span>
                    );
                  })()}
                </span>
              </>
            )}
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2 pt-1">
            {isOwnProfile ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    navigate("/news-hub/profile/edit");
                  }}
                  className="flex-1 h-11 rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-900 dark:text-white text-xs font-bold transition flex items-center justify-center cursor-pointer"
                >
                  Edit profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    navigate("/creator-dashboard");
                  }}
                  className="flex-1 h-11 rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-900 dark:text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <BarChart2 className="w-4 h-4 text-[#1877F2]" />
                  <span>View Insights</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyProfileLink}
                  className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-900 dark:text-white flex items-center justify-center shrink-0 cursor-pointer"
                  aria-label="Share Profile"
                >
                  <Share2 className="w-4 h-4" />
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
                  className={`flex-1 h-11 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    followedIds.includes(targetUid)
                      ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white"
                      : "bg-[#1877F2] text-white shadow-md hover:bg-[#166FE5]"
                  }`}
                >
                  {followedIds.includes(targetUid) ? (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    navigate(`/messages?uid=${targetUid}`);
                  }}
                  className="flex-1 h-11 rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-900 dark:text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-[#1877F2]" />
                  <span>Message</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyProfileLink}
                  className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-900 dark:text-white flex items-center justify-center shrink-0 cursor-pointer"
                  aria-label="Share Profile"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

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
                    onClick={() => navigate(`/news-hub/profile/${sProf.uid}`)}
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

        {/* Profile Tabs Bar (Posts, Replies, Media, Reposts) */}
        <div className="mt-6 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-around">
          {[
            { id: "posts", label: "Posts" },
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
                className={`py-3 px-4 text-xs sm:text-sm font-bold relative cursor-pointer transition-colors ${
                  isActive
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-400 dark:text-zinc-500 hover:text-slate-700"
                }`}
              >
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeProfileTabUnderline"
                    className="absolute bottom-0 inset-x-0 h-0.5 bg-slate-900 dark:bg-white rounded-full"
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
                      Start your first post
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
                            navigate(`/news-hub/create?text=${encodeURIComponent(suggestion)}`);
                          }}
                          className="px-5 py-3 rounded-full bg-white dark:bg-zinc-800 text-xs font-bold text-slate-900 dark:text-white border border-slate-200/80 dark:border-zinc-700 shadow-2xs whitespace-nowrap cursor-pointer hover:border-[#1877F2] transition"
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
                      navigate("/news-hub/create");
                    }}
                    className="w-full py-4 rounded-[20px] bg-black dark:bg-white text-white dark:text-black font-extrabold text-sm shadow-lg active:scale-[0.98] transition cursor-pointer"
                  >
                    Create post
                  </button>
                </div>
              ) : (
                <div className="text-center py-12 text-xs font-semibold text-slate-500 dark:text-zinc-400 bg-white/60 dark:bg-zinc-900/60 rounded-3xl p-6 border border-slate-200/60 dark:border-zinc-800">
                  No post available
                </div>
              )
            ) : (
              userPosts.map((post) => {
                const postReactionsTotal = post.reactionsCount
                  ? (Object.values(post.reactionsCount) as number[]).reduce(
                      (a, b) => a + (Number(b) || 0),
                      0
                    )
                  : Number(post.votes || 0);
                return (
                  <article
                    key={post.id}
                    onClick={() => navigate(`/news-hub/post/${post.id}`)}
                    className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-[28px] p-4 sm:p-5 shadow-sm border border-slate-200/80 dark:border-zinc-800 space-y-3 cursor-pointer hover:border-slate-300 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <ProfileAvatar src={avatarUrl} name={displayName} className="w-10 h-10" iconClassName="w-5 h-5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate text-slate-900 dark:text-white">{displayName}</p>
                        <p className="text-[11px] font-medium text-slate-500">{formatDhakaFeedTime(post.createdAt)}</p>
                      </div>
                    </div>

                    {post.description && (
                      <p className="text-sm text-slate-800 dark:text-zinc-200 leading-relaxed">
                        <NewsRichText text={post.description} />
                      </p>
                    )}

                    <NewsPostMedia post={post} onOpenImage={(idx) => navigate(`/news-hub/photo/${post.id}/${idx}`)} />

                    <div className="flex items-center gap-5 text-xs font-semibold text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        <span>{formatCompactNumber(postReactionsTotal)}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        <span>{formatCompactNumber(post.commentsCount || 0)}</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleRepost(post);
                        }}
                        className="flex items-center gap-1 hover:text-[#1877F2] cursor-pointer"
                      >
                        <RepeatIcon className="w-4 h-4" />
                        <span>{formatCompactNumber(post.repostsCount || 0)}</span>
                      </button>
                      {Boolean(
                        currentUser?.uid &&
                          (post.reporterId === currentUser.uid ||
                            (post as any).authorId === currentUser.uid)
                      ) && (
                        <span className="flex items-center gap-1 ml-auto" title="Only visible to you">
                          <Eye className="w-4 h-4" />
                          <span>{formatCompactNumber(post.views || 0)}</span>
                        </span>
                      )}
                    </div>
                  </article>
                );
              })
            )
          )}

          {activeTab === "reposts" && (
            repostedPosts.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500 bg-white/60 dark:bg-zinc-900/60 rounded-3xl p-6">
                No reposted posts yet.
              </div>
            ) : (
              repostedPosts.map((rPost) => (
                <article
                  key={rPost.id}
                  onClick={() => navigate(`/news-hub/post/${rPost.id}`)}
                  className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-[28px] p-4 sm:p-5 shadow-sm border border-slate-200/80 dark:border-zinc-800 space-y-3 cursor-pointer hover:border-slate-300 transition"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 pb-1 border-b border-slate-100 dark:border-zinc-800">
                    <RepeatIcon className="w-3.5 h-3.5 text-[#1877F2]" />
                    <span>{displayName} reposted</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <ProfileAvatar src={rPost.reporterAvatar} name={rPost.reporterName} className="w-10 h-10" iconClassName="w-5 h-5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate text-slate-900 dark:text-white">{rPost.reporterName}</p>
                      <p className="text-[11px] font-medium text-slate-500">{formatDhakaFeedTime(rPost.createdAt)}</p>
                    </div>
                  </div>

                  {rPost.description && (
                    <p className="text-sm text-slate-800 dark:text-zinc-200 leading-relaxed">
                      <NewsRichText text={rPost.description} />
                    </p>
                  )}

                  <NewsPostMedia post={rPost} onOpenImage={(idx) => navigate(`/news-hub/photo/${rPost.id}/${idx}`)} />
                </article>
              ))
            )
          )}

          {activeTab === "media" && (
            userMedia.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500 bg-white/60 dark:bg-zinc-900/60 rounded-3xl p-6">
                No media attachments found.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {userMedia.map((mPost) => (
                  <div
                    key={mPost.id}
                    onClick={() => navigate(`/news-hub/post/${mPost.id}`)}
                    className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 cursor-pointer group shadow-sm"
                  >
                    {mPost.images?.[0] ? (
                      <img src={mPost.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
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
                      if (comment.postId) navigate(`/news-hub/post/${comment.postId}#comments`);
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
                      <img src={comment.imageUrl} alt="" className="max-h-36 rounded-xl object-cover mt-1" />
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* OPTIONS SHEET (Matching IMG_4890.png) - High z-index z-[100] */}
      <AnimatePresence>
        {showOptionsSheet && (
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowOptionsSheet(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#F8FAFC] dark:bg-zinc-900 rounded-t-[36px] rounded-b-[32px] w-full max-w-md p-4 space-y-3 shadow-2xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden max-h-[85vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full mx-auto my-1" />

              {/* Group 1: Add to feed */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm border border-slate-200/60 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setShowOptionsSheet(false);
                    notify("Added profile updates to feed", "success");
                  }}
                  className="w-full p-4 text-left text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800"
                >
                  <span>Add to feed</span>
                  <Plus className="w-5 h-5 text-slate-700 dark:text-zinc-300" />
                </button>
              </div>

              {/* Group 2: QR code, Copy link, Share */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm border border-slate-200/60 dark:border-zinc-800 divide-y divide-slate-100 dark:divide-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setShowOptionsSheet(false);
                    setShowQrModal(true);
                  }}
                  className="w-full p-4 text-left text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800"
                >
                  <span>QR code</span>
                  <QrCode className="w-5 h-5 text-slate-700 dark:text-zinc-300" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setShowOptionsSheet(false);
                    handleCopyProfileLink();
                  }}
                  className="w-full p-4 text-left text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800"
                >
                  <span>Copy link</span>
                  <Link2 className="w-5 h-5 text-slate-700 dark:text-zinc-300" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setShowOptionsSheet(false);
                    handleCopyProfileLink();
                  }}
                  className="w-full p-4 text-left text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800"
                >
                  <span>Share</span>
                  <Share2 className="w-5 h-5 text-slate-700 dark:text-zinc-300" />
                </button>
              </div>

              {/* Group 3: About this profile */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm border border-slate-200/60 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setShowOptionsSheet(false);
                    setShowAboutSheet(true);
                  }}
                  className="w-full p-4 text-left text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800"
                >
                  <span>About this profile</span>
                  <Info className="w-5 h-5 text-slate-700 dark:text-zinc-300" />
                </button>
              </div>

              {/* Group 4: Mute, Restrict */}
              {!isOwnProfile && (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm border border-slate-200/60 dark:border-zinc-800 divide-y divide-slate-100 dark:divide-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setShowOptionsSheet(false);
                      notify(`Muted ${displayName}`, "info");
                    }}
                    className="w-full p-4 text-left text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800"
                  >
                    <span>Mute</span>
                    <VolumeX className="w-5 h-5 text-slate-700 dark:text-zinc-300" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setShowOptionsSheet(false);
                      notify(`Restricted ${displayName}`, "info");
                    }}
                    className="w-full p-4 text-left text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800"
                  >
                    <span>Restrict</span>
                    <Lock className="w-5 h-5 text-slate-700 dark:text-zinc-300" />
                  </button>
                </div>
              )}

              {/* Group 5: Block, Report */}
              {!isOwnProfile && (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm border border-slate-200/60 dark:border-zinc-800 divide-y divide-slate-100 dark:divide-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setShowOptionsSheet(false);
                      notify(`Blocked ${displayName}`, "info");
                    }}
                    className="w-full p-4 text-left text-sm font-bold text-rose-600 flex items-center justify-between cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <span>Block</span>
                    <Shield className="w-5 h-5 text-rose-600" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setShowOptionsSheet(false);
                      notify("Profile reported for review.", "info");
                    }}
                    className="w-full p-4 text-left text-sm font-bold text-rose-600 flex items-center justify-between cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <span>Report</span>
                    <Info className="w-5 h-5 text-rose-600" />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ABOUT THIS PROFILE SHEET (Matching IMG_4888.png) - High z-index z-[100] */}
      <AnimatePresence>
        {showAboutSheet && (
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowAboutSheet(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-t-[36px] rounded-b-[32px] w-full max-w-md p-6 space-y-5 shadow-2xl border border-slate-200 dark:border-zinc-800"
            >
              <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full mx-auto" />

              <h2 className="text-center text-base font-extrabold text-slate-900 dark:text-white">
                About this profile
              </h2>

              <div className="bg-slate-50 dark:bg-zinc-800/60 rounded-[24px] p-5 border border-slate-200/60 dark:border-zinc-700/60 space-y-4">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-zinc-700/60">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-500">Name</p>
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                      {displayName}{username ? ` (@${username})` : ""}
                    </p>
                  </div>
                  <ProfileAvatar src={avatarUrl} name={displayName} className="w-12 h-12" iconClassName="w-6 h-6" />
                </div>

                <div className="pb-3 border-b border-slate-200/60 dark:border-zinc-700/60">
                  <p className="text-xs font-bold text-slate-500">Joined & Activity</p>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Joined {profileUser?.createdAt ? formatDhakaDateTime(profileUser.createdAt) : "September 2026"}
                    {profileUser?.showRecentViews !== false
                      ? ` · ${(() => {
                          const totalViews =
                            Number(profileUser?.views || 0) +
                            userPosts.reduce((acc, p) => acc + Number(p.views || 0), 0);
                          return `${formatCompactNumber(totalViews)} recent views`;
                        })()}`
                      : ""}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-500">Based in</p>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {profileUser?.location || profileUser?.address || "Bangladesh"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAboutSheet(false)}
                className="w-full py-3.5 rounded-2xl bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold text-sm cursor-pointer"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR MODAL (Matching IMG_4891.png) - High z-index z-[110] */}
      <AnimatePresence>
        {showQrModal && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
            onClick={() => setShowQrModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#F8FAFC] dark:bg-zinc-900 rounded-[40px] w-full max-w-sm p-8 flex flex-col items-center text-center space-y-6 shadow-2xl relative border border-white/10"
            >
              <button
                onClick={() => setShowQrModal(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-200/50 dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Profile QR Code</h3>
                <p className="text-xs font-semibold text-slate-500">
                  {username ? `Scan to follow @${username}` : `Scan to follow ${displayName}`}
                </p>
              </div>

              <div className="bg-white p-4 rounded-[32px] shadow-sm border border-slate-200/60">
                <ScannableQRCodeCard
                  profileUrl={getPublicShareOrigin() + "/news-hub/profile/" + targetUid}
                  name={displayName}
                  username={username}
                  avatarUrl={avatarUrl}
                  footerLogo={footerLogo}
                  onCanvasReady={setQrDataUrl}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  type="button"
                  onClick={handleDownloadQR}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200/60 dark:border-zinc-700 shadow-sm hover:bg-slate-50 transition cursor-pointer"
                >
                  <Download className="w-5 h-5 text-[#1877F2]" />
                  <span className="text-[10px] font-bold">Download</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyProfileLink}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200/60 dark:border-zinc-700 shadow-sm hover:bg-slate-50 transition cursor-pointer"
                >
                  <Copy className="w-5 h-5 text-[#1877F2]" />
                  <span className="text-[10px] font-bold">Copy Link</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN AVATAR VIEWER MODAL (Matching IMG_4923.png) - High z-index z-[120] */}
      <AnimatePresence>
        {showAvatarViewerModal && (
          <div
            className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex flex-col"
            onClick={() => setShowAvatarViewerModal(false)}
          >
            <div className="flex items-center justify-between p-6 text-white pt-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-white/20 overflow-hidden bg-zinc-800">
                  <ProfileAvatar src={avatarUrl} name={displayName} className="w-full h-full" iconClassName="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{displayName}</p>
                  {username && (
                    <p className="text-[10px] text-zinc-400 font-semibold truncate">@{username}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAvatarViewerModal(false)}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="w-full max-w-lg aspect-square rounded-[40px] overflow-hidden bg-zinc-900 shadow-2xl border border-white/10 relative"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700">
                    <UserIcon className="w-32 h-32" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none" />
              </motion.div>
            </div>

            <div className="p-8 flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  notify("Image saved to gallery", "success");
                }}
                className="flex flex-col items-center gap-2 text-white/70 hover:text-white transition cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold">Save</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyProfileLink();
                }}
                className="flex flex-col items-center gap-2 text-white/70 hover:text-white transition cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold">Share</span>
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* LIVE CAMERA QR SCANNER MODAL */}
      <AnimatePresence>
        {showScannerModal && (
          <div className="fixed inset-0 z-[130] bg-black flex flex-col justify-between p-6">
            <div className="flex items-center justify-between text-white pt-2">
              <span className="text-sm font-bold">Point camera at a QR code</span>
              <button
                type="button"
                onClick={stopCameraScanner}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative w-full max-w-sm aspect-square mx-auto rounded-3xl overflow-hidden border-2 border-white/40 shadow-2xl flex items-center justify-center bg-zinc-900">
              <video ref={videoScannerRef} playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-8 border-2 border-dashed border-[#1877F2] rounded-2xl animate-pulse pointer-events-none" />
            </div>

            <div className="text-center text-white space-y-3 pb-4">
              <p className="text-xs text-zinc-300">Align QR code inside frame to visit profile</p>
              <button
                type="button"
                onClick={stopCameraScanner}
                className="px-6 py-3 rounded-full bg-white text-zinc-900 font-bold text-xs cursor-pointer"
              >
                Close Camera
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ACTIVITY NOTIFICATIONS BELL BOTTOM SHEET (Matching IMG_4968) */}
      <AnimatePresence>
        {showNotifBellSheet && (
          <div
            className="fixed inset-0 z-[125] bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowNotifBellSheet(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 370, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#F3F4F6] dark:bg-zinc-950 rounded-t-[34px] sm:rounded-[34px] p-5 pb-8 space-y-4 shadow-2xl border border-white/80 dark:border-zinc-800"
            >
              {/* Grab Handle */}
              <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto" />

              {/* Threads & Replies Checkmark Group */}
              <div className="rounded-[24px] bg-white dark:bg-zinc-900 divide-y divide-slate-100 dark:divide-zinc-800/80 overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() =>
                    updateProfileNotifPrefs({ threads: !notifPrefs.threads })
                  }
                  className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition cursor-pointer"
                >
                  <span className="text-[15.5px] font-semibold text-zinc-900 dark:text-white">
                    Threads
                  </span>
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                      notifPrefs.threads
                        ? "bg-black dark:bg-white text-white dark:text-black"
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
                  className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition cursor-pointer"
                >
                  <span className="text-[15.5px] font-semibold text-zinc-900 dark:text-white">
                    Replies
                  </span>
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                      notifPrefs.replies
                        ? "bg-black dark:bg-white text-white dark:text-black"
                        : "border-2 border-zinc-300 dark:border-zinc-600"
                    }`}
                  >
                    {notifPrefs.replies && (
                      <Check className="w-3.5 h-3.5 stroke-[2.8]" />
                    )}
                  </span>
                </button>
              </div>

              {/* Push Notifications Toggle Card */}
              <div className="space-y-2">
                <div className="rounded-[24px] bg-white dark:bg-zinc-900 px-5 py-4 flex items-center justify-between gap-3 shadow-2xs">
                  <span className="text-[15.5px] font-semibold text-zinc-900 dark:text-white">
                    Push notifications
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifPrefs.push}
                    onClick={() =>
                      updateProfileNotifPrefs({ push: !notifPrefs.push })
                    }
                    className={`relative w-13 h-7.5 rounded-full transition-colors cursor-pointer shrink-0 ${
                      notifPrefs.push
                        ? "bg-zinc-900 dark:bg-white"
                        : "bg-zinc-300 dark:bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-5.5 h-5.5 rounded-full transition-all shadow-xs ${
                        notifPrefs.push
                          ? "left-6.5 bg-white dark:bg-zinc-900"
                          : "left-1 bg-white"
                      }`}
                    />
                  </button>
                </div>

                <p className="px-2 text-[13px] text-zinc-500 dark:text-zinc-400">
                  You&apos;ll get activity notifications for{" "}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {username || displayName}
                  </span>
                  .
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <NewsBottomDock />
    </div>
  );
};

