import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Store, Home, X } from "lucide-react";
import { auth, db } from "../firebase";
import { useNotify } from "../components/Notifications";
import { getFriendlyErrorMessage } from "../lib/firebaseErrorMapper";
import SEO from "../components/SEO";
import {
  BirthdaysInfoSheet,
  DeepShopAuthShell,
  DeepShopEcosystemHero,
  DeepShopFloatingInput,
  StopCreatingAccountModal,
} from "../components/DeepShopAuthShell";
import {
  formatAccountContact,
  getSavedAccounts,
  linkPendingGuestOrderAndResolveDestination,
  normalizeBdPhoneVariants,
  upsertSavedAccount,
} from "../lib/savedAccounts";
import AuthVoiceToggle from "../components/AuthVoiceToggle";
import {
  playAuthVoice,
  validateRealEmail,
  validateInappropriateContent,
  checkPasswordRules,
} from "../lib/authVoiceAndValidation";

const DRAFT_STORAGE_KEY = "deepshop_signup_wizard_draft_v1";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

interface SignUpDraft {
  firstName: string;
  surname: string;
  birthDay: number;
  birthMonth: number; // 0-indexed
  birthYear: number;
  gender: "female" | "male" | "more" | "";
  moreGenderChoice: string;
  contactMode: "mobile" | "email";
  mobileNumber: string;
  email: string;
  rememberLogin: boolean;
  // Seller optional fields
  shopName: string;
  storeType: "physical" | "online";
  shopAddress: string;
  altPhone: string;
}

const getDefaultDraft = (): SignUpDraft => {
  const defaultYear = new Date().getFullYear() - 22;
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (raw) {
      return { ...JSON.parse(raw) };
    }
  } catch {
    // Ignore storage read error
  }
  return {
    firstName: "",
    surname: "",
    birthDay: 26,
    birthMonth: 9, // October
    birthYear: defaultYear,
    gender: "",
    moreGenderChoice: "Prefer not to say",
    contactMode: "mobile",
    mobileNumber: "",
    email: "",
    rememberLogin: true,
    shopName: "",
    storeType: "online",
    shopAddress: "",
    altPhone: "",
  };
};

function calculateAge(day: number, month: number, year: number): number {
  const today = new Date();
  let age = today.getFullYear() - year;
  const m = today.getMonth() - month;
  if (m < 0 || (m === 0 && today.getDate() < day)) {
    age--;
  }
  return Math.max(0, age);
}

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

