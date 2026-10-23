import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  X,
  Plus,
  Users,
  Eye,
  Smile,
  ShieldAlert,
  Camera,
  Upload,
  AlertTriangle,
  Lock,
  Download,
  Newspaper,
  Search,
  Check,
  CheckCircle2,
  Globe,
  UserCheck,
  UserX,
  Sparkles
} from "lucide-react";
import { auth, db } from "../firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { applyWatermarkToImage } from "../lib/watermark";
import { useNotify } from "../components/Notifications";
import { triggerHaptic } from "../lib/haptics";
import SEO from "../components/SEO";

interface FollowUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

const DEFAULT_FOLLOW_USERS: FollowUser[] = [
  { id: "user_jenny", name: "Jenny Wilson", username: "jenwesh", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100" },
  { id: "user_samir", name: "Samir K.", username: "samir_k", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100" },
  { id: "user_fahim", name: "Fahim Rahman", username: "fahim_r", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100" },
  { id: "user_sarah", name: "Sarah Alom", username: "sarah_alom", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" },
  { id: "user_tanvir", name: "Tanvir Hasan", username: "tanvir_h", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" },
  { id: "user_afsana", name: "Afsana Mimi", username: "afsana_mimi", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100" },
];

const FEELINGS_LIST = [
  { emoji: "😡", text: "feeling angry" },
  { emoji: "🚨", text: "warning community" },
  { emoji: "💔", text: "feeling heartbroken" },
  { emoji: "⚠️", text: "alerting shoppers" },
  { emoji: "🔍", text: "investigating scam" },
  { emoji: "😢", text: "feeling sad" },
  { emoji: "🛡️", text: "defending consumers" },
  { emoji: "😤", text: "feeling frustrated" },
  { emoji: "⚖️", text: "seeking justice" },
  { emoji: "📱", text: "reviewing gadget" },
  { emoji: "🔥", text: "feeling energized" },
  { emoji: "☕", text: "having coffee" },
];

export const CreateScamPost: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();

  const [currentUser, setCurrentUser] = useState<any>(null);

  // Post Type: Scam Alert vs Normal News / Discussion
  const [postType, setPostType] = useState<"scam" | "news">("scam");

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scammerName, setScammerName] = useState("");
  const [scammerPhone, setScammerPhone] = useState("");
  const [scammerBkash, setScammerBkash] = useState("");
  const [scammedAmount, setScammedAmount] = useState<number | "">("");
  const [category, setCategory] = useState<any>("advance_payment");

  // Images with automatic watermark
  const [images, setImages] = useState<string[]>([]);
  const [isProcessingWatermark, setIsProcessingWatermark] = useState(false);

  // Audience / Privacy state
  const [privacy, setPrivacy] = useState<"public" | "followers" | "except" | "only_me">("public");
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [excludedUsers, setExcludedUsers] = useState<FollowUser[]>([]);

  // Tagged People state
  const [taggedUsers, setTaggedUsers] = useState<FollowUser[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");

  // Feeling & Activity state
  const [selectedFeeling, setSelectedFeeling] = useState<{ emoji: string; text: string }>({
    emoji: "🚨",
    text: "warning community"
  });
  const [showFeelingModal, setShowFeelingModal] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Followers & Following list
  const [availableFollowUsers, setAvailableFollowUsers] = useState<FollowUser[]>(DEFAULT_FOLLOW_USERS);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setCurrentUser(u);
      if (!u) {
        notify("Please sign in to submit a scam report", "error");
        navigate("/signin");
      }
    });
    return unsub;
  }, [navigate]);

  // Load followers/following list
  useEffect(() => {
    try {
      const savedFollows: string[] = JSON.parse(localStorage.getItem("followed_creators") || "[]");
      // Mark or prioritize users in following list
      const combined = [...DEFAULT_FOLLOW_USERS];
      setAvailableFollowUsers(combined);
    } catch (e) {}
  }, []);

  // Handle Photo Upload with automatic "Revealed On DEEP SHOP" watermark
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingWatermark(true);
    triggerHaptic();

    try {
      const processed: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { dataUrl } = await applyWatermarkToImage(file, {
          watermarkText: "Revealed On DEEP SHOP",
          subText: "OFFICIAL SCAM ALERT • VERIFIED REPORT",
          opacity: 0.32,
        });
        processed.push(dataUrl);
      }
      setImages((prev) => [...prev, ...processed]);
      notify(`Watermark added to ${processed.length} photo(s)!`, "success");
    } catch (err) {
      console.error("Watermark error:", err);
      notify("Failed to apply watermark on photo", "error");
    } finally {
      setIsProcessingWatermark(false);
    }
  };

  const removePhoto = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleTagUser = (user: FollowUser) => {
    triggerHaptic();
    setTaggedUsers((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  const toggleExcludeUser = (user: FollowUser) => {
    triggerHaptic();
    setExcludedUsers((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !description.trim()) {
      notify("Please enter a title or write description in the post", "error");
      return;
    }

    if (postType === "scam" && images.length === 0) {
      notify("Please upload at least one screenshot or evidence photo for scam reports", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      // Check for brand trigger keywords (DEEP SHOP, deepshop, deepshopback, deepshop scammer)
      const fullTextToInspect = `${title} ${description} ${scammerName} ${scammerPhone} ${scammerBkash}`.toLowerCase();
      const normalizedText = fullTextToInspect.replace(/[\s\-_.]+/g, '');
      const hasBrandKeyword = 
        normalizedText.includes('deepshop') || 
        normalizedText.includes('deepshopback') || 
        normalizedText.includes('deepshopscammer') || 
        /\b(deep\s*shop|deepshop|deepshopback|deep\s*shop\s*scammer)\b/i.test(fullTextToInspect);

      const newPostPayload = {
        postType,
        title:
          title.trim() ||
          (postType === "scam"
            ? `Scam Report: ${scammerName || "Unidentified Seller"}`
            : "Tech Community Discussion"),
        description: description.trim(),
        scammerName: postType === "scam" ? (scammerName.trim() || undefined) : undefined,
        scammerPhone: postType === "scam" ? (scammerPhone.trim() || undefined) : undefined,
        scammerBkash: postType === "scam" ? (scammerBkash.trim() || undefined) : undefined,
        scammedAmount: postType === "scam" && scammedAmount ? Number(scammedAmount) : 0,
        category: category || (postType === "scam" ? "advance_payment" : "tech_news"),
        images,
        reporterId: currentUser?.uid || "guest_" + Date.now(),
        reporterName: currentUser?.displayName || currentUser?.email?.split("@")[0] || "Community Member",
        reporterAvatar:
          currentUser?.photoURL ||
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
        votes: 1, // Self vote
        votedUserIds: currentUser?.uid ? [currentUser.uid] : [],
        reactions: {},
        reactionsCount: {
          like: 1,
          love: 0,
          haha: 0,
          wow: 0,
          sad: 0,
          angry: 0,
        },
        reactionsUsers: currentUser?.uid
          ? {
              [currentUser.uid]: {
                userName: currentUser.displayName || "Member",
                type: "like",
                timestamp: Date.now(),
              },
            }
          : {},
        commentsCount: 0,
        createdAt: Date.now(),
        // Shadow review if brand mentioned: author sees it, others don't until Admin accepts/edits
        status: hasBrandKeyword ? "under_review" : "active",
        isBrandReview: hasBrandKeyword,
        brandReviewReason: hasBrandKeyword ? "Automated brand mention review queue" : undefined,
        views: 1,
        // New interactive post fields
        feeling: selectedFeeling,
        privacy,
        excludedUserIds: excludedUsers.map((u) => u.id),
        taggedUsers: taggedUsers.map((u) => ({ id: u.id, name: u.name, username: u.username })),
      };

      // Save to Firestore
      try {
        await addDoc(collection(db, "scam_posts"), newPostPayload);
      } catch (err) {
        console.warn("Firestore write skipped, updating localStorage:", err);
      }

      // Also update local storage for offline responsiveness
      const existing = localStorage.getItem("deep_scam_posts");
      const list = existing ? JSON.parse(existing) : [];
      list.unshift({ id: (postType === "scam" ? "scam_" : "news_") + Date.now(), ...newPostPayload });
      localStorage.setItem("deep_scam_posts", JSON.stringify(list));

      notify(
        postType === "scam"
          ? "Scam report published successfully with permanent watermark!"
          : "News & Community post published successfully!",
        "success"
      );
      navigate("/news-hub");
    } catch (err) {
      console.error("Publish error:", err);
      notify("Failed to publish post", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTagUsers = availableFollowUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(tagSearchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(tagSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans py-4 px-3 sm:px-6">
      <SEO
        title="Create Scam Report • Deep Shop News Hub"
        description="Submit evidence against scammers with automatic 'Revealed On DEEP SHOP' watermark."
      />

      <div className="max-w-xl mx-auto bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
        {/* TOP BAR */}
        <header className="px-4 sm:px-5 py-3 border-b border-zinc-150 dark:border-zinc-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate("/news-hub")}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-white truncate">Create Post</h1>
          </div>
          <span className={`text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full whitespace-nowrap shrink-0 ${
            postType === "scam"
              ? "text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40"
              : "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40"
          }`}>
            {postType === "scam" ? "🚨 Scam Alert" : "📰 News & Discussion"}
          </span>
        </header>

        {/* POST TYPE SWITCHER (Scam Alert vs Normal News Post) */}
        <div className="px-3 sm:px-5 pt-3 sm:pt-4">
          <div className="flex items-center p-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 w-full overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setPostType("scam");
                setCategory("advance_payment");
              }}
              className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 rounded-full text-[10px] sm:text-xs font-bold tracking-tight whitespace-nowrap transition cursor-pointer shrink-0 ${
                postType === "scam"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-300"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">🚨 Scam Alert</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPostType("news");
                setCategory("tech_news");
              }}
              className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 rounded-full text-[10px] sm:text-xs font-bold tracking-tight whitespace-nowrap transition cursor-pointer shrink-0 ${
                postType === "news"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-300"
              }`}
            >
              <Newspaper className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">📰 Normal News</span>
            </button>
          </div>
        </div>

        <form onSubmit={handlePublish} className="p-4 sm:p-5 space-y-4">
          {/* PHOTO UPLOAD PREVIEW */}
          <div>
            {images.length > 0 ? (
              <div className="space-y-3">
                <div className="relative h-60 w-full rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-xs">
                  <img src={images[0]} alt="Uploaded Evidence" className="w-full h-full object-cover" />

                  <button
                    type="button"
                    onClick={() => removePhoto(0)}
                    className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center shadow-md transition cursor-pointer"
                    title="Remove Photo"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <label className="absolute bottom-3 right-3 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-xs text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-md transition">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={isProcessingWatermark}
                    />
                  </label>

                  <div className="absolute bottom-0 inset-x-0 bg-black/75 p-1.5 text-center text-[10px] font-black text-white">
                    🚨 Revealed On DEEP SHOP • VERIFIED EVIDENCE
                  </div>
                </div>

                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.slice(1).map((img, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx + 1)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px] cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition p-4 text-center">
                <Camera className="w-9 h-9 text-zinc-400 mb-2" />
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {isProcessingWatermark ? "Burning 'Revealed On DEEP SHOP' Watermark..." : "Upload Screenshot & Evidence Photos"}
                </span>
                <span className="text-[11px] text-zinc-500 mt-1 max-w-xs">
                  Chat screenshots, bKash transaction receipts, or Facebook profiles. Watermark will be automatically applied.
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={isProcessingWatermark}
                />
              </label>
            )}
          </div>

          {/* WHAT'S ON YOUR MIND? TEXTAREA */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400">
              What's on your mind? *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Describe the incident: How did the scam happen? What did they promise? What payment method was used? Add all facts clearly."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-xs leading-relaxed text-zinc-900 dark:text-zinc-100 font-medium placeholder-zinc-400"
            />
          </div>

          {/* SCAMMER METADATA DETAILS (Only shown for Scam Reports) */}
          {postType === "scam" ? (
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Scammer Identification (Helps Others Search)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-500 block mb-1">
                    Scammer Name / Page Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. iStore BD / Md. Tanvir"
                    value={scammerName}
                    onChange={(e) => setScammerName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-500 block mb-1">
                    Scammer Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="01700000000"
                    value={scammerPhone}
                    onChange={(e) => setScammerPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-500 block mb-1">
                    bKash / Nagad / Bank Account
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 018... (Personal bKash)"
                    value={scammerBkash}
                    onChange={(e) => setScammerBkash(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-500 block mb-1">
                    Amount Scammed (৳)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 15000"
                    value={scammedAmount}
                    onChange={(e) => setScammedAmount(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none font-mono text-rose-600 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-500 block mb-1">
                  Scam Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none font-semibold"
                >
                  <option value="advance_payment">Advance Payment Fraud (টাকা নিয়ে ব্লক)</option>
                  <option value="delivery">Courier / Parcel Swap Fraud (পার্সেল বদলে সাবান/ইট)</option>
                  <option value="electronics">Fake / Duplicate Phone / Gadget (ক্লোন বা নষ্ট ডিভাইস)</option>
                  <option value="fake_account">Fake Facebook Page / Impersonation (নকল পেজ)</option>
                  <option value="other">Other Incident</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                <Newspaper className="w-4 h-4" />
                <span>Post Category & Topic</span>
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none font-semibold"
              >
                <option value="tech_news">Tech News & New Phone Releases (টেক নিউজ ও নতুন মোবাইল)</option>
                <option value="market_update">Border Cross Shopping Tips & Pricing (বর্ডার ক্রস শপিং টিপস)</option>
                <option value="electronics">Device Review & Experience (ডিভাইস রিভিউ ও অভিজ্ঞতা)</option>
                <option value="other">General Community Discussion (কমিউনিটি আলোচনা)</option>
              </select>
            </div>
          )}

          {/* 1. TAG PEOPLE SECTION (Opens bottom popup with search) */}
          <div className="space-y-1.5">
            <span className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Tag People (Followers & Following)
            </span>
            <div
              onClick={() => setShowTagModal(true)}
              className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60 flex items-center justify-between gap-3 cursor-pointer transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full border border-dashed border-zinc-400 flex items-center justify-center text-zinc-500 shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  {taggedUsers.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {taggedUsers.map((u) => (
                        <span
                          key={u.id}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1"
                        >
                          @{u.username}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTagUser(u);
                            }}
                            className="hover:text-red-500"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate block">
                      Tap to search & tag followers / following...
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 shrink-0">
                {taggedUsers.length > 0 ? `${taggedUsers.length} tagged` : "Choose"}
              </span>
            </div>
          </div>

          {/* 2. WHO CAN SEE IT? (Audience selector) */}
          <div className="space-y-1.5">
            <span className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Who can see it? (Audience)
            </span>
            <div
              onClick={() => setShowAudienceModal(true)}
              className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60 flex items-center justify-between cursor-pointer transition"
            >
              <div className="flex items-center gap-2.5 text-xs font-semibold">
                {privacy === "public" && <Globe className="w-4 h-4 text-emerald-500" />}
                {privacy === "followers" && <UserCheck className="w-4 h-4 text-blue-500" />}
                {privacy === "except" && <UserX className="w-4 h-4 text-amber-500" />}
                {privacy === "only_me" && <Lock className="w-4 h-4 text-rose-500" />}

                <span className="text-zinc-900 dark:text-white">
                  {privacy === "public" && "Public (Anyone on DEEP SHOP)"}
                  {privacy === "followers" && "Followers Only (People who follow you)"}
                  {privacy === "except" && `Except ${excludedUsers.length} users...`}
                  {privacy === "only_me" && "Only Me (Private Report)"}
                </span>
              </div>
              <span className="text-zinc-400 text-xs">⌵</span>
            </div>
          </div>

          {/* 3. FEELING & ACTIVITIES */}
          <div className="space-y-1.5">
            <span className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Feeling & Activities
            </span>
            <div
              onClick={() => setShowFeelingModal(true)}
              className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60 flex items-center justify-between cursor-pointer transition text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{selectedFeeling.emoji}</span>
                <span className="text-zinc-900 dark:text-white capitalize">{selectedFeeling.text}</span>
              </div>
              <span className="text-zinc-400 text-xs">Change ⌵</span>
            </div>
          </div>

          {/* PUBLISH POST BUTTON */}
          <button
            type="submit"
            disabled={isSubmitting || isProcessingWatermark}
            className="w-full py-3.5 rounded-full bg-black dark:bg-white text-white dark:text-black font-extrabold text-xs shadow-xl hover:opacity-90 active:scale-98 transition disabled:opacity-50 cursor-pointer text-center"
          >
            {isSubmitting ? "Publishing Verified Report..." : "Publish Post"}
          </button>
        </form>
      </div>

      {/* POPUP 1: TAG PEOPLE BOTTOM SHEET (Search from following and followers) */}
      <AnimatePresence>
        {showTagModal && (
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">Tag Followers & Following</h3>
                  <p className="text-[11px] text-zinc-500">Only your followers & following appear here</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTagModal(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative my-3">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search in followers/following..."
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none font-medium"
                />
              </div>

              {/* User List */}
              <div className="flex-1 overflow-y-auto space-y-2 py-1 pr-1">
                {filteredTagUsers.map((user) => {
                  const isSelected = taggedUsers.some((u) => u.id === user.id);
                  return (
                    <div
                      key={user.id}
                      onClick={() => toggleTagUser(user)}
                      className={`p-2.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800"
                          : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                        <div>
                          <span className="font-bold text-xs text-zinc-900 dark:text-white block">{user.name}</span>
                          <span className="text-[10px] text-zinc-400 block">@{user.username}</span>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                        isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-zinc-300 dark:border-zinc-700"
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowTagModal(false)}
                className="mt-4 w-full py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs cursor-pointer shadow-md"
              >
                Done Tagging ({taggedUsers.length})
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP 2: AUDIENCE SELECTOR MODAL (Public, Followers Only, Except Users, Only Me) */}
      <AnimatePresence>
        {showAudienceModal && (
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">Choose Post Audience</h3>
                <button
                  type="button"
                  onClick={() => setShowAudienceModal(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {[
                  { id: "public", icon: Globe, title: "Public", desc: "Anyone on DEEP SHOP can view and vote" },
                  { id: "followers", icon: UserCheck, title: "Followers Only", desc: "Only people who follow your profile" },
                  { id: "except", icon: UserX, title: "Except Specific Users...", desc: "Hide this report from selected users" },
                  { id: "only_me", icon: Lock, title: "Only Me", desc: "Private post visible only to you" },
                ].map((item) => {
                  const IconComp = item.icon;
                  const isSelected = privacy === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        triggerHaptic();
                        setPrivacy(item.id as any);
                        if (item.id !== "except") {
                          setShowAudienceModal(false);
                        }
                      }}
                      className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-800"
                          : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-extrabold text-xs text-zinc-900 dark:text-white block">{item.title}</span>
                          <span className="text-[10px] text-zinc-500 block">{item.desc}</span>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-zinc-300 dark:border-zinc-700"
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sub-selector if "except" chosen */}
              {privacy === "except" && (
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                    Choose users to exclude ({excludedUsers.length} selected):
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {availableFollowUsers.map((u) => {
                      const isExcluded = excludedUsers.some((x) => x.id === u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => toggleExcludeUser(u)}
                          className={`p-2 rounded-xl flex items-center justify-between text-xs cursor-pointer ${
                            isExcluded ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40" : "bg-zinc-100 dark:bg-zinc-800"
                          }`}
                        >
                          <span className="font-semibold">{u.name}</span>
                          <span className="text-[10px] font-bold">{isExcluded ? "Excluded ✕" : "+ Exclude"}</span>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAudienceModal(false)}
                    className="w-full py-2.5 rounded-full bg-blue-600 text-white font-bold text-xs cursor-pointer"
                  >
                    Confirm Excluded Users
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP 3: FEELINGS & ACTIVITIES BOTTOM SHEET */}
      <AnimatePresence>
        {showFeelingModal && (
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">How are you feeling?</h3>
                <button
                  type="button"
                  onClick={() => setShowFeelingModal(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-72 pr-1">
                {FEELINGS_LIST.map((f, i) => {
                  const isSelected = selectedFeeling.text === f.text;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        setSelectedFeeling(f);
                        setShowFeelingModal(false);
                      }}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                        isSelected
                          ? "bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-900 dark:text-amber-200 font-bold"
                          : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 text-zinc-800 dark:text-zinc-200"
                      }`}
                    >
                      <span className="text-xl">{f.emoji}</span>
                      <span className="text-xs capitalize truncate">{f.text}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CreateScamPost;
