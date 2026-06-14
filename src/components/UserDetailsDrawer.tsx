import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { X, Loader2, KeyRound, Activity, Shield, Info } from "lucide-react";
import { getUserActivity, sendPasswordReset, type AdminUser, type UserActivity } from "@/lib/admin-users.functions";

type Tab = "details" | "activity" | "permissions";

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  staff: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  accountant: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  operator: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
  viewer: "bg-gray-500/15 text-gray-700 dark:text-gray-300 border-gray-500/30",
};

// Capability matrix mirrors src/hooks/use-roles.tsx `can()` logic
const MODULES: { key: string; label: string; area: "manageUsers" | "writeBills" | "writePayments" | "writeMaster" | "writeOps" | "viewReports" | "view" }[] = [
  { key: "dashboard", label: "Dashboard", area: "view" },
  { key: "bills", label: "Bills", area: "writeBills" },
  { key: "companies", label: "Companies", area: "writeMaster" },
  { key: "payments", label: "Payments", area: "writePayments" },
  { key: "expenses", label: "Expenses", area: "writeOps" },
  { key: "reports", label: "Reports", area: "viewReports" },
  { key: "users", label: "Users", area: "manageUsers" },
  { key: "products", label: "Products", area: "writeMaster" },
  { key: "hitachi", label: "Hitachi", area: "writeOps" },
];

function canArea(role: string, area: typeof MODULES[number]["area"]): { view: boolean; write: boolean } {
  if (role === "admin") return { view: true, write: true };
  const hasAny = true; // any assigned role grants view
  const view = area === "view" || area === "viewReports" ? hasAny : true; // all assigned roles can view modules they have rows in
  let write = false;
  switch (area) {
    case "manageUsers": write = false; break;
    case "writeMaster": write = role === "staff"; break;
    case "writePayments": write = role === "staff" || role === "accountant"; break;
    case "writeBills": write = role === "staff" || role === "operator"; break;
    case "writeOps": write = role === "staff" || role === "operator"; break;
    case "viewReports": write = false; break;
    case "view": write = false; break;
  }
  return { view, write };
}

export default function UserDetailsDrawer({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("details");
  const [activity, setActivity] = useState<UserActivity[] | null>(null);
  const [loadingAct, setLoadingAct] = useState(false);
  const [busy, setBusy] = useState(false);
  const fetchAct = useServerFn(getUserActivity);
  const sendReset = useServerFn(sendPasswordReset);

  useEffect(() => {
    if (tab !== "activity" || activity) return;
    setLoadingAct(true);
    fetchAct({ data: { userId: user.id, limit: 200 } })
      .then(setActivity)
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setLoadingAct(false));
  }, [tab, activity, fetchAct, user.id]);

  const onReset = async () => {
    if (!user.email) return;
    if (!confirm(`Send password reset email to ${user.email}?`)) return;
    setBusy(true);
    try {
      await sendReset({ data: { email: user.email } });
      toast.success("Password reset email sent");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/50" />
      <div className="w-full max-w-lg bg-card border-l border-border h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h3 className="font-semibold">{user.fullName ?? "—"}</h3>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex gap-1 px-4 border-b border-border sticky top-[65px] bg-card z-10">
          {([
            { k: "details", l: "Details", i: Info },
            { k: "activity", l: "Activity", i: Activity },
            { k: "permissions", l: "Permissions", i: Shield },
          ] as const).map(({ k, l, i: Icon }) => (
            <button key={k} onClick={() => setTab(k)} className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px ${tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <Icon className="h-3.5 w-3.5" /> {l}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === "details" && (
            <div className="space-y-3">
              <Row k="Full Name" v={user.fullName ?? "—"} />
              <Row k="Email" v={user.email ?? "—"} />
              <Row k="Status" v={<span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                user.status === "active" ? "bg-green-500/15 text-green-700 border-green-500/30" :
                user.status === "pending" ? "bg-amber-500/15 text-amber-700 border-amber-500/30" :
                "bg-destructive/10 text-destructive border-destructive/30"}`}>{user.status}</span>} />
              <Row k="Roles" v={
                <div className="flex gap-1 flex-wrap">
                  {user.roles.length === 0 ? <span className="text-muted-foreground text-xs">no role</span> :
                    user.roles.map((r) => (
                      <span key={r} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${ROLE_BADGE[r] ?? ""}`}>{r}</span>
                    ))}
                </div>
              } />
              <Row k="Date Joined" v={new Date(user.createdAt).toLocaleString()} />
              <Row k="Email Confirmed" v={user.confirmedAt ? new Date(user.confirmedAt).toLocaleString() : "—"} />
              <Row k="Last Sign-in" v={user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString() : "Never"} />
              {user.bannedUntil && <Row k="Banned Until" v={new Date(user.bannedUntil).toLocaleString()} />}

              <div className="pt-3 border-t border-border space-y-2">
                <button
                  onClick={onReset}
                  disabled={busy || !user.email}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md border border-border hover:bg-accent disabled:opacity-50"
                >
                  <KeyRound className="h-4 w-4" /> Send Password Reset Email
                </button>
              </div>
            </div>
          )}

          {tab === "activity" && (
            <div>
              {loadingAct ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (activity?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No activity recorded.</p>
              ) : (
                <ul className="space-y-2">
                  {activity!.map((a) => (
                    <li key={a.id} className="p-2.5 rounded-md border border-border bg-muted/20">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold">{a.action.replaceAll("_", " ")}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(a.ts).toLocaleString()}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {a.entityType}{a.details ? ` · ${JSON.stringify(a.details)}` : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "permissions" && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="text-left p-2">Module</th>
                    <th className="text-center p-2">View</th>
                    <th className="text-center p-2">Write</th>
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((m) => {
                    const result = user.roles.length === 0
                      ? { view: false, write: false }
                      : user.roles.reduce<{ view: boolean; write: boolean }>((acc, r) => {
                          const c = canArea(r, m.area);
                          return { view: acc.view || c.view, write: acc.write || c.write };
                        }, { view: false, write: false });
                    return (
                      <tr key={m.key} className="border-t border-border">
                        <td className="p-2 font-medium">{m.label}</td>
                        <td className="p-2 text-center">{result.view ? "✓" : "—"}</td>
                        <td className="p-2 text-center">{result.write ? "✓" : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-[11px] text-muted-foreground mt-3">Derived from assigned roles. To change, edit the user's role.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}
