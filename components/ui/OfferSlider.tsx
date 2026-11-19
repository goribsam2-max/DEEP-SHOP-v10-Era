import React, { useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Star, Heart, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Product } from "../../types";
import { useRegion } from "../RegionContext";
import { auth } from "../../firebase";
import { useNotify } from "../Notifications";
import { cn } from "../../lib/utils";
import useEmblaCarousel from "embla-carousel-react";
import { PixelImage } from "./PixelImage";
import { getProductDisplayImage } from "../../src/lib/phonePartsArt";
import { useIsWishlisted, toggleWishlistItem } from "../../lib/wishlistStore";
import { triggerHaptic } from "../../lib/haptics";

function OfferProductCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  const { formatPrice } = useRegion();
  const notify = useNotify();
  const isWishlisted = useIsWishlisted(product.id);

  const toggleWishlist = async (e: React.MouseEvent) => {
    triggerHaptic();
    e.preventDefault();
    e.stopPropagation();

    if (!auth.currentUser) {
      notify("Please sign in to add to wishlist", "error");
      return;
    }
    if (!product.id) return;

    try {
      const res = await toggleWishlistItem(product.id);
      if (res === "removed") {
        notify("Removed from wishlist");
      } else if (res === "added") {
        notify("Added to wishlist", "success");
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
    }
  };

  const addToCart = (e: React.MouseEvent) => {
    triggerHaptic();
    e.preventDefault();
    e.stopPropagation();

    const cart = JSON.parse(localStorage.getItem("f_cart") || "[]");
    const existingIdx = cart.findIndex((i: any) => i.id === product.id);

    if (existingIdx > -1) {
      cart[existingIdx].quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1, addedAt: Date.now() });
    }

    localStorage.setItem("f_cart", JSON.stringify(cart));
    notify("Added to cart", "success");
    window.dispatchEvent(new Event("update_cart"));
    window.dispatchEvent(new CustomEvent("cartUpdated"));
  };

  const productSlug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <div
      className="pl-3.5 sm:pl-5 max-w-full flex-[0_0_220px] sm:flex-[0_0_255px] md:flex-[0_0_280px] cursor-pointer"
      onClick={() => {
        triggerHaptic();
        navigate(`/product/${productSlug}/${product.id}`);
      }}
    >
      <div className="ds-apple-surface group relative h-[290px] sm:h-[320px] md:h-[348px] w-full overflow-hidden rounded-[22px] flex flex-col transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.985]">
        <div className="relative flex-1 w-full overflow-hidden ds-apple-surface-subtle border-0">
          <PixelImage
            src={getProductDisplayImage(product)}
            alt={product.name}
            className="w-full h-full"
            imgClassName="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />

          <div className="absolute top-2.5 right-2.5 z-10 bg-black/55 backdrop-blur-md rounded-full px-2.5 py-1 flex items-center gap-1 text-white">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-[11px] font-semibold tabular-nums">
              {product.rating ? product.rating.toFixed(1) : "4.9"}
            </span>
          </div>
        </div>

        <div className="p-3.5 flex flex-col gap-2">
          <div className="min-w-0">
            <p className="ds-apple-muted text-[11px] font-medium truncate">
              {product.category || "Special Offer"}
            </p>
            <h4 className="font-semibold text-[14px] leading-snug truncate mt-0.5">
              {product.name}
            </h4>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/[0.06] dark:border-white/[0.08]">
            <div className="flex items-baseline gap-1.5 tabular-nums min-w-0">
              <span className="font-semibold text-[15px] truncate">
                {formatPrice(product.offerPrice || product.price)}
              </span>
              {product.isOffer && product.offerPrice && (
                <span className="ds-apple-muted line-through text-[11px] truncate">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                aria-label="Save to wishlist"
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90 cursor-pointer",
                  isWishlisted
                    ? "bg-rose-500/12 text-rose-500"
                    : "ds-apple-surface-subtle hover:opacity-80"
                )}
                onClick={toggleWishlist}
              >
                <Heart className={cn("w-4 h-4", isWishlisted && "fill-current")} />
              </button>
              <button
                type="button"
                aria-label="Add to cart"
                className="ds-apple-btn-primary w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
                onClick={addToCart}
              >
                <ShoppingCart className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OfferSlider({ products, autoSlide = true }: { products: Product[]; autoSlide?: boolean }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: true,
    dragFree: true,
  });

  useEffect(() => {
    if (!emblaApi || !autoSlide) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 3500);
    return () => clearInterval(interval);
  }, [emblaApi, autoSlide]);

  const scrollTo = useCallback(
    (direction: "left" | "right") => {
      if (emblaApi) {
        triggerHaptic();
        if (direction === "left") emblaApi.scrollPrev();
        else emblaApi.scrollNext();
      }
    },
    [emblaApi]
  );

  if (products.length === 0) return null;

  return (
    <div className="relative group/offer-slider overflow-hidden -mx-4 sm:-mx-5 md:-mx-12 px-4 sm:px-5 md:px-12 w-[calc(100%+32px)] sm:w-[calc(100%+40px)] md:w-[calc(100%+96px)]">
      <div className="absolute top-1/2 -translate-y-1/2 left-6 md:left-14 z-20 opacity-0 group-hover/offer-slider:opacity-100 transition-opacity duration-200 md:block hidden">
        <button
          type="button"
          onClick={() => scrollTo("left")}
          className="ds-apple-surface h-10 w-10 rounded-full flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 right-6 md:right-14 z-20 opacity-0 group-hover/offer-slider:opacity-100 transition-opacity duration-200 md:block hidden">
        <button
          type="button"
          onClick={() => scrollTo("right")}
          className="ds-apple-surface h-10 w-10 rounded-full flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="overflow-hidden pb-4 pt-1" ref={emblaRef}>
        <div className="flex -ml-3.5 sm:-ml-5">
          {products.map((product, idx) => (
            <OfferProductCard key={product.id ? `${product.id}-${idx}` : idx} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
