import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { auth, db } from "../firebase";
import { useNotify } from "../components/Notifications";
import { getFriendlyErrorMessage } from "../lib/firebaseErrorMapper";
import SEO from "../components/SEO";
import {
  DeepShopAuthShell,
  DeepShopFloatingInput,
  DefaultUserAvatar,
  useFooterLogo,
} from "../components/DeepShopAuthShell";
import {
  MatchedAccountProfile,
  formatAccountContact,
  getSavedAccounts,
  linkPendingGuestOrderAndResolveDestination,
  searchMatchingAccounts,
  upsertSavedAccount,
} from "../lib/savedAccounts";
import {
  playAuthVoice,
  validateInappropriateContent,
  validateRealEmail,
} from "../lib/authVoiceAndValidation";

const FOUND_ACCOUNTS_KEY = "deepshop_found_accounts_v1";
const SELECTED_ACCOUNT_KEY = "deepshop_selected_account_v1";

// ============================================================================
// 1. FIND YOUR ACCOUNT PAGE (/find-account & /forgot-password) — IMG_5031 / 5032
// ============================================================================
export const FindAccountPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialMode =
    searchParams.get("mode") === "email" ? "email" : "mobile";

  const [mode, setMode] = useState<"mobile" | "email">(initialMode);
  const [queryValue, setQueryValue] = useState("");
  const [searching, setSearching] = useState(false);
  const [errorText, setErrorText] = useState("");

  const querySuffix = location.search || "";

  useEffect(() => {
    playAuthVoice("আপনার একাউন্ট খুঁজে পেতে ইমেইল বা ফোন নম্বরটি লিখুন।");
  }, []);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");

    const trimmed = queryValue.trim();
    if (!trimmed) {
      const msg =
        mode === "mobile"
          ? "অনুগ্রহ করে আপনার ফোন নম্বর লিখুন।"
          : "অনুগ্রহ করে আপনার ইমেইল ঠিকানা লিখুন।";
      setErrorText(msg);
      playAuthVoice(msg);
      return;
    }

    const badCheck = validateInappropriateContent(trimmed, "অনুসন্ধান তথ্যে");
    if (badCheck) {
      setErrorText(badCheck);
      playAuthVoice(badCheck);
      return;
    }

    if (mode === "email" || trimmed.includes("@")) {
      const emailRes = validateRealEmail(trimmed);
      if (!emailRes.isValid) {
        setErrorText(emailRes.errorMsg);
        playAuthVoice(emailRes.errorMsg);
        return;
      }
    }

    setSearching(true);
    try {
      const matches = await searchMatchingAccounts(trimmed);
      if (matches.length === 0) {
        const notFound =
          "কোনো অ্যাকাউন্ট খুঁজে পাওয়া যায়নি। আপনার দেওয়া তথ্য যাচাই করুন।";
        setErrorText(notFound);
        playAuthVoice(notFound);
        return;
      }

      try {
        sessionStorage.setItem(FOUND_ACCOUNTS_KEY, JSON.stringify(matches));
      } catch {
        // Ignore storage error
      }

      playAuthVoice(`${matches.length} টি মানানসই অ্যাকাউন্ট পাওয়া গেছে।`);
      navigate(`/choose-account${querySuffix}`, {
        state: { matches, searchedQuery: trimmed },
      });
    } catch {
      const err = "অনুসন্ধান করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।";
      setErrorText(err);
      playAuthVoice(err);
    } finally {
      setSearching(false);
    }
  };

  const toggleSearchMode = () => {
    setErrorText("");
    setQueryValue("");
    const newMode = mode === "mobile" ? "email" : "mobile";
    setMode(newMode);
    playAuthVoice(
      newMode === "mobile"
        ? "ফোন নম্বর দিয়ে খুঁজুন"
        : "ইমেইল ঠিকানা দিয়ে খুঁজুন"
    );
  };

  return (
    <>
      <SEO
        title="Find your account — DEEP SHOP"
        description="Search for your DEEP SHOP account using your mobile number or email address."
        canonical="/find-account"
      />
      <DeepShopAuthShell
        onBack={() => {
          const saved = getSavedAccounts();
          navigate(saved.length > 0 ? `/accounts${querySuffix}` : `/signin${querySuffix}`);
        }}
        desktopHeadline="Find your DEEP SHOP account."
        desktopSubtext="Search by your registered mobile number or email address to select your profile and get back in."
      >
        <form onSubmit={handleContinue} className="space-y-4 pt-1">
          <div className="space-y-2">
            <h1 className="text-[26px] font-bold tracking-tight leading-[1.2] text-[#0a1317] dark:text-white">
              Find your account
            </h1>
            <p className="text-[15px] leading-[1.45] text-[#1c2b33] dark:text-zinc-300">
              {mode === "mobile"
                ? "Enter your mobile number."
                : "Enter your email address."}
            </p>
          </div>

          <div
            className="pt-1"
            onFocus={() =>
              playAuthVoice(
                mode === "mobile"
                  ? "আপনার ফোন নম্বরটি লিখুন"
                  : "আপনার ইমেইল ঠিকানাটি লিখুন"
              )
            }
          >
            <DeepShopFloatingInput
              label={mode === "mobile" ? "Mobile number" : "Email address"}
              type={mode === "mobile" ? "tel" : "email"}
              value={queryValue}
              onChange={(v) => {
                setQueryValue(v);
                if (errorText) setErrorText("");
              }}
              errorText={errorText}
              autoComplete={mode === "mobile" ? "tel" : "email"}
            />
          </div>

          <div className="pt-1 space-y-2.5">
            <button
              type="submit"
              disabled={searching}
              className="w-full h-[48px] rounded-full bg-[#0064e0] hover:bg-[#0056c1] active:scale-[0.99] disabled:opacity-60 text-white font-semibold text-[16px] flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {searching && <Loader2 className="w-5 h-5 animate-spin" />}
              <span>{searching ? "Searching..." : "Continue"}</span>
            </button>

            <button
              type="button"
              onClick={toggleSearchMode}
              className="w-full h-[48px] rounded-full bg-[#f0f2f5] hover:bg-[#e4e6eb] dark:bg-zinc-800 dark:hover:bg-zinc-700 active:scale-[0.99] text-[#0a1317] dark:text-zinc-100 font-semibold text-[16px] transition cursor-pointer"
            >
              {mode === "mobile"
                ? "Search by email address"
                : "Search by mobile number"}
            </button>
          </div>
        </form>
      </DeepShopAuthShell>
    </>
  );
};

