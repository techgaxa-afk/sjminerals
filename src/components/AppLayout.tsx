import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Package, Receipt, Truck, Wallet, Menu, X, Users } from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/products", label: "Products", icon: Package },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/billing", label: "New Bill", icon: Receipt },
  { to: "/bills", label: "Bill History", icon: Receipt },
  { to: "/jcb", label: "JCB Tracker", icon: Truck },
  { to: "/expenses", label: "Expenses", icon: Wallet },
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight text-foreground">MinePOS</span>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary md:hidden">
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
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
