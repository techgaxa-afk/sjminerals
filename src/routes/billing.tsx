import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState } from "react";
import { getProducts, getCustomers, saveCustomer, saveBill, type BillItem, type Customer } from "../lib/store";
import { Plus, Minus, ShoppingCart, CreditCard, Banknote, Check, UserPlus, X } from "lucide-react";

export const Route = createFileRoute("/billing")({
  component: BillingPage,
});

function BillingPage() {
  const products = getProducts();
  const [customers, setCustomers] = useState(getCustomers);
  const [items, setItems] = useState<BillItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleCapacity, setVehicleCapacity] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<"cash" | "upi">("cash");
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCust, setNewCust] = useState({ name: "", companyName: "", phone: "", address: "" });
  const [customerSearch, setCustomerSearch] = useState("");

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const total = items.reduce((s, i) => s + i.total, 0);

  const filteredCustomers = customers.filter(
    (c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.companyName.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const selectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.name);
    setCompanyName(c.companyName);
    setCustomerSearch("");
  };

  const handleAddCustomer = () => {
    if (!newCust.name.trim()) return;
    const c = saveCustomer(newCust);
    setCustomers(getCustomers());
    selectCustomer(c);
    setNewCust({ name: "", companyName: "", phone: "", address: "" });
    setShowNewCustomer(false);
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
    saveBill({
      items,
      totalAmount: total,
      paymentMode,
      customerName: customerName.trim() || "Walk-in",
      companyName: companyName.trim(),
      vehicleNumber: vehicleNumber.trim(),
      vehicleCapacity: vehicleCapacity.trim(),
      customerId: selectedCustomerId || undefined,
    });
    setSaved(true);
    setTimeout(() => {
      setItems([]);
      setCustomerName("");
      setCompanyName("");
      setVehicleNumber("");
      setVehicleCapacity("");
      setSelectedCustomerId("");
      setSaved(false);
    }, 2000);
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="module-header">New Bill</h1>

        {/* Customer selection */}
        <div className="stat-card space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Customer Details</h3>
          <div>
            <label className="field-label">Select Customer</label>
            <input value={customerSearch || customerName} onChange={(e) => { setCustomerSearch(e.target.value); setCustomerName(e.target.value); setSelectedCustomerId(""); setCompanyName(""); }} placeholder="Search or type customer name..." className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            {customerSearch && filteredCustomers.length > 0 && (
              <div className="mt-1 rounded-md border border-border bg-card max-h-40 overflow-y-auto">
                {filteredCustomers.map((c) => (
                  <button key={c.id} onClick={() => selectCustomer(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary text-foreground">
                    <span className="font-medium">{c.name}</span>
                    {c.companyName && <span className="text-muted-foreground"> — {c.companyName}</span>}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShowNewCustomer(!showNewCustomer)} className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline">
              <UserPlus className="h-3 w-3" /> Quick add new customer
            </button>
          </div>

          {showNewCustomer && (
            <div className="rounded-md border border-border bg-secondary/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">New Customer</span>
                <button onClick={() => setShowNewCustomer(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
              </div>
              <input value={newCust.name} onChange={(e) => setNewCust({ ...newCust, name: e.target.value })} placeholder="Name *" className="w-full rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <input value={newCust.companyName} onChange={(e) => setNewCust({ ...newCust, companyName: e.target.value })} placeholder="Company" className="w-full rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <div className="grid grid-cols-2 gap-2">
                <input value={newCust.phone} onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })} placeholder="Phone" className="rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <input value={newCust.address} onChange={(e) => setNewCust({ ...newCust, address: e.target.value })} placeholder="Address" className="rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <button onClick={handleAddCustomer} className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">Save & Select</button>
            </div>
          )}

          <div>
            <label className="field-label">Company Name</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Vehicle Number</label>
              <input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="e.g. MH-12-AB-1234" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="field-label">Vehicle Capacity</label>
              <input value={vehicleCapacity} onChange={(e) => setVehicleCapacity(e.target.value)} placeholder="e.g. 10 tons" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
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
            {filtered.length === 0 && <p className="col-span-full text-sm text-muted-foreground text-center py-4">No products found. Add products first.</p>}
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
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <span className="font-bold text-foreground">Total</span>
              <span className="font-bold text-lg text-primary">₹{total.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Payment mode */}
        {items.length > 0 && (
          <div className="space-y-3">
            <label className="field-label">Payment Mode</label>
            <div className="flex gap-2">
              <button onClick={() => setPaymentMode("cash")} className={`flex-1 flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-medium transition-colors ${paymentMode === "cash" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                <Banknote className="h-4 w-4" /> Cash
              </button>
              <button onClick={() => setPaymentMode("upi")} className={`flex-1 flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-medium transition-colors ${paymentMode === "upi" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                <CreditCard className="h-4 w-4" /> UPI / GPay
              </button>
            </div>
            <button onClick={handleSave} disabled={saved} className={`w-full flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold transition-colors ${saved ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
              {saved ? <><Check className="h-4 w-4" /> Saved!</> : "Save Bill"}
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
