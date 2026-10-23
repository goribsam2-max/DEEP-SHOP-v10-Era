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
  Pencil,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  QrCode,
  Shield,
  Eye,
  Bell,
  Palette,
  CheckCircle2,
  Sparkle
} from "lucide-react";
import { useTheme } from "../components/ThemeContext";
import SEO from "../components/SEO";
import { triggerHaptic } from "../lib/haptics";

interface ProfileProps {
  userData: UserProfile | null;
}

export const Profile: React.FC<ProfileProps> = ({ userData: initialUserData }) => {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const notify = useNotify();
  const [localUserData, setLocalUserData] = useState<UserProfile | null>(initialUserData);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(5);

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
    }
  };

  // If user is not logged in
  if (!localUserData) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-28 px-4 bg-zinc-50 dark:bg-black min-h-screen font-sans">
        <SEO title="My Profile • DEEP SHOP" description="Manage your profile and account settings." />
        <div className="w-20 h-20 bg-white dark:bg-zinc-900 rounded-3xl flex items-center justify-center mb-5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <User className="w-10 h-10 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-black mb-2 tracking-tight text-zinc-900 dark:text-white">
          Sign In to Continue
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 max-w-xs leading-relaxed">
          Sign in to access your profile, order history, inbox messages, and subscription perks.
        </p>
        <button
          type="button"
          onClick={() => navigate("/auth-selector")}
          className="px-8 py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-full font-extrabold text-xs transition shadow-lg active:scale-95 flex items-center space-x-2 cursor-pointer"
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
    localUserData?.email?.toLowerCase().trim() === "deepshop@gmail.com" ||
    localUserData?.email?.toLowerCase().trim() === "deepshopbysam@gmail.com" ||
    localUserData?.role === "staff";

  const isSeller = localUserData?.role === "seller";
  const handle = localUserData.username || localUserData.email?.split("@")[0] || "user";

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 via-zinc-50 to-white dark:from-black dark:via-zinc-950 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100 font-sans pb-28 pt-3">
      <SEO title={`${localUserData.displayName || "Profile"} • DEEP SHOP`} description="Account settings and membership." />

      <main className="max-w-md mx-auto px-4 space-y-5">
        {/* TOP PROFILE HEADER BLOCK (EXACT MATCH TO IMG_4760_f05ecd46.jpeg) */}
        <div className="pt-2 space-y-4">
          <div className="flex items-start justify-between gap-3">
            {/* SQUIRCLE AVATAR (Square rounded card on left) */}
            <div className="relative">
              <AvatarUploader onUpload={handleAvatarUpload}>
                <div className="relative group cursor-pointer">
                  <Avatar className="w-20 h-20 sm:w-22 sm:h-22 rounded-[26px] border-2 border-white dark:border-zinc-800 shadow-xl bg-zinc-200 dark:bg-zinc-800 transition-transform group-hover:scale-105">
                    <AvatarImage
                      src={
                        localUserData?.photoURL ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          localUserData.displayName || "User"
                        )}&background=18181b&color=fff`
                      }
                      alt={localUserData.displayName || "User"}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-xl font-bold bg-zinc-200 dark:bg-zinc-800">
                      {localUserData.displayName?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center border-2 border-white dark:border-zinc-950 shadow-md">
                    <Pencil className="w-3.5 h-3.5" />
                  </div>
                </div>
              </AvatarUploader>
            </div>

            {/* ACTION PILLS (Top Right stacked pills matching IMG_4760_f05ecd46.jpeg) */}
            <div className="space-y-2 text-right">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  navigate("/deposit");
                }}
                className="w-full px-4 py-2 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-extrabold text-zinc-900 dark:text-white shadow-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                <span>Get paid with QR</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  navigate("/subscription");
                }}
                className="w-full px-4 py-2 rounded-full bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 shadow-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Shield className="w-4 h-4 fill-indigo-500 text-indigo-500" />
                <span>Upgrade to PRO</span>
              </button>
            </div>
          </div>

          {/* USER NAME & VERIFIED BADGE */}
          <div className="space-y-0.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
              <span>{localUserData.displayName || "Madison Lee"}</span>
              <CheckCircle2 className="w-5 h-5 text-blue-500 fill-blue-500 text-white shrink-0" />
            </h1>
            <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">@{handle}</p>
          </div>
        </div>

        {/* DARK MEMBERSHIP CARD BANNER (EXACT MATCH TO IMG_4760_f05ecd46.jpeg) */}
        <div
          onClick={() => navigate("/subscription")}
          className="relative overflow-hidden rounded-3xl bg-zinc-900 dark:bg-zinc-950 text-white p-4 sm:p-5 border border-zinc-800 shadow-xl cursor-pointer group transition transform active:scale-98"
        >
          {/* Subtle metallic reflection glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-4">
            {/* Metallic Card Graphic Icon */}
            <div className="w-16 h-11 rounded-xl bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-800 p-2 shadow-inner border border-zinc-500/30 flex flex-col justify-between shrink-0">
              <div className="w-4 h-3 rounded bg-amber-400/80" />
              <span className="text-[8px] font-mono tracking-widest text-zinc-300 uppercase">DEEP</span>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black text-white tracking-wide truncate">Starter plan</h3>
              <p className="text-xs text-zinc-400 font-medium truncate mt-0.5">
                Renews on October 10 • Standard Perks
              </p>
            </div>

            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
          </div>
        </div>

        {/* GROUPED IOS 26 LIQUID GLASS CARD BLOCK 1 (EXACT MATCH TO IMG_4760_f05ecd46.jpeg) */}
        <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-3xl p-1.5 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm divide-y divide-zinc-100 dark:divide-zinc-800/60">
          <ProfileRow
            icon={<HelpCircle className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />}
            title="Help"
            onClick={() => navigate("/help")}
          />
          <ProfileRow
            icon={<Settings className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />}
            title="Account settings"
            onClick={() => navigate("/settings")}
          />
          <ProfileRow
            icon={<FileText className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />}
            title="Documents & statements"
            onClick={() => navigate("/orders")}
          />
          <ProfileRow
            icon={<MessageSquare className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />}
            title="Inbox"
            badge={unreadMessages > 0 ? String(unreadMessages) : undefined}
            onClick={() => navigate("/messages")}
          />
        </div>

        {/* GROUPED IOS 26 LIQUID GLASS CARD BLOCK 2 (EXACT MATCH TO IMG_4760_f05ecd46.jpeg) */}
        <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-3xl p-1.5 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm divide-y divide-zinc-100 dark:divide-zinc-800/60">
          <ProfileRow
            icon={<Shield className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />}
            title="Security"
            onClick={() => navigate("/settings/password")}
          />
          <ProfileRow
            icon={<Eye className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />}
            title="Privacy"
            onClick={() => navigate("/privacy")}
          />
          <ProfileRow
            icon={<Bell className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />}
            title="Notifications"
            onClick={() => navigate("/notifications")}
          />
          <ProfileRow
            icon={<Palette className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />}
            title="Appearance"
            subtitle={isDark ? "Dark Theme Enabled" : "Light Theme Enabled"}
            onClick={toggleTheme}
          />
        </div>

        {/* GROUPED IOS 26 LIQUID GLASS CARD BLOCK 3 (DYNAMIC HUB & SELLER & ADMIN CONTROLS) */}
        <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-3xl p-1.5 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm divide-y divide-zinc-100 dark:divide-zinc-800/60">
          <ProfileRow
            icon={<ShieldAlert className="w-5 h-5 text-rose-500" />}
            title="News Hub & Scam Defense"
            subtitle="Community report archive"
            onClick={() => navigate("/news-hub")}
          />
          <ProfileRow
            icon={<Sparkles className="w-5 h-5 text-amber-500" />}
            title="Refer & Earn Rewards"
            subtitle="Invite friends and earn commission"
            onClick={() => navigate("/affiliate")}
          />
          <ProfileRow
            icon={<LayoutDashboard className="w-5 h-5 text-emerald-500" />}
            title="Creator Dashboard"
            subtitle="Analytics & monetization"
            onClick={() => navigate("/creator-dashboard")}
          />

          {isSeller && (
            <ProfileRow
              icon={<Store className="w-5 h-5 text-blue-500" />}
              title="Seller Dashboard"
              subtitle="Inventory & store sales"
              onClick={() => navigate("/seller/dashboard")}
            />
          )}

          {isAdmin && (
            <ProfileRow
              icon={<Settings className="w-5 h-5 text-purple-600" />}
              title="Admin Panel"
              badge="Staff"
              onClick={() => navigate("/admin")}
            />
          )}

          <ProfileRow
            icon={<Users className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />}
            title="Switch Account"
            onClick={() => window.dispatchEvent(new CustomEvent("openAccountCenter"))}
          />
        </div>

        {/* LOGOUT BUTTON CARD */}
        <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-3xl p-1.5 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <LogOut className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <span className="font-extrabold text-sm tracking-tight">Log Out</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-50" />
          </button>
        </div>
      </main>

      {/* LOGOUT CONFIRMATION MODAL */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl p-6 text-center shadow-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
                <LogOut className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black tracking-tight">Confirm Logout</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-6">
                Are you sure you want to log out of your account on this device?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  className="py-3 rounded-full bg-zinc-100 dark:bg-zinc-800 font-extrabold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="py-3 rounded-full bg-rose-600 text-white font-extrabold text-xs shadow-md transition cursor-pointer"
                >
                  Yes, Log Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

function ProfileRow({
  icon,
  title,
  subtitle,
  badge,
  onClick
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={() => {
        triggerHaptic();
        onClick();
      }}
      className="flex items-center justify-between p-3.5 rounded-2xl cursor-pointer hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 transition group"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-extrabold text-zinc-900 dark:text-white tracking-tight truncate">
            {title}
          </p>
          {subtitle && <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {badge && (
          <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black shadow-xs">
            {badge}
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </div>
  );
}

export default Profile;
