import { formatPrice } from "@/lib/utils";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles } from 'lucide-react';
import Icon from './Icon';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from './ui/status-badge';

const BoxPosition = "fixed bottom-24 md:bottom-10 left-4 md:left-10 z-[80]";

const MysteryBox: React.FC<{ products: any[] }> = ({ products }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [revealedProduct, setRevealedProduct] = useState<any>(null);
  const [discount, setDiscount] = useState(0);
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const state = JSON.parse(localStorage.getItem('vibe_mystery_box') || '{}');
      const today = new Date().toDateString();
      const lastPlayedDate = state.lastPlayed ? new Date(state.lastPlayed).toDateString() : null;
      
      if (lastPlayedDate !== today) {
        // Can play today
        setVisible(true);
      } else {
        // Already played today. Is there an active, unused win?
        if (state.result === 'win' && !state.used && state.expiresAt > Date.now()) {
          // Keep it hidden, as they already opened it. Or we can show a floating "Active Deal" icon!
          // But req says "auto hide hoy jabe 1 hour ar modde buy kore nile tahole instant hide hobe"
          // So once played, it hides.
          setVisible(false);
        } else {
          setVisible(false);
        }
      }
    } catch (e) {
      setVisible(true);
    }
  }, []);

  const handleOpen = () => {
    if (products.length === 0) return;
    setIsShaking(true);
    
    setTimeout(() => {
      setIsShaking(false);
      setIsOpen(true);
      
      const isWin = Math.random() > 0.3; // 70% chance to win
      let stateObj: any = { lastPlayed: Date.now(), result: 'lose' };
      
      if (isWin) {
        const randomProd = products[Math.floor(Math.random() * products.length)];
        const discPct = Math.floor(Math.random() * 6) + 5; // 5 to 10
        setRevealedProduct(randomProd);
        setDiscount(discPct);
        setResult('win');
        stateObj = {
          ...stateObj,
          result: 'win',
          productId: randomProd.id,
          discountPct: discPct,
          discountPrice: Math.floor(randomProd.price * (1 - discPct/100)),
          expiresAt: Date.now() + 60 * 60 * 1000,
          used: false
        };
      } else {
        setResult('lose');
      }
      
      localStorage.setItem('vibe_mystery_box', JSON.stringify(stateObj));
    }, 1500);
  };

  const handleClose = () => {
    setIsOpen(false);
    setVisible(false); // Hide after opening
  };

  if (products.length === 0 || !visible) return null;

  return (
    <>
      <motion.div 
        className={`${BoxPosition} cursor-pointer group flex flex-col items-center justify-center`}
        whileHover={{ scale: 1.05 }}
        onClick={handleOpen}
      >
          <motion.div 
            className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-purple-600 rounded-full shadow-[0_10px_30px_rgba(147,51,234,0.4)] flex items-center justify-center relative border-2 border-white"
            animate={{ rotate: isShaking ? [0, -15, 15, -15, 15, 0] : 0 }}
            transition={{ duration: 0.5, repeat: isShaking ? Infinity : 0 }}
          >
             <div className="absolute inset-0 bg-zinc-50 dark:bg-zinc-900/20 rounded-full animate-ping opacity-50"></div>
             <Icon name="gift" className="text-lg text-white  z-10" />
          </motion.div>
          <div className="mt-1.5 shadow-sm">
            <StatusBadge leftIcon={Gift} leftLabel="Mystery Box" />
          </div>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] ds-liquid-backdrop flex items-center justify-center p-5"
            onClick={handleClose}
          >
            <motion.div 
              role="dialog"
              aria-modal="true"
              initial={{ scale: 0.91, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.85 }}
              onClick={e => e.stopPropagation()}
              className="ds-liquid-glass-popup px-6 pt-7 pb-6 max-w-[356px] w-full relative overflow-hidden text-left"
            >
              {result === 'win' && revealedProduct ? (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <StatusBadge leftIcon={Sparkles} leftLabel="You Unlocked a Deal!" status="success" />
                  </div>

                  <div className="relative w-36 h-36 mx-auto mb-5 bg-white/70 dark:bg-white/10 rounded-3xl p-4 border border-white/60 dark:border-white/15 group">
                    <img src={revealedProduct.image} alt={revealedProduct.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute -bottom-2.5 -right-2.5 bg-[#0074f8] text-white w-12 h-12 rounded-full flex flex-col items-center justify-center font-bold shadow-lg border-2 border-white rotate-6">
                      <span className="text-[9px] leading-none">EXTRA</span>
                      <span className="text-xs leading-none">{discount}%</span>
                    </div>
                  </div>

                  <h3 className="ds-liquid-popup-title font-bold text-[19px] leading-[1.28] tracking-[-0.02em]">{revealedProduct.name}</h3>
                  
                  <div className="flex items-center gap-2.5 mt-2">
                    <span className="text-lg font-bold text-[#0074f8]">{formatPrice(Math.floor(revealedProduct.price * (1 - discount/100)))}</span>
                    <span className="text-xs font-semibold text-zinc-400 line-through">{formatPrice(revealedProduct.price)}</span>
                  </div>
                  <p className="ds-liquid-popup-desc text-[14px] mt-1.5">Special deal reserved for the next 1 hour.</p>

                  <div className="mt-6 flex flex-col gap-3">
                    <button 
                      type="button"
                      onClick={() => {
                        handleClose();
                        navigate(`/product/${revealedProduct.id}`);
                      }}
                      className="ds-liquid-btn-primary w-full min-h-[48px] px-5 rounded-full font-semibold text-[16px] tracking-[-0.01em] active:scale-[0.985] transition-transform cursor-pointer"
                    >
                      Claim offer now
                    </button>
                    <button 
                      type="button"
                      onClick={handleClose}
                      className="ds-liquid-btn-secondary w-full min-h-[48px] px-5 rounded-full font-semibold text-[16px] tracking-[-0.01em] active:scale-[0.985] transition-transform cursor-pointer"
                    >
                      Maybe later
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <h3 className="ds-liquid-popup-title font-bold text-[20px] leading-[1.28] tracking-[-0.02em]">Better luck next time</h3>
                  <p className="ds-liquid-popup-desc text-[15.5px] leading-[1.44] mt-2.5">You didn&apos;t unlock an instant deal today. Check back tomorrow for another spin!</p>
                  <div className="mt-6 flex flex-col gap-3">
                    <button 
                      type="button"
                      onClick={handleClose}
                      className="ds-liquid-btn-primary w-full min-h-[48px] px-5 rounded-full font-semibold text-[16px] tracking-[-0.01em] active:scale-[0.985] transition-transform cursor-pointer"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MysteryBox;
