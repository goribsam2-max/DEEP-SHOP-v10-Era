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
import {
  ShoppingBag,
  Heart,
  ChevronLeft,
  ChevronDown,
  Check,
  Settings,
  Shield,
  Search,
  ShoppingCart,
  MessageSquare,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink, useNavigate, useLocation } from "react-router-dom";

import { triggerHaptic } from "../../lib/haptics";
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
                }
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
                (err) => {
                  console.error("Error listening to chats:", err);
                }
              );
            }
          );
        } else {
          setUserProfile(null);
          setUnreadMessagesCount(0);
        }
      });

      import("firebase/firestore").then(({ collection, getDocs, query }) => {
        const fetchCategories = async () => {
          try {
            const q = query(collection(db, "products"));
            const snapshot = await getDocs(q);
            const allCategories = new Set<string>();
            snapshot.forEach((d) => {
              const data = d.data();
              if (data.category) allCategories.add(data.category);
            });
            setCategories(Array.from(allCategories).slice(0, 8));
          } catch (error) {
            console.error("Failed to fetch categories:", error);
          }
        };
        fetchCategories();
      });
    });

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
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeChats) unsubscribeChats();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
      document.body.style.overflow = "";
      document.body.style.overflowX = "";
      document.documentElement.style.overflowX = "";
    };
  }, [open]);

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

  // News Hub-matching circular white floating button style for Shop Home (/)
  const newsHubCircleBtnClass =
    "relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shadow-[0_4px_14px_rgba(15,23,42,0.08)] hover:bg-slate-50 dark:hover:bg-zinc-800 active:scale-95 transition cursor-pointer shrink-0 border-none";

  const standardDesktopBtnClass =
    "transition-all duration-300 flex items-center justify-center hover:scale-105 active:scale-95 bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 shadow-sm rounded-full w-10 h-10";

  return (
    <header
      className={cn(
        "fixed top-0 z-[120] w-full transition-all duration-300 ease-in-out pointer-events-auto",
        scrolled || open
          ? isHomePage
            ? "bg-white/85 dark:bg-zinc-900/90 backdrop-blur-xl border-b border-white/60 dark:border-zinc-800 shadow-[0_4px_20px_rgba(15,23,42,0.06)]"
            : "bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm"
          : "bg-transparent border-transparent"
      )}
    >
      <nav
        className={cn(
          "mx-auto flex w-full max-w-[1920px] items-center justify-between px-4 lg:px-6 transition-all duration-300",
          isHomePage ? "h-15 md:h-16" : "h-14 md:h-16"
        )}
      >
        <div className="flex items-center gap-2 md:gap-3 pointer-events-auto">
          {/* Top-left Menu Button: Hidden on mobile ONLY on Home ("/"), visible on desktop & all other pages */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              triggerHaptic();
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
              "items-center justify-center transition-all w-10 h-10 rounded-full shrink-0",
              isHomePage
                ? "hidden md:flex bg-white dark:bg-zinc-900 shadow-[0_4px_14px_rgba(15,23,42,0.08)] border-none"
                : "flex border-transparent shadow-none"
            )}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label="Toggle menu"
          >
            {isInnerPage ? (
              <ChevronLeft className="size-6 text-zinc-900 dark:text-white" />
            ) : (
              <MenuToggleIcon
                open={open}
                className="size-5 text-zinc-900 dark:text-white"
                duration={300}
              />
            )}
          </Button>

          {/* Left Brand Title — Compact Switcher Popover (Shop <-> Loops) */}
          {isAdminRoute ? (
            <NavLink
              to="/admin"
              className={cn(
                "flex items-center gap-2.5 shrink-0 rounded-3xl border-none ring-0 shadow-none bg-transparent transition-all duration-300",
                isIslandActive
                  ? "opacity-0 scale-95 pointer-events-none w-0 overflow-hidden"
                  : "opacity-100 scale-100 w-auto"
              )}
            >
              <WordmarkIcon />
            </NavLink>
          ) : (
            <div
              ref={brandMenuRef}
              className={cn(
                "relative shrink-0 transition-all duration-300",
                isIslandActive
                  ? "opacity-0 scale-95 pointer-events-none w-0 overflow-hidden"
                  : "opacity-100 scale-100 w-auto"
              )}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic();
                  setBrandMenuOpen((prev) => !prev);
                }}
                className="inline-flex items-center gap-1.5 px-1.5 py-1 rounded-2xl hover:bg-black/[0.03] dark:hover:bg-white/[0.05] active:scale-95 transition cursor-pointer select-none"
                aria-label="Switch between Deep Shop and Loops"
                aria-expanded={brandMenuOpen}
              >
                {isHomePage ? (
                  <span className="font-brand lowercase text-[24px] sm:text-[26px] font-extrabold tracking-[-0.02em] leading-none mt-0.5 text-zinc-900 dark:text-white whitespace-nowrap">
                    deep shop
                  </span>
                ) : (
                  <WordmarkIcon />
                )}
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-zinc-900 dark:text-zinc-200 stroke-[2.3] mt-0.5 transition-transform duration-200 shrink-0",
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
                    transition={{ type: "spring", stiffness: 430, damping: 30 }}
                    onClick={(e) => e.stopPropagation()}
                    className="loops-liquid-popover absolute left-0 top-full mt-2 z-[160] w-[216px] rounded-[26px] py-2 px-1.5 space-y-0.5"
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
                      <Check className="w-[19px] h-[19px] text-zinc-950 dark:text-white stroke-[2.3]" />
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
                      <svg
                        className="w-[19px] h-[19px] text-zinc-700 dark:text-zinc-300"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.95"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z" />
                      </svg>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* DESKTOP RIGHT ACTION BUTTONS */}
        <div
          className={cn(
            "hidden items-center gap-2.5 md:flex pointer-events-auto transition-all duration-300",
            isIslandActive
              ? "opacity-0 scale-95 pointer-events-none"
              : "opacity-100 scale-100"
          )}
        >
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              navigate("/search");
            }}
            className={
              isHomePage ? newsHubCircleBtnClass : standardDesktopBtnClass
            }
            aria-label="Search"
          >
            <Search fill="none" className="w-5 h-5 stroke-[1.9]" />
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              navigate("/wishlist");
            }}
            className={
              isHomePage ? newsHubCircleBtnClass : standardDesktopBtnClass
            }
            aria-label="Wishlist"
          >
            <Heart fill="none" className="w-5 h-5 stroke-[1.9]" />
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              navigate("/cart");
            }}
            className={cn(
              "relative",
              isHomePage ? newsHubCircleBtnClass : standardDesktopBtnClass
            )}
            aria-label="Shopping Cart"
          >
            <ShoppingCart fill="none" className="w-5 h-5 stroke-[1.9]" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#1877F2] text-white text-[10px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full border border-white dark:border-zinc-900 shadow-sm">
                {cartCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              navigate("/messages");
            }}
            className={
              isHomePage
                ? newsHubCircleBtnClass
                : "relative rounded-full shadow-none border-none bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 w-9 h-9 flex items-center justify-center text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white cursor-pointer"
            }
            aria-label="Messages"
          >
            <MessageSquare fill="none" className="w-5 h-5 stroke-[1.9]" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full border border-white dark:border-zinc-900 shadow-sm">
                {unreadMessagesCount}
              </span>
            )}
          </button>

          <AnimatedThemeToggler
            className={
              isHomePage
                ? newsHubCircleBtnClass
                : "rounded-full shadow-none border-none bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 w-9 h-9 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
            }
          />

          {location.pathname !== "/profile" && (
            <AccountMenu
              scrolled={scrolled}
              isPill={!isHomePage}
              isNewsHubStyle={isHomePage}
            />
          )}
        </div>

        {/* MOBILE RIGHT ACTION BUTTONS */}
        <div
          className={cn(
            "flex items-center gap-2 md:hidden pointer-events-auto transition-all duration-300",
            isIslandActive
              ? "opacity-0 scale-95 pointer-events-none"
              : "opacity-100 scale-100"
          )}
        >
          {isHomePage ? (
            /* News Hub-style crisp floating circular buttons on Shop Home */
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  navigate("/cart");
                }}
                className={newsHubCircleBtnClass}
                aria-label="Shopping Cart"
              >
                <ShoppingCart fill="none" className="w-5 h-5 stroke-[1.9]" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#1877F2] text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-white dark:border-zinc-900 shadow-sm">
                    {cartCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  navigate("/messages");
                }}
                className={newsHubCircleBtnClass}
                aria-label="Messages"
              >
                <MessageSquare fill="none" className="w-5 h-5 stroke-[1.9]" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-white dark:border-zinc-900 shadow-sm">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>

              <AnimatedThemeToggler className={newsHubCircleBtnClass} />

              <AccountMenu scrolled={scrolled} isNewsHubStyle />
            </div>
          ) : (
            <div className="flex items-center gap-1 rounded-full p-1.5 bg-transparent shadow-none">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  triggerHaptic();
                  navigate("/cart");
                }}
                className="relative rounded-full shadow-none border-none bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 w-9 h-9 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                aria-label="Shopping Cart"
              >
                <Icon name="shopping-cart" className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#5F2CFF] text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-white dark:border-zinc-900 shadow-sm">
                    {cartCount}
                  </span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  triggerHaptic();
                  navigate("/messages");
                }}
                className="relative rounded-full shadow-none border-none bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 w-9 h-9 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white flex"
                aria-label="Messages"
              >
                <Icon name="message-square" className="w-5 h-5" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full border border-white dark:border-zinc-900 shadow-sm animate-bounce">
                    {unreadMessagesCount}
                  </span>
                )}
              </Button>
              <AnimatedThemeToggler className="rounded-full shadow-none border-none bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 w-9 h-9 flex text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white" />

              {location.pathname === "/profile" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    triggerHaptic();
                    navigate("/settings");
                  }}
                  className="relative rounded-full shadow-none border-none bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 w-9 h-9 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white flex items-center justify-center cursor-pointer"
                  aria-label="Settings"
                >
                  <Settings className="w-5 h-5" strokeWidth={1.8} />
                </Button>
              ) : (
                <AccountMenu scrolled={scrolled} isPill />
              )}
            </div>
          )}
        </div>
      </nav>

      <MobileMenu
        open={open}
        onClose={() => setOpen(false)}
        className="bg-white dark:bg-zinc-900 border-l md:border-l-0 md:border-r border-zinc-200 dark:border-zinc-800"
      >
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar w-full">
          <div className="flex w-full flex-col gap-y-1.5 pb-4 px-2">
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 px-2 mt-4 mb-2 block">
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
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 px-4 mt-6 mb-2 block">
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
              className="w-full bg-[#1877F2] hover:bg-[#1465D8] text-white font-bold"
              onClick={() => {
                setOpen(false);
                navigate("/admin");
              }}
            >
              <Shield className="w-4 h-4 mr-2" /> Admin Control Panel
            </Button>
          )}

          {showAdminMenu && (
            <Button
              variant="outline"
              className="w-full bg-transparent border-zinc-200 dark:border-zinc-700 mb-2 text-zinc-700 dark:text-zinc-200"
              onClick={() => {
                setOpen(false);
                navigate("/");
              }}
            >
              <ChevronLeft className="w-4 h-4 mr-2" /> Back to Store
            </Button>
          )}

          {!user ? (
            <>
              <Button
                variant="outline"
                className="w-full bg-transparent border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200"
                onClick={() => {
                  setOpen(false);
                  navigate("/auth-selector");
                }}
              >
                Sign In
              </Button>
              <Button
                className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900"
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
                className="w-full bg-transparent border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200"
                onClick={() => {
                  setOpen(false);
                  navigate("/profile");
                }}
              >
                Account & All Pages
              </Button>
              <Button
                className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900"
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

type MobileMenuProps = React.ComponentProps<"div"> & {
  open: boolean;
  onClose?: () => void;
};

function MobileMenu({
  open,
  children,
  onClose,
  className,
  ...props
}: MobileMenuProps) {
  if (!open || typeof window === "undefined") return null;

  return createPortal(
    <>
      <div
        className={cn(
          "fixed inset-0 z-[150000] bg-black/20 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      <div
        id="mobile-menu"
        data-slot={open ? "open" : "closed"}
        className={cn(
          "bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800",
          "fixed z-[150100] md:z-[110] flex flex-col overflow-hidden shadow-2xl md:shadow-none",
          "top-4 bottom-4 left-4 w-72 rounded-[20px] pt-4 pb-4",
          "md:top-0 md:bottom-0 md:left-0 md:w-72 md:rounded-none md:border-r md:border-l-0 md:border-t-0 md:border-b-0 md:pt-16 md:pb-4 md:border-zinc-200 md:dark:border-zinc-800",
          "data-[slot=open]:animate-in data-[slot=closed]:animate-out ease-out duration-300",
          "data-[slot=open]:slide-in-from-left-full data-[slot=closed]:slide-out-to-left-full",
          className
        )}
        {...props}
      >
        <div className="w-full h-full flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </>,
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
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "w-full flex items-center flex-row gap-x-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:bg-zinc-100 dark:focus:bg-zinc-800 rounded-xl px-2.5 py-1.5 transition-colors overflow-hidden max-w-full box-border",
          isActive && "bg-zinc-100 dark:bg-zinc-800 font-medium",
          className
        )
      }
    >
      <div className="bg-zinc-100 dark:bg-zinc-800 flex aspect-square size-10 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm shrink-0">
        {typeof IconComp === "string" ? (
          <Icon
            name={IconComp}
            className="text-zinc-700 dark:text-zinc-300 size-4.5"
          />
        ) : (
          <IconComp className="text-zinc-700 dark:text-zinc-300 size-4.5" />
        )}
      </div>
      <div className="flex flex-col items-start justify-center min-w-0 flex-1 truncate">
        <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm truncate w-full text-left">
          {title}
        </span>
        <span className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-tight truncate w-full text-left">
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
      "font-brand lowercase text-[24px] sm:text-[26px] font-extrabold tracking-[-0.02em] leading-none mt-0.5 text-zinc-900 dark:text-white whitespace-nowrap",
      className
    )}
    {...props}
  >
    deep shop
  </span>
);
