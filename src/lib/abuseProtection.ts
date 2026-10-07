import { db, auth } from "../../firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";

// Strict Bangladeshi Phone Number Validator
export function validateBangladeshiPhone(rawPhone: string): {
  isValid: boolean;
  normalized: string;
  error?: string;
} {
  if (!rawPhone || typeof rawPhone !== "string") {
    return { isValid: false, normalized: "", error: "মোবাইল নম্বর লিখুন (Phone number required)" };
  }

  // Remove spaces, dashes, dots, parentheses
  let cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, "");

  // Convert Bengali numerals to English numerals if typed in Bangla (০-৯ -> 0-9)
  const bnToEn: Record<string, string> = {
    "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
    "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9"
  };
  cleaned = cleaned.replace(/[০-৯]/g, (char) => bnToEn[char] || char);

  // Strip international prefix +88 or 88
  if (cleaned.startsWith("+880")) {
    cleaned = "0" + cleaned.slice(4);
  } else if (cleaned.startsWith("880")) {
    cleaned = "0" + cleaned.slice(3);
  } else if (cleaned.startsWith("+88")) {
    cleaned = cleaned.slice(3);
  }

  // Must only contain digits
  if (!/^\d+$/.test(cleaned)) {
    return {
      isValid: false,
      normalized: cleaned,
      error: "নম্বরে শুধুমাত্র সংখ্যা ব্যবহার করুন (Only numbers allowed)"
    };
  }

  // Must be exactly 11 digits
  if (cleaned.length !== 11) {
    return {
      isValid: false,
      normalized: cleaned,
      error: "সঠিক ১১ ডিজিটের বাংলাদেশি নম্বর দিন (Must be exactly 11 digits)"
    };
  }

  // Must start with 013, 014, 015, 016, 017, 018, or 019
  // 013 (GP/Skitto), 014 (Banglalink), 015 (Teletalk), 016 (Airtel), 017 (GP), 018 (Robi), 019 (Banglalink)
  const validBdPrefixRegex = /^01[3-9]\d{8}$/;
  if (!validBdPrefixRegex.test(cleaned)) {
    return {
      isValid: false,
      normalized: cleaned,
      error: "অকার্যকর নম্বর! নম্বরটি 013, 014, 015, 016, 017, 018 অথবা 019 দিয়ে শুরু হতে হবে"
    };
  }

  // Reject dummy repetitive numbers (e.g. 11111111111, 01700000000, 01711111111)
  const repetitiveDummy = [
    "01111111111", "01000000000", "01700000000", "01800000000",
    "01900000000", "01600000000", "01500000000", "01300000000", "01400000000",
    "01711111111", "01811111111", "01911111111", "01712345678", "01234567890"
  ];
  if (repetitiveDummy.includes(cleaned)) {
    return {
      isValid: false,
      normalized: cleaned,
      error: "ভুয়া বা টেস্ট নম্বর গ্রহণযোগ্য নয়। আপনার আসল সচল নম্বর দিন।"
    };
  }

  // Check if last 8 digits are all identical (e.g. 01777777777)
  const lastEight = cleaned.slice(3);
  if (/^(\d)\1{7}$/.test(lastEight)) {
    return {
      isValid: false,
      normalized: cleaned,
      error: "সঠিক সক্রিয় বাংলাদেশি মোবাইল নম্বর দিন।"
    };
  }

  return { isValid: true, normalized: cleaned };
}

// Comprehensive Profanity & Slur Dictionary (English + Banglish + Bangla Script)
const PROFANITY_WORDS: string[] = [
  // English
  "fuck", "fucking", "fucked", "fucker", "fuk", "f*ck", "f**k", "motherfucker", "mf",
  "shit", "bitch", "cunt", "asshole", "bastard", "dick", "pussy", "gawk", "slut", "whore",
  "porn", "boobs", "vagina", "penis", "blowjob", "handjob", "retard", "nigger", "nigga",

  // Banglish / Romanized Bangla Curse Words
  "banchod", "bonchod", "baanchod", "banchot", "bainchod",
  "madarchod", "maderchod", "maderchud", "maderchut", "mc", "bc",
  "chod", "chud", "chudi", "chuda", "chodna", "chodani", "chudani",
  "khanki", "khankir", "khankirpola", "khankir pola", "khankir chele",
  "magi", "maagi", "magir", "magirpola", "magir pola", "magir chele",
  "bsdk", "bhosdike", "bhosadike", "chutia", "chutiya", "chutya",
  "pod", "podmarani", "gandu", "gando",
  "bal", "baal", "chudaibal", "balfal", "balchhal",
  "bichi", "bichhi",
  "shala", "sala", "shali", "sali", "kutta", "kuttar", "kuttarbaccha", "kuttar baccha",
  "shourer", "shourerbaccha", "shourer baccha", "sowar",
  "randi", "rendi", "beshya", "bessha",
  "haramzada", "haramjada", "harami", "haramkhor",
  "tor ma", "tor mare", "tor bap", "tor baper",

  // Bengali Script Curse Words
  "মাগী", "মাগি", "খানকি", "খানকির", "খানকিরপোলা", "খানকির পোলা", "খানকির ছেলে",
  "মাদারচোদ", "বোনচোদ", "বাইনচোদ",
  "চোদ", "চুদি", "চোদা", "চোদনা", "চোদানী", "চুদানির",
  "বাঁড়", "বেশ্যা", "কুত্তা", "কুত্তার বাচ্চা", "শুয়োর", "শুয়োর", "শুয়োরের বাচ্চা",
  "চুতিয়া", "বাল", "বিচি", "হারামজাদা", "হারামি", "হারামখোর", "রাঁড়ি", "রান্ডি",
  "গান্ডু", "পোদে", "পোদ"
];

