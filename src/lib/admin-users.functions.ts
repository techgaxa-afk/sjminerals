import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
  return supabaseAdmin;
}

export type AdminUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  roles: ("admin" | "staff")[];
};

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUser[]> => {
    const supabaseAdmin = await assertAdmin(context.userId);

    const all: AdminUser[] = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(error.message);
      for (const u of data.users) {
        all.push({
          id: u.id,
          email: u.email ?? null,
          fullName: (u.user_metadata?.full_name as string) ?? (u.user_metadata?.name as string) ?? null,
          createdAt: u.created_at,
          lastSignInAt: u.last_sign_in_at ?? null,
          roles: [],
        });
      }
      if (data.users.length < perPage) break;
      page += 1;
    }

    const { data: roles, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    if (rolesErr) throw new Error(rolesErr.message);

    const byId = new Map(all.map((u) => [u.id, u]));
    for (const r of roles ?? []) {
      const u = byId.get(r.user_id as string);
      if (u && (r.role === "admin" || r.role === "staff")) u.roles.push(r.role);
    }

    all.sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));
    return all;
  });

const setRoleInput = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "staff"]),
  enabled: z.boolean(),
});

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => setRoleInput.parse(d))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);

    // Prevent admin from removing their own admin role (avoid lockout)
    if (data.role === "admin" && !data.enabled && data.userId === context.userId) {
      throw new Error("You cannot remove your own admin role.");
    }

    if (data.enabled) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: data.role });
      if (error && !String(error.message).toLowerCase().includes("duplicate")) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
