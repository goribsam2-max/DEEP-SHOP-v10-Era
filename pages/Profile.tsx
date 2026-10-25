import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { UserProfile } from "../types";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  signOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { useNotify } from "../components/Notifications";
import { uploadToImgbb } from "../services/imgbb";
import { AvatarUploader } from "../components/ui/avatar-uploader";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  User,
  Settings,
  HelpCircle,
  LogOut,
  Heart,
  Ticket,
  LayoutDashboard,
  Sparkles,
  Store,
  MessageSquare,
  FileText,
  Pencil,
  ShieldAlert,
  QrCode,
  Shield,
  ShieldCheck,
  Eye,
  Bell,
  Palette,
  CheckCircle2,
  Smartphone,
  CreditCard,
  Wallet,
  Coins,
  ShoppingCart,
  ShoppingBag,
  Package,
  ArrowLeftRight,
  Star,
  Zap,
  Boxes,
  Box,
  Gift,
  Crown,
  Newspaper,
  Plus,
  Bookmark,
  BookOpen,
  MapPin,
  Lock,
  KeyRound,
  Globe,
  Search,
  Headset,
  PhoneCall,
  Info,
  X,
} from "lucide-react";
import { useTheme } from "../components/ThemeContext";
import { useRegion } from "../components/RegionContext";
import SEO from "../components/SEO";
import { triggerHaptic } from "../lib/haptics";
import {
  hasImmediateAdminOrStaffRole,
  checkStaffRecord,
  isVerifiedSeller,
} from "../lib/admin";

interface ProfileProps {
  userData: UserProfile | null;
}

interface ProfileMenuItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  icon: React.ReactNode;
  onClick: () => void;
  keywords?: string;
}

interface ProfileMenuSection {
  id: string;
  heading: string;
  items: ProfileMenuItem[];
}

