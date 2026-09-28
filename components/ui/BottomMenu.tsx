import Icon from "../Icon";
import React, { useMemo, useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
    "group transition-colors duration-150 px-3 py-2.5 text-[14px] text-zinc-600 dark:text-zinc-300 w-full text-left rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer active:scale-[0.98]";

  const content = useMemo(() => {
    switch (view) {
      case "default":
        return null;

      case "home":
        return (
          <div className="space-y-0.5 min-w-[210px] p-2">
            {SHOPPING_HOME_ITEMS.map(({ icon: IconName, text, path }) => (
              <button
                key={text}
                onClick={() => handleNavigate(path)}
                className={`${sharedHover} flex items-center gap-3`}
              >
                <Icon
                  name={IconName}
                  className="w-[18px] h-[18px] text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors"
                />
                <span className="font-semibold">{text}</span>
              </button>
            ))}
          </div>
        );

      case "search":
        return (
          <div className="space-y-2.5 min-w-[280px] p-3">
            <div className="relative">
              <Icon
                name="search"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
              />
              <input
                type="text"
                placeholder="Search products..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleNavigate(`/search?q=${(e.target as HTMLInputElement).value}`);
                  }
                }}
                className="w-full pl-10 pr-4 py-2.5 text-[14px] text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1cdb5e]/50 placeholder:text-zinc-400"
              />
            </div>
            <div className="flex gap-2">
              {SEARCH_OPTIONS.map(({ icon: IconName, text, path }) => (
                <button
                  key={text}
                  onClick={() => handleNavigate(path)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-[13px] font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer active:scale-95"
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
          <div className="space-y-0.5 min-w-[220px] p-2">
            <div className="px-3 py-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Recent Alerts
            </div>
            {NOTIFICATION_TYPES.map((t) => (
              <button key={t.text} onClick={() => handleNavigate(t.path)} className={sharedHover}>
                <span className="font-semibold">{t.text}</span>
              </button>
            ))}
          </div>
        );

      case "profile":
        return (
          <div className="space-y-0.5 min-w-[240px] p-2">
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
                <span className="font-semibold">{text}</span>
              </button>
            ))}
            <div className="border-t border-zinc-100 dark:border-zinc-800 my-1.5" />
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 text-[14px] font-bold text-rose-500 w-full text-left rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <Icon name="sign-out-alt" className="w-[18px] h-[18px]" />
              <span>Sign Out</span>
            </button>
          </div>
        );

      case "theme":
        return (
          <div className="flex items-center justify-between gap-2 min-w-[280px] p-2">
            <button
              onClick={(e) => { triggerHaptic(); if (isDark) toggleTheme(e); setView("default"); }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 transition-all font-semibold text-[13px] cursor-pointer ${
                !isDark
                  ? "bg-zinc-100 text-zinc-900 border border-zinc-200"
                  : "text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              <Icon name="sun" className="w-[18px] h-[18px]" />
              <span>Light</span>
            </button>
            <button
              onClick={(e) => { triggerHaptic(); if (!isDark) toggleTheme(e); setView("default"); }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 transition-all font-semibold text-[13px] cursor-pointer ${
                isDark
                  ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                  : "text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
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
      {/* Silky-Smooth Animated Submenu Popup */}
      <AnimatePresence mode="wait">
        {view !== "default" && (
          <motion.div
            key={view}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{
              type: "spring",
              stiffness: 450,
              damping: 32,
              mass: 0.6
            }}
            className={cn(
              "absolute bottom-[calc(100%+12px)] overflow-hidden rounded-[26px] shadow-[0_16px_45px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_50px_rgba(0,0,0,0.6)] z-[101] pointer-events-auto border border-zinc-200/90 dark:border-zinc-800/90 bg-white/95 dark:bg-[#141518]/95 backdrop-blur-2xl transform-gpu will-change-transform",
              view === "profile" || view === "theme" ? "right-0" : view === "home" ? "left-2" : view === "search" ? "left-1/2 -translate-x-1/2" : "right-16"
            )}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Nav Container (Height 54px) */}
      <div className="flex-1 relative pointer-events-auto h-[54px] flex items-center">
        {/* Floating Toolbar */}
        <div className="w-full h-[54px] bg-white/90 dark:bg-[#141518]/90 backdrop-blur-md flex items-center justify-around px-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.4)] relative rounded-full border border-zinc-200/60 dark:border-zinc-800/60">
          {MAIN_NAV.map(({ icon: IconName, name }) => {
            const isActive = view === name || (name === 'home' && location.pathname === '/');
            return (
              <button
                key={name}
                className={cn(
                  "relative py-0.5 flex items-center justify-center flex-1 transition-transform active:scale-95 cursor-pointer",
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
                     <motion.div layoutId="nav-pill" className="absolute inset-0 bg-zinc-100 dark:bg-zinc-800 rounded-[50px] -z-10 shadow-xs" transition={{ type: "spring", stiffness: 450, damping: 32 }} />
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
            className="w-[54px] h-[54px] rounded-full bg-white/90 dark:bg-[#141518]/90 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.4)] flex items-center justify-center transition-transform active:scale-95 cursor-pointer border border-zinc-200/60 dark:border-zinc-800/60"
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
            className="w-[54px] h-[54px] rounded-full bg-white/90 dark:bg-[#141518]/90 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.4)] flex items-center justify-center transition-transform active:scale-95 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 cursor-pointer border border-zinc-200/60 dark:border-zinc-800/60"
          >
            <div className="w-[40px] h-[40px] rounded-full bg-[#5F2CFF] text-white flex items-center justify-center shadow-inner hover:bg-[#4c1ddb] transition-colors m-auto flex-shrink-0">
              <ArrowRight className="text-white w-4.5 h-4.5 stroke-[2.5]" />
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

export default BottomMenu;
