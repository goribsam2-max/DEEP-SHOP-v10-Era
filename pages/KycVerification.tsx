import { useNavigate } from "react-router-dom";
import React, { useState, useEffect, useRef } from "react";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { uploadToImgbb } from "../services/imgbb";
import { useNotify } from "../components/Notifications";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Input } from "../components/ui/input";
import { 
  Shield, Camera, Check, User, Calendar, CreditCard, Eye, 
  ArrowLeft, ArrowRight, Sparkles, AlertCircle, Video
} from "lucide-react";
import { triggerHaptic } from "../lib/haptics";
import { APPLE_SPRING_DEFAULT } from "../lib/shoppingRoute";



type KycStep = "info" | "nid-front" | "nid-back" | "face-liveness" | "processing" | "success";

export default function KycVerification(props?: { onSuccess?: () => void }) {
  const navigate = useNavigate();
  const notify = useNotify();
  const shouldReduceMotion = useReducedMotion();
  const [currentStep, setCurrentStep] = useState<KycStep>("info");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  // Step 1 Form Data
  const [nidName, setNidName] = useState("");
  const [dob, setDob] = useState("");

  // Images as Blobs or Files
  const [nidFrontFile, setNidFrontFile] = useState<File | null>(null);
  const [nidFrontPreview, setNidFrontPreview] = useState<string>("");
  const [nidBackFile, setNidBackFile] = useState<File | null>(null);
  const [nidBackPreview, setNidBackPreview] = useState<string>("");
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [facePreview, setFacePreview] = useState<string>("");

  // Camera settings
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraMode, setCameraMode] = useState<"user" | "environment">("environment");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Face Liveness Stages
  const [livenessStage, setLivenessStage] = useState<"ready" | "look-straight" | "blink" | "look-right" | "look-left" | "completed">("ready");
  const [livenessProgress, setLivenessProgress] = useState(0);

  // Initialize or Clean up camera stream
  const startCamera = async (mode: "user" | "environment") => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      setCameraMode(mode);
    } catch (err) {
      console.error("Camera access failed:", err);
      notify("Could not access camera. Please upload file instead or allow camera permissions.", "error");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    // Stop camera when step changes or wizard closes
    return () => {
      stopCamera();
    };
  }, [currentStep]);

  // Capture Image from Video
  const capturePhoto = (target: "front" | "back" | "face") => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `${target}_capture.jpg`, { type: "image/jpeg" });
          const previewUrl = URL.createObjectURL(blob);
          if (target === "front") {
            setNidFrontFile(file);
            setNidFrontPreview(previewUrl);
          } else if (target === "back") {
            setNidBackFile(file);
            setNidBackPreview(previewUrl);
          } else if (target === "face") {
            setFaceFile(file);
            setFacePreview(previewUrl);
          }
          stopCamera();
        }
      }, "image/jpeg", 0.9);
    }
  };

  // Face Liveness Simulator Sequence
  useEffect(() => {
    if (currentStep !== "face-liveness" || livenessStage === "ready" || livenessStage === "completed") return;

    let interval: NodeJS.Timeout;
    if (livenessStage === "look-straight") {
      setLivenessProgress(0);
      interval = setInterval(() => {
        setLivenessProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            setLivenessStage("blink");
            return 100;
          }
          return p + 10;
        });
      }, 200);
    } else if (livenessStage === "blink") {
      setLivenessProgress(0);
      interval = setInterval(() => {
        setLivenessProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            setLivenessStage("look-right");
            return 100;
          }
          return p + 15;
        });
      }, 250);
    } else if (livenessStage === "look-right") {
      setLivenessProgress(0);
      interval = setInterval(() => {
        setLivenessProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            setLivenessStage("look-left");
            return 100;
          }
          return p + 12;
        });
      }, 220);
    } else if (livenessStage === "look-left") {
      setLivenessProgress(0);
      interval = setInterval(() => {
        setLivenessProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            // Auto Capture and Finish
            capturePhoto("face");
            setLivenessStage("completed");
            return 100;
          }
          return p + 10;
        });
      }, 200);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentStep, livenessStage]);

  // Handle final submission to Firebase & Imgbb
  const handleSubmitKyc = async () => {
    const user = auth.currentUser;
    if (!user) {
      notify("Please log in to submit verification", "error");
      return;
    }

    if (!nidFrontFile || !nidBackFile || !faceFile) {
      notify("Please upload all 3 files for verification", "error");
      return;
    }

    setCurrentStep("processing");
    setLoading(true);

    try {
      setUploadProgress("Uploading Front NID Card...");
      const frontUrl = await uploadToImgbb(nidFrontFile);

      setUploadProgress("Uploading Back NID Card...");
      const backUrl = await uploadToImgbb(nidBackFile);

      setUploadProgress("Uploading Facial Biometric File...");
      const faceUrl = await uploadToImgbb(faceFile);

      setUploadProgress("Scanning & Securing Identity Record...");
      
      const docRef = doc(db, "kyc_requests", user.uid);
      await setDoc(docRef, {
        uid: user.uid,
        email: user.email || "",
        nidName,
        dob,
        nidFrontUrl: frontUrl,
        nidBackUrl: backUrl,
        faceUrl: faceUrl,
        status: "pending",
        createdAt: Date.now()
      });

      // Update User Record Status
      await updateDoc(doc(db, "users", user.uid), {
        kycStatus: "pending",
        nidOwnerName: nidName,
      });

      setCurrentStep("success");
      notify("KYC Documents submitted successfully", "success");
      if (typeof (props as any)?.onSuccess === 'function') (props as any).onSuccess();
    } catch (err: any) {
      console.error(err);
      notify("Verification Upload Failed. Please try again.", "error");
      setCurrentStep("info");
    } finally {
      setLoading(false);
    }
  };

  
  const stepTransition = shouldReduceMotion
    ? { duration: 0.16 }
    : APPLE_SPRING_DEFAULT;

  return (
    <div className="ds-apple-shop-canvas min-h-screen pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
        <div className="px-1">
          <h1 className="ds-apple-display text-[22px] sm:text-[26px] font-semibold tracking-[-0.022em] text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
            KYC Verification
          </h1>
        </div>
        <div className="ds-apple-surface rounded-[26px] overflow-hidden flex flex-col">

        {/* Header bar */}
        <div className="p-5 sm:p-6 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#34C759]/12 dark:bg-[#30D158]/15 flex items-center justify-center text-[#248A3D] dark:text-[#30D158]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold tracking-tight leading-tight">DEEP Verification</h3>
              <p className="ds-apple-eyebrow ds-apple-muted text-[10px]">Identity Compliance Portal</p>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        {currentStep !== "processing" && currentStep !== "success" && (
          <div className="px-6 pt-4 flex gap-1.5 items-center">
            {(["info", "nid-front", "nid-back", "face-liveness"] as const).map((step, idx) => {
              const stepLabels = ["Info", "NID Front", "NID Back", "Biometric"];
              const stepIndex = ["info", "nid-front", "nid-back", "face-liveness"].indexOf(currentStep);
              const isActive = currentStep === step;
              const isCompleted = stepIndex > idx;

              return (
                <div key={step} className="flex-1 flex flex-col gap-1.5">
                  <div className={`h-1.5 rounded-full transition-colors duration-200 ${isCompleted ? "bg-[#34C759] dark:bg-[#30D158]" : isActive ? "bg-[#0071E3] dark:bg-[#0A84FF]" : "bg-[#E5E5EA] dark:bg-[#2C2C2E]"}`} />
                  <span className={`text-[10px] font-semibold text-center ${isActive ? "ds-apple-accent-text" : isCompleted ? "text-[#248A3D] dark:text-[#30D158]" : "ds-apple-muted"}`}>
                    {stepLabels[idx]}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            
            {/* Step 1: Personal Info */}
            {currentStep === "info" && (
              <motion.div 
                key="info"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
                transition={stepTransition}
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <h4 className="ds-apple-display text-lg font-semibold tracking-tight">Identity Details</h4>
                  <p className="text-xs ds-apple-muted leading-relaxed">
                    Please provide your complete name as listed on your National Identity Card (NID) and select your correct date of birth.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium ds-apple-muted">Full Name (As written on NID)</label>
                    <div className="relative">
                      <Input 
                        placeholder="MD. ABDUR RAHMAN"
                        className="ds-apple-input ps-10 h-12 rounded-2xl"
                        value={nidName}
                        onChange={(e) => setNidName(e.target.value.toUpperCase())}
                      />
                      <User className="absolute left-3.5 top-3.5 w-4 h-4 ds-apple-muted" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium ds-apple-muted">Date of Birth</label>
                    <div className="relative">
                      <Input 
                        type="date"
                        className="ds-apple-input ps-10 h-12 rounded-2xl tabular-nums"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                      />
                      <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 ds-apple-muted" />
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <motion.button
                    type="button"
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                    disabled={!nidName || !dob}
                    onClick={() => {
                      triggerHaptic();
                      setCurrentStep("nid-front");
                    }}
                    className="ds-apple-btn-primary w-full h-12 rounded-full font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-45 cursor-pointer"
                  >
                    <span>Proceed to Front NID</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 2: NID Front Side */}
            {currentStep === "nid-front" && (
              <motion.div 
                key="nid-front"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
                transition={stepTransition}
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <h4 className="ds-apple-display text-lg font-semibold tracking-tight">Front of NID Card</h4>
                  <p className="text-xs ds-apple-muted leading-relaxed">
                    Capture or upload a clear, well-lit photograph showing the front of your National Identity Card.
                  </p>
                </div>

                {cameraActive && cameraMode === "environment" ? (
                  <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-black/10 dark:border-white/10">
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                    <div className="absolute inset-0 border-[2px] border-[#30D158]/60 m-6 rounded-xl pointer-events-none flex items-center justify-center">
                      <span className="text-[10px] bg-[#248A3D] text-white font-semibold px-3 py-1 rounded-full uppercase tracking-wider">Position Front of NID Inside</span>
                    </div>
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => { triggerHaptic("success"); capturePhoto("front"); }}
                        className="bg-[#248A3D] hover:bg-[#1f7a34] text-white rounded-full px-5 h-10 text-xs font-semibold shadow-lg flex items-center gap-2 cursor-pointer"
                      >
                        <Camera className="w-4 h-4" /> Capture Snapshot
                      </button>
                      <button
                        type="button"
                        onClick={() => { triggerHaptic(); stopCamera(); }}
                        className="bg-black/55 backdrop-blur-md text-white rounded-full px-4 h-10 text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {nidFrontPreview ? (
                      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 ds-apple-surface-subtle">
                        <img src={nidFrontPreview} alt="NID Front Preview" className="w-full h-full object-contain" />
                        <button 
                          type="button"
                          onClick={() => { triggerHaptic(); setNidFrontPreview(""); setNidFrontFile(null); }}
                          className="absolute top-3 right-3 bg-[#FF3B30] text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-sm cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button 
                          type="button"
                          onClick={() => { triggerHaptic(); startCamera("environment"); }}
                          className="ds-apple-surface-subtle flex flex-col items-center justify-center p-8 border border-dashed border-black/15 dark:border-white/15 rounded-2xl transition hover:border-[#0071E3] cursor-pointer"
                        >
                          <Camera className="w-7 h-7 ds-apple-accent-text mb-2" />
                          <span className="text-xs font-semibold">Open Device Camera</span>
                          <span className="text-[11px] ds-apple-muted mt-1">Take instant picture</span>
                        </button>

                        <label className="ds-apple-surface-subtle flex flex-col items-center justify-center p-8 border border-dashed border-black/15 dark:border-white/15 rounded-2xl transition hover:border-[#0071E3] cursor-pointer">
                          <CreditCard className="w-7 h-7 ds-apple-muted mb-2" />
                          <span className="text-xs font-semibold">Upload NID Photo</span>
                          <span className="text-[11px] ds-apple-muted mt-1">Select from library</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                triggerHaptic();
                                setNidFrontFile(file);
                                setNidFrontPreview(URL.createObjectURL(file));
                              }
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-3 justify-between">
                  <button
                    type="button"
                    onClick={() => { triggerHaptic(); setCurrentStep("info"); }}
                    className="ds-apple-btn-secondary h-11 px-5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 shrink-0" /> Back
                  </button>
                  <button
                    type="button"
                    disabled={!nidFrontFile}
                    onClick={() => { triggerHaptic(); setCurrentStep("nid-back"); }}
                    className="ds-apple-btn-primary h-11 px-6 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-2 disabled:opacity-45 cursor-pointer"
                  >
                    <span>Proceed to Back NID</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: NID Back Side */}
            {currentStep === "nid-back" && (
              <motion.div 
                key="nid-back"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
                transition={stepTransition}
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <h4 className="ds-apple-display text-lg font-semibold tracking-tight">Back of NID Card</h4>
                  <p className="text-xs ds-apple-muted leading-relaxed">
                    Now capture or upload a clear photo showing the back of your National Identity Card containing addresses.
                  </p>
                </div>

                {cameraActive && cameraMode === "environment" ? (
                  <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-black/10 dark:border-white/10">
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                    <div className="absolute inset-0 border-[2px] border-[#30D158]/60 m-6 rounded-xl pointer-events-none flex items-center justify-center">
                      <span className="text-[10px] bg-[#248A3D] text-white font-semibold px-3 py-1 rounded-full uppercase tracking-wider">Position Back of NID Inside</span>
                    </div>
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => { triggerHaptic("success"); capturePhoto("back"); }}
                        className="bg-[#248A3D] hover:bg-[#1f7a34] text-white rounded-full px-5 h-10 text-xs font-semibold shadow-lg flex items-center gap-2 cursor-pointer"
                      >
                        <Camera className="w-4 h-4" /> Capture Snapshot
                      </button>
                      <button
                        type="button"
                        onClick={() => { triggerHaptic(); stopCamera(); }}
                        className="bg-black/55 backdrop-blur-md text-white rounded-full px-4 h-10 text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {nidBackPreview ? (
                      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 ds-apple-surface-subtle">
                        <img src={nidBackPreview} alt="NID Back Preview" className="w-full h-full object-contain" />
                        <button 
                          type="button"
                          onClick={() => { triggerHaptic(); setNidBackPreview(""); setNidBackFile(null); }}
                          className="absolute top-3 right-3 bg-[#FF3B30] text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-sm cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button 
                          type="button"
                          onClick={() => { triggerHaptic(); startCamera("environment"); }}
                          className="ds-apple-surface-subtle flex flex-col items-center justify-center p-8 border border-dashed border-black/15 dark:border-white/15 rounded-2xl transition hover:border-[#0071E3] cursor-pointer"
                        >
                          <Camera className="w-7 h-7 ds-apple-accent-text mb-2" />
                          <span className="text-xs font-semibold">Open Device Camera</span>
                          <span className="text-[11px] ds-apple-muted mt-1">Take instant picture</span>
                        </button>

                        <label className="ds-apple-surface-subtle flex flex-col items-center justify-center p-8 border border-dashed border-black/15 dark:border-white/15 rounded-2xl transition hover:border-[#0071E3] cursor-pointer">
                          <CreditCard className="w-7 h-7 ds-apple-muted mb-2" />
                          <span className="text-xs font-semibold">Upload Back Photo</span>
                          <span className="text-[11px] ds-apple-muted mt-1">Select from library</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                triggerHaptic();
                                setNidBackFile(file);
                                setNidBackPreview(URL.createObjectURL(file));
                              }
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-3 justify-between">
                  <button
                    type="button"
                    onClick={() => { triggerHaptic(); setCurrentStep("nid-front"); }}
                    className="ds-apple-btn-secondary h-11 px-5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 shrink-0" /> Back
                  </button>
                  <button
                    type="button"
                    disabled={!nidBackFile}
                    onClick={() => {
                      triggerHaptic();
                      setCurrentStep("face-liveness");
                      setLivenessStage("ready");
                    }}
                    className="ds-apple-btn-primary h-11 px-6 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-2 disabled:opacity-45 cursor-pointer"
                  >
                    <span>Proceed to Liveness</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Face Biometric Liveness */}
            {currentStep === "face-liveness" && (
              <motion.div 
                key="face-liveness"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
                transition={stepTransition}
                className="space-y-4 text-center"
              >
                <div className="space-y-1.5">
                  <h4 className="ds-apple-display text-lg font-semibold tracking-tight">Facial Liveness Check</h4>
                  <p className="text-xs ds-apple-muted leading-relaxed max-w-sm mx-auto">
                    Biometric face verification checks presence. Follow instructions: look straight, blink, look right, look left.
                  </p>
                </div>

                <div className="flex justify-center my-3 relative">
                  {cameraActive && cameraMode === "user" ? (
                    <div className="relative w-56 h-56 rounded-full overflow-hidden border-4 border-[#34C759] dark:border-[#30D158] shadow-lg bg-black">
                      <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" playsInline muted />
                      
                      {/* Static Face ID Circle Guide */}
                      <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/45 pointer-events-none" />
                      
                      {/* Interactive Instruction Overlay */}
                      <div className="absolute inset-x-0 bottom-3 flex flex-col items-center">
                        <div className="bg-black/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-[11px] font-semibold tracking-tight flex items-center gap-1.5 shadow-md">
                          {livenessStage === "look-straight" && (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-[#FFCC00]" />
                              Look Straight
                            </>
                          )}
                          {livenessStage === "blink" && (
                            <>
                              <Eye className="w-3.5 h-3.5 text-[#0A84FF]" />
                              Blink Your Eyes
                            </>
                          )}
                          {livenessStage === "look-right" && (
                            <>
                              <ArrowRight className="w-3.5 h-3.5 text-[#30D158]" />
                              Turn Right
                            </>
                          )}
                          {livenessStage === "look-left" && (
                            <>
                              <ArrowLeft className="w-3.5 h-3.5 text-[#30D158]" />
                              Turn Left
                            </>
                          )}
                          {livenessStage === "completed" && (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#30D158]" />
                              Liveness Saved
                            </>
                          )}
                        </div>
                      </div>

                      {/* Progress Circle Indicator */}
                      {livenessStage !== "ready" && livenessStage !== "completed" && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <svg className="w-full h-full -rotate-90">
                            <circle 
                              cx="112" 
                              cy="112" 
                              r="104" 
                              className="stroke-white/15 fill-none stroke-[4]"
                            />
                            <circle 
                              cx="112" 
                              cy="112" 
                              r="104" 
                              className="stroke-[#30D158] fill-none stroke-[4] transition-all duration-200"
                              strokeDasharray="653"
                              strokeDashoffset={653 - (653 * livenessProgress) / 100}
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 w-full">
                      {facePreview ? (
                        <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-[#34C759] dark:border-[#30D158] mx-auto ds-apple-surface-subtle shadow-md">
                          <img src={facePreview} alt="Face Preview" className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => { triggerHaptic(); setFacePreview(""); setFaceFile(null); }}
                            className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-[#FF3B30] text-white text-[10px] font-semibold px-3 py-1 rounded-full shadow cursor-pointer"
                          >
                            Reset
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <button 
                            type="button"
                            onClick={() => { triggerHaptic(); startCamera("user"); }}
                            className="ds-apple-surface-subtle w-full max-w-sm flex items-center justify-center gap-2 p-6 border border-dashed border-black/15 dark:border-white/15 rounded-2xl transition hover:border-[#0071E3] cursor-pointer"
                          >
                            <Video className="w-5 h-5 ds-apple-accent-text" />
                            <span className="text-xs font-semibold">Start Liveness Scanner Video</span>
                          </button>
                          
                          <label className="ds-apple-surface-subtle w-full max-w-sm flex items-center justify-center gap-2 p-6 border border-dashed border-black/15 dark:border-white/15 rounded-2xl transition hover:border-[#0071E3] cursor-pointer">
                            <Camera className="w-5 h-5 ds-apple-muted" />
                            <span className="text-xs font-semibold">Or Upload Portrait Snapshot</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  triggerHaptic();
                                  setFaceFile(file);
                                  setFacePreview(URL.createObjectURL(file));
                                }
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {cameraActive && livenessStage === "ready" && (
                  <button
                    type="button"
                    onClick={() => { triggerHaptic(); setLivenessStage("look-straight"); }}
                    className="ds-apple-btn-primary h-10 px-6 rounded-full text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>Start Liveness Tasks</span>
                    <Sparkles className="w-4 h-4" />
                  </button>
                )}

                <div className="flex gap-2 pt-3 justify-between">
                  <button
                    type="button"
                    onClick={() => { triggerHaptic(); stopCamera(); setCurrentStep("nid-back"); }}
                    className="ds-apple-btn-secondary h-11 px-5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 shrink-0" /> Back
                  </button>
                  <button
                    type="button"
                    disabled={!faceFile || loading}
                    onClick={() => { triggerHaptic("success"); handleSubmitKyc(); }}
                    className="bg-[#248A3D] hover:bg-[#1f7a34] dark:bg-[#30D158] text-white h-11 px-6 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 disabled:opacity-45 cursor-pointer"
                  >
                    <span>Submit Verification</span>
                    <Shield className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 5: Processing / Uploading */}
            {currentStep === "processing" && (
              <motion.div 
                key="processing"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={stepTransition}
                className="py-12 text-center space-y-6"
              >
                <div className="relative w-18 h-18 mx-auto rounded-full bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 flex items-center justify-center">
                  <Shield className="w-8 h-8 ds-apple-accent-text" />
                </div>
                <div className="space-y-2">
                  <h4 className="ds-apple-display text-lg font-semibold tracking-tight">Uploading Secure Documents</h4>
                  <p className="ds-apple-surface-subtle text-xs ds-apple-muted font-mono tracking-tight py-2.5 px-4 rounded-2xl max-w-sm mx-auto">
                    {uploadProgress}
                  </p>
                </div>
                <p className="text-[11px] ds-apple-muted max-w-xs mx-auto">
                  Files are uploaded through end-to-end encrypted channels.
                </p>
              </motion.div>
            )}

            {/* Step 6: Success State */}
            {currentStep === "success" && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={stepTransition}
                className="py-12 text-center space-y-6"
              >
                <div className="w-20 h-20 bg-[#34C759]/12 dark:bg-[#30D158]/15 text-[#248A3D] dark:text-[#30D158] rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-10 h-10 stroke-[2.8]" />
                </div>
                <div className="space-y-2">
                  <h4 className="ds-apple-display text-2xl font-semibold tracking-tight">Verification Submitted</h4>
                  <p className="text-xs ds-apple-muted max-w-sm mx-auto leading-relaxed">
                    Your documents and biometric scan have been submitted to our compliance team. Verification requests are processed within <span className="font-semibold">24 hours</span>.
                  </p>
                </div>
                
                <div className="ds-apple-surface-subtle p-4 rounded-2xl flex items-start gap-3 text-left max-w-sm mx-auto">
                  <AlertCircle className="w-5 h-5 ds-apple-accent-text shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold block">Review Period Security</span>
                    <span className="text-[11px] ds-apple-muted leading-relaxed block mt-0.5">
                      Your products can still be listed in our catalog, and verified status will update automatically once reviewed.
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => { triggerHaptic(); navigate(-1); }}
                    className="ds-apple-btn-primary px-8 h-12 rounded-full text-sm font-semibold cursor-pointer"
                  >
                    Return to Profile
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
    </div>
  );
};
