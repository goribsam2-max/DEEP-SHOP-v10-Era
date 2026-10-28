import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { PhoneCall, MessageCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from './LanguageContext';

export const Footer = () => {
  const [settings, setSettings] = useState<any>({
    instagramUrl: 'https://www.instagram.com/deep.shop.official',
    tiktokUrl: '',
    footerLogo: '',
    footerPaymentLogos: []
  });
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [waReason, setWaReason] = useState('Order Issue');
  const [customReason, setCustomReason] = useState('');
  const { t } = useLanguage();

  const waNumber = "17247648185"; // without + for link

  useEffect(() => {
    // 1. Subscribe to payments settings
    const unsubPayments = onSnapshot(doc(db, 'settings', 'payments'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings((prev: any) => ({
          ...prev,
          instagramUrl: data.instagramUrl || prev.instagramUrl,
          tiktokUrl: data.tiktokUrl || prev.tiktokUrl,
          footerLogo: data.footerLogo || data.logoUrl || prev.footerLogo,
          footerPaymentLogos: data.footerPaymentLogos || []
        }));
      }
    });

    // 2. Subscribe to SEO settings for logo/appIconUrl
    const unsubSeo = onSnapshot(doc(db, 'settings', 'seo'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const seoLogo = data.logoUrl || data.appIconUrl || data.faviconUrl || data.metaImage;
        if (seoLogo) {
          setSettings((prev: any) => ({
            ...prev,
            footerLogo: prev.footerLogo ? prev.footerLogo : seoLogo,
            seoFallbackLogo: seoLogo
          }));
        }
      }
    });

    // 3. Subscribe to Platform settings for logoUrl
    const unsubPlatform = onSnapshot(doc(db, 'settings', 'platform'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const platLogo = data.footerLogo || data.logoUrl;
        if (platLogo) {
          setSettings((prev: any) => ({
            ...prev,
            footerLogo: platLogo
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

  const handleWhatsAppSend = () => {
    const finalReason = waReason === 'Other' ? customReason : waReason;
    const message = encodeURIComponent(`Hi, I need help regarding: ${finalReason}`);
    window.open(`https://wa.me/${waNumber}?text=${message}`, '_blank');
    setIsWhatsAppOpen(false);
    setIsContactOpen(false);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <style>{`
        :root {
          --wave-color-1: rgba(28, 219, 94, 0.2);
          --wave-color-2: rgba(28, 219, 94, 0.4);
          --wave-color-3: rgba(28, 219, 94, 0.6);
          --wave-color-4: #1cdb5e;
        }
        .dark {
          --wave-color-1: rgba(14, 107, 46, 0.2);
          --wave-color-2: rgba(14, 107, 46, 0.4);
          --wave-color-3: rgba(14, 107, 46, 0.6);
          --wave-color-4: #0e6b2e;
        }

        .mainF {
          padding-top: 32px;
          padding-bottom: 24px;
          margin-top: 40px;
          margin-left: 12px;
          margin-right: 12px;
          margin-bottom: 84px;
          border-radius: 20px;
          box-shadow: 0 8px 30px rgba(0,0,0,.08);
          background: #fffdfc;
          font-size: 97%;
          line-height: 1.8em;
          color: #08102b;
          border: 1px solid #e6e6e6;
          overflow: hidden;
          position: relative;
          z-index: 10;
        }
        .dark .mainF {
          background: #1e1e1e;
          color: #fffdfc;
          border-color: #27272a;
          box-shadow: 0 8px 30px rgba(0,0,0,.3);
        }
        @media (min-width: 768px) {
          .mainF {
            margin-left: 24px;
            margin-right: 24px;
            margin-bottom: 24px;
          }
        }

        .wvC {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          z-index: 0;
          pointer-events: none;
        }
        .wvS {
          position: relative;
          width: 100%;
          height: 180px;
        }
        @media (min-width: 768px) {
          .wvS { height: 250px; }
        }
        .waves {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        .wvH {
          position: relative;
          height: 20px;
          background: var(--wave-color-4);
        }
        @media (min-width: 768px) {
          .wvH { height: 40px; }
        }
        
        .parallax > use {
          animation: move-forever 25s cubic-bezier(.55,.5,.45,.5) infinite;
        }
        .parallax > use:nth-child(1) {
          animation-delay: -2s;
          animation-duration: 7s;
          fill: var(--wave-color-1);
        }
        .parallax > use:nth-child(2) {
          animation-delay: -3s;
          animation-duration: 10s;
          fill: var(--wave-color-2);
        }
        .parallax > use:nth-child(3) {
          animation-delay: -4s;
          animation-duration: 13s;
          fill: var(--wave-color-3);
        }
        .parallax > use:nth-child(4) {
          animation-delay: -5s;
          animation-duration: 20s;
          fill: var(--wave-color-4);
        }
        @keyframes move-forever {
          0% {
            transform: translate3d(-90px,0,0);
          }
          100% { 
            transform: translate3d(85px,0,0);
          }
        }

        .mainF {
          padding-bottom: 24px;
        }
        @media (min-width: 768px) {
          .mainF {
            padding-bottom: 70px;
          }
        }

        .fotM {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 15px;
        }
        .secIn { margin: 0 auto; padding-left: 20px; padding-right: 20px; max-width: 1280px; width: 100%; }

        .abtU { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .abtT { display: flex; align-items: center; gap: 8px; justify-content: center; }
        .abtL { position: relative; width: 32px; height: 32px; background: rgba(0,0,0,.05); border-radius: 6px; overflow: hidden; }
        .dark .abtL { background: rgba(255,255,255,.05); }
        .abtI { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .abtT h2 { color: inherit; font-size: 1.1rem; margin: 0; font-weight: 800; }
        .abtD { font-size: 11px; opacity: 0.6; max-width: 480px; margin: 4px 0 0; line-height: 1.4; }

        .fotS { display: flex; align-items: center; justify-content: center; gap: 10px; list-style: none; padding: 0; margin: 5px 0; }
        .fotS li > * { color: inherit; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: rgba(0,0,0,.03); border: 1px solid rgba(0,0,0,.06); border-radius: 8px; transition: all 0.2s; text-decoration: none; }
        .dark .fotS li > * { background: rgba(255,255,255,.03); border-color: rgba(255,255,255,.06); }
        .fotS li > a:hover { transform: translateY(-2px); border-color: #EF8020; color: #EF8020; }

        .footer-links-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 8px 14px;
          font-size: 11px;
          font-weight: 600;
          opacity: 0.85;
          margin: 10px 0;
          max-width: 800px;
        }
        .footer-links-row a {
          color: inherit;
          text-decoration: none;
          transition: color 0.2s;
        }
        .footer-links-row a:hover {
          color: #EF8020;
          text-decoration: underline;
        }
        .footer-links-row .dot {
          opacity: 0.4;
          font-size: 9px;
          user-select: none;
        }

        .fotB { width: 100%; border-top: 1px solid rgba(0,0,0,.05); dark:border-top-color: rgba(255,255,255,.05); padding-top: 15px; margin-top: 10px; }
        .fotC { display: flex; justify-content: center; align-items: center; width: 100%; font-size: 11px; opacity: 0.7; }
      `}</style>
      <div className="relative w-full overflow-hidden">
        {/* Animated Wave Background at the very bottom of the screen */}
        <div className="wvC">
          <div className="wvS">
            <svg className="waves" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 24 150 28" preserveAspectRatio="none" shapeRendering="auto">
              <defs>
                <path id="gentle-wave-bottom" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" />
              </defs>
              <g className="parallax">
                <use xlinkHref="#gentle-wave-bottom" x="48" y="0" />
                <use xlinkHref="#gentle-wave-bottom" x="48" y="3" />
                <use xlinkHref="#gentle-wave-bottom" x="48" y="5" />
                <use xlinkHref="#gentle-wave-bottom" x="48" y="7" />
              </g>
            </svg>
          </div>
          <div className="wvH"></div>
        </div>

      <footer className="mainF">
        <div className="secIn">
          {/* Desktop Layout (md and up) */}
          <div className="hidden md:block py-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-zinc-200/80 dark:border-zinc-800/80">
              {/* Col 1: Brand Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm flex items-center justify-center">
                    <img src={settings.footerLogo || "/favicon.png"} alt="DEEP SHOP" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h2 className="text-base font-black tracking-tight text-zinc-900 dark:text-white">DEEP SHOP</h2>
                    <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Premium Tech Hub</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs">
                  Border cross devices, border cross products & tech marketplace. Quality guaranteed.
                </p>
                {/* Social Media Row */}
                <div className="flex items-center gap-2 pt-1">
                  <a aria-label="Instagram" href="https://www.instagram.com/deep.shop.official" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-rose-500/10 hover:text-rose-500 dark:hover:text-rose-400 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center transition-all">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                  <a aria-label="Telegram" href="https://t.me/+jBB7zRRjuF5hYWY1" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-sky-500/10 hover:text-sky-500 dark:hover:text-sky-400 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center transition-all">
                    <svg className="w-4 h-4 fill-current text-[#229ED9]" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                    </svg>
                  </a>
                  <a aria-label="WhatsApp" href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-emerald-500/10 hover:text-emerald-500 dark:hover:text-emerald-400 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center transition-all">
                    <svg className="w-4 h-4 fill-current text-emerald-500" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                    </svg>
                  </a>
                </div>
              </div>

              {/* Col 2: Navigation */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 mb-3">Marketplace</h3>
                <ul className="space-y-2 text-xs">
                  <li><Link to="/" className="text-zinc-600 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 transition">Home Marketplace</Link></li>
                  <li><Link to="/all-products" className="text-zinc-600 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 transition">All Products</Link></li>
                  <li><Link to="/news-hub" className="text-zinc-600 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 transition">News Hub & Feed</Link></li>
                  <li><Link to="/messages" className="text-zinc-600 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 transition">Direct Chat Support</Link></li>
                </ul>
              </div>

              {/* Col 3: Support */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 mb-3">Customer Care</h3>
                <ul className="space-y-2 text-xs">
                  <li><Link to="/faq" className="text-zinc-600 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 transition">Frequently Asked Questions</Link></li>
                  <li><Link to="/help-center" className="text-zinc-600 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 transition">Help Center</Link></li>
                  <li><Link to="/my-tickets" className="text-zinc-600 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 transition">Support Tickets</Link></li>
                  <li><Link to="/contact" className="text-zinc-600 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 transition">Contact Us</Link></li>
                  <li><button onClick={() => setIsContactOpen(true)} className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold text-left">24/7 Helpline</button></li>
                </ul>
              </div>

              {/* Col 4: Policies */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 mb-3">Legal & Info</h3>
                <ul className="space-y-2 text-xs">
                  <li><Link to="/privacy" className="text-zinc-600 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 transition">Privacy Policy</Link></li>
                  <li><Link to="/terms" className="text-zinc-600 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 transition">Terms of Service</Link></li>
                  <li><Link to="/refund-policy" className="text-zinc-600 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 transition">Refund & Return Policy</Link></li>
                  <li><Link to="/shipping-policy" className="text-zinc-600 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 transition">Shipping Policy</Link></li>
                  <li><Link to="/about" className="text-zinc-600 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 transition">About DEEP SHOP</Link></li>
                </ul>
              </div>
            </div>

            {/* Desktop Bottom Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-6 text-xs text-zinc-500 dark:text-zinc-400">
              <p>© {new Date().getFullYear()} DEEP SHOP. All rights reserved.</p>
              <div className="flex items-center gap-4 mt-2 sm:mt-0">
                <span className="inline-flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Verified Store Platform
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Layout (sm & down) */}
          <div className="block md:hidden py-4 space-y-6">
            {/* Header & Logo Card */}
            <div className="flex items-center justify-between bg-zinc-100/60 dark:bg-zinc-800/60 p-3.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xs flex items-center justify-center">
                  <img src={settings.footerLogo || "/favicon.png"} alt="DEEP SHOP" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h2 className="text-sm font-black tracking-tight text-zinc-900 dark:text-white leading-tight">DEEP SHOP</h2>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Border Cross Tech Hub</p>
                </div>
              </div>
              <button 
                onClick={() => setIsContactOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                Helpline
              </button>
            </div>

            {/* Social Buttons Dock */}
            <div className="grid grid-cols-3 gap-2">
              <a href="https://www.instagram.com/deep.shop.official" target="_blank" rel="noopener noreferrer" className="h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-rose-500/10 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition">
                <svg className="w-4 h-4 fill-current text-rose-500" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                Instagram
              </a>
              <a href="https://t.me/+jBB7zRRjuF5hYWY1" target="_blank" rel="noopener noreferrer" className="h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-sky-500/10 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition">
                <svg className="w-4 h-4 fill-current text-[#229ED9]" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
                Telegram
              </a>
              <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" className="h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-emerald-500/10 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition">
                <svg className="w-4 h-4 fill-current text-emerald-500" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
                WhatsApp
              </a>
            </div>

            {/* Quick Links Grid (2 columns) */}
            <div className="grid grid-cols-2 gap-2 text-xs font-medium">
              <Link to="/all-products" className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between transition">
                <span>Products</span>
                <span className="text-zinc-400">→</span>
              </Link>
              <Link to="/faq" className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between transition">
                <span>FAQs</span>
                <span className="text-zinc-400">→</span>
              </Link>
              <Link to="/help-center" className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between transition">
                <span>Help Center</span>
                <span className="text-zinc-400">→</span>
              </Link>
              <Link to="/privacy" className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between transition">
                <span>Privacy & Terms</span>
                <span className="text-zinc-400">→</span>
              </Link>
            </div>

            {/* Copyright */}
            <div className="text-center pt-2">
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">© {new Date().getFullYear()} DEEP SHOP. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
      </div>

      {/* Contact Options Popup */}
      {isContactOpen && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 sm:p-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsContactOpen(false)}>
          <div className="bg-white dark:bg-zinc-900 w-full sm:max-w-sm rounded-[24px] p-6 shadow-2xl transform transition-all border border-zinc-200 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">Contact Us</h3>
              <button onClick={() => setIsContactOpen(false)} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <a href="tel:+17247648185" className="w-full flex items-center gap-4 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition text-blue-600 dark:text-blue-400">
                <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center shadow-sm">
                  <PhoneCall className="w-5 h-5 text-[#1976d2] dark:text-[#8775f5]" />
                </div>
                <div className="text-left">
                  <p className="font-bold">Direct Call</p>
                  <p className="text-xs opacity-80">+1 (724) 764-8185</p>
                </div>
              </a>

              <button onClick={() => setIsWhatsAppOpen(true)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition text-emerald-600 dark:text-emerald-400">
                <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center shadow-sm">
                  <MessageCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="text-left">
                  <p className="font-bold">WhatsApp</p>
                  <p className="text-xs opacity-80">Message us instantly</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Reason Popup */}
      {isWhatsAppOpen && (
        <div className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center p-4 sm:p-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsWhatsAppOpen(false)}>
          <div className="bg-white dark:bg-zinc-900 w-full sm:max-w-sm rounded-[24px] p-6 shadow-2xl transform transition-all border border-zinc-200 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">What do you need help with?</h3>
              <button onClick={() => setIsWhatsAppOpen(false)} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {['Order Issue', 'Product Inquiry', 'Delivery Status', 'Return/Refund', 'Other'].map(reason => (
                <label key={reason} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${waReason === reason ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
                  <input type="radio" name="wareason" value={reason} checked={waReason === reason} onChange={(e) => setWaReason(e.target.value)} className="text-emerald-500 focus:ring-emerald-500" />
                  <span className={`text-sm font-medium ${waReason === reason ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'}`}>{reason}</span>
                </label>
              ))}

              {waReason === 'Other' && (
                <textarea 
                  placeholder="Please specify your reason..."
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  className="w-full mt-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 dark:text-white"
                  rows={3}
                />
              )}

              <button 
                onClick={handleWhatsAppSend}
                disabled={waReason === 'Other' && !customReason.trim()}
                className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Continue to WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