// Pre-computed set for fast lookup
const PROFANITY_SET = new Set(PROFANITY_WORDS.map(w => w.toLowerCase().trim()).filter(Boolean));

// Helper to normalize text (remove leetspeak)
function cleanStringForCheck(input: string): string {
  if (!input) return "";
  let text = input.toLowerCase();

  // Replace common leetspeak
  text = text
    .replace(/@/g, "a")
    .replace(/\$/g, "s")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/!/g, "i")
    .replace(/3/g, "e")
    .replace(/5/g, "s")
    .replace(/7/g, "t");

  return text;
}

// Tokenize text into words by punctuation and whitespace (safe static regex)
function tokenizeText(str: string): string[] {
  return str
    .toLowerCase()
    .replace(/[.,!?;:()_\-\/\\*#%^&~+=[\]{}|'"`]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

// Detect Profanity safely without invalid dynamic RegExp crashes
export function detectAbuse(input: string): {
  hasAbuse: boolean;
  matchedWord?: string;
} {
  try {
    if (!input || typeof input !== "string") {
      return { hasAbuse: false };
    }

    const raw = input.toLowerCase();
    const cleaned = cleanStringForCheck(input);

    // 1. Token-based exact matching
    const rawTokens = tokenizeText(raw);
    for (const t of rawTokens) {
      if (PROFANITY_SET.has(t)) {
        return { hasAbuse: true, matchedWord: t };
      }
    }

    const cleanedTokens = tokenizeText(cleaned);
    for (const t of cleanedTokens) {
      if (PROFANITY_SET.has(t)) {
        return { hasAbuse: true, matchedWord: t };
      }
    }

    // 2. Substring & phrase matching for multi-word or compound words
    const strippedRaw = raw.replace(/\s+/g, "");
    for (const word of PROFANITY_WORDS) {
      const lower = word.toLowerCase().trim();
      if (!lower) continue;

      if (lower.includes(" ")) {
        if (raw.includes(lower) || cleaned.includes(lower)) {
          return { hasAbuse: true, matchedWord: lower };
        }
      } else if (lower.length >= 4) {
        if (raw.includes(lower) || cleaned.includes(lower) || (lower.length >= 5 && strippedRaw.includes(lower))) {
          return { hasAbuse: true, matchedWord: lower };
        }
      }
    }

    return { hasAbuse: false };
  } catch {
    return { hasAbuse: false };
  }
}

// Strike System & Ban Management
const STORAGE_KEY_STRIKES = "deepshop_abuse_strikes";
const STORAGE_KEY_BANNED = "deepshop_banned";

export function getAbuseStrikes(): number {
  try {
    const val = localStorage.getItem(STORAGE_KEY_STRIKES);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function isLocallyBanned(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_BANNED) === "true";
  } catch {
    return false;
  }
}

export async function banCurrentDevice(reason: string = "Repeated abusive language & policy violation"): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY_BANNED, "true");
    localStorage.setItem(STORAGE_KEY_STRIKES, "3");
  } catch {}

  // Save to Firebase user doc if logged in
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        isBanned: true,
        bannedAt: Date.now(),
        banReason: reason,
        abuseWarnings: 3
      });
    } catch (e) {
      console.error("Failed to update user ban in Firestore", e);
    }
  }

  // Capture & ban IP in Firebase config/banned_ips
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    const ip = data?.ip;
    if (ip) {
      const formattedIp = ip.replace(/\./g, "_");
      await setDoc(doc(db, "config", "banned_ips"), { [formattedIp]: true }, { merge: true });
    }
  } catch (e) {}

  // Trigger BanOverlay immediately
  window.dispatchEvent(new CustomEvent("triggerBanOverlay"));
}

export async function recordAbuseStrike(contextMessage?: string): Promise<{
  strikes: number;
  isBanned: boolean;
  message: string;
}> {
  const currentStrikes = getAbuseStrikes() + 1;

  try {
    localStorage.setItem(STORAGE_KEY_STRIKES, currentStrikes.toString());
  } catch {}

  // Update in user profile if logged in
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        abuseWarnings: currentStrikes
      });
    } catch {}
  }

  if (currentStrikes >= 3) {
    await banCurrentDevice(`৩ বার গালি ও আপত্তিকর শব্দ ব্যবহারের কারণে নিষিদ্ধ করা হয়েছে। (${contextMessage || "অশালীন আচরণ"})`);
    return {
      strikes: 3,
      isBanned: true,
      message: "৩ বার সতর্কতা অতিক্রম করায় আপনার অ্যাকাউন্ট ও ডিভাইস আজীবনের জন্য ব্যান করা হয়েছে!"
    };
  }

  const remaining = 3 - currentStrikes;
  return {
    strikes: currentStrikes,
    isBanned: false,
    message: `⚠️ সতর্কতা (${currentStrikes}/৩): আপত্তিকর ভাষা বা গালি সনাক্ত করা হয়েছে! আর ${remaining} বার এরূপ আচরণ করলে সাইট থেকে চিরতরে ব্যান করা হবে!`
  };
}
