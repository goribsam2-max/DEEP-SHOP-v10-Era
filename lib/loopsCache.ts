import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import type { ScamPost } from "../types";
import { preloadImageUrl } from "../components/SmoothImage";
import { prewarmVideoFirstChunk, resolvePostVideoSource } from "./videoEmbed";

export const LOOPS_FEED_CACHE_KEY = "ds_loops_feed_cache_v1";
export const LOOPS_STORIES_CACHE_KEY = "ds_loops_stories_cache_v1";
export const LOOPS_USERS_CACHE_KEY = "ds_loops_users_cache_v1";
export const LOOPS_NOTES_CACHE_KEY = "ds_loops_notes_cache_v1";

const MAX_NOTE_AGE_MS = 24 * 60 * 60 * 1000;
let lastBootstrapFetchAt = 0;
let inflightBootstrap: Promise<void> | null = null;

export function readCachedLoopsFeed(): ScamPost[] {
  try {
    const raw = localStorage.getItem(LOOPS_FEED_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCachedLoopsFeed(posts: ScamPost[]): void {
  try {
    localStorage.setItem(
      LOOPS_FEED_CACHE_KEY,
      JSON.stringify(posts.slice(0, 36))
    );
  } catch {}
}

export function readCachedLoopsStories(): any[] {
  try {
    const raw = localStorage.getItem(LOOPS_STORIES_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCachedLoopsStories(stories: any[]): void {
  try {
    localStorage.setItem(
      LOOPS_STORIES_CACHE_KEY,
      JSON.stringify(stories.slice(0, 24))
    );
  } catch {}
}

export function slimCommunityUserForCache(
  u: Record<string, any>
): Record<string, any> {
  return {
    uid: u.uid || u.id || "",
    id: u.id || u.uid || "",
    displayName: u.displayName || "",
    name: u.name || "",
    shopName: u.shopName || "",
    username: u.username || "",
    photoURL: u.photoURL || "",
    shopLogo: u.shopLogo || "",
    role: u.role || "",
    isVerified: Boolean(u.isVerified),
    kycStatus: u.kycStatus || "",
    following: Array.isArray(u.following) ? u.following.slice(0, 40) : [],
  };
}

export function readCachedCommunityUsers(): Record<string, any>[] {
  try {
    const raw = localStorage.getItem(LOOPS_USERS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCachedCommunityUsers(
  users: Record<string, any>[]
): void {
  try {
    localStorage.setItem(
      LOOPS_USERS_CACHE_KEY,
      JSON.stringify(users.slice(0, 45).map(slimCommunityUserForCache))
    );
  } catch {}
}

export function readCachedLoopsNotes(): Record<string, any> {
  try {
    const raw = localStorage.getItem(LOOPS_NOTES_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const now = Date.now();
    const out: Record<string, any> = {};
    Object.entries(parsed).forEach(([k, val]: [string, any]) => {
      if (!val?.text?.trim()) return;
      const exp = Number(val.expiresAtMs || 0);
      if (exp > 0 && exp <= now) return;
      out[k] = val;
    });
    return out;
  } catch {
    return {};
  }
}

export function writeCachedLoopsNotes(notesMap: Record<string, any>): void {
  try {
    localStorage.setItem(LOOPS_NOTES_CACHE_KEY, JSON.stringify(notesMap || {}));
  } catch {}
}

/**
 * Background bootstrap prefetcher so Loops Home and Loops Reels render in ~0s
 * immediately upon navigation without waiting for Firestore roundtrips or media headers.
 */
export async function prefetchLoopsBootstrap(force = false): Promise<void> {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (!force && now - lastBootstrapFetchAt < 45_000) {
    return inflightBootstrap || Promise.resolve();
  }
  if (inflightBootstrap) return inflightBootstrap;
  lastBootstrapFetchAt = now;

  inflightBootstrap = (async () => {
    try {
      const [postsSnap, usersSnap, notesSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, "scam_posts"),
            orderBy("createdAt", "desc"),
            limit(18)
          )
        ).catch(() => null),
        getDocs(query(collection(db, "users"), limit(40))).catch(() => null),
        getDocs(query(collection(db, "user_notes"), limit(30))).catch(() => null),
      ]);

      if (postsSnap && !postsSnap.empty) {
        const list = postsSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ScamPost, "id">),
        }));
        const existing = readCachedLoopsFeed();
        if (list.length >= existing.length || existing.length === 0) {
          writeCachedLoopsFeed(list);
        }

        // Prewarm top 3 videos and top 4 post visuals in background
        let videosWarmed = 0;
        list.slice(0, 10).forEach((post: any, idx) => {
          if (idx < 4 && Array.isArray(post.images) && post.images[0]) {
            preloadImageUrl(post.images[0]);
          }
          if (videosWarmed < 3) {
            const vid = resolvePostVideoSource(post);
            const url =
              vid?.directStreamUrl || vid?.canonicalUrl || post.videoUrl || "";
            if (url) {
              videosWarmed += 1;
              prewarmVideoFirstChunk(url);
            }
          }
        });
      }

      if (usersSnap && !usersSnap.empty) {
        const usersList = usersSnap.docs.map((d) => ({
          uid: d.id,
          ...d.data(),
        }));
        writeCachedCommunityUsers(usersList);
      }

      if (notesSnap) {
        const notesMap: Record<string, any> = {};
        const nowMs = Date.now();
        notesSnap.forEach((d) => {
          const data = d.data();
          const createdMs =
            typeof data.createdAtMs === "number"
              ? data.createdAtMs
              : data.createdAt?.toMillis
              ? data.createdAt.toMillis()
              : 0;
          const isValid =
            Boolean(data?.text?.trim()) &&
            (createdMs > 0
              ? nowMs - createdMs <= MAX_NOTE_AGE_MS &&
                (!data.expiresAtMs || data.expiresAtMs > nowMs)
              : typeof data.expiresAtMs === "number" &&
                data.expiresAtMs > nowMs &&
                data.expiresAtMs - nowMs <= MAX_NOTE_AGE_MS);
          if (isValid) {
            notesMap[d.id] = {
              userId: d.id,
              displayName: data.displayName || "",
              photoURL: data.photoURL || "",
              text: data.text || "",
              moodEmojis: data.moodEmojis || [],
              gifUrl: data.gifUrl || "",
              musicTitle: data.musicTitle || "",
              musicArtist: data.musicArtist || "",
              musicCover: data.musicCover || "",
              musicAudioUrl: data.musicAudioUrl || "",
              audience: data.audience || "friends",
              durationHours: data.durationHours || 24,
              createdAtMs: createdMs,
              expiresAtMs: data.expiresAtMs || 0,
            };
          }
        });
        writeCachedLoopsNotes(notesMap);
      }
    } catch {}
  })().finally(() => {
    inflightBootstrap = null;
  });

  return inflightBootstrap;
}
