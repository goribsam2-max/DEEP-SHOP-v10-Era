import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Blog } from "../types";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import SEO from "../components/SEO";
import { PostCard } from "../components/ui/post-card";
import { motion, useReducedMotion } from "framer-motion";
import { useConfirm } from "../components/Notifications";
import { APPLE_SPRING_DEFAULT } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

const BlogList: React.FC = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const confirm = useConfirm();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const checkAdmin = async () => {
      import("../firebase").then(({ auth, db }) => {
        import("firebase/auth").then(({ onAuthStateChanged }) => {
          onAuthStateChanged(auth, async (user) => {
            if (user) {
              import("firebase/firestore").then(async ({ doc, getDoc }) => {
                const udoc = await getDoc(doc(db, "users", user.uid));
                if (
                  udoc.exists() &&
                  (udoc.data().role === "admin" ||
                    udoc.data().role === "staff" ||
                    udoc.data().email === "admin@deep.shop")
                ) {
                  setIsAdmin(true);
                }
              });
            }
          });
        });
      });
    };
    checkAdmin();

    const q = query(collection(db, "blogs"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setBlogs(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Blog));
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div className="ds-apple-shop-canvas min-h-screen bg-[#F5F5F7] dark:bg-black text-[#1D1D1F] dark:text-[#F5F5F7] pb-24">
      <SEO
        title="Tech Blog & Gadget Reviews | DEEP SHOP"
        description="Read our latest top 5 gadget lists, tech tips, and product reviews."
      />

      <div className="max-w-3xl mx-auto px-4 md:px-6 pt-6 sm:pt-8">
        <div className="ds-apple-surface rounded-[24px] p-6 sm:p-8 mb-8 relative overflow-hidden">
          <div className="flex items-start justify-between gap-3 mb-2">
            <span className="ds-apple-eyebrow text-[11px] text-[#0071E3] dark:text-[#0A84FF] block">
              DEEP SHOP Editorial
            </span>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("medium");
                  navigate("/blog/create");
                }}
                className="ds-apple-btn-primary h-8.5 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Icon name="plus" />
                <span>New Post</span>
              </button>
            )}
          </div>
          <h1 className="ds-apple-display text-[22px] sm:text-[30px] leading-tight font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] mb-2.5">
            Tech Insights &amp; Hacks
          </h1>
          <p className="ds-apple-muted text-[14.5px] sm:text-[15.5px] leading-relaxed max-w-2xl">
            Stay updated with our latest gadget reviews, battery longevity tips, smart home tutorials, and buyer guides.
          </p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="ds-apple-display text-xl sm:text-2xl font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
            Latest Posts
          </h2>
          {!loading && (
            <span className="ds-apple-muted text-xs font-medium tabular-nums">
              {blogs.length} {blogs.length === 1 ? "article" : "articles"}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-6">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="ds-apple-surface rounded-[24px] p-4 sm:p-6 space-y-4">
                <div className="w-full h-52 sm:h-64 rounded-[18px] ds-skeleton" />
                <div className="h-3.5 w-32 rounded-lg ds-skeleton" />
                <div className="h-6 w-4/5 rounded-xl ds-skeleton" />
                <div className="space-y-2">
                  <div className="h-3.5 w-full rounded-lg ds-skeleton" />
                  <div className="h-3.5 w-2/3 rounded-lg ds-skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {blogs.map((blog, i) => (
              <motion.div
                key={blog.id}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0.14 }
                    : { ...APPLE_SPRING_DEFAULT, delay: Math.min(i * 0.05, 0.2) }
                }
              >
                <PostCard
                  blog={blog}
                  isAdmin={isAdmin}
                  onEdit={() => {
                    triggerHaptic("selection");
                    navigate(`/blog/edit/${blog.slug}`);
                  }}
                  onDelete={() => {
                    triggerHaptic("warning");
                    confirm({
                      title: "Delete Blog Post",
                      message: "Are you sure you want to delete this post?",
                      onConfirm: async () => {
                        const { deleteDoc, doc } = await import("firebase/firestore");
                        await deleteDoc(doc(db, "blogs", blog.id));
                      }
                    });
                  }}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default BlogList;
