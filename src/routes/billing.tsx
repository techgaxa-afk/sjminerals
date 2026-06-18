import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  getProducts, getCompanies, saveBill, saveExpense,
  getVehicles, saveVehicle,
  type BillItem, type Company, type Vehicle,
} from "../lib/store";
import { Plus, Minus, ShoppingCart, CreditCard, Banknote, Check, X, Truck, Coins, Search, ChevronDown, ChevronRight } from "lucide-react";


export const Route = createFileRoute("/billing")({
  component: BillingPage,
});

const DEFAULT_PASS_AMOUNT = 1600;

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
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitCash, setSplitCash] = useState("");
  const [splitUpi, setSplitUpi] = useState("");
  const [passEnabled, setPassEnabled] = useState(false);
  const [passAmount, setPassAmount] = useState<number>(DEFAULT_PASS_AMOUNT);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreateVehicle, setShowCreateVehicle] = useState(false);
  const [newVeh, setNewVeh] = useState({ companyId: "", vehicleNumber: "", driverName: "", vehicleCapacity: "" });
  type Suggestion = { company: Company; vehicle: Vehicle };
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);


  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const sortByName = (a: typeof products[number], b: typeof products[number]) => a.name.localeCompare(b.name);
  const bouldersProducts = useMemo(() => filtered.filter((p) => p.productCategory === "BOULDERS").sort(sortByName), [filtered]);
  const kkProducts = useMemo(() => filtered.filter((p) => p.productCategory === "K.K").sort(sortByName), [filtered]);
  const otherProducts = useMemo(() => filtered.filter((p) => p.productCategory !== "BOULDERS" && p.productCategory !== "K.K").sort(sortByName), [filtered]);
  const [othersOpen, setOthersOpen] = useState(false);
  const total = items.reduce((s, i) => s + i.total, 0);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const tipsBase = useMemo(() => vehicleCapacity > 0 ? vehicleCapacity : totalQty, [vehicleCapacity, totalQty]);
  const totalTips = tipsRate * tipsBase;
  const passCharge = passEnabled ? (Number(passAmount) || 0) : 0;
  const grandTotal = total + totalTips + passCharge;
  const splitCashNum = Number(splitCash) || 0;
  const splitUpiNum = Number(splitUpi) || 0;
  const paid = splitEnabled
    ? Math.min(grandTotal, splitCashNum + splitUpiNum)
    : (paymentMode === "credit" ? Number(paidAmount || 0) : grandTotal);
  const outstanding = Math.max(0, grandTotal - paid);

  const handleVehicleSearch = (value: string) => {
    setVehicleSearch(value);
    setVehicleNumber(value);
    if (value.length >= 2) {
      const v = value.toLowerCase();
      const vehs = getVehicles().filter((x) => x.vehicleNumber.toLowerCase().includes(v));
      const cos = getCompanies();
      const matches: Suggestion[] = [];
      const seen = new Set<string>();
      vehs.forEach((vh) => {
        const c = cos.find((co) => co.id === vh.companyId);
        if (c && !seen.has(c.id + "|" + vh.id)) {
          seen.add(c.id + "|" + vh.id);
          matches.push({ company: c, vehicle: vh });
        }
      });
      setSuggestions(matches);
      const exact = matches.find((m) => m.vehicle.vehicleNumber.toLowerCase() === v);
      if (exact) selectSuggestion(exact);
    } else {
      setSuggestions([]);
    }
  };

  const selectSuggestion = (s: Suggestion) => {
    setSelectedCompany(s.company);
    setCompanyName(s.company.name);
    setDriverName(s.vehicle.driverName);
    setVehicleNumber(s.vehicle.vehicleNumber);
    setVehicleCapacity(s.vehicle.vehicleCapacity);
    setVehicleSearch(s.vehicle.vehicleNumber);
    setSuggestions([]);
    if (s.vehicle.vehicleCapacity > 0) {
      setItems((prev) => prev.map((i) => ({
        ...i, quantity: s.vehicle.vehicleCapacity, total: s.vehicle.vehicleCapacity * i.price,
      })));
    }
  };

  const pickVehicle = (companyId: string, v: Vehicle) => {
    const c = getCompanies().find((x) => x.id === companyId);
    if (!c) return;
    selectSuggestion({ company: c, vehicle: v });
  };

  const openCreateVehicle = () => {
    const cos = getCompanies();
    setNewVeh({
      companyId: cos[0]?.id ?? "",
      vehicleNumber: vehicleSearch.trim(),
      driverName: "",
      vehicleCapacity: "",
    });
    setShowCreateVehicle(true);
  };

  const handleCreateVehicle = async () => {
    if (!newVeh.companyId) { toast.error("Select a company"); return; }
    if (!newVeh.vehicleNumber.trim()) { toast.error("Vehicle number is required"); return; }
    try {
      const vehicle = await saveVehicle({
        companyId: newVeh.companyId,
        vehicleNumber: newVeh.vehicleNumber.trim(),
        driverName: newVeh.driverName.trim(),
        vehicleCapacity: Number(newVeh.vehicleCapacity) || 0,
        status: "active",
      });
      const company = getCompanies().find((c) => c.id === newVeh.companyId);
      if (company) {
        selectSuggestion({ company, vehicle });
      }
      setShowCreateVehicle(false);
      setNewVeh({ companyId: "", vehicleNumber: "", driverName: "", vehicleCapacity: "" });
      toast.success("Vehicle created");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create vehicle");
    }
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

  const handleSave = async () => {
    if (items.length === 0) return;
    const effectiveMode: "cash" | "upi" | "credit" | "split" = splitEnabled ? "split" : paymentMode;
    const cashAmt = splitEnabled ? splitCashNum : (paymentMode === "cash" ? paid : 0);
    const upiAmt = splitEnabled ? splitUpiNum : (paymentMode === "upi" ? paid : 0);
    try {
      const bill = await saveBill({
        items, totalAmount: grandTotal, paymentMode: effectiveMode,
        paidAmount: paid, outstandingAmount: outstanding,
        companyId: selectedCompany?.id || "",
        companyName: companyName.trim(), driverName: driverName.trim(),
        vehicleNumber: vehicleNumber.trim(), vehicleCapacity,
        tipsRate, tipsAmount: totalTips,
        splitPayment: splitEnabled, cashAmount: cashAmt, upiAmount: upiAmt,
        passEnabled, passAmount: passCharge,
      });
      if (totalTips > 0) {
        saveExpense({
          category: "tips", amount: totalTips,
          date: new Date().toISOString().split("T")[0],
          notes: `Tips ₹${tipsRate}/unit × ${tipsBase} — ${companyName.trim() || vehicleNumber.trim() || "Walk-in"} — Bill #${bill.id}`,
          paymentMode: "cash",
          linkedBillId: bill.id, linkedCompanyId: selectedCompany?.id,
        });
      }
      setSaved(true);
      setTimeout(() => {
        setItems([]); setCompanyName(""); setDriverName(""); setVehicleNumber(""); setVehicleCapacity(0);
        setSelectedCompany(null); setPaidAmount(""); setPaymentMode("cash"); setSaved(false);
        setVehicleSearch(""); setSuggestions([]); setTipsRate(0);
        setSplitEnabled(false); setSplitCash(""); setSplitUpi("");
        setPassEnabled(false); setPassAmount(DEFAULT_PASS_AMOUNT);
      }, 2000);
    } catch (error) {
      console.error("BILLING SAVE UI FAILED", error);
    }
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
                {suggestions.map((s) => (
                  <button key={s.company.id + "|" + s.vehicle.id} onClick={() => selectSuggestion(s)} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary text-foreground">
                    <span className="font-medium">{s.vehicle.vehicleNumber}</span> — {s.company.name} {s.vehicle.driverName && `(${s.vehicle.driverName})`}
                  </button>
                ))}
              </div>
            )}
            {vehicleSearch.trim().length >= 2 && suggestions.length === 0 && !selectedCompany && !showCreateVehicle && (
              <div className="mt-2 rounded-md border border-dashed border-border bg-secondary/40 p-3 flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">Vehicle not found</p>
                <button onClick={openCreateVehicle} className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-3 w-3" /> Create Vehicle</button>
              </div>
            )}
          </div>

          {showCreateVehicle && (
            <div className="rounded-md border border-border bg-secondary/50 p-3 space-y-2">
              <div className="flex items-center justify-between"><span className="text-xs font-medium text-foreground">Create Vehicle</span><button onClick={() => setShowCreateVehicle(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button></div>
              <div>
                <label className="text-xs text-muted-foreground">Existing Company *</label>
                <select value={newVeh.companyId} onChange={(e) => setNewVeh({ ...newVeh, companyId: e.target.value })} className="w-full rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">— Select company —</option>
                  {getCompanies().map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {getCompanies().length === 0 && <p className="text-[11px] text-warning mt-1">No companies exist. Create one in the Companies page first.</p>}
              </div>
              <input value={newVeh.vehicleNumber} onChange={(e) => setNewVeh({ ...newVeh, vehicleNumber: e.target.value })} placeholder="Vehicle Number *" className="w-full rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <input value={newVeh.driverName} onChange={(e) => setNewVeh({ ...newVeh, driverName: e.target.value })} placeholder="Driver Name" className="w-full rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <input type="number" value={newVeh.vehicleCapacity} onChange={(e) => setNewVeh({ ...newVeh, vehicleCapacity: e.target.value })} placeholder="Capacity (tons)" className="w-full rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <button onClick={handleCreateVehicle} className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">Save & Select</button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ProductGrid title="BOULDERS" products={bouldersProducts} items={items} onAdd={addItem} />
            <ProductGrid title="K.K" products={kkProducts} items={items} onAdd={addItem} />
          </div>
          {otherProducts.length > 0 && (
            <div className="mt-3 border border-border rounded-md overflow-hidden">
              <button type="button" onClick={() => setOthersOpen((o) => !o)} className="w-full flex items-center gap-2 px-3 py-2 bg-secondary/60 hover:bg-secondary text-sm font-semibold text-foreground">
                {othersOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span>Others</span>
                <span className="ml-auto text-xs text-muted-foreground">{otherProducts.length}</span>
              </button>
              {othersOpen && (
                <div className="p-3">
                  <ProductGrid products={otherProducts} items={items} onAdd={addItem} />
                </div>
              )}
            </div>
          )}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No products found.</p>}
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

            {/* Pass Toggle */}
            <div className="space-y-2">
              <button onClick={() => setPassEnabled(!passEnabled)} className={`w-full text-xs rounded-md border px-3 py-2 font-medium transition-colors ${passEnabled ? "border-primary bg-primary/10 text-primary" : "border-dashed border-border text-muted-foreground hover:text-foreground"}`}>
                {passEnabled ? `✓ Pass Added (₹${(Number(passAmount) || 0).toLocaleString()}) — Click to Remove` : "+ Add Pass (₹1600)"}
              </button>
              {passEnabled && (
                <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2 space-y-1.5">
                  <label className="text-xs text-muted-foreground">Pass Amount (₹)</label>
                  <input type="number" value={passAmount} onChange={(e) => setPassAmount(Number(e.target.value) || 0)} className="w-full rounded border border-input bg-secondary px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
              )}
            </div>

            <div className="border-t border-border pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">₹{total.toLocaleString()}</span></div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tips {tipsRate > 0 ? <span className="text-xs">(₹{tipsRate}/unit × {tipsBase})</span> : "(No Tips)"}</span>
                <span className="text-warning">₹{totalTips.toLocaleString()}</span>
              </div>
              {passEnabled && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pass</span>
                  <span className="text-primary">₹{passCharge.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between pt-1.5 border-t border-border">
                <span className="font-bold text-foreground">Grand Total</span>
                <span className="font-bold text-lg text-primary">₹{grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {items.length > 0 && (
          <div className="space-y-3">
            <label className="field-label">Payment Mode</label>
            <div className={splitEnabled ? "opacity-50 pointer-events-none" : ""}>
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

            {paymentMode === "credit" && !splitEnabled && (
              <div className="stat-card mt-2 space-y-2">
                <label className="field-label">Paid Amount (₹)</label>
                <input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} placeholder="0" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Outstanding:</span>
                  <span className="font-bold text-warning">₹{outstanding.toLocaleString()}</span>
                </div>
              </div>
            )}
            </div>

            <button onClick={() => setSplitEnabled(!splitEnabled)} className={`w-full text-xs rounded-md border px-3 py-2 font-medium transition-colors ${splitEnabled ? "border-primary bg-primary/10 text-primary" : "border-dashed border-border text-muted-foreground hover:text-foreground"}`}>
              {splitEnabled ? "✓ Split Payment Enabled — Click to Disable" : "+ Enable Split Payment (Cash + UPI)"}
            </button>

            {splitEnabled && (
              <div className="stat-card space-y-2 border-primary/30">
                <p className="text-xs font-semibold text-primary">Split Payment Breakdown</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="field-label flex items-center gap-1"><Banknote className="h-3 w-3 text-success" /> Cash (₹)</label>
                    <input type="number" value={splitCash} onChange={(e) => setSplitCash(e.target.value)} placeholder="0" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="field-label flex items-center gap-1"><CreditCard className="h-3 w-3 text-primary" /> UPI (₹)</label>
                    <input type="number" value={splitUpi} onChange={(e) => setSplitUpi(e.target.value)} placeholder="0" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
                <div className="border-t border-border pt-2 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Paid</span><span className="text-success font-medium">₹{paid.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Outstanding</span><span className={`font-bold ${outstanding > 0 ? "text-warning" : "text-success"}`}>₹{outstanding.toLocaleString()}</span></div>
                  <div className="text-xs text-center pt-1">
                    {outstanding === 0 && paid > 0 ? <span className="text-success font-semibold">PAID IN FULL</span> : paid > 0 ? <span className="text-warning font-semibold">PARTIALLY PAID</span> : <span className="text-muted-foreground">Enter amounts</span>}
                  </div>
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
