import React, { useState, useEffect } from "react";
import { useRegion } from "../components/RegionContext";
import { useNavigate, useParams } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
  addDoc,
} from "firebase/firestore";
import { UserProfile, AffiliateLog } from "../types";
import { AffiliateOnboardingForm, AffiliateFormData } from "../components/AffiliateOnboardingForm";
import Icon from "../components/Icon";
import { useNotify } from "../components/Notifications";
import { CustomDropdown } from "../components/CustomDropdown";
import {
  sendAffiliateRequestToTelegram,
  sendCreatorVideoToTelegram,
} from "../services/telegram";
import { motion, useReducedMotion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "../components/ThemeContext";
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wallet, TrendingUp, Eye, RefreshCw, ArrowDown, ArrowUp, ArrowLeftRight, Clock, Bitcoin, Link as LinkIcon, Gift, LayoutDashboard, Presentation, Loader2, Crown, GraduationCap } from "lucide-react"

import { DiscreteTabs, TabItem } from "../components/ui/discrete-tab";
import { TourProvider, TourAlertDialog, useTour } from "@/components/ui/tour";
import { ProfileSettingsPageSkeleton } from "../components/PageSkeletons";
import { LiquidGlassPopup } from "../components/ui/liquid-glass-popup";
import { APPLE_SPRING_SNAPPY } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

// GIF Generator
import { generateStickerGif } from "../components/GifGenerator";

const tabsData: TabItem[] = [
  { id: "dashboard", title: "Dashboard", icon: LayoutDashboard as any },
  { id: "creator_hub", title: "Creator Hub", icon: Presentation as any },
  { id: "small_creators", title: "Small Creators", icon: Gift as any },
];

