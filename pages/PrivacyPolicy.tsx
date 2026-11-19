import React from "react";
import SEO from "../components/SEO";

const PrivacyPolicy: React.FC = () => {

  return (
    <div className="ds-apple-shop-canvas bg-[#F5F5F7] dark:bg-black min-h-screen pb-24">
      <SEO
        title="Privacy Policy"
        description="Read our privacy policy and learn how we protect your data at DEEP SHOP."
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="mb-6">
          <p className="ds-apple-eyebrow mb-1.5">Legal</p>
          <h1 className="ds-apple-display text-[24px] sm:text-[30px] leading-tight font-semibold text-[#1D1D1F] dark:text-white">
            Privacy Policy
          </h1>
        </div>

        <div className="ds-apple-surface rounded-[24px] p-6 sm:p-10 space-y-8 text-sm md:text-[15.5px] leading-relaxed ds-apple-muted">
          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              A Highly Trusted &amp; Secure Platform
            </h2>
            <p>
              At DEEP SHOP, your privacy and data security are our absolute
              highest priorities. We are a trusted, verified business that follows
              strict global data compliance standards. Google regularly indexes
              and verifies our pages to ensure we provide a safe, reliable, and
              risk-free browsing and shopping experience.
            </p>
          </section>

          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              Authentication &amp; Login Security
            </h2>
            <p>
              We offer secure authentication via Google Login and Manual
              Registration.
              <br />
              <br />
              <strong className="text-[#1D1D1F] dark:text-white font-semibold">Google Login:</strong> This is a globally recognized, highly
              secure authentication method. By logging in with Google, we only
              receive your basic profile information (Name, Email, and Avatar)
              required to set up your account. We never have access to your Google
              password or any other sensitive data. It ensures a fast, risk-free
              experience.
              <br />
              <br />
              <strong className="text-[#1D1D1F] dark:text-white font-semibold">Manual Login:</strong> If you prefer manual login, your
              credentials are encrypted using industry-leading hashing algorithms
              before being stored. Your password is completely secure and
              unreadable by anyone, including our own staff.
            </p>
          </section>

          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              Data Collection &amp; Usage
            </h2>
            <p>
              We only collect data that is strictly necessary for order
              fulfillment, fraud prevention, and enhancing your user experience.
              We never sell your personal information to third parties. We are
              fully committed to maintaining the highest standard of data
              integrity, which is why we are considered a trusted site by Google
              and our users.
            </p>
          </section>

          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              Purchases &amp; Returns Privacy
            </h2>
            <p>
              Please note that as per our strictly enforced policy, we do not
              accept returns or offer refunds/money-back. Warranty is only
              applicable on specific products where explicitly stated. All order
              records are kept secure and confidential to protect your purchase
              history.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
