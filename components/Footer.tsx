import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { db } from "../firebase";
import Icon from "./Icon";
import { Link } from "react-router-dom";
import { triggerHaptic } from "../lib/haptics";
import { APPLE_SPRING_DEFAULT } from "../lib/shoppingRoute";

interface FooterSettings {
  instagramUrl: string;
  telegramUrl: string;
  tiktokUrl: string;
  facebookUrl: string;
  footerLogo: string;
  footerPaymentLogos: { name: string; icon?: string }[];
}

export const Footer: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const [settings, setSettings] = useState<FooterSettings>({
    instagramUrl: "https://www.instagram.com/deep.shop.official",
    telegramUrl: "https://t.me/+jBB7zRRjuF5hYWY1",
    tiktokUrl: "",
    facebookUrl: "",
    footerLogo: "",
    footerPaymentLogos: [],
  });
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [waReason, setWaReason] = useState("Order Issue");
  const [customReason, setCustomReason] = useState("");
  const [logoError, setLogoError] = useState(false);

  const waNumber = "17247648185"; // without + for wa.me link

  useEffect(() => {
    const unsubPayments = onSnapshot(doc(db, "settings", "payments"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings((prev) => ({
          ...prev,
          instagramUrl: data.instagramUrl || prev.instagramUrl,
          telegramUrl: data.telegramUrl || prev.telegramUrl,
          tiktokUrl: data.tiktokUrl || prev.tiktokUrl,
          facebookUrl: data.facebookUrl || prev.facebookUrl,
          footerLogo: data.footerLogo || data.logoUrl || prev.footerLogo,
          footerPaymentLogos: Array.isArray(data.footerPaymentLogos)
            ? data.footerPaymentLogos
            : prev.footerPaymentLogos,
        }));
      }
    });

    const unsubSeo = onSnapshot(doc(db, "settings", "seo"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const seoLogo =
          data.logoUrl || data.appIconUrl || data.faviconUrl || data.metaImage;
        if (seoLogo) {
          setSettings((prev) => ({
            ...prev,
            footerLogo: prev.footerLogo ? prev.footerLogo : seoLogo,
          }));
        }
      }
    });

    const unsubPlatform = onSnapshot(doc(db, "settings", "platform"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const platLogo = data.footerLogo || data.logoUrl;
        if (platLogo) {
          setSettings((prev) => ({
            ...prev,
            footerLogo: platLogo,
            instagramUrl: data.instagramUrl || prev.instagramUrl,
            telegramUrl: data.telegramUrl || prev.telegramUrl,
            tiktokUrl: data.tiktokUrl || prev.tiktokUrl,
            facebookUrl: data.facebookUrl || prev.facebookUrl,
          }));
        }
      }
    });

    return () => {
      unsubPayments();
      unsubSeo();
      unsubPlatform();
    };
  }, []);

  const finalReasonText =
    waReason === "Other" ? customReason.trim() || "Support Inquiry" : waReason;
  const whatsAppHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(
    `Hi, I need help regarding: ${finalReasonText}`
  )}`;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const socialChannels = [
    {
      id: "instagram",
      label: "Instagram",
      sublabel: "@deep.shop.official",
      href: settings.instagramUrl || "https://www.instagram.com/deep.shop.official",
      hoverClass:
        "hover:border-rose-500/40 hover:bg-rose-500/5 dark:hover:border-rose-400/40 dark:hover:bg-rose-500/10",
      iconWrapClass:
        "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
    },
    {
      id: "telegram",
      label: "Telegram",
      sublabel: "Official Channel",
      href: settings.telegramUrl || "https://t.me/+jBB7zRRjuF5hYWY1",
      hoverClass:
        "hover:border-sky-500/40 hover:bg-sky-500/5 dark:hover:border-sky-400/40 dark:hover:bg-sky-500/10",
      iconWrapClass:
        "bg-sky-500/10 text-[#229ED9] dark:bg-sky-500/15 dark:text-sky-400",
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
        </svg>
      ),
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      sublabel: "Instant Support",
      href: `https://wa.me/${waNumber}`,
      hoverClass:
        "hover:border-emerald-500/40 hover:bg-emerald-500/5 dark:hover:border-emerald-400/40 dark:hover:bg-emerald-500/10",
      iconWrapClass:
        "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
        </svg>
      ),
    },
    ...(settings.tiktokUrl
      ? [
          {
            id: "tiktok",
            label: "TikTok",
            sublabel: "Official Clips",
            href: settings.tiktokUrl,
            hoverClass:
              "hover:border-zinc-500/40 hover:bg-zinc-500/5 dark:hover:border-zinc-400/40 dark:hover:bg-zinc-500/10",
            iconWrapClass:
              "bg-zinc-900/10 text-zinc-900 dark:bg-white/10 dark:text-white",
            icon: (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
              </svg>
            ),
          },
        ]
      : []),
  ];

  const desktopColumns = [
    {
      heading: "Shop & Explore",
      links: [
        { label: "Home Marketplace", to: "/" },
        { label: "All Products", to: "/all-products" },
        { label: "Flash Deals", to: "/flash-sale" },
        { label: "Bundle Offers", to: "/bundles" },
        { label: "VIP Membership", to: "/subscription" },
      ],
    },
    {
      heading: "Account & Orders",
      links: [
        { label: "My Orders & Tracking", to: "/orders" },
        { label: "Delivery Address", to: "/shipping-address" },
        { label: "Direct Chat Support", to: "/messages" },
        { label: "Loops", to: "/loops" },
      ],
    },
    {
      heading: "Customer Care",
      links: [
        { label: "Help Center", to: "/help-center" },
        { label: "Support Tickets", to: "/my-tickets" },
        { label: "Frequently Asked Questions", to: "/faq" },
        { label: "Contact Us", to: "/contact" },
      ],
    },
    {
      heading: "Policies & Info",
      links: [
        { label: "Privacy Policy", to: "/privacy" },
        { label: "Terms of Service", to: "/terms" },
        { label: "Refund & Return Policy", to: "/refund-policy" },
        { label: "Shipping Policy", to: "/shipping-policy" },
        { label: "About DEEP SHOP", to: "/about" },
      ],
    },
  ];

  const mobileQuickLinks = [
    { label: "All Products", to: "/all-products" },
    { label: "VIP Pass (0৳ COD)", to: "/subscription" },
    { label: "My Orders", to: "/orders" },
    { label: "Delivery Address", to: "/shipping-address" },
    { label: "Live Chat", to: "/messages" },
    { label: "Help Center", to: "/help-center" },
  ];

  const mobilePolicyLinks = [
    { label: "FAQs", to: "/faq" },
    { label: "Privacy", to: "/privacy" },
    { label: "Terms", to: "/terms" },
    { label: "Refund", to: "/refund-policy" },
    { label: "Shipping", to: "/shipping-policy" },
    { label: "About", to: "/about" },
  ];

  const resolvedFooterLogo =
    typeof settings.footerLogo === "string" &&
    settings.footerLogo.trim() !== "" &&
    settings.footerLogo.trim() !== "/favicon.png"
      ? settings.footerLogo.trim()
      : "";

  const renderBrandLogo = (sizeClass: string) => (
    <div
      className={`${sizeClass} rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-center shrink-0`}
    >
      {resolvedFooterLogo && !logoError ? (
        <img
          src={resolvedFooterLogo}
          alt="DEEP SHOP"
          referrerPolicy="no-referrer"
          onError={() => setLogoError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-xs font-semibold text-zinc-900 dark:text-white">
          DS
        </span>
      )}
    </div>
  );

  return (
    <>
      <footer className="ds-apple-surface relative z-10 mt-10 mx-2.5 sm:mx-5 md:mx-6 mb-24 md:mb-6 rounded-[24px] overflow-hidden">
        {/* ==============================================================
            DESKTOP LAYOUT (md & up): Apple Storefront Directory
           ============================================================== */}
        <div className="hidden md:block max-w-7xl mx-auto px-7 lg:px-10 py-9">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-black/[0.06] dark:border-white/[0.08]">
            <div className="flex items-start gap-4 max-w-md">
              {renderBrandLogo("w-12 h-12")}
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h2 className="ds-apple-display text-lg font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-nowrap">
                    DEEP SHOP
                  </h2>
                  <span className="text-xs text-[#86868B]">
                    ·
                  </span>
                  <span className="text-xs font-medium text-[#6E6E73] dark:text-[#98989D] whitespace-nowrap">
                    Border Cross Tech Marketplace
                  </span>
                </div>
                <p className="text-xs text-[#6E6E73] dark:text-[#98989D] leading-relaxed">
                  Curated global electronics, smart gadgets, and verified cross-border imports delivered across Bangladesh.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {socialChannels.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.label}
                  onPointerDown={() => triggerHaptic()}
                  className={`group flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border border-black/[0.06] dark:border-white/[0.1] bg-[#F2F2F7]/80 dark:bg-[#2C2C2E]/80 transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.97] ${item.hoverClass}`}
                >
                  <span
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105 ${item.iconWrapClass}`}
                  >
                    {item.icon}
                  </span>
                  <div className="text-left pr-1">
                    <span className="block text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight whitespace-nowrap">
                      {item.label}
                    </span>
                    <span className="block text-[10px] text-[#6E6E73] dark:text-[#98989D] leading-tight whitespace-nowrap">
                      {item.sublabel}
                    </span>
                  </div>
                  <Icon name="arrow-up-right" className="w-3.5 h-3.5 text-[#86868B] group-hover:text-[#1D1D1F] dark:group-hover:text-white transition-colors shrink-0" />
                </a>
              ))}

              <button
                type="button"
                onPointerDown={() => triggerHaptic()}
                onClick={() => setIsContactOpen(true)}
                className="ds-apple-btn-primary min-h-[46px] px-4.5 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Icon name="headphones" className="w-4 h-4 shrink-0" />
                <span>24/7 Helpline</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-8 py-8 border-b border-black/[0.06] dark:border-white/[0.08]">
            {desktopColumns.map((col) => (
              <div key={col.heading} className="space-y-3.5">
                <h3 className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                  {col.heading}
                </h3>
                <ul className="space-y-2.5">
                  {col.links.map((lnk) => (
                    <li key={lnk.to}>
                      <Link
                        to={lnk.to}
                        className="group inline-flex items-center gap-1.5 text-[13px] text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
                      >
                        <span className="group-hover:underline underline-offset-4">
                          {lnk.label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-6 flex items-center justify-between gap-4 text-xs text-[#6E6E73] dark:text-[#98989D]">
            <div className="flex items-center gap-3 flex-wrap">
              <span>
                © {new Date().getFullYear()} DEEP SHOP. All rights reserved.
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5 text-[#1D1D1F] dark:text-[#F5F5F7] font-medium">
                <Icon name="shield-check" className="w-4 h-4 text-[#248A3D] dark:text-[#30D158] shrink-0" />
                <span>Verified Marketplace</span>
              </span>
            </div>

            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2 text-xs">
                <span>Payments:</span>
                <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  bKash · Nagad · Cash on Delivery
                </span>
              </div>

              <button
                type="button"
                onPointerDown={() => triggerHaptic()}
                onClick={scrollToTop}
                className="ds-apple-btn-secondary inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <span>Back to top</span>
                <Icon name="arrow-up" className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ==============================================================
            MOBILE LAYOUT (below md): Thumb-First Storefront Dock
           ============================================================== */}
        <div className="block md:hidden px-4 py-5 space-y-5">
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
            <div className="flex items-center gap-2.5 min-w-0">
              {renderBrandLogo("w-10 h-10")}
              <div className="min-w-0">
                <h2 className="ds-apple-display text-sm font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                  DEEP SHOP
                </h2>
                <p className="text-[11px] text-[#6E6E73] dark:text-[#98989D] truncate">
                  Border Cross Tech Hub
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onPointerDown={() => triggerHaptic()}
                onClick={() => setIsContactOpen(true)}
                className="ds-apple-btn-primary min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 active:scale-[0.96] transition-transform cursor-pointer whitespace-nowrap"
              >
                <Icon name="phone-call" className="w-3.5 h-3.5 shrink-0" />
                <span>Helpline</span>
              </button>
              <button
                type="button"
                onPointerDown={() => triggerHaptic()}
                onClick={scrollToTop}
                aria-label="Scroll to top"
                className="ds-apple-btn-secondary w-9 h-9 rounded-full flex items-center justify-center active:scale-[0.95] transition-transform cursor-pointer"
              >
                <Icon name="arrow-up" className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Row 2: Dedicated Tactile Social Media Icon Tiles (Distinct Mobile Layout) */}
          <div className="space-y-2">
            <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              Connect on Social Media
            </span>
            <div
              className={`grid gap-2 ${
                socialChannels.length >= 4 ? "grid-cols-4" : "grid-cols-3"
              }`}
            >
              {socialChannels.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[62px] py-2.5 px-2 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/70 dark:border-zinc-800 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-transform"
                >
                  <span
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${item.iconWrapClass}`}
                  >
                    {item.icon}
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                    {item.label}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Mobile Row 3: 2-Column Quick Storefront Links Grid (Distinct Mobile Layout) */}
          <div className="grid grid-cols-2 gap-2">
            {mobileQuickLinks.map((lnk) => (
              <Link
                key={lnk.to}
                to={lnk.to}
                className="min-h-[42px] px-3.5 py-2.5 rounded-xl bg-zinc-50/90 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-zinc-800/80 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between gap-2 transition-colors"
              >
                <span className="truncate">{lnk.label}</span>
                <Icon name="chevron-right" className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              </Link>
            ))}
          </div>

          {/* Mobile Row 4: Clean Dot-Separated Policy & Legal Links */}
          <div className="pt-3 border-t border-zinc-200/70 dark:border-zinc-800/80 space-y-2.5 text-center">
            <nav
              aria-label="Footer Policies"
              className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400"
            >
              {mobilePolicyLinks.map((pLink, idx) => (
                <React.Fragment key={pLink.to}>
                  <Link
                    to={pLink.to}
                    className="hover:text-zinc-900 dark:hover:text-white transition-colors whitespace-nowrap"
                  >
                    {pLink.label}
                  </Link>
                  {idx < mobilePolicyLinks.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="text-zinc-300 dark:text-zinc-700"
                    >
                      ·
                    </span>
                  )}
                </React.Fragment>
              ))}
            </nav>

            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
              © {new Date().getFullYear()} DEEP SHOP · bKash · Nagad · COD
            </p>
          </div>
        </div>
      </footer>

      {/* Contact Options Popup (Apple Frosted Drag Sheet) */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isContactOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="ds-apple-portal ds-apple-backdrop fixed inset-0 z-[10060] flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={() => setIsContactOpen(false)}
            >
              <motion.div
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: "100%" }}
                transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_DEFAULT}
                drag={prefersReducedMotion ? false : "y"}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0.02, bottom: 0.45 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 100 || info.velocity.y > 400) {
                    setIsContactOpen(false);
                  }
                }}
                className="ds-apple-sheet w-full max-w-none sm:max-w-sm rounded-t-[28px] rounded-b-none sm:rounded-[28px] p-6 pt-3 sm:pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6 max-h-[85dvh] overflow-y-auto touch-pan-y"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sm:hidden flex justify-center pb-3">
                  <div className="w-9 h-1 rounded-full bg-black/15 dark:bg-white/25" />
                </div>
                <div className="flex justify-between items-center mb-5">
                  <h3 className="ds-apple-display text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    24/7 Customer Support
                  </h3>
                  <button
                    type="button"
                    onPointerDown={() => triggerHaptic()}
                    onClick={() => setIsContactOpen(false)}
                    className="w-8 h-8 rounded-full bg-black/[0.05] dark:bg-white/[0.1] flex items-center justify-center text-[#6E6E73] dark:text-[#98989D] cursor-pointer"
                    aria-label="Close"
                  >
                    <Icon name="x" className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <a
                    href="tel:+17247648185"
                    onPointerDown={() => triggerHaptic()}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#0071E3]/[0.08] dark:bg-[#0A84FF]/[0.14] hover:bg-[#0071E3]/[0.13] dark:hover:bg-[#0A84FF]/[0.2] active:scale-[0.98] transition-all text-[#0071E3] dark:text-[#0A84FF]"
                  >
                    <div className="w-11 h-11 rounded-xl bg-white dark:bg-[#2C2C2E] flex items-center justify-center shadow-2xs shrink-0">
                      <Icon name="phone-call" className="w-5 h-5 text-[#0071E3] dark:text-[#0A84FF]" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">Direct Call</p>
                      <p className="text-xs text-[#0071E3] dark:text-[#0A84FF] tabular-nums">
                        +1 (724) 764-8185
                      </p>
                    </div>
                  </a>

                  <button
                    type="button"
                    onPointerDown={() => triggerHaptic()}
                    onClick={() => setIsWhatsAppOpen(true)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#248A3D]/[0.08] dark:bg-[#30D158]/[0.14] hover:bg-[#248A3D]/[0.13] dark:hover:bg-[#30D158]/[0.2] active:scale-[0.98] transition-all text-[#248A3D] dark:text-[#30D158] cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-xl bg-white dark:bg-[#2C2C2E] flex items-center justify-center shadow-2xs shrink-0">
                      <Icon name="message-circle" className="w-5 h-5 text-[#248A3D] dark:text-[#30D158]" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">WhatsApp Support</p>
                      <p className="text-xs text-[#248A3D] dark:text-[#30D158]">Message us instantly</p>
                    </div>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* WhatsApp Reason Popup (Apple Frosted Drag Sheet) */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isWhatsAppOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="ds-apple-portal ds-apple-backdrop fixed inset-0 z-[10070] flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={() => setIsWhatsAppOpen(false)}
            >
              <motion.div
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: "100%" }}
                transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_DEFAULT}
                drag={prefersReducedMotion ? false : "y"}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0.02, bottom: 0.45 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 100 || info.velocity.y > 400) {
                    setIsWhatsAppOpen(false);
                  }
                }}
                className="ds-apple-sheet w-full max-w-none sm:max-w-sm rounded-t-[28px] rounded-b-none sm:rounded-[28px] p-6 pt-3 sm:pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6 max-h-[85dvh] overflow-y-auto touch-pan-y"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sm:hidden flex justify-center pb-3">
                  <div className="w-9 h-1 rounded-full bg-black/15 dark:bg-white/25" />
                </div>
                <div className="flex justify-between items-center mb-5">
                  <h3 className="ds-apple-display text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    What do you need help with?
                  </h3>
                  <button
                    type="button"
                    onPointerDown={() => triggerHaptic()}
                    onClick={() => setIsWhatsAppOpen(false)}
                    className="w-8 h-8 rounded-full bg-black/[0.05] dark:bg-white/[0.1] flex items-center justify-center text-[#6E6E73] dark:text-[#98989D] cursor-pointer"
                    aria-label="Close"
                  >
                    <Icon name="x" className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {[
                    "Order Issue",
                    "Product Inquiry",
                    "Delivery Status",
                    "Return/Refund",
                    "Other",
                  ].map((reason) => (
                    <label
                      key={reason}
                      onPointerDown={() => triggerHaptic()}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-colors ${
                        waReason === reason
                          ? "border-[#0071E3] dark:border-[#0A84FF] bg-[#0071E3]/[0.07] dark:bg-[#0A84FF]/[0.14]"
                          : "border-black/[0.08] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="wareason"
                        value={reason}
                        checked={waReason === reason}
                        onChange={(e) => setWaReason(e.target.value)}
                        className="accent-[#0071E3] dark:accent-[#0A84FF]"
                      />
                      <span
                        className={`text-sm font-medium ${
                          waReason === reason
                            ? "text-[#0071E3] dark:text-[#0A84FF] font-semibold"
                            : "text-[#1D1D1F] dark:text-[#F5F5F7]"
                        }`}
                      >
                        {reason}
                      </span>
                    </label>
                  ))}

                  {waReason === "Other" && (
                    <textarea
                      placeholder="Please specify your reason..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      className="ds-apple-input w-full mt-2 rounded-2xl p-3.5 text-sm outline-none"
                      rows={3}
                    />
                  )}

                  {waReason === "Other" && !customReason.trim() ? (
                    <button
                      type="button"
                      disabled
                      className="ds-apple-btn-primary w-full mt-4 py-3.5 rounded-full font-semibold opacity-50 cursor-not-allowed"
                    >
                      Continue to WhatsApp
                    </button>
                  ) : (
                    <a
                      href={whatsAppHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onPointerDown={() => triggerHaptic()}
                      onClick={() => {
                        setIsWhatsAppOpen(false);
                        setIsContactOpen(false);
                      }}
                      className="ds-apple-btn-primary w-full mt-4 py-3.5 rounded-full font-semibold flex items-center justify-center"
                    >
                      Continue to WhatsApp
                    </a>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default Footer;

