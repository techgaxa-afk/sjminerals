import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState, useMemo } from "react";
import { getProducts, saveProduct, updateProduct, deleteProduct, PRODUCT_CATEGORIES, type Product, type ProductCategory } from "../lib/store";
import { Plus, Pencil, Trash2, Search, Coins, ChevronDown, ChevronRight, Package } from "lucide-react";

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
  const [category, setCategory] = useState<"" | ProductCategory>("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const grouped = useMemo(() => {
    const buckets: Record<string, Product[]> = { BOULDERS: [], "K.K": [], Uncategorized: [] };
    for (const p of filtered) {
      const key = p.productCategory === "BOULDERS" || p.productCategory === "K.K" ? p.productCategory : "Uncategorized";
      buckets[key].push(p);
    }
    return buckets;
  }, [filtered]);

  const handleSave = () => {
    if (!name.trim() || !price.trim()) return;
    const data = {
      name: name.trim(), price: Number(price), unit, tipsEnabled, tipsRate: Number(tipsRate || 0),
      productCategory: category === "" ? null : category,
    };
    if (editing) updateProduct(editing.id, data);
    else saveProduct(data);
    setProducts(getProducts());
    resetForm();
  };

  const handleDelete = (id: string) => { deleteProduct(id); setProducts(getProducts()); };

  const startEdit = (p: Product) => {
    setEditing(p); setName(p.name); setPrice(String(p.price)); setUnit(p.unit);
    setTipsEnabled(p.tipsEnabled); setTipsRate(String(p.tipsRate || ""));
    setCategory(p.productCategory ?? "");
    setShowForm(true);
  };

  const resetForm = () => {
    setEditing(null); setShowForm(false); setName(""); setPrice(""); setUnit("load");
    setTipsEnabled(false); setTipsRate(""); setCategory("");
  };

  const toggleGroup = (g: string) => setCollapsed((c) => ({ ...c, [g]: !c[g] }));

  const renderGroup = (label: string, items: Product[]) => {
    if (items.length === 0) return null;
    const isCollapsed = collapsed[label];
    return (
      <div key={label} className="space-y-1">
        <button onClick={() => toggleGroup(label)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md bg-secondary/60 hover:bg-secondary text-foreground text-sm font-semibold">
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <Package className="h-3.5 w-3.5 text-primary" />
          <span>{label}</span>
          <span className="ml-auto text-xs text-muted-foreground">{items.length}</span>
        </button>
        {!isCollapsed && (
          <div className="space-y-2 pl-2">
            {items.map((p) => (
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
          </div>
        )}
      </div>
    );
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
            <div><label className="field-label">Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. B Balu" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="field-label">Price (₹)</label><input value={price} onChange={(e) => setPrice(e.target.value)} type="number" placeholder="0" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="field-label">Unit</label>
                <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="load">Per Load</option><option value="ton">Per Ton</option><option value="hour">Per Hour</option><option value="unit">Per Unit</option>
                </select>
              </div>
            </div>
            <div>
              <label className="field-label">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as "" | ProductCategory)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">— Uncategorized —</option>
                {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
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

        <div className="space-y-3">
          {renderGroup("BOULDERS", grouped.BOULDERS)}
          {renderGroup("K.K", grouped["K.K"])}
          {renderGroup("Uncategorized", grouped.Uncategorized)}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No products yet.</p>}
        </div>
      </div>
    </AppLayout>
  );
}
