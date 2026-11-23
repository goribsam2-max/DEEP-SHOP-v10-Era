import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon";
import { createPortal } from "react-dom";
import { useTheme } from "../ThemeContext";
import { AnimatedThemeToggler } from "./animated-theme-toggler";
import Icon from "../Icon";
import AccountMenu from "./account-menu";
import { useIsland } from "./dynamic-island";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { NavLink, useNavigate, useLocation } from "react-router-dom";

import { triggerHaptic } from "../../lib/haptics";
import { optimizeImageUrl } from "../../lib/imageOptimize";
import {
  hasImmediateAdminOrStaffRole,
  checkStaffRecord,
} from "../../lib/admin";

type LinkItem = {
  title: string;
  href: string;
  icon: any;
  description?: string;
};

const adminLinks: LinkItem[] = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: "home",
    description: "Overview & Stats",
  },
  {
    title: "Products",
    href: "/admin/products",
    icon: "shopping-bag",
    description: "Manage items",
  },
  {
    title: "Orders",
    href: "/admin/orders",
    icon: "profile-order-ship",
    description: "Track & update orders",
  },
  {
    title: "Users & Staff",
    href: "/admin/users",
    icon: "users",
    description: "Manage accounts",
  },
  {
    title: "Delivery Riders",
    href: "/admin/riders",
    icon: "truck",
    description: "Rider assignments",
  },
  {
    title: "Withdrawals",
    href: "/admin/withdrawals",
    icon: "coins",
    description: "Affiliate payouts",
  },
  {
    title: "Reviews",
    href: "/admin/reviews",
    icon: "star",
    description: "Customer feedback",
  },
  {
    title: "Banners",
    href: "/admin/banners",
    icon: "image",
    description: "Promo images",
  },
  {
    title: "Onboarding Offers",
    href: "/admin/onboarding-offers",
    icon: "gift",
    description: "Welcome screens",
  },
  {
    title: "Stories",
    href: "/admin/stories",
    icon: "layout",
    description: "App stories/highlights",
  },
  {
    title: "UI Builder",
    href: "/admin/custom-sections",
    icon: "cog",
    description: "Custom sections",
  },
  {
    title: "Live Chats",
    href: "/admin/chats",
    icon: "comment-dots",
    description: "Real-time support chats",
  },
  {
    title: "Help Desk",
    href: "/admin/helpdesk",
    icon: "headset",
    description: "Support tickets",
  },
  {
    title: "Notifications",
    href: "/admin/notifications",
    icon: "bell",
    description: "Push alerts",
  },
  {
    title: "Config",
    href: "/admin/config",
    icon: "cog",
    description: "App settings",
  },
];

const productLinks: LinkItem[] = [
  {
    title: "Loops",
    href: "/loops",
    description: "Community updates, discussions & verified reports",
    icon: "comment-dots",
  },
  {
    title: "Build Box",
    href: "/build-box",
    description: "Create your custom tech bundle",
    icon: "box",
  },
  {
    title: "Home",
    href: "/",
    description: "Discover new border cross phones & devices",
    icon: "home",
  },
  {
    title: "Catalog",
    href: "/all-products",
    description: "Browse our full collection",
    icon: "box",
  },
  {
    title: "Pay",
    href: "/payment-methods",
    description: "Secure payment options",
    icon: "coins",
  },
  {
    title: "Receive",
    href: "/orders",
    description: "Track and manage your orders",
    icon: "shopping-bag",
  },
  {
    title: "Ship",
    href: "/orders",
    description: "Shipping details and status",
    icon: "truck",
  },
  {
    title: "Review",
    href: "/wishlist",
    description: "Your saved favorite items",
    icon: "heart",
  },
];

