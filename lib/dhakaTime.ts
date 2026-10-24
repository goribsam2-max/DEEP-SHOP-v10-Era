import { isForbiddenNumber } from "./utils";

export type MobileAccountType = "Personal" | "Payment" | "Agent";

export interface ConfiguredMobileAccount {
  id: string;
  provider: "bKash" | "Nagad";
  type: MobileAccountType;
  number: string;
}

export function resolveTimestampMs(ts: unknown): number {
  if (!ts) return Date.now();
  if (typeof ts === "number") return ts;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === "string") {
    const asNum = Number(ts);
    if (!Number.isNaN(asNum) && asNum > 1_000_000_000) return asNum;
    const parsed = Date.parse(ts);
    if (!Number.isNaN(parsed)) return parsed;
    return Date.now();
  }
  if (typeof ts === "object" && ts !== null) {
    const maybeObj = ts as {
      toMillis?: () => number;
      seconds?: number;
      _seconds?: number;
    };
    if (typeof maybeObj.toMillis === "function") {
      return maybeObj.toMillis();
    }
    if (typeof maybeObj.seconds === "number") {
      return maybeObj.seconds * 1000;
    }
    if (typeof maybeObj._seconds === "number") {
      return maybeObj._seconds * 1000;
    }
  }
  return Date.now();
}

/**
 * Formats timestamp in Asia/Dhaka (Bangladesh) timezone using 12-hour AM/PM format.
 * Output example: "24/10/2026, 10:33 AM" (or with seconds: "24/10/2026, 10:33:09 AM")
 */
export function formatDhakaDateTime(
  ts: unknown,
  includeSeconds = false
): string {
  const ms = resolveTimestampMs(ts);
  const date = new Date(ms);
  try {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      ...(includeSeconds ? { second: "2-digit" } : {}),
      hour12: true,
    });
    return formatter
      .format(date)
      .replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
  } catch {
    return date.toLocaleString("en-US", { hour12: true });
  }
}

/**
 * Formats feed / comment time concisely in 12-hour Asia/Dhaka timezone on a single line.
 */
export function formatDhakaFeedTime(ts: unknown): string {
  const ms = resolveTimestampMs(ts);
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));

  const timeOnly = (() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Dhaka",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(ms));
    } catch {
      return "";
    }
  })();

  if (diffSec < 60) return `Just now · ${timeOnly}`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago · ${timeOnly}`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago · ${timeOnly}`;

  return formatDhakaDateTime(ms, false);
}

export function normalizeAccountType(raw: unknown): MobileAccountType {
  if (typeof raw !== "string") return "Personal";
  const lower = raw.trim().toLowerCase();
  if (lower === "payment" || lower === "merchant") return "Payment";
  if (lower === "agent" || lower === "cashout" || lower === "cash out") {
    return "Agent";
  }
  return "Personal";
}

export function toAdminPaymentType(
  raw: unknown
): "personal" | "payment" | "cashout" {
  const norm = normalizeAccountType(raw);
  if (norm === "Payment") return "payment";
  if (norm === "Agent") return "cashout";
  return "personal";
}

export function getMobileActionLabel(
  rawType: unknown
): "Send Money" | "Make Payment" | "Cash Out" {
  const norm = normalizeAccountType(rawType);
  if (norm === "Payment") return "Make Payment";
  if (norm === "Agent") return "Cash Out";
  return "Send Money";
}

/**
 * Increments and returns a deterministic per-session counter so every page refresh
 * cycles to the next configured payment number when multiple numbers exist.
 */
export function getNextRefreshSeed(key: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const storageKey = `ds_rot_${key}`;
    const prevRaw = window.sessionStorage.getItem(storageKey);
    const next = prevRaw !== null ? (parseInt(prevRaw, 10) || 0) + 1 : 0;
    window.sessionStorage.setItem(storageKey, String(next));
    return next;
  } catch {
    return Math.floor(Math.random() * 1000);
  }
}

export function pickAccountBySeed(
  accounts: ConfiguredMobileAccount[],
  seed: number
): ConfiguredMobileAccount | null {
  if (!Array.isArray(accounts) || accounts.length === 0) return null;
  const idx = Math.abs(seed) % accounts.length;
  return accounts[idx] || accounts[0] || null;
}

function isPlaceholderOrForbidden(num: string): boolean {
  const clean = num.trim();
  if (!clean) return true;
  if (
    clean === "01700000000" ||
    clean === "01800000000" ||
    clean === "01812345678"
  ) {
    return true;
  }
  return isForbiddenNumber(clean);
}

