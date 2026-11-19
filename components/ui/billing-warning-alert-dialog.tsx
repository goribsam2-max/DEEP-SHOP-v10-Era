import React from "react";
import { BellIcon, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";
import { triggerHaptic } from "../../lib/haptics";

export interface BillingWarningAlertDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  planName?: string;
  daysRemaining?: number;
  expiryDate?: string | number | Date;
  isExpired?: boolean;
  onRenew?: () => void;
  onDismiss?: () => void;
}

export function BillingWarningAlertDialog({
  open,
  onOpenChange,
  trigger,
  planName = "VIP Club Pass",
  daysRemaining = 2,
  expiryDate,
  isExpired = false,
  onRenew,
  onDismiss,
}: BillingWarningAlertDialogProps) {
  const formattedExpiry = expiryDate
    ? new Date(expiryDate).toLocaleDateString("bn-BD", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent className="max-w-md w-[92vw] sm:w-full p-6 sm:p-7 overflow-hidden">
        <AlertDialogHeader className="space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/12 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <BellIcon className="w-5 h-5" />
            </div>

            <span
              className={`px-3 py-1 text-[11px] font-bold rounded-full border ${
                isExpired
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
              }`}
            >
              {isExpired ? "মেয়াদ শেষ হয়েছে" : `মেয়াদ আর মাত্র ${daysRemaining} দিন`}
            </span>
          </div>

          <AlertDialogTitle className="text-[20px] sm:text-[22px]">
            {isExpired
              ? "আপনার ভিআইপি সাবস্ক্রিপশন শেষ হয়ে গেছে"
              : "সাবস্ক্রিপশনের মেয়াদ শেষ হতে চলেছে"}
          </AlertDialogTitle>

          <AlertDialogDescription>
            {isExpired
              ? "আপনার সাবস্ক্রিপশন শেষ হওয়ায় '০ অগ্রিম টাকা ছাড়া ফুল ক্যাশ অন ডেলিভারি' সুবিধা বন্ধ হয়ে গেছে। আবার যেকোনো পণ্য অগ্রিম ছাড়া অর্ডার করতে এখনই প্ল্যান রিনিউ করুন।"
              : `আপনার ${planName} সাবস্ক্রিপশন খুব দ্রুত শেষ হতে চলেছে${
                  formattedExpiry ? ` (${formattedExpiry} তারিখে)` : ""
                }। মেয়াদ শেষ হলে কোনো পণ্য অর্ডার করার সময় পুনরায় অগ্রিম ডেলিভারি চার্জ বা বুকিং মানি পরিশোধ করতে হবে।`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="mt-2 p-3.5 rounded-2xl bg-[#f5f5f7] dark:bg-[#2c2c2e] border border-black/[0.06] dark:border-white/[0.08] space-y-2 text-xs">
          <div className="font-bold text-[#1d1d1f] dark:text-[#f5f5f7] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#0A84FF]" />
            ভিআইপি সুবিধার সারাংশ:
          </div>
          <ul className="space-y-1.5 text-[#6e6e73] dark:text-[#98989d] font-medium pl-0.5">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#248A3D] dark:text-[#30D158] shrink-0" />
              <span>১০০% ক্যাশ অন ডেলিভারি (অগ্রিম ০ টাকা)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#248A3D] dark:text-[#30D158] shrink-0" />
              <span>ফ্রি এক্সপ্রেস ও প্রায়োরিটি হোম ডেলিভারি</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#248A3D] dark:text-[#30D158] shrink-0" />
              <span>২৪/৭ ভিআইপি ডেডিকেটেড সাপোর্ট ও এক্সক্লুসিভ অফার</span>
            </li>
          </ul>
        </div>

        <AlertDialogFooter className="mt-3 sm:flex-row-reverse gap-2.5">
          <AlertDialogAction
            onPointerDown={() => triggerHaptic("light")}
            onClick={onRenew}
            className="gap-1.5"
          >
            <span>এখনই রিনিউ করুন</span>
            <ArrowRight className="w-4 h-4" />
          </AlertDialogAction>
          <AlertDialogCancel
            onPointerDown={() => triggerHaptic("light")}
            onClick={onDismiss}
          >
            পরে মনে করিয়ে দিন
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default BillingWarningAlertDialog;
