import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import Icon from "./Icon";
import { triggerHaptic } from "../lib/haptics";

const BottomNav: React.FC = () => {
  const location = useLocation();
  const [cartCount, setCartCount] = React.useState(0);

  React.useEffect(() => {
    const updateCount = () => {
      try {
        const cartStr = localStorage.getItem('f_cart');
        let cart = [];
        try { cart = cartStr && cartStr !== "undefined" ? JSON.parse(cartStr) : []; } catch(e){}
        if (Array.isArray(cart)) {
          const validItems = cart.filter(item => item && (item.id || item.productId));
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

  const links = [
    { to: "/", iconKey: "home", label: "Home" },
    { to: "/affiliate", iconKey: "profile-affiliate", label: "Creator" },
    { to: "/aichat", iconKey: "comment-dots", label: "Chat" },
    { to: "/cart", iconKey: "shopping-cart", label: "Cart" },
    { to: "/profile", iconKey: "user", label: "Profile" },
  ];

  // Hide BottomNav on product detail pages, messages, and seller routes
  if (
    location.pathname.startsWith("/product/") ||
    location.pathname.startsWith("/messages") ||
    location.pathname.startsWith("/seller") ||
    location.pathname.startsWith("/admin")
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full bg-white dark:bg-zinc-900 z-[100] md:hidden border-t border-zinc-200 dark:border-zinc-800 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] pb-[max(0.75rem,env(safe-area-inset-bottom,10px))] pt-1.5 transition-all">
      <div className="flex w-full justify-between items-center px-4 h-[72px]">
          {links.map((link) => {
            const isActive = location.pathname === link.to || (link.to !== '/' && location.pathname.startsWith(link.to));
            
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => triggerHaptic()}
                className="flex flex-col items-center justify-center flex-1 h-full relative group"
              >
                <div className="relative flex items-center justify-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 mb-1 ${isActive ? "bg-[#1cdb5e]/15 dark:bg-[#1cdb5e]/25 text-[#1cdb5e]" : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"}`}>
                    <Icon
                      name={link.iconKey}
                      className={`w-5 h-5 transition-transform duration-300 ${isActive ? "scale-110" : "inactive-nav-icon"}`}
                      solid={false}
                    />
                  </div>
                  {link.to === "/cart" && cartCount > 0 && (
                    <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-white dark:border-zinc-900 shadow-sm">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className={`text-[11px] font-bold tracking-tight transition-colors duration-300 ${isActive ? "text-[#1cdb5e]" : "text-zinc-400"}`}>
                  {link.label}
                </span>
              </NavLink>
            );
          })}
      </div>
    </div>
  );
};

export default BottomNav;
