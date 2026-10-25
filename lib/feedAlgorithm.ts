import { doc, increment, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { ScamPost } from "../types";

const AFFINITY_STORAGE_KEY = "deep_feed_affinity_v1";
const IMPRESSIONS_STORAGE_KEY = "deep_feed_impressions_v1";
const DISMISSED_PROFILES_KEY = "deep_dismissed_profiles_v1";
const DISMISSED_POSTS_KEY = "deep_dismissed_posts_v1";

interface FeedAffinityState {
  authorClicks: Record<string, number>;
  themeClicks: Record<string, number>;
  clickedPostIds: Record<string, number>;
}

const sessionImpressedIds = new Set<string>();
const sessionViewedPostIds = new Set<string>();

function loadAffinity(): FeedAffinityState {
  try {
    const raw = localStorage.getItem(AFFINITY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        authorClicks: parsed.authorClicks || {},
        themeClicks: parsed.themeClicks || {},
        clickedPostIds: parsed.clickedPostIds || {},
      };
    }
  } catch {}
  return { authorClicks: {}, themeClicks: {}, clickedPostIds: {} };
}

function saveAffinity(state: FeedAffinityState) {
  try {
    localStorage.setItem(AFFINITY_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function loadImpressionCounts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(IMPRESSIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {}
  return {};
}

function saveImpressionCounts(counts: Record<string, number>) {
  try {
    localStorage.setItem(IMPRESSIONS_STORAGE_KEY, JSON.stringify(counts));
  } catch {}
}

/**
 * Deterministic fast hash noise in [0, 1) for a postId + per-load sessionSeed
 * so posts shuffle dynamically across refreshes while staying stable while scrolling.
 */
export function seededDiscoveryNoise(postId: string, sessionSeed: number): number {
  let h = sessionSeed ^ 0x811c9dc5;
  for (let i = 0; i < postId.length; i++) {
    h ^= postId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * Records a viewport impression when a user pauses over a post card in News Hub.
 * Updates local impression counts and increments Firestore `impressions` + `views` once per session.
 */
export async function recordPostImpression(postId: string): Promise<void> {
  if (!postId || postId.startsWith("showcase_") || sessionImpressedIds.has(postId)) {
    return;
  }
  sessionImpressedIds.add(postId);

  const counts = loadImpressionCounts();
  counts[postId] = (counts[postId] || 0) + 1;
  saveImpressionCounts(counts);

  try {
    await updateDoc(doc(db, "scam_posts", postId), {
      impressions: increment(1),
      views: increment(1),
    });
  } catch {}
}

/**
 * Records an active user click/engagement on a post (opening details, viewing media,
 * expanding long text, reacting, or opening comments).
 */
export async function recordPostClick(post: ScamPost): Promise<void> {
  if (!post?.id) return;

  const affinity = loadAffinity();
  if (post.reporterId) {
    affinity.authorClicks[post.reporterId] =
      (affinity.authorClicks[post.reporterId] || 0) + 1;
  }
  const themes = [
    ...(Array.isArray(post.themes) ? post.themes : []),
    ...(post.category ? [post.category] : []),
  ].filter(Boolean);
  themes.forEach((t) => {
    affinity.themeClicks[t] = (affinity.themeClicks[t] || 0) + 1;
  });
  affinity.clickedPostIds[post.id] = (affinity.clickedPostIds[post.id] || 0) + 1;
  saveAffinity(affinity);

  if (!post.id.startsWith("showcase_")) {
    try {
      await updateDoc(doc(db, "scam_posts", post.id), {
        clicks: increment(1),
        views: increment(1),
      });
    } catch {}
  }
}

/**
 * Records a standalone detail page view once per session when opening `/news-hub/post/:id`.
 */
export async function recordPostDetailView(postId: string): Promise<void> {
  if (!postId || postId.startsWith("showcase_") || sessionViewedPostIds.has(postId)) {
    return;
  }
  sessionViewedPostIds.add(postId);
  try {
    await updateDoc(doc(db, "scam_posts", postId), {
      views: increment(1),
      clicks: increment(1),
    });
  } catch {}
}

export function getTotalPostReactions(post: ScamPost): number {
  if (post.reactionsCount && typeof post.reactionsCount === "object") {
    return (Object.values(post.reactionsCount) as number[]).reduce(
      (sum, val) => sum + Number(val || 0),
      0
    );
  }
  return Number(post.votes || 0);
}

/**
 * Ranks posts dynamically using:
 *  - Post views (`views`)
 *  - User reactions + comments + shares (`reactionsCount`, `commentsCount`, `sharesCount`)
 *  - Viewport impressions (`impressions`)
 *  - User clicks & CTR (`clicks`)
 *  - Personal creator/topic affinity & unseen post novelty
 *  - Per-session randomized discovery mix so older engaging posts and newer posts blend naturally
 *    (never rigid newest-top / oldest-bottom, except a user's own post published within the last 60s).
 */
export function rankFeedPostsSmart(
  posts: ScamPost[],
  options: {
    currentUid?: string | null;
    followedIds: string[];
    sessionSeed: number;
    dismissedPostIds?: string[];
  }
): ScamPost[] {
  const { currentUid, followedIds, sessionSeed, dismissedPostIds = [] } = options;
  if (posts.length <= 1) return posts;

  const dismissedSet = new Set(dismissedPostIds);
  const filtered = posts.filter((p) => !dismissedSet.has(p.id));

  const affinity = loadAffinity();
  const localImpressions = loadImpressionCounts();
  const now = Date.now();

  // Keep a brand-new post published by the current user in the last 60 seconds pinned first for instant confirmation
  const justPublishedOwn: ScamPost[] = [];
  const pool: ScamPost[] = [];

  filtered.forEach((post) => {
    const ageMs = Math.max(0, now - Number(post.createdAt || 0));
    if (currentUid && post.reporterId === currentUid && ageMs < 60_000) {
      justPublishedOwn.push(post);
    } else {
      pool.push(post);
    }
  });

  const scored = pool.map((post) => {
    const views = Math.max(0, Number(post.views || 0));
    const impressions = Math.max(
      views,
      Number(post.impressions || 0) + Number(localImpressions[post.id] || 0)
    );
    const clicks =
      Math.max(0, Number(post.clicks || 0)) +
      Number(affinity.clickedPostIds[post.id] || 0);
    const reactions = getTotalPostReactions(post);
    const comments = Math.max(0, Number(post.commentsCount || 0));
    const shares = Math.max(0, Number(post.sharesCount || 0));

    // 1. Engagement & Reach Signals
    const viewScore = Math.log1p(views) * 2.4;
    const impressionScore = Math.log1p(impressions) * 1.5;
    const clickScore = Math.log1p(clicks * 3) * 3.0;
    const ctrRatio = impressions > 0 ? Math.min(1, clicks / impressions) : 0;
    const ctrBonus = ctrRatio * 5.5;
    const reactionScore =
      Math.log1p(reactions * 2.5 + comments * 3.5 + shares * 4.5) * 3.1;

    // 2. User Personal Affinity (followed creators + previously clicked authors/themes)
    const isFollowed = Boolean(
      post.reporterId && followedIds.includes(post.reporterId)
    );
    const authorAffinity = post.reporterId
      ? Math.min(6, (affinity.authorClicks[post.reporterId] || 0) * 1.3)
      : 0;
    const postThemes = [
      ...(Array.isArray(post.themes) ? post.themes : []),
      ...(post.category ? [post.category] : []),
    ].filter(Boolean);
    const themeAffinity = postThemes.reduce(
      (acc, t) => acc + Math.min(3, (affinity.themeClicks[t] || 0) * 0.8),
      0
    );

    // 3. Unseen Novelty Bonus (surface posts the user hasn't repeatedly scrolled past without clicking)
    const seenTimes = localImpressions[post.id] || 0;
    const hasClicked = Boolean(affinity.clickedPostIds[post.id]);
    const noveltyAdjustment =
      seenTimes === 0
        ? 4.0
        : !hasClicked && seenTimes >= 3
        ? -Math.min(5, seenTimes * 0.9)
        : 0;

    // 4. Per-session randomized discovery mix (allows older & newer posts to mix organically on every load)
    const discoveryJitter = seededDiscoveryNoise(post.id, sessionSeed) * 18.5;

    const totalScore =
      viewScore +
      impressionScore +
      clickScore +
      ctrBonus +
      reactionScore +
      (isFollowed ? 3.2 : 1.6) +
      authorAffinity +
      themeAffinity +
      noveltyAdjustment +
      discoveryJitter;

    return { post, score: totalScore };
  });

  scored.sort((a, b) => b.score - a.score);

  // Author diversity pass: avoid consecutive posts by the exact same author when variety exists
  const diversified: ScamPost[] = [];
  const remaining = [...scored];

  while (remaining.length > 0) {
    const prevAuthor =
      diversified.length > 0
        ? diversified[diversified.length - 1].reporterId
        : null;
    let pickIdx = 0;
    if (prevAuthor && remaining.length > 1) {
      const diffIdx = remaining.findIndex(
        (item) => item.post.reporterId !== prevAuthor
      );
      if (diffIdx > 0 && diffIdx <= 3) {
        pickIdx = diffIdx;
      }
    }
    const [picked] = remaining.splice(pickIdx, 1);
    diversified.push(picked.post);
  }

  return [...justPublishedOwn, ...diversified];
}

export function getDismissedProfileIds(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(DISMISSED_PROFILES_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function dismissSuggestedProfileId(uid: string): string[] {
  const next = Array.from(new Set([...getDismissedProfileIds(), uid]));
  try {
    localStorage.setItem(DISMISSED_PROFILES_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export function getDismissedPostIds(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(DISMISSED_POSTS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function dismissSuggestedPostId(postId: string): string[] {
  const next = Array.from(new Set([...getDismissedPostIds(), postId]));
  try {
    localStorage.setItem(DISMISSED_POSTS_KEY, JSON.stringify(next));
  } catch {}
  return next;
}
