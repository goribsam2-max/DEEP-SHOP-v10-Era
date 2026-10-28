import { formatPrice, getSafeDisplayName } from "@/lib/utils";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Product } from "../../types";
import { auth, db } from "../../firebase";
import { doc, getDoc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { PixelImage } from "./PixelImage";
import { triggerHaptic } from "../../lib/haptics";
import { Heart, Star, ShoppingBag, Check, ArrowUpRight } from "lucide-react";
import { getProductDisplayImage } from "../../src/lib/phonePartsArt";
import { useNotify } from "../Notifications";
import { VerifiedIcon } from "../SellerBadge";

export interface ProductCardProps {
  product: Product;
  index?: number;
  layout?: "grid" | "list";
}

interface ResolvedSellerMeta {
  name: string;
  isVerified: boolean;
  storeId: string;
}

const sellerMetaCache = new Map<string, ResolvedSellerMeta>();
const sellerPendingCache = new Map<string, Promise<ResolvedSellerMeta>>();

function getInitialSellerMeta(product: Product): ResolvedSellerMeta {
  const p = product as any;
  const embeddedName =
    p.shopName || p.storeName || p.sellerShopName || p.sellerName || "";
  const embeddedVerified = Boolean(
    p.sellerVerified ||
      p.isVerifiedSeller ||
      p.kycStatus === "verified" ||
      p.isVerifiedBadge
  );

  if (!product.sellerId || product.sellerId === "system") {
    return {
      name: embeddedName || "Deep Shop",
      isVerified: true,
      storeId: "system",
    };
  }

  const cached = sellerMetaCache.get(product.sellerId);
  if (cached) return cached;

  return {
    name: embeddedName || "Deep Shop",
    isVerified: embeddedName ? embeddedVerified : true,
    storeId: product.sellerId,
  };
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  layout = "grid",
}) => {
  const navigate = useNavigate();
  const notify = useNotify();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [sellerMeta, setSellerMeta] = useState<ResolvedSellerMeta>(() =>
    getInitialSellerMeta(product)
  );

  const isOutOfStock = Boolean(product.isSold || product.stock === 0);
  const hasDiscount = Boolean(
    product.isOffer && product.offerPrice && product.offerPrice < product.price
  );

  const displayPrice =
    product.isOffer && product.offerPrice ? product.offerPrice : product.price;

  const discountPercentage =
    hasDiscount && product.price > 0
      ? Math.round(((product.price - displayPrice!) / product.price) * 100)
      : 0;

  const productSlug =
    (product.name || "product")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "item";

  const productUrl = `/product/${productSlug}/${product.id}`;

  const reviewCount =
    product.numReviews ||
    (product as any).reviewCount ||
    (product as any).reviewsCount ||
    Math.floor(((product.rating || 4.8) * 17) % 80) + 12;

  const ratingLabel = product.rating ? product.rating.toFixed(1) : "4.9";

  // Resolve posting seller name + verified status from Firestore (cached per sellerId)
  useEffect(() => {
    const sid = product.sellerId;
    if (!sid || sid === "system") {
      setSellerMeta(getInitialSellerMeta(product));
      return;
    }

    const cached = sellerMetaCache.get(sid);
    if (cached) {
      setSellerMeta(cached);
      return;
    }

    let cancelled = false;
    let pending = sellerPendingCache.get(sid);

    if (!pending) {
      pending = getDoc(doc(db, "users", sid))
        .then((snap) => {
          const p = product as any;
          const embeddedName =
            p.shopName || p.storeName || p.sellerShopName || p.sellerName || "";

          if (snap.exists()) {
            const d = snap.data() as any;
            const resolvedName =
              d.shopName ||
              d.storeName ||
              getSafeDisplayName(d, "") ||
              embeddedName ||
              "Seller";
            const isVerified = Boolean(
              d.kycStatus === "verified" ||
                d.isVerifiedBadge === true ||
                d.isAdmin === true ||
                d.role === "admin" ||
                d.email === "deepshop@gmail.com" ||
                d.email === "deepshopbysam@gmail.com"
            );
            const meta: ResolvedSellerMeta = {
              name: resolvedName,
              isVerified,
              storeId: sid,
            };
            sellerMetaCache.set(sid, meta);
            return meta;
          }

          const fallbackMeta: ResolvedSellerMeta = {
            name: embeddedName || "Deep Shop",
            isVerified: embeddedName
              ? Boolean(
                  p.sellerVerified ||
                    p.kycStatus === "verified" ||
                    p.isVerifiedBadge
                )
              : true,
            storeId: sid,
          };
          sellerMetaCache.set(sid, fallbackMeta);
          return fallbackMeta;
        })
        .catch(() => getInitialSellerMeta(product))
        .finally(() => {
          sellerPendingCache.delete(sid);
        });

      sellerPendingCache.set(sid, pending);
    }

    pending.then((meta) => {
      if (!cancelled) setSellerMeta(meta);
    });

    return () => {
      cancelled = true;
    };
  }, [product]);

  useEffect(() => {
    let unsubscribe = () => {};
    if (auth.currentUser && product.id) {
      const wishlistRef = doc(
        db,
        "users",
        auth.currentUser.uid,
        "wishlist",
        product.id
      );
      unsubscribe = onSnapshot(
        wishlistRef,
        (snap) => {
          setIsWishlisted(snap.exists());
        },
        () => {}
      );
    }
    return () => unsubscribe();
  }, [product.id]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    triggerHaptic();
    e.preventDefault();
    e.stopPropagation();

    if (!auth.currentUser) {
      notify("উইশলিস্টে সেভ করতে অনুগ্রহ করে লগইন করুন", "info");
      return;
    }
    if (!product.id) return;

    const wishlistRef = doc(
      db,
      "users",
      auth.currentUser.uid,
      "wishlist",
      product.id
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

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;

    triggerHaptic();
    try {
      const existing = JSON.parse(localStorage.getItem("f_cart") || "[]");
      const foundIdx = existing.findIndex((c: any) => c.id === product.id);
      const imageSrc = getProductDisplayImage(product);

      if (foundIdx >= 0) {
        existing[foundIdx].quantity = (existing[foundIdx].quantity || 1) + 1;
      } else {
        existing.push({
          ...product,
          image: imageSrc,
          discountPrice:
            product.isOffer && product.offerPrice
              ? product.offerPrice
              : undefined,
          quantity: 1,
        });
      }
      localStorage.setItem("f_cart", JSON.stringify(existing));
      window.dispatchEvent(new Event("update_cart"));
      setJustAdded(true);
      notify("কার্টে যুক্ত করা হয়েছে", "success");
      setTimeout(() => setJustAdded(false), 1600);
    } catch (err) {
      console.error("Error adding item to cart:", err);
    }
  };

  const handleSellerVisit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic();
    navigate(`/store/${sellerMeta.storeId || "system"}`);
  };

  const cleanCategory = (product.category || product.brand || "কালেকশন")
    .replace(/\s*\(.*?\)\s*/g, "")
    .trim();

  // Clean product meta description excerpt (always derived from product description)
  const metaDescription =
    (product.description || "")
      .replace(/<[^>]*>?/gm, " ")
      .replace(/[#*`~_>]/g, " ")
      .replace(/\s+/g, " ")
      .trim() ||
    `${product.name} — যাচাইকৃত অরিজিনাল কোয়ালিটি ও নিরাপদ ডেলিভারি সুবিধা।`;

  const specSummary = [
    product.brand,
    product.storage,
    product.condition,
    product.warranty,
  ]
    .filter(Boolean)
    .slice(0, 3)
    .join(" · ");

  const imageUrl = getProductDisplayImage(product);

  // ============================================================================
  // DETAILED LIST LAYOUT (Catalog Detailed Mode — Distinct Mobile vs Desktop)
  // ============================================================================
  if (layout === "list") {
    return (
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 12 },
          visible: { opacity: 1, y: 0 },
        }}
        className="w-full group relative"
      >
        <Link
          to={productUrl}
          title={product.name}
          className="block w-full rounded-[22px] md:rounded-[26px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
        >
          {/* MOBILE LIST CARD (< md) */}
          <article className="md:hidden ds-liquid-product-card rounded-[22px] p-3 flex items-stretch gap-3.5 overflow-hidden">
            <div className="relative w-28 min-h-[120px] rounded-2xl ds-liquid-product-media overflow-hidden shrink-0">
              <PixelImage
                src={imageUrl}
                alt={product.name}
                className="w-full h-full"
                imgClassName={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                  isOutOfStock ? "opacity-40 grayscale" : ""
                }`}
              />
              {hasDiscount && discountPercentage > 0 && !isOutOfStock && (
                <span className="absolute top-2 left-2 z-20 ds-liquid-discount-tag rounded-lg px-1.5 py-0.5 text-[10px] font-bold tabular-nums whitespace-nowrap">
                  -{discountPercentage}%
                </span>
              )}
              {isOutOfStock && (
                <div className="absolute inset-0 z-20 bg-slate-950/55 backdrop-blur-[2px] flex items-center justify-center px-2">
                  <span className="text-[10px] font-semibold text-white tracking-tight whitespace-nowrap">
                    স্টক শেষ
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="truncate font-medium">{cleanCategory}</span>
                  <button
                    type="button"
                    onClick={toggleWishlist}
                    aria-label="Toggle wishlist"
                    className="p-1 -mr-1 text-slate-500 dark:text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        isWishlisted ? "fill-rose-500 text-rose-500" : ""
                      }`}
                    />
                  </button>
                </div>

                <h3 className="text-[14px] font-bold text-slate-900 dark:text-white leading-snug line-clamp-1">
                  {product.name}
                </h3>

                {/* Posting Seller Name (Subtly Highlighted) + Verified Badge */}
                <div className="flex items-center gap-1 min-w-0">
                  <button
                    type="button"
                    onClick={handleSellerVisit}
                    className="ds-seller-highlight inline-flex items-center gap-1 max-w-full px-1.5 py-0.5 text-[10.5px] font-semibold cursor-pointer"
                  >
                    <span className="truncate">{sellerMeta.name}</span>
                    {sellerMeta.isVerified && (
                      <VerifiedIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    )}
                  </button>
                </div>

                {/* Product Meta Description Excerpt */}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                  {metaDescription}
                </p>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-900/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5 tabular-nums">
                    <span className="text-[15px] font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatPrice(displayPrice)}
                    </span>
                    {hasDiscount && (
                      <span className="text-[11px] text-slate-400 line-through whitespace-nowrap">
                        {formatPrice(product.price)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 shrink-0" />
                    <span>{ratingLabel}</span>
                    <span>({reviewCount})</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleQuickAdd}
                  disabled={isOutOfStock}
                  aria-label="Add to cart"
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
                    isOutOfStock
                      ? "opacity-40 cursor-not-allowed ds-liquid-icon-btn"
                      : justAdded
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "ds-liquid-btn-primary !min-h-0"
                  }`}
                >
                  {justAdded ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <ShoppingBag className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </article>

          {/* DESKTOP LIST CARD (md+) */}
          <article className="hidden md:flex ds-liquid-product-card rounded-[26px] p-4 lg:p-5 items-center gap-6 overflow-hidden">
            <div className="relative w-44 lg:w-52 aspect-[4/3] rounded-[20px] ds-liquid-product-media overflow-hidden shrink-0">
              <PixelImage
                src={imageUrl}
                alt={product.name}
                className="w-full h-full"
                imgClassName={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                  isOutOfStock ? "opacity-40 grayscale" : ""
                }`}
              />
              {hasDiscount && discountPercentage > 0 && !isOutOfStock && (
                <span className="absolute top-2.5 left-2.5 z-20 ds-liquid-discount-tag rounded-lg px-2 py-0.5 text-[11px] font-bold tabular-nums whitespace-nowrap">
                  -{discountPercentage}% ছাড়
                </span>
              )}
              {isOutOfStock && (
                <div className="absolute inset-0 z-20 bg-slate-950/55 backdrop-blur-[3px] flex items-center justify-center">
                  <span className="text-xs font-semibold text-white px-3 py-1 rounded-full bg-slate-900/75 border border-white/15 whitespace-nowrap">
                    স্টক শেষ · Out of Stock
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {cleanCategory}
                </span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={handleSellerVisit}
                  className="ds-seller-highlight inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold cursor-pointer max-w-[240px]"
                >
                  <span className="truncate">{sellerMeta.name}</span>
                  {sellerMeta.isVerified && (
                    <VerifiedIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  )}
                </button>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 tabular-nums text-slate-700 dark:text-slate-200 font-semibold whitespace-nowrap">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                  {ratingLabel}
                  <span className="font-normal text-slate-400">
                    ({reviewCount} রিভিউ)
                  </span>
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-snug line-clamp-1 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                {product.name}
              </h3>

              {/* Product Meta Description Excerpt */}
              <p className="text-sm text-slate-600 dark:text-slate-300/90 leading-relaxed line-clamp-2 max-w-2xl">
                {metaDescription}
              </p>

              <div className="pt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                {specSummary && (
                  <>
                    <span>{specSummary}</span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <span
                  className={
                    isOutOfStock
                      ? "text-rose-500 font-medium"
                      : "text-emerald-600 dark:text-emerald-400 font-medium"
                  }
                >
                  {isOutOfStock
                    ? "স্টক নেই"
                    : product.stock
                    ? `স্টকে ${product.stock}টি প্রস্তুত`
                    : "স্টকে প্রস্তুত"}
                </span>
              </div>
            </div>

            <div className="shrink-0 pl-6 border-l border-slate-900/[0.07] dark:border-white/[0.08] flex flex-col items-end justify-between self-stretch min-w-[185px]">
              <button
                type="button"
                onClick={toggleWishlist}
                aria-label="Toggle wishlist"
                className="ds-liquid-icon-btn w-9 h-9 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300"
              >
                <Heart
                  className={`w-4 h-4 ${
                    isWishlisted ? "fill-rose-500 text-rose-500" : ""
                  }`}
                />
              </button>

              <div className="text-right my-2 tabular-nums">
                {hasDiscount && (
                  <div className="text-xs text-slate-400 line-through">
                    {formatPrice(product.price)}
                  </div>
                )}
                <div className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                  {formatPrice(displayPrice)}
                </div>
              </div>

              <div className="flex items-center gap-2 w-full justify-end">
                <button
                  type="button"
                  onClick={handleQuickAdd}
                  disabled={isOutOfStock}
                  className={`px-4 py-2 text-xs font-semibold whitespace-nowrap flex items-center justify-center gap-1.5 ${
                    isOutOfStock
                      ? "ds-liquid-btn-secondary !min-h-[38px] opacity-50 cursor-not-allowed"
                      : justAdded
                      ? "rounded-full bg-emerald-600 text-white min-h-[38px] shadow-sm"
                      : "ds-liquid-btn-primary !min-h-[38px] !text-xs"
                  }`}
                >
                  {justAdded ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>যুক্ত হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>কার্টে নিন</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </article>
        </Link>
      </motion.div>
    );
  }

  // ============================================================================
  // GRID POST CARD LAYOUT (Default — Distinct Mobile vs Desktop Responsive Cards)
  // ============================================================================
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14 },
        visible: { opacity: 1, y: 0 },
      }}
      className="col-span-1 w-full h-full group relative"
    >
      <Link
        to={productUrl}
        title={product.name}
        className="block h-full rounded-[20px] md:rounded-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
      >
        {/* ====================================================================
            MOBILE POST CARD (< md): Compact 2-Column Tactile Liquid Glass Card
            ==================================================================== */}
        <article className="md:hidden ds-liquid-product-card h-full rounded-[20px] overflow-hidden flex flex-col">
          {/* Square Studio Media Stage for Mobile 2-Col Clarity */}
          <div className="relative aspect-square w-full overflow-hidden ds-liquid-product-media">
            <PixelImage
              src={imageUrl}
              alt={product.name}
              className="w-full h-full z-10"
              imgClassName={`w-full h-full object-cover transition-transform duration-500 ${
                isOutOfStock ? "opacity-35 grayscale" : ""
              }`}
            />

            {/* Single Subtle Frosted Discount Tag (Only when discounted) */}
            {hasDiscount && discountPercentage > 0 && !isOutOfStock && (
              <span className="absolute top-2 left-2 z-20 ds-liquid-discount-tag rounded-lg px-2 py-0.5 text-[10px] font-bold tabular-nums tracking-tight whitespace-nowrap">
                -{discountPercentage}%
              </span>
            )}

            {/* Clean Frosted Out-of-Stock Overlay */}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px] flex items-center justify-center p-2 z-20">
                <span className="px-2.5 py-1 rounded-full bg-slate-900/80 border border-white/15 text-[10px] font-semibold text-white tracking-tight whitespace-nowrap">
                  স্টক শেষ
                </span>
              </div>
            )}

            {/* Refractive Wishlist Button */}
            <button
              type="button"
              onClick={toggleWishlist}
              aria-label="Save to wishlist"
              className="absolute top-2 right-2 z-20 ds-liquid-icon-btn w-8 h-8 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <Heart
                className={`w-3.5 h-3.5 stroke-[2px] ${
                  isWishlisted ? "fill-rose-500 text-rose-500" : ""
                }`}
              />
            </button>
          </div>

          {/* Mobile Card Body */}
          <div className="flex-1 flex flex-col justify-between p-2.5 gap-2">
            <div className="space-y-1.5">
              {/* Unboxed Kicker Row: Category · Rating */}
              <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="truncate font-medium">{cleanCategory}</span>
                <span className="inline-flex items-center gap-0.5 font-semibold text-slate-700 dark:text-slate-200 tabular-nums shrink-0 whitespace-nowrap">
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 shrink-0" />
                  {ratingLabel}
                </span>
              </div>

              {/* Balanced Title */}
              <h3 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                {product.name}
              </h3>

              {/* Posting Seller Name (Subtly Highlighted) + Verified Badge */}
              <div className="flex items-center min-w-0">
                <button
                  type="button"
                  onClick={handleSellerVisit}
                  className="ds-seller-highlight inline-flex items-center gap-1 max-w-full px-1.5 py-0.5 text-[10.5px] font-semibold cursor-pointer"
                >
                  <span className="truncate">{sellerMeta.name}</span>
                  {sellerMeta.isVerified && (
                    <VerifiedIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  )}
                </button>
              </div>

              {/* Product Meta Description Excerpt */}
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                {metaDescription}
              </p>
            </div>

            {/* Mobile Price + Quick Cart Action Footer */}
            <div className="pt-2 border-t border-slate-900/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-1.5">
              <div className="min-w-0 tabular-nums">
                <div className="text-[14px] font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                  {formatPrice(displayPrice)}
                </div>
                {hasDiscount && (
                  <div className="text-[10px] text-slate-400 line-through leading-none mt-0.5 truncate">
                    {formatPrice(product.price)}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleQuickAdd}
                disabled={isOutOfStock}
                aria-label="Quick add to cart"
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
                  isOutOfStock
                    ? "ds-liquid-icon-btn opacity-40 cursor-not-allowed"
                    : justAdded
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "ds-liquid-icon-btn text-sky-600 dark:text-sky-400"
                }`}
              >
                {justAdded ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <ShoppingBag className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </article>

        {/* ====================================================================
            DESKTOP POST CARD (md+): Editorial Showcase Liquid Glass Card
            ==================================================================== */}
        <article className="hidden md:flex ds-liquid-product-card h-full rounded-[24px] overflow-hidden flex-col">
          {/* 4:3 Studio Gallery Stage with Hover Glass Dock */}
          <div className="relative aspect-[4/3] w-full overflow-hidden ds-liquid-product-media">
            <PixelImage
              src={imageUrl}
              alt={product.name}
              className="w-full h-full z-10"
              imgClassName={`w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] ${
                isOutOfStock ? "opacity-35 grayscale" : ""
              }`}
            />

            {/* Single Subtle Frosted Discount Tag */}
            {hasDiscount && discountPercentage > 0 && !isOutOfStock && (
              <span className="absolute top-3 left-3 z-20 ds-liquid-discount-tag rounded-lg px-2.5 py-1 text-[11px] font-bold tabular-nums tracking-tight whitespace-nowrap">
                -{discountPercentage}%
              </span>
            )}

            {/* Clean Frosted Out-of-Stock Overlay */}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[3px] flex items-center justify-center p-3 z-20">
                <span className="px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-white/15 text-xs font-semibold text-white tracking-tight whitespace-nowrap">
                  স্টক শেষ · Out of Stock
                </span>
              </div>
            )}

            {/* Refractive Wishlist Button */}
            <button
              type="button"
              onClick={toggleWishlist}
              aria-label="Save to wishlist"
              className="absolute top-3 right-3 z-20 ds-liquid-icon-btn w-9 h-9 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <Heart
                className={`w-4 h-4 stroke-[2px] ${
                  isWishlisted ? "fill-rose-500 text-rose-500" : ""
                }`}
              />
            </button>

            {/* Desktop Hover Quick-Add Glass Bar */}
            {!isOutOfStock && (
              <div className="absolute inset-x-3 bottom-3 z-20 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-out pointer-events-none group-hover:pointer-events-auto">
                <div className="ds-liquid-dock rounded-full p-1 flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={handleQuickAdd}
                    className={`flex-1 h-8 rounded-full px-3 text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                      justAdded
                        ? "bg-emerald-600 text-white"
                        : "ds-liquid-dock-pill text-slate-900 dark:text-white hover:text-sky-600 dark:hover:text-sky-300"
                    }`}
                  >
                    {justAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>কার্টে যুক্ত</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                        <span>কার্টে যোগ করুন</span>
                      </>
                    )}
                  </button>
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Editorial Body */}
          <div className="flex-1 flex flex-col justify-between p-4 gap-3">
            <div className="space-y-1.5">
              {/* Unboxed Metadata Row: Category | ★ Rating (Count) */}
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                  {cleanCategory}
                </span>

                <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200 tabular-nums shrink-0 whitespace-nowrap">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                  <span>{ratingLabel}</span>
                  <span className="text-slate-400 font-normal">
                    ({reviewCount})
                  </span>
                </div>
              </div>

              {/* Crisp Product Title */}
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-snug line-clamp-1 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                {product.name}
              </h3>

              {/* Posting Seller Name (Subtly Highlighted) + Verified Badge */}
              <div className="flex items-center gap-1.5 min-w-0 pt-0.5">
                <button
                  type="button"
                  onClick={handleSellerVisit}
                  className="ds-seller-highlight inline-flex items-center gap-1 max-w-full px-2 py-0.5 text-[11.5px] font-semibold cursor-pointer"
                >
                  <span className="truncate">{sellerMeta.name}</span>
                  {sellerMeta.isVerified && (
                    <VerifiedIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  )}
                </button>
              </div>

              {/* Product Meta Description Excerpt */}
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed pt-0.5">
                {metaDescription}
              </p>
            </div>

            {/* Desktop Footer: Tabular Price Hierarchy + Stock Availability */}
            <div className="pt-2.5 border-t border-slate-900/[0.06] dark:border-white/[0.08] flex items-end justify-between gap-2">
              <div className="min-w-0 tabular-nums">
                {hasDiscount && (
                  <div className="text-[11px] text-slate-400 line-through leading-none mb-1 whitespace-nowrap">
                    {formatPrice(product.price)}
                  </div>
                )}
                <div className="text-base lg:text-[17px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-none whitespace-nowrap">
                  {formatPrice(displayPrice)}
                </div>
              </div>

              <span
                className={`text-[11px] font-medium truncate text-right ${
                  isOutOfStock
                    ? "text-rose-500"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {isOutOfStock ? "স্টক নেই" : "স্টকে আছে"}
              </span>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
};
