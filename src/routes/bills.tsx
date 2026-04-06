import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState } from "react";
import { getBills } from "../lib/store";
import { Search, Banknote, CreditCard } from "lucide-react";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/bills")({
  component: BillsPage,
});

function BillsPage() {
  const bills = getBills().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = bills.filter((b) => b.customerName.toLowerCase().includes(search.toLowerCase()) || b.id.includes(search));

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="module-header">Bill History</h1>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by customer..." className="w-full rounded-md border border-input bg-secondary pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <div className="space-y-2">
          {filtered.map((bill) => (
            <div key={bill.id} className="stat-card cursor-pointer" onClick={() => setExpandedId(expandedId === bill.id ? null : bill.id)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{bill.customerName}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(bill.createdAt), "dd MMM yyyy, hh:mm a")}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">₹{bill.totalAmount.toLocaleString()}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {bill.paymentMode === "cash" ? <Banknote className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                    {bill.paymentMode.toUpperCase()}
                  </div>
                </div>
              </div>
              {expandedId === bill.id && (
                <div className="mt-3 border-t border-border pt-3 space-y-1">
                  {bill.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.productName} × {item.quantity}</span>
                      <span className="text-foreground">₹{item.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No bills found.</p>}
        </div>
      </div>
    </AppLayout>
  );
}
