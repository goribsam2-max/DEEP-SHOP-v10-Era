import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Save,
  DollarSign,
  Calendar,
  Layers,
  ShieldCheck,
  Award,
  Wallet,
  AlertCircle,
  HelpCircle,
  Eye,
  Star
} from "lucide-react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNotify } from "../components/Notifications";
import SEO from "../components/SEO";

export const CreatorSubscriptionSetup: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify ? useNotify() : { success: console.log, error: console.error };
  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [perPostEnabled, setPerPostEnabled] = useState(true);
  const [perPostPrice, setPerPostPrice] = useState("500");

  const [monthlyEnabled, setMonthlyEnabled] = useState(true);
  const [monthlyPrice, setMonthlyPrice] = useState("200");

  const [yearlyEnabled, setYearlyEnabled] = useState(true);
  const [yearlyPrice, setYearlyPrice] = useState("1800");

  const [welcomeMessage, setWelcomeMessage] = useState(
    "Thank you for sponsoring my consumer protection scam investigation reports!"
  );

  const [payoutMethod, setPayoutMethod] = useState<"bkash" | "nagad">("bkash");
  const [payoutNumber, setPayoutNumber] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "creator_monetization_settings", u.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.perPostEnabled !== undefined) setPerPostEnabled(data.perPostEnabled);
          if (data.perPostPrice) setPerPostPrice(data.perPostPrice.toString());
          if (data.monthlyEnabled !== undefined) setMonthlyEnabled(data.monthlyEnabled);
          if (data.monthlyPrice) setMonthlyPrice(data.monthlyPrice.toString());
          if (data.yearlyEnabled !== undefined) setYearlyEnabled(data.yearlyEnabled);
          if (data.yearlyPrice) setYearlyPrice(data.yearlyPrice.toString());
          if (data.welcomeMessage) setWelcomeMessage(data.welcomeMessage);
          if (data.payoutMethod) setPayoutMethod(data.payoutMethod);
          if (data.payoutNumber) setPayoutNumber(data.payoutNumber);
        }
      } catch (err) {
        console.error("Error loading creator settings:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      notify.error("Please login to save creator monetization settings.");
      return;
    }

    if (!payoutNumber.trim()) {
      notify.error("Please provide your bKash or Nagad wallet number for payouts.");
      return;
    }

    setSaving(true);
    try {
      const docRef = doc(db, "creator_monetization_settings", user.uid);
      await setDoc(
        docRef,
        {
          userId: user.uid,
          userDisplayName: user.displayName || "Investigator",
          userEmail: user.email || "",
          perPostEnabled,
          perPostPrice: Number(perPostPrice) || 0,
          monthlyEnabled,
          monthlyPrice: Number(monthlyPrice) || 0,
          yearlyEnabled,
          yearlyPrice: Number(yearlyPrice) || 0,
          welcomeMessage,
          payoutMethod,
          payoutNumber: payoutNumber.trim(),
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );

      // Also update user profile sponsor tiers summary
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          sponsorPricing: {
            perPost: perPostEnabled ? Number(perPostPrice) || 0 : null,
            monthly: monthlyEnabled ? Number(monthlyPrice) || 0 : null,
            yearly: yearlyEnabled ? Number(yearlyPrice) || 0 : null
          }
        },
        { merge: true }
      );

      notify.success("Sponsorship & subscription rates saved successfully!");
      setTimeout(() => {
        navigate("/creator-dashboard");
      }, 700);
    } catch (err: any) {
      console.error("Error saving settings:", err);
      notify.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-slate-100 relative">
      <SEO
        title="Creator Subscription & Sponsorship Setup | DEEP SHOP"
        description="Configure your per-post, monthly, and yearly sponsorship tiers and payout wallet."
      />

      {/* Top subtle blue fade gradient glow per user specification */}
      <div className="absolute top-0 left-0 right-0 h-64 pointer-events-none bg-gradient-to-b from-blue-500/10 via-blue-500/5 to-transparent dark:from-blue-600/15 dark:via-blue-600/5 dark:to-transparent" />

      <div className="max-w-3xl mx-auto px-4 py-6 relative z-10">
        {/* Header bar */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-zinc-900 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => navigate(-1)}
              aria-label="Back"
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-slate-700 dark:text-zinc-200 shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap truncate">
                Sponsorship & Subscription Setup
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 whitespace-nowrap truncate">
                Set custom rates for community sponsorship and perks.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate(`/author/${user?.uid || "me"}`)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 transition-colors shrink-0 whitespace-nowrap"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview Profile
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading your tier configuration...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Banner info */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div className="text-[11px] sm:text-xs text-blue-950 dark:text-blue-200 whitespace-nowrap truncate">
                <span className="font-semibold">Direct Creator Economy:</span> Payments are settled directly to your bKash/Nagad wallet.
              </div>
            </div>

            {/* Tier 1: Per-Post Sponsorship */}
            <div className="bg-slate-50 dark:bg-zinc-900/70 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 transition-all">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                    <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap truncate">
                      Per-Post Scam Investigation Sponsorship
                    </h3>
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-zinc-400 whitespace-nowrap truncate">
                      Charge community members to sponsor dedicated scam reports.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={perPostEnabled}
                    onChange={(e) => setPerPostEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 sm:w-11 h-5 sm:h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 sm:after:h-5 after:w-4 sm:after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {perPostEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-zinc-800">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1 whitespace-nowrap">
                      Fee per Sponsored Post (৳ BDT)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        ৳
                      </span>
                      <input
                        type="number"
                        min="50"
                        step="50"
                        value={perPostPrice}
                        onChange={(e) => setPerPostPrice(e.target.value)}
                        placeholder="500"
                        className="w-full pl-7 pr-3 py-2 bg-white dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 font-bold text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col justify-center text-[10px] sm:text-xs text-slate-500 dark:text-zinc-400 space-y-1 overflow-hidden">
                    <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Sponsor name banner on post header</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Priority verified investigative report</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tier 2: Monthly Supporter Membership */}
            <div className="bg-slate-50 dark:bg-zinc-900/70 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 transition-all">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap truncate">
                      Monthly Membership Subscription
                    </h3>
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-zinc-400 whitespace-nowrap truncate">
                      Recurring monthly support from your loyal community followers.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={monthlyEnabled}
                    onChange={(e) => setMonthlyEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 sm:w-11 h-5 sm:h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 sm:after:h-5 after:w-4 sm:after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {monthlyEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-zinc-800">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1 whitespace-nowrap">
                      Monthly Fee (৳ BDT / Month)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        ৳
                      </span>
                      <input
                        type="number"
                        min="50"
                        step="50"
                        value={monthlyPrice}
                        onChange={(e) => setMonthlyPrice(e.target.value)}
                        placeholder="200"
                        className="w-full pl-7 pr-3 py-2 bg-white dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 font-bold text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col justify-center text-[10px] sm:text-xs text-slate-500 dark:text-zinc-400 space-y-1 overflow-hidden">
                    <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Supporter badge next to user comments</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Direct inbox messaging with author</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tier 3: Yearly VIP Pass */}
            <div className="bg-slate-50 dark:bg-zinc-900/70 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 transition-all">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
                    <Award className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap truncate">
                        Yearly VIP Patron Pass
                      </h3>
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap shrink-0">
                        BEST VALUE
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-zinc-400 whitespace-nowrap truncate">
                      Annual upfront commitment with built-in discount.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={yearlyEnabled}
                    onChange={(e) => setYearlyEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 sm:w-11 h-5 sm:h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 sm:after:h-5 after:w-4 sm:after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {yearlyEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60 dark:border-zinc-800">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5">
                      Yearly Fee (৳ BDT / Year)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                        ৳
                      </span>
                      <input
                        type="number"
                        min="500"
                        step="100"
                        value={yearlyPrice}
                        onChange={(e) => setYearlyPrice(e.target.value)}
                        placeholder="1800"
                        className="w-full pl-8 pr-4 py-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col justify-center text-xs text-slate-500 dark:text-zinc-400 space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Gold VIP Shield badge across all news feeds
                    </div>
                    <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Free inclusion of 3 custom business scam alerts
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Payout Information */}
            <div className="bg-slate-50 dark:bg-zinc-900/70 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Creator Payout Wallet
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Sponsorship payments will be transferred directly to this mobile wallet.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-slate-200/60 dark:border-zinc-800">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("bkash")}
                    className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold border flex items-center justify-center gap-2 transition-all ${
                      payoutMethod === "bkash"
                        ? "bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-600 dark:text-rose-400 shadow-sm"
                        : "bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400"
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-rose-500" />
                    bKash Personal
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayoutMethod("nagad")}
                    className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold border flex items-center justify-center gap-2 transition-all ${
                      payoutMethod === "nagad"
                        ? "bg-orange-50 dark:bg-orange-950/40 border-orange-500 text-orange-600 dark:text-orange-400 shadow-sm"
                        : "bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400"
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-orange-500" />
                    Nagad Personal
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5">
                    Your {payoutMethod === "bkash" ? "bKash" : "Nagad"} Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={payoutNumber}
                    onChange={(e) => setPayoutNumber(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5">
                    Custom Welcome / Thank You Message
                  </label>
                  <textarea
                    rows={2}
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate("/creator-dashboard")}
                className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Pricing & Rates
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
export default CreatorSubscriptionSetup;
