export type VideoPlatform =
  | "youtube"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "x"
  | "vimeo"
  | "streamable"
  | "dailymotion"
  | "direct";

export interface ParsedVideoEmbed {
  platform: VideoPlatform;
  originalUrl: string;
  canonicalUrl: string;
  videoId?: string;
  shortcode?: string;
  isVertical: boolean;
  needsResolution?: boolean;
  directStreamUrl?: string;
  thumbnailUrl?: string;
}

export interface VideoPlatformMeta {
  platform: VideoPlatform;
  name: string;
  shortName: string;
  reelLabel: string;
  domain: string;
}

export function getVideoPlatformMeta(
  platform: VideoPlatform,
  originalUrl?: string | null
): VideoPlatformMeta {
  let parsedDomain = "";
  if (originalUrl) {
    try {
      parsedDomain = new URL(
        /^https?:\/\//i.test(originalUrl) ? originalUrl : `https://${originalUrl}`
      ).hostname.replace(/^www\./i, "");
    } catch {
      parsedDomain = "";
    }
  }

  switch (platform) {
    case "instagram":
      return {
        platform,
        name: "Instagram",
        shortName: "Instagram",
        reelLabel: "Instagram Reel",
        domain: parsedDomain || "instagram.com",
      };
    case "youtube":
      return {
        platform,
        name: "YouTube",
        shortName: "YouTube",
        reelLabel:
          originalUrl && /\/shorts\//i.test(originalUrl)
            ? "YouTube Shorts"
            : "YouTube Video",
        domain: parsedDomain || "youtube.com",
      };
    case "facebook":
      return {
        platform,
        name: "Facebook",
        shortName: "Facebook",
        reelLabel:
          originalUrl && /\/reels?\//i.test(originalUrl)
            ? "Facebook Reel"
            : "Facebook Video",
        domain: parsedDomain || "facebook.com",
      };
    case "tiktok":
      return {
        platform,
        name: "TikTok",
        shortName: "TikTok",
        reelLabel: "TikTok",
        domain: parsedDomain || "tiktok.com",
      };
    case "x":
      return {
        platform,
        name: "X (Twitter)",
        shortName: "X",
        reelLabel: "X Video",
        domain: parsedDomain || "x.com",
      };
    case "vimeo":
      return {
        platform,
        name: "Vimeo",
        shortName: "Vimeo",
        reelLabel: "Vimeo",
        domain: parsedDomain || "vimeo.com",
      };
    case "streamable":
      return {
        platform,
        name: "Streamable",
        shortName: "Streamable",
        reelLabel: "Streamable Clip",
        domain: parsedDomain || "streamable.com",
      };
    case "dailymotion":
      return {
        platform,
        name: "Dailymotion",
        shortName: "Dailymotion",
        reelLabel: "Dailymotion Video",
        domain: parsedDomain || "dailymotion.com",
      };
    case "direct":
    default:
      return {
        platform: "direct",
        name: "Loops Original",
        shortName: "Loops",
        reelLabel: "Original Reel",
        domain: "Loops",
      };
  }
}

