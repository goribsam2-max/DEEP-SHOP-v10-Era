import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, limit, doc, onSnapshot, addDoc, updateDoc, increment } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { Coins, ArrowDownLeft, ArrowUpRight, Wallet, Loader2 } from "lucide-react";
import { useRegion } from "../components/RegionContext";
import { useNotify } from "../components/Notifications";
import Modal from "../components/ui/modal-drop";
import { triggerHaptic } from "../lib/haptics";

export default function MyCoins() {
  const [userData, setUserData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"bKash" | "Nagad">("bKash");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const notify = useNotify();
  const { formatPrice } = useRegion();

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(doc(db, "users", auth.currentUser.uid), (d) => setUserData(d.data()));
    return unsub;
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        const historyArr: any[] = [];
        const dq = query(collection(db, "deposits"), where("userId", "==", auth.currentUser.uid), orderBy("createdAt", "desc"), limit(10));
        const dSnap = await getDocs(dq);
        dSnap.forEach((d) => {
          const data = d.data();
          historyArr.push({
            id: d.id,
            type: "deposit",
            title: "Coin Deposit",
            amount: data.amount,
            status: data.status,
            createdAt: data.createdAt,
          });
        });

        const wq = query(collection(db, "withdrawals"), where("userId", "==", auth.currentUser.uid), orderBy("createdAt", "desc"), limit(10));
        const wSnap = await getDocs(wq);
        wSnap.forEach((d) => {
          const data = d.data();
          historyArr.push({
            id: d.id,
            type: "withdraw",
            title: `Coin Withdrawal (${data.paymentMethod || "bKash"})`,
            amount: data.coinAmount || data.amount,
            status: data.status,
            createdAt: data.createdAt,
          });
        });

        const oq = query(collection(db, "orders"), where("userId", "==", auth.currentUser.uid), orderBy("orderDate", "desc"), limit(20));
        const oSnap = await getDocs(oq);
        oSnap.forEach((d) => {
          const data = d.data();
          if (data.paymentType === "dpcoin" || data.paymentType === "vgcoin") {
            historyArr.push({
              id: d.id,
              type: "usage",
              title: `Used for Order #${d.id.slice(-6)}`,
              amount: data.totalAmount,
              status: "completed",
              createdAt: new Date(data.orderDate).getTime(),
            });
          }
        });

        historyArr.sort((a, b) => b.createdAt - a.createdAt);
        setHistory(historyArr);
      } catch (err) {
        console.error("Failed to load history", err);
      }
      setLoading(false);
    };

    fetchHistory();
  }, []);

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    const numAmt = Number(withdrawAmount);
    if (!numAmt || numAmt <= 0) {
      triggerHaptic("error");
      notify("Please enter a valid coin amount to withdraw.", "error");
      return;
    }
    if (numAmt > (userData?.coins || 0)) {
      triggerHaptic("error");
      notify("Insufficient coin balance.", "error");
      return;
    }
    if (!accountNumber.trim()) {
      triggerHaptic("error");
      notify("Please enter your bKash/Nagad number.", "error");
      return;
    }

    triggerHaptic("medium");
    setSubmitting(true);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        coins: increment(-numAmt),
      });

      await addDoc(collection(db, "withdrawals"), {
        userId: auth.currentUser.uid,
        userName: userData?.displayName || auth.currentUser.displayName || "User",
        userEmail: userData?.email || auth.currentUser.email || "",
        userPhone: accountNumber,
        type: "coin",
        paymentMethod,
        accountNumber,
        bkashNumber: accountNumber,
        accountName: accountName || userData?.displayName || "User",
        amount: numAmt,
        coinAmount: numAmt,
        status: "Pending",
        createdAt: Date.now(),
      });

      triggerHaptic("success");
      notify("Withdrawal request submitted! Admin will process your payment soon.", "success");
      setIsWithdrawOpen(false);
      setWithdrawAmount("");
      setAccountNumber("");
      setAccountName("");
    } catch (err: any) {
      triggerHaptic("error");
      notify(err.message || "Failed to submit request.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ds-apple-shop-canvas min-h-screen pb-28">
      <div className="max-w-xl mx-auto px-4 pt-6 space-y-5">
        <div className="px-1">
          <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.022em] text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
            My DP Coins
          </h1>
        </div>
        {/* Balance Card */}
        <div className="rounded-[26px] p-6 sm:p-7 bg-[#1D1D1F] dark:bg-[#1C1C1E] text-white border border-black/[0.08] dark:border-white/[0.1] relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/65 text-[13px] font-medium mb-1">
                Available Balance
              </p>
              <div className="font-semibold text-[42px] leading-none tracking-[-0.03em] flex items-baseline gap-2 tabular-nums">
                {userData?.coins || 0}
                <span className="text-[18px] font-semibold text-white/75">DP</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center">
              <Coins className="w-5 h-5 text-[#FF9F0A]" />
            </div>
          </div>
          <div className="mt-5 inline-flex items-center bg-white/10 px-3.5 py-1.5 rounded-full text-[13px] font-medium text-white/90 tabular-nums">
            1 DP Coin = {formatPrice(1)}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              navigate("/deposit");
            }}
            className="ds-apple-surface p-4 rounded-[20px] flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          >
            <div className="w-10 h-10 bg-[#34C759]/12 text-[#34C759] dark:text-[#30D158] rounded-full flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <span className="font-semibold text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]">
              Deposit
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setIsWithdrawOpen(true);
            }}
            className="ds-apple-surface p-4 rounded-[20px] flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          >
            <div className="w-10 h-10 bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] rounded-full flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="font-semibold text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]">
              Withdraw
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              navigate("/bonus");
            }}
            className="ds-apple-surface p-4 rounded-[20px] flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          >
            <div className="w-10 h-10 bg-[#FF9500]/12 text-[#FF9500] rounded-full flex items-center justify-center">
              <span className="font-semibold text-[13px]">DP</span>
            </div>
            <span className="font-semibold text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]">
              Earn More
            </span>
          </button>
        </div>

        {/* Coin Expiry */}
        <div className="ds-apple-surface rounded-[22px] p-5">
          <h2 className="font-semibold text-[16px] text-[#1D1D1F] dark:text-[#F5F5F7] mb-3">
            Coin Expiry
          </h2>
          {userData?.coinBatches && userData.coinBatches.length > 0 ? (
            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
              {userData.coinBatches.map((batch: any, i: number) => (
                <div key={i} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                  <div>
                    <div className="font-medium text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {batch.type === "deposit" ? "Deposit Coins" : "Earned from Purchase"}
                    </div>
                    <div className="text-[12px] text-[#FF3B30] dark:text-[#FF453A] tabular-nums">
                      Expires: {new Date(batch.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="font-semibold text-[14px] text-[#34C759] dark:text-[#30D158] tabular-nums">
                    {batch.amount} DP
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-3 text-center text-[#6E6E73] dark:text-[#98989D] text-[13px]">
              No coins with expiry dates.
            </div>
          )}
        </div>

        {/* Recent History */}
        <div className="ds-apple-surface rounded-[22px] p-5">
          <h2 className="font-semibold text-[16px] text-[#1D1D1F] dark:text-[#F5F5F7] mb-3">
            Recent History
          </h2>

          {loading ? (
            <div className="py-8 text-center text-[14px] text-[#6E6E73] dark:text-[#98989D]">
              Loading history...
            </div>
          ) : history.length > 0 ? (
            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
              {history.map((h, i) => (
                <div key={i} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        h.type === "deposit"
                          ? "bg-[#34C759]/12 text-[#34C759] dark:text-[#30D158]"
                          : "bg-[#FF3B30]/12 text-[#FF3B30] dark:text-[#FF453A]"
                      }`}
                    >
                      {h.type === "deposit" ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-[14px] text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {h.title}
                      </div>
                      <div className="text-[12px] text-[#6E6E73] dark:text-[#98989D] tabular-nums">
                        {new Date(h.createdAt).toLocaleDateString()} &middot; {h.status}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`font-semibold text-[14px] tabular-nums ${
                      h.type === "deposit"
                        ? "text-[#34C759] dark:text-[#30D158]"
                        : "text-[#1D1D1F] dark:text-[#F5F5F7]"
                    }`}
                  >
                    {h.type === "deposit" ? "+" : "-"}
                    {h.amount} DP
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-[#6E6E73] dark:text-[#98989D] text-[13px]">
              No recent transactions found.
            </div>
          )}
        </div>
      </div>

      {/* Withdrawal Modal */}
      <Modal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        title="Withdraw DP Coins"
      >
        <form onSubmit={handleWithdrawSubmit} className="space-y-4 pt-2">
          <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] p-3.5 rounded-[16px] flex items-center justify-between">
            <div>
              <p className="text-[12px] text-[#6E6E73] dark:text-[#98989D] font-medium">
                Available Coin Balance
              </p>
              <p className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                {userData?.coins || 0} DP Coins
              </p>
            </div>
            <span className="text-[12px] font-semibold text-[#0071E3] dark:text-[#0A84FF] bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 px-3 py-1 rounded-full tabular-nums">
              1 DP = {formatPrice(1)}
            </span>
          </div>

          <div>
            <label className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] mb-1.5 block">
              Withdraw Amount (DP Coins) *
            </label>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="e.g. 500"
              max={userData?.coins || 0}
              required
              className="ds-apple-input w-full h-11 px-3.5 rounded-[14px] text-[14px] tabular-nums"
            />
          </div>

          <div>
            <label className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] mb-1.5 block">
              Payment Method *
            </label>
            <div className="ds-apple-segmented p-1 rounded-[12px] grid grid-cols-2 gap-1">
              {(["bKash", "Nagad"] as const).map((pm) => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setPaymentMethod(pm);
                  }}
                  className={`py-2 rounded-[9px] text-[13px] font-semibold transition-all ${
                    paymentMethod === pm
                      ? "bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm"
                      : "text-[#6E6E73] dark:text-[#98989D]"
                  }`}
                >
                  {pm}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] mb-1.5 block">
              {paymentMethod} Account / Mobile Number *
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="017XXXXXXXX"
              required
              className="ds-apple-input w-full h-11 px-3.5 rounded-[14px] text-[14px] tabular-nums"
            />
          </div>

          <div>
            <label className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] mb-1.5 block">
              Account Holder Name (Optional)
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Name on bKash/Nagad account"
              className="ds-apple-input w-full h-11 px-3.5 rounded-[14px] text-[14px]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="ds-apple-btn-primary w-full py-3.5 px-5 rounded-full font-semibold text-[14px] whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Submitting Request...</span>
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 shrink-0" />
                <span>Request Withdrawal</span>
              </>
            )}
          </button>
        </form>
      </Modal>
    </div>
  );
}

