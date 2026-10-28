import { formatPrice } from "@/lib/utils";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Product } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard } from "../components/ui/ProductCard";
import SEO from "../components/SEO";
import { ProductSkeleton } from "../components/Skeletons";
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
    bnTitle: "সম্পূর্ণ প্রোডাক্ট ক্যাটালগ",
    enSubtitle: "Complete Verified Inventory",
    description:
      "এখানে আমাদের সব ক্যাটাগরির যাচাইকৃত স্মার্টফোন, বর্ডার ক্রস ডিভাইস, অরিজিনাল রিপ্লেসমেন্ট পার্টস (ডিসপ্লে, ব্যাটারি, ক্যামেরা, মাদারবোর্ড) এবং ফাস্ট চার্জার একসাথে সাজানো রয়েছে। প্রতিটি পণ্যের দাম, সংক্ষিপ্ত বিবরণ এবং সেলারের তথ্য সরাসরি কার্ড থেকেই দেখে নিতে পারবেন।",
    highlights: [
      "১০০% কোয়ালিটি চেকড স্টক",
      "ক্যাশ অন ডেলিভারি ও নিরাপদ পেমেন্ট সুবিধা",
      "সারা বাংলাদেশে নিরাপদ কুরিয়ার",
    ],
    warrantyNote:
      "সব পণ্য পাঠানোর আগে হার্ডওয়্যার ও ফিজিক্যাল কন্ডিশন যাচাই করে ডিসপ্যাচ করা হয়। আনবক্সিং ভিডিও সংরক্ষণ করলে রিপ্লেসমেন্ট সুরক্ষা প্রযোজ্য।",
  },
  "Phone Parts (পার্টস)": {
    bnTitle: "অরিজিনাল ফোন পার্টস ক্যাটালগ",
    enSubtitle: "OEM & Tested Replacement Components",
    description:
      "স্মার্টফোন রিপেয়ার ও সার্ভিসিংয়ের জন্য অরিজিনাল পুলড (Pulled) এবং প্রিমিয়াম গ্রেড ডিসপ্লে, ব্যাটারি, ক্যামেরা মডিউল ও লজিক বোর্ড। অর্ডার করার পূর্বে আপনার ফোনের সঠিক মডেল নম্বর মিলিয়ে নিন।",
    highlights: [
      "মডেল ভিত্তিক নিখুঁত ফিটমেন্ট",
      "টেস্টেড টাচ, সেন্সর ও ভোল্টেজ",
      "টেকনিশিয়ান ও কাস্টমার বান্ধব প্যাকিং",
    ],
    warrantyNote:
      "পার্টস ইনস্টলেশন বা সিল খোলার পূর্বে ফ্লেক্স কেবল সংযোগ দিয়ে টেস্ট করে নেওয়া আবশ্যক।",
  },
  "Display (ডিসপ্লে)": {
    bnTitle: "স্মার্টফোন ডিসপ্লে ও OLED প্যানেল",
    enSubtitle: "Original Pulled & AMOLED Screen Assemblies",
    description:
      "ট্রু-টোন, হাই রিফ্রেশ রেট এবং নিখুঁত কালার অ্যাকুরেসি সমৃদ্ধ অরিজিনাল ও প্রিমিয়াম ডিসপ্লে প্যানেল। প্রতিটি স্ক্রিন ডেড-পিক্সেল এবং টাচ রেসপন্স চেক করে বক্সিং করা হয়।",
    highlights: [
      "ডেড-পিক্সেল ও টাচ সেন্সিটিভিটি চেকড",
      "শক-প্রুফ হার্ড বক্স প্যাকেজিং",
      "অরিজিনাল ব্রাইটনেস ও কালার প্রোফাইল",
    ],
    warrantyNote:
      "আঠা (Glue) লাগানোর পূর্বে ডিসপ্লে ফ্লেক্স লাগিয়ে সম্পূর্ণ টেস্ট করে নিন।",
  },
  "Battery (ব্যাটারি)": {
    bnTitle: "হাই-ক্যাপাসিটি অরিজিনাল ব্যাটারি",
    enSubtitle: "Certified mAh Cells & IC Protected Batteries",
    description:
      "ওভারহিটিং ও দ্রুত চার্জ শেষ হওয়ার সমস্যা সমাধানে ডুয়াল IC প্রোটেকশন যুক্ত অরিজিনাল ক্যাপাসিটির স্মার্টফোন ব্যাটারি। দীর্ঘস্থায়ী ব্যাকআপ ও নিরাপদ চার্জিং সাইকেল নিশ্চিত করে।",
    highlights: [
      "জেনুইন mAh ক্যাপাসিটি সেল",
      "ওভারচার্জ ও শর্ট-সার্কিট প্রোটেকশন",
      "ফ্রেশ ম্যানুফ্যাকচারিং ব্যাচ",
    ],
    warrantyNote:
      "প্রথম ৩–৫ বার ১০% থেকে ১০০% পূর্ণ চার্জ সাইকেল সম্পন্ন করলে সেরা ব্যাকআপ পাওয়া যায়।",
  },
  "Camera (ক্যামেরা)": {
    bnTitle: "অরিজিনাল ক্যামেরা মডিউল ও লেন্স",
    enSubtitle: "OIS Main, Ultra-Wide & Front Camera Sensors",
    description:
      "ঝাপসা ছবি, ফোকাস সমস্যা বা OIS কাঁপুনি দূর করতে ১০০% অরিজিনাল ক্যামেরা সেন্সর মডিউল। অটোফোকাস, পোর্ট্রেট ও ভিডিও স্ট্যাবিলাইজেশন পূর্ব-পরীক্ষিত।",
    highlights: [
      "অটোফোকাস ও OIS স্ট্যাবিলাইজেশন টেস্টেড",
      "ডাস্ট-ফ্রি ক্লিন সেন্সর গ্লাস",
      "প্লাগ-অ্যান্ড-প্লে অরিজিনাল ফ্লেক্স",
    ],
    warrantyNote:
      "সেন্সর লেন্সে হাতের ছাপ বা ধুলো লাগানো থেকে বিরত থেকে পরিষ্কার পরিবেশে সংযোজন করুন।",
  },
  "Logic Board (মাদারবোর্ড)": {
    bnTitle: "টেস্টেড লজিক বোর্ড ও মাদারবোর্ড",
    enSubtitle: "Clean Unlocked & Diagnostics-Passed Motherboards",
    description:
      "সম্পূর্ণ আনলকড, নেটওয়ার্ক, ওয়াইফাই, চার্জিং IC ও অডিও সেকশন পরীক্ষা করা স্মার্টফোন মাদারবোর্ড। ডেড ফোন সচল করার জন্য নির্ভরযোগ্য সমাধান।",
    highlights: [
      "নেটওয়ার্ক ও বেসব্যান্ড যাচাইকৃত",
      "কোনো রিপেয়ার হিস্ট্রি ছাড়া ক্লিন বোর্ড",
      "স্টোরেজ ও মডেল ভেরিয়েন্ট উল্লেখসহ",
    ],
    warrantyNote:
      "অভিজ্ঞ টেকনিশিয়ান দ্বারা থার্মাল পেস্ট ও শিল্ডিং ঠিক রেখে মাদারবোর্ড স্থাপন করার পরামর্শ দেওয়া হয়।",
  },
  "Border Cross": {
    bnTitle: "বর্ডার ক্রস স্মার্টফোন কালেকশন",
    enSubtitle: "Direct Cross-Border Import Smartphones",
    description:
      "সাশ্রয়ী মূল্যে সরাসরি বর্ডার ক্রস ইমপোর্টকৃত ফ্ল্যাগশিপ ও মিড-রেঞ্জ স্মার্টফোন। বর্ডার ক্রস প্রি-অর্ডারে বুকিং কনফার্ম করার পর নির্ধারিত সময়ের মধ্যে নিরাপদে কুরিয়ারে ডেলিভারি সম্পন্ন হয়।",
    highlights: [
      "৩০–৪৫ কার্যদিবস ইমপোর্ট টাইমলাইন",
      "সহজ প্রি-অর্ডার ও নির্ধারিত বুকিং সুবিধা",
      "আইএমইআই ও হার্ডওয়্যার চেকড ডিভাইস",
    ],
    warrantyNote:
      "বর্ডার ক্রস অর্ডারের ক্ষেত্রে চেকআউট পেজে প্রদর্শিত ডেলিভারি সময়সীমা ও পেমেন্ট শর্তাবলি প্রযোজ্য হবে।",
  },
  "Original Phones": {
    bnTitle: "অরিজিনাল ও ভেরিফায়েড স্মার্টফোন",
    enSubtitle: "100% Authentic & Diagnostics-Verified Phones",
    description:
      "ব্যাটারি হেলথ, ডিসপ্লে অরিজিনালিটি, ক্যামেরা এবং সকল সেন্সর ৩০-পয়েন্ট চেকলিস্টে যাচাইকৃত অরিজিনাল স্মার্টফোন কালেকশন।",
    highlights: [
      "৩০-পয়েন্ট ফুল ডায়াগনস্টিক চেকড",
      "ক্যাশ অন ডেলিভারি ও ইনস্ট্যান্ট ডিসপ্যাচ",
      "ভেরিফায়েড সেলার ওয়ারেন্টি সাপোর্ট",
    ],
    warrantyNote:
      "প্রতিটি ফোনের কন্ডিশন, স্টোরেজ ও ব্যাটারি হেলথ প্রোডাক্ট ডিটেইলস পেজে স্পষ্টভাবে উল্লেখ থাকে।",
  },
  Mobile: {
    bnTitle: "মোবাইল ফোন কালেকশন",
    enSubtitle: "Curated Everyday & Flagship Handsets",
    description:
      "দৈনন্দিন ব্যবহার থেকে শুরু করে গেমিং ও ফটোগ্রাফির জন্য বাছাইকৃত স্মার্টফোনসমূহ। বাজেট ও ফিচার অনুযায়ী সর্ট করে আপনার পছন্দের সেটটি বেছে নিন।",
    highlights: [
      "বাজেট থেকে ফ্ল্যাগশিপ ভেরিয়েন্ট",
      "দ্রুত কুরিয়ার ডেলিভারি",
      "সহজ চেকআউট ও ট্র্যাকিং",
    ],
    warrantyNote:
      "পার্সেল গ্রহণের সময় ডেলিভারি ম্যানের সামনে আনবক্সিং ভিডিও ধারণ করার অনুরোধ রইল।",
  },
  Mobiles: {
    bnTitle: "স্মার্টফোন ও হ্যান্ডসেট সম্ভার",
    enSubtitle: "Verified Multi-Brand Smartphones",
    description:
      "জনপ্রিয় ব্র্যান্ডের চেকড স্মার্টফোন কালেকশন। স্টোরেজ, কন্ডিশন এবং অফার মূল্য তুলনা করে সেরা ডিলটি বেছে নিন।",
    highlights: [
      "মাল্টি-ব্র্যান্ড ভেরিফায়েড স্টক",
      "স্বচ্ছ মূল্য ও রিয়েল-টাইম স্টক তথ্য",
      "সুরক্ষিত প্যাকেজিং",
    ],
    warrantyNote:
      "প্রোডাক্ট পেজে প্রতিটি হ্যান্ডসেটের বিস্তারিত স্পেসিফিকেশন ও রিভিউ দেখতে পাবেন।",
  },
  Chargers: {
    bnTitle: "অরিজিনাল ফাস্ট চার্জার ও অ্যাডাপ্টার",
    enSubtitle: "GaN, PD & SuperVOOC Certified Power Adapters",
    description:
      "ফোনের ব্যাটারি হেলথ সুরক্ষিত রাখতে অরিজিনাল সার্কিট ও সঠিক ওয়াটেজের PD, GaN এবং ফাস্ট চার্জিং অ্যাডাপ্টার ও কেবল কালেকশন।",
    highlights: [
      "স্টেবল ভোল্টেজ ও তাপমাত্রা নিয়ন্ত্রণ",
      "আইফোন ও অ্যান্ড্রয়েড ফাস্ট চার্জ সাপোর্ট",
      "টেকসই অরিজিনাল বিল্ড কোয়ালিটি",
    ],
    warrantyNote:
      "আপনার ডিভাইসের সাপোর্টেড ওয়াট (20W / 33W / 45W / 67W+) মিলিয়ে চার্জার নির্বাচন করুন।",
  },
};

