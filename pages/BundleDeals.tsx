import { formatPrice } from "@/lib/utils";
import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, limit } from "firebase/firestore";
import { db } from "../firebase";
import { Product } from "../types";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Zap, Gift, RefreshCw } from "lucide-react";
import { getProductDisplayImage } from "../src/lib/phonePartsArt";
import { motion, useReducedMotion } from "framer-motion";
import { APPLE_SPRING_DEFAULT, APPLE_SPRING_SNAPPY } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

export default function BundleDeals() {
  const [products, setProducts] = useState<Product[]>([]);
  const [currentBundle, setCurrentBundle] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const q = query(collection(db, "products"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allProds = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Product);
      setProducts(allProds);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const generateNewBundle = (withHaptic = false) => {
    if (products.length < 3) return;
    if (withHaptic) triggerHaptic("selection");

    // Pick 3 random products
    const shuffled = [...products].sort(() => 0.5 - Math.random());
    setCurrentBundle(shuffled.slice(0, 3));
  };

  useEffect(() => {
    if (products.length > 0 && currentBundle.length === 0) {
      generateNewBundle(false);
    }
  }, [products]);

  const addToCartAndCheckout = () => {
    triggerHaptic("medium");
    const cart = JSON.parse(localStorage.getItem("f_cart") || "[]");

    currentBundle.forEach((item) => {
      const existingIndex = cart.findIndex((c: any) => c.id === item.id);
      const finalPrice = item.isOffer && item.offerPrice ? item.offerPrice : item.price * 0.9; // 10% bundle discount

      if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
      } else {
        cart.push({
          ...item,
          price: Math.floor(finalPrice),
          originalPrice: Number(item.price),
          quantity: 1,
        });
      }
    });

    localStorage.setItem("f_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("update_cart"));
    navigate("/checkout");
  };

  const totalPrice = currentBundle.reduce((acc, p) => acc + p.price, 0);
  const discountPrice = Math.floor(
    currentBundle.reduce(
      (acc, p) => (p.isOffer && p.offerPrice ? acc + p.offerPrice : acc + p.price * 0.9),
      0
    )
  );
  const savings = totalPrice - discountPrice;

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#000000] text-[#1D1D1F] dark:text-[#F5F5F7] pb-24 transition-colors">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0.15 } : APPLE_SPRING_DEFAULT}
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.1] p-5 sm:p-7 rounded-[26px] shadow-xs"
        >
          <div className="space-y-1 min-w-0">
            <h1 className="ds-apple-display text-[clamp(1.3rem,3vw,1.85rem)] font-bold tracking-[-0.02em] leading-tight flex items-center gap-2">
              <span className="truncate">Dynamic Bundles</span>
              <Zap className="w-5 h-5 text-[#FF9500] dark:text-[#FF9F0A] fill-current shrink-0" />
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6E73] dark:text-[#8E8E93]">
              Buy curated three-item sets together and save automatically.
            </p>
          </div>

          <button
            type="button"
            onPointerDown={() => triggerHaptic("light")}
            onClick={() => generateNewBundle(true)}
            className="ds-apple-btn-secondary flex items-center gap-2 font-semibold text-xs sm:text-sm px-5 min-h-[40px] rounded-full active:scale-[0.97] transition-transform whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            <span>Next Bundle</span>
          </button>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="w-7 h-7 animate-spin text-[#6E6E73] dark:text-[#8E8E93]" />
          </div>
        ) : currentBundle.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
            <motion.div
              key={currentBundle.map((b) => b.id).join("-")}
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={prefersReducedMotion ? { duration: 0.15 } : APPLE_SPRING_SNAPPY}
              className="bg-white dark:bg-[#1C1C1E] rounded-[28px] p-6 lg:p-8 border border-black/[0.06] dark:border-white/[0.1] shadow-sm flex flex-col gap-5 relative"
            >
              <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
                <span className="text-xs font-semibold uppercase tracking-[0.04em] text-[#6E6E73] dark:text-[#8E8E93]">
                  Bundle Items ({currentBundle.length})
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#248A3D]/10 dark:bg-[#30D158]/15 text-[#248A3D] dark:text-[#30D158] text-xs font-bold tabular-nums">
                  Save {formatPrice(savings)}
                </span>
              </div>

              {currentBundle.map((product, idx) => (
                <React.Fragment key={product.id}>
                  <div
                    onClick={() => {
                      triggerHaptic("light");
                      navigate(`/product/${product.id}`);
                    }}
                    className="flex gap-4 sm:gap-5 items-center cursor-pointer group"
                  >
                    <div className="w-20 h-20 sm:w-28 sm:h-28 bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-[20px] p-2.5 overflow-hidden border border-black/[0.05] dark:border-white/[0.08] shrink-0">
                      <img
                        src={getProductDisplayImage(product)}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                        alt={product.name}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base text-[#1D1D1F] dark:text-[#F5F5F7] leading-snug mb-1.5 line-clamp-2 group-hover:text-[#0071E3] dark:group-hover:text-[#0A84FF] transition-colors">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2.5 tabular-nums">
                        <span className="text-lg sm:text-xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                          {formatPrice(
                            Math.floor(
                              product.isOffer && product.offerPrice
                                ? product.offerPrice
                                : product.price * 0.9
                            )
                          )}
                        </span>
                        <span className="text-xs font-medium text-[#6E6E73] dark:text-[#8E8E93] line-through">
                          {formatPrice(product.price)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {idx < currentBundle.length - 1 && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-black/[0.06] dark:bg-white/[0.08]" />
                      <span className="w-7 h-7 rounded-full bg-[#F5F5F7] dark:bg-[#2C2C2E] flex items-center justify-center text-xs font-bold text-[#6E6E73] dark:text-[#8E8E93]">
                        +
                      </span>
                      <div className="flex-1 h-px bg-black/[0.06] dark:bg-white/[0.08]" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </motion.div>

            <div className="bg-white dark:bg-[#1C1C1E] rounded-[28px] p-6 sm:p-8 lg:sticky lg:top-20 border border-black/[0.06] dark:border-white/[0.1] shadow-sm space-y-6">
              <h2 className="text-xl font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-2">
                <Gift className="w-5 h-5 text-[#0071E3] dark:text-[#0A84FF]" />
                <span>Bundle Order Summary</span>
              </h2>

              <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E]/70 p-5 rounded-[20px] space-y-3 tabular-nums">
                <div className="flex justify-between text-sm text-[#6E6E73] dark:text-[#8E8E93]">
                  <span>Total MSRP</span>
                  <span className="line-through">{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-sm text-[#248A3D] dark:text-[#30D158] font-semibold">
                  <span>Bundle Savings</span>
                  <span>-{formatPrice(savings)}</span>
                </div>
                <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex justify-between items-baseline">
                  <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Bundle Price
                  </span>
                  <span className="text-2xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {formatPrice(discountPrice)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={addToCartAndCheckout}
                className="w-full bg-[#0071E3] dark:bg-[#0A84FF] hover:opacity-95 active:scale-[0.98] transition-all text-white rounded-full py-3.5 px-6 font-semibold text-base flex justify-center items-center gap-2"
              >
                <span>Buy Bundle Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-center text-xs text-[#6E6E73] dark:text-[#8E8E93]">
                Items will be added to your bag with the bundle discount applied.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 font-semibold text-[#6E6E73] dark:text-[#8E8E93]">
            Not enough products to create bundles right now.
          </div>
        )}
      </div>
    </div>
  );
}
