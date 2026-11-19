import React, { useState, useEffect } from "react";
import { Order, OrderStatus } from "../types";
import { useNavigate, useParams } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { motion, useReducedMotion } from "framer-motion";
import { formatPrice } from "../lib/utils";
import { Clock, LayoutGrid, PackageCheck, PackageOpen, Truck, XCircle } from "lucide-react";
import { Tr } from "../components/Tr";
import { APPLE_SPRING_DEFAULT } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

const StatusBadge = ({ status }: { status: OrderStatus }) => {
  switch (status) {
    case OrderStatus.PENDING:
      return (
        <div className="px-2.5 py-1 bg-[#FF9500]/12 dark:bg-[#FF9F0A]/16 text-[#FF9500] dark:text-[#FF9F0A] rounded-full text-[11px] font-semibold flex items-center gap-1">
          <Clock className="w-3 h-3" /> <Tr>Pending</Tr>
        </div>
      );
    case OrderStatus.DELIVER_ON_COURIER:
    case OrderStatus.ON_THE_WAY:
      return (
        <div className="px-2.5 py-1 bg-[#0071E3]/12 dark:bg-[#0A84FF]/16 text-[#0071E3] dark:text-[#0A84FF] rounded-full text-[11px] font-semibold flex items-center gap-1">
          <Truck className="w-3 h-3" /> <Tr>On The Way</Tr>
        </div>
      );
    case OrderStatus.DELIVERED:
      return (
        <div className="px-2.5 py-1 bg-[#248A3D]/12 dark:bg-[#30D158]/16 text-[#248A3D] dark:text-[#30D158] rounded-full text-[11px] font-semibold flex items-center gap-1">
          <PackageCheck className="w-3 h-3" /> <Tr>Delivered</Tr>
        </div>
      );
    case OrderStatus.CANCELLED:
      return (
        <div className="px-2.5 py-1 bg-[#FF3B30]/12 dark:bg-[#FF453A]/16 text-[#FF3B30] dark:text-[#FF453A] rounded-full text-[11px] font-semibold flex items-center gap-1">
          <XCircle className="w-3 h-3" /> <Tr>Cancelled</Tr>
        </div>
      );
    default:
      return (
        <div className="px-2.5 py-1 bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#6E6E73] dark:text-[#98989D] rounded-full text-[11px] font-semibold flex items-center gap-1">
          <LayoutGrid className="w-3 h-3" /> <Tr>{status}</Tr>
        </div>
      );
  }
};

