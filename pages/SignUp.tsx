import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { addDoc, collection, doc, setDoc } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, Loader2, Store, Home, X } from "lucide-react";
import { auth, db } from "../firebase";
import { useNotify } from "../components/Notifications";
import { getFriendlyErrorMessage } from "../lib/firebaseErrorMapper";
import SEO from "../components/SEO";
import {
  BirthdaysInfoSheet,
  DeepShopAuthShell,
  DeepShopEcosystemHero,
  DeepShopFloatingInput,
  DefaultUserAvatar,
  StopCreatingAccountModal,
} from "../components/DeepShopAuthShell";
import {
  formatAccountContact,
  getSavedAccounts,
  linkPendingGuestOrderAndResolveDestination,
  MatchedAccountProfile,
  normalizeBdPhoneVariants,
  searchMatchingAccounts,
  upsertSavedAccount,
} from "../lib/savedAccounts";
import {
  getBanglaAuthErrorMessage,
  isAuthVoiceMuted,
  playAuthVoice,
  validateRealEmail,
  validateRealPersonName,
  validateInappropriateContent,
  checkPasswordRules,
} from "../lib/authVoiceAndValidation";
import { processCleanImage } from "../lib/watermark";
import { uploadDataUrlToImgbb } from "../services/imgbb";
import {
  requestBrowserNotificationPermissionWithMeta,
  subscribeToWebPush,
} from "../lib/push";

const DRAFT_STORAGE_KEY = "deepshop_signup_wizard_draft_v1";
const WIZARD_TEMP_KEY = "deepshop_signup_wizard_temp_v1";

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

