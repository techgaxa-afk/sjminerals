import { createFileRoute, Link } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState } from "react";
import {
  getCompanies, saveCompany, updateCompany, deleteCompany,
  getCompanyOutstanding, useCloudData,
  type Company,
} from "../lib/store";
import { Plus, Search, Pencil, Trash2, X, Building2, Truck, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/companies")({
  component: CompaniesPage,
});


function CompaniesPage() {
  const [companies, setCompanies] = useState(getCompanies);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", driverName: "", vehicleNumber: "", vehicleCapacity: "", contactNumber: "" });
  const [payBillId, setPayBillId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");

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
    setCompanies(getCompanies());
    resetForm();
  };

  const handleEdit = (c: Company) => {
    setForm({ name: c.name, driverName: c.driverName, vehicleNumber: c.vehicleNumber, vehicleCapacity: String(c.vehicleCapacity), contactNumber: c.contactNumber });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => { deleteCompany(id); setCompanies(getCompanies()); };

  const handlePayment = (billId: string, companyId: string) => {
    if (!payAmount.trim() || Number(payAmount) <= 0) return;
    savePayment({ billId, companyId, amount: Number(payAmount), date: new Date().toISOString().split("T")[0], notes: "Payment against outstanding" });
    setPayBillId(null);
    setPayAmount("");
    setCompanies(getCompanies());
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
            const isExpanded = expandedId === c.id;
            const bills = isExpanded ? getBillsByCompany(c.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];
            const outstanding = getCompanyOutstanding(c.id);
            const totalRevenue = isExpanded ? bills.reduce((s, b) => s + b.totalAmount, 0) : 0;
            const totalPaid = isExpanded ? bills.reduce((s, b) => s + (b.paidAmount || 0), 0) + getPaymentsByCompany(c.id).reduce((s, p) => s + p.amount, 0) : 0;

            return (
              <div key={c.id} className="stat-card">
                <div className="flex items-start justify-between">
                  <div className="cursor-pointer flex-1" onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                    <p className="font-medium text-foreground flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> {c.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Truck className="h-3 w-3" /> {c.vehicleNumber} {c.vehicleCapacity > 0 && `(${c.vehicleCapacity} tons)`}</p>
                    {c.driverName && <p className="text-xs text-muted-foreground">Driver: {c.driverName}</p>}
                    {c.contactNumber && <p className="text-xs text-muted-foreground">{c.contactNumber}</p>}
                    {outstanding > 0 && <p className="text-xs font-semibold text-warning mt-1">Outstanding: ₹{outstanding.toLocaleString()}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(c)} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(c.id)} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-secondary"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 border-t border-border pt-3 space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-md bg-secondary p-2 text-center"><p className="text-xs text-muted-foreground">Revenue</p><p className="font-bold text-sm text-foreground">₹{totalRevenue.toLocaleString()}</p></div>
                      <div className="rounded-md bg-secondary p-2 text-center"><p className="text-xs text-muted-foreground">Paid</p><p className="font-bold text-sm text-success">₹{totalPaid.toLocaleString()}</p></div>
                      <div className="rounded-md bg-secondary p-2 text-center"><p className="text-xs text-muted-foreground">Due</p><p className="font-bold text-sm text-warning">₹{outstanding.toLocaleString()}</p></div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Transactions ({bills.length})</p>
                      {bills.slice(0, 10).map((b) => (
                        <div key={b.id} className="flex justify-between items-center text-sm py-1.5 border-b border-border/50 last:border-0">
                          <div>
                            <span className="text-muted-foreground text-xs">{format(parseISO(b.createdAt), "dd MMM yyyy")}</span>
                            <span className="text-xs text-muted-foreground ml-2">{b.paymentMode.toUpperCase()}</span>
                            {b.outstandingAmount > 0 && <span className="text-xs text-warning ml-2">Due: ₹{b.outstandingAmount.toLocaleString()}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-foreground font-medium">₹{b.totalAmount.toLocaleString()}</span>
                            {b.outstandingAmount > 0 && (
                              payBillId === b.id ? (
                                <div className="flex items-center gap-1">
                                  <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="₹" className="w-20 rounded border border-input bg-secondary px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                                  <button onClick={() => handlePayment(b.id, c.id)} className="rounded bg-success px-2 py-1 text-xs text-success-foreground">Pay</button>
                                  <button onClick={() => setPayBillId(null)} className="text-muted-foreground"><X className="h-3 w-3" /></button>
                                </div>
                              ) : (
                                <button onClick={() => { setPayBillId(b.id); setPayAmount(""); }} className="rounded bg-secondary px-2 py-1 text-xs text-primary hover:bg-primary/10"><CreditCard className="h-3 w-3" /></button>
                              )
                            )}
                          </div>
                        </div>
                      ))}
                      {bills.length === 0 && <p className="text-xs text-muted-foreground">No transactions</p>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No companies found.</p>}
        </div>
      </div>
    </AppLayout>
  );
}
