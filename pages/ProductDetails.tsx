import { useRegion } from "@/components/RegionContext";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  setDoc,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { Product, Review } from "../types";
import { useNotify, useConfirm } from "../components/Notifications";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import Icon from "../components/Icon";
import { triggerHaptic } from "../lib/haptics";
import { getSafeDisplayName, getPublicShareOrigin } from "../lib/utils";
import SEO from "../components/SEO";
import { PixelImage } from "../components/ui/PixelImage";
import { getProductDisplayImage } from "../src/lib/phonePartsArt";
import { getProductCoinReward } from "../lib/coinRewards";
import { CustomSectionEmbed } from "../components/CustomSectionEmbed";
import { useTheme } from "../components/ThemeContext";
import { CommentReply } from "../components/ui/comment-reply";
import { ReviewComposer } from "../components/ui/review-composer";
import { filterSafeReviews } from "../lib/reviewModeration";
import { SellerBadge, VerifiedIcon } from "../components/SellerBadge";
import { AlertCircle, MessageSquare, MessageCircle } from "lucide-react";
import NotFound from "./NotFound";

import {
  ReviewFilterGroup,
  ReviewFilterItem,
} from "../components/ui/review-filter-bars";
import { ReviewCard } from "../components/ui/review-card";
import {
  ChevronRight,
  ChevronLeft,
  Star,
  Heart,
  Share2,
  ShoppingCart,
  Camera,
  Zap,
  CheckCircle2,
  Box,
  ShieldCheck,
  Bell,
  X,
  Trash2,
  Plus,
  Minus,
  Pen,
} from "lucide-react";
import { ImageLightbox } from "../components/ui/image-lightbox";
import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Tr } from "../components/Tr";
import { ProductCard } from "../components/ui/ProductCard";

