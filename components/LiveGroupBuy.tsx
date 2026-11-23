import React, { useState, useEffect, useRef } from 'react';
import { Users, Clock, Share2 } from 'lucide-react';
import { useNotify } from './Notifications';
import { doc, getDoc, setDoc, onSnapshot, increment, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { triggerHaptic } from '../lib/haptics';

export const LiveGroupBuy = ({ product, onGroupFull }: { product: any, onGroupFull: () => void }) => {
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes
  const [joinedCount, setJoinedCount] = useState(1);
  const [hasJoined, setHasJoined] = useState(false);
  const totalNeeded = 3;
  const notify = useNotify();
  const myIdRef = useRef(Math.random().toString(36).substring(7));

  useEffect(() => {
    if (!product?.id) return;
    const docRef = doc(db, 'group_buys', product.id);
    
    const initDoc = async () => {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        await setDoc(docRef, { joined: 1, users: [] });
      }
    };
    initDoc();

    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setJoinedCount(data.joined || 1);
        if (data.users && data.users.includes(myIdRef.current)) {
          setHasJoined(true);
        }
      }
    });

    return () => unsub();
  }, [product?.id]);

  useEffect(() => {
    const storageKey = `groupbuy_joined_${product.id}`;
    if (localStorage.getItem(storageKey)) {
      setHasJoined(true);
    }
    
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('groupbuy') && !localStorage.getItem(storageKey)) {
      // Auto join if coming from link and haven't joined yet
      handleJoinClick(true);
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [product?.id]);

  useEffect(() => {
    // If we have joined and the group is full, automatically add to cart (once)
    if (hasJoined && joinedCount >= totalNeeded) {
      const addedKey = `groupbuy_added_${product.id}`;
      if (!localStorage.getItem(addedKey)) {
        localStorage.setItem(addedKey, 'true');
        onGroupFull();
      }
    }
  }, [hasJoined, joinedCount, product?.id, onGroupFull]);

  const handleJoinClick = async (fromLink = false) => {
    if (!hasJoined && joinedCount < totalNeeded) {
      setHasJoined(true);
      localStorage.setItem(`groupbuy_joined_${product.id}`, 'true');
      
      try {
        const docRef = doc(db, 'group_buys', product.id);
        await setDoc(docRef, {
          joined: increment(1),
          users: arrayUnion(myIdRef.current)
        }, { merge: true });
        
        if (fromLink) {
          notify('You joined a Group Buy from a link!', 'success');
        } else {
          notify('You joined the group buy! Waiting for others...', 'success');
        }
      } catch (err) {
        console.error("Failed to join group buy", err);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const discountAmount = product.price * 0.02; // 2% discount for group buy
  const groupPrice = product.price - discountAmount;

  const handleShare = () => {
    triggerHaptic("light");
    const url = window.location.origin + window.location.pathname + "?groupbuy=true";
    navigator.clipboard.writeText(url);
    notify("Group Buy link copied! Share with friends.", "success");
  };

  return (
    <div className="bg-white dark:bg-[#1C1C1E] rounded-[24px] border border-black/[0.08] dark:border-white/[0.1] p-5 mb-8 relative overflow-hidden shadow-[0_8px_28px_rgba(0,0,0,0.04)] dark:shadow-none">
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-[#0071E3] dark:text-[#0A84FF] font-semibold text-[11px] uppercase tracking-[0.06em] mb-1">
            Live Group Buy
          </div>
          <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-[#1D1D1F] dark:text-[#F5F5F7]">
            Buy together, save more!
          </h3>
        </div>
        <div className="bg-[#FF3B30]/10 dark:bg-[#FF453A]/15 text-[#FF3B30] dark:text-[#FF453A] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[12px] tabular-nums border border-[#FF3B30]/15 dark:border-[#FF453A]/20">
          <Clock className="w-3.5 h-3.5" /> {formatTime(timeLeft)}
        </div>
      </div>

      <div className="bg-[#F5F5F7] dark:bg-[#2C2C2E]/75 rounded-[18px] p-4 mb-4 border border-black/[0.05] dark:border-white/[0.07] relative z-10">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6] font-semibold uppercase tracking-[0.05em]">
              Group Price
            </p>
            <div className="flex items-baseline gap-2 tabular-nums mt-0.5">
              <span className="text-[24px] font-semibold tracking-[-0.03em] text-[#248A3D] dark:text-[#30D158]">
                ৳{groupPrice.toLocaleString()}
              </span>
              <span className="text-[13px] text-[#86868B] line-through font-medium">
                ৳{product.price}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold text-[#6E6E73] dark:text-[#A1A1A6] uppercase tracking-[0.06em] mb-1.5">
              Buyers needed
            </p>
            <div className="flex gap-1.5 justify-end">
              {[...Array(totalNeeded)].map((_, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold tabular-nums transition-colors ${
                    i < joinedCount
                      ? "bg-[#248A3D] dark:bg-[#30D158] text-white dark:text-black"
                      : "bg-black/[0.07] dark:bg-white/[0.1] text-[#86868B]"
                  }`}
                >
                  {i < joinedCount ? "✓" : "?"}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full bg-black/[0.08] dark:bg-white/[0.1] rounded-full h-2 mb-2 overflow-hidden">
          <div
            className="bg-[#248A3D] dark:bg-[#30D158] h-full rounded-full transition-all duration-300"
            style={{
              width: `${(Math.min(joinedCount, totalNeeded) / totalNeeded) * 100}%`,
            }}
          />
        </div>
        <p className="text-[12px] text-[#6E6E73] dark:text-[#A1A1A6] text-center font-medium tabular-nums">
          {joinedCount >= totalNeeded
            ? "Group Buy is full! Deal unlocked."
            : `Only ${totalNeeded - joinedCount} more buyer${totalNeeded - joinedCount > 1 ? "s" : ""} needed to activate deal!`}
        </p>
      </div>

      <div className="flex gap-2.5 relative z-10">
        <button
          type="button"
          onClick={handleShare}
          className="bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] px-4 py-3 rounded-full text-[13.5px] font-semibold whitespace-nowrap flex items-center justify-center gap-2 border border-black/[0.08] dark:border-white/[0.1] hover:bg-black/[0.05] dark:hover:bg-white/[0.12] active:scale-[0.97] transition-all cursor-pointer"
        >
          <Share2 className="w-4 h-4 shrink-0" />
          <span>Share</span>
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic("medium");
            handleJoinClick(false);
          }}
          disabled={hasJoined || joinedCount >= totalNeeded}
          className={`flex-1 px-5 py-3 rounded-full text-[13.5px] font-semibold whitespace-nowrap flex items-center justify-center gap-2 transition-all active:scale-[0.97] ${
            hasJoined || joinedCount >= totalNeeded
              ? "bg-black/[0.06] dark:bg-white/[0.08] text-[#86868B] cursor-not-allowed"
              : "bg-[#0071E3] hover:bg-[#0077ED] dark:bg-[#0A84FF] text-white shadow-[0_6px_18px_rgba(0,113,227,0.28)] cursor-pointer"
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>
            {joinedCount >= totalNeeded
              ? "Group Full"
              : hasJoined
              ? "Joined"
              : "Join Group Buy"}
          </span>
        </button>
      </div>
    </div>
  );
};
