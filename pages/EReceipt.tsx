import { formatPrice } from "../lib/utils";
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Order } from "../types";
import { motion, useReducedMotion } from "framer-motion";
import { FileText, ShoppingBag } from "lucide-react";
import { OrderDetailPageSkeleton } from "../components/PageSkeletons";
import { getProductDisplayImage } from "../src/lib/phonePartsArt";
import { APPLE_SPRING_DEFAULT } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

const EReceipt: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(
      doc(db, "orders", id),
      (docSnap) => {
        if (docSnap.exists()) {
          setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Receipt error:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [id]);

  const handleDownload = () => {
    triggerHaptic("selection");
    window.print();
  };

  if (loading) return <OrderDetailPageSkeleton />;

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-black flex flex-col items-center justify-center p-8 text-center">
        <p className="font-semibold text-[15px] text-[#1D1D1F] dark:text-[#F5F5F7] mb-5">
          Invoice not found.
        </p>
        <button
          type="button"
          onClick={() => {
            triggerHaptic("selection");
            navigate("/");
          }}
          className="px-8 py-3.5 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] text-white font-semibold text-[14px] active:scale-[0.97] transition-transform cursor-pointer"
        >
          Return Home
        </button>
      </div>
    );
  }

  const subTotal = order.items.reduce(
    (acc, item) => acc + item.priceAtPurchase * item.quantity,
    0,
  );

  const normalizedStatus = String(order.status || "Pending").toLowerCase();
  const statusDotClass = normalizedStatus.includes("deliver")
    ? "bg-[#248A3D] dark:bg-[#30D158]"
    : normalizedStatus.includes("cancel")
    ? "bg-[#FF3B30] dark:bg-[#FF453A]"
    : normalizedStatus.includes("ship") || normalizedStatus.includes("way")
    ? "bg-[#0071E3] dark:bg-[#0A84FF]"
    : "bg-[#FF9500] dark:bg-[#FF9F0A]";

  return (
    <div className="ds-apple-shop-canvas min-h-screen bg-[#F5F5F7] dark:bg-black pb-14 print:bg-white print:p-0">
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0.2 } : APPLE_SPRING_DEFAULT}
        className="max-w-md mx-auto px-4 pt-5 sm:pt-7 print:px-0 print:pt-0"
      >
        <div className="flex items-center justify-between gap-3 mb-4 px-1 print:hidden">
          <div className="min-w-0">
            <h1 className="text-[20px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
              Official E-Receipt
            </h1>
            <p className="text-xs text-[#6E6E73] dark:text-[#98989D] tabular-nums">
              #{order.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="ds-apple-btn-secondary h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
            aria-label="Print receipt"
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>Print</span>
          </button>
        </div>
        <div
          id="receipt-area"
          className="bg-white dark:bg-[#1C1C1E] rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] p-6 sm:p-8 shadow-xs flex flex-col relative overflow-hidden print:border-0 print:bg-white print:text-black print:shadow-none print:rounded-none"
        >
          <div className="mb-8 w-full flex flex-col items-center relative">
            <div className="self-end mb-2">
              <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] px-3 py-1 rounded-full flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`} />
                <span className="text-[11px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                  {order.status || "Pending"}
                </span>
              </div>
            </div>
            <div className="w-14 h-14 bg-[#1D1D1F] dark:bg-[#F5F5F7] text-white dark:text-[#1D1D1F] rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h2 className="text-[19px] font-semibold tracking-[-0.02em] mb-0.5 text-[#1D1D1F] dark:text-[#F5F5F7]">
              DEEP SHOP
            </h2>
            <p className="text-[11px] text-[#6E6E73] dark:text-[#98989D] font-semibold uppercase tracking-[0.06em]">
              Official E-Receipt
            </p>
          </div>

          <div className="w-full space-y-5 mb-6 border-b border-black/[0.06] dark:border-white/[0.08] pb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] text-[#6E6E73] dark:text-[#98989D] font-semibold uppercase tracking-wider">
                  Customer
                </p>
                <p className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {order.customerName}
                </p>
                <p className="text-[11px] font-mono tabular-nums text-[#6E6E73] dark:text-[#98989D]">
                  {order.contactNumber}
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[10px] text-[#6E6E73] dark:text-[#98989D] font-semibold uppercase tracking-wider">
                  Order ID
                </p>
                <p className="text-[11px] font-mono tabular-nums font-semibold bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.05] dark:border-white/[0.08] px-2.5 py-1 rounded-lg inline-block text-[#1D1D1F] dark:text-[#F5F5F7]">
                  #{order.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-[11px] tabular-nums text-[#6E6E73] dark:text-[#98989D]">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-[#6E6E73] dark:text-[#98989D] font-semibold uppercase tracking-wider mb-1">
                Shipping To
              </p>
              <p className="text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] leading-relaxed">
                {order.shippingAddress}
              </p>
            </div>
          </div>

          <div className="w-full space-y-3 mb-6">
            <p className="text-[10px] text-[#6E6E73] dark:text-[#98989D] font-semibold uppercase tracking-wider">
              Order Summary
            </p>
            {order.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3.5 bg-[#F5F5F7] dark:bg-[#2C2C2E] p-3.5 rounded-[16px] border border-black/[0.04] dark:border-white/[0.06]"
              >
                <div className="w-11 h-11 bg-white dark:bg-[#1C1C1E] rounded-xl overflow-hidden p-1 shrink-0 border border-black/[0.05] dark:border-white/[0.08]">
                  <img
                    src={getProductDisplayImage(item)}
                    className="w-full h-full object-contain"
                    alt=""
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                    {item.name}
                  </h4>
                  <p className="text-[11px] tabular-nums text-[#6E6E73] dark:text-[#98989D]">
                    Qty: {item.quantity}{" "}
                    {order.isGift ? "" : `× ${formatPrice(item.priceAtPurchase)}`}
                  </p>
                </div>
                <p className="font-semibold text-[13px] tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7] shrink-0">
                  {order.isGift
                    ? "Gift"
                    : `${formatPrice(item.priceAtPurchase * item.quantity)}`}
                </p>
              </div>
            ))}
          </div>

          <div className="w-full bg-[#F5F5F7] dark:bg-[#2C2C2E] p-4 rounded-[16px] border border-black/[0.04] dark:border-white/[0.06] mb-6">
            <p className="text-[10px] text-[#6E6E73] dark:text-[#98989D] font-semibold uppercase tracking-wider mb-2.5">
              Payment Info
            </p>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[12px]">
                <span className="text-[#6E6E73] dark:text-[#98989D]">Method</span>
                <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {order.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between items-center text-[12px]">
                <span className="text-[#6E6E73] dark:text-[#98989D]">Transaction ID</span>
                <span className="font-mono tabular-nums font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {order.transactionId || "N/A"}
                </span>
              </div>
            </div>
          </div>

          <div className="w-full space-y-2.5 mb-6 border-t border-black/[0.06] dark:border-white/[0.08] pt-5">
            {order.isGift ? (
              <div className="text-center bg-[#0071E3]/8 dark:bg-[#0A84FF]/14 p-4 rounded-[16px] border border-[#0071E3]/15 dark:border-[#0A84FF]/25">
                <p className="text-[11px] font-semibold text-[#0071E3] dark:text-[#0A84FF] mb-1">
                  A Special Gift
                </p>
                <p className="text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] mt-1 italic">
                  {order.giftNote || "Enjoy!"}
                </p>
                <p className="text-[10px] mt-3 font-semibold uppercase tracking-wider text-[#6E6E73] dark:text-[#98989D]">
                  Paid in Advance
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-[12px] text-[#6E6E73] dark:text-[#98989D]">
                  <span>Sub-Total</span>
                  <span className="font-semibold tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {formatPrice(order.subTotal || subTotal)}
                  </span>
                </div>
                {!!order.discount && (
                  <div className="flex justify-between text-[12px] text-[#248A3D] dark:text-[#30D158] font-medium">
                    <span>
                      Discount {order.couponCode ? `(${order.couponCode})` : ""}
                    </span>
                    <span className="tabular-nums">-{formatPrice(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[12px] text-[#6E6E73] dark:text-[#98989D]">
                  <span>Delivery Charge</span>
                  <span className="font-semibold tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {formatPrice(order.total -
                      ((order.subTotal || subTotal) - (order.discount || 0)))}
                  </span>
                </div>
                <div className="flex justify-between text-[19px] font-semibold pt-3.5 border-t border-black/[0.06] dark:border-white/[0.08] tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                  <span>Total</span>
                  <span className="tabular-nums">{formatPrice(order.total)}</span>
                </div>
                {order.advanceAmount > 0 && (
                  <>
                    <div className="flex justify-between text-[12px] text-[#6E6E73] dark:text-[#98989D] mt-2">
                      <span>Advance Paid</span>
                      <span className="font-semibold tabular-nums text-[#248A3D] dark:text-[#30D158]">
                        -{formatPrice(order.advanceAmount)}
                      </span>
                    </div>
                    {order.courierPaymentDetails && (
                      <div className="flex justify-between text-[12px] text-[#6E6E73] dark:text-[#98989D] mt-1">
                        <span>Courier Due Paid</span>
                        <span className="font-semibold tabular-nums text-[#248A3D] dark:text-[#30D158]">
                          -{formatPrice(order.courierPaymentDetails.amount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-[14px] font-semibold pt-2.5 border-t border-dashed border-black/[0.1] dark:border-white/[0.12] tracking-tight text-[#FF3B30] dark:text-[#FF453A] mt-2">
                      <span>Due Amount (COD)</span>
                      <span className="tabular-nums">
                        {formatPrice(Math.max(0, order.total - order.advanceAmount - (order.courierPaymentDetails?.amount || 0)))}
                      </span>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <div className="w-full text-center">
            <p className="text-[11px] font-medium text-[#6E6E73] dark:text-[#98989D]">
              Thank you for shopping at DEEP SHOP
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          className="w-full mt-6 py-3.5 bg-[#0071E3] dark:bg-[#0A84FF] text-white rounded-full flex items-center justify-center gap-2 text-[14px] font-semibold print:hidden active:scale-[0.98] transition-transform cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          <span>Download Invoice / Print</span>
        </button>
      </motion.div>

      <style>
        {`
            @media print {
              body * { visibility: hidden; }
              #receipt-area, #receipt-area * { visibility: visible; }
              #receipt-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 40px;
                background: white !important;
                border: none !important;
              }
              .print\\:hidden { display: none !important; }
            }
          `}
      </style>
    </div>
  );
};

export default EReceipt;
