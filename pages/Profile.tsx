import { useRegion } from "@/components/RegionContext";
import { getRegionFlagSvg } from "@/components/RegionFlags";
import React, { useState, useEffect } from "react";
import { UserProfile, Order, OrderStatus } from "../types";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signOut, updateProfile } from "firebase/auth";
import { doc, updateDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { useNotify } from "../components/Notifications";
import { uploadToImgbb } from "../services/imgbb";
import { cn } from "../lib/utils";
import { AvatarUploader } from "../components/ui/avatar-uploader";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import Icon from "../components/Icon";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  User,
  CreditCard,
  Package,
  Settings,
  HelpCircle,
  ShieldCheck,
  UserPlus,
  LogOut,
  Lock,
  Users,
  Heart,
  Ticket,
  Coins,
  LayoutDashboard,
  Sparkles,
  Store,
  MessageSquare,
  FileText,
  Truck,
  Phone,
  Mail,
  Pencil,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useTheme } from "../components/ThemeContext";

const FingerprintIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M2 12a10 10 0 0 1 18-6" />
    <path d="M5 19.5A10 10 0 0 1 18 10" />
    <path d="m11 22 .5-1.5a10 10 0 0 1 13.9-6" />
    <path d="M14 22a7 7 0 0 0 5-5" />
    <path d="M8 15a5 5 0 0 1 8-4" />
    <path d="M9 19a5 5 0 0 0 3-4" />
  </svg>
);
import SEO from "../components/SEO";
import { useTour, TourProvider } from "@/components/ui/tour";
import { ProductCard } from "../components/ui/ProductCard";
import { SellerBadge, RegisteredBadge } from "../components/SellerBadge";

const TicketsSvg = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    className={cn("w-5 h-5 line", props.className)} 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    fill="none" 
    {...props}
  >
    <path 
      d="M20 12.2V13.9C20 17.05 18.2 18.4 15.5 18.4H6.5C3.8 18.4 2 17.05 2 13.9V8.5C2 5.35 3.8 4 6.5 4H9.2C9.07 4.38 9 4.8 9 5.25V9.15002C9 10.12 9.32 10.94 9.89 11.51C10.46 12.08 11.28 12.4 12.25 12.4V13.79C12.25 14.3 12.83 14.61 13.26 14.33L16.15 12.4H18.75C19.2 12.4 19.62 12.33 20 12.2Z" 
      strokeMiterlimit="10"
    />
    <path 
      d="M22 5.25V9.15002C22 10.64 21.24 11.76 20 12.2C19.62 12.33 19.2 12.4 18.75 12.4H16.15L13.26 14.33C12.83 14.61 12.25 14.3 12.25 13.79V12.4C11.28 12.4 10.46 12.08 9.89 11.51C9.32 10.94 9 10.12 9 9.15002V5.25C9 4.8 9.07 4.38 9.2 4C9.64 2.76 10.76 2 12.25 2H18.75C20.7 2 22 3.3 22 5.25Z" 
      strokeMiterlimit="10"
    />
    <path d="M7.4 22H14.6" strokeMiterlimit="10" />
    <path d="M11 18.4V22" strokeMiterlimit="10" />
    <path d="M18.5 7.25H18.51" strokeWidth="2" />
    <path d="M15.7 7.25H15.71" strokeWidth="2" />
    <path d="M12.9 7.25H12.91" strokeWidth="2" />
  </svg>
);

export const ProfileTourSteps = () => {
  const { setSteps } = useTour();
  useEffect(() => {
    setSteps([
      {
        selectorId: "profile-info",
        content: (
          <div className="space-y-2">
            <h3 className="font-bold text-lg">Your Profile</h3>
            <p className="text-sm text-zinc-500">Quickly see your saved items and total order counts.</p>
          </div>
        ),
        position: "bottom"
      },
      {
        selectorId: "profile-orders",
        content: (
          <div className="space-y-2">
            <h3 className="font-bold text-lg">Order Status</h3>
            <p className="text-sm text-zinc-500">Track items to pay, ship, receive and review.</p>
          </div>
        ),
        position: "bottom"
      },
      {
        selectorId: "profile-referral",
        content: (
          <div className="space-y-2">
            <h3 className="font-bold text-lg">Refer & Earn</h3>
            <p className="text-sm text-zinc-500">Share with friends to earn rewards! Click here to open your dashboard.</p>
          </div>
        ),
        position: "top"
      },
      {
        selectorId: "profile-menu",
        content: (
          <div className="space-y-2">
            <h3 className="font-bold text-lg">Settings & More</h3>
            <p className="text-sm text-zinc-500">Access your past orders, wishlist, addresses and app settings here.</p>
          </div>
        ),
        position: "top"
      }
    ]);
  }, [setSteps]);
  return null;
};

