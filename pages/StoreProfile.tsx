import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { auth, db } from '../firebase';
import { triggerHaptic } from '../lib/haptics';
import { APPLE_SPRING_SNAPPY } from '../lib/shoppingRoute';

import { 
  ArrowLeft, 
  MapPin, 
  Search,
  MessageCircle,
  MoreVertical,
  Home,
  Layers,
  LayoutGrid,
  Star,
  CheckCircle2,
  Share2,
  Copy,
  AlertTriangle,
  XCircle,
  ShoppingBag,
  X,
  Globe,
  UserCheck,
  UserPlus,
  ShieldCheck,
  ThumbsUp,
  Users,
  Package,
  Sparkles,
} from 'lucide-react';
import { ProductCard } from '../components/ui/ProductCard';
import { Product } from '../types';
import { StoreProfilePageSkeleton } from '../components/PageSkeletons';
import { LiquidGlassPopup } from '../components/ui/liquid-glass-popup';
import { isScamReview, filterSafeReviews } from '../lib/reviewModeration';
import { checkContainsBannedWord } from '../lib/wordFilter';
import { useNotify } from '../components/Notifications';
import { subscribeToFollowerStats, toggleFollowUser } from '../lib/follow';
import UserAvatar from '../components/UserAvatar';
import {
  formatCompactNumber,
  getSafeDisplayName,
  getSafePublicUsername,
} from '../lib/utils';

