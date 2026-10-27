import React, { useEffect, useState, createContext } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "../firebase";
import {
  isSuperAdminOrAdmin,
  checkStaffRecord,
  normalizeEmail,
} from "../lib/admin";
import { AdminTableSkeleton } from "./PageSkeletons";

interface AdminLayoutProps {
  userData: any;
}

export const StaffContext = createContext<{
  isStaff: boolean;
  permissions: string[];
  isSuperAdmin: boolean;
}>({ isStaff: false, permissions: [], isSuperAdmin: false });

const AdminLayout: React.FC<AdminLayoutProps> = ({ userData }) => {
  const [authResolved, setAuthResolved] = useState(false);
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [staffData, setStaffData] = useState<{
    isStaff: boolean;
    permissions: string[];
    isSuperAdmin: boolean;
  }>({ isStaff: false, permissions: [], isSuperAdmin: false });
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setAuthUser(u);
      setAuthResolved(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authResolved) return;

    let cancelled = false;

    const verifyAccess = async () => {
      // Wait briefly if Firebase auth user exists while Firestore userData is still arriving,
      // unless authUser itself already matches a super-admin email.
      if (!authUser && !userData) {
        navigate("/");
        return;
      }

      if (isSuperAdminOrAdmin(userData, authUser)) {
        if (!cancelled) {
          setStaffData({ isStaff: false, permissions: [], isSuperAdmin: true });
          setLoading(false);
        }
        return;
      }

      if (String(userData?.role || "").toLowerCase().trim() === "staff") {
        const email = normalizeEmail(userData?.email || authUser?.email);
        const record = await checkStaffRecord(email);
        if (!cancelled) {
          setStaffData({
            isStaff: true,
            permissions: record.permissions,
            isSuperAdmin: false,
          });
          setLoading(false);
        }
        return;
      }

      const email = normalizeEmail(userData?.email || authUser?.email);
      if (!email) {
        // If authUser exists and userData hasn't loaded yet, wait for userData update
        if (authUser && !userData) return;
        navigate("/");
        return;
      }

      const staffRes = await checkStaffRecord(email);
      if (cancelled) return;

      if (staffRes.isStaff) {
        setStaffData({
          isStaff: true,
          permissions: staffRes.permissions,
          isSuperAdmin: false,
        });
        setLoading(false);
      } else if (authUser && !userData) {
        // Wait for Firestore userData snapshot to arrive in case role === 'admin' is stored there
        return;
      } else {
        navigate("/");
      }
    };

    verifyAccess();

    return () => {
      cancelled = true;
    };
  }, [authResolved, authUser, userData, navigate]);

  if (loading) {
    return <AdminTableSkeleton rows={6} showStats />;
  }

  return (
    <StaffContext.Provider value={staffData}>
      <div className="w-full">
        <Outlet />
      </div>
    </StaffContext.Provider>
  );
};

export default AdminLayout;
