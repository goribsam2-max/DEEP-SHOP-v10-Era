import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import { Loader2 } from "lucide-react";
import { auth, db } from "../firebase";
import { useNotify } from "../components/Notifications";
import { getFriendlyErrorMessage } from "../lib/firebaseErrorMapper";
import SEO from "../components/SEO";
import { GoogleIcon } from "../components/ui/BrandIcons";
import {
  DeepShopAuthShell,
  DeepShopBottomBrand,
  DeepShopCircleLogo,
  DeepShopFloatingInput,
} from "../components/DeepShopAuthShell";
import {
  formatAccountContact,
  getSavedAccounts,
  isLikelyPhoneNumber,
  linkPendingGuestOrderAndResolveDestination,
  normalizeBdPhoneVariants,
  resolveIdentifierToAuthEmail,
  upsertSavedAccount,
} from "../lib/savedAccounts";
import {
  getBanglaAuthErrorMessage,
  isAuthVoiceMuted,
  playAuthVoice,
  validateInappropriateContent,
  validateRealEmail,
} from "../lib/authVoiceAndValidation";
import { triggerHaptic } from "../lib/haptics";

const GOOGLE_CLIENT_ID =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
  "50155075863-uj02i6n96ipeqaurkf7au0jnpnse84pd.apps.googleusercontent.com";

const GoogleLoginPill: React.FC<{
  onAccessToken: (token: string) => void;
  disabled?: boolean;
}> = ({ onAccessToken, disabled }) => {
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => onAccessToken(tokenResponse.access_token),
    onError: () => {},
  });

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        triggerHaptic("selection");
        login();
      }}
      className="w-full h-[46px] px-5 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] active:scale-[0.98] text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold text-[14.5px] whitespace-nowrap flex items-center justify-center gap-2.5 transition cursor-pointer disabled:opacity-50"
    >
      <GoogleIcon className="w-4 h-4 shrink-0" />
      <span>Continue with Google</span>
    </button>
  );
};

