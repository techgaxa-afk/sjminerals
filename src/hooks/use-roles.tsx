import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type AppRole = "admin" | "staff";

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
      const r = (data ?? []).map((x: { role: string }) => x.role).filter((x): x is AppRole => x === "admin" || x === "staff");
      setRoles(r);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user]);

  return { roles, loading, isAdmin: roles.includes("admin"), isStaff: roles.includes("staff") };
}
