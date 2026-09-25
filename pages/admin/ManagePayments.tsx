import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useNotify } from "../../components/Notifications";
import { Button } from "../../components/ui/button";
import { isForbiddenNumber } from "@/lib/utils";
import { uploadToImgbb } from "../../services/imgbb";

const ManagePayments: React.FC = () => {
  const notify = useNotify();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newBkashInput, setNewBkashInput] = useState("");
  const [newNagadInput, setNewNagadInput] = useState("");
  const [data, setData] = useState({
    instagramUrl: "https://www.instagram.com/deep.shop.official",
    tiktokUrl: "",
    footerLogo: "",
    banglaQrImage: "",
    npsbNumber: "",
    pathaoPayNumber: "",
    bkashNumbers: [] as string[],
    nagadNumbers: [] as string[],
    footerPaymentLogos: [
      { name: 'bKash', icon: 'https://freelogopng.com/images/all_img/1656234745bkash-app-logo-png.png' },
      { name: 'Nagad', icon: 'https://freelogopng.com/images/all_img/1679248787Nagad-Logo.png' },
      { name: 'Rocket', icon: 'https://freelogopng.com/images/all_img/1656235199rocket-logo-png.png' },
      { name: 'Upay', icon: 'https://freelogopng.com/images/all_img/1656235338upay-logo-png.png' },
      { name: 'Pathao Pay', icon: 'https://pathao.com/bn/wp-content/uploads/sites/6/2023/10/Pathao-Pay-Logo.png' },
      { name: 'VISA', icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Visa_Logo.png/640px-Visa_Logo.png' },
      { name: 'Mastercard', icon: 'https://upload.wikimedia.org/wikipedia/commons/b/b7/MasterCard_Logo.svg' }
    ],
  });

  useEffect(() => {
    Promise.all([
      getDoc(doc(db, "settings", "payments")),
      getDoc(doc(db, "settings", "platform"))
    ]).then(([paySnap, platSnap]) => {
      let mergedData: any = {};
      let bkashList: string[] = [];
      let nagadList: string[] = [];

      if (paySnap.exists()) {
        const d = paySnap.data();
        mergedData = { ...d };
        if (Array.isArray(d.bkashNumbers)) bkashList = [...d.bkashNumbers];
        if (Array.isArray(d.nagadNumbers)) nagadList = [...d.nagadNumbers];
        if (bkashList.length === 0 && d.npsbNumber) bkashList = [d.npsbNumber];
        if (nagadList.length === 0 && d.pathaoPayNumber) nagadList = [d.pathaoPayNumber];
      }

      if (platSnap.exists()) {
        const pd = platSnap.data();
        if (bkashList.length === 0 && Array.isArray(pd.bkashNumbers)) bkashList = [...pd.bkashNumbers];
        if (bkashList.length === 0 && pd.bkashNumber) bkashList = [pd.bkashNumber];
        if (nagadList.length === 0 && Array.isArray(pd.nagadNumbers)) nagadList = [...pd.nagadNumbers];
        if (nagadList.length === 0 && pd.nagadNumber) nagadList = [pd.nagadNumber];
      }

      setData((prev) => ({
        ...prev,
        ...mergedData,
        bkashNumbers: bkashList,
        nagadNumbers: nagadList,
        npsbNumber: bkashList[0] || prev.npsbNumber,
        pathaoPayNumber: nagadList[0] || prev.pathaoPayNumber,
      }));
      setLoading(false);
    });
  }, []);

  const handleSave = async (overrideData?: typeof data) => {
    const payload = overrideData || data;
    if (
      payload.bkashNumbers.some(isForbiddenNumber) ||
      payload.nagadNumbers.some(isForbiddenNumber) ||
      isForbiddenNumber(payload.npsbNumber) ||
      isForbiddenNumber(payload.pathaoPayNumber)
    ) {
      notify("01778953114 নম্বরটি সিস্টেমে অনুমোদিত নয়। (This number is not allowed)", "error");
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "payments"), payload, { merge: true });
      await setDoc(
        doc(db, "settings", "platform"),
        {
          bkashNumbers: payload.bkashNumbers,
          nagadNumbers: payload.nagadNumbers,
          bkashNumber: payload.bkashNumbers[0] || payload.npsbNumber || "",
          nagadNumber: payload.nagadNumbers[0] || payload.pathaoPayNumber || "",
        },
        { merge: true }
      );
      notify("Payment settings saved and synced successfully!", "success");
    } catch (e) {
      console.error(e);
      notify("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-zinc-500">Loading...</div>;
  }

  const handleAddFooterLogo = () => {
    setData({
      ...data,
      footerPaymentLogos: [...data.footerPaymentLogos, { name: "", icon: "" }]
    });
  };

  const handleUpdateFooterLogo = (index: number, field: "name" | "icon", value: string) => {
    const newLogos = [...data.footerPaymentLogos];
    newLogos[index][field] = value;
    setData({ ...data, footerPaymentLogos: newLogos });
  };

  const handleRemoveFooterLogo = (index: number) => {
    const newLogos = [...data.footerPaymentLogos];
    newLogos.splice(index, 1);
    setData({ ...data, footerPaymentLogos: newLogos });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Social & Payment Settings</h1>
        <p className="text-zinc-500 text-sm mt-1">Manage Footer links, active mobile banking payment options, and fallback numbers.</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 space-y-4">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-2">Social Links (Footer)</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Instagram URL (@deep.shop.official)</label>
            <input
              type="text"
              value={data.instagramUrl}
              onChange={(e) => setData({ ...data, instagramUrl: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1cdb5e]/50 text-zinc-900 dark:text-white"
              placeholder="https://www.instagram.com/deep.shop.official"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">TikTok URL</label>
            <input
              type="text"
              value={data.tiktokUrl}
              onChange={(e) => setData({ ...data, tiktokUrl: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1cdb5e]/50 text-zinc-900 dark:text-white"
              placeholder="https://tiktok.com/@yourhandle"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Footer Logo URL</label>
            <input
              type="text"
              value={data.footerLogo}
              onChange={(e) => setData({ ...data, footerLogo: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1cdb5e]/50 text-zinc-900 dark:text-white"
              placeholder="https://example.com/logo.png"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 space-y-4">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-2">Mobile Banking & Fallback Payment Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Scan to Pay QR Image (Optional)</label>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploadingImage(true);
                    try {
                      const url = await uploadToImgbb(file);
                      setData({ ...data, banglaQrImage: url });
                      notify("Image uploaded successfully", "success");
                    } catch (err) {
                      notify("Failed to upload image", "error");
                    } finally {
                      setUploadingImage(false);
                    }
                  }
                }}
                disabled={uploadingImage}
                className="w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1cdb5e]/10 file:text-[#1cdb5e] hover:file:bg-[#1cdb5e]/20 disabled:opacity-50"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 font-bold uppercase">OR</span>
              </div>
              <input
                type="text"
                value={data.banglaQrImage}
                onChange={(e) => setData({ ...data, banglaQrImage: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1cdb5e]/50 text-zinc-900 dark:text-white"
                placeholder="Paste Image URL here..."
              />
            </div>
            {data.banglaQrImage && (
              <img src={data.banglaQrImage} alt="QR Preview" className="mt-4 w-48 h-48 object-contain border rounded-xl" />
            )}
          </div>
          {/* Multi-bKash Numbers */}
          <div className="p-4 bg-pink-50/50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-900/30 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-bold text-pink-700 dark:text-pink-300">
                  Multiple bKash Numbers (অ্যাডমিন বিকাশ নাম্বারসমূহ - র‍্যান্ডম রোটেট করবে)
                </label>
                <p className="text-xs text-zinc-500">
                  একাধিক নাম্বার যোগ করুন। চেকআউট পেজে রিফ্রেশ করলে প্রতিবার একটি একটি করে পরিবর্তন হবে।
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newBkashInput}
                onChange={(e) => setNewBkashInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = newBkashInput.trim();
                    if (!val) return;
                    if (isForbiddenNumber(val)) {
                      notify("This number is not allowed", "error");
                      return;
                    }
                    if (data.bkashNumbers.includes(val)) {
                      notify("This number is already in the list", "error");
                      return;
                    }
                    const updated = [...data.bkashNumbers, val];
                    const nextData = {
                      ...data,
                      bkashNumbers: updated,
                      npsbNumber: updated[0] || "",
                    };
                    setData(nextData);
                    setNewBkashInput("");
                    handleSave(nextData);
                  }
                }}
                placeholder="নতুন বিকাশ নাম্বার লিখুন (যেমন: 017XXXXXXXX)"
                className="flex-1 bg-white dark:bg-zinc-800 border border-pink-200 dark:border-pink-800/50 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white"
              />
              <Button
                type="button"
                onClick={() => {
                  const val = newBkashInput.trim();
                  if (!val) return;
                  if (isForbiddenNumber(val)) {
                    notify("This number is not allowed", "error");
                    return;
                  }
                  if (data.bkashNumbers.includes(val)) {
                    notify("This number is already in the list", "error");
                    return;
                  }
                  const updated = [...data.bkashNumbers, val];
                  const nextData = {
                    ...data,
                    bkashNumbers: updated,
                    npsbNumber: updated[0] || "",
                  };
                  setData(nextData);
                  setNewBkashInput("");
                  handleSave(nextData);
                }}
                className="bg-[#E2125B] hover:bg-[#c20e4d] text-white rounded-xl px-5 text-sm font-bold"
              >
                + Add bKash
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {data.bkashNumbers.map((num, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-white dark:bg-zinc-800 border border-pink-300 dark:border-pink-800 px-3 py-1.5 rounded-xl shadow-xs"
                >
                  <span className="text-xs font-bold text-[#E2125B]">#{i + 1}</span>
                  <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">{num}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = data.bkashNumbers.filter((_, idx) => idx !== i);
                      const nextData = {
                        ...data,
                        bkashNumbers: updated,
                        npsbNumber: updated[0] || "",
                      };
                      setData(nextData);
                      handleSave(nextData);
                    }}
                    className="text-zinc-400 hover:text-red-500 text-xs font-bold ml-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {data.bkashNumbers.length === 0 && (
                <p className="text-xs text-amber-600 font-medium">কোনো বিকাশ নাম্বার যোগ করা নেই</p>
              )}
            </div>
          </div>

          {/* Multi-Nagad Numbers */}
          <div className="p-4 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-bold text-orange-700 dark:text-orange-300">
                  Multiple Nagad Numbers (অ্যাডমিন নগদ নাম্বারসমূহ - র‍্যান্ডম রোটেট করবে)
                </label>
                <p className="text-xs text-zinc-500">
                  একাধিক নাম্বার যোগ করুন। চেকআউট পেজে রিফ্রেশ করলে প্রতিবার একটি একটি করে পরিবর্তন হবে।
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newNagadInput}
                onChange={(e) => setNewNagadInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = newNagadInput.trim();
                    if (!val) return;
                    if (isForbiddenNumber(val)) {
                      notify("This number is not allowed", "error");
                      return;
                    }
                    if (data.nagadNumbers.includes(val)) {
                      notify("This number is already in the list", "error");
                      return;
                    }
                    const updated = [...data.nagadNumbers, val];
                    const nextData = {
                      ...data,
                      nagadNumbers: updated,
                      pathaoPayNumber: updated[0] || "",
                    };
                    setData(nextData);
                    setNewNagadInput("");
                    handleSave(nextData);
                  }
                }}
                placeholder="নতুন নগদ নাম্বার লিখুন (যেমন: 018XXXXXXXX)"
                className="flex-1 bg-white dark:bg-zinc-800 border border-orange-200 dark:border-orange-800/50 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white"
              />
              <Button
                type="button"
                onClick={() => {
                  const val = newNagadInput.trim();
                  if (!val) return;
                  if (isForbiddenNumber(val)) {
                    notify("This number is not allowed", "error");
                    return;
                  }
                  if (data.nagadNumbers.includes(val)) {
                    notify("This number is already in the list", "error");
                    return;
                  }
                  const updated = [...data.nagadNumbers, val];
                  const nextData = {
                    ...data,
                    nagadNumbers: updated,
                    pathaoPayNumber: updated[0] || "",
                  };
                  setData(nextData);
                  setNewNagadInput("");
                  handleSave(nextData);
                }}
                className="bg-[#F57C20] hover:bg-[#d96714] text-white rounded-xl px-5 text-sm font-bold"
              >
                + Add Nagad
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {data.nagadNumbers.map((num, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-white dark:bg-zinc-800 border border-orange-300 dark:border-orange-800 px-3 py-1.5 rounded-xl shadow-xs"
                >
                  <span className="text-xs font-bold text-[#F57C20]">#{i + 1}</span>
                  <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">{num}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = data.nagadNumbers.filter((_, idx) => idx !== i);
                      const nextData = {
                        ...data,
                        nagadNumbers: updated,
                        pathaoPayNumber: updated[0] || "",
                      };
                      setData(nextData);
                      handleSave(nextData);
                    }}
                    className="text-zinc-400 hover:text-red-500 text-xs font-bold ml-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {data.nagadNumbers.length === 0 && (
                <p className="text-xs text-amber-600 font-medium">কোনো নগদ নাম্বার যোগ করা নেই</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 space-y-4">
        <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2">
           <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Footer Payment Logos</h2>
           <Button onClick={handleAddFooterLogo} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200">Add Logo</Button>
        </div>
        <div className="space-y-4">
          {data.footerPaymentLogos.map((logo, index) => (
             <div key={index} className="flex gap-4 items-start p-4 border border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                <div className="flex-grow space-y-3">
                   <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Method Name</label>
                      <input 
                         type="text" 
                         value={logo.name} 
                         onChange={(e) => handleUpdateFooterLogo(index, "name", e.target.value)} 
                         className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1cdb5e]"
                         placeholder="e.g. bKash"
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Icon URL</label>
                      <div className="flex gap-2">
                        <input 
                           type="text" 
                           value={logo.icon} 
                           onChange={(e) => handleUpdateFooterLogo(index, "icon", e.target.value)} 
                           className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1cdb5e]"
                           placeholder="https://..."
                        />
                        <label className="bg-zinc-200 dark:bg-zinc-700 px-3 py-2 rounded-xl cursor-pointer flex-shrink-0 text-xs font-bold flex items-center justify-center">
                          Upload
                          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               const oldIcon = logo.icon;
                               handleUpdateFooterLogo(index, "icon", "Uploading...");
                               try {
                                 const url = await uploadToImgbb(file);
                                 if (url) handleUpdateFooterLogo(index, "icon", url);
                                 else handleUpdateFooterLogo(index, "icon", oldIcon);
                               } catch {
                                 handleUpdateFooterLogo(index, "icon", oldIcon);
                                 notify("Upload failed", "error");
                               }
                             }
                          }} />
                        </label>
                      </div>
                      {logo.icon && logo.icon !== "Uploading..." && (
                         <img src={logo.icon} alt={logo.name} className="mt-2 h-8 object-contain" />
                      )}
                   </div>
                </div>
                <button onClick={() => handleRemoveFooterLogo(index)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                </button>
             </div>
          ))}
          {data.footerPaymentLogos.length === 0 && <p className="text-zinc-500 text-sm text-center">No logos added.</p>}
        </div>
      </div>

      <div className="flex justify-end pb-12">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#1cdb5e] hover:bg-[#17ba4f] text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95"
        >
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
};

export default ManagePayments;