export function Header() {
  const [open, setOpen] = React.useState(false);
  const [brandMenuOpen, setBrandMenuOpen] = React.useState(false);
  const brandMenuRef = React.useRef<HTMLDivElement | null>(null);
  const [user, setUser] = React.useState<any>(null);
  const [userProfile, setUserProfile] = React.useState<any>(null);
  const [isStaffDoc, setIsStaffDoc] = React.useState(false);
  const [categories, setCategories] = React.useState<string[]>([]);
  const scrolled = useScroll(10);
  useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isIslandActive = useIsland();
  const [cartCount, setCartCount] = React.useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = React.useState(0);
  const [dynamicHeaderLogo, setDynamicHeaderLogo] = React.useState<string>("");

  useEffect(() => {
    let unsubPayments: (() => void) | null = null;
    let unsubSeo: (() => void) | null = null;
    let unsubPlatform: (() => void) | null = null;

    import("@/firebase").then(({ db }) => {
      import("firebase/firestore").then(({ doc, onSnapshot }) => {
        unsubPayments = onSnapshot(doc(db, "settings", "payments"), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const logo = data.footerLogo || data.logoUrl;
            if (logo) setDynamicHeaderLogo(logo);
          }
        });
        unsubSeo = onSnapshot(doc(db, "settings", "seo"), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const logo = data.logoUrl || data.appIconUrl || data.faviconUrl || data.metaImage;
            if (logo) setDynamicHeaderLogo((prev) => prev || logo);
          }
        });
        unsubPlatform = onSnapshot(doc(db, "settings", "platform"), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const logo = data.footerLogo || data.logoUrl;
            if (logo) setDynamicHeaderLogo(logo);
          }
        });
      });
    });

    return () => {
      if (unsubPayments) unsubPayments();
      if (unsubSeo) unsubSeo();
      if (unsubPlatform) unsubPlatform();
    };
  }, []);

  useEffect(() => {
    setBrandMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!brandMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        brandMenuRef.current &&
        !brandMenuRef.current.contains(e.target as Node)
      ) {
        setBrandMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [brandMenuOpen]);

  useEffect(() => {
    const updateCount = () => {
      try {
        const cartStr = localStorage.getItem("f_cart");
        let cart = [];
        try {
          cart = cartStr && cartStr !== "undefined" ? JSON.parse(cartStr) : [];
        } catch {}
        if (Array.isArray(cart)) {
          const validItems = cart.filter(
            (item) => item && (item.id || item.productId)
          );
          const count = validItems.reduce(
            (acc: number, item: any) => acc + (item.quantity || 1),
            0
          );
          setCartCount(count);
        } else {
          setCartCount(0);
        }
      } catch {
        setCartCount(0);
      }
    };
    updateCount();
    window.addEventListener("update_cart", updateCount);
    return () => window.removeEventListener("update_cart", updateCount);
  }, []);

  const isHomePage = location.pathname === "/";
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isAffiliate = location.pathname.startsWith("/affiliate");
  const userHasAdminAccess =
    hasImmediateAdminOrStaffRole(userProfile, user) || isStaffDoc;
  const showAdminMenu = isAdminRoute && userHasAdminAccess;
  const isInnerPage =
    location.pathname !== "/" &&
    location.pathname !== "/profile" &&
    location.pathname !== "/admin" &&
    !isAffiliate;
  const linksToShow = showAdminMenu ? adminLinks : productLinks;

  useEffect(() => {
    let unsubscribeChats: (() => void) | null = null;
    let unsubscribeUserDoc: (() => void) | null = null;
    let unsubscribeAuth: (() => void) | null = null;

    import("@/firebase").then(({ auth, db }) => {
      unsubscribeAuth = auth.onAuthStateChanged((u) => {
        setUser(u);
        if (unsubscribeChats) {
          unsubscribeChats();
          unsubscribeChats = null;
        }
        if (unsubscribeUserDoc) {
          unsubscribeUserDoc();
          unsubscribeUserDoc = null;
        }

        if (u) {
          import("firebase/firestore").then(
            ({ collection, query, where, onSnapshot, doc }) => {
              unsubscribeUserDoc = onSnapshot(
                doc(db, "users", u.uid),
                (snap) => {
                  if (snap.exists()) setUserProfile(snap.data());
                },
                () => {}
              );

              const q = query(
                collection(db, "p2p_chats"),
                where("participants", "array-contains", u.uid)
              );
              unsubscribeChats = onSnapshot(
                q,
                (snapshot) => {
                  let count = 0;
                  snapshot.docs.forEach((d) => {
                    const data = d.data();
                    if (
                      data.lastMessage &&
                      data.lastSenderId !== u.uid &&
                      (!data.seenBy || !data.seenBy.includes(u.uid))
                    ) {
                      count += 1;
                    }
                  });
                  setUnreadMessagesCount(count);
                },
                () => {}
              );
            }
          );
        } else {
          setUserProfile(null);
          setUnreadMessagesCount(0);
        }
      });
    });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeChats) unsubscribeChats();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  useEffect(() => {
    if (open && categories.length === 0) {
      try {
        const cached = localStorage.getItem("ds_home_products_v1");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const cats = Array.from(
              new Set(parsed.map((p: any) => p?.category).filter(Boolean))
            ) as string[];
            if (cats.length > 0) {
              setCategories(cats.slice(0, 8));
            }
          }
        }
      } catch {}

      import("@/firebase").then(({ db }) => {
        import("firebase/firestore").then(({ collection, getDocs, query, limit }) => {
          getDocs(query(collection(db, "products"), limit(40)))
            .then((snapshot) => {
              const allCategories = new Set<string>();
              snapshot.forEach((d) => {
                const data = d.data();
                if (data.category) allCategories.add(data.category);
              });
              if (allCategories.size > 0) {
                setCategories(Array.from(allCategories).slice(0, 8));
              }
            })
            .catch(() => {});
        });
      });
    }

    if (open && typeof window !== "undefined" && window.innerWidth < 768) {
      document.body.style.overflow = "hidden";
      document.body.style.overflowX = "hidden";
      document.documentElement.style.overflowX = "hidden";
    } else {
      document.body.style.overflow = "";
      document.body.style.overflowX = "";
      document.documentElement.style.overflowX = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.overflowX = "";
      document.documentElement.style.overflowX = "";
    };
  }, [open, categories.length]);

  useEffect(() => {
    let active = true;
    const email = userProfile?.email || user?.email;
    if (!email) {
      setIsStaffDoc(false);
      return;
    }
    if (hasImmediateAdminOrStaffRole(userProfile, user)) {
      setIsStaffDoc(true);
      return;
    }
    checkStaffRecord(email).then((res) => {
      if (active) setIsStaffDoc(res.isStaff);
    });
    return () => {
      active = false;
    };
  }, [user, userProfile]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("toggleSidebar", { detail: open }));
  }, [open]);

  const standardDesktopBtnClass =
    "ds-apple-icon-btn ds-theme-icon-btn relative overflow-visible transition-transform duration-150 flex items-center justify-center hover:scale-[1.04] active:scale-[0.94] rounded-full w-10 h-10 cursor-pointer shrink-0";

  const mobileCircleBtnClass =
    "ds-apple-icon-btn ds-theme-icon-btn relative overflow-visible rounded-full active:scale-[0.94] transition-transform duration-150 w-9 h-9 sm:w-9.5 sm:h-9.5 flex items-center justify-center cursor-pointer shrink-0";

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-[120] w-full max-w-[100vw] box-border transition-all duration-200 pointer-events-none",
        scrolled || open ? "ds-apple-topbar" : "bg-transparent border-b border-transparent"
      )}
    >
      <nav
        className={cn(
          "mx-auto flex w-full max-w-[1920px] items-center justify-between gap-2 px-3 sm:px-5 lg:px-6 box-border",
          isHomePage ? "h-15 md:h-16" : "h-14 md:h-16"
        )}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0 shrink pointer-events-auto">
          <Button
            size="icon"
            variant="ghost"
            onPointerDown={() => triggerHaptic()}
            onClick={() => {
              if (location.pathname === "/withdraw") {
                navigate("/affiliate");
              } else if (location.pathname.startsWith("/messages")) {
                const params = new URLSearchParams(location.search);
                if (
                  params.has("chatId") ||
                  params.has("channelId") ||
                  params.get("tab") === "settings"
                ) {
                  navigate("/messages");
                } else {
                  navigate(-1);
                }
              } else if (isInnerPage) {
                navigate(-1);
              } else {
                setOpen(!open);
              }
            }}
            className={cn(
              "ds-apple-icon-btn ds-theme-icon-btn items-center justify-center transition-transform duration-150 w-9 h-9 sm:w-9.5 sm:h-9.5 md:w-10 md:h-10 rounded-full shrink-0 active:scale-[0.94] cursor-pointer",
              isHomePage ? "hidden md:flex" : "flex"
            )}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={isInnerPage ? "Go back" : "Toggle menu"}
          >
            {isInnerPage ? (
              <Icon name="chevron-left" className="size-5 text-[#1D1D1F] dark:text-[#F5F5F7]" />
            ) : (
              <MenuToggleIcon
                open={open}
                className="size-5 text-[#1D1D1F] dark:text-[#F5F5F7]"
                duration={280}
              />
            )}
          </Button>

          {isAdminRoute ? (
            <NavLink
              to="/admin"
              aria-label="DEEP SHOP Admin Dashboard"
              className="flex items-center gap-2 min-w-0 shrink rounded-3xl border-none ring-0 shadow-none bg-transparent transition-all duration-200"
            >
              <WordmarkIcon />
            </NavLink>
          ) : (
            <div
              ref={brandMenuRef}
              className="relative min-w-0 shrink"
            >
              <button
                type="button"
                onPointerDown={() => triggerHaptic()}
                onClick={(e) => {
                  e.stopPropagation();
                  setBrandMenuOpen((prev) => !prev);
                }}
                className="inline-flex items-center gap-1.5 px-1.5 py-1 rounded-2xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none min-w-0"
                aria-label="Switch between Deep Shop and Loops"
                aria-expanded={brandMenuOpen}
              >
                {isHomePage ? (
                  <div className="flex items-center gap-2.5">
                    {(dynamicHeaderLogo || "/favicon.png") && (
                      <div className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full overflow-hidden border border-black/10 dark:border-white/15 bg-white dark:bg-[#1C1C1E] shrink-0 flex items-center justify-center aspect-square">
                        <img
                          src={optimizeImageUrl(dynamicHeaderLogo || "/favicon.png", 96, 96)}
                          alt="Deep Shop Logo"
                          width={36}
                          height={36}
                          decoding="async"
                          className="w-full h-full object-cover"
                          onError={() => {
                            if (dynamicHeaderLogo) setDynamicHeaderLogo("");
                          }}
                        />
                      </div>
                    )}
                    <span className="ds-apple-display text-[19px] sm:text-[22px] font-semibold tracking-[-0.03em] leading-none text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-nowrap">
                      deep shop
                    </span>
                  </div>
                ) : (
                  <WordmarkIcon />
                )}
                <Icon
                  name="chevron-down"
                  className={cn(
                    "w-3.5 h-3.5 text-[#6E6E73] dark:text-[#98989D] transition-transform duration-200 shrink-0",
                    brandMenuOpen && "rotate-180"
                  )}
                />
              </button>

              <AnimatePresence>
                {brandMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: -6 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.24 }}
                    style={{ transformOrigin: "top left" }}
                    onClick={(e) => e.stopPropagation()}
                    className="ds-apple-popover ds-apple-portal absolute left-0 top-full mt-2 z-[160] w-[216px] rounded-[22px] py-1.5 px-1.5 space-y-0.5"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        setBrandMenuOpen(false);
                        if (location.pathname !== "/") {
                          navigate("/");
                        }
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-[18px] hover:bg-black/[0.045] dark:hover:bg-white/[0.08] text-[15.5px] font-semibold text-zinc-950 dark:text-white cursor-pointer"
                    >
                      <span>Deep Shop</span>
                      <Icon name="check" className="w-[19px] h-[19px] text-zinc-950 dark:text-white" />
                    </button>

                    <div className="my-1 border-t loops-divider mx-2" />

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        setBrandMenuOpen(false);
                        navigate("/loops");
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-[18px] hover:bg-black/[0.045] dark:hover:bg-white/[0.08] text-[15.5px] font-semibold text-zinc-950 dark:text-white cursor-pointer"
                    >
                      <span>Loops</span>
                      <Icon name="infinity" className="w-[19px] h-[19px] text-zinc-700 dark:text-zinc-300" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* DESKTOP RIGHT ACTION BUTTONS */}
        <div className="hidden items-center gap-2 lg:gap-2.5 md:flex shrink-0 pr-0.5 overflow-visible pointer-events-auto transition-all duration-200">
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              navigate("/search");
            }}
            className={standardDesktopBtnClass}
            aria-label="Search"
          >
            <Icon name="search" className="w-5 h-5 text-zinc-900 dark:text-white" />
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              navigate("/wishlist");
            }}
            className={standardDesktopBtnClass}
            aria-label="Wishlist"
          >
            <Icon name="heart" className="w-5 h-5 text-zinc-900 dark:text-white" />
          </button>

          <button
            type="button"
            onPointerDown={() => triggerHaptic()}
            onClick={() => navigate("/cart")}
            className={standardDesktopBtnClass}
            aria-label="Shopping Cart"
          >
            <Icon name="shopping-cart" className="w-5 h-5 text-[#1D1D1F] dark:text-[#F5F5F7]" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 z-20 pointer-events-none bg-[#0071E3] dark:bg-[#0A84FF] text-white text-[10px] font-semibold leading-none min-w-[19px] h-[19px] px-1 flex items-center justify-center rounded-full border-[1.5px] border-white dark:border-[#1C1C1E] shadow-xs tabular-nums">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onPointerDown={() => triggerHaptic()}
            onClick={() => navigate("/messages")}
            className={standardDesktopBtnClass}
            aria-label="Messages"
          >
            <Icon name="message-square" className="w-5 h-5 text-[#1D1D1F] dark:text-[#F5F5F7]" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-2 -right-2 z-20 pointer-events-none bg-[#FF3B30] text-white text-[10px] font-semibold leading-none min-w-[19px] h-[19px] px-1 flex items-center justify-center rounded-full border-[1.5px] border-white dark:border-[#1C1C1E] shadow-xs tabular-nums">
                {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
              </span>
            )}
          </button>

          <AnimatedThemeToggler className={standardDesktopBtnClass} />

          {location.pathname === "/profile" ? (
            <Button
              variant="ghost"
              size="icon"
              onPointerDown={() => triggerHaptic()}
              onClick={() => navigate("/settings")}
              className={standardDesktopBtnClass}
              aria-label="Settings"
            >
              <Icon name="settings" className="w-5 h-5" />
            </Button>
          ) : (
            <AccountMenu scrolled={scrolled} isPill />
          )}
        </div>

        {/* MOBILE RIGHT ACTION BUTTONS */}
        <div className="flex items-center gap-2 sm:gap-2.5 md:hidden shrink-0 overflow-visible pointer-events-auto transition-all duration-200">
          <Button
            variant="ghost"
            size="icon"
            onPointerDown={() => triggerHaptic()}
            onClick={() => navigate("/cart")}
            className={mobileCircleBtnClass}
            aria-label="Shopping Cart"
          >
            <Icon name="shopping-cart" className="w-[18px] h-[18px] sm:w-[19px] sm:h-[19px] text-[#1D1D1F] dark:text-[#F5F5F7]" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 z-20 pointer-events-none bg-[#0071E3] dark:bg-[#0A84FF] text-white text-[9.5px] font-semibold leading-none min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full border-[1.5px] border-white dark:border-[#1C1C1E] shadow-xs tabular-nums">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onPointerDown={() => triggerHaptic()}
            onClick={() => navigate("/messages")}
            className={mobileCircleBtnClass}
            aria-label="Messages"
          >
            <Icon name="message-square" className="w-[18px] h-[18px] sm:w-[19px] sm:h-[19px] text-[#1D1D1F] dark:text-[#F5F5F7]" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 z-20 pointer-events-none bg-[#FF3B30] text-white text-[9.5px] font-semibold leading-none min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full border-[1.5px] border-white dark:border-[#1C1C1E] shadow-xs tabular-nums">
                {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
              </span>
            )}
          </Button>
          <AnimatedThemeToggler className={mobileCircleBtnClass} />

          {location.pathname === "/profile" ? (
            <Button
              variant="ghost"
              size="icon"
              onPointerDown={() => triggerHaptic()}
              onClick={() => navigate("/settings")}
              className={mobileCircleBtnClass}
              aria-label="Settings"
            >
              <Icon name="settings" className="w-[18px] h-[18px] sm:w-[19px] sm:h-[19px]" />
            </Button>
          ) : (
            <AccountMenu scrolled={scrolled} isPill />
          )}
        </div>
      </nav>

      <MobileMenu
        open={open}
        onClose={() => setOpen(false)}
      >
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar w-full">
          <div className="flex w-full flex-col gap-y-1.5 pb-4 px-2">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 px-2 mt-4 mb-2 block">
              {showAdminMenu ? "Admin Pages" : "Explore Pages"}
            </span>
            {linksToShow.map((link) => (
              <ListItem
                key={link.title}
                {...link}
                onClick={() => {
                  triggerHaptic();
                  setOpen(false);
                }}
              />
            ))}

            {!showAdminMenu && categories.length > 0 && (
              <>
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 px-4 mt-6 mb-2 block">
                  Categories
                </span>
                <div className="flex flex-row flex-nowrap overflow-x-auto gap-2 px-4 no-scrollbar scroll-smooth pb-2 w-full max-w-full">
                  {categories.map((cat, i) => (
                    <NavLink
                      key={i}
                      to={`/search?q=${encodeURIComponent(cat)}`}
                      onClick={() => {
                        triggerHaptic();
                        setOpen(false);
                      }}
                      className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition font-medium shrink-0"
                    >
                      {cat}
                    </NavLink>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom actions sticky */}
        <div className="flex flex-col gap-2 p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 w-full shrink-0 pb-6 md:pb-4">
          {userHasAdminAccess && !showAdminMenu && (
            <Button
              className="w-full ds-apple-btn-primary rounded-2xl font-semibold"
              onPointerDown={() => triggerHaptic()}
              onClick={() => {
                setOpen(false);
                navigate("/admin");
              }}
            >
              <Icon name="shield" className="w-4 h-4 mr-2" /> Admin Control Panel
            </Button>
          )}

          {showAdminMenu && (
            <Button
              variant="outline"
              className="w-full ds-apple-btn-secondary rounded-2xl mb-1 font-semibold"
              onPointerDown={() => triggerHaptic()}
              onClick={() => {
                setOpen(false);
                navigate("/");
              }}
            >
              <Icon name="chevron-left" className="w-4 h-4 mr-2" /> Back to Store
            </Button>
          )}

          {!user ? (
            <>
              <Button
                variant="outline"
                className="w-full ds-apple-btn-secondary rounded-2xl font-semibold"
                onPointerDown={() => triggerHaptic()}
                onClick={() => {
                  setOpen(false);
                  navigate("/auth-selector");
                }}
              >
                Sign In
              </Button>
              <Button
                className="w-full ds-apple-btn-primary rounded-2xl font-semibold"
                onPointerDown={() => triggerHaptic()}
                onClick={() => {
                  setOpen(false);
                  navigate("/auth-selector");
                }}
              >
                Sign Up
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="w-full ds-apple-btn-secondary rounded-2xl font-semibold"
                onPointerDown={() => triggerHaptic()}
                onClick={() => {
                  setOpen(false);
                  navigate("/profile");
                }}
              >
                Account & All Pages
              </Button>
              <Button
                className="w-full ds-apple-btn-primary rounded-2xl font-semibold"
                onPointerDown={() => triggerHaptic()}
                onClick={() => {
                  setOpen(false);
                  navigate("/orders");
                }}
              >
                My Orders
              </Button>
            </>
          )}
        </div>
      </MobileMenu>
    </header>
  );
}

type MobileMenuProps = {
  open: boolean;
  children?: React.ReactNode;
  onClose?: () => void;
  className?: string;
};

function MobileMenu({
  open,
  children,
  onClose,
  className,
}: MobileMenuProps) {
  const shouldReduceMotion = useReducedMotion();
  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="ds-apple-portal">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="ds-apple-backdrop fixed inset-0 z-[150000] md:hidden"
            onClick={onClose}
          />
          <motion.div
            id="mobile-menu"
            initial={shouldReduceMotion ? { opacity: 0 } : { x: -304, opacity: 0.6 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { x: 0, opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { x: -304, opacity: 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0.18 }
                : { type: "spring", bounce: 0, duration: 0.34 }
            }
            drag={shouldReduceMotion ? false : "x"}
            dragConstraints={{ left: -280, right: 0 }}
            dragElastic={{ left: 0.2, right: 0.08 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -72 || info.velocity.x < -380) {
                onClose?.();
              }
            }}
            className={cn(
              "ds-apple-modal fixed z-[150100] md:z-[110] flex flex-col overflow-hidden",
              "top-3.5 bottom-3.5 left-3.5 w-72 rounded-[26px] pt-4 pb-4",
              "md:top-0 md:bottom-0 md:left-0 md:w-72 md:rounded-none md:border-r md:border-l-0 md:border-t-0 md:border-b-0 md:pt-16 md:pb-4",
              className
            )}
          >
            <div className="w-full h-full flex flex-col overflow-hidden">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function ListItem({
  title,
  description,
  icon: IconComp,
  className,
  href,
  onClick,
}: LinkItem & { className?: string; onClick?: () => void }) {
  return (
    <NavLink
      to={href}
      onPointerDown={() => triggerHaptic()}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "w-full flex items-center flex-row gap-x-3 hover:bg-black/[0.045] dark:hover:bg-white/[0.08] active:scale-[0.98] rounded-2xl px-2.5 py-2 transition-all overflow-hidden max-w-full box-border",
          isActive && "bg-[#0071E3]/[0.08] dark:bg-[#0A84FF]/[0.15] font-medium",
          className
        )
      }
    >
      <div className="bg-[#F2F2F7] dark:bg-[#2C2C2E] flex aspect-square size-10 items-center justify-center rounded-xl border border-black/[0.06] dark:border-white/[0.1] shrink-0">
        {typeof IconComp === "string" ? (
          <Icon
            name={IconComp}
            className="text-[#1D1D1F] dark:text-[#F5F5F7] size-4.5"
          />
        ) : (
          <IconComp className="text-[#1D1D1F] dark:text-[#F5F5F7] size-4.5" />
        )}
      </div>
      <div className="flex flex-col items-start justify-center min-w-0 flex-1 truncate">
        <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] text-xs sm:text-sm truncate w-full text-left">
          {title}
        </span>
        <span className="text-[#6E6E73] dark:text-[#98989D] text-[11px] leading-tight truncate w-full text-left">
          {description}
        </span>
      </div>
    </NavLink>
  );
}

function useScroll(threshold: number) {
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > threshold);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}

const WordmarkIcon = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    className={cn(
      "ds-apple-display lowercase text-[19px] sm:text-[21px] font-semibold tracking-[-0.03em] leading-none text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-nowrap",
      className
    )}
    {...props}
  >
    deep shop
  </span>
);
