import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useNotify } from "../components/Notifications";
import { Plus, Check, ShoppingBag, X } from "lucide-react";
import { getProductDisplayImage } from "../src/lib/phonePartsArt";
import { APPLE_SPRING_DEFAULT, APPLE_SPRING_SNAPPY } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

const BundleBuilder = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const notify = useNotify();
  const prefersReducedMotion = useReducedMotion();

  const [selectedBase, setSelectedBase] = useState<any>(null);
  const [selectedAccessories, setSelectedAccessories] = useState<any[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const productsData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setProducts(productsData);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const baseProducts = products.filter(
    (p) =>
      !p.category?.toLowerCase().includes("strap") &&
      !p.category?.toLowerCase().includes("charger") &&
      !p.category?.toLowerCase().includes("case")
  );
  const accessories = products.filter(
    (p) =>
      p.category?.toLowerCase().includes("strap") ||
      p.category?.toLowerCase().includes("charger") ||
      p.category?.toLowerCase().includes("case") ||
      p.price < 2000
  );

  const toggleAccessory = (acc: any) => {
    if (selectedAccessories.find((a) => a.id === acc.id)) {
      triggerHaptic("light");
      setSelectedAccessories(selectedAccessories.filter((a) => a.id !== acc.id));
    } else {
      if (selectedAccessories.length >= 3) {
        triggerHaptic("warning");
        notify("Maximum 3 accessories allowed in a bundle!", "error");
        return;
      }
      triggerHaptic("selection");
      setSelectedAccessories([...selectedAccessories, acc]);
    }
  };

  const totalPrice =
    (selectedBase ? selectedBase.price : 0) +
    selectedAccessories.reduce((sum, a) => sum + a.price, 0);
  const discount = selectedAccessories.length > 0 ? selectedAccessories.length * 2 : 0; // 2% per accessory
  const discountedPrice = totalPrice - totalPrice * (discount / 100);

  const handleAddToCart = () => {
    if (!selectedBase) return;
    triggerHaptic("success");

    let cart = [];
    try {
      cart = JSON.parse(localStorage.getItem("f_cart") || "[]");
    } catch (e) {}

    // Add base
    const baseItem = { ...selectedBase, quantity: 1 };
    cart.push(baseItem);

    // Add accessories
    selectedAccessories.forEach((acc) => {
      cart.push({ ...acc, quantity: 1, price: acc.price * (1 - discount / 100) });
    });

    localStorage.setItem("f_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("update_cart"));
    notify("Bundle added to cart!", "success");
    navigate("/cart");
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#000000] pb-24 text-[#1D1D1F] dark:text-[#F5F5F7] transition-colors">
      <div className="max-w-5xl mx-auto px-4 pt-6 md:pt-8">
        <h1 className="ds-apple-display text-[clamp(1.35rem,3vw,1.8rem)] font-bold tracking-[-0.02em] leading-tight mb-1.5">
          Build Custom Tech Box
        </h1>
        <p className="text-xs sm:text-sm text-[#6E6E73] dark:text-[#8E8E93] mb-6">
          Select a base device and up to three accessories to craft your custom bundle.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Selection UI */}
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-bold tracking-tight mb-3.5">1. Choose Base Device</h2>
            {loading ? (
              <div className="grid grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-44 rounded-[22px] ds-skeleton" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {baseProducts.slice(0, 4).map((p) => {
                  const active = selectedBase?.id === p.id;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => {
                        triggerHaptic("selection");
                        setSelectedBase(p);
                      }}
                      className={`p-4 rounded-[22px] border text-left transition-all active:scale-[0.98] cursor-pointer ${
                        active
                          ? "border-[#0071E3] dark:border-[#0A84FF] bg-[#0071E3]/[0.06] dark:bg-[#0A84FF]/[0.12] ring-1 ring-[#0071E3] dark:ring-[#0A84FF]"
                          : "border-black/[0.06] dark:border-white/[0.1] bg-white dark:bg-[#1C1C1E] hover:border-black/15 dark:hover:border-white/20"
                      }`}
                    >
                      <img
                        src={getProductDisplayImage({ ...p, name: p.name || p.title })}
                        className="w-full aspect-square object-contain mb-3"
                        alt={p.name || p.title}
                      />
                      <p className="font-semibold text-sm truncate">{p.name || p.title}</p>
                      <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] font-semibold tabular-nums mt-1">
                        ৳{p.price}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <AnimatePresence>
            {selectedBase && (
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                transition={prefersReducedMotion ? { duration: 0.15 } : APPLE_SPRING_DEFAULT}
              >
                <h2 className="text-lg font-bold tracking-tight mb-3.5">
                  2. Add Accessories (Up to 3)
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {accessories.slice(0, 9).map((p) => {
                    const isSelected = selectedAccessories.find((a) => a.id === p.id);
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => toggleAccessory(p)}
                        className={`p-3 rounded-[20px] border text-left transition-all active:scale-[0.97] cursor-pointer relative ${
                          isSelected
                            ? "border-[#0071E3] dark:border-[#0A84FF] bg-[#0071E3]/[0.06] dark:bg-[#0A84FF]/[0.12] ring-1 ring-[#0071E3] dark:ring-[#0A84FF]"
                            : "border-black/[0.06] dark:border-white/[0.1] bg-white dark:bg-[#1C1C1E] hover:border-black/15 dark:hover:border-white/20"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-[#0071E3] dark:bg-[#0A84FF] rounded-full flex items-center justify-center text-white">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                        <img
                          src={getProductDisplayImage({ ...p, name: p.name || p.title })}
                          className="w-full aspect-square object-contain mb-2"
                          alt={p.name || p.title}
                        />
                        <p className="font-semibold text-[11px] truncate">{p.name || p.title}</p>
                        <p className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] font-medium tabular-nums mt-0.5">
                          ৳{p.price}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Box Visualization */}
        <div className="lg:sticky lg:top-20 h-fit">
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[28px] p-6 lg:p-8 border border-black/[0.06] dark:border-white/[0.1] shadow-sm">
            <h3 className="text-center font-semibold tracking-[0.04em] uppercase text-[#6E6E73] dark:text-[#8E8E93] mb-5 text-xs">
              Your Tech Box
            </h3>

            <div className="grid grid-cols-2 gap-3.5 mb-6">
              {/* Main Device Slot */}
              <div className="col-span-2 aspect-[2/1] bg-[#F5F5F7] dark:bg-[#2C2C2E]/70 rounded-[22px] border border-black/[0.05] dark:border-white/[0.08] flex items-center justify-center p-6 relative overflow-hidden">
                {selectedBase ? (
                  <motion.div
                    initial={prefersReducedMotion ? false : { scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={prefersReducedMotion ? { duration: 0.12 } : APPLE_SPRING_SNAPPY}
                    className="flex flex-col items-center"
                  >
                    <img
                      src={getProductDisplayImage({
                        ...selectedBase,
                        name: selectedBase.name || selectedBase.title,
                      })}
                      className="h-32 object-contain"
                      alt=""
                    />
                  </motion.div>
                ) : (
                  <div className="text-[#8E8E93] flex flex-col items-center">
                    <Plus className="w-7 h-7 mb-1.5" />
                    <span className="text-xs font-semibold uppercase tracking-[0.04em]">
                      Base Device
                    </span>
                  </div>
                )}
              </div>

              {/* Accessory Slots */}
              {[0, 1, 2].map((index) => {
                const acc = selectedAccessories[index];
                return (
                  <div
                    key={index}
                    className={`${
                      index === 2 ? "col-span-2" : "col-span-1"
                    } aspect-square bg-[#F5F5F7] dark:bg-[#2C2C2E]/70 rounded-[22px] border border-black/[0.05] dark:border-white/[0.08] flex items-center justify-center p-4 relative`}
                  >
                    {acc ? (
                      <motion.div
                        initial={prefersReducedMotion ? false : { scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={prefersReducedMotion ? { duration: 0.12 } : APPLE_SPRING_SNAPPY}
                        className="flex flex-col items-center relative w-full h-full justify-center"
                      >
                        <button
                          type="button"
                          onClick={() => toggleAccessory(acc)}
                          aria-label="Remove accessory"
                          className="absolute top-0 right-0 p-1.5 text-[#6E6E73] hover:text-[#FF3B30] dark:hover:text-[#FF453A] bg-white dark:bg-[#1C1C1E] rounded-full shadow-sm active:scale-90 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <img
                          src={getProductDisplayImage({ ...acc, name: acc.name || acc.title })}
                          className="h-20 object-contain"
                          alt=""
                        />
                      </motion.div>
                    ) : (
                      <div className="text-[#8E8E93] flex flex-col items-center">
                        <Plus className="w-5 h-5 mb-1.5" />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-center">
                          Acc {index + 1}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E]/70 p-5 rounded-[22px] border border-black/[0.05] dark:border-white/[0.08]">
              <div className="flex justify-between items-center mb-2 text-sm text-[#6E6E73] dark:text-[#8E8E93] tabular-nums">
                <span>Subtotal</span>
                <span>৳{totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center mb-4 text-sm text-[#248A3D] dark:text-[#30D158] font-semibold tabular-nums">
                <span>Bundle Discount</span>
                <span>-{discount}%</span>
              </div>
              <div className="flex justify-between items-baseline mb-5 pt-2 border-t border-black/[0.06] dark:border-white/[0.08] tabular-nums">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-bold tracking-tight">
                  ৳{Math.round(discountedPrice).toLocaleString()}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!selectedBase}
                className="w-full py-3.5 bg-[#0071E3] dark:bg-[#0A84FF] text-white rounded-full font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add Box to Bag</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BundleBuilder;
