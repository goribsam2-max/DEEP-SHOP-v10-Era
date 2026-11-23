import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Order, OrderStatus } from "../types";
import { motion, useReducedMotion } from "framer-motion";
import { Check, CreditCard, RefreshCw, Package, Truck, Bike, PackageOpen, Phone, FileText, Copy } from "lucide-react";
import { OrderDetailPageSkeleton } from "../components/PageSkeletons";
import { APPLE_SPRING_DEFAULT } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";
import { useNotify } from "../components/Notifications";

const StatusIcon = ({ status }: { status: OrderStatus | string }) => {
  const base = "w-14 h-14 rounded-full flex items-center justify-center ";
  switch (status) {
    case OrderStatus.APPROVED:
      return (
        <div className={base + "bg-[#248A3D]/12 dark:bg-[#30D158]/16 text-[#248A3D] dark:text-[#30D158]"}>
          <Check className="w-6 h-6" strokeWidth={2.5} />
        </div>
      );
    case OrderStatus.CHECKING_PAYMENT:
      return (
        <div className={base + "bg-[#0071E3]/12 dark:bg-[#0A84FF]/16 text-[#0071E3] dark:text-[#0A84FF]"}>
          <CreditCard className="w-6 h-6" />
        </div>
      );
    case OrderStatus.PROCESSING:
      return (
        <div className={base + "bg-[#0071E3]/12 dark:bg-[#0A84FF]/16 text-[#0071E3] dark:text-[#0A84FF]"}>
          <RefreshCw className="w-6 h-6" />
        </div>
      );
    case OrderStatus.COMPLETE_PACKAGING:
      return (
        <div className={base + "bg-[#FF9500]/12 dark:bg-[#FF9F0A]/16 text-[#FF9500] dark:text-[#FF9F0A]"}>
          <Package className="w-6 h-6" />
        </div>
      );
    case OrderStatus.DELIVER_ON_COURIER:
      return (
        <div className={base + "bg-[#FF9500]/12 dark:bg-[#FF9F0A]/16 text-[#FF9500] dark:text-[#FF9F0A]"}>
          <Truck className="w-6 h-6" />
        </div>
      );
    case OrderStatus.ON_THE_WAY:
      return (
        <div className={base + "bg-[#0071E3]/12 dark:bg-[#0A84FF]/16 text-[#0071E3] dark:text-[#0A84FF]"}>
          <Bike className="w-6 h-6" />
        </div>
      );
    case OrderStatus.DELIVERED:
      return (
        <div className={base + "bg-[#248A3D]/12 dark:bg-[#30D158]/16 text-[#248A3D] dark:text-[#30D158]"}>
          <Check className="w-6 h-6" strokeWidth={2.5} />
        </div>
      );
    default:
      return (
        <div className={base + "bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#6E6E73] dark:text-[#98989D]"}>
          <PackageOpen className="w-6 h-6" />
        </div>
      );
  }
};