// ============================================================================
// 2. CHOOSE YOUR ACCOUNT PAGE (/choose-account) — IMG_5033
// ============================================================================
export const ChooseAccountPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const logoUrl = useFooterLogo();
  const [logoSrc, setLogoSrc] = useState(logoUrl);

  useEffect(() => {
    setLogoSrc(logoUrl);
  }, [logoUrl]);

  const [matches] = useState<MatchedAccountProfile[]>(() => {
    const fromState = (location.state as any)?.matches;
    if (Array.isArray(fromState) && fromState.length > 0) return fromState;
    try {
      const raw = sessionStorage.getItem(FOUND_ACCOUNTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore
    }
    return [];
  });

  const querySuffix = location.search || "";

  useEffect(() => {
    if (matches.length === 0) {
      navigate(`/find-account${querySuffix}`, { replace: true });
    }
  }, [matches.length, navigate, querySuffix]);

  const handleSelectProfile = (acc: MatchedAccountProfile) => {
    try {
      sessionStorage.setItem(SELECTED_ACCOUNT_KEY, JSON.stringify(acc));
    } catch {
      // Ignore
    }
    const sep = querySuffix ? `${querySuffix}&` : "?";
    navigate(`/review-account${sep}uid=${encodeURIComponent(acc.uid)}`, {
      state: { selectedAccount: acc, fromChooseAccount: true },
    });
  };

  if (matches.length === 0) return null;

  const primaryAccount = matches[0];

  return (
    <>
      <SEO
        title="Choose your account — DEEP SHOP"
        description="Select your matching DEEP SHOP profile to continue."
        canonical="/choose-account"
      />
      <DeepShopAuthShell
        onBack={() => navigate(`/find-account${querySuffix}`)}
        desktopHeadline="Select your DEEP SHOP profile."
        desktopSubtext="Choose the account you want to sign in to from the matching profiles below."
      >
        <div className="space-y-4 pt-1">
          <h1 className="text-[26px] font-bold tracking-tight leading-[1.2] text-[#0a1317] dark:text-white">
            Choose your account
          </h1>

          {/* Top Highlight DEEP SHOP Account Banner (Matches IMG_5033 top card) */}
          <button
            type="button"
            onClick={() => handleSelectProfile(primaryAccount)}
            className="w-full rounded-[20px] bg-[#f0f2f5] hover:bg-[#e6e9ef] dark:bg-zinc-800/80 dark:hover:bg-zinc-800 p-4 flex items-center justify-between gap-3 text-left transition cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-lg overflow-hidden bg-white dark:bg-zinc-900 border border-[#dce1e7] dark:border-zinc-700 flex items-center justify-center shrink-0">
                <img
                  src={logoSrc || "/favicon.png"}
                  alt="DEEP SHOP"
                  onError={() => setLogoSrc("/favicon.png")}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[16px] font-semibold text-[#0a1317] dark:text-white leading-snug">
                  DEEP SHOP Account
                </p>
                <p className="text-[15px] text-[#5e6c77] dark:text-zinc-400 truncate">
                  {primaryAccount.displayName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <DefaultUserAvatar
                  photoURL={primaryAccount.photoURL}
                  displayName={primaryAccount.displayName}
                  sizeClass="w-12 h-12"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full overflow-hidden bg-white dark:bg-zinc-900 p-0.5 ring-2 ring-[#f0f2f5] dark:ring-zinc-800">
                  <img
                    src={logoSrc || "/favicon.png"}
                    alt="DEEP SHOP"
                    onError={() => setLogoSrc("/favicon.png")}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#5e6c77] dark:text-zinc-400" />
            </div>
          </button>

          <p className="text-[14px] leading-[1.45] text-[#5e6c77] dark:text-zinc-400 pt-1">
            These DEEP SHOP profiles match the email address or mobile number
            that you entered.
          </p>

          {/* Matching Profiles List */}
          <div className="space-y-3 pt-1">
            {matches.map((acc) => (
              <button
                key={acc.uid}
                type="button"
                onClick={() => handleSelectProfile(acc)}
                className="w-full rounded-[20px] border border-[#dce1e7] dark:border-zinc-800 bg-white dark:bg-[#121820] hover:bg-[#f7f8fa] dark:hover:bg-zinc-800/70 active:scale-[0.99] px-4 py-3.5 flex items-center justify-between gap-3 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <DefaultUserAvatar
                    photoURL={acc.photoURL}
                    displayName={acc.displayName}
                    sizeClass="w-[54px] h-[54px]"
                  />
                  <div className="min-w-0">
                    <p className="text-[16px] font-semibold text-[#0a1317] dark:text-zinc-100 truncate">
                      {acc.displayName}
                    </p>
                    <p className="text-[14px] text-[#5e6c77] dark:text-zinc-400">
                      DEEP SHOP
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#5e6c77] dark:text-zinc-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </DeepShopAuthShell>
    </>
  );
};

// ============================================================================
// 3. REVIEW YOUR SELECTION PAGE (/review-account) — IMG_5034 (NO PHONE OTP)
// ============================================================================
export const ReviewAccountPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useNotify();

  const searchParams = new URLSearchParams(location.search);
  const uidParam = searchParams.get("uid") || "";

  const [account, setAccount] = useState<MatchedAccountProfile | null>(() => {
    const stateAcc = (location.state as any)?.selectedAccount;
    if (stateAcc && stateAcc.uid) return stateAcc;
    if (uidParam) {
      const savedMatch = getSavedAccounts().find((a) => a.uid === uidParam);
      if (savedMatch) return savedMatch;
    }
    try {
      const raw = sessionStorage.getItem(SELECTED_ACCOUNT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!uidParam || parsed.uid === uidParam) return parsed;
      }
    } catch {
      // Ignore
    }
    return null;
  });

  const [loadingProfile, setLoadingProfile] = useState(!account && Boolean(uidParam));
  const [stepMode, setStepMode] = useState<"review" | "password" | "reset-sent">(
    "review"
  );
  const [password, setPassword] = useState("");
  const [rememberLogin, setRememberLogin] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  useEffect(() => {
    let active = true;
    const targetUid = account?.uid || uidParam;
    if (!targetUid) {
      setLoadingProfile(false);
      return;
    }

    const fetchFresh = async () => {
      try {
        const snap = await getDoc(doc(db, "users", targetUid));
        if (snap.exists() && active) {
          const d = snap.data();
          setAccount((prev) => ({
            uid: targetUid,
            email: d.email || prev?.email || "",
            displayName: d.displayName || prev?.displayName || "DEEP SHOP Member",
            photoURL: d.photoURL || prev?.photoURL || "",
            phoneNumber: d.phoneNumber || prev?.phoneNumber || "",
            provider: d.provider || prev?.provider || "password",
          }));
        }
      } catch {
        // Ignore
      } finally {
        if (active) setLoadingProfile(false);
      }
    };

    fetchFresh();
    return () => {
      active = false;
    };
  }, [uidParam]);

  const cleanRedirectSearch = () => {
    const sp = new URLSearchParams(location.search);
    sp.delete("uid");
    const str = sp.toString();
    return str ? `?${str}` : "";
  };

  const handlePrimaryLoginClick = async () => {
    if (!account) return;

    // Check if saved account on this device already has valid password
    const savedMatch = getSavedAccounts().find((a) => a.uid === account.uid);
    if (savedMatch?.password && savedMatch.email) {
      setSubmitting(true);
      try {
        const cred = await signInWithEmailAndPassword(
          auth,
          savedMatch.email,
          savedMatch.password
        );
        upsertSavedAccount({
          uid: cred.user.uid,
          email: savedMatch.email,
          password: savedMatch.password,
          rememberLogin: true,
          displayName: account.displayName,
          photoURL: account.photoURL,
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
        // Password changed -> ask for password
      } finally {
        setSubmitting(false);
      }
    }

    setStepMode("password");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !account.email) {
      notify("Unable to resolve login email for this profile.", "error");
      return;
    }
    if (!password) {
      notify("Please enter your password.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        account.email,
        password
      );
      upsertSavedAccount({
        uid: cred.user.uid,
        email: account.email,
        contactDisplay: formatAccountContact(
          account.email,
          account.phoneNumber
        ),
        password: rememberLogin ? password : "",
        rememberLogin,
        displayName: account.displayName,
        photoURL: account.photoURL,
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
    } catch (err: any) {
      notify(getFriendlyErrorMessage(err), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const isPhoneSyntheticEmail = Boolean(
    account?.email &&
      (account.email.endsWith("@phone.deepshop.top") ||
        account.email.endsWith("@phone.vibegadget.com"))
  );

  const handlePasswordReset = async () => {
    if (!account) return;
    setSubmitting(true);
    try {
      if (!isPhoneSyntheticEmail && account.email.includes("@")) {
        await sendPasswordResetEmail(auth, account.email, {
          url: window.location.origin + "/signin",
          handleCodeInApp: true,
        });
        setResetMessage(
          `We sent a password reset link to ${account.email}. Check your inbox and spam folder to set a new password.`
        );
        setStepMode("reset-sent");
      } else {
        // Phone-registered account: submit support password reset ticket (NO SMS OTP!)
        const identifier = account.phoneNumber || account.email;
        const res = await fetch("/api/reset-password-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.success) {
          setResetMessage(
            "Your password reset request has been submitted to DEEP SHOP Support. Contact our Helpline or WhatsApp support for quick manual verification."
          );
          setStepMode("reset-sent");
        } else {
          setResetMessage(
            "For mobile-registered accounts, please contact DEEP SHOP Helpline / Support to reset your password."
          );
          setStepMode("reset-sent");
        }
      }
    } catch (err: any) {
      notify(getFriendlyErrorMessage(err), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNotYou = () => {
    const fromChoose = (location.state as any)?.fromChooseAccount;
    const suffix = cleanRedirectSearch();
    if (fromChoose) {
      navigate(`/choose-account${suffix}`);
    } else if (getSavedAccounts().length > 0) {
      navigate(`/accounts${suffix}`);
    } else {
      navigate(`/find-account${suffix}`);
    }
  };

  if (loadingProfile) {
    return (
      <DeepShopAuthShell onBack={handleNotYou}>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-[#0064e0]" />
        </div>
      </DeepShopAuthShell>
    );
  }

  if (!account) {
    return (
      <DeepShopAuthShell
        onBack={() => navigate(`/find-account${cleanRedirectSearch()}`)}
      >
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
          <p className="text-[16px] font-semibold text-[#0a1317] dark:text-white">
            Select an account first
          </p>
          <button
            type="button"
            onClick={() => navigate(`/find-account${cleanRedirectSearch()}`)}
            className="w-full h-[48px] rounded-full bg-[#0064e0] text-white font-semibold text-[16px] cursor-pointer"
          >
            Find my account
          </button>
        </div>
      </DeepShopAuthShell>
    );
  }

  return (
    <>
      <SEO
        title="Review your selection — DEEP SHOP"
        description={`Continue logging in as ${account.displayName} on DEEP SHOP.`}
        canonical="/review-account"
      />
      <DeepShopAuthShell
        onBack={() => {
          if (stepMode !== "review") {
            setStepMode("review");
          } else {
            handleNotYou();
          }
        }}
        desktopHeadline={`Continue as ${account.displayName}.`}
        desktopSubtext="Confirm your profile selection to sign right back into DEEP SHOP."
      >
        {stepMode === "review" && (
          <div className="pt-2 flex flex-col items-center text-center">
            <h1 className="text-[26px] font-bold tracking-tight leading-[1.2] text-[#0a1317] dark:text-white">
              Review your selection
            </h1>
            <p className="mt-2 text-[16px] text-[#1c2b33] dark:text-zinc-300">
              We&apos;ll help you log in as {account.displayName}
            </p>

            {/* Centered Large Profile Avatar matching IMG_5034 */}
            <div className="my-8 p-1 rounded-full border border-[#dce1e7] dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xs">
              <DefaultUserAvatar
                photoURL={account.photoURL}
                displayName={account.displayName}
                sizeClass="w-[108px] h-[108px]"
              />
            </div>

            <div className="w-full space-y-2.5">
              <button
                type="button"
                disabled={submitting}
                onClick={handlePrimaryLoginClick}
                className="w-full h-[48px] rounded-full bg-[#f0f2f5] hover:bg-[#e4e6eb] dark:bg-zinc-800 dark:hover:bg-zinc-700 active:scale-[0.99] text-[#0a1317] dark:text-zinc-100 font-semibold text-[16px] flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                <span className="truncate px-3">
                  Log in as {account.displayName}
                </span>
              </button>

              <button
                type="button"
                onClick={handleNotYou}
                className="w-full h-[48px] rounded-full bg-[#f0f2f5] hover:bg-[#e4e6eb] dark:bg-zinc-800 dark:hover:bg-zinc-700 active:scale-[0.99] text-[#0a1317] dark:text-zinc-100 font-semibold text-[16px] transition cursor-pointer"
              >
                Not you?
              </button>
            </div>
          </div>
        )}

        {stepMode === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-2">
            <div className="flex flex-col items-center text-center pb-2">
              <DefaultUserAvatar
                photoURL={account.photoURL}
                displayName={account.displayName}
                sizeClass="w-20 h-20"
              />
              <h2 className="mt-3 text-[20px] font-bold text-[#0a1317] dark:text-white">
                {account.displayName}
              </h2>
              <p className="text-[13px] text-[#5e6c77] dark:text-zinc-400">
                DEEP SHOP Account
              </p>
            </div>

            <DeepShopFloatingInput
              label="Password"
              value={password}
              onChange={setPassword}
              isPassword
              autoComplete="current-password"
            />

            <div className="flex items-center gap-3 py-0.5">
              <button
                type="button"
                role="checkbox"
                aria-checked={rememberLogin}
                onClick={() => setRememberLogin((r) => !r)}
                className={`w-[22px] h-[22px] rounded-[6px] flex items-center justify-center shrink-0 transition cursor-pointer ${
                  rememberLogin
                    ? "bg-[#0064e0] text-white"
                    : "border-2 border-[#65737e] dark:border-zinc-500 bg-transparent"
                }`}
              >
                {rememberLogin && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
              <span className="text-[15px] text-[#0a1317] dark:text-zinc-200">
                Remember login info on this device
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-[48px] rounded-full bg-[#0064e0] hover:bg-[#0056c1] active:scale-[0.99] disabled:opacity-60 text-white font-semibold text-[16px] flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
              <span>{submitting ? "Logging in..." : "Log in"}</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={handlePasswordReset}
              className="w-full h-[46px] rounded-full bg-[#f0f2f5] hover:bg-[#e4e6eb] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#0a1317] dark:text-zinc-100 font-semibold text-[15px] transition cursor-pointer"
            >
              {!isPhoneSyntheticEmail && account.email.includes("@")
                ? "Send password reset link via email"
                : "Forgot password? Request support reset"}
            </button>
          </form>
        )}

        {stepMode === "reset-sent" && (
          <div className="pt-4 text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#0064e0]/10 text-[#0064e0] dark:text-[#4599ff] flex items-center justify-center">
              <Check className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h2 className="text-[22px] font-bold text-[#0a1317] dark:text-white">
              Password reset requested
            </h2>
            <p className="text-[15px] leading-relaxed text-[#46545e] dark:text-zinc-300">
              {resetMessage}
            </p>
            <button
              type="button"
              onClick={() => navigate(`/signin${cleanRedirectSearch()}`)}
              className="w-full h-[48px] rounded-full bg-[#0064e0] hover:bg-[#0056c1] text-white font-semibold text-[16px] cursor-pointer"
            >
              Back to Log in
            </button>
          </div>
        )}
      </DeepShopAuthShell>
    </>
  );
};
