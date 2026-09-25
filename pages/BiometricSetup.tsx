import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNotify } from "../components/Notifications";
import { ArrowLeft, Lock, Shield, CheckCircle, AlertTriangle, Eye, EyeOff, Loader2 } from "lucide-react";
import SEO from "../components/SEO";

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
        notify("Could not register biometrics. You can still secure your app using the 4-Digit Passcode PIN.", "warning");
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
    <div className="bg-[#F0F2F5] dark:bg-zinc-950 font-sans min-h-screen pb-[120px]">
      <SEO 
        title="Biometric & Security Lock" 
        description="Secure your account using your phone's biometric fingerprint, face recognition, or a passcode PIN." 
        noindex={true}
      />

      {/* Header Banner */}
      <div className="bg-[#0a2e15] dark:bg-[#071f0f] pt-12 pb-20 px-6 rounded-b-[40px] relative overflow-hidden">
        <div className="max-w-lg mx-auto relative z-10">
          <div>
            <h2 className="text-white text-xl font-bold tracking-tight">Security Lock</h2>
            <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Fingerprint, Face ID & PIN</p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="-mt-10 px-4 md:px-6 relative z-30 max-w-lg mx-auto space-y-6">
        
        {/* Info card */}
        <div className="bg-white dark:bg-[#1e1e1e] rounded-[28px] p-5 shadow-xl border border-gray-100 dark:border-zinc-800 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0 text-[#1cdb5e]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">Local App Protection</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
              Prevent unauthorized access to your account on this device. If active, you will be prompted to verify your identity every time you launch or open the application.
            </p>
          </div>
        </div>

        {/* Step 1: 4-digit Passcode configuration */}
        <div className="bg-white dark:bg-[#1e1e1e] rounded-[32px] p-6 shadow-xl border border-gray-100 dark:border-zinc-800 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-500 flex items-center justify-center">
              <KeyIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-800 dark:text-white uppercase tracking-wider">1. Backup Passcode PIN</h3>
              <p className="text-[11px] text-zinc-400 font-bold">Must be configured first to enable biometrics</p>
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
                className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center text-lg font-semibold tracking-normal text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1cdb5e]"
              />
              <button
                type="button"
                onClick={() => setShowPasscode(!showPasscode)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                {showPasscode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex gap-3">
              {isPasscodeEnabled && (
                <button
                  onClick={handleRemovePasscode}
                  className="flex-1 py-3.5 bg-red-50 hover:bg-red-100 text-red-500 dark:bg-red-950/10 dark:hover:bg-red-950/20 rounded-2xl text-xs font-bold transition"
                >
                  Remove Lock
                </button>
              )}
              <button
                onClick={handleSavePasscode}
                className="flex-1 py-3.5 bg-[#1cdb5e] hover:bg-[#19c052] text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-emerald-500/20"
              >
                {isPasscodeEnabled ? "Update Passcode" : "Set & Enable Passcode"}
              </button>
            </div>
          </div>
        </div>

        {/* Step 2: Biometric fingerprint / Face ID configuration */}
        <div className="bg-white dark:bg-[#1e1e1e] rounded-[32px] p-6 shadow-xl border border-gray-100 dark:border-zinc-800 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/20 text-teal-500 flex items-center justify-center">
                <FingerprintIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-800 dark:text-white uppercase tracking-wider">2. Biometric Authentication</h3>
                <p className="text-[11px] text-zinc-400 font-bold">Use Fingerprint, Face ID or device unlock</p>
              </div>
            </div>

            {/* Toggle switch */}
            <button
              onClick={handleToggleBiometrics}
              disabled={setupLoading || !isPasscodeEnabled}
              className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 focus:outline-none ${
                !isPasscodeEnabled ? "bg-zinc-200 dark:bg-zinc-800 cursor-not-allowed opacity-50" : biometricEnabled ? "bg-[#1cdb5e]" : "bg-zinc-300 dark:bg-zinc-700"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                  biometricEnabled ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {!isPasscodeEnabled && (
            <div className="bg-amber-50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold leading-relaxed">
                You must set a 4-digit backup passcode PIN first before enabling fingerprint or facial recognition unlock.
              </p>
            </div>
          )}

          {isPasscodeEnabled && !isSupported && (
            <div className="bg-amber-50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold leading-relaxed">
                Web biometrics is not fully supported in this browser. However, your account remains secured with the custom 4-digit backup passcode PIN lock.
              </p>
            </div>
          )}

          {isPasscodeEnabled && isSupported && (
            <div className="bg-emerald-50/50 dark:bg-emerald-950/5 border border-emerald-100 dark:border-emerald-900/10 rounded-2xl p-4 flex gap-3">
              <CheckCircle className="w-5 h-5 text-[#1cdb5e] shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold leading-relaxed">
                Biometrics is fully supported on this device. You can verify with your phone's face scanner or physical fingerprint scanner.
              </p>
            </div>
          )}

          {setupLoading && (
            <div className="flex items-center justify-center gap-2 py-2">
              <Loader2 className="w-4 h-4 text-[#1cdb5e] animate-spin" />
              <span className="text-xs text-zinc-400 font-bold">Scanning on device...</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default BiometricSetup;
