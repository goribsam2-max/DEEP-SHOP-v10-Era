import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import {
  Home,
  Activity,
  Plus,
  Compass,
  User,
  ShoppingBag,
  Sparkles
} from "lucide-react";
import { triggerHaptic } from "../lib/haptics";

const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
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

  // Hide BottomNav on full-screen detail views
  if (
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

  return (
    <div className="fixed bottom-3 left-3 right-3 z-[100] md:hidden max-w-md mx-auto pointer-events-none">
      {/* FLOATING LIQUID GLASS PILL CONTAINER (Matching IMG_4760_f05ecd46.jpeg) */}
      <nav className="pointer-events-auto bg-zinc-900 dark:bg-zinc-100 backdrop-blur-xl border border-zinc-800 dark:border-zinc-300 rounded-full shadow-2xl px-2.5 py-1.5 flex items-center justify-between transition-all">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.to ||
            (item.to !== "/" && location.pathname.startsWith(item.to));

          if (item.isCreate) {
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => {
                  triggerHaptic();
                  navigate(item.to);
                }}
                className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 text-black dark:text-white flex items-center justify-center shadow-lg active:scale-90 transition hover:opacity-90 cursor-pointer -mt-1 mx-1 shrink-0"
                title="Create Scam Report or Post"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </button>
            );
          }

          const IconComp = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => triggerHaptic()}
              className="flex-1 flex flex-col items-center justify-center py-1 relative group cursor-pointer"
            >
              <div className="relative flex items-center justify-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? "text-white dark:text-black bg-zinc-800 dark:bg-zinc-200 shadow-xs font-bold"
                      : "text-white/80 dark:text-zinc-700 hover:text-white dark:hover:text-black"
                  }`}
                >
                  {(() => {
                    if (item.customSvg && item.customSvg.trim()) {
                      const cleanSvg = item.customSvg.trim();
                      if (cleanSvg.startsWith("http://") || cleanSvg.startsWith("https://") || cleanSvg.startsWith("data:") || cleanSvg.startsWith("/")) {
                        return (
                          <img
                            src={cleanSvg}
                            alt={item.label}
                            className={`w-4 h-4 object-contain transition-transform duration-300 ${isActive ? "scale-110" : ""}`}
                          />
                        );
                      }
                      return (
                        <div
                          className={`w-4 h-4 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full transition-transform duration-300 ${
                            isActive ? "scale-110" : ""
                          }`}
                          dangerouslySetInnerHTML={{ __html: cleanSvg }}
                        />
                      );
                    }
                    return <IconComp className={`w-4 h-4 transition-transform duration-300 ${isActive ? "scale-110" : ""}`} />;
                  })()}
                </div>
              </div>

              <span
                className={`text-[10px] font-extrabold tracking-tight transition-colors duration-300 ${
                  isActive ? "text-white dark:text-black" : "text-white/70 dark:text-zinc-600"
                }`}
              >
                {item.label}
              </span>

              {/* Active liquid dot indicator below label */}
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-white dark:bg-black absolute -bottom-0.5" />
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
