import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState } from "react";
import { getBills, savePayment, getPaymentsByBill, type Bill } from "../lib/store";
import { Search, Banknote, CreditCard, FileDown, Truck, Building2, AlertTriangle, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { exportInvoicePDF } from "../lib/pdf";

export const Route = createFileRoute("/bills")({
  component: BillsPage,
});

function BillsPage() {
  const [bills, setBills] = useState(() => getBills().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payBillId, setPayBillId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");

  const filtered = bills.filter(
    (b) => b.customerName.toLowerCase().includes(search.toLowerCase()) ||
      b.id.includes(search) ||
      (b.vehicleNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.companyName || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.driverName || "").toLowerCase().includes(search.toLowerCase())
  );

  const handlePayment = (billId: string, companyId?: string) => {
    if (!payAmount.trim() || Number(payAmount) <= 0) return;
    savePayment({ billId, companyId, amount: Number(payAmount), date: new Date().toISOString().split("T")[0], notes: "Payment" });
    setBills(getBills().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setPayBillId(null);
    setPayAmount("");
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="module-header">Bill History</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by customer, company, driver, vehicle..." className="w-full rounded-md border border-input bg-secondary pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <div className="space-y-2">
          {filtered.map((bill) => (
            <div key={bill.id} className="stat-card">
              <div className="cursor-pointer" onClick={() => setExpandedId(expandedId === bill.id ? null : bill.id)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{bill.customerName}</p>
                    {bill.companyName && <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" /> {bill.companyName}</p>}
                    {bill.driverName && <p className="text-xs text-muted-foreground">Driver: {bill.driverName}</p>}
                    {bill.vehicleNumber && <p className="text-xs text-muted-foreground flex items-center gap-1"><Truck className="h-3 w-3" /> {bill.vehicleNumber} {bill.vehicleCapacity && `(${bill.vehicleCapacity})`}</p>}
                    <p className="text-xs text-muted-foreground">{format(parseISO(bill.createdAt), "dd MMM yyyy, hh:mm a")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">₹{bill.totalAmount.toLocaleString()}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {bill.paymentMode === "cash" ? <Banknote className="h-3 w-3" /> : bill.paymentMode === "credit" ? <AlertTriangle className="h-3 w-3 text-warning" /> : <CreditCard className="h-3 w-3" />}
                      {bill.paymentMode.toUpperCase()}
                    </div>
                    {bill.outstandingAmount > 0 && <p className="text-xs font-semibold text-warning">Due: ₹{bill.outstandingAmount.toLocaleString()}</p>}
                    {bill.tipsAmount > 0 && <p className="text-xs text-muted-foreground">Tips: ₹{bill.tipsAmount.toLocaleString()}</p>}
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
                  {bill.tipsAmount > 0 && (
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tips (₹{bill.tipsPerUnit}/unit)</span><span className="text-warning">₹{bill.tipsAmount.toLocaleString()}</span></div>
                  )}

                  {/* Payment history for credit bills */}
                  {bill.paymentMode === "credit" && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Payments</p>
                      <p className="text-xs text-foreground">Initial: ₹{bill.paidAmount.toLocaleString()}</p>
                      {getPaymentsByBill(bill.id).map((p) => (
                        <p key={p.id} className="text-xs text-success">+₹{p.amount.toLocaleString()} on {p.date}</p>
                      ))}
                      {bill.outstandingAmount > 0 && (
                        payBillId === bill.id ? (
                          <div className="flex items-center gap-1 mt-1">
                            <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="₹" className="w-24 rounded border border-input bg-secondary px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                            <button onClick={() => handlePayment(bill.id, bill.companyId)} className="rounded bg-success px-2 py-1 text-xs text-success-foreground">Pay</button>
                            <button onClick={() => setPayBillId(null)} className="text-muted-foreground"><X className="h-3 w-3" /></button>
                          </div>
                        ) : (
                          <button onClick={() => { setPayBillId(bill.id); setPayAmount(""); }} className="mt-1 rounded bg-warning/10 border border-warning/20 px-2 py-1 text-xs text-warning hover:bg-warning/20">Add Payment</button>
                        )
                      )}
                    </div>
                  )}

                  <button onClick={() => exportInvoicePDF(bill)} className="mt-2 flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"><FileDown className="h-3 w-3" /> Export PDF</button>
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
