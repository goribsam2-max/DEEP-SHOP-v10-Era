"use client";

import { ChevronLeft, ChevronRight, Heart, Star, User } from "lucide-react";
import { Link } from "react-router-dom";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

export interface ExperienceItem {
  id: string;
  title: string;
  image: string;
  location?: string;
  sellerName?: string;
  price: number;
  currency?: string;
  rating?: number;
  reviewCount?: number;
  badge?: string;
  date?: string;
  link?: string;
}

export interface ExperienceGridProps {
  title: string;
  items: ExperienceItem[];
  viewAllHref?: string;
}

const sampleExperiences: ExperienceItem[] = [
  {
    id: "1",
    title: "iPhone 15 Pro Max 256GB Natural Titanium",
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=600&q=80",
    sellerName: "DEEP SHOP Verified",
    price: 135000,
    rating: 4.97,
    reviewCount: 128,
    badge: "Official Stock",
    date: "100% Guaranteed",
  },
  {
    id: "2",
    title: "Apple Watch Ultra 2 Titanium GPS + Cellular",
    image: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=600&q=80",
    sellerName: "Gadget World BD",
    price: 84000,
    rating: 4.92,
    reviewCount: 86,
    badge: "Border Offer",
    date: "Full Advance",
  },
  {
    id: "3",
    title: "AirPods Pro (2nd Generation) Type-C MagSafe",
    image: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=600&q=80",
    sellerName: "Apple Empire Dhaka",
    price: 24500,
    rating: 4.98,
    reviewCount: 254,
    badge: "Hot Deal",
    date: "In Stock",
  },
  {
    id: "4",
    title: "MacBook Air M3 Chip 8-Core CPU 13.6-Inch",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80",
    sellerName: "Pro Tech Bangladesh",
    price: 122000,
    rating: 4.97,
    reviewCount: 112,
    badge: "Original",
  },
  {
    id: "5",
    title: "Samsung Galaxy S24 Ultra 5G AI Smartphone",
    image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=600&q=80",
    sellerName: "Sam Store Official",
    price: 128000,
    rating: 4.90,
    reviewCount: 78,
    badge: "Special Offer",
  },
];

export const ExperienceCard = ({ experience }: { experience: ExperienceItem }) => (
  <Card className="group relative flex w-full flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs transition-all duration-300 hover:shadow-lg">
    {/* Image area */}
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl sm:rounded-t-2xl bg-zinc-100 dark:bg-zinc-800">
      <img
        alt={experience.title}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        src={experience.image}
      />

      {/* Ultra Small Single-Line Pill Shape Tag Badge on Top Left */}
      <div className="absolute top-1.5 left-1.5 z-20 max-w-[75%]">
        <span className="inline-block whitespace-nowrap truncate max-w-full rounded-full bg-black/75 backdrop-blur-md text-white px-2 py-0.5 text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider shadow-xs border border-white/10">
          {experience.badge || "VERIFIED"}
        </span>
      </div>

      {/* Wishlist Heart Button on Top Right */}
      <Button
        className="absolute top-1.5 right-1.5 z-20 rounded-full bg-white/80 dark:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300 backdrop-blur-md hover:bg-white dark:hover:bg-zinc-800 transition-colors shadow-xs p-1.5 h-7 w-7 sm:h-8 sm:w-8"
        size="icon"
        variant="ghost"
        type="button"
      >
        <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2px] text-emerald-600 dark:text-emerald-400" />
        <span className="sr-only">Add to favorites</span>
      </Button>
    </div>

    {/* Content area - Dynamic compact flow without empty gap */}
    <div className="flex flex-col p-2 sm:p-2.5 gap-1">
      <CardContent className="p-0 space-y-0.5">
        {/* Title */}
        <h3 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug line-clamp-1">
          {experience.title}
        </h3>
        
        {/* Short Description snippet */}
        <p className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 leading-tight font-normal">
          {experience.date || "Official verified product with fast delivery"}
        </p>

        {/* Seller Shop Name with Profile Icon (User) */}
        <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 pt-0.5">
          <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-medium truncate">
            {experience.sellerName || experience.location || "DEEP SHOP"}
          </span>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-1 p-0 pt-1.5 border-t border-zinc-100 dark:border-zinc-800 w-full overflow-hidden mt-0.5">
        {/* Rating and Review Count */}
        <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-zinc-800 dark:text-zinc-200 whitespace-nowrap shrink-0">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
          <span>{experience.rating || 4.9}</span>
          <span className="text-zinc-400 font-normal text-[9px] sm:text-[10px]">
            ({experience.reviewCount || 86})
          </span>
        </div>

        {/* Highlighted Price Tag in Pill Shape */}
        <div className="shrink-0 min-w-max ml-auto px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white font-black text-xs sm:text-sm tracking-tight shadow-xs flex items-center justify-center whitespace-nowrap">
          {formatPrice(experience.price)}
        </div>
      </CardFooter>
    </div>
  </Card>
);

export const ExperienceSection = ({
  title,
  items,
  viewAllHref = "#",
}: ExperienceGridProps) => {
  const scrollContainer = React.useRef<HTMLDivElement>(null);

  const handleScrollLeft = () => {
    if (scrollContainer.current) {
      scrollContainer.current.scrollBy({
        left: -320,
        behavior: "smooth",
      });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainer.current) {
      scrollContainer.current.scrollBy({ left: 320, behavior: "smooth" });
    }
  };

  return (
    <div className="w-full py-4">
      <div className="mx-auto max-w-[1760px] px-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-lg tracking-tight md:text-xl text-zinc-900 dark:text-zinc-100">
            {title}
          </h2>
          <div className="flex items-center gap-1.5">
            <Button
              className="h-8 w-8 rounded-full border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={handleScrollLeft}
              size="icon"
              variant="outline"
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Scroll left</span>
            </Button>
            <Button
              className="h-8 w-8 rounded-full border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={handleScrollRight}
              size="icon"
              variant="outline"
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Scroll right</span>
            </Button>
            <Link
              className="ml-2 hidden font-bold text-xs text-emerald-600 dark:text-emerald-400 hover:underline md:block"
              to={viewAllHref}
            >
              Show all →
            </Link>
          </div>
        </div>

        <div
          className="scrollbar-hide -mx-1 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-1 pb-2"
          ref={scrollContainer}
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {items.map((item) => (
            <div
              className="w-[240px] flex-none snap-start md:w-[260px]"
              key={item.id}
            >
              <Link
                className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                to={item.link || `/product/${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${item.id}`}
              >
                <ExperienceCard experience={item} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function CarouselCards() {
  return (
    <div className="mt-4 w-full space-y-4">
      <ExperienceSection
        items={sampleExperiences}
        title="Featured Verified Products"
        viewAllHref="/all-products"
      />
    </div>
  );
}
