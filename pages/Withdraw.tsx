import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  doc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { UserProfile } from "../types";
import { useNotify } from "../components/Notifications";
import { sendWithdrawalRequestToTelegram } from "../services/telegram";
import { formatPrice } from "../lib/utils";
import { CheckCircle2, History } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { CartCheckoutPageSkeleton } from "../components/PageSkeletons";
import { LiquidGlassPopup } from "../components/ui/liquid-glass-popup";
import { APPLE_SPRING_DEFAULT } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

const WithdrawPage: React.FC<{ userData: UserProfile | null }> = ({
  userData,
}) => {
  const navigate = useNavigate();
  const notify = useNotify();
  const shouldReduceMotion = useReducedMotion();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [method, setMethod] = useState("bkash");
  const [mobileNumber, setMobileNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const region = localStorage.getItem("user_region") || "BD";
  const isForeign = region === "IN" || region === "PK";

  useEffect(() => {
    import("firebase/firestore").then(({ getDoc, doc }) => {
      getDoc(doc(db, "settings", "platform")).then((snap) => {
        if (snap.exists()) setConfigs(snap.data());
      });
    });

    if (!userData) {
      if (!auth.currentUser) navigate("/auth-selector");
      return;
    }

    const unsub = onSnapshot(
      query(
        collection(db, "withdrawals"),
        where("userId", "==", userData.uid),
        orderBy("createdAt", "desc"),
      ),
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        setWithdrawals(list);
      },
    );

    if (isForeign) {
      setMethod("bank");
    }

    return () => unsub();
  }, [userData, navigate, isForeign]);

  const handleWithdraw = async () => {
    if (!userData) return;
    const amount = Number(withdrawAmount);
    const minWithdrawal = configs?.affiliateMinWithdrawal ?? 50;

    if (!amount || amount < minWithdrawal) {
      triggerHaptic("error");
      return notify(`Minimum withdraw is ${formatPrice(minWithdrawal, region)}`, "error");
    }
    if (amount > (userData.walletBalance || 0)) {
      triggerHaptic("error");
      return notify("Insufficient balance", "error");
    }

    let withdrawData: any = {
      userId: userData.uid,
      amount,
      method,
      status: "Pending",
      createdAt: Date.now(),
    };

    if (isForeign || method === "bank") {
      if (!bankName) return notify("Enter bank name", "error");
      if (!accountName) return notify("Enter account name", "error");
      if (!bankAccountNumber) return notify("Enter account number", "error");
      if (!routingNumber) return notify("Enter routing number", "error");

      withdrawData = {
        ...withdrawData,
        bankName,
        accountName,
        bankAccountNumber,
        routingNumber,
      };
    } else {
      if (!mobileNumber || mobileNumber.length < 11)
        return notify("Enter valid mobile number", "error");
      if (!accountName) return notify("Enter account name", "error");

      withdrawData = {
        ...withdrawData,
        bkashNumber: mobileNumber,
        accountName,
      };
    }

    triggerHaptic("medium");
    setSubmittingWithdraw(true);
    try {
      await addDoc(collection(db, "withdrawals"), withdrawData);
      await updateDoc(doc(db, "users", userData.uid), {
        walletBalance: (userData.walletBalance || 0) - amount,
      });

      sendWithdrawalRequestToTelegram({
        userId: userData.uid,
        userName: userData.displayName || "Unknown",
        amount,
        method,
        accountNumber: isForeign || method === "bank" ? bankAccountNumber : mobileNumber,
        createdAt: Date.now(),
      });

      triggerHaptic("success");
      setShowSuccessPopup(true);
      setWithdrawAmount("");
      setMobileNumber("");
      setAccountName("");
      setBankName("");
      setBankAccountNumber("");
      setRoutingNumber("");
    } catch (e) {
      triggerHaptic("error");
      notify("Failed to submit request", "error");
    }
    setSubmittingWithdraw(false);
  };

  if (!userData) return <CartCheckoutPageSkeleton />;

  const totalWithdrawn = withdrawals
    .filter((w) => w.status === "Completed")
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="ds-apple-shop-canvas min-h-screen pb-28">
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0.16 } : APPLE_SPRING_DEFAULT}
        className="max-w-2xl mx-auto px-4 pt-5 sm:pt-7 space-y-5"
      >
        <div className="px-1">
          <h1 className="ds-apple-display text-[24px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
            Withdraw Funds
          </h1>
          <p className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-0.5">
            Request a direct payout from your available earnings
          </p>
        </div>
        {/* Wallet Balance Card */}
        <div className="rounded-[26px] p-6 sm:p-7 bg-[#1D1D1F] dark:bg-[#1C1C1E] text-white border border-black/[0.08] dark:border-white/[0.1] shadow-sm">
          <div className="flex flex-wrap justify-between items-end gap-4 mb-5">
            <div>
              <p className="text-white/70 font-medium text-[13px] mb-1">
                Available Balance
              </p>
              <h1 className="text-[36px] sm:text-[42px] font-semibold tracking-[-0.03em] leading-none tabular-nums">
                {formatPrice(userData.walletBalance || 0, region)}
              </h1>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-white/70 font-medium text-[12px] mb-1">
                Withdrawn
              </p>
              <h2 className="text-[20px] font-semibold tracking-[-0.02em] tabular-nums">
                {formatPrice(totalWithdrawn, region)}
              </h2>
            </div>
          </div>

          <div className="flex justify-between items-center bg-white/10 rounded-[14px] px-4 py-3 text-[13px]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#30D158]" />
              <span className="font-medium">Verified Account</span>
            </div>
            <div className="flex items-center gap-2 text-white/85 tabular-nums">
              <History className="w-4 h-4" />
              <span className="font-medium">{withdrawals.length} Requests</span>
            </div>
          </div>
        </div>

        {/* Request Payout Card */}
        <div className="ds-apple-surface rounded-[24px] p-5 sm:p-7">
          <h3 className="text-[19px] font-semibold tracking-[-0.02em] text-[#1D1D1F] dark:text-[#F5F5F7] mb-5">
            Request Payout
          </h3>

          <div className="space-y-5">
            <div>
              <label className="text-[13px] font-semibold text-[#6E6E73] dark:text-[#98989D] mb-2 block">
                Amount to Withdraw
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={configs?.affiliateMinWithdrawal ?? 50}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="ds-apple-input w-full px-4 py-3.5 pr-16 rounded-[14px] font-semibold text-[22px] tabular-nums"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[#6E6E73] dark:text-[#98989D]">
                  {region === "BD" ? "BDT" : region === "IN" ? "INR" : region === "PK" ? "PKR" : "USD"}
                </span>
              </div>
            </div>

            {isForeign ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] mb-1.5 block">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Bank Name"
                    className="ds-apple-input w-full px-3.5 py-3 rounded-[14px] text-[14px]"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] mb-1.5 block">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Account Name"
                    className="ds-apple-input w-full px-3.5 py-3 rounded-[14px] text-[14px]"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] mb-1.5 block">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder="Account Number"
                    className="ds-apple-input w-full px-3.5 py-3 rounded-[14px] text-[14px] tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] mb-1.5 block">
                    Routing / IFSC
                  </label>
                  <input
                    type="text"
                    value={routingNumber}
                    onChange={(e) => setRoutingNumber(e.target.value)}
                    placeholder="Routing Code"
                    className="ds-apple-input w-full px-3.5 py-3 rounded-[14px] text-[14px] tabular-nums"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="ds-apple-segmented p-1 rounded-[14px] flex">
                  {(["bkash", "nagad", "bank"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        triggerHaptic("selection");
                        setMethod(m);
                      }}
                      className={`flex-1 py-2 rounded-[10px] text-[13px] font-semibold transition-all ${
                        method === m
                          ? "bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-sm"
                          : "text-[#6E6E73] dark:text-[#98989D]"
                      }`}
                    >
                      {m === "bkash" ? "bKash" : m === "nagad" ? "Nagad" : "Bank"}
                    </button>
                  ))}
                </div>

                {method === "bank" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Bank Name"
                      className="ds-apple-input w-full px-3.5 py-3 rounded-[14px] text-[14px]"
                    />
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="Account Name"
                      className="ds-apple-input w-full px-3.5 py-3 rounded-[14px] text-[14px]"
                    />
                    <input
                      type="text"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      placeholder="Account Number"
                      className="ds-apple-input w-full px-3.5 py-3 rounded-[14px] text-[14px] tabular-nums"
                    />
                    <input
                      type="text"
                      value={routingNumber}
                      onChange={(e) => setRoutingNumber(e.target.value)}
                      placeholder="Routing Code"
                      className="ds-apple-input w-full px-3.5 py-3 rounded-[14px] text-[14px] tabular-nums"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] mb-1.5 block">
                        Mobile Number ({method === "bkash" ? "bKash" : "Nagad"})
                      </label>
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="ds-apple-input w-full px-3.5 py-3 rounded-[14px] text-[14px] tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] mb-1.5 block">
                        Account Name
                      </label>
                      <input
                        type="text"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="Account Name"
                        className="ds-apple-input w-full px-3.5 py-3 rounded-[14px] text-[14px]"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <button
              type="button"
              onClick={handleWithdraw}
              disabled={submittingWithdraw}
              className="ds-apple-btn-primary w-full py-3.5 rounded-full font-semibold text-[15px] disabled:opacity-50 flex items-center justify-center active:scale-[0.98] transition-transform"
            >
              {submittingWithdraw ? (
                <span className="w-24 h-4 rounded-full ds-skeleton inline-block" />
              ) : (
                "Withdraw"
              )}
            </button>
          </div>
        </div>

        {/* Withdrawals List */}
        <div>
          <h3 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-3 px-1">
            Recent Payouts
          </h3>
          <div className="ds-apple-surface rounded-[22px] overflow-hidden">
            {withdrawals.length === 0 ? (
              <div className="p-8 text-center text-[14px] text-[#6E6E73] dark:text-[#98989D]">
                No withdrawals yet.
              </div>
            ) : (
              <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                {withdrawals.map((w, index) => (
                  <div
                    key={w.id}
                    className="p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-9 h-9 rounded-full bg-[#F5F5F7] dark:bg-[#2C2C2E] flex items-center justify-center text-[13px] font-semibold text-[#6E6E73] dark:text-[#98989D] tabular-nums">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] text-[14px] tabular-nums">
                          {w.method === "bank" ? w.bankAccountNumber : w.bkashNumber}
                        </p>
                        <span
                          className={`text-[11px] font-semibold ${
                            w.status === "Completed"
                              ? "text-[#34C759] dark:text-[#30D158]"
                              : w.status === "Rejected"
                              ? "text-[#FF3B30] dark:text-[#FF453A]"
                              : "text-[#FF9500]"
                          }`}
                        >
                          {w.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] text-[14px] tabular-nums">
                        {formatPrice(w.amount, region)}
                      </p>
                      <p className="text-[12px] text-[#6E6E73] dark:text-[#98989D] tabular-nums">
                        {new Date(w.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <LiquidGlassPopup
        open={showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
        title="Payout Request Sent"
        description="Your request has been placed successfully and will be processed shortly. Allow up to 24–48 hours."
        primaryAction={{
          label: "Go to Dashboard",
          onClick: () => {
            setShowSuccessPopup(false);
            navigate("/affiliate");
          },
        }}
        secondaryAction={{
          label: "Close",
          onClick: () => setShowSuccessPopup(false),
        }}
      />
    </div>
  );
};

export default WithdrawPage;