const SignUp: React.FC = () => {
  const { step } = useParams<{ step?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const notify = useNotify();

  const searchParams = new URLSearchParams(location.search);
  const roleParam = searchParams.get("role") || "customer";
  const querySuffix = location.search || "";

  const [draft, setDraft] = useState<SignUpDraft>(getDefaultDraft);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState("");

  // Popups / Bottom Sheets
  const [showBirthdayInfo, setShowBirthdayInfo] = useState(false);
  const [showDatePickerSheet, setShowDatePickerSheet] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [showRememberInfoSheet, setShowRememberInfoSheet] = useState(false);

  const savedAccounts = getSavedAccounts();

  useEffect(() => {
    setFieldError("");
  }, [step]);

  const updateDraft = (patch: Partial<SignUpDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      try {
        sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage write error
      }
      return next;
    });
  };

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  const currentStep = step || (roleParam === "seller" ? "seller" : "welcome");

  const age = useMemo(
    () => calculateAge(draft.birthDay, draft.birthMonth, draft.birthYear),
    [draft.birthDay, draft.birthMonth, draft.birthYear]
  );

  const formattedBirthDate = `${draft.birthDay} ${
    MONTH_NAMES[draft.birthMonth] || "January"
  } ${draft.birthYear}`;

  const yearsList = useMemo(() => {
    const currentYr = new Date().getFullYear();
    const arr: number[] = [];
    for (let y = currentYr - 13; y >= 1930; y--) {
      arr.push(y);
    }
    return arr;
  }, []);

  const daysInSelectedMonth = useMemo(
    () => getDaysInMonth(draft.birthMonth, draft.birthYear),
    [draft.birthMonth, draft.birthYear]
  );

  const goToFindAccount = () => {
    navigate(`/find-account${querySuffix}`);
  };

  const handleConfirmStop = () => {
    setShowStopModal(false);
    clearDraft();
    if (savedAccounts.length > 0) {
      navigate(`/accounts${querySuffix}`);
    } else {
      navigate(`/signin${querySuffix}`);
    }
  };

  const handleBackNavigation = () => {
    switch (currentStep) {
      case "welcome":
        if (savedAccounts.length > 0) {
          navigate(`/accounts${querySuffix}`);
        } else {
          navigate(`/signin${querySuffix}`);
        }
        break;
      case "name":
      case "seller":
        setShowStopModal(true);
        break;
      case "birthday":
        navigate(`/signup/name${querySuffix}`);
        break;
      case "gender":
        navigate(`/signup/birthday${querySuffix}`);
        break;
      case "mobile":
      case "email":
        navigate(`/signup/gender${querySuffix}`);
        break;
      case "password":
        if (roleParam === "seller") {
          navigate(`/signup/seller${querySuffix}`);
        } else {
          navigate(
            `/signup/${
              draft.contactMode === "email" ? "email" : "mobile"
            }${querySuffix}`
          );
        }
        break;
      default:
        navigate(`/signup${querySuffix}`);
    }
  };

  const handleNextFromName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.firstName.trim()) {
      const err = "Please enter your first name.";
      setFieldError(err);
      playAuthVoice("আপনার প্রথম নাম লিখুন।");
      return;
    }
    const fnCheck = validateInappropriateContent(draft.firstName, "ফার্স্ট নেমে");
    if (!fnCheck.isValid) {
      setFieldError(fnCheck.errorMsg);
      playAuthVoice(fnCheck.errorMsg);
      return;
    }
    if (!draft.surname.trim()) {
      const err = "Please enter your surname.";
      setFieldError(err);
      playAuthVoice("আপনার সারনেম বা পদবী লিখুন।");
      return;
    }
    const snCheck = validateInappropriateContent(draft.surname, "সারনেমে");
    if (!snCheck.isValid) {
      setFieldError(snCheck.errorMsg);
      playAuthVoice(snCheck.errorMsg);
      return;
    }
    playAuthVoice("আপনার জন্ম তারিখ নির্বাচন করুন।");
    navigate(`/signup/birthday${querySuffix}`);
  };

  const handleNextFromBirthday = (e: React.FormEvent) => {
    e.preventDefault();
    if (age < 13) {
      const err = "অ্যাকাউন্ট তৈরি করতে বয়স কমপক্ষে ১৩ বছর হতে হবে।";
      setFieldError("You must be at least 13 years old to create an account.");
      playAuthVoice(err);
      return;
    }
    playAuthVoice("আপনার লিঙ্গ নির্বাচন করুন।");
    navigate(`/signup/gender${querySuffix}`);
  };

  const handleNextFromGender = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.gender) {
      const err = "অনুগ্রহ করে আপনার লিঙ্গ নির্বাচন করুন।";
      setFieldError("Please select your gender to continue.");
      playAuthVoice(err);
      return;
    }
    playAuthVoice(
      draft.contactMode === "email"
        ? "আপনার ইমেইল ঠিকানা প্রদান করুন।"
        : "আপনার মোবাইল নম্বর প্রদান করুন।"
    );
    navigate(
      `/signup/${
        draft.contactMode === "email" ? "email" : "mobile"
      }${querySuffix}`
    );
  };

  const handleNextFromMobile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = draft.mobileNumber.trim().replace(/[\s\-().]/g, "");
    if (!/^\+?[0-9]{8,15}$/.test(cleaned)) {
      const err = "সঠিক মোবাইল নম্বর প্রদান করুন।";
      setFieldError("Please enter a valid mobile number.");
      playAuthVoice(err);
      return;
    }
    updateDraft({ contactMode: "mobile" });
    playAuthVoice("একটি সুরক্ষিত পাসওয়ার্ড তৈরি করুন।");
    navigate(`/signup/password${querySuffix}`);
  };

  const handleNextFromEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.email.trim();
    const emailCheck = validateRealEmail(trimmed);
    if (!emailCheck.isValid) {
      setFieldError(emailCheck.errorMsg);
      playAuthVoice(emailCheck.errorMsg);
      return;
    }
    const profCheck = validateInappropriateContent(trimmed, "ইমেইলে");
    if (!profCheck.isValid) {
      setFieldError(profCheck.errorMsg);
      playAuthVoice(profCheck.errorMsg);
      return;
    }
    updateDraft({ contactMode: "email" });
    playAuthVoice("একটি সুরক্ষিত পাসওয়ার্ড তৈরি করুন।");
    navigate(`/signup/password${querySuffix}`);
  };

  const handleNextFromSeller = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.shopName.trim()) {
      setFieldError("Please enter your shop name.");
      return;
    }
    if (!draft.firstName.trim()) {
      setFieldError("Please enter owner full name.");
      return;
    }
    if (!draft.mobileNumber.trim()) {
      setFieldError("Please enter seller mobile number.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
      setFieldError("Please enter a valid seller email address.");
      return;
    }
    updateDraft({ contactMode: "email" });
    navigate(`/signup/password${querySuffix}`);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    const pwdState = checkPasswordRules(password);
    if (!pwdState.isAllValid) {
      const err =
        "পাসওয়ার্ডের সবকটি শর্ত পূরণ করুন: কমপক্ষে ৮+ অক্ষর, সংখ্যা (0-9), ছোট অক্ষর (a-z), বড় অক্ষর (A-Z) এবং স্পেশাল চিহ্ন (!@#$)।";
      setFieldError(err);
      playAuthVoice("পাসওয়ার্ডের সকল শর্তসমূহ পূরণ করুন।");
      return;
    }

    const pwdCheck = validateInappropriateContent(password, "পাসওয়ার্ডে");
    if (!pwdCheck.isValid) {
      setFieldError(pwdCheck.errorMsg);
      playAuthVoice(pwdCheck.errorMsg);
      return;
    }

    const fullName = `${draft.firstName.trim()} ${draft.surname.trim()}`.trim();
    if (!fullName) {
      navigate(`/signup/name${querySuffix}`);
      return;
    }

    let authEmail = "";
    let savedPhone = "";

    if (draft.contactMode === "mobile" && roleParam !== "seller") {
      const variants = normalizeBdPhoneVariants(draft.mobileNumber);
      authEmail = variants.phoneAuthEmail;
      savedPhone = variants.e164Bd;
    } else {
      authEmail = draft.email.trim().toLowerCase();
      savedPhone = draft.mobileNumber.trim()
        ? normalizeBdPhoneVariants(draft.mobileNumber).e164Bd
        : "";
    }

    if (!authEmail) {
      navigate(`/signup/mobile${querySuffix}`);
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        authEmail,
        password
      );
      const user = cred.user;
      await updateProfile(user, { displayName: fullName });

      const resolvedRole =
        roleParam === "seller"
          ? "seller"
          : roleParam === "reseller"
          ? "reseller"
          : "user";

      const isoBirthDate = `${draft.birthYear}-${String(
        draft.birthMonth + 1
      ).padStart(2, "0")}-${String(draft.birthDay).padStart(2, "0")}`;

      const resolvedGender =
        draft.gender === "more"
          ? draft.moreGenderChoice || "Prefer not to say"
          : draft.gender || "";

      const userDocPayload: Record<string, any> = {
        uid: user.uid,
        email: authEmail,
        displayName: fullName,
        firstName: draft.firstName.trim(),
        lastName: draft.surname.trim(),
        dateOfBirth: isoBirthDate,
        gender: resolvedGender,
        role: resolvedRole,
        isBanned: false,
        createdAt: Date.now(),
        registrationDate: Date.now(),
        lastActive: Date.now(),
      };

      if (savedPhone) {
        userDocPayload.phoneNumber = savedPhone;
      }

      if (roleParam === "seller") {
        userDocPayload.shopName = draft.shopName.trim();
        userDocPayload.nidOwnerName = fullName;
        userDocPayload.shopNumber =
          draft.storeType === "online"
            ? "Online Presence"
            : draft.shopAddress.trim() || "Physical Store";
        userDocPayload.alternativePhone = draft.altPhone.trim();
      }

      await setDoc(doc(db, "users", user.uid), userDocPayload, { merge: true });

      upsertSavedAccount({
        uid: user.uid,
        email: authEmail,
        contactDisplay: formatAccountContact(authEmail, savedPhone),
        password: draft.rememberLogin ? password : "",
        rememberLogin: draft.rememberLogin,
        displayName: fullName,
        photoURL: "",
        provider: "password",
        lastActive: Date.now(),
      });

      clearDraft();
      notify("Welcome to DEEP SHOP! Account created.", "success");

      const defaultDest =
        roleParam === "seller" ? "/seller/dashboard" : "/";
      const dest = await linkPendingGuestOrderAndResolveDestination(
        user.uid,
        authEmail,
        location.search,
        defaultDest
      );
      navigate(dest);
    } catch (err: any) {
      notify(getFriendlyErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  };

  const bottomFindAccountLink = (
    <div className="flex justify-center pt-2">
      <button
        type="button"
        onClick={goToFindAccount}
        className="min-h-[44px] px-4 text-[15px] font-semibold text-[#0064e0] dark:text-[#4599ff] hover:underline cursor-pointer"
      >
        Find my account
      </button>
    </div>
  );

  // STEP 0: Welcome / Get Started (IMG_5021)
  if (currentStep === "welcome") {
    return (
      <>
        <SEO
          title="Get started on DEEP SHOP"
          description="Create a DEEP SHOP account to shop devices, track orders, and connect with verified sellers."
          canonical="/signup"
        />
        <DeepShopAuthShell
          onBack={handleBackNavigation}
          savedCountBadge={savedAccounts.length}
          desktopHeadline="Get started on DEEP SHOP."
          desktopSubtext="One DEEP SHOP account gives you seamless access to marketplace orders, verified community updates, direct messaging, and shopping rewards."
          footer={
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => navigate(`/signup/name${querySuffix}`)}
                className="w-full h-[48px] rounded-full bg-[#0064e0] hover:bg-[#0056c1] active:scale-[0.99] text-white font-semibold text-[16px] transition cursor-pointer"
              >
                Get Started
              </button>
              <button
                type="button"
                onClick={goToFindAccount}
                className="w-full h-[48px] rounded-full bg-[#f0f2f5] hover:bg-[#e4e6eb] dark:bg-zinc-800 dark:hover:bg-zinc-700 active:scale-[0.99] text-[#0a1317] dark:text-zinc-100 font-semibold text-[16px] transition cursor-pointer"
              >
                Find my account
              </button>
              <div className="flex items-center justify-center gap-4 pt-1 text-xs text-[#5e6c77] dark:text-zinc-400">
                <button
                  type="button"
                  onClick={() => navigate("/signup/seller?role=seller")}
                  className="hover:text-[#0064e0] dark:hover:text-[#4599ff] font-medium cursor-pointer"
                >
                  Become a Seller Partner
                </button>
              </div>
            </div>
          }
        >
          <div className="flex-1 flex flex-col justify-center">
            <DeepShopEcosystemHero />
            <div className="mt-4 space-y-3">
              <h1 className="text-[26px] sm:text-[28px] font-bold tracking-tight leading-[1.2] text-[#0a1317] dark:text-white">
                Get started on DEEP SHOP with a DEEP SHOP account
              </h1>
              <p className="text-[15px] leading-[1.45] text-[#1c2b33] dark:text-zinc-300">
                A DEEP SHOP Account lets you access DEEP SHOP products, orders,
                community alerts, and messages easily and securely.
              </p>
            </div>
          </div>
        </DeepShopAuthShell>
      </>
    );
  }

  // OPTIONAL SELLER DETAILS STEP (/signup/seller?role=seller)
  if (currentStep === "seller") {
    return (
      <>
        <SEO
          title="Seller Registration — DEEP SHOP"
          description="Register your merchant store on DEEP SHOP."
          canonical="/signup/seller"
        />
        <DeepShopAuthShell
          onBack={handleBackNavigation}
          desktopHeadline="Become a DEEP SHOP Seller."
          desktopSubtext="Open your verified merchant storefront and reach buyers across Bangladesh."
          footer={bottomFindAccountLink}
        >
          <form onSubmit={handleNextFromSeller} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <h1 className="text-[25px] font-bold tracking-tight text-[#0a1317] dark:text-white">
                Set up your seller profile
              </h1>
              <p className="text-[15px] text-[#46545e] dark:text-zinc-300">
                Enter your store and contact details to register as a merchant.
              </p>
            </div>

            <DeepShopFloatingInput
              label="Shop name"
              value={draft.shopName}
              onChange={(v) => updateDraft({ shopName: v })}
            />

            <DeepShopFloatingInput
              label="Owner full name (as per NID)"
              value={draft.firstName}
              onChange={(v) => updateDraft({ firstName: v })}
            />

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => updateDraft({ storeType: "online" })}
                className={`h-11 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  draft.storeType === "online"
                    ? "border-[#0064e0] bg-[#0064e0]/10 text-[#0064e0] dark:text-[#4599ff]"
                    : "border-[#cbd2d9] dark:border-zinc-700 text-[#46545e] dark:text-zinc-300"
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Online Store</span>
              </button>
              <button
                type="button"
                onClick={() => updateDraft({ storeType: "physical" })}
                className={`h-11 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  draft.storeType === "physical"
                    ? "border-[#0064e0] bg-[#0064e0]/10 text-[#0064e0] dark:text-[#4599ff]"
                    : "border-[#cbd2d9] dark:border-zinc-700 text-[#46545e] dark:text-zinc-300"
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Physical Outlet</span>
              </button>
            </div>

            {draft.storeType === "physical" && (
              <DeepShopFloatingInput
                label="Shop number & market address"
                value={draft.shopAddress}
                onChange={(v) => updateDraft({ shopAddress: v })}
              />
            )}

            <DeepShopFloatingInput
              label="Seller mobile number"
              value={draft.mobileNumber}
              onChange={(v) => updateDraft({ mobileNumber: v })}
            />

            <DeepShopFloatingInput
              label="Email address"
              type="email"
              value={draft.email}
              onChange={(v) => updateDraft({ email: v })}
              errorText={fieldError}
            />

            <button
              type="submit"
              className="w-full h-[48px] rounded-full bg-[#0064e0] hover:bg-[#0056c1] active:scale-[0.99] text-white font-semibold text-[16px] transition cursor-pointer"
            >
              Next
            </button>
          </form>
        </DeepShopAuthShell>

        <StopCreatingAccountModal
          isOpen={showStopModal}
          onStop={handleConfirmStop}
          onContinue={() => setShowStopModal(false)}
        />
      </>
    );
  }

  // STEP 1: Name (IMG_5022)
  if (currentStep === "name") {
    return (
      <>
        <SEO
          title="What's your name? — DEEP SHOP"
          description="Enter your first name and surname to create your DEEP SHOP account."
          canonical="/signup/name"
        />
        <DeepShopAuthShell
          onBack={handleBackNavigation}
          desktopHeadline="Create your DEEP SHOP profile."
          desktopSubtext="Tell us your name so sellers, friends, and the community know who you are."
          footer={bottomFindAccountLink}
        >
          <form onSubmit={handleNextFromName} className="space-y-5 pt-1">
            <div className="space-y-2">
              <h1 className="text-[26px] font-bold tracking-tight leading-[1.2] text-[#0a1317] dark:text-white">
                What&apos;s your name?
              </h1>
              <p className="text-[15px] leading-[1.4] text-[#1c2b33] dark:text-zinc-300">
                Enter the name you use in real life.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <DeepShopFloatingInput
                label="First name"
                value={draft.firstName}
                onChange={(v) => {
                  updateDraft({ firstName: v });
                  if (fieldError) setFieldError("");
                }}
                autoComplete="given-name"
              />
              <DeepShopFloatingInput
                label="Surname"
                value={draft.surname}
                onChange={(v) => {
                  updateDraft({ surname: v });
                  if (fieldError) setFieldError("");
                }}
                autoComplete="family-name"
              />
            </div>

            {fieldError && (
              <p className="text-[13px] font-medium text-red-600 dark:text-red-400 px-1">
                {fieldError}
              </p>
            )}

            <button
              type="submit"
              className="w-full h-[48px] rounded-full bg-[#0064e0] hover:bg-[#0056c1] active:scale-[0.99] text-white font-semibold text-[16px] transition cursor-pointer"
            >
              Next
            </button>
          </form>
        </DeepShopAuthShell>

        <StopCreatingAccountModal
          isOpen={showStopModal}
          onStop={handleConfirmStop}
          onContinue={() => setShowStopModal(false)}
        />
      </>
    );
  }

  // STEP 2: Date of birth (IMG_5023 + IMG_5024 sheet)
  if (currentStep === "birthday") {
    return (
      <>
        <SEO
          title="Date of birth — DEEP SHOP"
          description="Select your date of birth for your DEEP SHOP account."
          canonical="/signup/birthday"
        />
        <DeepShopAuthShell
          onBack={handleBackNavigation}
          onMoreClick={() => setShowStopModal(true)}
          desktopHeadline="Your personal details stay under your control."
          desktopSubtext="Providing your birthday helps personalize your DEEP SHOP experience and keeps our community safe."
          footer={bottomFindAccountLink}
        >
          <form onSubmit={handleNextFromBirthday} className="space-y-5 pt-1">
            <div className="space-y-2">
              <h1 className="text-[26px] font-bold tracking-tight leading-[1.2] text-[#0a1317] dark:text-white">
                What&apos;s your date of birth?
              </h1>
              <p className="text-[15px] leading-[1.45] text-[#1c2b33] dark:text-zinc-300">
                Choose your date of birth. You can always make this private
                later.{" "}
                <button
                  type="button"
                  onClick={() => setShowBirthdayInfo(true)}
                  className="text-[#0064e0] dark:text-[#4599ff] font-medium hover:underline inline text-left cursor-pointer"
                >
                  Why do I need to provide my date of birth?
                </button>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowDatePickerSheet(true)}
              className="w-full h-[60px] rounded-[16px] border border-[#1c2b33] dark:border-zinc-300 bg-white dark:bg-[#121820] px-4 flex flex-col justify-center text-left transition cursor-pointer"
            >
              <span className="text-[12px] font-medium text-[#1c2b33] dark:text-zinc-400">
                Date of birth ({age} years old)
              </span>
              <span className="text-[16px] font-normal text-[#0a1317] dark:text-zinc-100 mt-0.5">
                {formattedBirthDate}
              </span>
            </button>

            {fieldError && (
              <p className="text-[13px] font-medium text-red-600 dark:text-red-400 px-1">
                {fieldError}
              </p>
            )}

            <button
              type="submit"
              className="w-full h-[48px] rounded-full bg-[#0064e0] hover:bg-[#0056c1] active:scale-[0.99] text-white font-semibold text-[16px] transition cursor-pointer"
            >
              Next
            </button>
          </form>
        </DeepShopAuthShell>

        {/* Birthdays Explanation Bottom Sheet (IMG_5024) */}
        <BirthdaysInfoSheet
          isOpen={showBirthdayInfo}
          onClose={() => setShowBirthdayInfo(false)}
        />

        {/* Interactive Date of Birth Picker Bottom Sheet */}
        <AnimatePresence>
          {showDatePickerSheet && (
            <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowDatePickerSheet(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
              />
              <motion.div
                initial={{ y: "100%", opacity: 0.6 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                className="relative z-10 w-full sm:max-w-[420px] bg-white dark:bg-[#182028] rounded-t-[28px] sm:rounded-[28px] p-5 pb-7 shadow-2xl border-t sm:border border-zinc-200 dark:border-zinc-800"
              >
                <div className="w-10 h-1 rounded-full bg-[#cbd2d9] dark:bg-zinc-600 mx-auto mb-3" />
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[17px] font-bold text-[#0a1317] dark:text-white">
                    Select date of birth
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowDatePickerSheet(false)}
                    className="min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center text-[#5e6c77] hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#5e6c77] dark:text-zinc-400 mb-1.5">
                      Day
                    </label>
                    <select
                      value={Math.min(draft.birthDay, daysInSelectedMonth)}
                      onChange={(e) =>
                        updateDraft({ birthDay: Number(e.target.value) })
                      }
                      className="w-full h-12 rounded-xl border border-[#cbd2d9] dark:border-zinc-700 bg-[#f7f8fa] dark:bg-zinc-900 px-3 text-[15px] font-semibold text-[#0a1317] dark:text-zinc-100 outline-none"
                    >
                      {Array.from(
                        { length: daysInSelectedMonth },
                        (_, idx) => idx + 1
                      ).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#5e6c77] dark:text-zinc-400 mb-1.5">
                      Month
                    </label>
                    <select
                      value={draft.birthMonth}
                      onChange={(e) => {
                        const newM = Number(e.target.value);
                        const maxD = getDaysInMonth(newM, draft.birthYear);
                        updateDraft({
                          birthMonth: newM,
                          birthDay: Math.min(draft.birthDay, maxD),
                        });
                      }}
                      className="w-full h-12 rounded-xl border border-[#cbd2d9] dark:border-zinc-700 bg-[#f7f8fa] dark:bg-zinc-900 px-2.5 text-[15px] font-semibold text-[#0a1317] dark:text-zinc-100 outline-none"
                    >
                      {MONTH_NAMES.map((mName, idx) => (
                        <option key={mName} value={idx}>
                          {mName.slice(0, 3)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#5e6c77] dark:text-zinc-400 mb-1.5">
                      Year
                    </label>
                    <select
                      value={draft.birthYear}
                      onChange={(e) => {
                        const newY = Number(e.target.value);
                        const maxD = getDaysInMonth(draft.birthMonth, newY);
                        updateDraft({
                          birthYear: newY,
                          birthDay: Math.min(draft.birthDay, maxD),
                        });
                      }}
                      className="w-full h-12 rounded-xl border border-[#cbd2d9] dark:border-zinc-700 bg-[#f7f8fa] dark:bg-zinc-900 px-3 text-[15px] font-semibold text-[#0a1317] dark:text-zinc-100 outline-none"
                    >
                      {yearsList.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDatePickerSheet(false)}
                  className="w-full mt-5 h-[46px] rounded-full bg-[#0064e0] hover:bg-[#0056c1] text-white font-semibold text-[16px] cursor-pointer"
                >
                  Set ({age} years old)
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <StopCreatingAccountModal
          isOpen={showStopModal}
          onStop={handleConfirmStop}
          onContinue={() => setShowStopModal(false)}
        />
      </>
    );
  }

  // STEP 3: Gender (IMG_5025)
  if (currentStep === "gender") {
    return (
      <>
        <SEO
          title="Gender — DEEP SHOP"
          description="Select your gender preference for your DEEP SHOP profile."
          canonical="/signup/gender"
        />
        <DeepShopAuthShell
          onBack={handleBackNavigation}
          onMoreClick={() => setShowStopModal(true)}
          desktopHeadline="Customize your profile details."
          desktopSubtext="You can always update who sees your profile details from DEEP SHOP settings later."
          footer={bottomFindAccountLink}
        >
          <form onSubmit={handleNextFromGender} className="space-y-5 pt-1">
            <div className="space-y-2">
              <h1 className="text-[26px] font-bold tracking-tight leading-[1.2] text-[#0a1317] dark:text-white">
                What&apos;s your gender?
              </h1>
              <p className="text-[15px] leading-[1.45] text-[#1c2b33] dark:text-zinc-300">
                You can change who sees your gender on your profile later.
              </p>
            </div>

            <div className="rounded-[20px] border border-[#dce1e7] dark:border-zinc-800 divide-y divide-[#e5e8ec] dark:divide-zinc-800 bg-white dark:bg-[#121820] overflow-hidden">
              {/* Female */}
              <button
                type="button"
                onClick={() => {
                  updateDraft({ gender: "female" });
                  setFieldError("");
                }}
                className="w-full min-h-[58px] px-4 py-3.5 flex items-center justify-between text-left hover:bg-[#f7f8fa] dark:hover:bg-zinc-800/60 transition cursor-pointer"
              >
                <span className="text-[16px] font-medium text-[#0a1317] dark:text-zinc-100">
                  Female
                </span>
                <span
                  className={`w-[22px] h-[22px] rounded-full border flex items-center justify-center shrink-0 transition ${
                    draft.gender === "female"
                      ? "border-[#0064e0] border-[6px]"
                      : "border-[#65737e] dark:border-zinc-500 border-[1.8px]"
                  }`}
                />
              </button>

              {/* Male */}
              <button
                type="button"
                onClick={() => {
                  updateDraft({ gender: "male" });
                  setFieldError("");
                }}
                className="w-full min-h-[58px] px-4 py-3.5 flex items-center justify-between text-left hover:bg-[#f7f8fa] dark:hover:bg-zinc-800/60 transition cursor-pointer"
              >
                <span className="text-[16px] font-medium text-[#0a1317] dark:text-zinc-100">
                  Male
                </span>
                <span
                  className={`w-[22px] h-[22px] rounded-full border flex items-center justify-center shrink-0 transition ${
                    draft.gender === "male"
                      ? "border-[#0064e0] border-[6px]"
                      : "border-[#65737e] dark:border-zinc-500 border-[1.8px]"
                  }`}
                />
              </button>

              {/* More options */}
              <div className="w-full">
                <button
                  type="button"
                  onClick={() => {
                    updateDraft({ gender: "more" });
                    setFieldError("");
                  }}
                  className="w-full px-4 py-4 flex items-center justify-between gap-4 text-left hover:bg-[#f7f8fa] dark:hover:bg-zinc-800/60 transition cursor-pointer"
                >
                  <div>
                    <span className="block text-[16px] font-medium text-[#0a1317] dark:text-zinc-100">
                      More options
                    </span>
                    <span className="block text-[13px] leading-[1.35] text-[#5e6c77] dark:text-zinc-400 mt-1">
                      Select More options to choose another gender or if
                      you&apos;d rather not say.
                    </span>
                  </div>
                  <span
                    className={`w-[22px] h-[22px] rounded-full border flex items-center justify-center shrink-0 transition ${
                      draft.gender === "more"
                        ? "border-[#0064e0] border-[6px]"
                        : "border-[#65737e] dark:border-zinc-500 border-[1.8px]"
                    }`}
                  />
                </button>

                {draft.gender === "more" && (
                  <div className="px-4 pb-4 flex flex-wrap gap-2">
                    {["Prefer not to say", "Non-binary", "Custom"].map(
                      (choice) => (
                        <button
                          key={choice}
                          type="button"
                          onClick={() =>
                            updateDraft({ moreGenderChoice: choice })
                          }
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                            draft.moreGenderChoice === choice
                              ? "border-[#0064e0] bg-[#0064e0]/10 text-[#0064e0] dark:text-[#4599ff]"
                              : "border-[#cbd2d9] dark:border-zinc-700 text-[#46545e] dark:text-zinc-300"
                          }`}
                        >
                          {choice}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            {fieldError && (
              <p className="text-[13px] font-medium text-red-600 dark:text-red-400 px-1">
                {fieldError}
              </p>
            )}

            <button
              type="submit"
              className="w-full h-[48px] rounded-full bg-[#0064e0] hover:bg-[#0056c1] active:scale-[0.99] text-white font-semibold text-[16px] transition cursor-pointer"
            >
              Next
            </button>
          </form>
        </DeepShopAuthShell>

        <StopCreatingAccountModal
          isOpen={showStopModal}
          onStop={handleConfirmStop}
          onContinue={() => setShowStopModal(false)}
        />
      </>
    );
  }

  // STEP 4A: Mobile Number (IMG_5026 — NO OTP)
  if (currentStep === "mobile") {
    return (
      <>
        <SEO
          title="Mobile number — DEEP SHOP"
          description="Add your mobile number to your DEEP SHOP account."
          canonical="/signup/mobile"
        />
        <DeepShopAuthShell
          onBack={handleBackNavigation}
          onMoreClick={() => setShowStopModal(true)}
          desktopHeadline="Add your contact number."
          desktopSubtext="Use your mobile number to sign in easily and keep track of your DEEP SHOP deliveries. No SMS OTP wait required."
          footer={bottomFindAccountLink}
        >
          <form onSubmit={handleNextFromMobile} className="space-y-4 pt-1">
            <div className="space-y-2">
              <h1 className="text-[26px] font-bold tracking-tight leading-[1.2] text-[#0a1317] dark:text-white">
                What&apos;s your mobile number?
              </h1>
              <p className="text-[15px] leading-[1.45] text-[#1c2b33] dark:text-zinc-300">
                Enter the mobile number on which you can be contacted. No one
                will see this on your profile.
              </p>
            </div>

            <div className="pt-1">
              <DeepShopFloatingInput
                label="Mobile number"
                type="tel"
                value={draft.mobileNumber}
                onChange={(v) => {
                  updateDraft({ mobileNumber: v });
                  if (fieldError) setFieldError("");
                }}
                errorText={fieldError}
                autoComplete="tel"
              />
            </div>

            <p className="text-[13px] leading-[1.4] text-[#5e6c77] dark:text-zinc-400">
              You may receive order updates and account notifications from DEEP
              SHOP.{" "}
              <Link
                to="/privacy"
                className="text-[#0064e0] dark:text-[#4599ff] font-medium hover:underline"
              >
                Learn more
              </Link>
            </p>

            <div className="pt-1 space-y-2.5">
              <button
                type="submit"
                className="w-full h-[48px] rounded-full bg-[#0064e0] hover:bg-[#0056c1] active:scale-[0.99] text-white font-semibold text-[16px] transition cursor-pointer"
              >
                Next
              </button>

              <button
                type="button"
                onClick={() => {
                  updateDraft({ contactMode: "email" });
                  navigate(`/signup/email${querySuffix}`);
                }}
                className="w-full h-[48px] rounded-full bg-[#f0f2f5] hover:bg-[#e4e6eb] dark:bg-zinc-800 dark:hover:bg-zinc-700 active:scale-[0.99] text-[#0a1317] dark:text-zinc-100 font-semibold text-[16px] transition cursor-pointer"
              >
                Sign up with email address
              </button>
            </div>
          </form>
        </DeepShopAuthShell>

        <StopCreatingAccountModal
          isOpen={showStopModal}
          onStop={handleConfirmStop}
          onContinue={() => setShowStopModal(false)}
        />
      </>
    );
  }

  // STEP 4B: Email Address (IMG_5027 — NO OTP)
  if (currentStep === "email") {
    return (
      <>
        <SEO
          title="Email address — DEEP SHOP"
          description="Add your email address to your DEEP SHOP account."
          canonical="/signup/email"
        />
        <DeepShopAuthShell
          onBack={handleBackNavigation}
          onMoreClick={() => setShowStopModal(true)}
          desktopHeadline="Add your email address."
          desktopSubtext="Use your email address to log in, receive e-receipts, and recover your password anytime."
          footer={bottomFindAccountLink}
        >
          <form onSubmit={handleNextFromEmail} className="space-y-4 pt-1">
            <div className="space-y-2">
              <h1 className="text-[26px] font-bold tracking-tight leading-[1.2] text-[#0a1317] dark:text-white">
                What&apos;s your email address?
              </h1>
              <p className="text-[15px] leading-[1.45] text-[#1c2b33] dark:text-zinc-300">
                Enter the email address at which you can be contacted. No one
                will see this on your profile.
              </p>
            </div>

            <div className="pt-1">
              <DeepShopFloatingInput
                label="Email address"
                type="email"
                value={draft.email}
                onChange={(v) => {
                  updateDraft({ email: v });
                  if (fieldError) setFieldError("");
                }}
                errorText={fieldError}
                autoComplete="email"
              />
            </div>

            <p className="text-[13px] leading-[1.4] text-[#5e6c77] dark:text-zinc-400">
              You&apos;ll also receive emails from DEEP SHOP and can opt out at
              any time.{" "}
              <Link
                to="/privacy"
                className="text-[#0064e0] dark:text-[#4599ff] font-medium hover:underline"
              >
                Learn more
              </Link>
            </p>

            <div className="pt-1 space-y-2.5">
              <button
                type="submit"
                className="w-full h-[48px] rounded-full bg-[#0064e0] hover:bg-[#0056c1] active:scale-[0.99] text-white font-semibold text-[16px] transition cursor-pointer"
              >
                Next
              </button>

              <button
                type="button"
                onClick={() => {
                  updateDraft({ contactMode: "mobile" });
                  navigate(`/signup/mobile${querySuffix}`);
                }}
                className="w-full h-[48px] rounded-full bg-[#f0f2f5] hover:bg-[#e4e6eb] dark:bg-zinc-800 dark:hover:bg-zinc-700 active:scale-[0.99] text-[#0a1317] dark:text-zinc-100 font-semibold text-[16px] transition cursor-pointer"
              >
                Sign up with mobile number
              </button>
            </div>
          </form>
        </DeepShopAuthShell>

        <StopCreatingAccountModal
          isOpen={showStopModal}
          onStop={handleConfirmStop}
          onContinue={() => setShowStopModal(false)}
        />
      </>
    );
  }

  // STEP 5: Create a Password (IMG_5028)
  return (
    <>
      <SEO
        title="Create a password — DEEP SHOP"
        description="Choose a secure password for your DEEP SHOP account."
        canonical="/signup/password"
      />
      <DeepShopAuthShell
        onBack={handleBackNavigation}
        onMoreClick={() => setShowStopModal(true)}
        desktopHeadline="Secure your DEEP SHOP account."
        desktopSubtext="Save your login info on this browser so you can switch profiles in one tap whenever you return."
        footer={bottomFindAccountLink}
      >
        <form onSubmit={handleCreateAccount} className="space-y-4 pt-1">
          <div className="space-y-2">
            <h1 className="text-[26px] font-bold tracking-tight leading-[1.2] text-[#0a1317] dark:text-white">
              Create a password
            </h1>
            <p className="text-[15px] leading-[1.45] text-[#1c2b33] dark:text-zinc-300">
              Create a password with at least six letters or numbers. It should
              be something that others can&apos;t guess.
            </p>
          </div>

          <div className="pt-1 space-y-3">
            <DeepShopFloatingInput
              label="Password"
              value={password}
              onChange={(v) => {
                setPassword(v);
                if (fieldError) setFieldError("");
              }}
              isPassword
              errorText={fieldError}
              autoComplete="new-password"
            />

            {/* Live Password Rules Checklist */}
            {(() => {
              const pwdRules = checkPasswordRules(password);
              return (
                <div className="p-3.5 rounded-2xl bg-[#f0f2f5] dark:bg-zinc-800/80 border border-[#dce1e7] dark:border-zinc-700/80 space-y-2">
                  <p className="text-[12px] font-bold text-[#5e6c77] dark:text-zinc-400">
                    পাসওয়ার্ডের প্রয়োজনীয় শর্তাবলী (Password Rules):
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[12px] font-semibold">
                    <div
                      className={`flex items-center gap-1.5 transition ${
                        pwdRules.hasMinLen
                          ? "text-emerald-600 dark:text-emerald-400 font-bold"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          pwdRules.hasMinLen
                            ? "bg-emerald-500 text-white"
                            : "bg-zinc-300 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        {pwdRules.hasMinLen ? "✓" : "○"}
                      </span>
                      <span>৮+ অক্ষর</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 transition ${
                        pwdRules.hasNumber
                          ? "text-emerald-600 dark:text-emerald-400 font-bold"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          pwdRules.hasNumber
                            ? "bg-emerald-500 text-white"
                            : "bg-zinc-300 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        {pwdRules.hasNumber ? "✓" : "○"}
                      </span>
                      <span>সংখ্যা (0-9)</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 transition ${
                        pwdRules.hasLower
                          ? "text-emerald-600 dark:text-emerald-400 font-bold"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          pwdRules.hasLower
                            ? "bg-emerald-500 text-white"
                            : "bg-zinc-300 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        {pwdRules.hasLower ? "✓" : "○"}
                      </span>
                      <span>ছোট অক্ষর (a-z)</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 transition ${
                        pwdRules.hasUpper
                          ? "text-emerald-600 dark:text-emerald-400 font-bold"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          pwdRules.hasUpper
                            ? "bg-emerald-500 text-white"
                            : "bg-zinc-300 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        {pwdRules.hasUpper ? "✓" : "○"}
                      </span>
                      <span>বড় অক্ষর (A-Z)</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 col-span-2 transition ${
                        pwdRules.hasSpecial
                          ? "text-emerald-600 dark:text-emerald-400 font-bold"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          pwdRules.hasSpecial
                            ? "bg-emerald-500 text-white"
                            : "bg-zinc-300 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        {pwdRules.hasSpecial ? "✓" : "○"}
                      </span>
                      <span>স্পেশাল চিহ্ন (!@#$%^&*)</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Remember login info checkbox row matching IMG_5028 */}
          <div className="flex items-center gap-3 py-1">
            <button
              type="button"
              role="checkbox"
              aria-checked={draft.rememberLogin}
              onClick={() =>
                updateDraft({ rememberLogin: !draft.rememberLogin })
              }
              className={`w-[22px] h-[22px] rounded-[6px] flex items-center justify-center shrink-0 transition cursor-pointer ${
                draft.rememberLogin
                  ? "bg-[#0064e0] text-white"
                  : "border-2 border-[#65737e] dark:border-zinc-500 bg-transparent"
              }`}
            >
              {draft.rememberLogin && (
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              )}
            </button>
            <span className="text-[15px] text-[#0a1317] dark:text-zinc-200">
              Remember login info.{" "}
              <button
                type="button"
                onClick={() => setShowRememberInfoSheet(true)}
                className="text-[#0064e0] dark:text-[#4599ff] font-medium hover:underline cursor-pointer"
              >
                Learn more
              </button>
            </span>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[48px] rounded-full bg-[#0064e0] hover:bg-[#0056c1] active:scale-[0.99] disabled:opacity-60 text-white font-semibold text-[16px] flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              <span>{loading ? "Creating account..." : "Next"}</span>
            </button>
          </div>

          <p className="text-[12px] leading-relaxed text-[#5e6c77] dark:text-zinc-400 pt-2">
            By tapping Next, you agree to DEEP SHOP&apos;s{" "}
            <Link
              to="/terms"
              className="text-[#0064e0] dark:text-[#4599ff] hover:underline"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              to="/privacy"
              className="text-[#0064e0] dark:text-[#4599ff] hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </form>
      </DeepShopAuthShell>

      <AnimatePresence>
        {showRememberInfoSheet && (
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRememberInfoSheet(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ y: "100%", opacity: 0.6 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="relative z-10 w-full sm:max-w-[420px] bg-white dark:bg-[#182028] rounded-t-[28px] sm:rounded-[28px] pb-7 pt-2.5 shadow-2xl border-t sm:border border-zinc-200 dark:border-zinc-800"
            >
              <div className="w-10 h-1 rounded-full bg-[#cbd2d9] dark:bg-zinc-600 mx-auto mb-2" />
              <div className="relative flex items-center justify-center h-12 px-4 border-b border-[#e5e8ec] dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowRememberInfoSheet(false)}
                  className="absolute left-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-[17px] font-bold text-[#0a1317] dark:text-white">
                  Remember login info
                </h3>
              </div>
              <div className="px-6 pt-5 text-[15px] leading-relaxed text-[#1c2b33] dark:text-zinc-200 space-y-3">
                <p>
                  We&apos;ll save your DEEP SHOP profile on this browser so next
                  time you log out, you can tap your profile card to log back in
                  without re-typing your details.
                </p>
                <p>
                  You can remove saved login info anytime from the{" "}
                  <strong>•••</strong> menu on the Saved Accounts page.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <StopCreatingAccountModal
        isOpen={showStopModal}
        onStop={handleConfirmStop}
        onContinue={() => setShowStopModal(false)}
      />
    </>
  );
};

export default SignUp;
