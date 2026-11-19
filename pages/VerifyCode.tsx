import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotify } from "../components/Notifications";
import { Loader2 } from "lucide-react";
import { updateProfile, EmailAuthProvider, linkWithCredential } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getFriendlyErrorMessage } from "../lib/firebaseErrorMapper";
import { triggerHaptic } from "../lib/haptics";

const VerifyCode: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const signupPhone = sessionStorage.getItem('signup_phone');
    if (signupPhone) setPhone(signupPhone);
    
    if (!window.confirmationResult) {
      notify("OTP session expired or invalid. Please sign up again.", "error");
      navigate("/signup");
    }
  }, [navigate, notify]);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (code.length !== 6) return notify("Please enter a 6-digit code.", "error");
    if (!window.confirmationResult) return navigate("/signup");

    setLoading(true);
    try {
      const result = await window.confirmationResult.confirm(code);
      const user = result.user;
      
      const name = sessionStorage.getItem('signup_name') || "";
      
      // Update display name if it's new
      if (!user.displayName && name) {
        await updateProfile(user, { displayName: name });
      }

      // Try to link email credential if password was set
      const signupPassword = sessionStorage.getItem('signup_password');
      if (signupPassword && user.phoneNumber) {
        try {
           const fakeEmail = `${user.phoneNumber.replace('+', '')}@phone.deepshop.top`;
           const cred = EmailAuthProvider.credential(fakeEmail, signupPassword);
           await linkWithCredential(user, cred);
           
           // Keep saved accounts list updated
           try {
             const accountsStr = localStorage.getItem("vibe_saved_accounts");
             let accounts = accountsStr ? JSON.parse(accountsStr) : [];
             accounts = accounts.filter((a: any) => a.uid !== user.uid);
             accounts.push({
                 uid: user.uid,
                 email: fakeEmail,
                 password: signupPassword,
                 displayName: name || user.displayName,
                 photoURL: user.photoURL || "",
                 lastPasswordChange: null,
             });
             localStorage.setItem("vibe_saved_accounts", JSON.stringify(accounts));
           } catch (e) {}
        } catch (linkError) {
           console.log("Could not link email password:", linkError);
        }
      }

      // Create or update Firestore profile
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        const userData = {
          uid: user.uid,
          email: user.email || "",
          phoneNumber: user.phoneNumber || phone,
          displayName: name,
          role: "user",
          isBanned: false,
          createdAt: Date.now(),
          registrationDate: Date.now(),
          lastActive: Date.now(),
        };
        await setDoc(doc(db, "users", user.uid), userData);
        notify("Account created successfully!", "success");
      } else {
        notify("Logged in successfully!", "success");
      }
      
      // Clear session data
      sessionStorage.removeItem('signup_name');
      sessionStorage.removeItem('signup_phone');
      sessionStorage.removeItem('signup_password');
      delete window.confirmationResult;

      navigate("/");
    } catch (err: any) {
      notify(getFriendlyErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ds-apple-shop-canvas min-h-[100dvh] flex flex-col">
      <div className="flex-1 flex items-center justify-center px-5 py-8">
        <div className="ds-apple-surface w-full max-w-md rounded-[28px] p-6 sm:p-8 text-center">
          <h1 className="ds-apple-display text-[26px] font-bold tracking-[-0.025em] mb-2 text-[#1D1D1F] dark:text-[#F5F5F7]">
            Verify Code
          </h1>
          <p className="ds-apple-muted text-[14.5px] mb-8">
            Please enter the 6-digit code we sent to{" "}
            <span className="text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold block mt-1 text-[16px] tabular-nums">
              {phone || "your phone"}
            </span>
          </p>

          <form onSubmit={handleVerify} className="space-y-6">
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="ds-apple-input w-full text-center text-[32px] tracking-[0.65em] font-bold tabular-nums rounded-2xl h-20 outline-none"
              autoFocus
            />

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              onClick={() => triggerHaptic("medium")}
              className="ds-apple-btn-primary w-full min-h-[50px] px-5 text-[16px] rounded-full font-semibold flex items-center justify-center gap-2 whitespace-nowrap active:scale-[0.98] transition-transform disabled:opacity-50 cursor-pointer"
            >
              {loading && <Loader2 className="h-5 w-5 shrink-0 animate-spin" />}
              <span>{loading ? "Verifying..." : "Verify & Continue"}</span>
            </button>
          </form>

          <p className="text-[14px] mt-8 ds-apple-muted">
            Didn&apos;t receive OTP?{" "}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                navigate("/signup");
              }}
              className="font-semibold text-[#0071E3] dark:text-[#0A84FF] hover:underline cursor-pointer"
            >
              Go back and try again
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyCode;
