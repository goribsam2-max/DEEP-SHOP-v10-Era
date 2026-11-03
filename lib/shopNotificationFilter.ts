const LOOPS_NOTIFICATION_TYPES = new Set([
  "follow",
  "like",
  "story_like",
  "comment",
  "repost",
  "story",
  "milestone",
  "loop",
  "loop_post_report",
  "reel",
  "post_like",
  "post_comment",
  "star_gift",
  "gift",
  "social",
]);

const LOOPS_PATH_PREFIXES = [
  "/loops",
  "/news",
  "/news-hub",
  "/reel",
  "/create-reel",
  "/scam",
];

/**
 * Strictly detects whether a notification record belongs to Loops / Social Hub
 * so Shop notification views and badges never display Loops activity.
 */
export function isLoopsNotification(notif: any): boolean {
  if (!notif || typeof notif !== "object") return false;

  if (
    notif.isLoop === true ||
    notif.source === "loops" ||
    notif.category === "loops" ||
    Boolean(notif.fromUserId) ||
    Boolean(notif.fromUserUsername) ||
    Boolean(notif.postId) ||
    Boolean(notif.reelId) ||
    Boolean(notif.storyId) ||
    Boolean(notif.reportedAuthorId)
  ) {
    return true;
  }

  const rawType = String(notif.type || "").trim().toLowerCase();
  if (rawType && LOOPS_PATH_PREFIXES.some((p) => rawType === p.slice(1))) {
    return true;
  }
  if (LOOPS_NOTIFICATION_TYPES.has(rawType)) {
    return true;
  }

  const rawLink = String(notif.link || "").trim().toLowerCase();
  if (
    rawLink &&
    LOOPS_PATH_PREFIXES.some(
      (prefix) => rawLink === prefix || rawLink.startsWith(`${prefix}/`) || rawLink.startsWith(`${prefix}?`)
    )
  ) {
    return true;
  }

  const combinedTitle = `${notif.title || ""} ${notif.message || ""} ${notif.body || ""}`.toLowerCase();
  if (
    combinedTitle.includes("new follower") ||
    combinedTitle.includes("started following you") ||
    combinedTitle.includes("loop reported") ||
    combinedTitle.includes("shared a story") ||
    combinedTitle.includes("view story on loops") ||
    combinedTitle.includes("liked your loop") ||
    combinedTitle.includes("commented on your loop")
  ) {
    return true;
  }

  return false;
}

export function filterShopNotifications<T>(items: T[]): T[] {
  return items.filter((item) => !isLoopsNotification(item));
}
