import React from "react";
import SEO from "../components/SEO";

const Terms: React.FC = () => {

  return (
    <div className="ds-apple-shop-canvas bg-[#F5F5F7] dark:bg-black min-h-screen pb-24">
      <SEO
        title="Terms & Conditions"
        description="Terms and Conditions and return policy of DEEP SHOP."
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="mb-6">
          <p className="ds-apple-eyebrow mb-1.5">Legal</p>
          <h1 className="ds-apple-display text-[24px] sm:text-[30px] leading-tight font-semibold text-[#1D1D1F] dark:text-white">
            Terms &amp; Conditions
          </h1>
        </div>

        <div className="ds-apple-surface rounded-[24px] p-6 sm:p-10 space-y-8 text-sm md:text-[15.5px] leading-relaxed ds-apple-muted">
          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing and shopping at DEEP SHOP, you agree to be bound by
              these Terms and Conditions. Our platform is a secure,
              Google-verified service designed for your trust and convenience.
            </p>
          </section>

          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              2. Multi-Seller Platform &amp; Returns Policy
            </h2>
            <p>
              DEEP SHOP is a multi-seller marketplace where independent third-party sellers list and sell their products. DEEP SHOP does not have a general return or refund policy. All return, refund, and exchange terms are strictly set, managed, and resolved by the individual seller from whom you purchase. Buyers must contact the seller directly for any inquiries regarding return or refund policies.
            </p>
          </section>

          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              3. Warranty Information
            </h2>
            <p>
              DEEP SHOP does not provide any warranties for the products listed on the platform. Any warranty coverage, guarantee, or replacement support is offered strictly by the individual seller as indicated on their product page or as communicated by them. If no warranty details are specified by the seller, the product is sold &quot;as is.&quot;
            </p>
          </section>

          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              4. Account Security
            </h2>
            <p>
              We provide state-of-the-art secure authentication (including Google
              and robust Manual Login) ensuring your account is safe from
              unauthorized access. You are responsible for keeping your login
              credentials confidential.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
