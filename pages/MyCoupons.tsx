import React, { useState, useEffect } from "react";
import { formatPrice } from "../lib/utils";
import { collection, query, documentId, where, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { Ticket } from "lucide-react";
import { useIllustrations } from "../lib/useIllustrations";
import { triggerHaptic } from "../lib/haptics";

export default function MyCoupons() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const navigate = useNavigate();
  const illustrations = useIllustrations();

  useEffect(() => {
    const fetchMyCoupons = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      const userRef = await import("firebase/firestore").then((m) =>
        m.getDoc(m.doc(db, "users", auth.currentUser!.uid)),
      );
      if (userRef.exists()) {
        const claimedIds = userRef.data().claimedCoupons || [];
        setUserData(userRef.data());
        if (claimedIds.length > 0) {
          const chunked = claimedIds.slice(0, 10);
          const q = query(collection(db, "coupons"), where(documentId(), "in", chunked));
          const snap = await getDocs(q);
          setCoupons(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
      }
      setLoading(false);
    };

    fetchMyCoupons();
  }, []);

  return (
    <div className="ds-apple-shop-canvas min-h-screen pb-28">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="mb-4 px-1">
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-[-0.022em] text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
            My Coupons
          </h1>
          <p className="text-[13.5px] text-[#6E6E73] dark:text-[#98989D] mt-1">
            Your claimed vouchers ready to apply at checkout.
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-[14px] text-[#6E6E73] dark:text-[#98989D]">
            Loading your coupons...
          </div>
        ) : coupons.length > 0 ? (
          <div className="space-y-3.5">
            {coupons.map((c, i) => {
              const isExpired = c.expiresAt && c.expiresAt < Date.now();
              const isUsed = userData?.usedCoupons?.includes(c.id);

              return (
                <div
                  key={c.id || i}
                  className={`relative ds-apple-surface rounded-[22px] overflow-hidden flex ${
                    isExpired || isUsed ? "opacity-60 grayscale" : ""
                  }`}
                >
                  {isUsed && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 dark:bg-black/40 backdrop-blur-[2px]">
                      <div className="border-2 border-[#6E6E73] text-[#6E6E73] font-bold text-[18px] tracking-widest uppercase px-4 py-1 rounded-[10px] -rotate-12 select-none">
                        Used
                      </div>
                    </div>
                  )}

                  {/* Left Discount Strip */}
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
                      <h3 className="font-semibold text-[16px] text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {c.code}
                      </h3>
                      <p className="text-[12px] text-[#6E6E73] dark:text-[#98989D] mt-0.5 tabular-nums">
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

                    <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between gap-2">
                      <span
                        className={`text-[12px] font-semibold ${
                          isUsed
                            ? "text-[#6E6E73] dark:text-[#98989D]"
                            : isExpired
                            ? "text-[#FF3B30] dark:text-[#FF453A]"
                            : "text-[#34C759] dark:text-[#30D158]"
                        }`}
                      >
                        {isUsed ? "Already used" : isExpired ? "Expired" : "Available"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (isUsed || isExpired) return;
                          triggerHaptic("light");
                          navigate("/cart");
                        }}
                        disabled={isUsed || isExpired}
                        className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[13px] font-semibold transition-transform active:scale-95 ${
                          isUsed || isExpired
                            ? "bg-[#E8E8ED] dark:bg-[#2C2C2E] text-[#8E8E93] cursor-not-allowed"
                            : "ds-apple-btn-primary"
                        }`}
                      >
                        Shop Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="ds-apple-surface py-16 px-6 text-center rounded-[26px] flex flex-col items-center">
            {illustrations.emptyCoupons ? (
              <div className="w-40 h-40 mx-auto mb-4 rounded-[20px] overflow-hidden">
                <img
                  src={illustrations.emptyCoupons}
                  alt="No Coupons"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-14 h-14 bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-full flex items-center justify-center mb-4">
                <Ticket className="w-7 h-7 text-[#6E6E73] dark:text-[#98989D]" />
              </div>
            )}
            <h3 className="text-[19px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1.5">
              No coupons claimed
            </h3>
            <p className="text-[14px] text-[#6E6E73] dark:text-[#98989D] mb-6">
              You haven&apos;t claimed any vouchers yet.
            </p>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                navigate("/coupons");
              }}
              className="ds-apple-btn-primary whitespace-nowrap px-6 py-2.5 text-[14px] font-semibold rounded-full active:scale-95 transition-transform"
            >
              Browse Coupons
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

