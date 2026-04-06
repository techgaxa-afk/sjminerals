import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState } from "react";
import { getBills, type Bill } from "../lib/store";
import { Search, Banknote, CreditCard, FileDown, Truck, Building2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { exportInvoicePDF } from "../lib/pdf";

export const Route = createFileRoute("/bills")({
  component: BillsPage,
});

function BillsPage() {
  const bills = getBills().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = bills.filter(
    (b) => b.customerName.toLowerCase().includes(search.toLowerCase()) ||
      b.id.includes(search) ||
      (b.vehicleNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.companyName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="module-header">Bill History</h1>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by customer, company, vehicle..." className="w-full rounded-md border border-input bg-secondary pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <div className="space-y-2">
          {filtered.map((bill) => (
            <div key={bill.id} className="stat-card">
              <div className="cursor-pointer" onClick={() => setExpandedId(expandedId === bill.id ? null : bill.id)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{bill.customerName}</p>
                    {bill.companyName && <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" /> {bill.companyName}</p>}
                    {bill.vehicleNumber && <p className="text-xs text-muted-foreground flex items-center gap-1"><Truck className="h-3 w-3" /> {bill.vehicleNumber} {bill.vehicleCapacity && `(${bill.vehicleCapacity})`}</p>}
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
              </div>
              {expandedId === bill.id && (
                <div className="mt-3 border-t border-border pt-3 space-y-2">
                  {bill.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.productName} × {item.quantity}</span>
                      <span className="text-foreground">₹{item.total.toLocaleString()}</span>
                    </div>
                  ))}
                  <button onClick={() => exportInvoicePDF(bill)} className="mt-2 flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors">
                    <FileDown className="h-3 w-3" /> Export PDF
                  </button>
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