const TrackOrder: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const prefersReducedMotion = useReducedMotion();
  const notify = useNotify();

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(
      doc(db, "orders", id),
      (snap) => {
        if (snap.exists()) setOrder({ id: snap.id, ...snap.data() } as Order);
        setLoading(false);
      },
      (err) => {
        console.warn("Order fetch error:", err.message);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [id]);

  if (loading) return <OrderDetailPageSkeleton />;

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-black flex flex-col items-center justify-center p-8 text-center ds-apple-shop-canvas">
        <div className="w-16 h-16 bg-white dark:bg-[#1C1C1E] rounded-full flex items-center justify-center mb-5 text-lg font-semibold text-[#6E6E73] dark:text-[#98989D] border border-black/[0.06] dark:border-white/[0.08]">
          ?
        </div>
        <p className="font-semibold text-[15px] mb-6 text-[#1D1D1F] dark:text-[#F5F5F7]">
          Order not found
        </p>
        <button
          type="button"
          onClick={() => {
            triggerHaptic("selection");
            navigate("/");
          }}
          className="px-8 py-3.5 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] text-white font-semibold text-[14px] whitespace-nowrap active:scale-[0.97] transition-transform cursor-pointer"
        >
          Return to Store
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black pb-16 ds-apple-shop-canvas">
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0.2 } : APPLE_SPRING_DEFAULT}
        className="max-w-lg mx-auto px-4 pt-6 space-y-5"
      >
        <div className="px-1">
          <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.024em] text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
            Track Order
          </h1>
        </div>
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[24px] p-7 sm:p-8 flex flex-col items-center text-center border border-black/[0.06] dark:border-white/[0.08] shadow-xs relative overflow-hidden">
          {order.status === OrderStatus.CANCELLED && (
            <div className="w-full mb-5 rounded-[14px] bg-[#FF3B30]/10 dark:bg-[#FF453A]/15 border border-[#FF3B30]/20 dark:border-[#FF453A]/25 text-[#FF3B30] dark:text-[#FF453A] py-2.5 px-4 flex justify-center items-center text-[12px] font-semibold">
              <span>Cancelled: {(order as any).rejectReason || "No reason provided"}</span>
            </div>
          )}

          {order.status === OrderStatus.ON_THE_WAY &&
            (order.riderNumber || order.courierName) && (
              <div className="w-full mb-5 rounded-[14px] bg-[#0071E3]/8 dark:bg-[#0A84FF]/14 border border-[#0071E3]/15 dark:border-[#0A84FF]/25 text-[#1D1D1F] dark:text-[#F5F5F7] py-2.5 px-4 flex justify-between items-center text-[12px] font-semibold">
                <span className="flex items-center gap-2">
                  <Bike className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />
                  {order.courierName || "Courier"}
                </span>
                {order.riderNumber && (
                  <a
                    href={`tel:${order.riderNumber}`}
                    onClick={() => triggerHaptic("selection")}
                    className="bg-[#0071E3] dark:bg-[#0A84FF] text-white px-3 py-1 rounded-full flex items-center gap-1.5 text-[11px] font-semibold tabular-nums whitespace-nowrap active:scale-[0.97] transition-transform"
                  >
                    <Phone className="w-3 h-3" />
                    {order.riderNumber}
                  </a>
                )}
              </div>
            )}

          <div className="mb-4">
            <StatusIcon status={order.status} />
          </div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#1D1D1F] dark:text-[#F5F5F7]">
            {order.status}
          </h1>

          <button
            type="button"
            onClick={() => {
              if (order.trackingId) {
                navigator.clipboard?.writeText(order.trackingId);
                triggerHaptic("success");
                notify("Tracking ID copied!", "success");
              }
            }}
            className="flex items-center gap-2 bg-[#F5F5F7] dark:bg-[#2C2C2E] px-4 py-2 rounded-full border border-black/[0.05] dark:border-white/[0.08] mt-4 cursor-pointer active:scale-[0.97] transition-transform"
          >
            <span className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#98989D]">
              Tracking ID:
            </span>
            <span className="text-[12px] font-mono tabular-nums font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              {order.trackingId || "Preparing"}
            </span>
            {order.trackingId && <Copy className="w-3 h-3 text-[#6E6E73] dark:text-[#98989D]" />}
          </button>
        </div>

        <div className="space-y-2.5">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#6E6E73] dark:text-[#98989D] px-2">
            Delivery Progress
          </h2>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[24px] p-6 sm:p-7 border border-black/[0.06] dark:border-white/[0.08] space-y-7 shadow-xs">
            <Step label="Order Placed" sub="We received your order." active />
            <Step
              label="Quality Check"
              sub="Testing your items before packing."
              active={
                order.status !== OrderStatus.PENDING &&
                order.status !== OrderStatus.CANCELLED
              }
            />
            <Step
              label="Order Packed"
              sub="Your items are ready to ship."
              active={[
                OrderStatus.COMPLETE_PACKAGING,
                OrderStatus.DELIVER_ON_COURIER,
                OrderStatus.ON_THE_WAY,
                OrderStatus.DELIVERED,
              ].includes(order.status as OrderStatus)}
            />
            <Step
              label="Handed to Courier"
              sub="Sent via Courier."
              active={[
                OrderStatus.DELIVER_ON_COURIER,
                OrderStatus.ON_THE_WAY,
                OrderStatus.DELIVERED,
              ].includes(order.status as OrderStatus)}
            />
            <Step
              label="Delivered"
              sub="Product delivered to your address."
              active={order.status === OrderStatus.DELIVERED}
              isLast
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic("selection");
            navigate(`/e-receipt/${order.id}`);
          }}
          className="w-full py-3.5 px-5 bg-[#0071E3] dark:bg-[#0A84FF] text-white rounded-full font-semibold text-[14px] whitespace-nowrap flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer"
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>View Invoice</span>
        </button>
      </motion.div>
    </div>
  );
};

const Step = ({ label, sub, active, isLast }: { label: string; sub: string; active: boolean; isLast?: boolean }) => (
  <div className="flex gap-4 relative">
    <div className="flex flex-col items-center">
      <div
        className={`w-4 h-4 rounded-full border-[3px] transition-colors ${
          active
            ? "bg-[#0071E3] dark:bg-[#0A84FF] border-[#0071E3]/20 dark:border-[#0A84FF]/30"
            : "bg-black/[0.08] dark:bg-white/[0.12] border-transparent"
        }`}
      />
      {!isLast && (
        <div
          className={`w-0.5 flex-1 min-h-[28px] mt-1 transition-colors ${
            active ? "bg-[#0071E3]/30 dark:bg-[#0A84FF]/35" : "bg-black/[0.06] dark:bg-white/[0.08]"
          }`}
        />
      )}
    </div>
    <div className="-mt-0.5 flex-1 pb-1">
      <h4
        className={`text-[14px] font-semibold tracking-tight ${
          active ? "text-[#1D1D1F] dark:text-[#F5F5F7]" : "text-[#6E6E73] dark:text-[#98989D]"
        }`}
      >
        {label}
      </h4>
      <p className="text-[12px] text-[#6E6E73] dark:text-[#98989D] mt-0.5 leading-relaxed">
        {sub}
      </p>
    </div>
  </div>
);

export default TrackOrder;
