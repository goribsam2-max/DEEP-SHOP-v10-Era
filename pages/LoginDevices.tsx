import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { useNotify } from "../components/Notifications";
import { Shield, Smartphone, Monitor, Globe, LogOut, Trash2, Calendar } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import SEO from "../components/SEO";
import { LiquidGlassPopup } from "../components/ui/liquid-glass-popup";
import { triggerHaptic } from "../lib/haptics";

interface UserSession {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: number;
  isRevoked?: boolean;
}

export const LoginDevices: React.FC<{ userData: any }> = ({ userData }) => {
  const navigate = useNavigate();
  const notify = useNotify();
  const shouldReduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showConfirmAllModal, setShowConfirmAllModal] = useState(false);
  const [targetSessionId, setTargetSessionId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const currentSessionId = localStorage.getItem('session_id') || "";

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate("/auth-selector");
      return;
    }

    // Subscribe in real-time to sessions list
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // filter out already revoked sessions to keep UI clean, and sort by lastActive desc
        const activeSessions = (data.sessions || []).filter((s: UserSession) => !s.isRevoked);
        activeSessions.sort((a: UserSession, b: UserSession) => b.lastActive - a.lastActive);
        setSessions(activeSessions);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleRevokeSession = async () => {
    if (!targetSessionId) return;
    const user = auth.currentUser;
    if (!user) return;

    setActionLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const updatedSessions = (data.sessions || []).map((s: UserSession) => {
          if (s.id === targetSessionId) {
            return { ...s, isRevoked: true };
          }
          return s;
        });

        await updateDoc(userRef, { sessions: updatedSessions });
        notify("Device session revoked successfully.", "success");
      }
    } catch (e) {
      console.error(e);
      notify("Failed to revoke session. Please try again.", "error");
    } finally {
      setActionLoading(false);
      setShowConfirmModal(false);
      setTargetSessionId(null);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setActionLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const updatedSessions = (data.sessions || []).map((s: UserSession) => {
          if (s.id !== currentSessionId) {
            return { ...s, isRevoked: true };
          }
          return s;
        });

        await updateDoc(userRef, { sessions: updatedSessions });
        notify("All other device sessions have been revoked.", "success");
      }
    } catch (e) {
      console.error(e);
      notify("Failed to revoke other sessions.", "error");
    } finally {
      setActionLoading(false);
      setShowConfirmAllModal(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="ds-apple-shop-canvas min-h-screen pb-[120px]">
      <SEO 
        title="Where You're Logged In" 
        description="Manage your active login sessions and devices." 
        noindex={true}
      />

      {/* Main Container */}
      <div className="px-4 md:px-6 pt-6 max-w-lg mx-auto space-y-5">
        <div className="px-1">
          <h1 className="ds-apple-display text-[22px] sm:text-[26px] font-bold tracking-[-0.022em] text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
            Login Devices
          </h1>
        </div>
        
        {/* Information box */}
        <div className="ds-apple-surface rounded-[24px] p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 ds-apple-accent-text" />
          </div>
          <div>
            <h4 className="text-[15px] font-semibold mb-1">Session Security</h4>
            <p className="text-xs ds-apple-muted leading-relaxed">
              These are the devices that have logged into your account. If you recognize any unfamiliar device, log it out immediately and change your password.
            </p>
          </div>
        </div>

        {/* Sessions list */}
        <div className="ds-apple-surface rounded-[24px] p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5 gap-3">
            <h3 className="text-[15px] font-semibold tracking-tight tabular-nums">
              Active Sessions ({sessions.length})
            </h3>
            
            {sessions.length > 1 && (
              <button 
                type="button"
                onClick={() => {
                  triggerHaptic("warning");
                  setShowConfirmAllModal(true);
                }}
                className="text-xs text-[#FF3B30] dark:text-[#FF453A] font-semibold hover:underline flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>Logout Others</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-4 divide-y divide-black/[0.06] dark:divide-white/[0.08]">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="pt-4 first:pt-0 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-2xl ds-skeleton shrink-0" />
                    <div className="space-y-2 flex-1 pt-0.5">
                      <div className="h-4 w-40 rounded-lg ds-skeleton" />
                      <div className="h-3 w-48 rounded-lg ds-skeleton" />
                      <div className="h-2.5 w-32 rounded-lg ds-skeleton" />
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full ds-skeleton shrink-0" />
                </div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm ds-apple-muted font-medium">No active sessions found.</p>
            </div>
          ) : (
            <div className="space-y-3 divide-y divide-black/[0.06] dark:divide-white/[0.08]">
              {sessions.map((session) => {
                const isCurrent = session.id === currentSessionId;
                const isMobileDevice = session.device === "Mobile";

                return (
                  <div key={session.id} className={`pt-3.5 first:pt-0 flex items-center justify-between gap-4 group ${isCurrent ? "bg-[#34C759]/[0.07] dark:bg-[#30D158]/[0.1] p-3.5 rounded-2xl border border-[#34C759]/20" : ""}`}>
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${isCurrent ? "bg-[#34C759]/15 text-[#248A3D] dark:text-[#30D158]" : "ds-apple-surface-subtle ds-apple-muted"}`}>
                        {isMobileDevice ? (
                          <Smartphone className="w-5 h-5" />
                        ) : (
                          <Monitor className="w-5 h-5" />
                        )}
                      </div>
                      
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold truncate">
                            {session.os} ({session.browser})
                          </span>
                          {isCurrent && (
                            <span className="bg-[#34C759]/15 text-[#248A3D] dark:text-[#30D158] text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full">
                              This Device
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-0.5 text-xs ds-apple-muted tabular-nums">
                          <span className="flex items-center gap-1 truncate">
                            <Globe className="w-3.5 h-3.5 opacity-60 shrink-0" /> {session.ip} · {session.location}
                          </span>
                          <span className="flex items-center gap-1 text-[11px]">
                            <Calendar className="w-3.5 h-3.5 opacity-60 shrink-0" /> Active: {formatDate(session.lastActive)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!isCurrent && (
                      <motion.button
                        type="button"
                        whileTap={shouldReduceMotion ? undefined : { scale: 0.92 }}
                        onClick={() => {
                          triggerHaptic("warning");
                          setTargetSessionId(session.id);
                          setShowConfirmModal(true);
                        }}
                        className="w-9 h-9 rounded-full bg-[#FF3B30]/10 hover:bg-[#FF3B30]/15 flex items-center justify-center text-[#FF3B30] dark:text-[#FF453A] transition-colors shrink-0 cursor-pointer"
                        title="Logout device"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      <LiquidGlassPopup
        open={showConfirmModal}
        onClose={() => {
          if (!actionLoading) {
            setShowConfirmModal(false);
            setTargetSessionId(null);
          }
        }}
        title="Logout device session?"
        description="Are you sure you want to log out of this device? Your account will be disconnected from that phone or browser immediately."
        primaryAction={{
          label: "Logout device",
          onClick: handleRevokeSession,
          loading: actionLoading,
          disabled: actionLoading,
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: () => {
            setShowConfirmModal(false);
            setTargetSessionId(null);
          },
          disabled: actionLoading,
        }}
      />

      <LiquidGlassPopup
        open={showConfirmAllModal}
        onClose={() => {
          if (!actionLoading) setShowConfirmAllModal(false);
        }}
        title="Logout all other devices?"
        description="Are you sure you want to log out of all other sessions? Every other phone or browser will require logging in again."
        primaryAction={{
          label: "Logout all other devices",
          onClick: handleRevokeAllOtherSessions,
          loading: actionLoading,
          disabled: actionLoading,
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: () => setShowConfirmAllModal(false),
          disabled: actionLoading,
        }}
      />
    </div>
  );
};

export default LoginDevices;
