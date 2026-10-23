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
import { Trash2, Plus, X, Search, Package, User as UserIcon, Phone, MapPin, Check, Edit3, DollarSign, Layers, AlertCircle } from "lucide-react";

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
  const [advancePaid, setAdvancePaid] = useState<number | "">("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("1 Month+ (approx 30 - 45 days)");
  const [orderItems, setOrderItems] = useState<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
  }[]>([]);
  const [showCustomProductForm, setShowCustomProductForm] = useState(false);
  const [customProdName, setCustomProdName] = useState("");
  const [customProdPrice, setCustomProdPrice] = useState<number | "">("");
  const [customProdQty, setCustomProdQty] = useState(1);
  const [customProdImage, setCustomProdImage] = useState("");
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // Edit Order Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editContactNumber, setEditContactNumber] = useState("");
  const [editAltNumber, setEditAltNumber] = useState("");
  const [editShippingAddress, setEditShippingAddress] = useState("");
  const [editStatus, setEditStatus] = useState<OrderStatus>(OrderStatus.PENDING);
  const [editPaymentMethod, setEditPaymentMethod] = useState("COD");
  const [editShippingFee, setEditShippingFee] = useState(150);
  const [editAdvanceAmount, setEditAdvanceAmount] = useState<number | "">("");
  const [editTrackingId, setEditTrackingId] = useState("");
  const [editCourierName, setEditCourierName] = useState("");
  const [editRiderNumber, setEditRiderNumber] = useState("");
  const [editItems, setEditItems] = useState<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
  }[]>([]);
  const [editShowCustomProduct, setEditShowCustomProduct] = useState(false);
  const [editCustomProdName, setEditCustomProdName] = useState("");
  const [editCustomProdPrice, setEditCustomProdPrice] = useState<number | "">("");
  const [editCustomProdQty, setEditCustomProdQty] = useState(1);
  const [editCustomProdImage, setEditCustomProdImage] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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

  const handleAddCustomProduct = () => {
    if (!customProdName.trim()) {
      notify("Please enter a custom product name", "error");
      return;
    }
    const priceNum = Number(customProdPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      notify("Please enter a valid price for the custom product", "error");
      return;
    }
    const newItem = {
      id: "custom_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      name: customProdName.trim(),
      price: priceNum,
      quantity: Math.max(1, Number(customProdQty) || 1),
      image: customProdImage.trim() || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200",
    };
    setOrderItems([...orderItems, newItem]);
    setCustomProdName("");
    setCustomProdPrice("");
    setCustomProdQty(1);
    setCustomProdImage("");
    setShowCustomProductForm(false);
    notify(`Added custom product: "${newItem.name}"`, "success");
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + Number(shippingFee || 0);
  };

  const calculateDue = () => {
    const total = calculateTotal();
    const adv = Number(advancePaid) || 0;
    return Math.max(0, total - adv);
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
      const grandTotal = calculateTotal();
      const advAmount = Number(advancePaid) || 0;
      const due = Math.max(0, grandTotal - advAmount);

      const orderPayload: any = {
        userId: selectedUserId || "guest_" + Date.now(),
        customerName: customerName.trim(),
        contactNumber: contactNumber.trim(),
        shippingAddress: shippingAddress.trim(),
        paymentMethod: paymentMethod,
        paymentOption: advAmount > 0 ? (advAmount >= grandTotal ? "Full Payment" : "Custom Advance") : "Cash on Delivery",
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
        total: grandTotal,
        advanceAmount: advAmount,
        dueAmount: due,
        estimatedDelivery: estimatedDelivery || "1 Month+ (approx 30 - 45 days)",
        deliveryNotice: "1 Month+ border cross imported product delivery time",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdByAdmin: true
      };

      const docRef = await addDoc(collection(db, "orders"), orderPayload);
      notify(`Order #${docRef.id.slice(0, 8)} created successfully! Total: ৳${grandTotal}, Due: ৳${due}`, "success");
      
      // Reset form
      setShowCreateModal(false);
      setSelectedUserId("");
      setCustomerName("");
      setContactNumber("");
      setShippingAddress("");
      setAdvancePaid("");
      setOrderItems([]);
    } catch (err) {
      console.error("Error creating order:", err);
      notify("Failed to create order", "error");
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // --- EDIT ORDER LOGIC ---
  const handleOpenEditModal = (order: Order) => {
    setEditingOrder(order);
    setEditCustomerName(order.customerName || "");
    setEditContactNumber(order.contactNumber || "");
    setEditAltNumber(order.altNumber || "");
    setEditShippingAddress(
      typeof order.shippingAddress === "string"
        ? order.shippingAddress
        : `${(order.shippingAddress as any)?.address || ""}, ${(order.shippingAddress as any)?.upazila || ""}, ${(order.shippingAddress as any)?.city || (order.shippingAddress as any)?.district || ""}`
    );
    setEditStatus((order.status as OrderStatus) || OrderStatus.PENDING);
    setEditPaymentMethod(order.paymentMethod || "COD");
    setEditShippingFee(Number(order.deliveryFee ?? 150));
    setEditAdvanceAmount(Number(order.advanceAmount ?? (order as any).advancePaid ?? 0));
    setEditTrackingId(order.trackingId || "");
    setEditCourierName(order.courierName || "");
    setEditRiderNumber(order.riderNumber || "");
    setEditItems(
      (order.items || []).map((i) => ({
        id: i.id || "item_" + Math.random().toString(36).substring(2, 7),
        name: i.name,
        price: i.priceAtPurchase || i.price || 0,
        quantity: i.quantity || 1,
        image: i.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200",
      }))
    );
    setEditShowCustomProduct(false);
    setShowEditModal(true);
  };

  const handleEditAddCustomProduct = () => {
    if (!editCustomProdName.trim()) {
      notify("Enter product name", "error");
      return;
    }
    const price = Number(editCustomProdPrice);
    if (isNaN(price) || price <= 0) {
      notify("Enter valid price", "error");
      return;
    }
    const newItem = {
      id: "custom_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      name: editCustomProdName.trim(),
      price: price,
      quantity: Math.max(1, Number(editCustomProdQty) || 1),
      image: editCustomProdImage.trim() || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200",
    };
    setEditItems([...editItems, newItem]);
    setEditCustomProdName("");
    setEditCustomProdPrice("");
    setEditCustomProdQty(1);
    setEditCustomProdImage("");
    setEditShowCustomProduct(false);
    notify(`Added "${newItem.name}" to order items`, "success");
  };

  const calculateEditSubtotal = () => {
    return editItems.reduce((acc, i) => acc + (Number(i.price) * Number(i.quantity)), 0);
  };

  const calculateEditTotal = () => {
    return calculateEditSubtotal() + Number(editShippingFee || 0);
  };

  const calculateEditDue = () => {
    return Math.max(0, calculateEditTotal() - Number(editAdvanceAmount || 0));
  };

  const handleSaveEditOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    if (!editCustomerName.trim() || !editContactNumber.trim()) {
      notify("Customer name and contact number are required", "error");
      return;
    }
    if (editItems.length === 0) {
      notify("Order must contain at least one product item", "error");
      return;
    }

    setIsSavingEdit(true);
    try {
      const newTotal = calculateEditTotal();
      const advance = Number(editAdvanceAmount || 0);
      const due = Math.max(0, newTotal - advance);

      const updatePayload: any = {
        customerName: editCustomerName.trim(),
        contactNumber: editContactNumber.trim(),
        altNumber: editAltNumber.trim() || null,
        shippingAddress: editShippingAddress.trim(),
        status: editStatus,
        paymentMethod: editPaymentMethod,
        paymentOption: advance > 0 ? (advance >= newTotal ? "Full Payment" : "Custom Advance") : "Cash on Delivery",
        deliveryFee: Number(editShippingFee || 0),
        subtotal: calculateEditSubtotal(),
        total: newTotal,
        advanceAmount: advance,
        dueAmount: due,
        trackingId: editTrackingId.trim() || null,
        courierName: editCourierName.trim() || null,
        riderNumber: editRiderNumber.trim() || null,
        items: editItems.map((i) => ({
          id: i.id,
          name: i.name,
          price: Number(i.price),
          priceAtPurchase: Number(i.price),
          quantity: Number(i.quantity),
          image: i.image,
        })),
        updatedAt: Date.now(),
      };

      await updateDoc(doc(db, "orders", editingOrder.id), updatePayload);
      notify(`Order #${editingOrder.id.slice(0, 8)} updated successfully! Total: ৳${newTotal}, Due: ৳${due}`, "success");
      setShowEditModal(false);
      setEditingOrder(null);
    } catch (err) {
      console.error("Error updating order:", err);
      notify("Failed to update order", "error");
    } finally {
      setIsSavingEdit(false);
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

                    {/* Edit Order Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(order);
                      }}
                      className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-900/50 transition active:scale-95 cursor-pointer shadow-xs"
                      title="Edit Order Details & Items"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

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
                            <h4 className="text-xs font-bold text-zinc-500 uppercase mb-2">Customer & Shipping Information</h4>
                            <div className="text-sm bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                                <div>
                                  <span className="text-[11px] font-medium text-zinc-400 block">Customer Name:</span>
                                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{order.customerName || "N/A"}</span>
                                </div>
                                <div>
                                  <span className="text-[11px] font-medium text-zinc-400 block">Primary Contact:</span>
                                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{order.contactNumber || "N/A"}</span>
                                </div>
                                {order.altNumber && (
                                  <div>
                                    <span className="text-[11px] font-medium text-zinc-400 block">Alternative Phone:</span>
                                    <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">{order.altNumber}</span>
                                  </div>
                                )}
                                {order.productClassification && (
                                  <div>
                                    <span className="text-[11px] font-medium text-zinc-400 block">Classification:</span>
                                    <span className="inline-block text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                      {order.productClassification}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div>
                                <span className="text-[11px] font-medium text-zinc-400 block">Full Delivery Address:</span>
                                <p className="font-medium text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-lg text-xs leading-relaxed mt-0.5 border border-zinc-100 dark:border-zinc-800">
                                  {typeof order.shippingAddress === 'string' ? order.shippingAddress : `${(order.shippingAddress as any).address || ''}, ${(order.shippingAddress as any).upazila || ''}, ${(order.shippingAddress as any).district || (order.shippingAddress as any).city || ''}, ${(order.shippingAddress as any).division || ''}`}
                                </p>
                              </div>

                              {/* Bypass Verification details if any */}
                              {(order.guardianNumber || order.nidCardUrl) && (
                                <div className="p-2.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-lg border border-amber-200/60 dark:border-amber-900/40 text-xs space-y-1">
                                  <span className="font-bold text-amber-800 dark:text-amber-300 block">⚠️ Bypass Verification Data:</span>
                                  {order.guardianNumber && (
                                    <p><span className="text-zinc-500">Guardian Phone:</span> <span className="font-mono font-bold text-amber-900 dark:text-amber-200">{order.guardianNumber}</span></p>
                                  )}
                                  {order.nidCardUrl && (
                                    <p>
                                      <span className="text-zinc-500">NID Document:</span>{" "}
                                      <a href={order.nidCardUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">
                                        View Uploaded NID ↗
                                      </a>
                                    </p>
                                  )}
                                </div>
                              )}

                              {order.isGift && order.giftNote && (
                                <div className="p-2 bg-pink-50 dark:bg-pink-950/30 rounded-lg border border-pink-200 dark:border-pink-900 text-xs">
                                  <span className="font-bold text-pink-700 dark:text-pink-300">🎁 Gift Order Note:</span> {order.giftNote}
                                </div>
                              )}
                              
                              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="text-zinc-400">Payment Option:</span>
                                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{order.paymentOption || order.paymentMethod || "COD"}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-zinc-400">Advance Paid:</span>
                                  <span className="font-black text-emerald-600 dark:text-emerald-400">৳{order.advanceAmount || order.advancePaid || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-zinc-400">Due On Delivery (COD):</span>
                                  <span className="font-black text-rose-600 dark:text-rose-400">৳{order.dueAmount ?? Math.max(0, (order.total || 0) - (order.advanceAmount || 0))}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-zinc-400">Sender Number:</span>
                                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{order.accountNameSender || order.senderNumber || order.contactNumber || "N/A"}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-zinc-400">Store Receiver:</span>
                                  <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{order.receiverNumber || "Store Fallback Number"}</span>
                                </div>
                                {(order.transactionId || order.trxId) && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-zinc-400">TrxID / Reference:</span>
                                    <span className="font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">{order.transactionId || order.trxId}</span>
                                  </div>
                                )}
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
                {/* 2. Add Products to Order */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                      2. Add Products to Order
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCustomProductForm(!showCustomProductForm)}
                      className="text-xs font-bold text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {showCustomProductForm ? "Hide Custom Product Form" : "+ Add Custom Product"}
                    </button>
                  </div>
                  
                  {/* Product Picker Dropdown */}
                  <div className="flex gap-2">
                    <select
                      className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:border-pink-500 font-medium"
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

                  {/* Custom Product Creator Box */}
                  <AnimatePresence>
                    {showCustomProductForm && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 p-3.5 rounded-2xl bg-pink-50/60 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-900/40 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-pink-700 dark:text-pink-300 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5" /> Custom Product Details
                          </span>
                          <span className="text-[10px] text-zinc-500">Add any unlisted or custom phone/gadget</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-0.5">Product Name *</label>
                            <input
                              type="text"
                              placeholder="e.g. iPhone 15 Pro Max (Custom Import)"
                              value={customProdName}
                              onChange={(e) => setCustomProdName(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-0.5">Unit Price (৳) *</label>
                            <input
                              type="number"
                              placeholder="৳ Price"
                              value={customProdPrice}
                              onChange={(e) => setCustomProdPrice(e.target.value ? Number(e.target.value) : "")}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 outline-none"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-0.5">Quantity</label>
                            <input
                              type="number"
                              min={1}
                              value={customProdQty}
                              onChange={(e) => setCustomProdQty(Math.max(1, Number(e.target.value) || 1))}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-0.5">Image URL (Optional)</label>
                            <input
                              type="text"
                              placeholder="https://..."
                              value={customProdImage}
                              onChange={(e) => setCustomProdImage(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 outline-none"
                            />
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={handleAddCustomProduct}
                              className="w-full py-1.5 px-3 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-xs transition"
                            >
                              + Add Item
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Selected Items List */}
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                    {orderItems.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 text-center text-xs text-zinc-400">
                        No products added yet. Select from catalog or add a custom product above.
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

                {/* 4. Payment, Advance Paid, Status & Delivery Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                      <option value="bKash">bKash (Paid / Partial)</option>
                      <option value="Nagad">Nagad (Paid / Partial)</option>
                      <option value="Rocket">Rocket (Paid / Partial)</option>
                      <option value="Card">Card (Paid / Partial)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Advance Paid Amount (৳)
                    </label>
                    <input
                      type="number"
                      placeholder="0 (if user paid earlier)"
                      value={advancePaid}
                      onChange={(e) => setAdvancePaid(e.target.value ? Number(e.target.value) : "")}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-semibold outline-none text-emerald-600 dark:text-emerald-400"
                    />
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

                {/* Calculation Summary with Advance & Due */}
                <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs space-y-1.5">
                  <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                    <span>Items Subtotal:</span>
                    <span>৳{calculateSubtotal()}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                    <span>Delivery Fee:</span>
                    <span>৳{shippingFee}</span>
                  </div>
                  <div className="flex justify-between text-zinc-900 dark:text-white font-bold pt-1 border-t border-zinc-200 dark:border-zinc-700">
                    <span>Grand Total:</span>
                    <span>৳{calculateTotal()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>Advance / Already Paid:</span>
                    <span>- ৳{Number(advancePaid) || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-rose-600 dark:text-rose-400 pt-1.5 border-t border-zinc-200 dark:border-zinc-700">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Remaining Due (To Collect on Delivery):
                    </span>
                    <span>৳{calculateDue()}</span>
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

      {/* Edit Order Modal */}
      <AnimatePresence>
        {showEditModal && editingOrder && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col p-6 my-8 text-zinc-900 dark:text-zinc-100"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-150 dark:border-zinc-800">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-blue-500" />
                    Edit Order #{editingOrder.id.slice(0, 8)}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Modify customer details, items, advance payment, due balance, and fulfillment
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditOrderSubmit} className="space-y-5 pt-4">
                {/* 1. Customer & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Primary Contact *
                    </label>
                    <input
                      type="text"
                      required
                      value={editContactNumber}
                      onChange={(e) => setEditContactNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Alternative Phone
                    </label>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={editAltNumber}
                      onChange={(e) => setEditAltNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                {/* 2. Shipping Address */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Shipping Address *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={editShippingAddress}
                    onChange={(e) => setEditShippingAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                {/* 3. Items Editor */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                      Order Items & Products ({editItems.length})
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditShowCustomProduct(!editShowCustomProduct)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {editShowCustomProduct ? "Close Custom Form" : "+ Add Custom Item"}
                    </button>
                  </div>

                  {/* Add catalog product dropdown */}
                  <div className="flex gap-2 mb-2">
                    <select
                      className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs outline-none focus:border-blue-500"
                      onChange={(e) => {
                        const pid = e.target.value;
                        if (!pid) return;
                        const prod = availableProducts.find(p => p.id === pid);
                        if (prod) {
                          setEditItems([
                            ...editItems,
                            {
                              id: prod.id,
                              name: prod.title || prod.name || "Product",
                              price: prod.price || 0,
                              quantity: 1,
                              image: prod.images?.[0] || prod.imageUrl || prod.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200",
                            }
                          ]);
                          notify(`Added "${prod.title || prod.name}"`, "success");
                        }
                        e.target.value = "";
                      }}
                    >
                      <option value="">+ Add a product from catalog...</option>
                      {availableProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.title || p.name} - ৳{p.price}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Product Add in Edit Modal */}
                  <AnimatePresence>
                    {editShowCustomProduct && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-3 p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-2.5"
                      >
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300 block">
                          Add Custom Product to this Order
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="Product Title"
                            value={editCustomProdName}
                            onChange={(e) => setEditCustomProdName(e.target.value)}
                            className="sm:col-span-2 px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 outline-none"
                          />
                          <input
                            type="number"
                            placeholder="Price (৳)"
                            value={editCustomProdPrice}
                            onChange={(e) => setEditCustomProdPrice(e.target.value ? Number(e.target.value) : "")}
                            className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 outline-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min={1}
                            placeholder="Qty"
                            value={editCustomProdQty}
                            onChange={(e) => setEditCustomProdQty(Math.max(1, Number(e.target.value) || 1))}
                            className="w-20 px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Optional Image URL"
                            value={editCustomProdImage}
                            onChange={(e) => setEditCustomProdImage(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleEditAddCustomProduct}
                            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
                          >
                            Add
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Edit Items List */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {editItems.map((item, idx) => (
                      <div key={item.id + "_" + idx} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <img src={item.image} alt="" className="w-9 h-9 rounded-lg object-cover bg-zinc-200 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                const newItems = [...editItems];
                                newItems[idx].name = e.target.value;
                                setEditItems(newItems);
                              }}
                              className="text-xs font-bold w-full bg-transparent border-b border-transparent focus:border-blue-400 outline-none"
                            />
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-zinc-500">Unit: ৳</span>
                              <input
                                type="number"
                                value={item.price}
                                onChange={(e) => {
                                  const newItems = [...editItems];
                                  newItems[idx].price = Number(e.target.value) || 0;
                                  setEditItems(newItems);
                                }}
                                className="w-20 text-xs font-mono font-semibold bg-white dark:bg-zinc-700 px-1 py-0.5 rounded border border-zinc-300 dark:border-zinc-600 outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center border border-zinc-300 dark:border-zinc-600 rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.quantity > 1) {
                                  const newItems = [...editItems];
                                  newItems[idx].quantity -= 1;
                                  setEditItems(newItems);
                                } else {
                                  setEditItems(editItems.filter((_, i) => i !== idx));
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
                                const newItems = [...editItems];
                                newItems[idx].quantity += 1;
                                setEditItems(newItems);
                              }}
                              className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 text-xs font-bold"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-xs font-bold w-16 text-right">৳{item.price * item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Status, Payment & Financials */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Order Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as OrderStatus)}
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
                      Payment Method
                    </label>
                    <select
                      value={editPaymentMethod}
                      onChange={(e) => setEditPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-semibold outline-none"
                    >
                      <option value="COD">Cash on Delivery (COD)</option>
                      <option value="bKash">bKash</option>
                      <option value="Nagad">Nagad</option>
                      <option value="Rocket">Rocket</option>
                      <option value="Card">Card</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Delivery Fee (৳)
                    </label>
                    <input
                      type="number"
                      value={editShippingFee}
                      onChange={(e) => setEditShippingFee(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-semibold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Advance Paid (৳)
                    </label>
                    <input
                      type="number"
                      value={editAdvanceAmount}
                      onChange={(e) => setEditAdvanceAmount(e.target.value ? Number(e.target.value) : "")}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-semibold outline-none text-emerald-600 dark:text-emerald-400 font-mono"
                    />
                  </div>
                </div>

                {/* 5. Logistics / Fulfillment */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Tracking ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TRK452126542"
                      value={editTrackingId}
                      onChange={(e) => setEditTrackingId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Courier Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Steadfast / SA Paribahan"
                      value={editCourierName}
                      onChange={(e) => setEditCourierName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Rider Contact Phone
                    </label>
                    <input
                      type="text"
                      placeholder="017..."
                      value={editRiderNumber}
                      onChange={(e) => setEditRiderNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Edit Summary Box */}
                <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs space-y-1.5">
                  <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                    <span>Items Subtotal:</span>
                    <span>৳{calculateEditSubtotal()}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                    <span>Delivery Fee:</span>
                    <span>৳{editShippingFee}</span>
                  </div>
                  <div className="flex justify-between text-zinc-900 dark:text-white font-bold pt-1 border-t border-zinc-200 dark:border-zinc-700">
                    <span>Calculated Total:</span>
                    <span>৳{calculateEditTotal()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>Advance Already Paid:</span>
                    <span>- ৳{Number(editAdvanceAmount) || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-rose-600 dark:text-rose-400 pt-1.5 border-t border-zinc-200 dark:border-zinc-700">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Due On Delivery (COD Balance):
                    </span>
                    <span>৳{calculateEditDue()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition cursor-pointer"
                  >
                    {isSavingEdit ? "Saving Changes..." : "Save Order Changes"}
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
