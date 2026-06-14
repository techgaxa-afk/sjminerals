import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { useUserRoles } from "@/hooks/use-roles";
import { useAuth } from "@/hooks/use-auth";
import { listAllUsers, setUserRole, type AdminUser } from "@/lib/admin-users.functions";
import { Shield, ShieldOff, Loader2, Search, UserCog } from "lucide-react";

export const Route = createFileRoute("/users")({ component: UsersPage });

function UsersPage() {
  return (
    <AppLayout>
      <UsersInner />
    </AppLayout>
  );
}

function UsersInner() {
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const { user } = useAuth();
  const fetchUsers = useServerFn(listAllUsers);
  const mutateRole = useServerFn(setUserRole);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true); setError(null);
    try { setUsers(await fetchUsers({})); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [fetchUsers]);

  useEffect(() => { if (isAdmin) reload(); }, [isAdmin, reload]);

  const onToggle = async (userId: string, role: AdminUser["roles"][number], enabled: boolean) => {
    setBusy(true);
    try {
      await mutateRole({ data: { userId, role, enabled } });
      toast.success(`${enabled ? "Granted" : "Revoked"} ${role}`);
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (rolesLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h2 className="text-lg font-semibold">Admin access required</h2>
        <p className="text-sm text-muted-foreground mt-1">Only admins can manage user roles.</p>
      </div>
    );
  }

  const filtered = (users ?? []).filter((u) => {
    const q = search.toLowerCase();
    return !q || u.email?.toLowerCase().includes(q) || u.fullName?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">User Management</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="pl-8 pr-3 py-2 text-sm rounded-md border border-border bg-background w-64"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">User</th>
                <th className="text-left p-3 font-medium">Roles</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Last sign-in</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <UserRow
                  key={u.id}
                  u={u}
                  isSelf={u.id === user?.id}
                  busy={busy}
                  onToggle={(role, enabled) => onToggle(u.id, role, enabled)}
                />
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const ROLE_LABELS: { role: AdminUser["roles"][number]; label: string; hint: string }[] = [
  { role: "admin", label: "Admin", hint: "Full access incl. user management" },
  { role: "staff", label: "Staff", hint: "Full operational write" },
  { role: "accountant", label: "Accountant", hint: "Payments & financial write" },
  { role: "operator", label: "Operator", hint: "Bills, Hitachi, expenses write" },
  { role: "viewer", label: "Viewer", hint: "Read-only" },
];

function UserRow({
  u, isSelf, busy, onToggle,
}: {
  u: AdminUser;
  isSelf: boolean;
  busy: boolean;
  onToggle: (role: AdminUser["roles"][number], enabled: boolean) => void;
}) {
  return (
    <tr className="border-t border-border">
      <td className="p-3">
        <div className="font-medium text-foreground">{u.fullName ?? "—"}</div>
        <div className="text-xs text-muted-foreground">{u.email ?? u.id}</div>
        {isSelf && <span className="text-[10px] uppercase tracking-wide text-primary">you</span>}
      </td>
      <td className="p-3">
        <div className="flex gap-1 flex-wrap">
          {u.roles.length === 0 && <span className="text-xs text-muted-foreground">no access</span>}
          {u.roles.map((r) => (
            <span key={r} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${r === "admin" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"}`}>
              {r === "admin" && <Shield className="h-3 w-3" />}
              {r}
            </span>
          ))}
        </div>
      </td>
      <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">
        {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleString() : "—"}
      </td>
      <td className="p-3">
        <div className="flex gap-1.5 justify-end flex-wrap">
          {ROLE_LABELS.map(({ role, label, hint }) => {
            const active = u.roles.includes(role);
            const disabledSelf = role === "admin" && active && isSelf;
            return (
              <RoleButton
                key={role}
                label={label}
                active={active}
                disabled={busy || disabledSelf}
                title={disabledSelf ? "Cannot revoke your own admin role" : hint}
                onClick={() => onToggle(role, !active)}
              />
            );
          })}
        </div>
      </td>
    </tr>
  );
}

function RoleButton({
  label, active, disabled, onClick, title,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        active
          ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
          : "bg-primary/10 text-primary hover:bg-primary/20"
      }`}
    >
      {active ? <ShieldOff className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
      {label}
    </button>
  );
}
