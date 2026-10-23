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
  ThunbsUp,
  CreditCard,
  Building2
} from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNotify } from './Notifications';
import { triggerHaptic } from '../lib/haptics';

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
  authorAvatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
  isOpen,
  onClose,
  onOpenGiftStars
}) => {
  const notify = useNotify();
  const currentUser = auth.currentUser;

  const [profileData, setProfileData] = useState<any>(null);
  const [authorPosts, setAuthorPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [sponsorAmount, setSponsorAmount] = useState("500");
  const [sponsorPhone, setSponsorPhone] = useState("");
  const [sponsorTxId, setSponsorTxId] = useState("");

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

  const displayName = profileData?.displayName || authorName || "Community Member";
  const avatar = profileData?.photoURL || authorAvatar;
  const username = profileData?.username || profileData?.email?.split('@')[0] || displayName.toLowerCase().replace(/\s+/g, '_');
  const bio = profileData?.bio || "Verified Community Creator & Scam Reporter on Deep Shop.";
  const starsReceived = profileData?.earnedStars || profileData?.sparks || 1280;
  const likesReceived = profileData?.totalLikes || authorPosts.reduce((acc, p) => acc + (p.votes || 0), 0) + 2450;
  const postsCount = authorPosts.length > 0 ? authorPosts.length : 12;

  const handleSponsorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      notify("Please sign in to sponsor creators!", "error");
      return;
    }
    if (!sponsorPhone || !sponsorTxId) {
      notify("Please provide your bKash/Nagad phone number and Transaction ID", "error");
      return;
    }

    try {
      await addDoc(collection(db, "sponsor_requests"), {
        sponsorUserId: currentUser.uid,
        sponsorName: currentUser.displayName || currentUser.email?.split('@')[0] || "Supporter",
        creatorUserId: userId,
        creatorName: displayName,
        amountBDT: Number(sponsorAmount),
        phone: sponsorPhone,
        txId: sponsorTxId,
        status: "pending",
        createdAt: Date.now()
      });

      triggerHaptic();
      notify(`Sponsorship request of ৳${sponsorAmount} sent to Admin for verification!`, "success");
      setShowSponsorModal(false);
      setSponsorPhone("");
      setSponsorTxId("");
    } catch (err) {
      notify("Failed to submit sponsorship request", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative text-zinc-900 dark:text-zinc-100 my-auto"
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
                <img
                  src={avatar}
                  alt={displayName}
                  className="w-22 h-22 rounded-full object-cover border-4 border-white dark:border-zinc-950 shadow-xl"
                />
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
              <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                @{username}
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed px-2 pt-1">
                {bio}
              </p>
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

            {/* Primary Action Buttons: Sponsor & Gift Stars */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSponsorModal(true)}
                className="py-2.5 px-3 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Handshake className="w-4 h-4" />
                <span>Sponsor Creator</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenGiftStars && userId) {
                    onClose();
                    onOpenGiftStars(userId, displayName);
                  } else {
                    notify("Open comments to gift stars directly!", "info");
                  }
                }}
                className="py-2.5 px-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Star className="w-4 h-4 fill-white" />
                <span>Gift Stars ⭐</span>
              </button>
            </div>

            {/* Author Posts Preview List */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                <span>Recent Posts ({postsCount})</span>
                <span className="text-[10px] text-zinc-400">Verified Activity</span>
              </h4>

              {loading ? (
                <p className="text-xs text-zinc-400 text-center py-4">Loading posts...</p>
              ) : authorPosts.length === 0 ? (
                <div className="p-3 text-center rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
                  No public scam reports posted yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {authorPosts.slice(0, 3).map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 text-xs space-y-1 hover:border-zinc-300 dark:hover:border-zinc-700 transition"
                    >
                      <h5 className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {p.title}
                      </h5>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                        <span>{p.category ? p.category.replace(/_/g, ' ') : 'Scam Report'}</span>
                        <span className="font-mono text-rose-500 font-bold">{p.votes || 0} votes</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* SPONSOR CREATOR PAYMENT MODAL */}
      <AnimatePresence>
        {showSponsorModal && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4 text-zinc-900 dark:text-zinc-100"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Handshake className="w-5 h-5 text-emerald-500" />
                  <span className="font-extrabold text-sm">Sponsor {displayName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSponsorModal(false)}
                  className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Support this creator monthly. Send payment via bKash / Nagad and provide your Transaction ID below.
              </p>

              <form onSubmit={handleSponsorSubmit} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block mb-1">
                    Monthly Sponsorship Tier (BDT)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["200", "500", "1000"].map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setSponsorAmount(tier)}
                        className={`py-2 rounded-xl text-xs font-bold transition ${
                          sponsorAmount === tier
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        ৳{tier}/mo
                      </button>
                    ))}
                  </div>
                </div>

                {/* Official Payment Number instructions */}
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-xs space-y-1 font-mono">
                  <span className="text-[10px] font-sans font-bold text-emerald-800 dark:text-emerald-300 block">
                    bKash / Nagad Personal Number:
                  </span>
                  <strong className="text-emerald-600 dark:text-emerald-400 text-sm block">01812345678</strong>
                  <span className="text-[10px] font-sans text-zinc-500 block">
                    Send Money ৳{sponsorAmount} then enter details:
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block mb-1">
                    Your Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="017XXXXXXXX"
                    value={sponsorPhone}
                    onChange={(e) => setSponsorPhone(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block mb-1">
                    Transaction ID (TrxID)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9J283HX10"
                    value={sponsorTxId}
                    onChange={(e) => setSponsorTxId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none font-medium font-mono"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition active:scale-95 cursor-pointer"
                >
                  Confirm Sponsorship Request
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};

export default PublicAuthorProfileModal;