const ProductDetails: React.FC = () => {
  const { formatPrice } = useRegion();
  const { id, slug } = useParams();
  const { isDark, toggleTheme } = useTheme();
  const [product, setProduct] = useState<Product | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [sellerReviews, setSellerReviews] = useState<any[]>([]);
  const [resolvedId, setResolvedId] = useState<string | null>(id || null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewFilter, setReviewFilter] = useState<
    "all" | "photos" | "5" | "4" | "3" | "2" | "1"
  >("all");
  const [reviewComposerOpen, setReviewComposerOpen] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [bundleItems, setBundleItems] = useState<Product[]>([]);
  const [timeLeft, setTimeLeft] = useState<{
    d: number;
    h: number;
    m: number;
    s: number;
  } | null>(null);
  const [mysteryOffer, setMysteryOffer] = useState<{
    discountPrice: number;
    expiresAt: number;
    discountPct: number;
  } | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeInfoTab, setActiveInfoTab] = useState<
    "description" | "policy" | "faq" | "video"
  >("description");
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addingBundle, setAddingBundle] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [notifying, setNotifying] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState<string>("");

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 4) {
      return "Time to sleep";
    } else if (hours < 12) {
      return "Good Morning";
    } else if (hours < 17) {
      return "Good Afternoon";
    } else if (hours < 21) {
      return "Good Evening";
    } else {
      return "Good Night";
    }
  };

  const getActualCoinReward = (p: any): number => {
    if (!p) return 0;
    if (p.coinReward !== undefined && p.coinReward !== null && String(p.coinReward).trim() !== "") {
      return Number(p.coinReward);
    }
    return getProductCoinReward(p.id);
  };
  const actualReward = getActualCoinReward(product);

  const [showSideCart, setShowSideCart] = useState(true);
  const [showOrdersPausedModal, setShowOrdersPausedModal] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem("f_cart") || "[]");
    setCartItems(cart);

    const handleStorage = () => {
      setCartItems(JSON.parse(localStorage.getItem("f_cart") || "[]"));
    };
    window.addEventListener("update_cart", handleStorage);
    return () => window.removeEventListener("update_cart", handleStorage);
  }, []);

  const notify = useNotify();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const handleNotifyMe = async () => {
    if (!product) return;
    setNotifying(true);
    try {
      await setDoc(doc(collection(db, "restock_notifications")), {
        productId: product.id,
        productName: product.name,
        userEmail: auth.currentUser?.email || "guest",
        userId: auth.currentUser?.uid || "guest",
        createdAt: Date.now(),
      });
      notify("We'll notify you when it's back in stock!", "success");
    } catch (e) {
      notify("Could not set up notification.", "error");
    }
    setTimeout(() => setNotifying(false), 2000);
  };

  const toSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        getDoc(doc(db, "users", user.uid)).then((d) => {
          if (d.exists()) {
            const data = d.data();
            setUserName(
              getSafeDisplayName(
                { ...data, displayName: data.displayName || user.displayName, email: data.email || user.email },
                "User"
              )
            );
            if (data.isAffiliate && data.affiliateCode) {
              setAffiliateCode(data.affiliateCode);
            }
            if (
              data.role === "admin" ||
              data.role === "staff" ||
              user.email === "admin@deep.shop" ||
              user.email === "vibegadgetfeni@gmail.com" ||
              user.email === "deepshop@gmail.com" ||
              user.email === "deepshopbysam@gmail.com"
            ) {
              setIsAdmin(true);
            }
          } else {
            setUserName(getSafeDisplayName(user, "User"));
          }
        });
      } else {
        setUserName("");
        setAffiliateCode(null);
        setIsAdmin(false);
      }
    });

    const unsubscribeSettings = onSnapshot(
      doc(db, "settings", "platform"),
      (snap) => {
        if (snap.exists()) setSettings(snap.data());
      },
    );

    return () => {
      unsubAuth();
      unsubscribeSettings();
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    setActiveImg(0);
    setQuantity(1);
    setActiveInfoTab("description");

    let unsubscribe: () => void;
    let didIncrement = false;
    
    if (id) {
      unsubscribe = onSnapshot(doc(db, "products", id), async (snap) => {
        if (snap.exists()) {
          const matchedProduct = { id: snap.id, ...snap.data() } as Product;
          setProduct(matchedProduct);
          setResolvedId(snap.id);
          setIsNotFound(false);
          if (!slug || slug !== toSlug(matchedProduct.name)) {
            window.history.replaceState(null, "", `/${toSlug(matchedProduct.name)}`);
          }
          if (!didIncrement) {
             didIncrement = true;
             try {
               const { increment, updateDoc } = await import("firebase/firestore");
               await updateDoc(doc(db, "products", snap.id), { views: increment(1) });
             } catch (e) {}
          }
        } else {
          setIsNotFound(true);
        }
      });
    } else if (slug) {
      unsubscribe = onSnapshot(query(collection(db, "products")), async (snap) => {
        const allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Product);
        const matchedProduct = allProducts.find(
          (p) => toSlug(p.name) === slug || p.name === decodeURIComponent(slug),
        );
        if (matchedProduct) {
          setProduct(matchedProduct);
          setResolvedId(matchedProduct.id);
          setIsNotFound(false);
          if (slug !== toSlug(matchedProduct.name)) {
            window.history.replaceState(null, "", `/${toSlug(matchedProduct.name)}`);
          }
          if (!didIncrement) {
              didIncrement = true;
              try {
                const { increment, updateDoc } = await import("firebase/firestore");
                await updateDoc(doc(db, "products", matchedProduct.id), { views: increment(1) });
              } catch (e) {}
          }
        } else {
          setIsNotFound(true);
        }
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [id, slug]);

  useEffect(() => {
    if (product && product.sellerId) {
      getDoc(doc(db, "users", product.sellerId))
        .then((snap) => {
          if (snap.exists()) {
            setSellerInfo({ id: snap.id, ...snap.data() });
          } else {
            setSellerInfo(null);
          }
        })
        .catch((e) => {
          console.error("Error fetching seller info:", e);
          setSellerInfo(null);
        });

      // Fetch all reviews for this seller
      const qReviews = query(collection(db, "reviews"), where("sellerId", "==", product.sellerId));
      getDocs(qReviews)
        .then((snap) => {
          setSellerReviews(snap.docs.map((d) => d.data()));
        })
        .catch((err) => {
          console.error("Error fetching seller reviews:", err);
        });
    } else {
      setSellerInfo(null);
      setSellerReviews([]);
    }
  }, [product]);

  useEffect(() => {
    if (!product) return;

    // Behavioral Targeting: Track browsed categories
    if (product.category) {
      try {
        const storedViews = localStorage.getItem("vibe_category_views");
        let views: Record<string, number> = {};
        if (storedViews) {
          views = JSON.parse(storedViews);
        }
        views[product.category] = (views[product.category] || 0) + 1;
        localStorage.setItem("vibe_category_views", JSON.stringify(views));

        // Find the category with maximum views
        let favorite = "";
        let maxViews = -1;
        for (const cat in views) {
          if (views[cat] > maxViews) {
            maxViews = views[cat];
            favorite = cat;
          }
        }
        if (favorite) {
          localStorage.setItem("vibe_favorite_category", favorite);
        }
      } catch (e) {}
    }
  }, [product, mysteryOffer]);

  useEffect(() => {
    if (resolvedId) {
      if (settings?.mysteryBoxActive === false) {
        if (mysteryOffer) setMysteryOffer(null);
      } else {
        try {
          const boxOffer = JSON.parse(
            localStorage.getItem("vibe_mystery_box") || "{}",
          );
          if (
            boxOffer.result === "win" &&
            !boxOffer.used &&
            boxOffer.productId === resolvedId &&
            boxOffer.expiresAt > Date.now()
          ) {
            setMysteryOffer({
              discountPrice: boxOffer.discountPrice,
              expiresAt: boxOffer.expiresAt,
              discountPct: boxOffer.discountPct,
            });
          }
        } catch (e) {}
      }

      const q = query(
        collection(db, "reviews"),
        where("productId", "==", resolvedId),
      );
      const unsubscribeReviews = onSnapshot(
        q,
        (snapshot) => {
          const rawList = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as Review,
          );
          const reviewList = filterSafeReviews(rawList);
          reviewList.sort((a, b) => b.createdAt - a.createdAt);
          setReviews(reviewList);
        },
        (err) => console.warn("Reviews fetch error:", err.message),
      );

      let unsubscribeWishlist = () => {};
      if (auth.currentUser) {
        const wishlistRef = doc(
          db,
          "users",
          auth.currentUser.uid,
          "wishlist",
          resolvedId,
        );
        unsubscribeWishlist = onSnapshot(
          wishlistRef,
          (snap) => {
            setIsWishlisted(snap.exists());
          },
          (err) => console.warn("Wishlist fetch error:", err.message),
        );
      }

      return () => {
        unsubscribeReviews();
        unsubscribeWishlist();
      };
    }
  }, [resolvedId, auth.currentUser, settings?.mysteryBoxActive]);

  useEffect(() => {
    if (!product || !resolvedId) return;
    const productQ = query(
      collection(db, "products"),
      where("category", "==", product.category || ""),
    );
    const unsubscribeProducts = onSnapshot(productQ, (snap) => {
      const allProducts = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Product,
      );
      let others = allProducts.filter((p) => p.id !== resolvedId);
      others = others.sort(() => 0.5 - Math.random());
      setBundleItems(others.slice(0, 4));
    });
    return () => unsubscribeProducts();
  }, [product?.category, resolvedId]);

  useEffect(() => {
    let interval: HTMLInputElement | null | number = null;

    const validateAndSetTime = (endTime: number) => {
      const now = Date.now();
      const distance = endTime - now;
      if (distance < 0) {
        setTimeLeft(null);
        if (mysteryOffer) setMysteryOffer(null); // Expire mystery offer
        clearInterval(interval as number);
      } else {
        setTimeLeft({
          d: Math.floor(distance / (1000 * 60 * 60 * 24)),
          h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    };

    if (mysteryOffer) {
      // Enforce Mystery Offer timer
      interval = window.setInterval(
        () => validateAndSetTime(mysteryOffer.expiresAt),
        1000,
      );
    } else if (product?.isOffer && product?.offerEndTime) {
      interval = window.setInterval(
        () => validateAndSetTime(product.offerEndTime!),
        1000,
      );
    }
    return () => {
      if (interval) clearInterval(interval as number);
    };
  }, [product, mysteryOffer]);

  const toggleWishlist = async () => {
    triggerHaptic();
    if (!auth.currentUser)
      return notify("Please sign in to save items", "info");
    if (!product || !resolvedId) return;

    const wishlistRef = doc(
      db,
      "users",
      auth.currentUser.uid,
      "wishlist",
      resolvedId,
    );
    try {
      if (isWishlisted) {
        await deleteDoc(wishlistRef);
        notify("Removed from wishlist.", "info");
      } else {
        await setDoc(wishlistRef, {
          productId: resolvedId,
          name: product.name,
          image: product.image || (product.images && product.images[0]) || "",
          price: product.price,
          rating: product.rating,
          addedAt: Date.now(),
        });
        notify("Added to wishlist!", "success");
      }
    } catch (e) {
      notify("Failed to update wishlist.", "error");
    }
  };

  const addToCart = (redirect = false) => {
    triggerHaptic();
    if (!product) return;
    
    if (sellerInfo?.ordersPaused) {
      setShowOrdersPausedModal(true);
      return;
    }

    if (!redirect) setAddingToCart(true);

    // We update local storage but do a small delay before navigating
    setTimeout(
      () => {
        let cart = JSON.parse(localStorage.getItem("f_cart") || "[]");
        if (redirect) {
          cart = []; // Clear other items for buy now
        }

        const existingIndex = cart.findIndex(
          (item: any) => item.id === product.id,
        );

        const offerPrice = mysteryOffer
          ? Number(mysteryOffer.discountPrice)
          : product.isOffer && product.offerPrice
            ? Number(product.offerPrice)
            : Number(product.price);

        const safeQty = Math.max(
          1,
          Math.min(
            quantity,
            product.stock && product.stock > 0 ? product.stock : 99
          )
        );

        if (existingIndex > -1) {
          cart[existingIndex].quantity += safeQty;
          cart[existingIndex].price = offerPrice;
        } else {
          cart.push({
            ...product,
            price: offerPrice,
            originalPrice: Number(product.price),
            quantity: safeQty,
            isMysteryOffer: !!mysteryOffer,
          });
        }

        localStorage.setItem("f_cart", JSON.stringify(cart));
        window.dispatchEvent(new Event("update_cart"));
        setShowSideCart(true);

        if (mysteryOffer) {
          try {
            const boxOffer = JSON.parse(
              localStorage.getItem("vibe_mystery_box") || "{}",
            );
            if (boxOffer.productId === product.id) {
              boxOffer.used = true;
              localStorage.setItem(
                "vibe_mystery_box",
                JSON.stringify(boxOffer),
              );
            }
          } catch (e) {}
        }

        if (redirect) {
          navigate("/checkout");
        } else {
          setAddingToCart(false);
          notify("Added to cart!", "success");
        }
      },
      redirect ? 0 : 200,
    );
  };

  const handleGroupBuy = () => {
    triggerHaptic();
    if (!product) return;
    
    let cart = [];
    try { cart = JSON.parse(localStorage.getItem('f_cart') || '[]'); } catch(e) {}
    
    const discountAmount = product.price * 0.02;
    const groupPrice = product.price - discountAmount;
    
    cart.push({
       ...product,
       price: groupPrice,
       quantity: 1,
       isGroupBuy: true
    });
    
    localStorage.setItem('f_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event("storage"));
    notify('Group Buy complete! Item added to cart at discounted price.', 'success');
  };

  const changeImage = (index: number) => {
    setDirection(index > activeImg ? 1 : -1);
    setActiveImg(index);
  };

  const handleBundleAddToCart = () => {
    triggerHaptic();
    if (!product) return;
    setAddingBundle(true);

    setTimeout(() => {
      const itemsToAdd = [product, ...bundleItems];
      let cart: any[] = [];
      try {
        cart = JSON.parse(localStorage.getItem("f_cart") || "[]");
      } catch (e) {}

      itemsToAdd.forEach((item) => {
        const offerPrice =
          item.isOffer && item.offerPrice ? item.offerPrice : item.price;
        const existing = cart.find((c: any) => c.id === item.id);
        if (existing) {
          existing.quantity += 1;
        } else {
          cart.push({
            ...item,
            quantity: 1,
            originalPrice: item.price,
            price: offerPrice * 0.9,
          });
        }
      });
      localStorage.setItem("f_cart", JSON.stringify(cart));

      setTimeout(() => {
        setAddingBundle(false);
        navigate("/cart");
      }, 600);
    }, 200);
  };

  if (isNotFound) return <NotFound />;

  if (!product) {
    return (
      <div className="w-full min-h-[calc(100vh-56px)] ds-liquid-checkout-shell py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="ds-liquid-panel p-4 flex items-center justify-between gap-4">
            <div className="h-5 w-48 rounded-full ds-skeleton" />
            <div className="h-9 w-36 rounded-full ds-skeleton hidden sm:block" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
            <div className="lg:col-span-7 ds-liquid-panel p-6 space-y-4">
              <div className="aspect-square sm:aspect-[4/3] w-full rounded-3xl ds-skeleton" />
              <div className="flex gap-3">
                <div className="w-16 h-16 rounded-2xl ds-skeleton" />
                <div className="w-16 h-16 rounded-2xl ds-skeleton" />
                <div className="w-16 h-16 rounded-2xl ds-skeleton" />
              </div>
            </div>
            <div className="lg:col-span-5 ds-liquid-panel p-6 space-y-4">
              <div className="h-4 w-40 rounded-full ds-skeleton" />
              <div className="h-8 w-4/5 rounded-2xl ds-skeleton" />
              <div className="h-28 w-full rounded-2xl ds-skeleton" />
              <div className="h-12 w-full rounded-full ds-skeleton" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const images =
    product.images && product.images.length > 0 && product.images[0]
      ? product.images
      : product.image
        ? [product.image]
        : [getProductDisplayImage(product)];

  const basePrice = mysteryOffer
    ? mysteryOffer.discountPrice
    : product.isOffer && product.offerPrice
      ? product.offerPrice
      : product.price;

  const liveReviewCount =
    reviews.length > 0 ? reviews.length : Number(product.numReviews || 0);
  const liveAverageRating =
    reviews.length > 0
      ? Number(
          (
            reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) /
            reviews.length
          ).toFixed(1)
        )
      : Number(product.rating || 0);

  const filteredProductReviews = reviews.filter((r) => {
    if (reviewFilter === "photos") {
      return Array.isArray((r as any).images) && (r as any).images.length > 0;
    }
    if (["5", "4", "3", "2", "1"].includes(reviewFilter)) {
      return Math.round(Number(r.rating || 0)) === Number(reviewFilter);
    }
    return true;
  });

  const photoReviewsTotal = reviews.filter(
    (r) => Array.isArray((r as any).images) && (r as any).images.length > 0
  ).length;

  const handleDeleteProductReview = (reviewId: string) => {
    confirm({
      title: "Delete Review?",
      message: "Remove this customer review permanently?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "reviews", reviewId));
          notify("Review removed.", "info");
        } catch {
          notify("Could not delete review.", "error");
        }
      },
    });
  };

  const ratingVal = liveAverageRating > 0 ? liveAverageRating : 4.8;
  const reviewCountVal = liveReviewCount > 0 ? liveReviewCount : 8;

  const finalReviews = reviews && reviews.length > 0
    ? reviews.slice(0, 3).map((r) => ({
        "@type": "Review",
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": String(r.rating || 5),
          "bestRating": "5",
          "worstRating": "1"
        },
        "author": {
          "@type": "Person",
          "name": r.userName || "Verified Buyer"
        },
        "reviewBody": r.comment || "Authentic and genuine product from DEEP SHOP."
      }))
    : [
        {
          "@type": "Review",
          "reviewRating": {
            "@type": "Rating",
            "ratingValue": "5",
            "bestRating": "5",
            "worstRating": "1"
          },
          "author": {
            "@type": "Person",
            "name": "Verified Customer"
          },
          "reviewBody": "100% authentic and original product with official warranty support from DEEP SHOP."
        }
      ];

  const jsonLd = [
    {
      "@context": "https://schema.org/",
      "@type": "Product",
      name: product.name,
      image: images,
      description:
        product.description || `Buy ${product.name} at DEEP SHOP premium store. 100% authentic with fast delivery in Bangladesh.`,
      sku: product.id,
      mpn: product.id,
      productID: product.id,
      brand: {
        "@type": "Brand",
        name: product.brand || "DEEP SHOP"
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: ratingVal.toFixed(1),
        bestRating: "5",
        worstRating: "1",
        reviewCount: reviewCountVal,
      },
      review: finalReviews,
      offers: {
        "@type": "Offer",
        url: typeof window !== 'undefined' ? window.location.href : `https://www.deepshop.top/product/${product.id}`,
        priceCurrency: "BDT",
        price: Number(basePrice) || 0,
        priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        availability:
          (product.stock === undefined || product.stock > 0)
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/UsedCondition",
        hasMerchantReturnPolicy: {
          "@type": "MerchantReturnPolicy",
          applicableCountry: "BD",
          returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
          merchantReturnDays: 7,
          returnMethod: "https://schema.org/ReturnByMail",
          returnFees: "https://schema.org/ReturnFeesCustomerResponsibility"
        },
        shippingDetails: {
          "@type": "OfferShippingDetails",
          shippingRate: {
            "@type": "MonetaryAmount",
            value: 120,
            currency: "BDT"
          },
          shippingDestination: {
            "@type": "DefinedRegion",
            addressCountry: "BD"
          },
          deliveryTime: {
            "@type": "ShippingDeliveryTime",
            handlingTime: {
              "@type": "QuantitativeValue",
              minValue: 0,
              maxValue: 1,
              unitCode: "DAY"
            },
            transitTime: {
              "@type": "QuantitativeValue",
              minValue: 1,
              maxValue: 3,
              unitCode: "DAY"
            }
          }
        }
      },
      ...(product.videoUrl
        ? {
            subjectOf: {
              "@type": "VideoObject",
              "name": `${product.name} Video Review`,
              "description": `Video review and unboxing for ${product.name}`,
              "thumbnailUrl": product.images?.[0] || product.image,
              "uploadDate": new Date().toISOString(),
              "contentUrl": product.videoUrl
            }
          }
        : {})
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": window.location.origin,
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Products",
          "item": `${window.location.origin}/all-products`,
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": product.name,
          "item": window.location.href,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": `Is the ${product.name} Authentic?`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, absolutely! We guarantee 100% authenticity for all our border cross phones, mobiles and accessories at DEEP SHOP."
          }
        },
        {
          "@type": "Question",
          "name": "What is the delivery time?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Our border cross imported products standard delivery time is 1 month+ (approx 30-45 business days)."
          }
        }
      ]
    }
  ];

  const getSellerRatingValue = () => {
    const targetSeller = sellerInfo || { customRating: 0 };
    if (targetSeller.customRating !== undefined && targetSeller.customRating !== null && String(targetSeller.customRating).trim() !== "") {
      return Number(targetSeller.customRating);
    }
    if (sellerReviews && sellerReviews.length > 0) {
      const sum = sellerReviews.reduce((acc, r) => acc + (r.rating || 0), 0);
      return Number((sum / sellerReviews.length).toFixed(1));
    }
    return 0;
  };

  const sellerRating = getSellerRatingValue();

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const filledCount = rating % 1 > 0.7 ? fullStars + 1 : fullStars;

    return (
      <div className="flex items-center gap-1.5 flex-nowrap overflow-hidden shrink-0">
        <div className="flex items-center gap-0.5 shrink-0">
          {Array.from({ length: 5 }).map((_, i) => {
            const isFilled = i < filledCount;
            return (
              <Star
                key={i}
                className={`w-3.5 h-3.5 shrink-0 ${
                  isFilled
                    ? "text-amber-500 fill-amber-500"
                    : "text-zinc-300 dark:text-zinc-700"
                }`}
              />
            );
          })}
        </div>
        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 truncate shrink-0 tabular-nums">
          {rating > 0 ? `${rating.toFixed(1)} রেটিং` : "নতুন স্টোর"}
        </span>
      </div>
    );
  };

  // Payment & Advance Classification Info
  const paymentTermInfo = (() => {
    const p: any = product;
    const isBypass =
      p.isBypass ||
      p.productType === "bypass" ||
      p.category?.toLowerCase()?.includes("bypass");
    const isOffer = p.isOffer || p.productType === "offer";
    const isCustom =
      p.productType === "custom" ||
      (p.advanceType === "custom" && p.advanceAmount);

    if (isBypass) {
      return {
        label: "ক্যাশ অন ডেলিভারি (COD)",
        sublabel: "অগ্রিম ছাড়াই পণ্য হাতে পেয়ে মূল্য পরিশোধের সুবিধা",
        boxClass: "ds-liquid-callout-emerald",
        accentText: "text-emerald-700 dark:text-emerald-300",
      };
    }
    if (isOffer) {
      return {
        label: "১০০% ফুল এডভান্স",
        sublabel: "স্পেশাল অফার প্রাইসে অর্ডার বুকিংয়ের জন্য পূর্ণ অগ্রিম প্রযোজ্য",
        boxClass: "ds-liquid-callout-rose",
        accentText: "text-rose-700 dark:text-rose-300",
      };
    }
    if (isCustom && p.advanceAmount) {
      return {
        label: `৳${p.advanceAmount} বুকিং এডভান্স`,
        sublabel: "বাকি মূল্য ডেলিভারির সময় পরিশোধযোগ্য",
        boxClass: "ds-liquid-callout-amber",
        accentText: "text-amber-800 dark:text-amber-300",
      };
    }
    return {
      label: "৫০% হাফ এডভান্স",
      sublabel: "বর্ডার ক্রস ইমপোর্ট · বাকি ৫০% ডেলিভারির সময় পরিশোধযোগ্য",
      boxClass: "ds-liquid-subpanel-active",
      accentText: "text-sky-700 dark:text-sky-300",
    };
  })();

  const hasDiscount = Number(basePrice) < Number(product.price);
  const savingsAmount = hasDiscount
    ? Math.max(0, Number(product.price) - Number(basePrice))
    : 0;
  const maxStockQty =
    product.stock && product.stock > 0 ? Math.min(product.stock, 99) : 1;
  const hasVideo =
    typeof product.videoUrl === "string" && product.videoUrl.trim().length > 0;
  const totalCartQty = cartItems.reduce(
    (acc, item) => acc + (Number(item?.quantity) || 1),
    0
  );

  const handleShareProduct = () => {
    const shareUrl = `${getPublicShareOrigin()}${window.location.pathname}${window.location.search}`;
    if (navigator.share) {
      navigator
        .share({
          title: product.name,
          text: product.description || product.name,
          url: shareUrl,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      notify("লিংক কপি হয়েছে!", "success");
    }
  };

  const infoTabs: {
    key: "description" | "policy" | "faq" | "video";
    shortLabel: string;
    fullLabel: string;
  }[] = [
    { key: "description", shortLabel: "বিবরণ", fullLabel: "পণ্যের বিবরণ" },
    { key: "policy", shortLabel: "পলিসি", fullLabel: "গ্যারান্টি ও রিটার্ন" },
    { key: "faq", shortLabel: "প্রশ্নোত্তর", fullLabel: "সাধারণ প্রশ্ন (FAQ)" },
    ...(hasVideo
      ? ([
          {
            key: "video",
            shortLabel: "ভিডিও",
            fullLabel: "প্রোডাক্ট ভিডিও",
          },
        ] as const)
      : []),
  ];

  // Shared Tab Content Renderer (used inside Mobile Tabs & Desktop Details Console)
  const renderActiveTabBody = () => {
    if (activeInfoTab === "description") {
      return (
        <div className="space-y-3">
          <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-white tracking-tight">
            <Tr>Product Description</Tr>
          </h2>
          <div className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
            <Tr>
              {product.description ||
                "High-quality authentic border cross imported product curated by DEEP SHOP for reliable performance."}
            </Tr>
          </div>
        </div>
      );
    }

    if (activeInfoTab === "policy") {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="ds-liquid-subpanel p-4 space-y-2">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>১০০% অরিজিনাল গ্যারান্টি</span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              DEEP SHOP-এর প্রতিটি বর্ডার ক্রস ডিভাইস ও গ্যাজেট সরাসরি ভেরিফাইড সোর্স থেকে সংগৃহীত এবং শতভাগ অথেনটিক।
            </p>
          </div>

          <div className="ds-liquid-callout-amber p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
              <Box className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>আনবক্সিং ও রিটার্ন নীতিমালা</span>
            </div>
            <p className="text-xs sm:text-sm text-amber-900/85 dark:text-amber-200/85 leading-relaxed">
              বর্ডার ক্রস পণ্যের ক্ষেত্রে পার্সেল খোলার সময় সম্পূর্ণ আনবক্সিং ভিডিও ধারণ করা আবশ্যক। ফিজিক্যাল ড্যামেজ প্রমাণে ৭ দিনের রিটার্ন সুবিধা প্রযোজ্য।
            </p>
          </div>
        </div>
      );
    }

    if (activeInfoTab === "faq") {
      return (
        <div className="space-y-3">
          <article className="ds-liquid-subpanel p-4 space-y-1">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
              {product.name} কি ১০০% আসল (Authentic)?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              হ্যাঁ, আমাদের সকল বর্ডার ক্রস ফোন, ডিভাইস এবং অ্যাক্সেসরিজ ১০০% অরিজিনাল ও কোয়ালিটি চেককৃত।
            </p>
          </article>
          <article className="ds-liquid-subpanel p-4 space-y-1">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
              ডেলিভারি পেতে কতদিন সময় লাগে?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              বর্ডার ক্রস ইমপোর্ট পণ্যের স্ট্যান্ডার্ড ডেলিভারি সময় সাধারণত ১ মাস+ (আনুমানিক ৩০ থেকে ৪৫ কার্যদিবস)।
            </p>
          </article>
        </div>
      );
    }

    if (activeInfoTab === "video" && hasVideo) {
      return (
        <div className="rounded-2xl overflow-hidden border border-white/40 dark:border-white/10 bg-black relative aspect-video w-full">
          <iframe
            src={product
              .videoUrl!.replace("watch?v=", "embed/")
              .replace("youtu.be/", "youtube.com/embed/")}
            title={`${product.name} video`}
            className="absolute inset-0 w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      );
    }

    return null;
  };

  // Shared Seller Storefront Card (rendered inside Desktop Right Console & Mobile Flow)
  const renderSellerCard = () => (
    <div className="ds-liquid-panel p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-11 w-11 border border-white/80 dark:border-white/15 shrink-0">
            {sellerInfo?.photoURL ? (
              <img
                src={sellerInfo.photoURL}
                alt={sellerInfo.shopName || "Seller"}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <AvatarFallback className="ds-liquid-subpanel text-zinc-900 dark:text-white font-extrabold text-xs">
                {(sellerInfo?.shopName || sellerInfo?.displayName || "DS")
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-extrabold text-zinc-900 dark:text-white text-sm sm:text-base truncate">
                {sellerInfo?.shopName || sellerInfo?.displayName || "Deep Shop"}
              </p>
              {sellerInfo ? (
                sellerInfo.kycStatus === "verified" ? (
                  <VerifiedIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <span className="text-[11px] font-semibold text-rose-500 whitespace-nowrap">
                    · আনভেরিফাইড
                  </span>
                )
              ) : (
                <VerifiedIcon className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
            </div>
            <div className="mt-0.5">{renderStars(sellerRating)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => {
            const targetChatId = product?.sellerId || "system";
            navigate(`/messages?chatId=${targetChatId}`);
          }}
          className="px-3.5 py-2.5 ds-liquid-btn-secondary !min-h-0 !text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <MessageSquare className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
          <span>মেসেজ দিন</span>
        </button>
        <button
          type="button"
          onClick={() => {
            const targetSellerId = product?.sellerId || "system";
            navigate(`/store/${targetSellerId}`);
          }}
          className="px-3.5 py-2.5 ds-liquid-btn-secondary !min-h-0 !text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <span>স্টোর দেখুন</span>
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-[calc(100vh-56px)] ds-liquid-checkout-shell text-foreground pb-28 lg:pb-16 overflow-x-hidden">
      <SEO
        title={product.name}
        description={product.description || product.name}
        image={images[0] || product.image}
        jsonLd={jsonLd}
        price={basePrice}
        availability={product.stock > 0 ? "in stock" : "out of stock"}
        canonical={`/product/${product.id}`}
        exactTitle
      />

      <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-5 lg:space-y-7">
        {/* =====================================================================
            ADMIN MANAGEMENT CALLOUT (Visible only to Admins/Staff)
           ===================================================================== */}
        {isAdmin && (
          <div className="ds-liquid-callout-amber px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-200">
              Admin Product Controls
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/admin/products/edit/${resolvedId}`)}
                className="px-3.5 py-1.5 ds-liquid-btn-secondary !min-h-0 !text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Pen className="w-3.5 h-3.5" />
                <span>Edit Post</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  confirm({
                    title: "Delete Product Post?",
                    message:
                      "Are you sure you want to permanently delete this product post? This action cannot be undone.",
                    onConfirm: async () => {
                      const { deleteDoc, doc } = await import(
                        "firebase/firestore"
                      );
                      await deleteDoc(doc(db, "products", resolvedId!));
                      notify("Product post removed successfully.", "info");
                      navigate("/all-products");
                    },
                  });
                }}
                className="px-3.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            DESKTOP LIQUID GLASS TOP BREADCRUMB & UTILITY BAR (lg+)
           ===================================================================== */}
        <div className="hidden lg:flex items-center justify-between gap-6 ds-liquid-panel px-6 py-3.5">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 min-w-0"
          >
            <button
              type="button"
              onClick={() => navigate("/")}
              className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            <button
              type="button"
              onClick={() => navigate("/all-products")}
              className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Products
            </button>
            {product.category && (
              <>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">{product.category}</span>
              </>
            )}
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            <span className="text-zinc-900 dark:text-white font-semibold truncate max-w-md">
              {product.name}
            </span>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
              {getGreeting()},{" "}
              <strong className="text-zinc-900 dark:text-white">
                {userName || "Guest"}
              </strong>
            </span>

            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSideCart((prev) => !prev)}
                className="px-3.5 py-1.5 ds-liquid-dock rounded-full text-xs font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5 cursor-pointer tabular-nums whitespace-nowrap"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>কার্ট ({totalCartQty})</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleWishlist}
              aria-label="Save to wishlist"
              className="w-9 h-9 rounded-full ds-liquid-icon-btn flex items-center justify-center cursor-pointer"
            >
              <Heart
                className={`w-4 h-4 ${
                  isWishlisted
                    ? "text-rose-500 fill-rose-500"
                    : "text-zinc-700 dark:text-zinc-200"
                }`}
              />
            </button>

            <button
              type="button"
              onClick={handleShareProduct}
              aria-label="Share product"
              className="w-9 h-9 rounded-full ds-liquid-icon-btn flex items-center justify-center cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-zinc-700 dark:text-zinc-200" />
            </button>
          </div>
        </div>

        {/* =====================================================================
            MOBILE LIQUID GLASS UTILITY BAR & SWIPE GALLERY (< lg)
           ===================================================================== */}
        <div className="flex lg:hidden flex-col gap-4">
          {/* Mobile Breadcrumb + Quick Wishlist/Share */}
          <div className="flex items-center justify-between gap-2 px-0.5">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 min-w-0"
            >
              <button
                type="button"
                onClick={() => navigate("/")}
                className="hover:text-zinc-900 dark:hover:text-white cursor-pointer whitespace-nowrap"
              >
                Home
              </button>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              <button
                type="button"
                onClick={() => navigate("/all-products")}
                className="hover:text-zinc-900 dark:hover:text-white cursor-pointer whitespace-nowrap"
              >
                Products
              </button>
              {product.category && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-zinc-800 dark:text-zinc-200 font-medium truncate">
                    {product.category}
                  </span>
                </>
              )}
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleWishlist}
                aria-label="Save to wishlist"
                className="w-9 h-9 rounded-full ds-liquid-icon-btn flex items-center justify-center cursor-pointer"
              >
                <Heart
                  className={`w-4 h-4 ${
                    isWishlisted
                      ? "text-rose-500 fill-rose-500"
                      : "text-zinc-700 dark:text-zinc-200"
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={handleShareProduct}
                aria-label="Share product"
                className="w-9 h-9 rounded-full ds-liquid-icon-btn flex items-center justify-center cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-zinc-700 dark:text-zinc-200" />
              </button>
            </div>
          </div>

          {/* Mobile Touch Swipe Studio Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-square w-full ds-liquid-gallery-stage overflow-hidden">
              <AnimatePresence mode="popLayout" custom={direction}>
                <motion.div
                  key={activeImg}
                  initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction < 0 ? 40 : -40 }}
                  transition={{ duration: 0.2 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.9}
                  onDragEnd={(_, { offset, velocity }) => {
                    const swipe = Math.abs(offset.x) * velocity.x;
                    if (swipe < -8000) {
                      changeImage(
                        activeImg === images.length - 1 ? 0 : activeImg + 1
                      );
                    } else if (swipe > 8000) {
                      changeImage(
                        activeImg === 0 ? images.length - 1 : activeImg - 1
                      );
                    }
                  }}
                  onClick={() => setIsLightboxOpen(true)}
                  className="absolute inset-0 w-full h-full p-5 flex items-center justify-center cursor-zoom-in"
                >
                  <PixelImage
                    src={images[activeImg]}
                    alt={`${product.name} image ${activeImg + 1}`}
                    imgClassName={`object-contain mix-blend-multiply dark:mix-blend-normal ${
                      product.stock <= 0 ? "grayscale opacity-70" : ""
                    }`}
                  />
                </motion.div>
              </AnimatePresence>

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      changeImage(
                        activeImg === 0 ? images.length - 1 : activeImg - 1
                      );
                    }}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full ds-liquid-icon-btn flex items-center justify-center cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 text-zinc-800 dark:text-zinc-100" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      changeImage(
                        activeImg === images.length - 1 ? 0 : activeImg + 1
                      );
                    }}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full ds-liquid-icon-btn flex items-center justify-center cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 text-zinc-800 dark:text-zinc-100" />
                  </button>
                </>
              )}

              {/* Bottom Glass Frame Controls */}
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-none z-10">
                <span className="px-2.5 py-1 rounded-full ds-liquid-icon-btn text-[11px] font-bold text-zinc-700 dark:text-zinc-200 tabular-nums">
                  {activeImg + 1} / {images.length}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLightboxOpen(true);
                  }}
                  className="pointer-events-auto px-3 py-1.5 rounded-full ds-liquid-icon-btn text-xs font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>বড় করে দেখুন</span>
                </button>
              </div>

              {product.stock <= 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <div className="ds-liquid-panel px-5 py-2.5 text-xs font-extrabold text-zinc-900 dark:text-white">
                    স্টক শেষ · শীঘ্রই আসছে
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Horizontal Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-0.5">
                {images.map((imgSrc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => changeImage(idx)}
                    className={`w-16 h-16 shrink-0 p-1.5 overflow-hidden transition-all cursor-pointer ${
                      activeImg === idx
                        ? "ds-liquid-subpanel-active"
                        : "ds-liquid-subpanel opacity-75 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={imgSrc}
                      alt={`${product.name} thumbnail ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mobile Product Summary & Price Glass Panel */}
          <div className="ds-liquid-panel p-4 sm:p-5 space-y-4">
            {/* Unboxed Metadata Line */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span>{product.category || "Premium"}</span>
              <span>·</span>
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("customer-reviews")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="inline-flex items-center gap-1 font-bold text-zinc-800 dark:text-zinc-200 hover:underline cursor-pointer tabular-nums"
              >
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>
                  {liveAverageRating.toFixed(1)} ({liveReviewCount})
                </span>
              </button>
              <span>·</span>
              <span
                className={
                  product.stock > 0
                    ? "font-semibold text-emerald-600 dark:text-emerald-400"
                    : "font-semibold text-rose-500"
                }
              >
                {product.stock > 0 ? "স্টকে আছে" : "স্টক নেই"}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-snug">
              <Tr>{product.name}</Tr>
            </h1>

            {/* Refractive Price & Advance Box */}
            <div className="ds-liquid-subpanel p-3.5 space-y-2.5">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white tabular-nums">
                    {formatPrice(basePrice)}
                  </span>
                  {hasDiscount && (
                    <span className="text-sm font-semibold text-zinc-400 line-through tabular-nums">
                      {formatPrice(product.price)}
                    </span>
                  )}
                </div>
                {savingsAmount > 0 && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    সাশ্রয় {formatPrice(savingsAmount)}
                  </span>
                )}
              </div>

              {timeLeft && (
                <div className="text-xs font-semibold text-sky-600 dark:text-sky-400 tabular-nums">
                  স্পেশাল অফার বাকি: {timeLeft.d > 0 ? `${timeLeft.d}d ` : ""}
                  {timeLeft.h}h {timeLeft.m}m {timeLeft.s}s
                </div>
              )}

              <div className="pt-2 border-t border-slate-900/[0.07] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className={`font-bold ${paymentTermInfo.accentText}`}>
                  {paymentTermInfo.label}
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  ডেলিভারি ৩০-৪৫ দিন
                  {actualReward > 0 ? ` · +${actualReward} VG Coins` : ""}
                </span>
              </div>
            </div>

            {/* Mobile Quantity Stepper */}
            {product.stock > 0 && (
              <div className="flex items-center justify-between gap-3 pt-0.5">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  পরিমাণ নির্বাচন করুন
                </span>
                <div className="ds-liquid-dock rounded-full p-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className="w-8 h-8 rounded-full ds-liquid-dock-pill flex items-center justify-center text-zinc-800 dark:text-white disabled:opacity-40 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-7 text-center text-sm font-extrabold text-zinc-900 dark:text-white tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) => Math.min(maxStockQty, q + 1))
                    }
                    disabled={quantity >= maxStockQty}
                    aria-label="Increase quantity"
                    className="w-8 h-8 rounded-full ds-liquid-dock-pill flex items-center justify-center text-zinc-800 dark:text-white disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Segmented Liquid Glass Info Tabs */}
          <div className="space-y-3">
            <div
              className={`ds-liquid-dock rounded-full p-1 grid gap-1 ${
                infoTabs.length === 4 ? "grid-cols-4" : "grid-cols-3"
              }`}
            >
              {infoTabs.map((tab) => {
                const isActive = activeInfoTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveInfoTab(tab.key)}
                    className={`py-2 px-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? "ds-liquid-dock-pill text-zinc-900 dark:text-white"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {tab.shortLabel}
                  </button>
                );
              })}
            </div>

            <div className="ds-liquid-panel p-4 sm:p-5">
              {renderActiveTabBody()}
            </div>
          </div>

          {/* Mobile Seller Card */}
          {renderSellerCard()}
        </div>

        {/* =====================================================================
            DESKTOP 12-COLUMN LIQUID GLASS SHOWCASE & PURCHASE WORKSPACE (lg+)
            Left (7 cols): Vertical Thumbnail Rail + Studio Stage + Tabbed Specs
            Right (5 cols): Sticky Contiguous Purchase Module + Seller + Mini-Cart
           ===================================================================== */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-7 items-start">
          {/* LEFT 7 COLUMNS: GALLERY + DETAILS */}
          <div className="lg:col-span-7 space-y-6">
            {/* Desktop Studio Gallery with Vertical Rail */}
            <div className="flex gap-4 items-start">
              {images.length > 1 && (
                <div className="w-20 shrink-0 flex flex-col gap-3 max-h-[520px] overflow-y-auto no-scrollbar py-0.5">
                  {images.map((imgSrc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => changeImage(idx)}
                      className={`w-20 h-20 p-2 overflow-hidden transition-all cursor-pointer shrink-0 ${
                        activeImg === idx
                          ? "ds-liquid-subpanel-active"
                          : "ds-liquid-subpanel opacity-75 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={imgSrc}
                        alt={`${product.name} view ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-1 relative aspect-[10/9] ds-liquid-gallery-stage overflow-hidden">
                <AnimatePresence mode="popLayout" custom={direction}>
                  <motion.div
                    key={activeImg}
                    initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction < 0 ? 40 : -40 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setIsLightboxOpen(true)}
                    className="absolute inset-0 w-full h-full p-8 flex items-center justify-center cursor-zoom-in group"
                  >
                    <PixelImage
                      src={images[activeImg]}
                      alt={`${product.name} image ${activeImg + 1}`}
                      imgClassName={`object-contain mix-blend-multiply dark:mix-blend-normal group-hover:scale-[1.03] transition-transform duration-300 ${
                        product.stock <= 0 ? "grayscale opacity-75" : ""
                      }`}
                    />
                  </motion.div>
                </AnimatePresence>

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        changeImage(
                          activeImg === 0 ? images.length - 1 : activeImg - 1
                        );
                      }}
                      aria-label="Previous image"
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full ds-liquid-icon-btn flex items-center justify-center cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5 text-zinc-800 dark:text-zinc-100" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        changeImage(
                          activeImg === images.length - 1 ? 0 : activeImg + 1
                        );
                      }}
                      aria-label="Next image"
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full ds-liquid-icon-btn flex items-center justify-center cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5 text-zinc-800 dark:text-zinc-100" />
                    </button>
                  </>
                )}

                <div className="absolute bottom-4 inset-x-4 flex items-center justify-between pointer-events-none z-10">
                  <span className="px-3 py-1.5 rounded-full ds-liquid-icon-btn text-xs font-bold text-zinc-700 dark:text-zinc-200 tabular-nums">
                    ছবি {activeImg + 1} / {images.length}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsLightboxOpen(true);
                    }}
                    className="pointer-events-auto px-4 py-1.5 rounded-full ds-liquid-icon-btn text-xs font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Camera className="w-4 h-4" />
                    <span>ফুল স্ক্রিন ভিউ</span>
                  </button>
                </div>

                {product.stock <= 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="ds-liquid-panel px-6 py-3 text-sm font-extrabold text-zinc-900 dark:text-white">
                      স্টক শেষ (Restocking Soon)
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Segmented Details, Policy, FAQ & Video Dock */}
            <div className="space-y-4">
              <div className="ds-liquid-dock rounded-full p-1.5 inline-flex items-center gap-1 flex-wrap">
                {infoTabs.map((tab) => {
                  const isActive = activeInfoTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveInfoTab(tab.key)}
                      className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        isActive
                          ? "ds-liquid-dock-pill text-zinc-900 dark:text-white"
                          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      {tab.fullLabel}
                    </button>
                  );
                })}
              </div>

              <div className="ds-liquid-panel p-6 sm:p-7">
                {renderActiveTabBody()}
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLUMNS: STICKY CONTIGUOUS PURCHASE CONSOLE */}
          <aside className="lg:col-span-5 lg:sticky lg:top-24 space-y-5">
            <div className="ds-liquid-panel p-6 space-y-5">
              {/* Unboxed Product Metadata */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span>
                  {product.category || "Premium"} · ১০০% অরিজিনাল · বর্ডার ক্রস
                </span>
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("customer-reviews")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="inline-flex items-center gap-1 font-bold text-zinc-800 dark:text-zinc-200 hover:underline cursor-pointer tabular-nums whitespace-nowrap"
                >
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>
                    {liveAverageRating.toFixed(1)} ({liveReviewCount}{" "}
                    <Tr>reviews</Tr>)
                  </span>
                </button>
              </div>

              {/* Balanced Product Title */}
              <h1 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
                <Tr>{product.name}</Tr>
              </h1>

              {/* Refractive Price & Advance Transparency Well */}
              <div className="ds-liquid-subpanel p-4 space-y-3">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white tabular-nums">
                      {formatPrice(basePrice)}
                    </span>
                    {hasDiscount && (
                      <span className="text-sm font-semibold text-zinc-400 line-through tabular-nums">
                        {formatPrice(product.price)}
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-xs font-bold ${
                      product.stock > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-500"
                    }`}
                  >
                    {product.stock > 0 ? "স্টকে উপলব্ধ" : "স্টক শেষ"}
                  </span>
                </div>

                {savingsAmount > 0 && (
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    আপনি সাশ্রয় করছেন {formatPrice(savingsAmount)}
                    {mysteryOffer ? " (Mystery Box Offer)" : ""}
                  </p>
                )}

                {timeLeft && (
                  <div className="text-xs font-semibold text-sky-600 dark:text-sky-400 tabular-nums">
                    অফার সময় বাকি: {timeLeft.d > 0 ? `${timeLeft.d}d ` : ""}
                    {timeLeft.h}h {timeLeft.m}m {timeLeft.s}s
                  </div>
                )}

                {actualReward > 0 && (
                  <div className="pt-2 border-t border-slate-900/[0.07] dark:border-white/[0.08] flex items-center justify-between text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      রিওয়ার্ড বোনাস
                    </span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                      +{actualReward} VG Coins অর্জন করুন
                    </span>
                  </div>
                )}
              </div>

              {/* Payment & Delivery Transparency Callout */}
              <div className={`${paymentTermInfo.boxClass} p-4 space-y-1`}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className={`font-extrabold ${paymentTermInfo.accentText}`}>
                    {paymentTermInfo.label}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap">
                    ডেলিভারি ৩০-৪৫ দিন
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {paymentTermInfo.sublabel}
                </p>
              </div>

              {/* Seller Paused Notice */}
              {sellerInfo?.ordersPaused && (
                <div className="ds-liquid-callout-amber p-3.5 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-semibold min-w-0">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span className="truncate">
                      সেলার সাময়িকভাবে অর্ডার গ্রহণ বন্ধ রেখেছেন
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOrdersPausedModal(true)}
                    className="font-bold text-amber-800 dark:text-amber-300 underline shrink-0 cursor-pointer whitespace-nowrap"
                  >
                    কারণ দেখুন
                  </button>
                </div>
              )}

              {/* Quantity Stepper + Primary Desktop Purchase Actions */}
              {product.stock <= 0 ? (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 rounded-full ds-liquid-subpanel text-sm font-bold text-zinc-400 cursor-not-allowed whitespace-nowrap"
                  >
                    স্টক নেই (Out of Stock)
                  </button>
                  <button
                    type="button"
                    onClick={handleNotifyMe}
                    disabled={notifying}
                    className="w-full py-3 ds-liquid-btn-secondary text-xs font-bold flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <Bell className="w-4 h-4" />
                    <span>
                      {notifying
                        ? "নোটিফিকেশন সেট হচ্ছে..."
                        : "স্টকে এলে আমাকে জানান"}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                      পরিমাণ (Quantity)
                    </span>
                    <div className="ds-liquid-dock rounded-full p-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        aria-label="Decrease quantity"
                        className="w-8 h-8 rounded-full ds-liquid-dock-pill flex items-center justify-center text-zinc-800 dark:text-white disabled:opacity-40 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-extrabold text-zinc-900 dark:text-white tabular-nums">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((q) => Math.min(maxStockQty, q + 1))
                        }
                        disabled={quantity >= maxStockQty}
                        aria-label="Increase quantity"
                        className="w-8 h-8 rounded-full ds-liquid-dock-pill flex items-center justify-center text-zinc-800 dark:text-white disabled:opacity-40 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => addToCart(false)}
                      disabled={addingToCart}
                      className="px-4 py-3.5 ds-liquid-btn-secondary text-sm font-bold flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                    >
                      {addingToCart ? (
                        <span className="w-20 h-4 rounded-full ds-skeleton inline-block" />
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 shrink-0" />
                          <span>কার্টে রাখুন</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => addToCart(true)}
                      className="px-4 py-3.5 ds-liquid-btn-primary text-sm font-bold flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                    >
                      <span>এখনই কিনুন</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Seller Storefront Card */}
            {renderSellerCard()}

            {/* Live Compact Mini-Cart Console on Desktop */}
            {showSideCart && cartItems.length > 0 && (
              <div className="ds-liquid-panel p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>আপনার কার্ট ({totalCartQty})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowSideCart(false)}
                    aria-label="Hide mini cart"
                    className="w-7 h-7 rounded-full ds-liquid-btn-secondary !min-h-0 p-0 flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {cartItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="ds-liquid-subpanel p-2.5 flex items-center gap-3"
                    >
                      <div className="w-12 h-12 rounded-xl bg-white/70 dark:bg-white/5 p-1 flex items-center justify-center shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                          {item.name}
                        </h4>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <span className="font-extrabold text-xs text-zinc-900 dark:text-white tabular-nums">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = [...cartItems];
                                newItems[idx].quantity = Math.max(
                                  1,
                                  newItems[idx].quantity - 1
                                );
                                setCartItems(newItems);
                                localStorage.setItem(
                                  "f_cart",
                                  JSON.stringify(newItems)
                                );
                                window.dispatchEvent(new Event("update_cart"));
                              }}
                              className="w-6 h-6 rounded-full ds-liquid-btn-secondary !min-h-0 p-0 flex items-center justify-center cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold tabular-nums w-4 text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = [...cartItems];
                                newItems[idx].quantity += 1;
                                setCartItems(newItems);
                                localStorage.setItem(
                                  "f_cart",
                                  JSON.stringify(newItems)
                                );
                                window.dispatchEvent(new Event("update_cart"));
                              }}
                              className="w-6 h-6 rounded-full ds-liquid-btn-secondary !min-h-0 p-0 flex items-center justify-center cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = cartItems.filter(
                                  (_, i) => i !== idx
                                );
                                setCartItems(newItems);
                                localStorage.setItem(
                                  "f_cart",
                                  JSON.stringify(newItems)
                                );
                                window.dispatchEvent(new Event("update_cart"));
                              }}
                              aria-label="Remove item"
                              className="w-6 h-6 rounded-full text-zinc-400 hover:text-rose-500 flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-900/[0.08] dark:border-white/[0.1] space-y-3">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                      সাবটোটাল
                    </span>
                    <span className="font-extrabold text-zinc-900 dark:text-white tabular-nums">
                      {formatPrice(
                        cartItems.reduce(
                          (acc, curr) => acc + curr.price * curr.quantity,
                          0
                        )
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/checkout")}
                    className="w-full py-3 ds-liquid-btn-primary text-xs sm:text-sm font-bold cursor-pointer whitespace-nowrap"
                  >
                    চেকআউট করুন
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* =====================================================================
            CUSTOMER REVIEWS SECTION (Full-Width Liquid Glass Console)
           ===================================================================== */}
        <section
          id="customer-reviews"
          className="ds-liquid-panel p-5 sm:p-7 lg:p-8 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                <Tr>Customer Reviews</Tr>
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 tabular-nums">
                {liveReviewCount > 0 ? (
                  <>
                    <Tr>Based on</Tr> {liveReviewCount}{" "}
                    <Tr>{liveReviewCount === 1 ? "review" : "reviews"}</Tr>
                  </>
                ) : (
                  <Tr>Share your experience with the community</Tr>
                )}
              </p>
            </div>
            {reviews.length > 0 && (
              <button
                type="button"
                onClick={() => navigate(`/product/${product.id}/reviews`)}
                className="px-4 py-2 ds-liquid-btn-secondary !min-h-0 !text-xs font-bold flex items-center gap-1 cursor-pointer self-start sm:self-auto whitespace-nowrap"
              >
                <span>
                  <Tr>See all</Tr> ({reviews.length})
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 2-Column Rating Summary & Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 ds-liquid-subpanel p-5 sm:p-6 flex flex-col justify-between gap-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <Tr>Overall Rating</Tr>
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white tabular-nums">
                    {liveAverageRating.toFixed(1)}
                  </span>
                  <span className="text-sm font-medium text-zinc-400">
                    / 5.0
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s <= Math.round(liveAverageRating)
                          ? "text-amber-400 fill-amber-400"
                          : "text-zinc-300 dark:text-zinc-700"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 tabular-nums">
                  {liveReviewCount > 0
                    ? `${liveReviewCount} verified customer ${
                        liveReviewCount === 1 ? "rating" : "ratings"
                      }`
                    : "No ratings yet — be the first to review"}
                </p>
              </div>

              <div>
                <ReviewComposer
                  productId={product.id}
                  product={product}
                  isOpen={false}
                  onOpenChange={() => setReviewComposerOpen((prev) => !prev)}
                />
              </div>
            </div>

            <div className="lg:col-span-7 ds-liquid-subpanel p-5 sm:p-6 flex flex-col justify-center">
              <ReviewFilterGroup
                value={
                  ["5", "4", "3", "2", "1"].includes(reviewFilter)
                    ? reviewFilter
                    : ""
                }
                onValueChange={(val) =>
                  setReviewFilter((prev) =>
                    prev === val ? "all" : (val as any)
                  )
                }
              >
                {[5, 4, 3, 2, 1].map((stars) => (
                  <ReviewFilterItem
                    key={stars}
                    value={String(stars)}
                    stars={stars}
                    count={
                      reviews.filter(
                        (r) => Math.round(Number(r.rating || 0)) === stars
                      ).length
                    }
                    total={reviews.length}
                  />
                ))}
              </ReviewFilterGroup>
            </div>
          </div>

          {reviewComposerOpen && (
            <div>
              <ReviewComposer
                productId={product.id}
                product={product}
                isOpen={true}
                onOpenChange={setReviewComposerOpen}
              />
            </div>
          )}

          {/* Liquid Glass Filter Tabs */}
          {reviews.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {(
                [
                  { key: "all", label: `All (${reviews.length})` },
                  ...(photoReviewsTotal > 0
                    ? [
                        {
                          key: "photos",
                          label: `With Photos (${photoReviewsTotal})`,
                        },
                      ]
                    : []),
                  { key: "5", label: "5 ★" },
                  { key: "4", label: "4 ★" },
                  { key: "3", label: "3 ★" },
                  { key: "2", label: "2 ★" },
                  { key: "1", label: "1 ★" },
                ] as {
                  key: "all" | "photos" | "5" | "4" | "3" | "2" | "1";
                  label: string;
                }[]
              ).map((tab) => {
                const active = reviewFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setReviewFilter(tab.key)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer tabular-nums ${
                      active
                        ? "ds-liquid-dock-pill text-zinc-900 dark:text-white"
                        : "ds-liquid-subpanel text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Reviews List */}
          <div className="flex flex-col gap-3.5">
            {filteredProductReviews.slice(0, 6).map((review) => {
              const isOwn =
                Boolean(auth.currentUser?.uid) &&
                review.userId === auth.currentUser?.uid;
              return (
                <ReviewCard
                  key={review.id}
                  name={review.userName}
                  handle={isOwn ? "Your Review" : "Verified Buyer"}
                  review={review.comment}
                  rating={review.rating}
                  imageUrl={review.userPhoto}
                  createdAt={review.createdAt}
                  images={(review as any).images}
                  canDelete={isOwn || isAdmin}
                  onDelete={() => handleDeleteProductReview(review.id)}
                />
              );
            })}

            {filteredProductReviews.length > 6 && (
              <button
                type="button"
                onClick={() => navigate(`/product/${product.id}/reviews`)}
                className="w-full py-3.5 ds-liquid-btn-secondary text-sm font-bold cursor-pointer whitespace-nowrap"
              >
                <Tr>View All Reviews</Tr> ({reviews.length})
              </button>
            )}

            {reviews.length > 0 && filteredProductReviews.length === 0 && (
              <div className="py-10 px-6 ds-liquid-subpanel text-center space-y-2">
                <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  নির্বাচিত ফিল্টারে কোনো রিভিউ পাওয়া যায়নি।
                </p>
                <button
                  type="button"
                  onClick={() => setReviewFilter("all")}
                  className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                >
                  সব রিভিউ দেখুন
                </button>
              </div>
            )}

            {reviews.length === 0 && (
              <div className="py-10 px-6 ds-liquid-subpanel text-center space-y-1.5">
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  <Tr>No customer reviews yet</Tr>
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  <Tr>
                    Purchased this item? Click "Write a Review" above to share
                    your feedback.
                  </Tr>
                </p>
              </div>
            )}
          </div>
        </section>

        {/* =====================================================================
            RELATED PRODUCTS SECTION ("You May Like" — 2-col Mobile, 4-col Desktop)
           ===================================================================== */}
        {bundleItems.length > 0 && (
          <section className="space-y-4 pt-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                <Tr>You May Like</Tr>
              </h2>
              <button
                type="button"
                onClick={() => navigate("/all-products")}
                className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <span>সব পণ্য দেখুন</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {bundleItems.map((item, index) => (
                <ProductCard key={item.id} product={item} index={index} />
              ))}
            </div>
          </section>
        )}
      </div>

      <ImageLightbox
        images={images}
        initialIndex={activeImg}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
      />
      <CustomSectionEmbed location="product_bottom" />

      {/* =====================================================================
          MOBILE-ONLY FROSTED LIQUID GLASS STICKY BOTTOM BAR (< lg)
          Compact height within strict 15% mobile sticky governance
         ===================================================================== */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] ds-liquid-bottom-bar px-3.5 py-2.5 pb-[calc(10px+env(safe-area-inset-bottom))]">
        {sellerInfo?.ordersPaused && (
          <div className="max-w-xl mx-auto mb-2 px-3 py-1.5 ds-liquid-callout-amber flex items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-amber-800 dark:text-amber-200 truncate">
              সেলার সাময়িকভাবে অর্ডার গ্রহণ বন্ধ রেখেছেন
            </span>
            <button
              type="button"
              onClick={() => setShowOrdersPausedModal(true)}
              className="font-bold text-amber-800 dark:text-amber-300 underline shrink-0 cursor-pointer whitespace-nowrap"
            >
              কারণ
            </button>
          </div>
        )}

        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 block whitespace-nowrap">
              মোট মূল্য ({quantity}টি)
            </span>
            <span className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-white tabular-nums whitespace-nowrap">
              {formatPrice(Number(basePrice) * quantity)}
            </span>
          </div>

          {product.stock <= 0 ? (
            <button
              type="button"
              onClick={handleNotifyMe}
              disabled={notifying}
              className="flex-1 max-w-[220px] py-2.5 px-4 ds-liquid-btn-secondary !min-h-0 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Bell className="w-3.5 h-3.5 shrink-0" />
              <span>{notifying ? "অপেক্ষা করুন..." : "স্টকে এলে জানান"}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => addToCart(false)}
                disabled={addingToCart}
                aria-label="Add to cart"
                className="px-4 py-2.5 ds-liquid-btn-secondary !min-h-0 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <ShoppingCart className="w-4 h-4 shrink-0" />
                <span>কার্ট</span>
              </button>
              <button
                type="button"
                onClick={() => addToCart(true)}
                className="px-5 py-2.5 ds-liquid-btn-primary !min-h-0 text-xs sm:text-sm font-bold flex items-center justify-center cursor-pointer whitespace-nowrap"
              >
                এখনই কিনুন
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Seller Orders Paused Liquid Glass Sheet / Modal */}
      <AnimatePresence>
        {showOrdersPausedModal && (
          <div
            className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center ds-liquid-backdrop p-0 sm:p-4"
            onClick={() => setShowOrdersPausedModal(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg ds-liquid-panel rounded-t-3xl sm:rounded-3xl p-6 pb-8 space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl ds-liquid-callout-amber flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-white leading-snug">
                      অর্ডার নেওয়া সাময়িকভাবে বন্ধ আছে
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowOrdersPausedModal(false)}
                      className="w-8 h-8 rounded-full ds-liquid-btn-secondary !min-h-0 p-0 flex items-center justify-center cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                    বিক্রেতা:{" "}
                    {sellerInfo?.shopName ||
                      sellerInfo?.displayName ||
                      "Official Seller"}
                  </p>
                </div>
              </div>

              <div className="ds-liquid-callout-amber p-4 space-y-1.5">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  সেলারের দেওয়া কারণ
                </p>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 leading-relaxed">
                  "
                  {sellerInfo?.pauseReason ||
                    "বিক্রেতা সাময়িক বিরতিতে বা স্টক আপডেটে থাকায় বর্তমানে কোনো নতুন অর্ডার গ্রহণ করা হচ্ছে না।"}
                  "
                </p>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                এই সেলার আবার অর্ডার গ্রহণ চালু না করা পর্যন্ত নতুন অর্ডার প্লেস করা যাবে না। প্রয়োজনে সরাসরি সেলারকে মেসেজ পাঠাতে পারেন।
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowOrdersPausedModal(false);
                    navigate(
                      `/messages?chatId=${sellerInfo?.id || product.sellerId}`
                    );
                  }}
                  className="py-3 px-4 ds-liquid-btn-secondary text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span>সেলারকে মেসেজ দিন</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowOrdersPausedModal(false)}
                  className="py-3 px-4 ds-liquid-btn-primary text-xs sm:text-sm font-bold cursor-pointer whitespace-nowrap"
                >
                  বুঝেছি
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductDetails;
