import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useNotify } from "../components/Notifications";
import Icon from "../components/Icon";
import { CustomSectionEmbed } from "../components/CustomSectionEmbed";
import { useRegion } from "../components/RegionContext";
import { useLanguage } from "../components/LanguageContext";
import { useIllustrations } from "../lib/useIllustrations";
import { PixelImage } from "../components/ui/PixelImage";
import { CatalogPageSkeleton } from "../components/PageSkeletons";
import { getProductDisplayImage } from "../src/lib/phonePartsArt";
import { triggerHaptic } from "../lib/haptics";
import { APPLE_SPRING_DEFAULT, APPLE_SPRING_SNAPPY } from "../lib/shoppingRoute";

const Wishlist: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();
  const shouldReduceMotion = useReducedMotion();
  const { formatPrice } = useRegion();
  const { t } = useLanguage();
  const illustrations = useIllustrations();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "users", auth.currentUser.uid, "wishlist"),
      orderBy("addedAt", "desc"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const removeFromWishlist = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic("warning");
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, "users", auth.currentUser.uid, "wishlist", id));
      notify("Removed from wishlist", "info");
    } catch {
      notify("Failed to remove item", "error");
    }
  };

  if (loading) return <CatalogPageSkeleton />;

  return (
    <div className="w-full bg-[#F5F5F7] dark:bg-black min-h-screen pb-[120px] md:pb-10">
      <div className="px-4 sm:px-6 md:px-12 py-8 sm:py-10 max-w-7xl mx-auto">
        {!auth.currentUser ? (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0.16 } : APPLE_SPRING_DEFAULT}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-20 h-20 bg-white dark:bg-[#1C1C1E] rounded-[22px] flex items-center justify-center mb-6 border border-black/[0.06] dark:border-white/[0.1] shadow-xs">
              <Icon
                name="lock"
                className="text-2xl text-[#6E6E73] dark:text-[#98989D]"
              />
            </div>
            <h2 className="text-xl font-bold mb-2 tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
              {t('Sign In Required') || 'Sign In Required'}
            </h2>
            <p className="text-sm font-medium text-[#6E6E73] dark:text-[#98989D] mb-8 max-w-xs mx-auto leading-relaxed">
              {t('Please login to view and manage your saved tech essentials.') || 'Please login to view and manage your saved tech essentials.'}
            </p>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                navigate("/auth-selector");
              }}
              className="px-8 py-3.5 bg-[#0071E3] dark:bg-[#0A84FF] hover:bg-[#0077ED] dark:hover:bg-[#1E8EFF] text-white rounded-full font-semibold text-sm active:scale-[0.97] transition-all flex items-center mx-auto cursor-pointer shadow-xs"
            >
              <span>{t('Sign In Now') || 'Sign In Now'}</span>
            </button>
          </motion.div>
        ) : items.length === 0 ? (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            transition={shouldReduceMotion ? { duration: 0.16 } : APPLE_SPRING_DEFAULT}
            className="flex flex-col items-center justify-center py-28 text-center"
          >
            {illustrations.emptyWishlist ? (
              <div className="w-48 h-48 mx-auto mb-6 rounded-[22px] overflow-hidden">
                <img src={illustrations.emptyWishlist} alt="Empty Wishlist" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-white dark:bg-[#1C1C1E] rounded-[22px] flex items-center justify-center mb-6 border border-black/[0.06] dark:border-white/[0.1] shadow-xs">
                <Icon
                  name="heart"
                  className="text-2xl text-[#6E6E73] dark:text-[#98989D]"
                />
              </div>
            )}
            <p className="text-sm font-medium text-[#6E6E73] dark:text-[#98989D]">
              {t('Nothing saved yet') || 'Nothing saved yet'}
            </p>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                navigate("/");
              }}
              className="mt-7 px-8 py-3.5 bg-[#0071E3] dark:bg-[#0A84FF] hover:bg-[#0077ED] dark:hover:bg-[#1E8EFF] text-white rounded-full font-semibold text-sm active:scale-[0.97] transition-all cursor-pointer shadow-xs"
            >
              {t('Start Exploring') || 'Start Exploring'}
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.div
                  layout={!shouldReduceMotion}
                  key={item.id}
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                  transition={shouldReduceMotion ? { duration: 0.16 } : APPLE_SPRING_SNAPPY}
                  onClick={() => {
                    triggerHaptic("light");
                    navigate(`/product/${item.productId}`);
                  }}
                  className="group cursor-pointer relative bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.1] p-2.5 md:p-3 rounded-[22px] hover:border-black/[0.14] dark:hover:border-white/[0.18] active:scale-[0.98] transition-all shadow-xs"
                >
                  <div className="aspect-[4/5] flex items-center justify-center bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-2xl mb-3 overflow-hidden relative">
                    <PixelImage
                      src={getProductDisplayImage(item)}
                      className="w-full h-full bg-transparent"
                      imgClassName="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500 ease-out mix-blend-multiply dark:mix-blend-normal"
                      alt={item.name}
                    />
                    <button
                      type="button"
                      onClick={(e) => removeFromWishlist(item.id, e)}
                      aria-label="Remove from wishlist"
                      className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-md text-[#FF3B30] rounded-full shadow-xs hover:bg-[#FF3B30]/10 transition-all z-10 sm:opacity-0 sm:group-hover:opacity-100 active:scale-95 cursor-pointer"
                    >
                      <Icon name="trash-alt" className="text-[11px]" />
                    </button>
                  </div>
                  <div className="px-1 pb-1">
                    <h4 className="font-bold text-xs md:text-sm truncate mb-1 tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {item.name || "Unknown Product"}
                    </h4>
                    <p className="text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                      {item.price != null ? formatPrice(item.price) : "Price not available"}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        <CustomSectionEmbed location="wishlist_bottom" />
      </div>
    </div>
  );
};

export default Wishlist;
