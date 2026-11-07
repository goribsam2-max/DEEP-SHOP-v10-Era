import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { doc, onSnapshot, addDoc, collection } from "firebase/firestore";
import { auth, db } from "../firebase";
import { triggerHaptic } from "../lib/haptics";
import { useNotify } from "../components/Notifications";
import SEO from "../components/SEO";
import { AuthVoiceToggle } from "../components/AuthVoiceToggle";
import { playAuthVoice } from "../lib/authVoiceAndValidation";
import { uploadToImgBB } from "../lib/imgbbUpload";
import {
  ChevronLeft,
  Upload,
  CheckCircle2,
  X,
  Loader2,
  Sparkles,
  Lock,
  FileText,
  User,
  Phone,
  Mail,
  MapPin,
  HelpCircle,
  Video,
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

  // Campaign On/Off Status from Firestore settings
  const [campaignEnabled, setCampaignEnabled] = useState<boolean | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(auth.currentUser?.email || "");
  const [address, setAddress] = useState("");
  const [tiktokUsername, setTiktokUsername] = useState("");
  const [foundSource, setFoundSource] = useState("Social Media");
  const [reason, setReason] = useState("");

  // 4 Screenshot Upload States
  const [followScreenshot, setFollowScreenshot] = useState<UploadState>({ file: null, url: "", uploading: false });
  const [video1Screenshot, setVideo1Screenshot] = useState<UploadState>({ file: null, url: "", uploading: false });
  const [video2Screenshot, setVideo2Screenshot] = useState<UploadState>({ file: null, url: "", uploading: false });
  const [video3Screenshot, setVideo3Screenshot] = useState<UploadState>({ file: null, url: "", uploading: false });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // File Input Hidden Refs
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
          setCampaignEnabled(true); // Default to enabled if doc not created yet
        }
        setLoadingSettings(false);
      },
      () => {
        setCampaignEnabled(true);
        setLoadingSettings(false);
      }
    );

    // Play Bengali male voice guide from Auth system
    playAuthVoice("ক্যাশ অন ডেলিভারি ক্যাম্পেইনে স্বাগতম। আপনার তথ্য ও ৪ টি স্ক্রিনশট প্রদান করে জমা দিন।");

    return () => unsub();
  }, []);

  const handleFileUpload = async (
    file: File,
    setUploadState: React.Dispatch<React.SetStateAction<UploadState>>
  ) => {
    setUploadState({ file, url: "", uploading: true });
    try {
      const url = await uploadToImgBB(file);
      setUploadState({ file, url, uploading: false });
      notify("স্ক্রিনশট সফলভাবে আপলোড হয়েছে", "success");
    } catch (err) {
      console.error("Screenshot upload failed:", err);
      setUploadState({ file: null, url: "", uploading: false, error: "Upload failed" });
      notify("স্ক্রিনশট আপলোড ব্যর্থ হয়েছে, আবার চেষ্টা করুন", "error");
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();

    if (!fullName.trim() || !phone.trim() || !tiktokUsername.trim()) {
      notify("অনুগ্রহ করে আপনার নাম, ফোন নম্বর এবং টিকটক আইডি পূরণ করুন", "error");
      return;
    }

    if (
      !followScreenshot.url ||
      !video1Screenshot.url ||
      !video2Screenshot.url ||
      !video3Screenshot.url
    ) {
      notify("অনুগ্রহ করে ৪ টি বাধ্যতামূলক স্ক্রিনশট আপলোড করুন", "error");
      return;
    }

    setSubmitting(true);

    try {
      await addDoc(collection(db, "cash_on_applications"), {
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
        createdAt: Date.now(),
        userId: auth.currentUser?.uid || "guest",
        status: "pending",
      });

      setSubmitting(false);
      setSubmitted(true);
      notify("আপনার ক্যাশ অন ক্যাম্পেইন আবেদন সফলভাবে জমা হয়েছে!", "success");
    } catch (err) {
      console.error("Failed to submit campaign application:", err);
      setSubmitting(false);
      notify("আবেদন জমা দিতে সমস্যা হয়েছে, অনুগ্রহ করে আবার চেষ্টা করুন", "error");
    }
  };

  const saveDraft = () => {
    triggerHaptic();
    localStorage.setItem(
      "deepshop_cash_on_draft",
      JSON.stringify({ fullName, phone, email, address, tiktokUsername, foundSource, reason })
    );
    notify("খসড়া সংরক্ষিত হয়েছে (Draft Saved)", "info");
  };

  if (loadingSettings) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0E1017] flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  // Campaign Disabled State: "Soon Available"
  if (campaignEnabled === false) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0C10] text-zinc-900 dark:text-zinc-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
        <SEO title="Cash on Campaign — Deep Shop" description="Cash on delivery access campaign" />
        
        {/* Top Header */}
        <header className="max-w-xl mx-auto w-full flex items-center justify-center py-2 text-center">
          <span className="text-base font-bold">Cash on Campaign</span>
        </header>

        {/* Announcement Card */}
        <main className="max-w-lg mx-auto w-full bg-white dark:bg-[#141720] rounded-[32px] p-6 sm:p-8 border border-zinc-200/80 dark:border-white/10 text-center space-y-5 my-auto">
          <div className="w-16 h-16 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Soon Available 🎉
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
            ক্যাশ অন ক্যাম্পেইনটি সাময়িকভাবে স্থগিত আছে। সেলার প্যানেল থেকে খুব শীঘ্রই ক্যাম্পেইনটি পুনরায় চালু করা হবে। নিয়মিত নোটিফিকেশন চেক করুন!
          </p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full py-3.5 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold text-sm hover:opacity-90 active:scale-95 transition cursor-pointer"
          >
            হোম পেজে ফিরে যান (Back to Home)
          </button>
        </main>
        
        <footer className="text-center text-xs text-zinc-400 py-4">
          Deep Shop © Cash on Campaign
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#0A0C10] text-zinc-900 dark:text-zinc-100 py-6 px-3 sm:px-6 font-sans">
      <SEO title="Apply in Cash on Campaign — Deep Shop" description="Submit your screenshots to gain Cash on Delivery access." />

      {/* Outer Centered Container */}
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between py-1 px-1">
          <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
            Cash on Campaign
          </h1>
          <div className="shrink-0">
            <AuthVoiceToggle isInline={true} />
          </div>
        </header>

        {/* Success Dialog View */}
        {submitted ? (
          <div className="bg-white dark:bg-[#141720] rounded-[32px] p-6 sm:p-8 border border-zinc-200/80 dark:border-white/10 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
              আবেদন সফলভাবে জমা হয়েছে!
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md mx-auto">
              ধন্যবাদ <b>{fullName}</b>! আপনার আবেদনটি সফলভাবে জমা হয়েছে। বিজয়ী হলে আপনার প্রোফাইল স্ট্যাটাসে নোটিফিকেশন পাবেন।
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="flex-1 py-3.5 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold text-sm active:scale-95 transition cursor-pointer"
              >
                হোমে ফিরে যান
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setFullName("");
                  setPhone("");
                  setTiktokUsername("");
                  setFollowScreenshot({ file: null, url: "", uploading: false });
                  setVideo1Screenshot({ file: null, url: "", uploading: false });
                  setVideo2Screenshot({ file: null, url: "", uploading: false });
                  setVideo3Screenshot({ file: null, url: "", uploading: false });
                }}
                className="py-3.5 px-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-sm active:scale-95 transition cursor-pointer"
              >
                নতুন আবেদন করুন
              </button>
            </div>
          </div>
        ) : (
          /* Main Card Container Matching IMG_5509_ea736e50.jpeg */
          <form
            onSubmit={handlePublish}
            className="bg-white dark:bg-[#141720] rounded-[32px] p-5 sm:p-8 border border-zinc-200/80 dark:border-white/10 shadow-sm space-y-6"
          >
            {/* Card Title & Subtitle (Clean Title, No Inner Duplicate Back Button) */}
            <div className="border-b border-zinc-100 dark:border-white/5 pb-4">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Cash on Campaign
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                Let&apos;s get started with your cash on delivery application
              </p>
            </div>

            {/* Form Input Fields */}
            <div className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <span>Applicant Name</span>
                  <span className="text-pink-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Type your full name..."
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 text-sm outline-none focus:ring-2 focus:ring-pink-500/25 transition"
                  />
                </div>
              </div>

              {/* Phone & Email Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    <span>Phone Number</span>
                    <span className="text-pink-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 text-sm outline-none focus:ring-2 focus:ring-pink-500/25 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@gmail.com"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 text-sm outline-none focus:ring-2 focus:ring-pink-500/25 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Address & TikTok Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Delivery Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Type your address..."
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 text-sm outline-none focus:ring-2 focus:ring-pink-500/25 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    <span>TikTok ID / Username</span>
                    <span className="text-pink-500">*</span>
                  </label>
                  <div className="relative">
                    <Video className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      required
                      value={tiktokUsername}
                      onChange={(e) => setTiktokUsername(e.target.value)}
                      placeholder="@your_tiktok_id"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 text-sm outline-none focus:ring-2 focus:ring-pink-500/25 transition"
                    />
                  </div>
                </div>
              </div>

              {/* How did you find Deep Shop? */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                  <span>How did you find Deep Shop?</span>
                </label>
                <select
                  value={foundSource}
                  onChange={(e) => setFoundSource(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 text-sm outline-none focus:ring-2 focus:ring-pink-500/25 transition cursor-pointer"
                >
                  <option value="Social Media">Social Media (Facebook / Instagram)</option>
                  <option value="TikTok">TikTok Feed / Reels</option>
                  <option value="Friends">Friends / Family Recommendation</option>
                  <option value="Google">Google Search</option>
                  <option value="YouTube">YouTube Review</option>
                  <option value="Other">Other Source</option>
                </select>
              </div>

              {/* Project Description / Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Application Note
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why you want Cash on Delivery access..."
                  className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 text-sm outline-none focus:ring-2 focus:ring-pink-500/25 transition resize-none"
                />
              </div>
            </div>

            {/* 4 Screenshot Upload Dropzones Matching IMG_5509_ea736e50.jpeg */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                <Upload className="w-4 h-4 text-pink-500" />
                <span>Upload 4 Mandatory Screenshots</span>
                <span className="text-pink-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Hidden File Inputs */}
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

                {/* Dropzone 1: TikTok Follow */}
                <RenderDropzoneBox
                  label="1. TikTok Follow Screenshot"
                  state={followScreenshot}
                  onClick={() => followInputRef.current?.click()}
                  onRemove={() => setFollowScreenshot({ file: null, url: "", uploading: false })}
                />

                {/* Dropzone 2: Video 1 Like & Comment */}
                <RenderDropzoneBox
                  label="2. Video 1 Like & Comment"
                  state={video1Screenshot}
                  onClick={() => v1InputRef.current?.click()}
                  onRemove={() => setVideo1Screenshot({ file: null, url: "", uploading: false })}
                />

                {/* Dropzone 3: Video 2 Like & Comment */}
                <RenderDropzoneBox
                  label="3. Video 2 Like & Comment"
                  state={video2Screenshot}
                  onClick={() => v2InputRef.current?.click()}
                  onRemove={() => setVideo2Screenshot({ file: null, url: "", uploading: false })}
                />

                {/* Dropzone 4: Video 3 Like & Comment */}
                <RenderDropzoneBox
                  label="4. Video 3 Like & Comment"
                  state={video3Screenshot}
                  onClick={() => v3InputRef.current?.click()}
                  onRemove={() => setVideo3Screenshot({ file: null, url: "", uploading: false })}
                />
              </div>
            </div>

            {/* Bottom Actions Row Matching IMG_5509_ea736e50.jpeg */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              {/* Primary Black Button "Get Started / Submit" */}
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-4 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Application (Get Started)</span>
                  </>
                )}
              </button>

              {/* Secondary Light Button "Save Draft" */}
              <button
                type="button"
                onClick={saveDraft}
                className="py-4 px-6 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 transition cursor-pointer"
              >
                Save Draft
              </button>
            </div>
          </form>
        )}
      </div>
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
    <div className="relative bg-zinc-50 dark:bg-zinc-900/50 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 flex flex-col items-center justify-center min-h-[120px] transition hover:border-pink-500/50 group">
      {state.uploading ? (
        <div className="flex flex-col items-center gap-2 text-xs text-pink-500 font-medium">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Uploading Image...</span>
        </div>
      ) : state.url ? (
        <div className="relative w-full h-24 rounded-xl overflow-hidden group">
          <img src={state.url} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 rounded-full bg-rose-500 text-white shadow-sm"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute bottom-1 right-1 px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Uploaded</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onClick}
          className="flex flex-col items-center justify-center text-center gap-1.5 w-full h-full py-2 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-zinc-200/70 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
            <Upload className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-tight">
            {label}
          </span>
          <span className="text-[11px] text-zinc-400">click to browse or drag & drop</span>
        </button>
      )}
    </div>
  );
}
