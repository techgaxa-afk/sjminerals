import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Package, Receipt, Wallet, Menu, X, Building2, Settings, BarChart3, LogOut, Loader2, UserCog, BookOpen, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles } from "@/hooks/use-roles";
import { loadAll, isLoaded, resetStore, useCloudData, onWriteError } from "@/lib/store";
import { toast } from "sonner";


type Need = "writeBills" | "writeOps" | "writePayments" | "writeMaster" | "viewReports" | "any";
type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; needs?: Need };

const navItems: readonly NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, needs: "any" },
  { to: "/companies", label: "Companies", icon: Building2, needs: "any" },
  { to: "/products", label: "Products", icon: Package, needs: "any" },
  { to: "/billing", label: "New Bill", icon: Receipt, needs: "writeBills" },
  { to: "/bills", label: "Bills", icon: Receipt, needs: "any" },
  { to: "/hitachi", label: "Hitachi", icon: Settings, needs: "writeOps" },
  { to: "/expenses", label: "Expenses", icon: Wallet, needs: "writeOps" },
  { to: "/cashbook", label: "Cashbook", icon: BookOpen, needs: "viewReports" },
  { to: "/profitability", label: "Profitability", icon: TrendingUp, needs: "viewReports" },
  { to: "/reports", label: "Reports", icon: BarChart3, needs: "viewReports" },
];

const adminNavItems: readonly NavItem[] = [
  { to: "/users", label: "Users", icon: UserCog },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, loading, signOut, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  useCloudData();
  const { isAdmin, hasAny, can, loading: rolesLoading } = useUserRoles();
  const items: NavItem[] = [
    ...navItems.filter((i) => {
      if (!i.needs || i.needs === "any") return hasAny || isAdmin;
      return can(i.needs);
    }),
    ...(isAdmin ? adminNavItems : []),
  ];
  const [dataReady, setDataReady] = useState(isLoaded());

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [session, loading, navigate]);

  useEffect(() => {
    if (session && !isLoaded()) {
      loadAll().then(() => setDataReady(true)).catch((e) => { console.error(e); setDataReady(true); });
    } else if (session) {
      setDataReady(true);
    }
  }, [session]);

  useEffect(() => {
    return onWriteError((msg) => toast.error("Cloud save failed", { description: msg }));
  }, []);


  if (loading || !session || !dataReady || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleLogout = async () => { resetStore(); await signOut(); navigate({ to: "/login" }); };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-3 md:justify-between">
          <div className="flex min-w-0 items-center gap-2">
          <Package className="h-6 w-6 text-primary" />
            <span className="truncate text-lg font-bold tracking-tight text-foreground">SJ Minerals</span>
          </div>
          <nav className="hidden basis-full flex-wrap items-center gap-1 pt-1 md:flex xl:basis-auto xl:flex-1 xl:justify-center xl:pt-0">
            {items.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to} className={`nav-item ${active ? "nav-item-active" : "nav-item-inactive"}`}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden xl:inline text-xs text-muted-foreground max-w-[160px] truncate">{user?.email}</span>
            <button onClick={handleLogout} title="Sign out" className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary md:hidden">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <nav className="border-b border-border bg-card px-4 py-2 md:hidden">
          {items.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to} onClick={() => setMenuOpen(false)} className={`nav-item ${active ? "nav-item-active" : "nav-item-inactive"}`}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}

      <main className="flex-1 px-4 py-6 max-w-5xl mx-auto w-full">{children}</main>
    </div>
  );
}
