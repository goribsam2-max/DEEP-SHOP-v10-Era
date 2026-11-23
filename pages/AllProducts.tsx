import { formatPrice } from "@/lib/utils";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Product } from "../types";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ProductCard } from "../components/ui/ProductCard";
import SEO from "../components/SEO";
import { ProductSkeleton } from "../components/Skeletons";
import { triggerHaptic } from "../lib/haptics";
import { useSwipeNavigation } from "../lib/useSwipeNavigation";
import { readOfflineProducts, writeOfflineProducts } from "../lib/offlineStore";
import {
  APPLE_SPRING_DEFAULT,
  APPLE_SPRING_SNAPPY,
  projectMomentum,
} from "../lib/shoppingRoute";
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  ListOrdered,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  PackageSearch,
} from "lucide-react";

interface CategoryDetailSpec {
  bnTitle: string;
  enSubtitle: string;
  description: string;
  highlights: string[];
  warrantyNote: string;
}

const CATALOG_DETAILS: Record<string, CategoryDetailSpec> = {
  All: {
    bnTitle: "Complete Product Catalog",
    enSubtitle: "Complete Verified Inventory",
    description:
      "Browse all verified smartphones, Border Cross devices, original replacement parts (displays, batteries, cameras, logic boards), and fast chargers in one place. Check pricing, key specs, and seller details directly from each card.",
    highlights: [
      "100% Quality-Checked Stock",
      "Cash on Delivery & Secure Payment",
      "Safe Nationwide Courier Delivery",
    ],
    warrantyNote:
      "Every item undergoes hardware and physical condition verification before dispatch. Please record an unboxing video for replacement protection.",
  },
  "Phone Parts": {
    bnTitle: "Original Phone Parts Catalog",
    enSubtitle: "OEM & Tested Replacement Components",
    description:
      "Original pulled and premium-grade displays, batteries, camera modules, and logic boards for smartphone repair and servicing. Please verify your exact phone model number before ordering.",
    highlights: [
      "Model-Accurate Fitment",
      "Tested Touch, Sensors & Voltage",
      "Technician & Customer-Safe Packing",
    ],
    warrantyNote:
      "Please test by connecting the flex cable before final installation or removing protective seals.",
  },
  Display: {
    bnTitle: "Smartphone Displays & OLED Panels",
    enSubtitle: "Original Pulled & AMOLED Screen Assemblies",
    description:
      "Original and premium display panels featuring True Tone, high refresh rates, and accurate color calibration. Every screen is checked for dead pixels and touch response before boxing.",
    highlights: [
      "Dead-Pixel & Touch Sensitivity Checked",
      "Shock-Proof Hard Box Packaging",
      "Original Brightness & Color Profile",
    ],
    warrantyNote:
      "Test the display flex connection thoroughly before applying adhesive or glue.",
  },
  Battery: {
    bnTitle: "High-Capacity Original Batteries",
    enSubtitle: "Certified mAh Cells & IC Protected Batteries",
    description:
      "Original-capacity smartphone batteries with dual IC protection to resolve overheating and rapid drain issues. Ensures long-lasting backup and safe charging cycles.",
    highlights: [
      "Genuine mAh Capacity Cells",
      "Overcharge & Short-Circuit Protection",
      "Fresh Manufacturing Batch",
    ],
    warrantyNote:
      "Complete 3–5 full 10% to 100% charge cycles initially for optimal battery calibration.",
  },
  Camera: {
    bnTitle: "Original Camera Modules & Lenses",
    enSubtitle: "OIS Main, Ultra-Wide & Front Camera Sensors",
    description:
      "100% original camera sensor modules to fix blurry photos, focus issues, or OIS jitter. Autofocus, portrait mode, and video stabilization are pre-tested.",
    highlights: [
      "Autofocus & OIS Stabilization Tested",
      "Dust-Free Clean Sensor Glass",
      "Plug-and-Play Original Flex",
    ],
    warrantyNote:
      "Install in a clean environment and avoid fingerprints or dust on the sensor lens.",
  },
  "Logic Board": {
    bnTitle: "Tested Logic Boards & Motherboards",
    enSubtitle: "Clean Unlocked & Diagnostics-Passed Motherboards",
    description:
      "Fully unlocked smartphone motherboards tested for network, Wi-Fi, charging IC, and audio sections. A reliable solution to restore dead or damaged devices.",
    highlights: [
      "Network & Baseband Verified",
      "Clean Boards with No Repair History",
      "Verified Storage & Model Variants",
    ],
    warrantyNote:
      "Recommended to be installed by an experienced technician with proper thermal paste and shielding.",
  },
  "Border Cross": {
    bnTitle: "Border Cross Smartphone Collection",
    enSubtitle: "Direct Cross-Border Import Smartphones",
    description:
      "Directly imported Border Cross flagship and mid-range smartphones at competitive prices. After pre-order confirmation, devices are safely delivered by courier within the scheduled window.",
    highlights: [
      "30–45 Business Days Import Timeline",
      "Simple Pre-Order & Scheduled Booking",
      "IMEI & Hardware Checked Devices",
    ],
    warrantyNote:
      "Delivery timelines and payment terms displayed at checkout apply to all Border Cross orders.",
  },
  "Original Phones": {
    bnTitle: "Original & Verified Smartphones",
    enSubtitle: "100% Authentic & Diagnostics-Verified Phones",
    description:
      "Original smartphone collection verified through a 30-point checklist covering battery health, display authenticity, cameras, and all sensors.",
    highlights: [
      "30-Point Full Diagnostic Check",
      "Cash on Delivery & Instant Dispatch",
      "Verified Seller Warranty Support",
    ],
    warrantyNote:
      "Condition, storage, and battery health are clearly stated on every product detail page.",
  },
  Mobile: {
    bnTitle: "Mobile Phone Collection",
    enSubtitle: "Curated Everyday & Flagship Handsets",
    description:
      "Handpicked smartphones for everyday use, gaming, and mobile photography. Sort by budget and specifications to find your ideal device.",
    highlights: [
      "Budget to Flagship Variants",
      "Fast Courier Delivery",
      "Easy Checkout & Tracking",
    ],
    warrantyNote:
      "Please record an unboxing video in front of the delivery rider upon parcel receipt.",
  },
  Mobiles: {
    bnTitle: "Smartphones & Handsets",
    enSubtitle: "Verified Multi-Brand Smartphones",
    description:
      "Multi-brand checked smartphone collection. Compare storage, condition, and offer prices to pick the best deal.",
    highlights: [
      "Multi-Brand Verified Stock",
      "Transparent Pricing & Live Stock",
      "Protective Packaging",
    ],
    warrantyNote:
      "Full specifications and customer reviews are available on each handset page.",
  },
  Chargers: {
    bnTitle: "Original Fast Chargers & Adapters",
    enSubtitle: "GaN, PD & SuperVOOC Certified Power Adapters",
    description:
      "Original-circuit PD, GaN, and fast-charging adapters and cables in accurate wattages to keep your phone battery healthy.",
    highlights: [
      "Stable Voltage & Thermal Control",
      "iPhone & Android Fast Charge Support",
      "Durable Original Build Quality",
    ],
    warrantyNote:
      "Select a charger matching your device's supported wattage (20W / 33W / 45W / 67W+).",
  },
};

