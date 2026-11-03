import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export const DEEP_SHOP_LOGO_DATA_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#090d16"/><text x="27" y="44" font-family="system-ui,-apple-system,sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle">d</text><circle cx="45" cy="40" r="5" fill="#10b981"/></svg>'
  );

const LOGO_CACHE_KEY = "deepshop_footer_logo_cache";

export function sanitizeBrandLogoUrl(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "/favicon.png" || trimmed === "/placeholder.svg") {
    return "";
  }
  return trimmed;
}

/**
 * Live-synced hook that resolves the exact DEEP SHOP logo configured for the Footer
 * across `settings/payments`, `settings/seo`, and `settings/platform`, with an inline SVG fallback.
 */
export function useFooterLogo(): string {
  const [logoState, setLogoState] = useState<{
    paymentsLogo: string;
    seoLogo: string;
    platformLogo: string;
    cachedLogo: string;
  }>(() => {
    let cachedLogo = "";
    try {
      cachedLogo = sanitizeBrandLogoUrl(localStorage.getItem(LOGO_CACHE_KEY));
    } catch {}
    return {
      paymentsLogo: "",
      seoLogo: "",
      platformLogo: "",
      cachedLogo,
    };
  });

  useEffect(() => {
    const unsubPayments = onSnapshot(
      doc(db, "settings", "payments"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const logo = sanitizeBrandLogoUrl(data.footerLogo || data.logoUrl);
          if (logo) {
            setLogoState((prev) => ({
              ...prev,
              paymentsLogo: logo,
            }));
          }
        }
      },
      () => {}
    );

    const unsubSeo = onSnapshot(
      doc(db, "settings", "seo"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const seoLogo = sanitizeBrandLogoUrl(
            data.logoUrl ||
              data.appIconUrl ||
              data.faviconUrl ||
              data.metaImage
          );
          if (seoLogo) {
            setLogoState((prev) => ({
              ...prev,
              seoLogo,
            }));
          }
        }
      },
      () => {}
    );

    const unsubPlatform = onSnapshot(
      doc(db, "settings", "platform"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const platLogo = sanitizeBrandLogoUrl(data.footerLogo || data.logoUrl);
          if (platLogo) {
            setLogoState((prev) => ({
              ...prev,
              platformLogo: platLogo,
            }));
          }
        }
      },
      () => {}
    );

    return () => {
      unsubPayments();
      unsubSeo();
      unsubPlatform();
    };
  }, []);

  const resolved =
    logoState.platformLogo ||
    logoState.paymentsLogo ||
    logoState.seoLogo ||
    logoState.cachedLogo ||
    DEEP_SHOP_LOGO_DATA_URI;

  useEffect(() => {
    const custom =
      logoState.platformLogo || logoState.paymentsLogo || logoState.seoLogo;
    if (custom) {
      try {
        localStorage.setItem(LOGO_CACHE_KEY, custom);
      } catch {}
    }
  }, [logoState.platformLogo, logoState.paymentsLogo, logoState.seoLogo]);

  return resolved;
}
