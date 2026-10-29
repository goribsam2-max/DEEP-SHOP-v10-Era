import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Link2,
  ExternalLink,
  ArrowUpRight,
  Globe,
  Play,
  ShoppingBag,
} from "lucide-react";
import { triggerHaptic } from "../lib/haptics";
import { isEmbeddableVideoUrl } from "../lib/videoEmbed";

export interface ParsedSegment {
  type: "text" | "hashtag" | "mention" | "link";
  raw: string;
  href?: string;
  tag?: string;
  mention?: string;
}

const TOKEN_REGEX =
  /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+|\b(?:[a-zA-Z0-9-]+\.)+(?:com|net|org|io|top|me|co|bd|app|dev|watch|be|ly)(?:\/[^\s<>"]*)?|@[a-zA-Z0-9_.]+|#[\p{L}\p{M}\p{N}_]+)/gu;

const stripTrailingPunctuation = (val: string): { clean: string; trailing: string } => {
  let clean = val;
  let trailing = "";
  while (clean.length > 0 && /[.,!?;:)\]}>'"]$/.test(clean)) {
    trailing = clean.slice(-1) + trailing;
    clean = clean.slice(0, -1);
  }
  return { clean, trailing };
};

export const normalizeHref = (rawUrl: string): string => {
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  return `https://${rawUrl}`;
};

export const parseRichSegments = (text: string): ParsedSegment[] => {
  if (!text) return [];
  const segments: ParsedSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(TOKEN_REGEX)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      segments.push({
        type: "text",
        raw: text.slice(lastIndex, matchIndex),
      });
    }

    const token = match[0];
    if (token.startsWith("#")) {
      const tagBody = token.slice(1);
      if (tagBody.length > 0) {
        segments.push({
          type: "hashtag",
          raw: token,
          tag: tagBody,
        });
      } else {
        segments.push({ type: "text", raw: token });
      }
      lastIndex = matchIndex + token.length;
    } else if (token.startsWith("@")) {
      const { clean, trailing } = stripTrailingPunctuation(token);
      const handle = clean.slice(1);
      if (handle.length > 0) {
        segments.push({
          type: "mention",
          raw: clean,
          mention: handle,
        });
        if (trailing) {
          segments.push({ type: "text", raw: trailing });
        }
      } else {
        segments.push({ type: "text", raw: token });
      }
      lastIndex = matchIndex + token.length;
    } else {
      const { clean, trailing } = stripTrailingPunctuation(token);
      if (clean.length > 3) {
        segments.push({
          type: "link",
          raw: clean,
          href: normalizeHref(clean),
        });
        if (trailing) {
          segments.push({ type: "text", raw: trailing });
        }
      } else {
        segments.push({ type: "text", raw: token });
      }
      lastIndex = matchIndex + token.length;
    }
  }

  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      raw: text.slice(lastIndex),
    });
  }

  return segments;
};

export const extractLinksFromText = (text?: string): string[] => {
  if (!text) return [];
  const segments = parseRichSegments(text);
  const urls: string[] = [];
  segments.forEach((s) => {
    if (s.type === "link" && s.href && !urls.includes(s.href)) {
      urls.push(s.href);
    }
  });
  return urls;
};

export const extractHashtagsFromText = (text?: string): string[] => {
  if (!text) return [];
  const segments = parseRichSegments(text);
  const tags: string[] = [];
  segments.forEach((s) => {
    if (s.type === "hashtag" && s.tag) {
      const lower = s.tag.toLowerCase();
      if (!tags.includes(lower)) tags.push(lower);
    }
  });
  return tags;
};

const formatCompactLinkLabel = (href: string): string => {
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./i, "");
    const path = u.pathname && u.pathname !== "/" ? u.pathname : "";
    const combined = `${host}${path}`;
    return combined.length > 34 ? `${combined.slice(0, 32)}…` : combined;
  } catch {
    return href.length > 34 ? `${href.slice(0, 32)}…` : href;
  }
};

