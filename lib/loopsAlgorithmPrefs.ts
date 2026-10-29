import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { ScamPost } from "../types";
import { FEED_THEMES } from "./feed-themes";

export interface LoopsAlgorithmPrefs {
  moreTopics: string[];
  lessTopics: string[];
  strictFilter: boolean;
  updatedAt: number;
}

export const LOOPS_ALGORITHM_STORAGE_KEY = "loops_algorithm_prefs_v1";
export const LOOPS_ALGORITHM_CHANGED_EVENT = "loops:algorithm-prefs-changed";

export const DEFAULT_MORE_TOPICS: string[] = [
  "Mobile Phone Sales",
  "E-commerce in Bangladesh",
  "Content Monetization",
  "Brand Identity",
  "User Experience (UX) Design",
  "Streetwear",
];

export const CURATED_SUGGESTED_TOPICS: string[] = [
  "Color grading",
  "Content creation",
  "Air travel",
  "Tech & Gadgets",
  "Creator Economy",
  "Digital Marketing",
  "Photography & Reels",
  "Product Reviews",
  "Startup Growth",
  "Scam Awareness",
];

export function loadLocalAlgorithmPrefs(): LoopsAlgorithmPrefs {
  if (typeof window === "undefined") {
    return {
      moreTopics: DEFAULT_MORE_TOPICS,
      lessTopics: [],
      strictFilter: false,
      updatedAt: 0,
    };
  }
  try {
    const raw = localStorage.getItem(LOOPS_ALGORITHM_STORAGE_KEY);
    if (!raw) {
      return {
        moreTopics: DEFAULT_MORE_TOPICS,
        lessTopics: [],
        strictFilter: false,
        updatedAt: 0,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      moreTopics: Array.isArray(parsed.moreTopics)
        ? parsed.moreTopics.filter((x: unknown) => typeof x === "string" && x.trim())
        : DEFAULT_MORE_TOPICS,
      lessTopics: Array.isArray(parsed.lessTopics)
        ? parsed.lessTopics.filter((x: unknown) => typeof x === "string" && x.trim())
        : [],
      strictFilter: Boolean(parsed.strictFilter),
      updatedAt: Number(parsed.updatedAt || 0),
    };
  } catch {
    return {
      moreTopics: DEFAULT_MORE_TOPICS,
      lessTopics: [],
      strictFilter: false,
      updatedAt: 0,
    };
  }
}

export async function saveAlgorithmPrefs(
  prefs: LoopsAlgorithmPrefs,
  uid?: string | null
): Promise<LoopsAlgorithmPrefs> {
  const cleanMore = Array.from(
    new Set(prefs.moreTopics.map((t) => t.trim()).filter(Boolean))
  ).slice(0, 30);
  const cleanLess = Array.from(
    new Set(
      prefs.lessTopics
        .map((t) => t.trim())
        .filter((t) => Boolean(t) && !cleanMore.includes(t))
    )
  ).slice(0, 30);

  const normalized: LoopsAlgorithmPrefs = {
    moreTopics: cleanMore,
    lessTopics: cleanLess,
    strictFilter: Boolean(prefs.strictFilter),
    updatedAt: Date.now(),
  };

  try {
    localStorage.setItem(
      LOOPS_ALGORITHM_STORAGE_KEY,
      JSON.stringify(normalized)
    );
    window.dispatchEvent(
      new CustomEvent(LOOPS_ALGORITHM_CHANGED_EVENT, { detail: normalized })
    );
  } catch {}

  if (uid) {
    try {
      await setDoc(
        doc(db, "users", uid),
        { algorithmPrefs: normalized },
        { merge: true }
      );
    } catch {}
  }

  return normalized;
}

export async function syncAlgorithmPrefsFromFirestore(
  uid?: string | null
): Promise<LoopsAlgorithmPrefs> {
  const local = loadLocalAlgorithmPrefs();
  if (!uid) return local;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const remote = snap.data()?.algorithmPrefs;
      if (remote && typeof remote === "object") {
        const remoteTs = Number(remote.updatedAt || 0);
        if (remoteTs >= local.updatedAt && Array.isArray(remote.moreTopics)) {
          const merged: LoopsAlgorithmPrefs = {
            moreTopics: remote.moreTopics.filter(
              (x: unknown) => typeof x === "string" && x.trim()
            ),
            lessTopics: Array.isArray(remote.lessTopics)
              ? remote.lessTopics.filter(
                  (x: unknown) => typeof x === "string" && x.trim()
                )
              : [],
            strictFilter: Boolean(remote.strictFilter),
            updatedAt: remoteTs,
          };
          localStorage.setItem(
            LOOPS_ALGORITHM_STORAGE_KEY,
            JSON.stringify(merged)
          );
          return merged;
        }
      }
    }
  } catch {}
  return local;
}

