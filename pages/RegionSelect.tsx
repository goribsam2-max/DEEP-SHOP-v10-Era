import React from "react";
import { useNavigate } from "react-router-dom";
import { Check, Globe } from "lucide-react";
import { useRegion } from "../components/RegionContext";
import { auth, db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { getRegionFlagSvg } from "../components/RegionFlags";
import { triggerHaptic } from "../lib/haptics";

const regions = [
  { id: "BD", name: "Bangladesh", currency: "BDT (৳)" },
  { id: "IN", name: "India", currency: "INR (₹)" },
  { id: "PK", name: "Pakistan", currency: "PKR (Rs)" },
];

export default function RegionSelect() {
  const navigate = useNavigate();
  const { region, setRegion } = useRegion();

  const handleSelect = (rId: "BD" | "IN" | "PK") => {
    triggerHaptic("selection");
    setRegion(rId);

    if (auth.currentUser) {
      updateDoc(doc(db, "users", auth.currentUser.uid), {
        region: rId,
      }).catch((err) => {
        console.error("Failed to update user region in DB:", err);
      });
    }

    navigate("/");
  };

  return (
    <div className="ds-apple-shop-canvas min-h-screen pb-28">
      <div className="max-w-md mx-auto px-4 pt-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-[16px] bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center">
            <Globe className="w-6 h-6" />
          </div>
          <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.022em] text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
            Choose Your Country
          </h1>
          <p className="text-[14px] text-[#6E6E73] dark:text-[#98989D]">
            Select your region to adjust currency and shipping policies.
          </p>
        </div>

        <div className="ds-apple-surface rounded-[22px] overflow-hidden divide-y divide-black/[0.06] dark:divide-white/[0.06]">
          {regions.map((r) => {
            const active = region === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleSelect(r.id as "BD" | "IN" | "PK")}
                className={`w-full p-4 sm:p-5 flex items-center justify-between text-left transition-colors active:bg-black/[0.03] dark:active:bg-white/[0.04] ${
                  active ? "bg-[#0071E3]/[0.04] dark:bg-[#0A84FF]/[0.08]" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-6 overflow-hidden rounded-[4px] flex items-center justify-center shrink-0">
                    {getRegionFlagSvg(r.id)}
                  </div>
                  <div>
                    <div className="font-semibold text-[16px] text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {r.name}
                    </div>
                    <div className="text-[12px] text-[#6E6E73] dark:text-[#98989D] tabular-nums">
                      Currency: {r.currency}
                    </div>
                  </div>
                </div>
                {active && (
                  <div className="w-6 h-6 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

