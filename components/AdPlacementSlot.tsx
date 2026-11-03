import React, { useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import {
  DeepShopAdItem,
  DeepShopSponsoredAd,
  isLikelyVideoUrl,
  readHiddenAdIds,
  useDeepShopAds,
} from "./DeepShopSponsoredAd";

export type AdSlotPosition =
  | "header_top"
  | "feed_in_feed"
  | "post_in_article"
  | "sidebar_right"
  | "bottom_fixed"
  | "multiplex_grid";

export interface AdPlacementConfig {
  id: string;
  slot: AdSlotPosition;
  active: boolean;
  type: "script" | "custom";
  scriptCode?: string;
  title?: string;
  text?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonLink?: string;
  deviceTarget?: "all" | "mobile" | "desktop";
  format?: "in_feed" | "display" | "multiplex" | "in_article";
}

interface AdPlacementSlotProps {
  slot: AdSlotPosition;
  className?: string;
  wrapperClassName?: string;
  postIndex?: number;
}

export const AdPlacementSlot: React.FC<AdPlacementSlotProps> = ({
  slot,
  className = "",
  wrapperClassName = "",
  postIndex = 0,
}) => {
  const [placements, setPlacements] = useState<AdPlacementConfig[]>([]);
  const [hiddenVersion, setHiddenVersion] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { ads: campaignAds } = useDeepShopAds();

  useEffect(() => {
    const onHiddenChange = () => setHiddenVersion((v) => v + 1);
    window.addEventListener("ds:hidden-ads-updated", onHiddenChange);
    return () => {
      window.removeEventListener("ds:hidden-ads-updated", onHiddenChange);
    };
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "ad_placements"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const list: AdPlacementConfig[] = Array.isArray(data.placements)
            ? data.placements
            : [];
          setPlacements(list);
        }
      },
      () => {}
    );
    return () => unsub();
  }, []);

  const activePlacement = placements.find((p) => p.slot === slot && p.active);

  // Evaluate script code securely inside the container for AdSense / Monetag / AdX
  useEffect(() => {
    if (
      !activePlacement ||
      activePlacement.type !== "script" ||
      !activePlacement.scriptCode
    ) {
      return;
    }
    const el = containerRef.current;
    if (!el) return;

    el.innerHTML = "";

    try {
      const range = document.createRange();
      range.selectNode(el);
      const fragment = range.createContextualFragment(
        activePlacement.scriptCode
      );
      el.appendChild(fragment);

      const scripts = el.querySelectorAll("script");
      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");
        Array.from(oldScript.attributes).forEach((attr) =>
          newScript.setAttribute(attr.name, attr.value)
        );
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        if (oldScript.parentNode) {
          oldScript.parentNode.replaceChild(newScript, oldScript);
        }
      });
    } catch (err) {
      console.error("Error executing ad script placement:", err);
    }
  }, [activePlacement?.id, activePlacement?.scriptCode, activePlacement?.type]);

  const resolvedCustomAd = useMemo<DeepShopAdItem | null>(() => {
    const hidden = readHiddenAdIds();
    if (hidden.has("__ALL__")) return null;

    if (activePlacement && activePlacement.type === "custom") {
      const adId = String(activePlacement.id || `slot_${slot}`);
      if (hidden.has(adId)) return null;
      const mediaUrl = String(activePlacement.imageUrl || "").trim();
      if (mediaUrl) {
        return {
          id: adId,
          sourceType: "placement",
          media: [
            {
              url: mediaUrl,
              type: isLikelyVideoUrl(mediaUrl) ? "video" : "image",
              ratio: "auto",
            },
          ],
          title: activePlacement.title || "",
          text: activePlacement.text || "",
          buttonText: activePlacement.buttonText || "See details",
          buttonLink: activePlacement.buttonLink || "/all-products",
          targetRegion: "Bangladesh",
          isSponsored: true,
        };
      }
    }

    // For feed_in_feed and post_in_article, seamlessly display active Video/Image campaigns from Admin Panel
    if (
      (slot === "feed_in_feed" || slot === "post_in_article") &&
      campaignAds.length > 0
    ) {
      const stepIdx = Math.max(0, Math.floor((postIndex || 4) / 4) - 1);
      return campaignAds[stepIdx % campaignAds.length] || campaignAds[0];
    }

    return null;
  }, [activePlacement, slot, campaignAds, postIndex, hiddenVersion]);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  if (activePlacement) {
    if (activePlacement.deviceTarget === "mobile" && !isMobile) return null;
    if (activePlacement.deviceTarget === "desktop" && isMobile) return null;
  }

  // 1. Script Based Ad Slot (Monetag / AdSense / AdX)
  if (
    activePlacement &&
    activePlacement.type === "script" &&
    activePlacement.scriptCode
  ) {
    return (
      <div className={wrapperClassName}>
        <div
          className={`w-full flex justify-center items-center overflow-hidden my-3 ${className}`}
        >
          <div
            ref={containerRef}
            className="w-full min-h-[60px] flex items-center justify-center text-center text-xs text-zinc-400"
          />
        </div>
      </div>
    );
  }

  // 2. Unified Deep Shop Sponsored Ad Design (Replaces legacy custom ad cards)
  if (!resolvedCustomAd) return null;

  return (
    <div className={wrapperClassName}>
      <DeepShopSponsoredAd
        ad={resolvedCustomAd}
        variant="feed"
        allLibraryAds={campaignAds}
        className={`my-2 ${className}`}
      />
    </div>
  );
};
