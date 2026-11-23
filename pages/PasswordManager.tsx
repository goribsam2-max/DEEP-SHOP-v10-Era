import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotify } from "../components/Notifications";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { auth } from "../firebase";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { triggerHaptic } from "../lib/haptics";
import { APPLE_SPRING_DEFAULT } from "../lib/shoppingRoute";

const PasswordManager: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();
  const shouldReduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      triggerHaptic("error");
      return notify("New passwords do not match", "error");
    }
    if (formData.newPassword.length < 6) {
      triggerHaptic("error");
      return notify("Password must be at least 6 characters", "error");
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error("No active session");

      const credential = EmailAuthProvider.credential(
        user.email,
        formData.oldPassword,
      );
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, formData.newPassword);

      try {
        const accountsStr = localStorage.getItem("vibe_saved_accounts");
        if (accountsStr) {
          let accounts = JSON.parse(accountsStr);
          accounts = accounts.map((a: any) => {
            if (a.uid === user.uid) {
              return { ...a, password: formData.newPassword, lastPasswordChange: Date.now() };
            }
            return a;
          });
          localStorage.setItem("vibe_saved_accounts", JSON.stringify(accounts));
        }
      } catch {}

      triggerHaptic("success");
      notify("Password updated successfully!", "success");
      navigate("/settings");
    } catch (err: any) {
      triggerHaptic("error");
      notify(err.message || "Failed to update password", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ds-apple-shop-canvas min-h-screen flex flex-col pb-20">
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0.16 } : APPLE_SPRING_DEFAULT}
        className="w-full max-w-md mx-auto px-4 pt-6 flex-1 space-y-5"
      >
        <div className="px-1">
          <h1 className="ds-apple-display text-[22px] sm:text-[26px] font-semibold tracking-[-0.022em] text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
            Password Manager
          </h1>
        </div>
        <form onSubmit={handleChange} className="ds-apple-surface rounded-[24px] p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
            <div className="w-10 h-10 rounded-2xl bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 ds-apple-accent-text flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[15.5px] font-semibold tracking-tight">Update Password</h2>
              <p className="text-xs ds-apple-muted">Enter your current password to choose a new one.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium ds-apple-muted">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                className="ds-apple-input w-full h-12 px-4 pr-11 rounded-2xl outline-none text-[15px]"
                required
                placeholder="Enter current password"
                value={formData.oldPassword}
                onChange={(e) =>
                  setFormData({ ...formData, oldPassword: e.target.value })
                }
              />
              <button
                type="button"
                onClick={() => { triggerHaptic(); setShowCurrent((v) => !v); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 ds-apple-muted cursor-pointer"
                aria-label="Toggle current password visibility"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium ds-apple-muted">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  className="ds-apple-input w-full h-12 px-4 pr-11 rounded-2xl outline-none text-[15px]"
                  required
                  placeholder="Minimum 6 characters"
                  value={formData.newPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, newPassword: e.target.value })
                  }
                />
                <button
                  type="button"
                  onClick={() => { triggerHaptic(); setShowNew((v) => !v); }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 ds-apple-muted cursor-pointer"
                  aria-label="Toggle new password visibility"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium ds-apple-muted">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  className="ds-apple-input w-full h-12 px-4 pr-11 rounded-2xl outline-none text-[15px]"
                  required
                  placeholder="Re-enter new password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                />
                <button
                  type="button"
                  onClick={() => { triggerHaptic(); setShowConfirm((v) => !v); }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 ds-apple-muted cursor-pointer"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            onClick={() => triggerHaptic()}
            className="ds-apple-btn-primary w-full h-12 px-5 rounded-full text-[15px] font-semibold whitespace-nowrap disabled:opacity-50 cursor-pointer mt-2"
          >
            {loading ? "Updating..." : "Update Password"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default PasswordManager;

