import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState, useMemo } from "react";
import {
  getProducts, getCompanies, saveCompany, saveBill, saveExpense,
  type BillItem, type Company,
} from "../lib/store";
import { Plus, Minus, ShoppingCart, CreditCard, Banknote, Check, X, Truck, Coins, Search } from "lucide-react";

export const Route = createFileRoute("/billing")({
  component: BillingPage,
});

const TIPS_OPTIONS = [
  { label: "No Tips", value: 0 },
  { label: "₹50 per Unit", value: 50 },
  { label: "₹100 per Unit", value: 100 },
];

function BillingPage() {
  const products = getProducts();
  const [items, setItems] = useState<BillItem[]>([]);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [driverName, setDriverName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleCapacity, setVehicleCapacity] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<"cash" | "upi" | "credit">("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [tipsRate, setTipsRate] = useState<number>(0);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [newComp, setNewComp] = useState({ name: "", driverName: "", vehicleNumber: "", vehicleCapacity: "", contactNumber: "" });
  const [suggestions, setSuggestions] = useState<Company[]>([]);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const total = items.reduce((s, i) => s + i.total, 0);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  // Tips base: vehicle capacity if set, otherwise total product quantity
  const tipsBase = useMemo(() => vehicleCapacity > 0 ? vehicleCapacity : totalQty, [vehicleCapacity, totalQty]);
  const totalTips = tipsRate * tipsBase;
  const grandTotal = total;
  const paid = paymentMode === "credit" ? Number(paidAmount || 0) : grandTotal;
  const outstanding = Math.max(0, grandTotal - paid);

  const handleVehicleSearch = (value: string) => {
    setVehicleSearch(value);
    setVehicleNumber(value);
    if (value.length >= 2) {
      const companies = getCompanies();
      const matches = companies.filter((c) => c.vehicleNumber.toLowerCase().includes(value.toLowerCase()));
      setSuggestions(matches);
      const exact = companies.find((c) => c.vehicleNumber.toLowerCase() === value.toLowerCase());
      if (exact) selectCompany(exact);
    } else {
      setSuggestions([]);
    }
  };

  const selectCompany = (c: Company) => {
    setSelectedCompany(c);
    setCompanyName(c.name);
    setDriverName(c.driverName);
    setVehicleNumber(c.vehicleNumber);
    setVehicleCapacity(c.vehicleCapacity);
    setVehicleSearch(c.vehicleNumber);
    setSuggestions([]);
    if (c.vehicleCapacity > 0) {
      setItems((prev) => prev.map((i) => ({
        ...i, quantity: c.vehicleCapacity, total: c.vehicleCapacity * i.price,
      })));
    }
  };

  const handleAddCompany = () => {
    if (!newComp.name.trim() || !newComp.vehicleNumber.trim()) return;
    const c = saveCompany({ ...newComp, vehicleCapacity: Number(newComp.vehicleCapacity) || 0 });
    selectCompany(c);
    setNewComp({ name: "", driverName: "", vehicleNumber: "", vehicleCapacity: "", contactNumber: "" });
    setShowNewCompany(false);
  };

  const addItem = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const existing = items.find((i) => i.productId === productId);
    const qty = vehicleCapacity > 0 ? vehicleCapacity : 1;
    if (existing) {
      const newQty = existing.quantity + 1;
      setItems(items.map((i) => i.productId === productId ? { ...i, quantity: newQty, total: newQty * i.price } : i));
    } else {
      setItems([...items, {
        productId, productName: product.name, price: product.price,
        quantity: qty, total: product.price * qty,
        tipsRate: 0, tipsAmount: 0,
      }]);
    }
  };

  const updateQty = (productId: string, newQty: number) => {
    if (newQty <= 0) { setItems(items.filter((i) => i.productId !== productId)); return; }
    setItems(items.map((i) => i.productId === productId ? { ...i, quantity: newQty, total: newQty * i.price } : i));
  };

  const handleSave = () => {
    if (items.length === 0) return;
    const bill = saveBill({
      items, totalAmount: grandTotal, paymentMode,
      paidAmount: paid, outstandingAmount: outstanding,
      companyId: selectedCompany?.id || "",
      companyName: companyName.trim(), driverName: driverName.trim(),
      vehicleNumber: vehicleNumber.trim(), vehicleCapacity,
      tipsRate, tipsAmount: totalTips,
    });
    if (totalTips > 0) {
      saveExpense({
        category: "tips", amount: totalTips,
        date: new Date().toISOString().split("T")[0],
        notes: `Tips ₹${tipsRate}/unit × ${tipsBase} — ${companyName.trim() || vehicleNumber.trim() || "Walk-in"} — Bill #${bill.id}`,
        linkedBillId: bill.id, linkedCompanyId: selectedCompany?.id,
      });
    }
    setSaved(true);
    setTimeout(() => {
      setItems([]); setCompanyName(""); setDriverName(""); setVehicleNumber(""); setVehicleCapacity(0);
      setSelectedCompany(null); setPaidAmount(""); setPaymentMode("cash"); setSaved(false);
      setVehicleSearch(""); setSuggestions([]); setTipsRate(0);
    }, 2000);
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="module-header">New Bill</h1>

        <div className="stat-card space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> Vehicle Lookup</h3>
          <div>
            <label className="field-label">Vehicle Number (Primary Key)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={vehicleSearch} onChange={(e) => handleVehicleSearch(e.target.value)} placeholder="Enter vehicle number e.g. MH-12-AB-1234" className="w-full rounded-md border border-input bg-secondary pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" autoFocus />
            </div>
            {suggestions.length > 0 && !selectedCompany && (
              <div className="mt-1 rounded-md border border-border bg-card max-h-40 overflow-y-auto">
                {suggestions.map((c) => (
                  <button key={c.id} onClick={() => selectCompany(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary text-foreground">
                    <span className="font-medium">{c.vehicleNumber}</span> — {c.name} {c.driverName && `(${c.driverName})`}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShowNewCompany(!showNewCompany)} className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"><Plus className="h-3 w-3" /> Add New Company</button>
          </div>

          {showNewCompany && (
            <div className="rounded-md border border-border bg-secondary/50 p-3 space-y-2">
              <div className="flex items-center justify-between"><span className="text-xs font-medium text-foreground">New Company</span><button onClick={() => setShowNewCompany(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button></div>
              <input value={newComp.name} onChange={(e) => setNewComp({ ...newComp, name: e.target.value })} placeholder="Company Name *" className="w-full rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <input value={newComp.driverName} onChange={(e) => setNewComp({ ...newComp, driverName: e.target.value })} placeholder="Driver Name" className="w-full rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <div className="grid grid-cols-2 gap-2">
                <input value={newComp.vehicleNumber} onChange={(e) => setNewComp({ ...newComp, vehicleNumber: e.target.value })} placeholder="Vehicle Number *" className="w-full rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="number" value={newComp.vehicleCapacity} onChange={(e) => setNewComp({ ...newComp, vehicleCapacity: e.target.value })} placeholder="Capacity (tons)" className="w-full rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <input value={newComp.contactNumber} onChange={(e) => setNewComp({ ...newComp, contactNumber: e.target.value })} placeholder="Contact Number" className="w-full rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <button onClick={handleAddCompany} className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">Save & Select</button>
            </div>
          )}

          {(companyName || driverName) && (
            <div className="rounded-md bg-primary/5 border border-primary/20 p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Auto-filled Details <span className="text-primary">(editable)</span></p>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-muted-foreground">Company</label><input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full rounded border border-input bg-secondary px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" /></div>
                <div><label className="text-xs text-muted-foreground">Driver</label><input value={driverName} onChange={(e) => setDriverName(e.target.value)} className="w-full rounded border border-input bg-secondary px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" /></div>
                <div><label className="text-xs text-muted-foreground">Vehicle</label><input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} className="w-full rounded border border-input bg-secondary px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" /></div>
                <div><label className="text-xs text-muted-foreground">Capacity</label><input type="number" value={vehicleCapacity || ""} onChange={(e) => setVehicleCapacity(Number(e.target.value) || 0)} className="w-full rounded border border-input bg-secondary px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" /></div>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="field-label">Add Products</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-2" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filtered.map((p) => (
              <button key={p.id} onClick={() => addItem(p.id)} className="stat-card text-left hover:border-primary/50 transition-colors">
                <p className="font-medium text-sm text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground">₹{p.price}/{p.unit}</p>
              </button>
            ))}
            {filtered.length === 0 && <p className="col-span-full text-sm text-muted-foreground text-center py-4">No products found.</p>}
          </div>
        </div>

        {items.length > 0 && (
          <div className="stat-card space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Bill Items</h3>
            {items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">₹{item.price} × {item.quantity} = ₹{item.total.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="rounded-md bg-secondary p-1 text-muted-foreground hover:text-foreground"><Minus className="h-4 w-4" /></button>
                  <input type="number" value={item.quantity} onChange={(e) => updateQty(item.productId, Number(e.target.value) || 0)} className="w-14 text-center rounded border border-input bg-secondary px-1 py-0.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                  <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="rounded-md bg-secondary p-1 text-muted-foreground hover:text-foreground"><Plus className="h-4 w-4" /></button>
                </div>
              </div>
            ))}

            {/* Tips Selector */}
            <div className="space-y-2">
              <label className="field-label flex items-center gap-1.5"><Coins className="h-3.5 w-3.5 text-warning" /> Tips</label>
              <select value={tipsRate} onChange={(e) => setTipsRate(Number(e.target.value))} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                {TIPS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {totalTips > 0 && (
                <div className="rounded-md bg-warning/10 border border-warning/20 px-3 py-2 flex justify-between text-sm">
                  <span className="text-warning">₹{tipsRate} × {tipsBase} {vehicleCapacity > 0 ? "(capacity)" : "(qty)"}</span>
                  <span className="text-warning font-bold">₹{totalTips.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="border-t border-border pt-3 flex items-center justify-between">
              <span className="font-bold text-foreground">Total</span>
              <span className="font-bold text-lg text-primary">₹{grandTotal.toLocaleString()}</span>
            </div>
          </div>
        )}

        {items.length > 0 && (
          <div className="space-y-3">
            <label className="field-label">Payment Mode</label>
            <div className="flex gap-2">
              <button onClick={() => setPaymentMode("cash")} className={`flex-1 flex items-center justify-center gap-2 rounded-md border px-3 py-3 text-sm font-medium transition-colors ${paymentMode === "cash" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                <Banknote className="h-4 w-4" /> Cash
              </button>
              <button onClick={() => setPaymentMode("upi")} className={`flex-1 flex items-center justify-center gap-2 rounded-md border px-3 py-3 text-sm font-medium transition-colors ${paymentMode === "upi" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                <CreditCard className="h-4 w-4" /> UPI
              </button>
              <button onClick={() => setPaymentMode("credit")} className={`flex-1 flex items-center justify-center gap-2 rounded-md border px-3 py-3 text-sm font-medium transition-colors ${paymentMode === "credit" ? "border-warning bg-warning/10 text-warning" : "border-border text-muted-foreground hover:text-foreground"}`}>
                <Truck className="h-4 w-4" /> Credit
              </button>
            </div>

            {paymentMode === "credit" && (
              <div className="stat-card space-y-2">
                <label className="field-label">Paid Amount (₹)</label>
                <input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} placeholder="0" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Outstanding:</span>
                  <span className="font-bold text-warning">₹{outstanding.toLocaleString()}</span>
                </div>
              </div>
            )}

            <button onClick={handleSave} disabled={saved} className={`w-full flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold transition-colors ${saved ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
              {saved ? <><Check className="h-4 w-4" /> Saved!</> : "Save Bill"}
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
