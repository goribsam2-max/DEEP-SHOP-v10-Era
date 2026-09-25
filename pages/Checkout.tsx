import { formatPrice, isForbiddenNumber } from "@/lib/utils";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { handleCoinDeductionWithExpiry } from "../lib/coinExpiry";
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
  Sparkles
} from "lucide-react";
import { cn } from "../lib/utils";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const { isDark } = useTheme();
  const { t } = useLanguage();

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
  const [sellerPaymentNumbers, setSellerPaymentNumbers] = useState<{bkash: string, nagad: string} | null>(null);

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
    prefMeth === "Cash on Delivery" ? "cod" : prefMeth === "DP Coin" ? "vgcoin" : defaultBank ? "advance" : "cod";
  const [paymentType, setPaymentType] = useState<
    "cod" | "advance" | "vgcoin" | null
  >(() => getSavedState("paymentType", defaultPaymentType));
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
              setSavedAddresses(data.addresses);
              setSelectedAddressId(data.addresses[0].id);
            } else if (data.address) {
              const singleAddr = {
                id: "addr_1",
                name: data.displayName || "User",
                phone: data.phoneNumber || "",
                address: data.address,
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
        const localAddresses = JSON.parse(
          localStorage.getItem("vibe_shipping_addresses_v2") || "[]",
        );
        setSavedAddresses(localAddresses);
        if (localAddresses.length > 0) setSelectedAddressId(localAddresses[0].id);
        else setIsAddingNewAddress(true);
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

  // Rotate Bkash and Nagad numbers when payment settings load
  useEffect(() => {
    if (paymentSettings) {
      // 1. Bkash numbers
      const bkashList: string[] = (Array.isArray(paymentSettings.bkashNumbers) && paymentSettings.bkashNumbers.length > 0)
        ? paymentSettings.bkashNumbers.filter(Boolean)
        : [paymentSettings.bkashNumber, paymentSettings.npsbNumber, sellerPaymentNumbers?.bkash].filter(Boolean) as string[];

      if (bkashList.length > 0) {
        const randomBkash = bkashList[Math.floor(Math.random() * bkashList.length)];
        setActiveBkashNumber(randomBkash);
      } else if (!activeBkashNumber) {
        setActiveBkashNumber("01700000000");
      }

      // 2. Nagad numbers
      const nagadList: string[] = (Array.isArray(paymentSettings.nagadNumbers) && paymentSettings.nagadNumbers.length > 0)
        ? paymentSettings.nagadNumbers.filter(Boolean)
        : [paymentSettings.nagadNumber, paymentSettings.pathaoPayNumber, sellerPaymentNumbers?.nagad].filter(Boolean) as string[];

      if (nagadList.length > 0) {
        const randomNagad = nagadList[Math.floor(Math.random() * nagadList.length)];
        setActiveNagadNumber(randomNagad);
      } else if (!activeNagadNumber) {
        setActiveNagadNumber("01800000000");
      }
    }
  }, [paymentSettings, sellerPaymentNumbers]);

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
      notify("NID ছবির সাইজ সর্বোচ্চ 10MB হতে পারে।", "error");
      return;
    }

    setUploadingNid(true);
    try {
      const url = await uploadToImgbb(file);
      if (url) {
        setNidCardUrl(url);
        notify("NID ছবি সফলভাবে আপলোড হয়েছে!", "success");
      } else {
        notify("ছবি আপলোড ব্যর্থ হয়েছে। আবার চেষ্টা করুন।", "error");
      }
    } catch (err) {
      console.error("NID upload error:", err);
      notify("ছবি আপলোড ব্যর্থ হয়েছে।", "error");
    } finally {
      setUploadingNid(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedNumber(text);
    notify(`${label} নম্বর কপি করা হয়েছে: ${text}`, "success");
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
  if (isAllBypass) {
    requiredAdvance = 0;
  } else if (isAllOffer) {
    requiredAdvance = total;
  } else {
    requiredAdvance = Math.min(total, calculatedAdvance);
  }

  const dueOnDelivery = Math.max(0, total - requiredAdvance);

  const handleSaveAddress = async () => {
    if (!newAddress.name || !newAddress.phone || !newAddress.address) {
      return notify("Please complete all required fields.", "error");
    }
    if (isForbiddenNumber(newAddress.phone)) {
      return notify("01778953114 নম্বরটি সিস্টেমে অনুমোদিত নয়। (This number is not allowed)", "error");
    }
    const newAddrObj = {
      id: Math.random().toString(36).substring(7),
      ...newAddress,
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
            address: newAddress.address
          },
          { merge: true },
        );
        setSavedAddresses(newAddrs);
        setSelectedAddressId(newAddrObj.id);
        setIsAddingNewAddress(false);
        notify("Address saved to account.", "success");
      } catch (e) {
        notify("Error saving address.", "error");
      }
    } else {
      setSavedAddresses(newAddrs);
      setSelectedAddressId(newAddrObj.id);
      setIsAddingNewAddress(false);
      localStorage.setItem(
        "vibe_shipping_addresses_v2",
        JSON.stringify(newAddrs),
      );
      notify("Address saved locally.", "success");
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

    const activeAddress = savedAddresses.find(
      (a) => a.id === selectedAddressId,
    );
    if (!activeAddress) return notify("Address required", "error");

    if (isForbiddenNumber(activeAddress.phone) || isForbiddenNumber(customerSenderNumber) || isForbiddenNumber(customerTrxId)) {
      return notify("01778953114 নম্বরটি সিস্টেমে অনুমোদিত নয়। (This number is not allowed)", "error");
    }

    if (paymentType === "vgcoin") {
      const coinCost = advanceType === "full" ? total : requiredAdvance;
      if (userCoins < coinCost) {
        notify(`Not enough DP Coins. You need ${coinCost - userCoins} more coins. Please deposit.`, "error");
        navigate("/deposit", { state: { requiredDeposit: coinCost - userCoins } });
        return;
      }
    }

    setIsLoading(true);
    try {
      const activeReceiver = selectedPaymentMethod === "bkash" 
        ? (activeBkashNumber || "01700000000")
        : (activeNagadNumber || "01800000000");

      let paymentStr = "Cash on Delivery";
      let paymentOptStr = "Cash on Delivery";

      if (paymentType === "vgcoin") {
        paymentStr = "DP Coins";
        paymentOptStr = advanceType === "full" ? "Full Payment with DP Coins" : `Advance ৳${requiredAdvance} with DP Coins`;
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

      const orderData: any = {
        userId: auth.currentUser?.uid || "guest",
        customerName: activeAddress.name,
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
        guardianNumber: guardianNumber.trim() || null,
        nidCardUrl: nidCardUrl.trim() || null,
        productClassification: isAllBypass ? "Bypass" : isAllOffer ? "Offer" : hasBypassProduct ? "Mixed Bypass" : "Normal Border",
        shippingAddress: activeAddress.address,
        contactNumber: activeAddress.phone,
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

      const requiresAdvanceGateway = requiredAdvance > 0 && paymentType !== "vgcoin";
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
          if (user?.uid) {
            fetch("/api/send-push-user", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: user.uid,
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

      if (paymentType === "vgcoin" && auth.currentUser) {
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

      if (requiredAdvance > 0 && paymentType !== "vgcoin") {
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
      if (hasBypassProduct && (!guardianNumber.trim() || guardianNumber.trim().replace(/\D/g, "").length < 11)) {
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (paymentType === "vgcoin") {
        return userCoins >= (advanceType === "full" ? total : requiredAdvance);
      }
      return true;
    }
    if (step === 3) return agreeToTerms;
    return false;
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!selectedAddressId) {
        return notify("অনুগ্রহ করে একটি ডেলিভারি ঠিকানা নির্বাচন করুন।", "error");
      }
      if (hasBypassProduct && (!guardianNumber.trim() || guardianNumber.trim().replace(/\D/g, "").length < 11)) {
        return notify("বাইপাস অর্ডারের জন্য গার্ডিয়ান / অভিভাবকের ১১ ডিজিটের মোবাইল নম্বর প্রদান করুন।", "error");
      }
    }
    if (currentStep === 2) {
      if (paymentType === "vgcoin") {
        const coinCost = advanceType === "full" ? total : requiredAdvance;
        if (userCoins < coinCost) {
          return notify(`পর্যাপ্ত ডিপি কয়েন নেই। আপনার প্রয়োজন আরও ${coinCost - userCoins} কয়েন।`, "error");
        }
      }
    }
    if (validateStep(currentStep)) {
      setCurrentStep((p) => Math.min(p + 1, 3));
    } else {
      notify("Please complete the required fields.", "error");
    }
  };

  const prevStep = () => setCurrentStep((p) => Math.max(p - 1, 1));

  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 flex flex-col gap-6 font-inter bg-zinc-50 dark:bg-[#000000]">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-zinc-50 dark:bg-[#000000] font-inter">
      <div className="max-w-7xl mx-auto p-6 flex flex-col gap-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between sm:justify-start sm:gap-6 py-4 overflow-x-auto no-scrollbar mask-linear-fade pr-4">
          {[
            { step: 1, label: "Shipping", icon: Truck },
            { step: 2, label: "Payment", icon: CreditCard },
            { step: 3, label: "Review", icon: Check },
          ].map(({ step, label, icon: Icon }, index) => (
            <div key={step} className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 sm:gap-2">
                <div
                  className={cn(
                    "flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 transition-colors",
                    currentStep >= step
                      ? "bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900"
                      : "border-zinc-300 dark:border-zinc-700 text-zinc-400",
                  )}
                >
                  {currentStep > step ? (
                    <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                  ) : (
                    <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] sm:text-sm font-bold whitespace-nowrap",
                    currentStep >= step
                      ? "text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-400",
                  )}
                >
                  {label}
                </span>
              </div>
              {index < 2 && (
                <div
                  className={cn(
                    "w-4 sm:w-8 h-0.5",
                    currentStep > step
                      ? "bg-zinc-100 dark:bg-zinc-8000"
                      : "bg-zinc-200 dark:bg-zinc-800",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Step 1: Shipping */}
            {currentStep === 1 && (
              <Card className="rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col gap-2">
                <CardHeader>
                  <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                    <MapPin className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />{" "}
                    {t('Shipping Information') || 'Shipping Information'}
                  </h2>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  {savedAddresses.length > 0 ? (
                    <div className="space-y-3">
                      {savedAddresses.map((addr) => (
                        <div
                          key={addr.id}
                          onClick={() => setSelectedAddressId(addr.id)}
                          className={cn(
                            "p-4 border-2 rounded-2xl cursor-pointer transition-all",
                            selectedAddressId === addr.id
                              ? "border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800/50 dark:bg-emerald-900/10"
                              : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                selectedAddressId === addr.id
                                  ? "border-zinc-900 dark:border-zinc-100"
                                  : "border-zinc-300",
                              )}
                            >
                              {selectedAddressId === addr.id && (
                                <div className="w-2 h-2 rounded-full bg-zinc-100 dark:bg-zinc-8000" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-zinc-900 dark:text-zinc-100">
                                {addr.name}
                              </div>
                              <div className="text-sm font-medium text-zinc-500">
                                {addr.phone}
                              </div>
                              <div className="text-sm mt-1 text-zinc-600 dark:text-zinc-400">
                                {addr.address}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        className="w-full mt-2 border-dashed"
                        onClick={() => navigate('/shipping-address')}
                      >
                        + Add New Address
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                      <MapPin className="w-10 h-10 text-zinc-400 mb-3" />
                      <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">{t('No Address Found') || 'No Address Found'}</h3>
                      <p className="text-sm text-zinc-500 mb-4">{t('Please add a shipping address to continue.') || 'Please add a shipping address to continue.'}</p>
                      <Button onClick={() => navigate('/shipping-address')}>
                        {t('Add Shipping Address') || 'Add Shipping Address'}
                      </Button>
                    </div>
                  )}

                  {/* Gift Toggle */}
                  <div className="mt-4 border-t border-zinc-100 dark:border-zinc-800 pt-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="gift"
                          checked={isGift}
                          onCheckedChange={(c) => setIsGift(!!c)}
                        />
                        <div>
                          <Label
                            htmlFor="gift"
                            className="font-bold text-base cursor-pointer"
                          >
                            Send as a Gift
                          </Label>
                          <p className="text-sm text-zinc-500">
                            Invoice will hide prices. COD disabled.
                          </p>
                        </div>
                      </div>
                      {isGift && (
                        <div className="space-y-2 ml-7">
                          <Label>Gift Note</Label>
                          <Input
                            placeholder="Happy Birthday!..."
                            value={giftNote}
                            onChange={(e) => setGiftNote(e.target.value)}
                          />
                        </div>
                      )}

                      {/* Bypass Mal Verification Section */}
                      {hasBypassProduct && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-4 mt-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
                              <PhoneCall className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2 flex-nowrap">
                                <h4 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                  বাইপাস ভেরিফিকেশন
                                </h4>
                                <span className="text-[10px] bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                                  COD সুবিধা
                                </span>
                              </div>
                              <p className="text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                                ক্যাশ অন ডেলিভারি (COD) নিশ্চিত করতে অভিভাবকের নম্বর দিন
                              </p>
                            </div>
                          </div>

                          {/* Guardian Number (Mandatory) */}
                          <div className="space-y-1.5">
                            <Label htmlFor="guardianNumber" className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-between whitespace-nowrap">
                              <span className="whitespace-nowrap">অভিভাবকের মোবাইল নম্বর <span className="text-red-500">*</span></span>
                              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-normal whitespace-nowrap">(১১ ডিজিট)</span>
                            </Label>
                            <Input
                              id="guardianNumber"
                              type="tel"
                              placeholder="01XXXXXXXXX"
                              value={guardianNumber}
                              onChange={(e) => setGuardianNumber(e.target.value)}
                              className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 h-10 sm:h-11 text-xs sm:text-sm"
                            />
                            <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5 pt-0.5 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span className="whitespace-nowrap overflow-hidden text-ellipsis">বিশেষ দ্রষ্টব্য: অর্ডার নিশ্চিত করতে অভিভাবককে কল করা হতে পারে</span>
                            </p>
                          </div>

                          {/* NID Card Upload (Optional) */}
                          <div className="space-y-2 pt-3 border-t border-amber-500/20">
                            <div className="flex items-center justify-between whitespace-nowrap">
                              <Label className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                                NID কার্ড সংযুক্তকরণ (ঐচ্ছিক)
                              </Label>
                              <span className="text-[11px] text-zinc-500 font-normal whitespace-nowrap">ছবি আপলোড</span>
                            </div>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap overflow-hidden text-ellipsis">
                              আপনার বা অভিভাবকের NID কার্ডের ছবি আপলোড করতে পারেন
                            </p>

                            {nidCardUrl ? (
                              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-500/30">
                                <div className="flex items-center gap-3 min-w-0">
                                  <img
                                    src={nidCardUrl}
                                    alt="Uploaded NID"
                                    className="w-12 h-12 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                                      ✓ NID কার্ড ছবি সংযুক্ত হয়েছে
                                    </p>
                                    <a
                                      href={nidCardUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] text-zinc-400 underline hover:text-zinc-300"
                                    >
                                      ছবি দেখুন
                                    </a>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setNidCardUrl("")}
                                  className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                >
                                  মুছুন
                                </Button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-amber-500/30 hover:border-amber-500/60 rounded-xl cursor-pointer bg-white/70 dark:bg-zinc-900/70 transition-colors">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={uploadingNid}
                                  onChange={handleNidUpload}
                                />
                                {uploadingNid ? (
                                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-medium">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>NID ছবি আপলোড হচ্ছে (imgbb)...</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-1 text-center">
                                    <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                                    <span className="text-[11px] sm:text-xs font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                                      NID কার্ড ছবি আপলোড করুন (JPG, PNG সর্বোচ্চ 10MB)
                                    </span>
                                  </div>
                                )}
                              </label>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end pt-4 pb-2">
                  <Button
                    onClick={nextStep}
                    disabled={!validateStep(1)}
                    size="default"
                    className="text-xs sm:text-sm px-4 sm:px-6"
                  >
                    Continue
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Step 2: Payment */}
            {currentStep === 2 && (
              <Card className="rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col gap-2">
                <CardHeader>
                  <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                    <CreditCard className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />{" "}
                    Payment Information
                  </h2>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  {requiredAdvance === 0 ? (
                    /* Bypass Mal / Free COD Confirmation */
                    <div className="space-y-5">
                      <div className="p-5 sm:p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-sm">
                            <Truck className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2 whitespace-nowrap">
                              <h3 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                ক্যাশ অন ডেলিভারি (COD)
                              </h3>
                              <span className="text-[10px] bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                                বাইপাস প্রোডাক্ট
                              </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                              এই অর্ডারে কোনো প্রকার অগ্রিম পেমেন্ট করতে হবে না
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                          <div className="p-2.5 sm:p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex sm:flex-col justify-between sm:justify-start items-center sm:items-start">
                            <span className="text-[11px] sm:text-xs text-zinc-500 whitespace-nowrap">মোট অর্ডার মূল্য</span>
                            <span className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{formatPrice(total)}</span>
                          </div>
                          <div className="p-2.5 sm:p-3 bg-white dark:bg-zinc-900 rounded-xl border border-emerald-500/30 flex sm:flex-col justify-between sm:justify-start items-center sm:items-start">
                            <span className="text-[11px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">অগ্রিম প্রদেয়</span>
                            <span className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">৳০ (কোনো অগ্রিম নেই)</span>
                          </div>
                          <div className="p-2.5 sm:p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex sm:flex-col justify-between sm:justify-start items-center sm:items-start">
                            <span className="text-[11px] sm:text-xs text-zinc-500 whitespace-nowrap">ডেলিভারির সময় প্রদেয়</span>
                            <span className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{formatPrice(total)}</span>
                          </div>
                        </div>

                        <div className="p-3 bg-white/80 dark:bg-zinc-900/80 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs space-y-1 text-zinc-700 dark:text-zinc-300">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis">
                            <PhoneCall className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="whitespace-nowrap overflow-hidden text-ellipsis">অভিভাবক নম্বর: <strong className="font-mono">{guardianNumber || "দেওয়া হয়নি"}</strong></span>
                          </p>
                          <p className="text-zinc-500 text-[11px] whitespace-nowrap overflow-hidden text-ellipsis">
                            পণ্য হাতে পেয়ে যাচাই করে কুরিয়ার কর্মীকে ক্যাশ পরিশোধ করবেন
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Advance Payment via Rotating bKash / Nagad */
                    <div className="space-y-6">
                      {/* Product Advance Type Banner */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 flex items-start gap-2.5">
                        <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          {isAllOffer ? (
                            <p className="font-semibold text-amber-800 dark:text-amber-300">
                              অফার পণ্যের ক্ষেত্রে ১০০% ফুল অগ্রিম পেমেন্ট আবশ্যক।
                            </p>
                          ) : hasOfferProduct ? (
                            <p className="font-semibold text-amber-800 dark:text-amber-300">
                              অর্ডারে অফার বা কাস্টম প্রোডাক্ট থাকায় নির্ধারিত পরিমাণ অগ্রিম পেমেন্ট প্রযোজ্য।
                            </p>
                          ) : (
                            <p className="font-semibold text-amber-800 dark:text-amber-300">
                              নরমাল বর্ডার মালের ক্ষেত্রে ৫০% হাফ অগ্রিম পেমেন্ট প্রযোজ্য। বাকি টাকা ডেলিভারির সময় ক্যাশে প্রদান করবেন।
                            </p>
                          )}
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            নিচের যেকোনো একটি পেমেন্ট মেথড নির্বাচন করে অগ্রিম পরিশোধ সম্পন্ন করুন।
                          </p>
                        </div>
                      </div>

                      {/* Payment Method Selector Cards (bKash & Nagad) */}
                      <div className="space-y-2">
                        <Label className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                          পেমেন্ট মেথড নির্বাচন করুন:
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          {/* bKash Option */}
                          <button
                            type="button"
                            onClick={() => setSelectedPaymentMethod("bkash")}
                            className={cn(
                              "relative flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer",
                              selectedPaymentMethod === "bkash"
                                ? "border-[#D12053] bg-pink-50/60 dark:bg-pink-950/20 shadow-sm ring-2 ring-[#D12053]/20"
                                : "border-zinc-200 dark:border-zinc-800 hover:border-pink-300 dark:hover:border-pink-900/50 bg-white dark:bg-zinc-900"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#D12053] text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                                বিকাশ
                              </div>
                              <div>
                                <span className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 block">
                                  bKash (বিকাশ)
                                </span>
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                  পার্সোনাল সেন্ড মানি
                                </span>
                              </div>
                            </div>
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                              selectedPaymentMethod === "bkash"
                                ? "border-[#D12053] bg-[#D12053] text-white"
                                : "border-zinc-300 dark:border-zinc-700"
                            )}>
                              {selectedPaymentMethod === "bkash" && <Check className="w-3 h-3" />}
                            </div>
                          </button>

                          {/* Nagad Option */}
                          <button
                            type="button"
                            onClick={() => setSelectedPaymentMethod("nagad")}
                            className={cn(
                              "relative flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer",
                              selectedPaymentMethod === "nagad"
                                ? "border-[#F7921E] bg-orange-50/60 dark:bg-orange-950/20 shadow-sm ring-2 ring-[#F7921E]/20"
                                : "border-zinc-200 dark:border-zinc-800 hover:border-orange-300 dark:hover:border-orange-900/50 bg-white dark:bg-zinc-900"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#F7921E] text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                                নগদ
                              </div>
                              <div>
                                <span className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 block">
                                  Nagad (নগদ)
                                </span>
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                  পার্সোনাল সেন্ড মানি
                                </span>
                              </div>
                            </div>
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                              selectedPaymentMethod === "nagad"
                                ? "border-[#F7921E] bg-[#F7921E] text-white"
                                : "border-zinc-300 dark:border-zinc-700"
                            )}>
                              {selectedPaymentMethod === "nagad" && <Check className="w-3 h-3" />}
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Rotating Number Display Card */}
                      <div className={cn(
                        "rounded-2xl p-5 sm:p-6 border-2 transition-all duration-300 space-y-5",
                        selectedPaymentMethod === "bkash"
                          ? "border-[#D12053]/30 bg-pink-50/30 dark:bg-pink-950/10"
                          : "border-[#F7921E]/30 bg-orange-50/30 dark:bg-orange-950/10"
                      )}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4 border-zinc-200/80 dark:border-zinc-800">
                          <div>
                            <span className="text-xs font-semibold text-zinc-500 tracking-normal">
                              {selectedPaymentMethod === "bkash" ? "বিকাশ পেমেন্ট" : "নগদ পেমেন্ট"}
                            </span>
                            <h4 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                              Send Money মেথড
                            </h4>
                          </div>
                          <span className={cn(
                            "self-start sm:self-auto text-[11px] font-bold px-3 py-1 rounded-full tracking-normal",
                            selectedPaymentMethod === "bkash"
                              ? "bg-[#D12053] text-white"
                              : "bg-[#F7921E] text-white"
                          )}>
                            সুরক্ষিত গেটওয়ে
                          </span>
                        </div>

                        {/* Notice: bKash/Nagad number shown on dedicated Payment Page */}
                        <div className="p-4 bg-gradient-to-r from-pink-500/10 via-amber-500/10 to-transparent border border-pink-500/20 dark:border-pink-500/30 rounded-2xl space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-[#E2125B] text-white flex items-center justify-center text-xs font-black shrink-0 shadow-sm">
                              ৳
                            </span>
                            <h5 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                              পেমেন্ট পেজে গেলে বিকাশ ও নগদ নম্বর দেখতে পাবেন
                            </h5>
                          </div>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 pl-9 leading-relaxed">
                            সুরক্ষা ও নির্ভুল ট্রানজেকশনের স্বার্থে পরবর্তী সুরক্ষিত পেমেন্ট পেজে আপনাকে সক্রিয় নম্বর ও বিস্তারিত প্রদান করা হবে।
                          </p>
                        </div>

                        {/* Amount Breakdown Summary Box */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-white/90 dark:bg-zinc-900/90 rounded-xl border border-zinc-200 dark:border-zinc-800">
                          <div>
                            <span className="text-[11px] text-zinc-500 block">মোট অর্ডার মূল্য</span>
                            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{formatPrice(total)}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-[#D12053] dark:text-[#f8719d] block font-semibold">অগ্রিম পরিশোধযোগ্য (Send Money)</span>
                            <span className="text-base sm:text-lg font-black text-[#D12053] dark:text-[#f8719d]">৳{requiredAdvance}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-zinc-500 block">ক্যাশ অন ডেলিভারিতে বাকি প্রদেয়</span>
                            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">৳{dueOnDelivery}</span>
                          </div>
                        </div>

                        {/* Notice: Payment takes place on dedicated page */}
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                              ✓
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300">
                              পেমেন্ট পরবর্তী ডেডিকেটেড পেজে সম্পন্ন হবে
                            </span>
                          </div>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 pl-8 leading-relaxed">
                            চেকআউট পেজে আপনাকে কোনো TrxID দিতে হবে না। অর্ডার রিভিউ কনফার্ম করার পর সরাসরি সুরক্ষিত ডেডিকেটেড গেটওয়ে পেজে নিয়ে যাওয়া হবে, যেখান থেকে আপনি আপনার <strong>{selectedPaymentMethod === "bkash" ? "বিকাশ" : "নগদ"}</strong> পার্সোনাল অ্যাকাউন্ট থেকে খুব সহজেই পেমেন্ট সম্পন্ন করতে পারবেন।
                          </p>
                        </div>
                      </div>

                      {/* Optional: DP Coin payment if user has coins */}
                      {userCoins > 0 && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentType(paymentType === "vgcoin" ? "advance" : "vgcoin");
                              setAdvanceType("full");
                            }}
                            className={cn(
                              "w-full flex items-center justify-between p-3.5 rounded-xl border text-xs transition-colors cursor-pointer",
                              paymentType === "vgcoin"
                                ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100"
                                : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                            )}
                          >
                            <span className="font-semibold">
                              💎 আপনার ডিপি কয়েন দিয়ে পে করতে চান? (ব্যালেন্স: {userCoins} কয়েন)
                            </span>
                            <span className="font-bold underline">
                              {paymentType === "vgcoin" ? "কয়েন পেমেন্ট সক্রিয় ✓" : "কয়েন দিয়ে পরিশোধ করুন"}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between items-center border-t border-zinc-100 dark:border-zinc-800 pt-4 pb-2">
                  <Button
                    variant="ghost"
                    className="text-xs sm:text-sm px-2 sm:px-4"
                    onClick={prevStep}
                  >
                    <ChevronLeft className="mr-1 h-3 w-3 sm:h-4 sm:w-4" /> Back
                  </Button>
                  <Button
                    onClick={nextStep}
                    disabled={!validateStep(2)}
                    size="default"
                    className="text-xs sm:text-sm px-4 sm:px-6"
                  >
                    Review Order
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <Card className="rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col gap-2">
                <CardHeader>
                  <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                    <Check className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />{" "}
                    Review Your Order
                  </h2>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-zinc-500">Shipping Details</Label>
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-sm font-medium">
                        <p>
                          {
                            savedAddresses.find(
                              (a) => a.id === selectedAddressId,
                            )?.name
                          }
                        </p>
                        <p>
                          {
                            savedAddresses.find(
                              (a) => a.id === selectedAddressId,
                            )?.phone
                          }
                        </p>
                        <p className="mt-2">
                          {
                            savedAddresses.find(
                              (a) => a.id === selectedAddressId,
                            )?.address
                          }
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-500">{t('Payment Details') || 'Payment Details'}</Label>
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-sm font-medium space-y-2.5">
                        {paymentType === "vgcoin" ? (
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-zinc-100">DP Coins (${advanceType === "full" ? "সম্পূর্ণ পেমেন্ট" : "অগ্রিম বুকিং"})</p>
                            <p className="text-xs text-zinc-500 mt-1">পেমেন্ট স্ট্যাটাস: কয়েন দিয়ে সংরক্ষিত</p>
                          </div>
                        ) : requiredAdvance === 0 ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">ক্যাশ অন ডেলিভারি (বাইপাস পণ্য)</span>
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">0 Advance</span>
                            </div>
                            <p className="text-xs text-zinc-600 dark:text-zinc-300">অগ্রিম প্রদেয়: <strong className="text-zinc-900 dark:text-zinc-100">৳০ (কোনো অগ্রিম নেই)</strong></p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-300">ডেলিভারির সময় প্রদেয়: <strong className="text-zinc-900 dark:text-zinc-100">{formatPrice(total)}</strong></p>
                            {guardianNumber && (
                              <p className="text-xs text-zinc-600 dark:text-zinc-300">গার্ডিয়ান মোবাইল: <strong className="font-mono">{guardianNumber}</strong></p>
                            )}
                            {nidCardUrl && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                ✓ এনআইডি কার্ড সংযুক্ত হয়েছে
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                {selectedPaymentMethod === "bkash" ? "bKash (বিকাশ) সেন্ড মানি" : "Nagad (নগদ) সেন্ড মানি"}
                              </span>
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                                পরবর্তী পেজে পরিশোধযোগ্য
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-zinc-200 dark:border-zinc-700">
                              <div>
                                <span className="text-zinc-500 block">অগ্রিম পরিশোধযোগ্য:</span>
                                <span className="font-bold text-[#D12053] dark:text-[#f8719d] text-sm">
                                  ৳{requiredAdvance}
                                </span>
                              </div>
                              <div>
                                <span className="text-zinc-500 block">ক্যাশ অন ডেলিভারিতে বাকি:</span>
                                <span className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">
                                  ৳{dueOnDelivery}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Checkout Policy Notes */}
                  <div className="space-y-4 mb-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                    <p className="note">
                      <strong>Delivery Notice:</strong> Border cross imported products delivery time is 1 month+ (approx 30-45 business days) with dedicated tracking.
                    </p>
                    <p className="note wr">
                      <strong>Important Warning:</strong> Mismatched transaction details or wrong IDs will result in immediate order cancellation. Recording an unboxing video is mandatory for returns.
                    </p>
                  </div>

                  <div className="flex items-start gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-6">
                    <Checkbox
                      id="terms"
                      checked={agreeToTerms}
                      onCheckedChange={(c) => setAgreeToTerms(!!c)}
                    />
                    <Label
                      htmlFor="terms"
                      className="text-sm font-bold leading-snug cursor-pointer mt-0.5"
                    >
                      I agree to the{" "}
                      <span className="underline text-zinc-800 dark:text-zinc-200">
                        Terms of Service
                      </span>{" "}
                      and{" "}
                      <span className="underline text-zinc-800 dark:text-zinc-200">
                        Privacy Policy
                      </span>
                      . Note: Returns are subjective to warranty policies.
                    </Label>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-row justify-between items-center border-t border-zinc-100 dark:border-zinc-800 pt-4 pb-2 sm:gap-4 gap-2">
                  <Button
                    variant="ghost"
                    className="text-xs sm:text-sm px-2 sm:px-4"
                    onClick={prevStep}
                  >
                    <ChevronLeft className="mr-1 h-3 w-3 sm:h-4 sm:w-4" /> Back
                  </Button>
                  <Button
                    onClick={placeOrder}
                    disabled={!validateStep(3) || isLoading}
                    size="default"
                    className="bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-lg shadow-black/10 dark:shadow-white/10 text-white dark:text-zinc-900 border-0 text-xs sm:text-sm px-3.5 sm:px-5 flex-1 sm:flex-none"
                  >
                    <Lock className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> {isLoading ? "অর্ডার তৈরি হচ্ছে..." : requiredAdvance === 0 ? "Confirm COD Order" : "Go to Payment Page"}
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            <Card className="rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <CardHeader className="bg-zinc-50/50 dark:bg-zinc-800/20 border-b border-zinc-100 dark:border-zinc-800 pb-5">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="text-zinc-500 w-5 h-5" /> {t('Order Summary') || 'Order Summary'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div className="flex flex-col gap-4 max-h-64 overflow-y-auto pr-2 scrollbar-thin">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-4 items-center">
                      <div className="relative w-16 h-16 shrink-0 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700 overflow-hidden">
                        <PixelImage
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full bg-transparent"
                          imgClassName="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal p-1"
                        />
                        <span className="absolute -top-1 -right-1 bg-zinc-900 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shadow-sm z-10">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate text-zinc-900 dark:text-zinc-100">
                          {item.name}
                        </div>
                        <div className="font-bold text-sm text-zinc-500 mt-1">
                          {formatPrice(item.price * item.quantity)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3">
                  {!appliedPromo ? (
                    <>
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => setShowCouponsModal(true)}
                          variant="outline"
                          className="w-full text-xs font-bold border-dashed border-zinc-300 dark:border-zinc-700 h-10 flex items-center justify-center gap-2 text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800"
                        >
                          <Ticket className="w-4 h-4" /> Select a Voucher
                        </Button>
                      </div>

                      <div className="flex items-center gap-4 px-2">
                        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800"></div>
                        <span className="text-[10px] uppercase font-bold text-zinc-400">
                          OR
                        </span>
                        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800"></div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter Promo/Affiliate Code"
                            value={couponCode}
                            onChange={(e) =>
                              setCouponCode(e.target.value.toUpperCase())
                            }
                            className="h-10 text-xs"
                          />
                          <Button
                            onClick={applyPromo}
                            variant="outline"
                            size="sm"
                            className="h-10 text-xs shrink-0"
                          >
                            Apply
                          </Button>
                        </div>
                        {couponError && (
                          <div className="text-xs font-bold text-red-500">
                            {couponError}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/20 rounded-xl">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <Ticket className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-bold text-sm text-emerald-800 dark:text-emerald-300">
                            {appliedPromo.code}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-medium ml-6">
                          -
                          {appliedPromo.type === "percent"
                            ? `${appliedPromo.discount}%`
                            : `${formatPrice(appliedPromo.discount)}`}{" "}
                          OFF
                        </span>
                      </div>
                      <button
                        onClick={removePromo}
                        className="text-zinc-500 hover:text-red-500 bg-white dark:bg-zinc-800 rounded-full p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {showCouponsModal && (
                  <div
                    className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setShowCouponsModal(false)}
                  >
                    <div
                      className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-t-[32px] md:rounded-[32px] p-6 pb-12 md:pb-6 shadow-2xl animate-in slide-in-from-bottom md:zoom-in-95"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                            My Vouchers
                          </h3>
                          <p className="text-xs text-zinc-500">
                            Select a voucher to apply to this order
                          </p>
                        </div>
                        <button
                          onClick={() => setShowCouponsModal(false)}
                          className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-2">
                        {claimedCouponsList
                          .filter(
                            (c) => !(c.expiresAt && c.expiresAt < Date.now()),
                          )
                          .map((c, i) => {
                            const minMet =
                              !c.minOrderAmount || subtotal >= c.minOrderAmount;
                            return (
                              <div
                                key={i}
                                className={`relative rounded-xl border flex overflow-hidden ${minMet ? "border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900" : "border-zinc-200 bg-zinc-50 dark:bg-zinc-800/50 opacity-60"}`}
                              >
                                <div
                                  className={`w-[80px] flex flex-col justify-center items-center p-3 text-white ${minMet ? "bg-amber-500" : "bg-zinc-400 dark:bg-zinc-600"}`}
                                >
                                  <span className="text-xl font-black">
                                    {c.type === "percent"
                                      ? `${c.discount}%`
                                      : `${formatPrice(c.discount)}`}
                                  </span>
                                  <span className="text-[10px] font-bold">
                                    OFF
                                  </span>
                                </div>
                                <div className="flex-1 p-3 flex flex-col justify-center bg-white dark:bg-zinc-900">
                                  <div className="font-bold text-sm mb-0.5">
                                    {c.code}
                                  </div>
                                  <div className="text-[10px] text-zinc-500">
                                    {c.minOrderAmount > 0
                                      ? `Min purchase ${formatPrice(c.minOrderAmount)}`
                                      : "No minimum"}
                                  </div>
                                  {!minMet && (
                                    <div className="text-[10px] text-red-500 font-bold mt-1">
                                      Need {formatPrice(c.minOrderAmount - subtotal)} more
                                    </div>
                                  )}
                                </div>
                                <button
                                  disabled={!minMet}
                                  onClick={() => {
                                    setAppliedPromo({
                                      id: c.id,
                                      ...c,
                                      isVoucher: true,
                                    });
                                    setCouponCode(c.code);
                                    setShowCouponsModal(false);
                                    notify("Voucher applied!", "success");
                                  }}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-bold px-4 py-2 rounded-full disabled:hidden"
                                >
                                  Use
                                </button>
                              </div>
                            );
                          })}
                        {claimedCouponsList.length === 0 && (
                          <div className="text-center py-10">
                            <Ticket className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
                            <p className="text-sm font-medium text-zinc-500">
                              You don't have any vouchers
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-sm font-medium">
                  <div className="flex justify-between text-zinc-500">
                    <span>{t('Subtotal') || 'Subtotal'}</span>
                    <span className="text-zinc-900 dark:text-zinc-100">
                      {formatPrice(subtotal)}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-zinc-800 dark:text-zinc-200 font-bold">
                      <span>Discount</span>
                      <span>-{formatPrice(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-500">
                    <span>{t('Delivery Fee') || 'Shipping'}</span>
                    <span className="text-zinc-900 dark:text-zinc-100">
                      {formatPrice(deliveryFee)}
                    </span>
                  </div>
                  <div className="flex justify-between items-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500 font-bold">{t('Total') || 'Total'}</span>
                    <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <CustomSectionEmbed location="checkout_bottom" />
    </div>
  );
}
