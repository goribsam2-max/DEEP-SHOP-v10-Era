import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  collection,
  getDocs,
} from "firebase/firestore";
import { Product } from "../types";
import { FormCardPageSkeleton } from "../components/PageSkeletons";
import { useNotify } from "../components/Notifications";
import { uploadToImgbb } from "../services/imgbb";
import Icon from "../components/Icon";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { APPLE_SPRING_SNAPPY } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";
import {
  hasImmediateAdminOrStaffRole,
  checkStaffRecord,
} from "../lib/admin";

const CreateBlog: React.FC = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const notify = useNotify();
  const prefersReducedMotion = useReducedMotion();

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImage, setExistingImage] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");

  const [saving, setSaving] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [showProductSelect, setShowProductSelect] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inlineImgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setCheckingAccess(false);
        navigate("/signin", { replace: true });
        return;
      }

      try {
        const uSnap = await getDoc(doc(db, "users", u.uid));
        const uData = uSnap.exists() ? uSnap.data() : null;
        let allowed = hasImmediateAdminOrStaffRole(uData, u);
        if (!allowed) {
          const staffCheck = await checkStaffRecord(uData?.email || u.email);
          allowed = staffCheck.isStaff;
        }

        if (!allowed) {
          setCheckingAccess(false);
          notify(
            "Access denied. Only admins and staff can publish blog articles.",
            "error"
          );
          navigate("/blog", { replace: true });
          return;
        }

        setCheckingAccess(false);

        const snap = await getDocs(query(collection(db, "products")));
        setProducts(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product)
        );

        if (slug) {
          const bDoc = await getDoc(doc(db, "blogs", slug));
          if (bDoc.exists()) {
            const b = bDoc.data();
            setTitle(b.title || "");
            setExcerpt(b.excerpt || "");
            setContent(b.content || "");
            setSeoTitle(b.seoTitle || "");
            setSeoDesc(b.seoDescription || "");
            setExistingImage(b.image || "");
          }
        }
      } catch (err) {
        console.error(err);
        setCheckingAccess(false);
        navigate("/blog", { replace: true });
      }
    });

    return () => unsub();
  }, [slug, navigate]);

  const insertText = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent =
      content.substring(0, start) + text + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const handleFormat = (format: string) => {
    triggerHaptic("selection");
    switch (format) {
      case "h2":
        insertText("## Heading 2\n");
        break;
      case "h3":
        insertText("### Heading 3\n");
        break;
      case "h4":
        insertText("#### Heading 4\n");
        break;
      case "p":
        insertText("\n\nParagraph text here...\n\n");
        break;
      case "italic":
        insertText("*italic*");
        break;
      case "underline":
        insertText("<u>underline</u>");
        break;
      case "list":
        insertText("\n1. List item 1\n2. List item 2\n");
        break;
      case "link":
        insertText("[Link Name](https://...)");
        break;
    }
  };

  const handleInlineImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    notify("Uploading image...", "info");
    try {
      const url = await uploadToImgbb(file);
      insertText(`\n![Image](${url})\n`);
      notify("Image inserted", "success");
    } catch (err) {
      notify("Failed to upload info image", "error");
    }
  };

  const handleProductPill = (prodId: string) => {
    triggerHaptic("selection");
    insertText(`\n[[product:${prodId}]]\n`);
    setShowProductSelect(false);
  };

  const generateSlug = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

  const handleSave = async () => {
    triggerHaptic("medium");
    if (!title || !excerpt || !content)
      return notify("Please fill title, excerpt and content", "error");
    setSaving(true);
    let imageUrl = existingImage;
    if (imageFile) {
      try {
        imageUrl = await uploadToImgbb(imageFile);
      } catch (e) {
        setSaving(false);
        return notify("Featured image upload failed", "error");
      }
    }

    try {
      if (slug) {
        await updateDoc(doc(db, "blogs", slug), {
          title,
          excerpt,
          content,
          image: imageUrl,
          seoTitle: seoTitle || title,
          seoDescription: seoDesc || excerpt,
          metaImage: imageUrl,
        });
        notify("Blog Updated!", "success");
      } else {
        const newSlug =
          generateSlug(title) + "-" + Date.now().toString().slice(-4);
        await setDoc(doc(db, "blogs", newSlug), {
          title,
          slug: newSlug,
          excerpt,
          content,
          image: imageUrl,
          seoTitle: seoTitle || title,
          seoDescription: seoDesc || excerpt,
          metaImage: imageUrl,
          authorId: auth.currentUser?.uid || "admin",
          authorName: auth.currentUser?.displayName || "DeepShop Team",
          createdAt: Date.now(),
          views: 0,
        });
        notify("Blog Published!", "success");
      }
      navigate("/blog");
    } catch (e) {
      notify("Failed to save blog", "error");
    }
    setSaving(false);
  };

  if (checkingAccess) {
    return <FormCardPageSkeleton />;
  }

  return (
    <div className="ds-apple-shop-canvas min-h-screen bg-[#F5F5F7] dark:bg-black text-[#1D1D1F] dark:text-[#F5F5F7] pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="min-w-0">
            <p className="ds-apple-eyebrow mb-0.5">Editorial</p>
            <h1 className="ds-apple-display text-[22px] sm:text-[26px] leading-tight font-bold tracking-tight truncate">
              {slug ? "Edit Article" : "New Article"}
            </h1>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="ds-apple-btn-primary h-9 px-5 rounded-full text-[13px] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            {saving ? "Saving..." : slug ? "Update" : "Publish"}
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="ds-apple-surface rounded-[22px] p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold ds-apple-muted mb-2 block">
                  Blog Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="ds-apple-input w-full rounded-[14px] px-4 py-3 font-semibold text-[15px] outline-none"
                  placeholder="e.g. Top 5 smartwatches in 2026"
                />
              </div>
              <div>
                <label className="text-xs font-semibold ds-apple-muted mb-2 block">
                  Short Excerpt
                </label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={3}
                  className="ds-apple-input w-full rounded-[14px] px-4 py-3 text-[14px] outline-none resize-none"
                  placeholder="A short description for the blog list card..."
                />
              </div>
            </div>

            <div className="ds-apple-surface rounded-[22px] overflow-hidden flex flex-col">
              <div className="bg-[#F2F2F7] dark:bg-[#2C2C2E] border-b border-black/[0.08] dark:border-white/[0.1] flex flex-wrap items-center p-2.5 gap-1.5">
                {(["h2", "h3", "h4"] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleFormat(h)}
                    className="px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] uppercase cursor-pointer"
                  >
                    {h}
                  </button>
                ))}
                <div className="w-px h-4 bg-black/10 dark:bg-white/15 mx-0.5" />
                <button
                  type="button"
                  onClick={() => handleFormat("italic")}
                  className="px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-xs italic font-serif cursor-pointer"
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => handleFormat("underline")}
                  className="px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-xs underline cursor-pointer"
                >
                  U
                </button>
                <div className="w-px h-4 bg-black/10 dark:bg-white/15 mx-0.5" />
                <button
                  type="button"
                  onClick={() => handleFormat("list")}
                  className="px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-xs cursor-pointer"
                >
                  <Icon name="list-ol" />
                </button>
                <button
                  type="button"
                  onClick={() => handleFormat("link")}
                  className="px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-xs cursor-pointer"
                >
                  <Icon name="link" />
                </button>
                <div className="w-px h-4 bg-black/10 dark:bg-white/15 mx-0.5" />
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    inlineImgInputRef.current?.click();
                  }}
                  className="px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Icon name="image" /> Image
                </button>
                <input
                  type="file"
                  hidden
                  ref={inlineImgInputRef}
                  onChange={handleInlineImage}
                  accept="image/*"
                />

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("selection");
                      setShowProductSelect(!showProductSelect);
                    }}
                    className="px-3 py-1.5 bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] rounded-lg text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Icon name="box" /> Product Pill
                  </button>
                  <AnimatePresence>
                    {showProductSelect && (
                      <motion.div
                        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.96 }}
                        transition={prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_SNAPPY}
                        className="ds-apple-popover absolute top-10 left-0 w-64 rounded-[18px] z-50 max-h-60 overflow-y-auto origin-top-left"
                      >
                        {products.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => handleProductPill(p.id)}
                            className="p-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] border-b border-black/[0.06] dark:border-white/[0.08] cursor-pointer flex items-center gap-3"
                          >
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-8 h-8 rounded-lg object-cover"
                            />
                            <span className="text-xs font-medium truncate">
                              {p.name}
                            </span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 min-h-[460px] p-5 bg-transparent outline-none font-mono text-sm leading-relaxed text-[#1D1D1F] dark:text-[#F5F5F7]"
                placeholder="Write your blog content here. Uses Markdown syntax. You can use HTML tags like <u>underline</u> too."
              />
            </div>
          </div>

          <div className="lg:col-span-1 space-y-5">
            <div className="ds-apple-surface p-5 rounded-[22px]">
              <h3 className="text-xs font-semibold ds-apple-muted uppercase tracking-wider mb-3.5">
                Featured Image
              </h3>
              <div
                onClick={() => {
                  triggerHaptic("selection");
                  fileInputRef.current?.click();
                }}
                className="w-full aspect-video border border-dashed border-black/20 dark:border-white/20 rounded-[16px] flex items-center justify-center cursor-pointer bg-[#F5F5F7] dark:bg-[#2C2C2E] hover:border-[#0071E3] transition-colors overflow-hidden"
              >
                {imageFile ? (
                  <img
                    src={URL.createObjectURL(imageFile)}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : existingImage ? (
                  <img
                    src={existingImage}
                    alt="Existing cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center ds-apple-muted">
                    <Icon name="cloud-upload" className="text-lg mb-1.5" />
                    <p className="text-xs font-semibold">
                      Upload Cover
                    </p>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                hidden
                onChange={(e) => {
                  if (e.target.files) setImageFile(e.target.files[0]);
                }}
                accept="image/*"
              />
            </div>

            <div className="ds-apple-surface p-5 rounded-[22px] space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                <Icon name="google" className="text-[#0071E3] dark:text-[#0A84FF]" /> SEO Settings
              </h3>
              <p className="text-xs ds-apple-muted">
                Meta data for Google indexing &amp; Social Media shares.
              </p>
              <div>
                <label className="text-xs font-medium ds-apple-muted block mb-1.5">
                  SEO Title
                </label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  className="ds-apple-input w-full rounded-[12px] px-3 py-2.5 text-xs outline-none"
                  placeholder="Default uses Blog Title"
                />
              </div>
              <div>
                <label className="text-xs font-medium ds-apple-muted block mb-1.5">
                  Meta Description
                </label>
                <textarea
                  value={seoDesc}
                  onChange={(e) => setSeoDesc(e.target.value)}
                  className="ds-apple-input w-full rounded-[12px] px-3 py-2.5 text-xs outline-none resize-none"
                  rows={3}
                  placeholder="Default uses Excerpt"
                />
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="ds-apple-btn-primary w-full py-3.5 px-5 mt-2 rounded-full text-sm font-semibold whitespace-nowrap active:scale-[0.98] flex items-center justify-center cursor-pointer"
              >
                {saving ? (
                  <span className="h-4 w-28 rounded-full ds-skeleton inline-block" />
                ) : slug ? (
                  "Update Blog"
                ) : (
                  "Publish Blog"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CreateBlog;
