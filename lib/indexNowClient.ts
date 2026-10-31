export const BING_INDEXNOW_KEY = "0f6cbbdfe0864710868cb5500f5b8e54";
export const BING_INDEXNOW_KEY_PATH = `/${BING_INDEXNOW_KEY}.txt`;

export interface IndexNowPingResponse {
  ok: boolean;
  submittedCount: number;
  host: string;
  keyLocation: string;
  results?: Array<{ endpoint: string; status: number; ok: boolean }>;
  error?: string;
}

/**
 * Submits one or more public URLs (or defaults to core site routes) to Bing / IndexNow
 * via the server-side /api/seo/indexnow proxy endpoint.
 */
export async function pingBingIndexNow(
  urls?: string[],
  hostOverride?: string
): Promise<IndexNowPingResponse> {
  try {
    const resolvedOrigin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://www.deepshop.top";

    const normalizedUrls = Array.isArray(urls)
      ? urls
          .map((u) => String(u || "").trim())
          .filter(Boolean)
          .map((u) => (u.startsWith("http") ? u : `${resolvedOrigin}${u.startsWith("/") ? "" : "/"}${u}`))
      : undefined;

    const res = await fetch("/api/seo/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls: normalizedUrls,
        host: hostOverride,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        submittedCount: 0,
        host: data.host || "",
        keyLocation: data.keyLocation || BING_INDEXNOW_KEY_PATH,
        error: data.error || `HTTP ${res.status}`,
      };
    }

    return {
      ok: Boolean(data.ok),
      submittedCount: Number(data.submittedCount || 0),
      host: String(data.host || ""),
      keyLocation: String(data.keyLocation || BING_INDEXNOW_KEY_PATH),
      results: Array.isArray(data.results) ? data.results : [],
    };
  } catch (err: any) {
    return {
      ok: false,
      submittedCount: 0,
      host: "",
      keyLocation: BING_INDEXNOW_KEY_PATH,
      error: err?.message || "Network error",
    };
  }
}
