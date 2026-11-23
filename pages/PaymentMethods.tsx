import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotify } from "../components/Notifications";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Smartphone, Coins, CreditCard } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { triggerHaptic } from "../lib/haptics";
import { APPLE_SPRING_DEFAULT } from "../lib/shoppingRoute";

const PaymentMethods: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();
  const shouldReduceMotion = useReducedMotion();
  const [selected, setSelected] = useState(
    localStorage.getItem("vibe_preferred_payment") || "bKash or Nagad",
  );
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    getDoc(doc(db, "settings", "platform")).then((snap) => {
      if (snap.exists()) setSettings(snap.data());
    });
  }, []);

  void settings;

  const methods = [
    {
      id: "bKash or Nagad",
      subtitle: "Digital Payment",
      Icon: Smartphone,
    },
    {
      id: "DP Coin",
      subtitle: "DP Coin Wallet",
      Icon: Coins,
    },
    {
      id: "Cash on Delivery",
      subtitle: "Doorstep Pay",
      Icon: CreditCard,
    },
  ];

  const handleSave = () => {
    triggerHaptic("success");
    localStorage.setItem("vibe_preferred_payment", selected);
    notify("Payment preference saved!", "success");
    navigate(-1);
  };

  return (
    <div className="ds-apple-shop-canvas min-h-screen flex flex-col pb-24">
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0.16 } : APPLE_SPRING_DEFAULT}
        className="w-full max-w-md mx-auto px-4 pt-5 sm:pt-7 flex-1 flex flex-col"
      >
        <div className="px-1 mb-5">
          <h1 className="ds-apple-display text-[24px] font-semibold tracking-tight">
            Payment Methods
          </h1>
          <p className="text-xs ds-apple-muted mt-0.5">
            Select your default checkout payment method
          </p>
        </div>
        <div className="flex-1 space-y-6">
          <div className="ds-apple-surface rounded-[22px] p-4 sm:p-5">
            <h2 className="ds-apple-eyebrow ds-apple-muted text-[11px] mb-1.5">
              Policy Notice
            </h2>
            <p className="text-xs leading-relaxed ds-apple-muted font-medium">
              Digital payments (bKash &amp; Nagad) help us process your order faster.
              Complete your payment to the corresponding mobile number to confirm your transaction.
            </p>
          </div>

          <div className="space-y-3">
            <p className="ds-apple-eyebrow ds-apple-muted text-[11px] px-1">
              Preferred Method
            </p>
            {methods.map((m) => {
              const IconComp = m.Icon;
              const isSelected = selected === m.id;
              return (
                <motion.button
                  key={m.id}
                  type="button"
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
                  onClick={() => {
                    triggerHaptic();
                    setSelected(m.id);
                  }}
                  className={`ds-apple-surface w-full p-4 rounded-[22px] flex items-center justify-between cursor-pointer text-left transition-all ${
                    isSelected ? "ds-liquid-subpanel-active" : ""
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "bg-[#0071E3]/12 dark:bg-[#0A84FF]/18 ds-apple-accent-text"
                        : "ds-apple-surface-subtle ds-apple-muted"
                    }`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-[15px] truncate">{m.id}</span>
                      <span className="text-xs ds-apple-muted truncate">
                        {m.subtitle}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                      isSelected ? "border-[#0071E3] dark:border-[#0A84FF]" : "border-black/15 dark:border-white/20"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-3 h-3 bg-[#0071E3] dark:bg-[#0A84FF] rounded-full" />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        <motion.button
          type="button"
          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          onClick={handleSave}
          className="ds-apple-btn-primary w-full h-12 rounded-full text-sm font-semibold mt-8 cursor-pointer"
        >
          Apply &amp; Save
        </motion.button>
      </motion.div>
    </div>
  );
};

export default PaymentMethods;

