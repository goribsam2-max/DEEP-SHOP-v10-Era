import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Handshake,
  Check,
  Copy,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  MessageSquare,
  Send,
  Calendar,
  FileText,
  Sparkles,
} from "lucide-react";
import { auth, db } from "../firebase";
import {
  doc,
  addDoc,
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useNotify } from "../components/Notifications";
import { triggerHaptic } from "../lib/haptics";
import SEO from "../components/SEO";
import { ProfileSettingsPageSkeleton } from "../components/PageSkeletons";
import { getSafeDisplayName, getSafePublicUsername } from "../lib/utils";
import {
  extractConfiguredMobileAccounts,
  getMobileActionLabel,
  getNextRefreshSeed,
  pickAccountBySeed,
} from "../lib/dhakaTime";

type SponsorTierId = "monthly" | "per_post" | "yearly" | "custom";

interface SponsorPlanOption {
  id: SponsorTierId;
  title: string;
  cadence: string;
  bdt: number;
  summary: string;
  icon: React.FC<{ className?: string }>;
}

const SPONSOR_PLANS: SponsorPlanOption[] = [
  {
    id: "monthly",
    title: "Monthly Supporter",
    cadence: "Monthly",
    bdt: 300,
    summary: "Ongoing monthly backing for regular posts & reels",
    icon: Calendar,
  },
  {
    id: "per_post",
    title: "Sponsored Post",
    cadence: "Single post",
    bdt: 500,
    summary: "Commission or sponsor a dedicated post or feature",
    icon: FileText,
  },
  {
    id: "yearly",
    title: "Annual Patron",
    cadence: "Yearly · Save 15%",
    bdt: 3000,
    summary: "Year-round partner recognition & priority collaboration",
    icon: ShieldCheck,
  },
  {
    id: "custom",
    title: "Custom Amount",
    cadence: "Flexible",
    bdt: 1000,
    summary: "Set your own BDT budget for custom campaigns",
    icon: Sparkles,
  },
];

