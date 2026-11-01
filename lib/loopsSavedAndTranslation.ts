import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

/* ============================================================================
 * 1. SAVED COLLECTIONS STORE (Persistent in localStorage + Firestore users/{uid})
 * ========================================================================== */
export interface SavedCollection {
  id: string;
  name: string;
  isPrivate: boolean;
  coverUrl?: string;
  coverThumbnail?: string;
  postIds: string[];
  createdAt: number;
}

const SAVED_COLLECTIONS_KEY = "loops_saved_collections_v1";
const SAVED_COLLECTIONS_EVENT = "loops:saved-collections-updated";

let hydratedCollectionsUid: string | null = null;

export function getSavedCollections(): SavedCollection[] {
  try {
    const raw = localStorage.getItem(SAVED_COLLECTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((c) => c && typeof c.id === "string" && typeof c.name === "string");
    }
  } catch {}
  return [];
}

function persistSavedCollections(list: SavedCollection[], syncRemote = true) {
  try {
    localStorage.setItem(SAVED_COLLECTIONS_KEY, JSON.stringify(list));
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SAVED_COLLECTIONS_EVENT, { detail: list }));
  }
  if (syncRemote) {
    const uid = auth.currentUser?.uid;
    if (uid) {
      setDoc(
        doc(db, "users", uid),
        { savedCollections: list },
        { merge: true }
      ).catch(() => {});
    }
  }
}

export async function hydrateSavedCollectionsFromCloud(): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || hydratedCollectionsUid === uid) return;
  hydratedCollectionsUid = uid;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return;
    const remote = snap.data()?.savedCollections;
    if (Array.isArray(remote) && remote.length > 0) {
      const local = getSavedCollections();
      const map = new Map<string, SavedCollection>();
      [...remote, ...local].forEach((c: SavedCollection) => {
        if (!c?.id) return;
        const prev = map.get(c.id);
        if (!prev) {
          map.set(c.id, {
            id: c.id,
            name: c.name || "Saved",
            isPrivate: c.isPrivate ?? true,
            coverUrl: c.coverUrl || "",
            postIds: Array.isArray(c.postIds) ? Array.from(new Set(c.postIds)) : [],
            createdAt: Number(c.createdAt || Date.now()),
          });
        } else {
          map.set(c.id, {
            ...prev,
            coverUrl: prev.coverUrl || c.coverUrl || "",
            postIds: Array.from(new Set([...(prev.postIds || []), ...(c.postIds || [])])),
          });
        }
      });
      persistSavedCollections(
        Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt),
        false
      );
    }
  } catch {}
}

