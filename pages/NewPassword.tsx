import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { auth } from "../firebase";
import { useNotify } from "../components/Notifications";
import { getFriendlyErrorMessage } from "../lib/firebaseErrorMapper";
import SEO from "../components/SEO";
import {
  DeepShopAuthShell,
  DeepShopBottomBrand,
  DeepShopFloatingInput,
} from "../components/DeepShopAuthShell";

const NewPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotify();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [oobCode, setOobCode] = useState("");

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const code = queryParams.get("oobCode");
    const mode = queryParams.get("mode");

    if (mode === "resetPassword" && code) {
      setOobCode(code);
      verifyPasswordResetCode(auth, code)
        .then((resolvedEmail) => {
          setEmail(resolvedEmail);
        })
        .catch(() => {
          notify(
            "Invalid or expired reset link. Please request a new password reset.",
            "error"
          );
          navigate("/find-account");
        });
    } else {
      notify("Invalid reset link.", "error");
      navigate("/signin");
    }
  }, [location, notify, navigate]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return notify("Please enter a new password", "error");
    if (password.length < 6)
      return notify("Password must be at least 6 characters", "error");
    if (password !== confirm)
      return notify("Passwords do not match", "error");

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      notify("Password updated! You can now log in.", "success");
      navigate(`/signin?login_hint=${encodeURIComponent(email)}`);
    } catch (error: any) {
      notify(getFriendlyErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <DeepShopAuthShell onBack={() => navigate("/signin")}>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-[#0064e0]" />
        </div>
      </DeepShopAuthShell>
    );
  }

  return (
    <>
      <SEO
        title="Create a new password — DEEP SHOP"
        description="Set a new password for your DEEP SHOP account."
      />
      <DeepShopAuthShell
        onBack={() => navigate("/signin")}
        desktopHeadline="Choose a new password."
        desktopSubtext="Enter a strong new password for your DEEP SHOP account."
        footer={<DeepShopBottomBrand />}
      >
        <form onSubmit={handleReset} className="space-y-4 pt-1">
          <div className="space-y-2">
            <h1 className="text-[26px] font-bold tracking-tight leading-[1.2] text-[#0a1317] dark:text-white">
              Create a new password
            </h1>
            <p className="text-[15px] leading-[1.45] text-[#1c2b33] dark:text-zinc-300">
              Create a new password with at least six letters or numbers for{" "}
              <span className="font-semibold">{email}</span>.
            </p>
          </div>

          <DeepShopFloatingInput
            label="New password"
            value={password}
            onChange={setPassword}
            isPassword
            autoComplete="new-password"
          />

          <DeepShopFloatingInput
            label="Confirm new password"
            value={confirm}
            onChange={setConfirm}
            isPassword
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[48px] rounded-full bg-[#0064e0] hover:bg-[#0056c1] active:scale-[0.99] disabled:opacity-60 text-white font-semibold text-[16px] flex items-center justify-center gap-2 transition cursor-pointer"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            <span>{loading ? "Saving..." : "Continue"}</span>
          </button>
        </form>
      </DeepShopAuthShell>
    </>
  );
};

export default NewPassword;
