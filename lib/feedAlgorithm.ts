import { doc, increment, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { ScamPost, ReactionType } from "../types";

const AFFINITY_STORAGE_KEY = "deep_feed_affinity_v1";
const IMPRESSIONS_STORAGE_KEY = "deep_feed_impressions_v1";
const DISMISSED_PROFILES_KEY = "deep_dismissed_profiles_v1";
const DISMISSED_POSTS_KEY = "deep_dismissed_posts_v1";
const MUTED_USERS_KEY = "loops_muted_users_v1";
const RESTRICTED_USERS_KEY = "loops_restricted_users_v1";
const BLOCKED_USERS_KEY = "loops_blocked_users_v1";

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

export function getTotalPostReactions(post: Partial<ScamPost> | null | undefined): number {
  if (!post) return 0;
  let sumFromCounts = 0;
  if (post.reactionsCount && typeof post.reactionsCount === "object") {
    sumFromCounts = (Object.values(post.reactionsCount) as number[]).reduce(
      (sum, val) => sum + Math.max(0, Number(val || 0)),
      0
    );
  }
  const sumFromReactionsObj =
    post.reactions && typeof post.reactions === "object"
      ? Object.keys(post.reactions).length
      : 0;
  const sumFromUsersObj =
    post.reactionsUsers && typeof post.reactionsUsers === "object"
      ? Object.keys(post.reactionsUsers).length
      : 0;
  const sumFromVotedIds = Array.isArray(post.votedUserIds)
    ? post.votedUserIds.filter(Boolean).length
    : 0;
  const votesNum = Math.max(0, Number(post.votes || 0));

  return Math.max(
    sumFromCounts,
    sumFromReactionsObj,
    sumFromUsersObj,
    sumFromVotedIds,
    votesNum
  );
}

export function hasUserReactedToPost(
  post: Partial<ScamPost> | null | undefined,
  uid?: string | null,
  localReaction?: ReactionType | null
): boolean {
  if (!post || !uid) return Boolean(localReaction);
  if (localReaction) return true;
  if (post.reactions && post.reactions[uid]) return true;
  if (post.reactionsUsers && post.reactionsUsers[uid]) return true;
  if (Array.isArray(post.votedUserIds) && post.votedUserIds.includes(uid)) {
    return true;
  }
  return false;
}

export function computeNextPostReactionState(
  post: ScamPost,
  uid: string,
  userMeta: {
    userName: string;
    userAvatar?: string;
    username?: string;
  },
  chosenType: ReactionType = "love",
  localReactionHint?: ReactionType | null
): {
  isRemoving: boolean;
  activeReaction: ReactionType | null;
  reactions: Record<string, ReactionType>;
  reactionsCount: Record<ReactionType, number>;
  reactionsUsers: NonNullable<ScamPost["reactionsUsers"]>;
  votedUserIds: string[];
  votes: number;
} {
  const existingUserReaction: ReactionType | null =
    post.reactions?.[uid] ||
    (post.reactionsUsers?.[uid]?.type as ReactionType | undefined) ||
    localReactionHint ||
    (Array.isArray(post.votedUserIds) && post.votedUserIds.includes(uid)
      ? "love"
      : null);

  const isRemoving = Boolean(existingUserReaction);

  const rawSum = post.reactionsCount
    ? (Object.values(post.reactionsCount) as number[]).reduce(
        (a, b) => a + Math.max(0, Number(b || 0)),
        0
      )
    : 0;
  const baselineTotal = getTotalPostReactions(post);

  const counts: Record<ReactionType, number> = {
    like: Math.max(0, Number(post.reactionsCount?.like || 0)),
    love: Math.max(0, Number(post.reactionsCount?.love || 0)),
    haha: Math.max(0, Number(post.reactionsCount?.haha || 0)),
    wow: Math.max(0, Number(post.reactionsCount?.wow || 0)),
    sad: Math.max(0, Number(post.reactionsCount?.sad || 0)),
    angry: Math.max(0, Number(post.reactionsCount?.angry || 0)),
  };

  // Preserve admin-configured votes/counts even if reactionsCount was partially unpopulated
  if (baselineTotal > rawSum) {
    counts.love += baselineTotal - rawSum;
  }

  if (isRemoving && existingUserReaction) {
    if (counts[existingUserReaction] > 0) {
      counts[existingUserReaction] = Math.max(0, counts[existingUserReaction] - 1);
    } else if (counts.love > 0) {
      counts.love = Math.max(0, counts.love - 1);
    } else if (counts.like > 0) {
      counts.like = Math.max(0, counts.like - 1);
    }
  } else {
    counts[chosenType] = (counts[chosenType] || 0) + 1;
  }

  const nextReactions: Record<string, ReactionType> = {
    ...(post.reactions || {}),
  };
  if (isRemoving) {
    delete nextReactions[uid];
  } else {
    nextReactions[uid] = chosenType;
  }

  const nextReactionsUsers: NonNullable<ScamPost["reactionsUsers"]> = {
    ...(post.reactionsUsers || {}),
  };
  if (isRemoving) {
    delete nextReactionsUsers[uid];
  } else {
    nextReactionsUsers[uid] = {
      userName: userMeta.userName || "Member",
      userAvatar: userMeta.userAvatar || "",
      type: chosenType,
      timestamp: Date.now(),
    };
  }

  const prevVoterSet = new Set<string>(
    Array.isArray(post.votedUserIds) ? post.votedUserIds.filter(Boolean) : []
  );
  if (isRemoving) {
    prevVoterSet.delete(uid);
  } else {
    prevVoterSet.add(uid);
  }
  const nextVotedUserIds = Array.from(prevVoterSet);

  const sumCountsAfter = (Object.values(counts) as number[]).reduce(
    (a, b) => a + Math.max(0, Number(b || 0)),
    0
  );
  const nextVotes = Math.max(
    sumCountsAfter,
    Object.keys(nextReactions).length,
    nextVotedUserIds.length
  );

  // Sync localStorage caches so offline/local copies never mask admin counts
  try {
    const localMap = JSON.parse(
      localStorage.getItem("deep_post_reactions") || "{}"
    );
    if (isRemoving) delete localMap[post.id];
    else localMap[post.id] = chosenType;
    localStorage.setItem("deep_post_reactions", JSON.stringify(localMap));
  } catch {}

  try {
    const rawPosts = localStorage.getItem("deep_scam_posts");
    if (rawPosts) {
      const list = JSON.parse(rawPosts);
      if (Array.isArray(list)) {
        const updatedList = list.map((item: any) =>
          item?.id === post.id
            ? {
                ...item,
                reactions: nextReactions,
                reactionsCount: counts,
                reactionsUsers: nextReactionsUsers,
                votedUserIds: nextVotedUserIds,
                votes: nextVotes,
              }
            : item
        );
        localStorage.setItem("deep_scam_posts", JSON.stringify(updatedList));
      }
    }
  } catch {}

  return {
    isRemoving,
    activeReaction: isRemoving ? null : chosenType,
    reactions: nextReactions,
    reactionsCount: counts,
    reactionsUsers: nextReactionsUsers,
    votedUserIds: nextVotedUserIds,
    votes: nextVotes,
  };
}

export function boostPostAffinity(post: Partial<ScamPost>): void {
  if (!post) return;
  const affinity = loadAffinity();
  if (post.reporterId) {
    affinity.authorClicks[post.reporterId] =
      (affinity.authorClicks[post.reporterId] || 0) + 5;
  }
  const themes = [
    ...(Array.isArray(post.themes) ? post.themes : []),
    ...(post.category ? [post.category] : []),
  ].filter(Boolean);
  themes.forEach((t) => {
    affinity.themeClicks[t] = (affinity.themeClicks[t] || 0) + 4;
  });
  saveAffinity(affinity);
}

function readIdList(key: string): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function toggleIdInStorage(key: string, targetId: string): boolean {
  if (!targetId) return false;
  const current = readIdList(key);
  const exists = current.includes(targetId);
  const next = exists
    ? current.filter((x) => x !== targetId)
    : Array.from(new Set([...current, targetId]));
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("loopsModerationUpdated"));
  }
  return !exists;
}

