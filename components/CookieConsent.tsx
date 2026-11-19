import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { APPLE_SPRING_DEFAULT, isAppleShoppingRoute } from '../lib/shoppingRoute';
import { triggerHaptic } from '../lib/haptics';

const BOT_USER_AGENT_REGEX =
  /bot|crawl|spider|slurp|facebookexternalhit|facebot|whatsapp|telegram|twitterbot|discordbot|linkedinbot|slackbot|pinterest|skype|vkshare|embedly|quora|outbrain|W3C_Validator|Lighthouse|HeadlessChrome|Preview/i;

export const CookieConsent: React.FC = () => {
  const [showConsent, setShowConsent] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const isAppleShop = isAppleShoppingRoute(location.pathname);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (BOT_USER_AGENT_REGEX.test(navigator.userAgent || '')) {
      setShowConsent(false);
      return;
    }
    const p = location.pathname || '';
    if (
      p.startsWith('/news-hub/post/') ||
      p.startsWith('/news-hub/share/') ||
      p.startsWith('/news/') ||
      p.startsWith('/scam/') ||
      p.startsWith('/product/')
    ) {
      setShowConsent(false);
      return;
    }

    const isAccepted = localStorage.getItem('vibe_cookie_consent_accepted');
    if (!isAccepted) {
      const timer = setTimeout(() => {
        setShowConsent(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  const handleAccept = () => {
    triggerHaptic('light');
    localStorage.setItem('vibe_cookie_consent_accepted', 'true');
    setShowConsent(false);
  };

  const handleMoreDetails = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerHaptic('light');
    navigate('/cookie-policy');
  };

  return (
    <AnimatePresence>
      {showConsent && (
        <motion.div
          role="region"
          aria-label="Site preferences"
          data-nosnippet="true"
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.97 }}
          transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_DEFAULT}
          className={`fixed left-4 right-4 bottom-24 md:left-auto md:right-6 md:bottom-6 z-[999999] max-w-[400px] rounded-[24px] p-5 flex flex-col gap-3.5 ${
            isAppleShop
              ? 'ds-apple-portal ds-apple-popover'
              : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl text-zinc-900 dark:text-white'
          }`}
        >
          <div className="flex items-start gap-3 text-left">
            <div className="w-9 h-9 rounded-2xl bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="ds-apple-display text-[14px] font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                Cookie Preferences
              </div>
              <p className="text-[12.5px] leading-[1.48] text-[#6e6e73] dark:text-[#98989d]">
                We use cookies to remember your preferences, analyze traffic, and deliver a smoother experience.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onPointerDown={() => triggerHaptic('light')}
              onClick={handleAccept}
              className="ds-apple-btn-primary px-5 min-h-[38px] rounded-full text-[13px] font-semibold active:scale-[0.97] transition-transform cursor-pointer"
            >
              Accept
            </button>
            <a
              href="/cookie-policy"
              onClick={handleMoreDetails}
              title="Read Cookie Policy"
              aria-label="Read our complete Cookie Policy"
              className="ds-apple-btn-secondary px-4 min-h-[38px] rounded-full text-[13px] font-semibold inline-flex items-center justify-center active:scale-[0.97] transition-transform cursor-pointer"
            >
              Cookie Policy
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
