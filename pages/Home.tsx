import { useRegion } from "@/components/RegionContext";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  getDocs,
  where,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import { Product } from "../types";
import { motion, AnimatePresence, useReducedMotion, PanInfo } from "framer-motion";
import { optimizeImageUrl } from "../lib/imageOptimize";
import SEO from "../components/SEO";
import { useTheme } from "../components/ThemeContext";
import { readOfflineProducts, writeOfflineProducts } from "../lib/offlineStore";
import { ProductSkeleton } from "../components/Skeletons";
import { SectionShowcaseSkeleton, StoryRowSkeleton } from "../components/PageSkeletons";
import { CustomSectionEmbed } from "../components/CustomSectionEmbed";
import { ProductCard } from "../components/ui/ProductCard";
import { OfferSlider } from "../components/ui/OfferSlider";
import { BorderOfferSection } from "../components/ui/BorderOfferSection";
import { ChevronRight, ArrowUpRight } from "lucide-react";
import { PixelImage } from "../components/ui/PixelImage";
import { getProductDisplayImage } from "../src/lib/phonePartsArt";
import { HeroSlider } from "../components/ui/hero-slider";
import { LogoTimeline, type LogoItem } from "../components/ui/logo-timeline";
import { Footer } from "../components/Footer";
import { triggerHaptic } from "../lib/haptics";
import { useSwipeNavigation } from "../lib/useSwipeNavigation";
import {
  DeepShopSponsoredAd,
  isLikelyVideoUrl,
  readHiddenAdIds,
} from "../components/DeepShopSponsoredAd";

const ThinBanner = ({ banner }: { banner: any }) => {
  const [hiddenTick, setHiddenTick] = useState(0);

  useEffect(() => {
    const onHidden = () => setHiddenTick((v) => v + 1);
    window.addEventListener("ds:hidden-ads-updated", onHidden);
    return () => window.removeEventListener("ds:hidden-ads-updated", onHidden);
  }, []);

  if (!banner || !banner.imageUrl) return null;
  const adId = String(banner.id || `home-banner-${banner.imageUrl.slice(-16)}`);
  const hidden = readHiddenAdIds();
  if (hidden.has("__ALL__") || hidden.has(adId)) {
    void hiddenTick;
    return null;
  }

  return (
    <div className="w-full mb-10">
      <DeepShopSponsoredAd
        ad={{
          id: adId,
          sourceType: "banner",
          media: [
            {
              url: banner.imageUrl,
              type: isLikelyVideoUrl(banner.imageUrl) ? "video" : "image",
              ratio: "auto",
            },
          ],
          title: banner.title || "",
          text: banner.subtitle || banner.description || "",
          buttonText: banner.buttonText || "See details",
          buttonLink: banner.link || "/all-products",
          targetRegion: "Bangladesh",
          isSponsored: true,
        }}
        variant="compact"
      />
    </div>
  );
};

const SectionHeader: React.FC<{
  eyebrow?: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ eyebrow, title, actionLabel, onAction }) => (
  <div className="flex items-end justify-between gap-4 mb-4">
    <div className="min-w-0">
      {eyebrow && (
        <p className="ds-apple-eyebrow ds-apple-muted text-[11px] mb-1 truncate">
          {eyebrow}
        </p>
      )}
      <h2 className="ds-apple-display text-[22px] sm:text-[26px] font-semibold">
        {title}
      </h2>
    </div>
    {actionLabel && onAction && (
      <button
        type="button"
        onPointerDown={() => triggerHaptic()}
        onClick={onAction}
        className="ds-apple-accent-text inline-flex items-center gap-0.5 text-[13px] font-semibold hover:underline whitespace-nowrap shrink-0 cursor-pointer active:scale-95 transition-transform"
      >
        <span>{actionLabel}</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    )}
  </div>
);

