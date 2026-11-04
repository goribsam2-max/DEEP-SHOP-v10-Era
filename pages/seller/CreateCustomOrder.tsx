import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  ImagePlus,
  ListPlus,
  Loader2,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  Search,
  Store,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { auth, db } from "../../firebase";
import { OrderStatus } from "../../types";
import { canAccessSellerDashboard, isSuperAdminOrAdmin } from "../../lib/admin";
import { uploadToImgbb } from "../../services/imgbb";
import { useNotify } from "../../components/Notifications";
import { formatPrice } from "../../lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CustomOrderDraftItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  size: string;
  isCustomItem?: boolean;
}

const normalizePhoneDigits = (raw?: string): string => {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length >= 11 && digits.startsWith("880")) {
    return digits.slice(2);
  }
  if (digits.length > 11) {
    return digits.slice(-11);
  }
  return digits;
};

const extractUserAddress = (u: any): string => {
  if (!u) return "";
  if (typeof u.address === "string" && u.address.trim()) return u.address.trim();
  if (typeof u.shippingAddress === "string" && u.shippingAddress.trim()) {
    return u.shippingAddress.trim();
  }
  if (u.shippingAddress && typeof u.shippingAddress === "object") {
    return [
      u.shippingAddress.address,
      u.shippingAddress.upazila,
      u.shippingAddress.district || u.shippingAddress.city,
      u.shippingAddress.division,
    ]
      .filter(Boolean)
      .join(", ");
  }
  if (Array.isArray(u.addresses) && u.addresses.length > 0) {
    const first = u.addresses[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      return [first.address, first.upazila, first.district || first.city]
        .filter(Boolean)
        .join(", ");
    }
  }
  return "";
};

