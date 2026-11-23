import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  getDocs
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import {
  Crown,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  DollarSign,
  Users,
  ShieldCheck,
  Calendar,
  Phone,
  Mail,
  RefreshCw,
  AlertTriangle,
  ArrowLeft
} from "lucide-react";
import {
  approveSubscription,
  rejectSubscription,
  expireUserSubscription,
  SubscriptionRecord,
  SUBSCRIPTION_PLANS
} from "../../services/subscription";
import { useNotify } from "../../components/Notifications";

export default function ManageSubscriptions() {
  const notify = useNotify();

  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "expired">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // In-app Modals state for Approval and Rejection
  const [approveModalSub, setApproveModalSub] = useState<SubscriptionRecord | null>(null);
  const [rejectModalSub, setRejectModalSub] = useState<SubscriptionRecord | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState("Payment details or TrxID did not match.");

  // Subscribe to real-time subscription records and subscription orders
  useEffect(() => {
    let listSubs: SubscriptionRecord[] = [];
    let listOrders: SubscriptionRecord[] = [];

    const updateCombinedList = () => {
      const combinedMap = new Map<string, SubscriptionRecord>();
      
      // 1. Populate orders
      listOrders.forEach((o) => combinedMap.set(o.id, o));

      // 2. Merge subscriptions collection items by orderId/id/trxId to prevent duplicates
      listSubs.forEach((s) => {
        const subAny = s as any;
        const targetId = subAny.orderId || s.id;

        const existingKey = Array.from(combinedMap.keys()).find(
          (k) => k === targetId || k === s.id || (s.trxId && combinedMap.get(k)?.trxId === s.trxId)
        );

        if (existingKey) {
          const existing = combinedMap.get(existingKey)!;
          combinedMap.set(existingKey, {
            ...existing,
            ...s,
            id: existing.id,
            status: s.status || existing.status,
            trxId: s.trxId || existing.trxId,
            senderNumber: s.senderNumber || existing.senderNumber,
            paymentMethod: s.paymentMethod || existing.paymentMethod,
          });
        } else {
          combinedMap.set(targetId, s);
        }
      });

      const merged = Array.from(combinedMap.values());
      merged.sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));
      setSubscriptions(merged);
      setLoading(false);
    };

    // 1. Listen to subscriptions collection
    const qSubs = query(collection(db, "subscriptions"));
    const unsubSubs = onSnapshot(
      qSubs,
      (snap) => {
        listSubs = [];
        snap.forEach((d) => {
          listSubs.push({ id: d.id, ...(d.data() as any) });
        });
        updateCombinedList();
      },
      (err) => console.error("Error loading subscriptions:", err)
    );

    // 2. Listen to orders collection for subscription orders
    const qOrders = query(collection(db, "orders"), where("type", "==", "subscription"));
    const unsubOrders = onSnapshot(
      qOrders,
      (snap) => {
        listOrders = [];
        snap.forEach((d) => {
          const data = d.data() as any;

          // Ignore unpaid draft subscription orders where user has not submitted payment/trxId yet
          if (
            data.status === "pending_payment" ||
            data.paymentStatus === "unpaid" ||
            (!data.customerTrxId && !data.transactionId && !data.bankingTrxId && !data.lastDigits)
          ) {
            return;
          }

          const realTrxId = data.customerTrxId || data.transactionId || data.bankingTrxId || data.lastDigits;
          if (!realTrxId) return;

          const methodLower = (data.paymentMethod || "").toLowerCase();
          const paymentMethod = methodLower.includes("nagad")
            ? "Nagad"
            : methodLower.includes("rocket")
            ? "Rocket"
            : methodLower.includes("upay")
            ? "Upay"
            : "bKash";

          const senderNum =
            data.customerSenderNumber ||
            data.senderNumber ||
            data.accountNameSender ||
            data.customerPhone ||
            "";

          listOrders.push({
            id: d.id,
            userId: data.userId || "guest",
            userName: data.customerName || data.shippingAddress?.name || "VIP Member",
            userEmail: data.customerEmail || "",
            userPhone: senderNum || data.customerPhone || "",
            planId: data.planId || data.items?.[0]?.id || "30days",
            planName: data.planName || data.items?.[0]?.name || "DEEP SHOP VIP Pass",
            durationDays: Number(data.durationDays || 30),
            price: Number(data.total || data.amountToPay || 0),
            paymentMethod: paymentMethod,
            senderNumber: senderNum,
            trxId: realTrxId,
            status: data.status === "Completed" ? "approved" : data.status === "Cancelled" ? "rejected" : "pending",
            requestedAt: data.createdAt || Date.now(),
            notes: data.notes || data.rejectionReason || "",
            rejectionReason: data.rejectionReason || data.notes || "",
          });
        });
        updateCombinedList();
      },
      (err) => console.error("Error loading subscription orders:", err)
    );

    return () => {
      unsubSubs();
      unsubOrders();
    };
  }, []);

  const confirmApprove = async () => {
    if (!approveModalSub) return;
    const targetSub = approveModalSub;

    try {
      setActionLoading(targetSub.id);
      const adminName = auth.currentUser?.email || "Admin";
      await approveSubscription(targetSub.id, adminName);
      notify(`${targetSub.userName}'s subscription has been activated successfully!`, "success");
    } catch (err: any) {
      console.error("Approve error:", err);
      notify(err?.message || "Failed to approve subscription.", "error");
    } finally {
      setActionLoading(null);
      setApproveModalSub(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectModalSub) return;
    const targetSub = rejectModalSub;
    const reason = rejectionReasonText.trim() || "Payment details or TrxID did not match.";

    try {
      setActionLoading(targetSub.id);
      const adminName = auth.currentUser?.email || "Admin";
      await rejectSubscription(targetSub.id, reason, adminName);
      notify("Subscription request has been rejected.", "info");
    } catch (err: any) {
      console.error("Reject error:", err);
      notify(err?.message || "Failed to reject subscription.", "error");
    } finally {
      setActionLoading(null);
      setRejectModalSub(null);
    }
  };

  const handleManualExpire = async (sub: SubscriptionRecord) => {
    if (!window.confirm(`Expire active VIP membership for ${sub.userName}? They will return to the Free tier.`)) {
      return;
    }

    try {
      setActionLoading(sub.id);
      await expireUserSubscription(sub.userId);
      notify("User membership has been expired.", "info");
    } catch (err: any) {
      console.error(err);
      notify("Action failed.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Filter subscriptions
  const now = Date.now();
  const filteredList = subscriptions.filter((sub) => {
    const isActuallyExpired = sub.status === "approved" && sub.expiryDate && sub.expiryDate < now;
    const currentStatus = isActuallyExpired ? "expired" : sub.status;

    if (filter !== "all" && currentStatus !== filter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = sub.userName?.toLowerCase().includes(q);
      const matchPhone = sub.userPhone?.toLowerCase().includes(q) || sub.senderNumber?.toLowerCase().includes(q);
      const matchEmail = sub.userEmail?.toLowerCase().includes(q);
      const matchTrx = sub.trxId?.toLowerCase().includes(q);
      const matchPlan = sub.planName?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchEmail && !matchTrx && !matchPlan) return false;
    }

    return true;
  });

  // Calculate high-level stats
  const totalRevenue = subscriptions
    .filter((s) => s.status === "approved")
    .reduce((sum, s) => sum + (s.price || 0), 0);

  const activeVipCount = subscriptions.filter(
    (s) => s.status === "approved" && s.expiryDate && s.expiryDate > now
  ).length;

  const pendingCount = subscriptions.filter((s) => s.status === "pending").length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-sm transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Crown className="w-5 h-5" />
                </div>
                <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-white">
                  VIP Subscription Management
                </h1>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Approval hub for customer 0% Advance Cash on Delivery VIP subscriptions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/subscription"
              target="_blank"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-medium text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span>View Public Plan Page</span>
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-semibold">Total Revenue</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-white mt-2">
              ৳{totalRevenue.toLocaleString("en-BD")}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5 font-medium">From subscription fees</div>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-medium">Active VIP Members</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Crown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-semibold text-amber-500 mt-2">
              {activeVipCount}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5 font-medium">Enjoying 0% Advance COD</div>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-medium">Pending Approval</span>
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-semibold text-purple-600 dark:text-purple-400 mt-2">
              {pendingCount}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5 font-medium">Verification pending</div>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-semibold">Total Requests</span>
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-white mt-2">
              {subscriptions.length}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5 font-medium">All submitted applications</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "All" },
              { id: "pending", label: `Pending (${pendingCount})` },
              { id: "approved", label: "Active VIP" },
              { id: "expired", label: "Expired" },
              { id: "rejected", label: "Rejected" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  filter === tab.id
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Field */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, phone, or TrxID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Subscription Requests List */}
        {loading ? (
          <div className="p-12 text-center text-zinc-400 font-semibold">
            Loading subscription data...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center">
            <Crown className="w-10 h-10 text-zinc-400 mx-auto mb-2 opacity-50" />
            <h3 className="font-semibold text-base text-zinc-800 dark:text-zinc-200">
              No subscription requests found
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Customer VIP pass requests will appear here once submitted.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList.map((sub) => {
              const isActuallyExpired = sub.status === "approved" && sub.expiryDate && sub.expiryDate < now;
              const daysRemaining = sub.expiryDate
                ? Math.max(0, Math.ceil((sub.expiryDate - now) / (1000 * 60 * 60 * 24)))
                : 0;

              return (
                <div
                  key={sub.id}
                  className="rounded-3xl p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                >
                  <div className="space-y-3">
                    {/* Top Status & Plan Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-amber-500 block">
                          {sub.durationDays}-Day VIP Pack
                        </span>
                        <h3 className="font-semibold text-base text-zinc-900 dark:text-white">
                          {sub.planName}
                        </h3>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider ${
                          isActuallyExpired
                            ? "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
                            : sub.status === "approved"
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
                            : sub.status === "pending"
                            ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        {isActuallyExpired
                          ? "Expired"
                          : sub.status === "approved"
                          ? "Active VIP"
                          : sub.status === "pending"
                          ? "Pending"
                          : "Rejected"}
                      </span>
                    </div>

                    {/* Customer Info Card */}
                    <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800 text-xs space-y-1.5">
                      <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{sub.userName}</span>
                      </div>
                      <div className="text-zinc-500 flex items-center gap-1.5 font-mono">
                        <Phone className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{sub.userPhone || sub.senderNumber}</span>
                      </div>
                      {sub.userEmail && (
                        <div className="text-zinc-500 flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="truncate">{sub.userEmail}</span>
                        </div>
                      )}
                    </div>

                    {/* Payment & Transaction Info */}
                    <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Payment Method:</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {sub.paymentMethod}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Sender Number:</span>
                        <span className="font-semibold font-mono text-zinc-800 dark:text-zinc-200">
                          {sub.senderNumber}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">TrxID:</span>
                        <span className="font-mono font-semibold text-amber-600 dark:text-amber-400 tracking-wider">
                          {sub.trxId}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-amber-200/40 dark:border-amber-900/40 font-semibold">
                        <span className="text-zinc-700 dark:text-zinc-300">Fee Amount:</span>
                        <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                          ৳{(sub.price || 0).toLocaleString("en-BD")}
                        </span>
                      </div>
                    </div>

                    {/* Timeline dates */}
                    <div className="text-[11px] text-zinc-400 space-y-0.5">
                      <div>
                        Requested:{" "}
                        {sub.requestedAt
                          ? new Date(sub.requestedAt).toLocaleString("en-US")
                          : "N/A"}
                      </div>
                      {sub.startDate && (
                        <div>
                          Start Date: {new Date(sub.startDate).toLocaleDateString("en-US")}
                        </div>
                      )}
                      {sub.expiryDate && (
                        <div className="font-semibold text-zinc-600 dark:text-zinc-300">
                          Expires: {new Date(sub.expiryDate).toLocaleDateString("en-US")}{" "}
                          {!isActuallyExpired && `(${daysRemaining} days left)`}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Button Row */}
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    {sub.status === "pending" ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          disabled={actionLoading === sub.id}
                          onClick={() => setApproveModalSub(sub)}
                          className="py-2.5 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1 shadow-sm transition-all disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Approve & Activate</span>
                        </button>
                        <button
                          disabled={actionLoading === sub.id}
                          onClick={() => {
                            setRejectModalSub(sub);
                            setRejectionReasonText("Payment details or TrxID did not match.");
                          }}
                          className="py-2.5 px-3 rounded-full bg-zinc-200 dark:bg-zinc-800 hover:bg-rose-100 dark:hover:bg-rose-950 hover:text-rose-600 text-zinc-700 dark:text-zinc-300 font-medium text-xs flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    ) : sub.status === "approved" && !isActuallyExpired ? (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>0% Advance COD Active</span>
                        </span>
                        <button
                          onClick={() => handleManualExpire(sub)}
                          className="text-[11px] text-zinc-400 hover:text-rose-500 font-semibold"
                        >
                          Expire Now
                        </button>
                      </div>
                    ) : (
                      <div className="text-center text-[11px] text-zinc-400 font-medium py-1">
                        {isActuallyExpired ? "This membership has expired" : "This request was rejected"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* --- APPROVAL CONFIRMATION MODAL --- */}
        {approveModalSub && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 text-zinc-900 dark:text-white">
              <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Approve VIP Subscription</h3>
                  <p className="text-xs text-zinc-500">Enables 0% advance Cash on Delivery on this customer's account</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Customer Name:</span>
                  <span className="font-semibold">{approveModalSub.userName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Phone/Email:</span>
                  <span className="font-mono font-semibold">{approveModalSub.userPhone || approveModalSub.senderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Plan:</span>
                  <span className="font-semibold text-amber-500">{approveModalSub.planName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Method / TrxID:</span>
                  <span className="font-mono font-semibold text-emerald-600">{approveModalSub.paymentMethod} &bull; {approveModalSub.trxId}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-zinc-200 dark:border-zinc-800 font-semibold">
                  <span>Payment Fee:</span>
                  <span className="text-sm">৳{(approveModalSub.price || 0).toLocaleString("en-BD")}</span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setApproveModalSub(null)}
                  className="flex-1 py-3 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-xs hover:bg-zinc-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading === approveModalSub.id}
                  onClick={confirmApprove}
                  className="flex-1 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition disabled:opacity-50"
                >
                  {actionLoading === approveModalSub.id ? "Activating..." : "Confirm & Activate"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- REJECTION MODAL WITH REASON INPUT --- */}
        {rejectModalSub && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-zinc-900 dark:text-white">
              <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Reject Subscription</h3>
                  <p className="text-xs text-zinc-500">Select a rejection reason for {rejectModalSub.userName}'s request</p>
                </div>
              </div>

              {/* Quick Preset Reason Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-zinc-400 block">Quick Preset Reasons:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Payment details or TrxID did not match.",
                    "Payment was not received in our bKash/Nagad account.",
                    "Invalid sender phone number provided.",
                    "Verification process failed.",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectionReasonText(preset)}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition ${
                        rejectionReasonText === preset
                          ? "bg-rose-500 text-white border-rose-500"
                          : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Reason Textarea */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-zinc-400 block">Rejection Reason (visible to the customer):</span>
                <textarea
                  rows={3}
                  value={rejectionReasonText}
                  onChange={(e) => setRejectionReasonText(e.target.value)}
                  placeholder="Enter rejection reason..."
                  className="w-full p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalSub(null)}
                  className="flex-1 py-3 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-xs hover:bg-zinc-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading === rejectModalSub.id}
                  onClick={confirmReject}
                  className="flex-1 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-md transition disabled:opacity-50"
                >
                  {actionLoading === rejectModalSub.id ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