const Home: React.FC<{ userData?: any }> = ({ userData }) => {
  const navigate = useNavigate();
  const { formatPrice } = useRegion();
  const shouldReduceMotion = useReducedMotion();
  useTheme();

  const [products, setProducts] = useState<Product[]>(() =>
    readOfflineProducts()
  );
  const [isLoadingProducts, setIsLoadingProducts] = useState(
    () => readOfflineProducts().length === 0
  );
  const [banners, setBanners] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem("ds_home_banners_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [isLoadingBanners, setIsLoadingBanners] = useState(() => {
    try {
      const raw = localStorage.getItem("ds_home_banners_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        return !(Array.isArray(parsed) && parsed.length > 0);
      }
    } catch {}
    return true;
  });
  const [seoConfig, setSeoConfig] = useState<any>({});
  const [activeBanner, setActiveBanner] = useState(0);
  const [heroDirection, setHeroDirection] = useState(1);

  useEffect(() => {
    const unsubSeo = onSnapshot(
      doc(db, "settings", "seo"),
      (snap) => {
        if (snap.exists()) setSeoConfig(snap.data() || {});
      },
      () => {}
    );
    return () => unsubSeo();
  }, []);

  const [activeCategoryBanner, setActiveCategoryBanner] = useState(0);
  const [activeBottomBanner, setActiveBottomBanner] = useState(0);
  const [activeCategory, setActiveCategory] = useState("All");
  const [displayedCount, setDisplayedCount] = useState(8);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sellers, setSellers] = useState<any[]>(() => {
    try {
      const raw = sessionStorage.getItem("ds_home_sellers_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const filteredProducts = useMemo(() => {
    return products.filter((p) => activeCategory === "All" || p.category === activeCategory);
  }, [products, activeCategory]);

  useEffect(() => {
    setDisplayedCount(8);
  }, [activeCategory]);

  const handleLoadMore = () => {
    triggerHaptic();
    setLoadingMore(true);
    setTimeout(() => {
      setDisplayedCount((prev) => prev + 8);
      setLoadingMore(false);
    }, 450);
  };

  const validBanners = useMemo(
    () =>
      banners.filter(
        (b) => typeof b?.imageUrl === "string" && b.imageUrl.trim() !== ""
      ),
    [banners]
  );

  const heroBanners = validBanners.filter(
    (b) => !b.bannerType || b.bannerType === "hero"
  );
  const gifBanners = validBanners.filter((b) => b.bannerType === "gif");
  const categoryBanners = validBanners.filter(
    (b) => b.bannerType === "category" || b.bannerType === "profile"
  );
  const bottomBanners = validBanners.filter((b) => b.bannerType === "bottom");

  const safeHeroIdx =
    heroBanners.length > 0 ? activeBanner % heroBanners.length : 0;
  const safeCategoryBannerIdx =
    categoryBanners.length > 0
      ? activeCategoryBanner % categoryBanners.length
      : 0;
  const safeBottomBannerIdx =
    bottomBanners.length > 0 ? activeBottomBanner % bottomBanners.length : 0;

  useEffect(() => {
    if (heroBanners.length <= 1) return;
    const timer = setInterval(() => {
      setHeroDirection(1);
      setActiveBanner((prev) => (prev + 1) % heroBanners.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [heroBanners.length]);

  useEffect(() => {
    if (categoryBanners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveCategoryBanner((prev) => (prev + 1) % categoryBanners.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [categoryBanners.length]);

  useEffect(() => {
    if (bottomBanners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveBottomBanner((prev) => (prev + 1) % bottomBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [bottomBanners.length]);

  useEffect(() => {
    const qProds = query(collection(db, "products"), limit(80));
    const unsubscribeProds = onSnapshot(
      qProds,
      (snapshot) => {
        const nextProducts = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Product
        );
        setProducts(nextProducts);
        setIsLoadingProducts(false);
        writeOfflineProducts(nextProducts);
      },
      () => {
        setIsLoadingProducts(false);
      }
    );

    const qBanners = query(
      collection(db, "banners"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const unsubscribeBanners = onSnapshot(
      qBanners,
      (snapshot) => {
        const nextBanners = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setBanners(nextBanners);
        setIsLoadingBanners(false);
        try {
          localStorage.setItem(
            "ds_home_banners_v1",
            JSON.stringify(nextBanners.slice(0, 16))
          );
        } catch {}
      },
      () => {
        setIsLoadingBanners(false);
      }
    );

    const sellerTimer = setTimeout(async () => {
      try {
        if (sessionStorage.getItem("ds_home_sellers_v1")) return;
        const sellerSnap = await getDocs(
          query(collection(db, "users"), where("role", "==", "seller"), limit(24))
        );
        const list = sellerSnap.docs.map((d) => d.data());
        setSellers(list);
        sessionStorage.setItem("ds_home_sellers_v1", JSON.stringify(list));
      } catch {}
    }, 1800);

    return () => {
      unsubscribeProds();
      unsubscribeBanners();
      clearTimeout(sellerTimer);
    };
  }, []);

  const sellerLogos = useMemo(() => {
    const combinedSellers = [...sellers].filter((s) => {
      const name = (s.shopName || s.displayName || "").toLowerCase().trim();
      return (
        Boolean(name) &&
        !name.includes("deep shop feni") &&
        !name.includes("shoo") &&
        !name.includes("deep shop")
      );
    });

    if (combinedSellers.length === 0) return [];

    const numRows = 2;
    const itemsPerRow = Math.ceil(combinedSellers.length / numRows);

    return combinedSellers.map((seller, idx) => {
      const rowNum = (idx % numRows) + 1;
      const rowIndex = Math.floor(idx / numRows);
      const name = seller.shopName || seller.displayName || "Verified Seller";
      const optimizedSellerAvatar =
        typeof seller.photoURL === "string" && seller.photoURL.trim() !== ""
          ? optimizeImageUrl(seller.photoURL.trim(), 80, 72)
          : "";
      const avatarUrl =
        optimizedSellerAvatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0071e3&color=fff&rounded=true&font-size=0.4`;

      return {
        label: name,
        icon: (
          <img
            src={avatarUrl}
            width={26}
            height={26}
            loading="lazy"
            decoding="async"
            className="w-6 h-6 rounded-full object-cover shrink-0 bg-zinc-200 dark:bg-zinc-800"
            alt={name}
            referrerPolicy="no-referrer"
          />
        ),
        row: rowNum,
        animationDelay: -(rowIndex * (40 / Math.max(1, itemsPerRow))),
        animationDuration: 28,
      } as LogoItem;
    });
  }, [sellers]);

  const borderCrossPhones = useMemo(
    () =>
      products
        .filter((p) =>
          ["phone", "mobile", "cross", "border"].some((word) =>
            p.category?.toLowerCase().includes(word)
          )
        )
        .slice(0, 8),
    [products]
  );

  const phoneParts = useMemo(
    () =>
      products
        .filter((p) =>
          [
            "part",
            "পার্টস",
            "display",
            "স্ক্রিন",
            "battery",
            "ব্যাটারি",
            "camera",
            "ক্যামেরা",
            "logic",
            "motherboard",
            "মাদারবোর্ড",
          ].some(
            (word) =>
              (p.category || "").toLowerCase().includes(word) ||
              (p.name || "").toLowerCase().includes(word)
          )
        )
        .slice(0, 8),
    [products]
  );

  const mobileGear = useMemo(
    () =>
      products
        .filter((p) =>
          ["accessories", "cover", "charger", "cable", "phone", "mobile"].some((word) =>
            p.category?.toLowerCase().includes(word)
          )
        )
        .slice(0, 6),
    [products]
  );

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
    ],
    [products]
  );

  const categoryPillRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const selectDiscoveryCategory = (nextCategory: string) => {
    triggerHaptic("selection");
    setActiveCategory(nextCategory);
    const pill = categoryPillRefs.current[nextCategory];
    if (pill) {
      pill.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  };

  const { swipeHandlers: discoverySwipeHandlers } = useSwipeNavigation({
    disabled: categories.length <= 1,
    onSwipeLeft: () => {
      const idx = categories.indexOf(activeCategory);
      const nextIdx = idx >= 0 ? Math.min(categories.length - 1, idx + 1) : 0;
      if (nextIdx !== idx) {
        selectDiscoveryCategory(categories[nextIdx]);
      }
    },
    onSwipeRight: () => {
      const idx = categories.indexOf(activeCategory);
      if (idx > 0) {
        selectDiscoveryCategory(categories[idx - 1]);
      }
    },
  });

  const handleHeroDragEnd = (_: any, info: PanInfo) => {
    if (heroBanners.length <= 1) return;
    if (info.offset.x < -45 || info.velocity.x < -280) {
      triggerHaptic();
      setHeroDirection(1);
      setActiveBanner((prev) => (prev + 1) % heroBanners.length);
    } else if (info.offset.x > 45 || info.velocity.x > 280) {
      triggerHaptic();
      setHeroDirection(-1);
      setActiveBanner((prev) => (prev - 1 + heroBanners.length) % heroBanners.length);
    }
  };

  const heroTransition = shouldReduceMotion
    ? { duration: 0.2 }
    : {
        x: { type: "spring" as const, bounce: 0, duration: 0.44 },
        opacity: { duration: 0.24 },
      };

  const categoryRingSpring = shouldReduceMotion
    ? { duration: 0.14 }
    : { type: "spring" as const, bounce: 0, duration: 0.34 };

  return (
    <div className="ds-apple-shop-canvas relative pt-3 sm:pt-5 w-full min-h-screen pb-0">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-5 md:px-12">
        <SEO
          title={
            seoConfig.metaTitle ||
            "DEEP SHOP - border cross devices, border cross products, illegal products buy sell site"
          }
          description={
            seoConfig.metaDescription ||
            "DEEP SHOP is Bangladesh's trusted platform for Border Cross Products & genuine mobiles. Find 100% authentic and trusted global tech products."
          }
          image={seoConfig.metaImage || seoConfig.appIconUrl || undefined}
          canonical="/"
          exactTitle
        />

        <CustomSectionEmbed location="home_top" />

        {/* 1. HERO SPOTLIGHT STAGE (Swipeable Spring Carousel) */}
        {isLoadingBanners ? (
          <div className="mb-8 w-full space-y-3">
            <div className="ds-skeleton h-5 w-32 rounded-lg" />
            <div className="ds-skeleton w-full aspect-[16/9] sm:aspect-[21/9] rounded-[24px] md:rounded-[28px]" />
          </div>
        ) : (
          heroBanners.length > 0 && (
            <section className="mb-9 w-full">
              <SectionHeader eyebrow="Featured Showcase" title="Hot Deals" />
              <div
                id="home-hero"
                data-no-swipe="true"
                className="ds-apple-surface relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-[24px] md:rounded-[28px] overflow-hidden cursor-pointer select-none"
                onClick={() => {
                  triggerHaptic();
                  if (heroBanners[safeHeroIdx]?.link) {
                    navigate(heroBanners[safeHeroIdx].link);
                  }
                }}
              >
                <AnimatePresence initial={false} custom={heroDirection} mode="popLayout">
                  <motion.div
                    key={safeHeroIdx}
                    custom={heroDirection}
                    initial={
                      shouldReduceMotion
                        ? { opacity: 0 }
                        : { x: heroDirection > 0 ? 140 : -140, opacity: 0.4 }
                    }
                    animate={{ x: 0, opacity: 1 }}
                    exit={
                      shouldReduceMotion
                        ? { opacity: 0 }
                        : { x: heroDirection > 0 ? -140 : 140, opacity: 0.4 }
                    }
                    drag={heroBanners.length > 1 ? "x" : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.18}
                    onDragEnd={handleHeroDragEnd}
                    transition={heroTransition}
                    className="absolute inset-0 bg-zinc-200 dark:bg-zinc-900"
                  >
                    {(() => {
                      const rawHeroUrl =
                        heroBanners[safeHeroIdx]?.imageUrl?.trim() || "";
                      const heroSrc =
                        optimizeImageUrl(rawHeroUrl, 1200, 82) || rawHeroUrl;
                      return heroSrc ? (
                        <img
                          src={heroSrc}
                          loading="eager"
                          fetchPriority="high"
                          decoding="async"
                          draggable={false}
                          onError={(e) => {
                            if (rawHeroUrl && e.currentTarget.src !== rawHeroUrl) {
                              e.currentTarget.src = rawHeroUrl;
                            }
                          }}
                          className="w-full h-full object-cover"
                          alt={
                            heroBanners[safeHeroIdx]?.title ||
                            "Featured Deal Banner"
                          }
                        />
                      ) : null;
                    })()}
                  </motion.div>
                </AnimatePresence>

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10 pointer-events-none" />

                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 z-20 flex justify-between items-end gap-4">
                  <div className="flex flex-col text-white min-w-0 max-w-[78%]">
                    <h3 className="ds-apple-display text-lg sm:text-2xl font-semibold text-white truncate">
                      {heroBanners[safeHeroIdx]?.title ||
                        "Discover the latest arrivals"}
                    </h3>
                    <p className="text-xs sm:text-sm text-white/80 mt-1 truncate">
                      {heroBanners[safeHeroIdx]?.subtitle || "Exclusive collection"}
                    </p>
                  </div>
                  <motion.div
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.92 }}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/90 text-[#1d1d1f] flex items-center justify-center shadow-sm backdrop-blur-md shrink-0"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </motion.div>
                </div>

                {heroBanners.length > 1 && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 z-20 bg-black/35 backdrop-blur-md px-2.5 py-1.5 rounded-full">
                    {heroBanners.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic();
                          setHeroDirection(i >= safeHeroIdx ? 1 : -1);
                          setActiveBanner(i);
                        }}
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                          safeHeroIdx === i
                            ? "bg-white w-5"
                            : "bg-white/45 w-1.5 hover:bg-white/75"
                        }`}
                        aria-label={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          )
        )}

        {/* 2. EDITORIAL PROGRAM ROW (Reseller VIP & Referral Reward) */}
        <section
          className={`mb-10 w-full grid grid-cols-1 gap-4 items-stretch ${
            !userData ? "lg:grid-cols-12" : ""
          }`}
        >
          <motion.div
            whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
            onPointerDown={() => triggerHaptic()}
            onClick={() => navigate("/subscription")}
            className={`ds-apple-surface group relative overflow-hidden rounded-[24px] p-6 sm:p-7 cursor-pointer flex flex-col justify-between gap-5 ${
              !userData ? "lg:col-span-8" : ""
            }`}
          >
            <div className="space-y-2 max-w-2xl">
              <p className="ds-apple-eyebrow ds-apple-muted text-[11px]">
                Reseller Program · VIP Masterclass
              </p>
              <h3 className="ds-apple-display text-[19px] sm:text-[23px] font-semibold">
                রিসেলারদের জন্য ০৳ অগ্রিমে আনলিমিটেড ফুল ক্যাশ অন ডেলিভারি
              </h3>
              <p className="ds-apple-muted text-[13px] sm:text-sm leading-relaxed line-clamp-2">
                কোনো অগ্রিম চার্জ ছাড়া সরাসরি কাস্টমারকে পার্সেল পাঠান। রিসেলার মাস্টারক্লাসের স্টেপ-বাই-স্টেপ গাইড ও ভিআইপি প্ল্যান দেখুন।
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="button"
                className="ds-apple-btn-primary rounded-full px-5 h-10 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>গাইড ও প্ল্যান দেখুন</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="ds-apple-muted text-xs font-medium hidden sm:inline">
                Official Certification &amp; Priority Support
              </span>
            </div>
          </motion.div>

          {!userData && (
            <motion.div
              whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
              onPointerDown={() => triggerHaptic()}
              onClick={() => navigate("/auth-selector")}
              className="lg:col-span-4 rounded-[24px] bg-[#1d1d1f] dark:bg-[#1c1c1e] border border-white/10 text-white p-6 sm:p-7 cursor-pointer flex flex-col justify-between gap-5"
            >
              <div className="space-y-2">
                <p className="ds-apple-eyebrow text-white/60 text-[11px]">
                  Referral Reward
                </p>
                <h3 className="ds-apple-display text-[20px] sm:text-[22px] font-semibold text-white">
                  Sign in to refer &amp; earn
                </h3>
                <p className="text-[13px] text-white/75 leading-relaxed tabular-nums">
                  Earn up to {formatPrice(200)} credit on every verified referral order.
                </p>
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-white text-[#1d1d1f] text-xs sm:text-sm font-semibold whitespace-nowrap">
                  <span>Sign In</span>
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
            </motion.div>
          )}
        </section>

        {/* 3. TRENDING PRODUCTS SHOWCASE (Draggable Spring HeroSlider) */}
        {isLoadingProducts ? (
          <div className="mb-10 w-full">
            <SectionShowcaseSkeleton cards={4} />
          </div>
        ) : (
          products.length > 0 && (
            <section id="home-products" className="mb-10 w-full">
              <SectionHeader
                eyebrow="Curated Selection"
                title="Trending Products"
                actionLabel="See All"
                onAction={() => navigate("/all-products")}
              />
              <HeroSlider
                autoSlideDelay={4500}
                pauseDurationAfterInteract={10000}
                cards={products.slice(0, 6).map((p) => ({
                  id: p.id,
                  title: p.name,
                  description:
                    p.description || "Discover authentic products at DEEP SHOP.",
                  category: p.category,
                  image: getProductDisplayImage(p),
                  date:
                    p.isOffer && p.offerPrice
                      ? formatPrice(p.offerPrice)
                      : formatPrice(p.price),
                  actionText: "Buy Now",
                }))}
              />
            </section>
          )
        )}

        {/* 4. SPECIAL OFFERS CAROUSEL */}
        {products.some((p) => p.isOffer) && (
          <section className="mb-10 w-full">
            <SectionHeader
              eyebrow="Limited Pricing"
              title="Special Offers"
              actionLabel="See All"
              onAction={() => navigate("/flash-sale")}
            />
            <OfferSlider
              products={products.filter((p) => p.isOffer).slice(0, 8)}
              autoSlide={true}
            />
          </section>
        )}

        {/* 5. BORDER STOCK INTERACTIVE SPRING STACK */}
        <BorderOfferSection products={products} />

        {/* 6. CATEGORY FILTER STRIP */}
        <section className="mb-9 w-full relative z-10">
          <SectionHeader eyebrow="Browse by Type" title="Categories" />
          {isLoadingProducts ? (
            <StoryRowSkeleton count={7} />
          ) : (
            <div className="flex items-center gap-3.5 sm:gap-4 overflow-x-auto pt-1 pb-3 px-0.5 scrollbar-hide snap-x">
              {categories.map((cat) => {
                const isSelected = activeCategory === cat;
                const firstProduct =
                  cat !== "All" ? products.find((p) => p.category === cat) : undefined;
                const rawCategoryImg =
                  firstProduct?.images
                    ?.find((u) => typeof u === "string" && u.trim() !== "")
                    ?.trim() ||
                  (typeof firstProduct?.image === "string" &&
                  firstProduct.image.trim() !== ""
                    ? firstProduct.image.trim()
                    : "");
                const imageUrl = rawCategoryImg
                  ? optimizeImageUrl(rawCategoryImg, 128, 75) || rawCategoryImg
                  : "";

                return (
                  <motion.button
                    key={cat}
                    ref={(el) => {
                      categoryPillRefs.current[cat] = el;
                    }}
                    type="button"
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
                    onClick={() => {
                      triggerHaptic();
                      setActiveCategory(cat);
                      document
                        .getElementById("popular-products")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="flex flex-col items-center gap-2 snap-center shrink-0 cursor-pointer group focus:outline-none"
                  >
                    <div className="relative w-16 h-16 md:w-[70px] md:h-[70px] rounded-full p-1 flex items-center justify-center">
                      {isSelected && (
                        <motion.span
                          layoutId="homeCategoryRing"
                          transition={categoryRingSpring}
                          className="absolute inset-0 rounded-full ring-2 ring-[#0071E3] dark:ring-[#0A84FF]"
                        />
                      )}
                      <div className="ds-apple-surface w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                        {cat === "All" ? (
                          <span className="text-xs font-semibold tracking-tight">
                            All
                          </span>
                        ) : imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={cat}
                            width={64}
                            height={64}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-semibold uppercase">
                            {cat.slice(0, 2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-[11px] md:text-xs font-medium text-center truncate max-w-[82px] transition-colors ${
                        isSelected
                          ? "ds-apple-accent-text font-semibold"
                          : "ds-apple-muted"
                      }`}
                    >
                      {cat}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </section>

        {/* 7. BORDER CROSS PHONES */}
        {borderCrossPhones.length > 0 && (
          <section
            className="mb-10 w-full"
            style={{ contentVisibility: "auto", containIntrinsicSize: "0 360px" }}
          >
            <SectionHeader
              eyebrow="Direct Intake"
              title="Border Cross Phones"
              actionLabel="See All"
              onAction={() => navigate("/all-products")}
            />
            <div className="flex gap-4 overflow-x-auto pb-3 pt-1 px-0.5 scrollbar-hide snap-x">
              {borderCrossPhones.map((product, index) => (
                <div
                  key={product.id ? `${product.id}-horiz-${index}` : index}
                  className="min-w-[220px] sm:min-w-[260px] snap-center"
                >
                  <ProductCard product={product} index={index} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 8. PHONE PARTS */}
        {phoneParts.length > 0 && (
          <section
            className="mb-10 w-full"
            style={{ contentVisibility: "auto", containIntrinsicSize: "0 340px" }}
          >
            <SectionHeader
              eyebrow="OEM Components"
              title="Phone Parts"
              actionLabel="See All"
              onAction={() => navigate("/all-products?category=Phone+Parts")}
            />
            <div className="flex gap-4 overflow-x-auto pb-3 pt-1 px-0.5 scrollbar-hide snap-x">
              {phoneParts.map((product, index) => (
                <div
                  key={product.id ? `${product.id}-parts-${index}` : index}
                  className="min-w-[205px] sm:min-w-[240px] snap-center"
                >
                  <ProductCard product={product} index={index} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 9. ORIGINAL MOBILES & GEAR COMPACT LIST */}
        {mobileGear.length > 0 && (
          <section
            className="mb-10 w-full"
            style={{ contentVisibility: "auto", containIntrinsicSize: "0 320px" }}
          >
            <SectionHeader
              eyebrow="Essential Companions"
              title="Original Mobiles & Gear"
              actionLabel="See All"
              onAction={() => navigate("/all-products")}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {mobileGear.map((product, idx) => {
                const price =
                  product.isOffer && product.offerPrice
                    ? product.offerPrice
                    : product.price;
                const slug =
                  (product.name || "product")
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/(^-|-$)/g, "") || "item";
                return (
                  <motion.div
                    key={product.id ? `${product.id}-gear-${idx}` : idx}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
                    onPointerDown={() => triggerHaptic()}
                    onClick={() => navigate(`/product/${slug}/${product.id}`)}
                    className="ds-apple-surface flex items-center gap-3.5 p-3 rounded-[20px] cursor-pointer group/row transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <div className="ds-apple-surface-subtle w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-2xl overflow-hidden shrink-0">
                      <PixelImage
                        src={getProductDisplayImage(product)}
                        alt={product.name}
                        maxWidth={160}
                        className="w-full h-full bg-transparent"
                        imgClassName="w-full h-full object-cover transition-transform duration-300 group-hover/row:scale-105"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="ds-apple-muted text-[11px] font-medium mb-0.5 truncate">
                        {product.brand || product.category || "Authentic Gear"}
                      </p>
                      <h4 className="font-semibold text-[14px] truncate">
                        {product.name}
                      </h4>
                      <div className="flex items-baseline gap-2 mt-1 tabular-nums">
                        <span className="text-[14px] font-semibold whitespace-nowrap">
                          {formatPrice(price)}
                        </span>
                        {product.isOffer &&
                          product.offerPrice &&
                          product.offerPrice < product.price && (
                            <span className="ds-apple-muted text-[11px] line-through whitespace-nowrap">
                              {formatPrice(product.price)}
                            </span>
                          )}
                      </div>
                    </div>

                    <div className="ds-apple-surface-subtle w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {gifBanners.length > 0 && <ThinBanner banner={gifBanners[0]} />}

        {/* 10. POPULAR PRODUCTS CATALOG GRID */}
        <section
          id="popular-products"
          {...discoverySwipeHandlers}
          className="mb-12 w-full"
          style={{ contentVisibility: "auto", containIntrinsicSize: "0 680px" }}
        >
          <SectionHeader
            eyebrow={
              activeCategory === "All"
                ? "Complete Storefront"
                : `${activeCategory} Collection`
            }
            title="Popular Products"
            actionLabel="See All"
            onAction={() => navigate("/all-products")}
          />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 mb-7">
            {isLoadingProducts || products.length === 0 ? (
              Array(8)
                .fill(0)
                .map((_, i) => <ProductSkeleton key={i} />)
            ) : (
              <>
                {filteredProducts
                  .slice(0, displayedCount)
                  .map((product, index) => (
                    <ProductCard
                      key={product.id ? `${product.id}-${index}` : index}
                      product={product}
                      index={index}
                    />
                  ))}
                {loadingMore &&
                  Array(4)
                    .fill(0)
                    .map((_, idx) => (
                      <ProductSkeleton key={`more-skel-${idx}`} />
                    ))}
              </>
            )}
          </div>

          {filteredProducts.length > displayedCount && (
            <div className="flex justify-center w-full">
              <motion.button
                type="button"
                whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="ds-apple-btn-secondary font-semibold h-11 px-8 rounded-full flex items-center justify-center min-w-[164px] text-sm cursor-pointer transition-colors"
              >
                {loadingMore ? (
                  <span className="w-20 h-3.5 rounded-full ds-skeleton inline-block" />
                ) : (
                  "Show More"
                )}
              </motion.button>
            </div>
          )}
        </section>

        {gifBanners.length > 1 && <ThinBanner banner={gifBanners[1]} />}
      </div>

      {sellerLogos.length > 0 && (
        <LogoTimeline
          items={sellerLogos}
          title="Top Sellers"
          height="h-[250px] md:h-[300px]"
          iconSize={24}
        />
      )}

      <div className="max-w-[1440px] mx-auto px-4 sm:px-5 md:px-12">
        {gifBanners.length > 2 && <ThinBanner banner={gifBanners[2]} />}
        {gifBanners.length > 3 && <ThinBanner banner={gifBanners[3]} />}

        {categoryBanners.length > 0 && (
          <div className="mb-6 w-full">
            <div
              className="ds-apple-surface rounded-[24px] overflow-hidden aspect-[21/9] relative cursor-pointer"
              onClick={() => {
                triggerHaptic();
                navigate(
                  categoryBanners[safeCategoryBannerIdx]?.link || "/all-products"
                );
              }}
            >
              <div
                className="flex transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] h-full"
                style={{
                  transform: `translateX(-${safeCategoryBannerIdx * 100}%)`,
                }}
              >
                {categoryBanners.map((banner, idx) => (
                  <div
                    key={banner.id ? `${banner.id}-${idx}` : idx}
                    className="min-w-full h-full relative"
                  >
                    <PixelImage
                      src={banner.imageUrl}
                      alt={banner.title || "Category Feature"}
                      className="w-full h-full"
                      imgClassName="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              {categoryBanners.length > 1 && (
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-md text-white text-[11px] font-semibold tabular-nums z-10">
                  {safeCategoryBannerIdx + 1} / {categoryBanners.length}
                </div>
              )}
            </div>
          </div>
        )}

        {bottomBanners.length > 0 && (
          <div className="mb-6 w-full">
            <div
              className="ds-apple-surface rounded-[24px] overflow-hidden aspect-[21/9] relative cursor-pointer"
              onClick={() => {
                triggerHaptic();
                navigate(
                  bottomBanners[safeBottomBannerIdx]?.link || "/all-products"
                );
              }}
            >
              <div
                className="flex transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] h-full"
                style={{ transform: `translateX(-${safeBottomBannerIdx * 100}%)` }}
              >
                {bottomBanners.map((banner, idx) => (
                  <div
                    key={banner.id ? `${banner.id}-${idx}` : idx}
                    className="min-w-full h-full relative"
                  >
                    <PixelImage
                      src={banner.imageUrl}
                      alt={banner.title || "Featured Collection"}
                      className="w-full h-full"
                      imgClassName="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              {bottomBanners.length > 1 && (
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-md text-white text-[11px] font-semibold tabular-nums z-10">
                  {safeBottomBannerIdx + 1} / {bottomBanners.length}
                </div>
              )}
            </div>
          </div>
        )}

        <CustomSectionEmbed location="home_bottom" />
      </div>

      <div className="w-full">
        <Footer />
      </div>
    </div>
  );
};

export default Home;
