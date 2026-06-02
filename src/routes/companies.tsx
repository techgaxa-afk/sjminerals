import { createFileRoute, Link } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState, useMemo } from "react";
import { toast } from "sonner";

import {
  getCompanies, saveCompany, updateCompany, deleteCompany,
  getCompanyOutstanding, getBillsByCompany, getVehiclesByCompany,
  useCloudData, type Company,
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
  const [form, setForm] = useState({ name: "", contactNumber: "", address: "", notes: "", openingBalance: "" });

  const filtered = useMemo(() =>
    companies.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [companies, search]
  );

  const resetForm = () => {
    setForm({ name: "", contactNumber: "", address: "", notes: "", openingBalance: "" });
    setEditingId(null); setShowForm(false);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Company name is required"); return; }
    const payload = {
      name: form.name.trim(),
      contactNumber: form.contactNumber.trim(),
      address: form.address.trim(),
      notes: form.notes.trim(),
      openingBalance: Number(form.openingBalance) || 0,
    };
    if (editingId) {
      updateCompany(editingId, payload);
      toast.success("Company updated");
    } else {
      saveCompany({ ...payload, driverName: "", vehicleNumber: "", vehicleCapacity: 0 });
      toast.success("Company created");
    }
    resetForm();
  };

  const handleEdit = (e: React.MouseEvent, c: Company) => {
    e.preventDefault(); e.stopPropagation();
    setForm({
      name: c.name,
      contactNumber: c.contactNumber,
      address: c.address || "",
      notes: c.notes || "",
      openingBalance: c.openingBalance ? String(c.openingBalance) : "",
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm("Delete this company and all its vehicles? Bills remain linked to this company id.")) return;
    deleteCompany(id);
    toast.success("Company deleted");
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by company name..." className="w-full rounded-md border border-input bg-secondary pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        {showForm && (
          <div className="stat-card space-y-3">
            <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-foreground">{editingId ? "Edit" : "New"} Company</h3><button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button></div>
            <div><label className="field-label">Company Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. SMD" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div><label className="field-label">Contact Number</label><input value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} placeholder="Phone number" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div><label className="field-label">Address (optional)</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div><label className="field-label">Notes (optional)</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes" rows={2} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <p className="text-xs text-muted-foreground">Vehicles are managed inside the company's page.</p>
            <button onClick={handleSave} className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">{editingId ? "Update" : "Save"} Company</button>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((c) => {
            const outstanding = getCompanyOutstanding(c.id);
            const cBills = getBillsByCompany(c.id);
            const vehicles = getVehiclesByCompany(c.id);
            const totalSales = cBills.reduce((s, b) => s + (b.totalAmount || 0), 0);
            const totalPaid = cBills.reduce((s, b) => s + (b.paidAmount || 0), 0);
            return (
              <Link key={c.id} to="/companies/$id" params={{ id: c.id }} className="stat-card flex items-start justify-between hover:border-primary/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> {c.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Truck className="h-3 w-3" /> {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"}</p>
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
