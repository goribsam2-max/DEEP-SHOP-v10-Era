import Icon from "../Icon";
import React, { useMemo, useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import useMeasure from "react-use-measure";
import { cn } from "../../lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../../components/ThemeContext";
import { useLanguage } from "../../components/LanguageContext";
import { signOut, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth, db } from "../../firebase";
import { ArrowRight } from "lucide-react";
import { triggerHaptic } from "../../lib/haptics";
import { doc, onSnapshot as firestoreOnSnapshot } from "firebase/firestore";

const MAIN_NAV = [
  { icon: "home", name: "home" },
  { icon: "search", name: "search" },
  { icon: "shopping-bag", name: "cart" },
  { icon: "bell", name: "notifications" },
];

const SHOPPING_HOME_ITEMS = [
  { icon: "shopping-bag", text: "All Products", path: "/all-products" },
  { icon: "box", text: "New Arrivals", path: "/all-products?sort=newest" },
  { icon: "heart", text: "My Wishlist", path: "/wishlist" },
];

const SEARCH_OPTIONS = [
  { icon: "sliders-h", text: "Filters", path: "/search" },
  { icon: "search", text: "Trending", path: "/search" },
];

const NOTIFICATION_TYPES = [
  { text: "Order Updates", path: "/notifications" },
  { text: "Flash Sales", path: "/notifications" },
  { text: "System Alerts", path: "/notifications" },
];

const PROFILE_LINKS = [
  { icon: "user", text: "My Account", path: "/profile" },
  { icon: "box", text: "My Orders", path: "/orders" },
  { icon: "map-marker", text: "Addresses", path: "/shipping-address" },
  { icon: "credit-card", text: "Payment", path: "/payment-methods" },
  { icon: "cog", text: "Settings", path: "/settings" },
];

const BottomMenu = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();
  
  const [elementRef] = useMeasure();
  const [hiddenRef, hiddenBounds] = useMeasure();
  const [view, setView] = useState<
    "default" | "home" | "search" | "notifications" | "profile" | "theme"
  >("default");

  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    const unsubscribe = onAuthStateChanged(auth, u => {
      setUser(u);
      if (u) {
        unsubProfile = firestoreOnSnapshot(doc(db, "users", u.uid), (snap) => {
          if (snap.exists()) {
            setUserRole(snap.data().role || null);
          }
        });
      } else {
        setUserRole(null);
        if (unsubProfile) unsubProfile();
      }
    });
    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const profileLinks = useMemo(() => {
    const base = [...PROFILE_LINKS];
    if (userRole === "seller" || userRole === "admin") {
      base.unshift({ icon: "chart-line", text: "Seller Dashboard", path: "/seller/dashboard" });
    }
    return base;
  }, [userRole]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setView("default");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleNavigate = (path: string) => {
    triggerHaptic();
    navigate(path);
    setView("default");
  };

  const handleLogout = async () => {
    triggerHaptic();
    try {
      await signOut(auth);
      navigate("/");
      window.dispatchEvent(new CustomEvent('openAccountCenter'));
      setView("default");
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  const sharedHover =
    "group transition-all duration-75 px-3 py-2.5 text-[14px] text-zinc-500 dark:text-zinc-400 w-full text-left rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100";

  const content = useMemo(() => {
    switch (view) {
      case "default":
        return null;

      case "home":
        return (
          <div className="space-y-0.5 min-w-[210px] p-[6px] py-1">
            {SHOPPING_HOME_ITEMS.map(({ icon: IconName, text, path }) => (
              <button
                key={text}
                onClick={() => handleNavigate(path)}
                className={`${sharedHover} flex items-center gap-3`}
              >
                <Icon
                  name={IconName}
                  className="w-[18px] h-[18px] text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-all duration-75"
                />
                <span className="font-medium">{text}</span>
              </button>
            ))}
          </div>
        );

      case "search":
        return (
          <div className="space-y-2.5 min-w-[280px] p-[10px] py-2">
            <div className="relative">
              <Icon
                name="search"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
              />
              <input
                type="text"
                placeholder="Search products..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleNavigate(`/search?q=${(e.target as HTMLInputElement).value}`);
                  }
                }}
                className="w-full pl-10 pr-4 py-2.5 text-[14px] text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:ring-zinc-100/20 focus:border-zinc-900 dark:border-zinc-100/50 placeholder:text-zinc-400"
              />
            </div>
            <div className="flex gap-2">
              {SEARCH_OPTIONS.map(({ icon: IconName, text, path }) => (
                <button
                  key={text}
                  onClick={() => handleNavigate(path)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-[13px] font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                >
                  <Icon name={IconName} className="w-[15px] h-[15px]" />
                  <span>{text}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-0.5 min-w-[220px] p-[6px] py-1">
            <div className="px-3 py-2 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Recent Alerts
            </div>
            {NOTIFICATION_TYPES.map((t) => (
              <button key={t.text} onClick={() => handleNavigate(t.path)} className={sharedHover}>
                <span className="font-medium">{t.text}</span>
              </button>
            ))}
          </div>
        );

      case "profile":
        return (
          <div className="space-y-0.5 min-w-[240px] p-[6px] py-1">
            {profileLinks.map(({ icon: IconName, text, path }) => (
              <button
                key={text}
                onClick={() => handleNavigate(path)}
                className={`${sharedHover} flex items-center gap-3`}
              >
                <Icon
                  name={IconName}
                  className="w-[18px] h-[18px] text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100"
                />
                <span className="font-medium">{text}</span>
              </button>
            ))}
            <div className="border-t border-zinc-100 dark:border-zinc-800 my-1.5" />
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 text-[14px] font-semibold text-rose-500 w-full text-left rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
            >
              <Icon name="sign-out-alt" className="w-[18px] h-[18px]" />
              <span>Sign Out</span>
            </button>
          </div>
        );

      case "theme":
        return (
          <div className="flex items-center justify-between gap-2 min-w-[280px] p-[6px]">
            <button
              onClick={(e) => { triggerHaptic(); if (isDark) toggleTheme(e); setView("default"); }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 transition-all font-medium text-[13px] ${
                !isDark
                  ? "bg-zinc-100 text-zinc-900 border border-zinc-200"
                  : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              <Icon name="sun" className="w-[18px] h-[18px]" />
              <span>Light</span>
            </button>
            <button
              onClick={(e) => { triggerHaptic(); if (!isDark) toggleTheme(e); setView("default"); }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 transition-all font-medium text-[13px] ${
                isDark
                  ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                  : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              <Icon name="moon" className="w-[18px] h-[18px]" />
              <span>Dark</span>
            </button>
          </div>
        );

      default:
        return null;
    }
  }, [view, isDark, profileLinks]);

  return (
    <div
      ref={containerRef}
      className={cn("fixed bottom-5 left-3 right-3 sm:left-5 sm:right-5 z-[100] flex items-center justify-between md:hidden gap-1.5 sm:gap-2.5 pointer-events-none mb-[env(safe-area-inset-bottom)]")}
    >
      {/* Hidden for measurement */}
      <div
        ref={hiddenRef}
        className="absolute left-[-9999px] top-[-9999px] invisible pointer-events-none"
      >
        <div className="rounded-[28px] bg-white dark:bg-zinc-950 border-none py-1">
          {content}
        </div>
      </div>

      {/* Animated submenu */}
      <AnimatePresence mode="wait">
        {view !== "default" && (
          <motion.div
            key="submenu"
            initial={{
              opacity: 0,
              scaleY: 0.9,
              scaleX: 0.95,
              height: 0,
              width: 0,
              originY: 1,
              x: view === "profile" || view === "theme" ? "0%" : "-50%",
            }}
            animate={{
              opacity: 1,
              scaleY: 1,
              scaleX: 1,
              height: hiddenBounds.height || "auto",
              width: hiddenBounds.width || "auto",
              originY: 1,
              x: view === "profile" || view === "theme" ? "0%" : "-50%",
            }}
            exit={{
              opacity: 0,
              scaleY: 0.9,
              scaleX: 0.95,
              height: 0,
              width: 0,
              originY: 1,
              x: view === "profile" || view === "theme" ? "0%" : "-50%",
            }}
            transition={{
              duration: 0.4,
              type: "spring",
              damping: 25,
              stiffness: 300
            }}
            style={{
              transformOrigin: view === "profile" || view === "theme" ? "bottom right" : "bottom center",
            }}
            className={cn(
              "absolute bottom-[calc(100%+12px)] overflow-hidden rounded-[28px] shadow-xl z-[101] pointer-events-auto",
              view === "profile" || view === "theme" ? "right-0" : "left-1/2"
            )}
          >
            <div
              ref={elementRef}
              className="rounded-[28px] bg-white/90 dark:bg-[#141518]/90 backdrop-blur-md relative overflow-hidden shadow-xl"
            >
              <AnimatePresence initial={false} mode="popLayout">
                <motion.div
                  key={view}
                  initial={{
                    opacity: 0,
                    scale: 0.96,
                    filter: "blur(8px)",
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    filter: "blur(0px)",
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.95,
                    filter: "blur(8px)",
                  }}
                  transition={{
                    duration: 0.2,
                  }}
                  className="py-1"
                >
                  {content}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Nav Container (Height increased to 54px) */}
      <div className="flex-1 relative pointer-events-auto h-[54px] flex items-center">

        {/* Floating Toolbar with subtle fade, no harsh border */}
        <div className="w-full h-[54px] bg-white/85 dark:bg-[#141518]/85 backdrop-blur-md flex items-center justify-around px-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)] relative rounded-full">
          {MAIN_NAV.map(({ icon: IconName, name }) => {
            const isActive = view === name || (name === 'home' && location.pathname === '/');
            return (
              <button
                key={name}
                className={cn(
                  "relative py-0.5 flex items-center justify-center flex-1 transition-all active:scale-95",
                  isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
                onClick={() => {
                  triggerHaptic();
                  if (name === 'cart') {
                    navigate('/cart');
                    setView("default");
                  } else if (name === 'home' && location.pathname === '/') {
                    setView(view === name ? "default" : (name as any));
                  } else if (name === 'home') {
                    navigate('/');
                    setView("default");
                  } else {
                    setView(view === name ? "default" : (name as any));
                  }
                }}
              >
                <div className="relative flex flex-col items-center justify-center px-3.5 py-1.5 rounded-[50px] transition-all">
                  {isActive && (
                     <motion.div layoutId="nav-pill" className="absolute inset-0 bg-zinc-100/90 dark:bg-zinc-800/90 rounded-[50px] -z-10 shadow-xs" />
                  )}
                  <Icon
                    name={IconName}
                    className={cn("relative z-10 transition-colors w-[19px] h-[19px]", isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400")}
                  />
                  <span className={cn("relative z-10 text-[9.5px] font-bold capitalize whitespace-nowrap leading-none mt-1", isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400")}>
                    {t(name)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Profile / Auth Button (Height 54px) */}
      <div className="pointer-events-auto h-[54px] flex items-center">
        {user ? (
          <button
            onClick={() => {
               triggerHaptic();
               setView(view === "profile" ? "default" : "profile");
            }}
            className="w-[54px] h-[54px] rounded-full bg-white/85 dark:bg-[#141518]/85 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)] flex items-center justify-center transition-transform active:scale-95"
          >
            <div className="w-[40px] h-[40px] rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center m-auto">
               <Icon name="user" className={cn("w-[19px] h-[19px]", view === "profile" ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400")} />
            </div>
          </button>
        ) : (
          <button
            onClick={() => {
               triggerHaptic();
               window.dispatchEvent(new CustomEvent('openAccountCenter'));
               setView("default");
            }}
            className="w-[54px] h-[54px] rounded-full bg-white/85 dark:bg-[#141518]/85 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)] flex items-center justify-center transition-transform active:scale-95 hover:bg-zinc-50 dark:hover:bg-zinc-800/80"
          >
            <div className="w-[40px] h-[40px] rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-inner hover:bg-indigo-600 transition-colors m-auto flex-shrink-0">
              <ArrowRight className="text-white w-4.5 h-4.5" />
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

export default BottomMenu;