const URL_IN_TEXT_REGEX =
  /(?:https?:\/\/[^\s<>"]+|www\.[^\s<>"]+|\b(?:(?:m|vt|vm|music|player)\.)?(?:youtube\.com|youtu\.be|instagram\.com|instagr\.am|facebook\.com|fb\.watch|fb\.com|tiktok\.com|x\.com|twitter\.com|vimeo\.com|streamable\.com|dailymotion\.com|dai\.ly)\/[^\s<>"]+)/gi;

const DIRECT_VIDEO_EXT_REGEX =
  /\.(?:mp4|webm|mov|m4v|ogv|ogg|mkv|3gp|mpeg|mpg|avi)(?:$|[?#])/i;

const AUDIO_ONLY_EXT_REGEX =
  /\.(?:mp3|wav|m4a|aac|flac|opus)(?:$|[?#])/i;

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

const PROXY_MEDIA_HOSTS = [
  "files.catbox.moe",
  "litter.catbox.moe",
  "catbox.moe",
  "pomf2.lain.la",
  "uguu.se",
  "tmpfiles.org",
  "pixabay.com",
  "dzcdn.net",
];

export function toPlayableMediaUrl(rawUrl?: string | null): string {
  if (!rawUrl || !rawUrl.trim()) return "";
  const trimmed = rawUrl.trim();
  if (
    trimmed.startsWith("/api/stream-media") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }

  try {
    const normalized = ensureProtocol(trimmed).replace(/^http:\/\//i, "https://");
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const shouldProxy = PROXY_MEDIA_HOSTS.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`)
    );
    if (shouldProxy) {
      return `/api/stream-media?url=${encodeURIComponent(normalized)}`;
    }
    return normalized;
  } catch {
    return trimmed;
  }
}

export function toPlayableAudioUrl(rawUrl?: string | null): string {
  if (!rawUrl || !rawUrl.trim()) return "";
  const trimmed = rawUrl.trim();
  if (
    trimmed.startsWith("/api/stream-media") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }
  try {
    const normalized = ensureProtocol(trimmed).replace(/^http:\/\//i, "https://");
    const parsed = new URL(normalized);
    if (
      typeof window !== "undefined" &&
      parsed.origin === window.location.origin
    ) {
      return normalized;
    }
    return `/api/stream-media?url=${encodeURIComponent(normalized)}`;
  } catch {
    return trimmed;
  }
}

export function parseVideoEmbed(
  rawInput?: string | null,
  options?: { allowFallbackDirectVideo?: boolean }
): ParsedVideoEmbed | null {
  if (!rawInput || !rawInput.trim()) return null;

  const cleaned = stripTrailingPunct(rawInput);
  if (!cleaned) return null;

  // Support same-origin media stream proxy & local blob previews directly
  if (
    cleaned.startsWith("/api/stream-media") ||
    cleaned.startsWith("blob:") ||
    (options?.allowFallbackDirectVideo && cleaned.startsWith("/"))
  ) {
    return {
      platform: "direct",
      originalUrl: cleaned,
      canonicalUrl: cleaned,
      directStreamUrl: cleaned,
      isVertical: true,
    };
  }

  if (
    cleaned.startsWith("/") ||
    cleaned.startsWith("blob:") ||
    cleaned.startsWith("data:")
  ) {
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

  // 1. Direct Video File URLs (.mp4, .webm, .mov, .m4v, uploaded direct streams)
  const isDirectMediaHost =
    (host === "files.catbox.moe" ||
      host === "litter.catbox.moe" ||
      host === "pomf2.lain.la" ||
      host === "uguu.se" ||
      host.endsWith(".uguu.se") ||
      (host === "tmpfiles.org" && pathname.startsWith("/dl/"))) &&
    !AUDIO_ONLY_EXT_REGEX.test(pathname);

  if (
    isDirectMediaHost ||
    DIRECT_VIDEO_EXT_REGEX.test(pathname) ||
    DIRECT_VIDEO_EXT_REGEX.test(u.search) ||
    /\/video\/upload\//i.test(pathname)
  ) {
    return {
      platform: "direct",
      originalUrl: normalized,
      canonicalUrl: normalized,
      directStreamUrl: toPlayableMediaUrl(normalized),
      isVertical: true,
    };
  }

  // 2. Instagram Reels, Posts & IGTV (instagram.com/reel/ID, /reels/ID, /p/ID, /tv/ID, /share/reel/ID)
  if (
    host === "instagram.com" ||
    host.endsWith(".instagram.com") ||
    host === "instagr.am"
  ) {
    const igMatch = pathname.match(
      /\/(?:(reel|reels|p|tv)\/)([a-zA-Z0-9_-]{5,32})/i
    );
    if (igMatch?.[2]) {
      const kind = igMatch[1].toLowerCase();
      const shortcode = igMatch[2];
      const canonicalKind = kind === "p" ? "p" : "reel";
      return {
        platform: "instagram",
        originalUrl: normalized,
        canonicalUrl: `https://www.instagram.com/${canonicalKind}/${shortcode}/`,
        videoId: shortcode,
        shortcode,
        isVertical: true,
        needsResolution: true,
      };
    }

    if (/^\/share\/(?:reel|reels|p)\/[a-zA-Z0-9_-]+/i.test(pathname)) {
      return {
        platform: "instagram",
        originalUrl: normalized,
        canonicalUrl: normalized,
        isVertical: true,
        needsResolution: true,
      };
    }
  }

  // 3. YouTube (watch?v=, youtu.be/, shorts/, live/, embed/)
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
        thumbnailUrl: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
        isVertical,
      };
    }
  }

  // 4. Facebook Videos & Reels (watch, videos, reel, reels, share/v, share/r, fb.watch, video.php)
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
          isShortFbWatch ||
          isShareVideo ||
          isReel ||
          /^\/share\/r\//i.test(pathname),
      };
    }
  }

  // 5. TikTok (@user/video/ID, /v/ID, vt.tiktok.com, vm.tiktok.com, tiktok.com/t/)
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

  // 6. X / Twitter Status Videos (x.com/user/status/ID, twitter.com/user/status/ID)
  if (
    host === "x.com" ||
    host.endsWith(".x.com") ||
    host === "twitter.com" ||
    host.endsWith(".twitter.com")
  ) {
    const statusMatch = pathname.match(/\/status(?:es)?\/(\d{10,25})/i);
    if (statusMatch?.[1]) {
      return {
        platform: "x",
        originalUrl: normalized,
        canonicalUrl: `https://x.com/i/status/${statusMatch[1]}`,
        videoId: statusMatch[1],
        isVertical: true,
        needsResolution: true,
      };
    }
  }

  // 7. Vimeo (vimeo.com/ID, player.vimeo.com/video/ID)
  if (host === "vimeo.com" || host.endsWith(".vimeo.com")) {
    const vimeoMatch =
      pathname.match(/\/video\/(\d{6,15})/) || pathname.match(/^\/(\d{6,15})/);
    if (vimeoMatch?.[1]) {
      return {
        platform: "vimeo",
        originalUrl: normalized,
        canonicalUrl: `https://vimeo.com/${vimeoMatch[1]}`,
        videoId: vimeoMatch[1],
        isVertical: false,
      };
    }
  }

  // 8. Streamable (streamable.com/ID)
  if (host === "streamable.com" || host.endsWith(".streamable.com")) {
    const stMatch = pathname.match(/^\/(?:e\/|o\/)?([a-zA-Z0-9]{4,16})/);
    if (stMatch?.[1]) {
      return {
        platform: "streamable",
        originalUrl: normalized,
        canonicalUrl: `https://streamable.com/${stMatch[1]}`,
        videoId: stMatch[1],
        isVertical: true,
      };
    }
  }

  // 9. Dailymotion (dailymotion.com/video/ID, dai.ly/ID)
  if (
    host === "dailymotion.com" ||
    host.endsWith(".dailymotion.com") ||
    host === "dai.ly"
  ) {
    const dmMatch =
      host === "dai.ly"
        ? pathname.match(/^\/([a-zA-Z0-9]{5,16})/)
        : pathname.match(/\/video\/([a-zA-Z0-9]{5,16})/);
    if (dmMatch?.[1]) {
      return {
        platform: "dailymotion",
        originalUrl: normalized,
        canonicalUrl: `https://www.dailymotion.com/video/${dmMatch[1]}`,
        videoId: dmMatch[1],
        isVertical: false,
      };
    }
  }

  // Fallback for explicit `post.videoUrl` pointing to a custom CDN/storage video stream without extension
  if (options?.allowFallbackDirectVideo) {
    return {
      platform: "direct",
      originalUrl: normalized,
      canonicalUrl: normalized,
      directStreamUrl: toPlayableMediaUrl(normalized),
      isVertical: true,
    };
  }

  return null;
}

