import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";
import type { Product } from "../types";
import { preloadImageUrl } from "../components/SmoothImage";
import { fetchProductOrderStats } from "./productTags";

export const OFFLINE_PRODUCTS_KEY = "ds_offline_products_v1";
export const OFFLINE_BANNERS_KEY = "ds_home_banners_v1";
export const OFFLINE_LAST_SYNC_KEY = "ds_offline_last_sync_v1";
export const SELLER_META_CACHE_KEY = "ds_seller_meta_cache_v1";
export const HOME_SELLERS_KEY = "ds_home_sellers_v1";

export interface CachedSellerMeta {
  name: string;
  isVerified: boolean;
  storeId: string;
  displayName?: string;
  shopName?: string;
  photoURL?: string;
  username?: string;
  kycStatus?: string;
  isVerifiedBadge?: boolean;
  updatedAt?: number;
}

let memorySellerMetaCache: Record<string, CachedSellerMeta> | null = null;
let lastShopBootstrapAt = 0;
let inflightShopBootstrap: Promise<void> | null = null;

const toSlug = (name: string) =>
  String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export function preloadProductDisplayImages(products: Product[], count = 20): void {
  if (typeof window === "undefined" || !Array.isArray(products)) return;
  products.slice(0, count).forEach((p) => {
    const raw = (p as any).imageUrl || (p as any).image || (Array.isArray(p.images) && p.images[0]);
    if (typeof raw === "string" && raw.trim()) {
      preloadImageUrl(raw.trim());
    }
  });
}

export function readOfflineProducts(): Product[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      localStorage.getItem(OFFLINE_PRODUCTS_KEY) ||
      localStorage.getItem("ds_home_products_v1");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [];
    if (list.length > 0) {
      setTimeout(() => preloadProductDisplayImages(list, 16), 50);
    }
    return list;
  } catch {
    return [];
  }
}

export function writeOfflineProducts(products: Product[]): void {
  if (typeof window === "undefined" || !Array.isArray(products)) return;
  try {
    const existing = readOfflineProducts();
    const mergedMap = new Map<string, Product>();
    existing.forEach((p) => {
      if (p?.id) mergedMap.set(p.id, p);
    });
    products.forEach((p) => {
      if (p?.id) mergedMap.set(p.id, p);
    });
    const combined = Array.from(mergedMap.values()).slice(0, 160);
    localStorage.setItem(OFFLINE_PRODUCTS_KEY, JSON.stringify(combined));
    localStorage.setItem("ds_home_products_v1", JSON.stringify(combined.slice(0, 48)));
    localStorage.setItem(OFFLINE_LAST_SYNC_KEY, String(Date.now()));
    setTimeout(() => preloadProductDisplayImages(combined, 24), 100);
  } catch {}
}

export function upsertOfflineProduct(product: Product): void {
  if (!product?.id) return;
  writeOfflineProducts([product]);
}

export function findOfflineProductByIdOrSlug(
  idOrSlug?: string | null
): Product | null {
  if (!idOrSlug) return null;
  const decoded = (() => {
    try {
      return decodeURIComponent(idOrSlug);
    } catch {
      return idOrSlug;
    }
  })();
  const list = readOfflineProducts();
  return (
    list.find(
      (p) =>
        p.id === idOrSlug ||
        p.id === decoded ||
        toSlug(p.name) === idOrSlug ||
        p.name === decoded
    ) || null
  );
}

export function getOfflineLastSyncTimestamp(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(localStorage.getItem(OFFLINE_LAST_SYNC_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

export function readSellerMetaCache(): Record<string, CachedSellerMeta> {
  if (memorySellerMetaCache) return memorySellerMetaCache;
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SELLER_META_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        memorySellerMetaCache = parsed as Record<string, CachedSellerMeta>;
        return memorySellerMetaCache;
      }
    }
  } catch {}
  memorySellerMetaCache = {};
  return memorySellerMetaCache;
}

export function writeSellerMetaEntry(sellerId: string, meta: CachedSellerMeta): void {
  if (!sellerId || typeof window === "undefined") return;
  const cache = readSellerMetaCache();
  cache[sellerId] = { ...meta, updatedAt: Date.now() };
  try {
    const entries = Object.entries(cache).slice(-120);
    const trimmed = Object.fromEntries(entries);
    memorySellerMetaCache = trimmed;
    localStorage.setItem(SELLER_META_CACHE_KEY, JSON.stringify(trimmed));
  } catch {}
}

