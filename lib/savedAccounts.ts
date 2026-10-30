import { User as FirebaseUser } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

export interface SavedAccountProfile {
  uid: string;
  email: string;
  contactDisplay?: string;
  password?: string;
  displayName: string;
  photoURL?: string;
  provider?: string;
  rememberLogin?: boolean;
  lastActive?: number;
  lastPasswordChange?: number | null;
}

export interface MatchedAccountProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  provider?: string;
}

const STORAGE_KEY = "vibe_saved_accounts";

export function formatAccountContact(email?: string, phoneNumber?: string): string {
  if (phoneNumber && phoneNumber.trim()) return phoneNumber.trim();
  if (!email) return "";
  if (
    email.endsWith("@phone.deepshop.top") ||
    email.endsWith("@phone.vibegadget.com")
  ) {
    const raw = email.split("@")[0];
    return raw.startsWith("+") ? raw : `+${raw}`;
  }
  return email;
}

export function getSavedAccounts(): SavedAccountProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const valid: SavedAccountProfile[] = [];
    for (const item of parsed) {
      if (!item || !item.uid) continue;
      if (seen.has(item.uid)) continue;
      seen.add(item.uid);
      valid.push({
        uid: String(item.uid),
        email: String(item.email || ""),
        contactDisplay: item.contactDisplay || formatAccountContact(item.email),
        password: item.password || "",
        displayName: String(item.displayName || "DEEP SHOP Member"),
        photoURL: item.photoURL || "",
        provider: item.provider || "password",
        rememberLogin: item.rememberLogin !== false && Boolean(item.password),
        lastActive: Number(item.lastActive || 0),
        lastPasswordChange: item.lastPasswordChange ?? null,
      });
    }
    return valid.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
  } catch {
    return [];
  }
}

