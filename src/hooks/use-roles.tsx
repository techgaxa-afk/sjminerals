import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type AppRole = "admin" | "staff" | "accountant" | "operator" | "viewer";

const ALL_ROLES: AppRole[] = ["admin", "staff", "accountant", "operator", "viewer"];

export type PermissionArea =
  | "manageUsers"
  | "writeBills"
  | "writePayments"
  | "writeMaster"   // companies / vehicles
  | "writeOps"      // hitachi / expenses / operators / products
  | "viewReports";

export function useUserRoles() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setRoles([]); setLoading(false); return; }
    setLoading(true);
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      if (cancelled) return;
      const r = (data ?? [])
        .map((x: { role: string }) => x.role as AppRole)
        .filter((x): x is AppRole => ALL_ROLES.includes(x as AppRole));
      setRoles(r);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user]);

  const isAdmin = roles.includes("admin");
  const isStaff = roles.includes("staff");
  const isAccountant = roles.includes("accountant");
  const isOperator = roles.includes("operator");
  const isViewer = roles.includes("viewer");
  const hasAny = roles.length > 0;

  const can = (area: PermissionArea): boolean => {
    if (isAdmin) return true;
    switch (area) {
      case "manageUsers": return false;
      case "writeMaster": return isStaff;
      case "writePayments": return isStaff || isAccountant;
      case "writeBills": return isStaff || isOperator;
      case "writeOps": return isStaff || isOperator;
      case "viewReports": return hasAny;
      default: return false;
    }
  };

  return { roles, loading, isAdmin, isStaff, isAccountant, isOperator, isViewer, hasAny, can };
}
