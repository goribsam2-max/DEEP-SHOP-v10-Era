import { formatPrice } from "@/lib/utils";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CustomSectionEmbed } from "../components/CustomSectionEmbed";
import { auth, db } from "../firebase";
import { query, where, getDocs, collection } from "firebase/firestore";
import { useNotify } from "../components/Notifications";
import { useIllustrations } from "../lib/useIllustrations";
import { PixelImage } from "../components/ui/PixelImage";
import { getProductDisplayImage } from "../src/lib/phonePartsArt";
import { APPLE_SPRING_DEFAULT, projectMomentum } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";
import { useSwipeNavigation } from "../lib/useSwipeNavigation";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Ticket,
  ArrowRight,
  ShieldCheck,
  X,
  CheckCircle2,
  PackageCheck,
} from "lucide-react";

interface SwipeableCartItemProps {
  children: React.ReactNode;
  onRemove: () => void;
  onIncrement: () => void;
}

const SwipeableCartItem: React.FC<SwipeableCartItemProps> = ({
  children,
  onRemove,
  onIncrement,
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchRef = useRef<{
    startX: number;
    startY: number;
    baseOffset: number;
    axis: "x" | "y" | null;
    hapticTicked: boolean;
  } | null>(null);
  const didSwipeRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    if (t.clientX <= 26) return; // Yield to GlobalEdgeSwipeBack
    touchRef.current = {
      startX: t.clientX,
      startY: t.clientY,
      baseOffset: offsetX,
      axis: null,
      hapticTicked: false,
    };
    didSwipeRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const s = touchRef.current;
    if (!s || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - s.startX;
    const dy = t.clientY - s.startY;

    if (!s.axis) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.1) {
        s.axis = "y";
        touchRef.current = null;
        return;
      }
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        s.axis = "x";
        setIsDragging(true);
        didSwipeRef.current = true;
      } else {
        return;
      }
    }

    const raw = s.baseOffset + dx;
    const clamped = Math.max(-165, Math.min(88, raw));
    if (!s.hapticTicked && (clamped <= -138 || clamped >= 62)) {
      s.hapticTicked = true;
      triggerHaptic("selection");
    }
    setOffsetX(clamped);
  };

  const handleTouchEnd = () => {
    const s = touchRef.current;
    touchRef.current = null;
    setIsDragging(false);
    if (!s || s.axis !== "x") return;

    if (offsetX <= -145) {
      triggerHaptic("medium");
      setOffsetX(0);
      onRemove();
      return;
    }
    if (offsetX <= -44) {
      setOffsetX(-84);
      return;
    }
    if (offsetX >= 58) {
      triggerHaptic("selection");
      setOffsetX(0);
      onIncrement();
      return;
    }
    setOffsetX(0);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      data-no-swipe="true"
      className="relative overflow-hidden rounded-[22px]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onClickCapture={(e) => {
        if (didSwipeRef.current) {
          e.preventDefault();
          e.stopPropagation();
          didSwipeRef.current = false;
        }
      }}
    >
      {/* Left Reveal: Quick +1 Quantity */}
      <div
        className={`absolute inset-y-0 left-0 w-24 flex items-center justify-center rounded-l-[22px] bg-emerald-500 text-white transition-opacity ${
          offsetX > 6 ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex flex-col items-center gap-0.5 font-bold text-xs">
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+1 Qty</span>
        </div>
      </div>

      {/* Right Reveal: Remove Item */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOffsetX(0);
          onRemove();
        }}
        className={`absolute inset-y-0 right-0 w-[84px] flex flex-col items-center justify-center gap-1 rounded-r-[22px] bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs cursor-pointer transition-opacity ${
          offsetX < -6 ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-label="Remove item"
      >
        <Trash2 className="w-4 h-4" />
        <span>Remove</span>
      </button>

      {/* Foreground Card */}
      <div
        onClick={() => {
          if (offsetX < 0) setOffsetX(0);
        }}
        style={{
          transform: `translate3d(${offsetX}px, 0, 0)`,
          transition: isDragging
            ? "none"
            : "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className="relative z-10"
      >
        {children}
      </div>
    </motion.div>
  );
};

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
  const prefersReducedMotion = useReducedMotion();

  const { swipeHandlers: cartSwipeHandlers } = useSwipeNavigation({
    disabled: showCouponsModal,
    onEdgeSwipeRight: () => {
      triggerHaptic("light");
      navigate(-1);
    },
  });

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
    triggerHaptic("light");
    const newItems = [...items];
    const nextQty = Math.max(1, (newItems[index].quantity || 1) + delta);
    newItems[index] = { ...newItems[index], quantity: nextQty };
    persistCart(newItems);
  };

  const removeItem = (index: number) => {
    triggerHaptic("medium");
    const newItems = items.filter((_, i) => i !== index);
    persistCart(newItems);
    notify("Removed item from cart", "info");
  };

  const handleClearCart = () => {
    if (!confirmClear) {
      triggerHaptic("warning");
      setConfirmClear(true);
      return;
    }
    triggerHaptic("medium");
    persistCart([]);
    setAppliedPromo(null);
    setConfirmClear(false);
    notify("Cart cleared", "info");
  };

  const applyPromo = async () => {
    setPromoError("");
    if (!promoCode.trim()) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      triggerHaptic("warning");
      setPromoError("Promo codes cannot be verified in offline mode");
      return;
    }
    triggerHaptic("light");
    try {
      const q = query(
        collection(db, "promo_codes"),
        where("code", "==", promoCode.trim().toUpperCase())
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        triggerHaptic("error");
        setPromoError("Invalid promo code");
      } else {
        const c = snap.docs[0].data();
        if (!c.isActive) {
          triggerHaptic("error");
          setPromoError("This promo code is currently inactive");
        } else if (c.expiresAt && c.expiresAt < Date.now()) {
          triggerHaptic("error");
          setPromoError("This promo code has expired");
        } else if (c.minOrderValue && total < c.minOrderValue) {
          triggerHaptic("warning");
          setPromoError(`Minimum order of ${formatPrice(c.minOrderValue)} required`);
        } else {
          triggerHaptic("success");
          setAppliedPromo({ id: snap.docs[0].id, ...c, isVoucher: false });
          notify("Promo code applied!", "success");
        }
      }
    } catch {
      triggerHaptic("error");
      setPromoError("Failed to verify promo code");
    }
  };

  const applyVoucher = (voucher: any) => {
    if (voucher.minOrderValue && total < voucher.minOrderValue) {
      triggerHaptic("warning");
      notify(
        `Minimum order of ${formatPrice(voucher.minOrderValue)} required`,
        "error"
      );
      return;
    }
    triggerHaptic("success");
    setAppliedPromo(voucher);
    setShowCouponsModal(false);
    notify("Voucher applied successfully!", "success");
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
    <div
      {...cartSwipeHandlers}
      className="ds-liquid-checkout-shell min-h-screen relative transition-colors font-sans pb-28 lg:pb-16"
    >
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
              Your cart is empty
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300/85 mb-8 max-w-md leading-relaxed">
              Add your favorite smartphones, original parts, or accessories to your cart and place your order easily.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => navigate("/all-products")}
                className="ds-liquid-btn-primary px-7 py-3 w-full sm:w-auto flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>Browse Catalog</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="ds-liquid-btn-secondary px-7 py-3 w-full sm:w-auto flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>Go to Home</span>
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
                    Your Cart
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                    {items.length} {items.length === 1 ? "item" : "items"} · {totalUnits} total {totalUnits === 1 ? "unit" : "units"}
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
                    {confirmClear ? "Confirm Clear?" : "Clear All"}
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
                      <SwipeableCartItem
                        key={item.id ? `${item.id}-${idx}` : idx}
                        onRemove={() => removeItem(idx)}
                        onIncrement={() => updateQuantity(idx, 1)}
                      >
                        <div className="ds-liquid-panel p-3.5 rounded-[22px]">
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
                                {item.variant || "Standard Edition"}
                                {item.brand ? ` · ${item.brand}` : ""}
                                {` · Unit ${formatPrice(unitPrice)}`}
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
                        </div>
                      </SwipeableCartItem>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Mobile Promo & Voucher Panel */}
              <div className="ds-liquid-panel p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Promo Code or Voucher
                  </span>
                  {myCoupons.length > 0 && !appliedPromo && (
                    <button
                      type="button"
                      onClick={() => setShowCouponsModal(true)}
                      className="text-xs font-semibold text-sky-600 dark:text-sky-400 inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>View {myCoupons.length} {myCoupons.length === 1 ? "voucher" : "vouchers"}</span>
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
                        ? `${appliedPromo.code || appliedPromo.title} applied`
                        : "Enter promo code (e.g. FESTIVE10)"
                    }
                    className="ds-liquid-input flex-1 min-w-0 px-3.5 py-2.5 text-xs font-semibold outline-none placeholder:text-slate-400 disabled:opacity-60"
                  />
                  {appliedPromo ? (
                    <button
                      type="button"
                      onClick={() => setAppliedPromo(null)}
                      className="ds-liquid-btn-secondary !min-h-[40px] !text-xs px-4 whitespace-nowrap shrink-0"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={applyPromo}
                      className="ds-liquid-btn-primary !min-h-[40px] !text-xs px-4 whitespace-nowrap shrink-0"
                    >
                      Apply
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
                  Order Summary
                </h2>
                <div className="space-y-2.5 text-xs sm:text-sm tabular-nums">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Subtotal ({totalUnits} {totalUnits === 1 ? "unit" : "units"})</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatPrice(total)}
                    </span>
                  </div>
                  {appliedPromo && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Discount</span>
                      <span className="font-bold">-{formatPrice(promoDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Estimated Delivery Charge</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatPrice(deliveryCharge)}
                    </span>
                  </div>
                  <div className="pt-2.5 border-t border-slate-900/[0.07] dark:border-white/[0.08] flex justify-between items-baseline">
                    <span className="font-bold text-slate-900 dark:text-white">
                      Total Payable
                    </span>
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                      {formatPrice(grandTotal)}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                  You can select Cash on Delivery (COD), Mobile Banking, or VIP Free Delivery options at checkout.
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
                    Shopping Bag
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-300/85 mt-1 tabular-nums">
                    {items.length} distinct {items.length === 1 ? "item" : "items"} · {totalUnits} total {totalUnits === 1 ? "unit" : "units"} saved in your bag
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate("/all-products")}
                    className="ds-liquid-btn-secondary !min-h-[44px] !text-sm px-5 flex items-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 shrink-0" />
                    <span>Continue Shopping</span>
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
                    {confirmClear ? "Confirm Clear All?" : "Clear Bag"}
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
                      <div className="col-span-6">Product &amp; Details</div>
                      <div className="col-span-3 text-center">Quantity</div>
                      <div className="col-span-3 text-right">Total Price</div>
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
                                    <span>{item.variant || "Standard Edition"}</span>
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
                                    Unit Price: {formatPrice(unitPrice)}
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
                                  <span>Remove</span>
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
                      <span>100% Quality-Checked Authentic Products</span>
                    </div>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                      |
                    </span>
                    <div className="flex items-center gap-2.5">
                      <PackageCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Unboxing Video Protection &amp; Secure Courier Tracking</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT 4 COLUMNS: Sticky Order Summary & Promo Console */}
                <aside className="col-span-4 sticky top-24">
                  <div className="ds-liquid-panel p-6 space-y-6">
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Order Summary
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Add a promo code or voucher before proceeding to checkout
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
                              : "Promo code (e.g. FESTIVE10)"
                          }
                          className="ds-liquid-input flex-1 min-w-0 px-4 py-2.5 text-sm font-semibold outline-none placeholder:text-slate-400 disabled:opacity-60"
                        />
                        {appliedPromo ? (
                          <button
                            type="button"
                            onClick={() => setAppliedPromo(null)}
                            className="ds-liquid-btn-secondary !min-h-[42px] !text-xs px-4 whitespace-nowrap shrink-0"
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={applyPromo}
                            className="ds-liquid-btn-primary !min-h-[42px] !text-xs px-4 whitespace-nowrap shrink-0"
                          >
                            Apply
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
                              {appliedPromo.code || appliedPromo.title} applied
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
                            <span>You have {myCoupons.length} {myCoupons.length === 1 ? "voucher" : "vouchers"} ready</span>
                          </span>
                          <span className="text-sky-600 dark:text-sky-400 whitespace-nowrap">
                            View
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Tabular Price Breakdown */}
                    <div className="pt-4 border-t border-slate-900/[0.07] dark:border-white/[0.08] space-y-3 text-sm tabular-nums">
                      <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>Subtotal ({totalUnits} {totalUnits === 1 ? "unit" : "units"})</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatPrice(total)}
                        </span>
                      </div>

                      {appliedPromo && (
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                          <span>Voucher / Promo Discount</span>
                          <span className="font-bold">
                            -{formatPrice(promoDiscount)}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>Delivery Charge (Estimated)</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatPrice(deliveryCharge)}
                        </span>
                      </div>

                      <div className="pt-4 border-t border-slate-900/[0.07] dark:border-white/[0.08] flex justify-between items-baseline">
                        <span className="text-base font-bold text-slate-900 dark:text-white">
                          Total
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
                        <span>Proceed to Checkout</span>
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      </button>

                      <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 leading-relaxed">
                        Choose your shipping address and secure payment method in the next step
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
                Total ({totalUnits} {totalUnits === 1 ? "unit" : "units"})
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
              <span>Checkout</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          APPLE GLASS VOUCHERS MODAL (Portaled + Momentum Dismiss)
          ==================================================================== */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showCouponsModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => {
                  triggerHaptic("light");
                  setShowCouponsModal(false);
                }}
                className="ds-apple-portal ds-apple-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
              >
                <motion.div
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: "100%" }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: "100%" }}
                  transition={prefersReducedMotion ? { duration: 0.15 } : APPLE_SPRING_DEFAULT}
                  drag={prefersReducedMotion ? false : "y"}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0.02, bottom: 0.45 }}
                  onDragEnd={(_, info) => {
                    const projected = info.offset.y + projectMomentum(info.velocity.y);
                    if (projected > 110 || info.velocity.y > 420) {
                      triggerHaptic("light");
                      setShowCouponsModal(false);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-none sm:max-w-md ds-apple-sheet sm:ds-apple-modal rounded-t-[28px] rounded-b-none sm:rounded-[28px] p-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] sm:p-6 overflow-hidden flex flex-col max-h-[82dvh]"
                >
                  <div className="w-9 h-1 rounded-full bg-black/20 dark:bg-white/25 mx-auto mb-3 sm:hidden" />
                  <div className="pb-4 border-b border-black/[0.06] dark:border-white/[0.08] flex justify-between items-center shrink-0">
                    <div>
                      <h3 className="font-bold text-lg text-[#1D1D1F] dark:text-[#F5F5F7]">
                        Your Vouchers
                      </h3>
                      <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93]">
                        Select a voucher to apply to your order
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setShowCouponsModal(false);
                      }}
                      aria-label="Close vouchers"
                      className="ds-apple-icon-btn w-8 h-8 flex items-center justify-center active:scale-95 transition-transform"
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
                          <h4 className="font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                            {voucher.title}
                          </h4>
                          <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-0.5 tabular-nums">
                            Minimum Order: {formatPrice(voucher.minOrderValue || 0)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => applyVoucher(voucher)}
                          className="ds-liquid-btn-primary !min-h-[36px] !text-xs px-4 whitespace-nowrap shrink-0 active:scale-[0.97]"
                        >
                          Use Voucher
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

export default Cart;
