"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { triggerHaptic } from "@/lib/haptics";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Icon from "../Icon";
import { auth, db } from "@/firebase";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { signOut, User as FirebaseUser } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Shield } from "lucide-react";
import { getSubscriptionStatus } from "../../services/subscription";
import {
  hasImmediateAdminOrStaffRole,
  checkStaffRecord,
} from "../../lib/admin";
import { syncCurrentUserToSavedAccounts } from "../../lib/savedAccounts";

export default function AccountMenu({
  scrolled,
  isPill,
  isNewsHubStyle,
}: {
  scrolled?: boolean;
  isPill?: boolean;
  isNewsHubStyle?: boolean;
}) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isStaffDoc, setIsStaffDoc] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setIsStaffDoc(false);
      return;
    }
    const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    let active = true;
    const email = userProfile?.email || user?.email;
    if (!email) {
      setIsStaffDoc(false);
      return;
    }
    if (hasImmediateAdminOrStaffRole(userProfile, user)) {
      setIsStaffDoc(true);
      return;
    }
    checkStaffRecord(email).then((res) => {
      if (active) setIsStaffDoc(res.isStaff);
    });
    return () => {
      active = false;
    };
  }, [user, userProfile]);

  const isAdmin =
    hasImmediateAdminOrStaffRole(userProfile, user) || isStaffDoc;
  const subInfo = getSubscriptionStatus(userProfile);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      where("isRead", "==", false)
    );
    const unsub = onSnapshot(q, (snap) => {
      const shopOnlyCount = snap.docs.filter((docSnap) => {
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
      }).length;
      setUnreadCount(shopOnlyCount);
    });
    return () => unsub();
  }, [user]);

  const handleLogout = async () => {
    syncCurrentUserToSavedAccounts(auth.currentUser, userProfile);
    await signOut(auth);
    localStorage.removeItem("f_cart");
    navigate("/accounts");
  };

  const displayName =
    userProfile?.displayName ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "User";
  const initials = displayName.substring(0, 2).toUpperCase();

  const triggerClass = isNewsHubStyle
    ? cn(
        "ds-apple-icon-btn flex items-center justify-center p-0 md:pl-1.5 md:pr-3 gap-2 rounded-full font-semibold transition-transform duration-150 w-9 h-9 md:w-auto md:h-10 shrink-0 active:scale-[0.96] cursor-pointer"
      )
    : isPill
    ? cn(
        "ds-apple-icon-btn flex items-center justify-center p-0 md:pl-1.5 md:pr-3 gap-1.5 rounded-full font-medium transition-transform duration-150 w-9 h-9 sm:w-9.5 sm:h-9.5 md:w-auto md:h-10 shrink-0 active:scale-[0.96] cursor-pointer"
      )
    : cn(
        "ds-apple-icon-btn flex items-center justify-center p-0 md:pl-2 md:pr-3.5 md:py-2 gap-2 rounded-full font-medium transition-transform duration-150 w-9 h-9 md:w-auto md:h-auto shrink-0 active:scale-[0.96] cursor-pointer"
      );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={triggerClass}
          onPointerDown={() => triggerHaptic()}
          aria-label={user ? `Account menu for ${displayName}` : "Sign in or Account menu"}
          title={user ? displayName : "Sign in or Account menu"}
        >
          {user ? (
            <div className="relative w-fit shrink-0 p-[1px]">
              <Avatar className="w-7.5 h-7.5 sm:w-8 sm:h-8 md:w-7 md:h-7 rounded-full border-2 border-[#0071E3] dark:border-[#0A84FF] shrink-0">
                <AvatarImage
                  src={userProfile?.photoURL || user.photoURL || undefined}
                  alt={displayName}
                  className="object-cover rounded-full"
                />
                <AvatarFallback className="text-[10px] font-semibold bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] rounded-full">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {unreadCount > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[15px] h-3.5 text-[9px] font-semibold text-white bg-[#FF3B30] rounded-full ring-2 ring-white dark:ring-[#1C1C1E] px-1 z-10 tabular-nums">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : (
                <span className="absolute bottom-0 right-0 inline-flex size-2 rounded-full ring-2 ring-white dark:ring-[#1C1C1E] bg-[#30D158] z-10"></span>
              )}
            </div>
          ) : (
            <div
              className={cn(
                "rounded-full flex items-center justify-center shrink-0",
                isNewsHubStyle
                  ? "w-7.5 h-7.5 sm:w-8 sm:h-8 md:w-7 md:h-7 bg-transparent"
                  : isPill
                  ? "w-7.5 h-7.5 sm:w-8 sm:h-8 md:w-7 md:h-7 bg-[#F2F2F7] dark:bg-[#2C2C2E]"
                  : "w-7.5 h-7.5 sm:w-8 sm:h-8 md:w-7 md:h-7 bg-[#F2F2F7] dark:bg-[#2C2C2E]"
              )}
            >
              <Icon
                name="user"
                className="w-4 h-4 md:w-3.5 md:h-3.5 text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
          )}

          <span className="hidden md:inline-block max-w-[76px] lg:max-w-[120px] truncate text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
            {user ? displayName : "Sign in"}
          </span>
          <span className="hidden md:inline-flex items-center">
            <Icon name="chevron-down" className="w-3.5 h-3.5 opacity-55 shrink-0" />
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="ds-apple-popover ds-apple-portal w-64 rounded-[22px] p-2 z-[9999] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
      >
        {!user ? (
          <>
            <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6E6E73] dark:text-[#98989D] px-2.5 py-1.5">
              Account
            </DropdownMenuLabel>
            <DropdownMenuItem
              onPointerDown={() => triggerHaptic()}
              onClick={() => navigate("/auth-selector")}
              className="flex items-center gap-2 py-2.5 px-2.5 rounded-xl cursor-pointer hover:bg-black/[0.045] dark:hover:bg-white/[0.08] transition-colors"
            >
              <span className="flex-1 text-sm font-semibold">Sign In / Sign Up</span>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6E6E73] dark:text-[#98989D] px-2.5 py-1.5">
              My Account
            </DropdownMenuLabel>

            {isAdmin && (
              <DropdownMenuItem
                onPointerDown={() => triggerHaptic()}
                onClick={() => navigate("/admin")}
                className="flex items-center justify-between gap-2 rounded-xl py-2.5 px-2.5 mb-1 bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 hover:bg-[#0071E3]/15 dark:hover:bg-[#0A84FF]/25 text-[#0071E3] dark:text-[#0A84FF] cursor-pointer font-semibold"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium">Admin Console</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] text-white">
                  Admin
                </span>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              onPointerDown={() => triggerHaptic()}
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2.5 rounded-xl py-2 px-2.5 hover:bg-black/[0.045] dark:hover:bg-white/[0.08] cursor-pointer transition-colors"
            >
              <Icon
                name="user"
                className="w-4 h-4 text-[#6E6E73] dark:text-[#98989D]"
              />
              <span className="flex-1 text-[13.5px] font-medium">Profile & Pages</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onPointerDown={() => triggerHaptic()}
              onClick={() => navigate("/orders")}
              className="flex items-center gap-2.5 rounded-xl py-2 px-2.5 hover:bg-black/[0.045] dark:hover:bg-white/[0.08] cursor-pointer transition-colors"
            >
              <Icon
                name="shopping-bag"
                className="w-4 h-4 text-[#6E6E73] dark:text-[#98989D]"
              />
              <span className="flex-1 text-[13.5px] font-medium">My Orders</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onPointerDown={() => triggerHaptic()}
              onClick={() => navigate("/subscription")}
              className="flex items-center justify-between gap-2 rounded-xl py-2 px-2.5 hover:bg-black/[0.045] dark:hover:bg-white/[0.08] cursor-pointer overflow-hidden transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Crown className="w-4 h-4 text-[#B25000] dark:text-[#FF9F0A] shrink-0" />
                <span className="font-medium text-[13px] whitespace-nowrap truncate">
                  VIP Membership
                </span>
              </div>
              <span
                className={`text-[10px] leading-none font-semibold px-2 py-1 rounded-full whitespace-nowrap shrink-0 tabular-nums ${
                  subInfo.isSubscribed
                    ? "bg-[#FF9F0A]/15 text-[#B25000] dark:text-[#FF9F0A]"
                    : "bg-black/[0.05] dark:bg-white/[0.08] text-[#6E6E73] dark:text-[#98989D]"
                }`}
              >
                {subInfo.isSubscribed
                  ? `${subInfo.daysRemaining}d`
                  : "Free"}
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onPointerDown={() => triggerHaptic()}
              onClick={() => navigate("/notifications")}
              className="flex items-center gap-2.5 rounded-xl py-2 px-2.5 hover:bg-black/[0.045] dark:hover:bg-white/[0.08] cursor-pointer transition-colors"
            >
              <Icon
                name="bell"
                className="w-4 h-4 text-[#6E6E73] dark:text-[#98989D]"
              />
              <span className="flex-1 text-[13.5px] font-medium">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-[#0071E3] dark:bg-[#0A84FF] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full tabular-nums">
                  {unreadCount}
                </span>
              )}
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1.5 border-black/[0.06] dark:border-white/[0.08]" />

            <DropdownMenuItem
              onPointerDown={() => triggerHaptic()}
              onClick={() => navigate("/accounts")}
              className="flex items-center gap-2.5 py-2 px-2.5 rounded-xl hover:bg-black/[0.045] dark:hover:bg-white/[0.08] cursor-pointer transition-colors"
            >
              <Icon
                name="user"
                className="w-4 h-4 text-[#6E6E73] dark:text-[#98989D]"
              />
              <span className="flex-1 text-[13.5px] font-medium">Switch Account</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onPointerDown={() => triggerHaptic()}
              onClick={() => handleLogout()}
              className="flex items-center gap-2.5 py-2 px-2.5 rounded-xl hover:bg-[#FF3B30]/10 text-[#D70015] dark:text-[#FF453A] cursor-pointer transition-colors"
            >
              <Icon name="logout" className="w-4 h-4" />
              <span className="flex-1 text-[13.5px] font-medium">Log out</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
