import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Handshake,
  Check,
  Copy,
  AlertCircle,
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
import creatorAvatar1 from "../src/assets/images/story_avatar_creator_1_1792826814910.jpg";
import {
  extractConfiguredMobileAccounts,
  getMobileActionLabel,
  getNextRefreshSeed,
  pickAccountBySeed,
} from "../lib/dhakaTime";

export const SponsorCreator: React.FC = () => {
  const { creatorId } = useParams<{ creatorId: string }>();
  const navigate = useNavigate();
  const notify = useNotify();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Sponsorship options
  const [tierType, setTierType] = useState<
    "monthly" | "yearly" | "per_post" | "custom"
  >("monthly");
  const [selectedAmount, setSelectedAmount] = useState<number>(300);
  const [customAmount, setCustomAmount] = useState<string>("");

  // Payment form states
  const [paymentMethod, setPaymentMethod] = useState<"bkash" | "nagad">(
    "bkash"
  );
  const [senderPhone, setSenderPhone] = useState("");
  const [trxId, setTrxId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Refresh seed rotates to the next configured number on every page refresh
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
            displayName: "Community Reporter",
            username: "reporter_bd",
            photoURL: creatorAvatar1,
            bio: "Verified Community Reporter & Incident Investigator on DEEP SHOP.",
          });
        }
        setLoading(false);
      },
      () => {
        setCreator({
          id: creatorId,
          displayName: "Community Reporter",
          username: "reporter_bd",
          photoURL: creatorAvatar1,
          bio: "Verified Community Reporter & Incident Investigator on DEEP SHOP.",
        });
        setLoading(false);
      }
    );

    return () => {
      unsubAuth();
      unsubCreator();
    };
  }, [creatorId]);

  // STRICTLY creator's own configured payment accounts from Creator Dashboard (no admin fallback)
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

  const activeAmount = customAmount ? Number(customAmount) || 0 : selectedAmount;

  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    triggerHaptic();
    notify(`${label} number copied!`, "success");
    setTimeout(() => setCopiedKey(null), 2500);
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
        "This creator has not configured any payment number in Creator Dashboard yet.",
        "error"
      );
      return;
    }

    if (activeAmount < 50) {
      notify("Minimum sponsorship amount is ৳50", "error");
      return;
    }

    if (!senderPhone || !trxId) {
      notify("Please enter your payment phone number and TrxID", "error");
      return;
    }

    setIsSubmitting(true);
    triggerHaptic();

    try {
      const officialNum = activeAccount.number;
      const cleanTrx = trxId.trim().toUpperCase();

      await addDoc(collection(db, "sponsor_requests"), {
        sponsorUserId: currentUser.uid,
        sponsorName:
          currentUser.displayName ||
          currentUser.email?.split("@")[0] ||
          "Supporter",
        sponsorEmail: currentUser.email || "",
        creatorUserId: creatorId,
        creatorName: creator?.displayName || "Creator",
        tierType,
        amountBDT: activeAmount,
        paymentMethod,
        senderPhone,
        trxId: cleanTrx,
        officialNumber: officialNum,
        officialAccountType: activeAccount.type,
        status: "pending",
        createdAt: Date.now(),
      });

      // Find or create P2P chat with creator to auto-dispatch receipt details into site inbox
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
              lastMessage: `🤝 Sponsorship Request: ৳${activeAmount} BDT`,
              lastSenderId: currentUser.uid,
              seenBy: [currentUser.uid],
            });
            targetChatId = newChatRef.id;
          }

          const tierLabels: Record<string, string> = {
            monthly: "Monthly Supporter",
            yearly: "Yearly VIP Patron",
            per_post: "Per-Post Scam Sponsor",
            custom: "Custom Sponsorship",
          };

          const receiptText =
            `🤝 SPONSORSHIP REQUEST SUBMITTED\n\n` +
            `• Creator: ${creator?.displayName || "Creator"} (@${
              creator?.username || "creator"
            })\n` +
            `• Tier: ${tierLabels[tierType] || tierType}\n` +
            `• Amount: ৳${activeAmount} BDT\n` +
            `• Payment Gateway: ${paymentMethod.toUpperCase()} (${officialNum} - ${
              activeAccount.type
            })\n` +
            `• Sender Phone: ${senderPhone}\n` +
            `• Transaction ID (TrxID): ${cleanTrx}\n\n` +
            `Status: Pending Verification.`;

          await addDoc(
            collection(db, "p2p_chats", targetChatId, "messages"),
            {
              text: receiptText,
              senderId: currentUser.uid,
              senderName:
                currentUser.displayName ||
                currentUser.email?.split("@")[0] ||
                "Supporter",
              senderPhoto: currentUser.photoURL || "",
              createdAt: Date.now(),
              timestamp: serverTimestamp(),
              seenBy: [currentUser.uid],
            }
          );

          await updateDoc(doc(db, "p2p_chats", targetChatId), {
            updatedAt: serverTimestamp(),
            lastMessage: `🤝 Sponsorship Request: ৳${activeAmount} BDT`,
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
        `Sponsorship request of ৳${activeAmount} for ${creator?.displayName} submitted! Details sent to site inbox.`,
        "success"
      );

      if (targetChatId) {
        navigate(`/messages?chatId=${targetChatId}`);
      } else {
        navigate(`/author/${creatorId}`);
      }
    } catch (err) {
      console.error(err);
      notify(
        "Failed to submit sponsorship request. Please try again.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !creator) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-zinc-500">
          Loading creator details...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans pb-24">
      <SEO
        title={`Sponsor ${creator.displayName} • DEEP SHOP`}
        description={`Sponsor ${creator.displayName} on DEEP SHOP to support verified incident reporting and investigative coverage.`}
      />

      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 transition cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <Handshake className="w-5 h-5 text-emerald-600 shrink-0" />
              <h1 className="text-base font-extrabold text-zinc-900 dark:text-white truncate">
                Sponsor Creator
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-5">
        {/* CREATOR PROFILE CARD */}
        <div className="p-4 sm:p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3.5">
          <img
            src={creator.photoURL || creatorAvatar1}
            alt={creator.displayName}
            className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500 shadow-sm shrink-0"
          />
          <div className="min-w-0">
            <h2 className="text-base font-black text-zinc-900 dark:text-white truncate">
              {creator.displayName}
            </h2>
            <p className="text-xs font-mono text-zinc-400">
              @{creator.username || "creator"}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
              {creator.bio || "Community Reporter & Incident Investigator"}
            </p>
          </div>
        </div>

        {/* STEP 1: SPONSORSHIP TIER */}
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Step 1: Choose Sponsorship Tier
          </h3>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              {
                id: "monthly",
                title: "Monthly Supporter",
                bdt: 300,
                desc: "৳300 / month recurring",
              },
              {
                id: "yearly",
                title: "Yearly VIP Patron",
                bdt: 3000,
                desc: "৳3,000 / year (Save 15%)",
              },
              {
                id: "per_post",
                title: "Per-Post Sponsor",
                bdt: 500,
                desc: "৳500 / sponsored report",
              },
              {
                id: "custom",
                title: "Custom Contribution",
                bdt: 1000,
                desc: "Enter your own amount",
              },
            ].map((pkg) => {
              const isSelected = tierType === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setTierType(pkg.id as any);
                    if (pkg.id !== "custom") {
                      setSelectedAmount(pkg.bdt);
                      setCustomAmount("");
                    }
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <div>
                    <span className="text-xs font-black text-zinc-900 dark:text-white block">
                      {pkg.title}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                      {pkg.desc}
                    </span>
                  </div>
                  <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2 block">
                    {pkg.id === "custom" ? "Custom" : `৳${pkg.bdt}`}
                  </span>
                </button>
              );
            })}
          </div>

          {tierType === "custom" && (
            <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                Custom Amount (BDT):
              </span>
              <input
                type="number"
                min="50"
                placeholder="e.g. 1500"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-32 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-bold font-mono outline-none"
              />
            </div>
          )}
        </div>

        {/* STEP 2: CREATOR'S CONFIGURED PAYMENT NUMBERS ONLY */}
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Step 2: Creator Payment Number
          </h3>

          {!hasBkash && !hasNagad ? (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold">
                  No payment number set by {creator.displayName}
                </p>
                <p className="text-[11px] opacity-85 mt-0.5 leading-relaxed">
                  Payment numbers appear here only when this creator sets a bKash
                  or Nagad account in their Creator Dashboard.
                </p>
              </div>
            </div>
          ) : (
            <>
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
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
                      paymentMethod === "bkash"
                        ? "bg-rose-50 dark:bg-rose-950/40 border-rose-500 ring-1 ring-rose-500"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    <div>
                      <span className="text-xs font-black text-rose-600 block whitespace-nowrap">
                        bKash ({rotatedBkash.type})
                      </span>
                      <span className="text-[10px] text-zinc-400 whitespace-nowrap">
                        {getMobileActionLabel(rotatedBkash.type)}
                      </span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        paymentMethod === "bkash"
                          ? "border-rose-600 bg-rose-600 text-white"
                          : "border-zinc-300"
                      }`}
                    >
                      {paymentMethod === "bkash" && (
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
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
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
                      paymentMethod === "nagad"
                        ? "bg-orange-50 dark:bg-orange-950/40 border-orange-500 ring-1 ring-orange-500"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    <div>
                      <span className="text-xs font-black text-orange-600 block whitespace-nowrap">
                        Nagad ({rotatedNagad.type})
                      </span>
                      <span className="text-[10px] text-zinc-400 whitespace-nowrap">
                        {getMobileActionLabel(rotatedNagad.type)}
                      </span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        paymentMethod === "nagad"
                          ? "border-orange-600 bg-orange-600 text-white"
                          : "border-zinc-300"
                      }`}
                    >
                      {paymentMethod === "nagad" && (
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      )}
                    </div>
                  </button>
                )}
              </div>

              {activeAccount && (
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-zinc-500">
                      {getMobileActionLabel(activeAccount.type)} to{" "}
                      {activeAccount.provider} ({activeAccount.type}):
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {activeAccount.type}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                    <span className="text-base sm:text-lg font-black font-mono tracking-wider text-zinc-900 dark:text-white">
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
                      className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-xs font-bold flex items-center gap-1.5 hover:bg-zinc-200 transition cursor-pointer whitespace-nowrap"
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

                  <div className="text-[11px] text-zinc-500 space-y-1">
                    <p>
                      • Open {activeAccount.provider} and select{" "}
                      <strong className="text-zinc-900 dark:text-white">
                        {getMobileActionLabel(activeAccount.type)}
                      </strong>
                      : <strong className="text-zinc-900 dark:text-white">৳{activeAmount} BDT</strong>
                    </p>
                    <p>
                      • Enter your sender number & Transaction ID below to
                      verify.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* STEP 3: SUBMIT FORM (Only enabled if creator has configured a payment number) */}
        {(hasBkash || hasNagad) && (
          <form onSubmit={handleSponsorSubmit} className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Step 3: Verification
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Your Payment Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="01XXXXXXXXX"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Transaction ID (TrxID) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9J283HX10"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none font-mono uppercase"
                />
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold border-t border-zinc-200 dark:border-zinc-800 pt-3">
                <span>Total Payable Amount:</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  ৳{activeAmount} BDT
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || activeAmount < 50 || !activeAccount}
                className="w-full py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xl transition active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <Handshake className="w-4 h-4 shrink-0" />
                <span>
                  {isSubmitting
                    ? "Submitting Sponsorship..."
                    : `Confirm Sponsorship (৳${activeAmount})`}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SponsorCreator;
