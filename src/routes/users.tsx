import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { useUserRoles } from "@/hooks/use-roles";
import { useAuth } from "@/hooks/use-auth";
import {
  listAllUsers,
  setUserRole,
  inviteUser,
  updateUser,
  setUserDisabled,
  deleteUser,
  resendInvite,
  type AdminUser,
  type UserStatus,
} from "@/lib/admin-users.functions";
import { Shield, Loader2, Search, UserCog, UserPlus, Pencil, Trash2, Ban, CheckCircle2, Mail, X, Eye, Download } from "lucide-react";
import UserDetailsDrawer from "@/components/UserDetailsDrawer";

export const Route = createFileRoute("/users")({ component: UsersPage });

const ROLES = ["admin", "staff", "accountant", "operator", "viewer"] as const;
type Role = typeof ROLES[number];

const ROLE_BADGE: Record<Role, string> = {
  admin: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  staff: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  accountant: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  operator: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
  viewer: "bg-gray-500/15 text-gray-700 dark:text-gray-300 border-gray-500/30",
};

const STATUS_BADGE: Record<UserStatus, string> = {
  active: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  disabled: "bg-destructive/10 text-destructive border-destructive/30",
};

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
  const invite = useServerFn(inviteUser);
  const update = useServerFn(updateUser);
  const disable = useServerFn(setUserDisabled);
  const remove = useServerFn(deleteUser);
  const resend = useServerFn(resendInvite);

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | UserStatus>("all");
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [viewing, setViewing] = useState<AdminUser | null>(null);
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const reload = useCallback(async () => {
    setLoading(true);
    try { setUsers(await fetchUsers({})); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }, [fetchUsers]);

  useEffect(() => { if (isAdmin) reload(); }, [isAdmin, reload]);

  const runAction = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    try { await fn(); toast.success(okMsg); await reload(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (users ?? [])
      .filter((u) => tab === "all" || u.status === tab)
      .filter((u) => roleFilter === "all" || u.roles.includes(roleFilter))
      .filter((u) => !q || u.email?.toLowerCase().includes(q) || u.fullName?.toLowerCase().includes(q) || u.roles.some((r) => r.includes(q)));
  }, [users, search, tab, roleFilter]);

  const toggleSel = (id: string) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSel = () => setSelected(new Set());

  const bulkRun = async (fn: (id: string) => Promise<unknown>, msg: string) => {
    setBusy(true);
    const ids = [...selected];
    let ok = 0, fail = 0;
    for (const id of ids) {
      try { await fn(id); ok++; } catch { fail++; }
    }
    toast[fail ? "warning" : "success"](`${msg}: ${ok} ok${fail ? `, ${fail} failed` : ""}`);
    clearSel();
    await reload();
    setBusy(false);
  };

  const exportCSV = () => {
    const header = ["Name", "Email", "Roles", "Status", "Joined", "Last Login"];
    const rows = filtered.map((u) => [
      u.fullName ?? "",
      u.email ?? "",
      u.roles.join("|"),
      u.status,
      new Date(u.createdAt).toISOString(),
      u.lastSignInAt ? new Date(u.lastSignInAt).toISOString() : "",
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const list = users ?? [];
    return {
      total: list.length,
      active: list.filter((u) => u.status === "active").length,
      disabled: list.filter((u) => u.status === "disabled").length,
      pending: list.filter((u) => u.status === "pending").length,
      todayLogins: list.filter((u) => u.lastSignInAt && new Date(u.lastSignInAt).toDateString() === today).length,
    };
  }, [users]);

  const counts = useMemo(() => {
    const c = { all: users?.length ?? 0, active: 0, pending: 0, disabled: 0 };
    for (const u of users ?? []) c[u.status]++;
    return c;
  }, [users]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">User Management</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="pl-8 pr-3 py-2 text-sm rounded-md border border-border bg-background w-56"
            />
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4" /> Add User
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        {(["all", "active", "pending", "disabled"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px capitalize transition-colors ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t} <span className="ml-1 text-[10px] opacity-70">({counts[t]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">User</th>
                <th className="text-left p-3 font-medium">Role</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Last sign-in</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isSelf = u.id === user?.id;
                return (
                  <tr key={u.id} className="border-t border-border">
                    <td className="p-3">
                      <div className="font-medium text-foreground">{u.fullName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email ?? u.id}</div>
                      {isSelf && <span className="text-[10px] uppercase tracking-wide text-primary">you</span>}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {u.roles.length === 0 && <span className="text-xs text-muted-foreground">no role</span>}
                        {u.roles.map((r) => (
                          <span key={r} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${ROLE_BADGE[r]}`}>
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase border ${STATUS_BADGE[u.status]}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">
                      {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleString() : "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end flex-wrap">
                        {u.status === "pending" && u.email && (
                          <IconBtn title="Resend invite" onClick={() => runAction(() => resend({ data: { email: u.email! } }), "Invitation resent")} disabled={busy}>
                            <Mail className="h-3.5 w-3.5" />
                          </IconBtn>
                        )}
                        <IconBtn title="Edit" onClick={() => setEditing(u)} disabled={busy}>
                          <Pencil className="h-3.5 w-3.5" />
                        </IconBtn>
                        {u.status === "disabled" ? (
                          <IconBtn title="Enable user" onClick={() => runAction(() => disable({ data: { userId: u.id, disabled: false } }), "User enabled")} disabled={busy} variant="success">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </IconBtn>
                        ) : (
                          <IconBtn title="Disable user" onClick={() => runAction(() => disable({ data: { userId: u.id, disabled: true } }), "User disabled")} disabled={busy || isSelf} variant="warn">
                            <Ban className="h-3.5 w-3.5" />
                          </IconBtn>
                        )}
                        <IconBtn title="Delete" onClick={() => setDeleting(u)} disabled={busy || isSelf} variant="danger">
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddUserModal
          onClose={() => setShowAdd(false)}
          onSubmit={async (payload) => {
            await runAction(() => invite({ data: payload }), "Invitation sent");
            setShowAdd(false);
          }}
          busy={busy}
        />
      )}

      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (payload) => {
            await runAction(() => update({ data: { userId: editing.id, ...payload } }), "User updated");
            // Also sync role via setUserRole if simple toggle path needed - update already handles role
            setEditing(null);
          }}
          onToggleRole={async (role, enabled) => {
            await runAction(() => mutateRole({ data: { userId: editing.id, role, enabled } }), `${enabled ? "Granted" : "Revoked"} ${role}`);
          }}
          busy={busy}
        />
      )}

      {deleting && (
        <ConfirmDelete
          user={deleting}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await runAction(() => remove({ data: { userId: deleting.id } }), "User deleted");
            setDeleting(null);
          }}
          busy={busy}
        />
      )}
    </div>
  );
}

function IconBtn({ children, onClick, disabled, title, variant = "default" }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; title: string;
  variant?: "default" | "danger" | "warn" | "success";
}) {
  const v = {
    default: "hover:bg-accent",
    danger: "text-destructive hover:bg-destructive/10",
    warn: "text-amber-600 hover:bg-amber-500/10",
    success: "text-green-600 hover:bg-green-500/10",
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={`inline-flex items-center p-1.5 rounded-md border border-border bg-background disabled:opacity-40 disabled:cursor-not-allowed ${v}`}>
      {children}
    </button>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function AddUserModal({ onClose, onSubmit, busy }: {
  onClose: () => void;
  onSubmit: (p: { email: string; fullName?: string; role?: Role }) => Promise<void>;
  busy: boolean;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("viewer");

  return (
    <Modal title="Add New User" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Email Address *">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="user@example.com" />
        </Field>
        <Field label="Full Name">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" placeholder="John Doe" />
        </Field>
        <Field label="Assign Role">
          <div className="grid grid-cols-2 gap-1.5">
            {ROLES.map((r) => (
              <label key={r} className={`flex items-center gap-2 px-2 py-1.5 rounded-md border cursor-pointer text-sm ${role === r ? "border-primary bg-primary/5" : "border-border"}`}>
                <input type="radio" name="role" checked={role === r} onChange={() => setRole(r)} />
                <span className="capitalize">{r}</span>
              </label>
            ))}
          </div>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent">Cancel</button>
          <button
            disabled={busy || !email}
            onClick={() => onSubmit({ email, fullName: fullName || undefined, role })}
            className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? "Creating..." : "Create User"}
          </button>
        </div>
      </div>
      <style>{`.input{width:100%;padding:.5rem .625rem;border-radius:.375rem;border:1px solid hsl(var(--border));background:hsl(var(--background));font-size:.875rem}`}</style>
    </Modal>
  );
}

function EditUserModal({ user, onClose, onSubmit, busy }: {
  user: AdminUser;
  onClose: () => void;
  onSubmit: (p: { fullName?: string; email?: string; role?: Role }) => Promise<void>;
  onToggleRole: (role: Role, enabled: boolean) => Promise<void>;
  busy: boolean;
}) {
  const [fullName, setFullName] = useState(user.fullName ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [role, setRole] = useState<Role>((user.roles[0] as Role) ?? "viewer");

  return (
    <Modal title="Edit User" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Full Name">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" />
        </Field>
        <Field label="Email Address">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        </Field>
        <Field label="Role">
          <div className="grid grid-cols-2 gap-1.5">
            {ROLES.map((r) => (
              <label key={r} className={`flex items-center gap-2 px-2 py-1.5 rounded-md border cursor-pointer text-sm ${role === r ? "border-primary bg-primary/5" : "border-border"}`}>
                <input type="radio" name="erole" checked={role === r} onChange={() => setRole(r)} />
                <span className="capitalize">{r}</span>
              </label>
            ))}
          </div>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent">Cancel</button>
          <button
            disabled={busy}
            onClick={() => onSubmit({
              fullName: fullName !== (user.fullName ?? "") ? fullName : undefined,
              email: email !== (user.email ?? "") ? email : undefined,
              role,
            })}
            className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
      <style>{`.input{width:100%;padding:.5rem .625rem;border-radius:.375rem;border:1px solid hsl(var(--border));background:hsl(var(--background));font-size:.875rem}`}</style>
    </Modal>
  );
}

function ConfirmDelete({ user, onClose, onConfirm, busy }: {
  user: AdminUser; onClose: () => void; onConfirm: () => Promise<void>; busy: boolean;
}) {
  return (
    <Modal title="Delete User" onClose={onClose}>
      <p className="text-sm text-muted-foreground">Are you sure you want to permanently remove:</p>
      <div className="my-3 p-3 rounded-md border border-border bg-muted/30">
        <div className="font-medium">{user.fullName ?? "—"}</div>
        <div className="text-xs text-muted-foreground">{user.email}</div>
      </div>
      <p className="text-sm text-destructive">This action cannot be undone.</p>
      <div className="flex justify-end gap-2 pt-4">
        <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent">Cancel</button>
        <button disabled={busy} onClick={onConfirm} className="px-3 py-1.5 text-sm rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
          {busy ? "Deleting..." : "Delete User"}
        </button>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}
