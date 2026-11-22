import { formatPrice } from "../lib/utils";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { auth, db } from "../firebase";
import { handleCoinDeductionWithExpiry } from "../lib/coinExpiry";
import { APPLE_SPRING_DEFAULT, projectMomentum } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";
import { useSwipeNavigation } from "../lib/useSwipeNavigation";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { useNotify } from "../components/Notifications";
import { OrderStatus } from "../types";
import { sendOrderToTelegram } from "../services/telegram";
import { getProductCoinReward } from "../lib/coinRewards";
import { CustomSectionEmbed } from "../components/CustomSectionEmbed";
import { useTheme } from "../components/ThemeContext";
import { useLanguage } from "../components/LanguageContext";
import { uploadToImgbb } from "../services/imgbb";
import { PixelImage } from "../components/ui/PixelImage";
import { getProductDisplayImage } from "../src/lib/phonePartsArt";
import { BangladeshAddressSelector } from "../components/BangladeshAddressSelector";
import { validateBangladeshiPhone, detectAbuse, recordAbuseStrike } from "../src/lib/abuseProtection";
import AuthVoiceToggle from "../components/AuthVoiceToggle";
import { isAuthVoiceMuted, playAuthVoice } from "../lib/authVoiceAndValidation";

import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Skeleton } from "../components/ui/skeleton";
import {
  CreditCard,
  Truck,
  Shield,
  MapPin,
  Lock,
  Check,
  ChevronLeft,
  ChevronDown,
  ArrowRight,
  Gift,
  Plus,
  Edit3,
  Percent,
  X,
  Smartphone,
  ShoppingBag,
  Ticket,
  Copy,
  QrCode,
  Volume2,
  Headphones,
  Upload,
  PhoneCall,
  AlertCircle,
  Loader2,
  Sparkles,
  Settings,
  Crown
} from "lucide-react";
import { hasActiveSubscription } from "../services/subscription";
import { cn } from "../lib/utils";
import { isSuperAdminOrAdmin } from "../lib/admin";
import {
  extractConfiguredMobileAccounts,
  getNextRefreshSeed,
  pickAccountBySeed,
} from "../lib/dhakaTime";

