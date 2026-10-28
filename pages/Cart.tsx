import { formatPrice } from "@/lib/utils";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CustomSectionEmbed } from "../components/CustomSectionEmbed";
import { auth, db } from "../firebase";
import { query, where, getDocs, collection } from "firebase/firestore";
import { useNotify } from "../components/Notifications";
import { useIllustrations } from "../lib/useIllustrations";
import { PixelImage } from "../components/ui/PixelImage";
import { getProductDisplayImage } from "../src/lib/phonePartsArt";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Ticket,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  X,
  CheckCircle2,
  PackageCheck,
} from "lucide-react";

const Cart: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoError, setPromoError] = useState("");
  const [myCoupons, setMyCoupons] = useState<any[]>([]);
  const [showCouponsModal, setShowCouponsModal] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const illustrations = useIllustrations();

  const navigate = useNavigate();
  const notify = useNotify();

  useEffect(() => {
    const syncCartFromStorage = () => {
      try {
        const cart = JSON.parse(localStorage.getItem("f_cart") || "[]");
        setItems(Array.isArray(cart) ? cart : []);
      } catch {
        setItems([]);
      }
    };

    syncCartFromStorage();
    window.addEventListener("update_cart", syncCartFromStorage);

    const loadVouchers = async () => {
      try {
        if (!auth.currentUser) return;
        const q = query(
          collection(db, "coupons"),
          where("userId", "==", auth.currentUser.uid),
          where("isActive", "==", true)
        );
        const snap = await getDocs(q);
        setMyCoupons(
          snap.docs.map((d) => ({ id: d.id, ...d.data(), isVoucher: true }))
        );
      } catch {}
    };
    loadVouchers();

    return () => {
      window.removeEventListener("update_cart", syncCartFromStorage);
    };
  }, []);

  useEffect(() => {
    if (!confirmClear) return;
    const timer = setTimeout(() => setConfirmClear(false), 3200);
    return () => clearTimeout(timer);
  }, [confirmClear]);

  const persistCart = (nextItems: any[]) => {
    setItems(nextItems);
    localStorage.setItem("f_cart", JSON.stringify(nextItems));
    window.dispatchEvent(new Event("update_cart"));
  };

  const totalUnits = useMemo(
    () => items.reduce((sum, curr) => sum + (Number(curr.quantity) || 1), 0),
    [items]
  );

  const total = useMemo(
    () =>
      items.reduce(
        (acc, curr) =>
          acc + (curr.discountPrice || curr.offerPrice || curr.price || 0) * (curr.quantity || 1),
        0
      ),
    [items]
  );

  const deliveryCharge = items.length > 0 ? 150 : 0;

  let promoDiscount = 0;
  if (appliedPromo) {
    if (appliedPromo.type === "fixed") {
      promoDiscount = appliedPromo.discount;
    } else if (appliedPromo.type === "percentage") {
      promoDiscount = (total * appliedPromo.discount) / 100;
    }
  }

  const grandTotal = Math.max(0, total + deliveryCharge - promoDiscount);

  const updateQuantity = (index: number, delta: number) => {
    const newItems = [...items];
    const nextQty = Math.max(1, (newItems[index].quantity || 1) + delta);
    newItems[index] = { ...newItems[index], quantity: nextQty };
    persistCart(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    persistCart(newItems);
    notify("কার্ট থেকে পণ্য সরানো হয়েছে", "info");
  };

  const handleClearCart = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    persistCart([]);
    setAppliedPromo(null);
    setConfirmClear(false);
    notify("কার্ট খালি করা হয়েছে", "info");
  };

  const applyPromo = async () => {
    setPromoError("");
    if (!promoCode.trim()) return;
    try {
      const q = query(
        collection(db, "promo_codes"),
        where("code", "==", promoCode.trim().toUpperCase())
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setPromoError("প্রোমো কোডটি সঠিক নয়");
      } else {
        const c = snap.docs[0].data();
        if (!c.isActive) {
          setPromoError("এই প্রোমো কোডটি বর্তমানে নিষ্ক্রিয়");
        } else if (c.expiresAt && c.expiresAt < Date.now()) {
          setPromoError("প্রোমো কোডের মেয়াদ শেষ হয়েছে");
        } else if (c.minOrderValue && total < c.minOrderValue) {
          setPromoError(`সর্বনিম্ন অর্ডার মূল্য ${formatPrice(c.minOrderValue)} হতে হবে`);
        } else {
          setAppliedPromo({ id: snap.docs[0].id, ...c, isVoucher: false });
          notify("প্রোমো কোড সফলভাবে যুক্ত হয়েছে!", "success");
        }
      }
    } catch {
      setPromoError("প্রোমো কোড যাচাই করতে সমস্যা হয়েছে");
    }
  };

  const applyVoucher = (voucher: any) => {
    if (voucher.minOrderValue && total < voucher.minOrderValue) {
      notify(
        `সর্বনিম্ন অর্ডার মূল্য ${formatPrice(voucher.minOrderValue)} প্রয়োজন`,
        "error"
      );
      return;
    }
    setAppliedPromo(voucher);
    setShowCouponsModal(false);
    notify("ভাউচার সফলভাবে যুক্ত হয়েছে!", "success");
  };

  const getItemImage = (item: any) => {
    if (item.image) return item.image;
    if (Array.isArray(item.images) && item.images[0]) return item.images[0];
    return getProductDisplayImage(item);
  };

  const getItemUrl = (item: any) => {
    if (!item.id) return "/all-products";
    const slug =
      (item.name || "product")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "item";
    return `/product/${slug}/${item.id}`;
  };

  return (
    <div className="ds-liquid-checkout-shell min-h-screen relative transition-colors font-sans pb-28 lg:pb-16">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8">
        {/* ====================================================================
            EMPTY CART STATE (Shared Liquid Glass Showcase)
            ==================================================================== */}
        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl mx-auto mt-6 lg:mt-12 ds-liquid-panel p-8 sm:p-12 text-center flex flex-col items-center"
          >
            {illustrations.emptyCart ? (
              <div className="w-40 h-40 sm:w-48 sm:h-48 mx-auto mb-6 rounded-[24px] overflow-hidden ds-liquid-subpanel p-2">
                <img
                  src={illustrations.emptyCart}
                  alt="Empty Cart"
                  className="w-full h-full object-cover rounded-[18px]"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full ds-liquid-subpanel flex items-center justify-center mb-6 text-sky-600 dark:text-sky-400">
                <ShoppingBag className="w-9 h-9 stroke-[1.75px]" />
              </div>
            )}

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
              আপনার কার্ট বর্তমানে খালি
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300/85 mb-8 max-w-md leading-relaxed">
              আপনার পছন্দের স্মার্টফোন, অরিজিনাল পার্টস বা এক্সেসরিজ কার্টে যোগ করে সহজেই অর্ডার সম্পন্ন করুন।
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => navigate("/all-products")}
                className="ds-liquid-btn-primary px-7 py-3 w-full sm:w-auto flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>ক্যাটালগ ঘুরে দেখুন</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="ds-liquid-btn-secondary px-7 py-3 w-full sm:w-auto flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>হোম পেজে যান</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <>
            {/* ================================================================
                MOBILE CART WORKSPACE (< lg)
                Compact Header + Tactile Item Cards + Voucher/Summary + Sticky Bottom Bar
                ================================================================ */}
            <div className="lg:hidden space-y-4">
              {/* Mobile Top Header Card */}
              <div className="ds-liquid-panel p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                    আপনার কার্ট
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                    {items.length}টি পণ্য · মোট {totalUnits} ইউনিট
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                      confirmClear
                        ? "bg-rose-600 text-white"
                        : "ds-liquid-subpanel text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {confirmClear ? "নিশ্চিত মুছুন?" : "খালি করুন"}
                  </button>
                </div>
              </div>

              {/* Mobile Cart Item Cards */}
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {items.map((item, idx) => {
                    const unitPrice =
                      item.discountPrice || item.offerPrice || item.price || 0;
                    const qty = item.quantity || 1;
                    const lineTotal = unitPrice * qty;

                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        key={item.id ? `${item.id}-${idx}` : idx}
                        className="ds-liquid-panel p-3.5 rounded-[22px]"
                      >
                        <div className="flex items-start gap-3">
                          <Link
                            to={getItemUrl(item)}
                            className="w-20 h-20 rounded-2xl ds-liquid-product-media overflow-hidden shrink-0 flex items-center justify-center"
                          >
                            <PixelImage
                              src={getItemImage(item)}
                              alt={item.name}
                              className="w-full h-full bg-transparent"
                              imgClassName="w-full h-full object-cover"
                            />
                          </Link>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <Link
                                to={getItemUrl(item)}
                                className="font-bold text-[14px] text-slate-900 dark:text-white leading-snug line-clamp-2"
                              >
                                {item.name}
                              </Link>
                              <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                aria-label="Remove item"
                                className="w-7 h-7 rounded-full ds-liquid-icon-btn flex items-center justify-center text-slate-500 hover:text-rose-500 shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              {item.variant || "স্ট্যান্ডার্ড ভেরিয়েন্ট"}
                              {item.brand ? ` · ${item.brand}` : ""}
                              {` · একক ${formatPrice(unitPrice)}`}
                            </p>

                            <div className="mt-2.5 pt-2.5 border-t border-slate-900/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-2">
                              <div className="tabular-nums">
                                <span className="text-[15px] font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                                  {formatPrice(lineTotal)}
                                </span>
                              </div>

                              <div className="ds-liquid-dock rounded-full p-0.5 flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(idx, -1)}
                                  aria-label="Decrease quantity"
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-95"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="min-w-[24px] text-center text-xs font-extrabold text-slate-900 dark:text-white tabular-nums select-none">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(idx, 1)}
                                  aria-label="Increase quantity"
                                  className="w-8 h-8 rounded-full ds-liquid-dock-pill flex items-center justify-center text-slate-900 dark:text-white active:scale-95"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Mobile Promo & Voucher Panel */}
              <div className="ds-liquid-panel p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    প্রোমো কোড বা ভাউচার
                  </span>
                  {myCoupons.length > 0 && !appliedPromo && (
                    <button
                      type="button"
                      onClick={() => setShowCouponsModal(true)}
                      className="text-xs font-semibold text-sky-600 dark:text-sky-400 inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>{myCoupons.length}টি ভাউচার দেখুন</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    disabled={!!appliedPromo}
                    placeholder={
                      appliedPromo
                        ? `${appliedPromo.code || appliedPromo.title} যুক্ত`
                        : "প্রোমো কোড লিখুন (যেমন FESTIVE10)"
                    }
                    className="ds-liquid-input flex-1 min-w-0 px-3.5 py-2.5 text-xs font-semibold outline-none placeholder:text-slate-400 disabled:opacity-60"
                  />
                  {appliedPromo ? (
                    <button
                      type="button"
                      onClick={() => setAppliedPromo(null)}
                      className="ds-liquid-btn-secondary !min-h-[40px] !text-xs px-4 whitespace-nowrap shrink-0"
                    >
                      বাতিল
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={applyPromo}
                      className="ds-liquid-btn-primary !min-h-[40px] !text-xs px-4 whitespace-nowrap shrink-0"
                    >
                      প্রয়োগ করুন
                    </button>
                  )}
                </div>

                {promoError && (
                  <p className="text-xs text-rose-500 font-medium">{promoError}</p>
                )}
              </div>

              {/* Mobile Price Breakdown Card */}
              <div className="ds-liquid-panel p-4 space-y-3">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  অর্ডার সামারি
                </h2>
                <div className="space-y-2.5 text-xs sm:text-sm tabular-nums">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>সাবটোটাল ({totalUnits} ইউনিট)</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatPrice(total)}
                    </span>
                  </div>
                  {appliedPromo && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>ডিসকাউন্ট ছাড়</span>
                      <span className="font-bold">-{formatPrice(promoDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>আনুমানিক ডেলিভারি চার্জ</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatPrice(deliveryCharge)}
                    </span>
                  </div>
                  <div className="pt-2.5 border-t border-slate-900/[0.07] dark:border-white/[0.08] flex justify-between items-baseline">
                    <span className="font-bold text-slate-900 dark:text-white">
                      সর্বমোট দেয়
                    </span>
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                      {formatPrice(grandTotal)}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                  চেকআউট ধাপে ক্যাশ অন ডেলিভারি (COD), মোবাইল ব্যাংকিং অথবা ভিআইপি ফ্রি ডেলিভারি সুবিধা নির্বাচন করা যাবে।
                </p>
              </div>
            </div>

            {/* ================================================================
                DESKTOP CART WORKSPACE (lg+)
                Top Architectural Header + 12-Col Split (8-Col Ledger | 4-Col Sticky Summary)
                ================================================================ */}
            <div className="hidden lg:block space-y-7">
              {/* Desktop Top Header Panel */}
              <div className="ds-liquid-panel px-7 py-5 flex items-center justify-between gap-6">
                <div>
                  <h1 className="text-2xl xl:text-[28px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                    শপিং কার্ট · Shopping Bag
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-300/85 mt-1 tabular-nums">
                    আপনার কার্টে {items.length}টি ভিন্ন পণ্য · সর্বমোট {totalUnits} ইউনিট সংরক্ষিত আছে
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate("/all-products")}
                    className="ds-liquid-btn-secondary !min-h-[44px] !text-sm px-5 flex items-center gap-2 whitespace-nowrap"
                  >
                    <ArrowLeft className="w-4 h-4 shrink-0" />
                    <span>কেনাকাটা চালিয়ে যান</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className={`min-h-[44px] px-4 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
                      confirmClear
                        ? "bg-rose-600 text-white shadow-sm"
                        : "ds-liquid-subpanel text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400"
                    }`}
                  >
                    {confirmClear ? "সত্যিই সব মুছবেন?" : "কার্ট খালি করুন"}
                  </button>
                </div>
              </div>

              {/* Desktop 12-Column Asymmetric Split */}
              <div className="grid grid-cols-12 gap-7 items-start">
                {/* LEFT 8 COLUMNS: Structured Itemized Ledger */}
                <div className="col-span-8 space-y-5">
                  <div className="ds-liquid-panel p-6">
                    {/* Column Labels */}
                    <div className="grid grid-cols-12 gap-4 pb-3.5 border-b border-slate-900/[0.07] dark:border-white/[0.08] text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <div className="col-span-6">প্রোডাক্ট ও বিবরণ</div>
                      <div className="col-span-3 text-center">পরিমাণ</div>
                      <div className="col-span-3 text-right">মোট মূল্য</div>
                    </div>

                    {/* Product Rows */}
                    <div className="divide-y divide-slate-900/[0.06] dark:divide-white/[0.08]">
                      <AnimatePresence mode="popLayout">
                        {items.map((item, idx) => {
                          const unitPrice =
                            item.discountPrice || item.offerPrice || item.price || 0;
                          const qty = item.quantity || 1;
                          const lineTotal = unitPrice * qty;

                          return (
                            <motion.div
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.97 }}
                              key={item.id ? `${item.id}-desk-${idx}` : idx}
                              className="py-5 first:pt-5 last:pb-1 grid grid-cols-12 gap-4 items-center group"
                            >
                              {/* Product Media + Info */}
                              <div className="col-span-6 flex items-center gap-4 min-w-0">
                                <Link
                                  to={getItemUrl(item)}
                                  className="w-24 h-24 rounded-2xl ds-liquid-product-media overflow-hidden shrink-0 flex items-center justify-center"
                                >
                                  <PixelImage
                                    src={getItemImage(item)}
                                    alt={item.name}
                                    className="w-full h-full bg-transparent"
                                    imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                </Link>

                                <div className="min-w-0 flex-1 space-y-1">
                                  <Link
                                    to={getItemUrl(item)}
                                    className="font-bold text-base text-slate-900 dark:text-white leading-snug line-clamp-2 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                                  >
                                    {item.name}
                                  </Link>

                                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    <span>{item.variant || "স্ট্যান্ডার্ড ভেরিয়েন্ট"}</span>
                                    {item.brand && (
                                      <>
                                        <span className="mx-1.5" aria-hidden="true">
                                          ·
                                        </span>
                                        <span>{item.brand}</span>
                                      </>
                                    )}
                                  </div>

                                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                                    একক মূল্য: {formatPrice(unitPrice)}
                                  </div>
                                </div>
                              </div>

                              {/* Quantity Stepper */}
                              <div className="col-span-3 flex flex-col items-center justify-center gap-1.5">
                                <div className="ds-liquid-dock rounded-full p-1 flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(idx, -1)}
                                    aria-label="Decrease quantity"
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="min-w-[28px] text-center text-sm font-extrabold text-slate-900 dark:text-white tabular-nums select-none">
                                    {qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(idx, 1)}
                                    aria-label="Increase quantity"
                                    className="w-8 h-8 rounded-full ds-liquid-dock-pill flex items-center justify-center text-slate-900 dark:text-white transition-transform active:scale-95 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Line Subtotal + Remove */}
                              <div className="col-span-3 flex flex-col items-end justify-center gap-2">
                                <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                                  {formatPrice(lineTotal)}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeItem(idx)}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-rose-500 transition-colors cursor-pointer whitespace-nowrap"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>সরান</span>
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Desktop Reassurance Strip */}
                  <div className="ds-liquid-panel px-6 py-4 flex items-center justify-between gap-6 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                      <span>১০০% কোয়ালিটি চেকড অরিজিনাল পণ্য</span>
                    </div>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                      |
                    </span>
                    <div className="flex items-center gap-2.5">
                      <PackageCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>আনবক্সিং ভিডিও প্রোটেকশন ও নিরাপদ কুরিয়ার ট্র্যাকিং</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT 4 COLUMNS: Sticky Order Summary & Promo Console */}
                <aside className="col-span-4 sticky top-24">
                  <div className="ds-liquid-panel p-6 space-y-6">
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                        অর্ডার সামারি
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        চেকআউটের পূর্বে প্রোমো কোড বা ভাউচার যোগ করুন
                      </p>
                    </div>

                    {/* Promo Input */}
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          disabled={!!appliedPromo}
                          placeholder={
                            appliedPromo
                              ? `${appliedPromo.code || appliedPromo.title}`
                              : "প্রোমো কোড (যেমন FESTIVE10)"
                          }
                          className="ds-liquid-input flex-1 min-w-0 px-4 py-2.5 text-sm font-semibold outline-none placeholder:text-slate-400 disabled:opacity-60"
                        />
                        {appliedPromo ? (
                          <button
                            type="button"
                            onClick={() => setAppliedPromo(null)}
                            className="ds-liquid-btn-secondary !min-h-[42px] !text-xs px-4 whitespace-nowrap shrink-0"
                          >
                            সরান
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={applyPromo}
                            className="ds-liquid-btn-primary !min-h-[42px] !text-xs px-4 whitespace-nowrap shrink-0"
                          >
                            প্রয়োগ
                          </button>
                        )}
                      </div>

                      {promoError && (
                        <p className="text-xs text-rose-500 font-semibold">
                          {promoError}
                        </p>
                      )}

                      {appliedPromo && (
                        <div className="ds-liquid-callout-emerald px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                          <span className="inline-flex items-center gap-1.5 truncate">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span className="truncate">
                              {appliedPromo.code || appliedPromo.title} যুক্ত হয়েছে
                            </span>
                          </span>
                          <span className="tabular-nums shrink-0">
                            -{formatPrice(promoDiscount)}
                          </span>
                        </div>
                      )}

                      {myCoupons.length > 0 && !appliedPromo && (
                        <button
                          type="button"
                          onClick={() => setShowCouponsModal(true)}
                          className="w-full ds-liquid-subpanel px-4 py-3 flex items-center justify-between gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-sky-500/40 transition-colors cursor-pointer"
                        >
                          <span className="inline-flex items-center gap-2">
                            <Ticket className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                            <span>আপনার {myCoupons.length}টি ভাউচার প্রস্তুত আছে</span>
                          </span>
                          <span className="text-sky-600 dark:text-sky-400 whitespace-nowrap">
                            দেখুন
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Tabular Price Breakdown */}
                    <div className="pt-4 border-t border-slate-900/[0.07] dark:border-white/[0.08] space-y-3 text-sm tabular-nums">
                      <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>সাবটোটাল ({totalUnits} ইউনিট)</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatPrice(total)}
                        </span>
                      </div>

                      {appliedPromo && (
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                          <span>ভাউচার / প্রোমো ছাড়</span>
                          <span className="font-bold">
                            -{formatPrice(promoDiscount)}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>ডেলিভারি চার্জ (আনুমানিক)</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatPrice(deliveryCharge)}
                        </span>
                      </div>

                      <div className="pt-4 border-t border-slate-900/[0.07] dark:border-white/[0.08] flex justify-between items-baseline">
                        <span className="text-base font-bold text-slate-900 dark:text-white">
                          সর্বমোট
                        </span>
                        <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                          {formatPrice(grandTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Primary Checkout CTA */}
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={() => navigate("/checkout")}
                        className="w-full ds-liquid-btn-primary py-3.5 px-6 flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                      >
                        <span>চেকআউটে এগিয়ে যান</span>
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      </button>

                      <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 leading-relaxed">
                        পরবর্তী ধাপে শিপিং ঠিকানা ও নিরাপদ পেমেন্ট পদ্ধতি নির্বাচন করুন
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </>
        )}

        <div className="mt-8">
          <CustomSectionEmbed location="cart_bottom" />
        </div>
      </div>

      {/* ====================================================================
          MOBILE FROSTED STICKY BOTTOM CHECKOUT BAR (< lg, <= 15% Viewport Height)
          ==================================================================== */}
      {items.length > 0 && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 ds-liquid-bottom-bar px-4 py-2.5">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
            <div className="min-w-0 tabular-nums">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-none">
                সর্বমোট ({totalUnits} ইউনিট)
              </div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mt-0.5 truncate">
                {formatPrice(grandTotal)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/checkout")}
              className="ds-liquid-btn-primary !min-h-[44px] !text-sm px-6 flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <span>চেকআউট করুন</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          LIQUID GLASS VOUCHERS MODAL
          ==================================================================== */}
      <AnimatePresence>
        {showCouponsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCouponsModal(false)}
            className="fixed inset-0 z-50 ds-liquid-backdrop flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md ds-liquid-panel p-5 sm:p-6 overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="pb-4 border-b border-slate-900/[0.07] dark:border-white/[0.08] flex justify-between items-center shrink-0">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    আপনার ভাউচারসমূহ
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    যেকোনো একটি ভাউচার অর্ডারে যুক্ত করুন
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCouponsModal(false)}
                  aria-label="Close vouchers"
                  className="w-8 h-8 rounded-full ds-liquid-icon-btn flex items-center justify-center text-slate-600 dark:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto pt-4 space-y-3">
                {myCoupons.map((voucher) => (
                  <div
                    key={voucher.id}
                    className="ds-liquid-subpanel p-4 flex justify-between items-center gap-4"
                  >
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {voucher.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                        সর্বনিম্ন অর্ডার: {formatPrice(voucher.minOrderValue || 0)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => applyVoucher(voucher)}
                      className="ds-liquid-btn-primary !min-h-[36px] !text-xs px-4 whitespace-nowrap shrink-0"
                    >
                      ব্যবহার করুন
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Cart;
