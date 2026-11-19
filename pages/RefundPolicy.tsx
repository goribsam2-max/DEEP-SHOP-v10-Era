import React from "react";
import SEO from "../components/SEO";

const RefundPolicy: React.FC = () => {

  return (
    <div className="ds-apple-shop-canvas bg-[#F5F5F7] dark:bg-black min-h-screen pb-24">
      <SEO
        title="Refund Policy | DEEP SHOP"
        description="Learn about refund, return, and warranty policies on DEEP SHOP, a multi-seller platform."
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="mb-6">
          <p className="ds-apple-eyebrow mb-1.5">Legal</p>
          <h1 className="ds-apple-display text-[22px] sm:text-[28px] leading-tight font-semibold text-[#1D1D1F] dark:text-white mb-2">
            Refund, Return &amp; Warranty Policy
          </h1>
          <p className="text-xs ds-apple-muted tabular-nums">
            Last Updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="ds-apple-surface rounded-[24px] p-6 sm:p-10 space-y-8 text-sm md:text-[15.5px] leading-relaxed ds-apple-muted">
          <section className="bg-[#FF9500]/10 border border-[#FF9500]/25 p-5 rounded-2xl">
            <h2 className="text-[#C93400] dark:text-[#FF9F0A] font-semibold text-base sm:text-lg mb-2">
              Important Information: Multi-Seller Marketplace
            </h2>
            <p className="text-[#1D1D1F]/85 dark:text-[#F5F5F7]/85 text-sm">
              DEEP SHOP is a multi-seller platform where independent sellers list their products and buyers make purchases directly from them. DEEP SHOP does not own, stock, or sell any of the products listed on the platform, nor does it provide direct return, refund, or warranty policies. All transactions, guarantees, warranties, and return conditions are strictly determined and handled by the respective individual seller.
            </p>
          </section>

          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              1. No Platform-Wide Refund Policy
            </h2>
            <p>
              Because DEEP SHOP is a multi-seller marketplace where independent sellers list their products, there is no single platform-wide refund or return policy. Refund and return procedures depend entirely on the individual seller of the product. DEEP SHOP has no involvement in these seller-specific policies. Buyers are advised to directly contact and ask the seller before making a purchase. Whatever policy the seller states or agrees to will apply to your order.
            </p>
          </section>

          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              2. Warranty &amp; Replacements
            </h2>
            <p>
              Any warranty, guarantee, or replacement coverage is offered solely by the individual seller from whom you bought the product. DEEP SHOP itself has nothing to do with product warranties. If you experience an issue or wish to make a warranty claim, please communicate directly with your seller. Their specific guidelines, timeline, and validation process will apply.
            </p>
          </section>

          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              3. Contacting Your Seller
            </h2>
            <p>
              If you need a refund, return, or wish to invoke a warranty, you must contact the seller directly. You can find seller contact information on the product details page or in your purchase history. Always ask the seller for clear written terms regarding return, refund, and warranty prior to completing your purchase.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;
