import { db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot
} from "firebase/firestore";

export interface SubscriptionPlan {
  id: string;
  name: string;
  nameBn: string;
  durationDays: number;
  durationLabel: string;
  durationLabelBn: string;
  price: number;
  popular?: boolean;
  bestValue?: boolean;
  tag?: string;
  description: string;
  features: string[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "3days",
    name: "3 Days VIP Pass",
    nameBn: "৩ দিনের ভিআইপি পাস",
    durationDays: 3,
    durationLabel: "3 Days",
    durationLabelBn: "৩ দিন",
    price: 5000,
    description: "স্বল্পমেয়াদী ট্রায়াল প্যাক - কোনো অগ্রিম চার্জ ছাড়া আনলিমিটেড সিওডি অর্ডার।",
    features: [
      "১০০% ফুল ক্যাশ অন ডেলিভারি (অগ্রিম ০ টাকা)",
      "আনলিমিটেড প্রোডাক্ট অর্ডার উইথ ০% অ্যাডভান্স",
      "ফ্রি ও ফাস্ট এক্সপ্রেস হোম ডেলিভারি",
      "ভিআইপি প্রায়োরিটি কাস্টমার কেয়ার"
    ]
  },
  {
    id: "1week",
    name: "1 Week VIP Pass",
    nameBn: "১ সপ্তাহের ভিআইপি পাস",
    durationDays: 7,
    durationLabel: "7 Days (1 Week)",
    durationLabelBn: "৭ দিন (১ সপ্তাহ)",
    price: 8000,
    description: "১ সপ্তাহের জন্য নিশ্চিন্ত শপিং - ফুল ক্যাশ অন ডেলিভারি সুবিধা।",
    features: [
      "১০০% ফুল ক্যাশ অন ডেলিভারি (অগ্রিম ০ টাকা)",
      "আনলিমিটেড ক্যাশ অন ডেলিভারি অর্ডার",
      "ফ্রি এক্সপ্রেস ডেলিভারি সুবিধা",
      "২৪/৭ ডেডিকেটেড হেল্পলাইন সাপোর্ট",
      "অর্ডার ক্যানসেলেশন প্রোটেকশন"
    ]
  },
  {
    id: "30days",
    name: "1 Month (30 Days) VIP Pass",
    nameBn: "১ মাসের ভিআইপি পাস (৩০ দিন)",
    durationDays: 30,
    durationLabel: "30 Days (1 Month)",
    durationLabelBn: "৩০ দিন (১ মাস)",
    price: 13000,
    popular: true,
    tag: "সর্বাধিক জনপ্রিয় 🔥",
    description: "রেগুলার ক্রেতাদের জন্য সেরা চয়েস - সম্পূর্ণ মাস জুড়ে ০ টাকা অগ্রিমে অর্ডার।",
    features: [
      "১০০% ফুল ক্যাশ অন ডেলিভারি (অগ্রিম ০ টাকা)",
      "সকল ক্যাটাগরির প্রোডাক্টে ০ অ্যাডভান্স ক্যাশ অন",
      "সুপারফাস্ট এক্সপ্রেস ডেলিভারি ফ্রি",
      "প্রোফাইলে গোল্ডেন ভিআইপি মেম্বার ব্যাজ",
      "আর্লি এক্সেস: সিক্রেট ফ্ল্যাশ সেল ও ড্রপস",
      "৭ দিন সহজ নো-কোশ্চেন এক্সচেঞ্জ পলিসি"
    ]
  },
  {
    id: "3months",
    name: "3 Months VIP Pass",
    nameBn: "৩ মাসের ভিআইপি পাস (৯০ দিন)",
    durationDays: 90,
    durationLabel: "90 Days (3 Months)",
    durationLabelBn: "৯০ দিন (৩ মাস)",
    price: 15000,
    bestValue: true,
    tag: "বেস্ট ভ্যালু প্যাক 💎",
    description: "একটানা ৯০ দিন যেকোনো প্রোডাক্ট কোনো অগ্রিম ছাড়া ডেলিভারিতে পেমেন্ট করে নিন।",
    features: [
      "১০০% ফুল ক্যাশ অন ডেলিভারি (অগ্রিম ০ টাকা)",
      "৯০ দিন আনলিমিটেড সিওডি সুবিধা",
      "প্রিমিয়াম ভিআইপি গ্রাহক সাপোর্ট ও সেলস রিপ্রেজেন্টেটিভ",
      "ফ্রি এক্সপ্রেস ডেলিভারি সারা বাংলাদেশ",
      "এক্সক্লুসিভ ডিসকাউন্ট ও গিফট কুপন",
      "আর্লি ফ্ল্যাশ সেল নোটিফিকেশন"
    ]
  },
  {
    id: "6months",
    name: "6 Months VIP Pass",
    nameBn: "৬ মাসের ভিআইপি পাস (১৮০ দিন)",
    durationDays: 180,
    durationLabel: "180 Days (6 Months)",
    durationLabelBn: "১৮০ দিন (৬ মাস)",
    price: 20000,
    tag: "মেগা সেভিংস ⚡",
    description: "অর্ধবার্ষিক প্রিমিয়াম মেম্বারশিপ - সকল পণ্যে ফুল ক্যাশ অন ও সর্বোচ্চ সুবিধা।",
    features: [
      "১০০% ফুল ক্যাশ অন ডেলিভারি (অগ্রিম ০ টাকা)",
      "আনলিমিটেড ফ্রি ডেলিভারি (সারা দেশে)",
      "পার্সোনাল ভিআইপি একাউন্ট ম্যানেজার",
      "সিক্রেট ড্রপস ও প্রি-অর্ডার প্রায়োরিটি",
      "ফ্রি গিফট ও সারপ্রাইজ ভাউচার",
      "কোনো সিকিউরিটি ডিপোজিট ছাড়া অর্ডার"
    ]
  },
  {
    id: "1year",
    name: "1 Year VIP Ultra Pass",
    nameBn: "১ বছরের ভিআইপি আল্ট্রা পাস (৩৬৫ দিন)",
    durationDays: 365,
    durationLabel: "365 Days (1 Year)",
    durationLabelBn: "৩৬৫ দিন (১ বছর)",
    price: 30000,
    tag: "আল্টিমেট ভিআইপি 👑",
    description: "পুরো ১ বছর কোনো চিন্তা নেই! যত ইচ্ছা তত অর্ডার করুন সম্পূর্ণ ক্যাশ অন ডেলিভারিতে।",
    features: [
      "১০০% ফুল ক্যাশ অন ডেলিভারি (অগ্রিম ০ টাকা)",
      "৩৬৫ দিন আনলিমিটেড ফ্রি এক্সপ্রেস ডেলিভারি",
      "প্রোফাইল ও অর্ডারে এলিট গোল্ডেন ক্রাউন ব্যাজ",
      "সর্বোচ্চ প্রায়োরিটি ডেলিভারি ও প্যাকেজিং",
      "২৪/৭ ডিরেক্ট ভিআইপি কল সাপোর্ট",
      "সারাবছর সব অফারে ভিআইপি আর্লি এক্সেস"
    ]
  }
];

