import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { Product } from "../types";

export type ProductAutoTagId = "best_seller" | "new_arrival" | "low_stock";

export interface ProductAutoTag {
  id: ProductAutoTagId;
  label: string;
  shortLabel: string;
  priority: number;
}

export interface ProductOrderStats {
  salesByProductId: Record<string, number>;
  orderCount: number;
  updatedAt: number;
}

const STORAGE_KEY = "ds_order_product_stats_v1";
const STATS_TTL_MS = 3 * 60 * 1000;
const NEW_ARRIVAL_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const LOW_STOCK_MAX = 5;

let memoryStats: ProductOrderStats = readCachedOrderStats();
let inflightFetch: Promise<ProductOrderStats> | null = null;
const listeners = new Set<(stats: ProductOrderStats) => void>();

function readCachedOrderStats(): ProductOrderStats {
  if (typeof window === "undefined") {
    return { salesByProductId: {}, orderCount: 0, updatedAt: 0 };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { salesByProductId: {}, orderCount: 0, updatedAt: 0 };
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.salesByProductId &&
      typeof parsed.salesByProductId === "object"
    ) {
      return {
        salesByProductId: parsed.salesByProductId as Record<string, number>,
        orderCount: Number(parsed.orderCount) || 0,
        updatedAt: Number(parsed.updatedAt) || 0,
      };
    }
  } catch {}
  return { salesByProductId: {}, orderCount: 0, updatedAt: 0 };
}

function persistAndNotify(next: ProductOrderStats) {
  memoryStats = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }
  listeners.forEach((cb) => cb(next));
}

export async function fetchProductOrderStats(
  force = false
): Promise<ProductOrderStats> {
  const now = Date.now();
  if (!force && memoryStats.updatedAt > 0 && now - memoryStats.updatedAt < STATS_TTL_MS) {
    return memoryStats;
  }

  if (inflightFetch) return inflightFetch;

  inflightFetch = (async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return memoryStats;
      }

      // 1. Try lightweight server-aggregated endpoint first
      try {
        const res = await fetch("/api/products/order-stats");
        if (res.ok) {
          const json: any = await res.json();
          if (json && json.source !== "client_fallback" && json.salesByProductId) {
            const resolved: ProductOrderStats = {
              salesByProductId: json.salesByProductId,
              orderCount: Number(json.orderCount) || 0,
              updatedAt: Number(json.updatedAt) || Date.now(),
            };
            persistAndNotify(resolved);
            return resolved;
          }
        }
      } catch {}

      // 2. Client Firestore aggregation fallback (recent historical orders, zero PII stored)
      try {
        const snap = await getDocs(
          query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(150))
        );
        const salesByProductId: Record<string, number> = {};
        let orderCount = 0;

        snap.forEach((docSnap) => {
          const data = docSnap.data() as any;
          const status = String(data?.status || "").trim().toLowerCase();
          if (status === "cancelled" || status === "returned") return;
          orderCount += 1;
          const items = Array.isArray(data?.items) ? data.items : [];
          for (const item of items) {
            const pid = String(item?.productId || item?.id || "").trim();
            if (!pid) continue;
            const qty = Math.max(1, Math.min(99, Number(item?.quantity) || 1));
            salesByProductId[pid] = (salesByProductId[pid] || 0) + qty;
          }
        });

        const resolved: ProductOrderStats = {
          salesByProductId,
          orderCount,
          updatedAt: Date.now(),
        };
        persistAndNotify(resolved);
        return resolved;
      } catch {
        return memoryStats;
      }
    } finally {
      inflightFetch = null;
    }
  })();

  return inflightFetch;
}

export function useProductOrderStats(): ProductOrderStats {
  const [stats, setStats] = useState<ProductOrderStats>(() => memoryStats);

  useEffect(() => {
    const onUpdate = (next: ProductOrderStats) => setStats(next);
    listeners.add(onUpdate);
    void fetchProductOrderStats();
    return () => {
      listeners.delete(onUpdate);
    };
  }, []);

  return stats;
}

