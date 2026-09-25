import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useNotify, useConfirm } from "../../components/Notifications";
import Icon from "../../components/Icon";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Edit } from "lucide-react";

interface Review {
  id: string;
  productId?: string;
  userId?: string;
  userName?: string;
  userPhoto?: string;
  rating: number;
  comment: string;
  images?: string[];
  createdAt: number;
  // User reviews fields
  reviewerId?: string;
  reviewerName?: string;
  revieweeId?: string;
  chatId?: string;
}

const ManageReviews = () => {
  const [activeTab, setActiveTab] = useState<"product" | "user">("product");
  const [productReviews, setProductReviews] = useState<Review[]>([]);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editComment, setEditComment] = useState("");
  const [editRating, setEditRating] = useState(5);

  const notify = useNotify();
  const confirm = useConfirm();
  const navigate = useNavigate();

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      // Fetch Product Reviews
      const qProduct = query(collection(db, "reviews"));
      const querySnapshotProduct = await getDocs(qProduct);
      const prodList: Review[] = [];
      querySnapshotProduct.forEach((doc) => {
        prodList.push({ id: doc.id, ...doc.data() } as Review);
      });
      prodList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setProductReviews(prodList);

      // Fetch User Reviews
      const qUser = query(collection(db, "user_reviews"));
      const querySnapshotUser = await getDocs(qUser);
      const uList: Review[] = [];
      querySnapshotUser.forEach((doc) => {
        uList.push({ id: doc.id, ...doc.data() } as Review);
      });
      uList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setUserReviews(uList);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      notify("Failed to fetch reviews", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (review: Review, type: "product" | "user") => {
    confirm({
      title: "Delete Review",
      message: "Are you sure you want to delete this review?",
      onConfirm: async () => {
        try {
          if (type === "product") {
            // 1. Get the product to recalculate rating if it has productId
            if (review.productId) {
              const productRef = doc(db, "products", review.productId);
              const productSnap = await getDoc(productRef);

              if (productSnap.exists()) {
                const productData = productSnap.data();
                const oldRating = productData.rating || 0;
                const oldNumReviews = productData.numReviews || 0;

                let newNumReviews = Math.max(0, oldNumReviews - 1);
                let newRating = 0;

                if (newNumReviews > 0) {
                  newRating =
                    (oldRating * oldNumReviews - review.rating) / newNumReviews;
                }

                await updateDoc(productRef, {
                  rating: Number(newRating.toFixed(1)),
                  numReviews: newNumReviews,
                });
              }
            }
            await deleteDoc(doc(db, "reviews", review.id));
            setProductReviews(productReviews.filter((r) => r.id !== review.id));
          } else {
            await deleteDoc(doc(db, "user_reviews", review.id));
            setUserReviews(userReviews.filter((r) => r.id !== review.id));
          }
          notify("Review deleted successfully", "success");
        } catch (error) {
          console.error("Delete review error:", error);
          notify("Failed to delete review", "error");
        }
      }
    });
  };

  const handleEdit = (review: Review) => {
    setEditingReview(review);
    setEditComment(review.comment);
    setEditRating(review.rating);
  };

  const handleUpdate = async () => {
    if (!editingReview) return;
    try {
      const collectionName = activeTab === "product" ? "reviews" : "user_reviews";
      const docRef = doc(db, collectionName, editingReview.id);
      
      await updateDoc(docRef, {
        comment: editComment.trim(),
        rating: editRating,
      });

      if (activeTab === "product") {
        setProductReviews(
          productReviews.map((r) =>
            r.id === editingReview.id ? { ...r, comment: editComment, rating: editRating } : r
          )
        );
        
        // Recalculate product rating if applicable
        if (editingReview.productId) {
          const productRef = doc(db, "products", editingReview.productId);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            // Re-fetch all reviews for this product to get precise average
            const allSnap = await getDocs(query(collection(db, "reviews")));
            const prodReviews = allSnap.docs
              .map((d) => d.data())
              .filter((d) => d.productId === editingReview.productId);
            
            const totalRating = prodReviews.reduce((sum, r) => sum + r.rating, 0);
            const avgRating = prodReviews.length > 0 ? totalRating / prodReviews.length : 0;
            
            await updateDoc(productRef, {
              rating: Number(avgRating.toFixed(1)),
            });
          }
        }
      } else {
        setUserReviews(
          userReviews.map((r) =>
            r.id === editingReview.id ? { ...r, comment: editComment, rating: editRating } : r
          )
        );
      }

      notify("Review updated successfully", "success");
      setEditingReview(null);
    } catch (error) {
      console.error("Update review error:", error);
      notify("Failed to update review", "error");
    }
  };

  const currentReviews = activeTab === "product" ? productReviews : userReviews;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Manage Reviews
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Edit and delete user-authored feedback and ratings.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("product")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "product"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            Product Reviews ({productReviews.length})
          </button>
          <button
            onClick={() => setActiveTab("user")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "user"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            User & Chat Reviews ({userReviews.length})
          </button>
        </div>
      </div>

      {editingReview && (
        <div className="mb-6 p-5 border border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10 rounded-2xl max-w-xl">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mb-3">Edit Review</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Rating</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setEditRating(star)}
                    className="p-0.5"
                  >
                    <Icon
                      name="star"
                      className={`text-lg ${
                        star <= editRating ? "text-amber-500" : "text-zinc-300 dark:text-zinc-700"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Comment</label>
              <textarea
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                className="w-full text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 outline-none focus:ring-2 ring-emerald-500/50 text-zinc-900 dark:text-zinc-100"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingReview(null)}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        {loading ? (
          <div className="py-20 text-center text-zinc-500">Loading...</div>
        ) : currentReviews.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 font-medium">
            No reviews found under this category.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {currentReviews.map((review) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex justify-between items-start p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm group hover:border-zinc-300 dark:hover:border-zinc-700 transition"
                >
                  <div className="flex-1 min-w-0 pr-4 text-left">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {activeTab === "product" ? review.userName : review.reviewerName}
                      </span>
                      <div className="flex items-center text-amber-500 gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Icon
                            key={i}
                            name="star"
                            className={`text-[11px] ${
                              i < review.rating ? "text-amber-500 fill-amber-500" : "text-zinc-200 dark:text-zinc-800"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {activeTab === "user" && (
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                        Reviewee UID: {review.revieweeId}
                      </p>
                    )}
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
                      {review.comment || <span className="italic text-zinc-400">No written comment left.</span>}
                    </p>
                    <div className="text-[10px] text-zinc-400 mt-3 font-semibold flex flex-wrap items-center gap-x-2 gap-y-1">
                      {activeTab === "product" ? (
                        <span>Product ID: {review.productId}</span>
                      ) : (
                        <span>Chat ID: {review.chatId}</span>
                      )}
                      <span>•</span>
                      <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(review)}
                      className="flex items-center justify-center size-8 rounded-full bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shrink-0"
                      title="Edit Review"
                    >
                      <Edit className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(review, activeTab)}
                      className="flex items-center justify-center size-8 rounded-full bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors shrink-0"
                      title="Delete Review"
                    >
                      <Icon name="trash" className="text-red-500 text-xs" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageReviews;