const CreateCustomOrder: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();

  const [user, setUser] = useState<User | null>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const [shopName, setShopName] = useState("");
  const [shopLogo, setShopLogo] = useState("");
  const [defaultReceiverNumber, setDefaultReceiverNumber] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [allUsersCache, setAllUsersCache] = useState<any[]>([]);

  // Customer linking & editable customer details
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [selectedCustomerUser, setSelectedCustomerUser] = useState<any | null>(
    null
  );
  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  // Order products state
  const [itemMode, setItemMode] = useState<"store" | "custom">("store");
  const [orderItems, setOrderItems] = useState<CustomOrderDraftItem[]>([]);
  const [uploadingItemImage, setUploadingItemImage] = useState(false);
  const [itemForm, setItemForm] = useState({
    selectedProductId: "",
    name: "",
    price: "",
    quantity: 1,
    image: "",
    size: "",
  });

  // Payment & status state
  const [paymentMethod, setPaymentMethod] = useState("bKash");
  const [paymentOption, setPaymentOption] = useState("Advance Payment");
  const [paymentStatus, setPaymentStatus] = useState("Paid");
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(
    OrderStatus.PENDING
  );
  const [advancePaid, setAdvancePaid] = useState("");
  const [shippingFee, setShippingFee] = useState("120");
  const [senderNumber, setSenderNumber] = useState("");
  const [receiverNumber, setReceiverNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        navigate("/auth-selector?redirect=/seller/custom-order", {
          replace: true,
        });
        return;
      }
      setUser(u);

      try {
        const userSnap = await getDoc(doc(db, "users", u.uid));
        const profileData = userSnap.exists() ? userSnap.data() : {};
        setSellerProfile(profileData);

        if (!canAccessSellerDashboard(profileData, u)) {
          notify("আপনার সেলার ড্যাশবোর্ডে প্রবেশের অনুমতি নেই।", "error");
          navigate("/", { replace: true });
          return;
        }

        const resolvedShopName =
          profileData?.shopName ||
          profileData?.displayName ||
          u.displayName ||
          "Deep Shop Store";
        const resolvedShopLogo = (
          profileData?.shopLogo ||
          profileData?.photoURL ||
          u.photoURL ||
          ""
        ).trim();
        setShopName(resolvedShopName);
        setShopLogo(resolvedShopLogo);

        const bkash =
          profileData?.bkashNumber ||
          profileData?.paymentSettings?.bkashNumber ||
          "";
        const nagad =
          profileData?.nagadNumber ||
          profileData?.paymentSettings?.nagadNumber ||
          "";
        if (bkash || nagad) {
          setDefaultReceiverNumber(bkash || nagad);
          setReceiverNumber(bkash || nagad);
        }

        // Load seller's products (or all products for main admin)
        const isMainAdmin = isSuperAdminOrAdmin(profileData, u);
        const prodQ = isMainAdmin
          ? query(collection(db, "products"))
          : query(collection(db, "products"), where("sellerId", "==", u.uid));
        const prodSnap = await getDocs(prodQ);
        const loadedProducts = prodSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setProducts(loadedProducts);
        if (loadedProducts.length === 0) {
          setItemMode("custom");
        }
      } catch (err) {
        console.error("Failed to initialize custom order page:", err);
      } finally {
        setCheckingAccess(false);
      }
    });

    return () => unsub();
  }, [navigate, notify]);

  const ensureUsersLoaded = async (): Promise<any[]> => {
    if (allUsersCache.length > 0) return allUsersCache;
    setIsSearchingCustomers(true);
    try {
      const snap = await getDocs(query(collection(db, "users")));
      const list = snap.docs.map((d) => ({
        id: d.id,
        uid: d.data()?.uid || d.id,
        ...d.data(),
      }));
      setAllUsersCache(list);
      return list;
    } catch (err) {
      console.error("Customer fetch error:", err);
      return [];
    } finally {
      setIsSearchingCustomers(false);
    }
  };

  useEffect(() => {
    if (customerSearchQuery.trim().length < 2) return;
    if (allUsersCache.length === 0 && !isSearchingCustomers) {
      ensureUsersLoaded();
    }
  }, [customerSearchQuery]);

  const customerSearchResults = useMemo(() => {
    const q = customerSearchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    const qDigits = normalizePhoneDigits(q);

    return allUsersCache
      .filter((u: any) => {
        const name = String(
          u.displayName || u.fullName || u.shopName || u.name || ""
        ).toLowerCase();
        const username = String(u.username || "").toLowerCase();
        const email = String(u.email || "").toLowerCase();
        const uidStr = String(u.uid || u.id || "").toLowerCase();
        const rawPhone = String(
          u.phone || u.phoneNumber || u.shippingAddress?.phone || ""
        ).toLowerCase();
        const uDigits = normalizePhoneDigits(rawPhone);

        return (
          name.includes(q) ||
          username.includes(q) ||
          email.includes(q) ||
          uidStr.includes(q) ||
          rawPhone.includes(q) ||
          (qDigits.length >= 5 && uDigits.includes(qDigits))
        );
      })
      .slice(0, 8);
  }, [customerSearchQuery, allUsersCache]);

  const handleSelectCustomerAccount = (u: any) => {
    const resolvedUid = u.uid || u.id;
    setSelectedCustomerUser({ ...u, uid: resolvedUid, id: u.id || resolvedUid });
    setCustomerSearchQuery("");
    setCustomerDetails((prev) => ({
      name:
        u.displayName || u.fullName || u.shopName || u.name || prev.name || "",
      phone:
        u.phone ||
        u.phoneNumber ||
        u.shippingAddress?.phone ||
        prev.phone ||
        "",
      email: (u.email || prev.email || "").trim(),
      address: extractUserAddress(u) || prev.address || "",
    }));
    notify("কাস্টমার অ্যাকাউন্ট যুক্ত করা হয়েছে!", "success");
  };

  const handleCustomItemImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingItemImage(true);
    try {
      const url = await uploadToImgbb(file);
      if (url) {
        setItemForm((prev) => ({ ...prev, image: url }));
        notify("প্রোডাক্টের ছবি আপলোড হয়েছে", "success");
      }
    } catch {
      notify("ছবি আপলোড করতে সমস্যা হয়েছে", "error");
    } finally {
      setUploadingItemImage(false);
      e.target.value = "";
    }
  };

  const handleAddProductItem = () => {
    if (!itemForm.name.trim()) {
      notify("অনুগ্রহ করে প্রোডাক্টের নাম লিখুন", "error");
      return;
    }
    const unitPrice = Number(itemForm.price);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      notify("অনুগ্রহ করে সঠিক মূল্য লিখুন", "error");
      return;
    }
    const qty = Math.max(1, Number(itemForm.quantity || 1));
    const generatedId =
      itemForm.selectedProductId ||
      `custom_prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const cleanImage = (itemForm.image || "").trim();

    const newItem: CustomOrderDraftItem = {
      id: generatedId,
      productId: generatedId,
      name: itemForm.name.trim(),
      price: unitPrice,
      quantity: qty,
      image: cleanImage,
      size: itemForm.size.trim(),
      isCustomItem: !itemForm.selectedProductId,
    };

    setOrderItems((prev) => [...prev, newItem]);
    setItemForm({
      selectedProductId: "",
      name: "",
      price: "",
      quantity: 1,
      image: "",
      size: "",
    });
    notify("প্রোডাক্ট অর্ডার লিস্টে যোগ করা হয়েছে", "success");
  };

  const handleRemoveItem = (idx: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const subTotal = useMemo(
    () =>
      orderItems.reduce(
        (sum, item) => sum + Number(item.price) * Number(item.quantity),
        0
      ),
    [orderItems]
  );
  const numericShippingFee = Math.max(0, Number(shippingFee || 0));
  const grandTotal = subTotal + numericShippingFee;
  const numericAdvancePaid = Math.max(0, Number(advancePaid || 0));
  const dueAmount = Math.max(0, grandTotal - numericAdvancePaid);

  const handleSaveCustomOrder = async () => {
    if (!user) return;
    if (orderItems.length === 0) {
      notify("কমপক্ষে ১টি প্রোডাক্ট যোগ করুন", "error");
      return;
    }

    const custName = customerDetails.name.trim();
    const custPhone = customerDetails.phone.trim();
    const custEmailInput = customerDetails.email.trim().toLowerCase();
    const custAddress = customerDetails.address.trim() || "Store Direct Order";

    if (!custName) {
      notify("কাস্টমারের নাম লিখুন", "error");
      return;
    }
    if (!custPhone) {
      notify("কাস্টমারের মোবাইল নম্বর লিখুন", "error");
      return;
    }

    setSavingOrder(true);
    try {
      let resolvedUid =
        selectedCustomerUser?.uid || selectedCustomerUser?.id || "";
      let resolvedEmail =
        custEmailInput ||
        String(selectedCustomerUser?.email || "")
          .trim()
          .toLowerCase();

      const normPhone = normalizePhoneDigits(custPhone);

      // Auto-resolve registered customer account if seller typed email/phone manually without clicking dropdown
      if (!resolvedUid) {
        const usersList = await ensureUsersLoaded();
        const autoMatched = usersList.find((u: any) => {
          const uEmail = String(u.email || "")
            .trim()
            .toLowerCase();
          if (custEmailInput && uEmail && uEmail === custEmailInput) {
            return true;
          }
          const uPhoneNorm = normalizePhoneDigits(
            u.phone || u.phoneNumber || u.shippingAddress?.phone || ""
          );
          if (
            normPhone.length >= 10 &&
            uPhoneNorm.length >= 10 &&
            uPhoneNorm === normPhone
          ) {
            return true;
          }
          return false;
        });

        if (autoMatched) {
          resolvedUid = autoMatched.uid || autoMatched.id || "";
          if (!resolvedEmail && autoMatched.email) {
            resolvedEmail = String(autoMatched.email).trim().toLowerCase();
          }
        }
      }

      const now = Date.now();
      const newOrderData: Record<string, any> = {
        sellerId: user.uid,
        sellerName: shopName || "Seller Store",
        shopName: shopName || "Seller Store",
        shopLogo: shopLogo || "",
        userId: resolvedUid || "guest",
        customerId: resolvedUid || "",
        customerEmail: resolvedEmail || "",
        customerName: custName,
        contactNumber: custPhone,
        customerPhoneNormalized: normPhone,
        shippingAddress: {
          fullName: custName,
          phone: custPhone,
          address: custAddress,
        },
        items: orderItems.map((i) => ({
          id: i.id,
          productId: i.productId || i.id,
          name: i.name,
          price: i.price,
          priceAtPurchase: i.price,
          quantity: i.quantity,
          image: i.image || "",
          sellerId: user.uid,
          sellerName: shopName || "Seller Store",
          size: i.size || "",
          isCustomItem: Boolean(i.isCustomItem),
        })),
        subTotal,
        shippingFee: numericShippingFee,
        total: grandTotal,
        advancePaid: numericAdvancePaid,
        advanceAmount: numericAdvancePaid,
        dueAmount,
        paymentMethod,
        paymentOption,
        paymentStatus: paymentStatus.toLowerCase(),
        status: orderStatus,
        accountNameSender: senderNumber.trim(),
        senderNumber: senderNumber.trim(),
        receiverNumber: receiverNumber.trim() || defaultReceiverNumber || "",
        transactionId: transactionId.trim(),
        trxId: transactionId.trim(),
        note: orderNote.trim(),
        createdAt: now,
        timestamp: now,
        updatedAt: now,
        isCustomOrder: true,
      };

      const docRef = await addDoc(collection(db, "orders"), newOrderData);

      // Notify linked customer in their account notifications
      if (resolvedUid) {
        try {
          await addDoc(collection(db, "notifications"), {
            userId: resolvedUid,
            title: "নতুন কাস্টম অর্ডার যুক্ত হয়েছে",
            message: `${shopName || "Deep Shop"} আপনার অ্যাকাউন্টে একটি নতুন অর্ডার (#${docRef.id
              .slice(0, 8)
              .toUpperCase()}) যুক্ত করেছে। মোট মূল্য: ${formatPrice(grandTotal)}`,
            type: "order",
            orderId: docRef.id,
            link: "/orders",
            isRead: false,
            createdAt: now,
          });
        } catch (notifErr) {
          console.warn("Customer order notification skipped:", notifErr);
        }
      }

      notify(
        resolvedUid
          ? `কাস্টম অর্ডার তৈরি হয়েছে এবং কাস্টমারের অ্যাকাউন্টে যুক্ত হয়েছে! (#${docRef.id.slice(
              0,
              8
            )})`
          : `কাস্টম অর্ডার সফলভাবে তৈরি হয়েছে! (#${docRef.id.slice(0, 8)})`,
        "success"
      );

      navigate("/seller/dashboard?tab=orders");
    } catch (err) {
      console.error("Save custom order error:", err);
      notify("কাস্টম অর্ডার তৈরি করতে সমস্যা হয়েছে", "error");
    } finally {
      setSavingOrder(false);
    }
  };

  if (checkingAccess) {
    return (
      <div className="min-h-screen orders-v2-shell flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen orders-v2-shell pb-24">
      {/* Top Sticky Page Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#090a0f]/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate("/seller/dashboard?tab=orders")}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 active:scale-95 transition shrink-0 cursor-pointer"
              aria-label="Back to Seller Orders"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-white truncate">
                Create Custom Order
              </h1>
              <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400 truncate">
                কাস্টমার অ্যাকাউন্ট লিংক, প্রোডাক্ট ও পেমেন্ট হিসাবসহ নতুন অর্ডার
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 shrink-0">
            <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-800 text-white flex items-center justify-center overflow-hidden shrink-0">
              {shopLogo ? (
                <img
                  src={shopLogo}
                  alt={shopName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Store className="w-4 h-4" />
              )}
            </div>
            <span className="max-w-[140px] truncate">{shopName}</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {/* SECTION 1: CUSTOMER ACCOUNT & DELIVERY DETAILS */}
        <section className="orders-v2-card rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Users className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                  1. Customer Account & Delivery Info
                </h2>
                <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400">
                  রেজিস্টার্ড কাস্টমার সার্চ করে সিলেক্ট করলে অর্ডারটি সরাসরি তার অ্যাকাউন্টে দেখাবে
                </p>
              </div>
            </div>
          </div>

          {/* Search Registered Customer Box */}
          <div className="space-y-2.5">
            <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Search Customer Account (নাম, ইমেইল, ফোন নম্বর বা UID দিয়ে খুঁজুন)
            </Label>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                onFocus={() => {
                  if (allUsersCache.length === 0) ensureUsersLoaded();
                }}
                placeholder="কাস্টমারের নাম, ইমেইল বা 01XXXXXXXXX লিখে সার্চ করুন..."
                className="pl-10 pr-9 h-11 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
              />
              {isSearchingCustomers ? (
                <Loader2 className="w-4 h-4 animate-spin text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              ) : customerSearchQuery ? (
                <button
                  type="button"
                  onClick={() => setCustomerSearchQuery("")}
                  className="w-6 h-6 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>

            {/* Search Dropdown Results */}
            {customerSearchResults.length > 0 && (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800 shadow-lg max-h-60 overflow-y-auto">
                {customerSearchResults.map((u) => {
                  const display =
                    u.displayName || u.fullName || u.shopName || "Customer";
                  const subInfo = [
                    u.email,
                    u.phone || u.phoneNumber || u.shippingAddress?.phone,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  const avatarUrl = (u.photoURL || "").trim();

                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectCustomerAccount(u)}
                      className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-blue-50/60 dark:hover:bg-white/[0.04] text-left transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-blue-600/12 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={display}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            display.slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">
                            {display}
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                            {subInfo || `UID: ${u.uid || u.id}`}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                        Select Account
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {customerSearchQuery.trim().length >= 2 &&
              !isSearchingCustomers &&
              customerSearchResults.length === 0 && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 px-1">
                  কোনো রেজিস্টার্ড অ্যাকাউন্ট পাওয়া যায়নি। নিচে ম্যানুয়ালি নাম, ফোন ও ইমেইল লিখতে পারেন।
                </p>
              )}

            {/* Linked Customer Account Indicator (Inputs remain editable!) */}
            {selectedCustomerUser && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/35 border border-emerald-200/80 dark:border-emerald-800/70">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200 truncate">
                      Linked Account:{" "}
                      {selectedCustomerUser.displayName ||
                        selectedCustomerUser.shopName ||
                        "Customer"}
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono truncate">
                      {selectedCustomerUser.email ||
                        `UID: ${selectedCustomerUser.uid}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerUser(null)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100/70 dark:hover:bg-rose-950/50 transition shrink-0 cursor-pointer"
                >
                  Unlink
                </button>
              </div>
            )}
          </div>

          {/* Editable Customer Fields (Never disabled so missing phone/address can always be filled!) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div>
              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                Customer Name (পূর্ণ নাম) *
              </Label>
              <Input
                value={customerDetails.name}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    name: e.target.value,
                  })
                }
                placeholder="কাস্টমারের নাম লিখুন"
                className="h-11 text-sm rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-zinc-400" />
                <span>Contact Phone (মোবাইল নম্বর) *</span>
              </Label>
              <Input
                value={customerDetails.phone}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    phone: e.target.value,
                  })
                }
                placeholder="017XXXXXXXX"
                className="h-11 text-sm font-mono rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-zinc-400" />
                <span>Customer Email (অ্যাকাউন্ট সিঙ্কের জন্য ঐচ্ছিক)</span>
              </Label>
              <Input
                type="email"
                value={customerDetails.email}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    email: e.target.value,
                  })
                }
                placeholder="customer@gmail.com"
                className="h-11 text-sm rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                <span>Delivery Address (ডেলিভারি ঠিকানা)</span>
              </Label>
              <Input
                value={customerDetails.address}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    address: e.target.value,
                  })
                }
                placeholder="বাসা, রোড, থানা ও জেলা"
                className="h-11 text-sm rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
              />
            </div>
          </div>
        </section>

        {/* SECTION 2: ORDER PRODUCTS */}
        <section className="orders-v2-card rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#EF8020]/12 text-[#EF8020] flex items-center justify-center shrink-0">
                <Package className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                  2. Order Products (প্রোডাক্টসমূহ)
                </h2>
                <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400">
                  স্টোরের প্রোডাক্ট অথবা যেকোনো কাস্টম প্রোডাক্ট অর্ডারে যোগ করুন
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/90 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setItemMode("store")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  itemMode === "store"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                Store Catalog
              </button>
              <button
                type="button"
                onClick={() => {
                  setItemMode("custom");
                  setItemForm((prev) => ({ ...prev, selectedProductId: "" }));
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  itemMode === "custom"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                + Custom Item
              </button>
            </div>
          </div>

          {/* Added Items List */}
          {orderItems.length > 0 ? (
            <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
              {orderItems.map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className="px-3.5 py-3 flex items-center justify-between gap-3 bg-zinc-50/60 dark:bg-zinc-900/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-700 overflow-hidden flex items-center justify-center shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-zinc-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums mt-0.5">
                        Qty: {item.quantity} × {formatPrice(item.price)} ={" "}
                        <strong className="text-zinc-900 dark:text-white">
                          {formatPrice(item.quantity * item.price)}
                        </strong>
                        {item.size ? ` · ${item.size}` : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center hover:bg-rose-100 transition shrink-0 cursor-pointer"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-5 px-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-center text-xs text-zinc-500 dark:text-zinc-400">
              এখনো কোনো প্রোডাক্ট যোগ করা হয়নি। নিচে প্রোডাক্ট সিলেক্ট বা লিখে{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">
                Add Item
              </strong>{" "}
              বাটনে ক্লিক করুন।
            </div>
          )}

          {/* Add Product Form */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 sm:p-4 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800">
            {itemMode === "store" ? (
              <div className="sm:col-span-12">
                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                  Select Store Product (স্টোর থেকে প্রোডাক্ট নির্বাচন)
                </Label>
                <select
                  value={itemForm.selectedProductId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    const prod = products.find((p) => p.id === pid);
                    if (prod) {
                      const imgCandidate =
                        prod.image ||
                        (Array.isArray(prod.images) && prod.images[0]) ||
                        "";
                      setItemForm({
                        ...itemForm,
                        selectedProductId: prod.id,
                        name: prod.name || "",
                        price: String(prod.offerPrice || prod.price || ""),
                        image: String(imgCandidate).trim(),
                      });
                    } else {
                      setItemForm({
                        ...itemForm,
                        selectedProductId: "",
                      });
                    }
                  }}
                  className="w-full h-11 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 outline-none text-zinc-900 dark:text-white"
                >
                  <option value="">
                    -- স্টোরের প্রোডাক্ট লিস্ট থেকে নির্বাচন করুন --
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ৳{p.offerPrice || p.price}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="sm:col-span-8">
                  <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                    Custom Product Title (প্রোডাক্টের নাম) *
                  </Label>
                  <Input
                    value={itemForm.name}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, name: e.target.value })
                    }
                    placeholder="যেমন: iPhone 15 Pro Max 256GB Natural Titanium"
                    className="h-11 text-sm rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                  />
                </div>
                <div className="sm:col-span-4">
                  <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                    Product Photo (ঐচ্ছিক)
                  </Label>
                  <label className="h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition">
                    {uploadingItemImage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : itemForm.image ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Photo Attached</span>
                      </>
                    ) : (
                      <>
                        <ImagePlus className="w-4 h-4 text-zinc-500" />
                        <span>Upload Photo</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCustomItemImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </>
            )}

            <div className="sm:col-span-3">
              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                Unit Price (৳) *
              </Label>
              <Input
                type="number"
                value={itemForm.price}
                onChange={(e) =>
                  setItemForm({ ...itemForm, price: e.target.value })
                }
                placeholder="0"
                className="h-11 text-sm font-mono rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
              />
            </div>

            <div className="sm:col-span-3">
              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                Quantity (পরিমাণ)
              </Label>
              <Input
                type="number"
                min={1}
                value={itemForm.quantity}
                onChange={(e) =>
                  setItemForm({
                    ...itemForm,
                    quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                  })
                }
                className="h-11 text-sm font-mono rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
              />
            </div>

            <div className="sm:col-span-3">
              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                Size / Variant
              </Label>
              <Input
                value={itemForm.size}
                onChange={(e) =>
                  setItemForm({ ...itemForm, size: e.target.value })
                }
                placeholder="e.g. XL, 256GB"
                className="h-11 text-sm rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
              />
            </div>

            <div className="sm:col-span-3 flex items-end">
              <Button
                type="button"
                onClick={handleAddProductItem}
                className="w-full h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </Button>
            </div>
          </div>
        </section>

        {/* SECTION 3: PAYMENT, STATUS & CALCULATION */}
        <section className="orders-v2-card rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-zinc-100 dark:border-white/10 pb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                3. Payment & Calculation (পেমেন্ট ও হিসাব)
              </h2>
              <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400">
                অগ্রিম জমা, ডেলিভারি চার্জ ও অর্ডারের বর্তমান স্ট্যাটাস নির্ধারণ করুন
              </p>
            </div>
          </div>

          {/* Calculation Summary Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block font-medium">
                Subtotal
              </span>
              <span className="text-sm font-bold text-zinc-900 dark:text-white tabular-nums">
                {formatPrice(subTotal)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block font-medium">
                Delivery Fee
              </span>
              <span className="text-sm font-bold text-zinc-900 dark:text-white tabular-nums">
                {formatPrice(numericShippingFee)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/35 border border-emerald-200/70 dark:border-emerald-800/70">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-semibold">
                Advance Paid
              </span>
              <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">
                {formatPrice(numericAdvancePaid)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/35 border border-rose-200/70 dark:border-rose-800/70">
              <span className="text-[11px] text-rose-700 dark:text-rose-400 block font-semibold">
                Due Amount (COD)
              </span>
              <span className="text-sm font-extrabold text-rose-700 dark:text-rose-300 tabular-nums">
                {formatPrice(dueAmount)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                Advance Paid Amount (৳)
              </Label>
              <Input
                type="number"
                value={advancePaid}
                onChange={(e) => {
                  const val = e.target.value;
                  setAdvancePaid(val);
                  if (Number(val) > 0 && paymentMethod === "Cash on Delivery") {
                    setPaymentOption("Advance Payment");
                  }
                }}
                placeholder="0"
                className="h-11 text-sm font-mono rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                Delivery Charge (৳)
              </Label>
              <Input
                type="number"
                value={shippingFee}
                onChange={(e) => setShippingFee(e.target.value)}
                placeholder="120"
                className="h-11 text-sm font-mono rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                Payment Method
              </Label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  const val = e.target.value;
                  setPaymentMethod(val);
                  if (val === "Cash on Delivery") {
                    setPaymentOption("Cash on Delivery");
                  }
                }}
                className="w-full h-11 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 outline-none text-zinc-900 dark:text-white"
              >
                <option value="bKash">bKash (বিকাশ)</option>
                <option value="Nagad">Nagad (নগদ)</option>
                <option value="Cash on Delivery">
                  Cash on Delivery (ক্যাশ অন ডেলিভারি)
                </option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Rocket">Rocket</option>
                <option value="Upay">Upay</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                Payment Status
              </Label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full h-11 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 outline-none text-zinc-900 dark:text-white"
              >
                <option value="Paid">Paid (পরিশোধিত)</option>
                <option value="Partial Paid">
                  Partial Paid (আংশিক পরিশোধিত)
                </option>
                <option value="Unpaid">Unpaid (বাকি / COD)</option>
                <option value="Pending">Pending Verification</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                Order Status
              </Label>
              <select
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
                className="w-full h-11 text-sm font-semibold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 outline-none text-zinc-900 dark:text-white"
              >
                <option value={OrderStatus.PENDING}>
                  Pending (পেন্ডিং অর্ডার)
                </option>
                <option value={OrderStatus.APPROVED}>
                  Approved (কনফার্মড অর্ডার)
                </option>
                <option value={OrderStatus.PROCESSING}>
                  Processing (প্রসেসিং)
                </option>
                <option value={OrderStatus.SHIPPED_IN_COURIER}>
                  Shipped in Courier (কুরিয়ারে পাঠানো)
                </option>
                <option value={OrderStatus.ON_THE_WAY}>
                  On the Way (পথে আছে)
                </option>
                <option value={OrderStatus.DELIVERED}>
                  Delivered (ডেলিভার্ড)
                </option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                Sender Phone Number (প্রেরক নম্বর)
              </Label>
              <Input
                value={senderNumber}
                onChange={(e) => setSenderNumber(e.target.value)}
                placeholder="যেই নম্বর থেকে টাকা এসেছে"
                className="h-11 text-sm font-mono rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                Received On (স্টোর রিসিভ নম্বর)
              </Label>
              <Input
                value={receiverNumber}
                onChange={(e) => setReceiverNumber(e.target.value)}
                placeholder="স্টোর পেমেন্ট নম্বর"
                className="h-11 text-sm font-mono rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
              />
            </div>

            <div className="sm:col-span-2">
              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                Transaction ID (TrxID)
              </Label>
              <Input
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. BKA982L1M4"
                className="h-11 text-sm font-mono uppercase rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
              />
            </div>

            <div className="sm:col-span-3">
              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                Order Note / Internal Memo (ঐচ্ছিক)
              </Label>
              <Textarea
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder="অর্ডারের সাথে বিশেষ কোনো নির্দেশনা বা নোট থাকলে লিখুন..."
                className="min-h-[76px] text-sm rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 resize-none"
              />
            </div>
          </div>
        </section>

        {/* Bottom Submit Bar */}
        <div className="orders-v2-card rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-4 px-1">
            <div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">
                Grand Total ({orderItems.length} item
                {orderItems.length === 1 ? "" : "s"})
              </span>
              <span className="text-lg font-extrabold text-zinc-900 dark:text-white tabular-nums">
                {formatPrice(grandTotal)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/seller/dashboard?tab=orders")}
              className="flex-1 sm:flex-none h-11 px-5 rounded-xl font-semibold text-xs border-zinc-200 dark:border-zinc-700 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={savingOrder}
              onClick={handleSaveCustomOrder}
              className="flex-1 sm:flex-none h-11 px-6 rounded-xl orders-v2-btn-explore font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {savingOrder ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>অর্ডার সেভ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <ListPlus className="w-4 h-4" />
                  <span>Save & Create Custom Order</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCustomOrder;
