import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
} from "firebase/firestore";
import { motion, useReducedMotion } from "framer-motion";
import { db } from "../firebase";
import { Product } from "../types";
import { Search as SearchIcon, X } from "lucide-react";
import { ProductCard } from "../components/ui/ProductCard";
import Icon from "../components/Icon";
import { useIllustrations } from "../lib/useIllustrations";
import { getProductDisplayImage } from "../src/lib/phonePartsArt";
import { triggerHaptic } from "../lib/haptics";
import { APPLE_SPRING_SNAPPY } from "../lib/shoppingRoute";
import { useSwipeNavigation } from "../lib/useSwipeNavigation";
import { readOfflineProducts, writeOfflineProducts } from "../lib/offlineStore";

const Search: React.FC = () => {
  const navigate = useNavigate();
  const illustrations = useIllustrations();
  const shouldReduceMotion = useReducedMotion();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [recent, setRecent] = useState<string[]>(
    JSON.parse(localStorage.getItem("vibe_recent_searches") || '["Mobiles", "Border Cross", "Original Phones", "Chargers", "Type-C"]'),
  );
  const [allProducts, setAllProducts] = useState<Product[]>(() =>
    readOfflineProducts()
  );
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>(() =>
    readOfflineProducts().slice(0, 4)
  );

  useEffect(() => {
    const q = collection(db, "products");
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const prods = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Product);
        setAllProducts(prods);
        setFavoriteProducts(prods.slice(0, 4));
        writeOfflineProducts(prods);
      },
      () => {}
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setResults([]);
      return;
    }
    const filtered = allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setResults(filtered);
  }, [searchTerm, allProducts]);

  const saveSearch = (term: string) => {
    if (!term.trim()) return;
    const updated = [term, ...recent.filter((r) => r !== term)].slice(0, 6);
    setRecent(updated);
    localStorage.setItem("vibe_recent_searches", JSON.stringify(updated));
  };

  const favoriteCategories = [
    { name: "Border Cross", color: "bg-[#0071E3]/10 text-[#0071E3] dark:bg-[#0A84FF]/15 dark:text-[#0A84FF]", icon: "plane" },
    { name: "Mobiles", color: "bg-[#FF3B30]/10 text-[#FF3B30] dark:text-[#FF453A]", icon: "mobile" },
    { name: "Original Phones", color: "bg-[#248A3D]/10 text-[#248A3D] dark:bg-[#30D158]/15 dark:text-[#30D158]", icon: "check-circle" },
    { name: "Chargers", color: "bg-[#FF9500]/10 text-[#FF9500] dark:text-[#FF9F0A]", icon: "bolt" },
    { name: "Accessories", color: "bg-black/[0.06] text-[#1D1D1F] dark:bg-white/[0.1] dark:text-[#F5F5F7]", icon: "link" },
  ];

  const swipeScopes = [
    "",
    ...favoriteCategories.map((c) => c.name),
  ];

  const { swipeHandlers } = useSwipeNavigation({
    onEdgeSwipeRight: () => {
      triggerHaptic("light");
      navigate(-1);
    },
    onSwipeLeft: () => {
      const curIdx = swipeScopes.findIndex(
        (s) => s.toLowerCase() === searchTerm.trim().toLowerCase()
      );
      const nextIdx = curIdx >= 0 ? Math.min(swipeScopes.length - 1, curIdx + 1) : 1;
      if (nextIdx !== curIdx && swipeScopes[nextIdx] !== undefined) {
        triggerHaptic("selection");
        setSearchTerm(swipeScopes[nextIdx]);
      }
    },
    onSwipeRight: () => {
      const curIdx = swipeScopes.findIndex(
        (s) => s.toLowerCase() === searchTerm.trim().toLowerCase()
      );
      if (curIdx > 0) {
        triggerHaptic("selection");
        setSearchTerm(swipeScopes[curIdx - 1]);
      } else if (searchTerm.trim() !== "") {
        triggerHaptic("selection");
        setSearchTerm("");
      }
    },
  });

  return (
    <div
      {...swipeHandlers}
      className="pt-6 pb-[120px] px-4 sm:px-6 min-h-screen bg-[#F5F5F7] dark:bg-black mx-auto font-sans"
    >
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-7">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B] pointer-events-none" />
            <input
              type="text"
              placeholder="Search border cross, mobiles & gear..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  triggerHaptic("light");
                  saveSearch(searchTerm);
                }
              }}
              className="ds-apple-input w-full bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] rounded-full py-3.5 pl-11 pr-10 border border-black/[0.08] dark:border-white/[0.12] focus:outline-none focus:border-[#0071E3] dark:focus:border-[#0A84FF] text-[15px] font-medium shadow-xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setSearchTerm("");
                }}
                aria-label="Clear search"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/[0.08] dark:bg-white/[0.12] text-[#6E6E73] dark:text-[#98989D] flex items-center justify-center cursor-pointer active:scale-95"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {searchTerm.trim() === "" ? (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0.16 } : APPLE_SPRING_SNAPPY}
          >
            {/* Recent Searches */}
            {recent.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg sm:text-xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-3.5 tracking-tight">
                  Recent Searches
                </h2>
                <div className="flex flex-wrap gap-2">
                  {recent.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        triggerHaptic("selection");
                        setSearchTerm(item);
                        saveSearch(item);
                      }}
                      className="px-4 py-2 bg-white dark:bg-[#1C1C1E] rounded-full text-[13.5px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.06] dark:border-white/[0.1] hover:border-[#0071E3]/40 dark:hover:border-[#0A84FF]/40 active:scale-[0.97] transition-all cursor-pointer"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Favorite Categories */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                  Favorite Categories
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    navigate("/all-products");
                  }}
                  className="text-xs sm:text-sm font-semibold text-[#0071E3] dark:text-[#0A84FF] hover:underline cursor-pointer"
                >
                  See all
                </button>
              </div>
              <div className="flex overflow-x-auto pb-2 gap-4 -mx-4 px-4 no-scrollbar">
                {favoriteCategories.map((cat, i) => (
                  <button
                    key={i}
                    type="button"
                    className="flex flex-col items-center gap-2 cursor-pointer group shrink-0 active:scale-95 transition-transform"
                    onClick={() => {
                      triggerHaptic("selection");
                      setSearchTerm(cat.name);
                      saveSearch(cat.name);
                    }}
                  >
                    <div className={`w-16 h-16 rounded-full flex justify-center items-center ${cat.color} border border-black/[0.06] dark:border-white/[0.1] shadow-xs transition-transform group-hover:scale-105`}>
                      <Icon name={cat.icon} className="text-2xl" />
                    </div>
                    <span className="text-[12.5px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {cat.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Favorite Products */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                  Favorite Products
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    navigate("/all-products");
                  }}
                  className="text-xs sm:text-sm font-semibold text-[#0071E3] dark:text-[#0A84FF] hover:underline cursor-pointer"
                >
                  See all
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {favoriteProducts.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => {
                      triggerHaptic("light");
                      navigate(`/product/${prod.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/${prod.id}`);
                    }}
                    className="bg-white dark:bg-[#1C1C1E] rounded-[22px] p-4 flex flex-col justify-start cursor-pointer hover:border-black/[0.14] dark:hover:border-white/[0.18] active:scale-[0.98] transition-all border border-black/[0.06] dark:border-white/[0.1] shadow-xs"
                  >
                    <div className="w-14 h-14 rounded-2xl overflow-hidden mb-3 bg-[#F5F5F7] dark:bg-[#2C2C2E] flex items-center justify-center border border-black/[0.05] dark:border-white/[0.08]">
                      <img src={getProductDisplayImage(prod)} alt={prod.name} className="w-10 h-10 object-contain mix-blend-multiply dark:mix-blend-normal" />
                    </div>
                    <h3 className="font-bold text-[#1D1D1F] dark:text-[#F5F5F7] text-[15px] leading-tight line-clamp-1 mb-1 tracking-tight">
                      {prod.name}
                    </h3>
                    <span className="text-[12.5px] text-[#6E6E73] dark:text-[#98989D] capitalize">
                      {prod.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#6E6E73] dark:text-[#98989D] tracking-wider uppercase tabular-nums">
              Search Results ({results.length})
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 pb-2">
              {results.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
            {results.length === 0 && (
              <div className="ds-apple-surface py-14 px-6 text-center flex flex-col items-center justify-center rounded-[24px]">
                {illustrations.emptySearch ? (
                  <div className="w-40 h-40 mx-auto mb-4 rounded-[20px] overflow-hidden">
                    <img src={illustrations.emptySearch} alt="No results" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center text-[#6E6E73] dark:text-[#98989D] mb-3.5">
                    <SearchIcon className="w-5 h-5" />
                  </div>
                )}
                <p className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  No products matched “{searchTerm}”
                </p>
                <p className="text-[13px] ds-apple-muted mt-1 mb-5">
                  Try a different keyword or browse the full catalog.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onPointerDown={() => triggerHaptic("light")}
                    onClick={() => setSearchTerm("")}
                    className="ds-apple-btn-secondary h-10 px-4 rounded-full text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    Clear Search
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => triggerHaptic("light")}
                    onClick={() => navigate("/all-products")}
                    className="ds-apple-btn-primary h-10 px-4 rounded-full text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    Browse Products
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
