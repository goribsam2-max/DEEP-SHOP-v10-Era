import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  onSnapshot,
  query,
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
  const { notify } = useNotify();

  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "expired">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // In-app Modals state for Approval and Rejection
  const [approveModalSub, setApproveModalSub] = useState<SubscriptionRecord | null>(null);
  const [rejectModalSub, setRejectModalSub] = useState<SubscriptionRecord | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState("পেমেন্ট তথ্য বা TrxID মিল পাওয়া যায়নি।");

  // Subscribe to real-time subscription records and subscription orders
  useEffect(() => {
    let listSubs: SubscriptionRecord[] = [];
    let listOrders: SubscriptionRecord[] = [];

    const updateCombinedList = () => {
      const combinedMap = new Map<string, SubscriptionRecord>();
      
      listOrders.forEach((o) => combinedMap.set(o.id, o));
      listSubs.forEach((s) => combinedMap.set(s.id, s));

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
          listOrders.push({
            id: d.id,
            userId: data.userId || "guest",
            userName: data.customerName || data.shippingAddress?.name || "VIP Member",
            userEmail: data.customerEmail || "",
            userPhone: data.customerPhone || data.shippingAddress?.phone || "",
            planId: data.planId || data.items?.[0]?.id || "30days",
            planName: data.planName || data.items?.[0]?.name || "DEEP SHOP VIP Pass",
            durationDays: Number(data.durationDays || 30),
            price: Number(data.total || data.amountToPay || 0),
            paymentMethod: data.paymentMethod?.toLowerCase().includes("nagad") ? "Nagad" : "bKash",
            senderNumber: data.customerSenderNumber || data.customerPhone || "",
            trxId: data.customerTrxId || data.bankingTrxId || ("TRX" + d.id.slice(0, 6).toUpperCase()),
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
      notify(`${targetSub.userName}-এর সাবস্ক্রিপশন সফলভাবে চালু করা হয়েছে!`, "success");
      setApproveModalSub(null);
    } catch (err: any) {
      console.error(err);
      notify(err?.message || "অনুমোদন করা সম্ভব হয়নি।", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectModalSub) return;
    const targetSub = rejectModalSub;
    const reason = rejectionReasonText.trim() || "পেমেন্ট তথ্য বা TrxID মিল পাওয়া যায়নি।";

    try {
      setActionLoading(targetSub.id);
      const adminName = auth.currentUser?.email || "Admin";
      await rejectSubscription(targetSub.id, reason, adminName);
      notify("সাবস্ক্রিপশন আবেদনটি বাতিল করা হয়েছে।", "info");
      setRejectModalSub(null);
    } catch (err: any) {
      console.error(err);
      notify(err?.message || "বাতিল করা সম্ভব হয়নি।", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleManualExpire = async (sub: SubscriptionRecord) => {
    if (!window.confirm(`${sub.userName}-এর সক্রিয় মেম্বারশিপ মেয়াদ শেষ (Expire) করবেন? এর ফলে তার ফ্রি টিয়ারে ব্যাক করা হবে।`)) {
      return;
    }

    try {
      setActionLoading(sub.id);
      await expireUserSubscription(sub.userId);
      notify("ব্যবহারকারীর মেম্বারশিপ মেয়াদোত্তীর্ণ করা হয়েছে।", "info");
    } catch (err: any) {
      console.error(err);
      notify("ব্যর্থ হয়েছে।", "error");
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
                <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white">
                  ভিআইপি সাবস্ক্রিপশন ম্যানেজমেন্ট
                </h1>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                গ্রাহকদের ক্যাশ অন ডেলিভারি (০ অগ্রিম) ভিআইপি সাবস্ক্রিপশন রিকোয়েস্ট ও অনুমোদন কেন্দ্র
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/subscription"
              target="_blank"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span>পাবলিক প্ল্যান পেজ দেখুন</span>
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-bold">মোট আয় (রেভিনিউ)</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white mt-2">
              ৳{totalRevenue.toLocaleString("en-BD")}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5 font-medium">সাবস্ক্রিপশন ফি থেকে</div>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-bold">সক্রিয় ভিআইপি মেম্বার</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Crown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-500 mt-2">
              {activeVipCount} জন
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5 font-medium">০ টাকা অগ্রিমে সিওডি সুবিধা প্রাপ্ত</div>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-bold">অনুমোদনের অপেক্ষায়</span>
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-2">
              {pendingCount} টি
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5 font-medium">ভেরিফিকেশন পেন্ডিং</div>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-bold">মোট রিকোয়েস্ট</span>
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white mt-2">
              {subscriptions.length} টি
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5 font-medium">সর্বমোট জমা হওয়া আবেদন</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "সকল" },
              { id: "pending", label: `পেন্ডিং (${pendingCount})` },
              { id: "approved", label: "সক্রিয় ভিআইপি" },
              { id: "expired", label: "মেয়াদোত্তীর্ণ" },
              { id: "rejected", label: "বাতিলকৃত" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
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
              placeholder="নাম, ফোন বা TrxID খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Subscription Requests List */}
        {loading ? (
          <div className="p-12 text-center text-zinc-400 font-bold">
            সাবস্ক্রিপশন ডাটা লোড হচ্ছে...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center">
            <Crown className="w-10 h-10 text-zinc-400 mx-auto mb-2 opacity-50" />
            <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-200">
              কোনো সাবস্ক্রিপশন রিকোয়েস্ট পাওয়া যায়নি
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              গ্রাহকরা সাবস্ক্রিপশন প্যাকেজের জন্য আবেদন করলে এখানে তালিকা আকারে দেখতে পারবেন।
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
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block">
                          {sub.durationDays} দিনের ভিআইপি প্যাক
                        </span>
                        <h3 className="font-black text-base text-zinc-900 dark:text-white">
                          {sub.planName}
                        </h3>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
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
                          ? "মেয়াদ শেষ"
                          : sub.status === "approved"
                          ? "সক্রিয় VIP"
                          : sub.status === "pending"
                          ? "পেন্ডিং"
                          : "বাতিল"}
                      </span>
                    </div>

                    {/* Customer Info Card */}
                    <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800 text-xs space-y-1.5">
                      <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
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
                        <span className="text-zinc-500">পেমেন্ট মেথড:</span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">
                          {sub.paymentMethod}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">সেন্ডার নম্বর:</span>
                        <span className="font-bold font-mono text-zinc-800 dark:text-zinc-200">
                          {sub.senderNumber}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">TrxID:</span>
                        <span className="font-mono font-black text-amber-600 dark:text-amber-400 tracking-wider">
                          {sub.trxId}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-amber-200/40 dark:border-amber-900/40 font-bold">
                        <span className="text-zinc-700 dark:text-zinc-300">ফি পরিমাণ:</span>
                        <span className="text-sm font-black text-zinc-900 dark:text-white">
                          ৳{sub.price.toLocaleString("en-BD")}
                        </span>
                      </div>
                    </div>

                    {/* Timeline dates */}
                    <div className="text-[11px] text-zinc-400 space-y-0.5">
                      <div>
                        আবেদনের সময়:{" "}
                        {sub.requestedAt
                          ? new Date(sub.requestedAt).toLocaleString("bn-BD")
                          : "N/A"}
                      </div>
                      {sub.startDate && (
                        <div>
                          শুরু: {new Date(sub.startDate).toLocaleDateString("bn-BD")}
                        </div>
                      )}
                      {sub.expiryDate && (
                        <div className="font-semibold text-zinc-600 dark:text-zinc-300">
                          মেয়াদ শেষ: {new Date(sub.expiryDate).toLocaleDateString("bn-BD")}{" "}
                          {!isActuallyExpired && `(বাকি ${daysRemaining} দিন)`}
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
                          className="py-2.5 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1 shadow-sm transition-all disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>অনুমোদন ও চালু</span>
                        </button>
                        <button
                          disabled={actionLoading === sub.id}
                          onClick={() => {
                            setRejectModalSub(sub);
                            setRejectionReasonText("পেমেন্ট তথ্য বা TrxID মিল পাওয়া যায়নি।");
                          }}
                          className="py-2.5 px-3 rounded-full bg-zinc-200 dark:bg-zinc-800 hover:bg-rose-100 dark:hover:bg-rose-950 hover:text-rose-600 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>বাতিল করুন</span>
                        </button>
                      </div>
                    ) : sub.status === "approved" && !isActuallyExpired ? (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>০% অগ্রিম ক্যাশ অন চালু আছে</span>
                        </span>
                        <button
                          onClick={() => handleManualExpire(sub)}
                          className="text-[11px] text-zinc-400 hover:text-rose-500 font-semibold"
                        >
                          মেয়াদ বাতিল করুন
                        </button>
                      </div>
                    ) : (
                      <div className="text-center text-[11px] text-zinc-400 font-medium py-1">
                        {isActuallyExpired ? "এই মেম্বারশিপের মেয়াদ উত্তীর্ণ হয়েছে" : "আবেদনটি বাতিল করা হয়েছিল"}
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
                  <h3 className="font-black text-base">ভিআইপি সাবস্ক্রিপশন অনুমোদন</h3>
                  <p className="text-xs text-zinc-500">গ্রাহকের অ্যাকাউন্টে ০ টাকা অগ্রিমে ক্যাশ অন চালু হবে</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500">গ্রাহকের নাম:</span>
                  <span className="font-bold">{approveModalSub.userName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">ফোন/ইমেইল:</span>
                  <span className="font-mono font-bold">{approveModalSub.userPhone || approveModalSub.senderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">প্ল্যান:</span>
                  <span className="font-bold text-amber-500">{approveModalSub.planName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">মেথড / TrxID:</span>
                  <span className="font-mono font-bold text-emerald-600">{approveModalSub.paymentMethod} &bull; {approveModalSub.trxId}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-zinc-200 dark:border-zinc-800 font-bold">
                  <span>পেমেন্ট ফি:</span>
                  <span className="text-sm">৳{approveModalSub.price.toLocaleString("en-BD")}</span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setApproveModalSub(null)}
                  className="flex-1 py-3 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs hover:bg-zinc-200 transition"
                >
                  ফিরে যান
                </button>
                <button
                  type="button"
                  disabled={actionLoading === approveModalSub.id}
                  onClick={confirmApprove}
                  className="flex-1 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition disabled:opacity-50"
                >
                  {actionLoading === approveModalSub.id ? "চালু হচ্ছে..." : "হ্যাঁ, অনুমোদন ও চালু করুন"}
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
                  <h3 className="font-black text-base">সাবস্ক্রিপশন বাতিল করুন</h3>
                  <p className="text-xs text-zinc-500">{rejectModalSub.userName}-এর আবেদন বাতিলের কারণ নির্বাচন করুন</p>
                </div>
              </div>

              {/* Quick Preset Reason Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-zinc-400 block">দ্রুত কারণ নির্বাচন করুন:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "পেমেন্ট তথ্য বা TrxID মিল পাওয়া যায়নি।",
                    "আমাদের বিকাশ/নগদে টাকা জমা হয়নি।",
                    "সেন্ডার ফোন নম্বর ভুল দেওয়া হয়েছে।",
                    "যাচাইকরণ প্রক্রিয়া ব্যর্থ হয়েছে।",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectionReasonText(preset)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition ${
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
                <span className="text-[11px] font-bold text-zinc-400 block">বাতিলের কারণ (গ্রাহক তার অর্ডারে দেখতে পাবেন):</span>
                <textarea
                  rows={3}
                  value={rejectionReasonText}
                  onChange={(e) => setRejectionReasonText(e.target.value)}
                  placeholder="কারণ লিখুন..."
                  className="w-full p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalSub(null)}
                  className="flex-1 py-3 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs hover:bg-zinc-200 transition"
                >
                  ফিরে যান
                </button>
                <button
                  type="button"
                  disabled={actionLoading === rejectModalSub.id}
                  onClick={confirmReject}
                  className="flex-1 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition disabled:opacity-50"
                >
                  {actionLoading === rejectModalSub.id ? "বাতিল হচ্ছে..." : "আবেদন বাতিল নিশ্চিত করুন"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
