import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';

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
  TrendingUp,
  ThumbsUp,
  Users,
  Package,
  Sparkles,
  ExternalLink,
  Edit3
} from 'lucide-react';
import { ProductCard } from '../components/ui/ProductCard';
import Icon from '../components/Icon';
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
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-white/60 dark:border-zinc-800/80 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={handleBackNavigation}
          className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center text-zinc-800 dark:text-zinc-100 shrink-0 cursor-pointer transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <UserAvatar
          src={seller.photoURL}
          fallbackText={seller.shopName || seller.displayName}
          className="w-10 h-10 shrink-0 border-2 border-white dark:border-zinc-800 shadow-xs"
        />

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-extrabold text-base leading-tight text-zinc-900 dark:text-white truncate">
              {seller.shopName || getSafeDisplayName(seller, "Seller")}
            </span>
            {seller.kycStatus === "verified" && (
              <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
            )}
          </div>
          <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium truncate">
            {getSafePublicUsername(seller)
              ? `@${getSafePublicUsername(seller)}`
              : `ID: ${seller.id.substring(0, 7).toUpperCase()}`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200 shrink-0">
        {showStoreSearch && (
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            aria-label="Search store"
            className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center transition cursor-pointer active:scale-95"
          >
            <Search className="w-5 h-5" />
          </button>
        )}

        {user?.uid !== seller.id && (
          <button
            type="button"
            onClick={() => navigate(`/messages?chatId=${seller.id}`)}
            aria-label="Message seller"
            className="w-10 h-10 rounded-full bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600/20 flex items-center justify-center transition cursor-pointer active:scale-95"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="More options"
            aria-expanded={showMenu}
            className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center transition cursor-pointer active:scale-95"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-56 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/60 dark:border-zinc-800 z-50 overflow-hidden py-1.5">
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-black/5 dark:hover:bg-white/10 text-sm font-semibold text-zinc-800 dark:text-zinc-200 transition cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span>Share Store</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyStoreLink}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-black/5 dark:hover:bg-white/10 text-sm font-semibold text-zinc-800 dark:text-zinc-200 border-t border-zinc-100 dark:border-zinc-800/80 transition cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span>Copy Store Link</span>
                </button>
                {user?.uid !== seller.id && (
                  <>
                    <button
                      type="button"
                      onClick={handleOpenReport}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-amber-500/10 text-sm font-semibold text-amber-600 dark:text-amber-400 border-t border-zinc-100 dark:border-zinc-800/80 transition cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Report Seller</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleBlock}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-rose-500/10 text-sm font-semibold text-rose-600 dark:text-rose-400 border-t border-zinc-100 dark:border-zinc-800/80 transition cursor-pointer"
                    >
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>Block Seller</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
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
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#090a0f] text-zinc-950 dark:text-white font-sans pb-32">
      {/* Top Glass Header */}
      {renderTopProfileHeader(true)}

      {/* Search Overlay */}
      {showSearch && (
        <div className="px-4 py-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <input 
            type="text" 
            placeholder="Search in this seller's store..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm dark:text-white font-medium"
            autoFocus
          />
          <button 
            type="button" 
            onClick={() => { setShowSearch(false); setSearchQuery(''); }} 
            className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
      )}

      {/* Main Responsive Store Layout */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-4 space-y-6">

        {/* Seller Store Paused Status Banner */}
        {seller.ordersPaused && (
          <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 rounded-[28px] p-5 backdrop-blur-xl shadow-lg space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-400 font-extrabold text-sm sm:text-base">
                <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                <span>অর্ডার গ্রহণ সাময়িকভাবে বন্ধ আছে (Orders Paused)</span>
              </div>
              {user?.uid === seller.id && (
                <button 
                  type="button"
                  onClick={handleResumeOrders}
                  disabled={savingPause}
                  className="text-xs px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  চালু করুন
                </button>
              )}
            </div>
            <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
              <strong>কারণ:</strong> "{seller.pauseReason || "বিক্রেতা সাময়িক বিরতিতে থাকায় বর্তমানে অর্ডার গ্রহণ বন্ধ রয়েছে।"}"
            </p>
          </div>
        )}

        {/* Owner Quick Controls (When viewing own store) */}
        {user?.uid === seller.id && !seller.ordersPaused && (
          <div className="bg-emerald-50/90 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-[24px] p-4 flex items-center justify-between flex-wrap gap-3 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>আপনার সেলার স্টোরে স্বাভাবিকভাবে অর্ডার গ্রহণ চলছে</span>
            </div>
            <button 
              type="button"
              onClick={() => {
                setTempPauseReason(seller.pauseReason || "সাময়িক বিরতির কারণে অর্ডার গ্রহণ বন্ধ রাখা হলো।");
                setShowPauseModal(true);
              }}
              className="text-xs px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              অর্ডার বন্ধ করুন
            </button>
          </div>
        )}

        {/* ================= HERO STORE BANNER ================= */}
        <div className="relative rounded-[32px] overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-white/60 dark:border-zinc-800/80 shadow-xl">
          {/* Cover Photo */}
          <div 
            className="h-44 sm:h-64 w-full bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 bg-cover bg-center relative"
            style={
              seller.profileBg || seller.coverPhoto
                ? { backgroundImage: `url(${seller.profileBg || seller.coverPhoto})` }
                : undefined
            }
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </div>

          {/* Profile Details Container */}
          <div className="px-5 sm:px-8 pb-6 relative -mt-16 sm:-mt-20 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6 min-w-0">
              {/* Store Avatar */}
              <div className="relative shrink-0">
                <UserAvatar
                  src={seller.photoURL}
                  fallbackText={seller.shopName || seller.displayName}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl ring-4 ring-white dark:ring-zinc-900 shadow-2xl object-cover"
                />
                {seller.kycStatus === "verified" && (
                  <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center ring-4 ring-white dark:ring-zinc-900 shadow-md">
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                )}
              </div>

              {/* Title & Info */}
              <div className="min-w-0 space-y-1.5">
                {/* Line 1: Shop Name + Verified Badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight truncate">
                    {seller.shopName || getSafeDisplayName(seller, "Seller Store")}
                  </h1>
                  {seller.kycStatus === "verified" && (
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-extrabold border border-blue-500/20 inline-flex items-center gap-1 shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified Seller</span>
                    </span>
                  )}
                </div>

                {/* Line 2: Username Handle */}
                <div className="text-xs sm:text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                  {getSafePublicUsername(seller)
                    ? `@${getSafePublicUsername(seller)}`
                    : `ID: ${seller.id.substring(0, 8).toUpperCase()}`}
                </div>

                {/* Line 3: Location Address */}
                {seller.address && (
                  <div className="flex items-start gap-1.5 text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
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
                    onClick={() => navigate(`/messages?chatId=${seller.id}`)}
                    className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Chat with Seller</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFollowToggle}
                    className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs active:scale-95 transition cursor-pointer ${
                      isFollowing
                        ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white border border-black/10 dark:border-zinc-700"
                        : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-4 h-4 text-emerald-500" />
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
                onClick={() => navigate(`/loops/profile/${seller.id}`)}
                className="px-4 py-2.5 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Globe className="w-4 h-4" />
                <span>Feed Profile</span>
              </button>
            </div>
          </div>
        </div>

        {/* ================= LIQUID GLASS TRUST METRICS BAR ================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Rating */}
          <div className="p-4 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/60 dark:border-zinc-800/80 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Rating</span>
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black tabular-nums text-zinc-950 dark:text-white">
                {averageRating > 0 ? averageRating.toFixed(1) : "New"}
              </span>
              <span className="text-xs text-zinc-400 font-semibold">/ 5.0</span>
            </div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate mt-0.5">
              ({reviews.length} ratings)
            </span>
          </div>

          {/* Positive Percent */}
          <div className="p-4 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/60 dark:border-zinc-800/80 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Positive</span>
              <ThumbsUp className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black tabular-nums text-zinc-950 dark:text-white">
                {positivePercent}%
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate mt-0.5">
              Satisfaction score
            </span>
          </div>

          {/* Total Sold */}
          <div className="p-4 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/60 dark:border-zinc-800/80 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between text-blue-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Sold</span>
              <Package className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black tabular-nums text-zinc-950 dark:text-white">
                {formatCompactNumber(totalSold)}+
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate mt-0.5">
              Products delivered
            </span>
          </div>

          {/* Regular Buyers */}
          <div className="p-4 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/60 dark:border-zinc-800/80 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between text-purple-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Buyers</span>
              <Users className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black tabular-nums text-zinc-950 dark:text-white">
                {formatCompactNumber(regularBuyers)}+
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate mt-0.5">
              Repeat customers
            </span>
          </div>

          {/* Followers */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-1 p-4 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/60 dark:border-zinc-800/80 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between text-indigo-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Followers</span>
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black tabular-nums text-zinc-950 dark:text-white">
                {formatCompactNumber(followersCount)}
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate mt-0.5">
              Community reach
            </span>
          </div>
        </div>

        {/* ================= LIQUID GLASS TAB NAVIGATION ================= */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-1.5 rounded-[24px] border border-white/60 dark:border-zinc-800/80 shadow-lg flex items-center justify-start sm:justify-around gap-1.5 w-full overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'home'
                ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-md'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            <Home className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Products ({filteredProducts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-md'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Categories</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gallery')}
            className={`py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'gallery'
                ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-md'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Gallery</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'reviews'
                ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-md'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            <Star className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Reviews ({reviews.length})</span>
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
                <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/60 dark:border-zinc-800/80 rounded-[32px] p-12 text-center space-y-3">
                  <ShoppingBag className="w-12 h-12 text-zinc-400 mx-auto" />
                  <p className="text-zinc-500 dark:text-zinc-400 font-semibold text-sm">
                    {searchQuery ? `No products match "${searchQuery}"` : "No products available in this store yet."}
                  </p>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-xs font-bold text-blue-500 hover:underline cursor-pointer"
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
              <h3 className="font-extrabold text-lg text-zinc-950 dark:text-white">Store Categories</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from(new Set(products.map(p => p.category || 'Other'))).map(cat => {
                  const catCount = products.filter(p => (p.category || 'Other') === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSearchQuery(cat === 'Other' ? '' : cat);
                        setActiveTab('home');
                      }}
                      className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-5 rounded-[24px] border border-white/60 dark:border-zinc-800/80 hover:border-blue-500/50 shadow-md flex items-center justify-between gap-3 text-left transition active:scale-95 cursor-pointer"
                    >
                      <div>
                        <span className="font-bold text-sm text-zinc-950 dark:text-white block">{cat}</span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">{catCount} items</span>
                      </div>
                      <Layers className="w-5 h-5 text-blue-500 shrink-0" />
                    </button>
                  );
                })}
                {products.length === 0 && (
                  <div className="col-span-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/60 dark:border-zinc-800/80 rounded-[28px] p-8 text-center text-zinc-500">
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
                  onClick={() => navigate(`/product/${product.id}`)} 
                  className="aspect-square bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl overflow-hidden relative cursor-pointer group border border-white/60 dark:border-zinc-800/80 shadow-xs"
                >
                  {product.images?.[0] ? (
                    <img 
                      src={product.images[0]} 
                      alt={product.name} 
                      referrerPolicy="no-referrer" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                  )}
                  {product.price && (
                    <div className="absolute bottom-1.5 left-1.5 bg-black/75 backdrop-blur-md text-white text-[11px] px-2 py-0.5 rounded-lg font-extrabold tabular-nums">
                      ৳{product.price}
                    </div>
                  )}
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/60 dark:border-zinc-800/80 rounded-[28px] p-8 text-center text-zinc-500">
                  No products found in gallery.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REVIEWS & RATINGS */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {/* Leave a Review Form */}
              <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-[28px] p-5 sm:p-6 border border-white/60 dark:border-zinc-800/80 shadow-lg space-y-4">
                <h3 className="font-extrabold text-base text-zinc-950 dark:text-white">Write a Verified Store Review</h3>
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReviewRating(star)}
                        className="p-1 cursor-pointer transition active:scale-110"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= newReviewRating
                              ? 'fill-amber-500 text-amber-500'
                              : 'fill-zinc-200 text-zinc-300 dark:fill-zinc-800 dark:text-zinc-700'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={newReviewComment}
                    onChange={(e) => setNewReviewComment(e.target.value)}
                    placeholder="Describe your purchase experience with this seller..."
                    className="w-full bg-white/90 dark:bg-zinc-950/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-medium min-h-[90px] dark:text-white"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl font-bold text-sm shadow-md disabled:opacity-50 transition cursor-pointer"
                    >
                      {submittingReview ? 'Submitting...' : 'Post Review'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Reviews List */}
              <div className="space-y-3">
                {reviews.length === 0 && (
                  <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/60 dark:border-zinc-800/80 rounded-[28px] p-8 text-center text-zinc-500">
                    No reviews submitted yet.
                  </div>
                )}

                {reviews.map((review, i) => (
                  <div 
                    key={i} 
                    className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-[24px] p-5 border border-white/60 dark:border-zinc-800/80 shadow-md space-y-3"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-base shrink-0 shadow-xs">
                          {(review.reviewerName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <Link 
                            to={`/store/${review.reviewerId || review.userId}`} 
                            className="font-extrabold text-sm text-zinc-950 dark:text-white hover:underline"
                          >
                            {review.reviewerName || 'Anonymous Buyer'}
                          </Link>
                          <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold block">
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
                                  ? 'fill-amber-500 text-amber-500' 
                                  : 'fill-zinc-200 text-zinc-300 dark:fill-zinc-800 dark:text-zinc-700'
                              }`} 
                            />
                          ))}
                        </div>
                        <span className="text-zinc-400 text-[11px] font-medium mt-1">
                          {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                    </div>

                    {review.title && (
                      <h4 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">
                        {review.title}
                      </h4>
                    )}

                    <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
                      {review.comment || 'No comments provided.'}
                    </p>

                    {review.images && Array.isArray(review.images) && review.images.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {review.images.map((img: string, idx: number) => (
                          <div key={idx} className="w-20 h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shrink-0 overflow-hidden">
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

      {/* Floating Liquid Glass Contact Dock for Mobile */}
      {user?.uid !== seller.id && (
        <div className="fixed bottom-4 left-4 right-4 sm:hidden z-30">
          <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl border border-white/60 dark:border-zinc-800 rounded-full p-2 shadow-2xl flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/messages?chatId=${seller.id}`)}
              className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-full font-extrabold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95 transition"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat Seller</span>
            </button>

            <button
              type="button"
              onClick={handleFollowToggle}
              className={`flex-1 py-3 px-4 rounded-full font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition ${
                isFollowing
                  ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                  : 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950'
              }`}
            >
              {isFollowing ? <UserCheck className="w-4 h-4 text-emerald-500" /> : <UserPlus className="w-4 h-4" />}
              <span>{isFollowing ? 'Following' : 'Follow'}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="w-11 h-11 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-zinc-800 dark:text-zinc-100 cursor-pointer active:scale-95 transition"
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