export const Profile: React.FC<ProfileProps> = ({
  userData: initialUserData,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const { formatPrice } = useRegion();
  const navigate = useNavigate();
  const notify = useNotify();

  const [authUser, setAuthUser] = useState<FirebaseUser | null>(
    () => auth.currentUser
  );
  const [authReady, setAuthReady] = useState<boolean>(() =>
    Boolean(auth.currentUser || initialUserData)
  );
  const [localUserData, setLocalUserData] = useState<UserProfile | null>(
    initialUserData
  );
  const [isStaffDoc, setIsStaffDoc] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (initialUserData) {
      setLocalUserData(initialUserData);
    }
  }, [initialUserData]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("f_cart");
      const parsed = raw && raw !== "undefined" ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        const count = parsed.reduce(
          (sum: number, it: any) => sum + (it?.quantity || 1),
          0
        );
        setCartCount(count);
      }
    } catch {
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    let unsubUser: (() => void) | null = null;
    let unsubMessages: (() => void) | null = null;
    let unsubNotifs: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setAuthUser(u);
      setAuthReady(true);

      if (unsubUser) {
        unsubUser();
        unsubUser = null;
      }
      if (unsubMessages) {
        unsubMessages();
        unsubMessages = null;
      }
      if (unsubNotifs) {
        unsubNotifs();
        unsubNotifs = null;
      }

      if (!u) {
        setLocalUserData(null);
        setUnreadMessages(0);
        setUnreadNotifications(0);
        return;
      }

      unsubUser = onSnapshot(doc(db, "users", u.uid), (snapshot) => {
        if (snapshot.exists()) {
          setLocalUserData({
            uid: u.uid,
            ...(snapshot.data() as UserProfile),
          });
        } else {
          setLocalUserData((prev) =>
            prev || {
              uid: u.uid,
              email: u.email || "",
              displayName:
                u.displayName || u.email?.split("@")[0] || "Member",
              photoURL: u.photoURL || undefined,
              role: "user",
              isBanned: false,
              createdAt: Date.now(),
              registrationDate: Date.now(),
            }
          );
        }
      });

      const qChats = query(
        collection(db, "p2p_chats"),
        where("participants", "array-contains", u.uid)
      );
      unsubMessages = onSnapshot(
        qChats,
        (snapshot) => {
          let count = 0;
          snapshot.docs.forEach((d) => {
            const data = d.data();
            if (
              data.lastSenderId !== u.uid &&
              (!data.seenBy || !data.seenBy.includes(u.uid))
            ) {
              count++;
            }
          });
          setUnreadMessages(count);
        },
        () => {}
      );

      const qNotifs = query(
        collection(db, "notifications"),
        where("userId", "==", u.uid),
        where("isRead", "==", false)
      );
      unsubNotifs = onSnapshot(
        qNotifs,
        (snapshot) => {
          setUnreadNotifications(snapshot.docs.length);
        },
        () => {}
      );
    });

    return () => {
      unsubAuth();
      if (unsubUser) unsubUser();
      if (unsubMessages) unsubMessages();
      if (unsubNotifs) unsubNotifs();
    };
  }, []);

  // Also check Firestore `staff` collection for staff/admin permissions
  useEffect(() => {
    let active = true;
    const email = localUserData?.email || authUser?.email;
    if (!email) {
      setIsStaffDoc(false);
      return;
    }
    if (hasImmediateAdminOrStaffRole(localUserData, authUser)) {
      setIsStaffDoc(true);
      return;
    }
    checkStaffRecord(email).then((res) => {
      if (active) setIsStaffDoc(res.isStaff);
    });
    return () => {
      active = false;
    };
  }, [localUserData, authUser]);

  const effectiveProfile: UserProfile | null = useMemo(() => {
    if (localUserData) return localUserData;
    if (authUser) {
      return {
        uid: authUser.uid,
        email: authUser.email || "",
        displayName:
          authUser.displayName || authUser.email?.split("@")[0] || "Member",
        photoURL: authUser.photoURL || undefined,
        role: "user",
        isBanned: false,
        createdAt: Date.now(),
        registrationDate: Date.now(),
      };
    }
    return null;
  }, [localUserData, authUser]);

  const isAdmin =
    hasImmediateAdminOrStaffRole(effectiveProfile, authUser) || isStaffDoc;

  const isSeller = isVerifiedSeller(effectiveProfile);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    try {
      await signOut(auth);
      notify("Logged out successfully", "success");
      navigate("/");
    } catch {
      notify("Failed to log out", "error");
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!auth.currentUser) return { success: false };

    try {
      const url = await uploadToImgbb(file);
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        photoURL: url,
      });
      await updateProfile(auth.currentUser, {
        photoURL: url,
      });
      setLocalUserData((prev) => (prev ? { ...prev, photoURL: url } : null));
      notify("Profile picture updated", "success");
      return { success: true };
    } catch (e: any) {
      notify(e.message || "Failed to update profile picture", "error");
      return { success: false };
    }
  };

  const displayName =
    effectiveProfile?.displayName ||
    authUser?.displayName ||
    effectiveProfile?.email?.split("@")[0] ||
    authUser?.email?.split("@")[0] ||
    "Member";

  const handle =
    effectiveProfile?.username ||
    effectiveProfile?.email?.split("@")[0] ||
    authUser?.email?.split("@")[0] ||
    "member";

  const walletBalance = Number(effectiveProfile?.walletBalance || 0);
  const coins = Number(effectiveProfile?.points || 0);
  const stars = Number(
    effectiveProfile?.purchasedStars || effectiveProfile?.stars || 0
  );
  const xp = Number(effectiveProfile?.xp || 0);
  const followers = Number(
    effectiveProfile?.followersCount ||
      (effectiveProfile?.followers ? effectiveProfile.followers.length : 0)
  );

  const canSetupCreatorSubs = Boolean(
    effectiveProfile?.isCreator === true ||
      (effectiveProfile as any)?.creatorStatus === "approved" ||
      followers >= 1000 ||
      isAdmin
  );

  const allSections: ProfileMenuSection[] = useMemo(() => {
    const dashboardItems: ProfileMenuItem[] = [];

    if (isAdmin) {
      dashboardItems.push({
        id: "admin-panel",
        title: "Admin Control Panel",
        subtitle: "Manage products, orders, users, banners, chats & settings",
        badge: "ADMIN",
        icon: <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
        onClick: () => navigate("/admin"),
        keywords: "admin dashboard control panel staff manage orders products users",
      });
    }

    if (isSeller || isAdmin) {
      dashboardItems.push({
        id: "seller-dashboard",
        title: "Seller Dashboard",
        subtitle: "Manage your shop products, stories & sales",
        badge: "SELLER",
        icon: <Store className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
        onClick: () => navigate("/seller/dashboard"),
        keywords: "seller shop store dashboard vendor",
      });
    }

    dashboardItems.push({
      id: "add-story",
      title: "Add Story",
      subtitle: "Publish a new 48h story to Shop & News Hub",
      icon: <Plus className="w-5 h-5 text-[#1877F2]" />,
      onClick: () => navigate("/add-story"),
      keywords: "story highlight upload status create story",
    });

    dashboardItems.push({
      id: "creator-dashboard",
      title: "Creator Studio & Analytics",
      subtitle: "Audience insights, star earnings & payout numbers",
      icon: <LayoutDashboard className="w-5 h-5 text-emerald-500" />,
      onClick: () => navigate("/creator-dashboard"),
      keywords: "creator studio analytics earnings bkash nagad",
    });

    if (canSetupCreatorSubs) {
      dashboardItems.push({
        id: "creator-sub-setup",
        title: "Creator Subscription Setup",
        subtitle: "Configure fan tiers & monthly supporter perks",
        icon: <Crown className="w-5 h-5 text-amber-500" />,
        onClick: () => navigate("/creator/subscription-setup"),
        keywords: "creator subscription tiers setup",
      });
    }

    const communityItems: ProfileMenuItem[] = [
      {
        id: "news-hub",
        title: "News Hub & Scam Defense Feed",
        subtitle: "Community updates, voice notes & verified scam alerts",
        icon: <Newspaper className="w-5 h-5 text-[#1877F2]" />,
        onClick: () => navigate("/news-hub"),
        keywords: "news hub feed scam alert community",
      },
      {
        id: "create-post",
        title: "Create Feed Post / Report Scam",
        subtitle: "Share photos, voice notes, links or expose a scammer",
        icon: <ShieldAlert className="w-5 h-5 text-rose-500" />,
        onClick: () => navigate("/news-hub/create"),
        keywords: "create post scam report voice",
      },
      {
        id: "saved-posts",
        title: "Saved Feed Posts",
        subtitle: "Bookmarked posts & scam reports",
        icon: <Bookmark className="w-5 h-5 text-blue-500" />,
        onClick: () => navigate("/news-hub/saved"),
        keywords: "saved posts bookmarks feed",
      },
      {
        id: "feed-personalization",
        title: "Feed Personalization",
        subtitle: "Customize feed themes & content preferences",
        icon: <Palette className="w-5 h-5 text-indigo-500" />,
        onClick: () => navigate("/news-hub/personalization"),
        keywords: "feed personalization customize themes",
      },
      {
        id: "news-notifications",
        title: "News Hub Activity",
        subtitle: "Reactions, comments & mentions on your posts",
        icon: <Bell className="w-5 h-5 text-sky-500" />,
        onClick: () => navigate("/news-hub/notifications"),
        keywords: "news hub notifications comments reactions",
      },
      {
        id: "blogs",
        title: "Tech Blogs & Buying Guides",
        subtitle: "Read mobile reviews, tips & platform guides",
        icon: <BookOpen className="w-5 h-5 text-emerald-600" />,
        onClick: () => navigate("/blog"),
        keywords: "blog articles tech news guides",
      },
    ];

    if (isAdmin) {
      communityItems.push({
        id: "create-blog",
        title: "Write a Blog Article",
        subtitle: "Publish a guide or review to the blog",
        icon: <Pencil className="w-5 h-5 text-zinc-700 dark:text-zinc-200" />,
        onClick: () => navigate("/blog/create"),
        keywords: "write create blog article",
      });
    }

    communityItems.push(
      {
        id: "messages",
        title: "Inbox & Live Messages",
        subtitle: "Chat with sellers, community & support",
        badge: unreadMessages > 0 ? String(unreadMessages) : undefined,
        icon: <MessageSquare className="w-5 h-5 text-blue-600" />,
        onClick: () => navigate("/messages"),
        keywords: "messages inbox chat live",
      },
      {
        id: "notifications",
        title: "App Notifications",
        subtitle: "Order updates, alerts & announcements",
        badge:
          unreadNotifications > 0 ? String(unreadNotifications) : undefined,
        icon: <Bell className="w-5 h-5 text-amber-500" />,
        onClick: () => navigate("/notifications"),
        keywords: "notifications alerts updates",
      }
    );

    return [
      {
        id: "dashboards",
        heading: "Management & Creator Studios",
        items: dashboardItems,
      },
      {
        id: "orders-shopping",
        heading: "Orders, Shopping & Storefront",
        items: [
          {
            id: "orders",
            title: "My Orders & E-Receipts",
            subtitle: "Track parcels, delivery status & download receipts",
            icon: <Package className="w-5 h-5 text-indigo-500" />,
            onClick: () => navigate("/orders"),
            keywords: "orders track parcel shipping receipt history",
          },
          {
            id: "cart",
            title: "Shopping Cart",
            subtitle: "View items ready for checkout",
            badge: cartCount > 0 ? String(cartCount) : undefined,
            icon: <ShoppingCart className="w-5 h-5 text-blue-500" />,
            onClick: () => navigate("/cart"),
            keywords: "cart bag checkout buy",
          },
          {
            id: "wishlist",
            title: "My Wishlist",
            subtitle: "Saved phones, gadgets & favorite deals",
            icon: <Heart className="w-5 h-5 text-rose-500" />,
            onClick: () => navigate("/wishlist"),
            keywords: "wishlist favorites saved products",
          },
          {
            id: "exchange-request",
            title: "Return & Exchange Request",
            subtitle: "Submit device replacement or return claims",
            icon: <ArrowLeftRight className="w-5 h-5 text-orange-500" />,
            onClick: () => navigate("/exchange-request"),
            keywords: "return exchange refund replace warranty",
          },
          {
            id: "leave-review",
            title: "Leave a Review",
            subtitle: "Share feedback & photos on delivered orders",
            icon: <Star className="w-5 h-5 text-amber-500" />,
            onClick: () => navigate("/leave-review"),
            keywords: "review rating feedback",
          },
          {
            id: "all-products",
            title: "All Products Catalog",
            subtitle: "Browse every border cross phone & accessory",
            icon: <ShoppingBag className="w-5 h-5 text-zinc-700 dark:text-zinc-200" />,
            onClick: () => navigate("/all-products"),
            keywords: "catalog all products shop phones",
          },
          {
            id: "flash-sale",
            title: "Flash Sale Deals",
            subtitle: "Limited-time markdowns & special drops",
            icon: <Zap className="w-5 h-5 text-amber-500" />,
            onClick: () => navigate("/flash-sale"),
            keywords: "flash sale deals discount offer",
          },
          {
            id: "bundles",
            title: "Bundle Deals",
            subtitle: "Save extra with curated combo packs",
            icon: <Boxes className="w-5 h-5 text-purple-500" />,
            onClick: () => navigate("/bundles"),
            keywords: "bundle combo deals",
          },
          {
            id: "build-box",
            title: "Build Your Custom Box",
            subtitle: "Pick devices & accessories for custom bundle pricing",
            icon: <Box className="w-5 h-5 text-sky-500" />,
            onClick: () => navigate("/build-box"),
            keywords: "build box custom bundle",
          },
          {
            id: "bonus-products",
            title: "Bonus & Freebie Products",
            subtitle: "Exclusive member bonus items & perks",
            icon: <Gift className="w-5 h-5 text-pink-500" />,
            onClick: () => navigate("/bonus"),
            keywords: "bonus gift freebie perks",
          },
        ],
      },
      {
        id: "wallet-rewards",
        heading: "Wallet, Payments & Rewards",
        items: [
          {
            id: "deposit",
            title: "Wallet & Add Balance",
            subtitle: `Available balance: ${formatPrice(walletBalance)}`,
            icon: <Wallet className="w-5 h-5 text-emerald-600" />,
            onClick: () => navigate("/deposit"),
            keywords: "wallet deposit topup balance qr",
          },
          {
            id: "withdraw",
            title: "Withdraw Earnings",
            subtitle: "Cash out affiliate & coin balance to bKash / Nagad",
            icon: <ArrowLeftRight className="w-5 h-5 text-teal-600" />,
            onClick: () => navigate("/withdraw"),
            keywords: "withdraw payout bkash nagad cashout",
          },
          {
            id: "my-coins",
            title: "My Coins & Daily Rewards",
            subtitle: `${coins.toLocaleString()} coins available`,
            icon: <Coins className="w-5 h-5 text-amber-500" />,
            onClick: () => navigate("/my-coins"),
            keywords: "coins points spin rewards",
          },
          {
            id: "shopping-credits",
            title: "Shopping Credits",
            subtitle: "Store credit balance & promotional vouchers",
            icon: <CreditCard className="w-5 h-5 text-indigo-500" />,
            onClick: () => navigate("/credits"),
            keywords: "shopping credits store credit",
          },
          {
            id: "my-coupons",
            title: "My Coupons",
            subtitle: "View active discount coupons on your account",
            icon: <Ticket className="w-5 h-5 text-orange-500" />,
            onClick: () => navigate("/my-coupons"),
            keywords: "my coupons discount",
          },
          {
            id: "redeem-coupon",
            title: "Redeem Promo / Coupon Code",
            subtitle: "Apply a promo code to unlock instant savings",
            icon: <Sparkles className="w-5 h-5 text-violet-500" />,
            onClick: () => navigate("/coupon"),
            keywords: "coupon promo code redeem",
          },
          {
            id: "buy-stars",
            title: "Buy Stars",
            subtitle: `Support creators · ${stars.toLocaleString()} stars owned`,
            icon: <Star className="w-5 h-5 text-yellow-500" />,
            onClick: () => navigate("/buy-stars"),
            keywords: "stars gift creator support",
          },
          {
            id: "payment-methods",
            title: "Saved Payment Methods",
            subtitle: "Manage bKash, Nagad & card payment options",
            icon: <CreditCard className="w-5 h-5 text-zinc-700 dark:text-zinc-200" />,
            onClick: () => navigate("/payment-methods"),
            keywords: "payment methods bkash nagad cards",
          },
          {
            id: "add-card",
            title: "Add New Card",
            subtitle: "Link a debit or credit card for fast checkout",
            icon: <Plus className="w-5 h-5 text-zinc-700 dark:text-zinc-200" />,
            onClick: () => navigate("/add-card"),
            keywords: "add card visa mastercard",
          },
          {
            id: "subscription",
            title: "VIP & Reseller Subscription",
            subtitle: "Zero-advance COD perks & Reseller Masterclass",
            icon: <Crown className="w-5 h-5 text-amber-500" />,
            onClick: () => navigate("/subscription"),
            keywords: "vip subscription reseller pro plan",
          },
          {
            id: "affiliate",
            title: "Affiliate & Refer Rewards",
            subtitle: "Invite friends & earn commission on every order",
            icon: <Sparkles className="w-5 h-5 text-amber-600" />,
            onClick: () => navigate("/affiliate"),
            keywords: "affiliate refer earn commission",
          },
        ],
      },
      {
        id: "community-content",
        heading: "News Hub, Blogs & Inbox",
        items: communityItems,
      },
      {
        id: "account-security",
        heading: "Account, Security & Preferences",
        items: [
          {
            id: "edit-profile",
            title: "Edit Profile",
            subtitle: "Update name, bio, phone & social links",
            icon: <User className="w-5 h-5 text-zinc-700 dark:text-zinc-200" />,
            onClick: () => navigate("/profile/edit"),
            keywords: "edit profile name photo bio",
          },
          {
            id: "kyc",
            title: "KYC Identity Verification",
            subtitle: "Verify NID / identity for trusted badge & higher limits",
            badge:
              effectiveProfile?.kycStatus === "approved" ||
              effectiveProfile?.kycStatus === "verified"
                ? "VERIFIED"
                : effectiveProfile?.kycStatus === "pending"
                ? "PENDING"
                : undefined,
            icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
            onClick: () => navigate("/kyc-verification"),
            keywords: "kyc verification nid identity badge",
          },
          {
            id: "shipping-address",
            title: "Shipping Addresses",
            subtitle: "Manage home, office & recipient delivery addresses",
            icon: <MapPin className="w-5 h-5 text-rose-500" />,
            onClick: () => navigate("/shipping-address"),
            keywords: "shipping address delivery location",
          },
          {
            id: "account-settings",
            title: "Account Settings",
            subtitle: "General preferences, push alerts & account controls",
            icon: <Settings className="w-5 h-5 text-zinc-700 dark:text-zinc-200" />,
            onClick: () => navigate("/settings"),
            keywords: "settings account preferences",
          },
          {
            id: "password-manager",
            title: "Security & Password Manager",
            subtitle: "Change password or send recovery reset",
            icon: <KeyRound className="w-5 h-5 text-blue-600" />,
            onClick: () => navigate("/settings/password"),
            keywords: "password security change reset",
          },
          {
            id: "biometrics",
            title: "Biometric & PIN App Lock",
            subtitle: "Protect app access with fingerprint, Face ID or PIN",
            icon: <Lock className="w-5 h-5 text-indigo-600" />,
            onClick: () => navigate("/settings/biometrics"),
            keywords: "biometric fingerprint pin lock security",
          },
          {
            id: "devices",
            title: "Logged-in Devices",
            subtitle: "Review active sessions & device security",
            icon: <Smartphone className="w-5 h-5 text-sky-600" />,
            onClick: () => navigate("/devices"),
            keywords: "devices sessions active login",
          },
          {
            id: "region",
            title: "Region & Currency",
            subtitle: `Current region: ${effectiveProfile?.region || "BD"}`,
            icon: <Globe className="w-5 h-5 text-teal-600" />,
            onClick: () => navigate("/region"),
            keywords: "region language currency country",
          },
          {
            id: "appearance",
            title: "Appearance",
            subtitle: isDark ? "Dark Theme Active (Tap to switch)" : "Light Theme Active (Tap to switch)",
            icon: <Palette className="w-5 h-5 text-purple-500" />,
            onClick: toggleTheme,
            keywords: "appearance dark light mode theme",
          },
          {
            id: "switch-account",
            title: "Account Center & Switch Account",
            subtitle: "Add or switch between saved accounts",
            icon: <User className="w-5 h-5 text-blue-500" />,
            onClick: () =>
              window.dispatchEvent(new CustomEvent("openAccountCenter")),
            keywords: "switch account multi login",
          },
        ],
      },
      {
        id: "help-legal",
        heading: "Help Center, Support & Legal",
        items: [
          {
            id: "help-center",
            title: "Help Center & Live Support",
            subtitle: "24/7 customer support & order assistance",
            icon: <Headset className="w-5 h-5 text-[#1877F2]" />,
            onClick: () => navigate("/help-center"),
            keywords: "help center support customer care",
          },
          {
            id: "my-tickets",
            title: "My Support Tickets",
            subtitle: "Check replies & status on submitted tickets",
            icon: <FileText className="w-5 h-5 text-indigo-500" />,
            onClick: () => navigate("/my-tickets"),
            keywords: "tickets support helpdesk",
          },
          {
            id: "faq",
            title: "Frequently Asked Questions (FAQ)",
            subtitle: "Quick answers about border cross phones & COD",
            icon: <HelpCircle className="w-5 h-5 text-amber-500" />,
            onClick: () => navigate("/faq"),
            keywords: "faq questions answers",
          },
          {
            id: "contact",
            title: "Contact Us",
            subtitle: "Store address, phone hotline & official channels",
            icon: <PhoneCall className="w-5 h-5 text-emerald-600" />,
            onClick: () => navigate("/contact"),
            keywords: "contact phone address email",
          },
          {
            id: "about",
            title: "About DEEP SHOP",
            subtitle: "Our mission, authenticity guarantee & story",
            icon: <Info className="w-5 h-5 text-blue-500" />,
            onClick: () => navigate("/about"),
            keywords: "about deep shop company",
          },
          {
            id: "privacy",
            title: "Privacy Policy",
            subtitle: "How we protect your personal data",
            icon: <Eye className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />,
            onClick: () => navigate("/privacy"),
            keywords: "privacy policy data",
          },
          {
            id: "terms",
            title: "Terms & Conditions",
            subtitle: "Platform rules, buyer & seller agreements",
            icon: <FileText className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />,
            onClick: () => navigate("/terms"),
            keywords: "terms conditions rules",
          },
          {
            id: "refund-policy",
            title: "Refund & Return Policy",
            subtitle: "Eligibility, timelines & replacement guidelines",
            icon: <FileText className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />,
            onClick: () => navigate("/refund-policy"),
            keywords: "refund return policy",
          },
          {
            id: "shipping-policy",
            title: "Shipping & Delivery Policy",
            subtitle: "Nationwide courier coverage & delivery times",
            icon: <Package className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />,
            onClick: () => navigate("/shipping-policy"),
            keywords: "shipping delivery courier policy",
          },
          {
            id: "cookie-policy",
            title: "Cookie Policy",
            subtitle: "Session & storage preferences",
            icon: <Shield className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />,
            onClick: () => navigate("/cookie-policy"),
            keywords: "cookie policy",
          },
          {
            id: "disclaimer",
            title: "Disclaimer",
            subtitle: "Important product & marketplace notices",
            icon: <ShieldAlert className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />,
            onClick: () => navigate("/disclaimer"),
            keywords: "disclaimer legal notice",
          },
          {
            id: "sitemap",
            title: "Sitemap & All Pages Directory",
            subtitle: "Complete index of every page on DEEP SHOP",
            icon: <Globe className="w-5 h-5 text-blue-500" />,
            onClick: () => navigate("/sitemap-page"),
            keywords: "sitemap directory all pages links",
          },
        ],
      },
    ].filter((sec) => sec.items.length > 0);
  }, [
    isAdmin,
    isSeller,
    canSetupCreatorSubs,
    cartCount,
    walletBalance,
    coins,
    stars,
    unreadMessages,
    unreadNotifications,
    effectiveProfile?.kycStatus,
    effectiveProfile?.region,
    isDark,
    formatPrice,
    navigate,
    toggleTheme,
  ]);

  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allSections;
    return allSections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
            (item.keywords && item.keywords.toLowerCase().includes(q))
        ),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [allSections, searchQuery]);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm font-semibold text-zinc-500">
        Loading profile...
      </div>
    );
  }

  if (!effectiveProfile) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-28 px-4 bg-transparent min-h-screen font-sans">
        <SEO
          title="My Profile • DEEP SHOP"
          description="Manage your profile and account settings."
        />
        <div className="w-20 h-20 bg-white dark:bg-zinc-900 rounded-3xl flex items-center justify-center mb-5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <User
            className="w-10 h-10 text-zinc-400 dark:text-zinc-500"
            strokeWidth={1.5}
          />
        </div>
        <h2 className="text-2xl font-black mb-2 tracking-tight text-zinc-900 dark:text-white">
          Sign In to Continue
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 max-w-xs leading-relaxed">
          Sign in to access your profile, order history, wallet, inbox messages,
          and all account pages.
        </p>
        <button
          type="button"
          onClick={() => navigate("/auth-selector")}
          className="px-8 py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full font-extrabold text-xs transition shadow-lg active:scale-95 flex items-center space-x-2 cursor-pointer"
        >
          <span>Sign In / Register</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#6BB2F8]/65 via-[#DCEEFF]/45 via-18% to-transparent dark:from-black dark:via-zinc-950 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100 font-sans pb-32 pt-4 sm:pt-6">
      <SEO
        title={`${displayName} • DEEP SHOP`}
        description="Account dashboard, orders, wallet, settings, and all pages."
      />

      {/* Uses <div> instead of <main> so global CSS never forces a solid white rectangle */}
      <div className="max-w-2xl mx-auto px-4 space-y-6 bg-transparent">
        {/* TOP PROFILE HEADER */}
        <div className="relative bg-white/85 dark:bg-zinc-900/85 backdrop-blur-2xl rounded-[32px] p-5 sm:p-6 border border-white/80 dark:border-zinc-800 shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              <AvatarUploader onUpload={handleAvatarUpload}>
                <div className="relative group cursor-pointer shrink-0">
                  <Avatar className="w-20 h-20 sm:w-24 sm:h-24 rounded-[28px] border-3 border-white dark:border-zinc-800 shadow-lg bg-zinc-200 dark:bg-zinc-800 transition-transform group-hover:scale-105 active:scale-95">
                    <AvatarImage
                      src={
                        effectiveProfile?.photoURL ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          displayName
                        )}&background=1877F2&color=fff`
                      }
                      alt={displayName}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-2xl font-black bg-zinc-200 dark:bg-zinc-800">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center border-2 border-white dark:border-zinc-950 shadow-md">
                    <Pencil className="w-3.5 h-3.5" />
                  </div>
                </div>
              </AvatarUploader>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-white truncate">
                    {displayName}
                  </h1>
                  <CheckCircle2 className="w-5 h-5 text-[#1877F2] shrink-0" />
                  {isAdmin && (
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider">
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-semibold text-zinc-500 dark:text-zinc-400 truncate">
                  @{handle}
                </p>
                {effectiveProfile.email && (
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                    {effectiveProfile.email}
                  </p>
                )}
              </div>
            </div>

            <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  navigate("/deposit");
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-full bg-[#F4F6FA] dark:bg-zinc-800 hover:bg-slate-200/70 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-900 dark:text-white transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-[#1877F2]" />
                <span>Deposit / QR</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  navigate("/subscription");
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-full bg-[#1877F2] hover:bg-[#1465D8] text-white text-xs font-bold shadow-md shadow-blue-500/25 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Crown className="w-4 h-4" />
                <span>VIP Plan</span>
              </button>
            </div>
          </div>

          {/* STATS ROW */}
          <div className="grid grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-slate-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => navigate("/deposit")}
              className="rounded-2xl bg-[#F6F8FC] dark:bg-zinc-800/70 p-2.5 text-center hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <span className="text-[10px] font-bold uppercase text-zinc-400 block">
                Wallet
              </span>
              <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums truncate block">
                {formatPrice(walletBalance)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/my-coins")}
              className="rounded-2xl bg-[#F6F8FC] dark:bg-zinc-800/70 p-2.5 text-center hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <span className="text-[10px] font-bold uppercase text-zinc-400 block">
                Coins
              </span>
              <span className="text-sm sm:text-base font-black text-amber-500 tabular-nums block">
                {coins.toLocaleString()}
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/buy-stars")}
              className="rounded-2xl bg-[#F6F8FC] dark:bg-zinc-800/70 p-2.5 text-center hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <span className="text-[10px] font-bold uppercase text-zinc-400 block">
                Stars
              </span>
              <span className="text-sm sm:text-base font-black text-indigo-500 tabular-nums block">
                {stars.toLocaleString()}
              </span>
            </button>
            <div className="rounded-2xl bg-[#F6F8FC] dark:bg-zinc-800/70 p-2.5 text-center">
              <span className="text-[10px] font-bold uppercase text-zinc-400 block">
                Followers
              </span>
              <span className="text-sm sm:text-base font-black text-zinc-900 dark:text-white tabular-nums block">
                {followers > 0 ? followers.toLocaleString() : xp.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* PROMINENT TOP ADMIN CONTROL PANEL BANNER FOR ADMINS & STAFF */}
        {isAdmin && (
          <motion.div
            whileTap={{ scale: 0.985 }}
            onClick={() => {
              triggerHaptic();
              navigate("/admin");
            }}
            className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-indigo-600 via-[#1877F2] to-blue-700 text-white p-5 shadow-[0_14px_34px_rgba(24,119,242,0.32)] cursor-pointer group"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/25">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                      Admin Control Panel
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-white text-indigo-700 text-[10px] font-black uppercase tracking-wider shrink-0">
                      Full Access
                    </span>
                  </div>
                  <p className="text-xs text-blue-100 font-medium truncate mt-0.5">
                    Manage Products, Orders, Users, Deposits, Banners, Stories & Settings
                  </p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:translate-x-0.5 transition-transform">
                <ChevronRight className="w-5 h-5 text-white" />
              </div>
            </div>
          </motion.div>
        )}

        {/* MEMBERSHIP BANNER */}
        <motion.div
          whileTap={{ scale: 0.985 }}
          onClick={() => navigate("/subscription")}
          className="relative overflow-hidden rounded-[28px] bg-zinc-900 dark:bg-zinc-950 text-white p-5 border border-zinc-800 shadow-[0_14px_36px_rgba(15,23,42,0.18)] cursor-pointer group"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-12 rounded-2xl bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-800 p-2 shadow-inner border border-zinc-500/30 flex flex-col justify-between shrink-0">
              <div className="w-5 h-3.5 rounded bg-amber-400/90" />
              <span className="text-[9px] font-black tracking-[0.2em] text-zinc-300 uppercase">
                DEEP
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide truncate">
                {effectiveProfile.hasActiveSubscription
                  ? "VIP Reseller Member"
                  : "Starter Plan · Upgrade to VIP"}
              </h3>
              <p className="text-xs text-zinc-400 font-medium mt-0.5 truncate">
                Unlock 0৳ advance Cash on Delivery & exclusive wholesale perks
              </p>
            </div>

            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-white transition-colors" />
            </div>
          </div>
        </motion.div>

        {/* INSTANT PAGE FINDER SEARCH BAR */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all profile pages, orders, wallet, settings..."
            className="w-full h-12 pl-11 pr-10 rounded-full bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 text-sm font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 shadow-[0_4px_16px_rgba(15,23,42,0.04)] outline-none focus:border-[#1877F2]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ALL RESTORED APPLICATION SECTIONS & PAGES */}
        <div className="space-y-6">
          {filteredSections.map((section) => (
            <div key={section.id} className="space-y-2">
              <h2 className="px-3 text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {section.heading}
              </h2>
              <div className="bg-white/85 dark:bg-zinc-900/85 backdrop-blur-2xl rounded-[28px] p-1.5 border border-white/80 dark:border-zinc-800/80 shadow-[0_8px_28px_rgba(15,23,42,0.05)] overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800/70">
                {section.items.map((item) => (
                  <ProfileRow
                    key={item.id}
                    icon={item.icon}
                    title={item.title}
                    subtitle={item.subtitle}
                    badge={item.badge}
                    onClick={item.onClick}
                  />
                ))}
              </div>
            </div>
          ))}

          {filteredSections.length === 0 && (
            <div className="rounded-[28px] bg-white dark:bg-zinc-900 p-8 text-center border border-slate-200/70 dark:border-zinc-800">
              <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                No pages matched “{searchQuery}”
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-3 px-4 py-2 rounded-full bg-[#1877F2] text-white text-xs font-bold cursor-pointer"
              >
                Show All Pages
              </button>
            </div>
          )}

          {/* LOGOUT CARD */}
          <div className="bg-white/85 dark:bg-zinc-900/85 backdrop-blur-2xl rounded-[28px] p-1.5 border border-white/80 dark:border-zinc-800/80 shadow-[0_8px_28px_rgba(15,23,42,0.05)] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="w-full flex items-center justify-between p-3.5 rounded-[22px] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                  <LogOut className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <span className="font-black text-sm uppercase tracking-wider">
                  Log Out
                </span>
              </div>
              <ChevronRight className="w-5 h-5 opacity-40 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* LOGOUT CONFIRMATION MODAL (Portaled above Bottom Navigation) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showLogoutModal && (
              <div className="fixed inset-0 z-[200000] flex items-end sm:items-center justify-center px-4 pb-24 pt-4 sm:p-4 bg-black/70 backdrop-blur-md">
                <motion.div
                  initial={{ opacity: 0, y: 36, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 36, scale: 0.96 }}
                  className="w-full max-w-sm bg-white dark:bg-zinc-950 rounded-[32px] p-7 sm:p-8 text-center shadow-2xl border border-white/20 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                >
                  <div className="w-16 h-16 rounded-[24px] bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-5 shadow-lg">
                    <LogOut className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black tracking-tight">
                    Are you sure?
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 mb-7 font-medium leading-relaxed">
                    You will need to sign in again to access your orders, wallet,
                    and rewards.
                  </p>
                  <div className="grid grid-cols-2 gap-3.5">
                    <button
                      type="button"
                      onClick={() => setShowLogoutModal(false)}
                      className="py-3.5 rounded-full bg-zinc-100 dark:bg-zinc-800 font-black text-xs uppercase tracking-widest transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="py-3.5 rounded-full bg-rose-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-600/20 transition cursor-pointer"
                    >
                      Log Out
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

function ProfileRow({
  icon,
  title,
  subtitle,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        triggerHaptic();
        onClick();
      }}
      className="w-full flex items-center justify-between p-3.5 text-left cursor-pointer hover:bg-slate-50/90 dark:hover:bg-zinc-800/50 transition-colors group rounded-[20px]"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-11 h-11 rounded-[16px] bg-[#F4F6FA] dark:bg-zinc-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight truncate">
            {title}
          </p>
          {subtitle && (
            <p className="text-[11.5px] font-medium text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 pl-2">
        {badge && (
          <span
            className={`px-2.5 py-0.5 rounded-full text-white text-[10px] font-black uppercase tracking-wider shadow-xs ${
              badge === "ADMIN"
                ? "bg-indigo-600"
                : badge === "VERIFIED" || badge === "SELLER"
                ? "bg-emerald-600"
                : "bg-rose-500"
            }`}
          >
            {badge}
          </span>
        )}
        <ChevronRight className="w-4.5 h-4.5 text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  );
}

export default Profile;
