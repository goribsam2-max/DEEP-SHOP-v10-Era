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
import { MapPin, Building, Home, Search, AlertTriangle, CheckCircle2 } from "lucide-react";

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
}

export const BangladeshAddressSelector: React.FC<BangladeshAddressSelectorProps> = ({
  onAddressChange,
  initialValue,
  onErrorState
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
    <div className="space-y-4 bg-zinc-50 dark:bg-zinc-900/60 p-4 md:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <MapPin className="w-5 h-5 text-emerald-500" />
        <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
          বাংলাদেশ ডেলিভারি ঠিকানা (A-Z Official BD Location)
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Division */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            ১. বিভাগ (Division) <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedDivisionId}
            onChange={(e) => handleDivisionChange(e.target.value)}
            className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-xs md:text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            {BD_DIVISIONS.map((div) => (
              <option key={div.id} value={div.id}>
                {div.bnName} ({div.name})
              </option>
            ))}
          </select>
        </div>

        {/* District */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            ২. জেলা (District / Zila) <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedDistrictId}
            onChange={(e) => handleDistrictChange(e.target.value)}
            className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-xs md:text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            {availableDistricts.map((dist) => (
              <option key={dist.id} value={dist.id}>
                {dist.bnName} ({dist.name})
              </option>
            ))}
          </select>
        </div>

        {/* Upazila / Thana */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            ৩. উপজেলা / থানা (Upazila / Thana) <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedUpazilaId}
            onChange={(e) => {
              setSelectedUpazilaId(e.target.value);
              const upz = BD_UPAZILAS.find((u) => u.id === e.target.value);
              if (upz?.areas && upz.areas.length > 0) {
                setAreaUnion(upz.areas[0]);
              }
            }}
            className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-xs md:text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            {availableUpazilas.map((upz) => (
              <option key={upz.id} value={upz.id}>
                {upz.bnName} ({upz.name})
              </option>
            ))}
          </select>
        </div>

        {/* Area / Union / Ward */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            ৪. ইউনিয়ন / এলাকা / ডাকঘর (Union / Area) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              list="bd_area_suggestions"
              value={areaUnion}
              onChange={(e) => setAreaUnion(e.target.value)}
              placeholder="এলাকা বা ইউনিয়ন লিখুন অথবা সিলেক্ট করুন"
              className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-xs md:text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
            <div className="flex flex-wrap gap-1 mt-1.5">
              <span className="text-[10px] text-zinc-500 self-center">জনপ্রিয় এলাকা:</span>
              {currentUpazila.areas.slice(0, 4).map((a, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAreaUnion(a)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                    areaUnion === a
                      ? "bg-emerald-500 text-white border-emerald-500 font-bold"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-emerald-500"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detailed House / Road / Village */}
      <div>
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
          ৫. বাসা নং / রোড / হোল্ডিং / গ্রাম / পাড়া / মহল্লা (House, Road, Village, Moholla) <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={2}
          value={detailedHouseRoad}
          onChange={(e) => setDetailedHouseRoad(e.target.value)}
          placeholder="যেমন: বাসা #১২, রোড #০৪, ব্লক-বি, গ্রাম: রসুলপুর, পাড়া: পূর্ব পাড়া"
          className={`w-full bg-white dark:bg-zinc-800 border rounded-xl px-3 py-2.5 text-xs md:text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 resize-none ${
            detectAbuse(detailedHouseRoad).hasAbuse
              ? "border-red-500 focus:ring-red-500 bg-red-50/20"
              : "border-zinc-200 dark:border-zinc-700 focus:ring-emerald-500"
          }`}
        />
        {detectAbuse(detailedHouseRoad).hasAbuse && (
          <p className="text-[11px] text-red-500 font-bold mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            সতর্কতা: আপত্তিকর বা গালিযুক্ত শব্দ ব্যবহার করবেন না! ৩ বার ব্যবহারে চিরতরে ব্যান করা হবে।
          </p>
        )}
      </div>

      {/* Live Preview */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs">
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold mb-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          সম্পূর্ণ ঠিকানা প্রিভিউ:
        </div>
        <p className="text-zinc-700 dark:text-zinc-300 font-medium break-words">
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
