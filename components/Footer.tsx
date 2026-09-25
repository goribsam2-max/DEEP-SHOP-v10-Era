import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PhoneCall, MessageCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from './LanguageContext';

export const Footer = () => {
  const [settings, setSettings] = useState<any>({ instagramUrl: 'https://www.instagram.com/deep.shop.official', tiktokUrl: '', footerLogo: '', footerPaymentLogos: [] });
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [waReason, setWaReason] = useState('Order Issue');
  const [customReason, setCustomReason] = useState('');
  const { t } = useLanguage();

  const waNumber = "17247648185"; // without + for link

  useEffect(() => {
    getDoc(doc(db, 'settings', 'payments')).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings({
          instagramUrl: data.instagramUrl || 'https://www.instagram.com/deep.shop.official',
          tiktokUrl: data.tiktokUrl || '',
          footerLogo: data.footerLogo || '',
          footerPaymentLogos: data.footerPaymentLogos || []
        });
      }
    });
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
        <div className="fotM secIn">
          <div className="abtU">
            <div className="abtT">
              <div className="abtL">
                <img src={settings.footerLogo || "/favicon.png"} alt="DEEP SHOP" className="abtI" />
              </div>
              <h2>DEEP SHOP</h2>
            </div>
            <p className="abtD">border cross devices, border cross products, illegal products buy sell site</p>
          </div>

          <ul className="fotS">
            <li>
              <a aria-label="Instagram" href="https://www.instagram.com/deep.shop.official" target="_blank" rel="noopener noreferrer" title="@deep.shop.official">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
                  <defs>
                    <radialGradient id="igGrad" cx="0.2" cy="1" r="1">
                      <stop offset="0%" stopColor="#fdf497"/>
                      <stop offset="5%" stopColor="#fdf497"/>
                      <stop offset="45%" stopColor="#fd5949"/>
                      <stop offset="60%" stopColor="#d6249f"/>
                      <stop offset="90%" stopColor="#285AEB"/>
                    </radialGradient>
                  </defs>
                  <path fill="url(#igGrad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </li>
            {settings.tiktokUrl && (
              <li>
                <a aria-label="TikTok" href={settings.tiktokUrl} target="_blank" rel="noopener noreferrer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2m5.939 7.713v.646a.37.37 0 0 1-.38.37a5.364 5.364 0 0 1-2.903-1.108v4.728a3.938 3.938 0 0 1-1.18 2.81a4.011 4.011 0 0 1-2.87 1.17a4.103 4.103 0 0 1-2.862-1.17a3.98 3.98 0 0 1-1.026-3.805c.159-.642.48-1.232.933-1.713a3.58 3.58 0 0 1 2.79-1.313h.82v1.703a.348.348 0 0 1-.39.348a1.918 1.918 0 0 0-1.23 3.631c.27.155.572.246.882.267c.24.01.48-.02.708-.092a1.928 1.928 0 0 0 1.313-1.816V5.754a.359.359 0 0 1 .359-.36h1.415a.359.359 0 0 1 .359.34a3.303 3.303 0 0 0 1.282 2.245a3.25 3.25 0 0 0 1.641.636a.37.37 0 0 1 .338.35z"/></svg>
                </a>
              </li>
            )}
            <li>
              <a aria-label="Whatsapp" href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 256 258"><defs><linearGradient id="logosWhatsappIcon0" x1="50%" x2="50%" y1="100%" y2="0%"><stop offset="0%" stopColor="#1FAF38"/><stop offset="100%" stopColor="#60D669"/></linearGradient><linearGradient id="logosWhatsappIcon1" x1="50%" x2="50%" y1="100%" y2="0%"><stop offset="0%" stopColor="#F9F9F9"/><stop offset="100%" stopColor="#FFF"/></linearGradient></defs><path fill="url(#logosWhatsappIcon0)" d="M5.463 127.456c-.006 21.677 5.658 42.843 16.428 61.499L4.433 252.697l65.232-17.104a122.994 122.994 0 0 0 58.8 14.97h.054c67.815 0 123.018-55.183 123.047-123.01c.013-32.867-12.775-63.773-36.009-87.025c-23.23-23.25-54.125-36.061-87.043-36.076c-67.823 0-123.022 55.18-123.05 123.004"/><path fill="url(#logosWhatsappIcon1)" d="M1.07 127.416c-.007 22.457 5.86 44.38 17.014 63.704L0 257.147l67.571-17.717c18.618 10.151 39.58 15.503 60.91 15.511h.055c70.248 0 127.434-57.168 127.464-127.423c.012-34.048-13.236-66.065-37.3-90.15C194.633 13.286 162.633.014 128.536 0C58.276 0 1.099 57.16 1.071 127.416Zm40.24 60.376l-2.523-4.005c-10.606-16.864-16.204-36.352-16.196-56.363C22.614 69.029 70.138 21.52 128.576 21.52c28.3.012 54.896 11.044 74.9 31.06c20.003 20.018 31.01 46.628 31.003 74.93c-.026 58.395-47.551 105.91-105.943 105.91h-.042c-19.013-.01-37.66-5.116-53.922-14.765l-3.87-2.295l-40.098 10.513l10.706-39.082Z"/><path fill="#FFFFFF" d="M96.678 74.148c-2.386-5.303-4.897-5.41-7.166-5.503c-1.858-.08-3.982-.074-6.104-.074c-2.124 0-5.575.799-8.492 3.984c-2.92 3.188-11.148 10.892-11.148 26.561c0 15.67 11.413 30.813 13.004 32.94c1.593 2.123 22.033 35.307 54.405 48.073c26.904 10.609 32.379 8.499 38.218 7.967c5.84-.53 18.844-7.702 21.497-15.139c2.655-7.436 2.655-13.81 1.859-15.142c-.796-1.327-2.92-2.124-6.105-3.716c-3.186-1.593-18.844-9.298-21.763-10.361c-2.92-1.062-5.043-1.592-7.167 1.597c-2.124 3.184-8.223 10.356-10.082 12.48c-1.857 2.129-3.716 2.394-6.9.801c-3.187-1.598-13.444-4.957-25.613-15.806c-9.468-8.442-15.86-18.867-17.718-22.056c-1.858-3.184-.199-4.91 1.398-6.497c1.431-1.427 3.186-3.719 4.78-5.578c1.588-1.86 2.118-3.187 3.18-5.311c1.063-2.126.531-3.986-.264-5.579c-.798-1.593-6.987-17.343-9.819-23.64"/></svg>
              </a>
            </li>
          </ul>

          <div className="footer-links-row">
            <Link to="/">Home</Link>
            <span className="dot">•</span>
            <Link to="/all-products">All Products</Link>
            <span className="dot">•</span>
            <Link to="/faq">FAQs</Link>
            <span className="dot">•</span>
            <Link to="/help-center">Help Center</Link>
            <span className="dot">•</span>
            <Link to="/contact">Contact Us</Link>
            <span className="dot">•</span>
            <Link to="/my-tickets">Tickets</Link>
            <span className="dot">•</span>
            <Link to="/privacy">Privacy</Link>
            <span className="dot">•</span>
            <Link to="/terms">Terms</Link>
            <span className="dot">•</span>
            <Link to="/refund-policy">Refund</Link>
            <span className="dot">•</span>
            <Link to="/shipping-policy">Shipping</Link>
            <span className="dot">•</span>
            <Link to="/about">About</Link>
            <span className="dot">•</span>
            <button className="hover:underline" onClick={() => setIsContactOpen(true)}>Helpline</button>
          </div>

          <div className="fotB">
            <div className="fotC">
              <span className="credit">© {new Date().getFullYear()} DEEP SHOP. All rights reserved.</span>
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

