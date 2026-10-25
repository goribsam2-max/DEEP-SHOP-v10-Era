import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { collection, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { uploadToImgbb } from "../../services/imgbb";
import { useNotify } from "../Notifications";
import { isScamReview } from "../../lib/reviewModeration";
import { checkContainsBannedWord } from "../../lib/wordFilter";
import { Star, ImagePlus, X, Pencil, Loader2, Send } from "lucide-react";

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent!",
};

interface ReviewComposerProps {
  productId?: string;
  product: any;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onReviewAdded?: () => void;
}

export function ReviewComposer({
  productId,
  product,
  isOpen,
  onOpenChange,
  onReviewAdded,
}: ReviewComposerProps) {
  const notify = useNotify();
  const navigate = useNavigate();

  const [internalExpanded, setInternalExpanded] = useState(false);
  const isControlled = isOpen !== undefined;
  const expanded = isControlled ? isOpen : internalExpanded;

  const setExpanded = (val: boolean) => {
    if (!isControlled) setInternalExpanded(val);
    onOpenChange?.(val);
  };

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urls = imageFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [imageFiles]);

  const handleOpenClick = () => {
    if (!auth.currentUser) {
      notify("Please sign in to write a review.", "info");
      navigate("/signin");
      return;
    }
    setExpanded(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    e.target.value = "";
    if (selected.length === 0) return;

    if (imageFiles.length + selected.length > 3) {
      notify("You can attach up to 3 photos per review.", "info");
      setImageFiles((prev) => [...prev, ...selected].slice(0, 3));
      return;
    }
    setImageFiles((prev) => [...prev, ...selected]);
  };

  const handleSubmit = async () => {
    if (!auth.currentUser) {
      notify("Please sign in to leave a review.", "error");
      navigate("/signin");
      return;
    }
    if (rating === 0) {
      notify("Please tap a star rating first.", "error");
      return;
    }
    if (!comment.trim()) {
      notify("Please share a few words about the product.", "error");
      return;
    }
    if (!productId || !product) return;

    const bannedWord = await checkContainsBannedWord(comment);
    if (bannedWord) {
      notify(
        `Your review contains prohibited words ("${bannedWord}"). Please edit your review.`,
        "error"
      );
      return;
    }

    if (isScamReview(comment)) {
      notify("Review posted!", "success");
      setComment("");
      setRating(0);
      setImageFiles([]);
      setExpanded(false);
      onReviewAdded?.();
      return;
    }

    setLoading(true);
    try {
      const imageUrls: string[] = [];
      for (const file of imageFiles) {
        const uploadedUrl = await uploadToImgbb(file);
        if (uploadedUrl) imageUrls.push(uploadedUrl);
      }

      // Resolve real user profile name & avatar from Firestore `users/{uid}`
      let resolvedName = auth.currentUser.displayName || "";
      let resolvedPhoto = auth.currentUser.photoURL || "";
      try {
        const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userSnap.exists()) {
          const uData = userSnap.data();
          resolvedName =
            uData.displayName ||
            uData.name ||
            uData.shopName ||
            resolvedName;
          resolvedPhoto =
            uData.photoURL ||
            uData.avatar ||
            uData.shopLogo ||
            resolvedPhoto;
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

      // Best-effort sync of product summary fields (non-blocking for regular buyers)
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

      notify("Thank you! Your review is live.", "success");
      setComment("");
      setRating(0);
      setHoverRating(0);
      setImageFiles([]);
      setExpanded(false);
      onReviewAdded?.();
    } catch {
      notify("Could not publish review. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={handleOpenClick}
        className="w-full sm:w-auto px-5 py-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs sm:text-sm font-semibold hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shadow-xs"
      >
        <Pencil className="w-4 h-4 shrink-0" />
        <span>Write a Review</span>
      </button>
    );
  }

  const activeStars = hoverRating || rating;

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Write a Customer Review
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Share your honest experience with this product
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
          aria-label="Close review composer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Interactive Star Selector */}
      <div className="flex flex-wrap items-center gap-3 mb-4 py-2.5 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/70 dark:border-zinc-800/80">
        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          Your Rating:
        </span>
        <div
          className="flex items-center gap-1"
          onMouseLeave={() => setHoverRating(0)}
        >
          {[1, 2, 3, 4, 5].map((star) => {
            const filled = star <= activeStars;
            return (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onClick={() => setRating(star)}
                className="p-1 transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
              >
                <Star
                  className={`w-6 h-6 transition-colors ${
                    filled
                      ? "text-amber-400 fill-amber-400"
                      : "text-zinc-300 dark:text-zinc-700"
                  }`}
                />
              </button>
            );
          })}
        </div>
        {activeStars > 0 && (
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
            {RATING_LABELS[activeStars]}
          </span>
        )}
      </div>

      {/* Review Textarea */}
      <textarea
        className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 outline-none resize-none min-h-[110px] p-3.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 leading-relaxed transition-colors"
        placeholder="What did you like about build quality, condition, battery, or packaging?"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      {/* Selected Photo Previews */}
      {previewUrls.length > 0 && (
        <div className="flex items-center gap-2.5 mt-3 overflow-x-auto pb-1">
          {previewUrls.map((src, idx) => (
            <div
              key={src}
              className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800"
            >
              <img
                src={src}
                alt={`Attachment ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() =>
                  setImageFiles((files) => files.filter((_, i) => i !== idx))
                }
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer"
                aria-label="Remove photo"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={imageFiles.length >= 3 || loading}
            className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <ImagePlus className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
            <span>Add Photos ({imageFiles.length}/3)</span>
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !comment.trim() || rating === 0}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold flex items-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-45 cursor-pointer whitespace-nowrap shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Posting...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>Post Review</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
