import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { Order, OrderStatus } from "../types";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "../lib/utils";
import { useNotify } from "../components/Notifications";
import { useIllustrations } from "../lib/useIllustrations";
import Icon from "../components/Icon";

const StatusIconSmall = ({ status }: { status: OrderStatus }) => {
  const base =
    "w-10 h-10 rounded-full flex items-center justify-center text-xs shadow-inner ";
  switch (status) {
    case OrderStatus.APPROVED:
      return (
        <div className={base + "bg-amber-50 text-amber-600"}>
          <Icon name="check" />
        </div>
      );
    case OrderStatus.CHECKING_PAYMENT:
      return (
        <div className={base + "bg-indigo-50 text-indigo-600"}>
          <Icon name="credit-card" />
        </div>
      );
    case OrderStatus.PROCESSING:
      return (
        <div className={base + "bg-blue-50 text-blue-600"}>
          <Icon name="sync-alt" className="animate-spin" />
        </div>
      );
    case OrderStatus.COMPLETE_PACKAGING:
      return (
        <div className={base + "bg-pink-50 text-pink-600"}>
          <Icon name="box" />
        </div>
      );
    case OrderStatus.DELIVER_ON_COURIER:
    case OrderStatus.SHIPPED_IN_COURIER:
      return (
        <div className={base + "bg-orange-50 text-orange-600"}>
          <Icon name="truck-moving" />
        </div>
      );
    case OrderStatus.RETURNED:
      return (
        <div className={base + "bg-red-50 text-red-600"}>
          <Icon name="times-circle" />
        </div>
      );
    case OrderStatus.ON_THE_WAY:
      return (
        <div className={base + "bg-purple-50 text-purple-600"}>
          <Icon name="motorcycle" />
        </div>
      );
    case OrderStatus.DELIVERED:
      return (
        <div className={base + "bg-green-50 text-green-600"}>
          <Icon name="box-check" />
        </div>
      );
    case OrderStatus.CANCELLED:
      return (
        <div className={base + "bg-red-50 text-red-600"}>
          <Icon name="times" />
        </div>
      );
    default:
      return (
        <div className={base + "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}>
          <Icon name="box" />
        </div>
      );
  }
};

const MyOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customPayments, setCustomPayments] = useState<any[]>([]);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [activeTab, setActiveTab] = useState<"Pending" | "Active" | "Cancelled" | "Custom/Exchange">("Pending");
  const navigate = useNavigate();
  const illustrations = useIllustrations();
  const notify = useNotify();

  useEffect(() => {
    let unsubscribeOrders: (() => void) | null = null;
    let unsubscribePay: (() => void) | null = null;
    let unsubscribeExchanges: (() => void) | null = null;

    // Redirect if not logged in, or link order if logged in
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      const searchParams = new URLSearchParams(window.location.search);
      const pendingOrderId = searchParams.get("guestOrder") || localStorage.getItem("pending_guest_order_id");

      if (!user) {
        navigate(`/auth-selector?redirect=/my-orders${pendingOrderId ? `&guestOrder=${pendingOrderId}` : ""}`);
        return;
      }

      // If user has a pending order, auto-link to their account
      if (pendingOrderId && user.uid) {
        try {
          const ordRef = doc(db, "orders", pendingOrderId);
          await updateDoc(ordRef, {
            userId: user.uid,
            customerEmail: user.email || ""
          });
          localStorage.removeItem("pending_guest_order_id");
          localStorage.removeItem("pending_guest_order_phone");
          notify("আপনার অর্ডারটি অ্যাকাউন্টে যুক্ত করা হয়েছে!", "success");
        } catch (err) {
          console.error("Order linking error:", err);
        }
      }

      // Fetch user's orders
      const uid = user.uid;
      const q = query(collection(db, "orders"), where("userId", "==", uid));
      unsubscribeOrders = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Order,
        );
        data.sort((a, b) => b.createdAt - a.createdAt);
        setOrders(data);
        setLoading(false);
      });

      // Subscriptions for Custom Payments & Exchanges
      const payQ = query(collection(db, "custom_payments"), where("userId", "==", uid));
      unsubscribePay = onSnapshot(payQ, (snapshot) => {
        const payList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        payList.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
        setCustomPayments(payList);
      });

      const exQ = query(collection(db, "exchanges"), where("userId", "==", uid));
      unsubscribeExchanges = onSnapshot(exQ, (snapshot) => {
        const exList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        exList.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
        setExchanges(exList);
      });
    });

    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => {
      unsubscribeAuth();
      if (unsubscribeOrders) unsubscribeOrders();
      if (unsubscribePay) unsubscribePay();
      if (unsubscribeExchanges) unsubscribeExchanges();
      clearInterval(timer);
    };
  }, [navigate, notify]);

  const handleCancelOrder = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: OrderStatus.CANCELLED,
      });
      notify("Order has been cancelled.", "info");
    } catch (err) {
      notify("Failed to cancel order.", "error");
    }
  };

  const isCancelable = (order: Order) => {
    if (order.status !== OrderStatus.PENDING) return false;
    const minutesPassed = (currentTime - order.createdAt) / (1000 * 60);
    return minutesPassed <= 5;
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === "Pending") {
      return order.status === OrderStatus.PENDING;
    }
    if (activeTab === "Active") {
      return order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.PENDING;
    }
    if (activeTab === "Cancelled") {
      return order.status === OrderStatus.CANCELLED;
    }
    return true; // All orders
  });

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 pb-[120px] md:pb-12 animate-fade-in min-h-screen bg-zinc-50 dark:bg-zinc-800">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="w-10"></div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">My Order</h1>
        <div className="w-10"></div>
      </div>

      <div className="flex bg-white dark:bg-zinc-900 rounded-[24px] p-1.5 mb-8 border border-zinc-100 dark:border-zinc-800 shadow-sm gap-1 overflow-x-auto no-scrollbar">
        {["Pending", "Active", "Cancelled", "Custom/Exchange"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`grow shrink-0 min-w-[80px] whitespace-nowrap text-center py-2 px-3 sm:px-4 rounded-full text-xs sm:text-sm font-bold transition-all ${
              activeTab === tab
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 bg-transparent"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Custom/Exchange" ? (
        <div className="space-y-8 animate-fade-in">
          {/* Custom Payments Section */}
          <div className="space-y-4">
            <h2 className="text-[14px] font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider pl-1 flex items-center gap-2">
              <Icon name="wallet" className="w-4 h-4 text-[#EF8020]" />
              Custom Payments
            </h2>
            {customPayments.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-8 rounded-[24px] text-center text-zinc-400 text-xs font-semibold">
                No custom payments found.
              </div>
            ) : (
              <div className="space-y-3">
                {customPayments.map((p) => (
                  <div key={p.id} className="bg-white dark:bg-zinc-900 p-5 rounded-[24px] border border-zinc-100 dark:border-zinc-800/80 shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ""}
                      </span>
                      {p.status === "pending" ? (
                        <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-bold border border-amber-500/10 uppercase tracking-wider">
                          Pending Approval
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold border border-emerald-500/10 uppercase tracking-wider">
                          Verified & Approved
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-end border-b border-zinc-50 dark:border-zinc-800/50 pb-3">
                      <div>
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block">Sender Number</span>
                        <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 font-mono">{p.senderNumber}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block">Amount Paid</span>
                        <span className="text-sm font-black text-zinc-900 dark:text-white">{formatPrice(p.amount)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Transaction ID (TrxID)</span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">{p.trxId}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Exchanges Section */}
          <div className="space-y-4">
            <h2 className="text-[14px] font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider pl-1 flex items-center gap-2">
              <Icon name="sync-alt" className="w-4 h-4 text-[#EF8020]" />
              Exchange Requests
            </h2>
            {exchanges.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 p-8 rounded-[24px] text-center text-zinc-400 text-xs font-semibold">
                No exchange requests found.
              </div>
            ) : (
              <div className="space-y-4">
                {exchanges.map((ex) => (
                  <div key={ex.id} className="bg-white dark:bg-zinc-900 p-5 rounded-[24px] border border-zinc-100 dark:border-zinc-800/80 shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {ex.createdAt ? new Date(ex.createdAt).toLocaleDateString() : ""}
                      </span>
                      <span className="px-2.5 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-full text-[10px] font-black border border-orange-500/10 uppercase tracking-wider">
                        {ex.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-[#F5F5F7] dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/85">
                      <div>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Your Device</span>
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 block">{ex.phoneName}</span>
                        <span className="text-[10px] text-zinc-500 font-medium mt-1 inline-block bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded-md">
                          {ex.condition} | {ex.storage}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Desired Device</span>
                        <span className="text-xs font-black text-orange-500 mt-0.5 block">{ex.targetPhone}</span>
                        {ex.customPaymentAmount > 0 && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 inline-block">
                            Paid Amount: {formatPrice(ex.customPaymentAmount)}
                          </span>
                        )}
                      </div>
                    </div>

                    {(ex.status === "cancelled" && ex.cancelReason) && (
                      <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 p-3 rounded-xl">
                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider block">Reason for Rejection</span>
                        <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 mt-0.5">{ex.cancelReason}</p>
                      </div>
                    )}
                    {(ex.status === "returned" && ex.returnReason) && (
                      <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 p-3 rounded-xl">
                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider block">Reason for Return</span>
                        <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 mt-0.5">{ex.returnReason}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        loading ? (
          <div className="space-y-4">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="bg-zinc-50 dark:bg-zinc-800 p-4 pr-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-between mb-4"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-zinc-200/50 dark:bg-zinc-700/50 rounded-full animate-pulse"></div>
                    <div>
                      <div className="h-2 w-16 bg-zinc-200/50 dark:bg-zinc-700/50 rounded mb-1.5 animate-pulse"></div>
                      <div className="h-4 w-24 bg-zinc-200/50 dark:bg-zinc-700/50 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div className="h-4 w-12 bg-zinc-200/50 dark:bg-zinc-700/50 rounded animate-pulse"></div>
                </div>
              ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-40 flex flex-col items-center">
            {illustrations.emptyOrders ? (
              <div className="w-48 h-48 mx-auto mb-6 rounded-[20px] overflow-hidden">
                 <img src={illustrations.emptyOrders} alt="No Orders" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800 rounded-full border border-zinc-100 dark:border-zinc-800 flex items-center justify-center mb-6">
                <Icon name="shopping-bag" className="text-lg text-zinc-300" />
              </div>
            )}
            <p className="text-[11px] font-bold text-zinc-400  tracking-normal mb-8">
              No order history found
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-8 py-3.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-[10px] font-bold  tracking-normal shadow-md hover:bg-zinc-800 transition-all"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              return (
                <motion.div
                  whileTap={{ scale: 0.99 }}
                  key={order.id}
                  className="bg-white dark:bg-zinc-900 p-5 rounded-[24px] border border-zinc-100 dark:border-zinc-800 shadow-sm cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-6" onClick={() => navigate(`/track-order/${order.id}`)}>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-800 overflow-hidden shrink-0 border border-zinc-100 dark:border-zinc-800 p-2">
                         <img src={order.items[0]?.image} alt="" className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg mb-0.5 tracking-tight line-clamp-1">{order.items[0]?.name || "Item"}</h4>
                        <p className="text-zinc-500 font-medium text-xs">
                          {formatPrice(order.total)} <span className="mx-1 text-zinc-300">|</span> {order.items.reduce((acc, item) => acc + item.quantity, 0)} Items
                        </p>
                        {order.advanceAmount > 0 && (
                          <p className="text-[10px] font-bold text-blue-600 mt-1">Advance: {formatPrice(order.advanceAmount)} | Due: {formatPrice(Math.max(0, order.total - order.advanceAmount))}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-zinc-400">#{order.id.slice(0, 6).toUpperCase()}</span>
                  </div>

                  <div className="flex justify-end items-end mb-6" onClick={() => navigate(`/track-order/${order.id}`)}>
                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-zinc-400 block mb-1">Status</span>
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{order.status}</span>
                      {order.status === OrderStatus.CANCELLED && (order as any).rejectReason && (
                        <p className="text-[10px] font-bold text-rose-500 mt-1 max-w-[200px] text-right truncate" title={(order as any).rejectReason}>Reason: {(order as any).rejectReason}</p>
                      )}
                    </div>
                  </div>

                  {order.status === OrderStatus.SHIPPED_IN_COURIER ? (
                    <div className="flex flex-col gap-3">
                      {order.courierName && order.riderNumber && order.courierPaymentStatus === 'completed' ? (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 bg-white dark:bg-emerald-950 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/50 shadow-sm text-center">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 block mb-1">Courier Name</span>
                              <span className="text-sm font-black text-emerald-900 dark:text-emerald-100">{order.courierName}</span>
                            </div>
                            <div className="flex-1 bg-white dark:bg-emerald-950 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/50 shadow-sm text-center">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 block mb-1">Rider Number</span>
                              <span className="text-sm font-black text-emerald-900 dark:text-emerald-100">{order.riderNumber}</span>
                            </div>
                          </div>
                          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 text-center mt-1">
                            Please pay the remaining amount of ৳{Math.max(0, order.total - (order.paymentOption === "Full Payment" ? order.total : (order.advanceAmount !== undefined && order.advanceAmount !== null ? order.advanceAmount : 150)) - (order.courierPaymentDetails?.amount || Math.round(Math.max(0, order.total - (order.paymentOption === "Full Payment" ? order.total : (order.advanceAmount !== undefined && order.advanceAmount !== null ? order.advanceAmount : 150))) * 0.20)))} Tk to the courier.
                          </p>
                        </div>
                      ) : order.courierPaymentStatus === 'checking' ? (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center justify-center gap-2">
                          <Icon name="clock" className="w-5 h-5 text-amber-500" />
                          <span className="text-sm font-bold text-amber-800 dark:text-amber-300">Payment Checking</span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 w-full bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                          <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300 text-center">
                            Due থেকে ২০% পে করে কুরিয়ারের নাম এবং ডেলিভারি ম্যানের নাম্বার নিন।
                          </p>
                          <div className="flex gap-2 w-full">
                            <button 
                              onClick={(e) => { e.stopPropagation(); navigate(`/payment/${order.id}`) }}
                              className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 transition-colors shadow-md rounded-xl font-bold text-[11px] px-2 text-center leading-tight"
                            >
                              <Icon name="lock" className="w-4 h-4 mb-0.5" />
                              কুরিয়ার নাম দেখুন
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); navigate(`/payment/${order.id}`) }}
                              className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 transition-colors shadow-md rounded-xl font-bold text-[11px] px-2 text-center leading-tight"
                            >
                              <Icon name="lock" className="w-4 h-4 mb-0.5" />
                              ডেলিভারি ম্যানের নাম্বার দেখুন
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/e-receipt/${order.id}`) }}
                          className="flex-1 py-3 bg-transparent border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors rounded-full font-bold text-zinc-900 dark:text-zinc-100 text-sm"
                        >
                          Invoice
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/track-order/${order.id}`) }}
                          className="flex-[1.5] py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-md rounded-full font-bold text-sm"
                        >
                          Track Order
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/e-receipt/${order.id}`) }}
                        className="flex-1 py-3.5 bg-transparent border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors rounded-full font-bold text-zinc-900 dark:text-zinc-100 text-sm"
                      >
                        Invoice
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/track-order/${order.id}`) }}
                        className="flex-[1.5] py-3.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-md rounded-full font-bold text-sm"
                      >
                        Track Order
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

export default MyOrders;
