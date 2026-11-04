import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

export const PullToRefresh: React.FC<{
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
}> = ({ children, onRefresh }) => {
  const location = useLocation();
  const isMessagesRoute = location.pathname.startsWith('/messages');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const iconWrapRef = useRef<HTMLDivElement | null>(null);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const pullingRef = useRef(false);
  const refreshingRef = useRef(false);
  const pullHeightRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const maxPull = 108;
    const triggerHeight = 64;

    const applyIndicatorTransform = (y: number, animate: boolean) => {
      const el = indicatorRef.current;
      const iconEl = iconWrapRef.current;
      if (!el) return;
      el.style.transition = animate
        ? 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease'
        : 'none';
      el.style.transform = `translate3d(0, ${y}px, 0)`;
      el.style.opacity = y > 4 ? String(Math.min(1, y / 36)) : '0';
      if (iconEl && !refreshingRef.current) {
        iconEl.style.transform = `rotate(${Math.round(y * 3.2)}deg)`;
      }
    };

    const canStartPullFromTarget = (rawTarget: EventTarget | null): boolean => {
      if ((window.scrollY || document.documentElement.scrollTop || 0) > 1) {
        return false;
      }
      const path = window.location.pathname;
      if (
        path.startsWith('/create-reel') ||
        path.startsWith('/add-story') ||
        path.startsWith('/messages')
      ) {
        return false;
      }

      let el = rawTarget as HTMLElement | null;
      while (el && el !== document.body && el !== document.documentElement) {
        if (
          el.scrollTop > 0 ||
          el.getAttribute('role') === 'dialog' ||
          el.dataset?.noPullRefresh === 'true'
        ) {
          return false;
        }
        el = el.parentElement;
      }
      return true;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current || e.touches.length !== 1) return;
      if (!canStartPullFromTarget(e.target)) {
        pullingRef.current = false;
        return;
      }
      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
      pullHeightRef.current = 0;
      pullingRef.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pullingRef.current || refreshingRef.current || e.touches.length !== 1) {
        return;
      }
      if ((window.scrollY || document.documentElement.scrollTop || 0) > 1) {
        pullingRef.current = false;
        pullHeightRef.current = 0;
        applyIndicatorTransform(0, true);
        return;
      }

      const dy = e.touches[0].clientY - startYRef.current;
      const dx = e.touches[0].clientX - startXRef.current;

      if (dy <= 0 || Math.abs(dx) > dy * 0.85) {
        if (dy < -4 || Math.abs(dx) > 18) {
          pullingRef.current = false;
          pullHeightRef.current = 0;
          applyIndicatorTransform(0, true);
        }
        return;
      }

      if (dy < 12) return;

      const damped = Math.min((dy - 12) * 0.45, maxPull);
      pullHeightRef.current = damped;
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        applyIndicatorTransform(damped, false);
      });
    };

    const handleTouchEnd = async () => {
      if (!pullingRef.current || refreshingRef.current) return;
      pullingRef.current = false;

      if (pullHeightRef.current >= triggerHeight) {
        refreshingRef.current = true;
        setIsRefreshing(true);
        if (iconWrapRef.current) {
          iconWrapRef.current.style.transform = '';
        }
        applyIndicatorTransform(58, true);

        try {
          await onRefreshRef.current();
        } finally {
          refreshingRef.current = false;
          setIsRefreshing(false);
          pullHeightRef.current = 0;
          applyIndicatorTransform(0, true);
        }
      } else if (pullHeightRef.current > 0) {
        pullHeightRef.current = 0;
        applyIndicatorTransform(0, true);
      }
    };

    // Pure passive listeners so mobile/PWA compositor scrolling never blocks on JS
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  return (
    <div
      className={
        isMessagesRoute
          ? 'relative w-full h-[100dvh] max-h-[100dvh] overflow-hidden overscroll-none'
          : 'relative w-full min-h-screen'
      }
    >
      <div
        ref={indicatorRef}
        aria-hidden="true"
        className="fixed left-0 right-0 flex justify-center items-center z-[99999] pointer-events-none opacity-0 will-change-transform"
        style={{ height: '50px', top: '-54px', transform: 'translate3d(0, 0, 0)' }}
      >
        <div className="bg-white dark:bg-zinc-800 shadow-lg border border-zinc-200/70 dark:border-zinc-700/70 rounded-full w-11 h-11 flex items-center justify-center">
          <div ref={iconWrapRef} className="flex items-center justify-center">
            <RefreshCw
              size={20}
              className={`text-[#1877F2] ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </div>
        </div>
      </div>
      <div
        className={
          isMessagesRoute
            ? 'w-full h-[100dvh] max-h-[100dvh] overflow-hidden'
            : 'w-full min-h-screen'
        }
      >
        {children}
      </div>
    </div>
  );
};

