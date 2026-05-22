import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Package, Receipt, Truck, Wallet, Menu, X, Building2, Settings, BarChart3, LogOut, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { loadAll, isLoaded, resetStore, useCloudData } from "@/lib/store";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/companies", label: "Companies", icon: Building2 },
  { to: "/products", label: "Products", icon: Package },
  { to: "/billing", label: "New Bill", icon: Receipt },
  { to: "/bills", label: "Bills", icon: Receipt },
  { to: "/hitachi", label: "Hitachi", icon: Settings },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/reports", label: "Reports", icon: BarChart3 },
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, loading, signOut, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [session, loading, navigate]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleLogout = async () => { await signOut(); navigate({ to: "/login" }); };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight text-foreground">MinePOS</span>
        </div>
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to} className={`nav-item ${active ? "nav-item-active" : "nav-item-inactive"}`}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden md:inline text-xs text-muted-foreground max-w-[160px] truncate">{user?.email}</span>
          <button onClick={handleLogout} title="Sign out" className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
          <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary md:hidden">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <nav className="border-b border-border bg-card px-4 py-2 md:hidden">
          {navItems.map((item) => {
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
