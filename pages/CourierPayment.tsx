import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Order } from "../types";
import { useNotify } from "../components/Notifications";
import Icon from "../components/Icon";
import { ArrowLeft, Loader2, CreditCard, ShieldCheck } from "lucide-react";
import { formatPrice } from "../lib/utils";

export default function CourierPayment() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    const fetchOrder = async () => {
      try {
        const docRef = doc(db, "orders", orderId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
        } else {
          notify("Order not found", "error");
          navigate(-1);
        }
      } catch (err) {
        notify("Failed to load order", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#EF8020]" />
      </div>
    );
  }

  if (!order) return null;

  // Assuming due amount is roughly totalAmount * 0.2 (20%) if we don't track exact due.
  // Wait, let's just calculate 20% of totalAmount.
  const totalAmount = order.totalAmount || 0;
  const payAmount = Math.ceil(totalAmount * 0.2); // 20%

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderNumber.trim() || !trxId.trim()) {
      notify("Please fill all required fields", "error");
      return;
    }
    
    setSubmitting(true);
    try {
      await updateDoc(doc(db, "orders", order.id), {
        courierPaymentStatus: 'checking',
        courierPaymentDetails: {
          senderNumber: senderNumber.trim(),
          trxId: trxId.trim(),
          amount: payAmount,
          date: Date.now()
        }
      });
      notify("Payment details submitted successfully!", "success");
      // Refresh order locally
      setOrder(prev => prev ? { 
        ...prev, 
        courierPaymentStatus: 'checking',
        courierPaymentDetails: { senderNumber: senderNumber.trim(), trxId: trxId.trim(), amount: payAmount, date: Date.now() }
      } : prev);
    } catch (err) {
      notify("Failed to submit payment", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black flex flex-col font-inter">
      <div className="bg-white dark:bg-[#1A1A1A] px-4 py-4 sticky top-0 z-50 shadow-sm border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight text-zinc-900 dark:text-white">Courier Processing</h1>
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Order #{order.id.slice(0,8)}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-lg w-full mx-auto pb-24">
        {order.courierPaymentStatus === 'completed' ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">Payment Verified</h2>
            <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 mb-6">
              Your courier payment has been verified. Here are the delivery details:
            </p>
            <div className="bg-white dark:bg-zinc-800 rounded-2xl p-4 text-left space-y-3">
              <div>
                <p className="text-xs font-bold text-zinc-500">Courier Name</p>
                <p className="text-sm font-extrabold text-zinc-900 dark:text-white mt-0.5">{order.courierName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-500">Delivery Man Number</p>
                <p className="text-sm font-extrabold text-[#EF8020] mt-0.5">{order.riderNumber || 'N/A'}</p>
              </div>
            </div>
          </div>
        ) : order.courierPaymentStatus === 'checking' ? (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-amber-600 dark:text-amber-400 mb-2">Payment Checking</h2>
            <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
              We are currently verifying your payment. This usually takes a few minutes.
            </p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 shrink-0">
                  <Icon name="alert-circle" className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white leading-tight">Action Required</h2>
                  <p className="text-xs font-semibold text-zinc-500 mt-0.5">Please clear your courier dues</p>
                </div>
              </div>
              <p className="text-sm font-bold leading-relaxed text-zinc-700 dark:text-zinc-300">
                দয়া করে বকেয়া টাকার <span className="text-rose-500">২০% (৳ {formatPrice(payAmount)})</span> পেমেন্ট করুন। <br/>
                <span className="text-rose-500 font-extrabold text-sm underline decoration-rose-500/30 underline-offset-2">পেমেন্ট না করলে ১ দিনের মধ্যে কুরিয়ার থেকে প্রোডাক্ট রিটার্ন চলে যাবে।</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1A1A1A] rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-5">
              <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl mb-2 border border-zinc-200/50 dark:border-zinc-700/50">
                <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Payable Amount:</span>
                <span className="text-xl font-black text-[#EF8020]">৳ {formatPrice(payAmount)}</span>
              </div>

              <div>
                <label className="text-xs font-extrabold text-zinc-500 uppercase tracking-widest block mb-2">Sender Number *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Icon name="phone" className="w-4 h-4 text-zinc-400" />
                  </div>
                  <input 
                    type="tel" 
                    value={senderNumber}
                    onChange={e => setSenderNumber(e.target.value)}
                    required
                    placeholder="e.g. 01700000000"
                    className="w-full pl-11 pr-4 py-4 bg-zinc-50 dark:bg-zinc-800/80 border-none rounded-2xl text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-[#EF8020] transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-zinc-500 uppercase tracking-widest block mb-2">Transaction ID (TrxID) *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Icon name="hash" className="w-4 h-4 text-zinc-400" />
                  </div>
                  <input 
                    type="text" 
                    value={trxId}
                    onChange={e => setTrxId(e.target.value)}
                    required
                    placeholder="e.g. 8A7B6C5D4E"
                    className="w-full pl-11 pr-4 py-4 bg-zinc-50 dark:bg-zinc-800/80 border-none rounded-2xl text-sm font-bold uppercase text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-[#EF8020] transition-all outline-none"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={submitting || !senderNumber.trim() || !trxId.trim()}
                className="w-full h-14 bg-[#EF8020] hover:bg-[#d97017] disabled:opacity-50 text-white rounded-2xl font-bold text-[15px] shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CreditCard className="w-5 h-5" /> Submit Payment</>}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
