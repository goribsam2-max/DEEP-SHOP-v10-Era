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
      setUnreadCount(snap.docs.length);
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
        "flex items-center justify-center p-0 md:pl-1.5 md:pr-3.5 gap-2 rounded-full font-semibold transition-all duration-200 w-10 h-10 md:w-auto md:h-10 shrink-0 bg-white dark:bg-zinc-900 border-none text-zinc-900 dark:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-800 shadow-[0_4px_14px_rgba(15,23,42,0.08)] active:scale-95 cursor-pointer"
      )
    : isPill
    ? cn(
        "flex items-center justify-center p-0 md:pl-1 md:pr-4 gap-2 rounded-full font-medium transition-all duration-300 w-9 h-9 md:w-auto md:h-9 shrink-0 bg-transparent border-none text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-none"
      )
    : cn(
        "flex items-center justify-center p-0 md:pl-2 md:pr-4 md:py-2 gap-2 rounded-full font-medium transition-all duration-300 w-10 h-10 md:w-auto md:h-auto shrink-0 bg-transparent border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={triggerClass}
          onClick={() => triggerHaptic()}
        >
          {user ? (
            <div className="relative w-fit shrink-0 p-[2px]">
              <Avatar className="w-8 h-8 md:w-7 md:h-7 rounded-full border-2 border-[#1877F2] shrink-0">
                <AvatarImage
                  src={userProfile?.photoURL || user.photoURL || undefined}
                  alt={displayName}
                  className="object-cover rounded-full"
                />
                <AvatarFallback className="text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-full">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-4 text-[10px] font-bold text-white bg-rose-500 rounded-full ring-2 ring-white dark:ring-zinc-900 px-1 z-10">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : (
                <span className="absolute bottom-0 right-0 inline-flex size-2.5 rounded-full ring-2 ring-white dark:ring-zinc-900 bg-emerald-500 z-10"></span>
              )}
            </div>
          ) : (
            <div
              className={cn(
                "rounded-full flex items-center justify-center shrink-0",
                isNewsHubStyle
                  ? "w-8 h-8 md:w-7 md:h-7 bg-transparent"
                  : isPill
                  ? "w-8 h-8 md:w-7 md:h-7 bg-white shadow-sm"
                  : "w-8 h-8 md:w-7 md:h-7 bg-zinc-100 dark:bg-zinc-800 shadow-sm"
              )}
            >
              <Icon
                name="user"
                className={cn(
                  "w-4 h-4 md:w-3.5 md:h-3.5",
                  isNewsHubStyle
                    ? "text-zinc-900 dark:text-zinc-100"
                    : isPill
                    ? "text-zinc-900"
                    : "text-zinc-900 dark:text-zinc-100"
                )}
              />
            </div>
          )}

          <span className="hidden md:inline-block max-w-[80px] lg:max-w-[120px] truncate text-sm">
            {user ? displayName : "Sign in"}
          </span>
          <span className="hidden md:inline-flex items-center">
            <Icon name="chevron-down" className="w-4 h-4 opacity-50 shrink-0" />
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={12}
        className="w-64 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg p-2 z-[9999] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-4"
      >
        {!user ? (
          <>
            <DropdownMenuLabel className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Welcome
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                triggerHaptic();
                navigate("/auth-selector");
              }}
              className="flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <span className="flex-1 font-medium">Sign In / Sign Up</span>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              My Account
            </DropdownMenuLabel>

            {isAdmin && (
              <DropdownMenuItem
                onClick={() => {
                  triggerHaptic();
                  navigate("/admin");
                }}
                className="flex items-center justify-between gap-2 rounded-xl py-2.5 px-2.5 mb-1 bg-indigo-50/90 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 cursor-pointer font-bold"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="text-xs font-extrabold">Admin Panel</span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                  ADMIN
                </span>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              onClick={() => {
                triggerHaptic();
                navigate("/profile");
              }}
              className="flex items-center gap-2 rounded-lg py-2 px-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <Icon
                name="user"
                className="w-4 h-4 text-zinc-500 dark:text-zinc-400"
              />
              <span className="flex-1">Profile & All Pages</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                triggerHaptic();
                navigate("/orders");
              }}
              className="flex items-center gap-2 rounded-lg py-2 px-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <Icon
                name="shopping-bag"
                className="w-4 h-4 text-zinc-500 dark:text-zinc-400"
              />
              <span className="flex-1">My Orders</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                triggerHaptic();
                navigate("/subscription");
              }}
              className="flex items-center justify-between gap-2 rounded-lg py-2 px-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer overflow-hidden"
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="font-bold text-zinc-900 dark:text-zinc-100 text-[11px] whitespace-nowrap truncate">
                  VIP Subscription
                </span>
              </div>
              <span
                className={`text-[9px] leading-none font-extrabold px-2 py-1 rounded-full border shadow-2xs whitespace-nowrap shrink-0 ${
                  subInfo.isSubscribed
                    ? "bg-amber-400/15 text-amber-600 dark:text-amber-400 border-amber-400/30"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                }`}
              >
                {subInfo.isSubscribed
                  ? `VIP (${subInfo.daysRemaining} দিন)`
                  : "Free"}
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                triggerHaptic();
                navigate("/notifications");
              }}
              className="flex items-center gap-2 rounded-lg py-2 px-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <div className="relative">
                <Icon
                  name="bell"
                  className="w-4 h-4 text-zinc-500 dark:text-zinc-400"
                />
              </div>
              <span className="flex-1">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1 border-zinc-100 dark:border-zinc-800" />

            <DropdownMenuItem
              onClick={() => {
                triggerHaptic();
                navigate("/accounts");
              }}
              className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <Icon
                name="user"
                className="w-4 h-4 text-zinc-500 dark:text-zinc-400"
              />
              <span className="flex-1 font-medium">Switch Account</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                triggerHaptic();
                handleLogout();
              }}
              className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 cursor-pointer"
            >
              <Icon name="logout" className="w-4 h-4" />
              <span className="flex-1 font-medium">Log out</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
