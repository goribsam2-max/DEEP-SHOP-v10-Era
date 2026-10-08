import React from "react";
import { BellIcon, AlertTriangle, Sparkles, ArrowRight, ShieldAlert, CheckCircle2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";
import { Badge } from "./badge";
import { Button } from "./button";

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
      <AlertDialogContent className="max-w-md w-[92vw] sm:w-full rounded-3xl p-6 sm:p-7 border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-400/15 dark:bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-rose-400/15 dark:bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        <AlertDialogHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
                <BellIcon className="w-6 h-6 animate-bounce" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
            </div>

            <Badge
              variant="outline"
              className={`px-3 py-1 text-xs font-bold rounded-full ${
                isExpired
                  ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900"
                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900"
              }`}
            >
              {isExpired ? "মেয়াদ শেষ হয়েছে" : `মেয়াদ আর মাত্র ${daysRemaining} দিন`}
            </Badge>
          </div>

          <AlertDialogTitle className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white text-left tracking-tight">
            {isExpired
              ? "আপনার ভিআইপি সাবস্ক্রিপশন শেষ হয়ে গেছে!"
              : "সাবস্ক্রিপশনের মেয়াদ শেষ হতে চলেছে"}
          </AlertDialogTitle>

          <AlertDialogDescription className="text-sm text-zinc-600 dark:text-zinc-400 text-left leading-relaxed">
            {isExpired
              ? "আপনার সাবস্ক্রিপশন শেষ হওয়ায় '০ অগ্রিম টাকা ছাড়া ফুল ক্যাশ অন ডেলিভারি' সুবিধা বন্ধ হয়ে গেছে। আবার যেকোনো পণ্য অগ্রিম ছাড়া অর্ডার করতে এখনই প্ল্যান রিনিউ করুন।"
              : `আপনার ${planName} সাবস্ক্রিপশন খুব দ্রুত শেষ হতে চলেছে${
                  formattedExpiry ? ` (${formattedExpiry} তারিখে)` : ""
                }। মেয়াদ শেষ হলে কোনো পণ্য অর্ডার করার সময় পুনরায় অগ্রিম ডেলিভারি চার্জ বা বুকিং মানি পরিশোধ করতে হবে।`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Benefits notice card */}
        <div className="mt-4 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
          <div className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            ভিআইপি সুবিধার সারাংশ:
          </div>
          <ul className="space-y-1.5 text-zinc-600 dark:text-zinc-400 font-medium pl-1">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>১০০% ক্যাশ অন ডেলিভারি (অগ্রিম ০ টাকা)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>ফ্রি এক্সপ্রেস ও প্রায়োরিটি হোম ডেলিভারি</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>২৪/৭ ভিআইপি ডেডিকেটেড সাপোর্ট ও এক্সক্লুসিভ অফার</span>
            </li>
          </ul>
        </div>

        <AlertDialogFooter className="mt-6 flex-col-reverse sm:flex-row gap-2.5 sm:gap-2">
          <AlertDialogCancel
            onClick={onDismiss}
            className="w-full sm:w-auto rounded-full border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold"
          >
            পরে মনে করিয়ে দিন
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onRenew}
            className="w-full sm:w-auto rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold shadow-lg shadow-amber-500/25 flex items-center justify-center gap-1.5"
          >
            <span>এখনই রিনিউ করুন</span>
            <ArrowRight className="w-4 h-4" />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default BillingWarningAlertDialog;
