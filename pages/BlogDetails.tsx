import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { Blog } from "../types";
import Icon from "../components/Icon";
import SEO from "../components/SEO";
import { StatusBadge } from "../components/ui/status-badge";
import { BlogDetailPageSkeleton } from "../components/PageSkeletons";
import { useNotify, useConfirm } from "../components/Notifications";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, Pen, Trash2 } from "lucide-react";
import { useRegion } from "../components/RegionContext";
import { triggerHaptic } from "../lib/haptics";
import { APPLE_SPRING_DEFAULT } from "../lib/shoppingRoute";

const BlogDetails: React.FC = () => {
  const { formatPrice } = useRegion();
  const { slug } = useParams();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [recentBlogs, setRecentBlogs] = useState<Blog[]>([]);
  const [pillProducts, setPillProducts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const notify = useNotify();
  const confirm = useConfirm();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        import("firebase/firestore").then(async ({ doc, getDoc }) => {
          const udoc = await getDoc(doc(db, "users", user.uid));
          if (
            udoc.exists() &&
            (udoc.data().role === "admin" ||
              udoc.data().role === "staff" ||
              udoc.data().email === "admin@deep.shop" ||
              user.email === "vibegadgetfeni@gmail.com" ||
              user.email === "deepshop@gmail.com" ||
              user.email === "deepshopbysam@gmail.com")
          ) {
            setIsAdmin(true);
          }
        });
      } else {
        setIsAdmin(false);
      }
    });
    return unsubAuth;
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchBlog = async () => {
      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const q = query(
          collection(db, "blogs"),
          where("slug", "==", slug),
          limit(1),
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const bData = { id: snap.docs[0].id, ...snap.docs[0].data() } as Blog;
          setBlog(bData);

          const pIds = Array.from(
            bData.content.matchAll(/\[\[product:([A-Za-z0-9_-]+)\]\]/g),
          ).map((m) => m[1]);
          if (pIds.length > 0) {
            const fetchedProds: Record<string, any> = {};
            await Promise.all(
              pIds.map(async (pid) => {
                const pdoc = await getDoc(doc(db, "products", pid));
                if (pdoc.exists())
                  fetchedProds[pid] = { id: pdoc.id, ...pdoc.data() };
              }),
            );
            setPillProducts(fetchedProds);
          }
        }

        const qRecent = query(
          collection(db, "blogs"),
          orderBy("createdAt", "desc"),
          limit(4),
        );
        const snapRecent = await getDocs(qRecent);
        setRecentBlogs(
          snapRecent.docs
            .map((d) => ({ id: d.id, ...d.data() }) as Blog)
            .filter((b) => b.slug !== slug)
            .slice(0, 3),
        );
      } catch (e) {}
      setLoading(false);
    };
    fetchBlog();
  }, [slug]);

  if (loading) {
    return <BlogDetailPageSkeleton />;
  }

  if (!blog) {
    return (
      <div className="ds-apple-shop-canvas min-h-[85vh] flex flex-col items-center justify-center text-center px-6 bg-[#F5F5F7] dark:bg-black text-[#1D1D1F] dark:text-[#F5F5F7]">
        <div className="ds-apple-surface rounded-[24px] p-8 max-w-sm w-full space-y-4">
          <Icon
            name="newspaper"
            className="text-3xl text-[#6E6E73] dark:text-[#98989D] mx-auto"
          />
          <h2 className="ds-apple-display text-lg font-bold">
            Article Not Found
          </h2>
          <p className="ds-apple-muted text-sm">
            The article you are looking for does not exist or has been removed.
          </p>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              navigate("/blog");
            }}
            className="ds-apple-btn-primary w-full h-11 px-5 rounded-full text-sm font-semibold whitespace-nowrap cursor-pointer"
          >
            Back to Journal
          </button>
        </div>
      </div>
    );
  }

  const processedContent = blog.content.replace(/\[\[product:([A-Za-z0-9_-]+)\]\]/g, "prod://$1");

  return (
    <div className="ds-apple-shop-canvas min-h-screen bg-[#F5F5F7] dark:bg-black text-[#1D1D1F] dark:text-[#F5F5F7] font-sans pb-20">
      <SEO title={blog.title} description={blog.excerpt} />

      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 pt-6">
        <div className="bg-[#1C1C1E] rounded-[24px] overflow-hidden relative border border-black/[0.08] dark:border-white/[0.1] shadow-sm">
          {blog.image && (
            <img
              src={blog.image}
              className="absolute inset-0 w-full h-full object-cover opacity-40"
              alt=""
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />
          <div className="relative z-10 p-6 md:p-10 md:pb-12">
            <motion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_DEFAULT}
            >
              <div className="mb-3">
                <StatusBadge
                  leftIcon={CalendarDays}
                  leftLabel={new Date(blog.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                />
              </div>
              <h1 className="ds-apple-display text-[22px] sm:text-[28px] font-bold text-white tracking-tight leading-[1.2]">
                {blog.title}
              </h1>
            </motion.div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 mt-5">
          <div className="ds-apple-surface p-4 rounded-[20px] flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-xs uppercase tracking-wider text-[#6E6E73] dark:text-[#98989D]">
              <span className="w-2 h-2 rounded-full bg-[#FF9F0A] shrink-0" />
              <span>Admin Actions</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("selection");
                  navigate(`/blog/edit/${blog.slug}`);
                }}
                className="ds-apple-btn-primary px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Pen className="w-3.5 h-3.5 shrink-0" />
                <span>Edit Post</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("warning");
                  confirm({
                    title: "Delete Blog Post?",
                    message: "Are you sure you want to permanently delete this blog post? This action cannot be undone.",
                    onConfirm: async () => {
                      const { deleteDoc, doc } = await import("firebase/firestore");
                      await deleteDoc(doc(db, "blogs", blog.id));
                      notify("Blog post removed successfully.", "info");
                      navigate("/blog");
                    }
                  });
                }}
                className="bg-[#FF3B30] hover:bg-[#E0352B] text-white px-4 py-2 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Delete Post</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10">
        <article className="ds-apple-surface rounded-[24px] p-6 sm:p-8 prose prose-zinc dark:prose-invert prose-base sm:prose-lg max-w-none">
          <div className="markdown-body text-[#1D1D1F] dark:text-[#F5F5F7] leading-relaxed">
            <Markdown
              rehypePlugins={[rehypeRaw]}
              components={{
                a: ({ node, ...props }) => {
                  if (props.href?.startsWith("prod://")) {
                    const pid = props.href.replace("prod://", "");
                    const p = pillProducts[pid];
                    if (!p) return null;
                    return (
                      <Link
                        to={`/product/${pid}`}
                        onClick={() => triggerHaptic("selection")}
                        className="not-prose ds-apple-surface-subtle flex items-center gap-4 p-4 rounded-[20px] hover:border-[#0071E3] dark:hover:border-[#0A84FF] transition-colors my-6 cursor-pointer group no-underline"
                      >
                        <div className="w-20 h-20 bg-white dark:bg-[#1C1C1E] rounded-2xl p-2 shrink-0 border border-black/[0.06] dark:border-white/[0.08] group-hover:scale-105 transition-transform">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                            {p.name}
                          </h4>
                          <p className="text-[11px] font-medium ds-apple-muted mb-1">
                            {p.category}
                          </p>
                          <p className="text-base font-bold text-[#0071E3] dark:text-[#0A84FF] tabular-nums">
                            {formatPrice(p.isOffer ? p.offerPrice : p.price)}
                          </p>
                        </div>
                        <div className="hidden md:flex w-10 h-10 rounded-full bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] items-center justify-center shrink-0">
                          <Icon name="arrow-right" />
                        </div>
                      </Link>
                    );
                  }
                  return (
                    <a
                      {...props}
                      className="text-[#0071E3] dark:text-[#0A84FF] no-underline border-b border-[#0071E3]/40 hover:border-[#0071E3] transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  );
                },
                img: ({ node, ...props }) => (
                  <span className="not-prose block my-6">
                    <img
                      {...props}
                      className="w-full rounded-[20px] border border-black/[0.08] dark:border-white/[0.1]"
                    />
                  </span>
                ),
                p: ({ node, ...props }) => (
                  <p {...props} className="mb-5 whitespace-pre-wrap" />
                ),
              }}
            >
              {processedContent}
            </Markdown>
          </div>

          <div className="mt-10 pt-6 border-t border-black/[0.08] dark:border-white/[0.1] flex items-center justify-between">
            <div>
              <h4 className="text-[11px] font-semibold ds-apple-muted uppercase tracking-wider mb-2">
                Share this article
              </h4>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("success");
                    navigator.clipboard.writeText(window.location.href);
                    notify("Link copied to clipboard!", "success");
                  }}
                  className="ds-apple-icon-btn w-10 h-10 flex items-center justify-center rounded-full active:scale-[0.95] transition cursor-pointer"
                  aria-label="Copy article link"
                >
                  <Icon name="link" />
                </button>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => triggerHaptic("selection")}
                  className="ds-apple-icon-btn w-10 h-10 flex items-center justify-center rounded-full active:scale-[0.95] transition"
                  aria-label="Share on X"
                >
                  <Icon name="twitter" />
                </a>
              </div>
            </div>
          </div>
        </article>

        <aside className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider ds-apple-muted border-b border-black/[0.08] dark:border-white/[0.1] pb-2.5">
            Recent Posts
          </h3>
          <div className="space-y-4">
            {recentBlogs.map((rb) => (
              <Link
                to={`/blog/${rb.slug}`}
                key={rb.id}
                onClick={() => triggerHaptic("selection")}
                className="ds-apple-surface rounded-[18px] p-3 group block transition-transform active:scale-[0.98]"
              >
                <div className="aspect-video bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-[12px] overflow-hidden mb-2.5">
                  <img
                    src={rb.image}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt={rb.title}
                  />
                </div>
                <h4 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] leading-snug group-hover:text-[#0071E3] dark:group-hover:text-[#0A84FF] transition-colors line-clamp-2">
                  {rb.title}
                </h4>
                <p className="text-[11px] ds-apple-muted font-medium mt-1.5 tabular-nums">
                  {new Date(rb.createdAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};
export default BlogDetails;