export function extractPostTopicsForAlgorithm(post: ScamPost): string[] {
  const found: string[] = [];
  if (post.postTag && post.postTag.trim()) {
    found.push(post.postTag.trim());
  }
  if (post.category && post.category !== "other") {
    const formatted = post.category
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    found.push(formatted);
  }
  if (Array.isArray(post.themes)) {
    post.themes.forEach((thId) => {
      const meta = FEED_THEMES.find((t) => t.id === thId);
      if (meta?.label) found.push(meta.label);
    });
  }
  const text = `${post.title || ""} ${post.description || ""}`;
  const tagMatches = text.match(/#([a-zA-Z0-9_\u0980-\u09FF]{2,28})/g);
  if (tagMatches) {
    tagMatches.slice(0, 4).forEach((raw) => {
      const clean = raw.replace(/^#/, "");
      if (clean) found.push(clean);
    });
  }
  return Array.from(new Set(found));
}

export function buildAlgorithmHeroHeadline(moreTopics: string[]): string {
  const active = moreTopics.filter(Boolean);
  if (active.length === 0) {
    return "Tune your Reels and Loops feed around the topics you care about.";
  }
  const fmt = (s: string) => s.trim();
  if (active.length === 1) {
    return `Lately you've been into ${fmt(active[0])}.`;
  }
  if (active.length === 2) {
    return `Lately you've been into ${fmt(active[0])} and ${fmt(active[1])}.`;
  }
  return `Lately you've been into ${fmt(active[0])}, ${fmt(active[1])} and ${fmt(
    active[2]
  )}.`;
}

export function applyUserAlgorithmToPosts(
  posts: ScamPost[],
  prefs: LoopsAlgorithmPrefs
): ScamPost[] {
  if (!posts.length) return posts;

  const lessTokens = prefs.lessTopics
    .map((t) => t.toLowerCase().trim())
    .filter(Boolean);
  const moreTokens = prefs.moreTopics
    .map((t) => t.toLowerCase().trim())
    .filter(Boolean);

  const postSearchBlob = (p: ScamPost) => {
    const themeLabels = (p.themes || [])
      .map((id) => FEED_THEMES.find((t) => t.id === id)?.label || id)
      .join(" ");
    return `${p.title || ""} ${p.description || ""} ${p.postTag || ""} ${
      p.category || ""
    } ${themeLabels}`.toLowerCase();
  };

  // 1. Filter out topics explicitly added to "What you want to see less of"
  let filtered = posts;
  if (lessTokens.length > 0) {
    filtered = posts.filter((p) => {
      const blob = postSearchBlob(p);
      return !lessTokens.some((tok) => tok.length >= 2 && blob.includes(tok));
    });
  }

  // 2. Optional strict filter mode (when Funnel button is toggled active)
  if (prefs.strictFilter && moreTokens.length > 0) {
    const strictMatched = filtered.filter((p) => {
      const blob = postSearchBlob(p);
      return moreTokens.some((tok) => {
        const words = tok.split(/\s+/).filter((w) => w.length >= 3);
        return (
          blob.includes(tok) || words.some((word) => blob.includes(word))
        );
      });
    });
    if (strictMatched.length > 0) {
      filtered = strictMatched;
    }
  }

  // 3. Boost posts matching "What you want to see more of" while preserving relative feed order
  if (moreTokens.length === 0) return filtered;

  return filtered
    .map((post, idx) => {
      const blob = postSearchBlob(post);
      let boost = 0;
      moreTokens.forEach((tok) => {
        if (blob.includes(tok)) {
          boost += 3;
        } else {
          const keywords = tok.split(/[\s()/-]+/).filter((w) => w.length >= 4);
          if (keywords.some((kw) => blob.includes(kw))) {
            boost += 1;
          }
        }
      });
      return { post, idx, boost };
    })
    .sort((a, b) => {
      if (b.boost !== a.boost) return b.boost - a.boost;
      return a.idx - b.idx;
    })
    .map((entry) => entry.post);
}