export const StoreProfile: React.FC = () => {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const shouldReduceMotion = useReducedMotion();

  const [user, setUser] = useState(auth.currentUser);
  
  const [activeTab, setActiveTab] = useState<'home' | 'categories' | 'gallery' | 'reviews'>('home');
  const [seller, setSeller] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  
  // Real stats
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [totalSold, setTotalSold] = useState(0);
  const [positivePercent, setPositivePercent] = useState(0);
  const [regularBuyers, setRegularBuyers] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  
  // UI states
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Seller Pause Orders states
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [tempPauseReason, setTempPauseReason] = useState('');
  const [savingPause, setSavingPause] = useState(false);

  // Report Seller modal states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('নকল বা প্রতারণামূলক পণ্য (Fake / Counterfeit Product)');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!sellerId) return;
      try {
        const sellerRef = doc(db, 'users', sellerId);
        const sellerSnap = await getDoc(sellerRef);
        let sData: any = null;
        if (sellerSnap.exists()) {
          sData = { id: sellerSnap.id, ...sellerSnap.data() };
          setSeller(sData);
        }

        const q = query(collection(db, 'products'), where('sellerId', '==', sellerId));
        const productSnap = await getDocs(q);
        const fetchedProducts = productSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
        setProducts(fetchedProducts);
        
        // Fetch real reviews
        const rQ = query(collection(db, 'reviews'), where('sellerId', '==', sellerId));
        const rSnap = await getDocs(rQ);
        let fetchedReviews = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Fetch chat reviews
        const urQ = query(collection(db, 'user_reviews'), where('revieweeId', '==', sellerId));
        const urSnap = await getDocs(urQ);
        const userReviews = urSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        let allReviews: any[] = [...fetchedReviews, ...userReviews];
        
        // Always include product reviews
        for (const p of fetchedProducts) {
           if (p.reviews && Array.isArray(p.reviews)) {
              allReviews = [...allReviews, ...p.reviews];
           }
        }
        
        // Filter safe reviews and sort by date descending
        const safeReviews = filterSafeReviews(allReviews.map(r => ({
           ...r,
           comment: r.comment || r.text || "",
           createdAt: r.createdAt || Date.now()
        })));
        safeReviews.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
        setReviews(safeReviews);
        
        // Calculate real data
        let totalSoldCalc = 0;
        fetchedProducts.forEach(p => {
           totalSoldCalc += (p.salesCount || 0);
        });
        
        let totalRating = 0;
        let posCount = 0;
        safeReviews.forEach(r => {
           totalRating += (r.rating || 5);
           if (r.rating >= 4) posCount++;
        });
        
        const avgRat = safeReviews.length > 0 ? (totalRating / safeReviews.length) : 0;
        const posPerc = safeReviews.length > 0 ? Math.round((posCount / safeReviews.length) * 100) : 0;
        
        const tSold = sData?.customTotalSold ?? totalSoldCalc;
        const pPerc = sData?.customPositiveReviewPercent ?? posPerc;
        const rBuyers = sData?.customRegularBuyer ?? Math.floor(tSold * 0.1);
        const aRat = sData?.customRating ?? avgRat;
        
        setTotalSold(tSold);
        setPositivePercent(pPerc);
        setRegularBuyers(rBuyers);
        setAverageRating(aRat);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [sellerId, user]);

  // Real-time follower & following count subscription
  useEffect(() => {
    if (!sellerId) return;
    const unsub = subscribeToFollowerStats(sellerId, user?.uid, (stats) => {
      setFollowersCount(stats.followersCount);
      setFollowingCount(stats.followingCount);
      setIsFollowing(stats.isFollowing);
    });
    return () => unsub();
  }, [sellerId, user?.uid]);

  const handleFollowToggle = async () => {
    if (!user) {
      notify('Please sign in to follow!', 'error');
      navigate('/signin');
      return;
    }
    if (!seller || user.uid === seller.id) return;
    const res = await toggleFollowUser({
      targetUid: seller.id,
      targetName: seller.shopName || seller.displayName || 'User',
      currentUser: user,
      currentlyFollowing: isFollowing,
    });
    if (res.ok) {
      setIsFollowing(res.isFollowing);
      if (typeof res.followersCount === 'number') {
        setFollowersCount(res.followersCount);
      }
      notify(
        res.isFollowing
          ? `Following ${seller.shopName || seller.displayName || 'profile'}`
          : `Unfollowed ${seller.shopName || seller.displayName || 'profile'}`,
        res.isFollowing ? 'success' : 'info'
      );
    }
  };
  
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      notify('Please sign in to leave a review', 'error');
      return;
    }
    if (!newReviewComment.trim()) {
      notify('Please enter a comment', 'error');
      return;
    }
    const bannedWord = await checkContainsBannedWord(newReviewComment);
    if (bannedWord) {
      notify(`Your review contains prohibited words ("${bannedWord}"). Please edit your review.`, 'error');
      return;
    }
    if (isScamReview(newReviewComment)) {
      setNewReviewComment('');
      setNewReviewRating(5);
      notify('Review submitted successfully!', 'success');
      return;
    }
    setSubmittingReview(true);
    try {
      const newReview = {
        sellerId: sellerId,
        userId: user.uid,
        reviewerId: user.uid,
        reviewerName: user.displayName || 'Anonymous',
        reviewerPhoto: user.photoURL || '',
        rating: newReviewRating,
        comment: newReviewComment.trim(),
        createdAt: Date.now()
      };
      const docRef = await addDoc(collection(db, 'reviews'), newReview);
      
      setReviews(prev => [{ id: docRef.id, ...newReview }, ...prev]);
      setNewReviewComment('');
      setNewReviewRating(5);
      notify('Review submitted successfully!', 'success');
    } catch (error) {
      console.error(error);
      notify('Failed to submit review', 'error');
    }
    setSubmittingReview(false);
  };

  const handleBackNavigation = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleCopyStoreLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify("স্টোর লিংক কপি করা হয়েছে!", "success");
    } catch {
      notify("লিংক কপি করা যায়নি", "error");
    }
    setShowMenu(false);
  };

  const handleShare = async () => {
    setShowMenu(false);
    if (navigator.share) {
      try {
        await navigator.share({
          title: seller?.shopName || seller?.displayName || "DEEP SHOP Store",
          url: window.location.href,
        });
        return;
      } catch {}
    }
    handleCopyStoreLink();
  };

  const handleOpenReport = () => {
    setShowMenu(false);
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (!seller) return;
    setSubmittingReport(true);
    try {
      await addDoc(collection(db, "reports"), {
        targetUserId: seller.id,
        targetName: seller.shopName || seller.displayName || "Seller",
        reporterId: user?.uid || "guest",
        reporterEmail: user?.email || "",
        reason: reportReason,
        details: reportDetails.trim(),
        type: "seller_store_report",
        status: "pending",
        createdAt: Date.now(),
      });
      setShowReportModal(false);
      setReportDetails("");
      notify("রিপোর্ট জমা দেওয়া হয়েছে। অ্যাডমিন টিম এটি যাচাই করবে।", "success");
    } catch {
      setShowReportModal(false);
      notify("রিপোর্ট গ্রহণ করা হয়েছে। আমাদের টিম এটি পর্যালোচনা করবে।", "success");
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleBlock = () => {
    try {
      const blockedRaw = localStorage.getItem("deepshop_blocked_sellers");
      const blockedList: string[] = blockedRaw ? JSON.parse(blockedRaw) : [];
      if (seller?.id && !blockedList.includes(seller.id)) {
        blockedList.push(seller.id);
        localStorage.setItem("deepshop_blocked_sellers", JSON.stringify(blockedList));
      }
    } catch {}
    notify("সেলারকে ব্লক করা হয়েছে।", "success");
    setShowMenu(false);
  };

  const handleResumeOrders = async () => {
    if (!user || !seller || user.uid !== seller.id) return;
    setSavingPause(true);
    try {
      await updateDoc(doc(db, 'users', seller.id), {
        ordersPaused: false,
        pauseReason: ''
      });
      setSeller((prev: any) => ({ ...prev, ordersPaused: false, pauseReason: '' }));
      notify("অর্ডার গ্রহণ পুনরায় চালু করা হয়েছে!", "success");
    } catch (e) {
      notify("Failed to update status", "error");
    } finally {
      setSavingPause(false);
    }
  };

  const handleSavePauseOrders = async () => {
    if (!user || !seller || user.uid !== seller.id) return;
    if (!tempPauseReason.trim()) {
      return notify("অনুগ্রহ করে কারণ উল্লেখ করুন (Reason is required)", "error");
    }
    setSavingPause(true);
    try {
      await updateDoc(doc(db, 'users', seller.id), {
        ordersPaused: true,
        pauseReason: tempPauseReason.trim()
      });
      setSeller((prev: any) => ({ ...prev, ordersPaused: true, pauseReason: tempPauseReason.trim() }));
      setShowPauseModal(false);
      notify("স্টোরের অর্ডার গ্রহণ বন্ধ করা হয়েছে", "success");
    } catch (e) {
      notify("Failed to update status", "error");
    } finally {
      setSavingPause(false);
    }
  };

  if (loading) {
    return <StoreProfilePageSkeleton />;
  }

  if (!seller) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center text-zinc-500">
        User not found
      </div>
    );
  }

  const isSeller = seller.role === "seller" || products.length > 0;
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const renderTopProfileHeader = (showStoreSearch: boolean) => (
    <header className="sticky top-0 z-40 ds-apple-topbar px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            handleBackNavigation();
          }}
          className="ds-apple-icon-btn w-10 h-10 rounded-full flex items-center justify-center text-[#1D1D1F] dark:text-[#F5F5F7] shrink-0 cursor-pointer transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <UserAvatar
          src={seller.photoURL}
          fallbackText={seller.shopName || seller.displayName}
          className="w-10 h-10 shrink-0 border border-black/[0.08] dark:border-white/[0.15] shadow-xs"
        />

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-base leading-tight text-[#1D1D1F] dark:text-[#F5F5F7] truncate tracking-tight">
              {seller.shopName || getSafeDisplayName(seller, "Seller")}
            </span>
            {seller.kycStatus === "verified" && (
              <CheckCircle2 className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF] shrink-0" />
            )}
          </div>
          <span className="text-[#6E6E73] dark:text-[#98989D] text-xs font-medium truncate">
            {getSafePublicUsername(seller)
              ? `@${getSafePublicUsername(seller)}`
              : `ID: ${seller.id.substring(0, 7).toUpperCase()}`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[#1D1D1F] dark:text-[#F5F5F7] shrink-0">
        {showStoreSearch && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setShowSearch(!showSearch);
            }}
            aria-label="Search store"
            className="ds-apple-icon-btn w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer active:scale-95"
          >
            <Search className="w-5 h-5" />
          </button>
        )}

        {user?.uid !== seller.id && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              navigate(`/messages?chatId=${seller.id}`);
            }}
            aria-label="Message seller"
            className="w-10 h-10 rounded-full bg-[#0071E3]/10 dark:bg-[#0A84FF]/20 text-[#0071E3] dark:text-[#0A84FF] hover:bg-[#0071E3]/20 flex items-center justify-center transition cursor-pointer active:scale-95"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setShowMenu(!showMenu);
            }}
            aria-label="More options"
            aria-expanded={showMenu}
            className="ds-apple-icon-btn w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer active:scale-95"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <motion.div
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -6 }}
                  animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
                  transition={shouldReduceMotion ? { duration: 0.14 } : APPLE_SPRING_SNAPPY}
                  style={{ transformOrigin: "top right" }}
                  className="ds-apple-popover absolute right-0 top-full mt-2 w-56 rounded-[20px] z-50 overflow-hidden py-1.5"
                >
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      handleShare();
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-black/5 dark:hover:bg-white/10 text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] transition cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-[#6E6E73] dark:text-[#98989D] shrink-0" />
                    <span>Share Store</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      handleCopyStoreLink();
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-black/5 dark:hover:bg-white/10 text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] border-t border-black/[0.05] dark:border-white/[0.08] transition cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-[#6E6E73] dark:text-[#98989D] shrink-0" />
                    <span>Copy Store Link</span>
                  </button>
                  {user?.uid !== seller.id && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("warning");
                          handleOpenReport();
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-[#FF9500]/10 text-sm font-semibold text-[#B25000] dark:text-[#FF9F0A] border-t border-black/[0.05] dark:border-white/[0.08] transition cursor-pointer"
                      >
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Report Seller</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("warning");
                          handleBlock();
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-[#FF3B30]/10 text-sm font-semibold text-[#FF3B30] dark:text-[#FF453A] border-t border-black/[0.05] dark:border-white/[0.08] transition cursor-pointer"
                      >
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span>Block Seller</span>
                      </button>
                    </>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );

  const renderReportSellerPopup = () => (
    <LiquidGlassPopup
      open={showReportModal}
      onClose={() => setShowReportModal(false)}
      title="সেলার রিপোর্ট করুন (Report Seller)"
      description={`${seller.shopName || seller.displayName || "এই সেলার"} সম্পর্কে আপনার অভিযোগের কারণ নির্বাচন করুন।`}
      primaryAction={{
        label: submittingReport ? "জমা হচ্ছে..." : "রিপোর্ট জমা দিন",
        onClick: handleSubmitReport,
        disabled: submittingReport,
        loading: submittingReport,
      }}
      secondaryAction={{
        label: "বাতিল",
        onClick: () => setShowReportModal(false),
      }}
    >
      <div className="space-y-3 text-left">
        <div className="space-y-2">
          {[
            "নকল বা প্রতারণামূলক পণ্য (Fake / Counterfeit Product)",
            "স্ক্যাম বা অগ্রিম টাকা প্রতারণা (Scam / Fraud)",
            "আপত্তিকর আচরণ বা মেসেজ (Abusive Behavior)",
            "ভুল তথ্য বা বিভ্রান্তিকর দাম (Misleading Info)",
            "অন্যান্য (Other)",
          ].map((reasonOpt) => (
            <label
              key={reasonOpt}
              className={`flex items-center gap-3 p-3 rounded-2xl border text-xs font-semibold cursor-pointer transition ${
                reportReason === reasonOpt
                  ? "border-amber-500 bg-amber-500/10 text-zinc-900 dark:text-white"
                  : "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
              }`}
            >
              <input
                type="radio"
                name="sellerReportReason"
                checked={reportReason === reasonOpt}
                onChange={() => setReportReason(reasonOpt)}
                className="accent-amber-500 w-4 h-4"
              />
              <span>{reasonOpt}</span>
            </label>
          ))}
        </div>
        <div>
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
            বিস্তারিত বিবরণ (ঐচ্ছিক)
          </label>
          <textarea
            rows={2}
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
            placeholder="কী সমস্যা হয়েছে সংক্ষেপে লিখুন..."
            className="w-full ds-liquid-input p-3 text-xs font-medium outline-none resize-none rounded-2xl"
          />
        </div>
      </div>
    </LiquidGlassPopup>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black text-[#1D1D1F] dark:text-[#F5F5F7] font-sans pb-32">
      {/* Top Glass Header */}
      {renderTopProfileHeader(true)}

      {/* Search Overlay */}
      {showSearch && (
        <div className="px-4 py-3 ds-apple-topbar border-b border-black/[0.06] dark:border-white/[0.1] flex items-center gap-3">
          <Search className="w-5 h-5 text-[#86868B] shrink-0" />
          <input 
            type="text" 
            placeholder="Search in this seller's store..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] font-medium"
            autoFocus
          />
          <button 
            type="button" 
            onClick={() => {
              triggerHaptic("light");
              setShowSearch(false);
              setSearchQuery('');
            }} 
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer active:scale-95"
          >
            <X className="w-4 h-4 text-[#6E6E73] dark:text-[#98989D]" />
          </button>
        </div>
      )}

      {/* Main Responsive Store Layout */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-4 space-y-6">

        {/* Seller Store Paused Status Banner */}
        {seller.ordersPaused && (
          <div className="bg-[#FF9500]/10 border border-[#FF9500]/25 rounded-[24px] p-5 backdrop-blur-xl shadow-xs space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5 text-[#B25000] dark:text-[#FF9F0A] font-bold text-sm sm:text-base">
                <AlertTriangle className="w-5 h-5 text-[#FF9500] shrink-0" />
                <span>অর্ডার গ্রহণ সাময়িকভাবে বন্ধ আছে (Orders Paused)</span>
              </div>
              {user?.uid === seller.id && (
                <button 
                  type="button"
                  onClick={() => {
                    triggerHaptic("medium");
                    handleResumeOrders();
                  }}
                  disabled={savingPause}
                  className="text-xs px-4 py-2 bg-[#248A3D] dark:bg-[#30D158] text-white font-semibold rounded-full transition shadow-xs cursor-pointer active:scale-95"
                >
                  চালু করুন
                </button>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#1D1D1F]/80 dark:text-[#F5F5F7]/80 leading-relaxed font-medium">
              <strong>কারণ:</strong> "{seller.pauseReason || "বিক্রেতা সাময়িক বিরতিতে থাকায় বর্তমানে অর্ডার গ্রহণ বন্ধ রয়েছে।"}"
            </p>
          </div>
        )}

        {/* Owner Quick Controls (When viewing own store) */}
        {user?.uid === seller.id && !seller.ordersPaused && (
          <div className="bg-[#248A3D]/10 dark:bg-[#30D158]/15 border border-[#248A3D]/25 dark:border-[#30D158]/30 rounded-[22px] p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-[#248A3D] dark:text-[#30D158]">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>আপনার সেলার স্টোরে স্বাভাবিকভাবে অর্ডার গ্রহণ চলছে</span>
            </div>
            <button 
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setTempPauseReason(seller.pauseReason || "সাময়িক বিরতির কারণে অর্ডার গ্রহণ বন্ধ রাখা হলো।");
                setShowPauseModal(true);
              }}
              className="text-xs px-4 py-2 bg-[#FF9500] hover:bg-[#E08600] text-white font-semibold rounded-full transition shadow-xs cursor-pointer active:scale-95"
            >
              অর্ডার বন্ধ করুন
            </button>
          </div>
        )}

        {/* ================= HERO STORE BANNER ================= */}
        <div className="relative rounded-[28px] overflow-hidden bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.1] shadow-sm">
          {/* Cover Photo */}
          <div 
            className="h-44 sm:h-64 w-full bg-gradient-to-br from-[#1D1D1F] via-[#2C2C2E] to-[#0A2540] bg-cover bg-center relative"
            style={
              seller.profileBg || seller.coverPhoto
                ? { backgroundImage: `url(${seller.profileBg || seller.coverPhoto})` }
                : undefined
            }
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
          </div>

          {/* Profile Details Container */}
          <div className="px-5 sm:px-8 pb-6 relative -mt-16 sm:-mt-20 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6 min-w-0">
              {/* Store Avatar */}
              <div className="relative shrink-0">
                <UserAvatar
                  src={seller.photoURL}
                  fallbackText={seller.shopName || seller.displayName}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-[26px] ring-4 ring-white dark:ring-[#1C1C1E] shadow-xl object-cover"
                />
                {seller.kycStatus === "verified" && (
                  <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] text-white flex items-center justify-center ring-4 ring-white dark:ring-[#1C1C1E] shadow-md">
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                )}
              </div>

              {/* Title & Info */}
              <div className="min-w-0 space-y-1.5">
                {/* Line 1: Shop Name + Verified Badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight truncate">
                    {seller.shopName || getSafeDisplayName(seller, "Seller Store")}
                  </h1>
                  {seller.kycStatus === "verified" && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] text-xs font-bold border border-[#0071E3]/20 dark:border-[#0A84FF]/25 inline-flex items-center gap-1 shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified Seller</span>
                    </span>
                  )}
                </div>

                {/* Line 2: Username Handle */}
                <div className="text-xs sm:text-sm font-medium text-[#6E6E73] dark:text-[#98989D]">
                  {getSafePublicUsername(seller)
                    ? `@${getSafePublicUsername(seller)}`
                    : `ID: ${seller.id.substring(0, 8).toUpperCase()}`}
                </div>

                {/* Line 3: Location Address */}
                {seller.address && (
                  <div className="flex items-start gap-1.5 text-xs sm:text-sm font-medium text-[#6E6E73] dark:text-[#98989D]">
                    <MapPin className="w-3.5 h-3.5 text-[#FF3B30] dark:text-[#FF453A] shrink-0 mt-0.5" />
                    <span className="leading-snug">{seller.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons Cluster */}
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              {user?.uid !== seller.id && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      navigate(`/messages?chatId=${seller.id}`);
                    }}
                    className="px-5 py-2.5 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] hover:bg-[#0077ED] dark:hover:bg-[#1E8EFF] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs active:scale-[0.97] transition cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Chat with Seller</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("selection");
                      handleFollowToggle();
                    }}
                    className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs active:scale-[0.97] transition cursor-pointer border ${
                      isFollowing
                        ? "bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] border-black/[0.08] dark:border-white/[0.12]"
                        : "bg-[#1D1D1F] dark:bg-[#F5F5F7] text-white dark:text-[#1D1D1F] border-transparent"
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-4 h-4 text-[#248A3D] dark:text-[#30D158]" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Follow Store</span>
                      </>
                    )}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  navigate(`/loops/profile/${seller.id}`);
                }}
                className="px-4 py-2.5 rounded-full bg-[#F5F5F7] dark:bg-[#2C2C2E] hover:bg-black/[0.08] dark:hover:bg-white/[0.14] text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.06] dark:border-white/[0.1] text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-[0.97]"
              >
                <Globe className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />
                <span>Feed Profile</span>
              </button>
            </div>
          </div>
        </div>

        {/* ================= APPLE STUDIO METRICS BAR ================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Rating */}
          <div className="p-4 rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.1] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#FF9500] dark:text-[#FF9F0A] mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E6E73] dark:text-[#98989D]">Rating</span>
              <Star className="w-4 h-4 fill-[#FF9500] text-[#FF9500] dark:fill-[#FF9F0A] dark:text-[#FF9F0A]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]">
                {averageRating > 0 ? averageRating.toFixed(1) : "New"}
              </span>
              <span className="text-xs text-[#6E6E73] dark:text-[#98989D] font-semibold">/ 5.0</span>
            </div>
            <span className="text-[11px] text-[#6E6E73] dark:text-[#98989D] font-medium truncate mt-0.5 tabular-nums">
              ({reviews.length} ratings)
            </span>
          </div>

          {/* Positive Percent */}
          <div className="p-4 rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.1] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#248A3D] dark:text-[#30D158] mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E6E73] dark:text-[#98989D]">Positive</span>
              <ThumbsUp className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]">
                {positivePercent}%
              </span>
            </div>
            <span className="text-[11px] text-[#6E6E73] dark:text-[#98989D] font-medium truncate mt-0.5">
              Satisfaction score
            </span>
          </div>

          {/* Total Sold */}
          <div className="p-4 rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.1] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#0071E3] dark:text-[#0A84FF] mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E6E73] dark:text-[#98989D]">Total Sold</span>
              <Package className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]">
                {formatCompactNumber(totalSold)}+
              </span>
            </div>
            <span className="text-[11px] text-[#6E6E73] dark:text-[#98989D] font-medium truncate mt-0.5">
              Products delivered
            </span>
          </div>

          {/* Regular Buyers */}
          <div className="p-4 rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.1] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#0071E3] dark:text-[#0A84FF] mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E6E73] dark:text-[#98989D]">Buyers</span>
              <Users className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]">
                {formatCompactNumber(regularBuyers)}+
              </span>
            </div>
            <span className="text-[11px] text-[#6E6E73] dark:text-[#98989D] font-medium truncate mt-0.5">
              Repeat customers
            </span>
          </div>

          {/* Followers */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-1 p-4 rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.1] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#0071E3] dark:text-[#0A84FF] mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E6E73] dark:text-[#98989D]">Followers</span>
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]">
                {formatCompactNumber(followersCount)}
              </span>
            </div>
            <span className="text-[11px] text-[#6E6E73] dark:text-[#98989D] font-medium truncate mt-0.5">
              Community reach
            </span>
          </div>
        </div>

        {/* ================= SEGMENTED TAB NAVIGATION ================= */}
        <div className="ds-apple-segmented bg-black/[0.06] dark:bg-white/[0.08] p-1.5 rounded-full border border-black/[0.06] dark:border-white/[0.1] flex items-center justify-start sm:justify-around gap-1.5 w-full overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              setActiveTab('home');
            }}
            className={`py-2 px-4 rounded-full text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer shrink-0 whitespace-nowrap active:scale-[0.97] ${
              activeTab === 'home'
                ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-xs'
                : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
            }`}
          >
            <Home className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap tabular-nums">Products ({filteredProducts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              setActiveTab('categories');
            }}
            className={`py-2 px-4 rounded-full text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer shrink-0 whitespace-nowrap active:scale-[0.97] ${
              activeTab === 'categories'
                ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-xs'
                : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Categories</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              setActiveTab('gallery');
            }}
            className={`py-2 px-4 rounded-full text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer shrink-0 whitespace-nowrap active:scale-[0.97] ${
              activeTab === 'gallery'
                ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-xs'
                : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
            }`}
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Gallery</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              setActiveTab('reviews');
            }}
            className={`py-2 px-4 rounded-full text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer shrink-0 whitespace-nowrap active:scale-[0.97] ${
              activeTab === 'reviews'
                ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-xs'
                : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
            }`}
          >
            <Star className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap tabular-nums">Reviews ({reviews.length})</span>
          </button>
        </div>

        {/* ================= TAB CONTENT DISPLAY ================= */}
        <div className="pt-2">
          {/* TAB 1: PRODUCTS GRID */}
          {activeTab === 'home' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {filteredProducts.length === 0 && (
                <div className="bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.1] rounded-[24px] p-12 text-center space-y-3 shadow-xs">
                  <ShoppingBag className="w-12 h-12 text-[#86868B] mx-auto" />
                  <p className="text-[#6E6E73] dark:text-[#98989D] font-semibold text-sm">
                    {searchQuery ? `No products match "${searchQuery}"` : "No products available in this store yet."}
                  </p>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setSearchQuery('');
                      }}
                      className="text-xs font-semibold text-[#0071E3] dark:text-[#0A84FF] hover:underline cursor-pointer"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STORE CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">Store Categories</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from(new Set(products.map(p => p.category || 'Other'))).map(cat => {
                  const catCount = products.filter(p => (p.category || 'Other') === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        triggerHaptic("selection");
                        setSearchQuery(cat === 'Other' ? '' : cat);
                        setActiveTab('home');
                      }}
                      className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[22px] border border-black/[0.06] dark:border-white/[0.1] hover:border-[#0071E3]/40 dark:hover:border-[#0A84FF]/45 shadow-xs flex items-center justify-between gap-3 text-left transition active:scale-[0.97] cursor-pointer"
                    >
                      <div>
                        <span className="font-bold text-sm text-[#1D1D1F] dark:text-[#F5F5F7] block">{cat}</span>
                        <span className="text-xs text-[#6E6E73] dark:text-[#98989D] font-medium tabular-nums">{catCount} items</span>
                      </div>
                      <Layers className="w-5 h-5 text-[#0071E3] dark:text-[#0A84FF] shrink-0" />
                    </button>
                  );
                })}
                {products.length === 0 && (
                  <div className="col-span-full bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.1] rounded-[24px] p-8 text-center text-[#6E6E73] dark:text-[#98989D]">
                    No categories available.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PRODUCT GALLERY */}
          {activeTab === 'gallery' && (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredProducts.map((product) => (
                <div 
                  key={product.id} 
                  onClick={() => {
                    triggerHaptic("light");
                    navigate(`/product/${product.id}`);
                  }} 
                  className="aspect-square bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden relative cursor-pointer group border border-black/[0.06] dark:border-white/[0.1] shadow-xs"
                >
                  {product.images?.[0] ? (
                    <img 
                      src={product.images[0]} 
                      alt={product.name} 
                      referrerPolicy="no-referrer" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#86868B]">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                  )}
                  {product.price && (
                    <div className="absolute bottom-1.5 left-1.5 bg-black/75 backdrop-blur-md text-white text-[11px] px-2 py-0.5 rounded-lg font-bold tabular-nums">
                      ৳{product.price}
                    </div>
                  )}
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.1] rounded-[24px] p-8 text-center text-[#6E6E73] dark:text-[#98989D]">
                  No products found in gallery.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REVIEWS & RATINGS */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {/* Leave a Review Form */}
              <div className="bg-white dark:bg-[#1C1C1E] rounded-[24px] p-5 sm:p-6 border border-black/[0.06] dark:border-white/[0.1] shadow-xs space-y-4">
                <h3 className="font-bold text-base text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">Write a Verified Store Review</h3>
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => {
                          triggerHaptic("selection");
                          setNewReviewRating(star);
                        }}
                        className="p-1 cursor-pointer transition active:scale-110"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= newReviewRating
                              ? 'fill-[#FF9500] text-[#FF9500] dark:fill-[#FF9F0A] dark:text-[#FF9F0A]'
                              : 'fill-black/[0.08] text-black/[0.12] dark:fill-white/[0.12] dark:text-white/[0.18]'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={newReviewComment}
                    onChange={(e) => setNewReviewComment(e.target.value)}
                    placeholder="Describe your purchase experience with this seller..."
                    className="w-full bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.1] focus:border-[#0071E3] dark:focus:border-[#0A84FF] rounded-2xl p-4 text-sm focus:outline-none transition font-medium min-h-[90px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B]"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="bg-[#0071E3] dark:bg-[#0A84FF] hover:bg-[#0077ED] dark:hover:bg-[#1E8EFF] text-white px-6 py-2.5 rounded-full font-semibold text-sm shadow-xs disabled:opacity-50 transition cursor-pointer active:scale-[0.97]"
                    >
                      {submittingReview ? 'Submitting...' : 'Post Review'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Reviews List */}
              <div className="space-y-3">
                {reviews.length === 0 && (
                  <div className="bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.1] rounded-[24px] p-8 text-center text-[#6E6E73] dark:text-[#98989D]">
                    No reviews submitted yet.
                  </div>
                )}

                {reviews.map((review, i) => (
                  <div 
                    key={i} 
                    className="bg-white dark:bg-[#1C1C1E] rounded-[22px] p-5 border border-black/[0.06] dark:border-white/[0.1] shadow-xs space-y-3"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                          {(review.reviewerName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <Link 
                            to={`/store/${review.reviewerId || review.userId}`} 
                            className="font-bold text-sm text-[#1D1D1F] dark:text-[#F5F5F7] hover:underline"
                          >
                            {review.reviewerName || 'Anonymous Buyer'}
                          </Link>
                          <span className="text-[#6E6E73] dark:text-[#98989D] text-xs font-medium block">
                            {review.reviewerCountry || 'Verified Buyer'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`w-4 h-4 ${
                                star <= (review.rating || 5) 
                                  ? 'fill-[#FF9500] text-[#FF9500] dark:fill-[#FF9F0A] dark:text-[#FF9F0A]' 
                                  : 'fill-black/[0.08] text-black/[0.12] dark:fill-white/[0.12] dark:text-white/[0.18]'
                              }`} 
                            />
                          ))}
                        </div>
                        <span className="text-[#6E6E73] dark:text-[#98989D] text-[11px] font-medium mt-1 tabular-nums">
                          {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                    </div>

                    {review.title && (
                      <h4 className="font-bold text-base text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {review.title}
                      </h4>
                    )}

                    <p className="text-sm text-[#1D1D1F]/85 dark:text-[#F5F5F7]/85 font-medium leading-relaxed">
                      {review.comment || 'No comments provided.'}
                    </p>

                    {review.images && Array.isArray(review.images) && review.images.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {review.images.map((img: string, idx: number) => (
                          <div key={idx} className="w-20 h-20 rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.1] shrink-0 overflow-hidden">
                            <img src={img} alt="Review attachment" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating Apple Translucent Contact Dock for Mobile */}
      {user?.uid !== seller.id && (
        <div className="fixed bottom-4 left-4 right-4 sm:hidden z-30">
          <div className="ds-apple-popover rounded-full p-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                navigate(`/messages?chatId=${seller.id}`);
              }}
              className="flex-1 py-3 px-4 bg-[#0071E3] dark:bg-[#0A84FF] text-white rounded-full font-semibold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95 transition"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat Seller</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                handleFollowToggle();
              }}
              className={`flex-1 py-3 px-4 rounded-full font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition border ${
                isFollowing
                  ? 'bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] border-black/[0.08] dark:border-white/[0.12]'
                  : 'bg-[#1D1D1F] dark:bg-[#F5F5F7] text-white dark:text-[#1D1D1F] border-transparent'
              }`}
            >
              {isFollowing ? <UserCheck className="w-4 h-4 text-[#248A3D] dark:text-[#30D158]" /> : <UserPlus className="w-4 h-4" />}
              <span>{isFollowing ? 'Following' : 'Follow'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                handleShare();
              }}
              className="ds-apple-icon-btn w-11 h-11 rounded-full flex items-center justify-center text-[#1D1D1F] dark:text-[#F5F5F7] cursor-pointer active:scale-95 transition"
              title="Share Store"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Pause Orders Confirmation Modal */}
      <LiquidGlassPopup
        open={showPauseModal}
        onClose={() => setShowPauseModal(false)}
        title="স্টোরের অর্ডার গ্রহণ বন্ধ রাখুন"
        description='এটি চালু করলে আপনার স্টোরের সব প্রোডাক্টে "Buy Now" ও অর্ডার গ্রহণ বন্ধ থাকবে এবং কাস্টমারদের আপনার দেওয়া কারণ দেখানো হবে।'
        primaryAction={{
          label: "বন্ধ রাখুন (Pause)",
          onClick: handleSavePauseOrders,
          disabled: !tempPauseReason.trim() || savingPause,
          loading: savingPause,
        }}
        secondaryAction={{
          label: "বাতিল",
          onClick: () => setShowPauseModal(false),
        }}
      >
        <div>
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
            অর্ডার বন্ধ রাখার কারণ (Reason to show buyers) *
          </label>
          <textarea
            rows={3}
            autoFocus
            className="w-full ds-liquid-input p-3 font-medium outline-none transition placeholder:text-zinc-400 resize-none text-sm rounded-2xl"
            value={tempPauseReason}
            placeholder="যেমন: সাময়িক স্টক আপডেট চলছে / ঈদের ছুটি / ভ্যাকেশনে আছি..."
            onChange={(e) => setTempPauseReason(e.target.value)}
          />
        </div>
      </LiquidGlassPopup>

      {/* Report Seller Popup */}
      {renderReportSellerPopup()}
    </div>
  );
};

export default StoreProfile;
