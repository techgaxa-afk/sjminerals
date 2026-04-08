import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState } from "react";
import {
  getProducts, getCustomers, getCompanies, getDriversByCompany, getVehiclesByCompany,
  saveCustomer, saveCompany, saveDriver, saveVehicle, saveBill, saveExpense,
  type BillItem, type Customer, type Company, type Driver, type Vehicle,
} from "../lib/store";
import { Plus, Minus, ShoppingCart, CreditCard, Banknote, Check, UserPlus, X, Building2, Truck, Coins } from "lucide-react";

export const Route = createFileRoute("/billing")({
  component: BillingPage,
});

function BillingPage() {
  const products = getProducts();
  const [customers, setCustomers] = useState(getCustomers);
  const [companies, setCompanies] = useState(getCompanies);
  const [items, setItems] = useState<BillItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleCapacity, setVehicleCapacity] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [paymentMode, setPaymentMode] = useState<"cash" | "upi" | "credit">("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [tipsPerUnit, setTipsPerUnit] = useState("");
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [showNewDriver, setShowNewDriver] = useState(false);
  const [showNewVehicle, setShowNewVehicle] = useState(false);
  const [newCust, setNewCust] = useState({ name: "", companyName: "", phone: "", address: "" });
  const [newComp, setNewComp] = useState({ name: "", contactDetails: "", address: "" });
  const [newDriver, setNewDriver] = useState({ name: "", phone: "" });
  const [newVehicle, setNewVehicle] = useState({ number: "", capacity: "" });
  const [customerSearch, setCustomerSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const total = items.reduce((s, i) => s + i.total, 0);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const tipsAmount = Number(tipsPerUnit || 0) * totalQty;
  const grandTotal = total;
  const paid = paymentMode === "credit" ? Number(paidAmount || 0) : grandTotal;
  const outstanding = Math.max(0, grandTotal - paid);

  const filteredCustomers = customers.filter(
    (c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.companyName.toLowerCase().includes(customerSearch.toLowerCase())
  );
  const filteredCompanies = companies.filter(
    (c) => c.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const selectCompany = (c: Company) => {
    setSelectedCompanyId(c.id);
    setCompanyName(c.name);
    setCompanySearch("");
    setDrivers(getDriversByCompany(c.id));
    setVehicles(getVehiclesByCompany(c.id));
    setSelectedDriverId("");
    setDriverName("");
    setSelectedVehicleId("");
    setVehicleNumber("");
    setVehicleCapacity("");
  };

  const selectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerSearch("");
    if (c.companyName) {
      setCompanyName(c.companyName);
      const comp = companies.find((co) => co.name.toLowerCase() === c.companyName.toLowerCase());
      if (comp) selectCompany(comp);
    }
  };

  const handleAddCustomer = () => {
    if (!newCust.name.trim()) return;
    const c = saveCustomer(newCust);
    setCustomers(getCustomers());
    selectCustomer(c);
    setNewCust({ name: "", companyName: "", phone: "", address: "" });
    setShowNewCustomer(false);
  };

  const handleAddCompany = () => {
    if (!newComp.name.trim()) return;
    const c = saveCompany(newComp);
    setCompanies(getCompanies());
    selectCompany(c);
    setNewComp({ name: "", contactDetails: "", address: "" });
    setShowNewCompany(false);
  };

  const handleAddDriver = () => {
    if (!newDriver.name.trim() || !selectedCompanyId) return;
    const d = saveDriver({ ...newDriver, companyId: selectedCompanyId });
    setDrivers(getDriversByCompany(selectedCompanyId));
    setSelectedDriverId(d.id);
    setDriverName(d.name);
    setNewDriver({ name: "", phone: "" });
    setShowNewDriver(false);
  };

  const handleAddVehicle = () => {
    if (!newVehicle.number.trim() || !selectedCompanyId) return;
    const v = saveVehicle({ ...newVehicle, companyId: selectedCompanyId });
    setVehicles(getVehiclesByCompany(selectedCompanyId));
    setSelectedVehicleId(v.id);
    setVehicleNumber(v.number);
    setVehicleCapacity(v.capacity);
    setNewVehicle({ number: "", capacity: "" });
    setShowNewVehicle(false);
  };

  const addItem = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const existing = items.find((i) => i.productId === productId);
    if (existing) {
      setItems(items.map((i) => i.productId === productId ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price } : i));
    } else {
      setItems([...items, { productId, productName: product.name, price: product.price, quantity: 1, total: product.price }]);
    }
  };

  const updateQty = (productId: string, delta: number) => {
    setItems(items.map((i) => {
      if (i.productId !== productId) return i;
      const qty = Math.max(0, i.quantity + delta);
      return { ...i, quantity: qty, total: qty * i.price };
    }).filter((i) => i.quantity > 0));
  };

  const handleSave = () => {
    if (items.length === 0) return;
    const bill = saveBill({
      items,
      totalAmount: grandTotal,
      paymentMode,
      paidAmount: paid,
      outstandingAmount: outstanding,
      customerName: customerName.trim() || "Walk-in",
      companyName: companyName.trim(),
      companyId: selectedCompanyId || undefined,
      driverId: selectedDriverId || undefined,
      driverName: driverName.trim() || undefined,
      vehicleId: selectedVehicleId || undefined,
      vehicleNumber: vehicleNumber.trim(),
      vehicleCapacity: vehicleCapacity.trim(),
      customerId: selectedCustomerId || undefined,
      tipsAmount,
      tipsPerUnit: Number(tipsPerUnit || 0),
    });
    // Save tips as expense if applicable
    if (tipsAmount > 0) {
      saveExpense({
        category: "tips",
        amount: tipsAmount,
        date: new Date().toISOString().split("T")[0],
        notes: `Tips for ${customerName.trim() || "Walk-in"} - Bill #${bill.id}`,
        linkedBillId: bill.id,
        linkedCompanyId: selectedCompanyId || undefined,
      });
    }
    setSaved(true);
    setTimeout(() => {
      setItems([]);
      setCustomerName(""); setCompanyName(""); setVehicleNumber(""); setVehicleCapacity("");
      setSelectedCustomerId(""); setSelectedCompanyId(""); setSelectedDriverId(""); setSelectedVehicleId("");
      setDriverName(""); setPaidAmount(""); setTipsPerUnit("");
      setPaymentMode("cash"); setSaved(false);
      setDrivers([]); setVehicles([]);
    }, 2000);
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="module-header">New Bill</h1>

        {/* Company selection */}
        <div className="stat-card space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Company & Customer</h3>

          <div>
            <label className="field-label">Company</label>
            <input value={companySearch || companyName} onChange={(e) => { setCompanySearch(e.target.value); setCompanyName(e.target.value); setSelectedCompanyId(""); }} placeholder="Search company..." className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            {companySearch && filteredCompanies.length > 0 && (
              <div className="mt-1 rounded-md border border-border bg-card max-h-32 overflow-y-auto">
                {filteredCompanies.map((c) => (
                  <button key={c.id} onClick={() => selectCompany(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary text-foreground">{c.name}</button>
                ))}
              </div>
            )}
            <button onClick={() => setShowNewCompany(!showNewCompany)} className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"><Plus className="h-3 w-3" /> Add Company</button>
          </div>

          {showNewCompany && (
            <div className="rounded-md border border-border bg-secondary/50 p-3 space-y-2">
              <div className="flex items-center justify-between"><span className="text-xs font-medium text-foreground">New Company</span><button onClick={() => setShowNewCompany(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button></div>
              <input value={newComp.name} onChange={(e) => setNewComp({ ...newComp, name: e.target.value })} placeholder="Company Name *" className="w-full rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <input value={newComp.contactDetails} onChange={(e) => setNewComp({ ...newComp, contactDetails: e.target.value })} placeholder="Contact Details" className="w-full rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <input value={newComp.address} onChange={(e) => setNewComp({ ...newComp, address: e.target.value })} placeholder="Address" className="w-full rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <button onClick={handleAddCompany} className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">Save & Select</button>
            </div>
          )}

          {/* Driver selection */}
          {selectedCompanyId && (
            <div>
              <label className="field-label">Driver</label>
              <select value={selectedDriverId} onChange={(e) => { setSelectedDriverId(e.target.value); const d = drivers.find((dr) => dr.id === e.target.value); setDriverName(d?.name || ""); }} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select driver...</option>
                {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <button onClick={() => setShowNewDriver(!showNewDriver)} className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"><Plus className="h-3 w-3" /> Add Driver</button>
              {showNewDriver && (
                <div className="mt-2 rounded-md border border-border bg-secondary/50 p-3 space-y-2">
                  <input value={newDriver.name} onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })} placeholder="Driver Name *" className="w-full rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  <input value={newDriver.phone} onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })} placeholder="Phone" className="w-full rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  <button onClick={handleAddDriver} className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">Save Driver</button>
                </div>
              )}
            </div>
          )}

          {/* Vehicle selection */}
          {selectedCompanyId && (
            <div>
              <label className="field-label">Vehicle</label>
              <select value={selectedVehicleId} onChange={(e) => { setSelectedVehicleId(e.target.value); const v = vehicles.find((vh) => vh.id === e.target.value); setVehicleNumber(v?.number || ""); setVehicleCapacity(v?.capacity || ""); }} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select vehicle...</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.number} ({v.capacity})</option>)}
              </select>
              <button onClick={() => setShowNewVehicle(!showNewVehicle)} className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"><Plus className="h-3 w-3" /> Add Vehicle</button>
              {showNewVehicle && (
                <div className="mt-2 rounded-md border border-border bg-secondary/50 p-3 space-y-2">
                  <input value={newVehicle.number} onChange={(e) => setNewVehicle({ ...newVehicle, number: e.target.value })} placeholder="Vehicle Number *" className="w-full rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  <input value={newVehicle.capacity} onChange={(e) => setNewVehicle({ ...newVehicle, capacity: e.target.value })} placeholder="Capacity (e.g. 10 tons)" className="w-full rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  <button onClick={handleAddVehicle} className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">Save Vehicle</button>
                </div>
              )}
            </div>
          )}

          {/* Manual vehicle if no company */}
          {!selectedCompanyId && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="field-label">Vehicle Number</label><input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="MH-12-AB-1234" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="field-label">Vehicle Capacity</label><input value={vehicleCapacity} onChange={(e) => setVehicleCapacity(e.target.value)} placeholder="10 tons" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            </div>
          )}

          {/* Customer */}
          <div>
            <label className="field-label">Customer Name</label>
            <input value={customerSearch || customerName} onChange={(e) => { setCustomerSearch(e.target.value); setCustomerName(e.target.value); setSelectedCustomerId(""); }} placeholder="Search or type customer..." className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            {customerSearch && filteredCustomers.length > 0 && (
              <div className="mt-1 rounded-md border border-border bg-card max-h-32 overflow-y-auto">
                {filteredCustomers.map((c) => (
                  <button key={c.id} onClick={() => selectCustomer(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary text-foreground">
                    <span className="font-medium">{c.name}</span>{c.companyName && <span className="text-muted-foreground"> — {c.companyName}</span>}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShowNewCustomer(!showNewCustomer)} className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"><UserPlus className="h-3 w-3" /> Quick add customer</button>
          </div>

          {showNewCustomer && (
            <div className="rounded-md border border-border bg-secondary/50 p-3 space-y-2">
              <div className="flex items-center justify-between"><span className="text-xs font-medium text-foreground">New Customer</span><button onClick={() => setShowNewCustomer(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button></div>
              <input value={newCust.name} onChange={(e) => setNewCust({ ...newCust, name: e.target.value })} placeholder="Name *" className="w-full rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <input value={newCust.companyName} onChange={(e) => setNewCust({ ...newCust, companyName: e.target.value })} placeholder="Company" className="w-full rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <button onClick={handleAddCustomer} className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">Save & Select</button>
            </div>
          )}
        </div>

        {/* Product picker */}
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

        {/* Bill items */}
        {items.length > 0 && (
          <div className="stat-card space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Bill Items</h3>
            {items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">₹{item.price} × {item.quantity} = ₹{item.total.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.productId, -1)} className="rounded-md bg-secondary p-1 text-muted-foreground hover:text-foreground"><Minus className="h-4 w-4" /></button>
                  <span className="text-sm font-medium w-6 text-center text-foreground">{item.quantity}</span>
                  <button onClick={() => updateQty(item.productId, 1)} className="rounded-md bg-secondary p-1 text-muted-foreground hover:text-foreground"><Plus className="h-4 w-4" /></button>
                </div>
              </div>
            ))}

            {/* Tips */}
            <div className="border-t border-border pt-3">
              <label className="field-label flex items-center gap-1"><Coins className="h-3 w-3" /> Tips per unit (₹)</label>
              <input type="number" value={tipsPerUnit} onChange={(e) => setTipsPerUnit(e.target.value)} placeholder="0" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              {tipsAmount > 0 && <p className="text-xs text-muted-foreground mt-1">Tips: ₹{tipsPerUnit} × {totalQty} units = <span className="text-warning font-semibold">₹{tipsAmount.toLocaleString()}</span> (added as expense)</p>}
            </div>

            <div className="border-t border-border pt-3 flex items-center justify-between">
              <span className="font-bold text-foreground">Total</span>
              <span className="font-bold text-lg text-primary">₹{grandTotal.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Payment mode */}
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
