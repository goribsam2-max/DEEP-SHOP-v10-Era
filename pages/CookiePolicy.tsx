import React from "react";
import SEO from "../components/SEO";

const CookiePolicy: React.FC = () => {

  return (
    <div className="ds-apple-shop-canvas bg-[#F5F5F7] dark:bg-black min-h-screen pb-24">
      <SEO
        title="Cookie Policy"
        description="Learn about the cookies we use and why we use them to enhance your experience."
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="mb-6">
          <p className="ds-apple-eyebrow mb-1.5">Legal</p>
          <h1 className="ds-apple-display text-[24px] sm:text-[30px] leading-tight font-semibold text-[#1D1D1F] dark:text-white mb-2">
            Cookie Policy
          </h1>
          <p className="text-xs ds-apple-muted tabular-nums">
            Last Updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="ds-apple-surface rounded-[24px] p-6 sm:p-10 space-y-8 text-sm md:text-[15.5px] leading-relaxed ds-apple-muted">
          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              1. What Are Cookies?
            </h2>
            <p>
              Cookies are small text files that are stored on your device (computer or mobile device) when you visit our website. They are widely used to make websites work more efficiently and to provide information to the owners of the site. They help us understand how you interact with our platform, improve functionality, and secure your account.
            </p>
          </section>

          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              2. How and Why We Use Cookies
            </h2>
            <p className="mb-4">
              We use cookies to enhance your shopping experience, secure your navigation, and build trust. Here are the main ways we use them:
            </p>
            <ul className="list-disc pl-5 space-y-3">
              <li>
                <strong className="text-[#1D1D1F] dark:text-white font-semibold">Authentication &amp; Security:</strong> We use cookies and local storage items (such as Firebase auth tokens) to keep you logged in securely and protect your data. This ensures your account cannot be accessed by unauthorized users.
              </li>
              <li>
                <strong className="text-[#1D1D1F] dark:text-white font-semibold">Shopping Cart &amp; Checkout:</strong> Cookies or local storage (`f_cart`) are used to remember the items in your shopping cart across different pages until you checkout.
              </li>
              <li>
                <strong className="text-[#1D1D1F] dark:text-white font-semibold">Preferences &amp; Themes:</strong> We store your UI preferences (like Dark Mode settings) to provide a consistent visual experience whenever you visit.
              </li>
              <li>
                <strong className="text-[#1D1D1F] dark:text-white font-semibold">Analytics &amp; Performance (Google Trust):</strong> To follow Google’s best practices for trusted merchants, we use minimal analytical data formats to understand user traffic. This allows us to improve site speed, optimize the layout, and fix any errors.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              3. Types of Cookies We Use
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-[#1D1D1F] dark:text-white">Strictly Necessary Cookies</h3>
                <p>These are essential for the website to function. Without them, tasks like logging in, adding items to the cart, or securely checking out cannot be performed. You cannot opt out of these.</p>
              </div>
              <div>
                <h3 className="font-semibold text-[#1D1D1F] dark:text-white">Functionality Cookies</h3>
                <p>These allow our store to remember the choices you make (such as language or region) and provide enhanced, more personal features.</p>
              </div>
              <div>
                <h3 className="font-semibold text-[#1D1D1F] dark:text-white">Analytics Cookies</h3>
                <p>These help us measure website performance and ensure Google Search indexing correctly reads our pages to serve you the most relevant products.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              4. Managing Your Cookies
            </h2>
            <p>
              Most web browsers allow you to control cookies through their settings preferences. However, if you limit the ability of websites to set cookies, you may worsen your overall user experience or lose your cart items mid-session.
            </p>
          </section>

          <section>
            <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-lg tracking-[-0.015em] mb-3">
              5. Contact Us
            </h2>
            <p>
              If you have any questions about our use of cookies, please contact our support team.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;
