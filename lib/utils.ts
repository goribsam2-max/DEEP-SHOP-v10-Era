import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(priceBdt: number | string | undefined | null) {
  if (!priceBdt) return "৳0";
  const numPrice = typeof priceBdt === 'string' ? parseFloat(priceBdt) : priceBdt;
  
  if (typeof window !== 'undefined') {
    const region = localStorage.getItem('user_region');
    // BDT to INR approx 0.71
    if (region === 'IN') {
      const inr = Math.round(numPrice * 0.71);
      return `₹${inr.toLocaleString()}`;
    }
    // BDT to PKR approx 2.40
    if (region === 'PK') {
      const pkr = Math.round(numPrice * 2.40);
      return `Rs ${pkr.toLocaleString()}`;
    }
  }
  
  return `৳${numPrice.toLocaleString()}`;
}

const PROFANITY_LIST = [
  'fuck', 'shit', 'bitch', 'cunt', 'asshole', 'dick', 'pussy', 'porn', 'sex',
  'bal', 'baal', 'madarchod', 'bokachoda', 'gandu', 'khanki', 'bara', 'magi',
  'magi', 'chud', 'chudir', 'suor', 'shuor', 'kutta', 'nodi', 'shala', 'sala',
  'banchod', 'banxhod', 'haramzada', 'harami', 'besha', 'beshaya', 'matha',
  'kankir', 'খানকি', 'মাদারচোদ', 'গান্ডু', 'বাল', 'মাগী', 'চুদ', 'কুত্তা', 'শুয়োর', 'বোকাচোদা'
];

const FORBIDDEN_WORDS = ['test', 'example', 'user', 'fake', 'dummy', 'admin', 'root', 'vibegadget', 'demo', 'sample', 'anonymous', 'anon'];

function checkBanState(): string | null {
  const banEndTime = localStorage.getItem('vibe_ban_end_time');
  if (banEndTime) {
    if (Date.now() < parseInt(banEndTime)) {
      return "Due to repeated policy violations, your access has been temporarily blocked for 24 hours.";
    } else {
      localStorage.removeItem('vibe_ban_end_time');
      localStorage.removeItem('vibe_violations');
    }
  }
  return null;
}

function handleViolation(): string {
  let violations = parseInt(localStorage.getItem('vibe_violations') || '0');
  violations += 1;
  localStorage.setItem('vibe_violations', violations.toString());
  
  if (violations >= 3) {
    localStorage.setItem('vibe_ban_end_time', (Date.now() + 24 * 60 * 60 * 1000).toString());
    return "Due to repeated policy violations, your access has been temporarily blocked for 24 hours.";
  }
  return "Please do not use inappropriate, random, or fake details. Taking this lightly will result in a 24-hour ban. Warning " + violations + "/3.";
}

function isGibberish(text: string): boolean {
  // Check for repeated same letters
  if (/(.)\1{3,}/.test(text)) return true; // e.g. aaaa
  // Check for sequential keys
  const lower = text.toLowerCase();
  if (lower.includes('asdf') || lower.includes('qwer') || lower.includes('zxcv') || lower.includes('1234') || lower.includes('abcd')) return true;
  // Check ratio of consonants
  const noVowels = lower.replace(/[aeiou0-9\s.@]/g, '');
  if (noVowels.length > 0 && noVowels.length === lower.replace(/[\s.@]/g, '').length) return true; // all consonants
  if (lower.replace(/\s+/g, '').length < 4) return true; // too short overall
  return false;
}

export function isStoreMerchantNumber(val: string | null | undefined): boolean {
  return false;
}

export function isForbiddenNumber(val: string | null | undefined): boolean {
  return false;
}

