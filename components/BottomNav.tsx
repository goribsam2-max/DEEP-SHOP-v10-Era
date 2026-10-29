import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
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
    { to: "/", label: "Home", icon: Home },
    { to: "/orders", label: "Activity", icon: Activity },
    { to: "/loops/create", label: "Create", icon: Plus, isCreate: true },
    { to: "/loops", label: "Loops", icon: Compass },
    { to: "/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="fixed bottom-3 left-3 right-3 z-[100] md:hidden max-w-md mx-auto pointer-events-none">
      {/* FLOATING LIQUID GLASS PILL CONTAINER (Matching IMG_4760_f05ecd46.jpeg) */}
      <nav className="pointer-events-auto bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border border-white/60 dark:border-zinc-800/80 rounded-full shadow-2xl px-2.5 py-1.5 flex items-center justify-between transition-all">
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
                className="w-10 h-10 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center shadow-lg active:scale-90 transition hover:opacity-90 cursor-pointer -mt-1 mx-1 shrink-0"
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
                      ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60"
                      : "text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
                  }`}
                >
                  <IconComp className={`w-4 h-4 transition-transform duration-300 ${isActive ? "scale-110" : ""}`} />
                </div>
              </div>

              <span
                className={`text-[10px] font-extrabold tracking-tight transition-colors duration-300 ${
                  isActive ? "text-blue-600 dark:text-blue-400" : "text-zinc-400"
                }`}
              >
                {item.label}
              </span>

              {/* Active liquid dot indicator below label */}
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400 absolute -bottom-0.5" />
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
