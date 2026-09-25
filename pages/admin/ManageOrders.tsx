import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDocs,
} from "firebase/firestore";
import { Order, OrderStatus } from "../../types";
import { useNotify } from "../../components/Notifications";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "../../components/Icon";
import { OrderSkeleton } from "../../components/Skeletons";
import { Trash2, Plus, X, Search, Package, User as UserIcon, Phone, MapPin, Check } from "lucide-react";

const ManageOrders: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const notify = useNotify();

  // Create Order Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [initialStatus, setInitialStatus] = useState<OrderStatus>(OrderStatus.PENDING);
  const [shippingFee, setShippingFee] = useState(150);
  const [estimatedDelivery, setEstimatedDelivery] = useState("1 Month+ (approx 30 - 45 days)");
  const [orderItems, setOrderItems] = useState<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
  }[]>([]);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Order),
      );
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Fetch users and products when opening create modal
  useEffect(() => {
    if (!showCreateModal) return;
    const fetchHelpers = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const uList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAvailableUsers(uList);

        const prodsSnap = await getDocs(collection(db, "products"));
        const pList = prodsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAvailableProducts(pList);
      } catch (err) {
        console.error("Error loading users/products for order creation:", err);
      }
    };
    fetchHelpers();
  }, [showCreateModal]);

  const handleSelectUser = (u: any) => {
    setSelectedUserId(u.id);
    setCustomerName(u.displayName || u.shopName || u.name || "");
    setContactNumber(u.phoneNumber || u.phone || "");
    const addr = u.address || u.shippingAddress || (u.addresses && u.addresses[0]?.address) || "";
    setShippingAddress(typeof addr === "string" ? addr : `${addr.address || ""}, ${addr.city || ""}`);
  };

  const handleAddProductToOrder = (prod: any) => {
    const existing = orderItems.find(i => i.id === prod.id);
    if (existing) {
      setOrderItems(orderItems.map(i => i.id === prod.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setOrderItems([
        ...orderItems,
        {
          id: prod.id,
          name: prod.title || prod.name || "Product",
          price: prod.price || 0,
          quantity: 1,
          image: prod.images?.[0] || prod.imageUrl || prod.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200",
        }
      ]);
    }
  };

  const handleRemoveProductFromOrder = (prodId: string) => {
    setOrderItems(orderItems.filter(i => i.id !== prodId));
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + Number(shippingFee || 0);
  };

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !contactNumber.trim() || !shippingAddress.trim()) {
      notify("Please fill customer name, contact number and shipping address", "error");
      return;
    }
    if (orderItems.length === 0) {
      notify("Please add at least one product item to the order", "error");
      return;
    }

    setIsCreatingOrder(true);
    try {
      const orderPayload: any = {
        userId: selectedUserId || "guest_" + Date.now(),
        customerName: customerName.trim(),
        contactNumber: contactNumber.trim(),
        shippingAddress: shippingAddress.trim(),
        paymentMethod: paymentMethod,
        status: initialStatus,
        items: orderItems.map(i => ({
          id: i.id,
          name: i.name,
          price: i.price,
          priceAtPurchase: i.price,
          quantity: i.quantity,
          image: i.image
        })),
        subtotal: calculateSubtotal(),
        deliveryFee: Number(shippingFee || 0),
        total: calculateTotal(),
        estimatedDelivery: estimatedDelivery || "1 Month+ (approx 30 - 45 days)",
        deliveryNotice: "1 Month+ border cross imported product delivery time",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdByAdmin: true
      };

      const docRef = await addDoc(collection(db, "orders"), orderPayload);
      notify(`Order #${docRef.id.slice(0, 8)} created successfully!`, "success");
      
      // Reset form
      setShowCreateModal(false);
      setSelectedUserId("");
      setCustomerName("");
      setContactNumber("");
      setShippingAddress("");
      setOrderItems([]);
    } catch (err) {
      console.error("Error creating order:", err);
      notify("Failed to create order", "error");
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleDeleteOrder = async (orderId: string, orderCustomerName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete order #${orderId.slice(0, 8)} for ${orderCustomerName}? This will remove it from the user's My Orders.`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "orders", orderId));
      notify("Order deleted successfully from database", "success");
    } catch (err) {
      console.error("Error deleting order:", err);
      notify("Failed to delete order", "error");
    }
  };

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      let updateData: any = { status };
      if (status === OrderStatus.CANCELLED) {
        const reason = window.prompt("Reason for rejection:");
        if (reason === null) return;
        updateData.rejectReason = reason;
      }
      
      const order = orders.find((o) => o.id === orderId);
      await updateDoc(doc(db, "orders", orderId), updateData);
      notify(`Order status: ${status}`, "success");

      // Affiliate Commission Logic
      if (
        status === OrderStatus.DELIVERED &&
        order?.affiliateRef &&
        !order.commissionPaid
      ) {
        try {
          const {
            where,
            getDocs,
            limit,
            addDoc,
            doc: f_doc,
            updateDoc: f_updateDoc,
            increment,
            getDoc: f_getDoc,
          } = await import("firebase/firestore");
          // Get configs
          const reqConfigSnap = await f_getDoc(
            f_doc(db, "settings", "platform"),
          );
          const configs = reqConfigSnap.exists() ? reqConfigSnap.data() : {};

          const t1Limit = configs.affiliateTier1Threshold ?? 3;
          const t1Comm = configs.affiliateTier1Commission ?? 50;
          const t2Limit = configs.affiliateTier2Threshold ?? 10;
          const t2Comm = configs.affiliateTier2Commission ?? 100;
          const t3Limit = configs.affiliateTier3Threshold ?? 20;
          const t3Comm = configs.affiliateTier3Commission ?? 150;
          const t4Limit = configs.affiliateTier4Threshold ?? 30;
          const t4Comm = configs.affiliateTier4Commission ?? 200;

          // Find user with this affiliateCode
          const q = query(
            collection(db, "users"),
            where("affiliateCode", "==", order.affiliateRef),
            limit(1),
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            const affiliateDoc = snap.docs[0];
            const affiliateId = affiliateDoc.id;

            const logsQ = query(
              collection(db, "affiliates_log"),
              where("affiliateId", "==", affiliateId),
            );
            const logsSnap = await getDocs(logsQ);
            const salesCount = logsSnap.docs.length; // Approximate enough for now

            let currentCommission = t1Comm;
            if (salesCount >= t3Limit) currentCommission = t4Comm;
            else if (salesCount >= t2Limit) currentCommission = t3Comm;
            else if (salesCount >= t1Limit) currentCommission = t2Comm;

            // Add balance
            await f_updateDoc(f_doc(db, "users", affiliateId), {
              walletBalance: increment(currentCommission),
            });
            // Log
            await addDoc(collection(db, "affiliates_log"), {
              affiliateId,
              orderId: order.id,
              customerName: order.customerName,
              commission: currentCommission,
              createdAt: Date.now(),
            });
            // Mark order as paid
            await f_updateDoc(f_doc(db, "orders", order.id), {
              commissionPaid: true,
            });
          }
        } catch (e) {
          console.error("Affiliate sync failed:", e);
        }
      }
    } catch (e) {
      notify("Update failed", "error");
    }
  };

  const updateTrackingId = async (orderId: string, trackingId: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        trackingId: trackingId.trim(),
      });
      notify("Tracking ID synced", "success");
    } catch (e) {
      notify("Update failed", "error");
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-10 min-h-screen bg-zinc-50 dark:bg-zinc-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-1.5">
            Orders Overview
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
            Manual Logistics & User Order Management • Standard Delivery: 1 Month+
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-md transition active:scale-95 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Order</span>
        </button>
      </div>

      <div className="space-y-4 max-w-4xl mx-auto">
        {loading
          ? Array(5)
              .fill(0)
              .map((_, i) => <OrderSkeleton key={i} />)
          : orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm group hover:border-pink-300 dark:hover:border-pink-800 transition-colors overflow-hidden"
              >
                {/* Header / Clickable Area */}
                <div 
                  className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 p-4 cursor-pointer"
                  onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                >
                  <div className="flex items-start lg:items-center gap-4">
                    <div className="rounded-xl bg-pink-50 dark:bg-zinc-800 p-3 text-pink-600 dark:text-pink-400 shrink-0">
                      <Icon name="box" className="text-xl" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {order.customerName}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${order.status === OrderStatus.DELIVERED ? "bg-zinc-200 dark:bg-zinc-700/50 text-emerald-800 dark:text-emerald-300" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"}`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium flex gap-2 items-center flex-wrap mt-1">
                        <span>#{order.id.slice(0, 8)}</span>
                        <span>•</span>
                        <span>৳{order.total}</span>
                        <span>•</span>
                        <span>{order.contactNumber}</span>
                        <span>•</span>
                        <span>
                          {new Date(order.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric"
                          })}
                        </span>
                      </div>
                      
                      <div className="mt-2 text-xs text-zinc-400 italic line-clamp-1">
                         {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 pr-2" onClick={e => e.stopPropagation()}>
                    <div className="relative">
                      <select
                        className="appearance-none pl-3 pr-8 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold outline-none cursor-pointer rounded-lg transition-all"
                        value={order.status}
                        onChange={(e) =>
                          updateStatus(order.id, e.target.value as OrderStatus)
                        }
                      >
                        {Object.values(OrderStatus).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <Icon
                        name="chevron-down"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 pointer-events-none"
                      />
                    </div>

                    {/* Delete Order Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteOrder(order.id, order.customerName)}
                      className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/50 transition active:scale-95 cursor-pointer shadow-xs"
                      title="Permanently remove order from database and user's orders"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <Icon name={expandedOrderId === order.id ? "chevron-up" : "chevron-down"} className="text-zinc-400 ml-1" />
                  </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {expandedOrderId === order.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-zinc-100 dark:border-zinc-800"
                    >
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-950/50 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-xs font-bold text-zinc-500 uppercase mb-2">Shipping Information</h4>
                            <div className="text-sm bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                              <p><span className="font-medium text-zinc-400">Name:</span> {order.customerName}</p>
                              <p><span className="font-medium text-zinc-400">Phone:</span> {order.contactNumber}</p>
                              <p><span className="font-medium text-zinc-400">Address:</span> {typeof order.shippingAddress === 'string' ? order.shippingAddress : `${(order.shippingAddress as any).address}, ${(order.shippingAddress as any).city}, ${(order.shippingAddress as any).zone}`}</p>
                              {typeof order.shippingAddress !== 'string' && (order.shippingAddress as any).area && <p><span className="font-medium text-zinc-400">Area:</span> {(order.shippingAddress as any).area}</p>}
                              
                              <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                                <p><span className="font-bold text-zinc-500">Payment Method:</span> {order.paymentMethod || "COD"}</p>
                                {order.gatewayUsed && <p className="font-bold text-pink-600 dark:text-pink-400"><span className="font-medium text-zinc-400">Payment Gateway:</span> {order.gatewayUsed.toUpperCase()} (৳150 Delivery Fee Paid)</p>}
                                {order.transactionId && <p><span className="font-medium text-zinc-400">TrxID/Ref:</span> <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{order.transactionId}</span></p>}
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-zinc-500 uppercase mb-2">Order Items</h4>
                            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
                              {order.items.map((item: any, idx) => (
                                <div key={idx} className="p-3 flex items-center gap-3 text-sm">
                                  <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded bg-cover bg-center" style={{ backgroundImage: `url(${item.image})`}}></div>
                                  <div className="flex-1">
                                    <div className="font-semibold">{item.name}</div>
                                    <div className="text-xs text-zinc-500 tracking-wide">
                                      {item.quantity} x ৳{item.priceAtPurchase || item.price}
                                      {item.selectedVariants && Object.entries(item.selectedVariants).map(([k,v]) => (
                                        <span key={k} className="ml-2 px-1 border border-zinc-200 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800">{String(v)}</span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="font-bold">৳{item.quantity * (item.priceAtPurchase || item.price)}</div>
                                </div>
                              ))}
                              <div className="p-3 text-sm font-bold flex justify-between bg-zinc-50 dark:bg-zinc-900/50 rounded-b-xl">
                                <span>Total (inc. shipping, less discount)</span>
                                <span>৳{order.total}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Tracker Details */}
                        {order.status === OrderStatus.ON_THE_WAY && (
                          <div className="pt-2">
                            <h4 className="text-xs font-bold text-zinc-500 uppercase mb-2">Fulfillment Details</h4>
                            <div className="flex items-center gap-3 flex-wrap">
                              <input
                                type="text"
                                placeholder="Tracking ID"
                                className="bg-white dark:bg-zinc-900 text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 w-40 outline-none focus:border-pink-500"
                                defaultValue={order.trackingId || ""}
                                onBlur={(e) => updateTrackingId(order.id, e.target.value)}
                              />
                              <input
                                type="text"
                                placeholder="Courier Name"
                                className="bg-white dark:bg-zinc-900 text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 w-40 outline-none focus:border-pink-500"
                                defaultValue={order.courierName || ""}
                                onBlur={(e) => updateDoc(doc(db, "orders", order.id), { courierName: e.target.value.trim() })}
                              />
                              <input
                                type="text"
                                placeholder="Rider Number"
                                className="bg-white dark:bg-zinc-900 text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 w-40 outline-none focus:border-pink-500"
                                defaultValue={order.riderNumber || ""}
                                onBlur={(e) => updateDoc(doc(db, "orders", order.id), { riderNumber: e.target.value.trim() })}
                              />
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-zinc-400 mt-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                           <span>Order ID: {order.id}</span>
                           <span>User ID: {order.userId}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
        {!loading && orders.length === 0 && (
          <div className="py-32 text-center text-zinc-400 font-bold  tracking-normal text-[11px]">
            No log found in database
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col p-6 my-8 text-zinc-900 dark:text-zinc-100"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-150 dark:border-zinc-800">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Create Order for User</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Automatically populates details and links to user's My Orders</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateOrderSubmit} className="space-y-5 pt-4">
                {/* 1. Select User */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                    1. Select User Account (Auto-fill)
                  </label>
                  <div className="relative">
                    <select
                      className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-medium outline-none focus:border-pink-500"
                      value={selectedUserId}
                      onChange={(e) => {
                        const uid = e.target.value;
                        setSelectedUserId(uid);
                        const found = availableUsers.find(u => u.id === uid);
                        if (found) handleSelectUser(found);
                      }}
                    >
                      <option value="">-- Choose Existing User (or fill manual below) --</option>
                      {availableUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.displayName || u.shopName || "Unnamed User"} ({u.phoneNumber || u.email || u.id.slice(0, 8)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Customer Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Contact Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 01700000000"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Shipping Address *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Full shipping address (House, Road, City, Division)"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:border-pink-500"
                  />
                </div>

                {/* 3. Product Selection */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                    2. Add Products to Order
                  </label>
                  
                  {/* Product Picker Dropdown */}
                  <div className="flex gap-2">
                    <select
                      className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:border-pink-500"
                      onChange={(e) => {
                        const pid = e.target.value;
                        if (!pid) return;
                        const prod = availableProducts.find(p => p.id === pid);
                        if (prod) handleAddProductToOrder(prod);
                        e.target.value = "";
                      }}
                    >
                      <option value="">+ Pick a product from catalog to add...</option>
                      {availableProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.title || p.name} - ৳{p.price}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected Items List */}
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                    {orderItems.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 text-center text-xs text-zinc-400">
                        No products added yet. Select a product above.
                      </div>
                    ) : (
                      orderItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <img src={item.image} alt="" className="w-9 h-9 rounded-lg object-cover bg-zinc-200 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold truncate">{item.name}</p>
                              <p className="text-[11px] text-zinc-500">৳{item.price} each</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center border border-zinc-300 dark:border-zinc-600 rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.quantity > 1) {
                                    setOrderItems(orderItems.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i));
                                  } else {
                                    handleRemoveProductFromOrder(item.id);
                                  }
                                }}
                                className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 text-xs font-bold"
                              >
                                -
                              </button>
                              <span className="px-2.5 text-xs font-bold">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setOrderItems(orderItems.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
                                }}
                                className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 text-xs font-bold"
                              >
                                +
                              </button>
                            </div>
                            <span className="text-xs font-bold w-16 text-right">৳{item.price * item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveProductFromOrder(item.id)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 4. Payment, Status & Delivery Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-semibold outline-none"
                    >
                      <option value="COD">Cash on Delivery (COD)</option>
                      <option value="bKash">bKash (Paid)</option>
                      <option value="Nagad">Nagad (Paid)</option>
                      <option value="Rocket">Rocket (Paid)</option>
                      <option value="Card">Card (Paid)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Order Status
                    </label>
                    <select
                      value={initialStatus}
                      onChange={(e) => setInitialStatus(e.target.value as OrderStatus)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-semibold outline-none"
                    >
                      {Object.values(OrderStatus).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Delivery Fee (৳)
                    </label>
                    <input
                      type="number"
                      value={shippingFee}
                      onChange={(e) => setShippingFee(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-semibold outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Estimated Delivery Time
                  </label>
                  <input
                    type="text"
                    value={estimatedDelivery}
                    onChange={(e) => setEstimatedDelivery(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-medium outline-none"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">Standard: 1 Month+ for imported border-cross products</p>
                </div>

                {/* Calculation Summary */}
                <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs space-y-1.5">
                  <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                    <span>Items Subtotal:</span>
                    <span>৳{calculateSubtotal()}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                    <span>Delivery Fee:</span>
                    <span>৳{shippingFee}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-zinc-900 dark:text-white pt-1.5 border-t border-zinc-200 dark:border-zinc-700">
                    <span>Grand Total:</span>
                    <span className="text-pink-600 dark:text-pink-400">৳{calculateTotal()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingOrder}
                    className="px-6 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition cursor-pointer"
                  >
                    {isCreatingOrder ? "Creating Order..." : "Create & Place Order"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManageOrders;
