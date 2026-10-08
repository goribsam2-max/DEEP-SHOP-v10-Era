"use client";

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "./button";
import { cn } from "../../lib/utils";
import Avatar from "./components-primitives-avatar";

export type Palette6 = "blue" | "purple" | "amber" | "teal" | "rose" | "slate";

export type Plan6 = {
  id: string;
  name: string;
  description: string;
  palette: Palette6;
  price: string;
  originalPrice: string;
  priceNote?: string;
  ctaLabel: string;
  ctaHref: string;
  featuredLabel?: string;
  features: string[];
  footerNote?: string;
  footerDesc?: string;
  ctaDark?: boolean;
  onSelect?: () => void;
};

const CARD_PALETTES: Record<
  Palette6,
  {
    base: string;
    blobA: string;
    blobB: string;
    avatarColor:
      | "blue"
      | "orange"
      | "red"
      | "green"
      | "purple"
      | "yellow"
      | "cyan"
      | "pink"
      | "indigo"
      | "lime"
      | "turquoise"
      | "violet";
  }
> = {
  blue: {
    base: "bg-sky-50 dark:bg-blue-950/40",
    blobA: "bg-blue-500/20 dark:bg-blue-500/20",
    blobB: "bg-sky-200/30 dark:bg-sky-600/20",
    avatarColor: "blue",
  },
  purple: {
    base: "bg-violet-50 dark:bg-violet-950/40",
    blobA: "bg-violet-500/20 dark:bg-violet-500/20",
    blobB: "bg-fuchsia-200/30 dark:bg-fuchsia-600/20",
    avatarColor: "purple",
  },
  amber: {
    base: "bg-amber-50 dark:bg-amber-950/40",
    blobA: "bg-amber-500/20 dark:bg-amber-500/20",
    blobB: "bg-yellow-200/30 dark:bg-yellow-600/20",
    avatarColor: "yellow",
  },
  teal: {
    base: "bg-teal-50 dark:bg-teal-950/40",
    blobA: "bg-teal-500/20 dark:bg-teal-500/20",
    blobB: "bg-emerald-200/30 dark:bg-emerald-600/20",
    avatarColor: "turquoise",
  },
  rose: {
    base: "bg-rose-50 dark:bg-rose-950/40",
    blobA: "bg-rose-500/20 dark:bg-rose-500/20",
    blobB: "bg-pink-200/30 dark:bg-pink-600/20",
    avatarColor: "red",
  },
  slate: {
    base: "bg-slate-100 dark:bg-slate-900/40",
    blobA: "bg-slate-400/20 dark:bg-slate-500/20",
    blobB: "bg-zinc-200/30 dark:bg-zinc-600/20",
    avatarColor: "blue",
  },
};

