import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
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
  const [user, setUser] = useState<User | null>(null);
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

  const path = location.pathname;

  const navItems = [
    {
      id: "home",
      label: "Shop Home",
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
      isActive: path === "/search" || path === "/all-products",
    },
    {
      id: "profile",
      label: user ? "Profile" : "Sign In",
      path: user ? "/profile" : "/auth-selector",
      icon: UserIcon,
      customSvg: customSvgs.profile,
      isActive: path === "/profile" || path === "/auth-selector",
    },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-5 inset-x-0 z-[100] flex justify-center md:hidden px-4 pointer-events-none pb-[env(safe-area-inset-bottom)]"
    >
      <div className="ds-shop-bottom-dock pointer-events-auto flex items-center gap-2 p-1.5 rounded-full backdrop-blur-2xl">
        {navItems.map((item) => {
          const IconComp = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                triggerHaptic();
                navigate(item.path);
              }}
              title={item.label}
              aria-label={item.label}
              className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer ${
                item.isActive
                  ? "ds-shop-bottom-btn-active"
                  : "ds-shop-bottom-btn opacity-90 hover:opacity-100"
              }`}
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
                        alt={item.label}
                        className="w-5 h-5 object-contain"
                      />
                    );
                  }
                  const normalizedSvg = normalizeCustomSvg(cleanSvg);
                  return (
                    <span
                      className="w-5 h-5 inline-flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full"
                      dangerouslySetInnerHTML={{ __html: normalizedSvg }}
                    />
                  );
                }
                return (
                  <IconComp
                    className={`w-5 h-5 ${
                      item.isActive ? "stroke-[2.2]" : "stroke-[1.9]"
                    }`}
                  />
                );
              })()}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomMenu;
