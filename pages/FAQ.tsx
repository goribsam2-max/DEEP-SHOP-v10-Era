import React, { useState } from "react";
import SEO from "../components/SEO";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { APPLE_SPRING_DEFAULT } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

const faqs = [
  {
    q: "How do I track my phone delivery?",
    a: 'You can track your order in the "Purchase History" section of your profile. Once shipped, a tracking ID will be visible.',
  },
  {
    q: "What is the warranty on products?",
    a: "DEEP SHOP is a multi-seller platform where independent sellers list their products for buyers to buy. DEEP SHOP has no warranty of its own. Warranty depends entirely on the seller; whatever warranty they state or agree to is the warranty provided. Please contact the seller directly to ask about their specific product warranty.",
  },
  {
    q: "How do I pay via bKash/Nagad?",
    a: "During checkout, select your preferred provider. You can choose to pay the delivery charge in advance or the full amount.",
  },
  {
    q: "What is the return and refund policy?",
    a: "Returns and refunds are determined solely by the individual seller. Since DEEP SHOP is a multi-seller marketplace, DEEP SHOP itself does not handle or offer direct returns or refunds. Buyers should ask the seller of the product directly, and whatever return/refund terms they specify will be followed.",
  },
  {
    q: "Is cash on delivery available?",
    a: "Yes, we offer COD nationwide. However, for some high-value mobiles, a small partial payment might be required by the seller.",
  },
];

const FAQPage: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const generateSchema = () => {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.a,
        },
      })),
    };
  };

  return (
    <div className="ds-apple-shop-canvas bg-[#F5F5F7] dark:bg-black min-h-screen pb-24">
      <SEO
        title="Frequently Asked Questions (FAQ) | DEEP SHOP"
        description="Find answers to common questions about buying Border Cross Products, genuine mobiles, warranty, and delivery at DEEP SHOP Bangladesh."
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSchema()) }}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-6 text-center">
        <p className="ds-apple-eyebrow mb-1.5">Support &amp; Answers</p>
        <h1 className="ds-apple-display text-[24px] sm:text-[30px] leading-tight font-semibold text-[#1D1D1F] dark:text-white mb-2.5">
          Frequently Asked Questions
        </h1>
        <p className="ds-apple-muted text-sm md:text-base max-w-md mx-auto leading-relaxed">
          Everything you need to know about our products, billing, and support.
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-2">
        <div className="ds-apple-surface rounded-[24px] overflow-hidden divide-y divide-black/[0.06] dark:divide-white/[0.08]">
          {faqs.map((faq, i) => {
            const isOpen = expandedFaq === i;
            return (
              <div key={i} className="group">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setExpandedFaq(isOpen ? null : i);
                  }}
                  className="w-full px-5 sm:px-6 py-5 flex justify-between items-center text-left bg-transparent hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors cursor-pointer active:opacity-80"
                >
                  <span className="text-[15px] font-semibold text-[#1D1D1F] dark:text-white pr-6 tracking-[-0.01em]">
                    {faq.q}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                      isOpen
                        ? "bg-[#0071E3] dark:bg-[#0A84FF] text-white rotate-180"
                        : "bg-black/[0.05] dark:bg-white/[0.08] text-[#6E6E73] dark:text-[#98989D]"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      animate={prefersReducedMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                      exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      transition={prefersReducedMotion ? { duration: 0.15 } : APPLE_SPRING_DEFAULT}
                      className="overflow-hidden"
                    >
                      <div className="px-5 sm:px-6 pb-6 pt-3 text-sm ds-apple-muted font-medium leading-relaxed border-t border-black/[0.05] dark:border-white/[0.06] ds-apple-surface-subtle">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
