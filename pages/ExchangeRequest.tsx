import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { doc, getDoc, addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "../firebase";
import { uploadToImgbb } from "../services/imgbb";
import { useNotify } from "../components/Notifications";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, Check, ArrowLeft, Loader2, Camera, Plus, Trash2, Sliders, DollarSign, RefreshCw } from "lucide-react";
import { formatPrice } from "../lib/utils";

const CONDITION_OPTIONS = [
  { value: "Like New", label: "Like New (Mint Condition)" },
  { value: "Excellent", label: "Excellent (Minor Scratches)" },
  { value: "Good", label: "Good (Moderate Wear)" },
  { value: "Fair", label: "Fair (Noticeable Scratches/Dents)" }
];

const STORAGE_OPTIONS = [
  { value: "64GB", label: "64 GB" },
  { value: "128GB", label: "128 GB" },
  { value: "256GB", label: "256 GB" },
  { value: "512GB", label: "512 GB" },
  { value: "1TB", label: "1 TB" }
];

const ExchangeRequest: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const notify = useNotify();

  const sellerId = searchParams.get("sellerId") || "";

  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [loadingSeller, setLoadingSeller] = useState(true);

  // Form states
  const [phoneName, setPhoneName] = useState("");
  const [condition, setCondition] = useState("Excellent");
  const [storage, setStorage] = useState("128GB");
  const [targetPhone, setTargetPhone] = useState("");
  const [customPaymentAmount, setCustomPaymentAmount] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  
  // Image handling
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Custom Dropdown Open States
  const [conditionDropdownOpen, setConditionDropdownOpen] = useState(false);
  const [storageDropdownOpen, setStorageDropdownOpen] = useState(false);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchSellerAndProducts = async () => {
      if (!sellerId) {
        setLoadingSeller(false);
        return;
      }
      try {
        // Fetch Seller
        const docRef = doc(db, "users", sellerId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSellerInfo(docSnap.data());
        }

        // Fetch Seller's active products
        const q = query(collection(db, "products"), where("sellerId", "==", sellerId));
        const pSnap = await getDocs(q);
        const products = pSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProductsList(products);
      } catch (err) {
        console.error("Error fetching request details:", err);
      } finally {
        setLoadingSeller(false);
      }
    };
    fetchSellerAndProducts();
  }, [sellerId]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);

      const urls = files.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...urls]);
    }
  };

  const removeSelectedImage = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerId) {
      notify("Invalid exchange request parameters.", "error");
      return;
    }
    if (!phoneName || !targetPhone) {
      notify("Please specify both your phone and the phone you want to exchange with.", "error");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser && (!guestName || !guestEmail)) {
      notify("Please provide your name and email to proceed.", "error");
      return;
    }

    setSubmitting(true);
    setUploadingImages(true);

    try {
      // 1. Upload images sequentially to imgbb/base64
      const imageUrls: string[] = [];
      for (const file of selectedFiles) {
        try {
          const url = await uploadToImgbb(file);
          imageUrls.push(url);
        } catch (uploadErr) {
          console.error("Error uploading image:", uploadErr);
        }
      }

      setUploadingImages(false);

      // 2. Save exchange document
      await addDoc(collection(db, "exchanges"), {
        sellerId: sellerId,
        userId: currentUser?.uid || "guest",
        userEmail: currentUser?.email || guestEmail,
        userName: currentUser?.displayName || guestName || "Guest User",
        phoneName: phoneName,
        condition: condition,
        storage: storage,
        targetPhone: targetPhone,
        customPaymentAmount: customPaymentAmount ? Number(customPaymentAmount) : 0,
        images: imageUrls,
        status: "pending",
        cancelReason: "",
        returnReason: "",
        createdAt: Date.now()
      });

      setSubmitted(true);
      notify("Exchange request submitted successfully!", "success");
    } catch (err) {
      console.error(err);
      notify("Failed to submit exchange request.", "error");
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
  };

  if (loadingSeller) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">Loading exchange form...</p>
      </div>
    );
  }

  if (!sellerId) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-8 max-w-sm w-full text-center border border-zinc-100 dark:border-zinc-800 shadow-xl">
          <p className="text-rose-500 font-bold text-lg mb-2">Invalid Link</p>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-6">This exchange link is missing required merchant parameters.</p>
          <button onClick={() => navigate("/")} className="w-full h-12 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-sm">
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const shopName = sellerInfo?.shopName || "Our Shop";
  const shopLogo = sellerInfo?.photoURL || sellerInfo?.avatarUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80";

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-zinc-950 py-8 px-4 flex justify-center items-center">
      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-zinc-100 dark:border-zinc-800 p-6 md:p-8 flex flex-col gap-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-4">
                <img src={shopLogo} alt={shopName} className="w-12 h-12 rounded-full object-cover border" />
                <div>
                  <h2 className="font-bold text-zinc-950 dark:text-white text-base leading-tight">Exchange Request</h2>
                  <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">with {shopName}</p>
                </div>
              </div>
              <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition">
                <ArrowLeft className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {/* Subtitle intro */}
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border">
              Provide information about your phone and the target phone you want to receive in exchange. If there is a payment associated, specify the amount you paid.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              
              {/* Guest / Auth User Details */}
              {!auth.currentUser && (
                <div className="flex flex-col gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 rounded-3xl">
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Your Contact Information</p>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">Your Full Name</label>
                    <input
                      type="text"
                      required
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g., John Doe"
                      className="w-full h-11 px-3.5 text-xs font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">Your Email Address</label>
                    <input
                      type="email"
                      required
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="e.g., john@example.com"
                      className="w-full h-11 px-3.5 text-xs font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>
              )}

              {/* 1. User's Phone Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Your Phone Model</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                    <Smartphone className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={phoneName}
                    onChange={(e) => setPhoneName(e.target.value)}
                    placeholder="e.g., iPhone 13 Pro Max"
                    className="w-full h-12 pl-10 pr-4 text-xs font-medium bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl focus:outline-none focus:ring-1 focus:ring-orange-500 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              {/* 2. Condition & Storage side by side (Custom Dropdowns) */}
              <div className="grid grid-cols-2 gap-4">
                {/* Condition */}
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Condition</label>
                  <button
                    type="button"
                    onClick={() => {
                      setConditionDropdownOpen(!conditionDropdownOpen);
                      setStorageDropdownOpen(false);
                      setProductDropdownOpen(false);
                    }}
                    className="w-full h-12 px-4 text-left text-xs font-semibold bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex items-center justify-between text-zinc-900 dark:text-white"
                  >
                    <span>{CONDITION_OPTIONS.find(c => c.value === condition)?.label || condition}</span>
                    <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                  {conditionDropdownOpen && (
                    <div className="absolute top-[102%] left-0 right-0 z-50 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden py-1">
                      {CONDITION_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setCondition(opt.value);
                            setConditionDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 ${condition === opt.value ? "text-orange-500 font-bold bg-orange-500/5" : "text-zinc-700 dark:text-zinc-300"}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Storage */}
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Storage</label>
                  <button
                    type="button"
                    onClick={() => {
                      setStorageDropdownOpen(!storageDropdownOpen);
                      setConditionDropdownOpen(false);
                      setProductDropdownOpen(false);
                    }}
                    className="w-full h-12 px-4 text-left text-xs font-semibold bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex items-center justify-between text-zinc-900 dark:text-white"
                  >
                    <span>{STORAGE_OPTIONS.find(s => s.value === storage)?.label || storage}</span>
                    <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                  {storageDropdownOpen && (
                    <div className="absolute top-[102%] left-0 right-0 z-50 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden py-1">
                      {STORAGE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setStorage(opt.value);
                            setStorageDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 ${storage === opt.value ? "text-orange-500 font-bold bg-orange-500/5" : "text-zinc-700 dark:text-zinc-300"}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Target Phone from Site */}
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Target Phone (From Store)</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={targetPhone}
                    onChange={(e) => {
                      setTargetPhone(e.target.value);
                      setProductDropdownOpen(true);
                    }}
                    onFocus={() => setProductDropdownOpen(true)}
                    placeholder="Type to search and select phone..."
                    className="w-full h-12 px-4 text-xs font-medium bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl focus:outline-none focus:ring-1 focus:ring-orange-500 text-zinc-900 dark:text-white"
                  />
                  {productsList.length > 0 && productDropdownOpen && (
                    <div className="absolute top-[105%] left-0 right-0 z-50 max-h-48 overflow-y-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800 py-1 no-scrollbar">
                      {productsList
                        .filter(p => !p.isSold && p.name.toLowerCase().includes(targetPhone.toLowerCase()))
                        .map(prod => (
                          <button
                            key={prod.id}
                            type="button"
                            onClick={() => {
                              setTargetPhone(prod.name);
                              setProductDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 border-b last:border-0 border-zinc-100 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center gap-3"
                          >
                            <img src={prod.images?.[0] || "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100"} className="w-8 h-8 rounded-lg object-cover" />
                            <div>
                              <p className="font-bold leading-tight">{prod.name}</p>
                              <p className="text-[10px] text-orange-500 font-mono mt-0.5">{formatPrice(prod.price)}</p>
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Custom Payment Amount paid */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">How much did you pay under Custom Payment? (TK)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold font-mono">৳</span>
                  <input
                    type="number"
                    value={customPaymentAmount}
                    onChange={(e) => setCustomPaymentAmount(e.target.value)}
                    placeholder="e.g., 2000 (Optional)"
                    className="w-full h-12 pl-8 pr-4 text-xs font-medium bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl focus:outline-none focus:ring-1 focus:ring-orange-500 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              {/* 5. Multiple Image Picker */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Attach Photos of your Phone</label>
                
                <div className="flex flex-wrap gap-3 mt-1">
                  {/* Photo upload button */}
                  <label className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700/80 transition-colors">
                    <Camera className="w-5 h-5 text-zinc-400" />
                    <span className="text-[9px] font-bold text-zinc-400 mt-1">Add Photo</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>

                  {/* Previews */}
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 group bg-zinc-100">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeSelectedImage(idx)}
                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 rounded-full text-white transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-400 font-medium mt-1">Select multiple pictures of your device's corners, front, and back sides.</p>
              </div>

              {/* Submit Buttons */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 text-white dark:text-zinc-900 font-bold text-sm rounded-2xl shadow-lg transition flex items-center justify-center gap-2 mt-4"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{uploadingImages ? "Uploading Photos to ImgBB..." : "Submitting Details..."}</span>
                  </div>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Submit Exchange Request
                  </>
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-zinc-100 dark:border-zinc-800 p-8 text-center flex flex-col items-center gap-6"
          >
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
              <Check className="w-8 h-8" />
            </div>

            <div>
              <h2 className="font-bold text-zinc-950 dark:text-white text-xl">Request Submitted</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium mt-2">
                Your exchange proposal for <span className="font-bold text-zinc-800 dark:text-zinc-200">{phoneName}</span> has been securely sent to <span className="font-bold text-zinc-800 dark:text-zinc-200">{shopName}</span>.
              </p>
              <p className="text-zinc-400 dark:text-zinc-500 text-[10px] mt-2">
                The merchant will review your device specifications and update your exchange order status. You can track this real-time in your "My Orders" custom section.
              </p>
            </div>

            <button
              onClick={() => navigate("/orders")}
              className="w-full h-12 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-sm shadow-md mt-4"
            >
              Go to My Orders
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExchangeRequest;
