// Professional Male Bengali Voiceover Engine, Password Rules & Domain/Profanity Validation

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

export interface AuthVoiceState {
  muted: boolean;
  isSpeaking: boolean;
}

type VoiceListener = (state: AuthVoiceState) => void;
const listeners = new Set<VoiceListener>();

const readInitialMuted = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(VOICE_MUTE_KEY) === "true";
  } catch {
    return false;
  }
};

let voiceState: AuthVoiceState = {
  muted: readInitialMuted(),
  isSpeaking: false,
};

const emitVoiceState = () => {
  const snapshot: AuthVoiceState = { ...voiceState };
  listeners.forEach((fn) => {
    try {
      fn(snapshot);
    } catch {
      // Ignore subscriber error
    }
  });
};

const setSpeaking = (speaking: boolean) => {
  if (voiceState.isSpeaking === speaking) return;
  voiceState = { ...voiceState, isSpeaking: speaking };
  emitVoiceState();
};

export const getAuthVoiceState = (): AuthVoiceState => ({ ...voiceState });

export const subscribeAuthVoiceState = (listener: VoiceListener): (() => void) => {
  listeners.add(listener);
  listener({ ...voiceState });
  return () => {
    listeners.delete(listener);
  };
};

// WebAudio + HTMLAudio playback state
let sharedAudioCtx: AudioContext | null = null;
let activeSourceNode: AudioBufferSourceNode | null = null;
let activeHtmlAudio: HTMLAudioElement | null = null;
let activePlayToken = 0;
let pendingColdStartText: string | null = null;
let unlockListenersInstalled = false;

interface CachedVoiceClip {
  rawBytes: ArrayBuffer;
  mimeType: string;
  engine: string;
}

const clientAudioCache = new Map<string, CachedVoiceClip>();

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (sharedAudioCtx) return sharedAudioCtx;
  const Ctx =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  try {
    sharedAudioCtx = new Ctx();
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export const stopAuthVoice = () => {
  activePlayToken += 1;
  pendingColdStartText = null;

  if (activeSourceNode) {
    try {
      activeSourceNode.onended = null;
      activeSourceNode.stop();
      activeSourceNode.disconnect();
    } catch {
      // Ignore already stopped source
    }
    activeSourceNode = null;
  }

  if (activeHtmlAudio) {
    try {
      activeHtmlAudio.onended = null;
      activeHtmlAudio.onerror = null;
      activeHtmlAudio.onpause = null;
      activeHtmlAudio.pause();
      activeHtmlAudio.currentTime = 0;
    } catch {
      // Ignore
    }
    activeHtmlAudio = null;
  }

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
  }

  setSpeaking(false);
};

export const isAuthVoiceMuted = (): boolean => {
  const persisted = readInitialMuted();
  if (voiceState.muted !== persisted) {
    voiceState = { ...voiceState, muted: persisted };
  }
  return persisted;
};

export const setAuthVoiceMuted = (muted: boolean) => {
  try {
    localStorage.setItem(VOICE_MUTE_KEY, muted ? "true" : "false");
  } catch {
    // Ignore storage error
  }
  voiceState = { ...voiceState, muted };
  if (muted) {
    stopAuthVoice();
  }
  emitVoiceState();
};

export const toggleAuthVoiceMute = (): boolean => {
  const next = !isAuthVoiceMuted();
  setAuthVoiceMuted(next);
  return next;
};

/**
 * Normalizes mixed English/technical words into natural Bengali script
 * so the male Bengali voiceover pronounces every word accurately.
 */
