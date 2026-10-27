import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  KeyRound,
  Loader2,
  LogOut,
  Trash2,
  X,
} from "lucide-react";
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

const SavedAccountsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotify();

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
            counts[acc.uid] = notifSnap.size;
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
        onMoreClick={() => setManageSheetOpen(true)}
        savedCountBadge={accounts.length}
        desktopHeadline="Recent logins on DEEP SHOP."
        desktopSubtext="Click your saved profile card to sign right back in, add another profile, or create a new DEEP SHOP account."
        footer={
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => navigate(`/signin${querySuffix}`)}
              className="w-full h-[48px] rounded-full bg-[#f0f2f5] hover:bg-[#e4e6eb] dark:bg-zinc-800 dark:hover:bg-zinc-700 active:scale-[0.99] text-[#0a1317] dark:text-zinc-100 font-semibold text-[16px] transition cursor-pointer"
            >
              Use another profile
            </button>

            <button
              type="button"
              onClick={() => navigate(`/signup${querySuffix}`)}
              className="w-full h-[48px] rounded-full border border-[#0064e0] dark:border-[#4599ff] hover:bg-[#0064e0]/5 active:scale-[0.99] text-[#0064e0] dark:text-[#4599ff] font-semibold text-[16px] transition cursor-pointer"
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
            <p className="mt-3 text-[13px] font-medium text-[#5e6c77] dark:text-zinc-400">
              {accounts.length}{" "}
              {accounts.length === 1
                ? "account on this device"
                : "accounts on this device"}
            </p>
          )}
        </div>

        {accounts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-4">
            <p className="text-[16px] font-semibold text-[#0a1317] dark:text-zinc-100">
              No saved profiles on this device yet
            </p>
            <p className="mt-1.5 text-[14px] text-[#5e6c77] dark:text-zinc-400 max-w-xs">
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
                  onClick={() => handleSelectProfile(account)}
                  className="w-full rounded-[20px] border border-[#dce1e7] dark:border-zinc-800 bg-white dark:bg-[#121820] hover:bg-[#f7f8fa] dark:hover:bg-zinc-800/70 active:scale-[0.99] px-4 py-3.5 flex items-center justify-between gap-3 text-left transition cursor-pointer shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <DefaultUserAvatar
                      photoURL={account.photoURL}
                      displayName={account.displayName}
                      sizeClass="w-[54px] h-[54px]"
                    />

                    <div className="min-w-0">
                      <p className="text-[16px] font-semibold text-[#0a1317] dark:text-zinc-100 truncate">
                        {account.displayName}
                      </p>

                      {isCurrent ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-[13px] font-medium text-emerald-600 dark:text-emerald-400">
                            Active session
                          </span>
                        </div>
                      ) : unread > 0 ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-[#d91b42] shrink-0" />
                          <span className="text-[14px] font-normal text-[#5e6c77] dark:text-zinc-400">
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

                  <div className="shrink-0 pl-2 text-[#5e6c77] dark:text-zinc-400">
                    {isBusy ? (
                      <Loader2 className="w-5 h-5 animate-spin text-[#0064e0]" />
                    ) : isCurrent ? (
                      <div className="w-7 h-7 rounded-full bg-[#0064e0]/10 text-[#0064e0] dark:text-[#4599ff] flex items-center justify-center">
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
      <AnimatePresence>
        {manageSheetOpen && (
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setManageSheetOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ y: "100%", opacity: 0.6 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="relative z-10 w-full sm:max-w-[440px] bg-white dark:bg-[#182028] rounded-t-[28px] sm:rounded-[28px] pb-7 pt-2.5 shadow-2xl border-t sm:border border-zinc-200 dark:border-zinc-800 max-h-[82vh] flex flex-col"
            >
              <div className="w-10 h-1 rounded-full bg-[#cbd2d9] dark:bg-zinc-600 mx-auto mb-2 shrink-0" />
              <div className="relative flex items-center justify-center h-12 px-4 border-b border-[#e5e8ec] dark:border-zinc-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setManageSheetOpen(false)}
                  aria-label="Close"
                  className="absolute left-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#1c2b33] dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-[17px] font-bold text-[#0a1317] dark:text-white">
                  Profiles on this device ({accounts.length})
                </h3>
              </div>

              <div className="p-5 overflow-y-auto space-y-3">
                {accounts.length === 0 ? (
                  <p className="text-sm text-center text-[#5e6c77] dark:text-zinc-400 py-4">
                    No saved profiles found.
                  </p>
                ) : (
                  accounts.map((acc) => (
                    <div
                      key={acc.uid}
                      className="rounded-2xl border border-[#e1e5eb] dark:border-zinc-800 p-3.5 flex items-center justify-between gap-3 bg-[#f9fafb] dark:bg-zinc-900/60"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <DefaultUserAvatar
                          photoURL={acc.photoURL}
                          displayName={acc.displayName}
                          sizeClass="w-11 h-11"
                        />
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-[#0a1317] dark:text-zinc-100 truncate">
                            {acc.displayName}
                          </p>
                          <p className="text-xs text-[#5e6c77] dark:text-zinc-400 truncate">
                            {acc.contactDisplay || acc.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {acc.password && (
                          <button
                            type="button"
                            onClick={() => handleClearSavedPassword(acc.uid)}
                            title="Require password next time"
                            className="min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition cursor-pointer"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveProfile(acc.uid)}
                          title="Remove profile from device"
                          className="min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
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
                    onClick={handleLogoutCurrent}
                    className="w-full mt-2 h-[46px] rounded-full bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 font-semibold text-[15px] flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log out of active account</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SavedAccountsPage;
