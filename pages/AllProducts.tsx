import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Product } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "../components/Icon";
import { ProductCard } from "../components/ui/ProductCard";
import SEO from "../components/SEO";
import { ProductSkeleton } from "../components/Skeletons";

const AllProducts: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialCategory = searchParams.get('category') || location.state?.category || "All";
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState(initialCategory);

  useEffect(() => {
    setActiveTab(searchParams.get('category') || "All");
  }, [location.search]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(`/all-products${tab === "All" ? "" : `?category=${encodeURIComponent(tab)}`}`, { replace: true });
  };
  const [quickViewImg, setQuickViewImg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      setProducts(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Product),
      );
    });
    return unsubscribe;
  }, []);

  const tabs = [
    "All",
    "Phone Parts (পার্টস)",
    "Display (ডিসপ্লে)",
    "Battery (ব্যাটারি)",
    "Camera (ক্যামেরা)",
    "Logic Board (মাদারবোর্ড)",
    "Mobile",
    "Border Cross",
    "Mobiles",
    "Original Phones",
    "Chargers",
  ];

  return (
    <div className="p-6 md:p-12 bg-zinc-50 dark:bg-[#000000] max-w-[1440px] mx-auto min-h-screen font-inter animate-fade-in relative overflow-hidden">
      <SEO
        title="All Products"
        description="Browse our vast collection of premium border cross phones, original mobiles, chargers, and tech at DEEP SHOP."
        jsonLd={products.length > 0 ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          "itemListElement": products.slice(0, 15).map((product, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": product.name,
            "url": `https://www.deepshop.top/product/${product.id}`
          }))
        } : undefined}
      />
      

      <div className="flex space-x-4 mb-16 overflow-x-auto no-scrollbar pb-3 px-1 relative z-10 animate-stagger-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-8 py-3.5 rounded-full text-[10px] md:text-xs font-semibold tracking-normal border transition-all shrink-0 ${activeTab === tab ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-sm" : "bg-transparent text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-white"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6 lg:gap-8 relative z-10 animate-stagger-3">
        {products.length === 0
          ? Array(12)
              .fill(0)
              .map((_, i) => <ProductSkeleton key={i} />)
          : products
              .filter((p) => {
                if (activeTab === "All") return true;
                if (p.category === activeTab) return true;
                const catLower = (p.category || "").toLowerCase();
                const nameLower = (p.name || "").toLowerCase();
                if (activeTab.includes("Phone Parts") || activeTab.includes("পার্টস")) {
                  return ["part", "পার্টস", "display", "battery", "camera", "logic", "motherboard", "স্ক্রিন", "ব্যাটারি", "ক্যামেরা"].some(w => catLower.includes(w) || nameLower.includes(w));
                }
                if (activeTab.includes("Display") || activeTab.includes("ডিসপ্লে")) {
                  return catLower.includes("display") || nameLower.includes("display") || catLower.includes("oled") || nameLower.includes("oled") || catLower.includes("স্ক্রিন");
                }
                if (activeTab.includes("Battery") || activeTab.includes("ব্যাটারি")) {
                  return catLower.includes("battery") || nameLower.includes("battery") || catLower.includes("ব্যাটারি") || nameLower.includes("mah");
                }
                if (activeTab.includes("Camera") || activeTab.includes("ক্যামেরা")) {
                  return catLower.includes("camera") || nameLower.includes("camera") || catLower.includes("ক্যামেরা") || nameLower.includes("lens");
                }
                if (activeTab.includes("Logic") || activeTab.includes("মাদারবোর্ড")) {
                  return catLower.includes("logic") || nameLower.includes("logic") || catLower.includes("motherboard") || nameLower.includes("motherboard") || catLower.includes("মাদারবোর্ড");
                }
                return false;
              })
              .map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
      </div>

      {products.length > 0 &&
        products.filter((p) => {
          if (activeTab === "All") return true;
          if (p.category === activeTab) return true;
          const catLower = (p.category || "").toLowerCase();
          const nameLower = (p.name || "").toLowerCase();
          if (activeTab.includes("Phone Parts") || activeTab.includes("পার্টস")) {
            return ["part", "পার্টস", "display", "battery", "camera", "logic", "motherboard", "স্ক্রিন", "ব্যাটারি", "ক্যামেরা"].some(w => catLower.includes(w) || nameLower.includes(w));
          }
          if (activeTab.includes("Display") || activeTab.includes("ডিসপ্লে")) {
            return catLower.includes("display") || nameLower.includes("display") || catLower.includes("oled") || nameLower.includes("oled") || catLower.includes("স্ক্রিন");
          }
          if (activeTab.includes("Battery") || activeTab.includes("ব্যাটারি")) {
            return catLower.includes("battery") || nameLower.includes("battery") || catLower.includes("ব্যাটারি") || nameLower.includes("mah");
          }
          if (activeTab.includes("Camera") || activeTab.includes("ক্যামেরা")) {
            return catLower.includes("camera") || nameLower.includes("camera") || catLower.includes("ক্যামেরা") || nameLower.includes("lens");
          }
          if (activeTab.includes("Logic") || activeTab.includes("মাদারবোর্ড")) {
            return catLower.includes("logic") || nameLower.includes("logic") || catLower.includes("motherboard") || nameLower.includes("motherboard") || catLower.includes("মাদারবোর্ড");
          }
          return false;
        }).length === 0 && (
          <div className="py-40 text-center opacity-30 flex flex-col items-center">
            <Icon name="box-open" className="text-xl mb-8" />
            <p className="text-[12px] font-semibold  tracking-normal">
              No Data in this sector
            </p>
          </div>
        )}

      <AnimatePresence>
        {quickViewImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-900 dark:bg-zinc-100/60 backdrop-blur-[50px] z-[1000] flex items-center justify-center p-6"
            onClick={() => setQuickViewImg(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 30 }}
              className="relative w-full max-w-2xl aspect-square bg-zinc-50 dark:bg-zinc-800 rounded-2xl shadow-sm p-12 md:p-20 flex items-center justify-center border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setQuickViewImg(null)}
                className="absolute top-8 right-8 w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center hover:bg-zinc-900 dark:hover:bg-zinc-100 hover:text-white dark:hover:text-zinc-900 transition-all shadow-sm"
              >
                <Icon name="times" />
              </button>
              <img
                src={quickViewImg}
                className="max-w-full max-h-full object-contain"
                alt="Quick preview"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AllProducts;
