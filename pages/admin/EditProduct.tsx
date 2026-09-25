import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useNotify } from "../../components/Notifications";
import { uploadToImgbb } from "../../services/imgbb";
import SEO from "../../components/SEO";
import { ChevronLeft, Loader2, Save, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CustomDropdown } from "../../components/CustomDropdown";

const EditProduct: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    description: "",
    category: "Border Cross Products",
    customCategory: "",
    stock: 10,
    image: "",
    images: [] as string[],
    isOffer: false,
    offerPrice: 0,
    modelUrl: "",
    videoUrl: "",
    advanceType: "custom",
    advanceMode: "fixed",
    advanceAmount: "",
    advancePercentage: "",
  });
  const [newImageFile, setNewImageFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const product = docSnap.data();
          setFormData({
            name: product.name || "",
            price: product.price || 0,
            description: product.description || "",
            category: product.category || "Border Cross Products",
            customCategory: "",
            stock: product.stock || 10,
            image: product.image || "",
            images: product.images || [],
            isOffer: product.isOffer || false,
            offerPrice: product.offerPrice || 0,
            modelUrl: product.modelUrl || "",
            videoUrl: product.videoUrl || "",
            advanceType: product.advanceType || "custom",
            advanceMode: product.advanceMode || (product.advancePercentage ? "percentage" : "fixed"),
            advanceAmount: product.advanceAmount !== undefined && product.advanceAmount !== null ? String(product.advanceAmount) : "",
            advancePercentage: product.advancePercentage !== undefined && product.advancePercentage !== null ? String(product.advancePercentage) : "",
          });
        } else {
          notify("Product not found", "error");
          navigate("/");
        }
      } catch (err: any) {
        notify("Failed to fetch product: " + err.message, "error");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, navigate, notify]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      let finalImageUrl = formData.image;
      let finalImages = [...formData.images];

      if (newImageFile) {
        finalImageUrl = await uploadToImgbb(newImageFile);
        if (finalImages.length > 0) {
          finalImages[0] = finalImageUrl;
        } else {
          finalImages.push(finalImageUrl);
        }
      }

      const categoryValue = formData.category === "Custom" ? formData.customCategory : formData.category;

      let calcAdvance = 0;
      let isBypass = formData.advanceType === "bypass";
      let isOffer = Boolean(formData.isOffer || formData.advanceType === "offer");

      if (formData.advanceType === "offer" || isOffer) {
        calcAdvance = Number(formData.isOffer && formData.offerPrice ? formData.offerPrice : formData.price || 0);
      } else if (formData.advanceType === "bypass") {
        calcAdvance = 0;
      } else if (formData.advanceType === "normal") {
        calcAdvance = Math.round(Number(formData.price || 0) * 0.5);
      } else {
        // custom
        calcAdvance = formData.advanceMode === "percentage"
          ? Math.round(Number(formData.price || 0) * (Number(formData.advancePercentage || 0) / 100))
          : Number(formData.advanceAmount || 0);
      }

      const productData: any = {
        name: formData.name,
        price: Number(formData.price),
        description: formData.description,
        category: categoryValue,
        stock: Number(formData.stock),
        isOffer: isOffer,
        isBypass: isBypass,
        productType: formData.advanceType || (isBypass ? "bypass" : isOffer ? "offer" : "normal"),
        offerPrice: Number(formData.offerPrice || 0),
        modelUrl: formData.modelUrl || "",
        videoUrl: formData.videoUrl || "",
        image: finalImageUrl,
        images: finalImages,
        advanceType: formData.advanceType || "normal",
        advanceMode: formData.advanceType === "custom" ? (formData.advanceMode || "fixed") : "fixed",
        advancePercentage: formData.advanceType === "custom" && formData.advanceMode === "percentage" ? Number(formData.advancePercentage || 0) : 0,
        advanceAmount: calcAdvance,
      };

      await updateDoc(doc(db, "products", id), productData);
      notify("Product updated successfully", "success");
      navigate(`/${id}`);
    } catch (err: any) {
      notify(err.message || "Failed to update product", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-900 dark:text-zinc-100" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 animate-fade-in bg-zinc-50 dark:bg-zinc-900 max-w-4xl mx-auto min-h-screen font-sans pb-24">
      <SEO title={`Edit Product: ${formData.name}`} description="Edit product details directly." />
      
      <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-800 p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 mb-6 font-medium text-xs uppercase tracking-wider"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Go Back</span>
        </button>

        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Edit Product Details</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (BDT)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Stock Quantity</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <div className="flex flex-col gap-2">
              <CustomDropdown
                options={[
                  { value: "Border Cross Products", label: "Border Cross Products" },
                  { value: "Mobile", label: "Mobile" },
                  { value: "Accessories", label: "Accessories" },
                  { value: "Custom", label: "Custom..." }
                ]}
                value={formData.category}
                onChange={(val) => setFormData({ ...formData, category: val })}
              />
              {formData.category === "Custom" && (
                <Input
                  placeholder="Enter custom category"
                  value={formData.customCategory}
                  onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                  required
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Product Description</Label>
            <Textarea
              id="description"
              rows={5}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-6 space-y-4">
            <h3 className="font-bold text-sm text-zinc-700 dark:text-zinc-300">Offer Settings</h3>
            
            <div className="flex items-center gap-2">
              <input
                id="isOffer"
                type="checkbox"
                checked={formData.isOffer}
                onChange={(e) => setFormData({ ...formData, isOffer: e.target.checked })}
                className="w-4 h-4 rounded text-zinc-900 bg-zinc-100 border-zinc-300 focus:ring-0 dark:bg-zinc-900 dark:border-zinc-700"
              />
              <Label htmlFor="isOffer" className="cursor-pointer">Enable Offer/Discount Price</Label>
            </div>

            {formData.isOffer && (
              <div className="space-y-2 animate-fade-in">
                <Label htmlFor="offerPrice">Offer Price (BDT)</Label>
                <Input
                  id="offerPrice"
                  type="number"
                  value={formData.offerPrice}
                  onChange={(e) => setFormData({ ...formData, offerPrice: Number(e.target.value) })}
                  required={formData.isOffer}
                />
              </div>
            )}
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-6 space-y-4">
            <h3 className="font-bold text-sm text-zinc-700 dark:text-zinc-300">Advance Payment Setting (এডভান্স অপশন)</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, advanceType: "normal" })}
                className={`p-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${
                  formData.advanceType === "normal"
                    ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20"
                    : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                }`}
              >
                <span>📦 Normal Border</span>
                <span className="text-[10px] font-normal opacity-80">Half Advance (50%)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, advanceType: "offer" })}
                className={`p-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${
                  formData.advanceType === "offer"
                    ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 ring-2 ring-red-500/20"
                    : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                }`}
              >
                <span>🔥 Offer Product</span>
                <span className="text-[10px] font-normal opacity-80">Full Advance (100%)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, advanceType: "bypass" })}
                className={`p-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${
                  formData.advanceType === "bypass"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20"
                    : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                }`}
              >
                <span>⚡ Bypass Product</span>
                <span className="text-[10px] font-normal opacity-80">Cash on Delivery</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, advanceType: "custom" })}
                className={`p-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${
                  formData.advanceType === "custom"
                    ? "border-[#EF8020] bg-[#EF8020]/10 text-[#EF8020] ring-2 ring-[#EF8020]/20"
                    : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                }`}
              >
                <span>🏷️ Custom Advance</span>
                <span className="text-[10px] font-normal opacity-80">Specific Amount</span>
              </button>
            </div>

            {formData.advanceType === "normal" && (
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-xl text-xs text-blue-700 dark:text-blue-300 font-semibold">
                📦 <strong>Normal Border Cross:</strong> কাস্টমার চেকআউটে ৫০% (হাফ এডভান্স ৳{Math.round((Number(formData.price || 0) * 0.5))}) বিকাশ বা নগদে পে করবে। বাকি ৫০% ক্যাশ অন ডেলিভারিতে পরিশোধ করবে।
              </div>
            )}

            {formData.advanceType === "offer" && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl text-xs text-red-700 dark:text-red-300 font-semibold">
                🔥 <strong>Offer Product:</strong> কাস্টমার চেকআউটে ১০০% ফুল এডভান্স (৳{formData.isOffer && formData.offerPrice ? formData.offerPrice : formData.price || 0}) বিকাশ বা নগদে পরিশোধ করবে।
              </div>
            )}

            {formData.advanceType === "bypass" && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                ⚡ <strong>Bypass Product (Cash on Delivery):</strong> কোনো এডভান্স নেওয়া হবে না। চেকআউট করার সময় কাস্টমারকে অবশ্যই গার্ডিয়ান নাম্বার দিতে হবে (কল করে ভেরিফাই করা হতে পারে) এবং চাইলে NID কার্ড সংযুক্ত করতে পারবে।
              </div>
            )}

            {formData.advanceType === "custom" && (
              <div className="space-y-3 p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-3">
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">Advance Mode:</Label>
                  <select
                    value={formData.advanceMode}
                    onChange={(e: any) => setFormData({ ...formData, advanceMode: e.target.value })}
                    className="h-10 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 font-semibold text-zinc-800 dark:text-zinc-200"
                  >
                    <option value="fixed">Fixed Amount (৳)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>

                {formData.advanceMode === "percentage" ? (
                  <div>
                    <Label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1 block">
                      Percentage (%)
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        value={formData.advancePercentage}
                        onChange={(e) => setFormData({ ...formData, advancePercentage: e.target.value })}
                        placeholder="e.g. 10 or 20"
                        className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 h-10 text-xs"
                      />
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap bg-emerald-500/10 px-3 py-2.5 rounded-xl border border-emerald-500/20">
                        Calc: ৳{Math.round((Number(formData.price || 0) * (Number(formData.advancePercentage || 0) / 100)))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1 block">
                      Fixed Advance Amount (৳)
                    </Label>
                    <Input
                      type="number"
                      value={formData.advanceAmount}
                      onChange={(e) => setFormData({ ...formData, advanceAmount: e.target.value })}
                      placeholder="e.g. 150 or 500"
                      className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 h-10 text-xs"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-6 space-y-4">
            <h3 className="font-bold text-sm text-zinc-700 dark:text-zinc-300">Product Image</h3>
            
            {formData.image && !newImageFile && (
              <div className="relative w-32 h-32 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-50 flex items-center justify-center">
                <img src={formData.image} alt="Preview" className="w-full h-full object-contain" />
              </div>
            )}

            <div className="flex items-center gap-3">
              <label className="cursor-pointer bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors py-2 px-4 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                <span>Choose New Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setNewImageFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </label>
              {newImageFile && (
                <span className="text-xs text-zinc-500 font-medium truncate max-w-xs">{newImageFile.name}</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Product Details</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditProduct;