function formatAddressText(val: any): string {
  if (!val) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "number") return String(val);
  if (typeof val === "object" && val !== null) {
    try {
      if (typeof val.address === "string" && val.address.trim()) return val.address.trim();
      if (typeof val.fullAddressText === "string" && val.fullAddressText.trim()) return val.fullAddressText.trim();
      if (typeof val.street === "string" && val.street.trim()) return val.street.trim();

      const parts: string[] = [];
      const keys = ["detailedHouseRoad", "areaUnion", "upazila", "district", "division"];
      for (const k of keys) {
        if (typeof val[k] === "string" && val[k].trim()) parts.push(val[k].trim());
      }
      if (parts.length > 0) return parts.join(", ");

      const strVals = Object.values(val).filter((v): v is string => typeof v === "string" && !!v.trim());
      return strVals.join(", ");
    } catch {
      return "";
    }
  }
  return "";
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();

  const region = localStorage.getItem("user_region") || "BD";
  const isForeign = region === "IN" || region === "PK";

  // Local storage helper
  const getSavedState = (key: string, defaultValue: any) => {
    try {
      const item = localStorage.getItem(`vibe_checkout_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const [items, setItems] = useState<any[]>([]);
  const isCodDisabledBySellers = items.some((item: any) => item.isCodEnabled === false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(() => getSavedState("currentStep", 1));
  const [userIp, setUserIp] = useState<string>("");
  const [settings, setSettings] = useState<any>(null);
  const [userCoins, setUserCoins] = useState<number>(0);
  const [resolvedAdvanceAmount, setResolvedAdvanceAmount] = useState<number | null>(null);
  const [sellerProfileData, setSellerProfileData] = useState<any>(null);
  const [checkoutRefreshSeed] = useState<number>(() => getNextRefreshSeed("checkout_pay"));
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (u) {
        try {
          const snap = await getDoc(doc(db, "users", u.uid));
          if (snap.exists()) {
            setUserProfile(snap.data());
          }
        } catch (e) {
          console.error("Error loading user profile in checkout:", e);
        }
      } else {
        setUserProfile(null);
      }
    });
    return () => unsub();
  }, []);

  const isVipSubscriber = hasActiveSubscription(userProfile);

  // Address
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(() => getSavedState("selectedAddressId", null));
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(() => getSavedState("isAddingNewAddress", false));
  const [newAddress, setNewAddress] = useState(() => getSavedState("newAddress", {
    name: "",
    phone: "",
    altPhone: "",
    address: "",
  }));

  // Payment
  const prefMeth = localStorage.getItem("vibe_preferred_payment");
  const defaultBank =
    prefMeth === "bKash or Nagad" || prefMeth === "bKash" || prefMeth === "Nagad"
      ? "bangla_qr"
      : null;
  const defaultPaymentType =
    prefMeth === "Cash on Delivery" ? "cod" : prefMeth === "DP Coin" ? "dpcoin" : defaultBank ? "advance" : "cod";
  const [paymentType, setPaymentType] = useState<
    "cod" | "advance" | "dpcoin" | null
  >(() => {
    const saved = getSavedState("paymentType", defaultPaymentType);
    return saved === "vgcoin" ? "dpcoin" : saved;
  });
  const [advanceType, setAdvanceType] = useState<"full" | "delivery" | null>(() => getSavedState("advanceType", null));
  const [bankingMethod, setBankingMethod] = useState<"bangla_qr" | "bank" | null>(() => getSavedState("bankingMethod", defaultBank as any));
  const [bankingAccountName, setBankingAccountName] = useState(() => getSavedState("bankingAccountName", ""));
  const [bankingTrxId, setBankingTrxId] = useState(() => getSavedState("bankingTrxId", ""));

  // New Payment & Verification States
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"bkash" | "nagad">(() => getSavedState("selectedPaymentMethod", "bkash"));
  const [activeBkashNumber, setActiveBkashNumber] = useState<string>("");
  const [activeNagadNumber, setActiveNagadNumber] = useState<string>("");
  const [customerSenderNumber, setCustomerSenderNumber] = useState<string>(() => getSavedState("customerSenderNumber", ""));
  const [customerTrxId, setCustomerTrxId] = useState<string>(() => getSavedState("customerTrxId", ""));
  const [guardianNumber, setGuardianNumber] = useState<string>(() => getSavedState("guardianNumber", ""));
  const [nidCardUrl, setNidCardUrl] = useState<string>(() => getSavedState("nidCardUrl", ""));
  const [uploadingNid, setUploadingNid] = useState<boolean>(false);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  // Promo & Gift
  const [couponCode, setCouponCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [couponError, setCouponError] = useState("");
  const [isGift, setIsGift] = useState(() => getSavedState("isGift", false));
  const [giftNote, setGiftNote] = useState(() => getSavedState("giftNote", ""));
  const [affiliateRef, setAffiliateRef] = useState<string | null>(null);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showCouponsModal, setShowCouponsModal] = useState(false);
  const [claimedCouponsList, setClaimedCouponsList] = useState<any[]>([]);

  const [paymentSettings, setPaymentSettings] = useState<any>(null);

  useEffect(() => {
    if (isCodDisabledBySellers && paymentType === "cod") {
      setPaymentType("advance");
    }
  }, [isCodDisabledBySellers, paymentType]);

  useEffect(() => {
    localStorage.setItem("vibe_checkout_currentStep", JSON.stringify(currentStep));
    localStorage.setItem("vibe_checkout_selectedAddressId", JSON.stringify(selectedAddressId));
    localStorage.setItem("vibe_checkout_isAddingNewAddress", JSON.stringify(isAddingNewAddress));
    localStorage.setItem("vibe_checkout_newAddress", JSON.stringify(newAddress));
    localStorage.setItem("vibe_checkout_paymentType", JSON.stringify(paymentType));
    localStorage.setItem("vibe_checkout_advanceType", JSON.stringify(advanceType));
    localStorage.setItem("vibe_checkout_bankingMethod", JSON.stringify(bankingMethod));
    localStorage.setItem("vibe_checkout_bankingAccountName", JSON.stringify(bankingAccountName));
    localStorage.setItem("vibe_checkout_bankingTrxId", JSON.stringify(bankingTrxId));
    localStorage.setItem("vibe_checkout_selectedPaymentMethod", JSON.stringify(selectedPaymentMethod));
    localStorage.setItem("vibe_checkout_customerSenderNumber", JSON.stringify(customerSenderNumber));
    localStorage.setItem("vibe_checkout_customerTrxId", JSON.stringify(customerTrxId));
    localStorage.setItem("vibe_checkout_guardianNumber", JSON.stringify(guardianNumber));
    localStorage.setItem("vibe_checkout_nidCardUrl", JSON.stringify(nidCardUrl));
    localStorage.setItem("vibe_checkout_isGift", JSON.stringify(isGift));
    localStorage.setItem("vibe_checkout_giftNote", JSON.stringify(giftNote));
  }, [currentStep, selectedAddressId, isAddingNewAddress, newAddress, paymentType, advanceType, bankingMethod, bankingAccountName, bankingTrxId, selectedPaymentMethod, customerSenderNumber, customerTrxId, guardianNumber, nidCardUrl, isGift, giftNote]);

  useEffect(() => {
    const fetchCoupons = async () => {
      if (!auth.currentUser) return;
      const userSnap = await import("firebase/firestore").then((m) =>
        m.getDoc(m.doc(db, "users", auth.currentUser!.uid)),
      );
      if (userSnap.exists()) {
        const claimedIds = userSnap.data().claimedCoupons || [];
        if (claimedIds.length > 0) {
          const { collection, query, documentId, where, getDocs } =
            await import("firebase/firestore");
          const chunked = claimedIds.slice(0, 10);
          const q = query(
            collection(db, "coupons"),
            where(documentId(), "in", chunked),
          );
          const snap = await getDocs(q);
          setClaimedCouponsList(
            snap.docs.map((d) => ({ id: d.id, ...d.data() })),
          );
        }
      }
    };
    fetchCoupons();
  }, []);

  useEffect(() => {
    const ref = localStorage.getItem("affiliateRef");
    if (ref) {
      setAffiliateRef(ref);
      setCouponCode(ref);
      setAppliedPromo({
        id: "affiliate",
        type: "percent",
        discount: 5,
        code: "REF-LINK",
      });
    }

    fetch("https://api.ipify.org?format=json")
      .then((r) => r.json())
      .then((d) => setUserIp(d.ip))
      .catch(() => setUserIp("Unavailable"));

    const unsubSettings = onSnapshot(doc(db, "settings", "platform"), (doc) => {
      if (doc.exists()) setSettings(doc.data());
    });
    
    const unsubPaymentSettings = onSnapshot(doc(db, "settings", "payment_gateway"), (doc) => {
      if (doc.exists()) setPaymentSettings(doc.data());
    });

    const unsubPayments = onSnapshot(doc(db, "settings", "payments"), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setPaymentSettings((prev: any) => ({...prev, ...data}));
      }
    });

    const cart = JSON.parse(localStorage.getItem("f_cart") || "[]");
    if (cart.length === 0) {
      navigate("/");
      return;
    }
    setItems(cart);

    // Enrich cart items with sellerId from products/{id} if missing, and load seller profile
    (async () => {
      try {
        const enriched = await Promise.all(
          cart.map(async (item: any) => {
            if (item?.sellerId) return item;
            const pid = item?.id || item?.productId;
            if (!pid) return item;
            try {
              const pSnap = await getDoc(doc(db, "products", String(pid)));
              if (pSnap.exists()) {
                const pData = pSnap.data();
                if (pData?.sellerId) {
                  return { ...item, sellerId: pData.sellerId };
                }
              }
            } catch {
              // Ignore individual product lookup error
            }
            return item;
          })
        );
        setItems(enriched);

        const firstSellerId = enriched.find((i: any) => i?.sellerId)?.sellerId;
        if (firstSellerId) {
          const sSnap = await getDoc(doc(db, "users", String(firstSellerId)));
          if (sSnap.exists()) {
            setSellerProfileData({ id: sSnap.id, ...sSnap.data() });
          } else {
            setSellerProfileData(null);
          }
        } else {
          setSellerProfileData(null);
        }
      } catch (err) {
        console.error("Failed to enrich checkout seller info:", err);
      }
    })();

    if (isForeign) {
      setPaymentType("advance");
      setAdvanceType("full");
      setBankingMethod("bank");
    }

    const unsubAuth = auth.onAuthStateChanged((u) => {
      if (u) {
        getDoc(doc(db, "users", u.uid)).then((snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setUserCoins(data.coins || 0);
            if (data.addresses && Array.isArray(data.addresses) && data.addresses.length > 0) {
              const cleaned = data.addresses
                .filter(Boolean)
                .map((a: any, idx: number) => ({
                  id: a?.id || `addr_${idx}_${Date.now()}`,
                  name: typeof a?.name === "string" ? a.name : (data.displayName || "User"),
                  phone: typeof a?.phone === "string" ? a.phone : (data.phoneNumber || ""),
                  address: formatAddressText(a?.address || a),
                  isDefault: Boolean(a?.isDefault)
                }));
              setSavedAddresses(cleaned);
              if (cleaned.length > 0) setSelectedAddressId(cleaned[0].id);
              else setIsAddingNewAddress(true);
            } else if (data.address) {
              const addrStr = formatAddressText(data.address);
              const singleAddr = {
                id: "addr_1",
                name: typeof data.displayName === "string" ? data.displayName : "User",
                phone: typeof data.phoneNumber === "string" ? data.phoneNumber : "",
                address: addrStr,
                isDefault: true
              };
              setSavedAddresses([singleAddr]);
              setSelectedAddressId(singleAddr.id);
            } else {
              setIsAddingNewAddress(true);
            }
          } else {
            setIsAddingNewAddress(true);
          }
          setIsLoading(false);
        }).catch(() => setIsLoading(false));
      } else {
        const rawLocal = localStorage.getItem("vibe_shipping_addresses_v2") || "[]";
        try {
          const parsed = JSON.parse(rawLocal);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const cleaned = parsed
              .filter(Boolean)
              .map((a: any, idx: number) => ({
                id: a?.id || `addr_${idx}_${Date.now()}`,
                name: typeof a?.name === "string" ? a.name : "User",
                phone: typeof a?.phone === "string" ? a.phone : "",
                address: formatAddressText(a?.address || a),
                isDefault: Boolean(a?.isDefault)
              }));
            setSavedAddresses(cleaned);
            if (cleaned.length > 0) setSelectedAddressId(cleaned[0].id);
            else setIsAddingNewAddress(true);
          } else {
            setSavedAddresses([]);
            setIsAddingNewAddress(true);
          }
        } catch {
          setSavedAddresses([]);
          setIsAddingNewAddress(true);
        }
        setIsLoading(false);
      }
    });

    return () => {
      unsubAuth();
      unsubSettings();
      unsubPaymentSettings();
      unsubPayments();
    };
  }, [navigate]);

  // Rotate bKash and Nagad numbers per refresh: non-admin seller orders use ONLY that seller's numbers;
  // Main Admin (e.g. deepshop@gmail.com) or platform orders use Admin settings/payments numbers.
  useEffect(() => {
    const isNonAdminSeller = Boolean(
      sellerProfileData && !isSuperAdminOrAdmin(sellerProfileData)
    );

    let extracted = { bkash: [] as any[], nagad: [] as any[] };
    if (isNonAdminSeller) {
      extracted = extractConfiguredMobileAccounts(sellerProfileData);
    } else {
      const adminMerged = { ...(settings || {}), ...(paymentSettings || {}) };
      extracted = extractConfiguredMobileAccounts(adminMerged);
      if (
        extracted.bkash.length === 0 &&
        extracted.nagad.length === 0 &&
        sellerProfileData
      ) {
        extracted = extractConfiguredMobileAccounts(sellerProfileData);
      }
    }

    const pickedBkash = pickAccountBySeed(extracted.bkash, checkoutRefreshSeed);
    const pickedNagad = pickAccountBySeed(
      extracted.nagad,
      checkoutRefreshSeed + 1
    );

    setActiveBkashNumber(pickedBkash?.number || "");
    setActiveNagadNumber(pickedNagad?.number || "");
  }, [paymentSettings, settings, sellerProfileData, checkoutRefreshSeed]);

  const hasBkashNumber = Boolean(activeBkashNumber && activeBkashNumber !== "01700000000");
  const hasNagadNumber = Boolean(activeNagadNumber && activeNagadNumber !== "01800000000");

  useEffect(() => {
    if (selectedPaymentMethod === "bkash" && !hasBkashNumber && hasNagadNumber) {
      setSelectedPaymentMethod("nagad");
    } else if (selectedPaymentMethod === "nagad" && !hasNagadNumber && hasBkashNumber) {
      setSelectedPaymentMethod("bkash");
    }
  }, [hasBkashNumber, hasNagadNumber, selectedPaymentMethod]);

  // Product classification analysis
  const hasBypassProduct = items.some(
    (item: any) =>
      item.isBypass ||
      item.productType === "bypass" ||
      item.category?.toLowerCase()?.includes("bypass")
  );

  const isAllBypass =
    items.length > 0 &&
    items.every(
      (item: any) =>
        item.isBypass ||
        item.productType === "bypass" ||
        item.category?.toLowerCase()?.includes("bypass")
    );

  const isAllOffer =
    items.length > 0 &&
    items.every((item: any) => item.isOffer || item.productType === "offer");

  const hasOfferProduct = items.some(
    (item: any) => item.isOffer || item.productType === "offer"
  );

  // NID Image Upload Handler using imgbb
  const handleNidUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      notify("NID image size cannot exceed 10MB.", "error");
      return;
    }

    setUploadingNid(true);
    try {
      const url = await uploadToImgbb(file);
      if (url) {
        setNidCardUrl(url);
        notify("NID image uploaded successfully!", "success");
      } else {
        notify("Failed to upload image. Please try again.", "error");
      }
    } catch (err) {
      console.error("NID upload error:", err);
      notify("Failed to upload image.", "error");
    } finally {
      setUploadingNid(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    triggerHaptic("light");
    navigator.clipboard.writeText(text);
    setCopiedNumber(text);
    notify(`${label} number copied: ${text}`, "success");
    setTimeout(() => setCopiedNumber(null), 3000);
  };

  const subtotal = items.reduce((a, c) => a + c.price * c.quantity, 0);
  const deliveryFee = settings?.deliveryCharge || 120;
  let discount = 0;
  if (appliedPromo) {
    if (appliedPromo.type === "percent")
      discount = Math.round(subtotal * (appliedPromo.discount / 100));
    else discount = appliedPromo.discount;
  }
  const total = Math.max(0, subtotal + deliveryFee - discount);

  // User Requirements:
  // 1. Offer mal: Full advance payment
  // 2. Normal border mal: Half advance payment (50%)
  // 3. Bypass mal: Cash on delivery (0 advance), requires Guardian number & optional NID
  // 4. Specific custom products: Custom advance amount set by admin
  let calculatedAdvance = 0;
  items.forEach((item: any) => {
    const itemPrice = Number(item.price || 0);
    const itemQty = Number(item.quantity || 1);
    const itemSubtotal = itemPrice * itemQty;

    const isBypass = !!(
      item.isBypass ||
      item.productType === "bypass" ||
      item.category?.toLowerCase()?.includes("bypass")
    );
    const isOffer = !!(item.isOffer || item.productType === "offer");
    const isCustom = !!(
      item.productType === "custom" ||
      (item.advanceType === "custom" &&
        item.advanceAmount !== undefined &&
        item.advanceAmount !== null &&
        item.advanceAmount !== "")
    );

    if (isBypass) {
      // 0 advance for bypass items
    } else if (isOffer) {
      // Full advance for offer items
      calculatedAdvance += itemSubtotal;
    } else if (isCustom) {
      // Custom advance amount per unit set by admin
      calculatedAdvance += Math.min(itemSubtotal, Number(item.advanceAmount) * itemQty);
    } else {
      // Normal border product: 50% half advance
      calculatedAdvance += Math.round(itemSubtotal * 0.5);
    }
  });

  let requiredAdvance = 0;
  if (isVipSubscriber) {
    // 👑 VIP Subscription: 100% Cash On Delivery with 0 advance!
    requiredAdvance = 0;
  } else if (isAllBypass) {
    requiredAdvance = 0;
  } else if (isAllOffer) {
    requiredAdvance = total;
  } else {
    requiredAdvance = Math.min(total, calculatedAdvance);
  }

  const dueOnDelivery = Math.max(0, total - requiredAdvance);

  const handleSaveAddress = async () => {
    if (!newAddress.name?.trim() || !newAddress.phone?.trim() || !newAddress.address?.trim()) {
      return notify("Please fill in all required fields.", "error");
    }

    // Abuse detection
    const abuseName = detectAbuse(newAddress.name);
    const abuseAddr = detectAbuse(newAddress.address);
    const abusePhone = detectAbuse(newAddress.phone);
    if (abuseName.hasAbuse || abuseAddr.hasAbuse || abusePhone.hasAbuse) {
      const strikeRes = await recordAbuseStrike("Address form abusive language");
      notify(strikeRes.message, "error");
      return;
    }

    // Bangladeshi Phone validation
    const phoneVal = validateBangladeshiPhone(newAddress.phone);
    if (!phoneVal.isValid) {
      return notify(phoneVal.error || "Please enter a valid 11-digit Bangladeshi phone number.", "error");
    }

    let normalizedAlt = "";
    if (newAddress.altPhone && newAddress.altPhone.trim()) {
      const altVal = validateBangladeshiPhone(newAddress.altPhone);
      if (!altVal.isValid) {
        return notify(altVal.error || "Alternative phone number is not a valid Bangladeshi number.", "error");
      }
      normalizedAlt = altVal.normalized;
    }

    const newAddrObj = {
      id: Math.random().toString(36).substring(7),
      name: newAddress.name.trim(),
      phone: phoneVal.normalized,
      altPhone: normalizedAlt,
      address: newAddress.address.trim(),
    };
    const newAddrs = [...savedAddresses, newAddrObj];
    const u = auth.currentUser;
    if (u) {
      try {
        const { setDoc } = await import("firebase/firestore");
        await setDoc(
          doc(db, "users", u.uid),
          { 
            addresses: newAddrs,
            address: newAddrObj.address
          },
          { merge: true },
        );
        setSavedAddresses(newAddrs);
        setSelectedAddressId(newAddrObj.id);
        setIsAddingNewAddress(false);
        notify("Address saved successfully.", "success");
      } catch (e) {
        notify("Failed to save address.", "error");
      }
    } else {
      setSavedAddresses(newAddrs);
      setSelectedAddressId(newAddrObj.id);
      setIsAddingNewAddress(false);
      localStorage.setItem(
        "vibe_shipping_addresses_v2",
        JSON.stringify(newAddrs),
      );
      notify("Address added successfully.", "success");
    }
  };

  const applyPromo = async () => {
    setCouponError("");
    if (!couponCode.trim()) return;
    try {
      const { query, where, getDocs, collection } =
        await import("firebase/firestore");
      // Search promo_codes first
      const qPromo = query(
        collection(db, "promo_codes"),
        where("code", "==", couponCode.trim().toUpperCase()),
      );
      let snap = await getDocs(qPromo);
      
      let isVoucher = false;
      if (snap.empty) {
         // Search coupons collection as fallback
         const qCoupon = query(
            collection(db, "coupons"),
            where("code", "==", couponCode.trim().toUpperCase()),
         );
         snap = await getDocs(qCoupon);
         isVoucher = true;
      }
      
      if (snap.empty) {
        setCouponError("Invalid promo/coupon code");
      } else {
        const c = snap.docs[0].data();
        if (!c.isActive) {
          setCouponError("Promo code inactive");
        } else if (c.expiresAt && c.expiresAt < Date.now()) {
          setCouponError("Promo code expired");
        } else if (c.minOrderAmount && subtotal < c.minOrderAmount) {
          setCouponError(`Minimum order amount is ${formatPrice(c.minOrderAmount)}`);
        } else if (c.maxUses && c.usedCount >= c.maxUses) {
          setCouponError("Promo code fully used");
        } else {
          setAppliedPromo({ id: snap.docs[0].id, ...c, isVoucher });
          notify("Promo code applied!", "success");
        }
      }
    } catch (e) {
      setCouponError("Error verifying promo code");
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setCouponCode("");
  };

  const placeOrder = async () => {
    if (!navigator.onLine) {
        window.dispatchEvent(new Event("showNetworkError"));
        return;
    }

    // Rate Limiting to prevent spam orders
    const lastOrder = localStorage.getItem("vibe_last_order");
    const now = Date.now();
    if (lastOrder && now - parseInt(lastOrder) < 1000 * 60) { // 1 minute limit per IP/Browser
       return notify("You are placing orders too quickly. Please wait a moment.", "error");
    }

    const rawActiveAddress = savedAddresses.find(
      (a) => a.id === selectedAddressId,
    );
    if (!rawActiveAddress) return notify("Delivery address is required.", "error");

    const activeAddress = {
      ...rawActiveAddress,
      name: typeof rawActiveAddress.name === "string" ? rawActiveAddress.name.trim() : "User",
      phone: typeof rawActiveAddress.phone === "string" ? rawActiveAddress.phone.trim() : "",
      address: formatAddressText(rawActiveAddress.address)
    };

    // Abuse checks
    const abuseName = detectAbuse(activeAddress.name);
    const abuseAddr = detectAbuse(activeAddress.address);
    const abuseGift = isGift ? detectAbuse(giftNote) : { hasAbuse: false };
    if (abuseName.hasAbuse || abuseAddr.hasAbuse || abuseGift.hasAbuse) {
      const strikeRes = await recordAbuseStrike("Order submission with abusive details");
      notify(strikeRes.message, "error");
      return;
    }

    // Validate phone numbers
    const phoneVal = validateBangladeshiPhone(activeAddress.phone);
    if (!phoneVal.isValid) {
      return notify(`Invalid customer phone number: ${phoneVal.error || "Please enter a valid 11-digit Bangladeshi number"}`, "error");
    }

    let validGuardian = "";
    if (hasBypassProduct && !isVipSubscriber) {
      const guardianVal = validateBangladeshiPhone(guardianNumber);
      if (!guardianVal.isValid) {
        return notify(`Invalid guardian phone number: ${guardianVal.error || "Please enter a valid 11-digit Bangladeshi number"}`, "error");
      }
      validGuardian = guardianVal.normalized;
    }

    if (paymentType === "dpcoin") {
      const coinCost = advanceType === "full" ? total : requiredAdvance;
      if (userCoins < coinCost) {
        notify(`Not enough DP Coins. You need ${coinCost - userCoins} more coins. Please deposit.`, "error");
        navigate("/deposit", { state: { requiredDeposit: coinCost - userCoins } });
        return;
      }
    }

    setIsLoading(true);
    try {
      const activeReceiver =
        selectedPaymentMethod === "bkash"
          ? activeBkashNumber || ""
          : activeNagadNumber || "";

      let paymentStr = "Cash on Delivery";
      let paymentOptStr = "Cash on Delivery";

      if (paymentType === "dpcoin") {
        paymentStr = "DP Coins";
        paymentOptStr = advanceType === "full" ? "Full Payment with DP Coins" : `Advance ৳${requiredAdvance} with DP Coins`;
      } else if (isVipSubscriber) {
        paymentStr = "Cash on Delivery";
        paymentOptStr = "👑 VIP Member 0% Advance Full COD";
      } else if (requiredAdvance > 0) {
        paymentStr = selectedPaymentMethod === "bkash" ? "bKash" : "Nagad";
        paymentOptStr = isAllOffer 
          ? "Full Advance (Offer Product)" 
          : hasBypassProduct 
            ? "Bypass + Advance Booking" 
            : `Advance ৳${requiredAdvance} (${selectedPaymentMethod === "bkash" ? "bKash" : "Nagad"})`;
      } else {
        paymentStr = "Cash on Delivery";
        paymentOptStr = "Cash on Delivery (Bypass Product)";
      }

      const resolvedPrimarySellerId =
        items.find((i: any) => i?.sellerId)?.sellerId || null;

      const orderData: any = {
        userId: auth.currentUser?.uid || "guest",
        sellerId: resolvedPrimarySellerId,
        customerName: activeAddress.name.trim(),
        isVipOrder: !!isVipSubscriber,
        items: items.map((i: any) => ({
          productId: i.id,
          quantity: i.quantity,
          priceAtPurchase: i.price,
          name: i.name,
          image: i.image,
          sellerId: i.sellerId || null,
          isBypass: !!(i.isBypass || i.productType === "bypass" || i.category?.toLowerCase()?.includes("bypass")),
          isOffer: !!(i.isOffer || i.productType === "offer"),
          advanceAmount: i.advanceAmount || null,
          advanceType: i.advanceType || null,
        })),
        total: total,
        subTotal: subtotal,
        discount: discount,
        advanceAmount: requiredAdvance,
        dueAmount: dueOnDelivery,
        deliveryFee: deliveryFee,
        couponCode: appliedPromo ? appliedPromo.code : null,
        status: OrderStatus.PENDING,
        paymentMethod: paymentStr,
        paymentOption: paymentOptStr,
        receiverNumber: requiredAdvance > 0 ? activeReceiver : "",
        senderNumber: customerSenderNumber.trim(),
        accountNameSender: customerSenderNumber.trim(),
        transactionId: customerTrxId.trim(),
        lastDigits: customerTrxId.trim(),
        guardianNumber: validGuardian || null,
        nidCardUrl: nidCardUrl.trim() || null,
        productClassification: isAllBypass ? "Bypass" : isAllOffer ? "Offer" : hasBypassProduct ? "Mixed Bypass" : "Normal Border",
        shippingAddress: activeAddress.address,
        contactNumber: phoneVal.normalized,
        altNumber: activeAddress.altPhone || "",
        ipAddress: userIp,
        createdAt: Date.now(),
        isSuspicious: false,
        riskReason: "",
        isGift: isGift,
        giftNote: isGift ? giftNote : null,
        affiliateRef: affiliateRef || null,
        estimatedDelivery: "1 Month+ (approx 30 - 45 days)",
        deliveryNotice: "1 Month+ border cross imported product delivery time",
        finalized: true,
      };

      const requiresAdvanceGateway = requiredAdvance > 0 && paymentType !== "dpcoin";
      if (requiresAdvanceGateway) {
        orderData.status = "awaiting_payment";
        orderData.paymentStatus = "unpaid";
      }

      const docRef = await addDoc(collection(db, "orders"), orderData);
      const finalDocId = docRef.id;

      // Only notify sellers and admins if order does not require advance gateway payment
      if (!requiresAdvanceGateway) {
        try {
          const uniqueSellerIds = Array.from(new Set(orderData.items.map((item: any) => item.sellerId).filter(Boolean)));
          uniqueSellerIds.forEach((sellerId) => {
            fetch("/api/send-push-user", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: sellerId,
                title: "New Customer Order! 🛍️",
                body: `You received a new order from ${activeAddress.name} for ৳${total}.`,
                link: "/seller/dashboard"
              })
            }).catch(err => console.error("Seller push notification failed:", err));

            // In-app Firestore notification for seller
            addDoc(collection(db, "notifications"), {
              userId: sellerId,
              title: "New Customer Order! 🛍️",
              message: `You received a new order #${finalDocId.slice(0, 8)} from ${activeAddress.name || 'Customer'} for ৳${total}.`,
              link: "/seller/dashboard",
              type: "order",
              orderId: finalDocId,
              createdAt: Date.now(),
              isRead: false
            }).catch(console.error);
          });

          // Notify admins of new order
          fetch("/api/send-push-admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: "New Customer Order! 🛍️",
              body: `A new order was placed by ${activeAddress.name} for ৳${total}.`,
              link: "/admin/orders"
            })
          }).catch(err => console.error("Admin order push failed:", err));

          // In-app notification for admin
          addDoc(collection(db, "notifications"), {
            userId: "admin",
            title: "New Customer Order! 🛍️",
            message: `A new order #${finalDocId.slice(0, 8)} was placed by ${activeAddress.name || 'Customer'} for ৳${total}.`,
            link: "/admin/orders",
            type: "order",
            orderId: finalDocId,
            createdAt: Date.now(),
            isRead: false
          }).catch(console.error);

          // Notify the seller
          const firstSellerId = orderData.items?.[0]?.sellerId;
          if (firstSellerId) {
            fetch("/api/web-push/send-order", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ sellerId: firstSellerId, orderId: finalDocId })
            }).catch(console.error);
          }
          
          // Notify the customer themselves
          const currentLoggedInUser = auth.currentUser;
          if (currentLoggedInUser?.uid) {
            fetch("/api/send-push-user", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: currentLoggedInUser.uid,
                title: "Order Placed Successfully! 🎉",
                body: `Thank you for shopping! Your order for ৳${total} has been received.`,
                link: "/my-orders"
              })
            }).catch(err => console.error("Customer order push failed:", err));
          }
        } catch (e) {
          console.error("Failed to send order push notifications:", e);
        }

        // Send to Telegram with full A-Z details
        try {
          await sendOrderToTelegram({ ...orderData, id: finalDocId });
        } catch (tgErr) {
          console.error("Telegram order notification error:", tgErr);
        }
      }

      if (orderData.affiliateRef) {
        try {
          const { increment } = await import("firebase/firestore");
          await updateDoc(doc(db, "users", orderData.affiliateRef), {
            walletBalance: increment(50),
          });
          await addDoc(collection(db, "affiliates_log"), {
            affiliateId: orderData.affiliateRef,
            orderId: finalDocId,
            customerName: activeAddress.name,
            commission: 50,
            createdAt: Date.now(),
          });
        } catch (e) {}
      }

      if (appliedPromo && appliedPromo.id !== "affiliate") {
        try {
          const { increment, arrayUnion } = await import("firebase/firestore");
          const collectionName = appliedPromo.isVoucher
            ? "coupons"
            : "promo_codes";
          await updateDoc(doc(db, collectionName, appliedPromo.id), {
            usedCount: increment(1),
            usedIPs: arrayUnion(userIp),
          });
        } catch (e) {}
      }

      if (paymentType === "dpcoin" && auth.currentUser) {
        try {
          const { increment } = await import("firebase/firestore");
          const coinCost = advanceType === "full" ? total : requiredAdvance;
          await handleCoinDeductionWithExpiry(auth.currentUser.uid, coinCost);
        } catch (e) {
          console.error("Failed to deduct coins", e);
        }
      }

      // Grant coins for eligible products
      if (auth.currentUser) {
        let totalCoinsEarned = 0;
        for (const i of items) {
          const baseReward = (i.coinReward !== undefined && i.coinReward !== null && String(i.coinReward).trim() !== "") ? Number(i.coinReward) : getProductCoinReward(i.id);
          const reward = baseReward * i.quantity;
          totalCoinsEarned += reward;
        }
        if (totalCoinsEarned > 0) {
          try {
            const { increment, arrayUnion } = await import("firebase/firestore");
            const expiryAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
              coins: increment(totalCoinsEarned),
              coinBatches: arrayUnion({
                  id: Date.now().toString(),
                  amount: totalCoinsEarned,
                  expiresAt: expiryAt,
                  type: "reward"
              })
            });
          } catch (e) {
            console.error("Failed to add reward coins", e);
          }
        }
      }

      localStorage.removeItem("f_cart");
      localStorage.setItem("vibe_last_order", Date.now().toString());

      if (requiredAdvance > 0 && paymentType !== "dpcoin") {
        navigate(`/payment/${finalDocId}`);
      } else {
        navigate(`/success?orderId=${finalDocId}`);
      }
    } catch (err: any) {
      console.error("Order placement error:", err);
      notify("Order failed! Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!selectedAddressId) return false;
      if (hasBypassProduct && !isVipSubscriber && (!guardianNumber.trim() || guardianNumber.trim().replace(/\D/g, "").length < 11)) {
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (paymentType === "dpcoin") {
        return userCoins >= (advanceType === "full" ? total : requiredAdvance);
      }
      return true;
    }
    if (step === 3) return agreeToTerms;
    return false;
  };

  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  const speakStepGuide = (targetStep: number) => {
    if (isAuthVoiceMuted()) return;
    if (targetStep === 1) {
      playAuthVoice("ডেলিভারি ঠিকানা নির্বাচন করুন অথবা নতুন ঠিকানা যোগ করুন।");
    } else if (targetStep === 2) {
      if (requiredAdvance === 0) {
        playAuthVoice("আপনার অর্ডারে কোনো অগ্রিম পেমেন্ট প্রযোজ্য নয়। ক্যাশ অন ডেলিভারি সুবিধা সক্রিয় আছে।");
      } else {
        playAuthVoice("পেমেন্ট তথ্য যাচাই করুন এবং পরবর্তী ধাপে অর্ডার রিভিউ করুন।");
      }
    } else if (targetStep === 3) {
      playAuthVoice("আপনার অর্ডারের ঠিকানা ও পেমেন্ট তথ্য যাচাই করে শর্তাবলীতে টিক দিন এবং অর্ডার কনফার্ম করুন।");
    }
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!selectedAddressId) {
        triggerHaptic("error");
        return notify("Please select a delivery address.", "error");
      }
      if (
        hasBypassProduct &&
        !isVipSubscriber &&
        (!guardianNumber.trim() || guardianNumber.trim().replace(/\D/g, "").length < 11)
      ) {
        triggerHaptic("error");
        return notify(
          "Please provide an 11-digit guardian phone number for Bypass COD verification.",
          "error"
        );
      }
    }
    if (currentStep === 2) {
      if (paymentType === "dpcoin") {
        const coinCost = advanceType === "full" ? total : requiredAdvance;
        if (userCoins < coinCost) {
          triggerHaptic("error");
          return notify(
            `Not enough DP Coins. You need ${coinCost - userCoins} more coins.`,
            "error"
          );
        }
      }
    }
    if (validateStep(currentStep)) {
      triggerHaptic("selection");
      const target = Math.min(currentStep + 1, 3);
      setCurrentStep(target);
      speakStepGuide(target);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      triggerHaptic("warning");
      notify("Please fill in all required details accurately.", "error");
    }
  };

  const prevStep = () => {
    triggerHaptic("light");
    const target = Math.max(currentStep - 1, 1);
    setCurrentStep(target);
    speakStepGuide(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const { swipeHandlers: checkoutSwipeHandlers } = useSwipeNavigation({
    disabled: showCouponsModal,
    onSwipeRight: () => {
      if (currentStep > 1) {
        prevStep();
      }
    },
    onEdgeSwipeRight: () => {
      if (currentStep > 1) {
        prevStep();
      } else {
        triggerHaptic("light");
        navigate(-1);
      }
    },
  });

  const jumpToStep = (step: number) => {
    if (step < currentStep) {
      triggerHaptic("selection");
      setCurrentStep(step);
      speakStepGuide(step);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (step === currentStep + 1 && validateStep(currentStep)) {
      nextStep();
    }
  };

  const totalItemQty = items.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0);
  const selectedAddrObj = savedAddresses.find((a) => a.id === selectedAddressId);

  const stepsMeta = [
    { step: 1, shortLabel: "Delivery", fullLabel: "01. Delivery Address", icon: Truck },
    { step: 2, shortLabel: "Payment", fullLabel: "02. Payment Method", icon: CreditCard },
    { step: 3, shortLabel: "Review", fullLabel: "03. Final Review", icon: Check },
  ];

  // Shared Voucher & Promo Input Block (rendered inside Mobile Sheet & Desktop Sticky Console)
  const renderPromoControls = () => (
    <div className="space-y-2.5">
      {!appliedPromo ? (
        <>
          <button
            type="button"
            onClick={() => setShowCouponsModal(true)}
            className="w-full px-4 py-2.5 ds-liquid-subpanel hover:opacity-90 transition-opacity flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-100 cursor-pointer"
          >
            <span className="flex items-center gap-2 whitespace-nowrap">
              <Ticket className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>Select a Voucher or Coupon</span>
            </span>
            <span className="text-[11px] text-sky-600 dark:text-sky-400 font-bold whitespace-nowrap">
              Browse
            </span>
          </button>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Enter promo or affiliate code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="flex-1 min-w-0 h-10 px-3.5 text-xs font-medium ds-liquid-input outline-none focus:ring-2 focus:ring-sky-500/40"
            />
            <button
              type="button"
              onClick={applyPromo}
              className="px-4 h-10 ds-liquid-btn-secondary !min-h-0 !text-xs !font-bold shrink-0 whitespace-nowrap cursor-pointer"
            >
              Apply
            </button>
          </div>
          {couponError && (
            <p className="text-xs font-semibold text-rose-500 px-1">{couponError}</p>
          )}
        </>
      ) : (
        <div className="flex items-center justify-between gap-2 p-3 ds-liquid-callout-emerald">
          <div className="min-w-0 flex items-center gap-2.5">
            <Ticket className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white truncate">
                {appliedPromo.code}
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium tabular-nums">
                {appliedPromo.type === "percent"
                  ? `${appliedPromo.discount}% discount applied`
                  : `${formatPrice(appliedPromo.discount)} discount applied`}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={removePromo}
            aria-label="Remove promo code"
            className="w-7 h-7 rounded-full ds-liquid-btn-secondary !min-h-0 p-0 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );

  // Shared Price Breakdown Rows
  const renderPriceBreakdown = () => (
    <div className="space-y-2.5 text-xs sm:text-sm">
      <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
        <span>{t("Subtotal") || "Subtotal"} ({totalItemQty} {totalItemQty === 1 ? "item" : "items"})</span>
        <span className="font-semibold text-zinc-900 dark:text-white tabular-nums">
          {formatPrice(subtotal)}
        </span>
      </div>
      {discount > 0 && (
        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
          <span>Discount</span>
          <span className="tabular-nums">-{formatPrice(discount)}</span>
        </div>
      )}
      <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
        <span>{t("Delivery Fee") || "Delivery Fee"}</span>
        <span className="font-semibold text-zinc-900 dark:text-white tabular-nums">
          {formatPrice(deliveryFee)}
        </span>
      </div>

      <div className="pt-3 border-t border-slate-900/[0.08] dark:border-white/[0.1] flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold text-zinc-900 dark:text-white">
          {t("Total") || "Total"}
        </span>
        <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white tabular-nums">
          {formatPrice(total)}
        </span>
      </div>

      {/* Advance vs Due Transparency Line */}
      <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
        <span>
          Pay Advance Now:{" "}
          <strong className="text-zinc-900 dark:text-white">
            {requiredAdvance === 0 ? "৳0" : formatPrice(requiredAdvance)}
          </strong>
        </span>
        <span>·</span>
        <span>
          Due on Delivery:{" "}
          <strong className="text-zinc-900 dark:text-white">
            {formatPrice(dueOnDelivery)}
          </strong>
        </span>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="w-full min-h-[calc(100vh-56px)] ds-liquid-checkout-shell py-6 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="ds-liquid-panel p-5 flex items-center justify-between gap-4">
            <div className="h-7 w-44 rounded-full ds-skeleton" />
            <div className="h-10 w-64 rounded-full ds-skeleton hidden sm:block" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
            <div className="lg:col-span-7 ds-liquid-panel p-6 space-y-4">
              <div className="h-6 w-48 rounded-full ds-skeleton" />
              <div className="h-28 w-full rounded-2xl ds-skeleton" />
              <div className="h-28 w-full rounded-2xl ds-skeleton" />
            </div>
            <div className="hidden lg:block lg:col-span-5 ds-liquid-panel p-6 space-y-4">
              <div className="h-6 w-40 rounded-full ds-skeleton" />
              <div className="h-20 w-full rounded-2xl ds-skeleton" />
              <div className="h-32 w-full rounded-2xl ds-skeleton" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      {...checkoutSwipeHandlers}
      className="w-full min-h-[calc(100vh-56px)] ds-liquid-checkout-shell py-4 sm:py-7 lg:py-9 px-3.5 sm:px-6 pb-28 lg:pb-16"
    >
      <div className="max-w-6xl mx-auto space-y-5 lg:space-y-7">
        {/* =====================================================================
            DESKTOP LIQUID GLASS TOP BAR (lg and up)
            Wide architectural header + interactive Liquid Glass Segmented Dock
           ===================================================================== */}
        <div className="hidden lg:flex items-center justify-between gap-6 ds-liquid-panel px-7 py-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white whitespace-nowrap">
              Secure Checkout
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 tabular-nums">
              {totalItemQty} {totalItemQty === 1 ? "item" : "items"} · Step {currentStep}/3 · Encrypted Order Processing
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="ds-liquid-dock rounded-full p-1.5 flex items-center gap-1">
              {stepsMeta.map(({ step, fullLabel, icon: Icon }) => {
                const isActive = currentStep === step;
                const isDone = currentStep > step;
                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => jumpToStep(step)}
                    disabled={step > currentStep && !validateStep(currentStep)}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed",
                      isActive
                        ? "ds-liquid-dock-pill text-zinc-900 dark:text-white"
                        : isDone
                          ? "text-sky-600 dark:text-sky-400 hover:opacity-80"
                          : "text-zinc-400 dark:text-zinc-500"
                    )}
                  >
                    {isDone ? (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                    <span>{fullLabel}</span>
                  </button>
                );
              })}
            </div>

            <AuthVoiceToggle isInline />
          </div>
        </div>

        {/* =====================================================================
            MOBILE & TABLET LIQUID GLASS HEADER + COLLAPSIBLE SUMMARY (< lg)
            Thumb-friendly segmented bar + expandable frosted order drawer
           ===================================================================== */}
        <div className="flex lg:hidden flex-col gap-3">
          {/* Mobile Title + Voice Assistant Row */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white truncate">
                Checkout
              </h1>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                {totalItemQty} {totalItemQty === 1 ? "item" : "items"} · Step {currentStep}/3
              </p>
            </div>
            <AuthVoiceToggle isInline />
          </div>

          {/* Mobile 3-Segment Liquid Glass Stepper */}
          <div className="ds-liquid-dock rounded-full p-1 grid grid-cols-3 gap-1">
            {stepsMeta.map(({ step, shortLabel, icon: Icon }) => {
              const isActive = currentStep === step;
              const isDone = currentStep > step;
              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => jumpToStep(step)}
                  disabled={step > currentStep && !validateStep(currentStep)}
                  className={cn(
                    "py-2 px-2 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-150 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed",
                    isActive
                      ? "ds-liquid-dock-pill text-zinc-900 dark:text-white"
                      : isDone
                        ? "text-sky-600 dark:text-sky-400"
                        : "text-zinc-400 dark:text-zinc-500"
                  )}
                >
                  {isDone ? (
                    <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                  ) : (
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile Collapsible Liquid Glass Order Summary Sheet */}
          <div className="ds-liquid-panel !rounded-[24px] overflow-hidden">
            <button
              type="button"
              onClick={() => setMobileSummaryOpen((prev) => !prev)}
              className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex -space-x-2 shrink-0">
                  {items.slice(0, 3).map((item, idx) => (
                    <div
                      key={`${item.id}_${idx}`}
                      className="w-9 h-9 rounded-xl ds-liquid-subpanel overflow-hidden flex items-center justify-center p-0.5"
                    >
                      <img
                        src={getProductDisplayImage(item)}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </div>
                  ))}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1 whitespace-nowrap">
                    <span>Order Summary & Vouchers</span>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-zinc-500 transition-transform duration-200 shrink-0",
                        mobileSummaryOpen && "rotate-180"
                      )}
                    />
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate tabular-nums">
                    {mobileSummaryOpen ? "Tap to collapse" : `${totalItemQty} ${totalItemQty === 1 ? "item" : "items"} · Add voucher`}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-white tabular-nums">
                  {formatPrice(total)}
                </div>
                {discount > 0 && (
                  <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    -{formatPrice(discount)} off
                  </div>
                )}
              </div>
            </button>

            {mobileSummaryOpen && (
              <div className="px-4 pb-4 pt-3 border-t border-slate-900/[0.07] dark:border-white/[0.08] space-y-4">
                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2.5 ds-liquid-subpanel"
                    >
                      <div className="relative w-12 h-12 rounded-xl bg-white/70 dark:bg-white/5 overflow-hidden shrink-0 p-1">
                        <PixelImage
                          src={getProductDisplayImage(item)}
                          alt={item.name}
                          className="w-full h-full bg-transparent"
                          imgClassName="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 tabular-nums">
                          Qty: {item.quantity} × {formatPrice(item.price)}
                        </div>
                      </div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-white shrink-0 tabular-nums">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>

                {renderPromoControls()}
                <div className="pt-2 border-t border-slate-900/[0.07] dark:border-white/[0.08]">
                  {renderPriceBreakdown()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =====================================================================
            MAIN ASYMMETRIC WORKSPACE:
            Left 7 Cols (Active Step Liquid Glass Stage) + Right 5 Cols (Desktop Sticky Glass Console)
           ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* LEFT / MAIN STAGE */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* ------------------------- STEP 1: SHIPPING ------------------------- */}
            {currentStep === 1 && (
              <div className="ds-liquid-panel p-4 sm:p-6 lg:p-7 space-y-6">
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-900/[0.07] dark:border-white/[0.08]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl ds-liquid-subpanel flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white truncate">
                        {t("Shipping Information") || "Shipping Address"}
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        Select a delivery address or add a new one
                      </p>
                    </div>
                  </div>
                </div>

                {/* Saved Addresses: 1-col on mobile, 2-col grid on desktop when multiple addresses exist */}
                {savedAddresses && savedAddresses.length > 0 ? (
                  <div className="space-y-4">
                    <div
                      className={cn(
                        "grid grid-cols-1 gap-3",
                        savedAddresses.length > 1 && "md:grid-cols-2"
                      )}
                    >
                      {savedAddresses.filter(Boolean).map((addr, idx) => {
                        const addrId = String(addr?.id || `addr_${idx}`);
                        const addrName =
                          typeof addr?.name === "string" ? addr.name : "User";
                        const addrPhone =
                          typeof addr?.phone === "string" ? addr.phone : "";
                        const addrText = formatAddressText(addr?.address || addr);
                        const isSelected = selectedAddressId === addrId;

                        return (
                          <div
                            key={addrId}
                            onClick={() => {
                              setSelectedAddressId(addrId);
                              if (!isAuthVoiceMuted()) {
                                playAuthVoice(`${addrName} এর ডেলিভারি ঠিকানা নির্বাচন করা হয়েছে।`);
                              }
                            }}
                            className={cn(
                              "p-4 cursor-pointer transition-transform duration-150 active:scale-[0.99] flex flex-col justify-between gap-2",
                              isSelected
                                ? "ds-liquid-subpanel-active"
                                : "ds-liquid-subpanel hover:opacity-95"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={cn(
                                  "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                                  isSelected
                                    ? "border-[#0d82ff] bg-[#0d82ff]"
                                    : "border-zinc-300 dark:border-zinc-600"
                                )}
                              >
                                {isSelected && (
                                  <Check className="w-3 h-3 text-white stroke-[3]" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                                    {addrName}
                                  </span>
                                  {addr?.isDefault && (
                                    <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400 shrink-0">
                                      Default
                                    </span>
                                  )}
                                </div>
                                {addrPhone && (
                                  <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 tabular-nums">
                                    {addrPhone}
                                  </div>
                                )}
                                {addrText && (
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                                    {addrText}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => navigate("/shipping-address")}
                        className="px-4 py-3 ds-liquid-btn-secondary !min-h-[44px] !text-xs sm:!text-sm flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                      >
                        <Plus className="w-4 h-4 shrink-0" />
                        <span>Add New Address</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate("/shipping-address")}
                        className="px-4 py-3 ds-liquid-subpanel hover:opacity-90 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-200 flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition-opacity"
                      >
                        <Settings className="w-4 h-4 text-zinc-500 shrink-0" />
                        <span>Manage Addresses</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-7 ds-liquid-subpanel text-center space-y-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 max-w-xs mx-auto">
                      <h4 className="font-bold text-zinc-900 dark:text-white text-sm sm:text-base">
                        No Delivery Address Found
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Please add your delivery address to complete this order.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/shipping-address")}
                      className="px-6 py-3 ds-liquid-btn-primary !min-h-[44px] !text-xs sm:!text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Address</span>
                    </button>
                  </div>
                )}

                {/* Gift Option & Bypass Verification */}
                <div className="pt-5 border-t border-slate-900/[0.07] dark:border-white/[0.08] space-y-4">
                  <div className="p-3.5 sm:p-4 ds-liquid-subpanel space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <label
                        htmlFor="gift"
                        className="flex items-center gap-3 cursor-pointer min-w-0"
                      >
                        <Checkbox
                          id="gift"
                          checked={isGift}
                          onCheckedChange={(c) => setIsGift(!!c)}
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                            <Gift className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                            <span>Send as a Gift</span>
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            Product prices will be hidden on the invoice
                          </p>
                        </div>
                      </label>
                    </div>

                    {isGift && (
                      <div className="pt-1 space-y-1.5">
                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          Gift Note (Personal Message)
                        </Label>
                        <input
                          type="text"
                          placeholder="e.g., Happy Birthday!..."
                          value={giftNote}
                          onChange={(e) => setGiftNote(e.target.value)}
                          className="w-full h-11 px-3.5 text-sm ds-liquid-input outline-none focus:ring-2 focus:ring-sky-500/40"
                        />
                      </div>
                    )}
                  </div>

                  {/* Bypass Mal Verification Section */}
                  {hasBypassProduct && !isVipSubscriber && (
                    <div className="p-4 sm:p-5 ds-liquid-callout-amber space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                          <PhoneCall className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white">
                              Bypass Cash on Delivery Verification
                            </h4>
                            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 shrink-0">
                              COD Eligible
                            </span>
                          </div>
                          <p className="text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 leading-relaxed">
                            Provide an active guardian phone number to confirm Cash on Delivery without advance payment
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="guardianNumber"
                          className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-between"
                        >
                          <span>
                            Guardian Mobile Number <span className="text-rose-500">*</span>
                          </span>
                          <span className="text-[11px] text-amber-700 dark:text-amber-300 font-normal">
                            11 digits required
                          </span>
                        </Label>
                        <input
                          id="guardianNumber"
                          type="tel"
                          placeholder="01XXXXXXXXX"
                          value={guardianNumber}
                          onFocus={() => {
                            if (!isAuthVoiceMuted()) {
                              playAuthVoice(
                                "ক্যাশ অন ডেলিভারি নিশ্চিত করতে অভিভাবকের এগারো ডিজিটের মোবাইল নম্বর লিখুন।"
                              );
                            }
                          }}
                          onChange={(e) => setGuardianNumber(e.target.value)}
                          className="w-full h-11 px-3.5 text-sm ds-liquid-input outline-none focus:ring-2 focus:ring-amber-500/40 tabular-nums"
                        />
                        <p className="text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-1.5 pt-0.5 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>A verification call may be placed to your guardian to confirm the order</span>
                        </p>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-amber-500/20">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                            Attach NID Card (Optional)
                          </Label>
                          <span className="text-[11px] text-zinc-500">Max 10MB</span>
                        </div>

                        {nidCardUrl ? (
                          <div className="flex items-center justify-between p-3 ds-liquid-subpanel">
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={nidCardUrl}
                                alt="Uploaded NID"
                                referrerPolicy="no-referrer"
                                className="w-11 h-11 object-cover rounded-xl border border-white/40 shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">
                                  NID Card Image Attached
                                </p>
                                <p className="text-[11px] text-zinc-500 truncate">
                                  Saved for verification
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setNidCardUrl("")}
                              className="px-3 py-1.5 rounded-full text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center p-4 border border-dashed border-amber-500/40 hover:border-amber-500/70 rounded-2xl cursor-pointer bg-white/50 dark:bg-white/5 transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingNid}
                              onChange={handleNidUpload}
                            />
                            {uploadingNid ? (
                              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Uploading NID image...</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-center">
                                <Upload className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                                  Upload your or your guardian&apos;s NID card photo
                                </span>
                              </div>
                            )}
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 1 Footer CTA */}
                <div className="pt-4 border-t border-slate-900/[0.07] dark:border-white/[0.08] flex justify-end">
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={!validateStep(1)}
                    className="w-full sm:w-auto sm:min-w-[230px] px-7 py-3.5 ds-liquid-btn-primary flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                  >
                    <span>Continue to Payment</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </div>
            )}

            {/* ------------------------- STEP 2: PAYMENT ------------------------- */}
            {currentStep === 2 && (
              <div className="ds-liquid-panel p-4 sm:p-6 lg:p-7 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-900/[0.07] dark:border-white/[0.08]">
                  <div className="w-10 h-10 rounded-2xl ds-liquid-subpanel flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white truncate">
                      Payment Method & Breakdown
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      Review your payable breakdown and payment method
                    </p>
                  </div>
                </div>

                {requiredAdvance === 0 ? (
                  /* Zero Advance (VIP Full COD or Bypass COD) */
                  <div className="p-4 sm:p-6 ds-liquid-callout-emerald space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          {isVipSubscriber ? (
                            <Crown className="w-5 h-5" />
                          ) : (
                            <Truck className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white">
                            {isVipSubscriber
                              ? "VIP 100% Cash on Delivery"
                              : "Cash on Delivery (COD)"}
                          </h3>
                          <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 leading-relaxed">
                            {isVipSubscriber
                              ? "Your VIP Pass is active—this order confirms with zero advance payment."
                              : "No advance payment is required for this order right now."}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 shrink-0 whitespace-nowrap">
                        {isVipSubscriber ? "VIP Member · ৳0 Advance" : "Bypass · ৳0 Advance"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="p-3.5 ds-liquid-subpanel flex sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-1">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Total Order Value</span>
                        <span className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-white tabular-nums">
                          {formatPrice(total)}
                        </span>
                      </div>
                      <div className="p-3.5 ds-liquid-subpanel flex sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-1">
                        <span className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                          Advance Due Now
                        </span>
                        <span className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          ৳0
                        </span>
                      </div>
                      <div className="p-3.5 ds-liquid-subpanel flex sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-1">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          Due on Delivery
                        </span>
                        <span className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-white tabular-nums">
                          {formatPrice(total)}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 ds-liquid-subpanel text-xs space-y-1 text-zinc-700 dark:text-zinc-300">
                      {!isVipSubscriber && guardianNumber && (
                        <p className="font-semibold text-zinc-900 dark:text-white tabular-nums">
                          Guardian Number: {guardianNumber}
                        </p>
                      )}
                      <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Inspect your parcel upon arrival and pay the full amount in cash to the delivery rider.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Advance Payment Flow */
                  <div className="space-y-4">
                    {/* VIP Pass Zero-Advance Upgrade Callout */}
                    <div className="p-4 ds-liquid-callout-amber flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-amber-400 text-zinc-950 flex items-center justify-center shrink-0">
                          <Crown className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white">
                            Want to order with ৳0 Advance &amp; Full Cash on Delivery?
                          </div>
                          <div className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-0.5 tabular-nums">
                            Get a VIP Pass to skip the ৳{requiredAdvance} advance payment on this order.
                          </div>
                        </div>
                      </div>
                      <Link
                        to="/subscription"
                        className="px-4 py-2.5 rounded-full bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold text-xs shrink-0 text-center transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        <span>Get VIP Pass</span>
                      </Link>
                    </div>

                    {/* Advance Policy Subpanel */}
                    <div className="p-4 ds-liquid-subpanel flex items-start gap-3">
                      <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                      <div className="text-xs leading-relaxed">
                        <p className="font-bold text-zinc-900 dark:text-white">
                          {isAllOffer
                            ? "100% full advance payment applies to offer items."
                            : hasOfferProduct
                              ? "A required booking advance applies due to offer or custom items in your cart."
                              : "Border import items require an advance booking payment, with the remaining balance payable in cash on delivery."}
                        </p>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">
                          After confirming your order review, you can choose bKash or Nagad on our secure payment gateway page.
                        </p>
                      </div>
                    </div>

                    {/* Mobile Banking Gateway Refractive Panel */}
                    <div className="p-4 sm:p-5 ds-liquid-callout-rose space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-3 border-b border-rose-500/15">
                        <div>
                          <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                            Mobile Banking · bKash / Nagad
                          </div>
                          <h4 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                            Secure Send Money Gateway
                          </h4>
                        </div>
                        <span className="text-xs font-bold text-[#D12053] dark:text-rose-300 whitespace-nowrap">
                          Payable in next step
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="p-3.5 ds-liquid-subpanel flex sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-1">
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            Total Order Value
                          </span>
                          <span className="text-sm font-bold text-zinc-900 dark:text-white tabular-nums">
                            {formatPrice(total)}
                          </span>
                        </div>
                        <div className="p-3.5 ds-liquid-subpanel flex sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-1">
                          <span className="text-[11px] font-semibold text-[#D12053] dark:text-rose-300">
                            Advance Due Now
                          </span>
                          <span className="text-base sm:text-lg font-extrabold text-[#D12053] dark:text-rose-300 tabular-nums">
                            ৳{requiredAdvance}
                          </span>
                        </div>
                        <div className="p-3.5 ds-liquid-subpanel flex sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-1">
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            Due on Delivery
                          </span>
                          <span className="text-sm font-bold text-zinc-900 dark:text-white tabular-nums">
                            ৳{dueOnDelivery}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                        No TrxID needed here. Once you confirm your review, active bKash &amp; Nagad numbers will be displayed on the dedicated payment page.
                      </p>
                    </div>

                    {/* Optional DP Coin Selector */}
                    {userCoins > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentType(paymentType === "dpcoin" ? "advance" : "dpcoin");
                          setAdvanceType("full");
                        }}
                        className={cn(
                          "w-full p-4 flex items-center justify-between gap-3 text-xs sm:text-sm transition-all cursor-pointer",
                          paymentType === "dpcoin"
                            ? "ds-liquid-subpanel-active"
                            : "ds-liquid-subpanel hover:opacity-90"
                        )}
                      >
                        <span className="font-bold text-zinc-900 dark:text-white truncate tabular-nums">
                          DP Coin Balance: {userCoins} Coins
                        </span>
                        <span className="font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap shrink-0">
                          {paymentType === "dpcoin" ? "Active ✓" : "Use Coins"}
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {/* Step 2 Footer Navigation */}
                <div className="pt-4 border-t border-slate-900/[0.07] dark:border-white/[0.08] flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-5 py-3 ds-liquid-btn-secondary !min-h-[46px] !text-xs sm:!text-sm flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 shrink-0" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={!validateStep(2)}
                    className="flex-1 sm:flex-none sm:min-w-[220px] px-7 py-3 ds-liquid-btn-primary !min-h-[46px] !text-xs sm:!text-sm flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                  >
                    <span>Review Order</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </div>
            )}

            {/* ------------------------- STEP 3: REVIEW & CONFIRM ------------------------- */}
            {currentStep === 3 && (
              <div className="ds-liquid-panel p-4 sm:p-6 lg:p-7 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-900/[0.07] dark:border-white/[0.08]">
                  <div className="w-10 h-10 rounded-2xl ds-liquid-subpanel flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white truncate">
                      Order Review & Confirmation
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      Verify all details before finalizing your order
                    </p>
                  </div>
                </div>

                {/* Shipping + Payment Summary Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Shipping Tile */}
                  <div className="p-4 ds-liquid-subpanel space-y-2 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                          Delivery Address
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          className="text-xs font-bold text-sky-600 dark:text-sky-400 inline-flex items-center gap-1 hover:underline cursor-pointer whitespace-nowrap"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>
                      <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                        {typeof selectedAddrObj?.name === "string"
                          ? selectedAddrObj.name
                          : "User"}
                      </p>
                      <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 tabular-nums">
                        {typeof selectedAddrObj?.phone === "string"
                          ? selectedAddrObj.phone
                          : ""}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        {formatAddressText(selectedAddrObj?.address)}
                      </p>
                    </div>
                  </div>

                  {/* Payment Tile */}
                  <div className="p-4 ds-liquid-subpanel space-y-2 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                          {t("Payment Details") || "Payment Details"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="text-xs font-bold text-sky-600 dark:text-sky-400 inline-flex items-center gap-1 hover:underline cursor-pointer whitespace-nowrap"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>

                      {paymentType === "dpcoin" ? (
                        <div className="space-y-1">
                          <p className="font-bold text-sm text-zinc-900 dark:text-white">
                            DP Coins ({advanceType === "full" ? "Full Payment" : "Advance Booking"})
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Will be deducted from your DP Coin balance
                          </p>
                        </div>
                      ) : requiredAdvance === 0 ? (
                        <div className="space-y-1">
                          <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            {isVipSubscriber
                              ? "VIP Full Cash on Delivery"
                              : "Cash on Delivery (Bypass)"}
                          </p>
                          <p className="text-xs text-zinc-600 dark:text-zinc-300 tabular-nums">
                            Advance: ৳0 · Due on Delivery: {formatPrice(total)}
                          </p>
                          {!isVipSubscriber && guardianNumber && (
                            <p className="text-xs text-zinc-500 tabular-nums">
                              Guardian: {guardianNumber}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="font-bold text-sm text-zinc-900 dark:text-white">
                            Mobile Banking (bKash / Nagad Gateway)
                          </p>
                          <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-0.5 tabular-nums">
                            <div>
                              Advance Due Now:{" "}
                              <strong className="text-[#D12053] dark:text-rose-300">
                                ৳{requiredAdvance}
                              </strong>
                            </div>
                            <div>
                              Due on Delivery:{" "}
                              <strong className="text-zinc-900 dark:text-white">
                                ৳{dueOnDelivery}
                              </strong>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mobile-Only Compact Receipt Recap right before confirmation */}
                <div className="lg:hidden p-4 ds-liquid-subpanel space-y-3">
                  <div className="text-xs font-bold text-zinc-900 dark:text-white pb-2 border-b border-slate-900/[0.07] dark:border-white/[0.08]">
                    Final Cost Summary
                  </div>
                  {renderPriceBreakdown()}
                </div>

                {/* Delivery & Unboxing Policies in Clean Refractive Glass */}
                <div className="space-y-3">
                  <div className="p-3.5 sm:p-4 ds-liquid-subpanel text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                    <strong className="text-zinc-900 dark:text-white">Delivery Timeline:</strong>{" "}
                    Border-cross imported items have an estimated delivery window of 30–45 business days (with dedicated order tracking).
                  </div>
                  <div className="p-3.5 sm:p-4 ds-liquid-callout-amber text-xs leading-relaxed text-zinc-700 dark:text-zinc-200">
                    <strong className="text-zinc-900 dark:text-white">Important Notice:</strong>{" "}
                    Providing incorrect transaction details may lead to order cancellation. An uninterrupted unboxing video is required for any return or warranty claims.
                  </div>
                </div>

                {/* Terms Agreement Checkbox */}
                <div className="p-4 ds-liquid-subpanel flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={agreeToTerms}
                    onCheckedChange={(c) => setAgreeToTerms(!!c)}
                    className="mt-0.5"
                  />
                  <div className="text-xs sm:text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                    <label
                      htmlFor="terms"
                      className="cursor-pointer font-semibold text-zinc-900 dark:text-white mr-1"
                    >
                      I agree to DEEP SHOP&apos;s
                    </label>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate("/terms");
                      }}
                      className="underline text-sky-600 dark:text-sky-400 font-bold cursor-pointer"
                    >
                      Terms &amp; Conditions
                    </button>
                    {", "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate("/privacy");
                      }}
                      className="underline text-sky-600 dark:text-sky-400 font-bold cursor-pointer"
                    >
                      Privacy Policy
                    </button>{" "}
                    and{" "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate("/refund-policy");
                      }}
                      className="underline text-sky-600 dark:text-sky-400 font-bold cursor-pointer"
                    >
                      Refund Policy
                    </button>
                    .
                  </div>
                </div>

                {/* Step 3 Final Confirm Bar */}
                <div className="pt-4 border-t border-slate-900/[0.07] dark:border-white/[0.08] flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-5 py-3 ds-liquid-btn-secondary !min-h-[48px] !text-xs sm:!text-sm flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 shrink-0" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={placeOrder}
                    disabled={!validateStep(3) || isLoading}
                    className="flex-1 sm:flex-none sm:min-w-[260px] px-7 py-3.5 ds-liquid-btn-primary !min-h-[48px] !text-xs sm:!text-sm flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                  >
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>
                      {isLoading
                        ? "Placing Order..."
                        : requiredAdvance === 0
                          ? "Confirm Order (COD)"
                          : "Proceed to Secure Payment"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* =====================================================================
              DESKTOP RIGHT-HAND STICKY LIQUID GLASS RECEIPT CONSOLE (lg and up)
             ===================================================================== */}
          <aside className="hidden lg:flex lg:col-span-5 flex-col gap-4 lg:sticky lg:top-24">
            <div className="ds-liquid-panel p-6 space-y-5">
              <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-900/[0.07] dark:border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    {t("Order Summary") || "Order Summary"}
                  </h3>
                </div>
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {totalItemQty} {totalItemQty === 1 ? "item" : "items"}
                </span>
              </div>

              {/* Itemized Cart List */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3.5 p-3 ds-liquid-subpanel"
                  >
                    <div className="relative w-14 h-14 shrink-0 rounded-2xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 overflow-hidden p-1">
                      <PixelImage
                        src={getProductDisplayImage(item)}
                        alt={item.name}
                        className="w-full h-full bg-transparent"
                        imgClassName="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 tabular-nums">
                        Qty: {item.quantity} × {formatPrice(item.price)}
                      </div>
                    </div>
                    <div className="font-bold text-sm text-zinc-900 dark:text-white shrink-0 tabular-nums">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo & Voucher Controls */}
              <div className="pt-2 border-t border-slate-900/[0.07] dark:border-white/[0.08]">
                {renderPromoControls()}
              </div>

              {/* Financial Breakdown */}
              <div className="pt-3 border-t border-slate-900/[0.07] dark:border-white/[0.08]">
                {renderPriceBreakdown()}
              </div>
            </div>

            {/* Quiet Trust Guarantee Line */}
            <div className="px-5 py-3.5 ds-liquid-subpanel flex items-center justify-between gap-3 text-xs text-zinc-600 dark:text-zinc-300">
              <div className="flex items-center gap-2 min-w-0">
                <Shield className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span className="truncate">100% Secure Payment &amp; Authentic Import Guarantee</span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* =====================================================================
          APPLE GLASS VOUCHERS MODAL (Portaled Mobile Bottom Sheet / Desktop Modal)
         ===================================================================== */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showCouponsModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="ds-apple-portal ds-apple-backdrop fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
                onClick={() => {
                  triggerHaptic("light");
                  setShowCouponsModal(false);
                }}
              >
                <motion.div
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: "100%" }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: "100%" }}
                  transition={prefersReducedMotion ? { duration: 0.15 } : APPLE_SPRING_DEFAULT}
                  drag={prefersReducedMotion ? false : "y"}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0.02, bottom: 0.45 }}
                  onDragEnd={(_, info) => {
                    const projected = info.offset.y + projectMomentum(info.velocity.y);
                    if (projected > 110 || info.velocity.y > 420) {
                      triggerHaptic("light");
                      setShowCouponsModal(false);
                    }
                  }}
                  className="w-full max-w-none md:max-w-md ds-apple-sheet md:ds-apple-modal rounded-t-[28px] rounded-b-none md:rounded-[28px] p-6 pb-[calc(24px+env(safe-area-inset-bottom,0px))] md:pb-6 max-h-[85dvh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-9 h-1 rounded-full bg-black/20 dark:bg-white/25 mx-auto mb-3 md:hidden" />
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-lg font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                        My Vouchers
                      </h3>
                      <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                        Select any active voucher to get a discount on your order
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setShowCouponsModal(false);
                      }}
                      aria-label="Close"
                      className="ds-apple-icon-btn w-8 h-8 flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 max-h-[58vh] overflow-y-auto pr-1">
                    {claimedCouponsList
                      .filter((c) => !(c.expiresAt && c.expiresAt < Date.now()))
                      .map((c, i) => {
                        const minMet = !c.minOrderAmount || subtotal >= c.minOrderAmount;
                        return (
                          <div
                            key={i}
                            className={cn(
                              "p-3.5 ds-liquid-section flex items-center justify-between gap-3",
                              !minMet && "opacity-60"
                            )}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-base font-extrabold text-[#0071E3] dark:text-[#0A84FF] tabular-nums">
                                  {c.type === "percent"
                                    ? `${c.discount}%`
                                    : formatPrice(c.discount)}{" "}
                                  Off
                                </span>
                                <span className="text-xs text-zinc-400">·</span>
                                <span className="font-bold text-xs sm:text-sm text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                                  {c.code}
                                </span>
                              </div>
                              <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5 tabular-nums">
                                {c.minOrderAmount > 0
                                  ? `Minimum order ${formatPrice(c.minOrderAmount)}`
                                  : "Valid on any order"}
                              </div>
                              {!minMet && (
                                <div className="text-[11px] text-[#FF3B30] dark:text-[#FF453A] font-semibold mt-0.5 tabular-nums">
                                  Add {formatPrice(c.minOrderAmount - subtotal)} more to qualify
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              disabled={!minMet}
                              onClick={() => {
                                triggerHaptic("success");
                                setAppliedPromo({
                                  id: c.id,
                                  ...c,
                                  isVoucher: true,
                                });
                                setCouponCode(c.code);
                                setShowCouponsModal(false);
                                notify("Voucher applied successfully!", "success");
                              }}
                              className="px-4 py-2 ds-liquid-btn-primary !min-h-0 !text-xs shrink-0 disabled:opacity-40 whitespace-nowrap cursor-pointer"
                            >
                              Apply
                            </button>
                          </div>
                        );
                      })}

                    {claimedCouponsList.length === 0 && (
                      <div className="text-center py-10 ds-liquid-section">
                        <Ticket className="w-9 h-9 text-[#8E8E93] mx-auto mb-2" />
                        <p className="text-sm font-semibold text-[#6E6E73] dark:text-[#8E8E93]">
                          You have no saved vouchers
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      <CustomSectionEmbed location="checkout_bottom" />
    </div>
  );
}

