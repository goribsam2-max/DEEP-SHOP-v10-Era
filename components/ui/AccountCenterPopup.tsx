import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Plus, User, Check, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNotify } from '../Notifications';
import { GoogleIcon, AppleIcon, FacebookIcon } from './BrandIcons';
import { APPLE_SPRING_DEFAULT, APPLE_SPRING_SNAPPY } from '../../lib/shoppingRoute';

export interface SavedAccount {
  uid: string;
  email: string;
  password?: string;
  displayName: string;
  photoURL?: string;
  provider?: string;
  lastPasswordChange?: number | null;
}

interface AccountCenterPopupProps {
  isOpen: boolean;
  onClose: () => void;
  savedAccounts: SavedAccount[];
  currentUid?: string;
}

export function AccountCenterPopup({ isOpen, onClose, savedAccounts, currentUid }: AccountCenterPopupProps) {
  const navigate = useNavigate();
  const notify = useNotify();
  const prefersReducedMotion = useReducedMotion();
  const [loadingUid, setLoadingUid] = useState<string | null>(null);
  const [requirePasswordUid, setRequirePasswordUid] = useState<string | null>(null);
  const [manualPassword, setManualPassword] = useState('');

  const getSavedAccounts = (): SavedAccount[] => {
     try {
       const str = localStorage.getItem("vibe_saved_accounts");
       return str ? JSON.parse(str) : [];
     } catch(e) {
       return [];
     }
  };

  const handleSelectAccount = async (account: SavedAccount) => {
      // If already logged in to this account, just close
      if (currentUid === account.uid) {
          onClose();
          return;
      }

      // We need to login
      if (!account.password || requirePasswordUid === account.uid) {
          // Check if user has entered password
          if (requirePasswordUid === account.uid) {
               if (!manualPassword) {
                   notify("Please enter the password", "error");
                   return;
               }
               
               setLoadingUid(account.uid);
               try {
                  const cred = await signInWithEmailAndPassword(auth, account.email, manualPassword);
                  // Update password in local storage
                  const allAccounts = getSavedAccounts();
                  const updated = allAccounts.map(a => a.uid === account.uid ? { ...a, password: manualPassword } : a);
                  localStorage.setItem("vibe_saved_accounts", JSON.stringify(updated));
                  
                  notify("Logged in successfully", "success");
                  onClose();
                  setRequirePasswordUid(null);
                  setManualPassword('');
                  navigate('/');
               } catch (e: any) {
                  notify(e.message || "Invalid password", "error");
               } finally {
                  setLoadingUid(null);
               }
               return;
          }

          setRequirePasswordUid(account.uid);
          return;
      }

      setLoadingUid(account.uid);
      try {
          await signInWithEmailAndPassword(auth, account.email, account.password);
          notify("Logged in successfully", "success");
          onClose();
          navigate('/');
      } catch (e: any) {
          // If password changed or invalid credential
          if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential' || e.message?.toLowerCase().includes('password')) {
              setRequirePasswordUid(account.uid);
          } else {
              notify(e.message || "Failed to login", "error");
          }
      } finally {
          setLoadingUid(null);
      }
  };

  const handleAddAccount = () => {
      onClose();
      // Since they want to add account, sign out first just in case
      auth.signOut();
      navigate('/auth-selector');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="ds-apple-portal ds-apple-backdrop fixed inset-0 z-[99999] flex items-end justify-center sm:items-center p-0 sm:p-4"
        >
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: "100%" }}
            transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_DEFAULT}
            drag={prefersReducedMotion ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.02, bottom: 0.45 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 420) {
                onClose();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="ds-apple-sheet w-full max-w-none sm:max-w-md rounded-t-[28px] rounded-b-none sm:rounded-[28px] pb-[env(safe-area-inset-bottom,0px)] sm:pb-0 overflow-hidden flex flex-col touch-pan-y"
          >
            <div className="sm:hidden flex justify-center pt-2.5 pb-1">
              <div className="w-9 h-1 rounded-full bg-black/15 dark:bg-white/25" />
            </div>

            <div className="px-6 pt-3 sm:pt-6 pb-3 relative flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08]">
              <h2 className="ds-apple-display text-xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Choose Account
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/[0.05] dark:bg-white/[0.1] hover:bg-black/[0.09] dark:hover:bg-white/[0.16] flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-[#6E6E73] dark:text-[#98989D]" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[60vh]">
              {savedAccounts.length === 0 && (
                <div className="text-center py-8 text-sm text-[#6E6E73] dark:text-[#98989D]">
                  No saved accounts found.
                </div>
              )}
              <div className="space-y-2.5">
                {savedAccounts.map((account) => {
                  const isCurrent = account.uid === currentUid;
                  const requiresPass = requirePasswordUid === account.uid;
                  const isLoading = loadingUid === account.uid;

                  return (
                    <div
                      key={account.uid}
                      className={`border rounded-2xl p-3.5 transition-all ${
                        isCurrent
                          ? "border-[#0071E3] dark:border-[#0A84FF] bg-[#0071E3]/[0.06] dark:bg-[#0A84FF]/[0.12]"
                          : "border-black/[0.08] dark:border-white/[0.1] bg-white/60 dark:bg-white/[0.04]"
                      }`}
                    >
                      <div
                        onClick={() => !requiresPass && handleSelectAccount(account)}
                        className={`flex items-center justify-between ${
                          !requiresPass ? "cursor-pointer active:scale-[0.99] transition-transform" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-11 h-11 relative rounded-full overflow-hidden border border-black/[0.08] dark:border-white/[0.12] bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center shrink-0">
                            {account.photoURL ? (
                              <img
                                src={account.photoURL}
                                alt={account.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-[#6E6E73] dark:text-[#98989D]" />
                            )}
                            {account.provider === "google" && (
                              <div className="absolute inset-0 bg-white/55 backdrop-blur-[2px] flex items-center justify-center">
                                <GoogleIcon className="w-5 h-5" />
                              </div>
                            )}
                            {account.provider === "facebook" && (
                              <div className="absolute inset-0 bg-white/55 backdrop-blur-[2px] flex items-center justify-center">
                                <FacebookIcon className="w-5 h-5" />
                              </div>
                            )}
                            {account.provider === "apple" && (
                              <div className="absolute inset-0 bg-white/55 backdrop-blur-[2px] flex items-center justify-center">
                                <AppleIcon className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] text-[15px] truncate">
                              {account.displayName}
                            </p>
                            <p className="text-xs text-[#6E6E73] dark:text-[#98989D] truncate max-w-[180px]">
                              {account.email.endsWith("@phone.deepshop.top") ||
                              account.email.endsWith("@phone.vibegadget.com")
                                ? account.email.split("@")[0]
                                : account.email}
                            </p>
                          </div>
                        </div>

                        {isCurrent ? (
                          <div className="w-7 h-7 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] flex items-center justify-center shrink-0">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          !requiresPass && (
                            <div className="w-8 h-8 rounded-full bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center shrink-0">
                              {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin text-[#6E6E73]" />
                              ) : (
                                <ArrowRight className="w-4 h-4 text-[#6E6E73] dark:text-[#98989D]" />
                              )}
                            </div>
                          )
                        )}
                      </div>

                      <AnimatePresence>
                        {requiresPass && (
                          <motion.div
                            initial={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1, marginTop: 14 }}
                            exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0, marginTop: 0 }}
                            transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_SNAPPY}
                            className="overflow-hidden"
                          >
                            <div className="p-3 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-xl mb-3 text-xs text-[#D70015] dark:text-[#FF453A]">
                              Password might have been changed{" "}
                              {account.lastPasswordChange
                                ? new Date(account.lastPasswordChange).toLocaleDateString()
                                : "recently"}
                              . Please enter new password.
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="password"
                                autoFocus
                                placeholder="Enter password"
                                className="ds-apple-input flex-1 rounded-xl px-3.5 py-2.5 text-sm outline-none"
                                value={manualPassword}
                                onChange={(e) => setManualPassword(e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={() => handleSelectAccount(account)}
                                disabled={isLoading || !manualPassword}
                                className="ds-apple-btn-primary px-4 rounded-xl text-sm font-semibold flex items-center justify-center disabled:opacity-50 cursor-pointer"
                              >
                                {isLoading ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  "Sign In"
                                )}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleAddAccount}
                className="w-full flex items-center justify-center gap-2 p-3.5 mt-4 bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] active:scale-[0.98] transition-all rounded-2xl text-[#1D1D1F] dark:text-[#F5F5F7] text-sm font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Another Account</span>
              </button>

              {currentUid && (
                <button
                  type="button"
                  onClick={() => {
                    auth.signOut();
                    localStorage.removeItem("f_cart");
                    onClose();
                    navigate("/");
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3.5 mt-2 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/15 active:scale-[0.98] transition-all rounded-2xl text-[#D70015] dark:text-[#FF453A] text-sm font-semibold cursor-pointer"
                >
                  <span>Log out</span>
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