const SmallCreatorsHub: React.FC<{ userData: UserProfile }> = ({ userData }) => {
  const notify = useNotify();
  const { formatPrice } = useRegion();
  const prefersReducedMotion = useReducedMotion();
  const [colorScheme, setColorScheme] = useState<"black" | "white">("white");
  const [submitting, setSubmitting] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  
  const [generatingGif, setGeneratingGif] = useState<string | null>(null);
  const [gifProgress, setGifProgress] = useState(0);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generatedName, setGeneratedName] = useState("");

  const handleVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl) return notify("Please enter the video URL", "error");

    setSubmitting(true);
    try {
      const data = {
        userId: userData.uid,
        userName: userData.displayName || "Unknown",
        userCode: userData.affiliateCode || "",
        platform: "small_creator",
        videoUrl,
        rewardAmount: 10,
        status: "pending",
        createdAt: Date.now(),
      };
      await addDoc(collection(db, "creator_videos"), data);

      await sendCreatorVideoToTelegram(data);

      notify("Video submitted for review successfully!", "success");
      setVideoUrl("");
    } catch (err) {
      console.error(err);
      notify("Failed to submit video", "error");
    }
    setSubmitting(false);
  };

  const handleDownload = async (stId: string, fileName: string) => {
    try {
      setGeneratingGif(stId);
      setGifProgress(0);
      setGeneratedUrl(null);
      setGeneratedName(fileName);

      const url = await generateStickerGif(stId, colorScheme, (p) => {
        setGifProgress(Math.round(p * 100));
      });

      setGeneratedUrl(url);
      setGeneratingGif(null);

      // Attempt auto-download (might gracefully fail on mobile webviews, hence the modal)
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to generate GIF:", err);
      notify("Failed to generate animated GIF", "error");
      setGeneratingGif(null);
    }
  };

  const textColor = colorScheme === "black" ? "#ffffff" : "#000000";
  const bgColor = colorScheme === "black" ? "#000000" : "#ffffff";

  const handleShareOrDownload = async () => {
    if (!generatedUrl) return;
    try {
      if (navigator.share && navigator.canShare) {
        // Build blob synchronously to preserve user interaction gesture
        const byteString = atob(generatedUrl.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: 'image/gif' });
        const file = new File([blob], generatedName, { type: 'image/gif' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "DEEP SHOP Sticker",
          });
          return;
        }
      }
    } catch (e) {
      console.warn("Share failed:", e);
    }

    // Fallback manual download
    const link = document.createElement("a");
    link.href = generatedUrl;
    link.download = generatedName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stickers = [
    {
      id: "flash_sale",
      title: "Flash Sale (Neon)",
      desc: "Neon glowing flash sale badge",
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="100%" height="100%">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;900&amp;display=swap');
          @keyframes glow { 0%, 100% { filter: drop-shadow(0 0 10px #ec4899); transform: scale(1); } 50% { filter: drop-shadow(0 0 25px #ec4899) drop-shadow(0 0 10px #ec4899); transform: scale(1.05); } }
          .fst { animation: glow 2s ease-in-out infinite; transform-origin: center; }
          .t1 { font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 45px; fill: #ec4899; }
          .t2 { font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 45px; fill: ${textColor}; }
          .t3 { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 16px; fill: #f97316; }
        </style>
        <g class="fst">
          <rect x="30" y="30" width="260" height="260" rx="40" fill="${bgColor}" stroke="#ec4899" stroke-width="6" />
          <text x="160" y="130" text-anchor="middle" class="t1">FLASH</text>
          <text x="160" y="180" text-anchor="middle" class="t2">SALE</text>
          <text x="160" y="230" text-anchor="middle" class="t3">DEEP SHOP</text>
        </g>
      </svg>`,
    },
    {
      id: "discount_tag",
      title: "Extra 5% OFF (Pro)",
      desc: "Premium luxury discount badge",
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="100%" height="100%">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;800;900&amp;display=swap');
          @keyframes floatTag { 0%, 100% { transform: translateY(0); filter: drop-shadow(0 15px 20px rgba(139,92,246,0.4)); } 50% { transform: translateY(-10px); filter: drop-shadow(0 25px 25px rgba(139,92,246,0.5)); } }
          .dct { animation: floatTag 3s ease-in-out infinite; transform-origin: center; }
          .t1 { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 24px; fill: ${textColor}; }
          .t2 { font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 65px; fill: url(#grad); }
          .t3 { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 16px; fill: #8b5cf6; }
        </style>
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#8b5cf6"/>
            <stop offset="100%" stop-color="#3b82f6"/>
          </linearGradient>
        </defs>
        <g class="dct">
          <circle cx="160" cy="160" r="130" fill="${bgColor}" stroke="url(#grad)" stroke-width="8" />
          <text x="160" y="125" text-anchor="middle" class="t1">EXTRA</text>
          <text x="160" y="195" text-anchor="middle" class="t2">5%</text>
          <text x="160" y="240" text-anchor="middle" class="t3">DISCOUNT</text>
        </g>
      </svg>`,
    },
    {
      id: "trusted_brand",
      title: "Trusted Store",
      desc: "Minimalist clean trust badge",
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="100%" height="100%">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&amp;display=swap');
          @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } }
          .bg-hex { animation: rotate 20s linear infinite; transform-origin: 160px 160px; }
          .tbl { animation: pulse 2s ease-in-out infinite; transform-origin: center; }
          .t1 { font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 40px; fill: ${textColor}; }
          .t2 { font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 40px; fill: #10b981; }
          .t3 { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 16px; fill: ${textColor}; }
        </style>
        <g class="tbl">
          <g class="bg-hex">
            <polygon points="160,20 281.24,90 281.24,230 160,300 38.76,230 38.76,90" fill="${bgColor}" stroke="#10b981" stroke-width="5" />
            <polygon points="160,35 268.25,97.5 268.25,222.5 160,285 51.75,222.5 51.75,97.5" fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="10 10" />
          </g>
          <text x="160" y="145" text-anchor="middle" class="t1">TRUSTED</text>
          <text x="160" y="185" text-anchor="middle" class="t2">STORE</text>
          <text x="160" y="235" text-anchor="middle" class="t3">DEEP SHOP</text>
        </g>
      </svg>`,
    },
    {
      id: "new_arrival",
      title: "New Arrival",
      desc: "Trendy new gadget spotlight",
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="100%" height="100%">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;900&amp;display=swap');
          @keyframes spin { 100% { transform: rotate(360deg); } }
          @keyframes bop { 0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(234,179,8,0.3)); } 50% { transform: scale(1.05); filter: drop-shadow(0 0 25px rgba(234,179,8,0.6)); } }
          .naring { animation: spin 10s linear infinite; transform-origin: 160px 160px; }
          .nabop { animation: bop 1s ease-in-out infinite; transform-origin: center; }
          .t1 { font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 45px; fill: #eab308; }
          .t2 { font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 45px; fill: ${textColor}; }
          .t3 { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 16px; fill: #ca8a04; }
        </style>
        <g>
          <circle cx="160" cy="160" r="140" fill="none" stroke="#eab308" stroke-width="4" stroke-dasharray="20 20" class="naring" />
          <g class="nabop">
            <circle cx="160" cy="160" r="120" fill="${bgColor}" />
            <text x="160" y="145" text-anchor="middle" class="t1">NEW</text>
            <text x="160" y="185" text-anchor="middle" class="t2">ARRIVAL</text>
            <text x="160" y="235" text-anchor="middle" class="t3">LATEST DEEP</text>
          </g>
        </g>
      </svg>`,
    }
  ];

  return (
    <div className="space-y-6 relative z-10 w-full">
      <div className="ds-apple-surface rounded-[28px] p-6 md:p-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
            <div>
              <h2 className="ds-apple-display text-2xl md:text-3xl font-bold mb-3 text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-2">
                Earn with DEEP SHOP
              </h2>
              <p className="text-sm ds-apple-muted max-w-xl leading-relaxed">
                Put these custom animated stickers on your videos (Facebook, TikTok, YouTube). 
                Add our website link to your video description or comment section. 
                <strong className="text-[#1D1D1F] dark:text-[#F5F5F7] block mt-3 px-3.5 py-2 bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] rounded-xl w-max tabular-nums">
                  Reward: {formatPrice(10)} per 1k views
                </strong>
              </p>
            </div>
            
            <div className="shrink-0 ds-apple-surface-subtle p-4 rounded-2xl flex flex-col gap-2">
              <label className="text-[11px] font-semibold ds-apple-muted uppercase tracking-wider">
                Sticker Background
              </label>
              <div className="ds-apple-segmented relative flex rounded-full p-1">
                {(["white", "black"] as const).map((scheme) => {
                  const active = colorScheme === scheme;
                  return (
                    <button
                      key={scheme}
                      type="button"
                      onClick={() => {
                        triggerHaptic("selection");
                        setColorScheme(scheme);
                      }}
                      className={`relative z-10 flex-1 py-1.5 px-4 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                        active
                          ? "text-[#1D1D1F] dark:text-[#F5F5F7]"
                          : "ds-apple-muted"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="stickerColorPill"
                          transition={
                            prefersReducedMotion ? { duration: 0.14 } : APPLE_SPRING_SNAPPY
                          }
                          className="absolute inset-0 -z-10 rounded-full bg-white dark:bg-[#3A3A3C] shadow-xs"
                        />
                      )}
                      {scheme === "white" ? "Light" : "Dark"}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 text-center">
            {stickers.map((st) => (
               <div key={st.id} className="ds-apple-surface-subtle rounded-[24px] p-5 flex flex-col items-center justify-between group relative overflow-hidden transition-transform hover:-translate-y-0.5">
                 <div 
                   className="w-32 h-32 md:w-36 md:h-36 mb-4 relative z-10 flex shrink-0 items-center justify-center"
                   dangerouslySetInnerHTML={{ __html: st.svg }}
                 ></div>
                 
                 <div className="flex-1 flex flex-col justify-end w-full">
                   <h3 className="font-bold text-[#1D1D1F] dark:text-[#F5F5F7] text-sm md:text-base mb-1">{st.title}</h3>
                   <p className="text-xs ds-apple-muted mb-4 px-2 line-clamp-2 leading-snug">
                     {st.desc}
                   </p>
                   <button 
                     onClick={() => {
                       triggerHaptic("medium");
                       handleDownload(st.id, `vibe-${st.id}.gif`);
                     }}
                     disabled={generatingGif === st.id}
                     type="button"
                     className="ds-apple-btn-primary inline-flex items-center justify-center text-xs font-semibold py-2.5 px-4 rounded-full w-full whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
                   >
                     {generatingGif === st.id ? (
                       <><Loader2 className="mr-1.5 w-[14px] h-[14px] shrink-0 animate-spin" /> Generating...</>
                     ) : (
                       <><Icon name="download" className="mr-1.5 shrink-0" style={{ width: '14px', height: '14px' }} /> Download GIF</>
                     )}
                   </button>
                 </div>
               </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
            <div className="ds-apple-surface-subtle rounded-[24px] p-6 flex flex-col justify-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center shrink-0">
                <Icon name="info-circle" className="text-xl" />
              </div>
              <div>
                <h4 className="font-bold text-[#1D1D1F] dark:text-[#F5F5F7] text-base mb-2">How to claim your reward</h4>
                <p className="text-sm ds-apple-muted leading-relaxed mb-4">
                  Once your video reaches at least <strong className="text-[#1D1D1F] dark:text-[#F5F5F7]">1,000 views</strong>, submit its link in the form. Our team verifies the view count and link placement, then credits your Wallet.
                </p>
                <p className="text-xs font-semibold text-[#248A3D] dark:text-[#30D158] tabular-nums">
                  Payout Rate: {formatPrice(10)} per 1k views · Unlimited videos
                </p>
              </div>
            </div>

            <div className="ds-apple-surface-subtle rounded-[24px] p-6">
               <h4 className="font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-4 flex items-center gap-2">
                 <Icon name="video" className="text-[#0071E3] dark:text-[#0A84FF]" />
                 Submit Your Video
               </h4>
               <form onSubmit={handleVideoSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold ds-apple-muted block mb-1.5">
                      Video URL (TikTok/YouTube/Facebook)
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="e.g. https://tiktok.com/@profile/video/123"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="ds-apple-input w-full px-4 py-3 rounded-2xl block text-sm font-medium outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    onClick={() => triggerHaptic("medium")}
                    className="ds-apple-btn-primary w-full h-12 px-5 rounded-full mt-2 text-sm font-semibold flex items-center justify-center whitespace-nowrap disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? <span className="w-28 h-4 rounded-full ds-skeleton inline-block" /> : "Send Request For Review"}
                  </button>
               </form>
            </div>
          </div>

        </div>
      </div>

      {/* Generation Modal overlay */}
      <LiquidGlassPopup
        open={Boolean(generatingGif || generatedUrl)}
        closeOnBackdrop={!generatingGif}
        onClose={() => {
          if (!generatingGif) {
            setGeneratedUrl(null);
            setGeneratedName("");
          }
        }}
        title={generatingGif ? "Rendering Premium GIF..." : "Your GIF is Ready!"}
        description={
          generatingGif
            ? `Please wait, rendering frame by frame for max quality (${gifProgress}%).`
            : "Share your custom partner sticker directly or save it to your device."
        }
        primaryAction={
          !generatingGif && generatedUrl
            ? {
                label: "Share GIF",
                onClick: handleShareOrDownload,
              }
            : undefined
        }
        secondaryAction={
          !generatingGif && generatedUrl
            ? {
                label: "Close",
                onClick: () => {
                  setGeneratedUrl(null);
                  setGeneratedName("");
                },
              }
            : undefined
        }
      >
        {generatingGif ? (
          <div className="py-4 space-y-3">
            <div className="w-full h-32 rounded-2xl ds-skeleton" />
            <div className="w-full h-3 rounded-full ds-skeleton" />
          </div>
        ) : generatedUrl ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-48 h-48 ds-liquid-section p-3 flex items-center justify-center overflow-hidden">
              <img
                src={generatedUrl}
                className="w-full h-full object-contain select-auto pointer-events-auto"
                alt="Generated Sticker"
              />
            </div>
            <a
              href={generatedUrl}
              download={generatedName}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Download file directly
            </a>
          </div>
        ) : null}
      </LiquidGlassPopup>
    </div>
  );
};

const CreatorHub: React.FC<{ userData: UserProfile }> = ({ userData }) => {
  const notify = useNotify();
  const { formatPrice } = useRegion();
  const [platform, setPlatform] = useState("youtube");
  const [videoUrl, setVideoUrl] = useState("");
  const [channelUrl, setChannelUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "creator_videos"),
      where("userId", "==", userData.uid),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const v: any[] = [];
      snapshot.forEach((d) => v.push({ id: d.id, ...d.data() }));
      setHistory(v);
    }, (error) => {
      console.error("Error fetching creator_videos", error);
    });
    return () => unsub();
  }, [userData]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelUrl) return notify("Please enter your channel link", "error");

    setSubmitting(true);
    try {
      await updateDoc(doc(db, "users", userData.uid), {
        creatorStatus: "pending",
        creatorApplyDate: Date.now(),
      });
      await addDoc(collection(db, "creator_requests"), {
        userId: userData.uid,
        userName: userData.displayName || "Unknown",
        email: userData.email,
        channelUrl,
        platform,
        status: "pending",
        createdAt: Date.now(),
      });
      notify("Application submitted for review!", "success");
      setChannelUrl("");
    } catch (err) {
      console.error(err);
      notify("Failed to submit application", "error");
    }
    setSubmitting(false);
  };

  const handleVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl) return notify("Please enter the video URL", "error");

    setSubmitting(true);
    let reward = 0;
    if (platform === "youtube") reward = 100;
    if (platform === "facebook") reward = 150;
    if (platform === "tiktok") reward = 200;

    try {
      const data = {
        userId: userData.uid,
        userName: userData.displayName || "Unknown",
        userCode: userData.affiliateCode || "",
        platform,
        videoUrl,
        rewardAmount: reward,
        status: "pending",
        createdAt: Date.now(),
      };
      await addDoc(collection(db, "creator_videos"), data);

      // Send to Telegram
      await sendCreatorVideoToTelegram(data);

      notify("Video submitted for review successfully!", "success");
      setVideoUrl("");
    } catch (err) {
      console.error(err);
      notify("Failed to submit video", "error");
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="ds-apple-surface rounded-[28px] p-6 md:p-8">
        <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2.5 text-[#1D1D1F] dark:text-[#F5F5F7]">
          <Icon name="video" className="text-[#0071E3] dark:text-[#0A84FF]" /> Content Creator Hub
        </h2>
        <div className="ds-apple-surface-subtle p-5 rounded-2xl mb-6">
          <h3 className="font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7] mb-3">
            Rules & Guidelines
          </h3>
          <ul className="list-disc pl-5 space-y-2 ds-apple-muted text-sm tabular-nums">
            <li>
              <strong className="text-[#1D1D1F] dark:text-[#F5F5F7]">Eligibility:</strong> YouTube (1k+ subscribers), Facebook (5k+ followers), TikTok (10k+ followers).
            </li>
            <li>
              <strong className="text-[#1D1D1F] dark:text-[#F5F5F7]">YouTube:</strong> Minimum 1000 views to get {formatPrice(100)}.
            </li>
            <li>
              <strong className="text-[#1D1D1F] dark:text-[#F5F5F7]">Facebook:</strong> Minimum 1000 views to get {formatPrice(150)}.
            </li>
            <li>
              <strong className="text-[#1D1D1F] dark:text-[#F5F5F7]">TikTok:</strong> Minimum 5000 views to get {formatPrice(200)}.
            </li>
            <li>
              Video must explicitly mention that{" "}
              <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                DEEP SHOP
              </span>{" "}
              is sponsoring the video.
            </li>
            <li>
              Description must include our website link:{" "}
              <span className="font-semibold text-[#0071E3] dark:text-[#0A84FF]">
                https://www.deepshop.top
              </span>
            </li>
            <li>
              You must talk about DEEP SHOP products & features for at least{" "}
              <strong className="text-[#1D1D1F] dark:text-[#F5F5F7]">1 minute</strong>.
            </li>
            <li>
              No limit! You can submit an unlimited number of videos as long as
              they meet the target.
            </li>
          </ul>
        </div>

        {userData.creatorStatus === 'approved' ? (
          <form onSubmit={handleVideoSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold ds-apple-muted block mb-1.5">
                Social Media Platform
              </label>
              <CustomDropdown
                options={[
                  { value: "youtube", label: `YouTube (Min 1000 views - ${formatPrice(100)})` },
                  { value: "facebook", label: `Facebook (Min 1000 views - ${formatPrice(150)})` },
                  { value: "tiktok", label: `TikTok (Min 5000 views - ${formatPrice(200)})` }
                ]}
                value={platform}
                onChange={(val) => setPlatform(val)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold ds-apple-muted block mb-1.5">
                Video URL
              </label>
              <input
                type="url"
                required
                placeholder={
                  platform === 'youtube' ? "https://youtube.com/watch?v=..." :
                  platform === 'facebook' ? "https://facebook.com/.../videos/..." :
                  platform === 'tiktok' ? "https://tiktok.com/@profile/video/..." :
                  "https://..."
                }
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="ds-apple-input w-full px-4 py-3 rounded-2xl block text-sm font-medium outline-none"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={submitting}
                onClick={() => triggerHaptic("medium")}
                className="ds-apple-btn-primary w-full h-12 px-5 rounded-full text-sm font-semibold flex items-center justify-center whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Video For Review"}
              </button>
            </div>
          </form>
        ) : userData.creatorStatus === 'pending' ? (
           <div className="ds-apple-surface-subtle p-6 rounded-2xl text-center">
             <Icon name="clock" className="text-4xl ds-apple-muted mb-2" />
             <h3 className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Application Under Review</h3>
             <p className="text-sm ds-apple-muted mt-2">We are reviewing your channel/page to ensure it meets our guidelines. Please check back later.</p>
           </div>
        ) : userData.creatorStatus === 'rejected' ? (
           <div className="bg-[#FF3B30]/10 p-6 rounded-2xl text-center border border-[#FF3B30]/25">
             <Icon name="times-circle" className="text-4xl text-[#FF3B30] dark:text-[#FF453A] mb-2" />
             <h3 className="font-semibold text-[#FF3B30] dark:text-[#FF453A]">Application Not Approved</h3>
             <p className="text-sm text-[#FF3B30] dark:text-[#FF453A] mt-2">Unfortunately, your application was not approved. <br/><strong>Reason:</strong> {userData.creatorRejectReason || "Did not meet follower/subscriber criteria."}</p>
             {userData.creatorApplyDate && Date.now() - userData.creatorApplyDate > 24 * 60 * 60 * 1000 ? (
               <button
                 type="button"
                 onClick={async () => {
                   triggerHaptic("medium");
                   await updateDoc(doc(db, "users", userData.uid), { creatorStatus: "none" });
                 }}
                 className="ds-apple-btn-secondary mt-4 px-5 h-10 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer"
               >
                 Re-apply Now
               </button>
             ) : (
               <p className="text-xs ds-apple-muted mt-4">You can re-apply after 24 hours.</p>
             )}
           </div>
        ) : (
          <form onSubmit={handleApply} className="space-y-4">
             <div>
              <label className="text-xs font-semibold ds-apple-muted block mb-1.5">
                Channel / Page Platform
              </label>
              <CustomDropdown
                options={[
                  { value: "youtube", label: "YouTube Channel (1k+ Subs)" },
                  { value: "facebook", label: "Facebook Page/Profile (5k+ Followers)" },
                  { value: "tiktok", label: "TikTok ID (10k+ Followers)" }
                ]}
                value={platform}
                onChange={(val) => setPlatform(val)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold ds-apple-muted block mb-1.5">
                Channel/Page/Profile URL
              </label>
              <input
                type="url"
                required
                placeholder={
                  platform === 'youtube' ? "https://youtube.com/@channel" :
                  platform === 'facebook' ? "https://facebook.com/page" :
                  platform === 'tiktok' ? "https://tiktok.com/@profile" :
                  "https://..."
                }
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                className="ds-apple-input w-full px-4 py-3 rounded-2xl block text-sm font-medium outline-none"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={submitting}
                onClick={() => triggerHaptic("medium")}
                className="ds-apple-btn-primary w-full h-12 px-5 rounded-full text-sm font-semibold flex items-center justify-center whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Applying..." : "Apply for Creator Hub"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ... existing imports ...
const AffiliatePage: React.FC = () => {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();
  const activeTab = tab || "dashboard";
  const { formatPrice } = useRegion();
  const notify = useNotify();
  const [userData, setUserData] = useState<UserProfile | any>({});
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any>({});
  const [formData, setFormData] = useState({ fullName: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    // legacy storage support
    sessionStorage.setItem('affiliateActiveTab', activeTab);
  }, [activeTab]);
  const [tempCode, setTempCode] = useState("");
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [savingCode, setSavingCode] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [showTour, setShowTour] = useState(true);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
          if (snap.exists()) {
            setUserData({ uid: snap.id, ...snap.data() });
          } else {
            setUserData({ uid: user.uid, email: user.email, isAffiliate: false });
          }
          setLoading(false);
        });

        const qLogs = query(
          collection(db, "affiliate_logs"),
          where("affiliateId", "==", user.uid)
        );
        const unsubLogs = onSnapshot(qLogs, (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          list.sort((a: any, b: any) => {
            const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
            const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
            return Number(timeB) - Number(timeA);
          });
          setLogs(list);
        }, (error) => {
          console.warn("Notice fetching affiliate_logs:", error);
          setLogs([]);
        });

        return () => {
          unsubUser();
          unsubLogs();
        };
      } else {
        setLoading(false);
        navigate("/auth-selector");
      }
    });

    const unsubConfig = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) {
        setConfigs(snap.data());
      }
    });

    return () => {
      unsubAuth();
      unsubConfig();
    };
  }, [navigate]);

  const handleApplyAffiliate = async (data: any) => {
    if (!userData.uid) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, "users", userData.uid), {
        isAffiliateReview: true,
        affiliateStatus: "pending",
        fullName: data.fullName,
        phone: data.phone,
      });
      await addDoc(collection(db, "affiliate_requests"), {
        userId: userData.uid,
        email: userData.email,
        fullName: data.fullName,
        phone: data.phone,
        socialUrl: data.socialUrl,
        platform: data.platform,
        followerCount: data.followerCount,
        promotionMethod: data.promotionMethod,
        additionalInfo: data.additionalInfo,
        status: "pending",
        createdAt: Date.now(),
      });
      await sendAffiliateRequestToTelegram({
        userId: userData.uid,
        userName: data.fullName,
        fullName: data.fullName,
        phone: data.phone,
        email: userData.email || "",
        socialUrl: data.socialUrl,
        platform: data.platform,
        followerCount: data.followerCount,
        promotionMethod: data.promotionMethod,
        additionalInfo: data.additionalInfo,
        createdAt: Date.now(),
      });
      notify("Request submitted successfully", "success");
    } catch (err) {
      console.error(err);
      notify("Failed to submit request", "error");
    }
    setSubmitting(false);
  };

  if (loading || !userData?.uid) {
    return <ProfileSettingsPageSkeleton />;
  }

  if (userData.affiliateStatus === "pending") {
    return (
      <div className="ds-apple-shop-canvas min-h-screen pb-24">
        <div className="max-w-lg mx-auto px-4 pt-10 sm:pt-14 text-center">
          <div className="mb-6">
            <p className="ds-apple-eyebrow mb-1">Application Status</p>
            <h1 className="ds-apple-display text-[22px] sm:text-[26px] leading-tight font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
              Partner Program
            </h1>
          </div>
          <div className="ds-apple-surface rounded-[28px] p-8 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center mx-auto">
              <Clock className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
              Your request is under review
            </h2>
            <p className="text-sm ds-apple-muted leading-relaxed">
              We will notify you once your Partner application has been processed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!userData.isAffiliate) {
    return (
      <div className="ds-apple-shop-canvas min-h-screen pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
          <div className="mb-8 text-center md:text-left">
            <p className="ds-apple-eyebrow mb-1.5">Partner Program</p>
            <h1 className="ds-apple-display text-[24px] sm:text-[30px] leading-tight font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-3">
              Partner &amp; Earn
            </h1>
            <p className="ds-apple-muted text-sm font-medium leading-relaxed max-w-xl">
              Join our exclusive network. Share your custom promo code to give
              your audience 5% OFF, and earn up to{" "}
              <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                {formatPrice(200)} commission
              </span>{" "}
              for every successful sale directly to your wallet based on your
              tier.
            </p>
          </div>

          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="ds-apple-surface p-6 flex flex-col items-start gap-2 rounded-[24px]">
              <h3 className="font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                5% Flat Discount
              </h3>
              <p className="text-xs ds-apple-muted font-medium leading-relaxed">
                Your audience gets a flat discount on every purchase using your
                code.
              </p>
            </div>
            <div className="ds-apple-surface p-6 flex flex-col items-start gap-2 rounded-[24px]">
              <h3 className="font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                Tiered Commission
              </h3>
              <p className="text-xs ds-apple-muted font-medium leading-relaxed tabular-nums">
                The more you sell, the more you earn. Reach higher tiers for up
                to {formatPrice(200)} per sale.
              </p>
            </div>
          </div>

          <AffiliateOnboardingForm
            initialData={{
              fullName: formData.fullName,
              phone: formData.phone,
              email: userData.email || "",
            }}
            onSubmit={handleApplyAffiliate}
            isSubmitting={submitting}
          />
        </div>
      </div>
    );
  }

  const getConfigVal = (key: string, fallback: number) =>
    configs?.[key] ?? fallback;

  const minWithdrawal = getConfigVal("affiliateMinWithdrawal", 50);
  const t1Limit = getConfigVal("affiliateTier1Threshold", 3);
  const t1Comm = getConfigVal("affiliateTier1Commission", 50);
  const t2Limit = getConfigVal("affiliateTier2Threshold", 10);
  const t2Comm = getConfigVal("affiliateTier2Commission", 100);
  const t3Limit = getConfigVal("affiliateTier3Threshold", 20);
  const t3Comm = getConfigVal("affiliateTier3Commission", 150);
  const t4Limit = getConfigVal("affiliateTier4Threshold", 30);
  const t4Comm = getConfigVal("affiliateTier4Commission", 200);

  const salesCount = logs.length;

  let currentTier = 1;
  let currentTarget = t1Limit;
  let prevTarget = 0;
  let currentCommission = t1Comm;
  let nextCommission = t2Comm;

  if (salesCount >= t3Limit) {
    currentTier = 4;
    prevTarget = t3Limit;
    currentTarget = t4Limit;
    currentCommission = t4Comm;
    nextCommission = t4Comm;
  } else if (salesCount >= t2Limit) {
    currentTier = 3;
    prevTarget = t2Limit;
    currentTarget = t3Limit;
    currentCommission = t3Comm;
    nextCommission = t4Comm;
  } else if (salesCount >= t1Limit) {
    currentTier = 2;
    prevTarget = t1Limit;
    currentTarget = t2Limit;
    currentCommission = t2Comm;
    nextCommission = t3Comm;
  }

  let progressPercent = 0;
  if (currentTier === 4 && salesCount >= t4Limit) {
    progressPercent = 100;
  } else {
    progressPercent = Math.min(
      100,
      Math.max(
        0,
        ((salesCount - prevTarget) / (currentTarget - prevTarget)) * 100,
      ),
    );
  }

  const affiliateCode =
    userData.affiliateCode ||
    `AFF-${userData.uid.substring(0, 6).toUpperCase()}`;
  const shareLink = `${window.location.origin}/?ref=${affiliateCode}`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopying(true);
      notify("Copied!", "success");
      setTimeout(() => setIsCopying(false), 2000);
    } catch (err) {
      notify("Failed to copy", "error");
    }
  };

  const handleSaveCode = async () => {
    let userCode = tempCode.trim().toUpperCase();
    if (!userCode || userCode.length < 3)
      return notify("Code must be at least 3 characters", "error");
    if (!/^[A-Z0-9_-]+$/.test(userCode))
      return notify(
        "Only letters, numbers, hyphens and underscores allowed",
        "error",
      );

    const code = userCode;

    const reservedWords = [
      "TEST",
      "USER",
      "ADMIN",
      "SYSTEM",
      "DEFAULT",
      "PROMO",
      "DISCOUNT",
    ];
    if (reservedWords.includes(userCode) && userData.role !== "admin") {
      return notify(
        "This promo code name is reserved. Choose another name.",
        "error",
      );
    }

    if (code === userData.affiliateCode) {
      setIsEditingCode(false);
      return;
    }

    setSavingCode(true);
    try {
      // Check if coupon exists
      const couponQ = query(
        collection(db, "coupons"),
        where("code", "==", code),
      );
      const snap = await getDocs(couponQ);
      if (!snap.empty) {
        notify("This promo code is already taken!", "error");
        setSavingCode(false);
        return;
      }

      // Update user document
      await updateDoc(doc(db, "users", userData.uid), { affiliateCode: code });

      // Add new coupon
      await addDoc(collection(db, "coupons"), {
        code: code,
        discount: 5,
        type: "percent",
        maxUses: 999999,
        usedCount: 0,
        isActive: true,
        isAffiliate: true,
        affiliateId: userData.uid,
        createdAt: Date.now(),
      });

      notify("Custom promo code saved!", "success");
      setIsEditingCode(false);
    } catch (e) {
      notify("Failed to save code", "error");
    }
    setSavingCode(false);
  };

  // Compute chart data
  const getChartData = () => {
    const last12Months = Array.from({ length: 6 })
      .map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        return {
          month: d.toLocaleString("default", { month: "short" }),
          year: d.getFullYear(),
          earned: 0,
          sales: 0,
        };
      })
      .reverse();

    logs.forEach((log: any) => {
      let d = new Date();
      if (log.createdAt) {
        d = log.createdAt.toDate ? log.createdAt.toDate() : new Date(log.createdAt);
      }
      
      if (isNaN(d.getTime())) {
          return; // skip invalid dates
      }

      const month = d.toLocaleString("default", { month: "short" });
      const year = d.getFullYear();
      const match = last12Months.find(
        (m) => m.month === month && m.year === year,
      );
      if (match) {
        match.earned += log.commission || 0;
        match.sales += 1;
      }
    });
    return last12Months;
  };

  const chartData = getChartData();

  return (
    <div className="ds-apple-shop-canvas min-h-screen pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 sm:pt-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="ds-apple-eyebrow">
              {activeTab === "menu" ? "Partner Portal" : "Affiliate Portal"}
            </p>
            <h1 className="ds-apple-display text-[22px] sm:text-[26px] font-bold tracking-[-0.02em] leading-tight text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
              {activeTab === "menu"
                ? "Partners"
                : activeTab === "dashboard"
                ? "Partner Dashboard"
                : activeTab === "creator_hub"
                ? "Creator Hub"
                : "Small Creators"}
            </h1>
          </div>

          {activeTab !== "menu" && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                navigate("/affiliate/menu");
              }}
              className="ds-apple-btn-secondary h-9 px-4 rounded-full text-xs font-semibold shrink-0 whitespace-nowrap active:scale-[0.97] transition-transform cursor-pointer"
            >
              All Hubs
            </button>
          )}
        </div>
        {activeTab === "menu" ? (
          <div className="space-y-3">
            {tabsData.map((itemTab) => {
              const IconCmp = itemTab.icon;
              return (
                <button
                  key={itemTab.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    navigate(`/affiliate/${itemTab.id}`);
                  }}
                  className="ds-apple-surface w-full rounded-[24px] p-5 flex items-center justify-between text-left active:scale-[0.985] transition-transform cursor-pointer"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center shrink-0">
                      <IconCmp className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[17px] text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {itemTab.title}
                      </h3>
                      <p className="text-xs sm:text-sm ds-apple-muted">
                        Open {itemTab.title.toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <div className="w-9 h-9 ds-apple-surface-subtle rounded-full flex items-center justify-center shrink-0">
                    <Icon name="chevron-right" className="text-sm ds-apple-muted" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : activeTab === "dashboard" ? (
          <div className="space-y-6">
            {/* Apple Wallet Partner Balance Card */}
            <div className="rounded-[28px] bg-[#1D1D1F] dark:bg-[#1C1C1E] text-white p-6 sm:p-8 border border-black/10 dark:border-white/10 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#0071E3] dark:bg-[#0A84FF] flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
                      Partner Wallet
                    </p>
                    <p className="text-xs font-semibold text-white/90">
                      Level {currentTier} Tier
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-[#30D158] tabular-nums">
                  +{formatPrice(currentCommission)} / sale
                </span>
              </div>

              <div className="flex flex-wrap justify-between items-end gap-4 mb-6 tabular-nums">
                <div>
                  <p className="text-white/65 font-medium text-xs uppercase tracking-wider mb-1">
                    Total Earned
                  </p>
                  <h2 className="text-4xl sm:text-[3.25rem] font-bold tracking-[-0.03em] leading-none">
                    {formatPrice(
                      (userData.walletBalance || 0) +
                        logs.reduce(
                          (acc: any, log: any) => acc + (log.commission || 0),
                          0
                        )
                    )}
                  </h2>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-white/65 font-medium text-xs uppercase tracking-wider mb-1">
                    Available Balance
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold tracking-tight text-[#30D158]">
                    {formatPrice(userData.walletBalance || 0)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("medium");
                    navigate("/withdraw");
                  }}
                  className="bg-[#0071E3] hover:bg-[#0077ED] dark:bg-[#0A84FF] text-white px-5 min-h-[42px] rounded-full font-semibold text-[13px] sm:text-sm whitespace-nowrap shrink-0 transition-transform active:scale-[0.97] cursor-pointer"
                >
                  Withdraw Funds
                </button>
                <span className="text-xs text-white/60 tabular-nums">
                  Min payout: {formatPrice(minWithdrawal)}
                </span>
              </div>
            </div>

            {/* Partner Tracker Card */}
            <div className="ds-apple-surface rounded-[24px] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                  Partner Tracker
                </h3>
                <span className="text-xs font-semibold ds-apple-muted tabular-nums">
                  Level {currentTier}
                </span>
              </div>

              <div className="space-y-5 tabular-nums">
                <div className="flex items-center justify-between pb-5 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <div>
                    <h4 className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] text-sm sm:text-base mb-1">
                      Total Sales Record
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-[#248A3D] dark:text-[#30D158]">
                        {salesCount}
                      </span>
                      <span className="text-xs ds-apple-muted font-medium">
                        / {currentTarget} Goal
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold ds-apple-muted mb-0.5">
                      Level {currentTier}
                    </p>
                    <p className="text-xs ds-apple-muted font-medium">
                      {formatPrice(currentCommission)} Cap
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pb-5 border-b border-black/[0.06] dark:border-white/[0.08] gap-4">
                  <div>
                    <h4 className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] text-sm sm:text-base mb-1">
                      Sales Progress
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {progressPercent.toFixed(0)}%
                      </span>
                      <span className="text-xs ds-apple-muted font-medium">
                        to next Level
                      </span>
                    </div>
                  </div>
                  <div className="w-32 sm:w-40 bg-black/[0.08] dark:bg-white/[0.12] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#0071E3] dark:bg-[#0A84FF] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] text-sm sm:text-base mb-1">
                      Next Cap Target
                    </h4>
                    <span className="font-bold text-lg text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {formatPrice(nextCommission)}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold ds-apple-muted mb-1">
                      Shares: {currentTier}
                    </p>
                    <span className="inline-block bg-[#248A3D]/12 dark:bg-[#30D158]/16 text-[#248A3D] dark:text-[#30D158] px-3 py-1 rounded-full text-[11px] font-semibold">
                      {currentTier === 4 && salesCount >= t4Limit
                        ? "MAX Level"
                        : `+${currentTarget - salesCount} to reach`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Chart */}
            <div className="ds-apple-surface p-6 sm:p-8 rounded-[24px] overflow-hidden relative hidden md:block">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                  Performance Over Time
                </h2>
                <div className="flex items-center gap-1.5 text-xs font-semibold ds-apple-muted">
                  <span className="w-2 h-2 rounded-full bg-[#0071E3] dark:bg-[#0A84FF]" />
                  <span>Sales</span>
                </div>
              </div>
              <div className="h-56 w-full min-w-0 min-h-[200px] -ml-2">
                <ResponsiveContainer
                  width="100%"
                  height={224}
                  minWidth={100}
                  minHeight={200}
                >
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0071E3" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#0071E3" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#6E6E73" }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#6E6E73" }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{
                        stroke: "#0071E3",
                        strokeWidth: 1.5,
                        strokeDasharray: "4 4",
                      }}
                      contentStyle={{
                        backgroundColor: "rgba(255,255,255,0.94)",
                        borderRadius: "16px",
                        border: "1px solid rgba(0,0,0,0.08)",
                        boxShadow: "0 12px 32px -8px rgba(0,0,0,0.16)",
                        padding: "10px 14px",
                      }}
                      itemStyle={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "#0071E3",
                      }}
                      labelStyle={{
                        fontSize: "11px",
                        color: "#6E6E73",
                        fontWeight: "600",
                        marginBottom: "2px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      name="Total Sales"
                      stroke="#0071E3"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorSales)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Promotion Hub */}
            <div className="ds-apple-surface rounded-[24px] p-6 sm:p-8">
              <h3 className="text-lg sm:text-xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-2 tracking-tight">
                Your Promotion Hub
              </h3>
              <p className="text-sm font-medium ds-apple-muted mb-6 max-w-md tabular-nums">
                Share your code everywhere. Customers get{" "}
                <span className="text-[#1D1D1F] dark:text-[#F5F5F7] font-bold">
                  5% OFF
                </span>{" "}
                instantly, and you earn{" "}
                <span className="text-[#248A3D] dark:text-[#30D158] font-bold">
                  {formatPrice(currentCommission)}
                </span>{" "}
                immediately upon delivery.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Custom Promo Code */}
                <div>
                  <label className="text-xs font-semibold ds-apple-muted tracking-wide uppercase mb-2 block">
                    Custom Promo Code
                  </label>
                  {isEditingCode ? (
                    <div className="ds-apple-input flex p-1.5 rounded-2xl h-14 border-[#0071E3]! dark:border-[#0A84FF]!">
                      <input
                        type="text"
                        value={tempCode}
                        onChange={(e) =>
                          setTempCode(e.target.value.toUpperCase())
                        }
                        className="flex-1 bg-transparent px-3.5 text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7] outline-none min-w-0"
                        placeholder="e.g. VIBE"
                      />
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("success");
                            handleSaveCode();
                          }}
                          disabled={savingCode}
                          className="ds-apple-btn-primary w-11 flex items-center justify-center rounded-xl cursor-pointer"
                        >
                          {savingCode ? (
                            <Icon name="spinner-third" className="animate-spin text-sm" />
                          ) : (
                            <Icon name="check" className="text-sm" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("selection");
                            setIsEditingCode(false);
                            setTempCode(userData.affiliateCode || "");
                          }}
                          className="ds-apple-btn-secondary w-11 flex items-center justify-center rounded-xl cursor-pointer"
                        >
                          <Icon name="times" className="text-sm" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="ds-apple-input flex p-1.5 rounded-2xl h-14">
                      <input
                        type="text"
                        readOnly
                        value={affiliateCode}
                        className="flex-1 bg-transparent px-3.5 text-base font-bold text-[#1D1D1F] dark:text-[#F5F5F7] outline-none min-w-0"
                      />
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("selection");
                            setIsEditingCode(true);
                          }}
                          className="ds-apple-btn-secondary px-4 text-xs font-semibold whitespace-nowrap rounded-xl cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("success");
                            copyToClipboard(affiliateCode);
                          }}
                          className="ds-apple-btn-primary px-5 text-xs font-semibold whitespace-nowrap rounded-xl cursor-pointer"
                        >
                          {isCopying ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct Link */}
                <div>
                  <label className="text-xs font-semibold ds-apple-muted tracking-wide uppercase mb-2 block">
                    Direct Link
                  </label>
                  <div className="ds-apple-input flex p-1.5 rounded-2xl h-14">
                    <div className="w-10 flex items-center justify-center ds-apple-muted shrink-0">
                      <Icon name="link" />
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={shareLink}
                      className="flex-1 bg-transparent px-2 text-xs font-semibold ds-apple-muted outline-none min-w-0 truncate"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("success");
                        copyToClipboard(shareLink);
                      }}
                      className="ds-apple-btn-secondary px-5 text-xs font-semibold whitespace-nowrap rounded-xl shrink-0 cursor-pointer"
                    >
                      {isCopying ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* VIP Reseller Guide Promo Banner */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                navigate("/subscription");
              }}
              className="ds-apple-surface w-full p-5 rounded-[24px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left active:scale-[0.99] transition-transform cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#FF9F0A]/15 text-[#FF9F0A] flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#B26A00] dark:text-[#FFD60A] uppercase tracking-wider mb-0.5">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Reseller Guide &amp; VIP Membership</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Resell products with unlimited 100% Cash on Delivery at ৳0 advance
                  </h4>
                  <p className="text-xs ds-apple-muted mt-0.5">
                    Complete step-by-step guide to earning from home by shipping directly to customers without holding inventory.
                  </p>
                </div>
              </div>
              <span className="ds-apple-btn-primary px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 self-start sm:self-center">
                View Guide &amp; Plans
              </span>
            </button>

            {/* Recent Transactions & Marketing Tips */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-lg font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Recent Transactions
                  </h3>
                  <span className="text-xs font-semibold text-[#248A3D] dark:text-[#30D158] uppercase tracking-wider tabular-nums">
                    {logs.length} Sales
                  </span>
                </div>

                {logs.length === 0 ? (
                  <div className="ds-apple-surface p-8 rounded-[24px] text-center">
                    <div className="w-14 h-14 ds-apple-surface-subtle rounded-full flex items-center justify-center mx-auto mb-3 ds-apple-muted">
                      <Icon name="receipt" className="text-2xl" />
                    </div>
                    <h4 className="font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
                      No transactions yet
                    </h4>
                    <p className="text-sm ds-apple-muted max-w-[220px] mx-auto">
                      Earnings appear here when your code is used.
                    </p>
                  </div>
                ) : (
                  <div className="ds-apple-surface rounded-[24px] overflow-hidden divide-y divide-black/[0.06] dark:divide-white/[0.08] tabular-nums">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 sm:p-5 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-full bg-[#248A3D]/12 dark:bg-[#30D158]/16 text-[#248A3D] dark:text-[#30D158] flex items-center justify-center shrink-0">
                            <Icon name="arrow-down-left" className="text-sm font-bold" />
                          </div>
                          <div>
                            <p className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] text-sm mb-0.5">
                              Sale Commission
                            </p>
                            <p className="text-xs ds-apple-muted">
                              {log.createdAt
                                ? log.createdAt.toDate
                                  ? log.createdAt.toDate().toLocaleDateString()
                                  : new Date(log.createdAt).getTime()
                                  ? new Date(log.createdAt).toLocaleDateString()
                                  : "N/A"
                                : "N/A"}{" "}
                              · {log.customerName || "Customer"}
                            </p>
                          </div>
                        </div>
                        <p className="font-bold text-[#248A3D] dark:text-[#30D158] text-base">
                          +{formatPrice(log.commission)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="lg:col-span-1">
                <div className="bg-[#1D1D1F] dark:bg-[#1C1C1E] p-6 sm:p-7 rounded-[24px] text-white h-full border border-black/10 dark:border-white/10">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-5">
                    <Icon name="bolt" className="text-[#30D158]" />
                  </div>
                  <h3 className="text-lg font-bold tracking-tight mb-5">
                    Marketing Tips
                  </h3>

                  <div className="space-y-3.5">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <h4 className="font-semibold text-white text-sm flex items-center gap-2 mb-1.5">
                        <Icon name="instagram" className="text-[#0A84FF]" /> Social Media Bio
                      </h4>
                      <p className="text-xs text-white/75 leading-relaxed">
                        Add your link to Instagram, TikTok, and bio. Mention &ldquo;Use code{" "}
                        <span className="font-bold text-[#30D158] uppercase">
                          {userData.affiliateCode || "VIBE"}
                        </span>{" "}
                        for 5% off&rdquo;.
                      </p>
                    </div>

                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <h4 className="font-semibold text-white text-sm flex items-center gap-2 mb-1.5">
                        <Icon name="video" className="text-[#0A84FF]" /> Review Unboxings
                      </h4>
                      <p className="text-xs text-white/75 leading-relaxed">
                        Create short 15-30s reels testing products and pin your affiliate link in comments.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("success");
                        copyToClipboard(
                          `Grab 5% OFF on premium products & genuine mobiles at DEEP SHOP using my code: ${
                            userData.affiliateCode || "VIBE"
                          }. Shop here: ${shareLink}`
                        );
                      }}
                      className="w-full text-left bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/10 transition-colors cursor-pointer group"
                    >
                      <h4 className="font-semibold text-white text-sm flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-2">
                          <Icon name="copy" className="text-[#30D158]" /> Quick Share Script
                        </span>
                        <span className="text-[11px] text-white/60 group-hover:text-[#30D158]">
                          Tap to Copy
                        </span>
                      </h4>
                      <p className="text-xs text-white/75 italic leading-relaxed">
                        &ldquo;Grab 5% OFF on premium products &amp; genuine mobiles at DEEP SHOP using my code:{" "}
                        {userData.affiliateCode || "VIBE"}. Shop here: {shareLink}&rdquo;
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "creator_hub" ? (
          <CreatorHub userData={userData} />
        ) : (
          <SmallCreatorsHub userData={userData} />
        )}
      </div>
    </div>
  );
};

export default AffiliatePage;
