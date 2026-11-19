import React, { useState, useEffect } from "react";
import { collection, addDoc, getDoc, doc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNotify } from "../components/Notifications";
import { useNavigate, useLocation } from "react-router-dom";
import { Check, Copy, Smartphone } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { sendDepositRequestToTelegram } from "../services/telegram";
import { APPLE_SPRING_DEFAULT } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

const Deposit: React.FC = () => {
  const location = useLocation();
  const [amount, setAmount] = useState<string>("");
  const [trxId, setTrxId] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [method, setMethod] = useState("bkash");
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [bankSettings, setBankSettings] = useState<any>({});
  const [paymentSettings, setPaymentSettings] = useState<any>(null);

  const notify = useNotify();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const region = localStorage.getItem("user_region") || "BD";
  const isForeign = region === "IN" || region === "PK";

  useEffect(() => {
    if (location.state?.requiredDeposit) {
      setAmount(String(location.state.requiredDeposit));
    }
    if (isForeign) {
      setMethod("bank");
    } else {
      setMethod("bangla_qr");
    }
  }, [location.state, isForeign]);

  useEffect(() => {
    const fetchSettings = async () => {
      const docSnap = await getDoc(doc(db, "settings", "platform"));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBankSettings({
          bankName: data.bankName,
          bankAccountName: data.bankAccountName,
          bankAccountNumber: data.bankAccountNumber,
          bankRoutingNumber: data.bankRoutingNumber,
          bankAccountType: data.bankAccountType,
          bankAddress: data.bankAddress,
        });
      }
      const paySnap = await getDoc(doc(db, "settings", "payments"));
      if (paySnap.exists()) {
        setPaymentSettings(paySnap.data());
      }
    };
    fetchSettings();
  }, []);

  const handleCopy = (key: string, value: string) => {
    if (!value) return;
    triggerHaptic("light");
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    notify("Copied to clipboard", "success");
    setTimeout(() => setCopiedKey(null), 1600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || (!trxId && !isForeign)) {
      triggerHaptic("error");
      return notify("Please fill all required fields", "error");
    }
    if (!isForeign && !senderNumber) {
      triggerHaptic("error");
      return notify("Please enter the sender number", "error");
    }

    triggerHaptic("medium");
    setLoading(true);
    try {
      const depositData = {
        userId: auth.currentUser?.uid,
        userEmail: auth.currentUser?.email,
        amount: Number(amount),
        trxId: trxId || "Bank Transfer",
        senderNumber: senderNumber || "",
        method,
        status: "pending",
        createdAt: Date.now(),
      };
      await addDoc(collection(db, "deposits"), depositData);
      await sendDepositRequestToTelegram(depositData);

      triggerHaptic("success");
      notify("Deposit request sent. Wait for approval.", "success");
      navigate("/profile");
    } catch (err) {
      triggerHaptic("error");
      notify("Deposit failed. Try again.", "error");
      console.error(err);
    }
    setLoading(false);
  };

  const bkashVal = paymentSettings?.npsbNumber || paymentSettings?.bkashNumber || "";
  const nagadVal = paymentSettings?.pathaoPayNumber || paymentSettings?.nagadNumber || "";

  return (
    <div className="ds-apple-shop-canvas min-h-screen pb-28">
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0.16 } : APPLE_SPRING_DEFAULT}
        className="max-w-lg mx-auto px-4 pt-5 sm:pt-7 space-y-5"
      >
        <div className="px-1">
          <h1 className="ds-apple-display text-[24px] font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
            Deposit Funds
          </h1>
          <p className="text-xs text-[#6E6E73] dark:text-[#98989D] mt-0.5">
            Add balance securely via your preferred transfer method
          </p>
        </div>
        <div className="ds-apple-surface rounded-[24px] p-5 sm:p-6">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#6E6E73] dark:text-[#98989D] mb-3">
            Payment Method
          </p>

          {isForeign ? (
            <div className="mb-6">
              <div className="py-3 px-4 rounded-[14px] bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] text-[14px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] text-center">
                Bank Transfer
              </div>
              <div className="mt-4 flex flex-col gap-2.5">
                {[
                  { key: "bank", label: "Bank Name", value: bankSettings?.bankName || "..." },
                  { key: "accName", label: "Account Name", value: bankSettings?.bankAccountName || "..." },
                  { key: "accNum", label: "Account Number", value: bankSettings?.bankAccountNumber || "..." },
                  { key: "routing", label: "Routing Number", value: bankSettings?.bankRoutingNumber || "..." },
                  { key: "type", label: "Account Type", value: bankSettings?.bankAccountType || "..." },
                  { key: "addr", label: "Bank Address", value: bankSettings?.bankAddress || "..." },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex justify-between items-center p-3.5 bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-[14px] border border-black/[0.05] dark:border-white/[0.06] text-sm"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#98989D]">
                        {item.label}
                      </div>
                      <div className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5 tabular-nums truncate">
                        {item.value}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-[12px] font-semibold h-8 px-3 rounded-full bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] text-[#0071E3] dark:text-[#0A84FF] active:scale-95 transition-transform shrink-0"
                      onClick={() => handleCopy(item.key, item.value)}
                    >
                      {copiedKey === item.key ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-5 mb-6 bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.05] dark:border-white/[0.06] rounded-[18px] space-y-4">
              <div>
                <h2 className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] text-[15px] flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />
                  bKash &amp; Nagad Transfer
                </h2>
                <p className="text-[13px] text-[#6E6E73] dark:text-[#98989D] mt-1 leading-relaxed">
                  Send Money or Cash Out the required amount to our official bKash or Nagad number below.
                </p>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex justify-between items-center bg-white dark:bg-[#1C1C1E] p-3.5 rounded-[14px] border border-black/[0.05] dark:border-white/[0.06]">
                  <div>
                    <span className="text-[11px] font-semibold text-[#FF2D55] block">
                      bKash (Send Money)
                    </span>
                    <span className="font-semibold text-[15px] text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                      {bkashVal || "Not available"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-[12px] font-semibold h-8 px-3 rounded-full bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#0071E3] dark:text-[#0A84FF] active:scale-95 transition-transform"
                    onClick={() => handleCopy("bkash", bkashVal)}
                  >
                    {copiedKey === "bkash" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedKey === "bkash" ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                <div className="flex justify-between items-center bg-white dark:bg-[#1C1C1E] p-3.5 rounded-[14px] border border-black/[0.05] dark:border-white/[0.06]">
                  <div>
                    <span className="text-[11px] font-semibold text-[#FF9500] block">
                      Nagad (Send Money)
                    </span>
                    <span className="font-semibold text-[15px] text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                      {nagadVal || "Not available"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-[12px] font-semibold h-8 px-3 rounded-full bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#0071E3] dark:text-[#0A84FF] active:scale-95 transition-transform"
                    onClick={() => handleCopy("nagad", nagadVal)}
                  >
                    {copiedKey === "nagad" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedKey === "nagad" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1.5">
                Amount Sent
              </label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="ds-apple-input w-full px-4 py-3.5 rounded-[14px] text-[15px] tabular-nums"
                placeholder="e.g. 500"
              />
            </div>

            {!isForeign && (
              <div>
                <label className="block text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1.5">
                  Sender Number
                </label>
                <input
                  type="text"
                  required
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  className="ds-apple-input w-full px-4 py-3.5 rounded-[14px] text-[15px] tabular-nums"
                  placeholder="e.g. 01700000000"
                />
              </div>
            )}

            <div>
              <label className="block text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1.5">
                Transaction ID (TrxID) / Ref {isForeign && "(Optional)"}
              </label>
              <input
                type="text"
                required={!isForeign}
                value={trxId}
                onChange={(e) => setTrxId(e.target.value)}
                className="ds-apple-input w-full px-4 py-3.5 rounded-[14px] text-[15px]"
                placeholder="e.g. 8H3KJ2L9A"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="ds-apple-btn-primary w-full py-3.5 mt-2 rounded-full text-[15px] font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Deposit;
