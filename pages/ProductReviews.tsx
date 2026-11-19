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
import { Star, MessageSquare } from "lucide-react";
import { ReviewCard } from "../components/ui/review-card";
import { ReviewComposer } from "../components/ui/review-composer";
import {
  ReviewFilterGroup,
  ReviewFilterItem,
} from "../components/ui/review-filter-bars";
import { filterSafeReviews } from "../lib/reviewModeration";
import { useNotify, useConfirm } from "../components/Notifications";
import { hasImmediateAdminOrStaffRole } from "../lib/admin";
import { getProductDisplayImage } from "../src/lib/phonePartsArt";
import { triggerHaptic } from "../lib/haptics";

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
          triggerHaptic("success");
          notify("Review deleted.", "info");
        } catch {
          triggerHaptic("error");
          notify("Could not delete review.", "error");
        }
      },
    });
  };

  if (!product) {
    return <div className="min-h-screen bg-[#F5F5F7] dark:bg-black" />;
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
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4">
        {/* Top Product Context Bar */}
        <div
          onClick={() => {
            triggerHaptic("light");
            navigate(`/product/${id}`);
          }}
          className="ds-apple-surface rounded-[22px] p-4 mb-6 shadow-xs flex items-center justify-between gap-4 cursor-pointer active:scale-[0.99] transition-transform"
        >
          <div className="min-w-0">
            <h1 className="ds-apple-display text-[clamp(1rem,2.4vw,1.15rem)] font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
              {product.name}
            </h1>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#6E6E73] dark:text-[#98989D] mt-0.5 font-medium tabular-nums">
              <Star className="w-3.5 h-3.5 text-[#FF9500] dark:text-[#FF9F0A] fill-[#FF9500] dark:fill-[#FF9F0A] shrink-0" />
              <span className="font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                {averageRating.toFixed(1)}
              </span>
              <span>·</span>
              <span>
                {reviews.length}{" "}
                {reviews.length === 1 ? "review" : "reviews"}
              </span>
            </div>
          </div>

          <img
            src={getProductDisplayImage(product)}
            alt={product.name}
            className="w-12 h-12 rounded-2xl object-cover shrink-0 border border-black/[0.08] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E]"
          />
        </div>

        {/* Summary & Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
          <div className="md:col-span-5 rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.1] p-6 flex flex-col justify-between gap-4 shadow-xs">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6E6E73] dark:text-[#98989D]">
                Overall Rating
              </span>
              <div className="flex items-baseline gap-2.5 mt-2">
                <span className="text-5xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                  {averageRating.toFixed(1)}
                </span>
                <span className="text-sm font-medium text-[#6E6E73] dark:text-[#98989D]">
                  / 5.0
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${
                      s <= Math.round(averageRating)
                        ? "text-[#FF9500] dark:text-[#FF9F0A] fill-[#FF9500] dark:fill-[#FF9F0A]"
                        : "text-black/[0.12] dark:text-white/[0.16]"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-2 tabular-nums">
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

          <div className="md:col-span-7 rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.1] p-5 flex flex-col justify-center shadow-xs">
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
                onClick={() => {
                  triggerHaptic("selection");
                  setFilter(tab.key);
                }}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer tabular-nums border active:scale-[0.97] ${
                  active
                    ? "bg-[#0071E3] dark:bg-[#0A84FF] border-[#0071E3] dark:border-[#0A84FF] text-white shadow-xs"
                    : "bg-white dark:bg-[#1C1C1E] border-black/[0.08] dark:border-white/[0.1] text-[#1D1D1F] dark:text-[#F5F5F7] hover:border-black/[0.18] dark:hover:border-white/[0.2]"
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
            <div className="rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-dashed border-black/[0.12] dark:border-white/[0.14] py-14 px-6 text-center">
              <MessageSquare className="w-8 h-8 text-[#86868B] mx-auto mb-2.5" />
              <p className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                {reviews.length === 0
                  ? "No reviews yet for this product"
                  : "No reviews match the selected filter"}
              </p>
              {filter !== "all" && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setFilter("all");
                  }}
                  className="mt-3 text-xs font-semibold text-[#0071E3] dark:text-[#0A84FF] hover:underline cursor-pointer"
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
    </div>
  );
};

export default ProductReviews;