export const normalizeTextForBengaliSpeech = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/example@gmail\.com/gi, "এক্সাম্পল অ্যাট জিমেইল ডট কম")
    .replace(/DEEP\s*SHOP/gi, "ডিপ শপ")
    .replace(/\bGmail\b/gi, "জিমেইল")
    .replace(/\bOutlook\b/gi, "আউটলুক")
    .replace(/\bHotmail\b/gi, "হটমেইল")
    .replace(/\bYahoo\b/gi, "ইয়াহু")
    .replace(/\biCloud\b/gi, "আইক্লাউড")
    .replace(/\bNID\b/g, "এন আই ডি")
    .replace(/\bOTP\b/g, "ও টি পি")
    .replace(/\bSMS\b/g, "এস এম এস")
    .replace(/\(0-9\)/g, "শূন্য থেকে নয়")
    .replace(/\(a-z\)/g, "ছোট হাতের অক্ষর")
    .replace(/\(A-Z\)/g, "বড় হাতের অক্ষর")
    .replace(/৮\+/g, "কমপক্ষে আটটি")
    .replace(/8\+/g, "কমপক্ষে আটটি")
    .replace(/\(!@#\$\)/g, "")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Pure Bengali voice error messages for Firebase Authentication errors.
 */
export const getBanglaAuthErrorMessage = (error: any): string => {
  const code = String(error?.code || error?.message || "").toLowerCase();

  if (code.includes("auth/invalid-email")) {
    return "আপনার দেওয়া ইমেইল ঠিকানাটির ফরম্যাট সঠিক নয়। অনুগ্রহ করে সঠিক ইমেইল দিন।";
  }
  if (
    code.includes("auth/user-not-found") ||
    code.includes("auth/invalid-credential") ||
    code.includes("auth/wrong-password")
  ) {
    return "আপনার ইমেইল বা ফোন নম্বর অথবা পাসওয়ার্ডটি সঠিক নয়। অনুগ্রহ করে যাচাই করে আবার চেষ্টা করুন।";
  }
  if (code.includes("auth/email-already-in-use")) {
    return "এই ইমেইল বা মোবাইল নম্বর দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট খোলা আছে। অনুগ্রহ করে লগইন করুন।";
  }
  if (code.includes("auth/weak-password")) {
    return "পাসওয়ার্ডটি খুবই দুর্বল। অনুগ্রহ করে আরও শক্তিশালী পাসওয়ার্ড ব্যবহার করুন।";
  }
  if (code.includes("auth/network-request-failed")) {
    return "ইন্টারনেট সংযোগে সমস্যা হচ্ছে। অনুগ্রহ করে আপনার নেটওয়ার্ক যাচাই করে আবার চেষ্টা করুন।";
  }
  if (code.includes("auth/too-many-requests")) {
    return "অতিরিক্ত বার ভুল চেষ্টা করা হয়েছে। কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন অথবা পাসওয়ার্ড রিসেট করুন।";
  }
  if (code.includes("auth/user-disabled")) {
    return "এই অ্যাকাউন্টটি সাময়িকভাবে বন্ধ করা হয়েছে। অনুগ্রহ করে সাপোর্টে যোগাযোগ করুন।";
  }
  return "দুঃখিত, লগইন বা নিবন্ধন সম্পন্ন করতে সমস্যা হয়েছে। আপনার তথ্যগুলো যাচাই করে আবার চেষ্টা করুন।";
};

function installGestureAudioUnlock() {
  if (unlockListenersInstalled || typeof window === "undefined") return;
  unlockListenersInstalled = true;

  const handleFirstGesture = (ev: Event) => {
    const ctx = getOrCreateAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    // Do not replay cold-start greeting if user clicked the voice mute toggle itself
    const target = ev.target as HTMLElement | null;
    if (target?.closest?.("[data-auth-voice-toggle='true']")) {
      pendingColdStartText = null;
      return;
    }

    if (pendingColdStartText && !isAuthVoiceMuted()) {
      const queued = pendingColdStartText;
      pendingColdStartText = null;
      // Small micro-delay so if user tapped an input with its own onFocus voice, onFocus wins cleanly
      setTimeout(() => {
        if (pendingColdStartText === null && !voiceState.isSpeaking && !isAuthVoiceMuted()) {
          // Only play queued greeting if nothing else started speaking from this tap
          if (activePlayToken === lastQueuedToken) {
            playAuthVoice(queued);
          }
        }
      }, 65);
    }
  };

  window.addEventListener("pointerdown", handleFirstGesture, { passive: true });
  window.addEventListener("keydown", handleFirstGesture, { passive: true });
}

let lastQueuedToken = 0;

function speakBrowserFallback(spokenText: string, token: number) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    setSpeaking(false);
    return;
  }

  const runSpeak = () => {
    if (token !== activePlayToken || isAuthVoiceMuted()) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.lang = "bn-BD";
      utterance.rate = 0.9;
      utterance.pitch = 0.88; // Warm male pitch register
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const maleKeywords = ["pradeep", "bashkar", "hemant", "male", "man", "charon"];
      const bnVoices = voices.filter((v) => {
        const l = v.lang.toLowerCase();
        return l.includes("bn") || l.includes("bd");
      });

      const chosen =
        bnVoices.find((v) => maleKeywords.some((k) => v.name.toLowerCase().includes(k))) ||
        bnVoices.find((v) => v.name.toLowerCase().includes("google")) ||
        bnVoices[0];

      if (chosen) {
        utterance.voice = chosen;
      }

      utterance.onstart = () => {
        if (token === activePlayToken) setSpeaking(true);
      };
      utterance.onend = () => {
        if (token === activePlayToken) setSpeaking(false);
      };
      utterance.onerror = () => {
        if (token === activePlayToken) setSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      if (token === activePlayToken) setSpeaking(false);
    }
  };

  const existingVoices = window.speechSynthesis.getVoices();
  if (existingVoices.length > 0) {
    runSpeak();
  } else {
    let fired = false;
    const onVoices = () => {
      if (fired) return;
      fired = true;
      window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
      runSpeak();
    };
    window.speechSynthesis.addEventListener("voiceschanged", onVoices);
    setTimeout(() => {
      if (!fired) {
        fired = true;
        window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
        runSpeak();
      }
    }, 350);
  }
}