export const INDIVIDUALS_PLANS: Plan6[] = [
  {
    id: "3days",
    name: "৩ দিনের ভিআইপি পাস",
    description: "স্বল্পমেয়াদী ট্রায়াল প্যাক - কোনো প্রকার অগ্রিম ছাড়াই যেকোনো পণ্য ক্যাশ অন ডেলিভারিতে অর্ডার করুন।",
    palette: "blue",
    originalPrice: "৳৭,০০০",
    price: "৳৫,০০০",
    priceNote: "এককালীন ফি (৩ দিন আনলিমিটেড)",
    ctaLabel: "৩ দিনের পাস নিন",
    ctaHref: "#pay",
    features: [
      "১০০% ফুল ক্যাশ অন ডেলিভারি (অগ্রিম ০ টাকা)",
      "আনলিমিটেড প্রোডাক্ট অর্ডার ০% অ্যাডভান্স সহ",
      "ফ্রি ও দ্রুত এক্সপ্রেস হোম ডেলিভারি",
      "ভিআইপি প্রায়োরিটি হেল্পলাইন সাপোর্ট",
    ],
    footerNote: "মেয়াদ শেষে স্বয়ংক্রিয়ভাবে ফ্রি টিয়ারে ফিরবে",
    footerDesc: "কোনো হিডেন চার্জ নেই। পণ্য হাতে পেয়ে মূল্য পরিশোধ করবেন।",
  },
  {
    id: "1week",
    name: "১ সপ্তাহের ভিআইপি পাস",
    description: "১ সপ্তাহের জন্য নিশ্চিন্ত শপিং - প্রতিটি অর্ডারে ফুল ক্যাশ অন সুবিধা।",
    palette: "purple",
    originalPrice: "৳১১,০০০",
    price: "৳৮,০০০",
    priceNote: "এককালীন ফি (৭ দিন আনলিমিটেড)",
    ctaLabel: "১ সপ্তাহের পাস নিন",
    ctaHref: "#pay",
    features: [
      "১০০% ফুল ক্যাশ অন ডেলিভারি (অগ্রিম ০ টাকা)",
      "৭ দিন আনলিমিটেড সিওডি সুবিধা",
      "ফ্রি এক্সপ্রেস ডেলিভারি সারা দেশ",
      "২৪/৭ ডেডিকেটেড হেল্পলাইন সাপোর্ট",
      "অর্ডার ক্যানসেলেশন প্রোটেকশন",
    ],
    footerNote: "স্বল্পমেয়াদী মেম্বারদের জন্য আদর্শ",
    footerDesc: "সকল ক্যাটাগরির প্রোডাক্টে শতভাগ কার্যকর।",
  },
  {
    id: "30days",
    name: "১ মাসের ভিআইপি পাস",
    description: "রেগুলার ক্রেতাদের জন্য সেরা চয়েস - সম্পূর্ণ মাস জুড়ে ০ টাকা অগ্রিমে অর্ডার।",
    palette: "amber",
    originalPrice: "৳১৮,০০০",
    price: "৳১৩,০০০",
    priceNote: "এককালীন ফি (৩০ দিন আনলিমিটেড)",
    ctaLabel: "১ মাসের পাস নিন",
    ctaHref: "#pay",
    featuredLabel: "সর্বাধিক জনপ্রিয় 🔥",
    ctaDark: true,
    features: [
      "১০০% ফুল ক্যাশ অন ডেলিভারি (অগ্রিম ০ টাকা)",
      "সকল ক্যাটাগরির প্রোডাক্টে ০ অ্যাডভান্স ক্যাশ অন",
      "সুপারফাস্ট এক্সপ্রেস ডেলিভারি ফ্রি",
      "প্রোফাইলে গোল্ডেন ভিআইপি মেম্বার ব্যাজ",
      "আর্লি এক্সেস: সিক্রেট ফ্ল্যাশ সেল ও ড্রপস",
      "৭ দিন সহজ নো-কোশ্চেন এক্সচেঞ্জ পলিসি",
    ],
    footerNote: "সর্বাধিক বাছাইকৃত প্ল্যান",
    footerDesc: "সবচেয়ে বেশি সংখ্যক নিয়মিত ক্রেতা এই প্ল্যানটি ব্যবহার করেন।",
  },
];

