import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { useNotify } from "../components/Notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { BangladeshAddressSelector } from "../components/BangladeshAddressSelector";
import {
  validateBangladeshiPhone,
  detectAbuse,
  recordAbuseStrike,
} from "../src/lib/abuseProtection";
import { ProfileSettingsPageSkeleton } from "../components/PageSkeletons";
import AuthVoiceToggle from "../components/AuthVoiceToggle";
import {
  isAuthVoiceMuted,
  playAuthVoice,
  stopAuthVoice,
} from "../lib/authVoiceAndValidation";

const ShippingAddress: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );
  const [isAdding, setIsAdding] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: "",
    phone: "",
    district: "",
    street: "",
    landmark: "",
    category: "Home",
    isDefault: true,
  });
  const [loading, setLoading] = useState(true);
  const hasPlayedInitialVoiceRef = useRef(false);

  const speakIfUnmuted = (msg: string) => {
    if (!isAuthVoiceMuted()) {
      playAuthVoice(msg);
    }
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u) {
        getDoc(doc(db, "users", u.uid))
          .then((snap) => {
            if (snap.exists()) {
              const data = snap.data();
              let addrs: any[] = [];
              if (
                data.addresses &&
                Array.isArray(data.addresses) &&
                data.addresses.length > 0
              ) {
                addrs = data.addresses;
              }
              const localAddresses = JSON.parse(
                localStorage.getItem("vibe_shipping_addresses_v2") || "[]"
              );
              if (localAddresses.length > 0) {
                const combined = [...addrs];
                localAddresses.forEach((loc: any) => {
                  if (
                    !combined.some(
                      (c) => c.id === loc.id || c.address === loc.address
                    )
                  ) {
                    combined.push(loc);
                  }
                });
                addrs = combined;
                updateDoc(doc(db, "users", u.uid), { addresses: addrs }).catch(
                  console.error
                );
                localStorage.removeItem("vibe_shipping_addresses_v2");
              }
              if (addrs.length > 0) {
                setSavedAddresses(addrs);
                setSelectedAddressId(addrs[0].id);
              } else if (data.address) {
                const singleAddr = {
                  id: "addr_1",
                  name: data.displayName || "User",
                  phone: data.phoneNumber || "",
                  district: "",
                  street: data.address,
                  landmark: "",
                  category: "Home",
                  isDefault: true,
                  address: data.address,
                };
                setSavedAddresses([singleAddr]);
                setSelectedAddressId(singleAddr.id);
              }
            }
            setLoading(false);
          })
          .catch(() => setLoading(false));
      } else {
        const localAddresses = JSON.parse(
          localStorage.getItem("vibe_shipping_addresses_v2") || "[]"
        );
        setSavedAddresses(localAddresses);
        if (localAddresses.length > 0)
          setSelectedAddressId(localAddresses[0].id);
        setLoading(false);
      }
    });

    return () => {
      unsub();
      stopAuthVoice();
    };
  }, []);

  // Play Bengali Male Voiceover once page state loads
  useEffect(() => {
    if (loading || hasPlayedInitialVoiceRef.current) return;
    hasPlayedInitialVoiceRef.current = true;
    if (isAuthVoiceMuted()) return;

    if (isAdding) {
      playAuthVoice(
        "নতুন ডেলিভারি ঠিকানা যোগ করার পেজে স্বাগতম। প্রাপকের পূর্ণ নাম, এগারো ডিজিটের মোবাইল নম্বর এবং আপনার বিভাগ, জেলা, থানা ও বাসার বিস্তারিত ঠিকানা সঠিকভাবে পূরণ করুন।"
      );
    } else if (savedAddresses.length === 0) {
      playAuthVoice(
        "ডেলিভারি ঠিকানা পেজে স্বাগতম। আপনার এখনো কোনো ঠিকানা সেভ করা নেই। নতুন ডেলিভারি ঠিকানা যোগ করতে নিচের বাটনে ক্লিক করুন।"
      );
    } else {
      playAuthVoice(
        "ডেলিভারি ঠিকানা পেজে স্বাগতম। আপনার সেভ করা ঠিকানা নির্বাচন করুন অথবা নতুন ঠিকানা যোগ করতে নিচের বাটনে ক্লিক করুন।"
      );
    }
  }, [loading, isAdding, savedAddresses.length]);

  const handleOpenAddForm = () => {
    setIsAdding(true);
    speakIfUnmuted(
      "অনুগ্রহ করে প্রাপকের পূর্ণ নাম, সচল মোবাইল নম্বর এবং বিভাগ, জেলা, থানা ও বাসার বিস্তারিত ঠিকানা পূরণ করুন।"
    );
  };

  const handleAdd = async () => {
    if (
      !newAddress.name?.trim() ||
      !newAddress.phone?.trim() ||
      !newAddress.street?.trim()
    ) {
      const msg =
        "অনুগ্রহ করে প্রাপকের নাম, মোবাইল নম্বর এবং বিস্তারিত ঠিকানা সঠিকভাবে পূরণ করুন।";
      speakIfUnmuted(msg);
      return notify(msg, "error");
    }

    // Abuse check
    const abuseName = detectAbuse(newAddress.name);
    const abuseStreet = detectAbuse(newAddress.street);
    const abusePhone = detectAbuse(newAddress.phone);
    if (abuseName.hasAbuse || abuseStreet.hasAbuse || abusePhone.hasAbuse) {
      const strikeRes = await recordAbuseStrike("Address form abusive text");
      speakIfUnmuted(strikeRes.message);
      notify(strikeRes.message, "error");
      return;
    }

    // BD Phone validation
    const phoneVal = validateBangladeshiPhone(newAddress.phone);
    if (!phoneVal.isValid) {
      const phoneErr =
        phoneVal.error || "সঠিক ১১ ডিজিটের বাংলাদেশি নম্বর দিন।";
      speakIfUnmuted(phoneErr);
      return notify(phoneErr, "error");
    }

    const computedAddress = newAddress.street.trim();
    const newAddrObj = {
      id: Math.random().toString(36).substring(7),
      name: newAddress.name.trim(),
      phone: phoneVal.normalized,
      district: newAddress.district,
      street: computedAddress,
      landmark: newAddress.landmark,
      category: newAddress.category,
      isDefault: newAddress.isDefault,
      address: computedAddress,
    };
    const newAddrs = [...savedAddresses, newAddrObj];
    const user = auth.currentUser;

    if (user) {
      try {
        const { setDoc } = await import("firebase/firestore");
        await setDoc(
          doc(db, "users", user.uid),
          {
            addresses: newAddrs,
            address: computedAddress,
          },
          { merge: true }
        );
        setSavedAddresses(newAddrs);
        setSelectedAddressId(newAddrObj.id);
        setIsAdding(false);
        setNewAddress({
          name: "",
          phone: "",
          district: "",
          street: "",
          landmark: "",
          category: "Home",
          isDefault: true,
        });
        speakIfUnmuted("আপনার ডেলিভারি ঠিকানাটি সফলভাবে সেভ করা হয়েছে।");
        notify("ঠিকানা সফলভাবে সেভ করা হয়েছে!", "success");
      } catch (e) {
        speakIfUnmuted("ঠিকানা সেভ করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
        notify("ঠিকানা সেভ করতে ব্যর্থ হয়েছে।", "error");
      }
    } else {
      setSavedAddresses(newAddrs);
      setSelectedAddressId(newAddrObj.id);
      setIsAdding(false);
      localStorage.setItem(
        "vibe_shipping_addresses_v2",
        JSON.stringify(newAddrs)
      );
      speakIfUnmuted("আপনার ডেলিভারি ঠিকানাটি সফলভাবে সেভ করা হয়েছে।");
      notify("ঠিকানা সফলভাবে সেভ করা হয়েছে!", "success");
    }
  };

  const handleRemove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newAddrs = savedAddresses.filter((a) => a.id !== id);
    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          addresses: newAddrs,
        });
        setSavedAddresses(newAddrs);
        if (selectedAddressId === id)
          setSelectedAddressId(newAddrs.length > 0 ? newAddrs[0].id : null);
        speakIfUnmuted("ঠিকানাটি মুছে ফেলা হয়েছে।");
        notify("ঠিকানা মুছে ফেলা হয়েছে", "success");
      } catch (e) {
        notify("ঠিকানা মুছতে সমস্যা হয়েছে", "error");
      }
    } else {
      setSavedAddresses(newAddrs);
      if (selectedAddressId === id)
        setSelectedAddressId(newAddrs.length > 0 ? newAddrs[0].id : null);
      localStorage.setItem(
        "vibe_shipping_addresses_v2",
        JSON.stringify(newAddrs)
      );
      speakIfUnmuted("ঠিকানাটি মুছে ফেলা হয়েছে।");
    }
  };

  if (loading) return <ProfileSettingsPageSkeleton />;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-zinc-50/80 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 py-5 sm:py-8 px-4 sm:px-6 pb-24">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        {/* Responsive Top Header Bar with Voice Assistant Toggle */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white truncate">
              {isAdding ? "নতুন ডেলিভারি ঠিকানা" : "ডেলিভারি ঠিকানা"}
            </h1>
            <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {isAdding
                ? "সঠিক নাম, নম্বর ও লোকেশন পূরণ করুন"
                : "পার্সেল গ্রহণের ঠিকানা নির্বাচন বা যোগ করুন"}
            </p>
          </div>

          {/* Responsive Inline Voice Assistant Toggle */}
          <AuthVoiceToggle isInline />
        </div>

        {/* Main Content */}
        <div className="space-y-6 flex-1">
          {savedAddresses.length > 0 && !isAdding ? (
            <div className="space-y-3.5">
              {savedAddresses.map((addr) => (
                <div
                  key={addr.id}
                  onClick={() => {
                    setSelectedAddressId(addr.id);
                    speakIfUnmuted(`${addr.name} এর ঠিকানা নির্বাচন করা হয়েছে।`);
                  }}
                  className={cn(
                    "p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all bg-white dark:bg-zinc-900",
                    selectedAddressId === addr.id
                      ? "border-emerald-600 dark:border-emerald-500 ring-1 ring-emerald-500/20 shadow-xs"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  )}
                >
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                          selectedAddressId === addr.id
                            ? "border-emerald-600 dark:border-emerald-500"
                            : "border-zinc-300 dark:border-zinc-600"
                        )}
                      >
                        {selectedAddressId === addr.id && (
                          <div className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-500" />
                        )}
                      </div>
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {addr.name}
                      </h4>
                      {addr.category && (
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0">
                          · {addr.category}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleRemove(addr.id, e)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>মুছুন</span>
                    </button>
                  </div>
                  <div className="pl-7 space-y-1">
                    <p className="text-sm font-medium text-zinc-500 tabular-nums">
                      {addr.phone}
                    </p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {addr.address}
                    </p>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                type="button"
                className="w-full border-dashed border-emerald-500/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 py-6 rounded-2xl font-bold flex items-center justify-center gap-2 cursor-pointer"
                onClick={handleOpenAddForm}
              >
                <Plus className="w-4 h-4" />
                <span>নতুন ডেলিভারি ঠিকানা যোগ করুন</span>
              </Button>
            </div>
          ) : (
            !isAdding && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    কোনো ডেলিভারি ঠিকানা সেভ করা নেই
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    আপনার অর্ডার দ্রুত ও সঠিকভাবে পৌঁছে দিতে একটি ডেলিভারি ঠিকানা যোগ করুন।
                  </p>
                </div>
                <Button
                  type="button"
                  className="mt-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 rounded-full px-6 py-5 font-bold cursor-pointer"
                  onClick={handleOpenAddForm}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  <span>নতুন ডেলিভারি ঠিকানা যোগ করুন</span>
                </Button>
              </div>
            )
          )}

          {isAdding && (
            <div className="flex flex-col gap-5 bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
              {/* Contact name */}
              <div className="space-y-2">
                <Label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  প্রাপকের নাম (Contact Name){" "}
                  <span className="text-rose-500">*</span>
                </Label>
                <Input
                  className="py-6 rounded-xl border-zinc-200 dark:border-zinc-800 focus-visible:ring-emerald-500 bg-transparent text-base"
                  placeholder="যার নামে পার্সেল রিসিভ হবে তার পূর্ণ নাম"
                  value={newAddress.name}
                  onFocus={() =>
                    speakIfUnmuted(
                      "প্রাপকের পূর্ণ নাম লিখুন, যার নামে পার্সেলটি ডেলিভারি হবে।"
                    )
                  }
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, name: e.target.value })
                  }
                />
              </div>

              {/* Contact number */}
              <div className="space-y-2">
                <Label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  সচল মোবাইল নম্বর (Contact Number){" "}
                  <span className="text-rose-500">*</span>
                </Label>
                <div className="flex border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
                  <div className="flex items-center gap-2 px-3.5 sm:px-4 bg-zinc-50 dark:bg-zinc-800/50 border-r border-zinc-200 dark:border-zinc-800 shrink-0">
                    <div className="w-5 h-3.5 bg-green-600 relative overflow-hidden flex items-center justify-center rounded-[2px]">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                    </div>
                    <span className="text-sm sm:text-base font-medium tabular-nums">
                      +880
                    </span>
                  </div>
                  <input
                    type="tel"
                    placeholder="01XXXXXXXXX (১১ ডিজিট)"
                    value={newAddress.phone}
                    onFocus={() =>
                      speakIfUnmuted(
                        "এগারো ডিজিটের সচল বাংলাদেশি মোবাইল নম্বর লিখুন, যেটিতে ডেলিভারি ম্যান কল করতে পারবেন।"
                      )
                    }
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, phone: e.target.value })
                    }
                    className="flex-1 min-w-0 px-3.5 sm:px-4 py-3 text-base bg-transparent outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 tabular-nums"
                  />
                </div>
              </div>

              {/* Integrated A-Z Bangladesh Geographic Selector with Voice Guidance */}
              <div className="space-y-2">
                <BangladeshAddressSelector
                  enableVoiceGuide={true}
                  onAddressChange={(formatted, structured) => {
                    setNewAddress((prev) => ({
                      ...prev,
                      street: formatted,
                      district: structured.district,
                    }));
                  }}
                />
              </div>

              {/* Category */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 gap-3">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  ঠিকানার ধরন (Address Category)
                </span>
                <div className="flex flex-wrap gap-4">
                  {[
                    {
                      id: "Home",
                      label: "বাসা (Home)",
                      voice: "বাসার ঠিকানা নির্বাচন করা হয়েছে।",
                    },
                    {
                      id: "Office",
                      label: "অফিস (Office)",
                      voice: "অফিসের ঠিকানা নির্বাচন করা হয়েছে।",
                    },
                    {
                      id: "Others",
                      label: "অন্যান্য (Others)",
                      voice: "অন্যান্য ঠিকানা নির্বাচন করা হয়েছে।",
                    },
                  ].map((cat) => (
                    <label
                      key={cat.id}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      <div className="relative flex items-center justify-center w-5 h-5 rounded-full border-2 border-zinc-300 dark:border-zinc-700 group-hover:border-emerald-500 transition-colors">
                        {newAddress.category === cat.id && (
                          <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full" />
                        )}
                      </div>
                      <input
                        type="radio"
                        name="addressCat"
                        checked={newAddress.category === cat.id}
                        onChange={() => {
                          setNewAddress({ ...newAddress, category: cat.id });
                          speakIfUnmuted(cat.voice);
                        }}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        {cat.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Default */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  ডিফল্ট ডেলিভারি ঠিকানা
                </span>
                <div className="flex gap-4">
                  {["On", "Off"].map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      <div className="relative flex items-center justify-center w-5 h-5 rounded-full border-2 border-zinc-300 dark:border-zinc-700 group-hover:border-emerald-500 transition-colors">
                        {(newAddress.isDefault ? "On" : "Off") === opt && (
                          <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full" />
                        )}
                      </div>
                      <input
                        type="radio"
                        name="isDefaultAddr"
                        checked={(newAddress.isDefault ? "On" : "Off") === opt}
                        onChange={() =>
                          setNewAddress({
                            ...newAddress,
                            isDefault: opt === "On",
                          })
                        }
                        className="sr-only"
                      />
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {opt === "On" ? "হ্যাঁ (On)" : "না (Off)"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-2 flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  onClick={handleAdd}
                  className="flex-1 py-6 text-base bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-xs cursor-pointer"
                >
                  ঠিকানা সেভ করুন (Save Address)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAdding(false)}
                  className="sm:w-36 py-6 rounded-2xl font-semibold cursor-pointer"
                >
                  বাতিল (Cancel)
                </Button>
              </div>
            </div>
          )}
        </div>

        {!isAdding && (
          <Button
            type="button"
            onClick={() => navigate("/checkout")}
            disabled={!selectedAddressId}
            className="w-full mt-2 shadow-xs disabled:opacity-50 tracking-normal py-6 rounded-2xl text-base font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 cursor-pointer"
          >
            চেকআউটে ফিরে যান (Proceed to Checkout)
          </Button>
        )}
      </div>
    </div>
  );
};

export default ShippingAddress;