export function getMutedUserIds(): string[] {
  return readIdList(MUTED_USERS_KEY);
}

export function toggleMuteUserId(uid: string): boolean {
  return toggleIdInStorage(MUTED_USERS_KEY, uid);
}

export function getRestrictedUserIds(): string[] {
  return readIdList(RESTRICTED_USERS_KEY);
}

export function toggleRestrictUserId(uid: string): boolean {
  return toggleIdInStorage(RESTRICTED_USERS_KEY, uid);
}

export function getBlockedUserIds(): string[] {
  return readIdList(BLOCKED_USERS_KEY);
}

export function toggleBlockUserId(uid: string): boolean {
  return toggleIdInStorage(BLOCKED_USERS_KEY, uid);
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
  const dismissedSet = new Set([...dismissedPostIds, ...getDismissedPostIds()]);
  const hiddenAuthorSet = new Set([
    ...getMutedUserIds(),
    ...getBlockedUserIds(),
  ]);
  const filtered = posts.filter(
    (p) =>
      !dismissedSet.has(p.id) &&
      (!p.reporterId || !hiddenAuthorSet.has(p.reporterId))
  );
  if (filtered.length <= 1) return filtered;

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

    // 4. Per-session randomized discovery mix (stable during session)
    const discoveryJitter = seededDiscoveryNoise(post.id, sessionSeed) * 5.0;
    const timeWeight = Math.min(25, (Number(post.createdAt || 0) / 100000000000));

    const totalScore =
      timeWeight +
      (isFollowed ? 2.0 : 0) +
      discoveryJitter;

    return { post, score: totalScore };
  });

  scored.sort((a, b) => {
    if (Math.abs(b.score - a.score) > 0.001) {
      return b.score - a.score;
    }
    return Number(b.post.createdAt || 0) - Number(a.post.createdAt || 0);
  });

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
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("loopsModerationUpdated"));
  }
  return next;
}