/**
 * Extracts configured bKash and Nagad accounts from a Firestore user or payment settings document.
 * Returns ONLY valid, non-placeholder accounts that actually have a configured number.
 */
export function extractConfiguredMobileAccounts(
  data: Record<string, any> | null | undefined
): {
  bkash: ConfiguredMobileAccount[];
  nagad: ConfiguredMobileAccount[];
} {
  if (!data) return { bkash: [], nagad: [] };

  const bkashMap = new Map<string, ConfiguredMobileAccount>();
  const nagadMap = new Map<string, ConfiguredMobileAccount>();

  const addAccount = (
    provider: "bKash" | "Nagad",
    rawNumber: unknown,
    rawType?: unknown,
    rawId?: unknown
  ) => {
    if (typeof rawNumber !== "string") return;
    const cleaned = rawNumber.trim();
    if (isPlaceholderOrForbidden(cleaned)) return;
    const type = normalizeAccountType(rawType);
    const target = provider === "bKash" ? bkashMap : nagadMap;
    const key = `${cleaned}_${type}`;
    if (!target.has(key)) {
      target.set(key, {
        id:
          typeof rawId === "string" && rawId.trim()
            ? rawId
            : `${provider.toLowerCase()}_${cleaned}_${type}`,
        provider,
        type,
        number: cleaned,
      });
    }
  };

  // 1. Structured arrays: bkashAccounts / nagadAccounts / paymentAccounts
  if (Array.isArray(data.bkashAccounts)) {
    for (const item of data.bkashAccounts) {
      if (item && typeof item === "object") {
        addAccount("bKash", item.number, item.type, item.id);
      } else if (typeof item === "string") {
        addAccount("bKash", item, "Personal");
      }
    }
  }

  if (Array.isArray(data.nagadAccounts)) {
    for (const item of data.nagadAccounts) {
      if (item && typeof item === "object") {
        addAccount("Nagad", item.number, item.type, item.id);
      } else if (typeof item === "string") {
        addAccount("Nagad", item, "Personal");
      }
    }
  }

  if (Array.isArray(data.paymentAccounts)) {
    for (const item of data.paymentAccounts) {
      if (!item || typeof item !== "object") continue;
      if (item.provider === "bKash") {
        addAccount("bKash", item.number, item.type, item.id);
      } else if (item.provider === "Nagad") {
        addAccount("Nagad", item.number, item.type, item.id);
      }
    }
  }

  // 2. Legacy string arrays (only add numbers not already represented in structured accounts)
  const existingBkashNums = new Set(
    Array.from(bkashMap.values()).map((a) => a.number)
  );
  if (Array.isArray(data.bkashNumbers)) {
    for (const num of data.bkashNumbers) {
      if (
        typeof num === "string" &&
        num.trim() &&
        !existingBkashNums.has(num.trim())
      ) {
        addAccount(
          "bKash",
          num,
          data.bkashAccountType || data.bkashType || "Personal"
        );
        existingBkashNums.add(num.trim());
      }
    }
  }

  const existingNagadNums = new Set(
    Array.from(nagadMap.values()).map((a) => a.number)
  );
  if (Array.isArray(data.nagadNumbers)) {
    for (const num of data.nagadNumbers) {
      if (
        typeof num === "string" &&
        num.trim() &&
        !existingNagadNums.has(num.trim())
      ) {
        addAccount(
          "Nagad",
          num,
          data.nagadAccountType || data.nagadType || "Personal"
        );
        existingNagadNums.add(num.trim());
      }
    }
  }

  // 3. Single string fields: bkashNumber / nagadNumber / bkash / nagad / npsbNumber / pathaoPayNumber
  for (const candidate of [data.bkashNumber, data.bkash, data.npsbNumber]) {
    if (
      typeof candidate === "string" &&
      candidate.trim() &&
      !existingBkashNums.has(candidate.trim())
    ) {
      addAccount(
        "bKash",
        candidate,
        data.bkashAccountType || data.bkashType || "Personal"
      );
      existingBkashNums.add(candidate.trim());
    }
  }

  for (const candidate of [
    data.nagadNumber,
    data.nagad,
    data.pathaoPayNumber,
  ]) {
    if (
      typeof candidate === "string" &&
      candidate.trim() &&
      !existingNagadNums.has(candidate.trim())
    ) {
      addAccount(
        "Nagad",
        candidate,
        data.nagadAccountType || data.nagadType || "Personal"
      );
      existingNagadNums.add(candidate.trim());
    }
  }

  return {
    bkash: Array.from(bkashMap.values()),
    nagad: Array.from(nagadMap.values()),
  };
}
