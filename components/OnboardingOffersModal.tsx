import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { motion, useReducedMotion } from "framer-motion";
import { db } from "../firebase";
import { OnboardingOffer } from "../types";
import { ArrowRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { APPLE_SPRING_DEFAULT } from "../lib/shoppingRoute";
import { triggerHaptic } from "../lib/haptics";

export default function OnboardingOffersModal() {
  const [offers, setOffers] = useState<OnboardingOffer[]>([]);
  const [show, setShow] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    const sessionSkipped = sessionStorage.getItem("onboarding_skipped");
    const localSkippedTime = localStorage.getItem("onboarding_skipped_time");

    if (sessionSkipped === "1") {
      return;
    }

    if (localSkippedTime) {
      const timePassed = Date.now() - parseInt(localSkippedTime, 10);
      if (timePassed < 24 * 60 * 60 * 1000) {
        return;
      }
    }

    const q = query(collection(db, "onboardingOffers"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: OnboardingOffer[] = [];
      snapshot.forEach((doc) => {
        const item = { id: doc.id, ...doc.data() } as OnboardingOffer;
        if (item.active) data.push(item);
      });
      if (data.length > 0) {
        setOffers(data);
        setShow(true);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (show) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [show]);

  const handleSkip = () => {
    triggerHaptic("light");
    setShow(false);
    sessionStorage.setItem("onboarding_skipped", "1");
    localStorage.setItem("onboarding_skipped_time", Date.now().toString());
  };

  const handleNext = () => {
    triggerHaptic("light");
    if (emblaApi) {
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext();
      } else {
        handleSkip();
      }
    }
  };

  if (!show || offers.length === 0) return null;

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={prefersReducedMotion ? { duration: 0.16 } : APPLE_SPRING_DEFAULT}
      className="fixed inset-0 z-[99999] bg-black"
    >
      <div className="relative w-full h-full overflow-hidden" ref={emblaRef}>
        <div className="flex w-full h-full">
          {offers.map((offer) => (
            <div key={offer.id} className="relative flex-[0_0_100%] w-full h-full">
              {offer.imageUrl?.trim() ? (
                <img
                  src={offer.imageUrl.trim()}
                  alt="Offer"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#1C1C1E] via-[#111113] to-black" />
              )}
              <div className="absolute inset-0 bg-black/35" />

              <div className="relative z-10 w-full h-full flex flex-col p-6 pt-16 sm:pt-20 max-w-6xl mx-auto">
                <div className="flex justify-end mb-4">
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="flex items-center bg-white/18 hover:bg-white/28 backdrop-blur-xl border border-white/25 transition-all active:scale-[0.96] rounded-full px-5 py-2 text-white text-[14px] font-semibold tracking-[-0.01em] shadow-sm cursor-pointer"
                  >
                    Skip <ArrowRight className="ml-1.5 w-4 h-4" />
                  </button>
                </div>

                <div className="mt-8 md:mt-24 max-w-2xl">
                  <h1 className="text-4xl sm:text-5xl md:text-6xl text-white font-bold leading-[1.06] tracking-[-0.03em] drop-shadow-md">
                    {offer.title1} <br />
                    {offer.title2}{" "}
                    <span className="relative inline-block whitespace-nowrap">
                      {offer.highlightedWord}
                      <svg
                        className="absolute -bottom-3 left-0 w-full h-4 text-[#0A84FF]"
                        viewBox="0 0 200 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        preserveAspectRatio="none"
                      >
                        <path
                          d="M2 15C40 5 120 -5 198 12"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </h1>
                  <p className="text-white/90 mt-6 text-[17px] leading-[1.45] max-w-md drop-shadow-sm font-medium">
                    {offer.description}
                  </p>
                </div>

                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 14, rotate: -6 }}
                  animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, rotate: -6 }}
                  transition={APPLE_SPRING_DEFAULT}
                  className="absolute bottom-32 right-8 md:right-32 md:bottom-32 bg-white/18 backdrop-blur-2xl border border-white/30 shadow-[0_20px_50px_rgba(0,0,0,0.32)] rounded-[26px] px-7 py-5 text-center text-white"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/85">
                    {offer.glassTitle}
                  </div>
                  <div className="text-3xl font-bold tracking-[-0.03em] mt-1 tabular-nums">
                    {offer.glassDiscount}
                  </div>
                </motion.div>

                <div className="absolute bottom-10 sm:bottom-12 right-6 z-20">
                  <button
                    type="button"
                    onClick={handleNext}
                    className="bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full px-7 py-3.5 text-[15px] font-semibold tracking-[-0.01em] shadow-[0_10px_28px_rgba(0,113,227,0.38)] flex items-center gap-2 active:scale-[0.96] transition-all cursor-pointer"
                  >
                    {selectedIndex < offers.length - 1 ? "Next" : "Get Started"}{" "}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {offers.length > 1 && (
          <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-2 z-20 pointer-events-none">
            {offers.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  selectedIndex === i ? "bg-white w-6" : "bg-white/40 w-2"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-[8]" />
    </motion.div>
  );
}
