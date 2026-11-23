import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotify } from "../components/Notifications";
import { auth, db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import Icon from "../components/Icon";
import { CustomDropdown } from "../components/CustomDropdown";
import { validateRealPersonName } from "../lib/authVoiceAndValidation";
import { triggerHaptic } from "../lib/haptics";

const CompleteProfile: React.FC = () => {
  const navigate = useNavigate();
  const notify = useNotify();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: auth.currentUser?.displayName || "",
    phone: "",
    gender: "",
  });

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const nameCheck = validateRealPersonName(formData.name, "name");
    if (!nameCheck.isValid) {
      notify(nameCheck.errorMsg, "error");
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        displayName: formData.name.trim(),
        phoneNumber: formData.phone.trim(),
        gender: formData.gender,
        profileCompleted: true,
      });
      notify("Profile updated!", "success");
      navigate("/location");
    } catch (error) {
      notify("Failed to update profile", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ds-apple-shop-canvas min-h-[100dvh] flex flex-col">
      <div className="flex-1 flex items-center justify-center px-5 py-8">
        <div className="ds-apple-surface w-full max-w-md rounded-[28px] p-6 sm:p-8">
          <div className="text-center mb-7">
            <h1 className="ds-apple-display text-[24px] font-semibold tracking-[-0.025em] text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
              Complete Your Profile
            </h1>
            <p className="ds-apple-muted text-[14px] leading-relaxed">
              Don&apos;t worry, only you can see your personal data. No one else will
              be able to see it.
            </p>
          </div>

          <div className="flex justify-center mb-7">
            <div className="relative">
              <div className="w-24 h-24 bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-full flex items-center justify-center border border-black/[0.06] dark:border-white/[0.08]">
                <Icon name="user" className="w-11 h-11 text-[#6E6E73] dark:text-[#98989D]" />
              </div>
              <button
                type="button"
                onClick={() => triggerHaptic("selection")}
                aria-label="Add avatar"
                className="absolute bottom-0 right-0 w-8 h-8 bg-[#0071E3] dark:bg-[#0A84FF] text-white rounded-full border-2 border-white dark:border-[#1C1C1E] flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
              >
                <Icon name="plus" className="text-xs" />
              </button>
            </div>
          </div>

          <form onSubmit={handleComplete} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1.5">
                Name
              </label>
              <input
                type="text"
                placeholder="John Doe"
                className="ds-apple-input w-full px-4 py-3.5 rounded-2xl text-[15px] outline-none"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1.5">
                Phone Number
              </label>
              <div className="flex gap-2">
                <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.1] px-4 py-3.5 rounded-2xl font-semibold text-[15px] tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center">
                  +880
                </div>
                <input
                  type="tel"
                  placeholder="1XXXXXXXXX"
                  className="ds-apple-input flex-1 px-4 py-3.5 rounded-2xl text-[15px] tabular-nums outline-none"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1.5">
                Gender
              </label>
              <CustomDropdown
                options={[
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                  { value: "other", label: "Other" },
                ]}
                value={formData.gender}
                onChange={(val) => {
                  triggerHaptic("selection");
                  setFormData({ ...formData, gender: val });
                }}
                placeholder="Select Gender"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              onClick={() => triggerHaptic("medium")}
              className="ds-apple-btn-primary w-full min-h-[50px] px-5 mt-4 rounded-full text-[16px] font-semibold whitespace-nowrap active:scale-[0.98] transition-transform disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Saving..." : "Complete Profile"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