export const TEAMS_PLANS: Plan6[] = [
  {
    id: "3months",
    name: "৩ মাসের ভিআইপি পাস",
    description: "একটানা ৯০ দিন যেকোনো প্রোডাক্ট কোনো অগ্রিম ছাড়া ডেলিভারিতে পেমেন্ট করে নিন।",
    palette: "teal",
    originalPrice: "৳২২,০০০",
    price: "৳১৫,০০০",
    priceNote: "এককালীন ফি (৯০ দিন আনলিমিটেড)",
    ctaLabel: "৩ মাসের পাস নিন",
    ctaHref: "#pay",
    features: [
      "১০০% ফুল ক্যাশ অন ডেলিভারি (অগ্রিম ০ টাকা)",
      "৯০ দিন আনলিমিটেড সিওডি সুবিধা",
      "প্রিমিয়াম ভিআইপি সেলস রিপ্রেজেন্টেটিভ",
      "ফ্রি এক্সপ্রেস ডেলিভারি সারা বাংলাদেশ",
      "এক্সক্লুসিভ ডিসকাউন্ট ও গিফট কুপন",
      "আর্লি ফ্ল্যাশ সেল নোটিফিকেশন",
    ],
    footerNote: "বেস্ট ভ্যালু প্যাক 💎",
    footerDesc: "দীর্ঘমেয়াদী ক্রেতাদের জন্য সাশ্রয়ী সমাধান।",
  },
  {
    id: "6months",
    name: "৬ মাসের ভিআইপি পাস",
    description: "অর্ধবার্ষিক প্রিমিয়াম মেম্বারশিপ - সকল পণ্যে ফুল ক্যাশ অন ও সর্বোচ্চ সুবিধা।",
    palette: "rose",
    originalPrice: "৳৩০,০০০",
    price: "৳২০,০০০",
    priceNote: "এককালীন ফি (১৮০ দিন আনলিমিটেড)",
    ctaLabel: "৬ মাসের পাস নিন",
    ctaHref: "#pay",
    featuredLabel: "মেগা সেভিংস ⚡",
    features: [
      "১০০% ফুল ক্যাশ অন ডেলিভারি (অগ্রিম ০ টাকা)",
      "আনলিমিটেড ফ্রি ডেলিভারি (সারা দেশে)",
      "পার্সোনাল ভিআইপি অ্যাকাউন্ট ম্যানেজার",
      "সিক্রেট ড্রপস ও প্রি-অর্ডার প্রায়োরিটি",
      "ফ্রি গিফট ও সারপ্রাইজ ভাউচার",
      "কোনো সিকিউরিটি ডিপোজিট ছাড়া অর্ডার",
    ],
    footerNote: "অর্ধবার্ষিক মেগা সেভিংস",
    footerDesc: "পুরো ৬ মাস যেকোনো পণ্যে ০ টাকা অগ্রিমে নিশ্চিন্ত অর্ডার।",
  },
  {
    id: "1year",
    name: "১ বছরের আল্ট্রা পাস",
    description: "পুরো ১ বছর কোনো চিন্তা নেই! যত ইচ্ছা তত অর্ডার করুন সম্পূর্ণ ক্যাশ অন ডেলিভারিতে।",
    palette: "slate",
    originalPrice: "৳৪৫,০০০",
    price: "৳৩০,০০০",
    priceNote: "এককালীন ফি (৩৬৫ দিন আনলিমিটেড)",
    ctaLabel: "১ বছরের আল্ট্রা পাস নিন",
    ctaHref: "#pay",
    ctaDark: true,
    featuredLabel: "আল্টিমেট ভিআইপি 👑",
    features: [
      "১০০% ফুল ক্যাশ অন ডেলিভারি (অগ্রিম ০ টাকা)",
      "৩৬৫ দিন আনলিমিটেড ফ্রি এক্সপ্রেস ডেলিভারি",
      "প্রোফাইল ও অর্ডারে এলিট গোল্ডেন ক্রাউন ব্যাজ",
      "সর্বোচ্চ প্রায়োরিটি ডেলিভারি ও প্যাকেজিং",
      "২৪/৭ ডিরেক্ট ভিআইপি কল সাপোর্ট",
      "সারাবছর সব অফারে ভিআইপি আর্লি এক্সেস",
    ],
    footerNote: "আল্টিমেট ভিআইপি এক্সপেরিয়েন্স",
    footerDesc: "সর্বোচ্চ সেভিংস ও ভিআইপি প্রিভিলেজ একসাথে।",
  },
];

type TabKey = "individuals" | "teams";

