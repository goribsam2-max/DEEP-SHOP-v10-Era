import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { motion, useReducedMotion } from "framer-motion";
import { auth, db } from "../../firebase";
import {
  Home,
  FileText,
  Search,
  User as UserIcon,
} from "lucide-react";
import { triggerHaptic } from "../../lib/haptics";
import { normalizeCustomSvg } from "../../lib/svgNormalize";

const pickFirstNonEmpty = (...candidates: Array<unknown>): string => {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) {
      return c.trim();
    }
  }
  return "";
};

const readCachedIcons = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem("custom_icons_cache");
    if (raw) {
      const parsed = JSON.parse(raw);
      const out: Record<string, string> = {};
      Object.keys(parsed || {}).forEach((k) => {
        if (typeof parsed[k] === "string" && k !== "icons") {
          out[k.toLowerCase()] = parsed[k];
        }
      });
      return out;
    }
  } catch {}
  return {};
};

const readCachedPlatformSvgConfig = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem("ds_platform_bottom_nav_svgs");
    if (raw) {
      return JSON.parse(raw) || {};
    }
  } catch {}
  return {};
};

const BottomMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const dockRef = useRef<HTMLDivElement | null>(null);
  const scrubbingRef = useRef(false);
  const pointerStartXRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const [user, setUser] = useState<User | null>(null);
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const [hideForModal, setHideForModal] = useState<boolean>(
    () =>
      typeof document !== "undefined" &&
      (document.body?.dataset?.hideBottomNav === "true" ||
        document.body?.dataset?.hideLoopNoteNav === "true")
  );

  const [customSvgs, setCustomSvgs] = useState<{
    home?: string;
    doc?: string;
    search?: string;
    profile?: string;
  }>(() => {
    const p = readCachedPlatformSvgConfig();
    const ci = readCachedIcons();
    return {
      home: pickFirstNonEmpty(
        p.bottomNavHomeSvg,
        ci["bottom-nav-home"],
        ci["bottomnavhomesvg"],
        ci["home"],
        ci["loops-nav-home"]
      ),
      doc: pickFirstNonEmpty(
        p.bottomNavDocSvg,
        ci["bottom-nav-doc"],
        ci["bottomnavdocsvg"],
        ci["doc"],
        ci["document"],
        ci["file-text"],
        ci["receipt"],
        ci["orders"]
      ),
      search: pickFirstNonEmpty(
        p.bottomNavSearchSvg,
        ci["bottom-nav-search"],
        ci["bottomnavsearchsvg"],
        ci["search"],
        ci["loops-nav-search"],
        ci["compass"]
      ),
      profile: pickFirstNonEmpty(
        p.bottomNavProfileSvg,
        ci["bottom-nav-profile"],
        ci["bottomnavprofilesvg"],
        ci["profile"],
        ci["user"],
        ci["loops-nav-profile"]
      ),
    };
  });

  useEffect(() => {
    const syncVisibility = () => {
      setHideForModal(
        typeof document !== "undefined" &&
          (document.body?.dataset?.hideBottomNav === "true" ||
            document.body?.dataset?.hideLoopNoteNav === "true")
      );
    };
    window.addEventListener("deepshop:bottom-nav-visibility", syncVisibility);
    return () => window.removeEventListener("deepshop:bottom-nav-visibility", syncVisibility);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    let platformData: Record<string, any> = readCachedPlatformSvgConfig();
    let customIconsData: Record<string, string> = readCachedIcons();

    const syncSvgs = () => {
      setCustomSvgs({
        home: pickFirstNonEmpty(
          platformData.bottomNavHomeSvg,
          customIconsData["bottom-nav-home"],
          customIconsData["bottomnavhomesvg"],
          customIconsData["home"],
          customIconsData["loops-nav-home"]
        ),
        doc: pickFirstNonEmpty(
          platformData.bottomNavDocSvg,
          customIconsData["bottom-nav-doc"],
          customIconsData["bottomnavdocsvg"],
          customIconsData["doc"],
          customIconsData["document"],
          customIconsData["file-text"],
          customIconsData["receipt"],
          customIconsData["orders"]
        ),
        search: pickFirstNonEmpty(
          platformData.bottomNavSearchSvg,
          customIconsData["bottom-nav-search"],
          customIconsData["bottomnavsearchsvg"],
          customIconsData["search"],
          customIconsData["loops-nav-search"],
          customIconsData["compass"]
        ),
        profile: pickFirstNonEmpty(
          platformData.bottomNavProfileSvg,
          customIconsData["bottom-nav-profile"],
          customIconsData["bottomnavprofilesvg"],
          customIconsData["profile"],
          customIconsData["user"],
          customIconsData["loops-nav-profile"]
        ),
      });
    };

    const unsubConfig = onSnapshot(
      doc(db, "settings", "platform"),
      (snap) => {
        if (snap.exists()) {
          platformData = snap.data() || {};
          try {
            localStorage.setItem(
              "ds_platform_bottom_nav_svgs",
              JSON.stringify({
                bottomNavHomeSvg: platformData.bottomNavHomeSvg || "",
                bottomNavDocSvg: platformData.bottomNavDocSvg || "",
                bottomNavSearchSvg: platformData.bottomNavSearchSvg || "",
                bottomNavProfileSvg: platformData.bottomNavProfileSvg || "",
              })
            );
          } catch {}
          syncSvgs();
        }
      },
      () => {}
    );

    const unsubIcons = onSnapshot(
      doc(db, "settings", "custom_icons"),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          const rawMap = d?.icons || d || {};
          const lowered: Record<string, string> = {};
          Object.keys(rawMap).forEach((k) => {
            if (typeof rawMap[k] === "string" && k !== "icons") {
              lowered[k.toLowerCase()] = rawMap[k];
            }
          });
          customIconsData = lowered;
          syncSvgs();
        }
      },
      () => {}
    );

    const onCustomIconsBroadcast = (ev: any) => {
      const detail = ev?.detail;
      if (detail && typeof detail === "object") {
        const lowered: Record<string, string> = {};
        Object.keys(detail).forEach((k) => {
          if (typeof detail[k] === "string" && k !== "icons") {
            lowered[k.toLowerCase()] = detail[k];
          }
        });
        customIconsData = lowered;
        syncSvgs();
      }
    };

    const onPlatformConfigBroadcast = (ev: any) => {
      if (ev?.detail && typeof ev.detail === "object") {
        platformData = { ...platformData, ...ev.detail };
        syncSvgs();
      }
    };

    window.addEventListener("loops:custom-icons-updated", onCustomIconsBroadcast);
    window.addEventListener("ds:platform-config-updated", onPlatformConfigBroadcast);

    return () => {
      unsubscribe();
      unsubConfig();
      unsubIcons();
      window.removeEventListener("loops:custom-icons-updated", onCustomIconsBroadcast);
      window.removeEventListener("ds:platform-config-updated", onPlatformConfigBroadcast);
    };
  }, []);

  if (hideForModal) {
    return null;
  }

  const path = location.pathname;

  const navItems = [
    {
      id: "home",
      label: "Home",
      path: "/",
      icon: Home,
      customSvg: customSvgs.home,
      isActive: path === "/",
    },
    {
      id: "feed",
      label: "Loops",
      path: "/loops",
      icon: FileText,
      customSvg: customSvgs.doc,
      isActive: path.startsWith("/loops") || path.startsWith("/news-hub"),
    },
    {
      id: "search",
      label: "Search",
      path: "/search",
      icon: Search,
      customSvg: customSvgs.search,
      isActive:
        path === "/search" ||
        path === "/all-products" ||
        path.startsWith("/category"),
    },
    {
      id: "profile",
      label: user ? "Profile" : "Sign In",
      path: user ? "/profile" : "/auth-selector",
      icon: UserIcon,
      customSvg: customSvgs.profile,
      isActive:
        path === "/profile" ||
        path === "/auth-selector" ||
        path === "/orders" ||
        path === "/wishlist" ||
        path === "/notifications",
    },
  ];

  const matchedIdx = navItems.findIndex((i) => i.isActive);
  const routeActiveIdx = matchedIdx >= 0 ? matchedIdx : 0;
  const isActivelyScrubbing = scrubIndex !== null;
  const highlightedIdx = scrubIndex !== null ? scrubIndex : routeActiveIdx;

  const getIndexAtClientX = (clientX: number): number | null => {
    const el = dockRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return null;
    const rel = Math.max(0, Math.min(rect.width - 1, clientX - rect.left));
    const idx = Math.floor((rel / rect.width) * navItems.length);
    return Math.max(0, Math.min(navItems.length - 1, idx));
  };

  const handleDockPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    scrubbingRef.current = true;
    hasDraggedRef.current = false;
    pointerStartXRef.current = e.clientX;
    triggerHaptic("light");
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleDockPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    if (Math.abs(e.clientX - pointerStartXRef.current) > 8) {
      hasDraggedRef.current = true;
    }
    if (!hasDraggedRef.current) return;
    const nextIdx = getIndexAtClientX(e.clientX);
    if (nextIdx !== null && nextIdx !== scrubIndex) {
      triggerHaptic("selection");
      setScrubIndex(nextIdx);
    }
  };

  const finishDockGesture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    const wasDragged = hasDraggedRef.current;
    const targetIdx =
      scrubIndex !== null ? scrubIndex : getIndexAtClientX(e.clientX);
    scrubbingRef.current = false;
    hasDraggedRef.current = false;
    setScrubIndex(null);

    if (targetIdx !== null && navItems[targetIdx]) {
      const targetPath = navItems[targetIdx].path;
      if (wasDragged || targetPath !== path) {
        triggerHaptic("selection");
        navigate(targetPath);
      }
    }
  };

  const springTransition = shouldReduceMotion
    ? { duration: 0.14, ease: "easeOut" as const }
    : { type: "spring" as const, stiffness: 520, damping: 36, mass: 0.8 };

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-[max(14px,env(safe-area-inset-bottom))] inset-x-0 z-[100] flex justify-center md:hidden px-4 pointer-events-none select-none"
    >
      <div
        ref={dockRef}
        onPointerDown={handleDockPointerDown}
        onPointerMove={handleDockPointerMove}
        onPointerUp={finishDockGesture}
        onPointerCancel={() => {
          scrubbingRef.current = false;
          hasDraggedRef.current = false;
          setScrubIndex(null);
        }}
        className="ds-shop-bottom-dock pointer-events-auto relative grid grid-cols-4 items-center p-1.5 rounded-full touch-none w-full max-w-[356px]"
      >
        {navItems.map((item, idx) => {
          const IconComp = item.icon;
          const isHighlighted = highlightedIdx === idx;

          return (
            <motion.button
              key={item.id}
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.92 }}
              transition={{ type: "spring", stiffness: 560, damping: 34 }}
              onClick={(e) => {
                // Navigation when activated via keyboard / assistive technology
                if (e.detail === 0) {
                  triggerHaptic("selection");
                  navigate(item.path);
                }
              }}
              title={item.label}
              aria-label={item.label}
              aria-current={item.isActive ? "page" : undefined}
              className={`relative z-10 h-[50px] min-h-[44px] rounded-full flex flex-col items-center justify-center gap-[3px] px-1.5 cursor-pointer transition-colors duration-150 ${
                isHighlighted
                  ? "ds-shop-bottom-btn-active"
                  : "ds-shop-bottom-btn"
              }`}
            >
              {isHighlighted && (
                <motion.div
                  layoutId="dsShopDockLens"
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : { scale: isActivelyScrubbing ? 1.045 : 1 }
                  }
                  transition={springTransition}
                  className="ds-shop-bottom-lens absolute inset-0 rounded-full -z-10"
                />
              )}

              <motion.span
                animate={
                  shouldReduceMotion
                    ? undefined
                    : { y: isHighlighted ? -0.5 : 0, scale: isHighlighted ? 1.05 : 1 }
                }
                transition={springTransition}
                className="flex items-center justify-center w-5 h-5"
              >
                {(() => {
                  if (item.customSvg && item.customSvg.trim()) {
                    const cleanSvg = item.customSvg.trim();
                    if (
                      cleanSvg.startsWith("http://") ||
                      cleanSvg.startsWith("https://") ||
                      cleanSvg.startsWith("data:") ||
                      cleanSvg.startsWith("/")
                    ) {
                      return (
                        <img
                          src={cleanSvg}
                          alt=""
                          aria-hidden="true"
                          className={`w-[19px] h-[19px] object-contain transition-transform duration-150 ${
                            isHighlighted ? "scale-105" : "opacity-85"
                          }`}
                        />
                      );
                    }
                    const normalizedSvg = normalizeCustomSvg(cleanSvg);
                    return (
                      <span
                        aria-hidden="true"
                        className="w-[19px] h-[19px] inline-flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full"
                        dangerouslySetInnerHTML={{ __html: normalizedSvg }}
                      />
                    );
                  }
                  return (
                    <IconComp
                      aria-hidden="true"
                      fill={isHighlighted ? "currentColor" : "none"}
                      fillOpacity={isHighlighted ? 0.18 : 0}
                      className={`w-[19px] h-[19px] transition-all duration-150 ${
                        isHighlighted ? "stroke-[2.25]" : "stroke-[1.75]"
                      }`}
                    />
                  );
                })()}
              </motion.span>

              <span className="text-[10.5px] leading-none font-semibold tracking-[-0.01em] whitespace-nowrap shrink-0">
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomMenu;
