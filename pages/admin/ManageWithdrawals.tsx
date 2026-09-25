import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  increment,
} from "firebase/firestore";
import { db } from "../../firebase";
import { WithdrawRequest } from "../../types";
import Icon from "../../components/Icon";
import { useNotify, usePromptModal } from "../../components/Notifications";

const ManageWithdrawals: React.FC = () => {
  const [requests, setRequests] = useState<WithdrawRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "coin" | "affiliate">("all");
  const notify = useNotify();
  const prompt = usePromptModal();

  useEffect(() => {
    const q = query(
      collection(db, "withdrawals"),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setRequests(
        snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as WithdrawRequest,
        ),
      );
      setLoading(false);
    });
    return unsub;
  }, []);

  const updateStatus = async (
    request: WithdrawRequest,
    status: "Pending" | "Completed" | "Rejected",
  ) => {
    if (status === "Rejected") {
      prompt({
        title: "Reject Withdrawal Request",
        message: "Please enter the reason for rejecting this withdrawal request. (If coin withdrawal, coins will be refunded to user wallet).",
        placeholder: "Reason for rejection...",
        required: true,
        confirmText: "Reject & Notify",
        onConfirm: async (reason) => {
          try {
            await updateDoc(doc(db, "withdrawals", request.id), { status, reason });

            // If coin withdrawal, refund coins back to user wallet
            if (request.type === "coin") {
              await updateDoc(doc(db, "users", request.userId), {
                coins: increment(request.coinAmount || request.amount)
              });
            }

            await addDoc(collection(db, "notifications"), {
              userId: request.userId,
              title: "Withdrawal Request Rejected",
              message: `Your withdrawal request of ৳${request.amount} (${request.paymentMethod || 'bKash'}) was rejected. ${request.type === 'coin' ? 'Coins have been refunded to your wallet.' : ''}\n\nReason: ${reason}`,
              isRead: false,
              createdAt: Date.now(),
              type: "system",
              variant: "rejected-withdrawal",
              reason: reason
            });

            notify(`Withdrawal request rejected. ${request.type === 'coin' ? 'Coins refunded.' : ''}`, "success");
          } catch (e) {
            notify("Failed to update status", "error");
          }
        }
      });
      return;
    }

    try {
      await updateDoc(doc(db, "withdrawals", request.id), { status });
      if (status === "Completed") {
        await addDoc(collection(db, "notifications"), {
          userId: request.userId,
          title: "Withdrawal Completed Successfully",
          message: `Your withdrawal request of ৳${request.amount} to your ${request.paymentMethod || 'bKash'} account (${request.bkashNumber || request.accountNumber}) has been sent!`,
          isRead: false,
          createdAt: Date.now(),
          type: "system",
        });
      }
      notify(`Status updated to ${status}`, "success");
    } catch (e) {
      notify("Failed to update status", "error");
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (activeFilter === "coin") return r.type === "coin";
    if (activeFilter === "affiliate") return r.type === "affiliate" || !r.type;
    return true;
  });

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">Withdrawal Requests (উইথড্র রিকোয়েস্ট)</h1>
          <p className="text-xs text-zinc-500 font-medium">Manage user DP coin withdrawals and affiliate payout requests.</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 self-start">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeFilter === "all"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            All ({requests.length})
          </button>
          <button
            onClick={() => setActiveFilter("coin")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeFilter === "coin"
                ? "bg-amber-500 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            Coin Withdrawals ({requests.filter(r => r.type === 'coin').length})
          </button>
          <button
            onClick={() => setActiveFilter("affiliate")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeFilter === "affiliate"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            Affiliate ({requests.filter(r => r.type === 'affiliate' || !r.type).length})
          </button>
        </div>
      </div>

      <div className="flex flex-col space-y-3">
        {filteredRequests.map((req) => (
          <div
            key={req.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm hover:border-amber-400 dark:hover:border-amber-700 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm font-bold ${
                req.type === 'coin'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              }`}>
                {req.type === 'coin' ? 'DP' : '৳'}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-lg text-zinc-900 dark:text-zinc-100">
                    ৳{req.amount}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      req.status === "Pending"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : req.status === "Completed"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                    }`}
                  >
                    {req.status}
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-lg">
                    {req.type === 'coin' ? 'Coin Withdrawal' : 'Affiliate Payout'}
                  </span>
                </div>

                <div className="text-xs text-zinc-600 dark:text-zinc-300 font-semibold space-y-0.5">
                  <p className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{req.userName || req.accountName || "User"}</span>
                    {req.userEmail && <span className="text-zinc-400 font-normal">({req.userEmail})</span>}
                  </p>
                  <p className="text-zinc-500">
                    Method: <span className="font-bold text-pink-600 dark:text-pink-400">{req.paymentMethod || 'bKash'}</span> &middot; Number: <span className="font-bold text-zinc-800 dark:text-zinc-200">{req.accountNumber || req.bkashNumber}</span>
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Requested on: {new Date(req.createdAt).toLocaleString()}
                  </p>
                  {req.reason && (
                    <p className="text-xs text-rose-500 font-medium pt-1">
                      Reason: {req.reason}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {req.status === "Pending" && (
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => updateStatus(req, "Completed")}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Icon name="check" className="text-xs" />
                  <span>Approve & Send</span>
                </button>
                <button
                  onClick={() => updateStatus(req, "Rejected")}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 text-rose-600 dark:text-rose-400 font-bold text-xs transition-all flex items-center gap-1.5 border border-rose-200 dark:border-rose-800"
                >
                  <Icon name="times" className="text-xs" />
                  <span>Reject</span>
                </button>
              </div>
            )}
          </div>
        ))}

        {filteredRequests.length === 0 && !loading && (
          <div className="py-20 text-center text-zinc-400 font-bold text-sm bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            No withdrawal requests found in this section.
          </div>
        )}
      </div>
    </div>
  );
};
export default ManageWithdrawals;
