import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Check,
  ChevronRight,
  KeyRound,
  Loader2,
  LogOut,
  Trash2,
  X,
} from "lucide-react";
import { APPLE_SPRING_DEFAULT, projectMomentum } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";
import { auth, db } from "../firebase";
import { useNotify } from "../components/Notifications";
import SEO from "../components/SEO";
import {
  DeepShopAuthShell,
  DeepShopBottomBrand,
  DeepShopCircleLogo,
  DefaultUserAvatar,
} from "../components/DeepShopAuthShell";
import {
  SavedAccountProfile,
  clearSavedAccountPassword,
  getSavedAccounts,
  linkPendingGuestOrderAndResolveDestination,
  removeSavedAccount,
  syncCurrentUserToSavedAccounts,
  upsertSavedAccount,
} from "../lib/savedAccounts";
import { playAuthVoice } from "../lib/authVoiceAndValidation";

const SavedAccountsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotify();
  const prefersReducedMotion = useReducedMotion();

  const [accounts, setAccounts] = useState<SavedAccountProfile[]>(() =>
    getSavedAccounts()
  );
  const [currentUid, setCurrentUid] = useState<string | null>(
    auth.currentUser?.uid || null
  );
  const [loadingUid, setLoadingUid] = useState<string | null>(null);
  const [notifCounts, setNotifCounts] = useState<Record<string, number>>({});
  const [manageSheetOpen, setManageSheetOpen] = useState(false);

  const querySuffix = location.search || "";

  useEffect(() => {
    playAuthVoice("আপনার অ্যাকাউন্ট নির্বাচন করুন, অথবা অন্য কোনো অ্যাকাউন্টে লগইন করতে পারবেন।");
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUid(u?.uid || null);
      if (u) {
        syncCurrentUserToSavedAccounts(u);
      }
      setAccounts(getSavedAccounts());
    });
    return () => unsub();
  }, []);

  // Hydrate latest profile names, avatars, and unread notification counts from Firestore
  useEffect(() => {
    let active = true;
    const saved = getSavedAccounts();
    setAccounts(saved);

    const hydrateProfilesAndNotifications = async () => {
      const counts: Record<string, number> = {};

      for (const acc of saved) {
        try {
          const userSnap = await getDoc(doc(db, "users", acc.uid));
          if (userSnap.exists() && active) {
            const d = userSnap.data();
            if (
              (d.displayName && d.displayName !== acc.displayName) ||
              (d.photoURL && d.photoURL !== acc.photoURL)
            ) {
              const updated = upsertSavedAccount({
                uid: acc.uid,
                displayName: d.displayName || acc.displayName,
                photoURL: d.photoURL || acc.photoURL,
                email: d.email || acc.email,
                lastActive: acc.lastActive,
              });
              if (active) setAccounts(updated);
            }
          }
        } catch {
          // Ignore individual user doc read issue
        }

        try {
          const notifQ = query(
            collection(db, "notifications"),
            where("userId", "==", acc.uid),
            where("isRead", "==", false)
          );
          const notifSnap = await getDocs(notifQ);
          if (active) {
            const shopCount = notifSnap.docs.filter((docSnap) => {
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
            counts[acc.uid] = shopCount;
          }
        } catch {
          // Ignore notification count error
        }
      }

      if (active) {
        setNotifCounts((prev) => ({ ...prev, ...counts }));
      }
    };

    if (saved.length > 0) {
      hydrateProfilesAndNotifications();
    }

    return () => {
      active = false;
    };
  }, []);

  const handleSelectProfile = async (account: SavedAccountProfile) => {
    if (loadingUid) return;

    if (currentUid && currentUid === account.uid) {
      const dest = await linkPendingGuestOrderAndResolveDestination(
        account.uid,
        account.email,
        location.search,
        "/"
      );
      navigate(dest);
      return;
    }

    if (account.password && account.email) {
      setLoadingUid(account.uid);
      try {
        const cred = await signInWithEmailAndPassword(
          auth,
          account.email,
          account.password
        );
        upsertSavedAccount({
          uid: cred.user.uid,
          email: account.email,
          password: account.password,
          displayName: cred.user.displayName || account.displayName,
          photoURL: cred.user.photoURL || account.photoURL,
          rememberLogin: true,
          lastActive: Date.now(),
        });
        await setDoc(
          doc(db, "users", cred.user.uid),
          { lastActive: Date.now() },
          { merge: true }
        );
        notify(`Welcome back, ${account.displayName}!`, "success");
        const dest = await linkPendingGuestOrderAndResolveDestination(
          cred.user.uid,
          cred.user.email,
          location.search,
          "/"
        );
        navigate(dest);
        return;
      } catch {
        // Saved password expired or changed -> send to Review Selection / Password prompt
        clearSavedAccountPassword(account.uid);
        setAccounts(getSavedAccounts());
        const sep = querySuffix ? `${querySuffix}&` : "?";
        navigate(`/review-account${sep}uid=${encodeURIComponent(account.uid)}`, {
          state: { selectedAccount: account },
        });
      } finally {
        setLoadingUid(null);
      }
      return;
    }

    // No saved password (or Google login) -> go to dedicated Review Selection page
    const sep = querySuffix ? `${querySuffix}&` : "?";
    navigate(`/review-account${sep}uid=${encodeURIComponent(account.uid)}`, {
      state: { selectedAccount: account },
    });
  };

  const handleRemoveProfile = (uid: string) => {
    const updated = removeSavedAccount(uid);
    setAccounts(updated);
    notify("Profile removed from this device", "info");
    if (updated.length === 0) {
      setManageSheetOpen(false);
      navigate(`/signin${querySuffix}`, { replace: true });
    }
  };

  const handleClearSavedPassword = (uid: string) => {
    const updated = clearSavedAccountPassword(uid);
    setAccounts(updated);
    notify("Saved login password cleared for this profile", "info");
  };

  const handleLogoutCurrent = async () => {
    if (auth.currentUser) {
      syncCurrentUserToSavedAccounts(auth.currentUser);
    }
    await signOut(auth);
    localStorage.removeItem("f_cart");
    setCurrentUid(null);
    setAccounts(getSavedAccounts());
    setManageSheetOpen(false);
    notify("Logged out", "success");
  };

  return (
    <>
      <SEO
        title="Saved Accounts — DEEP SHOP"
        description="Choose a saved DEEP SHOP account on this device or log in with another profile."
        canonical="/accounts"
      />

      <DeepShopAuthShell
        onBack={() => navigate(currentUid ? "/profile" : "/")}
        onMoreClick={() => {
          triggerHaptic("selection");
          setManageSheetOpen(true);
        }}
        savedCountBadge={accounts.length}
        desktopHeadline="Recent logins on DEEP SHOP."
        desktopSubtext="Click your saved profile card to sign right back in, add another profile, or create a new DEEP SHOP account."
        footer={
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                navigate(`/signin${querySuffix}`);
              }}
              className="w-full h-[48px] px-5 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] active:scale-[0.98] text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold text-[15px] whitespace-nowrap transition cursor-pointer"
            >
              Use another profile
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                navigate(`/signup${querySuffix}`);
              }}
              className="w-full h-[48px] px-5 rounded-full border border-[#0071E3] dark:border-[#0A84FF] hover:bg-[#0071E3]/6 active:scale-[0.98] text-[#0071E3] dark:text-[#0A84FF] font-semibold text-[15px] whitespace-nowrap transition cursor-pointer"
            >
              Create new account
            </button>

            <DeepShopBottomBrand />
          </div>
        }
      >
        <div className="flex flex-col items-center pt-3 pb-7">
          <DeepShopCircleLogo />
          {accounts.length > 0 && (
            <p className="mt-3 text-[13px] font-medium tabular-nums text-[#6E6E73] dark:text-[#98989D]">
              {accounts.length}{" "}
              {accounts.length === 1
                ? "account on this device"
                : "accounts on this device"}
            </p>
          )}
        </div>

        {accounts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-4">
            <p className="text-[16px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              No saved profiles on this device yet
            </p>
            <p className="mt-1.5 text-[14px] text-[#6E6E73] dark:text-[#98989D] max-w-xs">
              Log in to your DEEP SHOP account and enable &ldquo;Remember login
              info&rdquo; for instant 1-tap access next time.
            </p>
          </div>
        ) : (
          <div className="space-y-3 w-full">
            {accounts.map((account) => {
              const unread = notifCounts[account.uid] || 0;
              const isCurrent = currentUid === account.uid;
              const isBusy = loadingUid === account.uid;

              return (
                <button
                  key={account.uid}
                  type="button"
                  disabled={Boolean(loadingUid)}
                  onClick={() => {
                    triggerHaptic("medium");
                    handleSelectProfile(account);
                  }}
                  className="w-full rounded-[20px] border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#1C1C1E] hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E] active:scale-[0.98] px-4 py-3.5 flex items-center justify-between gap-3 text-left transition cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <DefaultUserAvatar
                      photoURL={account.photoURL}
                      displayName={account.displayName}
                      sizeClass="w-[54px] h-[54px]"
                    />

                    <div className="min-w-0">
                      <p className="text-[16px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                        {account.displayName}
                      </p>

                      {isCurrent ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-[#248A3D] dark:bg-[#30D158] shrink-0" />
                          <span className="text-[13px] font-medium text-[#248A3D] dark:text-[#30D158]">
                            Active session
                          </span>
                        </div>
                      ) : unread > 0 ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-[#FF3B30] shrink-0" />
                          <span className="text-[14px] font-normal tabular-nums text-[#6E6E73] dark:text-[#98989D]">
                            {unread > 9
                              ? "9+ notifications"
                              : `${unread} ${
                                  unread === 1
                                    ? "notification"
                                    : "notifications"
                                }`}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="shrink-0 pl-2 text-[#6E6E73] dark:text-[#98989D]">
                    {isBusy ? (
                      <Loader2 className="w-5 h-5 animate-spin text-[#0071E3] dark:text-[#0A84FF]" />
                    ) : isCurrent ? (
                      <div className="w-7 h-7 rounded-full bg-[#0071E3]/10 dark:bg-[#0A84FF]/16 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center">
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      </div>
                    ) : (
                      <ChevronRight className="w-5 h-5 stroke-[2]" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </DeepShopAuthShell>

      {/* Manage Profiles Bottom Sheet (Triggered by top-right ••• button) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {manageSheetOpen && (
              <div className="ds-apple-portal fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0.12 : 0.2 }}
                  onClick={() => {
                    triggerHaptic("selection");
                    setManageSheetOpen(false);
                  }}
                  className="ds-apple-backdrop fixed inset-0"
                />
                <motion.div
                  initial={prefersReducedMotion ? { opacity: 0 } : { y: "100%", opacity: 0.6 }}
                  animate={prefersReducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { y: "100%", opacity: 0 }}
                  transition={prefersReducedMotion ? { duration: 0.16 } : APPLE_SPRING_DEFAULT}
                  drag={prefersReducedMotion ? false : "y"}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0.02, bottom: 0.45 }}
                  onDragEnd={(_, info) => {
                    const projected = info.offset.y + projectMomentum(info.velocity.y);
                    if (projected > 100 || info.velocity.y > 400) {
                      triggerHaptic("light");
                      setManageSheetOpen(false);
                    }
                  }}
                  className="ds-apple-sheet relative z-10 w-full max-w-none sm:max-w-[440px] rounded-t-[28px] rounded-b-none sm:rounded-[28px] pb-[calc(1.75rem+env(safe-area-inset-bottom,0px))] sm:pb-7 pt-2.5 max-h-[82dvh] flex flex-col"
                >
                  <div className="w-10 h-1 rounded-full bg-black/[0.15] dark:bg-white/[0.2] mx-auto mb-2 shrink-0" />
                  <div className="relative flex items-center justify-center h-12 px-4 border-b border-black/[0.06] dark:border-white/[0.08] shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("selection");
                        setManageSheetOpen(false);
                      }}
                      aria-label="Close"
                      className="ds-apple-icon-btn absolute left-3 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <h3 className="text-[16px] font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                      Profiles on this device ({accounts.length})
                    </h3>
                  </div>

                  <div className="p-5 overflow-y-auto space-y-3">
                    {accounts.length === 0 ? (
                      <p className="text-sm text-center text-[#6E6E73] dark:text-[#98989D] py-4">
                        No saved profiles found.
                      </p>
                    ) : (
                      accounts.map((acc) => (
                        <div
                          key={acc.uid}
                          className="rounded-2xl border border-black/[0.07] dark:border-white/[0.08] p-3.5 flex items-center justify-between gap-3 bg-[#F5F5F7] dark:bg-[#2C2C2E]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <DefaultUserAvatar
                              photoURL={acc.photoURL}
                              displayName={acc.displayName}
                              sizeClass="w-11 h-11"
                            />
                            <div className="min-w-0">
                              <p className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                                {acc.displayName}
                              </p>
                              <p className="text-xs text-[#6E6E73] dark:text-[#98989D] truncate">
                                {acc.contactDisplay || acc.email}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {acc.password && (
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic("warning");
                                  handleClearSavedPassword(acc.uid);
                                }}
                                title="Require password next time"
                                className="min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center text-[#FF9F0A] hover:bg-[#FF9F0A]/12 transition cursor-pointer"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic("warning");
                                handleRemoveProfile(acc.uid);
                              }}
                              title="Remove profile from device"
                              className="min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center text-[#FF3B30] hover:bg-[#FF3B30]/12 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}

                    {currentUid && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("warning");
                          handleLogoutCurrent();
                        }}
                        className="w-full mt-2 h-[46px] px-5 rounded-full bg-[#FF3B30]/10 hover:bg-[#FF3B30]/16 text-[#FF3B30] font-semibold text-[14.5px] whitespace-nowrap flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>Log out of active account</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};

export default SavedAccountsPage;