const extractYouTubeId = (href: string): string | null => {
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "youtu.be") {
      return u.pathname.slice(1).split("/")[0] || null;
    }
    if (host.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      if (u.pathname.startsWith("/shorts/")) {
        return u.pathname.split("/shorts/")[1]?.split("/")[0] || null;
      }
    }
  } catch {}
  return null;
};

const getPlatformMeta = (href: string) => {
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    const cleanPath =
      u.pathname && u.pathname !== "/"
        ? decodeURIComponent(u.pathname).replace(/^\/+|\/+$/g, "")
        : "";

    if (host.includes("youtube.com") || host === "youtu.be") {
      return {
        platform: "YouTube Video",
        host,
        subtitle: cleanPath ? `youtube.com/${cleanPath}` : u.hostname,
        badgeBg: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
        isShop: false,
        ytId: extractYouTubeId(href),
      };
    }
    if (host.includes("facebook.com") || host === "fb.com" || host === "fb.watch") {
      return {
        platform: "Facebook Link",
        host,
        subtitle: cleanPath || "View page or post on Facebook",
        badgeBg: "bg-[#1877F2]/12 text-[#1877F2] dark:text-[#58A6FF]",
        isShop: false,
        ytId: null,
      };
    }
    if (host.includes("instagram.com")) {
      return {
        platform: "Instagram",
        host,
        subtitle: cleanPath ? `@${cleanPath.split("/")[0]}` : "View on Instagram",
        badgeBg: "bg-pink-500/12 text-pink-600 dark:text-pink-400",
        isShop: false,
        ytId: null,
      };
    }
    if (host.includes("tiktok.com")) {
      return {
        platform: "TikTok",
        host,
        subtitle: cleanPath || "Watch on TikTok",
        badgeBg: "bg-zinc-900/10 text-zinc-900 dark:bg-white/15 dark:text-white",
        isShop: false,
        ytId: null,
      };
    }
    if (
      host.includes("deepshop.top") ||
      (typeof window !== "undefined" && host === window.location.hostname)
    ) {
      return {
        platform: "Deep Shop Link",
        host,
        subtitle: cleanPath ? `/${cleanPath}` : "Explore on Deep Shop",
        badgeBg: "bg-[#1877F2]/12 text-[#1877F2] dark:text-[#58A6FF]",
        isShop: true,
        internalPath: u.pathname + u.search + u.hash,
        ytId: null,
      };
    }

    return {
      platform: host,
      host,
      subtitle: cleanPath ? `/${cleanPath}` : href,
      badgeBg: "bg-[#1877F2]/10 text-[#1877F2] dark:text-[#58A6FF]",
      isShop: false,
      ytId: null,
    };
  } catch {
    return {
      platform: "External Link",
      host: href,
      subtitle: href,
      badgeBg: "bg-[#1877F2]/10 text-[#1877F2] dark:text-[#58A6FF]",
      isShop: false,
      ytId: null,
    };
  }
};

/**
 * Renders text with clickable blue #hashtags and stylish inline link chips
 */
export const NewsRichText: React.FC<{
  text: string;
  className?: string;
  onHashtagClick?: (tag: string) => void;
}> = ({ text, className = "", onHashtagClick }) => {
  const navigate = useNavigate();
  const segments = React.useMemo(() => parseRichSegments(text), [text]);

  return (
    <span className={className}>
      {segments.map((seg, idx) => {
        if (seg.type === "hashtag" && seg.tag) {
          return (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic();
                if (onHashtagClick) {
                  onHashtagClick(seg.tag!);
                } else {
                  navigate(
                    `/loops/search?tag=${encodeURIComponent(seg.tag!)}`
                  );
                }
              }}
              className="text-[#0095F6] hover:underline font-normal cursor-pointer inline"
            >
              {seg.raw}
            </button>
          );
        }

        if (seg.type === "mention" && seg.mention) {
          return (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic();
                navigate(
                  `/loops/search?q=${encodeURIComponent(seg.mention!)}`
                );
              }}
              className="text-[#0095F6] hover:underline font-normal cursor-pointer inline"
            >
              {seg.raw}
            </button>
          );
        }

        if (seg.type === "link" && seg.href) {
          const meta = getPlatformMeta(seg.href);
          if (meta.isShop && (meta as any).internalPath) {
            return (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic();
                  navigate((meta as any).internalPath);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 mx-0.5 rounded-full bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] dark:text-[#58A6FF] text-[12.5px] font-semibold align-baseline transition cursor-pointer"
              >
                <Link2 className="w-3 h-3 shrink-0" />
                <span>{formatCompactLinkLabel(seg.href)}</span>
              </button>
            );
          }

          return (
            <a
              key={idx}
              href={seg.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 mx-0.5 rounded-full bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] dark:text-[#58A6FF] text-[12.5px] font-semibold align-baseline transition cursor-pointer"
            >
              <Link2 className="w-3 h-3 shrink-0" />
              <span>{formatCompactLinkLabel(seg.href)}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-75 shrink-0" />
            </a>
          );
        }

        return <React.Fragment key={idx}>{seg.raw}</React.Fragment>;
      })}
    </span>
  );
};

