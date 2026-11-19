import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNotify } from "../components/Notifications";
import { Shield, CheckCircle, AlertTriangle, Eye, EyeOff, Loader2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import SEO from "../components/SEO";
import { triggerHaptic } from "../lib/haptics";
import { APPLE_SPRING_SNAPPY } from "../lib/shoppingRoute";

const KeyIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 1.5 1.5M15.5 7.5 14 6" />
  </svg>
);

const FingerprintIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M2 12a10 10 0 0 1 18-6" />
    <path d="M5 19.5A10 10 0 0 1 18 10" />
    <path d="m11 22 .5-1.5a10 10 0 0 1 13.9-6" />
    <path d="M14 22a7 7 0 0 0 5-5" />
    <path d="M8 15a5 5 0 0 1 8-4" />
    <path d="M9 19a5 5 0 0 0 3-4" />
  </svg>
);

export const BiometricSetup: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();
  const shouldReduceMotion = useReducedMotion();
  const [isSupported, setIsSupported] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [isPasscodeEnabled, setIsPasscodeEnabled] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    if (!auth.currentUser) {
      navigate("/auth-selector");
      return;
    }

    // Check if WebAuthn is supported
    if (!window.PublicKeyCredential) {
      setIsSupported(false);
    }

    // Load initial status from localStorage
    const bioEnabled = localStorage.getItem("vibe_biometric_enabled") === "true";
    const savedPin = localStorage.getItem("vibe_lock_pin") || "";
    
    setBiometricEnabled(bioEnabled);
    setPasscode(savedPin);
    setIsPasscodeEnabled(!!savedPin);
  }, [navigate]);

  const testRegisterBiometrics = async () => {
    if (!window.PublicKeyCredential) {
      throw new Error("Biometrics not supported on this browser.");
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    
    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);

    const creationOptions: CredentialCreationOptions = {
      publicKey: {
        challenge: challenge,
        rp: {
          name: "DEEP SHOP",
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: auth.currentUser?.email || "user@deep.shop",
          displayName: auth.currentUser?.displayName || "Deep Shop User",
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }], // ES256
        timeout: 60000,
        authenticatorSelection: {
          userVerification: "required",
          authenticatorAttachment: "platform" // standard platform biometric
        },
      },
    };

    return await navigator.credentials.create(creationOptions);
  };

  const handleToggleBiometrics = async () => {
    if (biometricEnabled) {
      // Disable
      localStorage.removeItem("vibe_biometric_enabled");
      setBiometricEnabled(false);
      notify("Biometric lock disabled.", "success");
      return;
    }

    // To enable biometrics, we must have a backup passcode set first
    if (!passcode || passcode.length !== 4) {
      notify("Please set a 4-digit backup passcode before enabling biometrics.", "error");
      return;
    }

    setSetupLoading(true);
    try {
      notify("Please scan your fingerprint or verify your face to register biometric authentication...", "info");
      await testRegisterBiometrics();
      localStorage.setItem("vibe_biometric_enabled", "true");
      localStorage.removeItem("vibe_biometric_simulated");
      setBiometricEnabled(true);
      notify("Biometric lock enabled successfully!", "success");
    } catch (e: any) {
      console.error(e);
      const isIframeErr = e?.message?.includes("feature is not enabled") || 
                          e?.message?.includes("Permissions Policy") || 
                          e?.name === "SecurityError" || 
                          e?.message?.includes("not enabled in this document") ||
                          e?.message?.includes("cross-origin child frames");
                          
      if (isIframeErr || !window.PublicKeyCredential) {
        localStorage.setItem("vibe_biometric_enabled", "true");
        localStorage.setItem("vibe_biometric_simulated", "true");
        setBiometricEnabled(true);
        notify("Sandbox Biometrics enabled! (Simulated for iframe preview)", "success");
      } else {
        notify("Could not register biometrics. You can still secure your app using the 4-Digit Passcode PIN.", "info");
      }
    } finally {
      setSetupLoading(false);
    }
  };

  const handleSavePasscode = () => {
    if (!/^\d{4}$/.test(passcode)) {
      notify("Passcode must be exactly 4 digits.", "error");
      return;
    }

    localStorage.setItem("vibe_lock_pin", passcode);
    setIsPasscodeEnabled(true);
    notify("Passcode PIN set successfully. Your app is now secured!", "success");
  };

  const handleRemovePasscode = () => {
    localStorage.removeItem("vibe_lock_pin");
    localStorage.removeItem("vibe_biometric_enabled");
    setPasscode("");
    setBiometricEnabled(false);
    setIsPasscodeEnabled(false);
    notify("Security lock removed.", "success");
  };

  return (
    <div className="ds-apple-shop-canvas min-h-screen pb-[120px]">
      <SEO 
        title="Biometric & Security Lock" 
        description="Secure your account using your phone's biometric fingerprint, face recognition, or a passcode PIN." 
        noindex={true}
      />

      {/* Main Container */}
      <div className="px-4 md:px-6 pt-6 max-w-lg mx-auto space-y-5">
        <div className="px-1">
          <h1 className="ds-apple-display text-[22px] sm:text-[26px] font-bold tracking-[-0.022em] text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
            Face ID &amp; Passcode
          </h1>
        </div>
        
        {/* Info card */}
        <div className="ds-apple-surface rounded-[24px] p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-[#34C759]/12 dark:bg-[#30D158]/15 flex items-center justify-center shrink-0 text-[#248A3D] dark:text-[#30D158]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[15px] font-semibold mb-1">Local App Protection</h4>
            <p className="text-xs ds-apple-muted leading-relaxed">
              Prevent unauthorized access to your account on this device. If active, you will be prompted to verify your identity every time you launch or open the application.
            </p>
          </div>
        </div>

        {/* Step 1: 4-digit Passcode configuration */}
        <div className="ds-apple-surface rounded-[24px] p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#FF9500]/12 dark:bg-[#FF9F0A]/15 text-[#C93400] dark:text-[#FF9F0A] flex items-center justify-center shrink-0">
              <KeyIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold tracking-tight">1. Backup Passcode PIN</h3>
              <p className="text-xs ds-apple-muted">Must be configured first to enable biometrics</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <input
                type={showPasscode ? "text" : "password"}
                maxLength={4}
                pattern="[0-9]*"
                inputMode="numeric"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="Enter 4-digit PIN"
                className="ds-apple-input w-full px-5 h-13 rounded-2xl text-center text-lg font-semibold tabular-nums outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setShowPasscode(!showPasscode);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 ds-apple-muted cursor-pointer"
                aria-label="Toggle PIN visibility"
              >
                {showPasscode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex gap-3">
              {isPasscodeEnabled && (
                <motion.button
                  type="button"
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                  onClick={() => {
                    triggerHaptic("warning");
                    handleRemovePasscode();
                  }}
                  className="flex-1 h-11 px-4 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/15 text-[#FF3B30] dark:text-[#FF453A] rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer"
                >
                  Remove Lock
                </motion.button>
              )}
              <motion.button
                type="button"
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                onClick={() => {
                  triggerHaptic("success");
                  handleSavePasscode();
                }}
                className="ds-apple-btn-primary flex-1 h-11 px-4 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer"
              >
                {isPasscodeEnabled ? "Update Passcode" : "Set & Enable Passcode"}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Step 2: Biometric fingerprint / Face ID configuration */}
        <div className="ds-apple-surface rounded-[24px] p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 ds-apple-accent-text flex items-center justify-center shrink-0">
                <FingerprintIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold tracking-tight truncate">2. Biometric Authentication</h3>
                <p className="text-xs ds-apple-muted truncate">Use Fingerprint, Face ID or device unlock</p>
              </div>
            </div>

            {/* Apple Toggle switch */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                handleToggleBiometrics();
              }}
              disabled={setupLoading || !isPasscodeEnabled}
              aria-label="Toggle Biometric Authentication"
              className={`w-13 h-8 rounded-full p-1 transition-colors duration-200 focus:outline-none shrink-0 flex items-center cursor-pointer ${
                !isPasscodeEnabled ? "bg-[#E5E5EA] dark:bg-[#3A3A3C] cursor-not-allowed opacity-50" : biometricEnabled ? "bg-[#34C759] dark:bg-[#30D158]" : "bg-[#E5E5EA] dark:bg-[#3A3A3C]"
              }`}
            >
              <motion.div
                layout
                transition={shouldReduceMotion ? { duration: 0.1 } : APPLE_SPRING_SNAPPY}
                className={`w-6 h-6 rounded-full bg-white shadow-sm ${
                  biometricEnabled ? "ml-auto" : "mr-auto"
                }`}
              />
            </button>
          </div>

          {!isPasscodeEnabled && (
            <div className="bg-[#FF9500]/10 border border-[#FF9500]/20 rounded-2xl p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-[#C93400] dark:text-[#FF9F0A] shrink-0 mt-0.5" />
              <p className="text-xs text-[#C93400] dark:text-[#FF9F0A] font-medium leading-relaxed">
                You must set a 4-digit backup passcode PIN first before enabling fingerprint or facial recognition unlock.
              </p>
            </div>
          )}

          {isPasscodeEnabled && !isSupported && (
            <div className="bg-[#FF9500]/10 border border-[#FF9500]/20 rounded-2xl p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-[#C93400] dark:text-[#FF9F0A] shrink-0 mt-0.5" />
              <p className="text-xs text-[#C93400] dark:text-[#FF9F0A] font-medium leading-relaxed">
                Web biometrics is not fully supported in this browser. However, your account remains secured with the custom 4-digit backup passcode PIN lock.
              </p>
            </div>
          )}

          {isPasscodeEnabled && isSupported && (
            <div className="bg-[#34C759]/10 border border-[#34C759]/20 rounded-2xl p-4 flex gap-3">
              <CheckCircle className="w-5 h-5 text-[#248A3D] dark:text-[#30D158] shrink-0 mt-0.5" />
              <p className="text-xs text-[#248A3D] dark:text-[#30D158] font-medium leading-relaxed">
                Biometrics is fully supported on this device. You can verify with your phone's face scanner or physical fingerprint scanner.
              </p>
            </div>
          )}

          {setupLoading && (
            <div className="flex items-center justify-center gap-2 py-2">
              <Loader2 className="w-4 h-4 ds-apple-accent-text animate-spin" />
              <span className="text-xs ds-apple-muted font-medium">Scanning on device...</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default BiometricSetup;
