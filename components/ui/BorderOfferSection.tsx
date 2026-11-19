import React, { useState } from "react";
import { Product } from "../../types";
import { BorderOfferOrderModal } from "./BorderOfferOrderModal";
import AnimatedCardStack from "./animate-card-animation";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { triggerHaptic } from "../../lib/haptics";

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

  const borderOffers = products
    .filter(
      (p) =>
        p.isBorderOffer ||
        p.productType === "border_offer" ||
        ["border offer", "border stock", "border phone"].some((term) =>
          p.category?.toLowerCase().includes(term)
        )
    )
    .slice(0, 6);

  if (borderOffers.length === 0) return null;

  const handleBuyNow = (prod: Product) => {
    triggerHaptic();
    setSelectedProduct(prod);
    setIsModalOpen(true);
  };

  return (
    <section className="mb-10 w-full relative">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div className="min-w-0">
          <p className="ds-apple-eyebrow ds-apple-muted text-[11px] mb-1">
            Border Stock Intake
          </p>
          <h2 className="ds-apple-display text-[22px] sm:text-[26px] font-semibold">
            {title}
          </h2>
        </div>

        <button
          type="button"
          onPointerDown={() => triggerHaptic()}
          onClick={() => navigate("/all-products?category=border_offer")}
          className="ds-apple-accent-text inline-flex items-center gap-0.5 text-[13px] font-semibold hover:underline whitespace-nowrap shrink-0 cursor-pointer active:scale-95 transition-transform"
        >
          <span>See All</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <AnimatedCardStack products={borderOffers} onBuyNow={handleBuyNow} />

      <BorderOfferOrderModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </section>
  );
};
