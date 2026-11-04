import { sendPushNotification } from "../../lib/push";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  setDoc,
  query,
  where,
  onSnapshot
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { OrderStatus } from "../../types";
import { uploadToImgbb } from "../../services/imgbb";
import { useNotify, useConfirm } from "../../components/Notifications";
import { formatPrice, cn, isForbiddenNumber } from "../../lib/utils";
import { isSuperAdminOrAdmin, canAccessSellerDashboard } from "../../lib/admin";
import {
  extractConfiguredMobileAccounts,
  normalizeAccountType,
  toAdminPaymentType,
} from "../../lib/dhakaTime";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "../../components/Icon";
import {
  Plus, Edit, Trash2, Package, Eye, ShoppingBag, TrendingUp, Music,
  Store, Camera, ShieldCheck, Check, DollarSign, ListPlus, Loader2,
  X, ArrowLeft, ShieldAlert, Award, ChevronRight, ChevronDown, Menu, Home as HomeIcon,
  BookOpen, Bell, CreditCard, Truck, Percent, Users, Edit3, Settings, Shield,
  ArrowRight, Video, FileText, CheckCircle, MessageSquare, Search, SlidersHorizontal,
  MapPin, Phone, LayoutDashboard, ClipboardList, Boxes, Sliders, Copy,
  Crown
} from "lucide-react";
import { generatePartSvg } from "../../src/lib/phonePartsArt";
import ManageSubscriptions from "../admin/ManageSubscriptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VerifiedIcon } from "../../components/SellerBadge";
import { CustomDropdown } from "../../components/CustomDropdown";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const PRESET_SONGS = [
  {
    name: "LoFi Chill",
    url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3",
  },
  {
    name: "Upbeat Corporate",
    url: "https://cdn.pixabay.com/download/audio/2022/10/24/audio_34b4ce6dcb.mp3?filename=uplifting-upbeat-corporate-125086.mp3",
  },
  {
    name: "Cyberpunk Action",
    url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_249ea36566?filename=cyberpunk-2099-10701.mp3",
  },
  {
    name: "Epic Cinematic",
    url: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2?filename=epic-hollywood-trailer-9489.mp3",
  },
  {
    name: "Pop Vibe",
    url: "https://cdn.pixabay.com/download/audio/2021/08/04/audio_c6ccf3232f?filename=summer-nights-tropical-house-music-11440.mp3",
  },
];

const CHART_TIME_FILTERS = [
  { value: "7days", label: "Last 7 Days" },
  { value: "30days", label: "Last 30 Days" },
  { value: "all", label: "All Time" }
];



const SellerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const notify = useNotify();
  const confirm = useConfirm();
  const [user, setUser] = useState<User | null>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  
  // Custom navigation structure (Tabs/views inside the full-screen space)
  const initialTab = (searchParams.get("tab") as any) || "home";
  const [activeTab, setActiveTab] = useState<
    "home" | "orders" | "products" | "subscriptions" | "blog" | "settings_store" | "settings_payment" | "settings_shipping" | "settings_coupons" | "settings_categories" | "settings_members" | "add_product" | "edit_product" | "add_story" | "more" | "settings_tax"
  >(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam as any);
      setSelectedOrderId(null);
    }
  }, [searchParams]);

  // Dynamic Store Settings states
  const [shopName, setShopName] = useState("");
  const [shopLogo, setShopLogo] = useState("");
  const [tiktokId, setTiktokId] = useState("");
  const [bkashNumber, setBkashNumber] = useState("");
  const [nagadNumber, setNagadNumber] = useState("");
  const [bkashNumbers, setBkashNumbers] = useState<string[]>([]);
  const [nagadNumbers, setNagadNumbers] = useState<string[]>([]);
  const [bkashAccounts, setBkashAccounts] = useState<
    { number: string; type: "Personal" | "Payment" | "Agent" }[]
  >([]);
  const [nagadAccounts, setNagadAccounts] = useState<
    { number: string; type: "Personal" | "Payment" | "Agent" }[]
  >([]);
  const [newBkashInput, setNewBkashInput] = useState("");
  const [newNagadInput, setNewNagadInput] = useState("");
  const [newBkashType, setNewBkashType] = useState<"Personal" | "Payment" | "Agent">("Personal");
  const [newNagadType, setNewNagadType] = useState<"Personal" | "Payment" | "Agent">("Personal");
  const [coupons, setCoupons] = useState<any[]>([]);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponDiscount, setNewCouponDiscount] = useState("");
  const [defaultAdvanceAmount, setDefaultAdvanceAmount] = useState<number | string>("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");

  // Tax Settings states
  const [taxRate, setTaxRate] = useState<number | string>(5);
  const [binNumber, setBinNumber] = useState("");
  const [taxInclusive, setTaxInclusive] = useState(true);

  // Filter state for Line Chart & list filters
  const [chartFilter, setChartFilter] = useState("7days");
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [orderSearch, setOrderSearch] = useState<string>("");
  const [showOrderFilterMenu, setShowOrderFilterMenu] = useState<boolean>(false);
  const [productSearch, setProductSearch] = useState("");

  // Data lists
  const [products, setProducts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [cancelModalOrderId, setCancelModalOrderId] = useState<string | null>(null);
  const [cancelModalStatus, setCancelModalStatus] = useState<OrderStatus | null>(null);
  const [cancelReasonText, setCancelReasonText] = useState("");
  const [courierCompleteOrderId, setCourierCompleteOrderId] = useState<string | null>(null);
  const [courierNameInput, setCourierNameInput] = useState("");
  const [deliveryManNumberInput, setDeliveryManNumberInput] = useState("");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Editing state
  const [productEditingId, setProductEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Product Form State
  const [productForm, setProductForm] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    stock: "",
    isOffer: false,
    offerPrice: "",
    isBorderOffer: false,
    borderOfferAdvanceAmount: "",
    storage: "",
    condition: "",
    batteryHealth: "",
    warranty: "",
    modelUrl: "",
    videoUrl: "",
    imageFiles: [] as File[],
    existingImages: [] as string[],
    coinReward: "",
    isCodEnabled: true,
    advanceType: "custom" as "full" | "custom",
    advanceMode: "fixed" as "fixed" | "percentage",
    advanceAmount: "",
    advancePercentage: "",
  });

  // Story Form State
  const [storyForm, setStoryForm] = useState({
    type: "image" as "image" | "video",
    mediaUrl: "",
    videoUrl: "",
    category: "Border Cross",
    linkUrl: "",
    songUrl: PRESET_SONGS[0].url,
    mediaFile: null as File | null,
  });

  const dataFetchedRef = useRef(false);
  const settingsLoadedRef = useRef(false);
  const isMainAdminRef = useRef(false);
  const sellerProductIdsRef = useRef<Set<string>>(new Set());
  const rawOrdersRef = useRef<any[]>([]);

  const safeOrderMillis = (v: any): number => {
    if (!v) return 0;
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    if (v instanceof Date) {
      const t = v.getTime();
      return Number.isNaN(t) ? 0 : t;
    }
    if (typeof v?.toMillis === "function") {
      const t = v.toMillis();
      return Number.isFinite(t) ? t : 0;
    }
    if (typeof v?.toDate === "function") {
      const d = v.toDate();
      const t = d instanceof Date ? d.getTime() : NaN;
      return Number.isNaN(t) ? 0 : t;
    }
    if (typeof v === "object" && typeof v.seconds === "number") {
      return v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6);
    }
    if (typeof v === "string") {
      const parsed = new Date(v).getTime();
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const computeVisibleOrders = (allOrders: any[], uid: string, isMainAdmin: boolean) => {
    const filtered = isMainAdmin
      ? allOrders
      : allOrders.filter(
          (ord: any) =>
            ord.status !== "awaiting_payment" &&
            ord.status !== "payment_pending" &&
            (ord.sellerId === uid ||
              ord.items?.some(
                (item: any) =>
                  item.sellerId === uid ||
                  sellerProductIdsRef.current.has(item.productId || item.id)
              ))
        );
    return [...filtered].sort(
      (a: any, b: any) =>
        safeOrderMillis(b.createdAt || b.timestamp) -
        safeOrderMillis(a.createdAt || a.timestamp)
    );
  };

  // Authentication & Profile listener
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let unsubOrdersRef: (() => void) | null = null;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        // Load local cached seller settings as fallback if available
        try {
          const cached = localStorage.getItem(`vibe_seller_settings_${u.uid}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.shopName) setShopName(parsed.shopName);
            if (parsed.photoURL) setShopLogo(parsed.photoURL);
            if (parsed.tiktokId) setTiktokId(parsed.tiktokId);
            if (parsed.bkashNumber) setBkashNumber(parsed.bkashNumber);
            if (parsed.nagadNumber) setNagadNumber(parsed.nagadNumber);
            if (parsed.defaultAdvanceAmount !== undefined) setDefaultAdvanceAmount(parsed.defaultAdvanceAmount);
            if (parsed.taxRate !== undefined) setTaxRate(parsed.taxRate);
            if (parsed.binNumber !== undefined) setBinNumber(parsed.binNumber);
            if (parsed.taxInclusive !== undefined) setTaxInclusive(parsed.taxInclusive);
          }
        } catch (e) {
          console.error("Error reading local seller settings", e);
        }

        unsubProfile = onSnapshot(
          doc(db, "users", u.uid),
          (snap) => {
            const profile = snap.exists()
              ? snap.data()
              : isSuperAdminOrAdmin(null, u)
              ? {
                  uid: u.uid,
                  email: u.email || "",
                  role: "admin",
                  shopName: u.displayName || "Deep Shop",
                }
              : null;

            if (!profile || !canAccessSellerDashboard(profile, u)) {
              setCheckingAccess(false);
              notify(
                "Access Denied. Only verified sellers can view Seller Dashboard.",
                "error"
              );
              navigate("/", { replace: true });
              return;
            }

            const isMainAdmin = isSuperAdminOrAdmin(profile, u);
            isMainAdminRef.current = isMainAdmin;
            setSellerProfile(profile);
            setCheckingAccess(false);
            if (!dataFetchedRef.current) {
              fetchSellerData(u.uid, true, isMainAdmin);
              dataFetchedRef.current = true;

              // Real-time listener for orders (All orders for deepshop@gmail.com / Admins, seller-scoped for regular sellers)
              const unsubOrders = onSnapshot(
                collection(db, "orders"),
                (orderSnap) => {
                  const allOrders = orderSnap.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                  }));
                  rawOrdersRef.current = allOrders;
                  setOrders(computeVisibleOrders(allOrders, u.uid, isMainAdminRef.current));
                },
                (err) => console.error("Real-time orders listener error:", err)
              );
              unsubOrdersRef = unsubOrders;
            } else if (rawOrdersRef.current.length > 0) {
              setOrders(computeVisibleOrders(rawOrdersRef.current, u.uid, isMainAdmin));
            }
          },
          (err) => {
            console.error("Seller profile check error:", err);
            setCheckingAccess(false);
            navigate("/", { replace: true });
          }
        );
      } else {
        setCheckingAccess(false);
        navigate("/signin", { replace: true });
      }
    });
    return () => {
      unsub();
      if (unsubProfile) unsubProfile();
      if (unsubOrdersRef) unsubOrdersRef();
    };
  }, [navigate]);

  // Populate non-payment store fields once from sellerProfile, and sync payment accounts
  // (Non-admin sellers: strictly from users/{uid}; Main Admin like deepshop@gmail.com: live two-way sync with settings/payments)
  useEffect(() => {
    if (!sellerProfile) return;

    if (!settingsLoadedRef.current) {
      if (sellerProfile.shopName) setShopName(sellerProfile.shopName);
      if (sellerProfile.photoURL || sellerProfile.avatarUrl) {
        setShopLogo(sellerProfile.photoURL || sellerProfile.avatarUrl);
      }
      if (sellerProfile.tiktokId) setTiktokId(sellerProfile.tiktokId);
      if (sellerProfile.defaultAdvanceAmount !== undefined) {
        setDefaultAdvanceAmount(sellerProfile.defaultAdvanceAmount);
      }
      if (sellerProfile.taxRate !== undefined) setTaxRate(sellerProfile.taxRate);
      if (sellerProfile.binNumber !== undefined) setBinNumber(sellerProfile.binNumber);
      if (sellerProfile.taxInclusive !== undefined) {
        setTaxInclusive(sellerProfile.taxInclusive);
      }
      settingsLoadedRef.current = true;
    }

    const isMainAdmin = isSuperAdminOrAdmin(sellerProfile, user);
    if (!isMainAdmin) {
      const extracted = extractConfiguredMobileAccounts(sellerProfile);
      const bAccs = extracted.bkash.map((a) => ({
        number: a.number,
        type: a.type,
      }));
      const nAccs = extracted.nagad.map((a) => ({
        number: a.number,
        type: a.type,
      }));
      const bList = bAccs.map((a) => a.number);
      const nList = nAccs.map((a) => a.number);

      setBkashAccounts(bAccs);
      setBkashNumbers(bList);
      setBkashNumber(bList[0] || "");
      setNagadAccounts(nAccs);
      setNagadNumbers(nList);
      setNagadNumber(nList[0] || "");
    }
  }, [sellerProfile, user]);

  // Live listener on settings/payments for Main Admin (e.g. deepshop@gmail.com) so Admin Panel <-> Seller Dashboard stay in sync
  useEffect(() => {
    if (!user || !isSuperAdminOrAdmin(sellerProfile, user)) return;

    const unsubAdminPay = onSnapshot(
      doc(db, "settings", "payments"),
      async (paySnap) => {
        const payData = paySnap.exists() ? paySnap.data() : null;
        const hasAdminPaymentFields =
          payData &&
          (Array.isArray(payData.bkashAccounts) ||
            Array.isArray(payData.nagadAccounts) ||
            Array.isArray(payData.bkashNumbers) ||
            Array.isArray(payData.nagadNumbers));

        const payUpdatedAt = Number(payData?.updatedAt || 0);
        const profileUpdatedAt = Number(sellerProfile?.updatedAt || 0);

        let chosenSource: any = payData;
        if (
          !hasAdminPaymentFields ||
          (profileUpdatedAt > payUpdatedAt &&
            payUpdatedAt === 0 &&
            (Array.isArray(sellerProfile?.bkashAccounts) ||
              Array.isArray(sellerProfile?.nagadAccounts)))
        ) {
          chosenSource = sellerProfile;
        }

        const extracted = extractConfiguredMobileAccounts(chosenSource);
        const bAccs = extracted.bkash.map((a) => ({
          number: a.number,
          type: a.type,
        }));
        const nAccs = extracted.nagad.map((a) => ({
          number: a.number,
          type: a.type,
        }));
        const bList = bAccs.map((a) => a.number);
        const nList = nAccs.map((a) => a.number);

        setBkashAccounts(bAccs);
        setBkashNumbers(bList);
        setBkashNumber(bList[0] || "");
        setNagadAccounts(nAccs);
        setNagadNumbers(nList);
        setNagadNumber(nList[0] || "");
      },
      (err) => {
        console.error("Error syncing admin payment settings in Seller Dashboard:", err);
      }
    );

    return () => unsubAdminPay();
  }, [user, sellerProfile?.updatedAt, sellerProfile?.role, sellerProfile?.email]);

  // Firestore Write Operations
  const saveStoreSettings = async (overrideData?: any) => {
    if (!user) return;
    const cleanOverride =
      overrideData &&
      typeof overrideData === "object" &&
      !("nativeEvent" in overrideData) &&
      !("target" in overrideData) &&
      !("preventDefault" in overrideData)
        ? overrideData
        : {};

    let rawBkashAccs: { number: string; type: "Personal" | "Payment" | "Agent" }[] =
      cleanOverride.bkashAccounts !== undefined
        ? [...cleanOverride.bkashAccounts]
        : [...bkashAccounts];

    if (
      cleanOverride.bkashAccounts === undefined &&
      newBkashInput &&
      newBkashInput.trim()
    ) {
      const val = newBkashInput.trim();
      if (
        !isForbiddenNumber(val) &&
        !rawBkashAccs.some((a) => a.number === val && a.type === newBkashType)
      ) {
        rawBkashAccs.push({ number: val, type: newBkashType });
        setNewBkashInput("");
      }
    }

    let rawNagadAccs: { number: string; type: "Personal" | "Payment" | "Agent" }[] =
      cleanOverride.nagadAccounts !== undefined
        ? [...cleanOverride.nagadAccounts]
        : [...nagadAccounts];

    if (
      cleanOverride.nagadAccounts === undefined &&
      newNagadInput &&
      newNagadInput.trim()
    ) {
      const val = newNagadInput.trim();
      if (
        !isForbiddenNumber(val) &&
        !rawNagadAccs.some((a) => a.number === val && a.type === newNagadType)
      ) {
        rawNagadAccs.push({ number: val, type: newNagadType });
        setNewNagadInput("");
      }
    }

    const finalBkashAccounts = rawBkashAccs
      .filter(
        (a: any) =>
          a &&
          typeof a.number === "string" &&
          a.number.trim() &&
          !isForbiddenNumber(a.number.trim())
      )
      .map((a: any) => ({
        number: a.number.trim(),
        type: normalizeAccountType(a.type),
      }));

    const finalNagadAccounts = rawNagadAccs
      .filter(
        (a: any) =>
          a &&
          typeof a.number === "string" &&
          a.number.trim() &&
          !isForbiddenNumber(a.number.trim())
      )
      .map((a: any) => ({
        number: a.number.trim(),
        type: normalizeAccountType(a.type),
      }));

    const finalBkashList = finalBkashAccounts.map((a) => a.number);
    const finalNagadList = finalNagadAccounts.map((a) => a.number);
    const now = Date.now();

    setIsSavingSettings(true);
    const updateData = {
      ...cleanOverride,
      shopName: cleanOverride.shopName !== undefined ? cleanOverride.shopName : shopName,
      photoURL: shopLogo,
      avatarUrl: shopLogo,
      tiktokId: cleanOverride.tiktokId !== undefined ? cleanOverride.tiktokId : tiktokId,
      bkashNumber: finalBkashList[0] || "",
      nagadNumber: finalNagadList[0] || "",
      bkashNumbers: finalBkashList,
      nagadNumbers: finalNagadList,
      bkashAccounts: finalBkashAccounts,
      nagadAccounts: finalNagadAccounts,
      defaultAdvanceAmount:
        defaultAdvanceAmount === "" ? "" : Number(defaultAdvanceAmount),
      taxRate: Number(taxRate),
      binNumber: binNumber,
      taxInclusive: taxInclusive,
      updatedAt: now,
    };

    try {
      await setDoc(doc(db, "users", user.uid), updateData, { merge: true });

      // ONLY Main Admin (e.g. deepshop@gmail.com) syncs store payment numbers to Admin Panel settings/payments & settings/platform
      if (isSuperAdminOrAdmin(sellerProfile, user)) {
        const adminBkashAccounts = finalBkashAccounts.map((a) => ({
          number: a.number,
          type: toAdminPaymentType(a.type),
        }));
        const adminNagadAccounts = finalNagadAccounts.map((a) => ({
          number: a.number,
          type: toAdminPaymentType(a.type),
        }));

        try {
          await Promise.all([
            setDoc(
              doc(db, "settings", "payments"),
              {
                bkashAccounts: adminBkashAccounts,
                nagadAccounts: adminNagadAccounts,
                bkashNumbers: finalBkashList,
                nagadNumbers: finalNagadList,
                bkashNumber: finalBkashList[0] || "",
                nagadNumber: finalNagadList[0] || "",
                npsbNumber: finalBkashList[0] || "",
                pathaoPayNumber: finalNagadList[0] || "",
                updatedAt: now,
              },
              { merge: true }
            ),
            setDoc(
              doc(db, "settings", "platform"),
              {
                bkashAccounts: adminBkashAccounts,
                nagadAccounts: adminNagadAccounts,
                bkashNumbers: finalBkashList,
                nagadNumbers: finalNagadList,
                bkashNumber: finalBkashList[0] || "",
                nagadNumber: finalNagadList[0] || "",
                updatedAt: now,
              },
              { merge: true }
            ),
          ]);
        } catch (syncErr) {
          console.error("Failed to sync seller settings to admin payment settings:", syncErr);
        }
      }

      setBkashAccounts(finalBkashAccounts);
      setNagadAccounts(finalNagadAccounts);
      setBkashNumbers(finalBkashList);
      setNagadNumbers(finalNagadList);
      setBkashNumber(finalBkashList[0] || "");
      setNagadNumber(finalNagadList[0] || "");
      localStorage.setItem(
        `vibe_seller_settings_${user.uid}`,
        JSON.stringify(updateData)
      );
      setSellerProfile((prev: any) => ({ ...prev, ...updateData }));
      notify("Store configuration saved successfully!", "success");
    } catch (err: any) {
      console.error(err);
      notify("Failed to save store configurations.", "error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddCoupon = async () => {
    if (!user) return;
    if (!newCouponCode.trim() || !newCouponDiscount.trim()) {
      notify("Please enter coupon code and discount percentage.", "error");
      return;
    }
    try {
      await addDoc(collection(db, "coupons"), {
        code: newCouponCode.trim().toUpperCase(),
        type: "percent",
        discount: Number(newCouponDiscount),
        minOrderAmount: 0,
        createdAt: Date.now(),
        sellerId: user.uid,
        sellerName: sellerProfile?.shopName || "Seller"
      });
      setNewCouponCode("");
      setNewCouponDiscount("");
      notify("Coupon created successfully!", "success");
      fetchSellerData(user.uid, false);
    } catch (e) {
      console.error(e);
      notify("Error adding coupon", "error");
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "coupons", id));
      notify("Coupon deleted successfully!", "success");
      fetchSellerData(user.uid, false);
    } catch (e) {
      console.error(e);
      notify("Error deleting coupon", "error");
    }
  };

  const fetchSellerData = async (
    sellerId: string,
    showLoading: boolean = true,
    isMainAdminOverride?: boolean
  ) => {
    if (showLoading) setLoading(true);
    const isMainAdmin = isMainAdminOverride ?? isMainAdminRef.current;
    try {
      // 1. Fetch Products (All store + admin products for deepshop@gmail.com / Admins; seller products otherwise)
      const prodSnap = isMainAdmin
        ? await getDocs(collection(db, "products"))
        : await getDocs(query(collection(db, "products"), where("sellerId", "==", sellerId)));
      const prodList = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      sellerProductIdsRef.current = new Set(prodList.map((p: any) => p.id));
      setProducts(prodList);

      // Re-sync orders with newly loaded product IDs if real-time snapshot already arrived
      if (rawOrdersRef.current.length > 0) {
        setOrders(computeVisibleOrders(rawOrdersRef.current, sellerId, isMainAdmin));
      }

      // 2. Fetch Stories
      const storySnap = isMainAdmin
        ? await getDocs(collection(db, "stories"))
        : await getDocs(query(collection(db, "stories"), where("sellerId", "==", sellerId)));
      setStories(storySnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // 3. Fetch Coupons
      const couponSnap = isMainAdmin
        ? await getDocs(collection(db, "coupons"))
        : await getDocs(query(collection(db, "coupons"), where("sellerId", "==", sellerId)));
      setCoupons(couponSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      notify("Failed to fetch dashboard data.", "error");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, rejectReason?: string) => {
    try {
      let updateData: any = { status };
      if (status === OrderStatus.CANCELLED || status === OrderStatus.RETURNED) {
        if (rejectReason !== undefined) {
          updateData.rejectReason = rejectReason;
        } else {
          setCancelModalOrderId(orderId);
          setCancelModalStatus(status);
          setCancelReasonText("");
          return;
        }
      }
      if (status === OrderStatus.SHIPPED_IN_COURIER) {
        updateData.courierPaymentStatus = 'pending';
      }

      await updateDoc(doc(db, "orders", orderId), updateData);
      notify(`Order updated: ${status}`, "success");

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updateData } : o));

      const orderObj = orders.find(o => o.id === orderId);
      if (orderObj && orderObj.userId && orderObj.userId !== "guest") {
        let msgTitle = `📦 Order Status: ${status}`;
        let msgBody = `Your order #${orderId.slice(0, 8)} has been updated to "${status}".`;
        let msgLink = `/profile`;
        
        if (status === OrderStatus.SHIPPED_IN_COURIER) {
          msgTitle = "📦 Order Shipped via Courier";
          msgBody = `Your order #${orderId.slice(0, 8)} is on the way. Please check delivery details.`;
          msgLink = `/orders`; // direct them to orders
        } else if (status === OrderStatus.RETURNED) {
          msgTitle = "❌ Order Returned";
          msgBody = `Product return চলে যাচ্ছে। কারণ: ${rejectReason || 'Unknown'}`;
          msgLink = `/orders`;
        }
        
        await addDoc(collection(db, "notifications"), {
          userId: orderObj.userId,
          title: msgTitle,
          message: msgBody,
          createdAt: Date.now(),
          isRead: false,
          type: "order",
          link: msgLink
        });
        
        if (status === OrderStatus.SHIPPED_IN_COURIER) {
          sendPushNotification(orderObj.userId, {
            title: msgTitle,
            body: msgBody,
            url: msgLink
          });
        }
      }
    } catch (err) {
      console.error(err);
      notify("Failed to update order status.", "error");
    }
  };

  const updateOrderTrackingId = async (orderId: string, trackingId: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { trackingId });
      notify("Tracking ID updated!", "success");
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, trackingId } : o));
    } catch (e) {
      console.error(e);
      notify("Failed to update tracking ID", "error");
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      let uploadedUrls: string[] = [];
      if (productForm.imageFiles && productForm.imageFiles.length > 0) {
        uploadedUrls = await Promise.all(
          productForm.imageFiles.map(file => uploadToImgbb(file))
        );
      }
      
      let combinedImages = [...(productForm.existingImages || []), ...uploadedUrls];
      let primaryImage = combinedImages[0] || "";

      if (!primaryImage && !productEditingId) {
        const cat = productForm.isBorderOffer ? "Border Cross Products" : (productForm.category === "custom" ? customCategoryName : productForm.category);
        const autoPartImg = generatePartSvg(productForm.name, cat);
        primaryImage = autoPartImg;
        combinedImages = [autoPartImg];
      }

      const calcAdvanceAmount = productForm.advanceType === "full"
        ? Number(productForm.price || 0)
        : (productForm.advanceMode === "percentage"
            ? Math.round(Number(productForm.price || 0) * (Number(productForm.advancePercentage || 0) / 100))
            : Number(productForm.advanceAmount || 0));

      const productData: any = {
        name: productForm.name,
        price: Number(productForm.price),
        description: productForm.description,
        category: productForm.isBorderOffer ? "Border Cross Products" : (productForm.category === "custom" ? customCategoryName : productForm.category),
        stock: Number(productForm.stock),
        isOffer: productForm.isOffer,
        offerPrice: productForm.isOffer ? Number(productForm.offerPrice) : 0,
        isBorderOffer: productForm.isBorderOffer,
        productType: productForm.isBorderOffer ? "border_offer" : (productForm.isOffer ? "offer" : "normal"),
        storage: productForm.storage || "",
        condition: productForm.condition || "",
        batteryHealth: productForm.batteryHealth || "",
        warranty: productForm.warranty || "",
        modelUrl: productForm.modelUrl,
        videoUrl: productForm.videoUrl,
        coinReward: Number(productForm.coinReward),
        isCodEnabled: productForm.isBorderOffer ? false : productForm.isCodEnabled,
        advanceType: productForm.isBorderOffer ? "full" : (productForm.advanceType || "custom"),
        advanceMode: productForm.isBorderOffer || productForm.advanceType === "full" ? "fixed" : (productForm.advanceMode || "fixed"),
        advancePercentage: productForm.advanceType === "custom" && productForm.advanceMode === "percentage" ? Number(productForm.advancePercentage || 0) : 0,
        advanceAmount: productForm.isBorderOffer 
          ? (productForm.borderOfferAdvanceAmount ? Number(productForm.borderOfferAdvanceAmount) : Number(productForm.price))
          : calcAdvanceAmount,
        borderOfferAdvanceAmount: productForm.isBorderOffer && productForm.borderOfferAdvanceAmount
          ? Number(productForm.borderOfferAdvanceAmount)
          : (productForm.isBorderOffer ? Number(productForm.price) : 0),
        sellerId: user.uid,
        sellerName: sellerProfile?.shopName || "Registered Seller",
        shopLogo: sellerProfile?.photoURL || "",
        updatedAt: Date.now(),
        images: combinedImages,
        image: primaryImage,
      };

      if (productEditingId) {
        await updateDoc(doc(db, "products", productEditingId), productData);
        notify("Product updated successfully!", "success");
      } else {
        productData.createdAt = Date.now();
        productData.isSold = false;
        await addDoc(collection(db, "products"), productData);
        notify("Product added successfully!", "success");
      }

      resetProductForm();
      setProductEditingId(null);
      setActiveTab("products");
      fetchSellerData(user.uid, false);
    } catch (err) {
      console.error(err);
      notify("Failed to save product.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const resetProductForm = () => {
    setProductForm({
      name: "",
      price: "",
      description: "",
      category: "Border Cross Products",
      stock: "10",
      isOffer: false,
      offerPrice: "",
      isBorderOffer: false,
      borderOfferAdvanceAmount: "",
      storage: "",
      condition: "",
      batteryHealth: "",
      warranty: "",
      modelUrl: "",
      videoUrl: "",
      imageFiles: [],
      existingImages: [],
      coinReward: "0",
      isCodEnabled: true,
      advanceType: "custom",
      advanceMode: "fixed",
      advanceAmount: "",
      advancePercentage: "",
    });
    setCustomCategoryName("");
  };

  const handleEditProduct = (prod: any) => {
    setProductEditingId(prod.id);
    setProductForm({
      name: prod.name || "",
      price: String(prod.price || ""),
      description: prod.description || "",
      category: ["Border Cross Products", "Mobile", "Smart Watch", "Earbuds", "Accessories"].includes(prod.category) ? prod.category : "custom",
      stock: String(prod.stock ?? "10"),
      isOffer: !!prod.isOffer,
      offerPrice: String(prod.offerPrice || ""),
      isBorderOffer: !!prod.isBorderOffer,
      borderOfferAdvanceAmount: String(prod.borderOfferAdvanceAmount || prod.advanceAmount || ""),
      storage: prod.storage || "",
      condition: prod.condition || "",
      batteryHealth: prod.batteryHealth || "",
      warranty: prod.warranty || "",
      modelUrl: prod.modelUrl || "",
      videoUrl: prod.videoUrl || "",
      imageFiles: [],
      existingImages: prod.images || (prod.image ? [prod.image] : []),
      coinReward: String(prod.coinReward || "0"),
      isCodEnabled: prod.isCodEnabled ?? true,
      advanceType: prod.advanceType || "custom",
      advanceMode: prod.advanceMode || (prod.advancePercentage ? "percentage" : "fixed"),
      advanceAmount: String(prod.advanceAmount || ""),
      advancePercentage: String(prod.advancePercentage || ""),
    });
    if (!["Border Cross Products", "Mobile", "Smart Watch", "Earbuds", "Accessories"].includes(prod.category)) {
      setCustomCategoryName(prod.category);
    }
    setActiveTab("edit_product");
  };

  const handleDeleteProduct = async (id: string) => {
    if (!user) return;
    confirm({
      title: "Delete Product?",
      message: "This will permanently remove the product listing. This action is irreversible.",
      confirmText: "Delete Now",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "products", id));
          notify("Product deleted.", "success");
          fetchSellerData(user.uid, false);
        } catch (err) {
          console.error(err);
          notify("Failed to delete product.", "error");
        }
      }
    });
  };

  const toggleProductSoldStatus = async (p: any) => {
    try {
      const newSoldState = !p.isSold;
      await updateDoc(doc(db, "products", p.id), { isSold: newSoldState });
      notify(newSoldState ? "Product marked as Sold Out" : "Product marked as Available", "success");
      setProducts(prev => prev.map(prod => prod.id === p.id ? { ...prod, isSold: newSoldState } : prod));
    } catch (e) {
      console.error(e);
      notify("Failed to update status", "error");
    }
  };

  const handleStorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      let finalMediaUrl = storyForm.mediaUrl;
      if (storyForm.mediaFile) {
        finalMediaUrl = await uploadToImgbb(storyForm.mediaFile);
      }

      const storyData = {
        type: storyForm.type,
        mediaUrl: finalMediaUrl,
        videoUrl: storyForm.videoUrl,
        category: storyForm.category,
        linkUrl: storyForm.linkUrl,
        songUrl: storyForm.songUrl,
        sellerId: user.uid,
        sellerName: sellerProfile?.shopName || "Seller Store",
        shopLogo: sellerProfile?.photoURL || "",
        createdAt: Date.now(),
        views: 0
      };

      await addDoc(collection(db, "stories"), storyData);
      notify("Story published successfully!", "success");
      setStoryForm({
        type: "image",
        mediaUrl: "",
        videoUrl: "",
        category: "Border Cross",
        linkUrl: "",
        songUrl: PRESET_SONGS[0].url,
        mediaFile: null
      });
      setActiveTab("blog");
      fetchSellerData(user.uid, false);
    } catch (err) {
      console.error(err);
      notify("Failed to publish story.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStory = async (id: string) => {
    if (!user) return;
    confirm({
      title: "Delete Story?",
      message: "Are you sure you want to delete this story? It will disappear from customer feeds.",
      confirmText: "Delete",
      cancelText: "Keep",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "stories", id));
          notify("Story deleted successfully.", "success");
          fetchSellerData(user.uid, false);
        } catch (e) {
          console.error(e);
          notify("Failed to delete story.", "error");
        }
      }
    });
  };

  const totalEarnings = orders.reduce((sum, ord) => sum + (ord.total || 0), 0);
  const uniqueCustomersCount = Array.from(new Set(orders.map(o => o.customerName || o.shippingAddress?.fullName || o.userId || ""))).filter(Boolean).length || 0;
  const averageOrderValue = orders.length ? Math.round(totalEarnings / orders.length) : 0;

  const getTopProducts = () => {
    const productSalesMap: Record<string, { qty: number; revenue: number }> = {};
    orders.forEach(ord => {
      ord.items?.forEach((item: any) => {
        if (!item.productId) return;
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = { qty: 0, revenue: 0 };
        }
        productSalesMap[item.productId].qty += Number(item.quantity || 1);
        productSalesMap[item.productId].revenue += Number(item.price || item.priceAtPurchase || 0) * Number(item.quantity || 1);
      });
    });

    const mapped = products.map(p => {
      const sales = productSalesMap[p.id] || { qty: 0, revenue: 0 };
      return {
        ...p,
        unitsSold: sales.qty,
        totalSales: sales.revenue,
      };
    });

    const sorted = mapped.filter(p => p.unitsSold > 0).sort((a, b) => b.unitsSold - a.unitsSold);
    return sorted.slice(0, 5);

    };

  const topProducts = getTopProducts();

  // Sales trend chart data
  const salesChartData = React.useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailySales = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());

    orders.forEach((o: any) => {
      const ms = safeOrderMillis(o.createdAt || o.timestamp);
      if (!ms) return;
      const orderDate = new Date(ms);
      if (orderDate >= startOfWeek) {
        dailySales[orderDate.getDay()] += o.total || 0;
      }
    });

    return days.map((day, i) => ({ day, sales: dailySales[i] }));
  }, [orders]);

  const storeInitials = shopName ? shopName.charAt(0).toUpperCase() : "M";
  const storeDomain = shopName ? `${shopName.toLowerCase().replace(/\s+/g, "")}.com` : "gadgetvibe.com";

  // Filtered orders based on selected status filter + search query
  const filteredOrders = orders.filter((o: any) => {
    if (orderFilter !== "all") {
      const st = (o.status || "Pending").toLowerCase();
      const target = orderFilter.toLowerCase();
      if (target === "pending") {
        if (!st.includes("pending") && !st.includes("new")) return false;
      } else if (target === "cancelled") {
        if (!st.includes("cancel") && !st.includes("reject") && !st.includes("return")) return false;
      } else if (target === "shipped") {
        if (!st.includes("ship") && !st.includes("courier") && !st.includes("way")) return false;
      } else if (!st.includes(target)) {
        return false;
      }
    }
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase().trim();
      const matchId = (o.id || "").toLowerCase().includes(q);
      const matchCust = (o.customerName || o.shippingAddress?.fullName || "").toLowerCase().includes(q);
      const matchPhone = (
        o.contactNumber ||
        o.shippingAddress?.phone ||
        o.senderNumber ||
        o.accountNameSender ||
        ""
      )
        .toLowerCase()
        .includes(q);
      const matchTrx = (o.transactionId || o.trxId || "").toLowerCase().includes(q);
      const matchItem = o.items?.some((it: any) => (it.name || "").toLowerCase().includes(q));
      return matchId || matchCust || matchPhone || matchTrx || matchItem;
    }
    return true;
  });

  // Filtered products based on search term
  const filteredProducts = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category?.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Format Date for Order Details
  const formatDate = (timestamp: any) => {
    const ms = safeOrderMillis(timestamp);
    if (!ms) return "Recent";
    const date = new Date(ms);
    return date.toLocaleDateString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      day: "numeric",
    });
  };

  // Ordinal Date matching IMG_5388 (e.g. "21st March 2022")
  const formatOrdinalDate = (timestamp: any) => {
    const ms = safeOrderMillis(timestamp);
    if (!ms) return "Recent";
    const d = new Date(ms);
    const day = d.getDate();
    const suffix =
      day % 10 === 1 && day !== 11
        ? "st"
        : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
        ? "rd"
        : "th";
    const month = d.toLocaleDateString("en-US", { month: "long" });
    const year = d.getFullYear();
    return `${day}${suffix} ${month} ${year}`;
  };

  const getOrderStatusVisual = (status?: string) => {
    const raw = status || "Pending";
    const s = raw.toLowerCase();
    if (s.includes("deliver") && !s.includes("courier")) {
      return { label: "Order Delivered", tone: "green" as const, canCancelOrTrack: false };
    }
    if (s.includes("cancel") || s.includes("reject")) {
      return { label: "Order Cancelled", tone: "red" as const, canCancelOrTrack: false };
    }
    if (s.includes("return")) {
      return { label: "Order Returned", tone: "red" as const, canCancelOrTrack: false };
    }
    if (s.includes("pending") || s.includes("new")) {
      return { label: "Order Received", tone: "blue" as const, canCancelOrTrack: true };
    }
    const cleanLabel = s.startsWith("order") ? raw : `Order ${raw}`;
    return { label: cleanLabel, tone: "blue" as const, canCancelOrTrack: true };
  };

  const getStatusColor = (status: any) => {
    if (!status) return "text-zinc-800 dark:text-zinc-200";
    const s = String(status).toLowerCase();
    if (s.includes("new") || s.includes("pending")) return "text-blue-600";
    if (s.includes("confirm") || s.includes("approv")) return "text-emerald-600";
    if (s.includes("ship") || s.includes("courier") || s.includes("way")) return "text-orange-600";
    if (s.includes("deliver")) return "text-emerald-600";
    if (s.includes("cancel") || s.includes("reject") || s.includes("return")) return "text-rose-600";
    return "text-zinc-800 dark:text-zinc-200";
  };

  const NavItem = ({ icon, label, tab, badge }: { icon: string, label: string, tab: any, badge?: number }) => {
    const isActive = activeTab === tab || activeTab.startsWith(tab);
    return (
      <button
        type="button"
        onClick={() => { setActiveTab(tab); setSelectedOrderId(null); }}
        className={cn(
          "h-10 flex items-center justify-center transition-all duration-300 rounded-full cursor-pointer relative",
          isActive 
            ? "bg-[#E8EAEE]/90 dark:bg-[#2D2E33]/90 text-zinc-950 dark:text-white px-5 shadow-xs" 
            : "px-3.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        )}
        title={label}
      >
        <div className="relative flex items-center gap-1.5">
          <Icon 
            name={icon} 
            className={cn("w-5 h-5 transition-transform duration-300", isActive && "scale-105")} 
            solid={false} 
          />
          {isActive && (
            <span className="text-xs font-bold whitespace-nowrap">
              {label}
            </span>
          )}
          {badge !== undefined && badge > 0 && (
            <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] h-[16px] flex items-center justify-center leading-none shadow-xs">
              {badge}
            </span>
          )}
        </div>
      </button>
    );
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        notify("Uploading logo...", "info");
        const url = await uploadToImgbb(file);
        setShopLogo(url);
        notify("Logo uploaded successfully!", "success");
      } catch (err) {
        notify("Failed to upload logo", "error");
      }
    }
  };

  if (checkingAccess || !sellerProfile) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div id="seller-dashboard-page" className="min-h-screen bg-[#F5F5F7] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 dark:text-zinc-100 font-sans flex flex-col md:flex-row pb-24 md:pb-0 relative">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-zinc-200 dark:border-zinc-750/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sticky top-0 h-screen z-40 overflow-y-auto no-scrollbar">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-lg overflow-hidden">
            {shopLogo ? <img src={shopLogo} alt="Logo" className="w-full h-full object-cover" /> : storeInitials}
          </div>
          <div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{shopName || "Seller Studio"}</h3>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">Dashboard</span>
          </div>
        </div>
        <nav className="flex flex-col gap-2 flex-1">
          <button onClick={() => { setActiveTab("home"); setSelectedOrderId(null); }} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${activeTab === "home" ? "bg-[#EF8020]/10 text-[#EF8020]" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}>
            <Icon name="home" className={`w-5 h-5 ${activeTab === "home" ? "text-[#EF8020]" : "text-zinc-400 dark:text-zinc-500"}`} /> Home
          </button>
          <button onClick={() => { setActiveTab("orders"); setSelectedOrderId(null); }} className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${activeTab === "orders" ? "bg-[#EF8020]/10 text-[#EF8020]" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"} w-full`}>
            <div className="flex items-center gap-3">
              <Icon name="receipt" className={`w-5 h-5 ${activeTab === "orders" ? "text-[#EF8020]" : "text-zinc-400 dark:text-zinc-500"}`} />
              <span>Orders</span>
            </div>
            {orders.filter((o: any) => (o.status || "").toLowerCase() === "pending").length > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {orders.filter((o: any) => (o.status || "").toLowerCase() === "pending").length}
              </span>
            )}
          </button>

          <button onClick={() => { setActiveTab("products"); setSelectedOrderId(null); }} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${activeTab === "products" || activeTab === "add_product" || activeTab === "edit_product" ? "bg-[#EF8020]/10 text-[#EF8020]" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}>
            <Icon name="boxes" className={`w-5 h-5 ${activeTab === "products" || activeTab === "add_product" || activeTab === "edit_product" ? "text-[#EF8020]" : "text-zinc-400 dark:text-zinc-500"}`} /> Products
          </button>

          <button onClick={() => { setActiveTab("settings_store"); setSelectedOrderId(null); }} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${activeTab.startsWith("settings") ? "bg-[#EF8020]/10 text-[#EF8020]" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}>
            <Icon name="cog" className={`w-5 h-5 ${activeTab.startsWith("settings") ? "text-[#EF8020]" : "text-zinc-400 dark:text-zinc-500"}`} /> Settings
          </button>

          {isSuperAdminOrAdmin(sellerProfile, user) && (
            <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              <button
                type="button"
                onClick={() => navigate("/admin")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>Admin Panel</span>
              </button>
            </div>
          )}
        </nav>
      </aside>

      {/* Main Workspace */}
      <main className={`flex-1 w-full ${activeTab === "orders" || selectedOrderId ? "max-w-5xl" : "max-w-2xl"} mx-auto p-4 md:p-8 overflow-y-auto no-scrollbar relative min-h-screen text-zinc-900 dark:text-zinc-100`}>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-zinc-900 dark:text-zinc-100 animate-spin mb-4" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 font-medium">Loading Dashboard...</span>
          </div>
        ) : (
          <div className="pb-10">
            {/* --- HOME TAB --- */}
            {activeTab === "home" && !selectedOrderId && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header Profile */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xl overflow-hidden border border-zinc-200 dark:border-zinc-750 shadow-sm shrink-0">
                      {shopLogo ? <img src={shopLogo} alt="Logo" className="w-full h-full object-cover" /> : storeInitials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 font-medium mb-0.5">Good Morning!</p>
                      <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-tight truncate">{shopName || "Seller Studio"}</h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/seller/custom-order")}
                    className="h-9 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Custom Order</span>
                  </button>
                </div>

                {/* Sales Overview Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-[15px]">Sales Overview</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 font-medium">All Time</span>
                      <ArrowRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 rotate-[-45deg]" strokeWidth={3} />
                    </div>
                  </div>
                  
                  <div className="flex items-end justify-between mb-6">
                    <div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 font-medium mb-1">Total Earning</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">{formatPrice(totalEarnings)}</span>
                      </div>
                    </div>
                    {/* Mock Chart Icon */}
                    <div className="flex items-end gap-1 h-10">
                      <div className="w-2.5 h-4 bg-zinc-200 dark:bg-zinc-700 rounded-sm"></div>
                      <div className="w-2.5 h-6 bg-zinc-300 rounded-sm"></div>
                      <div className="w-2.5 h-8 bg-zinc-800 rounded-sm"></div>
                      <div className="w-2.5 h-5 bg-zinc-300 rounded-sm"></div>
                      <div className="w-2.5 h-7 bg-zinc-400 rounded-sm"></div>
                      <div className="w-2.5 h-3 bg-zinc-200 dark:bg-zinc-700 rounded-sm"></div>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 font-medium mb-1">Revenue</p>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{formatPrice(totalEarnings)}</p>
                    </div>
                    <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700"></div>
                    <div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 font-medium mb-1">Product</p>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{products.length}</p>
                    </div>
                    <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700"></div>
                    <div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 font-medium mb-1">Customer</p>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{uniqueCustomersCount}</p>
                    </div>
                    <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700"></div>
                    <div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 font-medium mb-1">Avg. Order</p>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{formatPrice(averageOrderValue)}</p>
                    </div>
                  </div>
                </div>

                {/* Top Selling Products */}
                <div>
                  <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-[15px]">Top Selling Products</h3>
                    <button onClick={() => setActiveTab("products")} className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 font-medium">See all</button>
                  </div>
                  
                  <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 dark:border-zinc-800 flex flex-col gap-5">
                    {topProducts.length === 0 && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 text-center py-4">No top selling products yet.</p>
                    )}
                    {topProducts.length > 0 && topProducts.map((p: any, idx: number) => (
                      <div key={p.id || idx} className={`flex items-center justify-between ${idx !== topProducts.length - 1 ? "pb-5 border-b border-zinc-100 dark:border-zinc-800" : ""}`}>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-[#F5F5F7] dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 dark:border-zinc-800 overflow-hidden shrink-0 p-1 flex items-center justify-center">
                            {p.image || (p.imageFiles && p.imageFiles[0]) || p.modelUrl ? (
                              <img src={p.image || p.modelUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80"} alt={p.name} className="w-full h-full object-contain mix-blend-multiply" />
                            ) : (
                              <Package className="w-5 h-5 text-zinc-300" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100 leading-tight mb-0.5 line-clamp-1">{p.name}</h4>
                            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">{p.category || "General"}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100 mb-0.5">{p.unitsSold} Units</p>
                          <p className="text-[9px] font-bold text-emerald-500 flex items-center justify-end gap-0.5">
                            <ArrowRight className="w-2.5 h-2.5 rotate-[-45deg]" strokeWidth={3} />
                            Active
                          </p>
                        </div>
                      </div>
                    ))} 
                  </div>
                </div>
              </div>
            )}

            {/* --- ORDERS TAB (MATCHING IMG_5388) --- */}
            {activeTab === "orders" && !selectedOrderId && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300 h-full flex flex-col">
                {/* Top Header Bar: "Orders" + Custom Order + Outlined Blue "Filter" */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-[20px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                      Orders
                    </h1>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                      {filteredOrders.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSuperAdminOrAdmin(sellerProfile, user) && (
                      <button
                        type="button"
                        onClick={() => navigate("/admin/orders")}
                        className="hidden sm:inline-flex h-9 px-3 rounded-[8px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 items-center gap-1.5 text-[12px] font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Admin</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate("/seller/custom-order")}
                      className="h-9 px-3 rounded-[8px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center gap-1.5 text-[12.5px] font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Create Custom Order"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Custom Order</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowOrderFilterMenu((prev) => !prev)}
                      className="seller-v2-outline-blue h-9 px-3.5 rounded-[8px] flex items-center gap-1.5 text-[13px] font-semibold transition-transform active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M2 4H14M4.5 8H11.5M6.5 12H9.5"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span>Filter</span>
                    </button>
                  </div>
                </div>

                {/* Expandable Status Filter Chips */}
                {showOrderFilterMenu && (
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-0.5">
                    {[
                      { id: "all", label: "All Orders" },
                      { id: "pending", label: "Order Received" },
                      { id: "approved", label: "Approved" },
                      { id: "processing", label: "Processing" },
                      { id: "shipped", label: "On the Way" },
                      { id: "delivered", label: "Delivered" },
                      { id: "cancelled", label: "Cancelled" },
                    ].map((f) => {
                      const active = orderFilter.toLowerCase() === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setOrderFilter(f.id)}
                          className={cn(
                            "h-8 px-3.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all shrink-0 border",
                            active
                              ? "seller-v2-outline-blue shadow-xs"
                              : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                          )}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Search Input Box matching IMG_5388 */}
                <div className="orders-v2-card rounded-[10px] h-12 px-3.5 flex items-center gap-3">
                  <Search className="w-5 h-5 text-zinc-700 dark:text-zinc-300 shrink-0" strokeWidth={1.9} />
                  <input
                    type="text"
                    placeholder="Search order"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-[14px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                  />
                  {orderSearch && (
                    <button
                      type="button"
                      onClick={() => setOrderSearch("")}
                      className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Orders Cards Grid (Single column mobile like IMG_5388, 2-col responsive desktop) */}
                {filteredOrders.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-6">
                    {filteredOrders.map((ord: any, idx: number) => {
                      const firstItem = ord.items?.[0] || {};
                      const extraItemsCount = Math.max(0, (ord.items?.length || 1) - 1);
                      const totalPcs =
                        ord.items?.reduce((sum: number, i: any) => sum + Number(i.quantity || 1), 0) || 1;
                      const statusMeta = getOrderStatusVisual(ord.status);
                      const itemSize = firstItem.size || firstItem.storage || "";
                      const itemColor =
                        firstItem.color ||
                        firstItem.condition ||
                        (ord.paymentMethod?.toLowerCase().includes("cash") ? "COD" : ord.paymentMethod || "");

                      return (
                        <div
                          key={ord.id || idx}
                          className="orders-v2-card rounded-[14px] overflow-hidden transition-all hover:shadow-md"
                        >
                          {/* Card Top Status Header */}
                          <div
                            onClick={() => setSelectedOrderId(ord.id)}
                            className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={cn(
                                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                  statusMeta.tone === "green"
                                    ? "seller-v2-icon-green"
                                    : statusMeta.tone === "red"
                                    ? "seller-v2-icon-red"
                                    : "seller-v2-icon-blue"
                                )}
                              >
                                <Package className="w-[18px] h-[18px]" strokeWidth={2} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100 leading-tight truncate">
                                  {statusMeta.label}
                                </p>
                                <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                  {formatOrdinalDate(ord.createdAt || ord.timestamp)}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                          </div>

                          {/* Product Row */}
                          <div
                            onClick={() => setSelectedOrderId(ord.id)}
                            className="px-4 py-3.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center gap-3.5 cursor-pointer"
                          >
                            <div className="w-[62px] h-[68px] rounded-[8px] bg-[#F4F5F7] dark:bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center p-1">
                              {firstItem.image || firstItem.modelUrl ? (
                                <img
                                  src={firstItem.image || firstItem.modelUrl}
                                  alt={firstItem.name || "Order item"}
                                  className="w-full h-full object-cover rounded-[6px]"
                                />
                              ) : (
                                <Package className="w-6 h-6 text-zinc-400" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-[13.5px] font-medium text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">
                                  {firstItem.name || "Custom Order Item"}
                                  {extraItemsCount > 0 && (
                                    <span className="ml-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                                      +{extraItemsCount} more
                                    </span>
                                  )}
                                </h4>
                                <span className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100 shrink-0">
                                  {formatPrice(ord.total || 0)}
                                </span>
                              </div>

                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-zinc-600 dark:text-zinc-400">
                                {itemSize ? (
                                  <span>Size: {itemSize}</span>
                                ) : (
                                  <span>Qty: {totalPcs}</span>
                                )}
                                {itemColor && <span>Payment: {itemColor}</span>}
                                <span className="truncate max-w-[150px] text-zinc-500 dark:text-zinc-400">
                                  • {ord.customerName || ord.shippingAddress?.fullName || "Guest"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Bottom Cancel / Track Action Row (matching IMG_5388 active cards) */}
                          {statusMeta.canCancelOrTrack && (
                            <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800/80 grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateOrderStatus(ord.id, OrderStatus.CANCELLED);
                                }}
                                className="h-9 rounded-[6px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[13px] font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrderId(ord.id);
                                }}
                                className="h-9 rounded-[6px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[13px] font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                              >
                                Track
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="orders-v2-card rounded-[16px] py-16 px-6 text-center">
                    <div className="w-12 h-12 rounded-full seller-v2-icon-blue mx-auto flex items-center justify-center mb-3">
                      <Package className="w-6 h-6" />
                    </div>
                    <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
                      No orders found
                    </h3>
                    <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400 mt-1">
                      New customer orders will appear here automatically in real time.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* --- ORDER DETAILS (MATCHING IMG_5388 RIGHT SCREEN + SELLER CONTROLS) --- */}
            {selectedOrderId && (() => {
              const order = orders.find((o) => o.id === selectedOrderId);
              if (!order) return <div className="p-10 text-center">Order not found.</div>;

              const orderSubtotal =
                order.items?.reduce(
                  (acc: number, item: any) =>
                    acc + Number(item.price || item.priceAtPurchase || 0) * Number(item.quantity || 1),
                  0
                ) ||
                order.total ||
                0;
              const shippingCharge = order.shippingFee || 0;
              const taxAmount = order.taxAmount || 0;
              const discountAmount = order.discountAmount || 0;
              const totalAmount = orderSubtotal + shippingCharge + taxAmount - discountAmount;

              let advancePaid = 0;
              const isCod =
                order.paymentMethod === "Cash on Delivery" ||
                order.paymentMethod?.toLowerCase().includes("cash on delivery") ||
                order.paymentMethod?.toLowerCase() === "cod";
              if (!isCod) {
                if (order.paymentOption === "Full Payment") {
                  advancePaid = totalAmount;
                } else {
                  advancePaid = Number(order.advancePaid || order.advanceAmount || 0);
                  if (!advancePaid && order.items) {
                    advancePaid = order.items.reduce((sum: number, item: any) => {
                      const adv = Number(item.advanceAmount || 0);
                      return sum + adv * (item.quantity || 1);
                    }, 0);
                  }
                  if (!advancePaid && defaultAdvanceAmount) {
                    advancePaid = Number(defaultAdvanceAmount);
                  }
                }
              }

              const dueAmount = Math.max(0, totalAmount - advancePaid);
              const statusMeta = getOrderStatusVisual(order.status);
              const firstItem = order.items?.[0] || {};
              const totalPcs =
                order.items?.reduce((sum: number, i: any) => sum + Number(i.quantity || 1), 0) || 1;
              const primarySize = firstItem.size || firstItem.storage || "Standard";
              const primaryOption =
                firstItem.color ||
                firstItem.condition ||
                (isCod ? "Cash on Delivery" : order.paymentMethod || "Standard");

              return (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 pb-10">
                  {/* Top Bar matching IMG_5388: Back Arrow + "Order Details" + Outlined Blue "Help" */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedOrderId(null)}
                        className="p-1.5 -ml-1.5 rounded-lg text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
                        aria-label="Back to orders"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <h2 className="text-[19px] font-semibold text-zinc-900 dark:text-zinc-100">
                        Order Details
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (order.userId && order.userId !== "guest") {
                          navigate(`/messages?chatId=${order.userId}`);
                        } else if (order.contactNumber || order.shippingAddress?.phone) {
                          navigator.clipboard?.writeText(order.contactNumber || order.shippingAddress?.phone);
                          notify("Customer phone number copied!", "success");
                        } else {
                          notify("Guest order — contact phone shown below.", "info");
                        }
                      }}
                      className="seller-v2-outline-blue h-9 px-3.5 rounded-[8px] flex items-center gap-1.5 text-[13px] font-semibold transition-transform active:scale-95"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Help</span>
                    </button>
                  </div>

                  {/* ORDER ID Strip with Copy action matching IMG_5388 */}
                  <div className="seller-v2-id-strip rounded-[10px] px-4 py-2.5 flex items-center justify-between gap-3">
                    <span className="text-[12px] font-medium tracking-wide text-zinc-700 dark:text-zinc-300 uppercase truncate">
                      ORDER ID: {order.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(order.id);
                        notify("Order ID copied!", "success");
                      }}
                      className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>

                  {/* Responsive 2-Column Layout on Desktop, Exact IMG_5388 Stack on Mobile */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* Left / Main Order Visual Column */}
                    <div className="lg:col-span-7 space-y-3.5">
                      {/* Soft-Blue Top Banner + Product Card matching IMG_5388 */}
                      <div className="orders-v2-card rounded-[14px] overflow-hidden">
                        <div className="seller-v2-banner-blue px-4 py-3 flex items-center justify-between gap-2">
                          <span className="text-[14px] font-semibold">
                            {statusMeta.label}
                          </span>
                          <span className="text-[12.5px] font-medium opacity-90">
                            {formatOrdinalDate(order.createdAt || order.timestamp)}
                          </span>
                        </div>

                        <div className="p-4 space-y-4">
                          {(order.items && order.items.length > 0 ? order.items : [firstItem]).map(
                            (item: any, idx: number) => {
                              const lineTotal =
                                Number(item.price || item.priceAtPurchase || order.total || 0) *
                                Number(item.quantity || 1);
                              return (
                                <div
                                  key={idx}
                                  className={cn(
                                    "flex items-center gap-3.5",
                                    idx > 0 && "pt-3.5 border-t border-zinc-100 dark:border-zinc-800/80"
                                  )}
                                >
                                  <div className="w-[70px] h-[80px] rounded-[8px] bg-[#F4F5F7] dark:bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center p-1">
                                    {item.image || item.modelUrl ? (
                                      <img
                                        src={item.image || item.modelUrl}
                                        alt={item.name || "Product"}
                                        className="w-full h-full object-cover rounded-[6px]"
                                      />
                                    ) : (
                                      <Package className="w-6 h-6 text-zinc-400" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[12px] text-zinc-400 dark:text-zinc-500 font-medium truncate">
                                      {item.sellerName || item.category || shopName || "Deep Shop"}
                                    </p>
                                    <h4 className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100 leading-snug mt-0.5 line-clamp-2">
                                      {item.name || "Order Item"}
                                    </h4>
                                    <div className="mt-1.5 flex items-baseline gap-2">
                                      <span className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100">
                                        {formatPrice(lineTotal)}
                                      </span>
                                      {Number(item.quantity || 1) > 1 && (
                                        <span className="text-[11.5px] text-zinc-400 dark:text-zinc-500">
                                          ({item.quantity} × {formatPrice(item.price || item.priceAtPurchase || 0)})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>

                        {/* Size / Color-Method / Quantity Strip matching IMG_5388 */}
                        <div className="border-t border-zinc-100 dark:border-zinc-800/80 px-4 py-3.5 grid grid-cols-3 gap-4">
                          <div>
                            <span className="block text-[11.5px] text-zinc-400 dark:text-zinc-500">
                              Size
                            </span>
                            <span className="block text-[13.5px] font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 truncate">
                              {primarySize}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[11.5px] text-zinc-400 dark:text-zinc-500">
                              Payment
                            </span>
                            <span className="block text-[13.5px] font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 truncate">
                              {primaryOption}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[11.5px] text-zinc-400 dark:text-zinc-500">
                              Quantity
                            </span>
                            <span className="block text-[13.5px] font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                              {totalPcs} Pcs
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Track Order Action Row matching IMG_5388 */}
                      <button
                        type="button"
                        onClick={() => navigate(`/track-order/${order.id}`)}
                        className="orders-v2-card rounded-[12px] px-4 py-3.5 w-full flex items-center justify-between text-left hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full seller-v2-icon-blue flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                          <span className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100">
                            Track Order
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                      </button>

                      {/* Cancel Order Action Row matching IMG_5388 */}
                      {order.status !== OrderStatus.CANCELLED && (
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(order.id, OrderStatus.CANCELLED)}
                          className="orders-v2-card rounded-[12px] px-4 py-3.5 w-full flex items-center justify-between text-left hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full seller-v2-icon-red flex items-center justify-center shrink-0">
                              <X className="w-4 h-4" strokeWidth={2.4} />
                            </div>
                            <span className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100">
                              Cancel Order
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                        </button>
                      )}

                      {/* Customer Delivery & Contact Card */}
                      <div className="orders-v2-card rounded-[14px] p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500 dark:text-zinc-400 shrink-0">
                              <Users className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                {order.customerName || order.shippingAddress?.fullName || "Guest User"}
                              </h4>
                              <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400">
                                Customer Delivery Info
                              </p>
                            </div>
                          </div>
                          {order.userId && order.userId !== "guest" && (
                            <button
                              type="button"
                              onClick={() => navigate(`/messages?chatId=${order.userId}`)}
                              className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-200 transition-colors"
                              title="Message Customer"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
                          <div className="flex items-start gap-2.5">
                            <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                                Delivery Address
                              </span>
                              <span className="text-[12.5px] font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed block mt-0.5">
                                {(typeof order.shippingAddress === "string"
                                  ? order.shippingAddress
                                  : [
                                      order.shippingAddress?.address,
                                      order.shippingAddress?.upazila,
                                      order.shippingAddress?.district || order.shippingAddress?.city,
                                      order.shippingAddress?.division,
                                    ]
                                      .filter(Boolean)
                                      .join(", ")) || "No address specified"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5">
                            <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                                Contact Phone
                              </span>
                              <span className="font-mono font-bold text-[12.5px] text-zinc-900 dark:text-zinc-100 block mt-0.5 select-all">
                                {order.contactNumber || order.shippingAddress?.phone || "No phone specified"}
                              </span>
                              {order.altNumber && (
                                <span className="font-mono text-[11px] text-zinc-500 block mt-0.5">
                                  Alt: {order.altNumber}
                                </span>
                              )}
                            </div>
                          </div>

                          {(order.guardianNumber || order.nidCardUrl) && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/60 dark:border-amber-900/50 text-xs space-y-1">
                              <span className="font-bold text-amber-800 dark:text-amber-300 block">
                                Verification Info
                              </span>
                              {order.guardianNumber && (
                                <p>
                                  <span className="text-zinc-500">Guardian:</span>{" "}
                                  <span className="font-mono font-bold text-amber-900 dark:text-amber-200">
                                    {order.guardianNumber}
                                  </span>
                                </p>
                              )}
                              {order.nidCardUrl && (
                                <p>
                                  <span className="text-zinc-500">NID Document:</span>{" "}
                                  <a
                                    href={order.nidCardUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 underline font-semibold"
                                  >
                                    View Customer NID
                                  </a>
                                </p>
                              )}
                            </div>
                          )}

                          {order.isGift && order.giftNote && (
                            <div className="p-2.5 bg-pink-50 dark:bg-pink-950/30 rounded-xl border border-pink-200 dark:border-pink-900 text-xs">
                              <span className="font-bold text-pink-700 dark:text-pink-300">
                                Gift Note:
                              </span>{" "}
                              {order.giftNote}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right / Seller Management & Payment Column */}
                    <div className="lg:col-span-5 space-y-3.5">
                      {/* Seller Order Actions Card */}
                      <div className="orders-v2-card rounded-[14px] p-4 space-y-4">
                        <h3 className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                          Manage Order Status
                        </h3>

                        {order.status === OrderStatus.CANCELLED && order.rejectReason && (
                          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/60 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-0.5">
                              Cancellation Reason
                            </p>
                            <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                              {order.rejectReason}
                            </p>
                          </div>
                        )}

                        {(order.status === "Pending" ||
                          order.status === OrderStatus.PENDING ||
                          order.status === "New Order" ||
                          (order.status || "").toLowerCase() === "pending") && (
                          <div className="grid grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              onClick={() => updateOrderStatus(order.id, OrderStatus.CANCELLED)}
                              className="h-10 bg-rose-500 hover:bg-rose-600 rounded-[10px] flex items-center justify-center gap-1.5 text-white text-[13px] font-semibold transition-colors"
                            >
                              <X className="w-4 h-4" />
                              <span>Reject</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => updateOrderStatus(order.id, OrderStatus.APPROVED)}
                              className="h-10 bg-emerald-600 hover:bg-emerald-700 rounded-[10px] flex items-center justify-center gap-1.5 text-white text-[13px] font-semibold transition-colors"
                            >
                              <Check className="w-4 h-4" strokeWidth={2.5} />
                              <span>Approve</span>
                            </button>
                          </div>
                        )}

                        {/* Status Selector Dropdown */}
                        <div className="space-y-1.5 relative">
                          <Label className="text-[10.5px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                            Order Stage
                          </Label>
                          <div>
                            <button
                              type="button"
                              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                              className="w-full h-11 px-3.5 rounded-[10px] bg-[#F5F5F7] dark:bg-zinc-800 hover:bg-[#EAEAEF] dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-[13px] font-semibold flex items-center justify-between transition-colors text-left"
                            >
                              <span>{order.status || "Select Status"}</span>
                              <ChevronDown className="w-4 h-4 text-zinc-500" />
                            </button>

                            {statusDropdownOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setStatusDropdownOpen(false)}
                                />
                                <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 py-1.5 overflow-hidden max-h-60 overflow-y-auto">
                                  {[
                                    { value: OrderStatus.PENDING, label: "Pending" },
                                    { value: OrderStatus.APPROVED, label: "Approved" },
                                    { value: OrderStatus.PROCESSING, label: "Processing" },
                                    { value: "Checking Payment", label: "Checking Payment" },
                                    { value: "Complete Packaging", label: "Complete Packaging" },
                                    { value: "Deliver on Courier", label: "Deliver on Courier" },
                                    {
                                      value: OrderStatus.ON_THE_WAY || "On Courier / Shipped",
                                      label: "On Courier / Shipped",
                                    },
                                    { value: OrderStatus.DELIVERED, label: "Delivered" },
                                    { value: OrderStatus.CANCELLED, label: "Cancelled" },
                                    ...(sellerProfile?.canUseCourierShipping ||
                                    isSuperAdminOrAdmin(sellerProfile, user)
                                      ? [
                                          {
                                            value: OrderStatus.SHIPPED_IN_COURIER,
                                            label: "Shipped in Courier",
                                          },
                                          { value: OrderStatus.RETURNED, label: "Returned" },
                                        ]
                                      : []),
                                  ].map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => {
                                        updateOrderStatus(order.id, opt.value as OrderStatus);
                                        setStatusDropdownOpen(false);
                                      }}
                                      className={cn(
                                        "w-full text-left px-4 py-2.5 text-xs font-semibold flex items-center justify-between transition-colors",
                                        order.status === opt.value
                                          ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                          : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                      )}
                                    >
                                      <span>{opt.label}</span>
                                      {order.status === opt.value && (
                                        <Check className="w-4 h-4 text-blue-600" strokeWidth={2.5} />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Tracking ID input */}
                        <div className="space-y-1.5">
                          <Label className="text-[10.5px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                            Courier Tracking ID
                          </Label>
                          <Input
                            placeholder="Enter tracking number & tap outside to save..."
                            defaultValue={order.trackingId || ""}
                            onBlur={(e) => {
                              if (e.target.value !== (order.trackingId || "")) {
                                updateOrderTrackingId(order.id, e.target.value);
                              }
                            }}
                            className="rounded-[10px] bg-[#F5F5F7] dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-transparent dark:border-zinc-700 h-10 text-xs font-medium"
                          />
                        </div>
                      </div>

                      {/* Payment & Price Summary Card */}
                      <div className="orders-v2-card rounded-[14px] p-4 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                            Payment & Price Details
                          </h3>
                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              order.paymentStatus === "paid" || order.paymentStatus === "verified"
                                ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400"
                                : "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400"
                            )}
                          >
                            {order.paymentStatus || (isCod ? "COD" : "Checking")}
                          </span>
                        </div>

                        <div className="space-y-2 text-[12.5px]">
                          <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                            <span>Subtotal</span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {formatPrice(orderSubtotal)}
                            </span>
                          </div>
                          {discountAmount > 0 && (
                            <div className="flex justify-between text-emerald-600">
                              <span>Discount</span>
                              <span className="font-semibold">-{formatPrice(discountAmount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                            <span>Delivery Fee</span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {formatPrice(shippingCharge)}
                            </span>
                          </div>
                          {taxAmount > 0 && (
                            <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                              <span>Tax</span>
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {formatPrice(taxAmount)}
                              </span>
                            </div>
                          )}
                          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex justify-between items-center">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                              Grand Total
                            </span>
                            <span className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100">
                              {formatPrice(totalAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                            <span>Paid / Advance</span>
                            <span className="font-bold">
                              {formatPrice(
                                isCod
                                  ? 0
                                  : order.paymentOption === "Full Payment"
                                  ? totalAmount
                                  : advancePaid
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                            <span className="font-semibold">Due Amount (COD)</span>
                            <span className="text-[15px] font-bold">{formatPrice(dueAmount)}</span>
                          </div>
                        </div>

                        {/* Sender / Receiver / TrxID Verification Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px]">
                          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/70">
                            <span className="block text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider">
                              Sender Number
                            </span>
                            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 select-all block mt-0.5">
                              {order.accountNameSender ||
                                order.senderNumber ||
                                order.customerSenderNumber ||
                                order.senderPhone ||
                                order.contactNumber ||
                                "N/A"}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/70">
                            <span className="block text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider">
                              Received On
                            </span>
                            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 select-all block mt-0.5">
                              {order.receiverNumber ||
                                order.merchantNumber ||
                                order.receivedNumber ||
                                order.receiverPhone ||
                                "N/A"}
                            </span>
                          </div>
                          <div className="sm:col-span-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/70 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="block text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider">
                                Transaction ID (TrxID)
                              </span>
                              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 select-all block mt-0.5 truncate">
                                {order.transactionId || order.trxId || order.lastDigits || "Not provided"}
                              </span>
                            </div>
                            {(order.transactionId || order.trxId) && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(order.transactionId || order.trxId);
                                  notify("TrxID copied!", "success");
                                }}
                                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* --- PRODUCTS TAB --- */}
            {activeTab === "products" && !selectedOrderId && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                <div className="flex items-center justify-between">
                   <h2 className="text-[17px] font-bold text-zinc-900 dark:text-zinc-100">Your Products</h2>
                   <button 
                     onClick={() => {
                       resetProductForm();
                       setProductEditingId(null);
                       setActiveTab("add_product");
                     }}
                     className="h-10 px-4 bg-zinc-900 text-white rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-zinc-800"
                   >
                     <Plus className="w-4 h-4" /> Add New
                   </button>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl h-12 flex items-center px-4 shadow-sm border border-zinc-100 dark:border-zinc-800 dark:border-zinc-800">
                    <Search className="w-5 h-5 text-zinc-400 dark:text-zinc-500 mr-3" />
                    <input 
                      type="text" 
                      placeholder="Search Products..." 
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-zinc-900 dark:text-zinc-100 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 dark:text-zinc-500 dark:placeholder:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                   {filteredProducts.map((p: any) => (
                      <div key={p.id} className="bg-white dark:bg-zinc-900 rounded-[1.5rem] p-4 shadow-sm border border-zinc-100 dark:border-zinc-800 flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-[#F5F5F7] dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center p-1">
                          {p.image || p.modelUrl ? (
                            <img src={p.image || p.modelUrl} alt={p.name} className="w-full h-full object-contain mix-blend-multiply" />
                          ) : (
                            <Package className="w-6 h-6 text-zinc-300" />
                          )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                           <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate mb-1">{p.name}</h4>
                           <div className="flex items-center gap-3">
                              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{formatPrice(p.price)}</p>
                              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">Stock: {p.stock}</p>
                           </div>
                           {p.advanceAmount && <p className="text-[10px] text-blue-600 font-medium mt-1">Adv. Req: {formatPrice(p.advanceAmount)}</p>}
                            
                            {/* Mark as Sold Toggle Button */}
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const newSold = !p.isSold;
                                    await updateDoc(doc(db, "products", p.id), {
                                      isSold: newSold,
                                      stock: newSold ? 0 : 1
                                    });
                                    notify(newSold ? "প্রোডাক্টটি 'সোল্ড আউট' চিহ্নিত করা হয়েছে!" : "প্রোডাক্টটি ইন স্টক করা হয়েছে!", "success");
                                  } catch(err) {
                                    notify("স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে", "error");
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition border cursor-pointer ${
                                  p.isSold
                                    ? "bg-rose-500/10 text-rose-600 border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-400"
                                    : "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-400 hover:bg-amber-500/20"
                                }`}
                              >
                                {p.isSold ? "🔴 SOLD OUT (ইন স্টক করুন)" : "🏷️ সোল্ড আউট চিহ্নিত করুন"}
                              </button>

                              {p.isBorderOffer && (
                                <span className="text-[9px] font-black bg-amber-500 text-black px-2 py-0.5 rounded-full">
                                  ⚡ BORDER OFFER
                                </span>
                              )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                           <button onClick={() => handleEditProduct(p)} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:bg-zinc-700">
                              <Edit className="w-4 h-4" />
                           </button>
                           <button onClick={() => handleDeleteProduct(p.id)} className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 hover:bg-rose-100">
                              <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                      </div>
                   ))}
                   {filteredProducts.length === 0 && (
                      <div className="text-center py-10 text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 font-medium">No products found.</div>
                   )}
                </div>
              </div>
            )}

            {/* --- ADD/EDIT PRODUCT TAB --- */}
            {(activeTab === "add_product" || activeTab === "edit_product") && !selectedOrderId && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                <div className="flex items-center gap-4 mb-6">
                  <button onClick={() => setActiveTab("products")} className="w-10 h-10 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-750 flex items-center justify-center text-zinc-800 dark:text-zinc-200 shadow-sm">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-[17px] font-bold text-zinc-900 dark:text-zinc-100">{activeTab === "add_product" ? "Add New Product" : "Edit Product"}</h2>
                </div>

                <form onSubmit={handleProductSubmit} className="space-y-5">
                  <div className="bg-white dark:bg-zinc-900 rounded-[1.5rem] p-5 shadow-sm border border-zinc-100 dark:border-zinc-800 dark:border-zinc-800 space-y-4">
                    <div>
                      <Label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 ml-1 mb-1.5 block">Product Name *</Label>
                      <Input value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} placeholder="e.g. Premium Smartwatch" className="rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 border-transparent dark:border-zinc-700 h-12 text-zinc-900 dark:text-zinc-100 dark:text-zinc-100" required />
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 ml-1 mb-1.5 block">Price (৳) *</Label>
                        <Input type="number" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} placeholder="0.00" className="rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 border-transparent dark:border-zinc-700 h-12 text-zinc-900 dark:text-zinc-100 dark:text-zinc-100" required />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 ml-1 mb-1.5 block">Stock *</Label>
                        <Input type="number" value={productForm.stock} onChange={e => setProductForm({...productForm, stock: e.target.value})} placeholder="10" className="rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 border-transparent dark:border-zinc-700 h-12 text-zinc-900 dark:text-zinc-100 dark:text-zinc-100" required />
                      </div>
                    </div>
                    <div>
                       <Label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 ml-1 mb-1.5 block">
                         Advance Payment Option (এডভান্স পেমেন্ট অপশন)
                       </Label>
                       
                       <div className="grid grid-cols-2 gap-3 mb-3">
                         <button
                           type="button"
                           onClick={() => setProductForm({ ...productForm, advanceType: "custom" })}
                           className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                             productForm.advanceType === "custom"
                               ? "border-[#EF8020] bg-[#EF8020]/10 text-[#EF8020]"
                               : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                           }`}
                         >
                           Custom Advance (কাস্টম)
                         </button>
                         <button
                           type="button"
                           onClick={() => setProductForm({ ...productForm, advanceType: "full" })}
                           className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                             productForm.advanceType === "full"
                               ? "border-[#EF8020] bg-[#EF8020]/10 text-[#EF8020]"
                               : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                           }`}
                         >
                           Full Amount Advance (100% ফুল)
                         </button>
                       </div>

                       {productForm.advanceType === "full" ? (
                         <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-400 font-semibold">
                           ⚡ Customer needs to pay 100% full payment (৳{productForm.price || 0}) advance at checkout.
                         </div>
                       ) : (
                         <div className="space-y-3 p-3.5 bg-[#F5F5F7] dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80">
                           <div className="flex items-center gap-3">
                             <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">Mode:</Label>
                             <CustomDropdown
                               options={["Fixed Amount (৳)", "Percentage (%)"]}
                               value={productForm.advanceMode === "percentage" ? "Percentage (%)" : "Fixed Amount (৳)"}
                               onChange={(val) => setProductForm({ ...productForm, advanceMode: val === "Percentage (%)" ? "percentage" : "fixed" })}
                               className="h-10 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                             />
                           </div>

                           {productForm.advanceMode === "percentage" ? (
                             <div>
                               <Label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1 block">
                                 Advance Percentage (%)
                               </Label>
                               <div className="flex items-center gap-3">
                                 <Input
                                   type="number"
                                   value={productForm.advancePercentage}
                                   onChange={(e) => setProductForm({ ...productForm, advancePercentage: e.target.value })}
                                   placeholder="e.g. 10 or 20"
                                   className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 h-10 text-xs text-zinc-900 dark:text-zinc-100"
                                 />
                                 <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap bg-emerald-500/10 px-3 py-2.5 rounded-xl border border-emerald-500/20">
                                   Calc: ৳{Math.round((Number(productForm.price || 0) * (Number(productForm.advancePercentage || 0) / 100)))}
                                 </div>
                               </div>
                             </div>
                           ) : (
                             <div>
                               <Label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1 block">
                                 Custom Fixed Amount (৳)
                               </Label>
                               <Input
                                 type="number"
                                 value={productForm.advanceAmount}
                                 onChange={(e) => setProductForm({ ...productForm, advanceAmount: e.target.value })}
                                 placeholder="e.g. 150 or 500"
                                 className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 h-10 text-xs text-zinc-900 dark:text-zinc-100"
                               />
                             </div>
                           )}
                         </div>
                       )}
                    </div>
                    {/* Border Stock Phone Offer Toggle */}
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => setProductForm({ ...productForm, isBorderOffer: !productForm.isBorderOffer, advanceType: !productForm.isBorderOffer ? "full" : productForm.advanceType })}>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-500 text-lg">⚡</span>
                          <div>
                            <Label className="text-xs font-bold text-amber-500 block cursor-pointer">
                              Border Stock Phone Offer (বর্ডার স্টক মোবাইল অফার)
                            </Label>
                            <p className="text-[10px] text-zinc-400">
                              এই অফার প্রোডাক্টগুলোতে ১০০% ফুল এডভান্স বাধ্যতামূলক থাকবে।
                            </p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={productForm.isBorderOffer}
                          onChange={(e) => setProductForm({ ...productForm, isBorderOffer: e.target.checked, advanceType: e.target.checked ? "full" : productForm.advanceType })}
                          className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                        />
                      </div>

                      {productForm.isBorderOffer && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-500/20 animate-in fade-in duration-200">
                          <div>
                            <Label className="text-[11px] font-bold text-zinc-300 block mb-1">
                              Storage / Memory (e.g. 8GB / 128GB)
                            </Label>
                            <Input
                              value={productForm.storage}
                              onChange={(e) => setProductForm({ ...productForm, storage: e.target.value })}
                              placeholder="e.g. 8/128 GB"
                              className="h-10 text-xs bg-zinc-900 border-zinc-700 rounded-xl"
                            />
                          </div>

                          <div>
                            <Label className="text-[11px] font-bold text-zinc-300 block mb-1">
                              Condition / Grade (e.g. Grade A Intake)
                            </Label>
                            <Input
                              value={productForm.condition}
                              onChange={(e) => setProductForm({ ...productForm, condition: e.target.value })}
                              placeholder="e.g. Grade A Intake"
                              className="h-10 text-xs bg-zinc-900 border-zinc-700 rounded-xl"
                            />
                          </div>

                          <div>
                            <Label className="text-[11px] font-bold text-zinc-300 block mb-1">
                              Battery Health / Condition
                            </Label>
                            <Input
                              value={productForm.batteryHealth}
                              onChange={(e) => setProductForm({ ...productForm, batteryHealth: e.target.value })}
                              placeholder="e.g. 100% Health"
                              className="h-10 text-xs bg-zinc-900 border-zinc-700 rounded-xl"
                            />
                          </div>

                          <div>
                            <Label className="text-[11px] font-bold text-zinc-300 block mb-1">
                              Warranty Details
                            </Label>
                            <Input
                              value={productForm.warranty}
                              onChange={(e) => setProductForm({ ...productForm, warranty: e.target.value })}
                              placeholder="e.g. 7 Days Replacement"
                              className="h-10 text-xs bg-zinc-900 border-zinc-700 rounded-xl"
                            />
                          </div>

                          <div className="sm:col-span-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                            <Label className="text-[11px] font-bold text-amber-400 block mb-1">
                              অফারের জন্য নির্দিষ্ট এডভান্স টাকা (৳) - Dedicated Advance Amount
                            </Label>
                            <Input
                              type="number"
                              value={productForm.borderOfferAdvanceAmount}
                              onChange={(e) => setProductForm({ ...productForm, borderOfferAdvanceAmount: e.target.value })}
                              placeholder={`যেমন: 500 বা 1000 বা সম্পূর্ণ ৳${productForm.price || 0}`}
                              className="h-10 text-xs bg-zinc-900 border-zinc-700 rounded-xl text-white placeholder:text-zinc-500"
                            />
                            <p className="text-[10px] text-zinc-400 mt-1">
                              এই টাকাটি কাস্টমারের জন্য স্বয়ংক্রিয়ভাবে পেমেন্ট পেজে এডভান্স হিসেবে ধার্য হবে এবং বাকি টাকা ডেলিভারির সময় প্রদেয় হবে।
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 ml-1 mb-1.5 block">Category *</Label>
                      <CustomDropdown
                        options={["Border Cross Products", "Mobile", "Smart Watch", "Earbuds", "Accessories", "Custom Category"]}
                        value={productForm.category === "custom" ? "Custom Category" : productForm.category}
                        onChange={(val) => setProductForm({...productForm, category: val === "Custom Category" ? "custom" : val})}
                        placeholder="Select Category"
                        className="h-12 bg-[#F5F5F7] dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-transparent dark:border-zinc-700 rounded-xl"
                      />
                    </div>
                    {(productForm.category === "custom" || productForm.category === "Custom Category") && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-200 mt-2">
                        <Label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 ml-1 mb-1.5 block">Custom Category Name *</Label>
                        <Input 
                          value={customCategoryName} 
                          onChange={e => setCustomCategoryName(e.target.value)} 
                          placeholder="e.g. Smart Home Gadgets" 
                          className="rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 border-transparent dark:border-zinc-700 h-12 text-zinc-900 dark:text-zinc-100 dark:text-zinc-100" 
                          required 
                        />
                      </div>
                    )}
                    
                    {/* Additional Options */}
                    <div className="grid grid-cols-2 gap-4 mt-2">
                       <div>
                         <Label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 ml-1 mb-1.5 block">Special Offer</Label>
                         <label className="flex items-center space-x-2 bg-[#F5F5F7] dark:bg-zinc-800 h-12 px-3 rounded-xl cursor-pointer">
                           <input type="checkbox" checked={productForm.isOffer} onChange={e => setProductForm({...productForm, isOffer: e.target.checked})} className="rounded text-[#EF8020] focus:ring-[#EF8020]" />
                           <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Enable Offer</span>
                         </label>
                       </div>
                       {productForm.isOffer && (
                         <div>
                           <Label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 ml-1 mb-1.5 block">Offer Price (৳)</Label>
                           <Input type="number" value={productForm.offerPrice} onChange={e => setProductForm({...productForm, offerPrice: e.target.value})} placeholder="e.g. 50" className="rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 border-transparent dark:border-zinc-700 h-12 text-zinc-900 dark:text-zinc-100 dark:text-zinc-100" />
                         </div>
                       )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-2">
                       <div>
                         <Label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 ml-1 mb-1.5 block">Cash on Delivery</Label>
                         <label className="flex items-center space-x-2 bg-[#F5F5F7] dark:bg-zinc-800 h-12 px-3 rounded-xl cursor-pointer">
                           <input type="checkbox" checked={productForm.isCodEnabled} onChange={e => setProductForm({...productForm, isCodEnabled: e.target.checked})} className="rounded text-[#EF8020] focus:ring-[#EF8020]" />
                           <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Allow COD</span>
                         </label>
                       </div>
                       <div>
                         <Label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 ml-1 mb-1.5 block">D Coin Reward</Label>
                         <Input type="number" value={productForm.coinReward} onChange={e => setProductForm({...productForm, coinReward: e.target.value})} placeholder="0" className="rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 border-transparent dark:border-zinc-700 h-12 text-zinc-900 dark:text-zinc-100 dark:text-zinc-100" />
                       </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 ml-1 mb-1 block">Product Images *</Label>
                      <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-750 hover:border-[#EF8020] rounded-2xl p-5 text-center bg-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer relative">
                        <input 
                          type="file" 
                          multiple 
                          accept="image/*" 
                          onChange={(e) => {
                            if (e.target.files) {
                              const files = Array.from(e.target.files);
                              setProductForm(prev => ({
                                ...prev,
                                imageFiles: [...prev.imageFiles, ...files]
                              }));
                            }
                          }} 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                        />
                        <Camera className="w-8 h-8 text-zinc-400 dark:text-zinc-500 mx-auto mb-2" />
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">Click or Drag & Drop Images</span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block mt-1">Select multiple product photos to upload</span>
                      </div>

                      {/* Image Previews */}
                      {((productForm.existingImages && productForm.existingImages.length > 0) || (productForm.imageFiles && productForm.imageFiles.length > 0)) && (
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {/* Existing Images */}
                          {productForm.existingImages?.map((url, idx) => (
                            <div key={`existing-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-100 dark:border-zinc-800 group">
                              <img src={url} alt="Product" className="w-full h-full object-cover" />
                              <button 
                                type="button"
                                onClick={() => {
                                  setProductForm(prev => ({
                                    ...prev,
                                    existingImages: prev.existingImages.filter((_, i) => i !== idx)
                                  }));
                                }}
                                className="absolute top-1 right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-white opacity-90 hover:bg-rose-600 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}

                          {/* New Image Files */}
                          {productForm.imageFiles?.map((file, idx) => {
                            const previewUrl = URL.createObjectURL(file);
                            return (
                              <div key={`new-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-100 dark:border-zinc-800 group">
                                <img src={previewUrl} alt="Product Draft" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                  <span className="text-[8px] font-bold text-white uppercase bg-[#EF8020] px-1 py-0.5 rounded">New</span>
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setProductForm(prev => ({
                                      ...prev,
                                      imageFiles: prev.imageFiles.filter((_, i) => i !== idx)
                                    }));
                                  }}
                                  className="absolute top-1 right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-white opacity-90 hover:bg-rose-600 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 ml-1 mb-1.5 block">3D Model URL / Custom Image URL (Optional)</Label>
                      <Input value={productForm.modelUrl} onChange={e => setProductForm({...productForm, modelUrl: e.target.value})} placeholder="https://..." className="rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 border-transparent dark:border-zinc-700 h-12 text-zinc-900 dark:text-zinc-100 dark:text-zinc-100" />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 ml-1 mb-1.5 block">Description</Label>
                      <Textarea value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} placeholder="Product details..." className="rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 border-transparent dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 min-h-[100px]" />
                    </div>
                  </div>
                  
                  <Button type="submit" disabled={submitting} className="w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold text-[15px] shadow-sm">
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (activeTab === "add_product" ? "Publish Product" : "Save Changes")}
                  </Button>
                </form>
              </div>
            )}

            {/* --- STORE & PAYMENT SETTINGS TAB --- */}
            {(activeTab === "settings_store" || activeTab === "settings_payment") && !selectedOrderId && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                 <h2 className="text-[17px] font-bold text-zinc-900 dark:text-zinc-100 mb-6">Store & Payment Settings</h2>
                 
                 <div className="bg-white dark:bg-zinc-900 rounded-[1.5rem] p-5 shadow-sm border border-zinc-100 dark:border-zinc-800 space-y-6">
                    {/* Logo Upload */}
                    <div className="flex flex-col items-center gap-4 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                       <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden border border-zinc-200 dark:border-zinc-750 flex items-center justify-center text-3xl font-bold text-zinc-400 dark:text-zinc-500">
                          {shopLogo ? <img src={shopLogo} alt="Logo" className="w-full h-full object-cover" /> : storeInitials}
                       </div>
                       <div className="relative">
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                          <button type="button" className="px-4 py-2 bg-[#F5F5F7] dark:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700">
                             Change Store Logo
                          </button>
                       </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4">
                       <div>
                          <Label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 ml-1 mb-1.5 block">Store Name</Label>
                          <Input value={shopName} onChange={e => setShopName(e.target.value)} placeholder="e.g. DEEP SHOP" className="rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 border-transparent dark:border-zinc-700 h-12 text-zinc-900 dark:text-zinc-100" />
                       </div>
                       <div>
                          <Label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 ml-1 mb-1.5 block">Global Advance Payment (৳)</Label>
                          <Input type="number" value={defaultAdvanceAmount} onChange={e => setDefaultAdvanceAmount(e.target.value)} placeholder="0.00" className="rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 border-transparent dark:border-zinc-700 h-12 text-zinc-900 dark:text-zinc-100" />
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 ml-1 mt-1">Default advance amount required for COD orders.</p>
                       </div>
                       <div>
                          <Label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 ml-1 mb-1.5 block">TikTok Username</Label>
                          <Input value={tiktokId} onChange={e => setTiktokId(e.target.value)} placeholder="@username" className="rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 border-transparent dark:border-zinc-700 h-12 text-zinc-900 dark:text-zinc-100" />
                       </div>

                       {/* Multiple bKash Numbers with Personal / Payment / Agent Type */}
                       <div className="p-4 bg-pink-50/60 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-900/30 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between gap-2">
                             <div>
                                <Label className="text-xs font-bold text-[#E2125B] dark:text-pink-300 block">
                                   Multiple bKash Numbers (বিকাশ নাম্বারসমূহ — Personal / Payment / Agent)
                                </Label>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                   প্রতিটি বিকাশ নাম্বারের জন্য Personal, Payment অথবা Agent টাইপ সিলেক্ট করে যোগ করুন।
                                </p>
                             </div>
                          </div>

                          {/* Account Type Selector Pills */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                             <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mr-1 whitespace-nowrap">
                                Account Type:
                             </span>
                             {(["Personal", "Payment", "Agent"] as const).map((accType) => (
                                <button
                                   key={accType}
                                   type="button"
                                   onClick={() => setNewBkashType(accType)}
                                   className={`px-3 py-1 rounded-full text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                                      newBkashType === accType
                                         ? "bg-[#E2125B] text-white shadow-xs"
                                         : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-pink-200 dark:border-pink-900/40"
                                   }`}
                                >
                                   {accType}
                                </button>
                             ))}
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2">
                             <Input
                                value={newBkashInput}
                                onChange={(e) => setNewBkashInput(e.target.value)}
                                onKeyDown={(e) => {
                                   if (e.key === "Enter") {
                                      e.preventDefault();
                                      const val = newBkashInput.trim();
                                      if (!val) return;
                                      if (isForbiddenNumber(val)) {
                                         notify("নাম্বারটি সিস্টেমে অনুমোদিত নয়।", "error");
                                         return;
                                      }
                                      if (bkashAccounts.some((a) => a.number === val && a.type === newBkashType)) {
                                         notify("এই নাম্বার এবং টাইপ ইতিমধ্যে তালিকায় রয়েছে", "error");
                                         return;
                                      }
                                      const nextAccs = [...bkashAccounts, { number: val, type: newBkashType }];
                                      const nextNums = nextAccs.map((a) => a.number);
                                      setBkashAccounts(nextAccs);
                                      setBkashNumbers(nextNums);
                                      setBkashNumber(nextNums[0] || "");
                                      setNewBkashInput("");
                                      saveStoreSettings({
                                         bkashAccounts: nextAccs,
                                         bkashNumbers: nextNums,
                                         bkashNumber: nextNums[0] || "",
                                      });
                                   }
                                }}
                                placeholder={`নতুন bKash (${newBkashType}) নাম্বার লিখুন (017XXXXXXXX)`}
                                className="rounded-xl bg-white dark:bg-zinc-800 border-pink-200 dark:border-pink-800/40 h-11 text-xs text-zinc-900 dark:text-zinc-100 flex-1"
                             />
                             <Button
                                type="button"
                                onClick={() => {
                                   const val = newBkashInput.trim();
                                   if (!val) return;
                                   if (isForbiddenNumber(val)) {
                                      notify("নাম্বারটি সিস্টেমে অনুমোদিত নয়।", "error");
                                      return;
                                   }
                                   if (bkashAccounts.some((a) => a.number === val && a.type === newBkashType)) {
                                      notify("এই নাম্বার এবং টাইপ ইতিমধ্যে তালিকায় রয়েছে", "error");
                                      return;
                                   }
                                   const nextAccs = [...bkashAccounts, { number: val, type: newBkashType }];
                                   const nextNums = nextAccs.map((a) => a.number);
                                   setBkashAccounts(nextAccs);
                                   setBkashNumbers(nextNums);
                                   setBkashNumber(nextNums[0] || "");
                                   setNewBkashInput("");
                                   saveStoreSettings({
                                      bkashAccounts: nextAccs,
                                      bkashNumbers: nextNums,
                                      bkashNumber: nextNums[0] || "",
                                   });
                                }}
                                className="h-11 bg-[#E2125B] hover:bg-[#c20e4d] text-white rounded-xl text-xs font-bold px-4 whitespace-nowrap shrink-0"
                             >
                                + Add bKash ({newBkashType})
                             </Button>
                          </div>

                          <div className="space-y-2 pt-1">
                             {bkashAccounts.map((acc, i) => (
                                <div
                                   key={`${acc.number}-${acc.type}-${i}`}
                                   className="flex items-center justify-between gap-2 bg-white dark:bg-zinc-800 border border-pink-200 dark:border-pink-800/60 px-3 py-2 rounded-xl shadow-xs flex-wrap"
                                >
                                   <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-[11px] font-black text-[#E2125B]">#{i + 1}</span>
                                      <span className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">{acc.number}</span>
                                   </div>
                                   <div className="flex items-center gap-1.5">
                                      {(["Personal", "Payment", "Agent"] as const).map((t) => (
                                         <button
                                            key={t}
                                            type="button"
                                            onClick={() => {
                                               const nextAccs = bkashAccounts.map((item, idx) =>
                                                  idx === i ? { ...item, type: t } : item
                                               );
                                               setBkashAccounts(nextAccs);
                                               saveStoreSettings({ bkashAccounts: nextAccs });
                                            }}
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition whitespace-nowrap cursor-pointer ${
                                               acc.type === t
                                                  ? "bg-[#E2125B] text-white"
                                                  : "bg-pink-50 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                                            }`}
                                         >
                                            {t}
                                         </button>
                                      ))}
                                      <button
                                         type="button"
                                         onClick={() => {
                                            const nextAccs = bkashAccounts.filter((_, idx) => idx !== i);
                                            const nextNums = nextAccs.map((a) => a.number);
                                            setBkashAccounts(nextAccs);
                                            setBkashNumbers(nextNums);
                                            setBkashNumber(nextNums[0] || "");
                                            saveStoreSettings({
                                               bkashAccounts: nextAccs,
                                               bkashNumbers: nextNums,
                                               bkashNumber: nextNums[0] || "",
                                            });
                                         }}
                                         className="text-zinc-400 hover:text-red-500 font-bold ml-1.5 text-xs px-1 cursor-pointer"
                                         title="Remove number"
                                      >
                                         ✕
                                      </button>
                                   </div>
                                </div>
                             ))}
                             {bkashAccounts.length === 0 && (
                                <p className="text-[11px] text-pink-700/70 dark:text-pink-400/70 font-medium">কোনো বিকাশ নাম্বার যোগ করা নেই</p>
                             )}
                          </div>
                       </div>

                       {/* Multiple Nagad Numbers with Personal / Payment / Agent Type */}
                       <div className="p-4 bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between gap-2">
                             <div>
                                <Label className="text-xs font-bold text-[#F57C20] dark:text-orange-300 block">
                                   Multiple Nagad Numbers (নগদ নাম্বারসমূহ — Personal / Payment / Agent)
                                </Label>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                   প্রতিটি নগদ নাম্বারের জন্য Personal, Payment অথবা Agent টাইপ সিলেক্ট করে যোগ করুন।
                                </p>
                             </div>
                          </div>

                          {/* Account Type Selector Pills */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                             <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mr-1 whitespace-nowrap">
                                Account Type:
                             </span>
                             {(["Personal", "Payment", "Agent"] as const).map((accType) => (
                                <button
                                   key={accType}
                                   type="button"
                                   onClick={() => setNewNagadType(accType)}
                                   className={`px-3 py-1 rounded-full text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                                      newNagadType === accType
                                         ? "bg-[#F57C20] text-white shadow-xs"
                                         : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-orange-200 dark:border-orange-900/40"
                                   }`}
                                >
                                   {accType}
                                </button>
                             ))}
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2">
                             <Input
                                value={newNagadInput}
                                onChange={(e) => setNewNagadInput(e.target.value)}
                                onKeyDown={(e) => {
                                   if (e.key === "Enter") {
                                      e.preventDefault();
                                      const val = newNagadInput.trim();
                                      if (!val) return;
                                      if (isForbiddenNumber(val)) {
                                         notify("নাম্বারটি সিস্টেমে অনুমোদিত নয়।", "error");
                                         return;
                                      }
                                      if (nagadAccounts.some((a) => a.number === val && a.type === newNagadType)) {
                                         notify("এই নাম্বার এবং টাইপ ইতিমধ্যে তালিকায় রয়েছে", "error");
                                         return;
                                      }
                                      const nextAccs = [...nagadAccounts, { number: val, type: newNagadType }];
                                      const nextNums = nextAccs.map((a) => a.number);
                                      setNagadAccounts(nextAccs);
                                      setNagadNumbers(nextNums);
                                      setNagadNumber(nextNums[0] || "");
                                      setNewNagadInput("");
                                      saveStoreSettings({
                                         nagadAccounts: nextAccs,
                                         nagadNumbers: nextNums,
                                         nagadNumber: nextNums[0] || "",
                                      });
                                   }
                                }}
                                placeholder={`নতুন Nagad (${newNagadType}) নাম্বার লিখুন (018XXXXXXXX)`}
                                className="rounded-xl bg-white dark:bg-zinc-800 border-orange-200 dark:border-orange-800/40 h-11 text-xs text-zinc-900 dark:text-zinc-100 flex-1"
                             />
                             <Button
                                type="button"
                                onClick={() => {
                                   const val = newNagadInput.trim();
                                   if (!val) return;
                                   if (isForbiddenNumber(val)) {
                                      notify("নাম্বারটি সিস্টেমে অনুমোদিত নয়।", "error");
                                      return;
                                   }
                                   if (nagadAccounts.some((a) => a.number === val && a.type === newNagadType)) {
                                      notify("এই নাম্বার এবং টাইপ ইতিমধ্যে তালিকায় রয়েছে", "error");
                                      return;
                                   }
                                   const nextAccs = [...nagadAccounts, { number: val, type: newNagadType }];
                                   const nextNums = nextAccs.map((a) => a.number);
                                   setNagadAccounts(nextAccs);
                                   setNagadNumbers(nextNums);
                                   setNagadNumber(nextNums[0] || "");
                                   setNewNagadInput("");
                                   saveStoreSettings({
                                      nagadAccounts: nextAccs,
                                      nagadNumbers: nextNums,
                                      nagadNumber: nextNums[0] || "",
                                   });
                                }}
                                className="h-11 bg-[#F57C20] hover:bg-[#d96714] text-white rounded-xl text-xs font-bold px-4 whitespace-nowrap shrink-0"
                             >
                                + Add Nagad ({newNagadType})
                             </Button>
                          </div>

                          <div className="space-y-2 pt-1">
                             {nagadAccounts.map((acc, i) => (
                                <div
                                   key={`${acc.number}-${acc.type}-${i}`}
                                   className="flex items-center justify-between gap-2 bg-white dark:bg-zinc-800 border border-orange-200 dark:border-orange-800/60 px-3 py-2 rounded-xl shadow-xs flex-wrap"
                                >
                                   <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-[11px] font-black text-[#F57C20]">#{i + 1}</span>
                                      <span className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">{acc.number}</span>
                                   </div>
                                   <div className="flex items-center gap-1.5">
                                      {(["Personal", "Payment", "Agent"] as const).map((t) => (
                                         <button
                                            key={t}
                                            type="button"
                                            onClick={() => {
                                               const nextAccs = nagadAccounts.map((item, idx) =>
                                                  idx === i ? { ...item, type: t } : item
                                               );
                                               setNagadAccounts(nextAccs);
                                               saveStoreSettings({ nagadAccounts: nextAccs });
                                            }}
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition whitespace-nowrap cursor-pointer ${
                                               acc.type === t
                                                  ? "bg-[#F57C20] text-white"
                                                  : "bg-orange-50 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                                            }`}
                                         >
                                            {t}
                                         </button>
                                      ))}
                                      <button
                                         type="button"
                                         onClick={() => {
                                            const nextAccs = nagadAccounts.filter((_, idx) => idx !== i);
                                            const nextNums = nextAccs.map((a) => a.number);
                                            setNagadAccounts(nextAccs);
                                            setNagadNumbers(nextNums);
                                            setNagadNumber(nextNums[0] || "");
                                            saveStoreSettings({
                                               nagadAccounts: nextAccs,
                                               nagadNumbers: nextNums,
                                               nagadNumber: nextNums[0] || "",
                                            });
                                         }}
                                         className="text-zinc-400 hover:text-red-500 font-bold ml-1.5 text-xs px-1 cursor-pointer"
                                         title="Remove number"
                                      >
                                         ✕
                                      </button>
                                   </div>
                                </div>
                             ))}
                             {nagadAccounts.length === 0 && (
                                <p className="text-[11px] text-orange-700/70 dark:text-orange-400/70 font-medium">কোনো নগদ নাম্বার যোগ করা নেই</p>
                             )}
                           </div>
                        </div>

                        <Button 
                           onClick={() => saveStoreSettings({ shopName, defaultAdvanceAmount: Number(defaultAdvanceAmount), tiktokId })}
                           className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-bold rounded-xl text-xs mt-4"
                        >
                           Save Store Settings
                        </Button>
                     </div>
                  </div>
               </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation for Mobile (Floating capsule matching Messages.tsx) */}
      <div className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 pointer-events-auto h-[54px] flex items-center justify-between gap-1.5 px-2.5 rounded-full bg-white/85 dark:bg-[#141518]/85 backdrop-blur-md shadow-[0_4px_18px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_22px_rgba(0,0,0,0.4)] transition-all mb-[env(safe-area-inset-bottom)]">
        <NavItem icon="home" label="Home" tab="home" />
        <NavItem icon="receipt" label="Orders" tab="orders" badge={orders.filter((o: any) => (o.status || "").toLowerCase() === "pending").length} />
        <NavItem icon="boxes" label="Products" tab="products" />
        <NavItem icon="cog" label="Settings" tab="settings_store" />
      </div>

       {cancelModalOrderId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            onClick={() => setCancelModalOrderId(null)} 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          />
          
          {/* Modal Card */}
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-zinc-100 dark:border-zinc-800 relative z-10 animate-in fade-in zoom-in-95 duration-300 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-[15px]">{cancelModalStatus === OrderStatus.RETURNED ? "Return Order" : "Cancel / Reject Order"}</h3>
              <button 
                type="button"
                onClick={() => { setCancelModalOrderId(null); setCancelModalStatus(null); setCancelReasonText(""); }} 
                className="w-8 h-8 rounded-full bg-[#F5F5F7] dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
              Please provide a brief reason for {cancelModalStatus === OrderStatus.RETURNED ? "returning" : "rejecting/cancelling"} order <span className="font-bold text-zinc-700 dark:text-zinc-300">#{cancelModalOrderId.slice(0, 8)}</span>. The customer will see this reason in their order history.
            </p>
            
            <textarea 
              value={cancelReasonText} 
              onChange={(e) => setCancelReasonText(e.target.value)} 
              placeholder={cancelModalStatus === OrderStatus.RETURNED ? "e.g., Customer refused delivery, etc..." : "e.g., Product out of stock, delivery area not covered, etc..."} 
              className="w-full h-24 p-3 rounded-2xl bg-[#F5F5F7] dark:bg-zinc-800 text-xs font-medium placeholder:text-zinc-400 outline-none border-none resize-none focus:ring-1 focus:ring-[#EF8020] text-zinc-900 dark:text-zinc-100"
            />
            
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => { setCancelModalOrderId(null); setCancelModalStatus(null); setCancelReasonText(""); }} 
                className="flex-1 h-12 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl"
              >
                Go Back
              </button>
              <button 
                type="button"
                disabled={!cancelReasonText.trim()} 
                onClick={async () => {
                  if (cancelReasonText.trim()) {
                    await updateOrderStatus(cancelModalOrderId, cancelModalStatus || OrderStatus.CANCELLED, cancelReasonText.trim());
                    setCancelModalOrderId(null);
                    setCancelModalStatus(null);
                    setCancelReasonText("");
                  }
                }} 
                className="flex-1 h-12 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm"
              >
                {cancelModalStatus === OrderStatus.RETURNED ? "Submit Return" : "Cancel Order"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SellerDashboard;