const OrderActionPage: React.FC = () => {
  const { actionName } = useParams<{ actionName: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const uid = auth.currentUser?.uid || "guest";
    const q = query(collection(db, "orders"), where("userId", "==", uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Order);

      if (actionName === "pay") {
        data = data.filter(o => [OrderStatus.PENDING, OrderStatus.CHECKING_PAYMENT].includes(o.status));
      } else if (actionName === "ship") {
        data = data.filter(o => [OrderStatus.APPROVED, OrderStatus.PROCESSING, OrderStatus.COMPLETE_PACKAGING].includes(o.status));
      } else if (actionName === "receive") {
        data = data.filter(o => [OrderStatus.DELIVER_ON_COURIER, OrderStatus.ON_THE_WAY].includes(o.status));
      } else if (actionName === "review") {
        data = data.filter(o => o.status === OrderStatus.DELIVERED);
      }

      data.sort((a, b) => b.createdAt - a.createdAt);
      setOrders(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [actionName]);

  const getPageTitle = () => {
    switch (actionName) {
      case "pay": return "To Pay";
      case "ship": return "To Ship";
      case "receive": return "To Receive";
      case "review": return "To Review";
      default: return "Orders";
    }
  };

  const getPageSubtitle = () => {
    switch (actionName) {
      case "pay": return "Orders pending payment or confirmation";
      case "ship": return "Orders currently being prepared to ship";
      case "receive": return "Orders currently on the way";
      case "review": return "Share your experience with these items";
      default: return "";
    }
  };

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] rounded-full flex items-center justify-center mb-5">
        <PackageOpen className="w-9 h-9 text-[#6E6E73] dark:text-[#98989D]" strokeWidth={1.5} />
      </div>
      <h3 className="text-[19px] font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] mb-1.5">
        <Tr>No orders found</Tr>
      </h3>
      <p className="text-[13px] text-[#6E6E73] dark:text-[#98989D] mb-7 max-w-[260px]">
        <Tr>You don't have any orders in this state right now.</Tr>
      </p>
      <button
        type="button"
        onClick={() => {
          triggerHaptic("selection");
          navigate("/all-products");
        }}
        className="bg-[#0071E3] dark:bg-[#0A84FF] text-white px-7 py-3 rounded-full font-semibold text-[14px] whitespace-nowrap active:scale-[0.97] transition-transform cursor-pointer"
      >
        <Tr>Start Shopping</Tr>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black pb-20 ds-apple-shop-canvas">
      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-6">
        <div className="mb-6">
          <h1 className="text-[24px] sm:text-[26px] font-bold tracking-[-0.024em] text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
            <Tr>{getPageTitle()}</Tr>
          </h1>
          <p className="text-[13px] text-[#6E6E73] dark:text-[#98989D] mt-1">
            <Tr>{getPageSubtitle()}</Tr>
          </p>
        </div>

        {loading ? (
          <div className="space-y-3.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[22px] border border-black/[0.06] dark:border-white/[0.08] ds-skeleton h-28" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3.5">
            {orders.map((order) => (
              <motion.div
                key={order.id}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                transition={APPLE_SPRING_DEFAULT}
                onClick={() => {
                  triggerHaptic("selection");
                  if (actionName === "review") {
                    navigate(`/leave-review?productId=${order.items[0]?.productId || order.items[0]?.id}`);
                  } else if (actionName === "pay") {
                    const cartItems = order.items.map(item => ({
                      ...item,
                      id: item.productId || item.id,
                      price: item.price !== undefined ? Number(item.price) : Number((item as any).priceAtPurchase || 0)
                    }));
                    localStorage.setItem("f_cart", JSON.stringify(cartItems));
                    navigate("/checkout");
                  } else {
                    navigate(`/track-order/${order.id}`);
                  }
                }}
                className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[22px] border border-black/[0.06] dark:border-white/[0.08] shadow-xs hover:border-black/[0.12] dark:hover:border-white/[0.16] transition-colors cursor-pointer block group"
              >
                <div className="flex justify-between items-center mb-3.5 pb-3 border-b border-black/[0.05] dark:border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono tabular-nums font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] bg-[#F5F5F7] dark:bg-[#2C2C2E] px-2.5 py-1 rounded-lg">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="text-[11px] tabular-nums text-[#6E6E73] dark:text-[#98989D]">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-15 h-15 rounded-[14px] overflow-hidden bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-center p-1.5 shrink-0">
                    {order.items[0]?.image?.trim() ? (
                      <img
                        src={order.items[0].image.trim()}
                        className="w-full h-full object-contain"
                        alt=""
                      />
                    ) : (
                      <PackageOpen className="w-6 h-6 text-[#6E6E73] dark:text-[#98989D]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] line-clamp-1 mb-0.5">
                      {order.items.length > 1 ? `${order.items[0]?.name} & ${order.items.length - 1} more` : order.items[0]?.name}
                    </p>
                    <p className="text-[12px] text-[#6E6E73] dark:text-[#98989D] tabular-nums">
                      Total: <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{formatPrice(order.total)}</span> &bull; {order.items.reduce((acc, item) => acc + item.quantity, 0)} Items
                    </p>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    {actionName === "review" && (
                      <span className="text-[12px] font-semibold bg-[#0071E3] dark:bg-[#0A84FF] text-white px-4 py-2 rounded-full whitespace-nowrap">
                        <Tr>Review</Tr>
                      </span>
                    )}
                    {actionName === "pay" && (
                      <span className="text-[12px] font-semibold bg-[#0071E3] dark:bg-[#0A84FF] text-white px-4 py-2 rounded-full whitespace-nowrap">
                        <Tr>Pay Now</Tr>
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderActionPage;
