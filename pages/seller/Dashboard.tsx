import { sendPushNotification } from "../../lib/push";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  collection,
  addDoc,
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
import { motion, AnimatePresence } from "framer-motion";
import Icon from "../../components/Icon";
import {
  Plus, Edit, Trash2, Package, Eye, ShoppingBag, TrendingUp, Music,
  Store, Camera, ShieldCheck, Check, DollarSign, ListPlus, Loader2,
  X, ArrowLeft, ShieldAlert, Award, ChevronRight, ChevronDown, Menu, Home as HomeIcon,
  BookOpen, Bell, CreditCard, Truck, Percent, Users, Edit3, Settings, Shield,
  ArrowRight, Video, FileText, CheckCircle, MessageSquare, Search, SlidersHorizontal,
  MapPin, Phone, LayoutDashboard, ClipboardList, Boxes, Sliders, Copy
} from "lucide-react";
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
  
  // Custom navigation structure (Tabs/views inside the full-screen space)
  const initialTab = (searchParams.get("tab") as any) || "home";
  const [activeTab, setActiveTab] = useState<
    "home" | "orders" | "products" | "blog" | "settings_store" | "settings_payment" | "settings_shipping" | "settings_coupons" | "settings_categories" | "settings_members" | "add_product" | "edit_product" | "add_story" | "more" | "settings_tax"
  >(initialTab);

  // Dynamic Store Settings states
  const [shopName, setShopName] = useState("");
  const [shopLogo, setShopLogo] = useState("");
  const [tiktokId, setTiktokId] = useState("");
  const [bkashNumber, setBkashNumber] = useState("");
  const [nagadNumber, setNagadNumber] = useState("");
  const [bkashNumbers, setBkashNumbers] = useState<string[]>([]);
  const [nagadNumbers, setNagadNumbers] = useState<string[]>([]);
  const [newBkashInput, setNewBkashInput] = useState("");
  const [newNagadInput, setNewNagadInput] = useState("");
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

  // Authentication & Profile listener
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
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

        unsubProfile = onSnapshot(doc(db, "users", u.uid), (snap) => {
          if (snap.exists()) {
            const profile = snap.data();
            if (profile.role !== "seller" && profile.role !== "admin") {
              notify("Access Denied. Only registered sellers can view this dashboard.", "error");
              navigate("/");
              return;
            }
            setSellerProfile(profile);
            if (!dataFetchedRef.current) {
              fetchSellerData(u.uid, true);
              dataFetchedRef.current = true;
            }
          } else {
            notify("Seller profile not found.", "error");
            navigate("/");
          }
        });
      } else {
        navigate("/signin");
      }
    });
    return () => {
      unsub();
      if (unsubProfile) unsubProfile();
    };
  }, [navigate]);

  useEffect(() => {
    if (sellerProfile && !settingsLoadedRef.current) {
      if (sellerProfile.shopName) setShopName(sellerProfile.shopName);
      if (sellerProfile.photoURL || sellerProfile.avatarUrl) {
        setShopLogo(sellerProfile.photoURL || sellerProfile.avatarUrl);
      }
      if (sellerProfile.tiktokId) setTiktokId(sellerProfile.tiktokId);
      
      let bList: string[] = [];
      if (Array.isArray(sellerProfile.bkashNumbers)) bList = [...sellerProfile.bkashNumbers];
      else if (sellerProfile.bkashNumber) bList = [sellerProfile.bkashNumber];
      setBkashNumbers(bList);
      setBkashNumber(bList[0] || "");

      let nList: string[] = [];
      if (Array.isArray(sellerProfile.nagadNumbers)) nList = [...sellerProfile.nagadNumbers];
      else if (sellerProfile.nagadNumber) nList = [sellerProfile.nagadNumber];
      setNagadNumbers(nList);
      setNagadNumber(nList[0] || "");

      if (sellerProfile.defaultAdvanceAmount !== undefined) setDefaultAdvanceAmount(sellerProfile.defaultAdvanceAmount);
      if (sellerProfile.taxRate !== undefined) setTaxRate(sellerProfile.taxRate);
      if (sellerProfile.binNumber !== undefined) setBinNumber(sellerProfile.binNumber);
      if (sellerProfile.taxInclusive !== undefined) setTaxInclusive(sellerProfile.taxInclusive);
      settingsLoadedRef.current = true;
    }
  }, [sellerProfile]);

  // Firestore Write Operations
  const saveStoreSettings = async (overrideData?: any) => {
    if (!user) return;
    const finalBkashList = overrideData?.bkashNumbers !== undefined ? overrideData.bkashNumbers : bkashNumbers;
    const finalNagadList = overrideData?.nagadNumbers !== undefined ? overrideData.nagadNumbers : nagadNumbers;

    if (
      finalBkashList.some(isForbiddenNumber) ||
      finalNagadList.some(isForbiddenNumber) ||
      isForbiddenNumber(bkashNumber) ||
      isForbiddenNumber(nagadNumber)
    ) {
      notify("01778953114 নম্বরটি সিস্টেমে অনুমোদিত নয়। (This number is not allowed)", "error");
      return;
    }
    setIsSavingSettings(true);
    const updateData = {
      shopName: shopName,
      photoURL: shopLogo,
      avatarUrl: shopLogo,
      tiktokId: tiktokId,
      bkashNumber: finalBkashList[0] || bkashNumber || "",
      nagadNumber: finalNagadList[0] || nagadNumber || "",
      bkashNumbers: finalBkashList,
      nagadNumbers: finalNagadList,
      defaultAdvanceAmount: defaultAdvanceAmount === "" ? "" : Number(defaultAdvanceAmount),
      taxRate: Number(taxRate),
      binNumber: binNumber,
      taxInclusive: taxInclusive,
      ...(overrideData || {})
    };
    try {
      await setDoc(doc(db, "users", user.uid), updateData, { merge: true });
      localStorage.setItem(`vibe_seller_settings_${user.uid}`, JSON.stringify(updateData));
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

  const fetchSellerData = async (sellerId: string, showLoading: boolean = true) => {
    if (showLoading) setLoading(true);
    try {
      // 1. Fetch Products
      const prodQuery = query(collection(db, "products"), where("sellerId", "==", sellerId));
      const prodSnap = await getDocs(prodQuery);
      const prodList = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(prodList);

      // 2. Fetch Stories
      const storyQuery = query(collection(db, "stories"), where("sellerId", "==", sellerId));
      const storySnap = await getDocs(storyQuery);
      setStories(storySnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 3. Fetch Orders
      const orderSnap = await getDocs(collection(db, "orders"));
      const allOrders = orderSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const sellerOrders = allOrders.filter((ord: any) =>
        ord.status !== "payment_pending" &&
        ord.status !== "awaiting_payment" &&
        ord.paymentStatus !== "unpaid" &&
        ord.items?.some((item: any) => item.sellerId === sellerId || prodList.some((p: any) => p.id === item.productId))
      );
      const sortedOrders = sellerOrders.sort((a: any, b: any) => {
        const tA = a.createdAt || a.timestamp || 0;
        const tB = b.createdAt || b.timestamp || 0;
        return tB - tA;
      });
      setOrders(sortedOrders);

      // 4. Fetch Coupons
      const couponQuery = query(collection(db, "coupons"), where("sellerId", "==", sellerId));
      const couponSnap = await getDocs(couponQuery);
      setCoupons(couponSnap.docs.map(d => ({ id: d.id, ...d.data() })));
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
      
      const combinedImages = [...(productForm.existingImages || []), ...uploadedUrls];
      const primaryImage = combinedImages[0] || "";

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

    orders.forEach(o => {
      const orderDate = new Date(o.createdAt);
      if (orderDate >= startOfWeek) {
        dailySales[orderDate.getDay()] += (o.total || 0);
      }
    });

    return days.map((day, i) => ({ day, sales: dailySales[i] }));
  }, [orders]);

  const storeInitials = shopName ? shopName.charAt(0).toUpperCase() : "M";
  const storeDomain = shopName ? `${shopName.toLowerCase().replace(/\s+/g, "")}.com` : "gadgetvibe.com";

  // Filtered orders based on selected filter
  const filteredOrders = orders.filter(o => {
    if (orderFilter === "all") return true;
    return o.status?.toLowerCase() === orderFilter.toLowerCase();
  });

  // Filtered products based on search term
  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.category?.toLowerCase().includes(productSearch.toLowerCase())
  );



  // Format Date for Order Details
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status) => {
    if (!status) return "text-zinc-800 dark:text-zinc-200";
    const s = status.toLowerCase();
    if (s.includes("new") || s.includes("pending")) return "text-blue-600";
    if (s.includes("confirm")) return "text-emerald-600";
    if (s.includes("ship")) return "text-orange-600";
    if (s.includes("deliver")) return "text-emerald-600";
    if (s.includes("cancel") || s.includes("reject")) return "text-rose-600";
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
            {orders.filter(o => o.status === "pending").length > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {orders.filter(o => o.status === "pending").length}
              </span>
            )}
          </button>

          <button onClick={() => { setActiveTab("products"); setSelectedOrderId(null); }} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${activeTab === "products" || activeTab === "add_product" || activeTab === "edit_product" ? "bg-[#EF8020]/10 text-[#EF8020]" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}>
            <Icon name="boxes" className={`w-5 h-5 ${activeTab === "products" || activeTab === "add_product" || activeTab === "edit_product" ? "text-[#EF8020]" : "text-zinc-400 dark:text-zinc-500"}`} /> Products
          </button>

          <button onClick={() => { setActiveTab("settings_store"); setSelectedOrderId(null); }} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${activeTab.startsWith("settings") ? "bg-[#EF8020]/10 text-[#EF8020]" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}>
            <Icon name="cog" className={`w-5 h-5 ${activeTab.startsWith("settings") ? "text-[#EF8020]" : "text-zinc-400 dark:text-zinc-500"}`} /> Settings
          </button>
        </nav>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 w-full max-w-2xl mx-auto p-4 md:p-8 overflow-y-auto no-scrollbar relative min-h-screen text-zinc-900 dark:text-zinc-100 dark:text-zinc-100">
        
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xl overflow-hidden border border-zinc-200 dark:border-zinc-750 shadow-sm">
                      {shopLogo ? <img src={shopLogo} alt="Logo" className="w-full h-full object-cover" /> : storeInitials}
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 font-medium mb-0.5">Good Morning!</p>
                      <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-tight">{shopName || "Seller Studio"}</h2>
                    </div>
                  </div>
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

            {/* --- ORDERS TAB --- */}
            {activeTab === "orders" && !selectedOrderId && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                {/* Search Header */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl h-12 flex items-center px-4 shadow-sm border border-zinc-100 dark:border-zinc-800 dark:border-zinc-800">
                    <Search className="w-5 h-5 text-zinc-400 dark:text-zinc-500 mr-3" />
                    <input 
                      type="text" 
                      placeholder="Filter by Status (e.g., Pending, Confirmed)..." 
                      value={orderFilter === "all" ? "" : orderFilter}
                      onChange={(e) => setOrderFilter(e.target.value || "all")}
                      className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-zinc-900 dark:text-zinc-100 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 dark:text-zinc-500 dark:placeholder:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500"
                    />
                  </div>
                  <button className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-center shadow-sm border border-zinc-100 dark:border-zinc-800 dark:border-zinc-800 shrink-0">
                    <SlidersHorizontal className="w-5 h-5 text-zinc-800 dark:text-zinc-200" />
                  </button>
                </div>

                {/* Orders List */}
                <div className="flex-1 overflow-y-auto pb-4 space-y-4">
                  {filteredOrders.length > 0 ? filteredOrders.map((ord: any, idx: number) => {
                    const firstItem = ord.items?.[0] || {};
                    const totalPcs = ord.items?.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0) || 1;
                    return (
                      <div key={ord.id || idx} onClick={() => setSelectedOrderId(ord.id)} className="bg-white dark:bg-zinc-900 rounded-[1.5rem] p-4 shadow-sm border border-zinc-100 dark:border-zinc-800 dark:border-zinc-800 cursor-pointer active:scale-[0.98] transition-transform">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-[#F5F5F7] dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 dark:border-zinc-800 overflow-hidden p-1 flex items-center justify-center shrink-0">
                              {firstItem.image || firstItem.modelUrl ? (
                                <img src={firstItem.image || firstItem.modelUrl} alt={firstItem.name} className="w-full h-full object-contain mix-blend-multiply" />
                              ) : <Package className="w-5 h-5 text-zinc-300" />}
                            </div>
                            <div>
                              <h4 className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">{firstItem.name || "Unknown Item"}</h4>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">{formatDate(ord.createdAt)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-[11px] font-bold ${getStatusColor(ord.status || "New Order")}`}>{ord.status || "New Order"}</p>
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5 uppercase">#{ord.id?.slice(0, 8) || "N/A"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 px-1">
                          <div className="flex items-center gap-1.5">
                            <ShoppingBag className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                            <span className="text-[11px] text-zinc-600 dark:text-zinc-300 font-semibold">{totalPcs} Pcs</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                            <span className="text-[11px] text-zinc-600 dark:text-zinc-300 font-semibold line-clamp-1">{ord.customerName || ord.shippingAddress?.fullName || "Guest"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-center py-10 text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 font-medium">No orders found.</div>
                  )}
                </div>
              </div>
            )}

            {/* --- ORDER DETAILS --- */}
            {selectedOrderId && (() => {
              const order = orders.find(o => o.id === selectedOrderId);
              if (!order) return <div className="p-10 text-center">Order not found.</div>;

              const orderSubtotal = order.items?.reduce((acc: number, item: any) => acc + (Number(item.price || item.priceAtPurchase || 0) * Number(item.quantity || 1)), 0) || order.total || 0;
              const shippingCharge = order.shippingFee || 0;
              const taxAmount = order.taxAmount || 0;
              const discountAmount = order.discountAmount || 0;
              const totalAmount = (orderSubtotal + shippingCharge + taxAmount) - discountAmount;
              
              // Calculate Advance Paid
              let advancePaid = 0;
              const isCod = order.paymentMethod === "Cash on Delivery" || order.paymentMethod?.toLowerCase().includes("cash on delivery");
              if (!isCod) {
                if (order.paymentOption === "Full Payment") {
                  advancePaid = totalAmount;
                } else {
                  advancePaid = Number(order.advancePaid || order.advanceAmount || 0);
                  if (!advancePaid && order.items) {
                     // Check if any items had advance amount required
                     advancePaid = order.items.reduce((sum: number, item: any) => {
                        const adv = Number(item.advanceAmount || 0);
                        return sum + (adv * (item.quantity || 1));
                     }, 0);
                  }
                  if (!advancePaid && defaultAdvanceAmount) {
                     advancePaid = Number(defaultAdvanceAmount);
                  }
                }
              }

              const dueAmount = Math.max(0, totalAmount - advancePaid);

              return (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500 pb-8">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <button 
                      onClick={() => setSelectedOrderId(null)} 
                      className="w-10 h-10 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl flex items-center justify-center shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 shrink-0"
                    >
                      <ArrowLeft className="w-5 h-5 text-zinc-800 dark:text-zinc-200" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-[17px] font-bold text-zinc-900 dark:text-zinc-100 leading-tight">Order Details</h2>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 font-medium truncate mt-0.5">ID: #{order.id}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div className="bg-white dark:bg-zinc-900 rounded-[1.5rem] p-5 shadow-sm border border-zinc-100 dark:border-zinc-800 dark:border-zinc-800 space-y-5">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Customer Info</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 dark:text-zinc-500">
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-0.5">{order.customerName || order.shippingAddress?.fullName || "Guest User"}</h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 font-medium">#{order.id.slice(0, 8)}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          if (order.userId && order.userId !== "guest") {
                            navigate(`/messages?chatId=${order.userId}`);
                          } else {
                            notify("Guest users cannot be messaged directly", "error");
                          }
                        }}
                        className="w-10 h-10 bg-[#F5F5F7] dark:bg-zinc-800 hover:bg-[#EAEAEF] dark:hover:bg-zinc-700 rounded-full flex items-center justify-center transition-colors"
                      >
                        <MessageSquare className="w-5 h-5 fill-zinc-600 text-zinc-600 dark:text-zinc-300" />
                      </button>
                    </div>
                    <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">{(typeof order.shippingAddress === 'string' ? order.shippingAddress : order.shippingAddress?.address) || "No address specified"}</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Phone className="w-4 h-4 text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">{order.contactNumber || order.shippingAddress?.phone || "No phone specified"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="bg-white dark:bg-zinc-900 rounded-[1.5rem] p-5 shadow-sm border border-zinc-100 dark:border-zinc-800 dark:border-zinc-800 space-y-4">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Order Items</h3>
                    <div className="space-y-4">
                      {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className={`flex items-center justify-between ${idx !== order.items.length - 1 ? "pb-4 border-b border-zinc-100 dark:border-zinc-800" : ""}`}>
                           <div className="flex items-center gap-3">
                             <div className="w-12 h-12 rounded-2xl bg-[#F5F5F7] dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 dark:border-zinc-800 overflow-hidden p-1 flex items-center justify-center shrink-0">
                               {item.image || item.modelUrl ? (
                                 <img src={item.image || item.modelUrl} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                               ) : <Package className="w-5 h-5 text-zinc-300" />}
                             </div>
                             <div>
                               <h4 className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100 mb-0.5 line-clamp-1">{item.name}</h4>
                               <p className="text-[11px] text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 font-medium">Qty: {item.quantity || 1} {item.size ? `/ Size: ${item.size}` : ''}</p>
                             </div>
                           </div>
                           <div className="text-right">
                             <p className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100 mb-0.5">{formatPrice((item.price || item.priceAtPurchase || 0) * (item.quantity || 1))}</p>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price Details */}
                  <div className="bg-white dark:bg-zinc-900 rounded-[1.5rem] p-5 shadow-sm border border-zinc-100 dark:border-zinc-800 dark:border-zinc-800 space-y-4">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mb-2">Price Details</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[12px] font-medium text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">
                        <span>Order Amount</span>
                        <span className="text-zinc-900 dark:text-zinc-100 font-bold">{formatPrice(orderSubtotal)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between items-center text-[12px] font-medium text-emerald-600">
                          <span>Promo/Discount</span>
                          <span className="font-bold">-{formatPrice(discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-[12px] font-medium text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">
                        <span>Delivery</span>
                        <span className="text-zinc-900 dark:text-zinc-100 font-bold">{formatPrice(shippingCharge)}</span>
                      </div>
                      {taxAmount > 0 && (
                        <div className="flex justify-between items-center text-[12px] font-medium text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">
                          <span>Tax</span>
                          <span className="text-zinc-900 dark:text-zinc-100 font-bold">{formatPrice(taxAmount)}</span>
                        </div>
                      )}
                      
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                        <span className="text-[12px] font-bold text-zinc-900 dark:text-zinc-100">Grand Total</span>
                        <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">{formatPrice(totalAmount)}</span>
                      </div>

                      <div className="space-y-2 bg-orange-50/70 dark:bg-zinc-800/40 p-3.5 rounded-2xl border border-orange-100/50 dark:border-zinc-700/50 mt-3">
                        <div className="flex items-center gap-1.5 text-orange-800 dark:text-orange-400 font-extrabold text-[11px] uppercase tracking-wider mb-1">
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Payment & Transaction Details</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 dark:text-zinc-300">
                          <div>
                            <span className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Method</span>
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 dark:text-zinc-100 capitalize">{order.paymentMethod || "MFS / Cash"}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Option</span>
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 dark:text-zinc-100">{order.paymentOption || (isCod ? "Cash on Delivery" : "Advance Payment")}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Amount Paid</span>
                            <span className="font-extrabold text-orange-600 dark:text-orange-400">{formatPrice(isCod ? 0 : (order.paymentOption === "Full Payment" ? totalAmount : advancePaid))}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Due Amount</span>
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 dark:text-zinc-100">{formatPrice(isCod ? totalAmount : dueAmount)}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Sender Number</span>
                            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 dark:text-zinc-100 select-all">{order.accountNameSender || order.senderNumber || order.senderPhone || "Not provided"}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Trx ID</span>
                            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 dark:text-zinc-100 select-all bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-750/50 dark:border-zinc-850 inline-block truncate max-w-full">{order.transactionId || order.trxId || "Not provided"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-between items-center border-t border-zinc-100 dark:border-zinc-800">
                        <span className="text-[13px] font-bold text-rose-600">Due Amount (COD)</span>
                        <span className="text-lg font-black text-rose-600">{formatPrice(dueAmount)}</span>
                      </div>
                    </div>

                    {/* Order Status Manager & Actions */}
                    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                      {/* Cancellation Reason Banner if Cancelled */}
                      {order.status === OrderStatus.CANCELLED && order.rejectReason && (
                        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3.5">
                          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-1">Rejection Reason</p>
                          <p className="text-xs font-semibold text-rose-700">{order.rejectReason}</p>
                        </div>
                      )}

                      {/* Quick Actions for Pending Orders */}
                      {(order.status === "Pending" || order.status === OrderStatus.PENDING || order.status === "New Order") && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Quick Decision</p>
                          <div className="flex gap-3">
                            <button 
                              onClick={() => { updateOrderStatus(order.id, OrderStatus.CANCELLED); }}
                              className="flex-1 h-12 bg-rose-500 hover:bg-rose-600 rounded-xl flex items-center justify-center gap-2 text-white text-sm font-bold shadow-sm shadow-rose-500/10 transition-all"
                            >
                              Reject <X className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => { updateOrderStatus(order.id, OrderStatus.APPROVED); }}
                              className="flex-1 h-12 bg-[#EF8020] hover:bg-[#d97017] rounded-xl flex items-center justify-center gap-2 text-white text-sm font-bold shadow-sm shadow-orange-500/10 transition-all"
                            >
                              Accept (Approve) <Check className="w-4 h-4" strokeWidth={3} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Custom Status Update Dropdown */}
                      <div className="space-y-1.5 relative">
                        <Label className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Update Order Status</Label>
                        <div>
                          <button 
                            type="button"
                            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                            className="w-full h-12 px-4 rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 hover:bg-[#EAEAEF] dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-bold flex items-center justify-between transition-colors shadow-inner text-left"
                          >
                            <span>{order.status || "Select Status"}</span>
                            <ChevronDown className="w-4 h-4 text-zinc-500 dark:text-zinc-400 dark:text-zinc-500" />
                          </button>

                          {statusDropdownOpen && (
                            <>
                              {/* Overlay to catch clicks and close */}
                              <div className="fixed inset-0 z-40" onClick={() => setStatusDropdownOpen(false)} />
                              
                              <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 dark:border-zinc-800 rounded-2xl shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-60 overflow-y-auto">
                                {([
                                  { value: OrderStatus.PENDING, label: "Pending" },
                                  { value: OrderStatus.APPROVED, label: "Approved" },
                                  { value: OrderStatus.PROCESSING, label: "Processing" },
                                  { value: "Checking Payment", label: "Checking Payment" },
                                  { value: "Complete Packaging", label: "Complete Packaging" },
                                  { value: "Deliver on Courier", label: "Deliver on Courier" },
                                  { value: OrderStatus.ON_THE_WAY || "On Courier / Shipped", label: "On Courier / Shipped" },
                                  { value: OrderStatus.DELIVERED, label: "Delivered" },
                                  { value: OrderStatus.CANCELLED, label: "Cancelled" },
                                  ...(sellerProfile?.canUseCourierShipping ? [
                                    { value: OrderStatus.SHIPPED_IN_COURIER, label: "Shipped in Courier" },
                                    { value: OrderStatus.RETURNED, label: "Returned" }
                                  ] : [])
                                ]).map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                      updateOrderStatus(order.id, opt.value as OrderStatus);
                                      setStatusDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center justify-between transition-colors ${
                                      order.status === opt.value 
                                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" 
                                        : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:text-zinc-100"
                                    }`}
                                  >
                                    <span>{opt.label}</span>
                                    {order.status === opt.value && <Check className="w-4 h-4 text-[#EF8020]" strokeWidth={3} />}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Tracking ID update for Shipped / On Courier orders */}
                      {(order.status === OrderStatus.ON_THE_WAY || order.status === "On Courier / Shipped") && (
                        <div className="pt-2">
                          <Label className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-1.5">Courier Tracking ID</Label>
                          <div className="flex gap-2">
                            <Input 
                              placeholder="Enter tracking number..." 
                              defaultValue={order.trackingId || ""} 
                              onBlur={(e) => updateOrderTrackingId(order.id, e.target.value)} 
                              className="rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-transparent dark:border-zinc-700 h-11 text-xs font-medium" 
                            />
                          </div>
                        </div>
                      )}
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

            {/* --- STORE SETTINGS TAB --- */}
            {activeTab === "settings_store" && !selectedOrderId && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                 <h2 className="text-[17px] font-bold text-zinc-900 dark:text-zinc-100 mb-6">Store Settings</h2>
                 
                 <div className="bg-white dark:bg-zinc-900 rounded-[1.5rem] p-5 shadow-sm border border-zinc-100 dark:border-zinc-800 dark:border-zinc-800 space-y-6">
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
                          <Input value={shopName} onChange={e => setShopName(e.target.value)} placeholder="e.g. DEEP SHOP" className="rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 border-transparent dark:border-zinc-700 h-12 text-zinc-900 dark:text-zinc-100 dark:text-zinc-100" />
                       </div>
                       <div>
                          <Label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 ml-1 mb-1.5 block">Global Advance Payment (৳)</Label>
                          <Input type="number" value={defaultAdvanceAmount} onChange={e => setDefaultAdvanceAmount(e.target.value)} placeholder="0.00" className="rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 border-transparent dark:border-zinc-700 h-12 text-zinc-900 dark:text-zinc-100 dark:text-zinc-100" />
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 ml-1 mt-1">Default advance amount required for COD orders.</p>
                       </div>
                       <div>
                          <Label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 ml-1 mb-1.5 block">TikTok Username</Label>
                          <Input value={tiktokId} onChange={e => setTiktokId(e.target.value)} placeholder="@username" className="rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 border-transparent dark:border-zinc-700 h-12 text-zinc-900 dark:text-zinc-100 dark:text-zinc-100" />
                       </div>
                       {/* Multiple bKash Numbers */}
                       <div className="p-4 bg-pink-50/60 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-900/30 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                             <div>
                                <Label className="text-xs font-bold text-[#E2125B] dark:text-pink-300 block">
                                   Multiple bKash Numbers (বিকাশ নাম্বারসমূহ - রোটেশন করবে)
                                </Label>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                   একাধিক নাম্বার যোগ করুন। পেমেন্ট পেজ রিফ্রেশ করলে প্রতিবার স্বয়ংক্রিয়ভাবে পরিবর্তিত হবে।
                                </p>
                             </div>
                          </div>

                          <div className="flex gap-2">
                             <Input
                                value={newBkashInput}
                                onChange={(e) => setNewBkashInput(e.target.value)}
                                onKeyDown={(e) => {
                                   if (e.key === "Enter") {
                                      e.preventDefault();
                                      const val = newBkashInput.trim();
                                      if (!val) return;
                                      if (isForbiddenNumber(val)) {
                                         notify("01778953114 নম্বরটি সিস্টেমে অনুমোদিত নয়।", "error");
                                         return;
                                      }
                                      if (bkashNumbers.includes(val)) {
                                         notify("এই নাম্বারটি ইতিমধ্যে তালিকায় রয়েছে", "error");
                                         return;
                                      }
                                      const next = [...bkashNumbers, val];
                                      setBkashNumbers(next);
                                      setBkashNumber(next[0] || "");
                                      setNewBkashInput("");
                                      saveStoreSettings({ bkashNumbers: next, bkashNumber: next[0] || "" });
                                   }
                                }}
                                placeholder="নতুন বিকাশ নাম্বার লিখুন (যেমন: 017XXXXXXXX)"
                                className="rounded-xl bg-white dark:bg-zinc-800 border-pink-200 dark:border-pink-800/40 h-11 text-xs text-zinc-900 dark:text-zinc-100 flex-1"
                             />
                             <Button
                                type="button"
                                onClick={() => {
                                   const val = newBkashInput.trim();
                                   if (!val) return;
                                   if (isForbiddenNumber(val)) {
                                      notify("01778953114 নম্বরটি সিস্টেমে অনুমোদিত নয়।", "error");
                                      return;
                                   }
                                   if (bkashNumbers.includes(val)) {
                                      notify("এই নাম্বারটি ইতিমধ্যে তালিকায় রয়েছে", "error");
                                      return;
                                   }
                                   const next = [...bkashNumbers, val];
                                   setBkashNumbers(next);
                                   setBkashNumber(next[0] || "");
                                   setNewBkashInput("");
                                   saveStoreSettings({ bkashNumbers: next, bkashNumber: next[0] || "" });
                                }}
                                className="h-11 bg-[#E2125B] hover:bg-[#c20e4d] text-white rounded-xl text-xs font-bold px-4"
                             >
                                + Add bKash
                             </Button>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-1">
                             {bkashNumbers.map((num, i) => (
                                <div
                                   key={i}
                                   className="flex items-center gap-2 bg-white dark:bg-zinc-800 border border-pink-300 dark:border-pink-800 px-3 py-1.5 rounded-xl shadow-xs"
                                >
                                   <span className="text-[11px] font-black text-[#E2125B]">#{i + 1}</span>
                                   <span className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">{num}</span>
                                   <button
                                      type="button"
                                      onClick={() => {
                                         const next = bkashNumbers.filter((_, idx) => idx !== i);
                                         setBkashNumbers(next);
                                         setBkashNumber(next[0] || "");
                                         saveStoreSettings({ bkashNumbers: next, bkashNumber: next[0] || "" });
                                      }}
                                      className="text-zinc-400 hover:text-red-500 font-bold ml-1 text-xs"
                                   >
                                      ✕
                                   </button>
                                </div>
                             ))}
                             {bkashNumbers.length === 0 && (
                                <p className="text-[11px] text-pink-700/70 dark:text-pink-400/70 font-medium">কোনো বিকাশ নাম্বার যোগ করা নেই</p>
                             )}
                          </div>
                       </div>

                       {/* Multiple Nagad Numbers */}
                       <div className="p-4 bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                             <div>
                                <Label className="text-xs font-bold text-[#F57C20] dark:text-orange-300 block">
                                   Multiple Nagad Numbers (নগদ নাম্বারসমূহ - রোটেশন করবে)
                                </Label>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                   একাধিক নাম্বার যোগ করুন। পেমেন্ট পেজ রিফ্রেশ করলে প্রতিবার স্বয়ংক্রিয়ভাবে পরিবর্তিত হবে।
                                </p>
                             </div>
                          </div>

                          <div className="flex gap-2">
                             <Input
                                value={newNagadInput}
                                onChange={(e) => setNewNagadInput(e.target.value)}
                                onKeyDown={(e) => {
                                   if (e.key === "Enter") {
                                      e.preventDefault();
                                      const val = newNagadInput.trim();
                                      if (!val) return;
                                      if (isForbiddenNumber(val)) {
                                         notify("01778953114 নম্বরটি সিস্টেমে অনুমোদিত নয়।", "error");
                                         return;
                                      }
                                      if (nagadNumbers.includes(val)) {
                                         notify("এই নাম্বারটি ইতিমধ্যে তালিকায় রয়েছে", "error");
                                         return;
                                      }
                                      const next = [...nagadNumbers, val];
                                      setNagadNumbers(next);
                                      setNagadNumber(next[0] || "");
                                      setNewNagadInput("");
                                      saveStoreSettings({ nagadNumbers: next, nagadNumber: next[0] || "" });
                                   }
                                }}
                                placeholder="নতুন নগদ নাম্বার লিখুন (যেমন: 018XXXXXXXX)"
                                className="rounded-xl bg-white dark:bg-zinc-800 border-orange-200 dark:border-orange-800/40 h-11 text-xs text-zinc-900 dark:text-zinc-100 flex-1"
                             />
                             <Button
                                type="button"
                                onClick={() => {
                                   const val = newNagadInput.trim();
                                   if (!val) return;
                                   if (isForbiddenNumber(val)) {
                                      notify("01778953114 নম্বরটি সিস্টেমে অনুমোদিত নয়।", "error");
                                      return;
                                   }
                                   if (nagadNumbers.includes(val)) {
                                      notify("এই নাম্বারটি ইতিমধ্যে তালিকায় রয়েছে", "error");
                                      return;
                                   }
                                   const next = [...nagadNumbers, val];
                                   setNagadNumbers(next);
                                   setNagadNumber(next[0] || "");
                                   setNewNagadInput("");
                                   saveStoreSettings({ nagadNumbers: next, nagadNumber: next[0] || "" });
                                }}
                                className="h-11 bg-[#F57C20] hover:bg-[#d96714] text-white rounded-xl text-xs font-bold px-4"
                             >
                                + Add Nagad
                             </Button>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-1">
                             {nagadNumbers.map((num, i) => (
                                <div
                                   key={i}
                                   className="flex items-center gap-2 bg-white dark:bg-zinc-800 border border-orange-300 dark:border-orange-800 px-3 py-1.5 rounded-xl shadow-xs"
                                >
                                   <span className="text-[11px] font-black text-[#F57C20]">#{i + 1}</span>
                                   <span className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">{num}</span>
                                   <button
                                      type="button"
                                      onClick={() => {
                                         const next = nagadNumbers.filter((_, idx) => idx !== i);
                                         setNagadNumbers(next);
                                         setNagadNumber(next[0] || "");
                                         saveStoreSettings({ nagadNumbers: next, nagadNumber: next[0] || "" });
                                      }}
                                      className="text-zinc-400 hover:text-red-500 font-bold ml-1 text-xs"
                                   >
                                      ✕
                                   </button>
                                </div>
                             ))}
                             {nagadNumbers.length === 0 && (
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
        <NavItem icon="receipt" label="Orders" tab="orders" badge={orders.filter((o: any) => o.status === "pending").length} />
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
                onClick={() => setCancelModalOrderId(null)} 
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
                onClick={() => setCancelModalOrderId(null)} 
                className="flex-1 h-12 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl"
              >
                Go Back
              </button>
              <button 
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
