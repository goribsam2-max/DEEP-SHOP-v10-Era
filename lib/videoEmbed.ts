export type VideoPlatform = "youtube" | "facebook" | "tiktok";

export interface ParsedVideoEmbed {
  platform: VideoPlatform;
  originalUrl: string;
  canonicalUrl: string;
  videoId?: string;
  isVertical: boolean;
  needsResolution?: boolean;
}

const URL_IN_TEXT_REGEX =
  /(?:https?:\/\/[^\s<>"]+|www\.[^\s<>"]+|\b(?:(?:m|vt|vm|music)\.)?(?:youtube\.com|youtu\.be|facebook\.com|fb\.watch|tiktok\.com)\/[^\s<>"]+)/gi;

const stripTrailingPunct = (raw: string): string => {
  let clean = raw.trim();
  while (clean.length > 0 && /[.,!?;:)\]}>'"]$/.test(clean)) {
    clean = clean.slice(0, -1);
  }
  return clean;
};

const ensureProtocol = (raw: string): string => {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export function parseVideoEmbed(rawInput?: string | null): ParsedVideoEmbed | null {
  if (!rawInput || !rawInput.trim()) return null;

  const cleaned = stripTrailingPunct(rawInput);
  if (!cleaned || cleaned.startsWith("/") || cleaned.startsWith("blob:") || cleaned.startsWith("data:")) {
    return null;
  }

  const normalized = ensureProtocol(cleaned);
  let u: URL;
  try {
    u = new URL(normalized);
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^www\./i, "").toLowerCase();
  const pathname = u.pathname || "";

  // 1. YouTube (watch?v=, youtu.be/, shorts/, live/, embed/)
  if (
    host === "youtu.be" ||
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host === "youtube-nocookie.com"
  ) {
    let ytId: string | null = null;
    let isVertical = false;

    if (host === "youtu.be") {
      ytId = pathname.split("/").filter(Boolean)[0] || null;
    } else if (pathname.startsWith("/shorts/")) {
      ytId = pathname.split("/shorts/")[1]?.split("/")[0] || null;
      isVertical = true;
    } else if (pathname.startsWith("/live/")) {
      ytId = pathname.split("/live/")[1]?.split("/")[0] || null;
    } else if (pathname.startsWith("/embed/")) {
      ytId = pathname.split("/embed/")[1]?.split("/")[0] || null;
    } else if (u.searchParams.get("v")) {
      ytId = u.searchParams.get("v");
    }

    if (ytId && /^[a-zA-Z0-9_-]{6,20}$/.test(ytId)) {
      return {
        platform: "youtube",
        originalUrl: normalized,
        canonicalUrl: isVertical
          ? `https://www.youtube.com/shorts/${ytId}`
          : `https://www.youtube.com/watch?v=${ytId}`,
        videoId: ytId,
        isVertical,
      };
    }
  }

  // 2. Facebook Videos & Reels (watch, videos, reel, reels, share/v, share/r, fb.watch, video.php)
  if (
    host === "fb.watch" ||
    host === "facebook.com" ||
    host.endsWith(".facebook.com") ||
    host === "fb.com"
  ) {
    const isShortFbWatch = host === "fb.watch";
    const isReel =
      /^\/reels?\//i.test(pathname) || /^\/share\/r\//i.test(pathname);
    const isShareVideo = /^\/share\/v\//i.test(pathname);
    const isVideosPath = /\/videos\/.+/i.test(pathname);
    const isWatch =
      /^\/watch\/?$/i.test(pathname) && Boolean(u.searchParams.get("v"));
    const isVideoPhp =
      /^\/video\.php$/i.test(pathname) && Boolean(u.searchParams.get("v"));

    if (
      isShortFbWatch ||
      isReel ||
      isShareVideo ||
      isVideosPath ||
      isWatch ||
      isVideoPhp
    ) {
      let canonicalFb = normalized;
      if (host !== "fb.watch" && host.endsWith("facebook.com")) {
        try {
          const copy = new URL(normalized);
          copy.hostname = "www.facebook.com";
          canonicalFb = copy.toString();
        } catch {}
      }

      return {
        platform: "facebook",
        originalUrl: normalized,
        canonicalUrl: canonicalFb,
        isVertical: isReel,
        needsResolution:
          isShortFbWatch || isShareVideo || /^\/share\/r\//i.test(pathname),
      };
    }
  }

  // 3. TikTok (@user/video/ID, /v/ID, vt.tiktok.com, vm.tiktok.com, tiktok.com/t/)
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    const idMatch =
      pathname.match(/\/video\/(\d{15,25})/) ||
      pathname.match(/\/v\/(\d{15,25})/);

    if (idMatch?.[1]) {
      return {
        platform: "tiktok",
        originalUrl: normalized,
        canonicalUrl: normalized,
        videoId: idMatch[1],
        isVertical: true,
        needsResolution: false,
      };
    }

    const isShortTikTok =
      host === "vt.tiktok.com" ||
      host === "vm.tiktok.com" ||
      /^\/t\/[a-zA-Z0-9_-]+/i.test(pathname) ||
      (pathname.length > 1 && !pathname.includes("/photo/"));

    if (isShortTikTok && pathname.length > 1) {
      return {
        platform: "tiktok",
        originalUrl: normalized,
        canonicalUrl: normalized,
        isVertical: true,
        needsResolution: true,
      };
    }
  }

  return null;
}

export function isEmbeddableVideoUrl(url?: string | null): boolean {
  return Boolean(parseVideoEmbed(url));
}

export function extractFirstVideoUrlFromText(text?: string | null): string | null {
  if (!text) return null;
  for (const match of text.matchAll(URL_IN_TEXT_REGEX)) {
    const raw = stripTrailingPunct(match[0]);
    const parsed = parseVideoEmbed(raw);
    if (parsed) {
      return parsed.originalUrl;
    }
  }
  return null;
}

export function resolvePostVideoSource(
  post?: {
    videoUrl?: string | null;
    description?: string | null;
  } | null
): ParsedVideoEmbed | null {
  if (!post) return null;
  if (post.videoUrl && post.videoUrl.trim()) {
    const directParsed = parseVideoEmbed(post.videoUrl.trim());
    if (directParsed) return directParsed;
  }
  const fromCaption = extractFirstVideoUrlFromText(post.description);
  if (fromCaption) {
    return parseVideoEmbed(fromCaption);
  }
  return null;
}

const shortUrlCache = new Map<
  string,
  Promise<{ resolvedUrl: string; tiktokVideoId: string | null }>
>();

export function resolveShortVideoUrl(
  url: string
): Promise<{ resolvedUrl: string; tiktokVideoId: string | null }> {
  const key = url.trim();
  const cached = shortUrlCache.get(key);
  if (cached) return cached;

  const req = fetch(`/api/resolve-video-url?url=${encodeURIComponent(key)}`)
    .then(async (res) => {
      if (!res.ok) throw new Error("Resolve failed");
      const data = await res.json();
      return {
        resolvedUrl: String(data.resolvedUrl || key),
        tiktokVideoId: data.tiktokVideoId ? String(data.tiktokVideoId) : null,
      };
    })
    .catch(() => ({
      resolvedUrl: key,
      tiktokVideoId: null,
    }));

  shortUrlCache.set(key, req);
  return req;
}
