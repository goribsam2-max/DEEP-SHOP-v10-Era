import React from "react";
import { useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import { triggerHaptic } from "../lib/haptics";

const LocationAccess: React.FC = () => {
  const navigate = useNavigate();

  const handleAllow = () => {
    triggerHaptic("medium");
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => navigate("/"),
        () => navigate("/"),
      );
    } else {
      navigate("/");
    }
  };

  return (
    <div className="ds-apple-shop-canvas min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="ds-apple-surface max-w-sm w-full rounded-[28px] p-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] rounded-[20px] flex items-center justify-center mb-6">
          <MapPin className="w-8 h-8" />
        </div>
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
          What Is Your Location?
        </h1>
        <p className="text-[14px] text-[#6E6E73] dark:text-[#98989D] leading-relaxed mb-8">
          Share your location so we can show accurate delivery times and nearby service options.
        </p>

        <button
          type="button"
          onClick={handleAllow}
          className="ds-apple-btn-primary w-full py-3.5 px-5 rounded-full text-[15px] font-semibold whitespace-nowrap mb-3 active:scale-[0.98] transition-transform cursor-pointer"
        >
          Allow Location Access
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            navigate("/");
          }}
          className="ds-apple-btn-secondary w-full py-3 px-5 rounded-full text-[14px] font-semibold whitespace-nowrap active:scale-[0.98] transition-transform cursor-pointer"
        >
          Enter Location Manually
        </button>
      </div>
    </div>
  );
};

export default LocationAccess;