export function toProductTimestampMs(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return raw < 1e12 ? raw * 1000 : raw;
  }
  if (typeof raw === "string") {
    const num = Number(raw);
    if (Number.isFinite(num) && num > 0) {
      return num < 1e12 ? num * 1000 : num;
    }
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof raw === "object") {
    const obj = raw as { toMillis?: () => number; seconds?: number };
    if (typeof obj.toMillis === "function") {
      try {
        const ms = obj.toMillis();
        return Number.isFinite(ms) ? ms : null;
      } catch {}
    }
    if (typeof obj.seconds === "number" && Number.isFinite(obj.seconds)) {
      return obj.seconds * 1000;
    }
  }
  return null;
}

export function getCombinedProductSales(
  product: Product,
  salesByProductId?: Record<string, number>
): number {
  const metadataSales = Math.max(0, Number(product.salesCount) || 0);
  const historicalSales = Math.max(
    0,
    Number(salesByProductId?.[product.id] || 0)
  );
  return Math.max(metadataSales, historicalSales);
}

export function computeBestSellerCutoff(
  products: Product[],
  salesByProductId?: Record<string, number>
): number {
  const nonZeroCounts = products
    .map((p) => getCombinedProductSales(p, salesByProductId))
    .filter((count) => count > 0)
    .sort((a, b) => b - a);

  if (nonZeroCounts.length === 0) return 3;
  // Top ~25% of products that have historical sales, minimum floor of 2 units
  const topIndex = Math.max(0, Math.floor(nonZeroCounts.length * 0.25) - 1);
  return Math.max(2, Math.min(nonZeroCounts[topIndex] || 2, 10));
}

export function computeProductTags(
  product: Product,
  salesByProductId?: Record<string, number>,
  bestSellerCutoff = 3,
  nowMs = Date.now()
): ProductAutoTag[] {
  const isOutOfStock = Boolean(product.isSold || product.stock === 0);
  if (isOutOfStock) return [];

  const tags: ProductAutoTag[] = [];
  const totalSold = getCombinedProductSales(product, salesByProductId);

  if (totalSold >= Math.max(2, bestSellerCutoff)) {
    tags.push({
      id: "best_seller",
      label: "Best Seller",
      shortLabel: "Best Seller",
      priority: 1,
    });
  }

  if (
    typeof product.stock === "number" &&
    product.stock > 0 &&
    product.stock <= LOW_STOCK_MAX
  ) {
    tags.push({
      id: "low_stock",
      label: "Low Stock",
      shortLabel: product.stock <= 2 ? `Only ${product.stock} left` : "Low Stock",
      priority: 2,
    });
  }

  const createdMs = toProductTimestampMs(
    product.createdAt ?? (product as any).created_at
  );
  if (
    createdMs !== null &&
    nowMs - createdMs >= -60_000 &&
    nowMs - createdMs <= NEW_ARRIVAL_WINDOW_MS
  ) {
    tags.push({
      id: "new_arrival",
      label: "New Arrival",
      shortLabel: "New Arrival",
      priority: 3,
    });
  }

  return tags.sort((a, b) => a.priority - b.priority);
}

export function computeProductTrendScore(
  product: Product,
  salesByProductId?: Record<string, number>,
  bestSellerCutoff = 3,
  nowMs = Date.now()
): number {
  const isOutOfStock = Boolean(product.isSold || product.stock === 0);
  if (isOutOfStock) return -10000;

  const tags = computeProductTags(
    product,
    salesByProductId,
    bestSellerCutoff,
    nowMs
  );
  const totalSold = getCombinedProductSales(product, salesByProductId);
  const hasBestSeller = tags.some((t) => t.id === "best_seller");
  const hasLowStock = tags.some((t) => t.id === "low_stock");
  const hasNewArrival = tags.some((t) => t.id === "new_arrival");

  const hasDiscount = Boolean(
    product.isOffer &&
      product.offerPrice &&
      product.price > 0 &&
      product.offerPrice < product.price
  );

  const ratingScore =
    (Number(product.rating) || 0) * Math.min(Number(product.numReviews) || 0, 20) * 0.55;
  const viewScore = Math.min(Number(product.views) || 0, 1000) * 0.04;

  return (
    totalSold * 14 +
    (hasBestSeller ? 28 : 0) +
    (hasNewArrival ? 18 : 0) +
    (hasLowStock ? 12 : 0) +
    (hasDiscount ? 8 : 0) +
    (product.featured ? 6 : 0) +
    ratingScore +
    viewScore
  );
}
