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
import {
  getSafeDisplayName,
  getSafePublicUsername,
  isPhoneAuthEmail,
} from "../lib/utils";
import { syncCurrentUserToSavedAccounts } from "../lib/savedAccounts";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  APPLE_SPRING_DEFAULT,
  projectMomentum,
} from "../lib/shoppingRoute";
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
  const shouldReduceMotion = useReducedMotion();

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
          const shopOnly = snapshot.docs.filter((docSnap) => {
            const d = docSnap.data();
            return (
              !d.fromUserId &&
              !d.postId &&
              !d.storyId &&
              !String(d.link || "").startsWith("/loops") &&
              !String(d.link || "").startsWith("/news") &&
              !["follow", "like", "story_like", "comment", "repost", "story", "loop", "loop_post_report", "social", "star_gift"].includes(
                String(d.type || "").toLowerCase()
              )
            );
          });
          setUnreadNotifications(shopOnly.length);
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
      syncCurrentUserToSavedAccounts(auth.currentUser, effectiveProfile);
      await signOut(auth);
      localStorage.removeItem("f_cart");
      notify("Logged out successfully", "success");
      navigate("/accounts");
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
    getSafeDisplayName(effectiveProfile, "") ||
    getSafeDisplayName(authUser, "") ||
    "Member";

  const handle = getSafePublicUsername(effectiveProfile);

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
        icon: <Shield className="w-[22px] h-[22px] stroke-[2]" />,
        onClick: () => navigate("/admin"),
        keywords: "admin dashboard control panel staff manage orders products users",
      });
    }

    if (isSeller || isAdmin) {
      dashboardItems.push({
        id: "seller-dashboard",
        title: "Seller Dashboard",
        subtitle: "Manage your shop products & sales",
        badge: "SELLER",
        icon: <Store className="w-[22px] h-[22px] stroke-[2]" />,
        onClick: () => navigate("/seller/dashboard"),
        keywords: "seller shop store dashboard vendor",
      });
    }

    dashboardItems.push({
      id: "creator-dashboard",
      title: "Creator Studio & Analytics",
      subtitle: "Audience insights, star earnings & payout numbers",
      icon: <LayoutDashboard className="w-[22px] h-[22px] stroke-[2]" />,
      onClick: () => navigate("/creator-dashboard"),
      keywords: "creator studio analytics earnings bkash nagad",
    });

    if (canSetupCreatorSubs) {
      dashboardItems.push({
        id: "creator-sub-setup",
        title: "Creator Subscription Setup",
        subtitle: "Configure fan tiers & monthly supporter perks",
        icon: <Crown className="w-[22px] h-[22px] stroke-[2]" />,
        onClick: () => navigate("/creator/subscription-setup"),
        keywords: "creator subscription tiers setup",
      });
    }

    const communityItems: ProfileMenuItem[] = [
      {
        id: "news-hub",
        title: "News Hub & Scam Defense Feed",
        subtitle: "Community updates, voice notes & verified scam alerts",
        icon: <Newspaper className="w-[22px] h-[22px] stroke-[2]" />,
        onClick: () => navigate("/news-hub"),
        keywords: "news hub feed scam alert community",
      },
      {
        id: "create-post",
        title: "Create Feed Post / Report Scam",
        subtitle: "Share photos, voice notes, links or expose a scammer",
        icon: <ShieldAlert className="w-[22px] h-[22px] stroke-[2]" />,
        onClick: () => navigate("/news-hub/create"),
        keywords: "create post scam report voice",
      },
      {
        id: "saved-posts",
        title: "Saved Feed Posts",
        subtitle: "Bookmarked posts & scam reports",
        icon: <Bookmark className="w-[22px] h-[22px] stroke-[2]" />,
        onClick: () => navigate("/news-hub/saved"),
        keywords: "saved posts bookmarks feed",
      },
      {
        id: "feed-personalization",
        title: "Feed Personalization",
        subtitle: "Customize feed themes & content preferences",
        icon: <Palette className="w-[22px] h-[22px] stroke-[2]" />,
        onClick: () => navigate("/news-hub/personalization"),
        keywords: "feed personalization customize themes",
      },
      {
        id: "news-notifications",
        title: "News Hub Activity",
        subtitle: "Reactions, comments & mentions on your posts",
        icon: <Bell className="w-[22px] h-[22px] stroke-[2]" />,
        onClick: () => navigate("/news-hub/notifications"),
        keywords: "news hub notifications comments reactions",
      },
      {
        id: "blogs",
        title: "Tech Blogs & Buying Guides",
        subtitle: "Read mobile reviews, tips & platform guides",
        icon: <BookOpen className="w-[22px] h-[22px] stroke-[2]" />,
        onClick: () => navigate("/blog"),
        keywords: "blog articles tech news guides",
      },
    ];

    if (isAdmin) {
      communityItems.push({
        id: "create-blog",
        title: "Write a Blog Article",
        subtitle: "Publish a guide or review to the blog",
        icon: <Pencil className="w-[22px] h-[22px] stroke-[2]" />,
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
        icon: <MessageSquare className="w-[22px] h-[22px] stroke-[2]" />,
        onClick: () => navigate("/messages"),
        keywords: "messages inbox chat live",
      },
      {
        id: "notifications",
        title: "App Notifications",
        subtitle: "Order updates, alerts & announcements",
        badge:
          unreadNotifications > 0 ? String(unreadNotifications) : undefined,
        icon: <Bell className="w-[22px] h-[22px] stroke-[2]" />,
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
            icon: <Package className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/orders"),
            keywords: "orders track parcel shipping receipt history",
          },
          {
            id: "cart",
            title: "Shopping Cart",
            subtitle: "View items ready for checkout",
            badge: cartCount > 0 ? String(cartCount) : undefined,
            icon: <ShoppingCart className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/cart"),
            keywords: "cart bag checkout buy",
          },
          {
            id: "wishlist",
            title: "My Wishlist",
            subtitle: "Saved phones, gadgets & favorite deals",
            icon: <Heart className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/wishlist"),
            keywords: "wishlist favorites saved products",
          },
          {
            id: "exchange-request",
            title: "Return & Exchange Request",
            subtitle: "Submit device replacement or return claims",
            icon: <ArrowLeftRight className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/exchange-request"),
            keywords: "return exchange refund replace warranty",
          },
          {
            id: "leave-review",
            title: "Leave a Review",
            subtitle: "Share feedback & photos on delivered orders",
            icon: <Star className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/leave-review"),
            keywords: "review rating feedback",
          },
          {
            id: "all-products",
            title: "All Products Catalog",
            subtitle: "Browse every border cross phone & accessory",
            icon: <ShoppingBag className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/all-products"),
            keywords: "catalog all products shop phones",
          },
          {
            id: "flash-sale",
            title: "Flash Sale Deals",
            subtitle: "Limited-time markdowns & special drops",
            icon: <Zap className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/flash-sale"),
            keywords: "flash sale deals discount offer",
          },
          {
            id: "bundles",
            title: "Bundle Deals",
            subtitle: "Save extra with curated combo packs",
            icon: <Boxes className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/bundles"),
            keywords: "bundle combo deals",
          },
          {
            id: "build-box",
            title: "Build Your Custom Box",
            subtitle: "Pick devices & accessories for custom bundle pricing",
            icon: <Box className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/build-box"),
            keywords: "build box custom bundle",
          },
          {
            id: "bonus-products",
            title: "Bonus & Freebie Products",
            subtitle: "Exclusive member bonus items & perks",
            icon: <Gift className="w-[22px] h-[22px] stroke-[2]" />,
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
            badge: walletBalance > 0 ? formatPrice(walletBalance) : undefined,
            icon: <Wallet className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/deposit"),
            keywords: "wallet deposit topup balance qr",
          },
          {
            id: "withdraw",
            title: "Withdraw Earnings",
            subtitle: "Cash out affiliate & coin balance to bKash / Nagad",
            icon: <ArrowLeftRight className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/withdraw"),
            keywords: "withdraw payout bkash nagad cashout",
          },
          {
            id: "my-coins",
            title: "My Coins & Daily Rewards",
            subtitle: `${coins.toLocaleString()} coins available`,
            badge: coins > 0 ? `${coins.toLocaleString()}` : undefined,
            icon: <Coins className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/my-coins"),
            keywords: "coins points spin rewards",
          },
          {
            id: "shopping-credits",
            title: "Shopping Credits",
            subtitle: "Store credit balance & promotional vouchers",
            icon: <CreditCard className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/credits"),
            keywords: "shopping credits store credit",
          },
          {
            id: "my-coupons",
            title: "My Coupons",
            subtitle: "View active discount coupons on your account",
            icon: <Ticket className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/my-coupons"),
            keywords: "my coupons discount",
          },
          {
            id: "redeem-coupon",
            title: "Redeem Promo / Coupon Code",
            subtitle: "Apply a promo code to unlock instant savings",
            icon: <Sparkles className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/coupon"),
            keywords: "coupon promo code redeem",
          },
          {
            id: "buy-stars",
            title: "Buy Stars",
            subtitle: `Support creators · ${stars.toLocaleString()} stars owned`,
            badge: stars > 0 ? `${stars.toLocaleString()}` : undefined,
            icon: <Star className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/buy-stars"),
            keywords: "stars gift creator support",
          },
          {
            id: "payment-methods",
            title: "Saved Payment Methods",
            subtitle: "Manage bKash, Nagad & card payment options",
            icon: <CreditCard className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/payment-methods"),
            keywords: "payment methods bkash nagad cards",
          },
          {
            id: "add-card",
            title: "Add New Card",
            subtitle: "Link a debit or credit card for fast checkout",
            icon: <Plus className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/add-card"),
            keywords: "add card visa mastercard",
          },
          {
            id: "subscription",
            title: "VIP & Reseller Subscription",
            subtitle: "Zero-advance COD perks & Reseller Masterclass",
            icon: <Crown className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/subscription"),
            keywords: "vip subscription reseller pro plan",
          },
          {
            id: "affiliate",
            title: "Affiliate & Refer Rewards",
            subtitle: "Invite friends & earn commission on every order",
            icon: <Sparkles className="w-[22px] h-[22px] stroke-[2]" />,
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
            icon: <User className="w-[22px] h-[22px] stroke-[2]" />,
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
            icon: <ShieldCheck className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/kyc-verification"),
            keywords: "kyc verification nid identity badge",
          },
          {
            id: "shipping-address",
            title: "Shipping Addresses",
            subtitle: "Manage home, office & recipient delivery addresses",
            icon: <MapPin className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/shipping-address"),
            keywords: "shipping address delivery location",
          },
          {
            id: "account-settings",
            title: "Account Settings",
            subtitle: "General preferences, push alerts & account controls",
            icon: <Settings className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/settings"),
            keywords: "settings account preferences",
          },
          {
            id: "password-manager",
            title: "Security & Password Manager",
            subtitle: "Change password or send recovery reset",
            icon: <KeyRound className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/settings/password"),
            keywords: "password security change reset",
          },
          {
            id: "biometrics",
            title: "Biometric & PIN App Lock",
            subtitle: "Protect app access with fingerprint, Face ID or PIN",
            icon: <Lock className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/settings/biometrics"),
            keywords: "biometric fingerprint pin lock security",
          },
          {
            id: "devices",
            title: "Logged-in Devices",
            subtitle: "Review active sessions & device security",
            icon: <Smartphone className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/devices"),
            keywords: "devices sessions active login",
          },
          {
            id: "region",
            title: "Region & Currency",
            subtitle: `Current region: ${effectiveProfile?.region || "BD"}`,
            badge: effectiveProfile?.region || "BD",
            icon: <Globe className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/region"),
            keywords: "region language currency country",
          },
          {
            id: "appearance",
            title: "Appearance",
            subtitle: isDark ? "Dark Theme Active (Tap to switch)" : "Light Theme Active (Tap to switch)",
            badge: isDark ? "Dark" : "Light",
            icon: <Palette className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: toggleTheme,
            keywords: "appearance dark light mode theme",
          },
          {
            id: "switch-account",
            title: "Saved Accounts & Switch Profile",
            subtitle: "View saved accounts on this device or add another profile",
            icon: <User className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/accounts"),
            keywords: "switch account multi login saved accounts",
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
            icon: <Headset className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/help-center"),
            keywords: "help center support customer care",
          },
          {
            id: "my-tickets",
            title: "My Support Tickets",
            subtitle: "Check replies & status on submitted tickets",
            icon: <FileText className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/my-tickets"),
            keywords: "tickets support helpdesk",
          },
          {
            id: "faq",
            title: "Frequently Asked Questions (FAQ)",
            subtitle: "Quick answers about border cross phones & COD",
            icon: <HelpCircle className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/faq"),
            keywords: "faq questions answers",
          },
          {
            id: "contact",
            title: "Contact Us",
            subtitle: "Store address, phone hotline & official channels",
            icon: <PhoneCall className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/contact"),
            keywords: "contact phone address email",
          },
          {
            id: "about",
            title: "About DEEP SHOP",
            subtitle: "Our mission, authenticity guarantee & story",
            icon: <Info className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/about"),
            keywords: "about deep shop company",
          },
          {
            id: "privacy",
            title: "Privacy Policy",
            subtitle: "How we protect your personal data",
            icon: <Eye className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/privacy"),
            keywords: "privacy policy data",
          },
          {
            id: "terms",
            title: "Terms & Conditions",
            subtitle: "Platform rules, buyer & seller agreements",
            icon: <FileText className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/terms"),
            keywords: "terms conditions rules",
          },
          {
            id: "refund-policy",
            title: "Refund & Return Policy",
            subtitle: "Eligibility, timelines & replacement guidelines",
            icon: <FileText className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/refund-policy"),
            keywords: "refund return policy",
          },
          {
            id: "shipping-policy",
            title: "Shipping & Delivery Policy",
            subtitle: "Nationwide courier coverage & delivery times",
            icon: <Package className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/shipping-policy"),
            keywords: "shipping delivery courier policy",
          },
          {
            id: "cookie-policy",
            title: "Cookie Policy",
            subtitle: "Session & storage preferences",
            icon: <Shield className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/cookie-policy"),
            keywords: "cookie policy",
          },
          {
            id: "disclaimer",
            title: "Disclaimer",
            subtitle: "Important product & marketplace notices",
            icon: <ShieldAlert className="w-[22px] h-[22px] stroke-[2]" />,
            onClick: () => navigate("/disclaimer"),
            keywords: "disclaimer legal notice",
          },
          {
            id: "sitemap",
            title: "Sitemap & All Pages Directory",
            subtitle: "Complete index of every page on DEEP SHOP",
            icon: <Globe className="w-[22px] h-[22px] stroke-[2]" />,
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
      <div className="ds-apple-shop-canvas min-h-screen flex items-center justify-center text-sm font-semibold ds-apple-muted">
        Loading profile...
      </div>
    );
  }

  if (!effectiveProfile) {
    return (
      <div className="ds-apple-shop-canvas flex flex-col items-center justify-center text-center py-28 px-4 min-h-screen">
        <SEO
          title="My Profile • DEEP SHOP"
          description="Manage your profile and account settings."
        />
        <div className="ds-apple-surface w-20 h-20 rounded-[24px] flex items-center justify-center mb-5">
          <User
            className="w-10 h-10 ds-apple-muted"
            strokeWidth={1.6}
          />
        </div>
        <h2 className="ds-apple-display text-2xl font-semibold mb-2">
          Sign In to Continue
        </h2>
        <p className="text-[13px] ds-apple-muted mb-6 max-w-xs leading-relaxed">
          Sign in to access your profile, order history, wallet, inbox messages,
          and all account pages.
        </p>
        <motion.button
          type="button"
          whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
          onClick={() => {
            triggerHaptic();
            navigate("/auth-selector");
          }}
          className="ds-apple-btn-primary px-8 h-12 rounded-full font-semibold text-sm transition flex items-center gap-2 cursor-pointer"
        >
          <span>Sign In / Register</span>
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>
    );
  }

  return (
    <div className="ds-apple-shop-canvas min-h-screen pb-32 pt-4 sm:pt-6">
      <SEO
        title={`${displayName} • DEEP SHOP`}
        description="Account dashboard, orders, wallet, settings, and all pages."
      />

      <div className="max-w-2xl mx-auto px-3.5 sm:px-5 space-y-5 bg-transparent">
        {/* TOP PROFILE HEADER */}
        <div className="ds-apple-surface relative rounded-[24px] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              <AvatarUploader onUpload={handleAvatarUpload}>
                <div className="relative group cursor-pointer shrink-0">
                  <Avatar className="w-20 h-20 sm:w-24 sm:h-24 rounded-[26px] border-2 border-white/80 dark:border-white/15 shadow-sm bg-[#F2F2F7] dark:bg-[#2C2C2E] transition-transform group-hover:scale-[1.03] active:scale-95">
                    <AvatarImage
                      src={
                        effectiveProfile?.photoURL ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          displayName
                        )}&background=0071E3&color=fff`
                      }
                      alt={displayName}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-2xl font-semibold bg-[#F2F2F7] dark:bg-[#2C2C2E]">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ds-apple-icon-btn absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center">
                    <Pencil className="w-3.5 h-3.5" />
                  </div>
                </div>
              </AvatarUploader>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="ds-apple-display text-xl sm:text-2xl font-semibold truncate">
                    {displayName}
                  </h1>
                  <CheckCircle2 className="w-5 h-5 ds-apple-accent-text shrink-0" />
                  {isAdmin && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] text-white text-[10px] font-semibold uppercase tracking-wider">
                      Admin
                    </span>
                  )}
                </div>
                {handle && (
                  <p className="text-xs sm:text-sm font-medium ds-apple-muted truncate">
                    @{handle}
                  </p>
                )}
                {effectiveProfile.email && !isPhoneAuthEmail(effectiveProfile.email) && (
                  <p className="text-[11px] ds-apple-muted truncate mt-0.5">
                    {effectiveProfile.email}
                  </p>
                )}
              </div>
            </div>

            <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
              <motion.button
                type="button"
                whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                onClick={() => {
                  triggerHaptic();
                  navigate("/deposit");
                }}
                className="ds-apple-btn-secondary flex-1 sm:flex-none px-4 h-9 rounded-full text-xs font-semibold whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 ds-apple-accent-text shrink-0" />
                <span>Deposit / QR</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                onClick={() => {
                  triggerHaptic();
                  navigate("/subscription");
                }}
                className="ds-apple-btn-primary flex-1 sm:flex-none px-4 h-9 rounded-full text-xs font-semibold whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 shrink-0" />
                <span>VIP Plan</span>
              </motion.button>
            </div>
          </div>

          {/* STATS ROW */}
          <div className="grid grid-cols-4 gap-2 mt-4 pt-3.5 border-t border-black/[0.06] dark:border-white/[0.08]">
            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
              onClick={() => {
                triggerHaptic();
                navigate("/deposit");
              }}
              className="ds-apple-surface-subtle rounded-2xl p-2.5 text-center transition cursor-pointer"
            >
              <span className="text-[10px] font-medium ds-apple-muted block">
                Wallet
              </span>
              <span className="text-xs sm:text-sm font-semibold text-[#248A3D] dark:text-[#30D158] tabular-nums truncate block mt-0.5">
                {formatPrice(walletBalance)}
              </span>
            </motion.button>
            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
              onClick={() => {
                triggerHaptic();
                navigate("/my-coins");
              }}
              className="ds-apple-surface-subtle rounded-2xl p-2.5 text-center transition cursor-pointer"
            >
              <span className="text-[10px] font-medium ds-apple-muted block">
                Coins
              </span>
              <span className="text-xs sm:text-sm font-semibold text-[#C93400] dark:text-[#FF9F0A] tabular-nums block mt-0.5">
                {coins.toLocaleString()}
              </span>
            </motion.button>
            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
              onClick={() => {
                triggerHaptic();
                navigate("/buy-stars");
              }}
              className="ds-apple-surface-subtle rounded-2xl p-2.5 text-center transition cursor-pointer"
            >
              <span className="text-[10px] font-medium ds-apple-muted block">
                Stars
              </span>
              <span className="text-xs sm:text-sm font-semibold ds-apple-accent-text tabular-nums block mt-0.5">
                {stars.toLocaleString()}
              </span>
            </motion.button>
            <div className="ds-apple-surface-subtle rounded-2xl p-2.5 text-center">
              <span className="text-[10px] font-medium ds-apple-muted block">
                Followers
              </span>
              <span className="text-xs sm:text-sm font-semibold tabular-nums block mt-0.5">
                {followers > 0 ? followers.toLocaleString() : xp.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* PROMINENT TOP ADMIN CONTROL PANEL BANNER FOR ADMINS & STAFF */}
        {isAdmin && (
          <motion.div
            whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
            onClick={() => {
              triggerHaptic();
              navigate("/admin");
            }}
            className="relative overflow-hidden rounded-[22px] bg-[#0071E3] dark:bg-[#0A84FF] text-white p-4 shadow-sm cursor-pointer group"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-semibold tracking-tight text-white truncate">
                      Admin Control Panel
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-semibold uppercase tracking-wider shrink-0">
                      Admin
                    </span>
                  </div>
                  <p className="text-[11px] text-white/80 font-medium truncate mt-0.5">
                    Manage Products, Orders, Users, Deposits, Banners &amp; Settings
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0 group-hover:translate-x-0.5 transition-transform">
                <ChevronRight className="w-4 h-4 text-white" />
              </div>
            </div>
          </motion.div>
        )}

        {/* MEMBERSHIP BANNER */}
        <motion.div
          whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
          onClick={() => {
            triggerHaptic();
            navigate("/subscription");
          }}
          className="ds-apple-surface relative overflow-hidden rounded-[22px] p-4 cursor-pointer group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF9500] to-[#FFCC00] flex items-center justify-center text-white shrink-0">
              <Crown className="w-5 h-5" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-semibold tracking-tight truncate">
                {effectiveProfile.hasActiveSubscription
                  ? "VIP Reseller Member"
                  : "Starter Plan · Upgrade to VIP"}
              </h3>
              <p className="text-[11px] ds-apple-muted font-medium mt-0.5 truncate">
                Unlock 0৳ advance Cash on Delivery &amp; wholesale perks
              </p>
            </div>

            <div className="ds-apple-surface-subtle w-7 h-7 rounded-full flex items-center justify-center shrink-0">
              <ChevronRight className="w-4 h-4 ds-apple-muted group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </motion.div>

        {/* INSTANT PAGE FINDER SEARCH BAR */}
        <div className="relative">
          <Search className="w-4 h-4 ds-apple-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all profile pages, orders, wallet, settings..."
            className="ds-apple-input w-full h-11 pl-11 pr-10 rounded-full text-sm font-medium outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setSearchQuery("");
              }}
              className="ds-apple-icon-btn absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ALL PROFILE SECTIONS */}
        <div className="space-y-5">
          {filteredSections.map((section) => (
            <div key={section.id} className="space-y-2">
              <h2 className="ds-apple-eyebrow ds-apple-muted px-2 text-[11px]">
                {section.heading}
              </h2>
              <div className="ds-apple-surface w-full rounded-[22px] overflow-hidden">
                {section.items.map((item, idx) => (
                  <ProfileRow
                    key={item.id}
                    icon={item.icon}
                    title={item.title}
                    badge={item.badge}
                    isLast={idx === section.items.length - 1}
                    onClick={item.onClick}
                  />
                ))}
              </div>
            </div>
          ))}

          {filteredSections.length === 0 && (
            <div className="ds-apple-surface rounded-[22px] p-8 text-center">
              <p className="text-sm font-semibold">
                No pages matched “{searchQuery}”
              </p>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setSearchQuery("");
                }}
                className="ds-apple-btn-primary mt-3 px-4 py-2 rounded-full text-xs font-semibold cursor-pointer"
              >
                Show All Pages
              </button>
            </div>
          )}

          {/* LOGOUT CARD */}
          <div className="ds-apple-surface w-full rounded-[22px] overflow-hidden">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setShowLogoutModal(true);
              }}
              className="w-full pl-5 pr-4 py-[16px] flex items-center justify-between hover:bg-black/[0.025] dark:hover:bg-white/[0.04] active:bg-black/[0.045] transition-colors cursor-pointer"
            >
              <div className="flex items-center min-w-0">
                <span className="w-6 h-6 flex items-center justify-center text-[#FF3B30] dark:text-[#FF453A] shrink-0">
                  <LogOut className="w-[21px] h-[21px] stroke-[2]" />
                </span>
                <span className="pl-4 text-[16px] leading-[1.3] font-medium text-[#FF3B30] dark:text-[#FF453A] tracking-[-0.01em] truncate">
                  Log Out
                </span>
              </div>
              <ChevronRight className="w-[19px] h-[19px] ds-apple-muted stroke-[2] shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* LOGOUT CONFIRMATION BOTTOM SHEET */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showLogoutModal && (
              <div
                className="ds-apple-portal fixed inset-0 z-[280] flex flex-col justify-end"
                onClick={() => setShowLogoutModal(false)}
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="ds-apple-backdrop fixed inset-0"
                />

                <motion.div
                  initial={shouldReduceMotion ? { opacity: 0 } : { y: "100%" }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { y: "100%" }}
                  transition={
                    shouldReduceMotion ? { duration: 0.16 } : APPLE_SPRING_DEFAULT
                  }
                  drag={shouldReduceMotion ? false : "y"}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0.02, bottom: 0.45 }}
                  onDragEnd={(_, info) => {
                    const projected = info.offset.y + projectMomentum(info.velocity.y);
                    if (projected > 120 || info.velocity.y > 420) {
                      triggerHaptic();
                      setShowLogoutModal(false);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="ds-apple-sheet relative z-[281] w-full max-w-none sm:max-w-lg mx-auto rounded-t-[28px] rounded-b-none sm:rounded-[28px] px-5 pt-3 pb-[calc(24px+env(safe-area-inset-bottom,0px))] sm:pb-8 space-y-4"
                >
                  <div className="w-10 h-1 rounded-full bg-black/20 dark:bg-white/25 mx-auto mb-1 shrink-0" />

                  <div className="space-y-1.5 pt-0.5 px-1">
                    <h3 className="text-[17px] font-semibold tracking-tight">
                      Log out of your account?
                    </h3>
                    <p className="text-[14px] leading-snug ds-apple-muted">
                      You will need to sign in again to access your orders, wallet, and profile.
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <motion.button
                      type="button"
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                      onClick={() => {
                        triggerHaptic("warning");
                        handleLogout();
                      }}
                      className="w-full flex items-center justify-center gap-2.5 h-12 px-4 rounded-full bg-[#FF3B30] dark:bg-[#FF453A] text-white text-[15.5px] font-semibold cursor-pointer"
                    >
                      <LogOut className="w-[18px] h-[18px] stroke-[2] shrink-0" />
                      <span>Log Out</span>
                    </motion.button>

                    <motion.button
                      type="button"
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                      onClick={() => {
                        triggerHaptic();
                        setShowLogoutModal(false);
                      }}
                      className="ds-apple-btn-secondary w-full flex items-center justify-center h-12 px-4 rounded-full text-[15.5px] font-semibold cursor-pointer"
                    >
                      Cancel
                    </motion.button>
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
  badge,
  isLast,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  isLast?: boolean;
  onClick: () => void;
}) {
  const isNumericAlert = Boolean(badge && /^\d+$/.test(badge));
  const isStatusChip =
    badge === "ADMIN" ||
    badge === "SELLER" ||
    badge === "VERIFIED" ||
    badge === "PENDING";

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => {
          triggerHaptic();
          onClick();
        }}
        className="w-full pl-5 pr-4 py-[17px] flex items-center justify-between hover:bg-black/[0.025] dark:hover:bg-white/[0.04] active:bg-black/[0.045] dark:active:bg-white/[0.07] transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center min-w-0 pr-3">
          <span className="w-6 h-6 flex items-center justify-center text-zinc-950 dark:text-white shrink-0">
            {icon}
          </span>
          <span className="pl-4 text-[16.5px] leading-[1.3] font-normal text-zinc-950 dark:text-white tracking-[-0.01em] truncate">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {badge &&
            (isNumericAlert ? (
              <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#FF3040] text-white text-[11.5px] font-bold flex items-center justify-center tabular-nums">
                {badge}
              </span>
            ) : isStatusChip ? (
              <span className="text-[11.5px] font-semibold tracking-wide uppercase text-[#65676B] dark:text-zinc-400">
                {badge}
              </span>
            ) : (
              <span className="text-[13.5px] font-normal text-[#65676B] dark:text-zinc-400 tabular-nums">
                {badge}
              </span>
            ))}
          <ChevronRight className="w-[20px] h-[20px] text-[#65676B] dark:text-zinc-400 stroke-[2] shrink-0" />
        </div>
      </button>
      {!isLast && (
        <div className="ml-[60px] border-b border-black/[0.06] dark:border-white/[0.08]" />
      )}
    </div>
  );
}

export default Profile;
