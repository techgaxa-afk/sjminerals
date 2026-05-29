import { createFileRoute, Link } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState } from "react";
import {
  getCompanies, saveCompany, updateCompany, deleteCompany,
  getCompanyOutstanding, getBillsByCompany, useCloudData,
  type Company,
} from "../lib/store";
import { Plus, Search, Pencil, Trash2, X, Building2, Truck, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/companies")({
  component: CompaniesPage,
});

function CompaniesPage() {
  useCloudData();
  const companies = getCompanies();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", driverName: "", vehicleNumber: "", vehicleCapacity: "", contactNumber: "" });

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
    c.driverName.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => { setForm({ name: "", driverName: "", vehicleNumber: "", vehicleCapacity: "", contactNumber: "" }); setEditingId(null); setShowForm(false); };

  const handleSave = () => {
    if (!form.name.trim() || !form.vehicleNumber.trim()) return;
    if (editingId) updateCompany(editingId, { ...form, vehicleCapacity: Number(form.vehicleCapacity) || 0 });
    else saveCompany({ ...form, vehicleCapacity: Number(form.vehicleCapacity) || 0 });
    resetForm();
  };

  const handleEdit = (e: React.MouseEvent, c: Company) => {
    e.preventDefault(); e.stopPropagation();
    setForm({ name: c.name, driverName: c.driverName, vehicleNumber: c.vehicleNumber, vehicleCapacity: String(c.vehicleCapacity), contactNumber: c.contactNumber });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm("Delete this company?")) return;
    deleteCompany(id);
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="module-header mb-0">Companies</h1>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"><Plus className="h-4 w-4" /> Add</button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, vehicle, driver..." className="w-full rounded-md border border-input bg-secondary pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        {showForm && (
          <div className="stat-card space-y-3">
            <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-foreground">{editingId ? "Edit" : "New"} Company</h3><button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button></div>
            <div><label className="field-label">Company Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Company name" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div><label className="field-label">Driver Name</label><input value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} placeholder="Driver name" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="field-label">Vehicle Number *</label><input value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} placeholder="MH-12-AB-1234" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="field-label">Vehicle Capacity</label><input type="number" value={form.vehicleCapacity} onChange={(e) => setForm({ ...form, vehicleCapacity: e.target.value })} placeholder="e.g. 10" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            </div>
            <div><label className="field-label">Contact Number</label><input value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} placeholder="Phone number" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <button onClick={handleSave} className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">{editingId ? "Update" : "Save"} Company</button>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((c) => {
            const outstanding = getCompanyOutstanding(c.id);
            const cBills = getBillsByCompany(c.id);
            const totalSales = cBills.reduce((s, b) => s + (b.totalAmount || 0), 0);
            const totalPaid = cBills.reduce((s, b) => s + (b.paidAmount || 0), 0);
            return (
              <Link key={c.id} to="/companies/$id" params={{ id: c.id }} className="stat-card flex items-start justify-between hover:border-primary/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> {c.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Truck className="h-3 w-3" /> {c.vehicleNumber} {c.vehicleCapacity > 0 && `(${c.vehicleCapacity} tons)`}</p>
                  {c.driverName && <p className="text-xs text-muted-foreground">Driver: {c.driverName}</p>}
                  {c.contactNumber && <p className="text-xs text-muted-foreground">{c.contactNumber}</p>}
                  <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                    <div><p className="text-muted-foreground">Sales</p><p className="font-semibold text-foreground">₹{totalSales.toLocaleString()}</p></div>
                    <div><p className="text-muted-foreground">Paid</p><p className="font-semibold text-success">₹{totalPaid.toLocaleString()}</p></div>
                    <div><p className="text-muted-foreground">Due</p><p className={`font-semibold ${outstanding > 0 ? "text-warning" : "text-success"}`}>₹{outstanding.toLocaleString()}</p></div>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button onClick={(e) => handleEdit(e, c)} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={(e) => handleDelete(e, c.id)} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-secondary"><Trash2 className="h-4 w-4" /></button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No companies found.</p>}
        </div>
      </div>
    </AppLayout>
  );
}
