import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Plus, Trash2, Check } from "lucide-react";
import { useNotify } from "../components/Notifications";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { triggerHaptic } from "../lib/haptics";
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
      speakIfUnmuted(
        "অনুগ্রহ করে প্রাপকের নাম, মোবাইল নম্বর এবং বিস্তারিত ঠিকানা সঠিকভাবে পূরণ করুন।"
      );
      return notify("Please fill in recipient name, phone number, and detailed address.", "error");
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
      speakIfUnmuted("সঠিক ১১ ডিজিটের বাংলাদেশি নম্বর দিন।");
      return notify("Please enter a valid 11-digit Bangladeshi phone number.", "error");
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
        notify("Address saved successfully!", "success");
      } catch (e) {
        speakIfUnmuted("ঠিকানা সেভ করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
        notify("Failed to save address.", "error");
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
      notify("Address saved successfully!", "success");
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
        notify("Address removed.", "success");
      } catch (e) {
        notify("Failed to remove address.", "error");
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
    <div className="ds-apple-shop-canvas min-h-[calc(100vh-56px)] pb-24">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3 px-1">
          <div className="min-w-0">
            <h1 className="ds-apple-display text-[22px] sm:text-[26px] font-bold tracking-[-0.022em] text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight truncate">
              {isAdding ? "New Delivery Address" : "Delivery Address"}
            </h1>
            <p className="text-xs sm:text-[13px] ds-apple-muted mt-1">
              {isAdding
                ? "Enter recipient name, phone number, and location"
                : "Select or add a parcel delivery address"}
            </p>
          </div>
          <div className="shrink-0">
            <AuthVoiceToggle isInline />
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-5 flex-1">
          {savedAddresses.length > 0 && !isAdding ? (
            <div className="space-y-3.5">
              {savedAddresses.map((addr) => {
                const isSelected = selectedAddressId === addr.id;
                return (
                  <div
                    key={addr.id}
                    onClick={() => {
                      triggerHaptic();
                      setSelectedAddressId(addr.id);
                      speakIfUnmuted(`${addr.name} এর ঠিকানা নির্বাচন করা হয়েছে।`);
                    }}
                    className={cn(
                      "ds-apple-surface p-4 sm:p-5 rounded-[22px] cursor-pointer transition-all",
                      isSelected && "ds-liquid-subpanel-active"
                    )}
                  >
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                            isSelected
                              ? "border-[#0071E3] dark:border-[#0A84FF]"
                              : "border-black/20 dark:border-white/25"
                          )}
                        >
                          {isSelected && (
                            <div className="w-2.5 h-2.5 rounded-full bg-[#0071E3] dark:bg-[#0A84FF]" />
                          )}
                        </div>
                        <h4 className="font-semibold text-[15px] truncate">
                          {addr.name}
                        </h4>
                        {addr.category && (
                          <span className="text-xs ds-apple-muted shrink-0">
                            · {addr.category}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          triggerHaptic("warning");
                          handleRemove(addr.id, e);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF3B30] dark:text-[#FF453A] hover:bg-[#FF3B30]/10 px-2.5 py-1 rounded-full transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                    <div className="pl-8 space-y-1">
                      <p className="text-sm font-medium ds-apple-muted tabular-nums">
                        {addr.phone}
                      </p>
                      <p className="text-sm leading-relaxed">
                        {addr.address}
                      </p>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                className="ds-apple-surface w-full border border-dashed border-[#0071E3]/45 ds-apple-accent-text hover:bg-[#0071E3]/5 min-h-[52px] py-3.5 px-5 rounded-[20px] font-semibold text-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-colors"
                onClick={() => {
                  triggerHaptic();
                  handleOpenAddForm();
                }}
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Add New Delivery Address</span>
              </button>
            </div>
          ) : (
            !isAdding && (
              <div className="ds-apple-surface flex flex-col items-center justify-center py-16 px-6 text-center rounded-[26px] space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 ds-apple-accent-text flex items-center justify-center">
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <p className="text-base font-semibold">
                    No Saved Delivery Addresses
                  </p>
                  <p className="text-xs ds-apple-muted leading-relaxed">
                    Add a delivery address so we can deliver your orders accurately and quickly.
                  </p>
                </div>
                <button
                  type="button"
                  className="ds-apple-btn-primary mt-2 rounded-full px-6 min-h-[48px] py-3 text-sm font-semibold inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                  onClick={() => {
                    triggerHaptic();
                    handleOpenAddForm();
                  }}
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Add New Delivery Address</span>
                </button>
              </div>
            )
          )}

          {isAdding && (
            <div className="ds-apple-surface flex flex-col gap-5 p-5 sm:p-6 rounded-[24px]">
              {/* Contact name */}
              <div className="space-y-2">
                <Label className="font-medium text-xs ds-apple-muted">
                  Recipient Name{" "}
                  <span className="text-[#FF3B30]">*</span>
                </Label>
                <Input
                  className="ds-apple-input h-12 rounded-2xl text-base"
                  placeholder="Full name of the parcel recipient"
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
                <Label className="font-medium text-xs ds-apple-muted">
                  Active Mobile Number{" "}
                  <span className="text-[#FF3B30]">*</span>
                </Label>
                <div className="ds-apple-input flex rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-2 px-3.5 sm:px-4 border-r border-black/[0.06] dark:border-white/[0.08] shrink-0">
                    <div className="w-5 h-3.5 bg-green-600 relative overflow-hidden flex items-center justify-center rounded-[2px]">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                    </div>
                    <span className="text-sm sm:text-base font-medium tabular-nums">
                      +880
                    </span>
                  </div>
                  <input
                    type="tel"
                    placeholder="01XXXXXXXXX (11 digits)"
                    value={newAddress.phone}
                    onFocus={() =>
                      speakIfUnmuted(
                        "এগারো ডিজিটের সচল বাংলাদেশি মোবাইল নম্বর লিখুন, যেটিতে ডেলিভারি ম্যান কল করতে পারবেন।"
                      )
                    }
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, phone: e.target.value })
                    }
                    className="flex-1 min-w-0 px-3.5 sm:px-4 py-3 text-base bg-transparent outline-none tabular-nums"
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
                <span className="text-sm font-medium ds-apple-muted">
                  Address Category
                </span>
                <div className="flex flex-wrap gap-4">
                  {[
                    {
                      id: "Home",
                      label: "Home",
                      voice: "বাসার ঠিকানা নির্বাচন করা হয়েছে।",
                    },
                    {
                      id: "Office",
                      label: "Office",
                      voice: "অফিসের ঠিকানা নির্বাচন করা হয়েছে।",
                    },
                    {
                      id: "Others",
                      label: "Others",
                      voice: "অন্যান্য ঠিকানা নির্বাচন করা হয়েছে।",
                    },
                  ].map((cat) => (
                    <label
                      key={cat.id}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      <div className={cn(
                        "relative flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors",
                        newAddress.category === cat.id ? "border-[#0071E3] dark:border-[#0A84FF]" : "border-black/20 dark:border-white/25"
                      )}>
                        {newAddress.category === cat.id && (
                          <div className="w-2.5 h-2.5 bg-[#0071E3] dark:bg-[#0A84FF] rounded-full" />
                        )}
                      </div>
                      <input
                        type="radio"
                        name="addressCat"
                        checked={newAddress.category === cat.id}
                        onChange={() => {
                          triggerHaptic();
                          setNewAddress({ ...newAddress, category: cat.id });
                          speakIfUnmuted(cat.voice);
                        }}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium whitespace-nowrap">
                        {cat.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Default */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-sm font-medium ds-apple-muted">
                  Default Delivery Address
                </span>
                <div className="flex gap-4">
                  {["On", "Off"].map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      <div className={cn(
                        "relative flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors",
                        (newAddress.isDefault ? "On" : "Off") === opt ? "border-[#0071E3] dark:border-[#0A84FF]" : "border-black/20 dark:border-white/25"
                      )}>
                        {(newAddress.isDefault ? "On" : "Off") === opt && (
                          <div className="w-2.5 h-2.5 bg-[#0071E3] dark:bg-[#0A84FF] rounded-full" />
                        )}
                      </div>
                      <input
                        type="radio"
                        name="isDefaultAddr"
                        checked={(newAddress.isDefault ? "On" : "Off") === opt}
                        onChange={() => {
                          triggerHaptic();
                          setNewAddress({
                            ...newAddress,
                            isDefault: opt === "On",
                          });
                        }}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">
                        {opt === "On" ? "Yes (Default)" : "No"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("success");
                    handleAdd();
                  }}
                  className="ds-apple-btn-primary w-full sm:w-auto sm:flex-1 min-h-[50px] py-3.5 px-6 text-[15px] font-semibold rounded-full inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Save Address</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setIsAdding(false);
                  }}
                  className="ds-apple-btn-secondary w-full sm:w-36 min-h-[50px] py-3.5 px-6 rounded-full text-[15px] font-semibold inline-flex items-center justify-center whitespace-nowrap shrink-0 active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              navigate("/checkout");
            }}
            disabled={!selectedAddressId}
            className="ds-apple-btn-primary w-full mt-2 disabled:opacity-45 min-h-[52px] py-3.5 px-6 rounded-full text-[15px] font-semibold inline-flex items-center justify-center whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Return to Checkout</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ShippingAddress;
