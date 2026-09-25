import React, { useState } from "react";
import { Product } from "../../types";
import { BorderOfferOrderModal } from "./BorderOfferOrderModal";
import AnimatedCardStack from "./animate-card-animation";
import { Zap, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BorderOfferSectionProps {
  products: Product[];
  title?: string;
}

export const BorderOfferSection: React.FC<BorderOfferSectionProps> = ({
  products,
  title = "বর্ডার স্টক ফোন বিশেষ অফার",
}) => {
  const navigate = useNavigate();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter products that are border offers or categorized under border/phone offers
  const borderOffers = products.filter(
    (p) =>
      p.isBorderOffer ||
      p.productType === "border_offer" ||
      ["border offer", "border stock", "border phone"].some((term) =>
        p.category?.toLowerCase().includes(term)
      )
  );

  if (borderOffers.length === 0) return null;

  const handleBuyNow = (prod: Product) => {
    setSelectedProduct(prod);
    setIsModalOpen(true);
  };

  return (
    <section className="mb-12 w-full animate-fade-in relative">
      {/* Section Header with Liquid Glass Styling */}
      <div className="bg-white/70 dark:bg-zinc-900/80 backdrop-blur-2xl p-4 sm:p-5 rounded-3xl border border-white/60 dark:border-zinc-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/25 shrink-0">
              <Zap className="w-5 h-5 fill-white stroke-none animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-white bg-amber-500 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  HOT DEALS
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                  বর্ডার স্টক স্পেশাল
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight mt-0.5">
                {title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() => navigate("/all-products?category=border_offer")}
              className="px-3.5 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
            >
              <span>সকল অফার</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Primary Animated Card Stack View */}
      <AnimatedCardStack products={borderOffers} onBuyNow={handleBuyNow} />

      {/* Dedicated Border Stock Order Modal */}
      <BorderOfferOrderModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </section>
  );
};
