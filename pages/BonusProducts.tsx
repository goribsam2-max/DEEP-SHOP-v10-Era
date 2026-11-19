import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, limit } from "firebase/firestore";
import { db } from "../firebase";
import { Product } from "../types";
import { ProductCard } from "../components/ui/ProductCard";
import { ProductSkeleton } from "../components/Skeletons";
import { getProductCoinReward } from "../lib/coinRewards";
import { CircleDollarSign } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { APPLE_SPRING_DEFAULT } from "../lib/shoppingRoute";

const BonusProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const q = query(collection(db, "products"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allProds = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Product);
      const rewardProds = allProds.filter((p) => {
        const coinReward =
          p.coinReward !== undefined &&
          p.coinReward !== null &&
          String(p.coinReward).trim() !== ""
            ? Number(p.coinReward)
            : getProductCoinReward(p.id);
        return coinReward > 0;
      });
      setProducts(rewardProds);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#000000] text-[#1D1D1F] dark:text-[#F5F5F7] pb-24 transition-colors">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0.15 } : APPLE_SPRING_DEFAULT}
          className="flex items-center justify-between gap-4 mb-8 bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.1] p-5 sm:p-7 rounded-[26px] shadow-xs"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#FF9500]/12 dark:bg-[#FF9F0A]/15 text-[#FF9500] dark:text-[#FF9F0A] flex items-center justify-center shrink-0">
              <CircleDollarSign className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="ds-apple-display text-[clamp(1.25rem,3vw,1.65rem)] font-bold tracking-tight leading-tight">
                DP Coin Rewards
              </h1>
              <p className="text-xs sm:text-sm text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                Purchase these eligible items today to earn bonus reward coins.
              </p>
            </div>
          </div>
          {!loading && (
            <span className="px-3 py-1 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-semibold text-[#6E6E73] dark:text-[#98989D] tabular-nums shrink-0 whitespace-nowrap">
              {products.length} items
            </span>
          )}
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6">
          {loading ? (
            Array(10)
              .fill(0)
              .map((_, i) => <ProductSkeleton key={i} />)
          ) : products.length > 0 ? (
            products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))
          ) : (
            <div className="col-span-full py-20 text-center text-[#6E6E73] dark:text-[#8E8E93] bg-white dark:bg-[#1C1C1E] rounded-[28px] border border-black/[0.06] dark:border-white/[0.1]">
              <p className="font-semibold">
                No bonus reward products available today. Check back tomorrow.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BonusProducts;