const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotify();

  const searchParams = new URLSearchParams(location.search);
  const initialHint =
    (location.state as any)?.identifier ||
    searchParams.get("login_hint") ||
    "";

  const [identifier, setIdentifier] = useState(initialHint);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [platformConfig, setPlatformConfig] = useState<any>(null);

  const savedAccounts = getSavedAccounts();
  const redirectParam = searchParams.get("redirect") || "";
  const guestOrderId =
    searchParams.get("guestOrder") ||
    localStorage.getItem("pending_guest_order_id") ||
    "";
  const hasPendingOrder = Boolean(guestOrderId) || redirectParam === "/my-orders";
  const querySuffix = location.search || "";

  useEffect(() => {
    if (!isAuthVoiceMuted()) {
      playAuthVoice("আপনার ডিপ শপ অ্যাকাউন্টে স্বাগতম। ইমেইল অথবা ফোন নম্বর এবং পাসওয়ার্ড দিয়ে লগইন সম্পন্ন করুন।");
    }
    const unsub = onSnapshot(doc(db, "settings", "platform"), (snap) => {
      setPlatformConfig(snap.exists() ? snap.data() : {});
    });
    return () => unsub();
  }, []);

  const completeUserSession = async (
    firebaseUser: any,
    loginEmail: string,
    savedPwd: string,
    providerName = "password"
  ) => {
    let profileName = firebaseUser.displayName || "DEEP SHOP Member";
    let profilePhoto = firebaseUser.photoURL || "";
    let phoneNumber = "";

    try {
      const userRef = doc(db, "users", firebaseUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const d = snap.data();
        profileName = d.displayName || profileName;
        profilePhoto = d.photoURL || profilePhoto;
        phoneNumber = d.phoneNumber || "";
        await setDoc(userRef, { lastActive: Date.now() }, { merge: true });
      } else {
        await setDoc(
          userRef,
          {
            uid: firebaseUser.uid,
            email: loginEmail || firebaseUser.email || "",
            displayName: profileName,
            photoURL: profilePhoto,
            role: "user",
            isBanned: false,
            createdAt: Date.now(),
            registrationDate: Date.now(),
            lastActive: Date.now(),
          },
          { merge: true }
        );
      }
    } catch (e) {
      console.error("Profile sync error:", e);
    }

    upsertSavedAccount({
      uid: firebaseUser.uid,
      email: loginEmail || firebaseUser.email || "",
      contactDisplay: formatAccountContact(
        loginEmail || firebaseUser.email || "",
        phoneNumber
      ),
      password: savedPwd,
      rememberLogin: Boolean(savedPwd),
      displayName: profileName,
      photoURL: profilePhoto,
      provider: providerName,
      lastActive: Date.now(),
    });

    notify(`Welcome back, ${profileName}!`, "success");
    playAuthVoice("লগইন সফল হয়েছে। ডিপ শপে আপনাকে স্বাগতম।");
    const fromParam = searchParams.get("from") || "";
    const returnToState =
      (location.state as any)?.from || (location.state as any)?.returnTo || "";
    const defaultDest =
      redirectParam ||
      (fromParam === "loops" || String(returnToState).includes("/loops")
        ? "/loops"
        : "/");

    const dest = await linkPendingGuestOrderAndResolveDestination(
      firebaseUser.uid,
      firebaseUser.email || loginEmail,
      location.search,
      defaultDest
    );
    navigate(dest);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError("");

    const trimmedId = identifier.trim();
    if (!trimmedId) {
      setFieldError("Please enter your email or phone number.");
      playAuthVoice("আপনার ইমেইল বা ফোন নম্বর প্রদান করুন।");
      return;
    }

    const badContent = validateInappropriateContent(trimmedId, "email or phone number");
    if (!badContent.isValid) {
      setFieldError(badContent.errorMsg);
      notify(badContent.errorMsg, "error");
      playAuthVoice(badContent.voiceMsg || badContent.errorMsg);
      return;
    }

    if (trimmedId.includes("@")) {
      const emailCheck = validateRealEmail(trimmedId);
      if (!emailCheck.isValid) {
        setFieldError(emailCheck.errorMsg);
        notify(emailCheck.errorMsg, "error");
        playAuthVoice(emailCheck.voiceMsg || emailCheck.errorMsg);
        return;
      }
    } else if (!isLikelyPhoneNumber(trimmedId)) {
      const emailLikeCheck = validateRealEmail(`${trimmedId}@gmail.com`);
      if (!emailLikeCheck.isValid) {
        const msg =
          "Placeholder words like 'test' or 'user' are not allowed. Please enter a valid email or phone number.";
        setFieldError(msg);
        notify(msg, "error");
        playAuthVoice("ইমেইল বা ইউজার আইডিতে 'test', 'user' বা ডিফল্ট শব্দ ব্যবহার করা যাবে না। সঠিক ইমেইল বা ফোন নম্বর দিন।");
        return;
      }
    }

    if (!password) {
      notify("Please enter your password.", "error");
      playAuthVoice("অনুগ্রহ করে আপনার পাসওয়ার্ড লিখুন।");
      return;
    }

    const badPwd = validateInappropriateContent(password, "password");
    if (!badPwd.isValid) {
      notify(badPwd.errorMsg, "error");
      playAuthVoice(badPwd.voiceMsg || badPwd.errorMsg);
      return;
    }

    setLoading(true);
    try {
      const resolvedEmail = await resolveIdentifierToAuthEmail(trimmedId);

      try {
        const cred = await signInWithEmailAndPassword(
          auth,
          resolvedEmail,
          password
        );
        await completeUserSession(cred.user, resolvedEmail, password, "password");
        return;
      } catch (primaryErr: any) {
        // Fallback for legacy phone accounts if user typed a phone number
        if (isLikelyPhoneNumber(trimmedId)) {
          const variants = normalizeBdPhoneVariants(trimmedId);
          const fallbacks = [
            variants.phoneAuthEmail,
            variants.legacyPhoneAuthEmail,
          ].filter((em) => em !== resolvedEmail);

          for (const fbEmail of fallbacks) {
            try {
              const retryCred = await signInWithEmailAndPassword(
                auth,
                fbEmail,
                password
              );
              await completeUserSession(
                retryCred.user,
                fbEmail,
                password,
                "password"
              );
              return;
            } catch {
              // Continue
            }
          }
        }
        throw primaryErr;
      }
    } catch (err: any) {
      const friendly = getFriendlyErrorMessage(err);
      notify(friendly, "error");
      playAuthVoice(getBanglaAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAccessToken = async (accessToken: string) => {
    setLoading(true);
    try {
      const credential = GoogleAuthProvider.credential(null, accessToken);
      const res = await signInWithCredential(auth, credential);
      await completeUserSession(
        res.user,
        res.user.email || "",
        "",
        "google"
      );
    } catch (err: any) {
      notify(getFriendlyErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFallbackGooglePopup = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(
        auth,
        provider,
        browserPopupRedirectResolver
      );
      await completeUserSession(res.user, res.user.email || "", "", "google");
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        notify(getFriendlyErrorMessage(err), "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const finalGoogleClientId =
    platformConfig?.googleClientId || GOOGLE_CLIENT_ID;
  const googleEnabled = platformConfig?.googleLogin !== false;

  const handleBack = () => {
    if (savedAccounts.length > 0) {
      navigate(`/accounts${querySuffix}`);
    } else {
      navigate("/");
    }
  };

  return (
    <GoogleOAuthProvider clientId={finalGoogleClientId || "dummy_id"}>
      <SEO
        title="Log in to DEEP SHOP"
        description="Log in to your DEEP SHOP account using your mobile number or email address."
        canonical="/signin"
      />

      <DeepShopAuthShell
        onBack={handleBack}
        savedCountBadge={savedAccounts.length}
        desktopHeadline="Log in to DEEP SHOP."
        desktopSubtext="Enter your mobile number or email address and password to access your orders, messages, and creator hub."
        footer={
          <div className="space-y-3">
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
        <div className="flex flex-col items-center pt-5 pb-9">
          <DeepShopCircleLogo />
        </div>

        {hasPendingOrder && (
          <div className="mb-4 p-3.5 rounded-2xl bg-[#0071E3]/8 dark:bg-[#0A84FF]/14 border border-[#0071E3]/20 dark:border-[#0A84FF]/25 text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">
            <p className="font-bold">
              Log in or create a new account to view your order
            </p>
            <p className="mt-0.5 text-[11px] opacity-80">
              Your order will automatically link to your account as soon as you sign in.
            </p>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-3.5 w-full">
          <DeepShopFloatingInput
            label="Mobile number or email address"
            value={identifier}
            onFocus={() =>
              playAuthVoice("আপনার নিবন্ধিত মোবাইল নম্বর অথবা ইমেইল ঠিকানা লিখুন।")
            }
            onChange={(v) => {
              setIdentifier(v);
              if (fieldError) setFieldError("");
            }}
            errorText={fieldError}
            autoComplete="username"
          />

          <DeepShopFloatingInput
            label="Password"
            value={password}
            onFocus={() => playAuthVoice("আপনার পাসওয়ার্ড প্রদান করুন।")}
            onChange={setPassword}
            isPassword
            autoComplete="current-password"
          />

          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              onClick={() => triggerHaptic("medium")}
              className="w-full h-[48px] px-5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] dark:bg-[#0A84FF] active:scale-[0.98] disabled:opacity-60 text-white font-semibold text-[15px] whitespace-nowrap flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin shrink-0" />}
              <span>{loading ? "Logging in..." : "Log in"}</span>
            </button>
          </div>

          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                navigate(`/find-account${querySuffix}`);
              }}
              className="min-h-[44px] px-3 text-[14.5px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] hover:underline whitespace-nowrap cursor-pointer"
            >
              Forgotten password?
            </button>
          </div>

          {googleEnabled && (
            <div className="pt-2">
              {finalGoogleClientId &&
              finalGoogleClientId !== "YOUR_GOOGLE_CLIENT_ID_HERE" ? (
                <GoogleLoginPill
                  onAccessToken={handleGoogleAccessToken}
                  disabled={loading}
                />
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    triggerHaptic("selection");
                    handleFallbackGooglePopup();
                  }}
                  className="w-full h-[46px] px-5 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] active:scale-[0.98] text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold text-[14.5px] whitespace-nowrap flex items-center justify-center gap-2.5 transition cursor-pointer"
                >
                  <GoogleIcon className="w-4 h-4 shrink-0" />
                  <span>Continue with Google</span>
                </button>
              )}
            </div>
          )}
        </form>
      </DeepShopAuthShell>
    </GoogleOAuthProvider>
  );
};

export default SignIn;