async function fetchVoiceClip(spokenText: string): Promise<CachedVoiceClip | null> {
  const existing = clientAudioCache.get(spokenText);
  if (existing) return existing;

  const res = await fetch("/api/tts/bengali", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: spokenText }),
  });

  if (!res.ok) return null;

  const rawBytes = await res.arrayBuffer();
  if (!rawBytes || rawBytes.byteLength < 64) return null;

  const mimeType = res.headers.get("Content-Type") || "audio/wav";
  const engine = res.headers.get("X-Voice-Engine") || "gemini-male";
  const clip: CachedVoiceClip = { rawBytes, mimeType, engine };

  if (clientAudioCache.size >= 80) {
    const firstKey = clientAudioCache.keys().next().value;
    if (firstKey) clientAudioCache.delete(firstKey);
  }
  clientAudioCache.set(spokenText, clip);
  return clip;
}

async function playHtmlAudioClip(
  clip: CachedVoiceClip,
  token: number
): Promise<"played" | "blocked" | "failed"> {
  if (typeof window === "undefined") return "failed";
  const blob = new Blob([clip.rawBytes], { type: clip.mimeType });
  const blobUrl = URL.createObjectURL(blob);
  const audio = new Audio(blobUrl);
  activeHtmlAudio = audio;

  if (clip.engine === "fallback-bn-male") {
    (audio as any).preservesPitch = false;
    (audio as any).webkitPreservesPitch = false;
    (audio as any).mozPreservesPitch = false;
    audio.playbackRate = 0.87;
  } else {
    audio.playbackRate = 1.0;
  }

  const cleanup = () => {
    URL.revokeObjectURL(blobUrl);
    if (activeHtmlAudio === audio) {
      activeHtmlAudio = null;
    }
    if (token === activePlayToken) {
      setSpeaking(false);
    }
  };

  audio.onplaying = () => {
    if (token === activePlayToken) {
      setSpeaking(true);
    }
  };
  audio.onended = cleanup;
  audio.onerror = cleanup;

  try {
    await audio.play();
    if (token === activePlayToken) {
      setSpeaking(true);
    }
    return "played";
  } catch (err: any) {
    URL.revokeObjectURL(blobUrl);
    if (activeHtmlAudio === audio) activeHtmlAudio = null;
    setSpeaking(false);
    const errName = String(err?.name || "");
    if (errName === "NotAllowedError") {
      return "blocked";
    }
    return "failed";
  }
}

/**
 * Plays accurate Professional Male Bengali Voiceover across Login, Registration & Seller Setup.
 */