function PlanCard({
  plan,
  onSelectPlan,
}: {
  plan: Plan6;
  onSelectPlan?: (plan: Plan6) => void;
}) {
  const pal = CARD_PALETTES[plan.palette];

  return (
    <div className="flex flex-col rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-1.5 shadow-sm transition-all hover:shadow-md">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-black/5 dark:border-white/10 p-5",
          pal.base,
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute -top-12 -right-12 size-48 rounded-full opacity-40 blur-3xl",
            pal.blobA,
          )}
        />
        <div
          className={cn(
            "pointer-events-none absolute top-1/3 -left-8 size-48 rounded-full opacity-20 blur-3xl",
            pal.blobB,
          )}
        />

        <div className="relative z-10 flex flex-col gap-3.5">
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Avatar shape="squircle" size="sm" color={pal.avatarColor} />
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
                {plan.name}
              </h3>
            </div>
            {plan.featuredLabel && (
              <span className="rounded-full bg-black/10 dark:bg-white/15 px-2.5 py-0.5 text-[11px] font-bold text-zinc-800 dark:text-zinc-200 backdrop-blur-sm whitespace-nowrap shrink-0">
                {plan.featuredLabel}
              </span>
            )}
          </div>

          <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
            {plan.description}
          </p>

          <div className="space-y-0.5 pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
                {plan.price}
              </span>
              <span className="text-sm text-zinc-400 line-through">
                {plan.originalPrice}
              </span>
            </div>
            {plan.priceNote && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate">
                {plan.priceNote}
              </p>
            )}
          </div>

          <Button
            onClick={() => onSelectPlan && onSelectPlan(plan)}
            className={cn(
              "w-full rounded-full font-bold text-xs sm:text-sm py-2.5 transition-all shadow-sm",
              plan.ctaDark
                ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                : "bg-white/90 text-zinc-900 border border-zinc-200/80 hover:bg-white dark:bg-white/15 dark:text-white dark:border-white/10 dark:hover:bg-white/25",
            )}
          >
            {plan.ctaLabel}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-2 pt-4 pb-2">
        <ul className="space-y-2">
          {plan.features.map((f) => (
            <li
              key={f}
              className="flex items-center gap-2 text-xs sm:text-[13px] text-zinc-700 dark:text-zinc-300"
            >
              <HugeiconsIcon
                icon={Tick02Icon}
                className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                strokeWidth={2.5}
              />
              <span className="truncate">{f}</span>
            </li>
          ))}
        </ul>

        {(plan.footerNote || plan.footerDesc) && (
          <div className="space-y-0.5 border-t border-zinc-100 dark:border-zinc-800 pt-3">
            {plan.footerNote && (
              <p className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate">
                {plan.footerNote}
              </p>
            )}
            {plan.footerDesc && (
              <p className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                {plan.footerDesc}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Pricing6({
  individualPlans = INDIVIDUALS_PLANS,
  teamsPlans = TEAMS_PLANS,
  individualsLabel = "স্বল্পমেয়াদী (৩ দিন - ১ মাস)",
  teamsLabel = "দীর্ঘমেয়াদী (৩ মাস - ১ বছর)",
  defaultTab = "individuals",
  title = "ভিআইপি সাবস্ক্রিপশন প্ল্যানসমূহ",
  subtitle = "কোনো হিডেন ফি নেই। আপনার পছন্দের সময়কাল অনুযায়ী নির্বাচন করুন।",
  onSelectPlan,
}: {
  individualPlans?: Plan6[];
  teamsPlans?: Plan6[];
  individualsLabel?: string;
  teamsLabel?: string;
  defaultTab?: TabKey;
  title?: string;
  subtitle?: string;
  onSelectPlan?: (plan: Plan6) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);

  const plans = activeTab === "individuals" ? individualPlans : teamsPlans;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 truncate">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 p-1 shrink-0 self-start sm:self-auto">
          {(
            [
              ["individuals", individualsLabel],
              ["teams", teamsLabel],
            ] as [TabKey, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={cn(
                "rounded-full px-3 sm:px-4 py-1 text-xs font-bold transition-all duration-200 whitespace-nowrap",
                activeTab === key
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onSelectPlan={onSelectPlan}
          />
        ))}
      </div>
    </div>
  );
}
