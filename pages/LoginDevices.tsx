import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { useNotify } from "../components/Notifications";
import { Shield, Smartphone, Monitor, Globe, LogOut, Trash2, ArrowLeft, Loader2, Calendar, AlertTriangle } from "lucide-react";
import SEO from "../components/SEO";

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
    <div className="bg-[#F0F2F5] dark:bg-zinc-950 font-sans min-h-screen pb-[120px]">
      <SEO 
        title="Where You're Logged In" 
        description="Manage your active login sessions and devices." 
        noindex={true}
      />

      {/* Header banner */}
      <div className="bg-[#0a2e15] dark:bg-[#071f0f] pt-12 pb-20 px-6 rounded-b-[40px] relative overflow-hidden">
        <div className="max-w-lg mx-auto relative z-10">
          <div>
            <h2 className="text-white text-xl font-bold tracking-tight">Login Devices</h2>
            <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Where you are logged in</p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="-mt-10 px-4 md:px-6 relative z-30 max-w-lg mx-auto space-y-6">
        
        {/* Information box */}
        <div className="bg-white dark:bg-[#1e1e1e] rounded-[28px] p-5 shadow-xl border border-gray-100 dark:border-zinc-800 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">Session Security</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
              These are the devices that have logged into your account. If you recognize any unfamiliar device, log it out immediately and change your password.
            </p>
          </div>
        </div>

        {/* Sessions list */}
        <div className="bg-white dark:bg-[#1e1e1e] rounded-[32px] p-6 shadow-xl border border-gray-100 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Active Sessions ({sessions.length})</h3>
            
            {sessions.length > 1 && (
              <button 
                onClick={() => setShowConfirmAllModal(true)}
                className="text-xs text-red-500 font-bold hover:underline flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout Other Devices
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <Loader2 className="w-8 h-8 text-[#1cdb5e] animate-spin" />
              <p className="text-xs text-zinc-400 font-bold">Retrieving active sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-zinc-500 font-bold">No active sessions found.</p>
            </div>
          ) : (
            <div className="space-y-4 divide-y divide-zinc-100 dark:divide-zinc-800">
              {sessions.map((session, index) => {
                const isCurrent = session.id === currentSessionId;
                const isMobileDevice = session.device === "Mobile";

                return (
                  <div key={session.id} className={`pt-4 first:pt-0 flex items-center justify-between gap-4 group ${isCurrent ? "bg-emerald-50/20 dark:bg-emerald-950/5 p-3 rounded-2xl border border-emerald-100/30 dark:border-emerald-900/10" : ""}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isCurrent ? "bg-[#1cdb5e]/10 text-[#1cdb5e]" : "bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400"}`}>
                        {isMobileDevice ? (
                          <Smartphone className="w-5 h-5" />
                        ) : (
                          <Monitor className="w-5 h-5" />
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-zinc-800 dark:text-zinc-200">
                            {session.os} ({session.browser})
                          </span>
                          {isCurrent && (
                            <span className="bg-[#1cdb5e]/10 text-[#1cdb5e] text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                              This Device
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-0.5 text-xs text-zinc-500 dark:text-zinc-400 font-bold">
                          <span className="flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5 opacity-60" /> {session.ip} • {session.location}
                          </span>
                          <span className="flex items-center gap-1 opacity-80 text-[11px]">
                            <Calendar className="w-3.5 h-3.5 opacity-60" /> Active: {formatDate(session.lastActive)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!isCurrent && (
                      <button
                        onClick={() => {
                          setTargetSessionId(session.id);
                          setShowConfirmModal(true);
                        }}
                        className="w-10 h-10 rounded-full bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 flex items-center justify-center text-red-500 transition-colors"
                        title="Logout device"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Confirmation Logout Modal (Single Device) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[32px] p-6 shadow-2xl border border-zinc-100 dark:border-zinc-800 text-center animate-scale-up">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight mb-2">Logout Device Session?</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mb-6 leading-relaxed">
              Are you sure you want to log out of this device? The account will be disconnected from that phone/browser immediately.
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  setShowConfirmModal(false);
                  setTargetSessionId(null);
                }}
                disabled={actionLoading}
                className="w-full py-3.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold rounded-2xl text-sm transition hover:bg-zinc-200"
              >
                Cancel
              </button>
              <button 
                onClick={handleRevokeSession}
                disabled={actionLoading}
                className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Logout Device
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Logout Modal (All Other Devices) */}
      {showConfirmAllModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[32px] p-6 shadow-2xl border border-zinc-100 dark:border-zinc-800 text-center animate-scale-up">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4">
              <LogOut className="w-8 h-8" />
            </div>
            
            <h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight mb-2">Logout All Other Devices?</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mb-6 leading-relaxed">
              Are you sure you want to log out of ALL other sessions? Every other phone or web browser will require logging in again.
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowConfirmAllModal(false)}
                disabled={actionLoading}
                className="w-full py-3.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold rounded-2xl text-sm transition hover:bg-zinc-200"
              >
                Cancel
              </button>
              <button 
                onClick={handleRevokeAllOtherSessions}
                disabled={actionLoading}
                className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Logout All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginDevices;
