import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { doc, getDoc, addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "../firebase";
import { uploadToImgbb } from "../services/imgbb";
import { useNotify } from "../components/Notifications";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Smartphone, Check, Loader2, Camera, Trash2, ChevronDown, RefreshCw, Store } from "lucide-react";
import { formatPrice } from "../lib/utils";
import { APPLE_SPRING_DEFAULT, APPLE_SPRING_SNAPPY } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

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
  const prefersReducedMotion = useReducedMotion();

  const sellerId = searchParams.get("sellerId") || "";

  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [loadingSeller, setLoadingSeller] = useState(true);
  const [logoError, setLogoError] = useState(false);

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
        const docRef = doc(db, "users", sellerId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSellerInfo(docSnap.data());
        }

        const q = query(collection(db, "products"), where("sellerId", "==", sellerId));
        const pSnap = await getDocs(q);
        const products = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
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
      triggerHaptic("selection");
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);

      const urls = files.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...urls]);
    }
  };

  const removeSelectedImage = (index: number) => {
    triggerHaptic("light");
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerId) {
      triggerHaptic("error");
      notify("Invalid exchange request parameters.", "error");
      return;
    }
    if (!phoneName || !targetPhone) {
      triggerHaptic("error");
      notify("Please specify both your phone and the phone you want to exchange with.", "error");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser && (!guestName || !guestEmail)) {
      triggerHaptic("error");
      notify("Please provide your name and email to proceed.", "error");
      return;
    }

    setSubmitting(true);
    setUploadingImages(true);

    try {
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

      triggerHaptic("success");
      setSubmitted(true);
      notify("Exchange request submitted successfully!", "success");
    } catch (err) {
      console.error(err);
      triggerHaptic("error");
      notify("Failed to submit exchange request.", "error");
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
  };

  if (loadingSeller) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-black flex flex-col items-center justify-center p-4 ds-apple-shop-canvas">
        <Loader2 className="w-7 h-7 text-[#0071E3] dark:text-[#0A84FF] animate-spin mb-3" />
        <p className="text-[#6E6E73] dark:text-[#98989D] text-[13px] font-medium">Loading exchange form...</p>
      </div>
    );
  }

  if (!sellerId) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-black flex flex-col items-center justify-center p-4 ds-apple-shop-canvas">
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[24px] p-8 max-w-sm w-full text-center border border-black/[0.06] dark:border-white/[0.08] shadow-xs">
          <p className="text-[#FF3B30] dark:text-[#FF453A] font-semibold text-[18px] mb-2">Invalid Link</p>
          <p className="text-[#6E6E73] dark:text-[#98989D] text-[13px] mb-6">This exchange link is missing required merchant parameters.</p>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              navigate("/");
            }}
            className="w-full py-3.5 px-5 bg-[#0071E3] dark:bg-[#0A84FF] text-white rounded-full font-semibold text-[14px] whitespace-nowrap active:scale-[0.97] transition-transform cursor-pointer"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const shopName = sellerInfo?.shopName || "Our Shop";
  const shopLogo = sellerInfo?.photoURL || sellerInfo?.avatarUrl || "";

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black pb-14 ds-apple-shop-canvas">
      <div className="max-w-lg mx-auto px-4 pt-6 flex justify-center">
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="form"
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
              transition={prefersReducedMotion ? { duration: 0.2 } : APPLE_SPRING_DEFAULT}
              className="bg-white dark:bg-[#1C1C1E] w-full rounded-[24px] shadow-xs border border-black/[0.06] dark:border-white/[0.08] p-6 sm:p-8 flex flex-col gap-5"
            >
              {/* Header */}
              <div className="flex items-center gap-3.5 border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
                <div className="w-12 h-12 rounded-full bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0">
                  {shopLogo && !logoError ? (
                    <img
                      src={shopLogo}
                      alt={shopName}
                      onError={() => setLogoError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Store className="w-5 h-5 text-[#6E6E73] dark:text-[#98989D]" />
                  )}
                </div>
                <div>
                  <h1 className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] text-[17px] tracking-tight leading-tight">
                    Device Exchange
                  </h1>
                  <p className="text-[#6E6E73] dark:text-[#98989D] text-[12px] font-medium mt-0.5">
                    with {shopName}
                  </p>
                </div>
              </div>

              <p className="text-[12.5px] text-[#6E6E73] dark:text-[#98989D] leading-relaxed bg-[#F5F5F7] dark:bg-[#2C2C2E] p-4 rounded-[16px]">
                Provide information about your phone and the target phone you want to receive in exchange. If there is a payment associated, specify the amount you paid.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {!auth.currentUser && (
                  <div className="flex flex-col gap-3 p-4 bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.05] dark:border-white/[0.06] rounded-[18px]">
                    <p className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#98989D] uppercase tracking-wider">
                      Your Contact Information
                    </p>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#98989D]">Full Name</label>
                      <input
                        type="text"
                        required
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="e.g., John Doe"
                        className="ds-apple-input w-full h-11 px-3.5 text-[13px]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#98989D]">Email Address</label>
                      <input
                        type="email"
                        required
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder="e.g., john@example.com"
                        className="ds-apple-input w-full h-11 px-3.5 text-[13px]"
                      />
                    </div>
                  </div>
                )}

                {/* 1. User's Phone Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#98989D] uppercase tracking-wider">
                    Your Phone Model
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E6E73] dark:text-[#98989D]">
                      <Smartphone className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={phoneName}
                      onChange={(e) => setPhoneName(e.target.value)}
                      placeholder="e.g., iPhone 13 Pro Max"
                      className="ds-apple-input w-full h-12 pl-10 pr-4 text-[13.5px]"
                    />
                  </div>
                </div>

                {/* 2. Condition & Storage */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Condition */}
                  <div className="flex flex-col gap-1.5 relative">
                    <label className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#98989D] uppercase tracking-wider">
                      Condition
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("selection");
                        setConditionDropdownOpen(!conditionDropdownOpen);
                        setStorageDropdownOpen(false);
                        setProductDropdownOpen(false);
                      }}
                      className="ds-apple-input w-full h-12 px-3.5 text-left text-[13px] font-medium flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">{condition}</span>
                      <ChevronDown className="w-4 h-4 text-[#6E6E73] dark:text-[#98989D] shrink-0" />
                    </button>
                    <AnimatePresence>
                      {conditionDropdownOpen && (
                        <motion.div
                          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
                          transition={prefersReducedMotion ? { duration: 0.12 } : APPLE_SPRING_SNAPPY}
                          className="ds-apple-popover absolute top-[104%] left-0 right-0 z-50 rounded-[16px] overflow-hidden py-1"
                        >
                          {CONDITION_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                triggerHaptic("selection");
                                setCondition(opt.value);
                                setConditionDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 text-[12.5px] cursor-pointer transition-colors ${
                                condition === opt.value
                                  ? "text-[#0071E3] dark:text-[#0A84FF] font-semibold bg-[#0071E3]/8 dark:bg-[#0A84FF]/14"
                                  : "text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Storage */}
                  <div className="flex flex-col gap-1.5 relative">
                    <label className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#98989D] uppercase tracking-wider">
                      Storage
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("selection");
                        setStorageDropdownOpen(!storageDropdownOpen);
                        setConditionDropdownOpen(false);
                        setProductDropdownOpen(false);
                      }}
                      className="ds-apple-input w-full h-12 px-3.5 text-left text-[13px] font-medium flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">{STORAGE_OPTIONS.find(s => s.value === storage)?.label || storage}</span>
                      <ChevronDown className="w-4 h-4 text-[#6E6E73] dark:text-[#98989D] shrink-0" />
                    </button>
                    <AnimatePresence>
                      {storageDropdownOpen && (
                        <motion.div
                          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
                          transition={prefersReducedMotion ? { duration: 0.12 } : APPLE_SPRING_SNAPPY}
                          className="ds-apple-popover absolute top-[104%] left-0 right-0 z-50 rounded-[16px] overflow-hidden py-1"
                        >
                          {STORAGE_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                triggerHaptic("selection");
                                setStorage(opt.value);
                                setStorageDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 text-[12.5px] cursor-pointer transition-colors ${
                                storage === opt.value
                                  ? "text-[#0071E3] dark:text-[#0A84FF] font-semibold bg-[#0071E3]/8 dark:bg-[#0A84FF]/14"
                                  : "text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* 3. Target Phone from Site */}
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#98989D] uppercase tracking-wider">
                    Target Phone (From Store)
                  </label>
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
                      className="ds-apple-input w-full h-12 px-4 text-[13.5px]"
                    />
                    <AnimatePresence>
                      {productsList.length > 0 && productDropdownOpen && (
                        <motion.div
                          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
                          transition={prefersReducedMotion ? { duration: 0.12 } : APPLE_SPRING_SNAPPY}
                          className="ds-apple-popover absolute top-[105%] left-0 right-0 z-50 max-h-48 overflow-y-auto rounded-[16px] py-1 no-scrollbar"
                        >
                          {productsList
                            .filter(p => !p.isSold && p.name.toLowerCase().includes(targetPhone.toLowerCase()))
                            .map(prod => (
                              <button
                                key={prod.id}
                                type="button"
                                onClick={() => {
                                  triggerHaptic("selection");
                                  setTargetPhone(prod.name);
                                  setProductDropdownOpen(false);
                                }}
                                className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] border-b last:border-0 border-black/[0.05] dark:border-white/[0.08] text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-3 cursor-pointer"
                              >
                                {prod.images?.[0] ? (
                                  <img src={prod.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-[#F5F5F7] dark:bg-[#2C2C2E] flex items-center justify-center shrink-0">
                                    <Smartphone className="w-4 h-4 text-[#6E6E73]" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-semibold leading-tight truncate">{prod.name}</p>
                                  <p className="text-[11px] text-[#0071E3] dark:text-[#0A84FF] tabular-nums font-semibold mt-0.5">
                                    {formatPrice(prod.price)}
                                  </p>
                                </div>
                              </button>
                            ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* 4. Custom Payment Amount paid */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#98989D] uppercase tracking-wider">
                    Custom Payment Paid (TK)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E6E73] dark:text-[#98989D] text-[13px] font-semibold">৳</span>
                    <input
                      type="number"
                      value={customPaymentAmount}
                      onChange={(e) => setCustomPaymentAmount(e.target.value)}
                      placeholder="e.g., 2000 (Optional)"
                      className="ds-apple-input w-full h-12 pl-8 pr-4 text-[13.5px] tabular-nums"
                    />
                  </div>
                </div>

                {/* 5. Multiple Image Picker */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#98989D] uppercase tracking-wider">
                    Attach Photos of Your Phone
                  </label>

                  <div className="flex flex-wrap gap-3 mt-1">
                    <label className="w-20 h-20 bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-dashed border-black/[0.15] dark:border-white/[0.18] rounded-[16px] flex flex-col items-center justify-center cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors">
                      <Camera className="w-5 h-5 text-[#6E6E73] dark:text-[#98989D]" />
                      <span className="text-[10px] font-semibold text-[#6E6E73] dark:text-[#98989D] mt-1">Add Photo</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>

                    {previewUrls.map((url, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-[16px] overflow-hidden border border-black/[0.06] dark:border-white/[0.08] bg-[#F5F5F7] dark:bg-[#2C2C2E]">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeSelectedImage(idx)}
                          className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-[#FF3B30] rounded-full text-white transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#6E6E73] dark:text-[#98989D] mt-1">
                    Select pictures of your device corners, front, and back sides.
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-5 bg-[#0071E3] dark:bg-[#0A84FF] disabled:opacity-50 text-white font-semibold text-[14px] whitespace-nowrap rounded-full transition-transform active:scale-[0.98] flex items-center justify-center gap-2 mt-2 cursor-pointer"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>{uploadingImages ? "Uploading Photos..." : "Submitting..."}</span>
                    </div>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 shrink-0" />
                      <span>Submit Exchange Request</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={prefersReducedMotion ? { duration: 0.2 } : APPLE_SPRING_DEFAULT}
              className="bg-white dark:bg-[#1C1C1E] w-full max-w-md rounded-[28px] shadow-xs border border-black/[0.06] dark:border-white/[0.08] p-8 text-center flex flex-col items-center gap-5"
            >
              <div className="w-16 h-16 bg-[#248A3D]/12 dark:bg-[#30D158]/16 rounded-full flex items-center justify-center text-[#248A3D] dark:text-[#30D158]">
                <Check className="w-8 h-8" strokeWidth={2.5} />
              </div>

              <div>
                <h2 className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] text-[20px] tracking-tight">
                  Request Submitted
                </h2>
                <p className="text-[#6E6E73] dark:text-[#98989D] text-[13px] mt-2 leading-relaxed">
                  Your exchange proposal for <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{phoneName}</span> has been sent to <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{shopName}</span>.
                </p>
                <p className="text-[#6E6E73] dark:text-[#98989D] text-[11px] mt-2">
                  The merchant will review your device specifications and update your order status in My Orders.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic("selection");
                  navigate("/my-orders");
                }}
                className="w-full py-3.5 px-5 bg-[#0071E3] dark:bg-[#0A84FF] text-white rounded-full font-semibold text-[14px] whitespace-nowrap active:scale-[0.98] transition-transform cursor-pointer mt-2"
              >
                Go to My Orders
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ExchangeRequest;