export const SponsorCreator: React.FC = () => {
  const { creatorId } = useParams<{ creatorId: string }>();
  const navigate = useNavigate();
  const notify = useNotify();

  const [currentUser, setCurrentUser] = useState<any>(() => auth.currentUser);
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [tierType, setTierType] = useState<SponsorTierId>("monthly");
  const [selectedAmount, setSelectedAmount] = useState<number>(300);
  const [customAmount, setCustomAmount] = useState<string>("1000");
  const [sponsorNote, setSponsorNote] = useState<string>("");

  const [paymentMethod, setPaymentMethod] = useState<"bkash" | "nagad">(
    "bkash"
  );
  const [senderPhone, setSenderPhone] = useState("");
  const [trxId, setTrxId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [refreshSeed] = useState<number>(() =>
    getNextRefreshSeed(`sponsor_${creatorId || "default"}`)
  );

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => {
      setCurrentUser(u);
    });

    if (!creatorId) {
      setLoading(false);
      return () => {
        unsubAuth();
      };
    }

    setLoading(true);
    const unsubCreator = onSnapshot(
      doc(db, "users", creatorId),
      (snap) => {
        if (snap.exists()) {
          setCreator({ id: snap.id, ...snap.data() });
        } else {
          setCreator({
            id: creatorId,
            displayName: "Community Creator",
            username: "",
            photoURL: "",
            bio: "Creator & Community Member on DEEP SHOP Loops.",
          });
        }
        setLoading(false);
      },
      () => {
        setCreator({
          id: creatorId,
          displayName: "Community Creator",
          username: "",
          photoURL: "",
          bio: "Creator & Community Member on DEEP SHOP Loops.",
        });
        setLoading(false);
      }
    );

    return () => {
      unsubAuth();
      unsubCreator();
    };
  }, [creatorId]);

  // Creator's own configured payment accounts from Creator Dashboard
  const configuredAccounts = useMemo(
    () => extractConfiguredMobileAccounts(creator),
    [creator]
  );

  const rotatedBkash = useMemo(
    () => pickAccountBySeed(configuredAccounts.bkash, refreshSeed),
    [configuredAccounts.bkash, refreshSeed]
  );
  const rotatedNagad = useMemo(
    () => pickAccountBySeed(configuredAccounts.nagad, refreshSeed),
    [configuredAccounts.nagad, refreshSeed]
  );

  const hasBkash = Boolean(rotatedBkash);
  const hasNagad = Boolean(rotatedNagad);

  useEffect(() => {
    if (paymentMethod === "bkash" && !hasBkash && hasNagad) {
      setPaymentMethod("nagad");
    } else if (paymentMethod === "nagad" && !hasNagad && hasBkash) {
      setPaymentMethod("bkash");
    }
  }, [hasBkash, hasNagad, paymentMethod]);

  const activeAccount =
    paymentMethod === "bkash" ? rotatedBkash : rotatedNagad;

  const activeAmount =
    tierType === "custom" ? Number(customAmount) || 0 : selectedAmount;

  const creatorName = getSafeDisplayName(creator, "Creator");
  const creatorHandle = getSafePublicUsername(creator);
  const creatorAvatar =
    (creator?.photoURL && String(creator.photoURL).trim()) ||
    (creator?.avatarUrl && String(creator.avatarUrl).trim()) ||
    (creator?.shopLogo && String(creator.shopLogo).trim()) ||
    "";
  const creatorInitial = (creatorName || "C").trim().charAt(0).toUpperCase();

  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    triggerHaptic();
    notify(`${label} number copied`, "success");
    setTimeout(() => setCopiedKey(null), 2400);
  };

  const handleSponsorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      notify("Please sign in to sponsor creators", "error");
      navigate("/signin", { state: { returnTo: `/sponsor/${creatorId}` } });
      return;
    }

    if (!activeAccount) {
      notify(
        "This creator has not added a payment number in Creator Dashboard yet.",
        "error"
      );
      return;
    }

    if (activeAmount < 50) {
      notify("Minimum sponsorship amount is ৳50 BDT", "error");
      return;
    }

    if (!senderPhone.trim() || !trxId.trim()) {
      notify("Please enter your sender phone number and TrxID", "error");
      return;
    }

    setIsSubmitting(true);
    triggerHaptic();

    try {
      const officialNum = activeAccount.number;
      const cleanTrx = trxId.trim().toUpperCase();
      const cleanNote = sponsorNote.trim();
      const supporterName = getSafeDisplayName(
        currentUser,
        currentUser.email?.split("@")[0] || "Supporter"
      );

      await addDoc(collection(db, "sponsor_requests"), {
        sponsorUserId: currentUser.uid,
        sponsorName: supporterName,
        sponsorEmail: currentUser.email || "",
        creatorUserId: creatorId,
        creatorName,
        tierType,
        amountBDT: activeAmount,
        note: cleanNote,
        paymentMethod,
        senderPhone: senderPhone.trim(),
        trxId: cleanTrx,
        officialNumber: officialNum,
        officialAccountType: activeAccount.type,
        status: "pending",
        createdAt: Date.now(),
      });

      let targetChatId = "";
      if (creatorId && creatorId !== currentUser.uid) {
        try {
          const qExisting = query(
            collection(db, "p2p_chats"),
            where("participants", "array-contains", currentUser.uid)
          );
          const snapExisting = await getDocs(qExisting);
          const foundDoc = snapExisting.docs.find((d) => {
            const data = d.data();
            const p = data.participants;
            return (
              Array.isArray(p) &&
              p.includes(creatorId) &&
              !data.isGroup &&
              data.type !== "group"
            );
          });

          if (foundDoc) {
            targetChatId = foundDoc.id;
          } else {
            const newChatRef = await addDoc(collection(db, "p2p_chats"), {
              participants: [currentUser.uid, creatorId],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              lastMessage: `Sponsorship Request · ৳${activeAmount} BDT`,
              lastSenderId: currentUser.uid,
              seenBy: [currentUser.uid],
            });
            targetChatId = newChatRef.id;
          }

          const tierLabels: Record<SponsorTierId, string> = {
            monthly: "Monthly Supporter",
            yearly: "Annual Patron",
            per_post: "Sponsored Post",
            custom: "Custom Sponsorship",
          };

          const receiptLines = [
            `SPONSORSHIP REQUEST SUBMITTED`,
            ``,
            `Creator: ${creatorName}${creatorHandle ? ` (@${creatorHandle})` : ""}`,
            `Plan: ${tierLabels[tierType]}`,
            `Amount: ৳${activeAmount.toLocaleString()} BDT`,
            `Gateway: ${paymentMethod.toUpperCase()} (${officialNum} · ${activeAccount.type})`,
            `Sender Phone: ${senderPhone.trim()}`,
            `Transaction ID: ${cleanTrx}`,
          ];
          if (cleanNote) {
            receiptLines.push(`Note: ${cleanNote}`);
          }
          receiptLines.push(``, `Status: Pending Creator Verification`);

          await addDoc(
            collection(db, "p2p_chats", targetChatId, "messages"),
            {
              text: receiptLines.join("\n"),
              senderId: currentUser.uid,
              senderName: supporterName,
              senderPhoto: currentUser.photoURL || "",
              createdAt: Date.now(),
              timestamp: serverTimestamp(),
              seenBy: [currentUser.uid],
            }
          );

          await updateDoc(doc(db, "p2p_chats", targetChatId), {
            updatedAt: serverTimestamp(),
            lastMessage: `Sponsorship Request · ৳${activeAmount} BDT`,
            lastSenderId: currentUser.uid,
            seenBy: [currentUser.uid],
          });
        } catch (chatErr) {
          console.warn(
            "Could not dispatch receipt message to site inbox:",
            chatErr
          );
        }
      }

      notify(
        `Sponsorship request of ৳${activeAmount.toLocaleString()} sent to ${creatorName}`,
        "success"
      );

      if (targetChatId) {
        navigate(`/messages?chatId=${targetChatId}`);
      } else {
        navigate(`/loops/profile/${creatorId}`);
      }
    } catch {
      notify(
        "Failed to submit sponsorship request. Please try again.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !creator) {
    return <ProfileSettingsPageSkeleton />;
  }

  const activePlanMeta =
    SPONSOR_PLANS.find((p) => p.id === tierType) || SPONSOR_PLANS[0];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#090A0D] text-zinc-900 dark:text-zinc-100 font-sans pb-24">
      <SEO
        title={`Sponsor ${creatorName} · DEEP SHOP`}
        description={`Partner with or sponsor ${creatorName} directly on DEEP SHOP Loops.`}
      />

      {/* STICKY HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#090A0D]/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200 transition cursor-pointer shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Handshake className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-950 dark:text-white truncate">
                  Sponsor Creator
                </h1>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate hidden sm:block">
                100% direct creator payout · Instant receipt in Messages
              </p>
            </div>
          </div>

          {creatorId && currentUser?.uid !== creatorId && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                navigate(`/messages?uid=${encodeURIComponent(creatorId)}`);
              }}
              className="min-h-[40px] px-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>Message</span>
            </button>
          )}
        </div>
      </header>

      {/* RESPONSIVE 2-COLUMN CONTAINER */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: CREATOR CARD & LIVE SUMMARY */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
            {/* Creator Card */}
            <section className="rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 p-5 space-y-4 shadow-2xs">
              <div className="flex items-center gap-3.5">
                <div className="relative shrink-0">
                  {creatorAvatar ? (
                    <img
                      src={creatorAvatar}
                      alt={creatorName}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                    />
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-xl font-bold">
                      {creatorInitial}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-2 ring-white dark:ring-zinc-900">
                    <Handshake className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white truncate">
                      {creatorName}
                    </h2>
                    <CheckCircle2 className="w-4 h-4 text-[#0095F6] shrink-0" />
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 truncate">
                    {creatorHandle ? `@${creatorHandle}` : "Verified Creator"}
                  </p>
                </div>
              </div>

              {creator.bio && (
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                  {creator.bio}
                </p>
              )}
            </section>

            {/* Sponsorship Summary Breakdown */}
            <section className="rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 p-5 space-y-3.5 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Sponsorship Summary
              </h3>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs sm:text-sm">
                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Selected tier
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {activePlanMeta.title}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Schedule
                  </span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {activePlanMeta.cadence}
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Creator share
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    100% Direct
                  </span>
                </div>

                <div className="pt-3 flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    Total amount
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    ৳{activeAmount.toLocaleString()} BDT
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200/70 dark:border-zinc-800/80 p-3 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed flex items-start gap-2">
                <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Once submitted, a verified sponsorship receipt is
                  automatically delivered to your direct chat with {creatorName}
                  .
                </span>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: STEPS 1, 2, 3 */}
          <div className="lg:col-span-7 space-y-5">
            {/* STEP 1: CHOOSE PLAN */}
            <section className="rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 p-4 sm:p-6 space-y-4 shadow-2xs">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white">
                  1. Choose sponsorship plan
                </h3>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Min ৳50 BDT
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SPONSOR_PLANS.map((plan) => {
                  const IconComp = plan.icon;
                  const isSelected = tierType === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        setTierType(plan.id);
                        if (plan.id !== "custom") {
                          setSelectedAmount(plan.bdt);
                        }
                      }}
                      className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between gap-3 cursor-pointer active:scale-[0.99] ${
                        isSelected
                          ? "bg-emerald-500/[0.07] dark:bg-emerald-500/[0.12] border-emerald-600 dark:border-emerald-500 ring-1 ring-emerald-600 dark:ring-emerald-500"
                          : "bg-zinc-50/70 dark:bg-zinc-950/50 border-zinc-200/90 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            isSelected
                              ? "bg-emerald-600 text-white"
                              : "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                          {plan.cadence}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-bold text-zinc-950 dark:text-white">
                            {plan.title}
                          </span>
                          <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                            {plan.id === "custom"
                              ? "Custom"
                              : `৳${plan.bdt.toLocaleString()}`}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                          {plan.summary}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {tierType === "custom" && (
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                  <label
                    htmlFor="custom-sponsor-bdt"
                    className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5"
                  >
                    Enter custom sponsorship amount (BDT)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500">
                      ৳
                    </span>
                    <input
                      id="custom-sponsor-bdt"
                      type="number"
                      min={50}
                      placeholder="1000"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full h-11 pl-8 pr-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-emerald-600 text-base font-bold tabular-nums outline-none text-zinc-950 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Optional Sponsorship Note */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="sponsor-brief-note"
                    className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300"
                  >
                    Campaign or support note (optional)
                  </label>
                  <span className="text-xs text-zinc-400 tabular-nums">
                    {sponsorNote.length}/200
                  </span>
                </div>
                <textarea
                  id="sponsor-brief-note"
                  rows={2}
                  maxLength={200}
                  value={sponsorNote}
                  onChange={(e) => setSponsorNote(e.target.value)}
                  placeholder="Share brand details, collaboration goals, or a note for the creator..."
                  className="w-full p-3.5 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-emerald-600 text-zinc-950 dark:text-white placeholder:text-zinc-400 outline-none resize-none"
                />
              </div>
            </section>

            {/* STEP 2 & 3: CREATOR PAYMENT ACCOUNT & VERIFICATION */}
            <section className="rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 p-4 sm:p-6 space-y-5 shadow-2xs">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white">
                  2. Creator payment & verification
                </h3>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Direct mobile transfer
                </span>
              </div>

              {!hasBkash && !hasNagad ? (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/50 p-4 space-y-3">
                  <div className="flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div className="space-y-1">
                      <p className="text-sm font-bold">
                        {creatorName} hasn&apos;t added a payout number yet
                      </p>
                      <p className="text-xs leading-relaxed text-amber-800/90 dark:text-amber-300/85">
                        Direct sponsorship numbers appear automatically once the
                        creator adds a bKash or Nagad account in Creator
                        Dashboard. You can message them directly to coordinate.
                      </p>
                    </div>
                  </div>

                  {creatorId && currentUser?.uid !== creatorId && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        navigate(
                          `/messages?uid=${encodeURIComponent(creatorId)}`
                        );
                      }}
                      className="min-h-[42px] px-4 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span>Message {creatorName}</span>
                    </button>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSponsorSubmit} className="space-y-5">
                  {/* Gateway Selector */}
                  <div
                    className={`grid gap-2.5 ${
                      hasBkash && hasNagad ? "grid-cols-2" : "grid-cols-1"
                    }`}
                  >
                    {hasBkash && rotatedBkash && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          setPaymentMethod("bkash");
                        }}
                        className={`min-h-[52px] p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                          paymentMethod === "bkash"
                            ? "bg-pink-50/80 dark:bg-pink-950/30 border-[#E2125B] ring-1 ring-[#E2125B]"
                            : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="text-xs sm:text-sm font-bold text-[#E2125B] block whitespace-nowrap">
                            bKash · {rotatedBkash.type}
                          </span>
                          <span className="text-[11px] text-zinc-500 block whitespace-nowrap">
                            {getMobileActionLabel(rotatedBkash.type)}
                          </span>
                        </div>
                        <div
                          className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 ${
                            paymentMethod === "bkash"
                              ? "border-[#E2125B] bg-[#E2125B] text-white"
                              : "border-zinc-300 dark:border-zinc-700"
                          }`}
                        >
                          {paymentMethod === "bkash" && (
                            <Check className="w-3 h-3 stroke-[3]" />
                          )}
                        </div>
                      </button>
                    )}

                    {hasNagad && rotatedNagad && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          setPaymentMethod("nagad");
                        }}
                        className={`min-h-[52px] p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                          paymentMethod === "nagad"
                            ? "bg-orange-50/80 dark:bg-orange-950/30 border-[#F57C20] ring-1 ring-[#F57C20]"
                            : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="text-xs sm:text-sm font-bold text-[#F57C20] block whitespace-nowrap">
                            Nagad · {rotatedNagad.type}
                          </span>
                          <span className="text-[11px] text-zinc-500 block whitespace-nowrap">
                            {getMobileActionLabel(rotatedNagad.type)}
                          </span>
                        </div>
                        <div
                          className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 ${
                            paymentMethod === "nagad"
                              ? "border-[#F57C20] bg-[#F57C20] text-white"
                              : "border-zinc-300 dark:border-zinc-700"
                          }`}
                        >
                          {paymentMethod === "nagad" && (
                            <Check className="w-3 h-3 stroke-[3]" />
                          )}
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Active Creator Account Copy Card */}
                  {activeAccount && (
                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          {getMobileActionLabel(activeAccount.type)} to{" "}
                          {activeAccount.provider} ({activeAccount.type})
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                          ৳{activeAmount.toLocaleString()} BDT
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                        <span className="text-base sm:text-lg font-bold font-mono tabular-nums tracking-wider text-zinc-950 dark:text-white truncate">
                          {activeAccount.number}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              activeAccount.number,
                              activeAccount.id,
                              `${activeAccount.provider} (${activeAccount.type})`
                            )
                          }
                          className="min-h-[38px] px-3.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                        >
                          {copiedKey === activeAccount.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {copiedKey === activeAccount.id ? "Copied" : "Copy"}
                          </span>
                        </button>
                      </div>

                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Open {activeAccount.provider}, select{" "}
                        <strong className="text-zinc-800 dark:text-zinc-200">
                          {getMobileActionLabel(activeAccount.type)}
                        </strong>{" "}
                        for{" "}
                        <strong className="text-zinc-800 dark:text-zinc-200 tabular-nums">
                          ৳{activeAmount.toLocaleString()} BDT
                        </strong>
                        , then enter your sender number and TrxID below.
                      </p>
                    </div>
                  )}

                  {/* Sender Phone & TrxID Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                        Your Sender Mobile Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="01XXXXXXXXX"
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        className="w-full h-11 px-3.5 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-emerald-600 outline-none font-mono tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                        Transaction ID (TrxID) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 9J283HX10"
                        value={trxId}
                        onChange={(e) => setTrxId(e.target.value)}
                        className="w-full h-11 px-3.5 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-emerald-600 outline-none font-mono uppercase"
                      />
                    </div>
                  </div>

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    disabled={
                      isSubmitting || activeAmount < 50 || !activeAccount
                    }
                    className="w-full min-h-[50px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm sm:text-base transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap tabular-nums"
                  >
                    <Handshake className="w-4.5 h-4.5 shrink-0" />
                    <span>
                      {isSubmitting
                        ? "Submitting Sponsorship..."
                        : `Confirm Sponsorship · ৳${activeAmount.toLocaleString()}`}
                    </span>
                  </button>
                </form>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SponsorCreator;