const TABS = [
  "All",
  "Phone Parts",
  "Display",
  "Battery",
  "Camera",
  "Logic Board",
  "Border Cross",
  "Original Phones",
  "Mobile",
  "Mobiles",
  "Chargers",
];

type SortOption = "featured" | "price-asc" | "price-desc" | "rating" | "discount";

const SORT_LABELS: Record<SortOption, string> = {
  featured: "Featured",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  rating: "Top Rated",
  discount: "Biggest Discount",
};

function matchesCategoryTab(p: Product, tab: string): boolean {
  if (tab === "All") return true;
  if (p.category === tab) return true;
  const catLower = (p.category || "").toLowerCase();
  const nameLower = (p.name || "").toLowerCase();

  if (tab.includes("Phone Parts") || tab.includes("পার্টস")) {
    return [
      "part",
      "পার্টস",
      "display",
      "battery",
      "camera",
      "logic",
      "motherboard",
      "স্ক্রিন",
      "ব্যাটারি",
      "ক্যামেরা",
    ].some((w) => catLower.includes(w) || nameLower.includes(w));
  }
  if (tab.includes("Display") || tab.includes("ডিসপ্লে")) {
    return (
      catLower.includes("display") ||
      nameLower.includes("display") ||
      catLower.includes("oled") ||
      nameLower.includes("oled") ||
      catLower.includes("স্ক্রিন")
    );
  }
  if (tab.includes("Battery") || tab.includes("ব্যাটারি")) {
    return (
      catLower.includes("battery") ||
      nameLower.includes("battery") ||
      catLower.includes("ব্যাটারি") ||
      nameLower.includes("mah")
    );
  }
  if (tab.includes("Camera") || tab.includes("ক্যামেরা")) {
    return (
      catLower.includes("camera") ||
      nameLower.includes("camera") ||
      catLower.includes("ক্যামেরা") ||
      nameLower.includes("lens")
    );
  }
  if (tab.includes("Logic") || tab.includes("মাদারবোর্ড")) {
    return (
      catLower.includes("logic") ||
      nameLower.includes("logic") ||
      catLower.includes("motherboard") ||
      nameLower.includes("motherboard") ||
      catLower.includes("মাদারবোর্ড")
    );
  }
  if (tab === "Border Cross") {
    return Boolean(
      p.isBorderOffer ||
        p.productType === "border_offer" ||
        catLower.includes("border")
    );
  }
  return catLower === tab.toLowerCase();
}