export const TIER_COMPARISONS = [
  {
    feature: "ক্যাশ অন ডেলিভারি সুবিধা (COD)",
    free: "অগ্রিম ডেলিভারি চার্জ / ডিপোজিট বাধ্যতামূলক",
    vip: "১০০% ফুল ক্যাশ অন (অগ্রিম ০ টাকা)",
    vipAdvantage: true
  },
  {
    feature: "ডেলিভারি স্পিড",
    free: "সাধারণ স্ট্যান্ডার্ড ডেলিভারি",
    vip: "সুপারফাস্ট প্রায়োরিটি এক্সপ্রেস ডেলিভারি",
    vipAdvantage: true
  },
  {
    feature: "ডেলিভারি চার্জ",
    free: "ঢাকার ভিতরে ৭০৳, বাইরে ১৩০৳",
    vip: "সম্পূর্ণ ফ্রি হোম ডেলিভারি (০৳)",
    vipAdvantage: true
  },
  {
    feature: "কাস্টমার সাপোর্ট",
    free: "সাধারণ কিউ ও মেসেজ চ্যাট",
    vip: "২৪/৭ ডেডিকেটেড ভিআইপি হেল্পলাইন",
    vipAdvantage: true
  },
  {
    feature: "ফ্ল্যাশ সেল ও সিক্রেট ড্রপস",
    free: "রেগুলার সময়ে সাধারণ এক্সেস",
    vip: "১ ঘণ্টা আগে এক্সক্লুসিভ আর্লি এক্সেস",
    vipAdvantage: true
  },
  {
    feature: "রিটার্ন ও এক্সচেঞ্জ পলিসি",
    free: "সর্বোচ্চ ৩ দিন",
    vip: "৭ দিন ঝামেলামুক্ত নো-কোশ্চেন এক্সচেঞ্জ",
    vipAdvantage: true
  },
  {
    feature: "প্রোফাইল স্ট্যাটাস ব্যাজ",
    free: "সাধারণ ফ্রি ইউজার",
    vip: "এলিট গোল্ডেন ক্রাউন ভিআইপি ব্যাজ",
    vipAdvantage: true
  }
];

