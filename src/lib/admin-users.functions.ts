import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ROLE_VALUES = ["admin", "staff", "accountant", "operator", "viewer"] as const;
export type AppRoleName = typeof ROLE_VALUES[number];

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

async function audit(
  supabaseAdmin: Awaited<ReturnType<typeof assertAdmin>>,
  performedBy: string,
  action: string,
  entityId: string | null,
  details: Record<string, unknown>
) {
  await supabaseAdmin.from("audit_log").insert({
    user_id: performedBy,
    action,
    entity_type: "user",
    entity_id: entityId,
    details,
  });
}

export type UserStatus = "active" | "pending" | "disabled";

export type AdminUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  confirmedAt: string | null;
  bannedUntil: string | null;
  status: UserStatus;
  roles: AppRoleName[];
};

function computeStatus(u: { banned_until?: string | null; email_confirmed_at?: string | null; last_sign_in_at?: string | null }): UserStatus {
  if (u.banned_until && new Date(u.banned_until) > new Date()) return "disabled";
  if (!u.email_confirmed_at && !u.last_sign_in_at) return "pending";
  return "active";
}

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
        const raw = u as unknown as { banned_until?: string | null; email_confirmed_at?: string | null };
        all.push({
          id: u.id,
          email: u.email ?? null,
          fullName: (u.user_metadata?.full_name as string) ?? (u.user_metadata?.name as string) ?? null,
          createdAt: u.created_at,
          lastSignInAt: u.last_sign_in_at ?? null,
          confirmedAt: raw.email_confirmed_at ?? null,
          bannedUntil: raw.banned_until ?? null,
          status: computeStatus({
            banned_until: raw.banned_until,
            email_confirmed_at: raw.email_confirmed_at,
            last_sign_in_at: u.last_sign_in_at,
          }),
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
      if (u && (ROLE_VALUES as readonly string[]).includes(r.role as string)) {
        u.roles.push(r.role as AppRoleName);
      }
    }

    all.sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));
    return all;
  });

const setRoleInput = z.object({
  userId: z.string().uuid(),
  role: z.enum(ROLE_VALUES),
  enabled: z.boolean(),
});

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => setRoleInput.parse(d))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);

    if (data.role === "admin" && !data.enabled && data.userId === context.userId) {
      throw new Error("You cannot remove your own admin role.");
    }

    // Prevent removing last admin
    if (data.role === "admin" && !data.enabled) {
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) <= 1) throw new Error("At least one Admin must remain in the system.");
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
    await audit(supabaseAdmin, context.userId, data.enabled ? "role_granted" : "role_revoked", data.userId, { role: data.role });
    return { ok: true };
  });

const inviteInput = z.object({
  email: z.string().email(),
  fullName: z.string().trim().max(120).optional(),
  role: z.enum(ROLE_VALUES).optional(),
});

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inviteInput.parse(d))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);

    // Check duplicates
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (existing?.users.some((u) => u.email?.toLowerCase() === data.email.toLowerCase())) {
      throw new Error("This user already exists.");
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      data: data.fullName ? { full_name: data.fullName } : undefined,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to invite user");

    if (data.role) {
      await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });
    }
    await audit(supabaseAdmin, context.userId, "user_invited", created.user.id, { email: data.email, role: data.role });
    return { ok: true, userId: created.user.id };
  });

const updateInput = z.object({
  userId: z.string().uuid(),
  fullName: z.string().trim().max(120).optional(),
  email: z.string().email().optional(),
  role: z.enum(ROLE_VALUES).optional(),
});

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateInput.parse(d))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);

    const attrs: { email?: string; user_metadata?: Record<string, unknown> } = {};
    if (data.email) attrs.email = data.email;
    if (data.fullName !== undefined) attrs.user_metadata = { full_name: data.fullName };
    if (attrs.email || attrs.user_metadata) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, attrs);
      if (error) throw new Error(error.message);
    }
    if (data.fullName !== undefined) {
      await supabaseAdmin.from("profiles").update({ full_name: data.fullName }).eq("id", data.userId);
    }

    if (data.role) {
      // Replace single-role assignment: clear existing, set new
      const { data: existing } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId);
      const had = (existing ?? []).map((r) => r.role as AppRoleName);
      if (had.includes("admin") && data.role !== "admin") {
        const { count } = await supabaseAdmin.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
        if ((count ?? 0) <= 1) throw new Error("At least one Admin must remain in the system.");
      }
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
      await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    }

    await audit(supabaseAdmin, context.userId, "user_updated", data.userId, { fields: Object.keys(data) });
    return { ok: true };
  });

const disableInput = z.object({ userId: z.string().uuid(), disabled: z.boolean() });

export const setUserDisabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => disableInput.parse(d))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    if (data.disabled && data.userId === context.userId) {
      throw new Error("You cannot disable your own account.");
    }
    const ban_duration = data.disabled ? "876000h" : "none";
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration } as never);
    if (error) throw new Error(error.message);
    await audit(supabaseAdmin, context.userId, data.disabled ? "user_disabled" : "user_enabled", data.userId, {});
    return { ok: true };
  });

const deleteInput = z.object({ userId: z.string().uuid() });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deleteInput.parse(d))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("You cannot delete your own account.");

    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId);
    const wasAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (wasAdmin) {
      const { count } = await supabaseAdmin.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
      if ((count ?? 0) <= 1) throw new Error("At least one Admin must remain in the system.");
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await audit(supabaseAdmin, context.userId, "user_deleted", data.userId, {});
    return { ok: true };
  });

export const resendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email);
    if (error) throw new Error(error.message);
    await audit(supabaseAdmin, context.userId, "invitation_resent", null, { email: data.email });
    return { ok: true };
  });
