import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Check,
  CheckCircle2,
  Star,
  Heart,
  MessageCircle,
  Share2,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  Handshake,
  Download,
  Flame,
  X,
  CreditCard
} from "lucide-react";
import { doc, getDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNotify } from "../components/Notifications";
import { triggerHaptic } from "../lib/haptics";
import SEO from "../components/SEO";
import { GiftStarsModal } from "../components/GiftStarsModal";

// Seed fallback data matching user's demo image IMG_4750.webp
const DEMO_STORIES: any[] = [];

const INTERESTS = [
  { label: "Cooking", icon: "🍲" },
  { label: "Movies", icon: "🎬" },
  { label: "Fitness", icon: "🏋️" },
  { label: "Reading", icon: "📖" },
  { label: "Travel", icon: "✈️" },
  { label: "Scam Defense", icon: "🛡️" },
  { label: "Tech News", icon: "📱" }
];

export const AuthorProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notify = useNotify();

  const [author, setAuthor] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showStoryMode, setShowStoryMode] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);

  // Modals
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [sponsorAmount, setSponsorAmount] = useState("500");
  const [sponsorPhone, setSponsorPhone] = useState("");
  const [sponsorTxId, setSponsorTxId] = useState("");

  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchAuthor = async () => {
      setLoading(true);
      try {
        if (id) {
          const userSnap = await getDoc(doc(db, "users", id));
          if (userSnap.exists()) {
            setAuthor({ id: userSnap.id, ...userSnap.data() });
          } else {
            // Check local fallback
            setAuthor({
              id: id || "author_demo",
              displayName: "User",
              username: "user",
              photoURL: "",
              coverImage: "",
              bio: "",
              earnedStars: 0,
              xp: 0,
              totalXp: 100,
              likes: 0,
              messages: 0
            });
          }

          // Fetch posts by author
          const q = query(collection(db, "scam_posts"), where("reporterId", "==", id));
          const postsSnap = await getDocs(q);
          const list: any[] = [];
          postsSnap.forEach((d) => list.push({ id: d.id, ...d.data() }));
          if (list.length > 0) {
            setPosts(list);
          } else {
            setPosts([]);
          }
        }
      } catch (err) {
        console.warn("Could not load author details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAuthor();
  }, [id]);

  const [followerCount, setFollowerCount] = useState<number>(0);

  useEffect(() => {
    if (!id || !author) return;
    try {
      const savedFollows: string[] = JSON.parse(localStorage.getItem("followed_creators") || "[]");
      const isF = savedFollows.includes(id);
      setIsFollowing(isF);

      // Use database count if available, otherwise 0
      setFollowerCount(author.followersCount || (author.followers ? author.followers.length : 0));
    } catch (e) {}
  }, [id, author]);

  const handleFollowToggle = async () => {
    if (!author || !currentUser) {
      notify("Please sign in to follow creators!", "error");
      return;
    }
    triggerHaptic();
    const authorId = id || "author_demo";
    try {
      const savedFollows: string[] = JSON.parse(localStorage.getItem("followed_creators") || "[]");
      const isNowFollowing = !isFollowing;
      setIsFollowing(isNowFollowing);

      let updatedList: string[];
      if (isNowFollowing) {
        updatedList = Array.from(new Set([...savedFollows, authorId]));
        setFollowerCount(prev => prev + 1);
        notify(`Now following @${author?.username || "creator"}!`, "success");
        // In a real app, you'd update the Firestore followers collection/count here
      } else {
        updatedList = savedFollows.filter((i) => i !== authorId);
        setFollowerCount(prev => Math.max(0, prev - 1));
        notify(`Unfollowed @${author?.username || "creator"}`, "info");
      }
      localStorage.setItem("followed_creators", JSON.stringify(updatedList));
    } catch (e) {}
  };

  const handleSponsorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      notify("Please sign in to sponsor creators!", "error");
      return;
    }
    if (!sponsorPhone || !sponsorTxId) {
      notify("Please provide phone and TrxID", "error");
      return;
    }

    try {
      await addDoc(collection(db, "sponsor_requests"), {
        sponsorUserId: currentUser.uid,
        sponsorName: currentUser.displayName || currentUser.email?.split("@")[0] || "Supporter",
        creatorUserId: id,
        creatorName: author?.displayName || "Creator",
        amountBDT: Number(sponsorAmount),
        phone: sponsorPhone,
        txId: sponsorTxId,
        status: "pending",
        createdAt: Date.now()
      });

      triggerHaptic();
      notify(`Sponsorship request of ৳${sponsorAmount} submitted to Admin!`, "success");
      setShowSponsorModal(false);
      setSponsorPhone("");
      setSponsorTxId("");
    } catch (err) {
      notify("Failed to submit request", "error");
    }
  };

  if (loading || !author) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-zinc-500">Loading creator profile...</p>
      </div>
    );
  }

  const handle = author.username || author.email?.split("@")[0] || author.displayName?.toLowerCase().replace(/\s+/g, "") || "user";
  const xp = author.xp || 0;
  const totalXp = author.totalXp || 100;
  const likesCount = author.likes || (posts.reduce((acc, p) => acc + (p.votes || 0), 0));
  const messagesCount = author.messages || 0;
  const giftedStars = author.earnedStars || 0;

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans pb-24 selection:bg-blue-600 selection:text-white">
      <SEO
        title={`@${handle} • Creator Profile • DEEP SHOP`}
        description={author.bio || `Profile of @${handle} on DEEP SHOP.`}
      />

      {/* TOP FLOATING NAVIGATION BAR (Exact match to IMG_4750.webp) */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md px-4 h-14 sm:h-16 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition active:scale-95 cursor-pointer shadow-xs"
          title="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          {/* Top Right '+' Follow / Add button from IMG_4750.webp */}
          <button
            type="button"
            onClick={handleFollowToggle}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer shadow-md ${
              isFollowing
                ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                : "bg-black dark:bg-white text-white dark:text-black hover:opacity-90"
            }`}
            title={isFollowing ? "Following" : "Follow Creator"}
          >
            {isFollowing ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 stroke-[2.5]" />}
          </button>
        </div>
      </header>

      {/* MAIN PROFILE CANVAS (EXACT MATCH TO IMG_4750.webp LAYOUT) */}
      <main className="max-w-md mx-auto px-4 pt-3 sm:pt-5 space-y-5">
        {/* SCENIC ARTWORK / COVER (Exact match to the hill with tree / portrait from IMG_4750.webp) */}
        <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-950 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex items-center justify-center group">
          <img
            src={
              author.coverImage ||
              "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1000&auto=format&fit=crop&q=80"
            }
            alt={author.displayName}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />

          {/* Artistic vignette gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent dark:from-black dark:via-transparent dark:to-transparent pointer-events-none" />

          {/* Centered Avatar pill badge if cover is landscape */}
          <div className="absolute bottom-3 left-4 flex items-center gap-2.5">
            <img
              src={author.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"}
              alt=""
              className="w-14 h-14 rounded-2xl object-cover border-2 border-white dark:border-black shadow-lg"
            />
            <div className="bg-white/95 dark:bg-black/95 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-xs border border-zinc-200 dark:border-zinc-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 fill-blue-500 text-white" /> Verified Creator
              </span>
            </div>
          </div>
        </div>

        {/* HANDLE & XP / LEVEL BADGE ROW (Exact match to IMG_4750.webp) */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="space-y-0.5 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-white truncate">
              @{handle}
            </h1>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {author.bio || "You're on your way!"}
            </p>
          </div>

          {/* XP Badge Pill (⭐ 140 / 500 XP from IMG_4750.webp) */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 shadow-xs whitespace-nowrap shrink-0">
            <Star className="w-3.5 h-3.5 fill-blue-500 text-blue-500" />
            <span>{xp} / {totalXp} XP</span>
          </div>
        </div>

        {/* OPEN FULL STORY MODE ACTION BUTTON (Exact match to black pill in IMG_4750.webp) */}
        <button
          type="button"
          onClick={() => setShowStoryMode(true)}
          className="w-full py-3.5 rounded-full bg-black dark:bg-white text-white dark:text-black font-extrabold text-xs shadow-md hover:opacity-90 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Open full story mode</span>
        </button>

        {/* STATS DIVIDER CARD: Followers | Likes | Gifted (Exact match to IMG_4750.webp) */}
        <div className="bg-zinc-50/90 dark:bg-zinc-900/80 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
          <div className="grid grid-cols-3 divide-x divide-zinc-200 dark:divide-zinc-800 text-center">
            <div className="px-2">
              <span className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Followers
              </span>
              <span className="text-base sm:text-lg font-black text-zinc-900 dark:text-white block mt-0.5">
                {followerCount.toLocaleString()}
              </span>
            </div>

            <div className="px-2">
              <span className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Likes
              </span>
              <span className="text-base sm:text-lg font-black text-zinc-900 dark:text-white block mt-0.5">
                {likesCount.toLocaleString()}
              </span>
            </div>

            <div className="px-2">
              <span className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Gifted
              </span>
              <span className="text-base sm:text-lg font-black text-amber-500 block mt-0.5 font-mono">
                {giftedStars.toLocaleString()} ⭐
              </span>
            </div>
          </div>
        </div>

        {/* INTERESTS PILLS SECTION (Exact match to IMG_4750.webp) */}
        <div className="space-y-2.5 pt-1">
          <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white tracking-wide">
            Interests
          </h3>

          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60 shadow-2xs whitespace-nowrap"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* DYNAMIC ACTION BUTTONS: SPONSOR & GIFT STARS */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              navigate(`/sponsor/${id || "author_demo"}`);
            }}
            className="py-3 px-3 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-extrabold text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Handshake className="w-4 h-4" />
            <span>Sponsor Creator</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              navigate(`/gift-stars/${id || "author_demo"}`);
            }}
            className="py-3 px-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-white font-extrabold text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Star className="w-4 h-4 fill-white" />
            <span>Gift Stars ⭐</span>
          </button>
        </div>

        {/* RECENT STORIES CAROUSEL */}
        {DEMO_STORIES.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white tracking-wide">
              Featured Stories
            </h3>
            <span className="text-[11px] font-semibold text-zinc-400">
              Visual Highlights
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {DEMO_STORIES.slice(0, 2).map((story, i) => (
              <div
                key={story.id}
                onClick={() => {
                  setActiveStoryIndex(i);
                  setShowStoryMode(true);
                }}
                className="group cursor-pointer space-y-1.5"
              >
                <div className="w-full aspect-[3/4] rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm relative">
                  <img
                    src={story.image}
                    alt={story.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                </div>
                <h4 className="font-extrabold text-xs text-zinc-900 dark:text-white truncate">
                  {story.title}
                </h4>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                  {story.subtitle}
                </p>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* VERIFIED INCIDENT REPORTS & POSTS */}
        <div className="space-y-3 pt-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white tracking-wide flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Verified Reports ({posts.length})</span>
            </h3>
            <span className="text-[11px] text-zinc-400">Deep Shop Archive</span>
          </div>

          <div className="space-y-2.5">
            {posts.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/news-hub/post/${p.id}`)}
                className="p-3.5 rounded-2xl bg-zinc-50/90 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition cursor-pointer space-y-1 shadow-2xs"
              >
                <h4 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white line-clamp-1">
                  {p.title}
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                  {p.description}
                </p>
                <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                  <span className="uppercase font-bold text-rose-600 dark:text-rose-400">
                    {p.category ? p.category.replace(/_/g, " ") : "Scam Alert"}
                  </span>
                  <span className="font-mono font-bold text-zinc-600 dark:text-zinc-300">
                    {(p.votes || 0).toLocaleString()} votes
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* FULL STORY MODE LIGHTBOX MODAL */}
      <AnimatePresence>
        {showStoryMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col justify-between p-4"
          >
            {/* Top Bar with progress indicators */}
            <div className="space-y-3 pt-2">
              <div className="flex gap-1.5 w-full">
                {DEMO_STORIES.map((_, i) => (
                  <div key={i} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-white transition-all duration-300 ${
                        i <= activeStoryIndex ? "w-full" : "w-0"
                      }`}
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <img
                    src={author.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-white/50"
                  />
                  <div>
                    <span className="font-bold text-xs block">@{handle}</span>
                    <span className="text-[10px] opacity-70 block">Story {activeStoryIndex + 1} of {DEMO_STORIES.length}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowStoryMode(false)}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/40 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Story Active Slide */}
            <div className="relative flex-1 my-4 rounded-3xl overflow-hidden flex items-center justify-center">
              <img
                src={DEMO_STORIES[activeStoryIndex].image}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6 text-white space-y-1">
                <h3 className="text-xl font-black">{DEMO_STORIES[activeStoryIndex].title}</h3>
                <p className="text-xs opacity-90">{DEMO_STORIES[activeStoryIndex].subtitle}</p>
              </div>
            </div>

            {/* Next / Prev Controls */}
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setActiveStoryIndex((prev) => Math.max(0, prev - 1))}
                disabled={activeStoryIndex === 0}
                className="flex-1 py-3 rounded-full bg-white/20 text-white font-bold text-xs disabled:opacity-30 cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeStoryIndex < DEMO_STORIES.length - 1) {
                    setActiveStoryIndex((prev) => prev + 1);
                  } else {
                    setShowStoryMode(false);
                  }
                }}
                className="flex-1 py-3 rounded-full bg-white text-black font-extrabold text-xs cursor-pointer"
              >
                {activeStoryIndex < DEMO_STORIES.length - 1 ? "Next" : "Done"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GIFT STARS MODAL */}
      <GiftStarsModal
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        targetCreatorId={id || "author_demo"}
        targetCreatorName={author.displayName || `@${handle}`}
      />

      {/* SPONSOR MODAL */}
      <AnimatePresence>
        {showSponsorModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4 text-zinc-900 dark:text-zinc-100"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Handshake className="w-5 h-5 text-emerald-500" />
                  <span className="font-extrabold text-sm">Sponsor @{handle}</span>
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
                Support this creator monthly via bKash or Nagad. Provide payment details below to request badge activation.
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
                        className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
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
    </div>
  );
};

export default AuthorProfile;
