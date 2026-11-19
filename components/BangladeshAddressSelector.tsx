import React, { useState, useEffect, useMemo } from "react";
import { 
  BD_DIVISIONS, 
  BD_DISTRICTS, 
  BD_UPAZILAS, 
  buildFormattedAddress,
  BangladeshDivision,
  BangladeshDistrict,
  BangladeshUpazila
} from "../src/lib/bangladeshGeo";
import { detectAbuse } from "../src/lib/abuseProtection";
import { MapPin, AlertTriangle, CheckCircle2 } from "lucide-react";
import { isAuthVoiceMuted, playAuthVoice } from "../lib/authVoiceAndValidation";
import { triggerHaptic } from "../lib/haptics";

interface BangladeshAddressSelectorProps {
  onAddressChange: (fullAddress: string, structuredData: {
    division: string;
    district: string;
    upazila: string;
    areaUnion: string;
    detailedHouseRoad: string;
  }) => void;
  initialValue?: string;
  onErrorState?: (hasError: boolean, errorMsg?: string) => void;
  enableVoiceGuide?: boolean;
}

export const BangladeshAddressSelector: React.FC<BangladeshAddressSelectorProps> = ({
  onAddressChange,
  initialValue,
  onErrorState,
  enableVoiceGuide = false,
}) => {
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("dhaka");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("dhaka");
  const [selectedUpazilaId, setSelectedUpazilaId] = useState<string>("mirpur");
  const [areaUnion, setAreaUnion] = useState<string>("");
  const [detailedHouseRoad, setDetailedHouseRoad] = useState<string>("");
  const [validationError, setValidationError] = useState<string>("");

  // Districts for current division
  const availableDistricts = useMemo(() => {
    return BD_DISTRICTS.filter((d) => d.divisionId === selectedDivisionId);
  }, [selectedDivisionId]);

  // Upazilas for current district
  const availableUpazilas = useMemo(() => {
    return BD_UPAZILAS.filter((u) => u.districtId === selectedDistrictId);
  }, [selectedDistrictId]);

  // Current Upazila details
  const currentUpazila = useMemo(() => {
    return BD_UPAZILAS.find((u) => u.id === selectedUpazilaId);
  }, [selectedUpazilaId]);

  // When division changes, automatically pick the first district
  const handleDivisionChange = (divId: string) => {
    setSelectedDivisionId(divId);
    const newDistricts = BD_DISTRICTS.filter((d) => d.divisionId === divId);
    if (newDistricts.length > 0) {
      setSelectedDistrictId(newDistricts[0].id);
      const newUpazilas = BD_UPAZILAS.filter((u) => u.districtId === newDistricts[0].id);
      if (newUpazilas.length > 0) {
        setSelectedUpazilaId(newUpazilas[0].id);
        setAreaUnion(newUpazilas[0].areas?.[0] || "");
      } else {
        setSelectedUpazilaId("");
        setAreaUnion("");
      }
    }
  };

  // When district changes, automatically pick the first upazila
  const handleDistrictChange = (distId: string) => {
    setSelectedDistrictId(distId);
    const newUpazilas = BD_UPAZILAS.filter((u) => u.districtId === distId);
    if (newUpazilas.length > 0) {
      setSelectedUpazilaId(newUpazilas[0].id);
      setAreaUnion(newUpazilas[0].areas?.[0] || "");
    } else {
      setSelectedUpazilaId("");
      setAreaUnion("");
    }
  };

  // Update parent whenever fields change
  useEffect(() => {
    const curDiv = BD_DIVISIONS.find((d) => d.id === selectedDivisionId);
    const curDist = BD_DISTRICTS.find((d) => d.id === selectedDistrictId);
    const curUpz = BD_UPAZILAS.find((u) => u.id === selectedUpazilaId);

    // Abuse check in detailed house/road text
    const abuseInDetails = detectAbuse(detailedHouseRoad);
    const abuseInArea = detectAbuse(areaUnion);

    let error = "";
    if (abuseInDetails.hasAbuse || abuseInArea.hasAbuse) {
      error = "ঠিকানায় আপত্তিকর বা অশালীন শব্দ ব্যবহার সম্পূর্ণ নিষিদ্ধ!";
    } else if (!detailedHouseRoad.trim()) {
      error = "বাসা নং / রোড / হোল্ডিং / গ্রাম / পাড়া এর বিবরণ লিখুন।";
    }

    setValidationError(error);
    if (onErrorState) {
      onErrorState(Boolean(error), error);
    }

    const structured = {
      division: curDiv ? `${curDiv.name} (${curDiv.bnName})` : "",
      district: curDist ? `${curDist.name} (${curDist.bnName})` : "",
      upazila: curUpz ? `${curUpz.name} (${curUpz.bnName})` : "",
      areaUnion: areaUnion.trim(),
      detailedHouseRoad: detailedHouseRoad.trim()
    };

    const formatted = buildFormattedAddress({
      division: curDiv?.name || "",
      district: curDist?.name || "",
      upazila: curUpz?.name || "",
      areaUnion: areaUnion.trim(),
      detailedHouseRoad: detailedHouseRoad.trim()
    });

    onAddressChange(formatted, structured);
  }, [selectedDivisionId, selectedDistrictId, selectedUpazilaId, areaUnion, detailedHouseRoad]);

  return (
    <div className="space-y-4 bg-white dark:bg-[#1C1C1E] p-4 md:p-5 rounded-[22px] border border-black/[0.08] dark:border-white/[0.1] shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none">
      <div className="flex items-center gap-2 pb-2.5 border-b border-black/[0.06] dark:border-white/[0.08]">
        <MapPin className="w-5 h-5 text-[#0071E3] dark:text-[#0A84FF]" />
        <h4 className="text-[14px] font-semibold tracking-[-0.01em] text-[#1D1D1F] dark:text-[#F5F5F7]">
          বাংলাদেশ ডেলিভারি ঠিকানা (A-Z Official BD Location)
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-semibold text-[#6E6E73] dark:text-[#A1A1A6] mb-1.5">
            ১. বিভাগ (Division) <span className="text-[#FF3B30]">*</span>
          </label>
          <select
            value={selectedDivisionId}
            onFocus={() => {
              if (enableVoiceGuide && !isAuthVoiceMuted()) {
                playAuthVoice("আপনার বিভাগ নির্বাচন করুন।");
              }
            }}
            onChange={(e) => {
              triggerHaptic("selection");
              handleDivisionChange(e.target.value);
            }}
            className="w-full bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-2.5 text-xs md:text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 focus:border-[#0071E3] cursor-pointer"
          >
            {BD_DIVISIONS.map((div) => (
              <option key={div.id} value={div.id}>
                {div.bnName} ({div.name})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#6E6E73] dark:text-[#A1A1A6] mb-1.5">
            ২. জেলা (District / Zila) <span className="text-[#FF3B30]">*</span>
          </label>
          <select
            value={selectedDistrictId}
            onFocus={() => {
              if (enableVoiceGuide && !isAuthVoiceMuted()) {
                playAuthVoice("আপনার জেলা নির্বাচন করুন।");
              }
            }}
            onChange={(e) => {
              triggerHaptic("selection");
              handleDistrictChange(e.target.value);
            }}
            className="w-full bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-2.5 text-xs md:text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 focus:border-[#0071E3] cursor-pointer"
          >
            {availableDistricts.map((dist) => (
              <option key={dist.id} value={dist.id}>
                {dist.bnName} ({dist.name})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#6E6E73] dark:text-[#A1A1A6] mb-1.5">
            ৩. উপজেলা / থানা (Upazila / Thana) <span className="text-[#FF3B30]">*</span>
          </label>
          <select
            value={selectedUpazilaId}
            onFocus={() => {
              if (enableVoiceGuide && !isAuthVoiceMuted()) {
                playAuthVoice("আপনার উপজেলা বা থানা নির্বাচন করুন।");
              }
            }}
            onChange={(e) => {
              triggerHaptic("selection");
              setSelectedUpazilaId(e.target.value);
              const upz = BD_UPAZILAS.find((u) => u.id === e.target.value);
              if (upz?.areas && upz.areas.length > 0) {
                setAreaUnion(upz.areas[0]);
              }
            }}
            className="w-full bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-2.5 text-xs md:text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 focus:border-[#0071E3] cursor-pointer"
          >
            {availableUpazilas.map((upz) => (
              <option key={upz.id} value={upz.id}>
                {upz.bnName} ({upz.name})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#6E6E73] dark:text-[#A1A1A6] mb-1.5">
            ৪. ইউনিয়ন / এলাকা / ডাকঘর (Union / Area) <span className="text-[#FF3B30]">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              list="bd_area_suggestions"
              value={areaUnion}
              onFocus={() => {
                if (enableVoiceGuide && !isAuthVoiceMuted()) {
                  playAuthVoice("আপনার ইউনিয়ন, এলাকা অথবা ডাকঘরের নাম লিখুন।");
                }
              }}
              onChange={(e) => setAreaUnion(e.target.value)}
              placeholder="এলাকা বা ইউনিয়ন লিখুন অথবা সিলেক্ট করুন"
              className="w-full bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-2.5 text-xs md:text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 focus:border-[#0071E3]"
            />
            {currentUpazila?.areas && currentUpazila.areas.length > 0 && (
              <datalist id="bd_area_suggestions">
                {currentUpazila.areas.map((a, idx) => (
                  <option key={idx} value={a} />
                ))}
              </datalist>
            )}
          </div>
          {currentUpazila?.areas && currentUpazila.areas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] text-[#86868B] self-center">জনপ্রিয় এলাকা:</span>
              {currentUpazila.areas.slice(0, 4).map((a, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setAreaUnion(a);
                  }}
                  className={`text-[10px] px-2.5 py-0.5 rounded-full border transition-all active:scale-95 cursor-pointer ${
                    areaUnion === a
                      ? "bg-[#0071E3] dark:bg-[#0A84FF] text-white border-transparent font-semibold"
                      : "bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#6E6E73] dark:text-[#A1A1A6] border-black/[0.08] dark:border-white/[0.1] hover:border-[#0071E3]"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#6E6E73] dark:text-[#A1A1A6] mb-1.5">
          ৫. বাসা নং / রোড / হোল্ডিং / গ্রাম / পাড়া / মহল্লা (House, Road, Village, Moholla) <span className="text-[#FF3B30]">*</span>
        </label>
        <textarea
          rows={2}
          value={detailedHouseRoad}
          onFocus={() => {
            if (enableVoiceGuide && !isAuthVoiceMuted()) {
              playAuthVoice(
                "বাসা নম্বর, রোড নম্বর অথবা গ্রাম ও পাড়ার বিস্তারিত ঠিকানা লিখুন, যাতে ডেলিভারি ম্যান সহজেই চিনতে পারেন।"
              );
            }
          }}
          onChange={(e) => setDetailedHouseRoad(e.target.value)}
          placeholder="যেমন: বাসা #১২, রোড #০৪, ব্লক-বি, গ্রাম: রসুলপুর, পাড়া: পূর্ব পাড়া"
          className={`w-full bg-[#F5F5F7] dark:bg-[#2C2C2E] border rounded-xl px-3 py-2.5 text-xs md:text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-2 resize-none ${
            detectAbuse(detailedHouseRoad).hasAbuse
              ? "border-[#FF3B30] focus:ring-[#FF3B30]/25 bg-[#FF3B30]/5"
              : "border-black/[0.08] dark:border-white/[0.1] focus:ring-[#0071E3]/25 focus:border-[#0071E3]"
          }`}
        />
        {detectAbuse(detailedHouseRoad).hasAbuse && (
          <p className="text-[11px] text-[#FF3B30] dark:text-[#FF453A] font-semibold mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            সতর্কতা: আপত্তিকর বা গালিযুক্ত শব্দ ব্যবহার করবেন না! ৩ বার ব্যবহারে চিরতরে ব্যান করা হবে।
          </p>
        )}
      </div>

      <div className="bg-[#248A3D]/8 dark:bg-[#30D158]/10 border border-[#248A3D]/20 dark:border-[#30D158]/20 rounded-2xl p-3.5 text-xs">
        <div className="flex items-center gap-1.5 text-[#248A3D] dark:text-[#30D158] font-semibold mb-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          সম্পূর্ণ ঠিকানা প্রিভিউ:
        </div>
        <p className="text-[#1D1D1F] dark:text-[#F5F5F7] font-medium break-words">
          {detailedHouseRoad.trim() ? detailedHouseRoad.trim() + ", " : ""}
          {areaUnion.trim() ? areaUnion.trim() + ", " : ""}
          {currentUpazila?.name ? `${currentUpazila.name} (${currentUpazila.bnName}), ` : ""}
          {availableDistricts.find((d) => d.id === selectedDistrictId)?.name ? `${availableDistricts.find((d) => d.id === selectedDistrictId)?.name}, ` : ""}
          {BD_DIVISIONS.find((d) => d.id === selectedDivisionId)?.name ? `${BD_DIVISIONS.find((d) => d.id === selectedDivisionId)?.name} Division` : ""}
        </p>
      </div>
    </div>
  );
};
