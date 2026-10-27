// Speech synthesis (Bangla voice assistance), Password Rules & Domain/Profanity Validation

export const ALLOWED_EMAIL_DOMAINS = [
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
  "icloud.com",
  "live.com",
  "msn.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "zoho.com",
  "gmx.com",
  "yandex.com",
  "mail.com",
  "me.com",
  "deepshop.top",
];

export const DISPOSABLE_EMAIL_DOMAINS = [
  "tempmail.com",
  "mailinator.com",
  "10minutemail.com",
  "guerrillamail.com",
  "sharklasers.com",
  "dispostable.com",
  "getnada.com",
  "trashmail.com",
  "yopmail.com",
];

export const INAPPROPRIATE_WORDS = [
  "admin",
  "root",
  "system",
  "deepshop_official",
  "fuck",
  "bitch",
  "bastard",
  "shit",
  "asshole",
  "dick",
  "cunt",
  "pussy",
  "whore",
  "slut",
  "nigger",
  "chutiya",
  "bhodai",
  "magi",
  "khanki",
  "bal",
  "salay",
  "sala",
  "boki",
  "chod",
  "chudi",
  "gandu",
  "harami",
  "madarchod",
  "bhenchod",
  "boker",
];

const VOICE_MUTE_KEY = "deepshop_auth_voice_muted_v1";

export const isAuthVoiceMuted = (): boolean => {
  try {
    return localStorage.getItem(VOICE_MUTE_KEY) === "true";
  } catch {
    return false;
  }
};

export const setAuthVoiceMuted = (muted: boolean) => {
  try {
    localStorage.setItem(VOICE_MUTE_KEY, muted ? "true" : "false");
    if (muted && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // Ignore storage error
  }
};

export const toggleAuthVoiceMute = (): boolean => {
  const current = isAuthVoiceMuted();
  const next = !current;
  setAuthVoiceMuted(next);
  return next;
};

export const playAuthVoice = (text: string, force = false) => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (!force && isAuthVoiceMuted()) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "bn-BD";
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const bnVoice = voices.find(
      (v) => v.lang.includes("bn") || v.lang.includes("BD")
    );
    if (bnVoice) {
      utterance.voice = bnVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore speech errors gracefully
  }
};

export const validateRealEmail = (
  email: string
): { isValid: boolean; errorMsg: string } => {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    return { isValid: false, errorMsg: "অনুগ্রহ করে আপনার ইমেইল প্রদান করুন।" };
  }

  const parts = trimmed.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return {
      isValid: false,
      errorMsg: "একটি সঠিক ইমেইল ঠিকানা প্রদান করুন (যেমন: example@gmail.com)।",
    };
  }

  const domain = parts[1];
  const isDisposable = DISPOSABLE_EMAIL_DOMAINS.some(
    (d) => domain === d || domain.endsWith("." + d)
  );

  if (isDisposable) {
    return {
      isValid: false,
      errorMsg: "ফেক বা টেম্পোরারি ইমেইল ব্যবহার করা যাবে না। আসল ইমেইল দিন।",
    };
  }

  const isAllowed = ALLOWED_EMAIL_DOMAINS.some(
    (d) => domain === d || domain.endsWith("." + d)
  );

  if (!isAllowed) {
    return {
      isValid: false,
      errorMsg:
        "শুধুমাত্র আসল ইমেইল যেমন Gmail, Outlook, Yahoo, iCloud ইত্যাদি গ্রহণযোগ্য। ভুয়া ইমেইল গ্রহণযোগ্য নয়।",
    };
  }

  return { isValid: true, errorMsg: "" };
};

export const validateInappropriateContent = (
  text: string,
  fieldName = "নাম"
): { isValid: boolean; errorMsg: string } => {
  const lower = text.toLowerCase().trim();
  if (!lower) return { isValid: true, errorMsg: "" };

  for (const word of INAPPROPRIATE_WORDS) {
    if (lower.includes(word)) {
      return {
        isValid: false,
        errorMsg: `আপনার ${fieldName}-এ অনাকাঙ্ক্ষিত বা অশালীন শব্দ সনাক্ত হয়েছে। অনুগ্রহ করে সঠিক তথ্য ব্যবহার করুন।`,
      };
    }
  }
  return { isValid: true, errorMsg: "" };
};

export interface PasswordRulesState {
  hasMinLen: boolean;   // Minimum 8 characters
  hasNumber: boolean;   // At least 1 number
  hasLower: boolean;    // At least 1 lowercase letter
  hasUpper: boolean;    // At least 1 uppercase letter
  hasSpecial: boolean;  // At least 1 special character
  isAllValid: boolean;
}

export const checkPasswordRules = (pwd: string): PasswordRulesState => {
  const hasMinLen = pwd.length >= 8;
  const hasNumber = /[0-9]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasUpper = /[A-Z]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
  const isAllValid =
    hasMinLen && hasNumber && hasLower && hasUpper && hasSpecial;
  return {
    hasMinLen,
    hasNumber,
    hasLower,
    hasUpper,
    hasSpecial,
    isAllValid,
  };
};
