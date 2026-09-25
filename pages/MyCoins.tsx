import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, limit, doc, onSnapshot, addDoc, updateDoc, increment } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { Coins, ArrowRight, ArrowDownLeft, ArrowUpRight, Wallet, Loader2 } from "lucide-react";
import { useRegion } from "../components/RegionContext";
import { useNotify } from "../components/Notifications";
import Modal from "../components/ui/modal-drop";

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
    const unsub = onSnapshot(doc(db, "users", auth.currentUser.uid), (doc) => setUserData(doc.data()));
    return unsub;
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!auth.currentUser) return;
      
      try {
        const historyArr = [];
        // Fetch recent deposits
        const dq = query(collection(db, "deposits"), where("userId", "==", auth.currentUser.uid), orderBy("createdAt", "desc"), limit(10));
        const dSnap = await getDocs(dq);
        dSnap.forEach(d => {
            const data = d.data();
            historyArr.push({
                id: d.id,
                type: 'deposit',
                title: 'Coin Deposit',
                amount: data.amount,
                status: data.status,
                createdAt: data.createdAt,
            });
        });

        // Fetch recent withdrawals
        const wq = query(collection(db, "withdrawals"), where("userId", "==", auth.currentUser.uid), orderBy("createdAt", "desc"), limit(10));
        const wSnap = await getDocs(wq);
        wSnap.forEach(d => {
            const data = d.data();
            historyArr.push({
                id: d.id,
                type: 'withdraw',
                title: `Coin Withdrawal (${data.paymentMethod || 'bKash'})`,
                amount: data.coinAmount || data.amount,
                status: data.status,
                createdAt: data.createdAt,
            });
        });
        
        // Fetch recent orders where VG coin was used
        const oq = query(collection(db, "orders"), where("userId", "==", auth.currentUser.uid), orderBy("orderDate", "desc"), limit(20));
        const oSnap = await getDocs(oq);
        oSnap.forEach(d => {
            const data = d.data();
            if (data.paymentType === 'vgcoin') {
                historyArr.push({
                    id: d.id,
                    type: 'usage',
                    title: `Used for Order #${d.id.slice(-6)}`,
                    amount: data.totalAmount,
                    status: 'completed',
                    createdAt: new Date(data.orderDate).getTime(),
                });
            }
        });

        // Sort combined history safely
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
      notify("Please enter a valid coin amount to withdraw.", "error");
      return;
    }
    if (numAmt > (userData?.coins || 0)) {
      notify("Insufficient coin balance.", "error");
      return;
    }
    if (!accountNumber.trim()) {
      notify("Please enter your bKash/Nagad number.", "error");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Deduct coins from user balance
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        coins: increment(-numAmt)
      });

      // 2. Create withdrawal doc
      await addDoc(collection(db, "withdrawals"), {
        userId: auth.currentUser.uid,
        userName: userData?.displayName || auth.currentUser.displayName || "User",
        userEmail: userData?.email || auth.currentUser.email || "",
        userPhone: accountNumber,
        type: "coin",
        paymentMethod: paymentMethod,
        accountNumber: accountNumber,
        bkashNumber: accountNumber,
        accountName: accountName || userData?.displayName || "User",
        amount: numAmt,
        coinAmount: numAmt,
        status: "Pending",
        createdAt: Date.now()
      });

      notify("Withdrawal request submitted! Admin will process your payment soon.", "success");
      setIsWithdrawOpen(false);
      setWithdrawAmount("");
      setAccountNumber("");
      setAccountName("");
    } catch (err: any) {
      notify(err.message || "Failed to submit request.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-8 min-h-screen animate-fade-in">
        <h1 className="text-2xl font-black mb-6 text-zinc-900 dark:text-zinc-100">My DP Coins</h1>
        
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-[32px] p-8 text-white mb-8 shadow-xl shadow-orange-500/20 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 opacity-20 transform rotate-12">
               <Coins className="w-48 h-48" />
            </div>
            
            <p className="text-amber-100 font-bold mb-1 relative z-10 flex items-center gap-2">
                Available Balance
            </p>
            <div className="font-black text-5xl tracking-tight relative z-10 flex items-baseline gap-2">
                {userData?.coins || 0} <span className="text-2xl opacity-80">DP</span>
            </div>
            <div className="mt-6 flex items-center gap-3 relative z-10">
                <span className="bg-black/20 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold">1 DP Coin = {formatPrice(1)}</span>
            </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
            <button onClick={() => navigate('/deposit')} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors active:scale-95 shadow-sm">
                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                    <ArrowDownLeft className="w-5 h-5"/>
                </div>
                <span className="font-bold text-xs">Deposit</span>
            </button>
            <button onClick={() => setIsWithdrawOpen(true)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors active:scale-95 shadow-sm">
                <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                    <Wallet className="w-5 h-5"/>
                </div>
                <span className="font-bold text-xs">Withdraw</span>
            </button>
            <button onClick={() => navigate('/bonus')} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors active:scale-95 shadow-sm">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                    <span className="font-black">DP</span>
                </div>
                <span className="font-bold text-xs">Earn More</span>
            </button>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-6 shadow-sm mb-8">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">Coin Expiry</h2>
            {userData?.coinBatches && userData.coinBatches.length > 0 ? (
                <div className="flex flex-col gap-4">
                    {userData.coinBatches.map((batch: any, i: number) => (
                        <div key={i} className="flex justify-between items-center py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0 last:pb-0">
                            <div>
                                <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{batch.type === 'deposit' ? 'Deposit Coins' : 'Earned from Purchase'}</div>
                                <div className="text-xs font-medium text-red-500">Expires: {new Date(batch.expiresAt).toLocaleDateString()}</div>
                            </div>
                            <div className="font-bold text-green-500">
                                {batch.amount} DP
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-4 text-center text-zinc-500 font-medium text-sm">No coins with expiry dates.</div>
            )}
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-6 shadow-sm">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">Recent History</h2>
            
            {loading ? (
                <div className="py-10 text-center text-zinc-500 font-medium">Loading history...</div>
            ) : history.length > 0 ? (
                <div className="flex flex-col gap-4">
                    {history.map((h, i) => (
                        <div key={i} className="flex justify-between items-center py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0 last:pb-0">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${h.type === 'deposit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {h.type === 'deposit' ? <ArrowDownLeft className="w-5 h-5"/> : <ArrowUpRight className="w-5 h-5"/>}
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{h.title}</div>
                                    <div className="text-xs font-medium text-zinc-500">{new Date(h.createdAt).toLocaleDateString()} &middot; {h.status}</div>
                                </div>
                            </div>
                            <div className={`font-bold ${h.type === 'deposit' ? 'text-green-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                {h.type === 'deposit' ? '+' : '-'}{h.amount} DP
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-10 text-center text-zinc-500 font-medium text-sm">No recent transations found.</div>
            )}
        </div>

        {/* Withdrawal Modal */}
        <Modal isOpen={isWithdrawOpen} onClose={() => setIsWithdrawOpen(false)} title="Withdraw DP Coins (উইথড্র)">
          <form onSubmit={handleWithdrawSubmit} className="space-y-4 pt-2">
            <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Available Coin Balance</p>
                <p className="text-lg font-black text-amber-700 dark:text-amber-300">{userData?.coins || 0} DP Coins</p>
              </div>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/20 px-2.5 py-1 rounded-lg">
                1 DP = ৳1
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                Withdraw Amount (DP Coins / ৳) *
              </label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="e.g. 500"
                max={userData?.coins || 0}
                required
                className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                Payment Method (পেমেন্ট মেথড) *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("bKash")}
                  className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    paymentMethod === "bKash"
                      ? "border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-400"
                      : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  bKash (বিকাশ)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("Nagad")}
                  className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    paymentMethod === "Nagad"
                      ? "border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                      : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  Nagad (নগদ)
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                {paymentMethod} Account / Mobile Number *
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="017XXXXXXXX"
                required
                className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                Account Holder Name (Optional)
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Name on bKash/Nagad account"
                className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4" />
                  <span>Request Withdrawal</span>
                </>
              )}
            </button>
          </form>
        </Modal>
    </div>
  );
}
