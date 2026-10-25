import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Live-synced hook that resolves the exact DEEP SHOP logo configured for the Footer
 * across `settings/payments`, `settings/seo`, and `settings/platform`, with `/favicon.png` fallback.
 */
export function useFooterLogo(): string {
  const [logoState, setLogoState] = useState<{
    paymentsLogo: string;
    seoLogo: string;
    platformLogo: string;
  }>({
    paymentsLogo: "",
    seoLogo: "",
    platformLogo: "",
  });

  useEffect(() => {
    const unsubPayments = onSnapshot(
      doc(db, "settings", "payments"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const logo = data.footerLogo || data.logoUrl || "";
          setLogoState((prev) => ({
            ...prev,
            paymentsLogo: logo || prev.paymentsLogo,
          }));
        }
      },
      () => {}
    );

    const unsubSeo = onSnapshot(
      doc(db, "settings", "seo"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const seoLogo =
            data.logoUrl ||
            data.appIconUrl ||
            data.faviconUrl ||
            data.metaImage ||
            "";
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
          const platLogo = data.footerLogo || data.logoUrl || "";
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

  return (
    logoState.platformLogo ||
    logoState.paymentsLogo ||
    logoState.seoLogo ||
    "/favicon.png"
  );
}
