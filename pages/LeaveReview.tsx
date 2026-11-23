import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { auth, db } from "../firebase";
import { collection, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { useNotify } from "../components/Notifications";
import { Product } from "../types";
import { uploadToImgbb } from "../services/imgbb";
import { isScamReview } from "../lib/reviewModeration";
import { checkContainsBannedWord } from "../lib/wordFilter";
import { triggerHaptic } from "../lib/haptics";
import { APPLE_SPRING_DEFAULT } from "../lib/shoppingRoute";
import {
  Box,
  Star,
  ImagePlus,
  X,
  Loader2,
  Send,
} from "lucide-react";
import { StatusBadge } from "../components/ui/status-badge";
import { getProductDisplayImage } from "../src/lib/phonePartsArt";

const LeaveReview: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();
  const shouldReduceMotion = useReducedMotion();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get("productId");

  const [product, setProduct] = useState<Product | null>(null);
  const [errorLoading, setErrorLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const urls = imageFiles.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [imageFiles]);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) {
        setErrorLoading(true);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "products", productId));
        if (snap.exists()) {
          setProduct({ id: snap.id, ...snap.data() } as Product);
        } else {
          setErrorLoading(true);
        }
      } catch {
        setErrorLoading(true);
      }
    };
    fetchProduct();
  }, [productId]);

  const handleSubmit = async () => {
    if (!auth.currentUser) {
      notify("Please sign in to leave a review.", "error");
      navigate("/signin");
      return;
    }
    if (rating === 0) {
      triggerHaptic("error");
      return notify("Please select a star rating.", "error");
    }
    if (!comment.trim()) {
      triggerHaptic("error");
      return notify("Please write your review.", "error");
    }
    if (!productId || !product) return;

    triggerHaptic("medium");
    const bannedWord = await checkContainsBannedWord(comment);
    if (bannedWord) {
      triggerHaptic("error");
      return notify(
        `Your review contains prohibited content ("${bannedWord}"). Please edit your review.`,
        "error"
      );
    }

    if (isScamReview(comment)) {
      triggerHaptic("success");
      notify("Review submitted! Thank you for your feedback.", "success");
      navigate(`/product/${productId}`);
      return;
    }

    setLoading(true);
    try {
      const imageUrls: string[] = [];
      for (const file of imageFiles) {
        const url = await uploadToImgbb(file);
        if (url) imageUrls.push(url);
      }

      let resolvedName = auth.currentUser.displayName || "";
      let resolvedPhoto = auth.currentUser.photoURL || "";
      try {
        const uSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (uSnap.exists()) {
          const uData = uSnap.data();
          resolvedName =
            uData.displayName || uData.name || uData.shopName || resolvedName;
          resolvedPhoto =
            uData.photoURL || uData.avatar || uData.shopLogo || resolvedPhoto;
        }
      } catch {}

      if (!resolvedName.trim()) {
        resolvedName =
          auth.currentUser.email?.split("@")[0] || "Verified Customer";
      }

      await addDoc(collection(db, "reviews"), {
        productId,
        sellerId: product.sellerId || "system",
        userId: auth.currentUser.uid,
        userName: resolvedName.trim(),
        userPhoto: resolvedPhoto,
        rating,
        comment: comment.trim(),
        images: imageUrls,
        createdAt: Date.now(),
      });

      // Non-blocking product rating sync (never fails regular buyer submission)
      try {
        const oldRating = Number(product.rating || 0);
        const oldNumReviews = Number(product.numReviews || 0);
        const newNumReviews = oldNumReviews + 1;
        const newRating = (oldRating * oldNumReviews + rating) / newNumReviews;

        await updateDoc(doc(db, "products", productId), {
          rating: Number(newRating.toFixed(1)),
          numReviews: newNumReviews,
        });
      } catch {}

      triggerHaptic("success");
      notify("Review posted!", "success");
      navigate(`/product/${productId}`);
    } catch {
      triggerHaptic("error");
      notify("Failed to post review.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (errorLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F5F7] dark:bg-black px-4">
        <h2 className="text-xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
          Product not found
        </h2>
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            navigate("/orders");
          }}
          className="mt-4 px-6 py-2.5 bg-[#0071E3] dark:bg-[#0A84FF] text-white rounded-full text-xs font-semibold cursor-pointer active:scale-[0.97] transition-transform"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] dark:bg-black">
        <Loader2 className="w-7 h-7 animate-spin text-[#0071E3] dark:text-[#0A84FF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black py-6 px-4 sm:px-6 pb-20 ds-apple-shop-canvas">
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0.16 } : APPLE_SPRING_DEFAULT}
        className="max-w-2xl mx-auto space-y-5"
      >
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-[-0.022em] leading-tight">
            Leave a Product Review
          </h1>
        </div>

        {/* Product Summary Card */}
        <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[22px] border border-black/[0.06] dark:border-white/[0.1] flex items-center gap-4 shadow-xs">
          <div className="w-20 h-20 bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-2xl overflow-hidden p-2 border border-black/[0.05] dark:border-white/[0.08] shrink-0">
            <img
              src={getProductDisplayImage(product)}
              className="w-full h-full object-contain"
              alt={product.name}
            />
          </div>
          <div className="flex-1 min-w-0">
            {product.category && (
              <div className="mb-1.5">
                <StatusBadge leftIcon={Box} leftLabel={product.category} />
              </div>
            )}
            <h2 className="font-semibold text-base sm:text-lg text-[#1D1D1F] dark:text-[#F5F5F7] truncate tracking-tight">
              {product.name}
            </h2>
          </div>
        </div>

        {/* Star Rating Card */}
        <div className="bg-white dark:bg-[#1C1C1E] p-6 sm:p-8 rounded-[22px] border border-black/[0.06] dark:border-white/[0.1] text-center shadow-xs">
          <h3 className="text-base sm:text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1 tracking-tight">
            Rate Your Experience
          </h3>
          <p className="text-xs text-[#6E6E73] dark:text-[#98989D] mb-6">
            Tap a star to rate this product
          </p>

          <div className="flex justify-center gap-2.5 sm:gap-4">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = star <= rating;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setRating(star);
                  }}
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all cursor-pointer border active:scale-95 ${
                    active
                      ? "bg-[#FF9500]/12 border-[#FF9500] dark:border-[#FF9F0A] text-[#FF9500] dark:text-[#FF9F0A] scale-105"
                      : "bg-[#F5F5F7] dark:bg-[#2C2C2E] border-black/[0.08] dark:border-white/[0.1] text-black/[0.2] dark:text-white/[0.25] hover:border-black/[0.2] dark:hover:border-white/[0.22]"
                  }`}
                >
                  <Star
                    className="w-6 h-6 sm:w-7 sm:h-7"
                    fill={active ? "currentColor" : "none"}
                  />
                </button>
              );
            })}
          </div>

          {rating > 0 && (
            <p className="text-xs font-medium text-[#FF9500] dark:text-[#FF9F0A] mt-4">
              {
                [
                  "Poor",
                  "Could be better",
                  "Good",
                  "Very Good",
                  "Excellent!",
                ][rating - 1]
              }
            </p>
          )}
        </div>

        {/* Review Text & Photo Upload Card */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[22px] p-5 border border-black/[0.06] dark:border-white/[0.1] shadow-xs space-y-4">
          <textarea
            placeholder="Share details about the product quality, condition, and packaging..."
            className="w-full rounded-2xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.1] focus:border-[#0071E3] dark:focus:border-[#0A84FF] p-4 min-h-[130px] outline-none text-sm leading-relaxed text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] resize-none transition-colors"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          {previewUrls.length > 0 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {previewUrls.map((src, i) => (
                <div
                  key={src}
                  className="relative w-20 h-20 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] overflow-hidden shrink-0"
                >
                  <img
                    src={src}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setImageFiles((prev) => prev.filter((_, idx) => idx !== i));
                    }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/75 text-white flex items-center justify-center hover:bg-[#FF3B30] cursor-pointer"
                    aria-label="Remove photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
            <label
              onClick={() => triggerHaptic("light")}
              className="px-4 py-2 rounded-full border border-black/[0.08] dark:border-white/[0.1] bg-[#F5F5F7] dark:bg-[#2C2C2E] hover:bg-black/[0.06] dark:hover:bg-white/[0.12] text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-[0.97] transition-all"
            >
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []).filter((f) =>
                    f.type.startsWith("image/")
                  );
                  e.target.value = "";
                  if (files.length > 0) {
                    triggerHaptic("selection");
                    setImageFiles((prev) => [...prev, ...files].slice(0, 3));
                  }
                }}
              />
              <ImagePlus className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />
              <span className="tabular-nums">Attach Photos ({imageFiles.length}/3)</span>
            </label>
          </div>
        </div>

        <button
          type="button"
          disabled={loading || rating === 0 || !comment.trim()}
          onClick={handleSubmit}
          className="w-full py-4 bg-[#0071E3] dark:bg-[#0A84FF] hover:bg-[#0077ED] dark:hover:bg-[#1E8EFF] text-white rounded-full font-semibold text-sm active:scale-[0.98] disabled:opacity-45 flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap shadow-xs"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Submitting Review...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Submit Review</span>
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
};

export default LeaveReview;