interface SignUpWizardTempState {
  password?: string;
  matchedAccount?: MatchedAccountProfile | null;
  postSignupDest?: string;
  uploadedPhotoUrl?: string;
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

const getWizardTempState = (): SignUpWizardTempState => {
  try {
    const raw = sessionStorage.getItem(WIZARD_TEMP_KEY);
    if (raw) {
      return JSON.parse(raw) as SignUpWizardTempState;
    }
  } catch {
    // Ignore storage read error
  }
  return {};
};

const saveWizardTempState = (patch: Partial<SignUpWizardTempState>) => {
  try {
    const prev = getWizardTempState();
    const next = { ...prev, ...patch };
    sessionStorage.setItem(WIZARD_TEMP_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage write error
  }
};

const clearWizardTempState = () => {
  try {
    sessionStorage.removeItem(WIZARD_TEMP_KEY);
  } catch {
    // Ignore
  }
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
  const currentStep = step || (roleParam === "seller" ? "seller" : "welcome");

  const initialTemp = useMemo(() => getWizardTempState(), []);
  const [draft, setDraft] = useState<SignUpDraft>(getDefaultDraft);
  const [password, setPassword] = useState<string>(initialTemp.password || "");
  const [matchedAccount, setMatchedAccount] =
    useState<MatchedAccountProfile | null>(initialTemp.matchedAccount || null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string>(
    initialTemp.uploadedPhotoUrl || ""
  );
  const [loading, setLoading] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [requestingPush, setRequestingPush] = useState(false);
  const [fieldError, setFieldError] = useState("");

  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);

  // Popups / Bottom Sheets
  const [showBirthdayInfo, setShowBirthdayInfo] = useState(false);
  const [showDatePickerSheet, setShowDatePickerSheet] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [showRememberInfoSheet, setShowRememberInfoSheet] = useState(false);
  const [showTermsLearnMoreSheet, setShowTermsLearnMoreSheet] = useState(false);
  const [showNotificationsInfoSheet, setShowNotificationsInfoSheet] =
    useState(false);
  const [showPushPromptModal, setShowPushPromptModal] = useState(false);

  const savedAccounts = getSavedAccounts();

  useEffect(() => {
    setFieldError("");
    if (!isAuthVoiceMuted()) {
      switch (currentStep) {
        case "welcome":
          playAuthVoice(
            "ডিপ শপে আপনাকে স্বাগতম। নতুন অ্যাকাউন্ট তৈরি করতে গেট স্টার্টেড বাটনে ট্যাপ করুন, অথবা সেলার হতে নিচের সেলার পার্টনার অপশনে ক্লিক করুন।"
          );
          break;
        case "name":
          playAuthVoice(
            "আপনার আসল নামটি এখানে লিখুন। প্রথমে আপনার নামের প্রথম অংশ এবং পাশে পদবি লিখুন।"
          );
          break;
        case "birthday":
          playAuthVoice(
            "আপনার সঠিক জন্ম তারিখটি নির্বাচন করুন। অ্যাকাউন্ট তৈরি করতে বয়স কমপক্ষে তেরো বছর হতে হবে।"
          );
          break;
        case "gender":
          playAuthVoice(
            "আপনার লিঙ্গ পরিচয়টি নির্বাচন করুন এবং নেক্সট বাটনে ট্যাপ করুন।"
          );
          break;
        case "mobile":
          playAuthVoice(
            "আপনার সচল মোবাইল নম্বরটি এখানে দিন। এই নম্বরে আপনার অর্ডারের আপডেট পাঠানো হবে।"
          );
          break;
        case "email":
          playAuthVoice("আপনার ব্যক্তিগত আসল ইমেইল ঠিকানাটি এখানে লিখুন।");
          break;
        case "existing-account":
          playAuthVoice(
            "এই তথ্যে ডিপ শপে আপনার আগে থেকেই একটি অ্যাকাউন্ট রয়েছে। আপনি চাইলে আগের অ্যাকাউন্টে লগইন করতে পারেন, অথবা নতুন অ্যাকাউন্ট তৈরি চালিয়ে যেতে পারেন।"
          );
          break;
        case "password":
          playAuthVoice(
            roleParam === "seller"
              ? "এখন আপনার সেলার অ্যাকাউন্টের সুরক্ষার জন্য একটি শক্তিশালী পাসওয়ার্ড তৈরি করুন।"
              : "আপনার অ্যাকাউন্টের সুরক্ষার জন্য কমপক্ষে আট অক্ষরের একটি শক্তিশালী পাসওয়ার্ড তৈরি করুন।"
          );
          break;
        case "terms":
          playAuthVoice(
            "ডিপ শপের শর্তাবলী এবং প্রাইভেসি পলিসিতে সম্মতি জানাতে আই এগ্রি বাটনে ট্যাপ করে আপনার অ্যাকাউন্ট তৈরি সম্পন্ন করুন।"
          );
          break;
        case "profile-picture":
          playAuthVoice(
            "আপনার প্রোফাইলে একটি সুন্দর ছবি যোগ করুন যাতে সবাই আপনাকে সহজে চিনতে পারে। ছবি দিতে অ্যাড পিকচার বাটনে ট্যাপ করুন, অথবা পরে দিতে চাইলে স্কিপ করুন।"
          );
          break;
        case "notifications":
          playAuthVoice(
            "অর্ডার আপডেট, মেসেজ এবং লুপসের নোটিফিকেশন দ্রুত পেতে নেক্সট বাটনে ট্যাপ করে পুশ নোটিফিকেশন অ্যালাউ করুন।"
          );
          break;
        case "seller":
          playAuthVoice(
            "ডিপ শপ সেলার রেজিস্ট্রেশনে আপনাকে স্বাগতম। আপনার দোকানের নাম, এন আই ডি অনুযায়ী মালিকের পূর্ণ নাম, মোবাইল নম্বর এবং ইমেইল দিয়ে সেলার প্রোফাইল তৈরি করুন।"
          );
          break;
      }
    }
  }, [step, currentStep, roleParam]);

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
    clearWizardTempState();
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
      case "existing-account":
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
      case "terms":
        navigate(`/signup/password${querySuffix}`);
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
    const fnRealCheck = validateRealPersonName(draft.firstName, "ফার্স্ট নাম");
    if (!fnRealCheck.isValid) {
      setFieldError(fnRealCheck.errorMsg);
      playAuthVoice(fnRealCheck.errorMsg);
      return;
    }
    const fnCheck = validateInappropriateContent(
      draft.firstName,
      "ফার্স্ট নেমে"
    );
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
    const snRealCheck = validateRealPersonName(draft.surname, "সারনেম");
    if (!snRealCheck.isValid) {
      setFieldError(snRealCheck.errorMsg);
      playAuthVoice(snRealCheck.errorMsg);
      return;
    }
    const snCheck = validateInappropriateContent(draft.surname, "সারনেমে");
    if (!snCheck.isValid) {
      setFieldError(snCheck.errorMsg);
      playAuthVoice(snCheck.errorMsg);
      return;
    }
    const fullRealCheck = validateRealPersonName(
      `${draft.firstName.trim()} ${draft.surname.trim()}`,
      "পূর্ণ নাম"
    );
    if (!fullRealCheck.isValid) {
      setFieldError(fullRealCheck.errorMsg);
      playAuthVoice(fullRealCheck.errorMsg);
      return;
    }
    navigate(`/signup/birthday${querySuffix}`);
  };

  const handleNextFromBirthday = (e: React.FormEvent) => {
    e.preventDefault();
    if (age < 13) {
      const err = "অ্যাকাউন্ট তৈরি করতে বয়স কমপক্ষে তেরো বছর হতে হবে।";
      setFieldError("You must be at least 13 years old to create an account.");
      playAuthVoice(err);
      return;
    }
    navigate(`/signup/gender${querySuffix}`);
  };

  const handleNextFromGender = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.gender) {
      const err = "অনুগ্রহ করে আপনার লিঙ্গ পরিচয় নির্বাচন করুন।";
      setFieldError("Please select your gender to continue.");
      playAuthVoice(err);
      return;
    }
    navigate(
      `/signup/${
        draft.contactMode === "email" ? "email" : "mobile"
      }${querySuffix}`
    );
  };

  const handleNextFromMobile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = draft.mobileNumber.trim().replace(/[\s\-().]/g, "");
    if (!/^\+?[0-9]{8,15}$/.test(cleaned)) {
      const err = "অনুগ্রহ করে একটি সঠিক মোবাইল নম্বর প্রদান করুন।";
      setFieldError("Please enter a valid mobile number.");
      playAuthVoice(err);
      return;
    }
    updateDraft({ contactMode: "mobile" });
    setCheckingAccount(true);
    try {
      const matches = await searchMatchingAccounts(draft.mobileNumber.trim());
      if (matches.length > 0 && matches[0]?.displayName) {
        setMatchedAccount(matches[0]);
        saveWizardTempState({ matchedAccount: matches[0] });
        navigate(`/signup/existing-account${querySuffix}`);
        return;
      }
    } catch {
      // Proceed to password if lookup fails
    } finally {
      setCheckingAccount(false);
    }
    navigate(`/signup/password${querySuffix}`);
  };

  const handleNextFromEmail = async (e: React.FormEvent) => {
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
    setCheckingAccount(true);
    try {
      const matches = await searchMatchingAccounts(trimmed);
      if (matches.length > 0 && matches[0]?.displayName) {
        setMatchedAccount(matches[0]);
        saveWizardTempState({ matchedAccount: matches[0] });
        navigate(`/signup/existing-account${querySuffix}`);
        return;
      }
    } catch {
      // Proceed to password if lookup fails
    } finally {
      setCheckingAccount(false);
    }
    navigate(`/signup/password${querySuffix}`);
  };

  const handleNextFromSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError("");

    if (!draft.shopName.trim()) {
      const msg = "অনুগ্রহ করে আপনার দোকানের নাম লিখুন।";
      setFieldError(msg);
      playAuthVoice(msg);
      return;
    }
    const shopRealCheck = validateRealPersonName(
      draft.shopName,
      "দোকানের নাম"
    );
    if (!shopRealCheck.isValid) {
      setFieldError(shopRealCheck.errorMsg);
      playAuthVoice(shopRealCheck.errorMsg);
      return;
    }
    const shopProf = validateInappropriateContent(
      draft.shopName,
      "দোকানের নামে"
    );
    if (!shopProf.isValid) {
      setFieldError(shopProf.errorMsg);
      playAuthVoice(shopProf.errorMsg);
      return;
    }

    if (!draft.firstName.trim()) {
      const msg = "এন আই ডি অনুযায়ী মালিকের পূর্ণ নাম লিখুন।";
      setFieldError(msg);
      playAuthVoice(msg);
      return;
    }
    const ownerRealCheck = validateRealPersonName(
      draft.firstName,
      "মালিকের নাম"
    );
    if (!ownerRealCheck.isValid) {
      setFieldError(ownerRealCheck.errorMsg);
      playAuthVoice(ownerRealCheck.errorMsg);
      return;
    }
    const ownerProf = validateInappropriateContent(
      draft.firstName,
      "মালিকের নামে"
    );
    if (!ownerProf.isValid) {
      setFieldError(ownerProf.errorMsg);
      playAuthVoice(ownerProf.errorMsg);
      return;
    }

    if (draft.storeType === "physical" && !draft.shopAddress.trim()) {
      const msg = "অনুগ্রহ করে আপনার দোকানের নম্বর এবং মার্কেটের ঠিকানা লিখুন।";
      setFieldError(msg);
      playAuthVoice(msg);
      return;
    }

    const cleanedPhone = draft.mobileNumber.trim().replace(/[\s\-().]/g, "");
    if (!/^\+?[0-9]{8,15}$/.test(cleanedPhone)) {
      const msg = "অনুগ্রহ করে সেলারের সঠিক মোবাইল নম্বর প্রদান করুন।";
      setFieldError(msg);
      playAuthVoice(msg);
      return;
    }

    const trimmedEmail = draft.email.trim();
    const emailCheck = validateRealEmail(trimmedEmail);
    if (!emailCheck.isValid) {
      setFieldError(emailCheck.errorMsg);
      playAuthVoice(emailCheck.errorMsg);
      return;
    }
    const emailProf = validateInappropriateContent(trimmedEmail, "ইমেইলে");
    if (!emailProf.isValid) {
      setFieldError(emailProf.errorMsg);
      playAuthVoice(emailProf.errorMsg);
      return;
    }

    updateDraft({ contactMode: "email" });
    setCheckingAccount(true);
    try {
      let matches = await searchMatchingAccounts(trimmedEmail);
      if (matches.length === 0) {
        matches = await searchMatchingAccounts(draft.mobileNumber.trim());
      }
      if (matches.length > 0 && matches[0]?.displayName) {
        setMatchedAccount(matches[0]);
        saveWizardTempState({ matchedAccount: matches[0] });
        navigate(`/signup/existing-account${querySuffix}`);
        return;
      }
    } catch {
      // Proceed to password if lookup fails
    } finally {
      setCheckingAccount(false);
    }
    navigate(`/signup/password${querySuffix}`);
  };

  const handleLoginExistingAccount = async () => {
    const activeMatch = matchedAccount || getWizardTempState().matchedAccount;
    if (!activeMatch) {
      navigate(`/signin${querySuffix}`);
      return;
    }

    setLoading(true);
    try {
      const savedEntry = savedAccounts.find(
        (acc) =>
          (activeMatch.uid && acc.uid === activeMatch.uid) ||
          (activeMatch.email &&
            acc.email.toLowerCase() === activeMatch.email.toLowerCase())
      );

      if (savedEntry && savedEntry.rememberLogin && savedEntry.password) {
        const cred = await signInWithEmailAndPassword(
          auth,
          savedEntry.email,
          savedEntry.password
        );
        upsertSavedAccount({
          ...savedEntry,
          uid: cred.user.uid,
          lastActive: Date.now(),
        });
        clearDraft();
        clearWizardTempState();
        notify(`Welcome back, ${activeMatch.displayName}!`, "success");
        playAuthVoice("আপনার আগের ডিপ শপ অ্যাকাউন্টে সফলভাবে লগইন হয়েছে।");
        const dest = await linkPendingGuestOrderAndResolveDestination(
          cred.user.uid,
          cred.user.email || savedEntry.email,
          location.search,
          "/"
        );
        navigate(dest);
        return;
      }
    } catch {
      // Fall through to SignIn screen with prefilled identifier
    } finally {
      setLoading(false);
    }

    const hint =
      formatAccountContact(activeMatch.email, activeMatch.phoneNumber) ||
      draft.mobileNumber.trim() ||
      draft.email.trim();
    clearDraft();
    clearWizardTempState();
    const nextParams = new URLSearchParams(location.search);
    if (hint) {
      nextParams.set("login_hint", hint);
    }
    const qs = nextParams.toString();
    navigate(`/signin${qs ? `?${qs}` : ""}`);
  };

  const handleNextFromPassword = (e: React.FormEvent) => {
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

    saveWizardTempState({ password });
    navigate(`/signup/terms${querySuffix}`);
  };

  const handleAgreeAndCreateAccount = async () => {
    const effectivePassword =
      password || getWizardTempState().password || "";
    const pwdState = checkPasswordRules(effectivePassword);
    if (!pwdState.isAllValid) {
      navigate(`/signup/password${querySuffix}`);
      return;
    }

    const fullName = `${draft.firstName.trim()} ${draft.surname.trim()}`.trim();
    const fullNameCheck = validateRealPersonName(fullName, "পূর্ণ নাম");
    if (!fullName || !fullNameCheck.isValid) {
      if (fullNameCheck.errorMsg) {
        notify(fullNameCheck.errorMsg, "error");
        playAuthVoice(fullNameCheck.errorMsg);
      }
      navigate(
        `/signup/${roleParam === "seller" ? "seller" : "name"}${querySuffix}`
      );
      return;
    }

    let authEmail = "";
    let savedPhone = "";
    let isSyntheticPhoneAuth = false;
    let phoneDigits = "";

    if (draft.contactMode === "mobile" && roleParam !== "seller") {
      const variants = normalizeBdPhoneVariants(draft.mobileNumber);
      authEmail = variants.phoneAuthEmail;
      savedPhone = variants.e164Bd;
      phoneDigits = variants.digitsOnly;
      isSyntheticPhoneAuth = true;
    } else {
      authEmail = draft.email.trim().toLowerCase();
      const emailCheck = validateRealEmail(authEmail);
      if (!emailCheck.isValid) {
        notify(emailCheck.errorMsg, "error");
        playAuthVoice(emailCheck.errorMsg);
        navigate(
          `/signup/${roleParam === "seller" ? "seller" : "email"}${querySuffix}`
        );
        return;
      }
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
      let cred;
      try {
        cred = await createUserWithEmailAndPassword(
          auth,
          authEmail,
          effectivePassword
        );
      } catch (firstErr: any) {
        if (
          isSyntheticPhoneAuth &&
          firstErr?.code === "auth/email-already-in-use"
        ) {
          authEmail = `${phoneDigits}.${Date.now().toString(
            36
          )}@phone.deepshop.local`;
          cred = await createUserWithEmailAndPassword(
            auth,
            authEmail,
            effectivePassword
          );
        } else {
          throw firstErr;
        }
      }

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
        agreedToTermsAt: Date.now(),
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
        password: draft.rememberLogin ? effectivePassword : "",
        rememberLogin: draft.rememberLogin,
        displayName: fullName,
        photoURL: "",
        provider: "password",
        lastActive: Date.now(),
      });

      const defaultDest =
        roleParam === "seller" ? "/seller/dashboard" : "/";
      const dest = await linkPendingGuestOrderAndResolveDestination(
        user.uid,
        authEmail,
        location.search,
        defaultDest
      );

      clearDraft();
      saveWizardTempState({
        password: "",
        matchedAccount: null,
        postSignupDest: dest,
        uploadedPhotoUrl: "",
      });

      notify("Welcome to DEEP SHOP! Account created.", "success");
      playAuthVoice(
        roleParam === "seller"
          ? "অভিনন্দন! আপনার ডিপ শপ সেলার অ্যাকাউন্ট তৈরি হয়েছে। এখন একটি প্রোফাইল ছবি যোগ করুন।"
          : "অভিনন্দন! আপনার ডিপ শপ অ্যাকাউন্ট তৈরি হয়েছে। এখন একটি প্রোফাইল ছবি যোগ করুন।"
      );

      navigate(`/signup/profile-picture${querySuffix}`);
    } catch (err: any) {
      if (err?.code === "auth/email-already-in-use") {
        notify(
          "This email address is already registered on DEEP SHOP. Please sign in or use another email.",
          "error"
        );
        playAuthVoice(
          "এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট রয়েছে। অনুগ্রহ করে লগইন করুন অথবা অন্য ইমেইল ব্যবহার করুন।"
        );
        navigate(
          `/signup/${
            roleParam === "seller" ? "seller" : "email"
          }${querySuffix}`
        );
      } else {
        notify(getFriendlyErrorMessage(err), "error");
        playAuthVoice(getBanglaAuthErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePicturePick = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadingPicture(true);
    try {
      const processed = await processCleanImage(file);
      const hostedUrl = await uploadDataUrlToImgbb(
        processed.dataUrl,
        `avatar-${Date.now()}.jpg`,
        { requireRemote: true }
      );

      const user = auth.currentUser;
      if (user) {
        await updateProfile(user, { photoURL: hostedUrl });
        await setDoc(
          doc(db, "users", user.uid),
          {
            photoURL: hostedUrl,
            avatar: hostedUrl,
            updatedAt: Date.now(),
          },
          { merge: true }
        );

        const existingSaved = getSavedAccounts().find(
          (a) => a.uid === user.uid
        );
        if (existingSaved) {
          upsertSavedAccount({
            ...existingSaved,
            photoURL: hostedUrl,
            lastActive: Date.now(),
          });
        }
      }

      setUploadedPhotoUrl(hostedUrl);
      saveWizardTempState({ uploadedPhotoUrl: hostedUrl });
      notify("Profile picture added!", "success");
      playAuthVoice(
        "প্রোফাইল ছবি সফলভাবে যুক্ত হয়েছে। সামনে এগিয়ে যেতে কন্টিনিউ বাটনে ট্যাপ করুন।"
      );
    } catch {
      notify("Could not upload profile picture. Please try again.", "error");
      playAuthVoice("ছবি আপলোড করা যায়নি, অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setUploadingPicture(false);
    }
  };

  const finishOnboardingAndNavigate = () => {
    const temp = getWizardTempState();
    const defaultDest = roleParam === "seller" ? "/seller/dashboard" : "/";
    const dest = temp.postSignupDest || defaultDest;
    clearDraft();
    clearWizardTempState();
    navigate(dest, { replace: true });
  };

  const persistPushPreferenceAndWelcome = async (enabled: boolean) => {
    const uid = auth.currentUser?.uid;
    try {
      localStorage.setItem(
        "deepshop_push_optin_v1",
        enabled ? "granted" : "denied"
      );
    } catch {
      // Ignore storage error
    }
    if (uid) {
      await setDoc(
        doc(db, "users", uid),
        {
          notificationsEnabled: enabled,
          pushAlertsOptIn: enabled,
          updatedAt: Date.now(),
        },
        { merge: true }
      ).catch(() => {});

      if (enabled) {
        await addDoc(collection(db, "news_hub_notifications"), {
          recipientId: uid,
          senderId: "system",
          senderName: "DEEP SHOP",
          senderAvatar: "",
          type: "system",
          text: "Push notifications are now active for your orders, messages, and Loops activity.",
          link: "/",
          read: false,
          createdAt: Date.now(),
        }).catch(() => {});
      }
    }
  };

  const handleRequestNotificationsAndFinish = async () => {
    // Synchronously request OS/Browser permission directly inside user click gesture
    const permPromise = requestBrowserNotificationPermissionWithMeta();
    setRequestingPush(true);
    try {
      const permResult = await permPromise;

      if (permResult.permission === "granted") {
        await subscribeToWebPush(auth.currentUser?.uid, "granted").catch(
          () => {}
        );
        await persistPushPreferenceAndWelcome(true);
        notify("Push notifications enabled!", "success");
        playAuthVoice("পুশ নোটিফিকেশন চালু হয়েছে। ডিপ শপে আপনাকে স্বাগতম!");
        setRequestingPush(false);
        finishOnboardingAndNavigate();
        return;
      }

      const isEmbeddedContext =
        typeof window !== "undefined" && window.self !== window.top;
      const wasSuppressedWithoutPrompt =
        permResult.permission === "unsupported" ||
        (permResult.permission === "denied" &&
          (permResult.wasPreDenied ||
            permResult.elapsedMs < 180 ||
            isEmbeddedContext));

      if (wasSuppressedWithoutPrompt) {
        setRequestingPush(false);
        setShowPushPromptModal(true);
        playAuthVoice(
          "ডিপ শপ থেকে নোটিফিকেশন পেতে অ্যালাউ বাটনে ট্যাপ করুন।"
        );
        return;
      }

      await persistPushPreferenceAndWelcome(false);
      setRequestingPush(false);
      finishOnboardingAndNavigate();
    } catch {
      setRequestingPush(false);
      setShowPushPromptModal(true);
    }
  };

  const handleConfirmFallbackPushAllow = async () => {
    const retryPermPromise = requestBrowserNotificationPermissionWithMeta();
    setRequestingPush(true);
    try {
      const retryRes = await retryPermPromise;
      if (retryRes.permission === "granted") {
        await subscribeToWebPush(auth.currentUser?.uid, "granted").catch(
          () => {}
        );
      }
      await persistPushPreferenceAndWelcome(true);
      notify("Push notifications enabled!", "success");
      playAuthVoice("পুশ নোটিফিকেশন চালু হয়েছে। ডিপ শপে আপনাকে স্বাগতম!");
    } finally {
      setRequestingPush(false);
      setShowPushPromptModal(false);
      finishOnboardingAndNavigate();
    }
  };

  const handleDeclinePushPrompt = async () => {
    setShowPushPromptModal(false);
    setRequestingPush(true);
    try {
      await persistPushPreferenceAndWelcome(false);
    } finally {
      setRequestingPush(false);
      finishOnboardingAndNavigate();
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
              onFocus={() =>
                playAuthVoice("এখানে আপনার দোকান বা প্রতিষ্ঠানের নাম লিখুন।")
              }
              onChange={(v) => {
                updateDraft({ shopName: v });
                if (fieldError) setFieldError("");
              }}
            />

            <DeepShopFloatingInput
              label="Owner full name (as per NID)"
              value={draft.firstName}
              onFocus={() =>
                playAuthVoice(
                  "জাতীয় পরিচয়পত্র বা এন আই ডি কার্ড অনুযায়ী মালিকের পূর্ণ নাম লিখুন।"
                )
              }
              onChange={(v) => {
                updateDraft({ firstName: v });
                if (fieldError) setFieldError("");
              }}
            />

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  updateDraft({ storeType: "online" });
                  if (fieldError) setFieldError("");
                  playAuthVoice("অনলাইন স্টোর নির্বাচন করা হয়েছে।");
                }}
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
                onClick={() => {
                  updateDraft({ storeType: "physical" });
                  if (fieldError) setFieldError("");
                  playAuthVoice(
                    "ফিজিক্যাল শোরুম নির্বাচন করা হয়েছে। নিচে দোকানের ঠিকানা লিখুন।"
                  );
                }}
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
                onFocus={() =>
                  playAuthVoice(
                    "আপনার দোকানের নম্বর এবং মার্কেটের পূর্ণ ঠিকানা লিখুন।"
                  )
                }
                onChange={(v) => {
                  updateDraft({ shopAddress: v });
                  if (fieldError) setFieldError("");
                }}
              />
            )}

            <DeepShopFloatingInput
              label="Seller mobile number"
              type="tel"
              value={draft.mobileNumber}
              onFocus={() =>
                playAuthVoice("সেলারের সচল মোবাইল নম্বরটি লিখুন।")
              }
              onChange={(v) => {
                updateDraft({ mobileNumber: v });
                if (fieldError) setFieldError("");
              }}
            />

            <DeepShopFloatingInput
              label="Email address"
              type="email"
              value={draft.email}
              onFocus={() =>
                playAuthVoice(
                  "আপনার ব্যবসার অথবা ব্যক্তিগত আসল ইমেইল ঠিকানাটি লিখুন।"
                )
              }
              onChange={(v) => {
                updateDraft({ email: v });
                if (fieldError) setFieldError("");
              }}
            />

            {fieldError && (
              <p className="px-1 text-[13px] font-medium text-red-600 dark:text-red-400">
                {fieldError}
              </p>
            )}

            <button
              type="submit"
              disabled={checkingAccount}
              className="w-full h-[48px] rounded-full bg-[#0064e0] hover:bg-[#0056c1] active:scale-[0.99] disabled:opacity-60 text-white font-semibold text-[16px] flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {checkingAccount && <Loader2 className="w-5 h-5 animate-spin" />}
              <span>{checkingAccount ? "Checking..." : "Next"}</span>
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
                onFocus={() =>
                  playAuthVoice("আপনার নামের প্রথম অংশ এখানে লিখুন।")
                }
                onChange={(v) => {
                  updateDraft({ firstName: v });
                  if (fieldError) setFieldError("");
                }}
                autoComplete="given-name"
              />
              <DeepShopFloatingInput
                label="Surname"
                value={draft.surname}
                onFocus={() =>
                  playAuthVoice("আপনার পদবি বা নামের শেষ অংশ লিখুন।")
                }
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
              onClick={() => {
                setShowDatePickerSheet(true);
                playAuthVoice(
                  "দিন, মাস এবং জন্ম সাল নির্বাচন করে সেট বাটনে ট্যাপ করুন।"
                );
              }}
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

        <BirthdaysInfoSheet
          isOpen={showBirthdayInfo}
          onClose={() => setShowBirthdayInfo(false)}
        />

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
              <button
                type="button"
                onClick={() => {
                  updateDraft({ gender: "female" });
                  setFieldError("");
                  playAuthVoice("নারী নির্বাচন করা হয়েছে।");
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

              <button
                type="button"
                onClick={() => {
                  updateDraft({ gender: "male" });
                  setFieldError("");
                  playAuthVoice("পুরুষ নির্বাচন করা হয়েছে।");
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

              <div className="w-full">
                <button
                  type="button"
                  onClick={() => {
                    updateDraft({ gender: "more" });
                    setFieldError("");
                    playAuthVoice("অন্যান্য অপশন নির্বাচন করা হয়েছে।");
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
                onFocus={() =>
                  playAuthVoice("আপনার এগারো সংখ্যার সচল মোবাইল নম্বরটি লিখুন।")
                }
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
                disabled={checkingAccount}
                className="w-full h-[48px] rounded-full bg-[#0064e0] hover:bg-[#0056c1] active:scale-[0.99] disabled:opacity-60 text-white font-semibold text-[16px] flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {checkingAccount && (
                  <Loader2 className="w-5 h-5 animate-spin" />
                )}
                <span>{checkingAccount ? "Checking..." : "Next"}</span>
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
                onFocus={() =>
                  playAuthVoice(
                    "এখানে আপনার আসল ইমেইল ঠিকানা যেমন জিমেইল বা আউটলুক লিখুন।"
                  )
                }
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
                disabled={checkingAccount}
                className="w-full h-[48px] rounded-full bg-[#0064e0] hover:bg-[#0056c1] active:scale-[0.99] disabled:opacity-60 text-white font-semibold text-[16px] flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {checkingAccount && (
                  <Loader2 className="w-5 h-5 animate-spin" />
                )}
                <span>{checkingAccount ? "Checking..." : "Next"}</span>
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

  // STEP 4C: Existing Account Detected (IMG_5164 — Real User Details Only, DEEP SHOP Branding)
  if (currentStep === "existing-account") {
    const activeMatch = matchedAccount || getWizardTempState().matchedAccount;
    const realFullName = activeMatch?.displayName?.trim() || "";
    const firstNameLabel = realFullName.split(/\s+/)[0] || "Account";
    const realContactLabel = activeMatch
      ? formatAccountContact(activeMatch.email, activeMatch.phoneNumber) ||
        (draft.contactMode === "mobile"
          ? normalizeBdPhoneVariants(draft.mobileNumber).e164Bd
          : draft.email.trim())
      : draft.contactMode === "mobile"
      ? normalizeBdPhoneVariants(draft.mobileNumber).e164Bd
      : draft.email.trim();

    if (!activeMatch || !realFullName) {
      return (
        <DeepShopAuthShell onBack={handleBackNavigation}>
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
            <p className="text-[15px] text-[#5e6c77] dark:text-zinc-400">
              Continue setting up your DEEP SHOP account.
            </p>
            <button
              type="button"
              onClick={() => navigate(`/signup/password${querySuffix}`)}
              className="w-full h-[48px] rounded-full bg-[#0064e0] hover:bg-[#0056c1] text-white font-semibold text-[16px] cursor-pointer"
            >
              Continue
            </button>
          </div>
        </DeepShopAuthShell>
      );
    }

    return (
      <>
        <SEO
          title="You already have a DEEP SHOP account"
          description="Log in to your existing DEEP SHOP account or continue creating a new one."
          canonical="/signup/existing-account"
        />
        <DeepShopAuthShell
          onBack={handleBackNavigation}
          desktopHeadline="Welcome back to DEEP SHOP."
          desktopSubtext="We found an existing DEEP SHOP account linked to your contact info. Log back in with one tap or continue creating a new profile."
        >
          <div className="flex-1 flex flex-col pt-2 pb-4">
            <div className="text-center space-y-2.5 px-1">
              <h1 className="text-[25px] sm:text-[27px] font-bold tracking-tight leading-[1.22] text-[#0a1317] dark:text-white [text-wrap:balance]">
                You already have a DEEP SHOP account
              </h1>
              <p className="text-[15px] leading-[1.42] text-[#1c2b33] dark:text-zinc-300 max-w-[340px] mx-auto">
                We can log you in to your existing account or you can continue
                creating a new one.
              </p>
            </div>

            <div className="my-7 flex flex-col items-center justify-center">
              <DefaultUserAvatar
                photoURL={activeMatch.photoURL}
                displayName={realFullName}
                sizeClass="w-[168px] h-[168px] sm:w-[176px] sm:h-[176px]"
              />

              <h2 className="mt-5 text-[23px] sm:text-[24px] font-bold tracking-tight text-center text-[#0a1317] dark:text-white">
                {realFullName}
              </h2>
              {realContactLabel && (
                <p className="mt-1 text-[16px] font-normal text-center text-[#1c2b33] dark:text-zinc-300">
                  {realContactLabel}
                </p>
              )}
            </div>

            <div className="space-y-3 mt-1">
              <button
                type="button"
                disabled={loading}
                onClick={handleLoginExistingAccount}
                className="w-full h-[48px] rounded-full bg-[#0064e0] hover:bg-[#0056c1] active:scale-[0.99] disabled:opacity-60 text-white font-semibold text-[15.5px] sm:text-[16px] flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                <span>Yes, log in as {firstNameLabel}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playAuthVoice(
                    "নতুন অ্যাকাউন্ট তৈরি চালিয়ে যেতে পাসওয়ার্ড তৈরি করুন।"
                  );
                  navigate(`/signup/password${querySuffix}`);
                }}
                className="w-full h-[48px] rounded-full bg-[#f0f2f5] hover:bg-[#e4e6eb] dark:bg-zinc-800 dark:hover:bg-zinc-700 active:scale-[0.99] text-[#0a1317] dark:text-zinc-100 font-semibold text-[15.5px] sm:text-[16px] transition cursor-pointer"
              >
                Continue creating account
              </button>
            </div>
          </div>
        </DeepShopAuthShell>
      </>
    );
  }

  // STEP 6: Agree to DEEP SHOP's Terms & Policies (IMG_5165)
  if (currentStep === "terms") {
    return (
      <>
        <SEO
          title="Agree to DEEP SHOP's terms and policies"
          description="Review and agree to DEEP SHOP's terms, Privacy Policy, and Cookies Policy to create your account."
          canonical="/signup/terms"
        />
        <DeepShopAuthShell
          onBack={handleBackNavigation}
          onMoreClick={() => setShowStopModal(true)}
          desktopHeadline="Transparent terms & privacy protection."
          desktopSubtext="Your orders, messages, and personal account details are protected under DEEP SHOP's security standards."
          footer={bottomFindAccountLink}
        >
          <div className="space-y-4 pt-1">
            <h1 className="text-[26px] font-bold tracking-tight leading-[1.2] text-[#0a1317] dark:text-white">
              Agree to DEEP SHOP&apos;s terms and policies
            </h1>

            <div className="space-y-4 text-[15px] leading-[1.45] text-[#0a1317] dark:text-zinc-200 pt-1">
              <p>
                People who use our service may have uploaded your contact
                information to DEEP SHOP.{" "}
                <button
                  type="button"
                  onClick={() => setShowTermsLearnMoreSheet(true)}
                  className="text-[#0064e0] dark:text-[#4599ff] hover:underline font-normal cursor-pointer"
                >
                  Learn more
                </button>
              </p>

              <p>
                By tapping <strong className="font-bold">I agree</strong>, you
                agree to create an account and to DEEP SHOP&apos;s{" "}
                <Link
                  to="/terms"
                  className="text-[#0064e0] dark:text-[#4599ff] hover:underline"
                >
                  terms
                </Link>
                ,{" "}
                <Link
                  to="/privacy"
                  className="text-[#0064e0] dark:text-[#4599ff] hover:underline"
                >
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link
                  to="/cookie-policy"
                  className="text-[#0064e0] dark:text-[#4599ff] hover:underline"
                >
                  Cookies Policy
                </Link>
                .
              </p>

              <p>
                The{" "}
                <Link
                  to="/privacy"
                  className="text-[#0064e0] dark:text-[#4599ff] hover:underline"
                >
                  Privacy Policy
                </Link>{" "}
                describes the ways we can use the information we collect when
                you create an account. For example, we use this information to
                provide, personalise and improve our products, including ads.
              </p>
            </div>

            <div className="pt-3">
              <button
                type="button"
                disabled={loading}
                onClick={handleAgreeAndCreateAccount}
                className="w-full h-[48px] rounded-full bg-[#0064e0] hover:bg-[#0056c1] active:scale-[0.99] disabled:opacity-60 text-white font-semibold text-[16px] flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                <span>{loading ? "Creating account..." : "I agree"}</span>
              </button>
            </div>
          </div>
        </DeepShopAuthShell>

        <AnimatePresence>
          {showTermsLearnMoreSheet && (
            <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowTermsLearnMoreSheet(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
              />
              <motion.div
                initial={{ y: "100%", opacity: 0.6 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                className="relative z-10 w-full sm:max-w-[430px] bg-white dark:bg-[#182028] rounded-t-[28px] sm:rounded-[28px] pb-7 pt-2.5 shadow-2xl border-t sm:border border-zinc-200 dark:border-zinc-800"
              >
                <div className="w-10 h-1 rounded-full bg-[#cbd2d9] dark:bg-zinc-600 mx-auto mb-2" />
                <div className="relative flex items-center justify-center h-12 px-4 border-b border-[#e5e8ec] dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowTermsLearnMoreSheet(false)}
                    className="absolute left-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="text-[17px] font-bold text-[#0a1317] dark:text-white">
                    Contact information on DEEP SHOP
                  </h3>
                </div>
                <div className="px-6 pt-5 text-[15px] leading-relaxed text-[#1c2b33] dark:text-zinc-200 space-y-3">
                  <p>
                    DEEP SHOP uses your phone number or email address to link
                    your marketplace orders, delivery updates, and account
                    security alerts accurately.
                  </p>
                  <p>
                    Your contact details remain private and are never displayed
                    publicly on your Loops profile.
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
  }

  // STEP 7: Add a Profile Picture (IMG_5166)
  if (currentStep === "profile-picture") {
    return (
      <>
        <SEO
          title="Add a profile picture — DEEP SHOP"
          description="Add a profile picture so your friends and community recognize you on DEEP SHOP."
          canonical="/signup/profile-picture"
        />
        <input
          ref={profilePhotoInputRef}
          type="file"
          accept="image/*"
          onChange={handleProfilePicturePick}
          className="hidden"
        />
        <DeepShopAuthShell
          hideBack
          desktopHeadline="Make your DEEP SHOP profile yours."
          desktopSubtext="Upload a profile photo so buyers, sellers, and friends on Loops recognize you right away."
          footer={
            <div className="border-t border-[#e5e8ec] dark:border-zinc-800 pt-3.5 -mx-5 sm:-mx-7 lg:-mx-8 px-5 sm:px-7 lg:px-8 space-y-2.5">
              {uploadedPhotoUrl ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/signup/notifications${querySuffix}`)
                    }
                    className="w-full h-[48px] rounded-full bg-[#0064e0] hover:bg-[#0056c1] active:scale-[0.99] text-white font-semibold text-[16px] transition cursor-pointer"
                  >
                    Continue
                  </button>
                  <button
                    type="button"
                    disabled={uploadingPicture}
                    onClick={() => profilePhotoInputRef.current?.click()}
                    className="w-full h-[48px] rounded-full bg-[#f0f2f5] hover:bg-[#e4e6eb] dark:bg-zinc-800 dark:hover:bg-zinc-700 active:scale-[0.99] text-[#0a1317] dark:text-zinc-100 font-semibold text-[16px] transition cursor-pointer"
                  >
                    Change picture
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={uploadingPicture}
                    onClick={() => profilePhotoInputRef.current?.click()}
                    className="w-full h-[48px] rounded-full bg-[#0064e0] hover:bg-[#0056c1] active:scale-[0.99] disabled:opacity-60 text-white font-semibold text-[16px] flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {uploadingPicture && (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    )}
                    <span>
                      {uploadingPicture ? "Uploading picture..." : "Add picture"}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={uploadingPicture}
                    onClick={() =>
                      navigate(`/signup/notifications${querySuffix}`)
                    }
                    className="w-full h-[48px] rounded-full bg-[#f0f2f5] hover:bg-[#e4e6eb] dark:bg-zinc-800 dark:hover:bg-zinc-700 active:scale-[0.99] text-[#0a1317] dark:text-zinc-100 font-semibold text-[16px] transition cursor-pointer"
                  >
                    Skip
                  </button>
                </>
              )}
            </div>
          }
        >
          <div className="flex-1 flex flex-col pt-1">
            <div className="space-y-2">
              <h1 className="text-[26px] font-bold tracking-tight leading-[1.2] text-[#0a1317] dark:text-white">
                Add a profile picture
              </h1>
              <p className="text-[15px] leading-[1.45] text-[#0a1317] dark:text-zinc-300">
                Add a profile picture so that your friends know it&apos;s you.
                Everyone will be able to see your picture.
              </p>
            </div>

            <div className="flex-1 flex items-center justify-center py-8">
              <button
                type="button"
                disabled={uploadingPicture}
                onClick={() => profilePhotoInputRef.current?.click()}
                aria-label="Choose profile picture"
                className="relative w-[188px] h-[188px] rounded-full overflow-hidden flex items-center justify-center transition active:scale-[0.98] cursor-pointer focus:outline-none"
              >
                {uploadedPhotoUrl ? (
                  <img
                    src={uploadedPhotoUrl}
                    alt="Profile preview"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <svg
                    viewBox="0 0 200 200"
                    className="w-full h-full"
                    aria-hidden="true"
                  >
                    <circle
                      cx="100"
                      cy="100"
                      r="100"
                      className="fill-[#cbd2d9] dark:fill-zinc-700"
                    />
                    <circle
                      cx="100"
                      cy="78"
                      r="28"
                      className="fill-[#eef1f4] dark:fill-zinc-400"
                    />
                    <path
                      d="M32 184c9-36 35-58 68-58s59 22 68 58"
                      className="fill-[#eef1f4] dark:fill-zinc-400"
                    />
                  </svg>
                )}

                {uploadingPicture && (
                  <div className="absolute inset-0 bg-black/35 flex items-center justify-center rounded-full">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </button>
            </div>
          </div>
        </DeepShopAuthShell>
      </>
    );
  }

  // STEP 8: Allow Push Notifications (IMG_5167 layout adapted for Push Notifications)
  if (currentStep === "notifications") {
    return (
      <>
        <SEO
          title="Allow notifications — DEEP SHOP"
          description="Turn on push notifications to receive instant DEEP SHOP order updates, messages, and community alerts."
          canonical="/signup/notifications"
        />
        <DeepShopAuthShell
          hideBack
          desktopHeadline="Stay updated in real time."
          desktopSubtext="Turn on push notifications so you never miss delivery status updates, seller replies, or Loops activity."
          footer={
            <div className="space-y-3">
              <p className="text-[12.5px] leading-[1.4] text-center text-[#5e6c77] dark:text-zinc-400 px-1">
                Notifications are delivered instantly to your device. You can
                manage notification preferences at any time in Settings.
              </p>
              <button
                type="button"
                disabled={requestingPush}
                onClick={handleRequestNotificationsAndFinish}
                className="w-full h-[48px] rounded-[12px] bg-[#0064ff] hover:bg-[#0056c1] active:scale-[0.99] disabled:opacity-60 text-white font-semibold text-[16px] flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {requestingPush && (
                  <Loader2 className="w-5 h-5 animate-spin" />
                )}
                <span>{requestingPush ? "Allowing..." : "Next"}</span>
              </button>
            </div>
          }
        >
          <div className="flex-1 flex flex-col pt-1">
            <div className="space-y-2">
              <h1 className="text-[26px] font-bold tracking-tight leading-[1.2] text-[#0a1317] dark:text-white">
                To get updates faster, allow notifications
              </h1>
              <p className="text-[15px] leading-[1.42] text-[#5e6c77] dark:text-zinc-300">
                Get instant alerts for your DEEP SHOP orders, messages, and
                community activity. Next, you can decide if you want to allow
                push notifications.{" "}
                <button
                  type="button"
                  onClick={() => setShowNotificationsInfoSheet(true)}
                  className="text-[#0064e0] dark:text-[#4599ff] font-semibold hover:underline cursor-pointer"
                >
                  Learn more
                </button>
              </p>
            </div>

            {/* Center Permission Preview Card matching IMG_5167 */}
            <div className="flex-1 flex items-center justify-center py-8">
              <div className="w-[264px] sm:w-[276px] rounded-[20px] border border-[#dfe3e8] dark:border-zinc-700/80 bg-[#f8f9fa] dark:bg-zinc-900/90 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <div className="space-y-3 pt-1">
                  <div className="h-[13px] w-full rounded-full bg-[#cfd4da] dark:bg-zinc-700" />
                  <div className="h-[13px] w-full rounded-full bg-[#cfd4da] dark:bg-zinc-700" />
                  <div className="h-[13px] w-[76%] rounded-full bg-[#cfd4da] dark:bg-zinc-700" />
                </div>

                <div className="mt-9 space-y-2.5">
                  <button
                    type="button"
                    disabled={requestingPush}
                    onClick={handleDeclinePushPrompt}
                    className="w-full h-[40px] rounded-full bg-[#cfd4da] hover:bg-[#c2c8cf] dark:bg-zinc-700 dark:hover:bg-zinc-600 text-[#0a1317] dark:text-zinc-100 text-[14px] font-medium flex items-center justify-center transition cursor-pointer"
                  >
                    Don&apos;t allow
                  </button>
                  <button
                    type="button"
                    disabled={requestingPush}
                    onClick={handleRequestNotificationsAndFinish}
                    className="w-full h-[40px] rounded-full bg-[#000000] hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black text-[14px] font-medium flex items-center justify-center transition cursor-pointer"
                  >
                    Allow
                  </button>
                </div>
              </div>
            </div>
          </div>
        </DeepShopAuthShell>

        <AnimatePresence>
          {showPushPromptModal && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center px-5">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/55 backdrop-blur-[2px]"
              />
              <motion.div
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.94, opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="deepshop-push-dialog-title"
                className="relative z-10 w-full max-w-[330px] rounded-[24px] bg-white dark:bg-[#1c242c] border border-zinc-200/80 dark:border-zinc-700/80 shadow-2xl overflow-hidden"
              >
                <div className="px-6 pt-6 pb-5 text-center space-y-2.5">
                  <div className="w-11 h-11 rounded-full bg-[#0064ff]/10 dark:bg-[#4599ff]/15 text-[#0064ff] dark:text-[#4599ff] flex items-center justify-center mx-auto">
                    <Bell className="w-5 h-5" />
                  </div>
                  <h3
                    id="deepshop-push-dialog-title"
                    className="text-[17px] font-bold leading-snug text-[#0a1317] dark:text-white"
                  >
                    &ldquo;DEEP SHOP&rdquo; Would Like to Send You Notifications
                  </h3>
                  <p className="text-[13.5px] leading-relaxed text-[#5e6c77] dark:text-zinc-300">
                    Notifications may include order status alerts, direct
                    messages, and community activity updates. These can be
                    configured in Settings.
                  </p>
                </div>
                <div className="grid grid-cols-2 border-t border-zinc-200 dark:border-zinc-700/80 divide-x divide-zinc-200 dark:divide-zinc-700/80">
                  <button
                    type="button"
                    disabled={requestingPush}
                    onClick={handleDeclinePushPrompt}
                    className="min-h-[48px] text-[15px] font-medium text-[#5e6c77] dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition cursor-pointer"
                  >
                    Don&apos;t Allow
                  </button>
                  <button
                    type="button"
                    disabled={requestingPush}
                    onClick={handleConfirmFallbackPushAllow}
                    className="min-h-[48px] text-[15px] font-bold text-[#0064ff] dark:text-[#4599ff] hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {requestingPush && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    <span>Allow</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {showNotificationsInfoSheet && (
            <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowNotificationsInfoSheet(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
              />
              <motion.div
                initial={{ y: "100%", opacity: 0.6 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                className="relative z-10 w-full sm:max-w-[430px] bg-white dark:bg-[#182028] rounded-t-[28px] sm:rounded-[28px] pb-7 pt-2.5 shadow-2xl border-t sm:border border-zinc-200 dark:border-zinc-800"
              >
                <div className="w-10 h-1 rounded-full bg-[#cbd2d9] dark:bg-zinc-600 mx-auto mb-2" />
                <div className="relative flex items-center justify-center h-12 px-4 border-b border-[#e5e8ec] dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowNotificationsInfoSheet(false)}
                    className="absolute left-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="text-[17px] font-bold text-[#0a1317] dark:text-white">
                    Push notifications
                  </h3>
                </div>
                <div className="px-6 pt-5 text-[15px] leading-relaxed text-[#1c2b33] dark:text-zinc-200 space-y-3">
                  <p>
                    Allowing push notifications lets DEEP SHOP send real-time
                    updates when your order ships, when a seller messages you,
                    or when someone interacts with your Loops.
                  </p>
                  <p>
                    You can turn push notifications on or off anytime from your
                    DEEP SHOP Settings page.
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
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
        <form onSubmit={handleNextFromPassword} className="space-y-4 pt-1">
          <div className="space-y-2">
            <h1 className="text-[26px] font-bold tracking-tight leading-[1.2] text-[#0a1317] dark:text-white">
              Create a password
            </h1>
            <p className="text-[15px] leading-[1.45] text-[#1c2b33] dark:text-zinc-300">
              Create a password with at least eight characters including
              uppercase, lowercase, numbers, and symbols. It should be something
              that others can&apos;t guess.
            </p>
          </div>

          <div className="pt-1 space-y-3">
            <DeepShopFloatingInput
              label="Password"
              value={password}
              onFocus={() =>
                playAuthVoice(
                  "বড় অক্ষর, ছোট অক্ষর, সংখ্যা এবং স্পেশাল চিহ্ন মিলিয়ে কমপক্ষে আট অক্ষরের পাসওয়ার্ড লিখুন।"
                )
              }
              onChange={(v) => {
                setPassword(v);
                if (fieldError) setFieldError("");
              }}
              isPassword
              errorText={fieldError}
              autoComplete="new-password"
            />

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
              className="w-full h-[48px] rounded-full bg-[#0064e0] hover:bg-[#0056c1] active:scale-[0.99] text-white font-semibold text-[16px] flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>Next</span>
            </button>
          </div>
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