interface ProfileProps {
  userData: UserProfile | null;
}

const ProfileView: React.FC<ProfileProps> = ({ userData: initialUserData }) => {
  const { formatPrice, region } = useRegion();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const notify = useNotify();
  const [updating, setUpdating] = useState(false);
  const [localUserData, setLocalUserData] = useState<UserProfile | null>(initialUserData);
  const [orders, setOrders] = useState<Order[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsubUser = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setLocalUserData(snapshot.data() as UserProfile);
      }
    });
    return () => unsubUser();
  }, []);

  useEffect(() => {
    setLocalUserData(initialUserData);
  }, [initialUserData]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const q = query(collection(db, "orders"), where("userId", "==", user.uid));
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const userOrders = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
          setOrders(userOrders);
        },
        (error) => {
          console.error("Error fetching orders:", error);
        }
      );
      return () => unsubscribe();
    } catch (error) {
      console.error("Error setting up orders listener:", error);
    }
  }, []);

  useEffect(() => {
    try {
      const q = query(collection(db, "products"));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          const shuffled = docs.sort(() => 0.5 - Math.random());
          setRecommendedProducts(shuffled.slice(0, 6));
        },
        (error) => {
          console.error("Error fetching recommended products:", error);
        }
      );
      return () => unsubscribe();
    } catch (error) {
      console.error("Error setting up recommended products listener:", error);
    }
  }, []);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    try {
      await signOut(auth);
      notify("Logged out successfully", "success");
      navigate("/");
    } catch (error) {
      notify("Failed to log out", "error");
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!auth.currentUser) return { success: false };

    setUpdating(true);
    try {
      const url = await uploadToImgbb(file);
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        photoURL: url
      });
      await updateProfile(auth.currentUser, {
        photoURL: url
      });
      setLocalUserData((prev) => (prev ? { ...prev, photoURL: url } : null));
      notify("Profile picture updated", "success");
      return { success: true };
    } catch (e: any) {
      notify(e.message || "Failed to update profile picture", "error");
      return { success: false };
    } finally {
      setUpdating(false);
    }
  };

  // If user is not logged in
  if (!localUserData) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-32 px-4 bg-[#F8F9FA] dark:bg-zinc-950 min-h-screen font-sans">
        <SEO title="My Profile" description="Manage your profile and track orders." noindex={true} />
        <div className="w-24 h-24 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <User className="w-10 h-10 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-bold mb-2 tracking-tight text-zinc-900 dark:text-zinc-100">
          Sign In to Continue
        </h2>
        <p className="text-sm font-normal text-zinc-500 dark:text-zinc-400 mb-8 max-w-xs leading-relaxed">
          Log in to view your profile, manage payment methods, track orders, and redeem vouchers.
        </p>
        <button
          onClick={() => navigate("/auth-selector")}
          className="px-8 py-3.5 bg-[#1F2029] hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-full font-semibold text-sm transition-all shadow-md active:scale-95 flex items-center space-x-2"
        >
          <span>Sign In / Register</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const isAdmin =
    localUserData?.role === "admin" ||
    localUserData?.email?.toLowerCase().trim() === "admin@deep.shop" ||
    localUserData?.email?.toLowerCase().trim() === "vibegadgetfeni@gmail.com" ||
    localUserData?.email?.toLowerCase().trim() === "deepshop@gmail.com" ||
    localUserData?.email?.toLowerCase().trim() === "deepshopbysam@gmail.com" ||
    localUserData?.role === "staff";

  const isSeller = localUserData?.role === "seller";

  // Order status counts
  const toPayCount = orders.filter(
    (o) => o.status === OrderStatus.PENDING || o.status === OrderStatus.CHECKING_PAYMENT
  ).length;
  const toShipCount = orders.filter((o) =>
    [OrderStatus.APPROVED, OrderStatus.PROCESSING, OrderStatus.PACKAGING, OrderStatus.COMPLETE_PACKAGING].includes(
      o.status
    )
  ).length;
  const toReceiveCount = orders.filter((o) =>
    [OrderStatus.DELIVER_ON_COURIER, OrderStatus.ON_THE_WAY].includes(o.status)
  ).length;
  const toReviewCount = orders.filter((o) => o.status === OrderStatus.DELIVERED).length;

  const displayContact = localUserData.email?.includes("@phone.deepshop.top")
    ? "+" + localUserData.email.replace("@phone.deepshop.top", "")
    : localUserData.email?.includes("@phone.vibegadget.com")
    ? "+" + localUserData.email.replace("@phone.vibegadget.com", "")
    : localUserData.email?.includes("@gmail.com") && /^\+?[0-9]{10,15}@gmail\.com$/.test(localUserData.email)
    ? localUserData.email.replace("@gmail.com", "")
    : localUserData.email || "";

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-zinc-950 font-sans pb-28 md:pb-16 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      <SEO title="My Profile" description="Manage your profile and track orders." noindex={true} />
      <ProfileTourSteps />

      {/* Main Container - Mobile Single-Column & Desktop Responsive Multi-Column */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 sm:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ================= LEFT COLUMN (Desktop Sidebar / Top on Mobile) ================= */}
          <div className="lg:col-span-4 space-y-5">
            {/* Profile Info Card (Wireframe Style: Centered Avatar, Pencil Edit, Name, Badges, Contact) */}
            <div
              id="profile-info"
              className="bg-white dark:bg-zinc-900 rounded-[28px] p-6 sm:p-7 border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center relative overflow-hidden"
            >
              {/* Subtle decorative glow in dark/light */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 bg-gradient-to-b from-[#704F38]/10 to-transparent pointer-events-none rounded-b-full blur-xl" />

              {/* Avatar with Pencil Edit Badge */}
              <div className="relative inline-block mb-3.5 mt-1">
                <AvatarUploader onUpload={handleAvatarUpload}>
                  <div className="relative group cursor-pointer">
                    <Avatar className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-[3px] border-white dark:border-zinc-800 shadow-md bg-zinc-100 dark:bg-zinc-800 transition-transform group-hover:scale-[1.02]">
                      <AvatarImage
                        src={localUserData?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(localUserData.displayName || "User")}&background=1F2029&color=fff`}
                        alt={localUserData.displayName || "User"}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-2xl font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {localUserData.displayName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>

                    {/* Pencil badge anchored at bottom right */}
                    <div className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[#1F2029] dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-md transform transition-transform group-hover:scale-110 active:scale-95">
                      <Pencil className="w-3.5 h-3.5" strokeWidth={2.2} />
                    </div>
                  </div>
                </AvatarUploader>
              </div>

              {/* User Name & Region Flag */}
              <div className="flex items-center justify-center gap-2 mb-1.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {localUserData.displayName || "User"}
                </h2>
                <div className="w-[18px] h-[13px] rounded-[2px] shadow-sm overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700">
                  {getRegionFlagSvg(region)}
                </div>
              </div>

              {/* Badges (Registered / Seller / KYC Verified) */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mb-2.5">
                {localUserData.isRegisteredBadge && <RegisteredBadge />}
                {(isSeller || localUserData.kycStatus === "verified" || localUserData.isVerifiedBadge) && (
                  <SellerBadge kycStatus={localUserData.kycStatus || (localUserData.isVerifiedBadge ? "verified" : "none")} />
                )}
              </div>

              {/* Contact Email / Phone */}
              {displayContact && (
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium tracking-tight mb-4 break-all">
                  {displayContact}
                </p>
              )}

              {/* Quick Action Buttons for Profile Card */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-center gap-2">
                <button
                  onClick={() => navigate("/profile/edit")}
                  className="flex-1 py-2 px-3 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("openAccountCenter"))}
                  className="py-2 px-3 rounded-full border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
                  title="Switch or Link Accounts"
                >
                  Switch
                </button>
              </div>
            </div>

            {/* Refer & Earn Banner (Wireframe Style Card with Dynamic Site Values) */}
            <div
              id="profile-referral"
              onClick={() => navigate("/affiliate")}
              className="group relative cursor-pointer overflow-hidden rounded-[26px] bg-gradient-to-br from-[#FF6611] via-[#FF7A00] to-[#FF9020] p-5 sm:p-6 text-white shadow-[0_6px_20px_rgba(255,102,17,0.25)] transition-all hover:shadow-[0_8px_25px_rgba(255,102,17,0.35)]"
            >
              {/* Background Geometric Rings matching wireframe styling */}
              <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full border-4 border-white/15 pointer-events-none" />
              <div className="absolute right-10 top-2 w-16 h-16 rounded-full border-2 border-white/20 pointer-events-none" />

              <div className="relative z-10 flex items-start justify-between">
                <div className="max-w-[70%]">
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full mb-2">
                    Partner & Rewards
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold leading-tight mb-1 text-white">
                    {localUserData.affiliateStatus !== "approved" ? "Refer & Earn" : "Affiliate Partner"}
                  </h3>
                  <p className="text-xs text-white/90 font-medium mb-3.5 leading-snug">
                    Earn up to <span className="font-bold underline">{formatPrice(200)}</span> per successful referral!
                  </p>
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-[#FF6611] text-xs font-bold shadow-sm transition-transform group-hover:scale-105">
                    {localUserData.affiliateStatus !== "approved" ? "Invite Friends" : "Open Dashboard"}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center drop-shadow-md">
                  <img
                    src="https://api.dicebear.com/7.x/bottts/svg?seed=Panda1&backgroundColor=transparent&primaryColor=ffffff"
                    alt="Rewards Mascot"
                    className="w-full h-full object-contain transform group-hover:rotate-6 transition-transform"
                  />
                </div>
              </div>
            </div>

            {/* Desktop Only: Quick Logout Button on Sidebar */}
            <div className="hidden lg:block pt-1">
              <button
                onClick={() => setShowLogoutModal(true)}
                className="w-full py-3 px-4 rounded-[20px] bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <LogOut className="w-4 h-4" strokeWidth={2} />
                <span>Log Out</span>
              </button>
            </div>
          </div>

          {/* ================= RIGHT COLUMN (Main Content & Categorized Wireframe Lists) ================= */}
          <div className="lg:col-span-8 space-y-6">

            {/* "My Orders" Status Grid Card (Directly from Site Features with Wireframe Styling) */}
            <div
              id="profile-orders"
              className="bg-white dark:bg-zinc-900 rounded-[28px] p-5 sm:p-6 border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
            >
              <div className="flex items-center justify-between mb-5 px-1">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-zinc-700 dark:text-zinc-300" strokeWidth={2} />
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    My Orders
                  </h3>
                </div>
                <button
                  onClick={() => navigate("/orders")}
                  className="text-xs sm:text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-1 transition-colors"
                >
                  <span>View All</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 4 Status Tabs with Live Count Badges */}
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                <OrderStatusItem
                  icon="profile-order-pay"
                  label="To Pay"
                  count={toPayCount}
                  onClick={() => navigate("/orders/pay")}
                />
                <OrderStatusItem
                  icon="profile-order-ship"
                  label="To Ship"
                  count={toShipCount}
                  onClick={() => navigate("/orders/ship")}
                />
                <OrderStatusItem
                  icon="profile-order-receive"
                  label="To Receive"
                  count={toReceiveCount}
                  onClick={() => navigate("/orders/receive")}
                />
                <OrderStatusItem
                  icon="profile-order-review"
                  label="To Review"
                  count={toReviewCount}
                  onClick={() => navigate("/orders/review")}
                />
              </div>
            </div>

            {/* Grouped Feature Sections in Clean Wireframe List Rows */}
            <div id="profile-menu" className="space-y-5">
              
              {/* Section 1: Account Settings (Your profile, Payment Methods, Password, etc.) */}
              <WireframeCard title="Account Settings">
                <WireframeRow
                  icon={<User className="w-5 h-5" strokeWidth={1.8} />}
                  label="Your profile"
                  subtitle="Edit name, avatar, address & profile details"
                  onClick={() => navigate("/profile/edit")}
                />
                <WireframeRow
                  icon={<CreditCard className="w-5 h-5" strokeWidth={1.8} />}
                  label="Payment Methods"
                  subtitle="Manage cards, bKash, Nagad & wallet"
                  onClick={() => navigate("/payment-methods")}
                />
                <WireframeRow
                  icon={<Lock className="w-5 h-5" strokeWidth={1.8} />}
                  label="Password Manager"
                  subtitle="Change account password & security"
                  onClick={() => navigate("/settings/password")}
                />
                <WireframeRow
                  icon={<FingerprintIcon className="w-5 h-5" />}
                  label="Biometric & Passcode Lock"
                  subtitle="Enable fingerprint or PIN code protection"
                  onClick={() => navigate("/settings/biometrics")}
                />
                <WireframeRow
                  icon={<ShieldCheck className="w-5 h-5" strokeWidth={1.8} />}
                  label="Where you are logged in"
                  subtitle="Active devices & session security"
                  onClick={() => navigate("/devices")}
                />
                <WireframeRow
                  icon={<Users className="w-5 h-5" strokeWidth={1.8} />}
                  label="Switch Account"
                  subtitle="Manage multiple profiles or login as another"
                  onClick={() => window.dispatchEvent(new CustomEvent("openAccountCenter"))}
                />
                <WireframeRow
                  icon={<Settings className="w-5 h-5" strokeWidth={1.8} />}
                  label="Settings"
                  subtitle="Preferences, theme & notifications"
                  onClick={() => navigate("/settings")}
                  isLast
                />
              </WireframeCard>

              {/* Section 2: Orders & Shopping (My Orders, Wishlist, Coupons, Coins, Tickets) */}
              <WireframeCard title="Orders & Shopping">
                <WireframeRow
                  icon={<Package className="w-5 h-5" strokeWidth={1.8} />}
                  label="My Orders"
                  subtitle="Track packages, returns and delivery history"
                  badge={orders.length > 0 ? `${orders.length}` : undefined}
                  onClick={() => navigate("/orders")}
                />
                <WireframeRow
                  icon={<Heart className="w-5 h-5" strokeWidth={1.8} />}
                  label="Wishlist"
                  subtitle="Saved favorite products & collections"
                  onClick={() => navigate("/wishlist")}
                />
                <WireframeRow
                  icon={<Ticket className="w-5 h-5" strokeWidth={1.8} />}
                  label="Coupons & Vouchers"
                  subtitle="Active discount codes and seasonal promos"
                  onClick={() => navigate("/coupon")}
                />
                <WireframeRow
                  icon={<Coins className="w-5 h-5" strokeWidth={1.8} />}
                  label="My Coins"
                  subtitle="Reward balance and coin redemption"
                  onClick={() => navigate("/my-coins")}
                />
                <WireframeRow
                  icon={<TicketsSvg className="w-5 h-5" />}
                  label="My Support Tickets"
                  subtitle="Check resolution status on customer requests"
                  onClick={() => navigate("/my-tickets")}
                  isLast
                />
              </WireframeCard>

              {/* Section 3: Creator & Partner Hub / Management Tools */}
              <WireframeCard title="Tools & Hub">
                <WireframeRow
                  icon={<Sparkles className="w-5 h-5 text-[#FF6611]" strokeWidth={1.8} />}
                  label="Invites Friends & Earn"
                  subtitle="Share your link and get referral commission"
                  onClick={() => navigate("/affiliate")}
                />
                <WireframeRow
                  icon={<LayoutDashboard className="w-5 h-5 text-emerald-500" strokeWidth={1.8} />}
                  label="Affiliate Dashboard"
                  subtitle="Track referral links, clicks & payouts"
                  onClick={() => navigate("/affiliate/dashboard")}
                />
                <WireframeRow
                  icon={<Sparkles className="w-5 h-5 text-indigo-500" strokeWidth={1.8} />}
                  label="Creator Hub"
                  subtitle="Tools, campaign briefs & earnings for creators"
                  onClick={() => navigate("/affiliate/creator_hub")}
                />
                <WireframeRow
                  icon={<Users className="w-5 h-5 text-pink-500" strokeWidth={1.8} />}
                  label="Small Creators Program"
                  subtitle="Special bonuses and onboarding perks"
                  onClick={() => navigate("/affiliate/small_creators")}
                />
                <WireframeRow
                  icon={<MessageSquare className="w-5 h-5 text-blue-500" strokeWidth={1.8} />}
                  label="Messages (Inbox)"
                  subtitle="Chat with store sellers, support & updates"
                  onClick={() => navigate("/messages")}
                />

                {/* Seller Controls */}
                {isSeller && (
                  <>
                    <WireframeRow
                      icon={<Store className="w-5 h-5 text-emerald-600" strokeWidth={1.8} />}
                      label="Seller Dashboard"
                      subtitle="Manage store inventory, catalog & orders"
                      onClick={() => navigate("/seller/dashboard")}
                    />
                    <WireframeRow
                      icon={<ShieldCheck className="w-5 h-5 text-amber-500" strokeWidth={1.8} />}
                      label={
                        localUserData?.kycStatus === "verified"
                          ? "KYC Verified (Verified Badge)"
                          : localUserData?.kycStatus === "pending"
                          ? "KYC Pending Verification"
                          : "Get Verified Badge (KYC)"
                      }
                      subtitle="Submit store identity documents"
                      badge={localUserData?.kycStatus === "verified" ? "Verified" : "Action"}
                      onClick={() => {
                        if (localUserData?.kycStatus === "verified") {
                          notify("You are already verified!", "success");
                        } else {
                          navigate("/kyc-verification");
                        }
                      }}
                    />
                  </>
                )}

                {/* Admin Control */}
                {isAdmin && (
                  <WireframeRow
                    icon={<Settings className="w-5 h-5 text-purple-600" strokeWidth={1.8} />}
                    label="Admin Panel"
                    subtitle="Platform control, users, products & config"
                    badge="Staff"
                    onClick={() => navigate("/admin")}
                  />
                )}
              </WireframeCard>

              {/* Section 4: Help Center & Legal (Directly matching wireframe list) */}
              <WireframeCard title="Help & Policies">
                <WireframeRow
                  icon={<HelpCircle className="w-5 h-5" strokeWidth={1.8} />}
                  label="Help Center"
                  subtitle="Customer care, live chat & FAQs"
                  onClick={() => navigate("/help")}
                />
                <WireframeRow
                  icon={<FileText className="w-5 h-5" strokeWidth={1.8} />}
                  label="FAQs"
                  subtitle="Frequently asked questions about shopping"
                  onClick={() => navigate("/faq")}
                />
                <WireframeRow
                  icon={<ShieldCheck className="w-5 h-5" strokeWidth={1.8} />}
                  label="Privacy Policy"
                  subtitle="How we protect and handle your personal data"
                  onClick={() => navigate("/privacy")}
                />
                <WireframeRow
                  icon={<FileText className="w-5 h-5" strokeWidth={1.8} />}
                  label="Terms & Conditions"
                  subtitle="Platform rules, user agreements & guidelines"
                  onClick={() => navigate("/terms")}
                />
                <WireframeRow
                  icon={<Truck className="w-5 h-5" strokeWidth={1.8} />}
                  label="Shipping & Delivery Policy"
                  subtitle="Rates, estimated timelines & couriers"
                  onClick={() => navigate("/shipping-policy")}
                />
                <WireframeRow
                  icon={<FileText className="w-5 h-5" strokeWidth={1.8} />}
                  label="Refund & Return Policy"
                  subtitle="7-day replacement & refund guarantees"
                  onClick={() => navigate("/refund-policy")}
                />
                <WireframeRow
                  icon={<Phone className="w-5 h-5" strokeWidth={1.8} />}
                  label="Contact Us"
                  subtitle="Reach our helpline, WhatsApp and email team"
                  onClick={() => navigate("/contact")}
                  isLast
                />
              </WireframeCard>

              {/* Log Out Row (Mobile view & card bottom) */}
              <div className="bg-white dark:bg-zinc-900 rounded-[24px] p-2 border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-[18px] hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 transition-colors group text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-sm font-bold tracking-tight text-red-600 dark:text-red-400">
                        Log Out
                      </p>
                      <p className="text-xs text-red-500/80 font-normal">
                        Sign out of your account on this device
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-red-400 dark:text-red-500/70" strokeWidth={2} />
                </button>
              </div>

            </div>

          </div>

        </div>

        {/* ================= RECOMMENDED PRODUCTS ================= */}
        {recommendedProducts.length > 0 && (
          <section className="mt-12 pt-8 border-t border-zinc-200/60 dark:border-zinc-800/80">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  You Might Also Like
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Curated picks based on your recent activity
                </p>
              </div>
              <button
                onClick={() => navigate("/products")}
                className="text-xs sm:text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors"
              >
                <span>Explore More</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {recommendedProducts.map((product: any, index: number) => (
                <ProductCard key={product.id || index} product={product} index={index} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ================= WIREFRAME LOGOUT CONFIRMATION MODAL ================= */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            {/* Backdrop click to dismiss */}
            <div
              className="absolute inset-0"
              onClick={() => setShowLogoutModal(false)}
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-t-[32px] sm:rounded-[32px] p-6 sm:p-7 text-center shadow-2xl border border-zinc-200/80 dark:border-zinc-800 z-10"
            >
              {/* Top notch indicator for mobile */}
              <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-5 sm:hidden" />

              <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center mx-auto mb-4 border border-zinc-200 dark:border-zinc-700">
                <LogOut className="w-6 h-6" strokeWidth={1.8} />
              </div>

              <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Logout
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 mb-7 leading-relaxed">
                Are you sure you want to log out?
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-3.5 px-4 rounded-full border border-zinc-200 dark:border-zinc-700 font-semibold text-sm text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-98"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex-1 py-3.5 px-4 rounded-full bg-[#1F2029] hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-sm shadow-md transition-all active:scale-98"
                >
                  Yes, Logout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ================= HELPER SUB-COMPONENTS ================= */

/**
 * Order Status tab item with clean icon, label, and live counter pill.
 */
function OrderStatusItem({
  icon,
  label,
  count,
  onClick,
}: {
  icon: string;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 active:scale-95 transition-all group overflow-hidden w-full"
    >
      <div className="relative mb-2">
        <Icon
          name={icon}
          className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-700 dark:text-zinc-300 group-hover:text-black dark:group-hover:text-white transition-colors"
        />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-2 bg-[#1cdb5e] text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white dark:border-zinc-900 shadow-sm animate-pulse">
            {count}
          </span>
        )}
      </div>
      <span className="text-[10.5px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 whitespace-nowrap tracking-tight text-center block w-full truncate">
        {label}
      </span>
    </button>
  );
}

/**
 * Card container for grouped wireframe list items.
 */
function WireframeCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-[28px] p-4 sm:p-5 border border-zinc-200/60 dark:border-zinc-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2 px-3 pt-1">
        {title}
      </h4>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">{children}</div>
    </div>
  );
}

/**
 * A wireframe-style interactive row item:
 * [Icon] Title + Subtitle ---------------- [Badge] [ChevronRight]
 */
function WireframeRow({
  icon,
  label,
  subtitle,
  badge,
  onClick,
  isLast = false,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  badge?: string;
  onClick: () => void;
  isLast?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "flex items-center justify-between p-3 sm:p-3.5 rounded-2xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/60 active:scale-[0.99] transition-all group",
        !isLast && "mb-0.5"
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0 pr-2">
        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center shrink-0 border border-zinc-200/70 dark:border-zinc-700/70 group-hover:scale-105 transition-transform">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] sm:text-[15px] font-bold text-zinc-800 dark:text-zinc-200 tracking-tight truncate group-hover:text-black dark:group-hover:text-white transition-colors">
            {label}
          </p>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-zinc-400 dark:text-zinc-500 truncate font-normal">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {badge && (
          <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-bold border border-zinc-200 dark:border-zinc-700">
            {badge}
          </span>
        )}
        <ChevronRight
          className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all"
          strokeWidth={2}
        />
      </div>
    </div>
  );
}

const Profile: React.FC<ProfileProps> = (props) => {
  return (
    <TourProvider tourId="profile">
      <ProfileView {...props} />
    </TourProvider>
  );
};

export default Profile;
