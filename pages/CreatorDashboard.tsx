import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Menu, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  ChevronRight, 
  Star, 
  Handshake, 
  Sparkles, 
  DollarSign, 
  Plus, 
  Eye, 
  Heart, 
  MessageCircle, 
  ShieldCheck, 
  Share2, 
  Coins, 
  Award, 
  Sliders, 
  Info, 
  X,
  Clock,
  Users,
  CreditCard,
  AlertCircle,
  Lock
} from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useNotify } from '../components/Notifications';
import SEO from '../components/SEO';
import GiftStarsModal from '../components/GiftStarsModal';

type TabType = 'analytics' | 'content' | 'community' | 'monetise';
type PeriodType = '28_days' | '7_days' | 'today';

export const CreatorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();
  const currentUser = auth.currentUser;

  const [activeTab, setActiveTab] = useState<TabType>('analytics');
  const [period, setPeriod] = useState<PeriodType>('28_days');

  // Creator profile state
  const [userData, setUserData] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Star withdrawal states
  const [showStarWithdrawModal, setShowStarWithdrawModal] = useState(false);
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("bKash");
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

  // Buy stars modal
  const [showBuyStarsModal, setShowBuyStarsModal] = useState(false);

  // Monetization features state
  const [partnershipAdsEnabled, setPartnershipAdsEnabled] = useState(() => {
    return localStorage.getItem('creator_partnership_ads') !== 'false';
  });
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(() => {
    return localStorage.getItem('creator_subscription_enabled') === 'true';
  });
  const [subscriptionFee, setSubscriptionFee] = useState(() => {
    return localStorage.getItem('creator_subscription_fee') || '500';
  });
  const [isEditingFee, setIsEditingFee] = useState(false);

  // AUTH GUARD: User must be signed in to access Creator Dashboard
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => {
      if (!u) {
        notify("Account required: Please sign in to access Creator Dashboard!", "error");
        navigate('/signin', { state: { returnTo: '/creator-dashboard' } });
      }
    });
    return unsubAuth;
  }, [navigate]);

  useEffect(() => {
    const loadCreatorData = async () => {
      setLoading(true);
      try {
        if (currentUser) {
          const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
          if (userSnap.exists()) {
            setUserData(userSnap.data());
          }
        }

        // Load recent posts
        const postsSnap = await getDocs(collection(db, 'scam_posts'));
        const allPosts: any[] = [];
        postsSnap.forEach((d) => allPosts.push({ id: d.id, ...d.data() }));

        const userPosts = currentUser 
          ? allPosts.filter(p => p.reporterId === currentUser.uid)
          : [];
        setPosts(userPosts.length > 0 ? userPosts : allPosts.slice(0, 3));
      } catch (err) {
        console.error("Error loading creator data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadCreatorData();
  }, [currentUser]);

  const togglePartnershipAds = () => {
    const nextVal = !partnershipAdsEnabled;
    setPartnershipAdsEnabled(nextVal);
    localStorage.setItem('creator_partnership_ads', String(nextVal));
    notify(
      nextVal 
        ? "Partnership Ads activated! Deep Shop sponsor ads will display on your posts." 
        : "Partnership Ads turned off.", 
      "success"
    );
  };

  const toggleSubscription = () => {
    const nextVal = !subscriptionEnabled;
    setSubscriptionEnabled(nextVal);
    localStorage.setItem('creator_subscription_enabled', String(nextVal));
    notify(
      nextVal 
        ? `Creator Subscriptions activated at ৳${subscriptionFee}/month!` 
        : "Creator Subscriptions paused.", 
      "success"
    );
  };

  const saveSubscriptionFee = (val: string) => {
    setSubscriptionFee(val);
    localStorage.setItem('creator_subscription_fee', val);
    setIsEditingFee(false);
    notify(`Monthly sponsorship price set to ৳${val}!`, "success");
  };

  // Submit Star Earnings Withdrawal Request (Minimum 1,000 Stars = 1,000 BDT)
  const handleStarWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const earnedStars = userData?.earnedStars || 0;
    if (earnedStars < 1000) {
      notify(`Minimum 1,000 earned stars (৳1,000) required to withdraw. Current: ${earnedStars} stars.`, "error");
      return;
    }

    if (!withdrawPhone) {
      notify("Please enter your bKash or Nagad phone number", "error");
      return;
    }

    setIsSubmittingWithdraw(true);
    try {
      await addDoc(collection(db, "star_withdrawals"), {
        userId: currentUser.uid,
        userName: userData?.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || "Creator",
        userEmail: currentUser.email || "",
        starsAmount: earnedStars,
        amountBDT: earnedStars, // 1 Star = 1 BDT
        paymentMethod: withdrawMethod,
        accountPhone: withdrawPhone,
        status: "pending",
        createdAt: Date.now()
      });

      notify(`Star withdrawal request of ৳${earnedStars} (${earnedStars} ⭐ Stars) submitted to Admin!`, "success");
      setShowStarWithdrawModal(false);
      setWithdrawPhone("");
    } catch (err) {
      notify("Failed to submit withdrawal request", "error");
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  const creatorName = userData?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || "User";
  const creatorAvatar = userData?.photoURL || currentUser?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
  const followerCount = userData?.followersCount || 12;
  const earnedStars = userData?.earnedStars || 0;
  const purchasedStars = userData?.purchasedStars || 0;
  const availableStarsBalance = userData?.starsBalance || userData?.sparks || 0;

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans pb-24">
      <SEO 
        title="Creator Dashboard • Deep Shop Creator Studio"
        description="Monitor analytics, track content performance, monetization, stars, partnership ads, and creator subscriptions on Deep Shop."
      />

      {/* TOP BAR */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/news-hub')}
              className="p-2 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              title="Back to Feed"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-800 dark:text-zinc-200" />
            </button>
            <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Creator Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate('/news-hub')}
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-zinc-700 dark:text-zinc-300"
              title="Search"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 4 HORIZONTAL TABS */}
        <div className="max-w-2xl mx-auto px-4 pb-2.5 overflow-x-auto no-scrollbar flex items-center gap-2">
          {(['analytics', 'content', 'community', 'monetise'] as TabType[]).map((tab) => {
            const labels: Record<TabType, string> = {
              analytics: 'Analytics',
              content: 'Content',
              community: 'Community',
              monetise: 'Monetise',
            };
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer capitalize ${
                  isActive
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-extrabold shadow-2xs'
                    : 'bg-zinc-100 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-2xl mx-auto px-4 py-4 space-y-6">

        {/* TAB 1: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* CREATOR IDENTITY & PROGRESS BANNER */}
            <div 
              onClick={() => navigate('/profile')}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img 
                    src={creatorAvatar} 
                    alt={creatorName}
                    className="w-14 h-14 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                  />
                  <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-black flex items-center justify-center text-white">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1">
                    <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                      {creatorName}
                    </h3>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Verified Creator Member
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-amber-500 font-mono block">
                  {earnedStars} ⭐ Earned
                </span>
                <span className="text-[10px] text-zinc-400">
                  {availableStarsBalance} balance
                </span>
              </div>
            </div>

            {/* PERFORMANCE OVERVIEW */}
            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-4">
              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white uppercase tracking-wider">
                Performance Overview (Last 28 Days)
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-[11px] font-bold text-zinc-400 block">Total Views</span>
                  <span className="text-xl font-black text-zinc-900 dark:text-white">
                    {posts.reduce((acc, p) => acc + (p.views || 0), 0) + 1420}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-[11px] font-bold text-zinc-400 block">Scam Votes</span>
                  <span className="text-xl font-black text-rose-600 dark:text-rose-400">
                    {posts.reduce((acc, p) => acc + (p.votes || 0), 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONTENT */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">Your Incident Reports</h3>
            {posts.map((p) => (
              <div 
                key={p.id}
                onClick={() => navigate(`/news-hub/post/${p.id}`)}
                className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition cursor-pointer space-y-1.5"
              >
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white line-clamp-1">{p.title}</h4>
                <p className="text-xs text-zinc-500 line-clamp-2">{p.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: COMMUNITY */}
        {activeTab === 'community' && (
          <div className="space-y-4">
            <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">Community Engagement</h3>
            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-center space-y-2">
              <Users className="w-8 h-8 text-blue-500 mx-auto" />
              <p className="font-bold text-xs">Stay connected with your readers</p>
            </div>
          </div>
        )}

        {/* TAB 4: MONETISE */}
        {activeTab === 'monetise' && (
          <div className="space-y-6">

            {/* STAR EARNINGS & WITHDRAWAL CARD */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/30 space-y-4">
              <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 min-w-0">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" />
                  <div className="flex items-center gap-2 whitespace-nowrap min-w-0">
                    <h3 className="text-xs sm:text-sm font-extrabold text-zinc-900 dark:text-white truncate">
                      Star Earnings (Gifted Stars)
                    </h3>
                    <span className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-semibold">
                      • 1 Star = ৳1.00 BDT
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/buy-stars')}
                  className="px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[11px] sm:text-xs shadow-xs transition flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 fill-white text-white" />
                  <span>Buy Stars</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900/40 overflow-hidden">
                  <span className="text-[10px] font-bold text-zinc-500 block truncate whitespace-nowrap">Earned (Withdrawable)</span>
                  <div className="text-base sm:text-lg font-mono font-black text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5 truncate whitespace-nowrap">
                    <span>{earnedStars}</span>
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 inline" />
                    <span className="text-xs font-normal text-zinc-500">(৳{earnedStars})</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <span className="text-[10px] font-bold text-zinc-500 block truncate whitespace-nowrap">Purchased (Tips Only)</span>
                  <div className="text-base sm:text-lg font-mono font-black text-zinc-700 dark:text-zinc-300 flex items-center gap-1 mt-0.5 truncate whitespace-nowrap">
                    <span>{purchasedStars}</span>
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 inline" />
                  </div>
                </div>
              </div>

              {/* Star Withdrawal Action */}
              <div className="pt-0.5">
                {earnedStars >= 1000 ? (
                  <button
                    type="button"
                    onClick={() => setShowStarWithdrawModal(true)}
                    className="w-full py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span className="truncate">Withdraw Earned Stars (৳{earnedStars})</span>
                  </button>
                ) : (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-[10px] sm:text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2 overflow-hidden">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="font-bold truncate whitespace-nowrap">Min 1,000 ⭐ (৳1,000) to withdraw</span>
                    </div>
                    <span className="font-mono font-bold shrink-0 text-amber-700 dark:text-amber-400 whitespace-nowrap">
                      {earnedStars}/1,000 ⭐
                    </span>
                  </div>
                )}
              </div>

              <div className="text-[10px] text-zinc-400 whitespace-nowrap truncate">
                * Gifted stars withdrawable at ৳1,000 min. Purchased stars cannot be withdrawn.
              </div>
            </div>

            {/* PROGRAMMES SECTION */}
            <div className="space-y-3">
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-white whitespace-nowrap">
                Monetization Programmes
              </h3>

              {/* Programme 0: Content Monetization (Locked) */}
              <div className="p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white whitespace-nowrap truncate">
                        Content Monetization
                      </h4>
                      <p className="text-[11px] text-zinc-500 whitespace-nowrap truncate">
                        Earn revenue share from article impressions
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 whitespace-nowrap shrink-0 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-zinc-500" /> Locked
                  </span>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 whitespace-nowrap">
                    <span>Follower Requirement Progress</span>
                    <span className="text-purple-600 dark:text-purple-400">248 / 1,000 Followers (25%)</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-600 rounded-full w-[25%]" />
                  </div>
                </div>
              </div>

              {/* Programme 1: Partnership Ads */}
              <div className="p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 shrink-0">
                      <Handshake className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white whitespace-nowrap truncate">
                        Partnership Ads
                      </h4>
                      <p className="text-[11px] text-zinc-500 whitespace-nowrap truncate">DEEP SHOP admin sponsored ads on your post</p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={partnershipAdsEnabled} 
                      onChange={togglePartnershipAds}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Programme 2: Subscriptions */}
              <div className="p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white whitespace-nowrap truncate">
                        Creator Subscriptions & Sponsorship
                      </h4>
                      <p className="text-[11px] text-zinc-500 whitespace-nowrap truncate">Allow users to sponsor your channel</p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={subscriptionEnabled} 
                      onChange={toggleSubscription}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="pt-1 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                  <span className="text-[10px] sm:text-xs text-zinc-500 whitespace-nowrap truncate min-w-0">
                    Custom per-post, monthly, & yearly rates
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/creator/subscription-setup')}
                    className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Setup Rates & Perks →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* STAR EARNINGS WITHDRAWAL MODAL */}
      {showStarWithdrawModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="font-extrabold text-sm">Withdraw Earned Stars</h3>
              <button
                type="button"
                onClick={() => setShowStarWithdrawModal(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 space-y-1">
              <span className="text-xs text-zinc-500 block">Total Withdrawable Stars:</span>
              <span className="text-xl font-mono font-black text-emerald-600 dark:text-emerald-400 block">
                {earnedStars} ⭐ = ৳{earnedStars} BDT
              </span>
            </div>

            <form onSubmit={handleStarWithdrawSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block mb-1">
                  Payout Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["bKash", "Nagad"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setWithdrawMethod(m)}
                      className={`py-2 rounded-xl text-xs font-bold transition ${
                        withdrawMethod === m
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block mb-1">
                  Your Personal {withdrawMethod} Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="017XXXXXXXX"
                  value={withdrawPhone}
                  onChange={(e) => setWithdrawPhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none font-mono font-bold"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingWithdraw}
                className="w-full py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingWithdraw ? "Submitting..." : `Submit Withdrawal Request (৳${earnedStars})`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* BUY STARS MODAL */}
      <GiftStarsModal
        isOpen={showBuyStarsModal}
        onClose={() => setShowBuyStarsModal(false)}
      />
    </div>
  );
};

export default CreatorDashboard;