export function validateInput(val: string, type: 'email' | 'phone' | 'name' | 'password'): string | null {
  const ban = checkBanState();
  if (ban) return ban;

  const lowerVal = val.toLowerCase();
  
  // Universal profanity check
  if (PROFANITY_LIST.some(word => lowerVal.includes(word))) {
    return handleViolation();
  }

  // Universal forbidden word check
  if (FORBIDDEN_WORDS.some(word => lowerVal.includes(word))) {
    return handleViolation();
  }
  
  // Gibberish / Too short check (excluding phone numbers format naturally)
  if (type !== 'phone') {
    if (val.trim().length < 4) return "Must be at least 4 characters long.";
    if (isGibberish(val)) return handleViolation();
  }

  // Check language rules
  const banglaRegex = /[\u0980-\u09FF]/;
  if (type === 'email' || type === 'password') {
    if (banglaRegex.test(lowerVal)) return "Bangla characters are not allowed for email or password.";
  }

  if (type === 'name') {
    if (/\d/.test(val)) return "Name cannot contain numbers.";
  }

  if (type === 'email') {
    const userPart = lowerVal.split('@')[0] || lowerVal;
    const domain = lowerVal.split("@")[1];
    if (!domain) return "Invalid email address.";
    const allowedDomains = ["gmail.com", "yahoo.com", "outlook.com", "icloud.com"];
    
    // We can be a bit more permissive with email length but the username part has minimum
    if (userPart.length < 4) return "Email username must be at least 4 characters.";
  } else if (type === 'phone') {
    const cleanPhone = val.replace(/[-.\s+]/g, '');
    if (cleanPhone.includes('0177777777') || cleanPhone.includes('123456789') || cleanPhone.match(/(\d)\1{6,}/)) {
      return handleViolation();
    }
  }

  return null;
}


export function formatDisplayEmail(email: string | null | undefined): string {
  if (!email) return "";
  if (email.endsWith("@phone.deepshop.top") || email.endsWith("@phone.vibegadget.com")) {
    const phone = email
      .replace("@phone.deepshop.top", "")
      .replace("@phone.vibegadget.com", "");
    return phone.startsWith("+") ? phone : "+" + phone;
  }
  return email;
}

export function isPhoneAuthEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = String(email).trim().toLowerCase();
  return (
    lower.endsWith("@phone.deepshop.top") ||
    lower.endsWith("@phone.vibegadget.com")
  );
}

export function isPhoneLikeUsername(val: string | null | undefined): boolean {
  if (!val) return true;
  const trimmed = String(val).trim();
  if (!trimmed) return true;
  if (isPhoneAuthEmail(trimmed)) return true;

  const withoutAt = trimmed.replace(/^@+/, "").trim();
  if (!withoutAt) return true;

  // Strip common phone formatting characters
  const stripped = withoutAt.replace(/[\s\-().+]/g, "");
  // Pure digits of length 7..16 -> phone number (e.g. 017..., 88017...)
  if (/^\d{7,16}$/.test(stripped)) return true;
  // Starts with BD/international phone prefix followed mostly by digits
  if (/^(?:\+?880|880|01)\d{6,}$/.test(stripped)) return true;

  return false;
}

/**
 * Returns a user's public @username ONLY if they explicitly set a valid non-phone username.
 * Never falls back to email prefix, phone number, UID, or displayName.
 */
export function getSafePublicUsername(userObj: any): string {
  if (!userObj || typeof userObj !== "object") return "";
  const raw = String(
    userObj.username || userObj.handle || userObj.customLink || ""
  )
    .trim()
    .replace(/^@+/, "");

  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (
    lower === "user" ||
    lower === "member" ||
    lower === "username" ||
    lower === "creator" ||
    lower === "unknown" ||
    lower === "guest" ||
    lower === "anonymous"
  ) {
    return "";
  }
  if (isPhoneLikeUsername(raw)) return "";
  return raw;
}

/**
 * Returns a safe human-readable display name without ever exposing a phone-auth email prefix.
 */
export function getSafeDisplayName(
  userObj: any,
  fallback: string = "Member"
): string {
  if (!userObj || typeof userObj !== "object") return fallback;
  const candidate = String(
    userObj.displayName || userObj.shopName || userObj.name || ""
  ).trim();
  if (candidate && !isPhoneLikeUsername(candidate)) {
    return candidate;
  }
  const email = String(userObj.email || "").trim();
  if (email && !isPhoneAuthEmail(email)) {
    const prefix = email.split("@")[0]?.trim() || "";
    if (prefix && !isPhoneLikeUsername(prefix)) {
      return prefix;
    }
  }
  return fallback;
}

export function formatCompactNumber(number: number | string | undefined | null): string {
  if (number === undefined || number === null) return "0";
  const num = typeof number === "string" ? parseFloat(number) : number;
  if (isNaN(num)) return "0";

  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toString();
}
