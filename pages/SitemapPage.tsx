import React from "react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";
import { ArrowUpRight } from "lucide-react";
import { triggerHaptic } from "../lib/haptics";

const SitemapPage: React.FC = () => {

  const sections = [
    {
      title: "Store",
      links: [
        { label: "Home", path: "/" },
        { label: "All Products", path: "/all-products" },
        { label: "Search", path: "/search" },
        { label: "Cart", path: "/cart" },
      ],
    },
    {
      title: "User Account",
      links: [
        { label: "My Profile", path: "/profile" },
        { label: "My Orders", path: "/orders" },
        { label: "Wishlist", path: "/wishlist" },
        { label: "Notifications", path: "/notifications" },
        { label: "Account Settings", path: "/settings" },
      ],
    },
    {
      title: "Legal & Support",
      links: [
        { label: "About Us", path: "/about" },
        { label: "Contact Us", path: "/contact" },
        { label: "Terms & Conditions", path: "/terms" },
        { label: "Privacy Policy", path: "/privacy" },
        { label: "Cookie Policy", path: "/cookie-policy" },
        { label: "Refund Policy", path: "/refund-policy" },
        { label: "Shipping Policy", path: "/shipping-policy" },
        { label: "Disclaimer", path: "/disclaimer" },
        { label: "DEEP SHOP Helpline", path: "/help-center" },
      ],
    },
  ];

  return (
    <div className="ds-apple-shop-canvas bg-[#F5F5F7] dark:bg-black min-h-screen pb-24">
      <SEO
        title="Site Map"
        description="Navigate through all pages of DEEP SHOP."
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="mb-6">
          <p className="ds-apple-eyebrow mb-1.5">Directory</p>
          <h1 className="ds-apple-display text-[24px] sm:text-[30px] leading-tight font-semibold text-[#1D1D1F] dark:text-white">
            Site Map
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {sections.map((section, idx) => (
            <div key={idx} className="ds-apple-surface rounded-[22px] p-6">
              <h2 className="text-base font-semibold tracking-[-0.015em] text-[#1D1D1F] dark:text-white mb-4 pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
                {section.title}
              </h2>
              <ul className="space-y-3">
                {section.links.map((link, i) => (
                  <li key={i}>
                    <Link
                      to={link.path}
                      onClick={() => triggerHaptic("selection")}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0071E3] dark:text-[#0A84FF] hover:underline transition-colors"
                    >
                      <span>{link.label}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-75" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SitemapPage;
