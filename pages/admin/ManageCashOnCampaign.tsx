import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { useNotify } from "../../components/Notifications";
import Icon from "../../components/Icon";
import {
  Sparkles,
  Users,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  X,
  MapPin,
  Globe,
} from "lucide-react";

interface CashOnApplication {
  id: string;
  applicantName: string;
  phone: string;
  email: string;
  address: string;
  tiktokUsername: string;
  foundSource: string;
  reason: string;
  userIp?: string;
  location?: { lat: number; lng: number } | null;
  createdAt: number;
  screenshots: {
    followScreenshot?: string;
    video1Screenshot?: string;
    video2Screenshot?: string;
    video3Screenshot?: string;
  };
  status: string;
}

export default function ManageCashOnCampaign() {
  const navigate = useNavigate();
  const notify = useNotify();

  const [isEnabled, setIsEnabled] = useState(true);
  const [toggling, setToggling] = useState(false);

  const [applications, setApplications] = useState<CashOnApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedApp, setSelectedApp] = useState<CashOnApplication | null>(null);
  const [fullScreenImgUrl, setFullScreenImgUrl] = useState<string | null>(null);

  // Sync settings
  useEffect(() => {
    const unsubSettings = onSnapshot(
      doc(db, "settings", "cash_on_campaign"),
      (snap) => {
        if (snap.exists()) {
          setIsEnabled(Boolean(snap.data().isEnabled));
        } else {
          setIsEnabled(true);
        }
      }
    );

    const unsubApps = onSnapshot(
      collection(db, "cash_on_applications"),
      (snap) => {
        const firestoreDocs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as CashOnApplication[];

        // Combine with local backup applications if any
        let localApps: CashOnApplication[] = [];
        try {
          localApps = JSON.parse(localStorage.getItem("deepshop_local_campaign_apps") || "[]");
        } catch (e) {}

        const allMap = new Map<string, CashOnApplication>();
        localApps.forEach((app, idx) => allMap.set(app.id || `local_${idx}`, app));
        firestoreDocs.forEach((app) => allMap.set(app.id, app));

        const combined = Array.from(allMap.values());
        combined.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        setApplications(combined);
        setLoading(false);
      },
      () => {
        let localApps: CashOnApplication[] = [];
        try {
          localApps = JSON.parse(localStorage.getItem("deepshop_local_campaign_apps") || "[]");
        } catch (e) {}
        setApplications(localApps);
        setLoading(false);
      }
    );

    return () => {
      unsubSettings();
      unsubApps();
    };
  }, []);

  const toggleCampaign = async () => {
    setToggling(true);
    const nextState = !isEnabled;
    try {
      await setDoc(
        doc(db, "settings", "cash_on_campaign"),
        { isEnabled: nextState, updatedAt: Date.now() },
        { merge: true }
      );
      setIsEnabled(nextState);
      notify(
        nextState
          ? "ক্যাশ অন ক্যাম্পেইন চালু করা হয়েছে (Form & Home banner visible)"
          : "ক্যাশ অন ক্যাম্পেইন বন্ধ করা হয়েছে (Form will show 'Soon Available')",
        "info"
      );
    } catch (e) {
      console.error(e);
      notify("স্টেট আপডেট করতে সমস্যা হয়েছে", "error");
    } finally {
      setToggling(false);
    }
  };

  const filtered = applications.filter((app) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      app.applicantName.toLowerCase().includes(q) ||
      app.phone.toLowerCase().includes(q) ||
      app.tiktokUsername.toLowerCase().includes(q) ||
      app.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Top Banner Control */}
      <div className="bg-white dark:bg-[#141720] rounded-[28px] p-5 sm:p-6 border border-zinc-200/80 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Cash on Campaign Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 text-xs font-bold">
              Admin & Seller Dashboard
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 truncate">
            Manage campaign status, review submissions, and draw winners.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Main Campaign Toggle Button */}
          <button
            type="button"
            onClick={toggleCampaign}
            disabled={toggling}
            className={`px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2.5 transition active:scale-95 cursor-pointer ${
              isEnabled
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-rose-600 text-white shadow-xs"
            }`}
          >
            {isEnabled ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Campaign Active</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5" />
                <span>Campaign Off</span>
              </>
            )}
          </button>

          {/* Random Winner Selection Trigger */}
          <button
            type="button"
            onClick={() => navigate("/admin/cash-on-campaign/draw")}
            className="px-5 py-3 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-bold text-xs sm:text-sm flex items-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-100 active:scale-95 transition cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Select Random Winner</span>
          </button>
        </div>
      </div>

      {/* Applications List & Stats */}
      <div className="bg-white dark:bg-[#141720] rounded-[28px] p-5 sm:p-6 border border-zinc-200/80 dark:border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-pink-500" />
            <h2 className="text-lg font-bold">Total Applications ({applications.length})</h2>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, tiktok..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs outline-none focus:ring-2 focus:ring-pink-500/25"
            />
          </div>
        </div>

        {/* Table View */}
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-400">Loading applications...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-400">
            No submissions found for Cash on Campaign yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-white/5 text-zinc-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">Applicant Name</th>
                  <th className="py-3 px-3">Phone & Email</th>
                  <th className="py-3 px-3">TikTok ID</th>
                  <th className="py-3 px-3">Source</th>
                  <th className="py-3 px-3">IP & Location</th>
                  <th className="py-3 px-3">Screenshots</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                {filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 transition">
                    <td className="py-3 px-3 font-bold text-zinc-900 dark:text-white">
                      {app.applicantName}
                    </td>
                    <td className="py-3 px-3">
                      <div>{app.phone}</div>
                      <div className="text-[11px] text-zinc-400">{app.email || "N/A"}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-pink-500 font-semibold">
                      {app.tiktokUsername}
                    </td>
                    <td className="py-3 px-3">{app.foundSource || "Social"}</td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1 text-zinc-500">
                          <Globe className="w-3 h-3" />
                          <span>{app.userIp || "N/A"}</span>
                        </div>
                        {app.location ? (
                          <a
                            href={`https://www.google.com/maps?q=${app.location.lat},${app.location.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-500 hover:underline"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>View Map</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-zinc-400">No Location</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        {Object.values(app.screenshots || {}).filter(Boolean).length} / 4 uploaded
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedApp(app)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold hover:bg-zinc-200 active:scale-95 transition cursor-pointer"
                      >
                        View Screenshots
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Application Detail Lightbox Popup */}
      {selectedApp && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141720] rounded-[32px] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 relative border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setSelectedApp(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
              {selectedApp.applicantName} - Application Details
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-50 dark:bg-zinc-900 p-4 rounded-2xl">
              <div>
                <span className="text-zinc-400">Phone:</span> {selectedApp.phone}
              </div>
              <div>
                <span className="text-zinc-400">TikTok:</span> {selectedApp.tiktokUsername}
              </div>
              <div>
                <span className="text-zinc-400">Email:</span> {selectedApp.email}
              </div>
              <div>
                <span className="text-zinc-400">Source:</span> {selectedApp.foundSource}
              </div>
              <div>
                <span className="text-zinc-400">User IP:</span> {selectedApp.userIp || "N/A"}
              </div>
              <div>
                <span className="text-zinc-400">Location:</span>{" "}
                {selectedApp.location ? (
                  <a
                    href={`https://www.google.com/maps?q=${selectedApp.location.lat},${selectedApp.location.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline"
                  >
                    View on Map
                  </a>
                ) : (
                  "N/A"
                )}
              </div>
              <div className="col-span-2">
                <span className="text-zinc-400">Address:</span> {selectedApp.address || "N/A"}
              </div>
              {selectedApp.reason && (
                <div className="col-span-2">
                  <span className="text-zinc-400">Note:</span> {selectedApp.reason}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Uploaded Screenshots (Click to View Full Screen)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(selectedApp.screenshots || {}).map(([key, imgUrl]) => (
                  <div key={key} className="space-y-1">
                    <span className="text-[11px] font-semibold text-zinc-500 capitalize">
                      {key.replace("Screenshot", "")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFullScreenImgUrl(imgUrl)}
                      className="w-full aspect-video rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 relative group cursor-pointer block"
                    >
                      <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                        <Eye className="w-4 h-4" />
                        <span>View Full Screen 🔍</span>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Image Lightbox Modal */}
      {fullScreenImgUrl && (
        <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <button
            type="button"
            onClick={() => setFullScreenImgUrl(null)}
            className="absolute top-5 right-5 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer z-10"
            title="Close Full Screen"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center relative">
            <img
              src={fullScreenImgUrl}
              alt="Full Screen Screenshot"
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
