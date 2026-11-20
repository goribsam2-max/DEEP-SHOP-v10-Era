import React, { useCallback, useRef } from "react";

export interface UseSwipeNavigationOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onEdgeSwipeRight?: () => void;
  threshold?: number;
  maxVerticalRatio?: number;
  edgeThreshold?: number;
  edgeMinDistance?: number;
  disabled?: boolean;
}

interface SwipeSession {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  startedAt: number;
  isEdgeLeft: boolean;
  lockedAxis: "x" | "y" | null;
}

const INTERACTIVE_TAGS = new Set([
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "OPTION",
  "VIDEO",
  "AUDIO",
]);

/**
 * Returns true if the touch originated inside a horizontal scroll strip, slider,
 * form control, or an element explicitly marked with `data-no-swipe="true"`.
 */
export function shouldIgnoreSwipeTarget(
  target: EventTarget | null,
  boundary: HTMLElement | null
): boolean {
  let node = target instanceof HTMLElement ? target : null;
  while (node && node !== boundary) {
    if (
      node.dataset.noSwipe === "true" ||
      node.getAttribute("role") === "slider" ||
      node.isContentEditable ||
      INTERACTIVE_TAGS.has(node.tagName)
    ) {
      return true;
    }

    if (node.scrollWidth > node.clientWidth + 4) {
      const style = window.getComputedStyle(node);
      if (style.overflowX === "auto" || style.overflowX === "scroll") {
        return true;
      }
    }

    node = node.parentElement;
  }

  return false;
}

export function useSwipeNavigation({
  onSwipeLeft,
  onSwipeRight,
  onEdgeSwipeRight,
  threshold = 60,
  maxVerticalRatio = 0.72,
  edgeThreshold = 32,
  edgeMinDistance = 52,
  disabled = false,
}: UseSwipeNavigationOptions) {
  const sessionRef = useRef<SwipeSession | null>(null);

  const onTouchStart = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (disabled || e.touches.length !== 1) {
        sessionRef.current = null;
        return;
      }

      if (shouldIgnoreSwipeTarget(e.target, e.currentTarget)) {
        sessionRef.current = null;
        return;
      }

      const t = e.touches[0];
      sessionRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        lastX: t.clientX,
        lastY: t.clientY,
        startedAt: Date.now(),
        isEdgeLeft: t.clientX <= edgeThreshold,
        lockedAxis: null,
      };
    },
    [disabled, edgeThreshold]
  );

  const onTouchMove = useCallback((e: React.TouchEvent<HTMLElement>) => {
    const s = sessionRef.current;
    if (!s) return;

    if (e.touches.length !== 1) {
      sessionRef.current = null;
      return;
    }

    const t = e.touches[0];
    s.lastX = t.clientX;
    s.lastY = t.clientY;

    if (!s.lockedAxis) {
      const absX = Math.abs(t.clientX - s.startX);
      const absY = Math.abs(t.clientY - s.startY);
      if (absY > 14 && absY > absX * 1.1) {
        s.lockedAxis = "y";
        sessionRef.current = null;
      } else if (absX > 14 && absX > absY * 1.25) {
        s.lockedAxis = "x";
      }
    }
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      const s = sessionRef.current;
      sessionRef.current = null;
      if (!s || disabled || s.lockedAxis === "y") return;

      const touch = e.changedTouches[0];
      const endX = touch ? touch.clientX : s.lastX;
      const endY = touch ? touch.clientY : s.lastY;
      const dx = endX - s.startX;
      const dy = endY - s.startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const elapsedMs = Math.max(1, Date.now() - s.startedAt);
      const velocityX = absX / elapsedMs;

      // Reject predominantly vertical drags or overly slow drags
      if (absY > absX * maxVerticalRatio || elapsedMs > 750) {
        return;
      }

      if (s.isEdgeLeft && dx > 0 && (dx >= edgeMinDistance || (dx >= 36 && velocityX > 0.45))) {
        if (onEdgeSwipeRight) {
          onEdgeSwipeRight();
          return;
        }
      }

      const effectiveThreshold = velocityX > 0.5 ? Math.max(40, threshold * 0.72) : threshold;
      if (absX < effectiveThreshold) return;

      if (dx < 0) {
        onSwipeLeft?.();
      } else {
        onSwipeRight?.();
      }
    },
    [
      disabled,
      edgeMinDistance,
      maxVerticalRatio,
      onEdgeSwipeRight,
      onSwipeLeft,
      onSwipeRight,
      threshold,
    ]
  );

  const onTouchCancel = useCallback(() => {
    sessionRef.current = null;
  }, []);

  return {
    swipeHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel,
    },
  };
}
