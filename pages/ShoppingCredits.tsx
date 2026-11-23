import React from "react";
import { Sparkles, ShoppingBag, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { triggerHaptic } from "../lib/haptics";

const ShoppingCredits: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="ds-apple-shop-canvas min-h-screen pb-28">
      <div className="max-w-3xl mx-auto px-4 pt-10 flex flex-col items-center">
        <div className="text-center max-w-xl mb-10">
          <div className="mx-auto w-16 h-16 bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] rounded-[20px] flex items-center justify-center mb-5">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-[26px] sm:text-[34px] md:text-[38px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-[-0.028em] leading-[1.12] mb-3">
            Shopping Credits
            <br />
            Coming Soon
          </h1>
          <p className="text-[14px] sm:text-[15px] text-[#6E6E73] dark:text-[#98989D] leading-relaxed">
            We are crafting an intuitive way to earn and spend credits across orders, referrals, and exclusive member rewards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <div className="ds-apple-surface p-6 rounded-[24px] flex flex-col items-start">
            <div className="w-11 h-11 bg-[#FF9500]/12 text-[#FF9500] rounded-full flex items-center justify-center mb-5">
              <span className="font-semibold text-[17px]">DP</span>
            </div>
            <h3 className="font-semibold text-[18px] tracking-[-0.015em] mb-1.5 text-[#1D1D1F] dark:text-[#F5F5F7]">
              Earn DP Coins
            </h3>
            <p className="text-[#6E6E73] dark:text-[#98989D] text-[14px] leading-relaxed mb-5 flex-1">
              Start earning DP Coins today by purchasing eligible bonus products or adding funds to your wallet.
            </p>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                navigate("/bonus");
              }}
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#0071E3] dark:text-[#0A84FF] whitespace-nowrap active:scale-95 transition-transform"
            >
              View Bonus Products <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>

          <div className="ds-apple-surface p-6 rounded-[24px] flex flex-col items-start">
            <div className="w-11 h-11 bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] rounded-full flex items-center justify-center mb-5">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-[18px] tracking-[-0.015em] mb-1.5 text-[#1D1D1F] dark:text-[#F5F5F7]">
              Bundle Deals
            </h3>
            <p className="text-[#6E6E73] dark:text-[#98989D] text-[14px] leading-relaxed mb-5 flex-1">
              Maximize your savings right away with curated bundle offers pairing complementary items.
            </p>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                navigate("/all-products?deal=bundle");
              }}
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#0071E3] dark:text-[#0A84FF] whitespace-nowrap active:scale-95 transition-transform"
            >
              Shop Bundles <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingCredits;

