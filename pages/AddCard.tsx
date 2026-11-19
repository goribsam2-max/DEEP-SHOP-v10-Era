import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useNotify } from "../components/Notifications";
import { triggerHaptic } from "../lib/haptics";
import { APPLE_SPRING_DEFAULT } from "../lib/shoppingRoute";

const AddCard: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();
  const shouldReduceMotion = useReducedMotion();
  const [holderName, setHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic("success");
    notify("Card preferences updated", "success");
    navigate(-1);
  };

  return (
    <div className="ds-apple-shop-canvas min-h-screen pb-24">
      <motion.form
        onSubmit={handleSave}
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0.16 } : APPLE_SPRING_DEFAULT}
        className="max-w-md mx-auto px-4 pt-5 sm:pt-7 space-y-6"
      >
        <div className="px-1">
          <h1 className="ds-apple-display text-[24px] font-bold tracking-tight">
            Add Card
          </h1>
          <p className="text-xs ds-apple-muted mt-0.5">
            Save card details for faster billing
          </p>
        </div>
        <div className="w-full aspect-[1.6/1] bg-[#1D1D1F] dark:bg-[#2C2C2E] border border-white/10 rounded-[24px] p-6 text-white flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start z-10">
            <div className="w-11 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white/85" />
            </div>
            <span className="font-semibold italic tracking-wide text-sm">VISA</span>
          </div>
          <div className="z-10">
            <p className="text-xl font-mono tabular-nums tracking-wider mb-5">
              {cardNumber || "4716 9627 1635 8047"}
            </p>
            <div className="flex justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] text-white/60 uppercase tracking-wider">Card Holder</p>
                <p className="text-sm font-semibold truncate">{holderName || "Esther Howard"}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-white/60 uppercase tracking-wider">Expires</p>
                <p className="text-sm font-semibold tabular-nums">{expiry || "02/30"}</p>
              </div>
            </div>
          </div>
          <div className="absolute -top-16 -right-16 w-44 h-44 bg-white/[0.06] rounded-full pointer-events-none" />
        </div>

        <div className="ds-apple-surface rounded-[24px] p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium ds-apple-muted">
              Card Holder Name
            </label>
            <input
              type="text"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="Esther Howard"
              className="ds-apple-input w-full h-12 px-4 rounded-2xl outline-none text-[15px]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium ds-apple-muted">
              Card Number
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="4716 9627 1635 8047"
              className="ds-apple-input w-full h-12 px-4 rounded-2xl outline-none text-[15px] tabular-nums"
            />
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium ds-apple-muted">
                Expiry Date
              </label>
              <input
                type="text"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                placeholder="02/30"
                className="ds-apple-input w-full h-12 px-4 rounded-2xl outline-none text-[15px] tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium ds-apple-muted">
                CVV
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                placeholder="000"
                className="ds-apple-input w-full h-12 px-4 rounded-2xl outline-none text-[15px] tabular-nums"
              />
            </div>
          </div>
        </div>

        <motion.button
          type="submit"
          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          className="ds-apple-btn-primary w-full h-12 rounded-full text-sm font-semibold cursor-pointer"
        >
          Add Card
        </motion.button>
      </motion.form>
    </div>
  );
};

export default AddCard;