export function isEmbeddableVideoUrl(url?: string | null): boolean {
  return Boolean(parseVideoEmbed(url));
}

export function extractFirstVideoUrlFromText(
  text?: string | null
): string | null {
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
    const directParsed = parseVideoEmbed(post.videoUrl.trim(), {
      allowFallbackDirectVideo: true,
    });
    if (directParsed) return directParsed;
  }
  const fromCaption = extractFirstVideoUrlFromText(post.description);
  if (fromCaption) {
    return parseVideoEmbed(fromCaption);
  }
  return null;
}

export interface ResolvedVideoMetadata {
  resolvedUrl: string;
  tiktokVideoId: string | null;
  instagramShortcode: string | null;
  directVideoUrl: string | null;
  thumbnailUrl: string | null;
}

const shortUrlCache = new Map<string, Promise<ResolvedVideoMetadata>>();

export function resolveShortVideoUrl(
  url: string
): Promise<ResolvedVideoMetadata> {
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
        instagramShortcode: data.instagramShortcode
          ? String(data.instagramShortcode)
          : null,
        directVideoUrl: data.directVideoUrl
          ? String(data.directVideoUrl)
          : null,
        thumbnailUrl: data.thumbnailUrl ? String(data.thumbnailUrl) : null,
      };
    })
    .catch(() => ({
      resolvedUrl: key,
      tiktokVideoId: null,
      instagramShortcode: null,
      directVideoUrl: null,
      thumbnailUrl: null,
    }));

  shortUrlCache.set(key, req);
  return req;
}
