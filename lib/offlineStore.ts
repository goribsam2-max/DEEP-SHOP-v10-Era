import type { Product } from "../types";

export const OFFLINE_PRODUCTS_KEY = "ds_offline_products_v1";
export const OFFLINE_BANNERS_KEY = "ds_home_banners_v1";
export const OFFLINE_LAST_SYNC_KEY = "ds_offline_last_sync_v1";

const toSlug = (name: string) =>
  String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export function readOfflineProducts(): Product[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      localStorage.getItem(OFFLINE_PRODUCTS_KEY) ||
      localStorage.getItem("ds_home_products_v1");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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
