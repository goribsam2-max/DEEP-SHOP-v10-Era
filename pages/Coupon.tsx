import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNotify } from "../components/Notifications";
import { formatPrice } from "../lib/utils";
import { Ticket } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { APPLE_SPRING_SNAPPY } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

const Coupon: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();
  const shouldReduceMotion = useReducedMotion();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"Available" | "Used" | "Expired">("Available");

  useEffect(() => {
    const q = query(collection(db, "coupons"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCoupons(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (auth.currentUser) {
      const unsub = onSnapshot(doc(db, "users", auth.currentUser.uid), (docSnap) => {
        if (docSnap.exists()) setUserData(docSnap.data());
      });
      return () => unsub();
    }
  }, []);

  const handleClaim = async (couponId: string) => {
    if (!auth.currentUser) {
      triggerHaptic("error");
      notify("Please login to claim vouchers", "error");
      return;
    }
    triggerHaptic("medium");
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        claimedCoupons: arrayUnion(couponId),
      });
      triggerHaptic("success");
      notify("Voucher claimed successfully! You can use it at checkout", "success");
    } catch (err) {
      triggerHaptic("error");
      notify("Failed to claim voucher", "error");
    }
  };

  const filteredCoupons = coupons.filter((c) => {
    const isExpired = c.expiresAt && c.expiresAt < Date.now();
    const isClaimed = userData?.claimedCoupons?.includes(c.id);
    const isUsed = userData?.usedCoupons?.includes(c.id);

    if (activeTab === "Available") return !isExpired && !isUsed;
    if (activeTab === "Used") return isClaimed || isUsed;
    if (activeTab === "Expired") return isExpired;
    return false;
  });

  const tabs: Array<{ key: "Available" | "Used" | "Expired"; label: string }> = [
    { key: "Available", label: "Available" },
    { key: "Used", label: "Claimed" },
    { key: "Expired", label: "Expired" },
  ];

  return (
    <div className="ds-apple-shop-canvas min-h-screen pb-28">
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        <div className="flex items-center justify-between gap-3 px-1">
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-[-0.022em] text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
            Coupons
          </h1>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              navigate("/my-coupons");
            }}
            aria-label="My coupons"
            className="ds-apple-btn-secondary px-3.5 py-2 rounded-full text-[12.5px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-transform cursor-pointer"
          >
            <Ticket className="w-3.5 h-3.5 shrink-0" />
            <span>My Coupons</span>
          </button>
        </div>
        {/* Segmented Control */}
        <div className="ds-apple-segmented p-1 rounded-[14px] flex relative">
          {tabs.map((tab) => {
            const selected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  triggerHaptic("selection");
                  setActiveTab(tab.key);
                }}
                className={`relative z-10 flex-1 text-center py-2.5 rounded-[10px] text-[13px] font-semibold transition-colors ${
                  selected
                    ? "text-[#1D1D1F] dark:text-[#F5F5F7]"
                    : "text-[#6E6E73] dark:text-[#98989D]"
                }`}
              >
                {selected && (
                  <motion.span
                    layoutId="couponTabPill"
                    transition={shouldReduceMotion ? { duration: 0.15 } : APPLE_SPRING_SNAPPY}
                    className="absolute inset-0 bg-white dark:bg-[#1C1C1E] rounded-[10px] shadow-sm -z-10"
                  />
                )}
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-3.5">
          {filteredCoupons.map((c, i) => {
            const isExpired = c.expiresAt && c.expiresAt < Date.now();
            const isClaimed = userData?.claimedCoupons?.includes(c.id);
            const isUsed = userData?.usedCoupons?.includes(c.id);

            return (
              <div
                key={c.id || i}
                className={`relative ds-apple-surface rounded-[22px] overflow-hidden flex ${
                  isExpired || isUsed ? "opacity-60 grayscale" : ""
                }`}
              >
                {/* Left Discount */}
                <div className="w-[104px] md:w-[120px] bg-[#0071E3] dark:bg-[#0A84FF] text-white flex flex-col justify-center items-center p-4 shrink-0">
                  <span className="text-[22px] md:text-[26px] font-bold tabular-nums leading-tight">
                    {c.type === "percent" ? `${c.discount}%` : formatPrice(c.discount)}
                  </span>
                  <span className="text-[11px] font-semibold tracking-wider uppercase mt-0.5 opacity-90">
                    OFF
                  </span>
                </div>

                {/* Right Details */}
                <div className="p-4 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[16px] text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {c.code}
                      </h3>
                      {c.sellerId && (
                        <span className="px-2 py-0.5 bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] text-[11px] font-semibold rounded-full">
                          {c.sellerName || "Store"}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#6E6E73] dark:text-[#98989D] tabular-nums">
                      {c.minOrderAmount > 0
                        ? `For orders over ${formatPrice(c.minOrderAmount)}`
                        : "No minimum order amount"}
                      {c.expiresAt && (
                        <span
                          className={`block mt-0.5 ${
                            isExpired ? "text-[#FF3B30] dark:text-[#FF453A] font-semibold" : ""
                          }`}
                        >
                          {isExpired
                            ? "Expired"
                            : `Valid until ${new Date(c.expiresAt).toLocaleDateString()}`}
                        </span>
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => !isClaimed && !isExpired && !isUsed && handleClaim(c.id)}
                    disabled={isExpired || isClaimed || isUsed}
                    className={`whitespace-nowrap px-5 py-2 rounded-full text-[13px] font-semibold active:scale-95 transition-transform ${
                      isClaimed || isUsed || isExpired
                        ? "bg-[#E8E8ED] dark:bg-[#2C2C2E] text-[#8E8E93] cursor-not-allowed"
                        : "ds-apple-btn-primary"
                    }`}
                  >
                    {isUsed ? "Used" : isClaimed ? "Claimed" : isExpired ? "Expired" : "Claim"}
                  </button>
                </div>
              </div>
            );
          })}

          {filteredCoupons.length === 0 && (
            <div className="ds-apple-surface rounded-[24px] py-16 text-center">
              <p className="text-[14px] text-[#6E6E73] dark:text-[#98989D]">
                No coupons in this category right now.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Coupon;

