import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Product } from "../types";
import { ProductCard } from "../components/ui/ProductCard";
import { Zap, Clock } from "lucide-react";
import { ProductSkeleton } from "../components/Skeletons";
import { motion, useReducedMotion } from "framer-motion";
import { APPLE_SPRING_DEFAULT } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";
import { useSwipeNavigation } from "../lib/useSwipeNavigation";
import { readOfflineProducts, writeOfflineProducts } from "../lib/offlineStore";

export default function FlashSale() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>(() =>
    readOfflineProducts().filter((p) => p.isOffer)
  );
  const [loading, setLoading] = useState(
    () => readOfflineProducts().length === 0
  );
  const prefersReducedMotion = useReducedMotion();
  const { swipeHandlers } = useSwipeNavigation({
    onEdgeSwipeRight: () => {
      triggerHaptic("light");
      navigate(-1);
    },
  });

  useEffect(() => {
    const qProds = query(collection(db, "products"));
    const unsubscribeProds = onSnapshot(
      qProds,
      (snapshot) => {
        const prods = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Product,
        );
        setProducts(prods.filter((p) => p.isOffer));
        setLoading(false);
        writeOfflineProducts(prods);
      },
      (err) => {
        console.warn("Products fetch error:", err.message);
        setLoading(false);
      },
    );
    return () => unsubscribeProds();
  }, []);

  return (
    <div
      {...swipeHandlers}
      className="min-h-screen bg-[#F5F5F7] dark:bg-[#000000] text-[#1D1D1F] dark:text-[#F5F5F7] pb-24 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7 space-y-6 sm:space-y-8">
        {/* Studio Neutral Editorial Hero */}
        <motion.section
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0.15 } : APPLE_SPRING_DEFAULT}
          className="ds-apple-surface rounded-[28px] p-5 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="space-y-1.5 max-w-xl">
            <p className="ds-apple-eyebrow text-[11px] text-[#FF3B30] dark:text-[#FF453A] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Limited-Time Offers</span>
            </p>
            <h1 className="ds-apple-display text-2xl sm:text-3xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
              Flash Sale
            </h1>
            <p className="ds-apple-muted text-sm leading-relaxed">
              Exclusive markdowns on verified gadgets, accessories, and everyday essentials while supplies last.
            </p>
          </div>
          {!loading && products.length > 0 && (
            <div className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums whitespace-nowrap">
              <span>{products.length} Active Deals</span>
            </div>
          )}
        </motion.section>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {loading ? (
            Array(10)
              .fill(0)
              .map((_, i) => <ProductSkeleton key={i} />)
          ) : products.length > 0 ? (
            products.map((product, index) => (
              <div
                key={product.id}
                className="bg-white dark:bg-[#1C1C1E] rounded-[20px] border border-black/[0.05] dark:border-white/[0.08] overflow-hidden flex flex-col justify-between"
              >
                <ProductCard product={product} index={index} />
              </div>
            ))
          ) : (
            <div className="col-span-full py-16 px-6 text-center bg-white dark:bg-[#1C1C1E] rounded-[28px] border border-black/[0.06] dark:border-white/[0.1] shadow-sm flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] flex items-center justify-center mb-3 text-[#6E6E73] dark:text-[#8E8E93]">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                No flash sales available right now.
              </p>
              <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93] mt-1">
                Check back later for upcoming offers.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
