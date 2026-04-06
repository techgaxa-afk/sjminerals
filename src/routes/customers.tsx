import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState } from "react";
import { getCustomers, saveCustomer, updateCustomer, deleteCustomer, getBillsByCustomer, type Customer } from "../lib/store";
import { Plus, Search, Pencil, Trash2, X, User, Building2, Phone, MapPin, Receipt } from "lucide-react";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  const [customers, setCustomers] = useState(getCustomers);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", companyName: "", phone: "", address: "" });

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.companyName.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const resetForm = () => {
    setForm({ name: "", companyName: "", phone: "", address: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      updateCustomer(editingId, form);
    } else {
      saveCustomer(form);
    }
    setCustomers(getCustomers());
    resetForm();
  };

  const handleEdit = (c: Customer) => {
    setForm({ name: c.name, companyName: c.companyName, phone: c.phone, address: c.address });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    deleteCustomer(id);
    setCustomers(getCustomers());
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="module-header mb-0">Customers</h1>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..." className="w-full rounded-md border border-input bg-secondary pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        {showForm && (
          <div className="stat-card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{editingId ? "Edit Customer" : "New Customer"}</h3>
              <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div>
              <label className="field-label">Customer Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter name" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="field-label">Company Name</label>
              <input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="Enter company" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="field-label">Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="field-label">Address</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <button onClick={handleSave} className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              {editingId ? "Update Customer" : "Save Customer"}
            </button>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((c) => {
            const bills = expandedId === c.id ? getBillsByCustomer(c.id) : [];
            return (
              <div key={c.id} className="stat-card">
                <div className="flex items-start justify-between">
                  <div className="cursor-pointer flex-1" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                    <p className="font-medium text-foreground flex items-center gap-2"><User className="h-4 w-4 text-primary" /> {c.name}</p>
                    {c.companyName && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Building2 className="h-3 w-3" /> {c.companyName}</p>}
                    {c.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</p>}
                    {c.address && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.address}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(c)} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(c.id)} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-secondary"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                {expandedId === c.id && (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2"><Receipt className="h-3 w-3" /> Transaction History</p>
                    {bills.length > 0 ? bills.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((b) => (
                      <div key={b.id} className="flex justify-between text-sm py-1">
                        <span className="text-muted-foreground">{format(parseISO(b.createdAt), "dd MMM yyyy")}</span>
                        <span className="text-foreground font-medium">₹{b.totalAmount.toLocaleString()}</span>
                      </div>
                    )) : <p className="text-xs text-muted-foreground">No transactions yet</p>}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No customers found.</p>}
        </div>
      </div>
    </AppLayout>
  );
}
