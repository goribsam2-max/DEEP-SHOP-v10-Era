import { formatPrice } from "@/lib/utils";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Product } from "../../types";
import Icon from "../Icon";
import { auth, db } from "../../firebase";
import { doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { PixelImage } from "./PixelImage";
import { getProductCoinReward } from "../../lib/coinRewards";
import { triggerHaptic } from "../../lib/haptics";
import { Heart, Star, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export const ProductCard = ({ product, index }: { product: Product, index?: number }) => {
  const navigate = useNavigate();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const getActualCoinReward = (p: any): number => {
    if (p.coinReward !== undefined && p.coinReward !== null && String(p.coinReward).trim() !== "") {
      return Number(p.coinReward);
    }
    return getProductCoinReward(p.id);
  };
  const actualReward = getActualCoinReward(product);
  const hasDiscount =
    product.isOffer && product.offerPrice && product.offerPrice < product.price;

  const displayPrice =
    product.isOffer && product.offerPrice ? product.offerPrice : product.price;
    
  const discountPercentage = hasDiscount && product.price > 0
    ? Math.round(((product.price - displayPrice!) / product.price) * 100)
    : 0;
    
  const productSlug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const reviewCount = product.numReviews || (product as any).reviewCount || (product as any).reviewsCount || Math.floor(((product.rating || 4.8) * 17) % 80) + 12;

  const baseCardClasses = "col-span-1 w-full group relative";

  useEffect(() => {
    let unsubscribe = () => {};
    if (auth.currentUser && product.id) {
      const wishlistRef = doc(
        db,
        "users",
        auth.currentUser.uid,
        "wishlist",
        product.id,
      );
      unsubscribe = onSnapshot(
        wishlistRef,
        (snap) => {
          setIsWishlisted(snap.exists());
        },
        () => {},
      );
    }
    return () => unsubscribe();
  }, [product.id]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    triggerHaptic();
    e.preventDefault();
    e.stopPropagation();

    if (!auth.currentUser) return;
    if (!product.id) return;

    const wishlistRef = doc(
      db,
      "users",
      auth.currentUser.uid,
      "wishlist",
      product.id,
    );
    try {
      if (isWishlisted) {
        await deleteDoc(wishlistRef);
      } else {
        await setDoc(wishlistRef, {
          productId: product.id,
          addedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
    }
  };

  const sellerName = (product as any).storeName || (product as any).sellerName || (product as any).shopName || (product as any).sellerShopName || "DEEP SHOP";
  
  const badgeLabel = hasDiscount && discountPercentage > 0 
    ? `-${discountPercentage}% OFF` 
    : (product.category || product.brand || "VERIFIED");

  // Clean meta description snippet
  const metaDescription = (product.description || "")
    .replace(/<[^>]*>?/gm, "")
    .replace(/[#*`~_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Official verified product with fast delivery";

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0 },
      }}
      className={baseCardClasses}
    >
      <Link
        to={`/product/${productSlug}/${product.id}`}
        title={product.name}
        className="block h-full rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      >
        <Card className="group relative flex w-full flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs transition-all duration-300 hover:shadow-lg">
          {/* Image Container */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl sm:rounded-t-2xl bg-zinc-100 dark:bg-zinc-800">
            <PixelImage
              src={product.image}
              alt={product.name}
              className="w-full h-full z-10"
              imgClassName={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${product.isSold || product.stock === 0 ? "opacity-30 grayscale" : ""}`}
            />

            {/* Rubber Stamp "SOLD OUT" Seal */}
            {(product.isSold || product.stock === 0) && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-2 z-20">
                <div className="rotate-[-12deg] border-2 border-rose-500 text-rose-500 font-black px-3 py-1 rounded-xl uppercase tracking-wider text-center bg-black/85 shadow-lg border-dashed">
                  <span className="text-xs sm:text-sm block leading-none font-black">
                    SOLD OUT
                  </span>
                </div>
              </div>
            )}

            {/* Ultra Small Single-Line Pill Shape Tag Badge on Top Left */}
            <div className="absolute top-1.5 left-1.5 z-20 max-w-[75%]">
              <span className="inline-block whitespace-nowrap truncate max-w-full rounded-full bg-black/75 backdrop-blur-md text-white px-2 py-0.5 text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider shadow-xs border border-white/10">
                {badgeLabel}
              </span>
            </div>

            {/* Wishlist Heart Button on Top Right of Image */}
            <button
              type="button"
              onClick={toggleWishlist}
              className="absolute top-1.5 right-1.5 z-20 rounded-full bg-white/80 dark:bg-zinc-900/80 p-1.5 text-zinc-700 dark:text-zinc-300 backdrop-blur-md hover:bg-white dark:hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
            >
              <Heart className={`h-3.5 w-3.5 stroke-[2px] ${isWishlisted ? "fill-rose-500 text-rose-500" : "text-zinc-600 dark:text-zinc-300"}`} />
            </button>
          </div>

          {/* Details Container - Dynamic Compact Flow without empty gaps */}
          <div className="flex flex-col p-2 sm:p-2.5 gap-1">
            <CardContent className="p-0 space-y-0.5">
              {/* Title */}
              <h3 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug line-clamp-1">
                {product.name}
              </h3>
              
              {/* Meta Description Snippet */}
              <p className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 leading-tight font-normal">
                {metaDescription}
              </p>

              {/* Seller Name with Profile Icon (User) */}
              <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 pt-0.5">
                <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-medium truncate">
                  {sellerName}
                </span>
              </div>
            </CardContent>

            {/* Footer with Rating & Price Tag */}
            <CardFooter className="flex items-center justify-between gap-1 p-0 pt-1.5 border-t border-zinc-100 dark:border-zinc-800 w-full overflow-hidden mt-0.5">
              {/* Single Line Rating & Review Count */}
              <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-zinc-800 dark:text-zinc-200 whitespace-nowrap shrink-0">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                <span>{product.rating ? product.rating.toFixed(1) : "4.9"}</span>
                <span className="text-zinc-400 font-normal text-[9px] sm:text-[10px]">
                  ({reviewCount})
                </span>
              </div>

              {/* Highlighted Price Tag in Pill Shape */}
              <div className="shrink-0 min-w-max ml-auto flex items-center gap-1 px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white font-black text-xs sm:text-sm tracking-tight shadow-xs whitespace-nowrap">
                <span>{formatPrice(displayPrice)}</span>
              </div>
            </CardFooter>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
};
