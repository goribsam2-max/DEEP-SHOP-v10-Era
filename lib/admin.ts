import { User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export const SUPER_ADMIN_EMAILS = new Set([
  "admin@deep.shop",
  "admin@deepshop.top",
  "deepshop@gmail.com",
  "goribsam2@gmail.com",
  "vibegadgetfeni@gmail.com",
  "deepshopbysam@gmail.com",
]);

export function normalizeEmail(email?: string | null): string {
  return (email || "").toLowerCase().trim();
}

export function isSuperAdminOrAdmin(
  userData?: any | null,
  authUser?: FirebaseUser | null
): boolean {
  const role = String(userData?.role || "").toLowerCase().trim();
  const type = String(userData?.type || "").toLowerCase().trim();

  if (
    role === "admin" ||
    role === "superadmin" ||
    role === "super_admin" ||
    type === "admin" ||
    userData?.isAdmin === true
  ) {
    return true;
  }

  const profileEmail = normalizeEmail(userData?.email);
  const authEmail = normalizeEmail(authUser?.email);

  if (profileEmail && SUPER_ADMIN_EMAILS.has(profileEmail)) {
    return true;
  }
  if (authEmail && SUPER_ADMIN_EMAILS.has(authEmail)) {
    return true;
  }

  return false;
}

export function hasImmediateAdminOrStaffRole(
  userData?: any | null,
  authUser?: FirebaseUser | null
): boolean {
  if (isSuperAdminOrAdmin(userData, authUser)) return true;
  const role = String(userData?.role || "").toLowerCase().trim();
  return role === "staff" || role === "moderator";
}

export function isVerifiedSeller(userData?: any | null): boolean {
  if (!userData) return false;
  const role = String(userData?.role || "").toLowerCase().trim();
  const type = String(userData?.type || "").toLowerCase().trim();
  const sellerStatus = String(userData?.sellerStatus || "")
    .toLowerCase()
    .trim();

  if (role === "customer" || role === "buyer") return false;
  if (sellerStatus === "rejected" || sellerStatus === "pending") return false;

  return (
    role === "seller" ||
    type === "seller" ||
    userData?.isSeller === true ||
    sellerStatus === "approved"
  );
}

export function canAccessSellerDashboard(
  userData?: any | null,
  authUser?: FirebaseUser | null
): boolean {
  return isSuperAdminOrAdmin(userData, authUser) || isVerifiedSeller(userData);
}

export async function checkStaffRecord(
  email?: string | null
): Promise<{ isStaff: boolean; permissions: string[] }> {
  const normalized = normalizeEmail(email);
  if (!normalized) return { isStaff: false, permissions: [] };

  try {
    const snap = await getDoc(doc(db, "staff", normalized));
    if (snap.exists()) {
      const data = snap.data();
      return {
        isStaff: true,
        permissions: Array.isArray(data?.permissions) ? data.permissions : [],
      };
    }
  } catch {
    // Ignore permission or offline errors safely
  }

  return { isStaff: false, permissions: [] };
}