export const playAuthVoice = (text: string, force = false) => {
  if (typeof window === "undefined") return;
  installGestureAudioUnlock();

  if (!force && isAuthVoiceMuted()) return;

  const spokenText = normalizeTextForBengaliSpeech(text);
  if (!spokenText) return;

  // Cancel any prior in-flight or playing voice immediately
  stopAuthVoice();
  const token = ++activePlayToken;

  (async () => {
    try {
      const clip = await fetchVoiceClip(spokenText);
      if (token !== activePlayToken || (!force && isAuthVoiceMuted())) return;

      if (clip) {
        // Attempt WebAudio API playback first (persists across SPA route transitions without re-blocking)
        const ctx = getOrCreateAudioContext();
        if (ctx) {
          if (ctx.state === "suspended") {
            try {
              await Promise.race([
                ctx.resume(),
                new Promise((resolve) => setTimeout(resolve, 180)),
              ]);
            } catch {
              // Ignore resume error
            }
          }

          if (token !== activePlayToken || (!force && isAuthVoiceMuted())) return;

          if (ctx.state === "running") {
            try {
              const decoded = await ctx.decodeAudioData(clip.rawBytes.slice(0));
              if (token !== activePlayToken || (!force && isAuthVoiceMuted())) return;

              const source = ctx.createBufferSource();
              source.buffer = decoded;
              if (clip.engine === "fallback-bn-male") {
                // Warm natural male vocal resonance & clear pace
                source.detune.value = -245;
              }
              const gain = ctx.createGain();
              gain.gain.value = 1.05;
              source.connect(gain);
              gain.connect(ctx.destination);

              activeSourceNode = source;
              setSpeaking(true);
              source.onended = () => {
                if (activeSourceNode === source) {
                  activeSourceNode = null;
                }
                if (token === activePlayToken) {
                  setSpeaking(false);
                }
              };
              source.start(0);
              return;
            } catch {
              // Fall through to HTMLAudioElement if decodeAudioData fails on specific format
            }
          }
        }

        // Fallback to HTMLAudioElement
        const htmlResult = await playHtmlAudioClip(clip, token);
        if (htmlResult === "played") return;

        if (htmlResult === "blocked") {
          // Browser blocked cold-start autoplay prior to first user interaction; queue for immediate unlock
          pendingColdStartText = spokenText;
          lastQueuedToken = token;
          return;
        }
      }

      // Final offline fallback: Browser SpeechSynthesis
      speakBrowserFallback(spokenText, token);
    } catch {
      if (token === activePlayToken && (force || !isAuthVoiceMuted())) {
        speakBrowserFallback(spokenText, token);
      }
    }
  })();
};

export const BLOCKED_PLACEHOLDER_WORDS = [
  "test",
  "testing",
  "tester",
  "tests",
  "user",
  "users",
  "username",
  "demo",
  "sample",
  "example",
  "guest",
  "fake",
  "dummy",
  "default",
  "placeholder",
  "admin",
  "administrator",
  "moderator",
  "root",
  "system",
  "unknown",
  "anonymous",
  "nobody",
  "noname",
  "null",
  "undefined",
  "none",
  "temp",
  "qwerty",
  "asdf",
  "zxcv",
  "abcd",
  "abc",
];

const BLOCKED_PLACEHOLDER_SET = new Set(BLOCKED_PLACEHOLDER_WORDS);

/**
 * Detects default/dummy words such as "test", "user", "test123", "user01",
 * "testuser", "demouser", "newuser", "mytest", etc. without false positives on real names.
 */
