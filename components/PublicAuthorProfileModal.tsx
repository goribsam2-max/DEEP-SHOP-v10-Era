import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CheckCircle2, 
  Star, 
  Heart, 
  MessageSquare, 
  Share2, 
  Send, 
  Award, 
  Sparkles, 
  Handshake, 
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  CreditCard,
  Building2
} from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { useNotify } from './Notifications';
import { triggerHaptic } from '../lib/haptics';
import { getSafeDisplayName, getSafePublicUsername } from '../lib/utils';

interface PublicAuthorProfileModalProps {
  userId: string | null;
  authorName?: string;
  authorAvatar?: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenGiftStars?: (targetUserId: string, targetName: string) => void;
}

export const PublicAuthorProfileModal: React.FC<PublicAuthorProfileModalProps> = ({
  userId,
  authorName = "Community Member",
  authorAvatar = "",
  isOpen,
  onClose,
  onOpenGiftStars
}) => {
  const notify = useNotify();
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  const [profileData, setProfileData] = useState<any>(null);
  const [authorPosts, setAuthorPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const fetchAuthorInfo = async () => {
      setLoading(true);
      try {
        // Fetch user doc
        const userDocRef = doc(db, "users", userId);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          setProfileData(snap.data());
        } else {
          setProfileData(null);
        }

        // Fetch posts by this author
        const q = query(collection(db, "scam_posts"), where("reporterId", "==", userId));
        const postsSnap = await getDocs(q);
        const postsList: any[] = [];
        postsSnap.forEach((d) => postsList.push({ id: d.id, ...d.data() }));
        setAuthorPosts(postsList);
      } catch (err) {
        console.warn("Could not load public profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAuthorInfo();
  }, [isOpen, userId]);

  const displayName = getSafeDisplayName(profileData, authorName || "Community Member");
  const avatar = profileData?.photoURL || authorAvatar;
  const username = getSafePublicUsername(profileData);
  const bio = profileData?.bio || "";
  const starsReceived = profileData?.earnedStars || profileData?.purchasedStars || profileData?.stars || 0;
  const likesReceived = profileData?.totalLikes || authorPosts.reduce((acc, p) => acc + (p.votes || 0), 0);
  const postsCount = authorPosts.length;



  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-5 ds-liquid-backdrop overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0, scale: 0.91, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.85 }}
          onClick={(e) => e.stopPropagation()}
          className="ds-liquid-glass-popup w-full max-w-[400px] overflow-hidden relative my-auto"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-md hover:bg-black/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Cover Header Banner */}
          <div className="h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.25),transparent_70%)]" />
          </div>

          {/* Card Body Container */}
          <div className="px-5 pb-6 pt-0 relative space-y-4">
            {/* Centered Avatar Image (Overlapping banner matching IMG_4750.webp) */}
            <div className="flex justify-center -mt-12 relative z-10">
              <div className="relative">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={displayName}
                    className="w-22 h-22 rounded-full object-cover border-4 border-white dark:border-zinc-950 shadow-xl"
                  />
                ) : (
                  <div className="w-22 h-22 rounded-full bg-zinc-200 dark:bg-zinc-800 border-4 border-white dark:border-zinc-950 shadow-xl flex items-center justify-center text-2xl font-extrabold text-zinc-700 dark:text-zinc-200">
                    {(displayName || "M").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-blue-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center text-white">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Profile Title & Handle */}
            <div className="text-center space-y-1">
              <h2 className="text-lg font-black text-zinc-900 dark:text-white flex items-center justify-center gap-1.5">
                <span>{displayName}</span>
                <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500 text-white inline" />
              </h2>
              {username && (
                <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                  @{username}
                </p>
              )}
              {bio && (
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed px-2 pt-1">
                  {bio}
                </p>
              )}
            </div>

            {/* XP / Stars Level Badge Pill */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 shadow-2xs">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>Deep Creator • {starsReceived.toLocaleString()} Stars</span>
              </div>
            </div>

            {/* Metrics Card with Vertical Dividers (Exact match to IMG_4750.webp) */}
            <div className="grid grid-cols-3 divide-x divide-zinc-200 dark:divide-zinc-800 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 p-3 text-center border border-zinc-200/80 dark:border-zinc-800">
              <div className="px-1">
                <span className="block text-sm font-black text-zinc-900 dark:text-white">
                  {likesReceived >= 1000 ? `${(likesReceived / 1000).toFixed(1)}k` : likesReceived}
                </span>
                <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Likes
                </span>
              </div>
              <div className="px-1">
                <span className="block text-sm font-black text-zinc-900 dark:text-white">
                  {postsCount}
                </span>
                <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Posts
                </span>
              </div>
              <div className="px-1">
                <span className="block text-sm font-black text-amber-500 font-mono">
                  {starsReceived >= 1000 ? `${(starsReceived / 1000).toFixed(1)}k` : starsReceived} ⭐
                </span>
                <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Gifted
                </span>
              </div>
            </div>

            {/* Interest Tags Pill Badges */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              {["📱 Mobile Tech", "🛡️ Scam Defense", "⚡ News Reporter", "🛒 Smart Devices"].map((tag, i) => (
                <span
                  key={i}
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/70 dark:border-zinc-700/60"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Primary Action Buttons: Message, Sponsor & Gift Stars */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onClose();
                  navigate(`/messages?uid=${encodeURIComponent(userId || "")}`);
                }}
                className="min-h-[42px] px-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold text-xs transition active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span>Message</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onClose();
                  navigate(`/sponsor/${encodeURIComponent(userId || "creator")}`);
                }}
                className="min-h-[42px] px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Handshake className="w-3.5 h-3.5 shrink-0" />
                <span>Sponsor</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  onClose();
                  if (onOpenGiftStars && userId) {
                    onOpenGiftStars(userId, displayName);
                  } else {
                    navigate(`/gift-stars/${encodeURIComponent(userId || "creator")}`);
                  }
                }}
                className="min-h-[42px] px-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 fill-white shrink-0" />
                <span>Gift Star</span>
              </button>
            </div>

            {/* Author Posts Preview List */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                <span>Recent Posts ({postsCount})</span>
                <span className="text-[10px] text-zinc-400">Verified Activity</span>
              </h4>

              {loading ? (
                <div className="space-y-2 py-1" aria-hidden="true">
                  {[0, 1, 2].map((idx) => (
                    <div key={idx} className="p-2.5 rounded-2xl bg-white/50 dark:bg-white/5 space-y-2">
                      <div className="h-3.5 w-3/4 rounded-md ds-skeleton" />
                      <div className="flex justify-between">
                        <div className="h-2.5 w-20 rounded-md ds-skeleton" />
                        <div className="h-2.5 w-16 rounded-md ds-skeleton" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : authorPosts.length === 0 ? (
                <div className="p-3 text-center rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
                  No public scam reports posted yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {authorPosts.slice(0, 3).map((p) => {
                    const combinedReactions = p.reactionsCount
                      ? (Object.values(p.reactionsCount) as number[]).reduce(
                          (a, b) => a + (Number(b) || 0),
                          0
                        )
                      : Number(p.votes || 0);
                    return (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 text-xs space-y-1 hover:border-zinc-300 dark:hover:border-zinc-700 transition"
                      >
                        <h5 className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {p.title || p.description || "Post"}
                        </h5>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                          <span>{p.category ? p.category.replace(/_/g, ' ') : 'Post'}</span>
                          <span className="font-mono text-rose-500 font-bold">{combinedReactions.toLocaleString()} reactions</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PublicAuthorProfileModal;
