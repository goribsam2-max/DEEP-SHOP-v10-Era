import React, { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  where 
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { UserProfile, Order } from "../../types";
import { useNotify } from "../../components/Notifications";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Search, 
  Trash2, 
  X, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Wallet, 
  Calendar,
  ShoppingBag,
  ChevronRight,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

const ManageUsersMobile: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedUserOrders, setSelectedUserOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  // Fetch all users in real time
  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserProfile));
      setLoading(false);
    }, (err) => {
      console.error(err);
      notify("Failed to load users", "error");
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Fetch orders for selected user
  useEffect(() => {
    if (!selectedUser) {
      setSelectedUserOrders([]);
      return;
    }
    setOrdersLoading(true);
    const q = query(
      collection(db, "orders"), 
      where("userId", "==", selectedUser.uid)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const ordersList = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Order);
      // Sort orders locally by createdAt descending
      ordersList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setSelectedUserOrders(ordersList);
      setOrdersLoading(false);
    }, (err) => {
      console.error(err);
      notify("Failed to load orders for user", "error");
      setOrdersLoading(false);
    });
    return unsubscribe;
  }, [selectedUser]);

  // Handle order deletion
  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteDoc(doc(db, "orders", orderId));
      notify("Order deleted successfully", "success");
      setOrderToDelete(null);
    } catch (err) {
      console.error(err);
      notify("Failed to delete order", "error");
    }
  };

  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const handleDeleteUser = async (uid: string) => {
    try {
      await deleteDoc(doc(db, "users", uid));
      try {
        const token = await auth.currentUser?.getIdToken();
        await fetch("/api/admin/delete-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid, adminToken: token }),
        });
      } catch (e) {
        console.warn("Auth deletion warning:", e);
      }
      notify("User deleted successfully from database", "success");
      setUserToDelete(null);
      if (selectedUser?.uid === uid) {
        setSelectedUser(null);
      }
    } catch (err) {
      console.error(err);
      notify("Failed to delete user", "error");
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    return (
      (u.displayName || "").toLowerCase().includes(term) ||
      (u.email || "").toLowerCase().includes(term) ||
      u.uid.toLowerCase().includes(term) ||
      (u.phoneNumber || "").includes(term)
    );
  });

  const getStatusBadge = (status: string) => {
    const base = "px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight inline-flex items-center gap-1";
    switch (status) {
      case "Delivered":
        return <span className={`${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400`}><CheckCircle2 size={10} /> Delivered</span>;
      case "Cancelled":
      case "Returned":
        return <span className={`${base} bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400`}><X size={10} /> {status}</span>;
      case "Pending":
        return <span className={`${base} bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400`}><Clock size={10} /> Pending</span>;
      default:
        return <span className={`${base} bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400`}><ShoppingBag size={10} /> {status}</span>;
    }
  };

  return (
    <div className="w-full min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 pb-20">
      {/* Sticky top mobile-optimized header */}
      <div className="sticky top-0 z-40 w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate("/admin")}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Back to Admin Dashboard"
            style={{ minWidth: "44px", minHeight: "44px" }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-base font-bold tracking-tight">Mobile User Manager</h1>
            <p className="text-[10px] text-zinc-500 font-medium">Manage and view customers & orders on the go</p>
          </div>
        </div>
        <div className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full text-xs font-bold text-zinc-600 dark:text-zinc-300">
          {users.length} Users
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-md mx-auto px-4 pt-4">
        {/* Search Input Bar */}
        <div className="relative mb-4">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search name, email, phone or UID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-zinc-400 shadow-sm transition-all text-zinc-900 dark:text-zinc-100"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              style={{ minWidth: "44px", minHeight: "44px" }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Loading Skeleton or User Cards list */}
        {loading ? (
          <div className="space-y-3 mt-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-full h-20 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 mt-4">
            <User size={40} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No users found</p>
            <p className="text-xs text-zinc-400 mt-1">Try adjusting your search query</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => {
              const initial = (user.displayName || user.email || "U").charAt(0).toUpperCase();
              return (
                <div
                  key={user.uid}
                  onClick={() => setSelectedUser(user)}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center justify-between hover:border-blue-300 dark:hover:border-blue-900 active:bg-zinc-50 dark:active:bg-zinc-850 transition-all cursor-pointer shadow-sm group"
                >
                  <div className="flex items-center gap-3">
                    {/* Rounded Avatar with Initial fallback */}
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center font-bold text-base shrink-0 border border-blue-200/40">
                        {initial}
                      </div>
                    )}

                    {/* User Text Info */}
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                        {user.displayName || "No Name"}
                        {user.isBanned && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 rounded text-[9px] font-bold">
                            Banned
                          </span>
                        )}
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{user.email}</p>
                      {user.phoneNumber && (
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-mono">{user.phoneNumber}</p>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={18} className="text-zinc-400 group-hover:text-blue-500 transition-colors shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FULL SCREEN MODAL WITH DETAILED INFO & ORDERS */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed inset-0 z-50 bg-white dark:bg-zinc-950 overflow-y-auto"
          >
            {/* Fullscreen Modal Header */}
            <div className="sticky top-0 z-10 w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3.5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-zinc-800 dark:text-zinc-200"
                  aria-label="Close Details"
                  style={{ minWidth: "44px", minHeight: "44px" }}
                >
                  <ArrowLeft size={20} />
                </button>
                <h3 className="text-base font-bold tracking-tight">User Detailed Card</h3>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                style={{ minWidth: "44px", minHeight: "44px" }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-w-md mx-auto px-4 py-6 space-y-6">
              {/* Profile Card Hero */}
              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-2xl pointer-events-none"></div>
                {selectedUser.photoURL ? (
                  <img
                    src={selectedUser.photoURL}
                    alt={selectedUser.displayName}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-full object-cover border-2 border-white dark:border-zinc-800 shadow-md mb-3"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center font-bold text-2xl mb-3 border border-blue-200">
                    {(selectedUser.displayName || selectedUser.email || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  {selectedUser.displayName || "No Name"}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    selectedUser.role === 'admin' 
                      ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400' 
                      : selectedUser.role === 'seller'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}>
                    {selectedUser.role}
                  </span>
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{selectedUser.email}</p>
                <p className="text-[10px] text-zinc-400 mt-1">UID: {selectedUser.uid}</p>

                <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 w-full flex justify-center">
                  {userToDelete === selectedUser.uid ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-red-500">Confirm DB Delete?</span>
                      <button
                        onClick={() => handleDeleteUser(selectedUser.uid)}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-xl"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setUserToDelete(null)}
                        className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 text-xs font-bold rounded-xl"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setUserToDelete(selectedUser.uid)}
                      className="px-4 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={14} /> Delete User from Database
                    </button>
                  )}
                </div>
              </div>

              {/* Contact & Extra Details List */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Account Credentials & Metadata</h5>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 space-y-4 shadow-sm">
                  {/* Phone number */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center shrink-0">
                      <Phone size={15} />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 font-semibold">Phone Number</p>
                      <p className="text-xs font-medium text-zinc-800 dark:text-zinc-100">{selectedUser.phoneNumber || "No phone added"}</p>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center shrink-0">
                      <MapPin size={15} />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 font-semibold">Delivery Address</p>
                      <p className="text-xs font-medium text-zinc-800 dark:text-zinc-100">{selectedUser.address || "No address added"}</p>
                    </div>
                  </div>

                  {/* Wallet Balance */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center shrink-0">
                      <Wallet size={15} />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 font-semibold">Wallet Balance</p>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        ৳{selectedUser.walletBalance !== undefined ? selectedUser.walletBalance : "0"}
                      </p>
                    </div>
                  </div>

                  {/* Registration Date */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center shrink-0">
                      <Calendar size={15} />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 font-semibold">Registration Date</p>
                      <p className="text-xs font-medium text-zinc-800 dark:text-zinc-100">
                        {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString("en-US", {
                          year: 'numeric', month: 'long', day: 'numeric'
                        }) : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Ban status */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center shrink-0">
                      <ShieldAlert size={15} />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 font-semibold">Account Status</p>
                      <p className={`text-xs font-bold ${selectedUser.isBanned ? "text-red-500" : "text-emerald-500"}`}>
                        {selectedUser.isBanned ? "Suspended / Blocked" : "Active / Verified"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Orders Area */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-400">User's Purchase Orders</h5>
                  <span className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {selectedUserOrders.length} Orders
                  </span>
                </div>

                {ordersLoading ? (
                  <div className="space-y-3">
                    <div className="h-24 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-2xl" />
                    <div className="h-24 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-2xl" />
                  </div>
                ) : selectedUserOrders.length === 0 ? (
                  <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <ShoppingBag className="mx-auto text-zinc-300 dark:text-zinc-700 mb-2" size={28} />
                    <p className="text-xs font-semibold text-zinc-500">No purchase records found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedUserOrders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm"
                      >
                        {/* Order Header */}
                        <div className="bg-zinc-50 dark:bg-zinc-850 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-zinc-400 font-bold">ORDER ID: #{order.id.slice(0, 10).toUpperCase()}</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">
                              {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "N/A"}
                            </p>
                          </div>
                          {getStatusBadge(order.status)}
                        </div>

                        {/* Order Items List */}
                        <div className="p-4 space-y-3">
                          {order.items && order.items.map((item, index) => (
                            <div key={index} className="flex items-center gap-3">
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-10 h-10 rounded-xl object-cover border border-zinc-200 dark:border-zinc-800 shrink-0"
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{item.name}</p>
                                <p className="text-[10px] text-zinc-400 font-semibold">Qty: {item.quantity} &bull; Price: ৳{item.priceAtPurchase || item.price}</p>
                              </div>
                            </div>
                          ))}

                          {/* Divider */}
                          <div className="border-t border-zinc-100 dark:border-zinc-800 my-2 pt-2 flex justify-between items-center">
                            <div>
                              <p className="text-[10px] text-zinc-400 font-bold">PAYMENT METHOD</p>
                              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{order.paymentMethod || "Cash on Delivery"}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-zinc-400 font-bold">TOTAL PAID</p>
                              <p className="text-sm font-black text-blue-600 dark:text-blue-400">৳{order.total}</p>
                            </div>
                          </div>

                          {/* Action - Delete Order from Database */}
                          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                            {orderToDelete === order.id ? (
                              <div className="flex items-center gap-2 animate-scale-up">
                                <span className="text-[10px] font-bold text-red-500 mr-2 flex items-center gap-1">
                                  <AlertTriangle size={12} /> Confirm delete?
                                </span>
                                <button
                                  onClick={() => handleDeleteOrder(order.id)}
                                  className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-500 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
                                >
                                  Yes, Delete
                                </button>
                                <button
                                  onClick={() => setOrderToDelete(null)}
                                  className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-bold rounded-lg cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setOrderToDelete(order.id)}
                                className="px-3.5 py-1.5 border border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                                style={{ minHeight: "36px" }}
                              >
                                <Trash2 size={13} />
                                Delete Order
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManageUsersMobile;