export const hasBlockedPlaceholderWord = (rawInput: string): boolean => {
  const cleaned = rawInput.trim().toLowerCase();
  if (!cleaned) return false;

  const segments = cleaned
    .split(/[\s._\-+@/\\|,;:!?()[\]{}'"]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const checkToken = (tok: string): boolean => {
    if (!tok) return false;
    if (BLOCKED_PLACEHOLDER_SET.has(tok)) return true;

    const strippedDigits = tok.replace(/^\d+|\d+$/g, "");
    if (strippedDigits && BLOCKED_PLACEHOLDER_SET.has(strippedDigits)) {
      return true;
    }

    if (
      /^(?:test|testing|tester|user|users|demo|sample|example|guest|fake|dummy|default|admin|temp)(?:user|users|test|testing|tester|demo|account|acc|id|name|mail|email|profile|person|member|login|boy|girl|\d)+$/i.test(
        tok
      )
    ) {
      return true;
    }

    if (
      /^(?:my|new|the|real|app|site|web|dev)(?:test|user|demo|fake|sample|guest|dummy|account)\d*$/i.test(
        tok
      )
    ) {
      return true;
    }

    return false;
  };

  if (checkToken(cleaned.replace(/\s+/g, ""))) {
    return true;
  }

  return segments.some(checkToken);
};

export const validateRealPersonName = (
  name: string,
  fieldLabel = "নাম"
): { isValid: boolean; errorMsg: string } => {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) {
    return {
      isValid: false,
      errorMsg: `অনুগ্রহ করে সঠিক ${fieldLabel} লিখুন (কমপক্ষে ২ অক্ষর)।`,
    };
  }

  // Must contain at least two real letters (English or Bengali)
  const letterMatches = trimmed.match(/[A-Za-z\u0980-\u09FF]/g);
  if (!letterMatches || letterMatches.length < 2) {
    return {
      isValid: false,
      errorMsg: `${fieldLabel}-এ শুধুমাত্র সংখ্যা বা চিহ্ন ব্যবহার করা যাবে না। আসল নাম লিখুন।`,
    };
  }

  // Block repeated single-character mash like "aaaa" or "xxxx"
  if (/(.)\1{3,}/i.test(trimmed.replace(/\s+/g, ""))) {
    return {
      isValid: false,
      errorMsg: `অনুগ্রহ করে অর্থপূর্ণ আসল ${fieldLabel} প্রদান করুন।`,
    };
  }

  if (hasBlockedPlaceholderWord(trimmed)) {
    return {
      isValid: false,
      errorMsg: `${fieldLabel}-এ 'test', 'user', 'demo' বা ডিফল্ট শব্দ ব্যবহার করা যাবে না। আপনার আসল নাম লিখুন।`,
    };
  }

  return validateInappropriateContent(trimmed, fieldLabel);
};

export const validatePublicUsername = (
  username: string
): { isValid: boolean; errorMsg: string } => {
  const cleaned = username.trim().replace(/^@+/, "");
  if (!cleaned) return { isValid: true, errorMsg: "" };

  if (cleaned.length < 3) {
    return {
      isValid: false,
      errorMsg: "ইউজারনেম কমপক্ষে ৩ অক্ষরের হতে হবে।",
    };
  }

  if (hasBlockedPlaceholderWord(cleaned)) {
    return {
      isValid: false,
      errorMsg:
        "ইউজারনেমে 'test', 'user', 'demo' বা ডিফল্ট শব্দ ব্যবহার করা যাবে না।",
    };
  }

  return validateInappropriateContent(cleaned, "ইউজারনেমে");
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
      errorMsg: "একটি সঠিক ইমেইল ঠিকানা প্রদান করুন (যেমন: rahim.ahmed@gmail.com)।",
    };
  }

  const localPart = parts[0];
  const baseLocalPart = localPart.split("+")[0] || localPart;
  const domain = parts[1];

  if (
    baseLocalPart.length < 2 ||
    /^\d+$/.test(baseLocalPart) ||
    hasBlockedPlaceholderWord(localPart) ||
    hasBlockedPlaceholderWord(baseLocalPart) ||
    /(?:^|[._\-+])(test|testing|tester|user|users|username|demo|sample|example|guest|fake|dummy|default|placeholder|admin|root|qwerty|asdf)\d*(?:$|[._\-+])/i.test(
      localPart
    ) ||
    /^(test|user|demo|fake|sample|example|dummy|guest)/i.test(baseLocalPart)
  ) {
    return {
      isValid: false,
      errorMsg:
        "ইমেইলে 'test', 'user', 'demo' বা ডিফল্ট শব্দ ব্যবহার করা যাবে না। অনুগ্রহ করে আপনার আসল ইমেইল দিন।",
    };
  }

  const isDisposable = DISPOSABLE_EMAIL_DOMAINS.some(
    (d) => domain === d || domain.endsWith("." + d)
  );

  if (isDisposable || hasBlockedPlaceholderWord(domain.split(".")[0] || "")) {
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
