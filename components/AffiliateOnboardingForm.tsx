"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { cn } from "../lib/utils";
import { APPLE_SPRING_DEFAULT, APPLE_SPRING_SNAPPY } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

const steps = [
  { id: "personal", title: "Personal Info" },
  { id: "social", title: "Social Reach" },
  { id: "strategy", title: "Strategy" },
  { id: "agreement", title: "Agreement" },
];

export interface AffiliateFormData {
  fullName: string;
  phone: string;
  email: string;
  platform: string;
  socialUrl: string;
  followerCount: string;
  promotionMethod: string[];
  primaryAudience: string;
  additionalInfo: string;
  agreeToTerms: boolean;
}

export const AffiliateOnboardingForm = ({
  initialData,
  onSubmit,
  isSubmitting,
}: {
  initialData: { fullName: string; phone: string; email: string };
  onSubmit: (data: AffiliateFormData) => void;
  isSubmitting: boolean;
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<AffiliateFormData>({
    fullName: initialData.fullName || "",
    phone: initialData.phone || "",
    email: initialData.email || "",
    platform: "",
    socialUrl: "",
    followerCount: "",
    promotionMethod: [],
    primaryAudience: "",
    additionalInfo: "",
    agreeToTerms: false,
  });

  const updateFormData = (field: keyof AffiliateFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleMethod = (method: string) => {
    triggerHaptic("selection");
    setFormData((prev) => {
      const methods = [...prev.promotionMethod];
      if (methods.includes(method)) {
        return { ...prev, promotionMethod: methods.filter((m) => m !== method) };
      } else {
        return { ...prev, promotionMethod: [...methods, method] };
      }
    });
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      triggerHaptic("selection");
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      triggerHaptic("selection");
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    triggerHaptic("medium");
    onSubmit(formData);
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return formData.fullName.trim() !== "" && formData.phone.trim() !== "";
      case 1:
        return formData.platform !== "" && formData.socialUrl.trim() !== "" && formData.followerCount !== "";
      case 2:
        return formData.promotionMethod.length > 0;
      case 3:
        return formData.agreeToTerms;
      default:
        return true;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-6">
      {/* Progress indicator */}
      <motion.div
        className="mb-7"
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0.16 } : APPLE_SPRING_DEFAULT}
      >
        <div className="flex justify-between mb-2">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex flex-col items-center"
            >
              <button
                type="button"
                className={cn(
                  "w-3.5 h-3.5 rounded-full cursor-pointer transition-colors",
                  index < currentStep
                    ? "bg-[#0071E3] dark:bg-[#0A84FF]"
                    : index === currentStep
                      ? "bg-[#0071E3] dark:bg-[#0A84FF] ring-4 ring-[#0071E3]/20 dark:ring-[#0A84FF]/25"
                      : "bg-black/[0.12] dark:bg-white/[0.16]",
                )}
                onClick={() => {
                  if (index <= currentStep) {
                    triggerHaptic("selection");
                    setCurrentStep(index);
                  }
                }}
              />
              <span
                className={cn(
                  "text-[11px] mt-1.5 hidden sm:block",
                  index === currentStep
                    ? "text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold"
                    : "text-[#6E6E73] dark:text-[#98989D]",
                )}
              >
                {step.title}
              </span>
            </div>
          ))}
        </div>
        <div className="w-full bg-black/[0.08] dark:bg-white/[0.1] h-1.5 rounded-full overflow-hidden mt-2">
          <motion.div
            className="h-full bg-[#0071E3] dark:bg-[#0A84FF] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
            transition={prefersReducedMotion ? { duration: 0.16 } : APPLE_SPRING_DEFAULT}
          />
        </div>
      </motion.div>

      {/* Form card */}
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0.18 } : APPLE_SPRING_DEFAULT}
      >
        <Card className="border border-black/[0.06] dark:border-white/[0.08] shadow-xs rounded-[24px] overflow-hidden bg-white dark:bg-[#1C1C1E]">
          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -18 }}
                transition={prefersReducedMotion ? { duration: 0.15 } : APPLE_SPRING_SNAPPY}
              >
                {/* Step 1: Personal Info */}
                {currentStep === 0 && (
                  <>
                    <CardHeader>
                      <CardTitle className="text-[20px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                        Tell us about yourself
                      </CardTitle>
                      <CardDescription className="text-[13px] text-[#6E6E73] dark:text-[#98989D]">
                        We need some basic info to get started.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D]">Full Name</Label>
                        <Input
                          id="fullName"
                          placeholder="John Doe"
                          value={formData.fullName}
                          onChange={(e) => updateFormData("fullName", e.target.value)}
                          className="ds-apple-input h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D]">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="01XXXXXXXXX"
                          value={formData.phone}
                          onChange={(e) => updateFormData("phone", e.target.value)}
                          className="ds-apple-input h-11 tabular-nums"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D]">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={formData.email}
                          disabled
                          className="ds-apple-input h-11 opacity-60 cursor-not-allowed"
                        />
                      </div>
                    </CardContent>
                  </>
                )}

                {/* Step 2: Social Media Reach */}
                {currentStep === 1 && (
                  <>
                    <CardHeader>
                      <CardTitle className="text-[20px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                        Your Audience
                      </CardTitle>
                      <CardDescription className="text-[13px] text-[#6E6E73] dark:text-[#98989D]">
                        Where will you be promoting our products?
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="platform" className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D]">
                          Primary Platform
                        </Label>
                        <Select
                          value={formData.platform}
                          onValueChange={(value) => {
                            triggerHaptic("selection");
                            updateFormData("platform", value);
                          }}
                        >
                          <SelectTrigger id="platform" className="ds-apple-input h-11">
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="facebook">Facebook</SelectItem>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="youtube">YouTube</SelectItem>
                            <SelectItem value="tiktok">TikTok</SelectItem>
                            <SelectItem value="website">Website / Blog</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="socialUrl" className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D]">
                          Profile / Channel / Website URL
                        </Label>
                        <Input
                          id="socialUrl"
                          placeholder={
                            formData.platform === "tiktok" ? "https://tiktok.com/@yourprofile" :
                            formData.platform === "youtube" ? "https://youtube.com/@yourchannel" :
                            formData.platform === "facebook" ? "https://facebook.com/yourpage" :
                            "https://instagram.com/yourprofile"
                          }
                          value={formData.socialUrl}
                          onChange={(e) => updateFormData("socialUrl", e.target.value)}
                          className="ds-apple-input h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="followerCount" className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D]">
                          Audience Size
                        </Label>
                        <Select
                          value={formData.followerCount}
                          onValueChange={(value) => {
                            triggerHaptic("selection");
                            updateFormData("followerCount", value);
                          }}
                        >
                          <SelectTrigger id="followerCount" className="ds-apple-input h-11">
                            <SelectValue placeholder="Select audience size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="under-1k">Under 1k</SelectItem>
                            <SelectItem value="1k-10k">1k - 10k</SelectItem>
                            <SelectItem value="10k-50k">10k - 50k</SelectItem>
                            <SelectItem value="50k-100k">50k - 100k</SelectItem>
                            <SelectItem value="100k+">100k+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </>
                )}

                {/* Step 3: Marketing Strategy */}
                {currentStep === 2 && (
                  <>
                    <CardHeader>
                      <CardTitle className="text-[20px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                        Strategy
                      </CardTitle>
                      <CardDescription className="text-[13px] text-[#6E6E73] dark:text-[#98989D]">
                        How do you plan to refer customers to our store?
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D]">
                          Select your promotion methods
                        </Label>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            "Product Reviews & Unboxings",
                            "Social Media Stories & Reels",
                            "Blog Posts & Articles",
                            "Discount / Coupon Sites",
                            "Direct Recommendations",
                          ].map((method, index) => (
                            <motion.div
                              key={method}
                              className="flex items-center space-x-3 rounded-[14px] border border-black/[0.06] dark:border-white/[0.08] bg-[#F5F5F7] dark:bg-[#2C2C2E] p-3.5 cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-colors"
                              whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
                              transition={APPLE_SPRING_SNAPPY}
                              onClick={() => toggleMethod(method)}
                            >
                              <Checkbox
                                id={`method-${index}`}
                                checked={formData.promotionMethod.includes(method)}
                                onCheckedChange={() => toggleMethod(method)}
                              />
                              <Label
                                htmlFor={`method-${index}`}
                                className="cursor-pointer w-full text-[13.5px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]"
                              >
                                {method}
                              </Label>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2 pt-2">
                        <Label htmlFor="additionalInfo" className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#98989D]">
                          Additional Strategy Details (Optional)
                        </Label>
                        <Textarea
                          id="additionalInfo"
                          placeholder="Tell us a bit more about how you plan to share your affiliate code..."
                          value={formData.additionalInfo}
                          onChange={(e) => updateFormData("additionalInfo", e.target.value)}
                          className="ds-apple-input min-h-[84px]"
                        />
                      </div>
                    </CardContent>
                  </>
                )}

                {/* Step 4: Agreement */}
                {currentStep === 3 && (
                  <>
                    <CardHeader>
                      <CardTitle className="text-[20px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                        Terms & Agreement
                      </CardTitle>
                      <CardDescription className="text-[13px] text-[#6E6E73] dark:text-[#98989D]">
                        Review our affiliate terms before joining
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E] p-5 rounded-[18px] border border-black/[0.05] dark:border-white/[0.06] text-[13px] text-[#6E6E73] dark:text-[#98989D] space-y-3">
                        <h4 className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Affiliate Program Rules:</h4>
                        <ul className="list-disc pl-5 space-y-1.5">
                          <li>You will receive a unique code to share with your audience giving them 5% OFF.</li>
                          <li>You will earn a commission per successful (delivered) order placed using your code.</li>
                          <li>Commission drops to your wallet automatically and can be withdrawn.</li>
                          <li>Any fraudulent activity or fake orders will result in an immediate ban.</li>
                        </ul>
                      </div>

                      <div className="pt-3 flex items-start space-x-3">
                        <Checkbox
                          id="terms"
                          checked={formData.agreeToTerms}
                          onCheckedChange={(checked) => {
                            triggerHaptic("selection");
                            updateFormData("agreeToTerms", checked);
                          }}
                          className="mt-1"
                        />
                        <Label
                          htmlFor="terms"
                          className="cursor-pointer text-[13px] font-medium leading-relaxed text-[#1D1D1F] dark:text-[#F5F5F7]"
                        >
                          I confirm that all the information provided is accurate and I agree to the Affiliate Terms and Conditions.
                        </Label>
                      </div>
                    </CardContent>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <CardFooter className="flex justify-between items-center gap-3 p-6 sm:px-8 border-t border-black/[0.06] dark:border-white/[0.08]">
              {currentStep > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="rounded-full px-5 whitespace-nowrap active:scale-[0.97] transition-transform"
                >
                  <ChevronLeft className="h-4 w-4 mr-1 shrink-0" />
                  <span>Back</span>
                </Button>
              ) : (
                <div />
              )}

              <Button
                type="button"
                onClick={currentStep === steps.length - 1 ? handleSubmit : nextStep}
                disabled={!isStepValid() || isSubmitting}
                className="flex items-center gap-1.5 rounded-full px-6 bg-[#0071E3] dark:bg-[#0A84FF] text-white hover:opacity-95 whitespace-nowrap active:scale-[0.97] transition-transform"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>{currentStep === steps.length - 1 ? "Submit Application" : "Continue"}</span>
                    {currentStep !== steps.length - 1 && <ChevronRight className="h-4 w-4 shrink-0" />}
                  </>
                )}
              </Button>
            </CardFooter>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