export interface UserSubscriptionInfo {
  status: "active" | "expired" | "none";
  planId?: string;
  planName?: string;
  durationDays?: number;
  amount?: number;
  startDate?: number;
  expiryDate?: number;
  autoRenew?: boolean;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  planId: string;
  planName: string;
  durationDays: number;
  price: number;
  paymentMethod: "bKash" | "Nagad" | "Rocket" | "Upay";
  senderNumber: string;
  trxId: string;
  status: "pending" | "approved" | "rejected" | "expired";
  requestedAt: number;
  approvedAt?: number;
  rejectedAt?: number;
  approvedBy?: string;
  rejectedBy?: string;
  startDate?: number;
  expiryDate?: number;
  notes?: string;
  rejectionReason?: string;
}

/**
 * Checks whether user has an active, valid subscription
 */
export function hasActiveSubscription(userData: any): boolean {
  if (!userData?.subscription) return false;
  const sub = userData.subscription as UserSubscriptionInfo;
  if (sub.status !== "active") return false;
  if (!sub.expiryDate) return false;
  return Number(sub.expiryDate) > Date.now();
}

/**
 * Parses user subscription status, days remaining, expiry status
 */
export function getSubscriptionStatus(userData: any) {
  const sub = userData?.subscription as UserSubscriptionInfo | undefined;
  if (!sub || sub.status === "none" || !sub.planId) {
    return {
      isSubscribed: false,
      isExpired: false,
      isExpiringSoon: false,
      plan: null,
      daysRemaining: 0,
      expiryDate: null,
      status: "none" as const,
    };
  }

  const now = Date.now();
  const expiryDate = Number(sub.expiryDate || 0);
  const isExpired = sub.status === "expired" || (expiryDate > 0 && expiryDate <= now);
  const isSubscribed = sub.status === "active" && expiryDate > now;

  let daysRemaining = 0;
  if (isSubscribed && expiryDate > now) {
    daysRemaining = Math.max(1, Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)));
  }

  const isExpiringSoon = isSubscribed && daysRemaining <= 2;
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === sub.planId) || null;

  return {
    isSubscribed,
    isExpired,
    isExpiringSoon,
    plan,
    daysRemaining,
    expiryDate: expiryDate || null,
    status: isSubscribed ? ("active" as const) : isExpired ? ("expired" as const) : ("none" as const),
  };
}

/**
 * Submit a new subscription request to Firestore
 */
export async function createSubscriptionRequest(params: {
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  planId: string;
  paymentMethod: "bKash" | "Nagad" | "Rocket" | "Upay";
  senderNumber: string;
  trxId: string;
  notes?: string;
}) {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === params.planId);
  if (!plan) throw new Error("অবৈধ সাবস্ক্রিপশন প্ল্যান নির্বাচন করা হয়েছে।");

  const record: Omit<SubscriptionRecord, "id"> = {
    userId: params.userId,
    userName: params.userName || "Customer",
    userEmail: params.userEmail || "",
    userPhone: params.userPhone || "",
    planId: plan.id,
    planName: plan.nameBn,
    durationDays: plan.durationDays,
    price: plan.price,
    paymentMethod: params.paymentMethod,
    senderNumber: params.senderNumber.trim(),
    trxId: params.trxId.trim().toUpperCase(),
    status: "pending",
    requestedAt: Date.now(),
    notes: params.notes || "",
  };

  const docRef = await addDoc(collection(db, "subscriptions"), record);

  // Send admin notification
  try {
    await addDoc(collection(db, "notifications"), {
      userId: "all_admins",
      title: "👑 নতুন ভিআইপি সাবস্ক্রিপশন আবেদন",
      message: `${params.userName || "একজন গ্রাহক"} ${plan.nameBn} (৳${plan.price}) সাবস্ক্রিপশনের আবেদন করেছেন। TrxID: ${params.trxId.trim()}`,
      type: "subscription_request",
      link: "/admin/subscriptions",
      createdAt: serverTimestamp(),
      read: false,
    });
  } catch (err) {
    console.error("Error creating admin notification:", err);
  }

  return { id: docRef.id, ...record };
}

/**
 * Approve subscription by seller / admin
 */
