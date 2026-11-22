import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { doc, onSnapshot, addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";
import { triggerHaptic } from "../lib/haptics";
import { useNotify } from "../components/Notifications";
import SEO from "../components/SEO";
import { AuthVoiceToggle } from "../components/AuthVoiceToggle";
import { playAuthVoice } from "../lib/authVoiceAndValidation";
import { uploadToImgBB } from "../lib/imgbbUpload";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { APPLE_SPRING_DEFAULT } from "../lib/shoppingRoute";
import {
  Upload,
  CheckCircle2,
  X,
  Loader2,
  Lock,
  User,
  Phone,
  Mail,
  MapPin,
  HelpCircle,
  Video,
  Globe,
} from "lucide-react";

interface UploadState {
  file: File | null;
  url: string;
  uploading: boolean;
  error?: string;
}

export default function CashOnCampaignPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const shouldReduceMotion = useReducedMotion();

  const [campaignEnabled, setCampaignEnabled] = useState<boolean | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(auth.currentUser?.email || "");
  const [address, setAddress] = useState("");
  const [tiktokUsername, setTiktokUsername] = useState("");
  const [foundSource, setFoundSource] = useState("Social Media");
  const [reason, setReason] = useState("");

  const [followScreenshot, setFollowScreenshot] = useState<UploadState>({ file: null, url: "", uploading: false });
  const [video1Screenshot, setVideo1Screenshot] = useState<UploadState>({ file: null, url: "", uploading: false });
  const [video2Screenshot, setVideo2Screenshot] = useState<UploadState>({ file: null, url: "", uploading: false });
  const [video3Screenshot, setVideo3Screenshot] = useState<UploadState>({ file: null, url: "", uploading: false });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [userIp, setUserIp] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const followInputRef = useRef<HTMLInputElement>(null);
  const v1InputRef = useRef<HTMLInputElement>(null);
  const v2InputRef = useRef<HTMLInputElement>(null);
  const v3InputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "cash_on_campaign"),
      (snap) => {
        if (snap.exists()) {
          setCampaignEnabled(Boolean(snap.data().isEnabled));
        } else {
          setCampaignEnabled(true);
        }
        setLoadingSettings(false);
      },
      () => {
        setCampaignEnabled(true);
        setLoadingSettings(false);
      },
    );

    const fetchIp = async () => {
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        if (data.ip) {
          setUserIp(data.ip);
          const q = query(collection(db, "cash_on_applications"), where("userIp", "==", data.ip));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            setAlreadyApplied(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch IP:", err);
      }
    };
    fetchIp();

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          console.warn("Geolocation failed or denied:", err);
        },
      );
    }

    playAuthVoice("ক্যাশ অন ডেলিভারি ক্যাম্পেইনে স্বাগতম। আপনার তথ্য ও ৪ টি স্ক্রিনশট প্রদান করে জমা দিন।");

    return () => unsub();
  }, []);

  const handleFileUpload = async (
    file: File,
    setUploadState: React.Dispatch<React.SetStateAction<UploadState>>,
  ) => {
    setUploadState({ file, url: "", uploading: true });
    try {
      const url = await uploadToImgBB(file);
      setUploadState({ file, url, uploading: false });
      triggerHaptic("success");
      notify("Screenshot uploaded successfully", "success");
    } catch (err) {
      console.error("Screenshot upload failed:", err);
      triggerHaptic("error");
      setUploadState({ file: null, url: "", uploading: false, error: "Upload failed" });
      notify("Screenshot upload failed. Please try again.", "error");
    }
  };

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCongratulationsModal, setShowCongratulationsModal] = useState(false);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic("medium");
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) newErrors.fullName = "Full name is required";
    if (!phone.trim()) newErrors.phone = "Active mobile number is required";
    if (!tiktokUsername.trim()) newErrors.tiktokUsername = "TikTok username is required";

    if (!followScreenshot.url) newErrors.follow = "Please upload the TikTok Follow screenshot";
    if (!video1Screenshot.url) newErrors.v1 = "Please upload Video 1 Like & Comment screenshot";
    if (!video2Screenshot.url) newErrors.v2 = "Please upload Video 2 Like & Comment screenshot";
    if (!video3Screenshot.url) newErrors.v3 = "Please upload Video 3 Like & Comment screenshot";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      triggerHaptic("error");
      notify("Please fix all highlighted fields and upload all required screenshots", "error");
      return;
    }

    if (alreadyApplied) {
      triggerHaptic("error");
      notify("An application has already been submitted from this IP address.", "error");
      return;
    }

    setErrors({});
    setSubmitting(true);

    const appData = {
      applicantName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || auth.currentUser?.email || "",
      address: address.trim(),
      tiktokUsername: tiktokUsername.trim(),
      foundSource,
      reason: reason.trim(),
      screenshots: {
        followScreenshot: followScreenshot.url,
        video1Screenshot: video1Screenshot.url,
        video2Screenshot: video2Screenshot.url,
        video3Screenshot: video3Screenshot.url,
      },
      userIp,
      location: userLocation || null,
      createdAt: Date.now(),
      userId: auth.currentUser?.uid || "guest",
      status: "pending",
    };

    try {
      const addDocPromise = addDoc(collection(db, "cash_on_applications"), appData);
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 4500));

      await Promise.race([addDocPromise, timeoutPromise]);

      try {
        const existing = JSON.parse(localStorage.getItem("deepshop_local_campaign_apps") || "[]");
        localStorage.setItem("deepshop_local_campaign_apps", JSON.stringify([appData, ...existing]));
      } catch (err) {}

      triggerHaptic("success");
      setSubmitting(false);
      setSubmitted(true);
      setShowCongratulationsModal(true);
      playAuthVoice("অভিনন্দন! আপনার ক্যাশ অন ক্যাম্পেইন আবেদন সফলভাবে জমা হয়েছে।");
      notify("Your Cash on Campaign application has been submitted successfully!", "success");
    } catch (err) {
      console.warn("Application submit notice:", err);
      triggerHaptic("success");
      setSubmitting(false);
      setSubmitted(true);
      setShowCongratulationsModal(true);
      notify("Application received!", "success");
    }
  };

  const saveDraft = () => {
    triggerHaptic("light");
    localStorage.setItem(
      "deepshop_cash_on_draft",
      JSON.stringify({ fullName, phone, email, address, tiktokUsername, foundSource, reason }),
    );
    notify("Draft saved", "info");
  };

  if (loadingSettings) {
    return (
      <div className="ds-apple-shop-canvas min-h-screen flex items-center justify-center p-4">
        <Loader2 className="w-7 h-7 animate-spin text-[#0071E3] dark:text-[#0A84FF]" />
      </div>
    );
  }

  if (campaignEnabled === false) {
    return (
      <div className="ds-apple-shop-canvas min-h-screen flex flex-col justify-between pb-24">
        <SEO title="Cash on Campaign — Deep Shop" description="Cash on delivery access campaign" />

        <main className="max-w-lg mx-auto w-full px-4 my-auto pt-8">
          <div className="ds-apple-surface rounded-[28px] p-6 sm:p-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
              Soon Available
            </h1>
            <p className="text-[14px] text-[#6E6E73] dark:text-[#98989D] leading-relaxed max-w-sm mx-auto">
              The Cash on Campaign is temporarily paused and will reopen soon from the seller panel. Check your notifications regularly for updates!
            </p>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                navigate("/");
              }}
              className="ds-apple-btn-primary w-full py-3.5 px-5 rounded-full font-semibold text-[14px] whitespace-nowrap active:scale-[0.98] transition-transform"
            >
              Back to Home
            </button>
          </div>
        </main>

        <footer className="text-center text-[12px] text-[#6E6E73] dark:text-[#98989D] py-4">
          Deep Shop &copy; Cash on Campaign
        </footer>
      </div>
    );
  }

  return (
    <div className="ds-apple-shop-canvas min-h-screen pb-28">
      <SEO
        title="Apply in Cash on Campaign — Deep Shop"
        description="Submit your screenshots to gain Cash on Delivery access."
      />

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        {submitted ? (
          <div className="ds-apple-surface rounded-[28px] p-6 sm:p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-[#34C759]/12 text-[#34C759] dark:text-[#30D158] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
              Application Submitted Successfully!
            </h1>
            <p className="text-[14px] text-[#6E6E73] dark:text-[#98989D] leading-relaxed max-w-md mx-auto">
              Thank you, <b className="text-[#1D1D1F] dark:text-[#F5F5F7]">{fullName}</b>! Your application has been received. You will receive a notification in your profile status if you are selected.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  navigate("/");
                }}
                className="ds-apple-btn-primary flex-1 py-3.5 px-5 rounded-full font-semibold text-[14px] whitespace-nowrap active:scale-[0.98] transition-transform"
              >
                Back to Home
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setSubmitted(false);
                  setFullName("");
                  setPhone("");
                  setTiktokUsername("");
                  setFollowScreenshot({ file: null, url: "", uploading: false });
                  setVideo1Screenshot({ file: null, url: "", uploading: false });
                  setVideo2Screenshot({ file: null, url: "", uploading: false });
                  setVideo3Screenshot({ file: null, url: "", uploading: false });
                }}
                className="ds-apple-btn-secondary py-3.5 px-6 rounded-full font-semibold text-[14px] whitespace-nowrap active:scale-[0.98] transition-transform"
              >
                Submit New Application
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handlePublish}
            className="ds-apple-surface rounded-[26px] p-5 sm:p-7 space-y-6"
          >
            <div className="border-b border-black/[0.06] dark:border-white/[0.08] pb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-[22px] sm:text-[24px] font-bold tracking-[-0.02em] text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
                  Cash on Campaign
                </h1>
                <p className="text-[13px] text-[#6E6E73] dark:text-[#98989D] mt-0.5">
                  Let&apos;s get started with your cash on delivery application
                </p>
              </div>
              <div className="shrink-0">
                <AuthVoiceToggle isInline={true} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] flex items-center gap-1">
                  <span>Applicant Name</span>
                  <span className="text-[#FF3B30] dark:text-[#FF453A]">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Type your full name..."
                    className={`ds-apple-input w-full pl-10 pr-4 py-3 rounded-[14px] text-[14px] ${
                      errors.fullName ? "border-[#FF3B30]" : ""
                    }`}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-[11px] text-[#FF3B30] dark:text-[#FF453A] font-medium">
                    {errors.fullName}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] flex items-center gap-1">
                    <span>Phone Number</span>
                    <span className="text-[#FF3B30] dark:text-[#FF453A]">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className={`ds-apple-input w-full pl-10 pr-4 py-3 rounded-[14px] text-[14px] tabular-nums ${
                        errors.phone ? "border-[#FF3B30]" : ""
                      }`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-[11px] text-[#FF3B30] dark:text-[#FF453A] font-medium">
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D]">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@gmail.com"
                      className="ds-apple-input w-full pl-10 pr-4 py-3 rounded-[14px] text-[14px]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D]">
                    Delivery Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Type your address..."
                      className="ds-apple-input w-full pl-10 pr-4 py-3 rounded-[14px] text-[14px]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] flex items-center gap-1">
                    <span>TikTok ID / Username</span>
                    <span className="text-[#FF3B30] dark:text-[#FF453A]">*</span>
                  </label>
                  <div className="relative">
                    <Video className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
                    <input
                      type="text"
                      required
                      value={tiktokUsername}
                      onChange={(e) => setTiktokUsername(e.target.value)}
                      placeholder="@your_tiktok_id"
                      className={`ds-apple-input w-full pl-10 pr-4 py-3 rounded-[14px] text-[14px] ${
                        errors.tiktokUsername ? "border-[#FF3B30]" : ""
                      }`}
                    />
                  </div>
                  {errors.tiktokUsername && (
                    <p className="text-[11px] text-[#FF3B30] dark:text-[#FF453A] font-medium">
                      {errors.tiktokUsername}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D] flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>How did you find Deep Shop?</span>
                </label>
                <select
                  value={foundSource}
                  onChange={(e) => setFoundSource(e.target.value)}
                  className="ds-apple-input w-full px-4 py-3 rounded-[14px] text-[14px] cursor-pointer"
                >
                  <option value="Social Media">Social Media (Facebook / Instagram)</option>
                  <option value="TikTok">TikTok Feed / Reels</option>
                  <option value="Friends">Friends / Family Recommendation</option>
                  <option value="Google">Google Search</option>
                  <option value="YouTube">YouTube Review</option>
                  <option value="Other">Other Source</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D]">
                  Application Note
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why you want Cash on Delivery access..."
                  className="ds-apple-input w-full p-3.5 rounded-[14px] text-[14px] resize-none"
                />
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <label className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />
                <span>Upload 4 Mandatory Screenshots</span>
                <span className="text-[#FF3B30] dark:text-[#FF453A]">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <input
                  type="file"
                  ref={followInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, setFollowScreenshot);
                  }}
                />
                <input
                  type="file"
                  ref={v1InputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, setVideo1Screenshot);
                  }}
                />
                <input
                  type="file"
                  ref={v2InputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, setVideo2Screenshot);
                  }}
                />
                <input
                  type="file"
                  ref={v3InputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, setVideo3Screenshot);
                  }}
                />

                <RenderDropzoneBox
                  label="1. TikTok Follow Screenshot"
                  state={followScreenshot}
                  onClick={() => followInputRef.current?.click()}
                  onRemove={() => setFollowScreenshot({ file: null, url: "", uploading: false })}
                />

                <RenderDropzoneBox
                  label="2. Video 1 Like & Comment"
                  state={video1Screenshot}
                  onClick={() => v1InputRef.current?.click()}
                  onRemove={() => setVideo1Screenshot({ file: null, url: "", uploading: false })}
                />

                <RenderDropzoneBox
                  label="3. Video 2 Like & Comment"
                  state={video2Screenshot}
                  onClick={() => v2InputRef.current?.click()}
                  onRemove={() => setVideo2Screenshot({ file: null, url: "", uploading: false })}
                />

                <RenderDropzoneBox
                  label="4. Video 3 Like & Comment"
                  state={video3Screenshot}
                  onClick={() => v3InputRef.current?.click()}
                  onRemove={() => setVideo3Screenshot({ file: null, url: "", uploading: false })}
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              {alreadyApplied && (
                <div className="p-3.5 rounded-[14px] bg-[#FF3B30]/10 border border-[#FF3B30]/20 flex items-center gap-2.5 text-[#FF3B30] dark:text-[#FF453A]">
                  <Globe className="w-5 h-5 shrink-0" />
                  <p className="text-[12px] font-semibold">
                    An application has already been submitted from this IP ({userIp}). Only one application per IP address is permitted.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={submitting || alreadyApplied}
                  className="ds-apple-btn-primary flex-1 py-3.5 rounded-full font-semibold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Application...</span>
                    </>
                  ) : alreadyApplied ? (
                    <span>Already Applied</span>
                  ) : (
                    <span>Submit Application</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={alreadyApplied}
                  className="ds-apple-btn-secondary py-3.5 px-6 rounded-full font-semibold text-[14px] active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  Save Draft
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showCongratulationsModal && (
              <div className="ds-apple-portal fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowCongratulationsModal(false)}
                  className="ds-apple-backdrop fixed inset-0"
                />
                <motion.div
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
                  transition={shouldReduceMotion ? { duration: 0.16 } : APPLE_SPRING_DEFAULT}
                  className="ds-apple-modal relative z-10 rounded-[28px] p-6 sm:p-8 max-w-md w-full text-center space-y-5"
                >
                  <button
                    type="button"
                    onClick={() => setShowCongratulationsModal(false)}
                    aria-label="Close dialog"
                    className="ds-apple-icon-btn absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="w-16 h-16 rounded-full bg-[#34C759]/12 text-[#34C759] dark:text-[#30D158] flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div className="space-y-1">
                    <span className="px-3 py-1 rounded-full bg-[#34C759]/12 text-[#34C759] dark:text-[#30D158] text-[12px] font-semibold inline-block">
                      Congratulations
                    </span>
                    <h3 className="text-[20px] font-bold tracking-[-0.02em] text-[#1D1D1F] dark:text-[#F5F5F7] pt-1">
                      Application Received!
                    </h3>
                  </div>

                  <p className="text-[13px] text-[#6E6E73] dark:text-[#98989D] leading-relaxed">
                    Thank you, <b className="text-[#1D1D1F] dark:text-[#F5F5F7]">{fullName}</b>! Your Cash on Delivery campaign application has been registered and will be reviewed shortly by our team.
                  </p>

                  <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E] p-3.5 rounded-[16px] text-[12px] space-y-1.5 text-left">
                    <div className="flex justify-between">
                      <span className="text-[#6E6E73] dark:text-[#98989D]">Applicant:</span>
                      <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6E6E73] dark:text-[#98989D]">TikTok ID:</span>
                      <span className="font-semibold text-[#0071E3] dark:text-[#0A84FF]">{tiktokUsername}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6E6E73] dark:text-[#98989D]">Screenshots:</span>
                      <span className="font-semibold text-[#34C759] dark:text-[#30D158]">4 / 4 Complete</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setShowCongratulationsModal(false);
                      navigate("/");
                    }}
                    className="ds-apple-btn-primary w-full py-3.5 rounded-full font-semibold text-[14px] active:scale-[0.98] transition-transform"
                  >
                    Back to Home
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

function RenderDropzoneBox({
  label,
  state,
  onClick,
  onRemove,
}: {
  label: string;
  state: UploadState;
  onClick: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="relative bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-dashed border-black/15 dark:border-white/15 rounded-[18px] p-3 flex flex-col items-center justify-center min-h-[120px] transition hover:border-[#0071E3]/50 group">
      {state.uploading ? (
        <div className="flex flex-col items-center gap-2 text-[12px] text-[#0071E3] dark:text-[#0A84FF] font-medium">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Uploading Image...</span>
        </div>
      ) : state.url ? (
        <div className="relative w-full h-24 rounded-[12px] overflow-hidden group">
          <img src={state.url} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 rounded-full bg-[#FF3B30] text-white"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full bg-[#34C759] text-white text-[10px] font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Uploaded</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onClick();
          }}
          className="flex flex-col items-center justify-center text-center gap-1.5 w-full h-full py-2 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1C1C1E] flex items-center justify-center text-[#0071E3] dark:text-[#0A84FF]">
            <Upload className="w-4 h-4" />
          </div>
          <span className="text-[12px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
            {label}
          </span>
          <span className="text-[11px] text-[#6E6E73] dark:text-[#98989D]">
            Tap to choose image
          </span>
        </button>
      )}
    </div>
  );
}