export function createSavedCollection(
  name: string,
  initialPost?: { id: string; thumbnail?: string } | null
): SavedCollection {
  const cleanName = name.trim() || "Favorites";
  const current = getSavedCollections();
  const nextCol: SavedCollection = {
    id: `col_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    isPrivate: true,
    coverUrl: initialPost?.thumbnail || "",
    postIds: initialPost?.id ? [initialPost.id] : [],
    createdAt: Date.now(),
  };
  const next = [nextCol, ...current];
  persistSavedCollections(next, true);
  return nextCol;
}

export function togglePostInSavedCollection(
  collectionId: string,
  postItem: { id: string; thumbnail?: string }
): boolean {
  const current = getSavedCollections();
  let added = false;
  const next = current.map((col) => {
    if (col.id !== collectionId) return col;
    const exists = col.postIds.includes(postItem.id);
    added = !exists;
    const postIds = exists
      ? col.postIds.filter((id) => id !== postItem.id)
      : [postItem.id, ...col.postIds];
    return {
      ...col,
      coverUrl: col.coverUrl || postItem.thumbnail || "",
      postIds,
    };
  });
  persistSavedCollections(next, true);
  return added;
}

export function deleteSavedCollection(collectionId: string): void {
  const next = getSavedCollections().filter((c) => c.id !== collectionId);
  persistSavedCollections(next, true);
}

export function useSavedCollections() {
  const [collections, setCollections] = useState<SavedCollection[]>(() =>
    getSavedCollections()
  );

  useEffect(() => {
    hydrateSavedCollectionsFromCloud();
    const onUpdate = () => setCollections(getSavedCollections());
    window.addEventListener(SAVED_COLLECTIONS_EVENT, onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(SAVED_COLLECTIONS_EVENT, onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  return {
    collections,
    createCollection: createSavedCollection,
    togglePostInCollection: togglePostInSavedCollection,
    deleteCollection: deleteSavedCollection,
  };
}

/* ============================================================================
 * 2. TRANSLATION PREFERENCES & PREFERRED LANGUAGES (IMG_5304, IMG_5305, IMG_5306)
 * ========================================================================== */
export interface PreferredLanguageItem {
  id: string;
  name: string;
  nativeName: string;
  isPrimary: boolean;
}

export interface TranslationPrefs {
  preferredLanguages: PreferredLanguageItem[];
  translateTextOnReels: boolean;
  translateVoice: boolean;
}

export const AVAILABLE_TRANSLATION_LANGUAGES: Array<{
  id: string;
  name: string;
  nativeName: string;
}> = [
  { id: "en", name: "English", nativeName: "English" },
  { id: "bn", name: "Bangla", nativeName: "বাংলা" },
  { id: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { id: "ur", name: "Urdu", nativeName: "اردو" },
  { id: "ar", name: "Arabic", nativeName: "العربية" },
  { id: "es", name: "Spanish", nativeName: "Español" },
  { id: "fr", name: "French", nativeName: "Français" },
  { id: "de", name: "German", nativeName: "Deutsch" },
  { id: "pt", name: "Portuguese", nativeName: "Português" },
  { id: "tr", name: "Turkish", nativeName: "Türkçe" },
  { id: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
  { id: "ja", name: "Japanese", nativeName: "日本語" },
  { id: "ko", name: "Korean", nativeName: "한국어" },
  { id: "zh-CN", name: "Chinese (Simplified)", nativeName: "简体中文" },
  { id: "ru", name: "Russian", nativeName: "Русский" },
  { id: "it", name: "Italian", nativeName: "Italiano" },
  { id: "th", name: "Thai", nativeName: "ไทย" },
  { id: "ms", name: "Malay", nativeName: "Bahasa Melayu" },
];

const TRANSLATION_PREFS_KEY = "loops_translation_prefs_v1";
const TRANSLATION_PREFS_EVENT = "loops:translation-prefs-updated";

const DEFAULT_TRANSLATION_PREFS: TranslationPrefs = {
  preferredLanguages: [
    { id: "en", name: "English", nativeName: "English", isPrimary: true },
    { id: "bn", name: "Bangla", nativeName: "বাংলা", isPrimary: false },
  ],
  translateTextOnReels: true,
  translateVoice: true,
};

let hydratedPrefsUid: string | null = null;

function normalizeLanguageList(list: PreferredLanguageItem[]): PreferredLanguageItem[] {
  if (!Array.isArray(list) || list.length === 0) {
    return DEFAULT_TRANSLATION_PREFS.preferredLanguages;
  }
  const seen = new Set<string>();
  const deduped: PreferredLanguageItem[] = [];
  list.forEach((item) => {
    if (!item?.id || seen.has(item.id)) return;
    seen.add(item.id);
    deduped.push({
      id: item.id,
      name: item.name || "English",
      nativeName: item.nativeName || item.name || "English",
      isPrimary: false,
    });
  });
  if (deduped.length === 0) return DEFAULT_TRANSLATION_PREFS.preferredLanguages;
  const primaryIdx = list.findIndex((l) => l?.isPrimary);
  const targetIdx = primaryIdx >= 0 && primaryIdx < deduped.length ? primaryIdx : 0;
  // Move primary to index 0 so top row is always Primary (matching IMG_5306)
  const [primaryItem] = deduped.splice(targetIdx, 1);
  return [
    { ...primaryItem, isPrimary: true },
    ...deduped.map((d) => ({ ...d, isPrimary: false })),
  ];
}

export function getTranslationPrefs(): TranslationPrefs {
  try {
    const raw = localStorage.getItem(TRANSLATION_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          preferredLanguages: normalizeLanguageList(parsed.preferredLanguages),
          translateTextOnReels:
            typeof parsed.translateTextOnReels === "boolean"
              ? parsed.translateTextOnReels
              : true,
          translateVoice:
            typeof parsed.translateVoice === "boolean"
              ? parsed.translateVoice
              : true,
        };
      }
    }
  } catch {}
  return DEFAULT_TRANSLATION_PREFS;
}

export function saveTranslationPrefs(
  updater: TranslationPrefs | ((prev: TranslationPrefs) => TranslationPrefs),
  syncRemote = true
): TranslationPrefs {
  const prev = getTranslationPrefs();
  const rawNext = typeof updater === "function" ? updater(prev) : updater;
  const normalized: TranslationPrefs = {
    preferredLanguages: normalizeLanguageList(rawNext.preferredLanguages),
    translateTextOnReels: Boolean(rawNext.translateTextOnReels),
    translateVoice: Boolean(rawNext.translateVoice),
  };

  try {
    localStorage.setItem(TRANSLATION_PREFS_KEY, JSON.stringify(normalized));
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(TRANSLATION_PREFS_EVENT, { detail: normalized })
    );
  }

  if (syncRemote) {
    const uid = auth.currentUser?.uid;
    if (uid) {
      setDoc(
        doc(db, "users", uid),
        { translationPrefs: normalized },
        { merge: true }
      ).catch(() => {});
    }
  }
  return normalized;
}

export async function hydrateTranslationPrefsFromCloud(): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || hydratedPrefsUid === uid) return;
  hydratedPrefsUid = uid;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return;
    const remote = snap.data()?.translationPrefs;
    if (remote && typeof remote === "object") {
      saveTranslationPrefs(
        {
          preferredLanguages: normalizeLanguageList(remote.preferredLanguages),
          translateTextOnReels:
            typeof remote.translateTextOnReels === "boolean"
              ? remote.translateTextOnReels
              : true,
          translateVoice:
            typeof remote.translateVoice === "boolean"
              ? remote.translateVoice
              : true,
        },
        false
      );
    }
  } catch {}
}

export function getPrimaryTargetLanguage(text?: string): PreferredLanguageItem {
  const prefs = getTranslationPrefs();
  const langs = prefs.preferredLanguages;
  const primary = langs[0] || DEFAULT_TRANSLATION_PREFS.preferredLanguages[0];
  // Smart language pick: if text is mostly ASCII/English and user has a 2nd preferred language (e.g. Bangla),
  // and primary is English, translate into their 2nd preferred language so clicking "See translation" always produces a meaningful translation!
  if (text && primary.id === "en" && langs.length > 1) {
    const nonAsciiCount = (text.match(/[^\x00-\x7F]/g) || []).length;
    const alphaCount = (text.match(/[A-Za-z]/g) || []).length;
    if (alphaCount > 3 && nonAsciiCount < alphaCount * 0.15) {
      return langs[1];
    }
  }
  if (text && primary.id === "bn" && langs.length > 1) {
    const banglaChars = (text.match(/[\u0980-\u09FF]/g) || []).length;
    if (banglaChars > 3) {
      return langs[1];
    }
  }
  return primary;
}

export function useTranslationPrefs() {
  const [prefs, setPrefs] = useState<TranslationPrefs>(() => getTranslationPrefs());

  useEffect(() => {
    hydrateTranslationPrefsFromCloud();
    const onUpdate = () => setPrefs(getTranslationPrefs());
    window.addEventListener(TRANSLATION_PREFS_EVENT, onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(TRANSLATION_PREFS_EVENT, onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  const updatePrefs = useCallback(
    (updater: TranslationPrefs | ((prev: TranslationPrefs) => TranslationPrefs)) => {
      return saveTranslationPrefs(updater, true);
    },
    []
  );

  return { prefs, updatePrefs };
}

/* ============================================================================
 * 3. LIVE MULTI-LANGUAGE TRANSLATOR WITH CACHE (/api/translate + GTX Fallback)
 * ========================================================================== */
const memoryTranslationCache = new Map<string, string>();

export async function translateLoopsText(
  text: string,
  explicitTargetLang?: string
): Promise<{ translatedText: string; targetLang: PreferredLanguageItem }> {
  const trimmed = (text || "").trim();
  const targetObj = explicitTargetLang
    ? AVAILABLE_TRANSLATION_LANGUAGES.find((l) => l.id === explicitTargetLang)
      ? {
          ...AVAILABLE_TRANSLATION_LANGUAGES.find((l) => l.id === explicitTargetLang)!,
          isPrimary: true,
        }
      : getPrimaryTargetLanguage(trimmed)
    : getPrimaryTargetLanguage(trimmed);

  if (!trimmed) {
    return { translatedText: "", targetLang: targetObj };
  }

  const cacheKey = `${targetObj.id}::${trimmed}`;
  const cached = memoryTranslationCache.get(cacheKey);
  if (cached) {
    return { translatedText: cached, targetLang: targetObj };
  }

  // 1. Server-side proxy (/api/translate)
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed, targetLang: targetObj.id }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.translatedText && String(data.translatedText).trim()) {
        const result = String(data.translatedText).trim();
        memoryTranslationCache.set(cacheKey, result);
        return { translatedText: result, targetLang: targetObj };
      }
    }
  } catch {}

  // 2. Direct client-side GTX fallback
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
      targetObj.id
    )}&dt=t&q=${encodeURIComponent(trimmed)}`;
    const directRes = await fetch(url);
    if (directRes.ok) {
      const json = await directRes.json();
      if (Array.isArray(json) && Array.isArray(json[0])) {
        const joined = json[0]
          .map((seg: any) => (Array.isArray(seg) && seg[0] ? String(seg[0]) : ""))
          .join("")
          .trim();
        if (joined) {
          memoryTranslationCache.set(cacheKey, joined);
          return { translatedText: joined, targetLang: targetObj };
        }
      }
    }
  } catch {}

  return { translatedText: trimmed, targetLang: targetObj };
}