/**
 * Renders stylish rich link preview cards for URLs included in a post
 */
export const NewsLinkPreviewCards: React.FC<{
  text?: string;
  excludeVideoEmbeds?: boolean;
}> = ({ text, excludeVideoEmbeds = true }) => {
  const navigate = useNavigate();
  const urls = React.useMemo(() => {
    const extracted = extractLinksFromText(text);
    const filtered = excludeVideoEmbeds
      ? extracted.filter((href) => !isEmbeddableVideoUrl(href))
      : extracted;
    return filtered.slice(0, 3);
  }, [text, excludeVideoEmbeds]);

  if (urls.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {urls.map((href, idx) => {
        const meta = getPlatformMeta(href);

        if (meta.ytId) {
          return (
            <a
              key={idx}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic();
              }}
              className="group block rounded-[22px] overflow-hidden bg-[#F4F7FB] dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/70 hover:border-[#1877F2]/50 transition"
            >
              <div className="relative aspect-video w-full bg-zinc-900 overflow-hidden">
                <img
                  src={`https://i.ytimg.com/vi/${meta.ytId}/hqdefault.jpg`}
                  alt={meta.platform}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/95 text-rose-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>
              </div>
              <div className="p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    {meta.platform}
                  </span>
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate mt-0.5">
                    {href}
                  </p>
                </div>
                <span className="w-9 h-9 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shrink-0 shadow-2xs">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
            </a>
          );
        }

        if (meta.isShop && (meta as any).internalPath) {
          return (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic();
                navigate((meta as any).internalPath);
              }}
              className="w-full text-left rounded-[22px] p-3.5 bg-gradient-to-r from-[#EEF5FF] to-[#F6F9FE] dark:from-zinc-800/90 dark:to-zinc-800/60 border border-[#1877F2]/20 dark:border-zinc-700 flex items-center justify-between gap-3.5 hover:border-[#1877F2]/50 transition cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-white dark:bg-zinc-900 shadow-2xs flex items-center justify-center text-[#1877F2] shrink-0">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#1877F2] dark:text-[#58A6FF] block">
                    {meta.platform}
                  </span>
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                    {meta.subtitle}
                  </p>
                </div>
              </div>
              <span className="w-9 h-9 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-[#1877F2] shrink-0 shadow-2xs">
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </button>
          );
        }

        return (
          <a
            key={idx}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic();
            }}
            className="group block rounded-[22px] p-3.5 bg-[#F4F7FB] dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/70 hover:border-[#1877F2]/50 transition"
          >
            <div className="flex items-center justify-between gap-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-11 h-11 rounded-2xl bg-white dark:bg-zinc-900 shadow-2xs flex items-center justify-center shrink-0 ${meta.badgeBg}`}
                >
                  <Globe className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                      {meta.platform}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {meta.subtitle}
                  </p>
                </div>
              </div>

              <span className="w-9 h-9 rounded-full bg-white dark:bg-zinc-900 group-hover:bg-[#1877F2] group-hover:text-white flex items-center justify-center text-zinc-700 dark:text-zinc-200 transition-colors shrink-0 shadow-2xs">
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </div>
          </a>
        );
      })}
    </div>
  );
};