export async function approveSubscription(
  subscriptionId: string,
  adminIdentifier: string = "Admin"
) {
  const subRef = doc(db, "subscriptions", subscriptionId);
  let subSnap = await getDoc(subRef);
  let subData: any = null;

  if (subSnap.exists()) {
    subData = subSnap.data();
  } else {
    // Check if subscriptionId corresponds to an order ID in orders collection
    const orderRef = doc(db, "orders", subscriptionId);
    const orderSnap = await getDoc(orderRef);
    if (orderSnap.exists()) {
      const oData = orderSnap.data();
      subData = {
        orderId: subscriptionId,
        userId: oData.userId || "",
        userName: oData.customerName || oData.shippingAddress?.name || "VIP Member",
        userEmail: oData.customerEmail || "",
        userPhone: oData.customerPhone || oData.shippingAddress?.phone || "",
        planId: oData.planId || oData.items?.[0]?.id || "30days",
        planName: oData.planName || oData.items?.[0]?.name || "DEEP SHOP VIP Pass",
        durationDays: Number(oData.durationDays || 30),
        price: Number(oData.total || oData.amountToPay || 13000),
        paymentMethod: oData.paymentMethod?.toLowerCase().includes("nagad") ? "Nagad" : "bKash",
        senderNumber: oData.customerSenderNumber || oData.customerPhone || "",
        trxId: oData.customerTrxId || oData.bankingTrxId || ("TRX" + Date.now().toString().slice(-6)),
        status: "pending",
        requestedAt: oData.createdAt || Date.now(),
      };
    }
  }

  if (!subData) {
    throw new Error("সাবস্ক্রিপশন রেকর্ডটি খুঁজে পাওয়া যায়নি।");
  }

  const now = Date.now();
  const durationMs = (subData.durationDays || 30) * 24 * 60 * 60 * 1000;
  const expiryDate = now + durationMs;

  const subscriptionInfo: UserSubscriptionInfo = {
    status: "active",
    planId: subData.planId || "30days",
    planName: subData.planName || "DEEP SHOP VIP",
    durationDays: subData.durationDays || 30,
    amount: subData.price || 0,
    startDate: now,
    expiryDate: expiryDate,
    autoRenew: false,
  };

  // 1. Update subscription request status
  await setDoc(
    subRef,
    {
      ...subData,
      status: "approved",
      approvedAt: now,
      approvedBy: adminIdentifier,
      startDate: now,
      expiryDate: expiryDate,
    },
    { merge: true }
  );

  // 2. If connected to an order in orders collection, update order status
  const orderTargetId = subData.orderId || subscriptionId;
  if (orderTargetId) {
    try {
      await setDoc(
        doc(db, "orders", orderTargetId),
        {
          status: "Completed",
          paymentStatus: "paid",
          updatedAt: now,
        },
        { merge: true }
      );
    } catch (e) {
      console.error("Error updating order status:", e);
    }
  }

  // 3. Update primary user's profile with active subscription
  if (subData.userId && subData.userId !== "guest") {
    try {
      await setDoc(
        doc(db, "users", subData.userId),
        {
          subscription: subscriptionInfo,
          isVipMember: true,
          vipExpiryDate: expiryDate,
        },
        { merge: true }
      );
    } catch (e) {
      console.error("Error updating user document:", e);
    }
  }

  // 4. Also lookup user by email or phone if guest or fallback
  if (subData.userEmail || subData.userPhone) {
    try {
      if (subData.userEmail) {
        const qEmail = query(collection(db, "users"), where("email", "==", subData.userEmail));
        const emailSnap = await getDocs(qEmail);
        for (const uDoc of emailSnap.docs) {
          await setDoc(
            doc(db, "users", uDoc.id),
            {
              subscription: subscriptionInfo,
              isVipMember: true,
              vipExpiryDate: expiryDate,
            },
            { merge: true }
          );
        }
      }
      if (subData.userPhone) {
        const qPhone = query(collection(db, "users"), where("phone", "==", subData.userPhone));
        const phoneSnap = await getDocs(qPhone);
        for (const uDoc of phoneSnap.docs) {
          await setDoc(
            doc(db, "users", uDoc.id),
            {
              subscription: subscriptionInfo,
              isVipMember: true,
              vipExpiryDate: expiryDate,
            },
            { merge: true }
          );
        }
      }
    } catch (e) {
      console.error("Error updating user by email/phone:", e);
    }
  }

  // 5. Send notification to the user
  try {
    const formattedDate = new Date(expiryDate).toLocaleDateString("bn-BD", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const targetUserId = subData.userId || "all";
    await addDoc(collection(db, "notifications"), {
      userId: targetUserId,
      title: "👑 ভিআইপি সাবস্ক্রিপশন সফলভাবে চালু হয়েছে!",
      message: `অভিনন্দন! আপনার ${subData.planName} সক্রিয় হয়েছে। এখন থেকে আপনি যেকোনো পণ্য কোনো প্রকার অগ্রিম টাকা ছাড়াই ১০০% ক্যাশ অন ডেলিভারিতে অর্ডার করতে পারবেন। মেয়াদ: ${formattedDate} পর্যন্ত।`,
      type: "subscription_approved",
      link: "/subscription",
      createdAt: serverTimestamp(),
      read: false,
    });
  } catch (err) {
    console.error("Error creating user notification:", err);
  }

  return { success: true, expiryDate };
}

/**
 * Reject subscription request
 */
export async function rejectSubscription(
  subscriptionId: string,
  reason: string = "পেমেন্ট যাচাই করা সম্ভব হয়নি।",
  adminIdentifier: string = "Admin"
) {
  const subRef = doc(db, "subscriptions", subscriptionId);
  let subSnap = await getDoc(subRef);
  let subData: any = null;

  if (subSnap.exists()) {
    subData = subSnap.data();
  } else {
    const orderRef = doc(db, "orders", subscriptionId);
    const orderSnap = await getDoc(orderRef);
    if (orderSnap.exists()) {
      const oData = orderSnap.data();
      subData = {
        orderId: subscriptionId,
        userId: oData.userId || "",
        userName: oData.customerName || "VIP Member",
        userEmail: oData.customerEmail || "",
        userPhone: oData.customerPhone || "",
        planId: oData.planId || "30days",
        planName: oData.planName || "DEEP SHOP VIP Pass",
        durationDays: Number(oData.durationDays || 30),
        price: Number(oData.total || 0),
        paymentMethod: oData.paymentMethod || "bKash",
        senderNumber: oData.customerSenderNumber || "",
        trxId: oData.customerTrxId || "",
        status: "pending",
        requestedAt: oData.createdAt || Date.now(),
      };
    }
  }

  if (!subData) {
    throw new Error("সাবস্ক্রিপশন রেকর্ডটি খুঁজে পাওয়া যায়নি।");
  }

  const now = Date.now();

  await setDoc(
    subRef,
    {
      ...subData,
      status: "rejected",
      rejectedAt: now,
      rejectedBy: adminIdentifier,
      notes: reason,
      rejectionReason: reason,
    },
    { merge: true }
  );

  const orderTargetId = subData.orderId || subscriptionId;
  if (orderTargetId) {
    try {
      await setDoc(
        doc(db, "orders", orderTargetId),
        {
          status: "Cancelled",
          paymentStatus: "rejected",
          notes: reason,
          rejectionReason: reason,
          rejectReason: reason,
          updatedAt: now,
        },
        { merge: true }
      );
    } catch (e) {
      console.error("Error updating order rejection status:", e);
    }
  }

  if (subData.userId) {
    try {
      await addDoc(collection(db, "notifications"), {
        userId: subData.userId,
        title: "❌ সাবস্ক্রিপশন আবেদন বাতিল হয়েছে",
        message: `আপনার ${subData.planName} সাবস্ক্রিপশন আবেদনটি বাতিল করা হয়েছে। কারণ: ${reason}`,
        type: "subscription_rejected",
        link: "/subscription",
        createdAt: serverTimestamp(),
        read: false,
      });
    } catch (err) {
      console.error("Error sending user notification:", err);
    }
  }

  return { success: true };
}

/**
 * Expire user subscription and revoke privileges
 */
export async function expireUserSubscription(userId: string) {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const data = userSnap.data();
  if (data?.subscription?.status === "active") {
    await updateDoc(userRef, {
      "subscription.status": "expired",
      isVipMember: false,
    });

    try {
      await addDoc(collection(db, "notifications"), {
        userId: userId,
        title: "⚠️ আপনার ভিআইপি সাবস্ক্রিপশন শেষ হয়ে গেছে",
        message: "আপনার ভিআইপি সাবস্ক্রিপশনের মেয়াদ শেষ হয়েছে। কোনো অগ্রিম টাকা ছাড়া ফুল ক্যাশ অন ডেলিভারিতে অর্ডার করতে এখনই প্ল্যান রিনিউ করুন।",
        type: "subscription_expired",
        link: "/subscription",
        createdAt: serverTimestamp(),
        read: false,
      });
    } catch (err) {
      console.error("Error notifying user of expiry:", err);
    }
  }
}
