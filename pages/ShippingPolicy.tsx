import React from "react";
import SEO from "../components/SEO";

const ShippingPolicy: React.FC = () => {

  return (
    <div className="ds-apple-shop-canvas bg-[#F5F5F7] dark:bg-black min-h-screen pb-24">
      <SEO
        title="Shipping Policy"
        description="Learn about our shipping rates, delivery times, and dispatch processes."
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="mb-6">
          <p className="ds-apple-eyebrow mb-1.5">Delivery</p>
          <h1 className="ds-apple-display text-[24px] sm:text-[30px] leading-tight font-semibold text-[#1D1D1F] dark:text-white mb-2">
            Shipping Policy
          </h1>
          <p className="text-xs ds-apple-muted tabular-nums">
            Last Updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="ds-apple-surface rounded-[24px] p-6 sm:p-10 space-y-8 text-sm md:text-[15.5px] leading-relaxed ds-apple-muted">
          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              1. Fast &amp; Reliable Delivery
            </h2>
            <p>
              DEEP SHOP is committed to delivering your premium items and devices safely and efficiently. We use top-rated delivery partners to ensure your orders reach you in pristine condition.
            </p>
          </section>

          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              2. Processing Times
            </h2>
            <p>
              All orders are processed within 1 to 2 business days (excluding weekends and holidays) after receiving your order confirmation email. You will receive another notification when your order has shipped, complete with tracking information.
            </p>
          </section>

          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              3. Shipping Rates &amp; Delivery Estimates
            </h2>
            <p className="mb-4">
              Shipping charges for your order will be calculated and displayed at checkout. Estimated delivery times depend on your location within Bangladesh:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-[#1D1D1F] dark:text-white font-semibold">Standard Border Cross Delivery:</strong> 1 Month+ (approx 30 - 45 Business Days with dedicated international tracking)
              </li>
              <li>
                <strong className="text-[#1D1D1F] dark:text-white font-semibold">Priority Clearance:</strong> Available for select verified electronics
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              4. Order Tracking
            </h2>
            <p>
              You can track your order directly from your account&apos;s &quot;My Orders&quot; page. Enter your tracking number to view real-time shipping updates.
            </p>
          </section>

          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              5. Delivery Issues
            </h2>
            <p>
              If you experience any issues with your delivery or have not received your package within the estimated timeframe, please contact our support desk immediately so we can investigate and assist you.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ShippingPolicy;
