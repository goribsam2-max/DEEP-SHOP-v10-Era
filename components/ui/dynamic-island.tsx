import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CheckCircle, ShoppingBag, Bell, X, Info, AlertCircle } from 'lucide-react';
import { APPLE_SPRING_SNAPPY } from '../../lib/shoppingRoute';
import { triggerHaptic } from '../../lib/haptics';

export type IslandState = 'idle' | 'cart_add' | 'notification' | 'success' | 'alert' | 'error';

export interface IslandData {
  title: string;
  subtitle?: string;
  image?: string;
  state: IslandState;
  duration?: number;
}

class IslandController {
  private static listeners: ((data: IslandData | null) => void)[] = [];

  static subscribe(listener: (data: IslandData | null) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  static call(data: IslandData) {
    this.listeners.forEach(l => l(data));
  }

  static close() {
    this.listeners.forEach(l => l(null));
  }
}

export const useIsland = () => {
  const [active, setActive] = useState(false);
  useEffect(() => {
    return IslandController.subscribe((newData) => {
      setActive(newData !== null);
    });
  }, []);
  return active;
};

export const showIsland = (data: IslandData) => {
  IslandController.call(data);
};

export const hideIsland = () => {
  IslandController.close();
};

export const DynamicIsland = () => {
  const [data, setData] = useState<IslandData | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    return IslandController.subscribe((newData) => {
      setData(newData);
      if (timeout) clearTimeout(timeout);

      if (newData && newData.state !== 'idle') {
        timeout = setTimeout(() => {
          hideIsland();
        }, newData.duration || 4000);
      }
    });
  }, []);

  return (
    <div className="fixed top-2 md:top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none flex justify-center items-start">
      <AnimatePresence>
        {data && (
          <motion.div
            layout={!prefersReducedMotion}
            key="island-container"
            initial={prefersReducedMotion ? { opacity: 0 } : { width: 18, height: 18, opacity: 0, borderRadius: 18 }}
            animate={{
              width: 'auto',
              height: 'auto',
              opacity: 1,
              borderRadius: 36,
            }}
            exit={prefersReducedMotion ? { opacity: 0 } : { width: 18, height: 18, opacity: 0, borderRadius: 18, transition: { duration: 0.18, ease: 'easeInOut' } }}
            transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_SNAPPY}
            className="bg-[#1C1C1E]/95 backdrop-blur-2xl overflow-hidden pointer-events-auto border border-white/12 origin-center flex items-center justify-center shadow-2xl min-w-[18px] min-h-[18px]"
          >
            <AnimatePresence mode="wait">
              <motion.div
                layout={!prefersReducedMotion}
                key={data.state + data.title}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1, transition: { delay: 0.05, duration: 0.22 } }}
                exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.14 } }}
                className="px-3 py-1.5 flex items-center gap-2.5 w-max max-w-[90vw] md:max-w-[400px]"
              >
                <motion.div layout={!prefersReducedMotion} className="flex-shrink-0">
                  {data.image ? (
                    <img src={data.image} alt="" className="w-6 h-6 rounded-full object-cover border border-white/10" />
                  ) : data.state === 'cart_add' ? (
                    <div className="w-6 h-6 rounded-full bg-[#30D158]/20 flex items-center justify-center text-[#30D158]">
                      <ShoppingBag className="w-3.5 h-3.5" />
                    </div>
                  ) : data.state === 'success' ? (
                    <div className="w-6 h-6 rounded-full bg-[#30D158]/20 flex items-center justify-center text-[#30D158]">
                      <CheckCircle className="w-3.5 h-3.5" />
                    </div>
                  ) : data.state === 'error' ? (
                    <div className="w-6 h-6 rounded-full bg-[#FF453A]/20 flex items-center justify-center text-[#FF453A]">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </div>
                  ) : data.state === 'alert' ? (
                    <div className="w-6 h-6 rounded-full bg-[#FF9F0A]/20 flex items-center justify-center text-[#FF9F0A]">
                      <Info className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#0A84FF]/20 flex items-center justify-center text-[#0A84FF]">
                      <Bell className="w-3.5 h-3.5" />
                    </div>
                  )}
                </motion.div>

                <motion.div layout={!prefersReducedMotion} className="flex flex-col flex-1 overflow-hidden mr-1">
                  <motion.span layout={!prefersReducedMotion} className="text-[#F5F5F7] text-[13px] font-semibold tracking-tight truncate leading-tight">
                    {data.title}
                  </motion.span>
                  {data.subtitle && (
                    <motion.span layout={!prefersReducedMotion} className="text-[#98989D] text-[11px] font-medium tracking-tight truncate mt-0.5">
                      {data.subtitle}
                    </motion.span>
                  )}
                </motion.div>

                <motion.button
                  layout={!prefersReducedMotion}
                  onPointerDown={() => triggerHaptic('light')}
                  onClick={() => hideIsland()}
                  aria-label="Dismiss notification"
                  className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white active:scale-90 transition-all shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