export function upsertSavedAccount(
  incoming: Partial<SavedAccountProfile> & { uid: string }
): SavedAccountProfile[] {
  try {
    const current = getSavedAccounts();
    const existing = current.find((a) => a.uid === incoming.uid);

    const passwordValue =
      incoming.password !== undefined
        ? incoming.password
        : existing?.password || "";

    const merged: SavedAccountProfile = {
      uid: incoming.uid,
      email: incoming.email || existing?.email || "",
      contactDisplay:
        incoming.contactDisplay ||
        existing?.contactDisplay ||
        formatAccountContact(incoming.email || existing?.email),
      password: passwordValue,
      displayName:
        incoming.displayName || existing?.displayName || "DEEP SHOP Member",
      photoURL:
        incoming.photoURL !== undefined
          ? incoming.photoURL
          : existing?.photoURL || "",
      provider: incoming.provider || existing?.provider || "password",
      rememberLogin:
        incoming.rememberLogin !== undefined
          ? incoming.rememberLogin
          : Boolean(passwordValue),
      lastActive: incoming.lastActive || Date.now(),
      lastPasswordChange:
        incoming.lastPasswordChange !== undefined
          ? incoming.lastPasswordChange
          : existing?.lastPasswordChange ?? null,
    };

    const next = [merged, ...current.filter((a) => a.uid !== incoming.uid)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return getSavedAccounts();
  }
}

export function removeSavedAccount(uid: string): SavedAccountProfile[] {
  try {
    const next = getSavedAccounts().filter((a) => a.uid !== uid);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

export function clearSavedAccountPassword(uid: string): SavedAccountProfile[] {
  try {
    const next = getSavedAccounts().map((a) =>
      a.uid === uid ? { ...a, password: "", rememberLogin: false } : a
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return getSavedAccounts();
  }
}

export function syncCurrentUserToSavedAccounts(
  user: FirebaseUser | null | undefined,
  profileData?: {
    displayName?: string;
    photoURL?: string;
    email?: string;
    phoneNumber?: string;
  } | null
): void {
  if (!user || !user.uid) return;
  const providerId = user.providerData?.[0]?.providerId || "";
  const provider = providerId.includes("google")
    ? "google"
    : providerId.includes("apple")
    ? "apple"
    : "password";

  upsertSavedAccount({
    uid: user.uid,
    email: profileData?.email || user.email || "",
    contactDisplay: formatAccountContact(
      profileData?.email || user.email || "",
      profileData?.phoneNumber
    ),
    displayName:
      profileData?.displayName ||
      user.displayName ||
      user.email?.split("@")[0] ||
      "DEEP SHOP Member",
    photoURL: profileData?.photoURL || user.photoURL || undefined,
    provider,
    lastActive: Date.now(),
  });
}

export function normalizeBdPhoneVariants(rawInput: string): {
  digitsOnly: string;
  e164Bd: string;
  localBd: string;
  phoneAuthEmail: string;
  legacyPhoneAuthEmail: string;
} {
  const cleaned = rawInput.trim().replace(/[\s\-().]/g, "");
  const digitsOnly = cleaned.replace(/^\+/, "");
  let coreBd = digitsOnly;
  if (coreBd.startsWith("880")) {
    coreBd = coreBd.slice(3);
  } else if (coreBd.startsWith("0")) {
    coreBd = coreBd.slice(1);
  }
  const e164Bd = coreBd ? `+880${coreBd}` : `+${digitsOnly}`;
  const localBd = coreBd ? `0${coreBd}` : digitsOnly;
  const fullPrefix = coreBd ? `880${coreBd}` : digitsOnly;
  return {
    digitsOnly,
    e164Bd,
    localBd,
    phoneAuthEmail: `${fullPrefix}@phone.deepshop.top`,
    legacyPhoneAuthEmail: `${fullPrefix}@phone.vibegadget.com`,
  };
}

export function isLikelyPhoneNumber(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || trimmed.includes("@")) return false;
  return /^[+0-9][0-9\s\-().]{5,18}$/.test(trimmed);
}

export async function resolveIdentifierToAuthEmail(
  identifier: string
): Promise<string> {
  const trimmed = identifier.trim();
  if (!trimmed) return "";

  if (!isLikelyPhoneNumber(trimmed)) {
    // Email input: check if it maps to a secondaryEmail in Firestore or server
    try {
      const usersRef = collection(db, "users");
      const qPrimary = await getDocs(
        query(usersRef, where("email", "==", trimmed), limit(1))
      );
      if (!qPrimary.empty) {
        const d = qPrimary.docs[0].data();
        if (d.email) return String(d.email);
      }
      const qSecondary = await getDocs(
        query(usersRef, where("secondaryEmail", "==", trimmed), limit(1))
      );
      if (!qSecondary.empty) {
        const d = qSecondary.docs[0].data();
        if (d.email) return String(d.email);
      }
    } catch {
      // Ignore client lookup failure and continue
    }
    return trimmed;
  }

  // Phone number input
  const variants = normalizeBdPhoneVariants(trimmed);

  try {
    const usersRef = collection(db, "users");
    const candidatePhones = Array.from(
      new Set([trimmed, variants.e164Bd, variants.localBd, variants.digitsOnly])
    );
    for (const ph of candidatePhones) {
      const snap = await getDocs(
        query(usersRef, where("phoneNumber", "==", ph), limit(1))
      );
      if (!snap.empty && snap.docs[0].data().email) {
        return String(snap.docs[0].data().email);
      }
    }

    const snapPhoneEmail = await getDocs(
      query(usersRef, where("email", "==", variants.phoneAuthEmail), limit(1))
    );
    if (!snapPhoneEmail.empty) {
      return variants.phoneAuthEmail;
    }

    const snapLegacyEmail = await getDocs(
      query(
        usersRef,
        where("email", "==", variants.legacyPhoneAuthEmail),
        limit(1)
      )
    );
    if (!snapLegacyEmail.empty) {
      return variants.legacyPhoneAuthEmail;
    }
  } catch {
    // Fall back to API lookup
  }

  try {
    const res = await fetch("/api/lookup-auth-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: variants.e164Bd }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.authEmail) return String(data.authEmail);
    }
  } catch {
    // Ignore network error
  }

  return variants.phoneAuthEmail;
}

export async function searchMatchingAccounts(
  rawQuery: string
): Promise<MatchedAccountProfile[]> {
  const trimmed = rawQuery.trim();
  if (!trimmed) return [];

  const resultsMap = new Map<string, MatchedAccountProfile>();

  const addResult = (docId: string, data: any) => {
    const uid = String(data.uid || docId);
    if (!uid || resultsMap.has(uid)) return;
    resultsMap.set(uid, {
      uid,
      email: String(data.email || ""),
      displayName: String(
        data.displayName ||
          data.name ||
          (data.email ? String(data.email).split("@")[0] : "DEEP SHOP User")
      ),
      photoURL: data.photoURL || "",
      phoneNumber: data.phoneNumber || "",
      provider: data.provider || "password",
    });
  };

  const phoneMode = isLikelyPhoneNumber(trimmed);
  const usersRef = collection(db, "users");

  try {
    if (phoneMode) {
      const variants = normalizeBdPhoneVariants(trimmed);
      const phoneCandidates = Array.from(
        new Set([
          trimmed,
          variants.e164Bd,
          variants.localBd,
          variants.digitsOnly,
        ])
      );
      for (const ph of phoneCandidates) {
        const snap = await getDocs(
          query(usersRef, where("phoneNumber", "==", ph), limit(10))
        );
        snap.docs.forEach((d) => addResult(d.id, d.data()));
      }

      for (const em of [
        variants.phoneAuthEmail,
        variants.legacyPhoneAuthEmail,
      ]) {
        const snap = await getDocs(
          query(usersRef, where("email", "==", em), limit(5))
        );
        snap.docs.forEach((d) => addResult(d.id, d.data()));
      }
    } else {
      const lower = trimmed.toLowerCase();
      for (const candidate of Array.from(new Set([trimmed, lower]))) {
        const snapEmail = await getDocs(
          query(usersRef, where("email", "==", candidate), limit(10))
        );
        snapEmail.docs.forEach((d) => addResult(d.id, d.data()));

        const snapSec = await getDocs(
          query(usersRef, where("secondaryEmail", "==", candidate), limit(10))
        );
        snapSec.docs.forEach((d) => addResult(d.id, d.data()));
      }
    }
  } catch (err) {
    console.error("Account search query error:", err);
  }

  // Also check saved accounts on this device for immediate match
  const saved = getSavedAccounts();
  const normalizedTarget = trimmed.toLowerCase().replace(/[\s\-().+]/g, "");
  for (const acc of saved) {
    const savedEmailNorm = (acc.email || "").toLowerCase();
    const savedContactNorm = (acc.contactDisplay || "")
      .toLowerCase()
      .replace(/[\s\-().+]/g, "");
    if (
      savedEmailNorm === trimmed.toLowerCase() ||
      (normalizedTarget.length >= 6 &&
        (savedContactNorm.includes(normalizedTarget) ||
          savedEmailNorm.replace(/[\s\-().+]/g, "").includes(normalizedTarget)))
    ) {
      addResult(acc.uid, acc);
    }
  }

  // Refresh photoURL/displayName from Firestore user doc if any local match lacked details
  for (const [uid, item] of resultsMap.entries()) {
    if (!item.photoURL) {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          const d = snap.data();
          resultsMap.set(uid, {
            ...item,
            displayName: d.displayName || item.displayName,
            photoURL: d.photoURL || item.photoURL,
            email: d.email || item.email,
            phoneNumber: d.phoneNumber || item.phoneNumber,
          });
        }
      } catch {
        // Ignore
      }
    }
  }

  return Array.from(resultsMap.values());
}

export async function linkPendingGuestOrderAndResolveDestination(
  uid: string,
  userEmail: string | null | undefined,
  locationSearch: string,
  defaultPath = "/"
): Promise<string> {
  const searchParams = new URLSearchParams(locationSearch);
  const redirectParam = searchParams.get("redirect");
  const urlGuestOrder = searchParams.get("guestOrder");
  const localGuestOrder = localStorage.getItem("pending_guest_order_id");

  const pendingGuestOrder = urlGuestOrder || localGuestOrder;

  if (pendingGuestOrder && uid) {
    try {
      await updateDoc(doc(db, "orders", pendingGuestOrder), {
        userId: uid,
        customerEmail: userEmail || "",
      });
    } catch (e) {
      console.error("Order linking error:", e);
    } finally {
      localStorage.removeItem("pending_guest_order_id");
      localStorage.removeItem("pending_guest_order_phone");
    }
  }

  if (redirectParam) return redirectParam;
  if (locationSearch.includes("from=loops") || defaultPath.includes("/loops")) {
    return "/loops";
  }
  if (urlGuestOrder) return "/my-orders";
  return defaultPath;
}
