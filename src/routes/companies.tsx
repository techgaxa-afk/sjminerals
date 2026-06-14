import { createFileRoute, Link } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState, useMemo } from "react";
import { toast } from "sonner";

import {
  getCompanies, saveCompany, updateCompany, deleteCompany,
  getCompanyOutstanding, getCompanyTotalSales, getCompanyTotalPaid, getCompanyPayments,
  getVehiclesByCompany, getVehicleTotals,
  saveVehicle, updateVehicle, deleteVehicle,
  countBillsByCompany, countBillsByVehicle,
  useCloudData, type Company, type Vehicle,
} from "../lib/store";
import { Plus, Search, Pencil, Trash2, X, Building2, Truck, ChevronDown, ChevronRight, ArrowRight, Wallet } from "lucide-react";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/companies")({
  component: CompaniesPage,
});

type CompanyForm = { name: string; contactNumber: string; address: string; notes: string; openingBalance: string; creditLimit: string };
type VehicleForm = { id?: string; companyId: string; vehicleNumber: string; driverName: string; vehicleCapacity: string; status: "active" | "inactive" | "maintenance" };

function CompaniesPage() {
  useCloudData();
  const companies = getCompanies();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CompanyForm>({ name: "", contactNumber: "", address: "", notes: "", openingBalance: "", creditLimit: "" });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [vehForm, setVehForm] = useState<VehicleForm | null>(null);

  const filtered = useMemo(() =>
    companies.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [companies, search]
  );

  const resetForm = () => {
    setForm({ name: "", contactNumber: "", address: "", notes: "", openingBalance: "", creditLimit: "" });
    setEditingId(null); setShowForm(false);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) { toast.error("Company name is required"); return; }
    const payload = {
      name,
      contactNumber: form.contactNumber.trim(),
      address: form.address.trim(),
      notes: form.notes.trim(),
      openingBalance: Number(form.openingBalance) || 0,
      creditLimit: Number(form.creditLimit) || 0,
    };
    try {
      if (editingId) {
        // Local duplicate check (excluding self)
        const dup = companies.find((c) => c.id !== editingId && c.name.trim().toLowerCase() === name.toLowerCase());
        if (dup) { toast.error(`Company "${dup.name}" already exists`); return; }
        updateCompany(editingId, payload);
        toast.success("Company updated");
      } else {
        await saveCompany(payload);
        toast.success("Company created");
      }
      resetForm();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save company");
    }
  };

  const handleEdit = (e: React.MouseEvent, c: Company) => {
    e.preventDefault(); e.stopPropagation();
    setForm({
      name: c.name,
      contactNumber: c.contactNumber,
      address: c.address || "",
      notes: c.notes || "",
      openingBalance: c.openingBalance ? String(c.openingBalance) : "",
      creditLimit: c.creditLimit ? String(c.creditLimit) : "",
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleDelete = async (e: React.MouseEvent, c: Company) => {
    e.preventDefault(); e.stopPropagation();
    const bc = countBillsByCompany(c.id);
    const msg = bc > 0
      ? `"${c.name}" has ${bc} historical bill${bc === 1 ? "" : "s"}. Deletion is blocked. Continue anyway? (Will fail)`
      : `Delete "${c.name}" and all its vehicles? This cannot be undone.`;
    if (!confirm(msg)) return;
    try {
      await deleteCompany(c.id);
      toast.success("Company deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete company");
    }
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSaveVehicle = async () => {
    if (!vehForm) return;
    const vehicleNumber = vehForm.vehicleNumber.trim();
    if (!vehicleNumber) { toast.error("Vehicle number is required"); return; }
    const data = {
      vehicleNumber,
      vehicleCapacity: Number(vehForm.vehicleCapacity) || 0,
      driverName: vehForm.driverName.trim(),
      status: vehForm.status,
    };
    try {
      if (vehForm.id) {
        updateVehicle(vehForm.id, data);
        toast.success("Vehicle updated");
      } else {
        await saveVehicle({ companyId: vehForm.companyId, ...data });
        toast.success("Vehicle added");
      }
      setVehForm(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save vehicle");
    }
  };

  const handleDeleteVehicle = async (e: React.MouseEvent, v: Vehicle) => {
    e.preventDefault(); e.stopPropagation();
    const bc = countBillsByVehicle(v.companyId, v.vehicleNumber);
    const msg = bc > 0
      ? `Vehicle ${v.vehicleNumber} has ${bc} historical bill${bc === 1 ? "" : "s"}. Deletion is blocked.`
      : `Delete vehicle ${v.vehicleNumber}?`;
    if (bc > 0) { toast.error(msg); return; }
    if (!confirm(msg)) return;
    try {
      await deleteVehicle(v.id);
      toast.success("Vehicle deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete vehicle");
    }
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
            <div><label className="field-label">Opening Balance / Previous Due (₹)</label><input type="number" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} placeholder="0" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" /><p className="text-[11px] text-muted-foreground mt-1">Adds to the company's outstanding balance immediately.</p></div>
            <p className="text-xs text-muted-foreground">Vehicles are added by expanding a company below.</p>
            <button onClick={handleSave} className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">{editingId ? "Update" : "Save"} Company</button>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((c) => {
            const vehicles = getVehiclesByCompany(c.id);
            const vehicleTotals = vehicles.map((v) => ({ v, ...getVehicleTotals(c.id, v.vehicleNumber) }));
            const sales = getCompanyTotalSales(c.id);
            const collected = getCompanyTotalPaid(c.id);
            const outstanding = getCompanyOutstanding(c.id);
            const payList = getCompanyPayments(c.id);
            const lastPay = payList.length
              ? payList.reduce((a, b) => (new Date(a.paymentDate) > new Date(b.paymentDate) ? a : b))
              : null;
            const isOpen = expanded.has(c.id);
            const isEditingVeh = vehForm && vehForm.companyId === c.id;

            return (
              <div key={c.id} className="stat-card">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> {c.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Truck className="h-3 w-3" /> {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"}</p>
                    {c.contactNumber && <p className="text-xs text-muted-foreground">{c.contactNumber}</p>}
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                      <div><p className="text-muted-foreground">Sales</p><p className="font-semibold text-foreground">₹{sales.toLocaleString()}</p></div>
                      <div><p className="text-muted-foreground">Collected</p><p className="font-semibold text-success">₹{collected.toLocaleString()}</p></div>
                      <div><p className="text-muted-foreground">Outstanding</p><p className={`font-semibold ${outstanding > 0 ? "text-warning" : "text-success"}`}>₹{outstanding.toLocaleString()}</p></div>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                      <Wallet className="h-3 w-3" />
                      {lastPay ? `Last payment: ₹${lastPay.amount.toLocaleString()} · ${format(parseISO(lastPay.paymentDate), "dd MMM yyyy")}` : "No payments yet"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button onClick={(e) => handleEdit(e, c)} aria-label="Edit company" className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                    <button onClick={(e) => handleDelete(e, c)} aria-label="Delete company" className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-secondary"><Trash2 className="h-4 w-4" /></button>
                    <button onClick={() => toggleExpanded(c.id)} aria-label={isOpen ? "Collapse" : "Expand"} aria-expanded={isOpen} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link to="/companies/$id" params={{ id: c.id }} search={{ pay: undefined }} className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-secondary/60 px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors">
                    View Details <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link to="/companies/$id" params={{ id: c.id }} search={{ pay: 1 }} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                    <Wallet className="h-3.5 w-3.5" /> Receive Payment
                  </Link>
                </div>

                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground">Vehicles</p>
                    </div>


                    {vehicleTotals.length === 0 && !isEditingVeh && (
                      <p className="text-xs text-muted-foreground py-1">No vehicles yet.</p>
                    )}

                    {vehicleTotals.map(({ v, sales: vs, paid: vp, due: vd }) => (
                      <div key={v.id} className="rounded-md border border-border bg-secondary/40 p-2.5">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-primary" /> {v.vehicleNumber}</p>
                            {v.driverName && <p className="text-[11px] text-muted-foreground">Driver: {v.driverName}</p>}
                            {v.vehicleCapacity > 0 && <p className="text-[11px] text-muted-foreground">Capacity: {v.vehicleCapacity} t</p>}
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setVehForm({ id: v.id, companyId: c.id, vehicleNumber: v.vehicleNumber, driverName: v.driverName, vehicleCapacity: String(v.vehicleCapacity || ""), status: v.status })} aria-label="Edit vehicle" className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={(e) => handleDeleteVehicle(e, v)} aria-label="Delete vehicle" className="rounded-md p-1 text-muted-foreground hover:text-destructive hover:bg-secondary"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
                          <div><p className="text-muted-foreground">Sales</p><p className="font-semibold text-foreground">₹{vs.toLocaleString()}</p></div>
                          <div><p className="text-muted-foreground">Paid</p><p className="font-semibold text-success">₹{vp.toLocaleString()}</p></div>
                          <div><p className="text-muted-foreground">Due</p><p className={`font-semibold ${vd > 0 ? "text-warning" : "text-success"}`}>₹{vd.toLocaleString()}</p></div>
                        </div>
                      </div>
                    ))}

                    {isEditingVeh ? (
                      <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-foreground">{vehForm!.id ? "Edit Vehicle" : "New Vehicle"}</p>
                          <button onClick={() => setVehForm(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                        </div>
                        <input value={vehForm!.vehicleNumber} onChange={(e) => setVehForm({ ...vehForm!, vehicleNumber: e.target.value })} placeholder="Vehicle Number *" className="w-full rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                        <input value={vehForm!.driverName} onChange={(e) => setVehForm({ ...vehForm!, driverName: e.target.value })} placeholder="Driver Name" className="w-full rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="number" step="0.01" value={vehForm!.vehicleCapacity} onChange={(e) => setVehForm({ ...vehForm!, vehicleCapacity: e.target.value })} placeholder="Capacity (t)" className="w-full rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                          <select value={vehForm!.status} onChange={(e) => setVehForm({ ...vehForm!, status: e.target.value as "active" | "inactive" | "maintenance" })} className="w-full rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="maintenance">Maintenance</option>
                          </select>
                        </div>
                        <button onClick={handleSaveVehicle} className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">{vehForm!.id ? "Update" : "Save"} Vehicle</button>
                      </div>
                    ) : (
                      <button onClick={() => setVehForm({ companyId: c.id, vehicleNumber: "", driverName: "", vehicleCapacity: "", status: "active" })} className="w-full flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-secondary/40 px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary/70 transition-colors"><Plus className="h-3.5 w-3.5" /> Add Vehicle</button>
                    )}
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
