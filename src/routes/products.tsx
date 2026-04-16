import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState } from "react";
import { getProducts, saveProduct, updateProduct, deleteProduct, type Product } from "../lib/store";
import { Plus, Pencil, Trash2, Search, Coins } from "lucide-react";

export const Route = createFileRoute("/products")({
  component: ProductsPage,
});

function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(getProducts);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("load");
  const [tipsEnabled, setTipsEnabled] = useState(false);
  const [tipsRate, setTipsRate] = useState("");

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleSave = () => {
    if (!name.trim() || !price.trim()) return;
    const data = { name: name.trim(), price: Number(price), unit, tipsEnabled, tipsRate: Number(tipsRate || 0) };
    if (editing) updateProduct(editing.id, data);
    else saveProduct(data);
    setProducts(getProducts());
    resetForm();
  };

  const handleDelete = (id: string) => { deleteProduct(id); setProducts(getProducts()); };

  const startEdit = (p: Product) => {
    setEditing(p); setName(p.name); setPrice(String(p.price)); setUnit(p.unit);
    setTipsEnabled(p.tipsEnabled); setTipsRate(String(p.tipsRate || ""));
    setShowForm(true);
  };

  const resetForm = () => {
    setEditing(null); setShowForm(false); setName(""); setPrice(""); setUnit("load");
    setTipsEnabled(false); setTipsRate("");
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="module-header mb-0">Products</h1>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"><Plus className="h-4 w-4" /> Add</button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="w-full rounded-md border border-input bg-secondary pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        {showForm && (
          <div className="stat-card space-y-3">
            <h3 className="text-sm font-semibold text-foreground">{editing ? "Edit Product" : "New Product"}</h3>
            <div><label className="field-label">Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sand Load" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="field-label">Price (₹)</label><input value={price} onChange={(e) => setPrice(e.target.value)} type="number" placeholder="0" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="field-label">Unit</label>
                <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="load">Per Load</option><option value="ton">Per Ton</option><option value="hour">Per Hour</option><option value="unit">Per Unit</option>
                </select>
              </div>
            </div>
            {/* Tips configuration */}
            <div className="border-t border-border pt-3 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={tipsEnabled} onChange={(e) => setTipsEnabled(e.target.checked)} className="rounded border-border" />
                <span className="text-sm font-medium text-foreground flex items-center gap-1"><Coins className="h-3.5 w-3.5 text-warning" /> Enable Tips</span>
              </label>
              {tipsEnabled && (
                <div><label className="field-label">Tips Rate per unit (₹)</label><input type="number" value={tipsRate} onChange={(e) => setTipsRate(e.target.value)} placeholder="0" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Save</button>
              <button onClick={resetForm} className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-muted transition-colors">Cancel</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="stat-card flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{p.name}</p>
                <p className="text-sm text-muted-foreground">₹{p.price.toLocaleString()} / {p.unit}</p>
                {p.tipsEnabled && <p className="text-xs text-warning flex items-center gap-1"><Coins className="h-3 w-3" /> Tips: ₹{p.tipsRate}/unit</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(p)} className="rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(p.id)} className="rounded-md p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No products yet.</p>}
        </div>
      </div>
    </AppLayout>
  );
}