const TABS = [
  "All",
  "Phone Parts (পার্টস)",
  "Display (ডিসপ্লে)",
  "Battery (ব্যাটারি)",
  "Camera (ক্যামেরা)",
  "Logic Board (মাদারবোর্ড)",
  "Border Cross",
  "Original Phones",
  "Mobile",
  "Mobiles",
  "Chargers",
];

type SortOption = "featured" | "price-asc" | "price-desc" | "rating" | "discount";

const SORT_LABELS: Record<SortOption, string> = {
  featured: "ডিফল্ট সাজানো",
  "price-asc": "কম থেকে বেশি দাম",
  "price-desc": "বেশি থেকে কম দাম",
  rating: "সেরা রেটিং",
  discount: "সর্বোচ্চ ছাড়",
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
  const searchParams = new URLSearchParams(location.search);
  const initialCategory =
    searchParams.get("category") || (location.state as any)?.category || "All";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [offersOnly, setOffersOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [mobileFilterSheetOpen, setMobileFilterSheetOpen] = useState(false);
  const [quickViewImg, setQuickViewImg] = useState<string | null>(null);

  useEffect(() => {
    const paramCat = new URLSearchParams(location.search).get("category");
    setActiveTab(paramCat || "All");
  }, [location.search]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(
      `/all-products${tab === "All" ? "" : `?category=${encodeURIComponent(tab)}`}`,
      { replace: true }
    );
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        setProducts(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Product)
        );
        setLoading(false);
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
      bnTitle: `${activeTab} কালেকশন`,
      enSubtitle: "Verified Category Catalog",
      description: `${activeTab} বিভাগের সকল যাচাইকৃত পণ্য, বর্তমান মূল্য এবং স্টক স্ট্যাটাস নিচে দেখানো হচ্ছে।`,
      highlights: [
        "কোয়ালিটি চেকড প্রোডাক্ট",
        "নিরাপদ প্যাকেজিং ও কুরিয়ার",
        "সরাসরি কার্ট ও দ্রুত চেকআউট",
      ],
      warrantyNote:
        "প্রোডাক্ট গ্রহণের সময় আনবক্সিং ভিডিও সংরক্ষণ করলে যেকোনো ডেলিভারি সমস্যায় দ্রুত সহায়তা পাওয়া যাবে।",
    };

  const hasActiveFilters =
    activeTab !== "All" ||
    searchQuery.trim() !== "" ||
    sortBy !== "featured" ||
    inStockOnly ||
    offersOnly;

  const resetAllFilters = () => {
    handleTabChange("All");
    setSearchQuery("");
    setSortBy("featured");
    setInStockOnly(false);
    setOffersOnly(false);
  };

  return (
    <div className="ds-liquid-checkout-shell min-h-screen font-sans relative transition-colors pb-16">
      <SEO
        title={`${activeDetails.bnTitle} | Catalog`}
        description="Browse our vast collection of premium border cross phones, original mobiles, phone parts, chargers, and tech at DEEP SHOP."
        jsonLd={
          products.length > 0
            ? {
                "@context": "https://schema.org",
                "@type": "ItemList",
                itemListElement: products.slice(0, 15).map((product, index) => ({
                  "@type": "ListItem",
                  position: index + 1,
                  name: product.name,
                  url: `https://www.deepshop.top/product/${product.id}`,
                })),
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
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-snug mt-0.5">
                  {activeDetails.bnTitle}
                </h1>
              </div>

              <button
                type="button"
                onClick={() => setMobileDetailsOpen((prev) => !prev)}
                className="ds-liquid-subpanel px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <span>বিস্তারিত</span>
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
                {catalogMetrics.totalCount}টি পণ্য
              </span>
              <span aria-hidden="true">·</span>
              <span>স্টকে {catalogMetrics.inStockCount}টি</span>
              {catalogMetrics.offersCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-sky-600 dark:text-sky-400 font-semibold">
                    {catalogMetrics.offersCount}টি অফার
                  </span>
                </>
              )}
              {catalogMetrics.minPrice > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>শুরু {formatPrice(catalogMetrics.minPrice)}</span>
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
                placeholder="নাম, ব্র্যান্ড বা মডেল খুঁজুন..."
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
              onClick={() => setMobileFilterSheetOpen(true)}
              className="ds-liquid-dock h-10 px-3.5 rounded-2xl flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>ফিল্টার</span>
            </button>

            <div className="ds-liquid-dock h-10 p-1 rounded-2xl flex items-center shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                  viewMode === "grid"
                    ? "ds-liquid-dock-pill text-slate-900 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-label="Detailed list view"
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
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
                  type="button"
                  onClick={() => handleTabChange(tab)}
                  className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? "ds-liquid-btn-primary !min-h-0 !text-xs shadow-sm"
                      : "ds-liquid-dock text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span>{tab === "All" ? "সব পণ্য (All)" : tab}</span>
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
              <h1 className="text-3xl xl:text-[34px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
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
                  মোট প্রদর্শিত পণ্য
                </div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {catalogMetrics.totalCount}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  মোট ইনভেন্টরি {products.length}টি
                </div>
              </div>

              <div className="ds-liquid-subpanel p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  স্টকে প্রস্তুত (Ready)
                </div>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {catalogMetrics.inStockCount}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  তাৎক্ষণিক অর্ডারযোগ্য
                </div>
              </div>

              <div className="ds-liquid-subpanel p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  স্পেশাল ডিসকাউন্টে
                </div>
                <div className="text-2xl font-extrabold text-sky-600 dark:text-sky-400 mt-1">
                  {catalogMetrics.offersCount}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  অফার মূল্যে সাশ্রয়
                </div>
              </div>

              <div className="ds-liquid-subpanel p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  শুরুর মূল্য
                </div>
                <div className="text-xl xl:text-2xl font-extrabold text-slate-900 dark:text-white mt-1 truncate">
                  {catalogMetrics.minPrice > 0
                    ? formatPrice(catalogMetrics.minPrice)
                    : "—"}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {catalogMetrics.maxPrice > 0
                    ? `সর্বোচ্চ ${formatPrice(catalogMetrics.maxPrice)}`
                    : "স্টক আপডেট হচ্ছে"}
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
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                  ক্যাটাগরি তালিকা
                </h2>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>রিসেট</span>
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
                        {tab === "All" ? "সব পণ্য (All Products)" : tab}
                      </span>
                      <span
                        className={`tabular-nums shrink-0 text-[11px] ${
                          isActive
                            ? "font-extrabold text-sky-600 dark:text-sky-400"
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
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  দ্রুত ফিল্টার
                </div>

                <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer select-none text-xs text-slate-700 dark:text-slate-300">
                  <span>শুধু স্টকে থাকা পণ্য</span>
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer select-none text-xs text-slate-700 dark:text-slate-300">
                  <span>স্পেশাল ডিসকাউন্ট অফার</span>
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
                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">
                  ক্রয় ও ওয়ারেন্টি নোট
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
                  placeholder="প্রোডাক্টের নাম, ব্র্যান্ড, স্টোরেজ বা মডেল লিখে খুঁজুন..."
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
                  <span className="whitespace-nowrap">সাজান:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="ds-liquid-input px-3.5 py-2 text-xs font-semibold outline-none cursor-pointer"
                  >
                    {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                      <option
                        key={key}
                        value={key}
                        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        {SORT_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ds-liquid-dock p-1 rounded-2xl flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                      viewMode === "grid"
                        ? "ds-liquid-dock-pill text-slate-900 dark:text-white"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>গ্রিড ভিউ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                      viewMode === "list"
                        ? "ds-liquid-dock-pill text-slate-900 dark:text-white"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>বিস্তারিত ভিউ</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Active Filter Summary Strip (When filtered) */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex flex-wrap items-center gap-2">
                  <span>সক্রিয় ফিল্টার:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {activeTab}
                  </span>
                  {inStockOnly && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>স্টকে আছে</span>
                    </>
                  )}
                  {offersOnly && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>অফার চলছে</span>
                    </>
                  )}
                  {searchQuery.trim() && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>খোঁজ: &ldquo;{searchQuery.trim()}&rdquo;</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-sky-600 dark:text-sky-400 font-semibold hover:underline whitespace-nowrap cursor-pointer"
                >
                  সব ফিল্টার মুছুন
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
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  এই ফিল্টারে কোনো পণ্য পাওয়া যায়নি
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
                  অন্য কোনো ক্যাটাগরি নির্বাচন করুন অথবা সার্চ ও ফিল্টার রিসেট করে সম্পূর্ণ ক্যাটালগ দেখুন।
                </p>
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="ds-liquid-btn-primary !min-h-[42px] !text-xs px-6 flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>সম্পূর্ণ ক্যাটালগ দেখুন</span>
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
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              ক্যাটালগ গাইড ও অর্ডার সংক্রান্ত বিস্তারিত তথ্য
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300/85 mt-1 leading-relaxed">
              স্মার্টফোন, বর্ডার ক্রস ডিভাইস এবং রিপ্লেসমেন্ট পার্টস কেনার পূর্বে আমাদের মান নিয়ন্ত্রণ, পেমেন্ট ও ডেলিভারি নীতিমালা জেনে নিন।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="ds-liquid-subpanel p-4 sm:p-5 space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                ০১. কোয়ালিটি চেক ও অরিজিনালিটি
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300/90 leading-relaxed">
                প্রতিটি ফোন ও পার্টস অভিজ্ঞ টেকনিশিয়ান দ্বারা ডিসপ্লে টাচ, ক্যামেরা ফোকাস, নেটওয়ার্ক এবং ব্যাটারি ভোল্টেজ পরীক্ষা করে পাঠানো হয়। প্রোডাক্ট পেজে আসল ছবি ও কন্ডিশন উল্লেখ থাকে।
              </p>
            </div>

            <div className="ds-liquid-subpanel p-4 sm:p-5 space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                ০২. পেমেন্ট পদ্ধতি ও বর্ডার ক্রস বুকিং
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300/90 leading-relaxed">
                রেডি স্টক পণ্যে ক্যাশ অন ডেলিভারি (COD) সুবিধা রয়েছে। বর্ডার ক্রস বা স্পেশাল প্রি-অর্ডার ডিভাইসে পণ্যের ধরন অনুযায়ী নির্ধারিত বুকিং পেমেন্ট ও নিরাপদ গেটওয়ে সুবিধা প্রযোজ্য হয়।
              </p>
            </div>

            <div className="ds-liquid-subpanel p-4 sm:p-5 space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                ০৩. কুরিয়ার ডেলিভারি ও আনবক্সিং সুরক্ষা
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300/90 leading-relaxed">
                শক-প্রুফ বাবল ও হার্ড বক্সে সারা বাংলাদেশে কুরিয়ার করা হয়। পার্সেল খোলার শুরু থেকে শেষ পর্যন্ত একটি নিরবচ্ছিন্ন আনবক্সিং ভিডিও রাখলে যেকোনো ট্রানজিট ক্ষতিতে দ্রুত সমাধান নিশ্চিত করা হয়।
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ====================================================================
          MOBILE FILTER & SORT BOTTOM SHEET (< lg)
          ==================================================================== */}
      <AnimatePresence>
        {mobileFilterSheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileFilterSheetOpen(false)}
            className="lg:hidden fixed inset-0 z-50 ds-liquid-backdrop flex items-end justify-center p-3"
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md ds-liquid-panel p-5 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-900/[0.07] dark:border-white/[0.08]">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  সর্টিং ও ফিল্টার
                </h3>
                <button
                  type="button"
                  onClick={() => setMobileFilterSheetOpen(false)}
                  aria-label="Close filters"
                  className="w-8 h-8 rounded-full ds-liquid-icon-btn flex items-center justify-center text-slate-600 dark:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  পণ্য সাজানোর ক্রম
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSortBy(key)}
                      className={`px-3 py-2.5 text-xs font-semibold text-left transition-all whitespace-nowrap ${
                        sortBy === key
                          ? "ds-liquid-subpanel-active text-slate-900 dark:text-white"
                          : "ds-liquid-subpanel text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {SORT_LABELS[key]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-900/[0.07] dark:border-white/[0.08]">
                <label className="flex items-center justify-between py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                  <span>শুধু স্টকে থাকা পণ্য দেখান</span>
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 accent-sky-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                  <span>শুধু স্পেশাল অফার পণ্য দেখান</span>
                  <input
                    type="checkbox"
                    checked={offersOnly}
                    onChange={(e) => setOffersOnly(e.target.checked)}
                    className="w-4 h-4 accent-sky-600 rounded"
                  />
                </label>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="flex-1 ds-liquid-btn-secondary !min-h-[44px] !text-xs whitespace-nowrap"
                >
                  রিসেট করুন
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFilterSheetOpen(false)}
                  className="flex-1 ds-liquid-btn-primary !min-h-[44px] !text-xs whitespace-nowrap"
                >
                  ফলাফল দেখুন ({catalogMetrics.totalCount})
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Preview Modal */}
      <AnimatePresence>
        {quickViewImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 ds-liquid-backdrop z-[1000] flex items-center justify-center p-6"
            onClick={() => setQuickViewImg(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 14 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 10 }}
              transition={{
                type: "spring",
                stiffness: 380,
                damping: 28,
                mass: 0.85,
              }}
              className="relative w-full max-w-lg ds-liquid-glass-popup p-7 flex flex-col items-center gap-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full aspect-square ds-liquid-section p-6 flex items-center justify-center overflow-hidden">
                <img
                  src={quickViewImg}
                  className="max-w-full max-h-full object-contain rounded-xl"
                  alt="Quick preview"
                />
              </div>
              <button
                type="button"
                onClick={() => setQuickViewImg(null)}
                className="w-full ds-liquid-btn-secondary flex items-center justify-center"
              >
                Close Preview
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AllProducts;
