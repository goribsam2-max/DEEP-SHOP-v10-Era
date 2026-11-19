/**
 * Canonical route boundary & Apple Design motion physics helpers for DEEP SHOP.
 * Strictly keeps Loops, Messages, Story Studio, and Admin outside Apple Shopping styling.
 */

const EXCLUDED_EXACT_PATHS = [
  '/messages',
  '/loops',
  '/news-hub',
  '/news',
  '/scam-alert',
  '/create-reel',
  '/creator-dashboard',
  '/buy-stars',
  '/account-status',
  '/add-story',
  '/seller/add-story',
  '/admin',
];

const EXCLUDED_PREFIXES = [
  '/messages/',
  '/loops/',
  '/news-hub/',
  '/news/',
  '/scam/',
  '/create-reel/',
  '/author/',
  '/creator/',
  '/creator-dashboard/',
  '/buy-stars/',
  '/gift-stars/',
  '/sponsor/',
  '/admin/',
];

export function isExcludedFromAppleShopping(pathname: string): boolean {
  const path = (pathname || '/').toLowerCase();
  if (EXCLUDED_EXACT_PATHS.includes(path)) return true;
  if (EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;
  return false;
}

export function isAppleShoppingRoute(pathname: string): boolean {
  return !isExcludedFromAppleShopping(pathname);
}

/** Apple WWDC Fluid Interfaces critically-damped default spring (no overshoot). */
export const APPLE_SPRING_DEFAULT = {
  type: 'spring' as const,
  bounce: 0,
  duration: 0.36,
};

/** Snappy critically-damped spring for popovers, menus, and micro-controls. */
export const APPLE_SPRING_SNAPPY = {
  type: 'spring' as const,
  bounce: 0,
  duration: 0.24,
};

/** Slightly under-damped spring strictly for momentum-driven sheets / drawers / throws. */
export const APPLE_SPRING_MOMENTUM = {
  type: 'spring' as const,
  bounce: 0.14,
  duration: 0.38,
};

/** Apple Designing Fluid Interfaces exponential deceleration projection. */
export function projectMomentum(
  initialVelocityPxPerSec: number,
  decelerationRate = 0.996
): number {
  return ((initialVelocityPxPerSec / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Apple progressive boundary resistance (rubber-banding). */
export function rubberbandOffset(
  overshoot: number,
  dimension = 240,
  constant = 0.55
): number {
  if (overshoot === 0) return 0;
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