const AllProducts: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const searchParams = new URLSearchParams(location.search);
  const initialCategory =
    searchParams.get("category") || (location.state as any)?.category || "All";

  const [products, setProducts] = useState<Product[]>(() => readOfflineProducts());
  const [loading, setLoading] = useState(() => readOfflineProducts().length === 0);
  const [activeTab, setActiveTab] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [offersOnly, setOffersOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [mobileFilterSheetOpen, setMobileFilterSheetOpen] = useState(false);
  const [quickViewImg, setQuickViewImg] = useState<string | null>(null);

  const mobileTabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const paramCat = new URLSearchParams(location.search).get("category");
    setActiveTab(paramCat || "All");
  }, [location.search]);

  useEffect(() => {
    const btn = mobileTabRefs.current[activeTab];
    if (btn) {
      btn.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [activeTab]);

  const handleTabChange = (tab: string) => {
    triggerHaptic("selection");
    setActiveTab(tab);
    navigate(
      `/all-products${tab === "All" ? "" : `?category=${encodeURIComponent(tab)}`}`,
      { replace: true }
    );
  };

  const { swipeHandlers } = useSwipeNavigation({
    disabled: mobileFilterSheetOpen || Boolean(quickViewImg),
    onEdgeSwipeRight: () => {
      const curIdx = TABS.indexOf(activeTab);
      if (curIdx > 0) {
        handleTabChange(TABS[curIdx - 1]);
      } else {
        triggerHaptic("light");
        navigate(-1);
      }
    },
    onSwipeLeft: () => {
      const curIdx = TABS.indexOf(activeTab);
      const nextIdx = curIdx >= 0 ? curIdx + 1 : 0;
      if (nextIdx < TABS.length) {
        handleTabChange(TABS[nextIdx]);
      }
    },
    onSwipeRight: () => {
      const curIdx = TABS.indexOf(activeTab);
      if (curIdx > 0) {
        handleTabChange(TABS[curIdx - 1]);
      }
    },
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        const nextProducts = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Product
        );
        setProducts(nextProducts);
        setLoading(false);
        writeOfflineProducts(nextProducts);
      },
      () => {
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  // Category Counts for Sidebar & Mobile Dock
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    TABS.forEach((tab) => {
      map[tab] = products.filter((p) => matchesCategoryTab(p, tab)).length;
    });
    return map;
  }, [products]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const matched = products.filter((p) => {
      if (!matchesCategoryTab(p, activeTab)) return false;
      if (inStockOnly && (p.isSold || p.stock === 0)) return false;
      if (
        offersOnly &&
        !(p.isOffer && p.offerPrice && p.offerPrice < p.price)
      ) {
        return false;
      }
      if (q) {
        const hay = `${p.name || ""} ${p.brand || ""} ${p.category || ""} ${
          p.storage || ""
        } ${p.description || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const sorted = [...matched];
    sorted.sort((a, b) => {
      const priceA = a.isOffer && a.offerPrice ? a.offerPrice : a.price;
      const priceB = b.isOffer && b.offerPrice ? b.offerPrice : b.price;

      if (sortBy === "price-asc") return priceA - priceB;
      if (sortBy === "price-desc") return priceB - priceA;
      if (sortBy === "rating") return (b.rating || 4.8) - (a.rating || 4.8);
      if (sortBy === "discount") {
        const discA =
          a.isOffer && a.offerPrice && a.price > 0
            ? (a.price - a.offerPrice) / a.price
            : 0;
        const discB =
          b.isOffer && b.offerPrice && b.price > 0
            ? (b.price - b.offerPrice) / b.price
            : 0;
        return discB - discA;
      }
      // featured default: in-stock first, then featured/recent
      const outA = a.isSold || a.stock === 0 ? 1 : 0;
      const outB = b.isSold || b.stock === 0 ? 1 : 0;
      if (outA !== outB) return outA - outB;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    return sorted;
  }, [products, activeTab, searchQuery, sortBy, inStockOnly, offersOnly]);

  // Live Catalog Metrics
  const catalogMetrics = useMemo(() => {
    const totalCount = filteredProducts.length;
    const inStockCount = filteredProducts.filter(
      (p) => !p.isSold && p.stock !== 0
    ).length;
    const offersCount = filteredProducts.filter(
      (p) => p.isOffer && p.offerPrice && p.offerPrice < p.price
    ).length;

    const prices = filteredProducts
      .map((p) => (p.isOffer && p.offerPrice ? p.offerPrice : p.price))
      .filter((n) => typeof n === "number" && n > 0);

    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    return { totalCount, inStockCount, offersCount, minPrice, maxPrice };
  }, [filteredProducts]);

  const activeDetails: CategoryDetailSpec =
    CATALOG_DETAILS[activeTab] || {
      bnTitle: `${activeTab} Collection`,
      enSubtitle: "Verified Category Catalog",
      description: `Browse all verified products, current prices, and live stock status in the ${activeTab} category.`,
      highlights: [
        "Quality Checked Products",
        "Protective Packaging & Courier",
        "Direct Cart & Fast Checkout",
      ],
      warrantyNote:
        "Recording an unboxing video when receiving your parcel helps ensure quick support for any transit issues.",
    };

  const hasActiveFilters =
    activeTab !== "All" ||
    searchQuery.trim() !== "" ||
    sortBy !== "featured" ||
    inStockOnly ||
    offersOnly;

  const resetAllFilters = () => {
    triggerHaptic("light");
    handleTabChange("All");
    setSearchQuery("");
    setSortBy("featured");
    setInStockOnly(false);
    setOffersOnly(false);
  };

  return (
    <div
      {...swipeHandlers}
      className="ds-liquid-checkout-shell min-h-screen font-sans relative transition-colors pb-16"
    >
      <SEO
        title={`${activeDetails.bnTitle} | Catalog`}
        description="Browse our vast collection of premium border cross phones, original mobiles, phone parts, chargers, and tech at DEEP SHOP."
        canonical="/all-products"
        jsonLd={
          products.length > 0
            ? {
                "@context": "https://schema.org",
                "@type": "ItemList",
                itemListElement: products.slice(0, 15).map((product, index) => {
                  const slug = (product.name || "item")
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/(^-|-$)/g, "") || "item";
                  return {
                    "@type": "ListItem",
                    position: index + 1,
                    name: product.name,
                    url: `https://www.deepshop.top/product/${slug}/${product.id}`,
                  };
                }),
              }
            : undefined
        }
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8 space-y-6 lg:space-y-8">
        {/* ====================================================================
            MOBILE CATALOG HEADER & CONTROLS (< lg)
            Compact Overview + Collapsible Rich Details + Search/Filter/View Bar
            ==================================================================== */}
        <div className="lg:hidden space-y-3.5">
          {/* Mobile Category Overview Card */}
          <div className="ds-liquid-panel p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-sky-600 dark:text-sky-400">
                  {activeDetails.enSubtitle}
                </p>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white leading-snug mt-0.5">
                  {activeDetails.bnTitle}
                </h1>
              </div>

              <button
                type="button"
                onClick={() => setMobileDetailsOpen((prev) => !prev)}
                className="ds-liquid-subpanel px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <span>Details</span>
                {mobileDetailsOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Inline Unboxed Live Stats */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
              <span className="font-semibold text-slate-900 dark:text-white">
                {catalogMetrics.totalCount} Products
              </span>
              <span aria-hidden="true">·</span>
              <span>{catalogMetrics.inStockCount} in stock</span>
              {catalogMetrics.offersCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-sky-600 dark:text-sky-400 font-semibold">
                    {catalogMetrics.offersCount} offers
                  </span>
                </>
              )}
              {catalogMetrics.minPrice > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>From {formatPrice(catalogMetrics.minPrice)}</span>
                </>
              )}
            </div>

            <p
              className={`text-xs text-slate-600 dark:text-slate-300/90 leading-relaxed ${
                mobileDetailsOpen ? "" : "line-clamp-2"
              }`}
            >
              {activeDetails.description}
            </p>

            {/* Expandable Rich Category Details on Mobile */}
            <AnimatePresence initial={false}>
              {mobileDetailsOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 mt-2 border-t border-slate-900/[0.07] dark:border-white/[0.08] space-y-2.5 text-xs">
                    <div className="text-slate-700 dark:text-slate-200 font-medium">
                      {activeDetails.highlights.join(" · ")}
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                      {activeDetails.warrantyNote}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Search + Filter Sheet + View Switcher */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, brand, or model..."
                className="ds-liquid-input w-full pl-9 pr-8 py-2.5 text-xs font-medium outline-none placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setMobileFilterSheetOpen(true);
              }}
              className="ds-liquid-dock h-10 px-3.5 rounded-2xl flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.97]"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#0A84FF]" />
              <span>Filter</span>
            </button>

            <div className="ds-liquid-dock h-10 p-1 rounded-2xl flex items-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("selection");
                  setViewMode("grid");
                }}
                aria-label="Grid view"
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                  viewMode === "grid"
                    ? "ds-liquid-dock-pill text-slate-900 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("selection");
                  setViewMode("list");
                }}
                aria-label="Detailed list view"
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                  viewMode === "list"
                    ? "ds-liquid-dock-pill text-slate-900 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mobile Horizontal Category Dock */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              const count = categoryCounts[tab] ?? 0;
              return (
                <button
                  key={tab}
                  ref={(el) => {
                    mobileTabRefs.current[tab] = el;
                  }}
                  type="button"
                  onClick={() => handleTabChange(tab)}
                  className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? "ds-liquid-btn-primary !min-h-0 !text-xs shadow-sm"
                      : "ds-liquid-dock text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span>{tab === "All" ? "All Products" : tab}</span>
                  <span className="opacity-75 tabular-nums text-[11px]">
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ====================================================================
            DESKTOP CATALOG HERO & LIVE METRICS PANEL (lg+)
            ==================================================================== */}
        <section className="hidden lg:block ds-liquid-panel p-7 xl:p-8">
          <div className="grid grid-cols-12 gap-8 items-center">
            {/* Left 7 Cols: Category Editorial Details */}
            <div className="col-span-7 space-y-3">
              <div className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                {activeDetails.enSubtitle}
              </div>
              <h1 className="text-3xl xl:text-[34px] font-semibold tracking-tight text-slate-900 dark:text-white leading-tight">
                {activeDetails.bnTitle}
              </h1>
              <p className="text-sm xl:text-[15px] text-slate-600 dark:text-slate-300/90 leading-relaxed max-w-2xl">
                {activeDetails.description}
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                {activeDetails.highlights.map((item, idx) => (
                  <React.Fragment key={item}>
                    {idx > 0 && <span aria-hidden="true">·</span>}
                    <span className="text-slate-700 dark:text-slate-200">
                      {item}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Right 5 Cols: 2x2 Live Tabular Catalog Metrics */}
            <div className="col-span-5 grid grid-cols-2 gap-3.5 tabular-nums">
              <div className="ds-liquid-subpanel p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Total Shown
                </div>
                <div className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">
                  {catalogMetrics.totalCount}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Out of {products.length} total inventory
                </div>
              </div>

              <div className="ds-liquid-subpanel p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Ready in Stock
                </div>
                <div className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  {catalogMetrics.inStockCount}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Available for immediate order
                </div>
              </div>

              <div className="ds-liquid-subpanel p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Special Discounts
                </div>
                <div className="text-2xl font-semibold text-sky-600 dark:text-sky-400 mt-1">
                  {catalogMetrics.offersCount}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Save with offer prices
                </div>
              </div>

              <div className="ds-liquid-subpanel p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Starting Price
                </div>
                <div className="text-xl xl:text-2xl font-semibold text-slate-900 dark:text-white mt-1 truncate">
                  {catalogMetrics.minPrice > 0
                    ? formatPrice(catalogMetrics.minPrice)
                    : "—"}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {catalogMetrics.maxPrice > 0
                    ? `Up to ${formatPrice(catalogMetrics.maxPrice)}`
                    : "Updating stock"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            MAIN WORKSPACE: Desktop 12-Col (3-Col Sticky Filter Rail | 9-Col Stage)
            & Mobile Full-Width Stage
            ==================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* DESKTOP STICKY LEFT SIDEBAR (lg:col-span-3) */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-24 space-y-5">
            <div className="ds-liquid-panel p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">
                  Categories
                </h2>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Category Vertical List */}
              <div className="space-y-1.5">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab;
                  const count = categoryCounts[tab] ?? 0;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => handleTabChange(tab)}
                      className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        isActive
                          ? "ds-liquid-subpanel-active text-slate-900 dark:text-white"
                          : "rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                      }`}
                    >
                      <span className="truncate">
                        {tab === "All" ? "All Products" : tab}
                      </span>
                      <span
                        className={`tabular-nums shrink-0 text-[11px] ${
                          isActive
                            ? "font-semibold text-sky-600 dark:text-sky-400"
                            : "text-slate-400"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Availability & Offer Quick Filters */}
              <div className="pt-4 border-t border-slate-900/[0.07] dark:border-white/[0.08] space-y-2.5">
                <div className="text-xs font-medium text-slate-900 dark:text-white">
                  Quick Filters
                </div>

                <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer select-none text-xs text-slate-700 dark:text-slate-300">
                  <span>In-stock items only</span>
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer select-none text-xs text-slate-700 dark:text-slate-300">
                  <span>Special discount offers</span>
                  <input
                    type="checkbox"
                    checked={offersOnly}
                    onChange={(e) => setOffersOnly(e.target.checked)}
                    className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
                  />
                </label>
              </div>

              {/* Category Note Box */}
              <div className="pt-4 border-t border-slate-900/[0.07] dark:border-white/[0.08]">
                <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Buying &amp; Warranty Note
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {activeDetails.warrantyNote}
                </p>
              </div>
            </div>
          </aside>

          {/* MAIN PRODUCT STAGE (lg:col-span-9) */}
          <div className="lg:col-span-9 space-y-5">
            {/* Desktop Search, Sort & View Toolbar */}
            <div className="hidden lg:flex ds-liquid-panel p-3.5 items-center justify-between gap-4">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by product name, brand, storage, or model..."
                  className="ds-liquid-input w-full pl-10 pr-9 py-2.5 text-sm font-medium outline-none placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Sort + View Controls */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="whitespace-nowrap">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      triggerHaptic("selection");
                      setSortBy(e.target.value as SortOption);
                    }}
                    className="ds-liquid-input px-3.5 py-2 text-xs font-semibold outline-none cursor-pointer"
                  >
                    {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                      <option
                        key={key}
                        value={key}
                        className="bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7]"
                      >
                        {SORT_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ds-liquid-dock p-1 rounded-2xl flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("selection");
                      setViewMode("grid");
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                      viewMode === "grid"
                        ? "ds-liquid-dock-pill text-slate-900 dark:text-white"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Grid View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("selection");
                      setViewMode("list");
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                      viewMode === "list"
                        ? "ds-liquid-dock-pill text-slate-900 dark:text-white"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>Detailed View</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Active Filter Summary Strip (When filtered) */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex flex-wrap items-center gap-2">
                  <span>Active filters:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {activeTab}
                  </span>
                  {inStockOnly && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>In stock</span>
                    </>
                  )}
                  {offersOnly && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Special offers</span>
                    </>
                  )}
                  {searchQuery.trim() && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Query: &ldquo;{searchQuery.trim()}&rdquo;</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-sky-600 dark:text-sky-400 font-semibold hover:underline whitespace-nowrap cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            )}

            {/* Product Grid or Detailed List */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
                {Array(9)
                  .fill(0)
                  .map((_, i) => (
                    <ProductSkeleton key={i} />
                  ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div
                className={
                  viewMode === "list"
                    ? "flex flex-col gap-3.5 sm:gap-4"
                    : "grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5"
                }
              >
                {filteredProducts.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={index}
                    layout={viewMode}
                  />
                ))}
              </div>
            ) : (
              <div className="ds-liquid-panel py-16 px-6 text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-full ds-liquid-subpanel flex items-center justify-center mb-4 text-slate-500 dark:text-slate-400">
                  <PackageSearch className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                  No Products Match This Filter
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
                  Try selecting another category or reset your search and filters to view the full catalog.
                </p>
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="ds-liquid-btn-primary !min-h-[42px] !text-xs px-6 flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>View Full Catalog</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ====================================================================
            CATALOG BUYING & AUTHENTICITY GUIDE SECTION (Detailed Info Footer)
            ==================================================================== */}
        <section className="ds-liquid-panel p-5 sm:p-7 lg:p-8 space-y-5">
          <div className="max-w-2xl">
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Catalog Guide &amp; Order Details
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300/85 mt-1 leading-relaxed">
              Learn about our quality checks, payment methods, and delivery policies before purchasing smartphones, border-cross devices, or replacement parts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="ds-liquid-subpanel p-4 sm:p-5 space-y-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                01. Quality Check &amp; Authenticity
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300/90 leading-relaxed">
                Every phone and part is tested by experienced technicians for display touch, camera focus, network stability, and battery voltage before dispatch. Real photos and exact condition details are listed on each product page.
              </p>
            </div>

            <div className="ds-liquid-subpanel p-4 sm:p-5 space-y-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                02. Payment Methods &amp; Border Cross Booking
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300/90 leading-relaxed">
                Cash on Delivery (COD) is available for ready-stock items. Border-cross and special pre-order devices follow the product-specific advance booking and secure gateway terms.
              </p>
            </div>

            <div className="ds-liquid-subpanel p-4 sm:p-5 space-y-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                03. Courier Delivery &amp; Unboxing Protection
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300/90 leading-relaxed">
                Orders ship nationwide in shock-proof bubble wrap and hard boxes. Recording an uninterrupted unboxing video from start to finish ensures fast resolution for any transit damage.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ====================================================================
          MOBILE FILTER & SORT BOTTOM SHEET (< lg) — Portal + Drag/Momentum Dismiss
          ==================================================================== */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {mobileFilterSheetOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => {
                  triggerHaptic("light");
                  setMobileFilterSheetOpen(false);
                }}
                className="ds-apple-portal ds-apple-backdrop lg:hidden fixed inset-0 z-[1000] flex items-end justify-center p-0"
              >
                <motion.div
                  initial={shouldReduceMotion ? { opacity: 0 } : { y: "100%" }}
                  animate={shouldReduceMotion ? { opacity: 1 } : { y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { y: "100%" }}
                  transition={shouldReduceMotion ? { duration: 0.16 } : APPLE_SPRING_DEFAULT}
                  drag={shouldReduceMotion ? false : "y"}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0.02, bottom: 0.45 }}
                  onDragEnd={(_, info) => {
                    const projected = info.offset.y + projectMomentum(info.velocity.y, 0.99);
                    if (projected > 110) {
                      triggerHaptic("light");
                      setMobileFilterSheetOpen(false);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="ds-apple-sheet w-full max-w-none rounded-t-[28px] rounded-b-none p-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] space-y-5 shadow-2xl max-h-[85dvh] overflow-y-auto"
                >
                  {/* Grabber */}
                  <div className="flex justify-center -mt-1 pb-1" aria-hidden="true">
                    <div className="w-9 h-1 rounded-full bg-black/[0.16] dark:bg-white/[0.22]" />
                  </div>

                  <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
                    <h3 className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                      Sort &amp; Filter
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setMobileFilterSheetOpen(false);
                      }}
                      aria-label="Close filters"
                      className="ds-apple-icon-btn w-8 h-8 rounded-full flex items-center justify-center text-[#1D1D1F] dark:text-[#F5F5F7] cursor-pointer active:scale-95"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-[#6E6E73] dark:text-[#98989D]">
                      Sort Order
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            triggerHaptic("selection");
                            setSortBy(key);
                          }}
                          className={`px-3 py-2.5 rounded-2xl text-xs font-semibold text-left transition-all whitespace-nowrap cursor-pointer active:scale-[0.97] border ${
                            sortBy === key
                              ? "bg-[#0071E3]/[0.08] dark:bg-[#0A84FF]/[0.15] border-[#0071E3]/40 dark:border-[#0A84FF]/45 text-[#0071E3] dark:text-[#0A84FF]"
                              : "bg-[#F5F5F7] dark:bg-[#2C2C2E] border-black/[0.05] dark:border-white/[0.08] text-[#1D1D1F] dark:text-[#F5F5F7]"
                          }`}
                        >
                          {SORT_LABELS[key]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                    <label className="flex items-center justify-between py-1 text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] cursor-pointer">
                      <span>Show in-stock items only</span>
                      <input
                        type="checkbox"
                        checked={inStockOnly}
                        onChange={(e) => {
                          triggerHaptic("toggle");
                          setInStockOnly(e.target.checked);
                        }}
                        className="w-4 h-4 accent-[#0071E3] dark:accent-[#0A84FF] rounded cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between py-1 text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] cursor-pointer">
                      <span>Show special offer items only</span>
                      <input
                        type="checkbox"
                        checked={offersOnly}
                        onChange={(e) => {
                          triggerHaptic("toggle");
                          setOffersOnly(e.target.checked);
                        }}
                        className="w-4 h-4 accent-[#0071E3] dark:accent-[#0A84FF] rounded cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="flex items-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="flex-1 ds-apple-btn-secondary !min-h-[44px] !text-xs whitespace-nowrap rounded-full cursor-pointer"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setMobileFilterSheetOpen(false);
                      }}
                      className="flex-1 ds-apple-btn-primary !min-h-[44px] !text-xs whitespace-nowrap rounded-full cursor-pointer tabular-nums"
                    >
                      View Results ({catalogMetrics.totalCount})
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Quick Preview Modal */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {quickViewImg && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="ds-apple-portal ds-apple-backdrop fixed inset-0 z-[1000] flex items-center justify-center p-6"
                onClick={() => {
                  triggerHaptic("light");
                  setQuickViewImg(null);
                }}
              >
                <motion.div
                  initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.94, opacity: 0, y: 12 }}
                  animate={shouldReduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { scale: 0.96, opacity: 0, y: 8 }}
                  transition={shouldReduceMotion ? { duration: 0.16 } : APPLE_SPRING_SNAPPY}
                  className="ds-apple-modal relative w-full max-w-lg p-6 sm:p-7 flex flex-col items-center gap-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-full aspect-square rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] p-6 flex items-center justify-center overflow-hidden">
                    <img
                      src={quickViewImg}
                      className="max-w-full max-h-full object-contain rounded-xl"
                      alt="Quick preview"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setQuickViewImg(null);
                    }}
                    className="w-full ds-apple-btn-secondary py-3 rounded-full text-xs font-semibold flex items-center justify-center cursor-pointer"
                  >
                    Close Preview
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

export default AllProducts;
