import React from "react";
import SEO from "../components/SEO";

const Disclaimer: React.FC = () => {

  return (
    <div className="ds-apple-shop-canvas bg-[#F5F5F7] dark:bg-black min-h-screen pb-24">
      <SEO
        title="Disclaimer"
        description="General disclaimer for DEEP SHOP."
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="mb-6">
          <p className="ds-apple-eyebrow mb-1.5">Legal</p>
          <h1 className="ds-apple-display text-[24px] sm:text-[30px] leading-tight font-semibold text-[#1D1D1F] dark:text-white mb-2">
            Legal Disclaimer
          </h1>
          <p className="text-xs ds-apple-muted tabular-nums">
            Last Updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="ds-apple-surface rounded-[24px] p-6 sm:p-10 space-y-8 text-sm md:text-[15.5px] leading-relaxed ds-apple-muted">
          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              1. General Knowledge
            </h2>
            <p>
              The information provided by DEEP SHOP on our platform is for general informational purposes only. While we establish reasonable efforts to ensure the accuracy and reliability of all specifications, prices, and product details, we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, or completeness of any information on the site.
            </p>
          </section>

          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              2. External Links
            </h2>
            <p>
              Our site may contain links to other websites or content belonging to or originating from third parties. Such external links are not actively investigated, monitored, or checked for accuracy, adequacy, validity, reliability, availability, or completeness by us.
            </p>
          </section>

          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              3. Product Capabilities
            </h2>
            <p>
              Any AI features or smart capabilities advertised for physical products are determined solely by the original manufacturer’s software and hardware constraints. DEEP SHOP is not responsible for the future discontinuation of third-party companion apps or software updates related to the devices sold.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;
