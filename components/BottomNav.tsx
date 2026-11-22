import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { motion, useReducedMotion } from "framer-motion";
import { db } from "../firebase";
import {
  Home,
  Activity,
  Plus,
  Compass,
  User,
} from "lucide-react";
import { triggerHaptic } from "../lib/haptics";
import { normalizeCustomSvg } from "../lib/svgNormalize";

const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const [cartCount, setCartCount] = React.useState(0);
  const [customSvgs, setCustomSvgs] = React.useState<{
    home?: string;
    doc?: string;
    search?: string;
    profile?: string;
  }>({});

  React.useEffect(() => {
    let platformData: any = {};
    let customIconsData: any = {};

    const syncSvgs = () => {
      setCustomSvgs({
        home: platformData.bottomNavHomeSvg || customIconsData.home || customIconsData.bottomNavHomeSvg || "",
        doc: platformData.bottomNavDocSvg || customIconsData.doc || customIconsData.activity || customIconsData.orders || customIconsData.bottomNavDocSvg || "",
        search: platformData.bottomNavSearchSvg || customIconsData.search || customIconsData.compass || customIconsData.loops || customIconsData.bottomNavSearchSvg || "",
        profile: platformData.bottomNavProfileSvg || customIconsData.profile || customIconsData.user || customIconsData.bottomNavProfileSvg || "",
      });
    };

    const unsubPlatform = onSnapshot(
      doc(db, "settings", "platform"),
      (snap) => {
        if (snap.exists()) {
          platformData = snap.data();
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
          customIconsData = d?.icons || d || {};
          syncSvgs();
        }
      },
      () => {}
    );

    return () => {
      unsubPlatform();
      unsubIcons();
    };
  }, []);

  React.useEffect(() => {
    const updateCount = () => {
      try {
        const cartStr = localStorage.getItem("f_cart");
        let cart = [];
        try {
          cart = cartStr && cartStr !== "undefined" ? JSON.parse(cartStr) : [];
        } catch (e) {}
        if (Array.isArray(cart)) {
          const validItems = cart.filter((item) => item && (item.id || item.productId));
          const count = validItems.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0);
          setCartCount(count);
        } else {
          setCartCount(0);
        }
      } catch (e) {
        setCartCount(0);
      }
    };
    updateCount();
    window.addEventListener("update_cart", updateCount);
    return () => window.removeEventListener("update_cart", updateCount);
  }, []);

  const [hideForModal, setHideForModal] = React.useState(
    () =>
      typeof document !== "undefined" &&
      (document.body?.dataset?.hideBottomNav === "true" ||
        document.body?.dataset?.hideLoopNoteNav === "true")
  );

  React.useEffect(() => {
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

  if (
    hideForModal ||
    location.pathname.startsWith("/product/") ||
    location.pathname.startsWith("/messages") ||
    location.pathname.startsWith("/seller") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/checkout") ||
    location.pathname.startsWith("/payment/")
  ) {
    return null;
  }

  const navItems = [
    { to: "/", label: "Home", icon: Home, customSvg: customSvgs.home },
    { to: "/orders", label: "Activity", icon: Activity, customSvg: customSvgs.doc },
    { to: "/loops/create", label: "Create", icon: Plus, isCreate: true },
    { to: "/loops", label: "Loops", icon: Compass, customSvg: customSvgs.search },
    { to: "/profile", label: "Profile", icon: User, customSvg: customSvgs.profile },
  ];

  const springTransition = shouldReduceMotion
    ? { duration: 0.14, ease: "easeOut" as const }
    : { type: "spring" as const, stiffness: 520, damping: 36, mass: 0.8 };

  const swipeableRoutes = ["/", "/orders", "/loops", "/profile"];
  const navTouchStartRef = React.useRef<{ x: number; y: number; at: number } | null>(null);

  const handleDockTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (e.touches.length !== 1) {
      navTouchStartRef.current = null;
      return;
    }
    navTouchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      at: Date.now(),
    };
  };

  const handleDockTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
    const start = navTouchStartRef.current;
    navTouchStartRef.current = null;
    if (!start || !e.changedTouches[0]) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 42 || Math.abs(dy) > Math.abs(dx) * 0.75 || Date.now() - start.at > 600) {
      return;
    }
    const currentIdx = swipeableRoutes.findIndex((route) =>
      route === "/" ? location.pathname === "/" : location.pathname.startsWith(route)
    );
    const baseIdx = currentIdx === -1 ? 0 : currentIdx;
    const nextIdx =
      dx < 0
        ? Math.min(swipeableRoutes.length - 1, baseIdx + 1)
        : Math.max(0, baseIdx - 1);
    if (nextIdx !== currentIdx) {
      triggerHaptic("selection");
      navigate(swipeableRoutes[nextIdx]);
    }
  };

  return (
    <div className="fixed bottom-[max(14px,env(safe-area-inset-bottom))] inset-x-0 z-[100] md:hidden px-4 pointer-events-none flex justify-center">
      <nav
        aria-label="Shopping Navigation"
        data-no-swipe="true"
        onTouchStart={handleDockTouchStart}
        onTouchEnd={handleDockTouchEnd}
        className="ds-shop-bottom-dock pointer-events-auto rounded-full p-1.5 flex items-center justify-between gap-1 w-full max-w-[380px] touch-pan-y"
      >
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.to ||
            (item.to !== "/" && location.pathname.startsWith(item.to));

          if (item.isCreate) {
            return (
              <motion.button
                key={item.to}
                type="button"
                whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
                transition={{ type: "spring", stiffness: 560, damping: 34 }}
                onPointerDown={() => triggerHaptic("selection")}
                onClick={() => navigate(item.to)}
                className="w-11 h-11 rounded-full ds-apple-btn-primary flex items-center justify-center cursor-pointer mx-0.5 shrink-0"
                title="Create Post"
                aria-label="Create Post"
              >
                <Plus className="w-5 h-5 stroke-[2.4]" />
              </motion.button>
            );
          }

          const IconComp = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onPointerDown={() => triggerHaptic("selection")}
              className={`relative z-10 flex-1 h-[50px] min-h-[44px] rounded-full flex flex-col items-center justify-center gap-[3px] cursor-pointer transition-colors duration-150 ${
                isActive ? "ds-shop-bottom-btn-active" : "ds-shop-bottom-btn"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="dsShopBottomNavActivePill"
                  transition={springTransition}
                  className="ds-shop-bottom-lens absolute inset-0 rounded-full -z-10"
                />
              )}

              <div className="relative flex items-center justify-center w-5 h-5">
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
                          className="w-[19px] h-[19px] object-contain"
                        />
                      );
                    }
                    const normalizedSvg = normalizeCustomSvg(cleanSvg);
                    return (
                      <div
                        aria-hidden="true"
                        className="w-[19px] h-[19px] flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full"
                        dangerouslySetInnerHTML={{ __html: normalizedSvg }}
                      />
                    );
                  }
                  return (
                    <IconComp
                      aria-hidden="true"
                      fill={isActive ? "currentColor" : "none"}
                      fillOpacity={isActive ? 0.18 : 0}
                      className={`w-[19px] h-[19px] ${
                        isActive ? "stroke-[2.25]" : "stroke-[1.75]"
                      }`}
                    />
                  );
                })()}
                {item.to === "/orders" && cartCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-1 rounded-full bg-[#0071E3] text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </div>

              <span className="text-[10.5px] leading-none font-semibold tracking-[-0.01em] whitespace-nowrap shrink-0">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