export function seedSellerMetaFromUsers(users: Array<Record<string, any>>): void {
  if (!Array.isArray(users) || users.length === 0 || typeof window === "undefined") return;
  const cache = readSellerMetaCache();
  let changed = false;
  for (const u of users) {
    const id = String(u?.uid || u?.id || "").trim();
    if (!id) continue;
    const resolvedName =
      String(u.shopName || u.storeName || u.displayName || u.name || "").trim() ||
      "Seller";
    const isVerified = Boolean(
      u.kycStatus === "verified" ||
        u.isVerifiedBadge === true ||
        u.isVerified === true ||
        u.isAdmin === true ||
        u.role === "admin" ||
        u.email === "deepshop@gmail.com" ||
        u.email === "deepshopbysam@gmail.com"
    );
    cache[id] = {
      name: resolvedName,
      isVerified,
      storeId: id,
      displayName: u.displayName || u.name || resolvedName,
      shopName: u.shopName || u.storeName || "",
      photoURL: u.photoURL || u.shopLogo || "",
      username: u.username || "",
      kycStatus: u.kycStatus || "",
      isVerifiedBadge: isVerified,
      updatedAt: Date.now(),
    };
    changed = true;
  }
  if (changed) {
    try {
      const trimmed = Object.fromEntries(Object.entries(cache).slice(-120));
      memorySellerMetaCache = trimmed;
      localStorage.setItem(SELLER_META_CACHE_KEY, JSON.stringify(trimmed));
    } catch {}
  }
}

export function readCachedHomeSellers(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      localStorage.getItem(HOME_SELLERS_KEY) ||
      sessionStorage.getItem(HOME_SELLERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCachedHomeSellers(list: any[]): void {
  if (typeof window === "undefined" || !Array.isArray(list)) return;
  try {
    const slim = list.slice(0, 30).map((s) => ({
      uid: s.uid || s.id || "",
      id: s.id || s.uid || "",
      displayName: s.displayName || "",
      shopName: s.shopName || "",
      storeName: s.storeName || "",
      photoURL: s.photoURL || "",
      kycStatus: s.kycStatus || "",
      isVerifiedBadge: Boolean(s.isVerifiedBadge),
      role: s.role || "seller",
      username: s.username || "",
    }));
    const json = JSON.stringify(slim);
    localStorage.setItem(HOME_SELLERS_KEY, json);
    sessionStorage.setItem(HOME_SELLERS_KEY, json);
    seedSellerMetaFromUsers(slim);
  } catch {}
}

export function readProductReviewsCache(productId: string): any[] {
  if (typeof window === "undefined" || !productId) return [];
  try {
    const raw = localStorage.getItem(`ds_product_reviews_v1_${productId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeProductReviewsCache(productId: string, reviews: any[]): void {
  if (typeof window === "undefined" || !productId || !Array.isArray(reviews)) return;
  try {
    localStorage.setItem(
      `ds_product_reviews_v1_${productId}`,
      JSON.stringify(reviews.slice(0, 30))
    );
  } catch {}
}

/**
 * Background bootstrap prefetcher for Shop Home, Categories & Product Details
 * so catalog, banners, sellers, and images appear in ~0s immediately.
 */
export async function prefetchShopBootstrap(force = false): Promise<void> {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (!force && now - lastShopBootstrapAt < 45_000) {
    return inflightShopBootstrap || Promise.resolve();
  }
  if (inflightShopBootstrap) return inflightShopBootstrap;
  lastShopBootstrapAt = now;

  inflightShopBootstrap = (async () => {
    try {
      const [prodsSnap, bannersSnap, sellersSnap] = await Promise.all([
        getDocs(query(collection(db, "products"), limit(48))).catch(() => null),
        getDocs(
          query(collection(db, "banners"), orderBy("createdAt", "desc"), limit(16))
        ).catch(() => null),
        getDocs(
          query(collection(db, "users"), where("role", "==", "seller"), limit(24))
        ).catch(() => null),
        fetchProductOrderStats().catch(() => null),
      ]);

      if (prodsSnap && !prodsSnap.empty) {
        const nextProducts = prodsSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Product
        );
        writeOfflineProducts(nextProducts);
      }

      if (bannersSnap && !bannersSnap.empty) {
        const nextBanners = bannersSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        try {
          localStorage.setItem(
            OFFLINE_BANNERS_KEY,
            JSON.stringify(nextBanners.slice(0, 16))
          );
        } catch {}
        nextBanners.slice(0, 5).forEach((b: any) => {
          if (typeof b?.imageUrl === "string" && b.imageUrl.trim()) {
            preloadImageUrl(b.imageUrl.trim());
          }
        });
      }

      if (sellersSnap && !sellersSnap.empty) {
        const list = sellersSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));
        writeCachedHomeSellers(list);
      }
    } catch {}
  })().finally(() => {
    inflightShopBootstrap = null;
  });

  return inflightShopBootstrap;
}
