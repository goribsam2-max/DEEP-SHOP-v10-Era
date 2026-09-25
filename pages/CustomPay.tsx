import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNotify } from "../components/Notifications";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Check, ArrowLeft, Loader2, Copy } from "lucide-react";
import { formatPrice } from "../lib/utils";

const CustomPay: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const notify = useNotify();

  const amount = searchParams.get("amount") || "";
  const sellerId = searchParams.get("sellerId") || "";

  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [loadingSeller, setLoadingSeller] = useState(true);

  // Form states
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchSeller = async () => {
      if (!sellerId) {
        setLoadingSeller(false);
        return;
      }
      try {
        const docRef = doc(db, "users", sellerId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSellerInfo(docSnap.data());
        }
      } catch (err) {
        console.error("Error fetching seller details:", err);
      } finally {
        setLoadingSeller(false);
      }
    };
    fetchSeller();
  }, [sellerId]);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    notify(`${type} number copied to clipboard!`, "success");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !sellerId) {
      notify("Invalid payment link parameters.", "error");
      return;
    }
    if (!senderNumber || !trxId) {
      notify("Please fill in all required fields.", "error");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser && (!guestName || !guestEmail)) {
      notify("Please provide your name and email to proceed.", "error");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "custom_payments"), {
        amount: Number(amount),
        sellerId: sellerId,
        userId: currentUser?.uid || "guest",
        userEmail: currentUser?.email || guestEmail,
        userName: currentUser?.displayName || guestName || "Guest User",
        senderNumber: senderNumber,
        trxId: trxId,
        status: "pending",
        createdAt: Date.now(),
      });
      setSubmitted(true);
      notify("Payment details submitted successfully!", "success");
    } catch (err) {
      console.error(err);
      notify("Failed to submit payment details.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSeller) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">Loading custom payment...</p>
      </div>
    );
  }

  if (!amount || !sellerId) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-8 max-w-sm w-full text-center border border-zinc-100 dark:border-zinc-800 shadow-xl">
          <p className="text-rose-500 font-bold text-lg mb-2">Invalid Link</p>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-6">This custom payment link is broken or missing parameters.</p>
          <button onClick={() => navigate("/")} className="w-full h-12 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-sm">
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const shopName = sellerInfo?.shopName || "Our Shop";
  const shopLogo = sellerInfo?.photoURL || sellerInfo?.avatarUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80";

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-zinc-950 py-8 px-4 flex justify-center items-center">
      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-zinc-100 dark:border-zinc-800 p-6 md:p-8 flex flex-col gap-6"
          >
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <img src={shopLogo} alt={shopName} className="w-12 h-12 rounded-full object-cover border" />
              <div>
                <h2 className="font-bold text-zinc-950 dark:text-white text-base leading-tight">{shopName}</h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Custom Payment Link</p>
              </div>
            </div>

            {/* Amount Banner */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-zinc-800/40 dark:to-zinc-800/20 rounded-3xl p-6 text-center border border-orange-100/50 dark:border-zinc-800">
              <span className="text-[11px] font-bold text-orange-500 uppercase tracking-widest block mb-1">Amount to Pay</span>
              <span className="text-3xl font-black text-zinc-950 dark:text-white font-mono">{formatPrice(Number(amount))}</span>
            </div>

            {/* Instruction */}
            <div className="flex flex-col gap-3">
              <h3 className="font-bold text-xs text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">Merchant Payment Methods</h3>
              
              {sellerInfo?.bkashNumber && (
                <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/60 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center font-bold text-pink-500 text-xs">bK</div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">bKash (Personal)</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">{sellerInfo.bkashNumber}</p>
                    </div>
                  </div>
                  <button onClick={() => copyToClipboard(sellerInfo.bkashNumber, "bKash")} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 rounded-xl transition text-zinc-500 dark:text-zinc-400">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              )}

              {sellerInfo?.nagadNumber && (
                <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/60 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center font-bold text-orange-500 text-xs font-mono">N</div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">Nagad (Personal)</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">{sellerInfo.nagadNumber}</p>
                    </div>
                  </div>
                  <button onClick={() => copyToClipboard(sellerInfo.nagadNumber, "Nagad")} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 rounded-xl transition text-zinc-500 dark:text-zinc-400">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              )}

              {!sellerInfo?.bkashNumber && !sellerInfo?.nagadNumber && (
                <p className="text-xs font-semibold text-rose-500 text-center py-2 bg-rose-500/5 rounded-2xl border border-rose-500/10">
                  No payment merchant details configured by the seller.
                </p>
              )}
            </div>

            {/* Submission Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <h3 className="font-bold text-xs text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">Submit Payment Details</h3>

              {!auth.currentUser && (
                <div className="flex flex-col gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 rounded-3xl">
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Guest Contact Info</p>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">Your Full Name</label>
                    <input
                      type="text"
                      required
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g., John Doe"
                      className="w-full h-11 px-3.5 text-xs font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">Your Email Address</label>
                    <input
                      type="email"
                      required
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="e.g., john@example.com"
                      className="w-full h-11 px-3.5 text-xs font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">Sender Mobile Number</label>
                <input
                  type="text"
                  required
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  placeholder="e.g., 017XXXXXXXX"
                  className="w-full h-11 px-3.5 text-xs font-semibold bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 text-zinc-900 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">Transaction ID (TrxID)</label>
                <input
                  type="text"
                  required
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  placeholder="e.g., A7B89CF2"
                  className="w-full h-11 px-3.5 text-xs font-semibold bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 text-zinc-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 text-white dark:text-zinc-900 font-bold text-sm rounded-2xl shadow-lg transition flex items-center justify-center gap-2 mt-2"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Submit Custom Payment
                  </>
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-zinc-100 dark:border-zinc-800 p-8 text-center flex flex-col items-center gap-6"
          >
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
              <Check className="w-8 h-8" />
            </div>

            <div>
              <h2 className="font-bold text-zinc-950 dark:text-white text-xl">Payment Details Submitted</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium mt-2">
                Thank you! Your payment verification request of <span className="font-bold text-zinc-800 dark:text-zinc-200">{formatPrice(Number(amount))}</span> has been successfully sent to the seller.
              </p>
              <p className="text-zinc-400 dark:text-zinc-500 text-[10px] mt-2">
                The merchant will verify your payment with TrxID <span className="font-mono font-bold">{trxId}</span> shortly. You can check its approval status in your "My Orders" custom section.
              </p>
            </div>

            <button
              onClick={() => navigate("/orders")}
              className="w-full h-12 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold text-sm shadow-md mt-4"
            >
              Go to My Orders
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomPay;
