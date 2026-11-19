import React from "react";
import SEO from "../components/SEO";

const AboutUs: React.FC = () => {

  return (
    <div className="ds-apple-shop-canvas bg-[#F5F5F7] dark:bg-black min-h-screen pb-24">
      <SEO
        title="About Us"
        description="Learn about DEEP SHOP, Bangladesh's trusted platform for Border Cross Products & genuine mobiles."
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="mb-6">
          <p className="ds-apple-eyebrow mb-1.5">DEEP SHOP</p>
          <h1 className="ds-apple-display text-[24px] sm:text-[30px] leading-tight font-semibold text-[#1D1D1F] dark:text-white">
            About DEEP SHOP
          </h1>
        </div>

        <div className="ds-apple-surface rounded-[24px] p-6 sm:p-10 space-y-8 text-sm md:text-[15.5px] leading-relaxed ds-apple-muted">
          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              Welcome to DEEP SHOP
            </h2>
            <p>
              DEEP SHOP is Bangladesh&apos;s trusted platform where you can get Border Cross Products + genuine mobiles. We offer 100% authentic devices, trusted global imports, and premium accessories. Our mission is to provide high-quality, trusted global products and genuine smartphones securely to tech lovers in Bangladesh.
            </p>
          </section>

          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              Why We Are Trusted
            </h2>
            <p>
              As a certified and verified e-commerce platform, we adhere to strict
              standards to ensure every transaction is safe and every product is
              authentic. We integrate with world-class secure authentication
              providers like Google to make sure your data is never compromised.
              We are recognized globally as a secure and reliable platform for
              tech enthusiasts.
            </p>
          </section>

          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              Our Commitment
            </h2>
            <p>
              We believe in full transparency. Due to the high-value nature of
              electronics, please make sure you read the product details carefully
              before making a purchase. As outlined in our Terms &amp; Conditions, we
              do not offer general return or money-back policies. Warranties are
              only applicable to specific items that explicitly mention them. This
              allows us to offer you the best possible prices on brand-new,
              unopened products.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
