const WSRV_ELIGIBLE_HOSTS = [
  "i.ibb.co",
  "ibb.co",
  "files.catbox.moe",
  "postimg.cc",
  "i.postimg.cc",
  "i.imgur.com",
  "imgur.com",
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
];

/**
 * Optimizes external product/banner/avatar image URLs into WebP resized assets
 * to dramatically reduce mobile & desktop image payload (fixes 9+ MB transfer warnings).
 * Skips data/blob URLs, SVGs, animated GIFs, and already-proxied URLs.
 */
export function optimizeImageUrl(
  rawSrc?: string,
  maxWidth = 480,
  quality = 76
): string {
  if (!rawSrc) return "";
  const trimmed = rawSrc.trim();
  if (
    !trimmed ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("/") ||
    /\.svg(?:$|\?)/i.test(trimmed) ||
    /\.gif(?:$|\?)/i.test(trimmed) ||
    trimmed.includes("wsrv.nl/") ||
    trimmed.includes("api.dicebear.com/") ||
    trimmed.includes("ui-avatars.com/")
  ) {
    return trimmed;
  }

  try {
    const normalized = trimmed.replace(/^http:\/\//i, "https://");
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("images.unsplash.com")) {
      parsed.searchParams.set("w", String(maxWidth));
      parsed.searchParams.set("q", String(quality));
      parsed.searchParams.set("auto", "format");
      if (!parsed.searchParams.has("fit")) {
        parsed.searchParams.set("fit", "max");
      }
      return parsed.toString();
    }

    if (
      host.includes("res.cloudinary.com") &&
      normalized.includes("/image/upload/") &&
      !normalized.includes("/f_auto") &&
      !normalized.includes("/q_auto")
    ) {
      return normalized.replace(
        "/image/upload/",
        `/image/upload/f_auto,q_auto:good,w_${maxWidth}/`
      );
    }

    if (host.includes("images.pexels.com")) {
      parsed.searchParams.set("auto", "compress");
      parsed.searchParams.set("cs", "tinysrgb");
      parsed.searchParams.set("w", String(maxWidth));
      return parsed.toString();
    }

    if (WSRV_ELIGIBLE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
      return `https://wsrv.nl/?url=${encodeURIComponent(
        normalized
      )}&w=${maxWidth}&q=${quality}&output=webp&we`;
    }

    return normalized;
  } catch {
    return trimmed;
  }
}
