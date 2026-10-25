import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { useNotify } from "../components/Notifications";
import { Product } from "../types";
import { uploadToImgbb } from "../services/imgbb";
import { isScamReview } from "../lib/reviewModeration";
import { checkContainsBannedWord } from "../lib/wordFilter";
import {
  Box,
  Star,
  ImagePlus,
  ChevronLeft,
  X,
  Loader2,
  Send,
} from "lucide-react";
import { StatusBadge } from "../components/ui/status-badge";

const LeaveReview: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();
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
    if (rating === 0) return notify("Please select a star rating.", "error");
    if (!comment.trim()) return notify("Please write your review.", "error");
    if (!productId || !product) return;

    const bannedWord = await checkContainsBannedWord(comment);
    if (bannedWord) {
      return notify(
        `Your review contains prohibited content ("${bannedWord}"). Please edit your review.`,
        "error"
      );
    }

    if (isScamReview(comment)) {
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

      notify("Review posted!", "success");
      navigate(`/product/${productId}`);
    } catch {
      notify("Failed to post review.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (errorLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Product not found
        </h2>
        <button
          type="button"
          onClick={() => navigate("/orders")}
          className="mt-4 px-5 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-xs font-bold cursor-pointer"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="w-7 h-7 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-6 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100 cursor-pointer"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Leave a Product Review
          </h1>
        </div>

        {/* Product Summary Card */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-4 shadow-2xs">
          <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800 rounded-xl overflow-hidden p-2 border border-zinc-100 dark:border-zinc-700 shrink-0">
            <img
              src={product.images?.[0] || product.image}
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
            <h2 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-100 truncate">
              {product.name}
            </h2>
          </div>
        </div>

        {/* Star Rating Card */}
        <div className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center shadow-2xs">
          <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            Rate Your Experience
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
            Tap a star to rate this product
          </p>

          <div className="flex justify-center gap-2.5 sm:gap-4">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = star <= rating;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all cursor-pointer border ${
                    active
                      ? "bg-amber-400/15 border-amber-400 text-amber-400 scale-105"
                      : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-300 dark:text-zinc-600 hover:border-zinc-300"
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
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-4">
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
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-4">
          <textarea
            placeholder="Share details about the product quality, condition, and packaging..."
            className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 p-4 min-h-[130px] outline-none text-sm leading-relaxed text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 resize-none"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          {previewUrls.length > 0 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {previewUrls.map((src, i) => (
                <div
                  key={src}
                  className="relative w-20 h-20 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shrink-0"
                >
                  <img
                    src={src}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setImageFiles((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-600 cursor-pointer"
                    aria-label="Remove photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <label className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
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
                    setImageFiles((prev) => [...prev, ...files].slice(0, 3));
                  }
                }}
              />
              <ImagePlus className="w-4 h-4 text-zinc-500" />
              <span>Attach Photos ({imageFiles.length}/3)</span>
            </label>
          </div>
        </div>

        <button
          type="button"
          disabled={loading || rating === 0 || !comment.trim()}
          onClick={handleSubmit}
          className="w-full py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-sm hover:opacity-95 active:scale-[0.99] disabled:opacity-45 flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
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
      </div>
    </div>
  );
};

export default LeaveReview;
