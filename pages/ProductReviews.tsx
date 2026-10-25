import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { Product, Review } from "../types";
import { ChevronLeft, Star, MessageSquare } from "lucide-react";
import { ReviewCard } from "../components/ui/review-card";
import { ReviewComposer } from "../components/ui/review-composer";
import {
  ReviewFilterGroup,
  ReviewFilterItem,
} from "../components/ui/review-filter-bars";
import { filterSafeReviews } from "../lib/reviewModeration";
import { useNotify, useConfirm } from "../components/Notifications";
import { hasImmediateAdminOrStaffRole } from "../lib/admin";

type FilterKey = "all" | "photos" | "5" | "4" | "3" | "2" | "1";

const ProductReviews: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const confirm = useConfirm();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [composerOpen, setComposerOpen] = useState(false);

  const isAdmin = hasImmediateAdminOrStaffRole(null, auth.currentUser);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "products", id)).then((snap) => {
      if (snap.exists()) {
        setProduct({ id: snap.id, ...snap.data() } as Product);
      }
    });

    const q = query(collection(db, "reviews"), where("productId", "==", id));
    const unsub = onSnapshot(q, (snapshot) => {
      const rawList = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Review
      );
      const reviewList = filterSafeReviews(rawList);
      reviewList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setReviews(reviewList);
    });

    return () => unsub();
  }, [id]);

  const filteredReviews = useMemo(() => {
    if (filter === "photos") {
      return reviews.filter(
        (r) => Array.isArray((r as any).images) && (r as any).images.length > 0
      );
    }
    if (["5", "4", "3", "2", "1"].includes(filter)) {
      const targetStars = Number(filter);
      return reviews.filter((r) => Math.round(r.rating) === targetStars);
    }
    return reviews;
  }, [reviews, filter]);

  const handleDeleteReview = (reviewId: string) => {
    confirm({
      title: "Delete Review?",
      message: "Remove this customer review permanently?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "reviews", reviewId));
          notify("Review deleted.", "info");
        } catch {
          notify("Could not delete review.", "error");
        }
      },
    });
  };

  if (!product) {
    return <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950" />;
  }

  const averageRating =
    reviews.length > 0
      ? Number(
          (
            reviews.reduce((acc, curr) => acc + Number(curr.rating || 0), 0) /
            reviews.length
          ).toFixed(1)
        )
      : Number(product.rating || 0);

  const photoReviewsCount = reviews.filter(
    (r) => Array.isArray((r as any).images) && (r as any).images.length > 0
  ).length;

  return (
    <div className="max-w-4xl mx-auto min-h-screen bg-zinc-50/50 dark:bg-zinc-950 pb-16 px-4 sm:px-6 pt-4">
      {/* Top Product Context Bar */}
      <div className="sticky top-[56px] md:top-[64px] z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 mb-6 shadow-2xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={() => navigate(`/product/${id}`)}
            className="w-10 h-10 flex items-center shrink-0 justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Back to product"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
              {product.name}
            </h1>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5 font-medium tabular-nums">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                {averageRating.toFixed(1)}
              </span>
              <span>·</span>
              <span>
                {reviews.length}{" "}
                {reviews.length === 1 ? "review" : "reviews"}
              </span>
            </div>
          </div>
        </div>

        {(product.images?.[0] || product.image) && (
          <img
            src={product.images?.[0] || product.image}
            alt={product.name}
            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-zinc-200 dark:border-zinc-800 hidden sm:block"
          />
        )}
      </div>

      {/* Summary & Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        <div className="md:col-span-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-6 flex flex-col justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Overall Rating
            </span>
            <div className="flex items-baseline gap-2.5 mt-2">
              <span className="text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">
                {averageRating.toFixed(1)}
              </span>
              <span className="text-sm font-medium text-zinc-400">/ 5.0</span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-4 h-4 ${
                    s <= Math.round(averageRating)
                      ? "text-amber-400 fill-amber-400"
                      : "text-zinc-200 dark:text-zinc-700"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 tabular-nums">
              Based on {reviews.length} verified customer{" "}
              {reviews.length === 1 ? "review" : "reviews"}
            </p>
          </div>

          <ReviewComposer
            productId={product.id}
            product={product}
            isOpen={composerOpen ? false : false}
            onOpenChange={() => setComposerOpen((prev) => !prev)}
          />
        </div>

        <div className="md:col-span-7 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 flex flex-col justify-center">
          <ReviewFilterGroup
            value={["5", "4", "3", "2", "1"].includes(filter) ? filter : ""}
            onValueChange={(val) =>
              setFilter((prev) => (prev === val ? "all" : (val as FilterKey)))
            }
          >
            {[5, 4, 3, 2, 1].map((stars) => (
              <ReviewFilterItem
                key={stars}
                value={String(stars)}
                stars={stars}
                count={
                  reviews.filter((r) => Math.round(r.rating) === stars).length
                }
                total={reviews.length}
              />
            ))}
          </ReviewFilterGroup>
        </div>
      </div>

      {/* Expandable Full-Width Review Composer */}
      {composerOpen && (
        <div className="mb-6">
          <ReviewComposer
            productId={product.id}
            product={product}
            isOpen={true}
            onOpenChange={setComposerOpen}
          />
        </div>
      )}

      {/* Interactive Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-4">
        {(
          [
            { key: "all", label: `All (${reviews.length})` },
            { key: "photos", label: `With Photos (${photoReviewsCount})` },
            { key: "5", label: "5 ★" },
            { key: "4", label: "4 ★" },
            { key: "3", label: "3 ★" },
            { key: "2", label: "2 ★" },
            { key: "1", label: "1 ★" },
          ] as { key: FilterKey; label: string }[]
        ).map((tab) => {
          const active = filter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer tabular-nums border ${
                active
                  ? "bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Reviews List */}
      <div className="flex flex-col gap-3.5">
        {filteredReviews.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 py-14 px-6 text-center">
            <MessageSquare className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2.5" />
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {reviews.length === 0
                ? "No reviews yet for this product"
                : "No reviews match the selected filter"}
            </p>
            {filter !== "all" && (
              <button
                type="button"
                onClick={() => setFilter("all")}
                className="mt-3 text-xs font-bold text-[#1877F2] hover:underline cursor-pointer"
              >
                Show all reviews
              </button>
            )}
          </div>
        ) : (
          filteredReviews.map((review) => {
            const isOwn =
              Boolean(auth.currentUser?.uid) &&
              review.userId === auth.currentUser?.uid;
            return (
              <ReviewCard
                key={review.id}
                name={review.userName}
                handle={isOwn ? "Your Review" : "Verified Buyer"}
                review={review.comment}
                rating={review.rating}
                imageUrl={review.userPhoto}
                images={(review as any).images}
                createdAt={review.createdAt}
                canDelete={isOwn || isAdmin}
                onDelete={() => handleDeleteReview(review.id)}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProductReviews;
