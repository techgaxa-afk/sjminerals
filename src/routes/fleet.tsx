import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useMemo, useState } from "react";
import {
  getVehicles, getCompanies, getVehicleStats,
  getVehicleMaintenance, saveVehicleMaintenance, deleteVehicleMaintenance,
  getVehicleDocuments, saveVehicleDocument, deleteVehicleDocument,
  useCloudData, type Vehicle, type MaintenanceCategory, type DocumentType,
} from "../lib/store";
import { Truck, Wrench, AlertTriangle, FileWarning, IndianRupee, X, Plus, Trash2, Download, FileText, FileSpreadsheet } from "lucide-react";
import { format, differenceInDays, startOfMonth } from "date-fns";

export const Route = createFileRoute("/fleet")({ component: FleetPage });

const DOC_LABELS: Record<DocumentType, string> = {
  insurance: "Insurance", fc: "FC", permit: "Permit", pollution: "Pollution", road_tax: "Road Tax",
};
const MAINT_CATS: MaintenanceCategory[] = ["fuel", "service", "tyres", "battery", "repairs", "other"];

function FleetPage() {
  useCloudData();
  const vehicles = getVehicles();
  const companies = getCompanies();
  const [openVehicleId, setOpenVehicleId] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "maintenance" | "documents">("overview");

  const enriched = useMemo(() => vehicles.map((v) => {
    const s = getVehicleStats(v.vehicleNumber);
    const company = companies.find((c) => c.id === v.companyId);
    return { v, company, ...s };
  }), [vehicles, companies]);

  const monthStart = startOfMonth(new Date()).getTime();
  const dashboard = useMemo(() => {
    const total = vehicles.length;
    const active = vehicles.filter((v) => v.status === "active").length;
    const needService = vehicles.filter((v) => v.status === "maintenance").length;
    const docs = getVehicleDocuments();
    const today = new Date();
    const expiring = docs.filter((d) => {
      const days = differenceInDays(new Date(d.expiryDate + "T00:00:00"), today);
      return days <= 30;
    }).length;
    const monthMaint = getVehicleMaintenance()
      .filter((m) => new Date(m.serviceDate + "T00:00:00").getTime() >= monthStart)
      .reduce((s, m) => s + m.cost, 0);
    return { total, active, needService, expiring, monthMaint };
  }, [vehicles, monthStart]);

  const openVehicle = openVehicleId ? vehicles.find((v) => v.id === openVehicleId) : null;

  const exportCSV = () => {
    const headers = ["Vehicle", "Company", "Trips", "Revenue", "Expenses", "Profit", "Status"];
    const rows = enriched.map((e) => [
      e.v.vehicleNumber, e.company?.name ?? "", e.trips, Math.round(e.revenue),
      Math.round(e.expenses), Math.round(e.profit), e.v.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => {
      const s = String(c ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")).join("\n");
    download("fleet.csv", "text/csv;charset=utf-8;", csv);
  };
  const escHtml = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  const exportExcel = () => {
    const html = `<table border="1"><thead><tr><th>Vehicle</th><th>Company</th><th>Trips</th><th>Revenue</th><th>Expenses</th><th>Profit</th><th>Status</th></tr></thead><tbody>${enriched.map((e) => `<tr><td>${escHtml(e.v.vehicleNumber)}</td><td>${escHtml(e.company?.name ?? "")}</td><td>${e.trips}</td><td>${Math.round(e.revenue)}</td><td>${Math.round(e.expenses)}</td><td>${Math.round(e.profit)}</td><td>${escHtml(e.v.status)}</td></tr>`).join("")}</tbody></table>`;
    download("fleet.xls", "application/vnd.ms-excel", html);
  };
  const exportPDF = () => {
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`<html><head><title>Fleet</title><style>body{font-family:sans-serif;padding:16px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:6px 8px}th{background:#f3f4f6;text-align:left}</style></head><body><h1>Fleet</h1><table><thead><tr><th>Vehicle</th><th>Company</th><th>Trips</th><th>Revenue</th><th>Expenses</th><th>Profit</th><th>Status</th></tr></thead><tbody>${enriched.map((e) => `<tr><td>${escHtml(e.v.vehicleNumber)}</td><td>${escHtml(e.company?.name ?? "")}</td><td>${e.trips}</td><td>₹${Math.round(e.revenue).toLocaleString()}</td><td>₹${Math.round(e.expenses).toLocaleString()}</td><td>₹${Math.round(e.profit).toLocaleString()}</td><td>${escHtml(e.v.status)}</td></tr>`).join("")}</tbody></table><script>setTimeout(()=>window.print(),300)</script></body></html>`);
    w.document.close();
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold">Fleet Management</h1>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-secondary"><Download className="h-3.5 w-3.5" /> CSV</button>
            <button onClick={exportExcel} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-secondary"><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</button>
            <button onClick={exportPDF} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-secondary"><FileText className="h-3.5 w-3.5" /> PDF</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <DashCard icon={<Truck className="h-4 w-4" />} label="Total Vehicles" value={String(dashboard.total)} />
          <DashCard icon={<Truck className="h-4 w-4 text-success" />} label="Active" value={String(dashboard.active)} />
          <DashCard icon={<Wrench className="h-4 w-4 text-warning" />} label="In Maintenance" value={String(dashboard.needService)} />
          <DashCard icon={<FileWarning className="h-4 w-4 text-destructive" />} label="Docs Expiring (30d)" value={String(dashboard.expiring)} />
          <DashCard icon={<IndianRupee className="h-4 w-4" />} label="Maintenance (Month)" value={`₹${Math.round(dashboard.monthMaint).toLocaleString()}`} />
        </div>

        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Vehicle</th>
                <th className="px-3 py-2 text-left">Company</th>
                <th className="px-3 py-2 text-right">Trips</th>
                <th className="px-3 py-2 text-right">Revenue</th>
                <th className="px-3 py-2 text-right">Expenses</th>
                <th className="px-3 py-2 text-right">Profit</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {enriched.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No vehicles. Add via Companies.</td></tr>}
              {enriched.map((e) => (
                <tr key={e.v.id} className={`border-t cursor-pointer hover:bg-muted/30 ${e.profit < 0 ? "bg-destructive/5" : ""}`} onClick={() => { setOpenVehicleId(e.v.id); setTab("overview"); }}>
                  <td className="px-3 py-2 font-medium">{e.v.vehicleNumber}</td>
                  <td className="px-3 py-2">{e.company?.name ?? "—"}</td>
                  <td className="px-3 py-2 text-right">{e.trips}</td>
                  <td className="px-3 py-2 text-right">₹{Math.round(e.revenue).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">₹{Math.round(e.expenses).toLocaleString()}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${e.profit < 0 ? "text-destructive" : "text-success"}`}>
                    ₹{Math.round(e.profit).toLocaleString()}
                    {e.profit < 0 && <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">LOSS</span>}
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={e.v.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {openVehicle && (
        <VehicleDrawer
          vehicle={openVehicle}
          tab={tab} setTab={setTab}
          onClose={() => setOpenVehicleId(null)}
        />
      )}
    </AppLayout>
  );
}

function DashCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Vehicle["status"] }) {
  const map = {
    active: "bg-success/15 text-success",
    inactive: "bg-muted text-muted-foreground",
    maintenance: "bg-warning/15 text-warning",
  } as const;
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${map[status]}`}>{status}</span>;
}

function VehicleDrawer({ vehicle, tab, setTab, onClose }: {
  vehicle: Vehicle; tab: "overview" | "maintenance" | "documents";
  setTab: (t: "overview" | "maintenance" | "documents") => void; onClose: () => void;
}) {
  useCloudData();
  const stats = getVehicleStats(vehicle.vehicleNumber);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-2xl bg-background h-full overflow-y-auto p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{vehicle.vehicleNumber}</h2>
            <p className="text-xs text-muted-foreground">Driver: {vehicle.driverName || "—"} · Capacity: {vehicle.vehicleCapacity}</p>
          </div>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>

        <div className="flex gap-1 border-b">
          {(["overview","maintenance","documents"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Revenue" value={`₹${Math.round(stats.revenue).toLocaleString()}`} />
            <Stat label="Collected" value={`₹${Math.round(stats.collected).toLocaleString()}`} />
            <Stat label="Outstanding" value={`₹${Math.round(stats.outstanding).toLocaleString()}`} cls={stats.outstanding > 0 ? "text-destructive" : ""} />
            <Stat label="Trips" value={String(stats.trips)} />
            <Stat label="Profit" value={`₹${Math.round(stats.profit).toLocaleString()}`} cls={stats.profit < 0 ? "text-destructive" : "text-success"} />
            <Stat label="Profit %" value={`${stats.profitPct.toFixed(1)}%`} cls={stats.profitPct < 0 ? "text-destructive" : ""} />
          </div>
        )}

        {tab === "maintenance" && <MaintenanceTab vehicleId={vehicle.id} />}
        {tab === "documents" && <DocumentsTab vehicleId={vehicle.id} />}
      </div>
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${cls || ""}`}>{value}</p>
    </div>
  );
}

function MaintenanceTab({ vehicleId }: { vehicleId: string }) {
  useCloudData();
  const records = getVehicleMaintenance(vehicleId);
  const [category, setCategory] = useState<MaintenanceCategory>("service");
  const [vendor, setVendor] = useState("");
  const [cost, setCost] = useState("");
  const [serviceDate, setServiceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const add = () => {
    const c = Number(cost); if (!(c >= 0)) return;
    saveVehicleMaintenance({ vehicleId, category, vendor: vendor.trim(), cost: c, serviceDate, notes: notes.trim() });
    setVendor(""); setCost(""); setNotes("");
  };
  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-card p-3 space-y-2">
        <h3 className="text-xs font-medium uppercase text-muted-foreground">Add Service</h3>
        <div className="grid grid-cols-2 gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value as MaintenanceCategory)} className="rounded-md border border-input bg-secondary px-3 py-2 text-sm">
            {MAINT_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Vendor" className="rounded-md border border-input bg-secondary px-3 py-2 text-sm" />
          <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Cost" className="rounded-md border border-input bg-secondary px-3 py-2 text-sm" />
          <input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} className="rounded-md border border-input bg-secondary px-3 py-2 text-sm" />
        </div>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm" />
        <button onClick={add} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"><Plus className="h-3.5 w-3.5" /> Add</button>
      </div>
      <div className="rounded-md border bg-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b text-left text-muted-foreground"><th className="px-2 py-1.5">Date</th><th className="px-2 py-1.5">Type</th><th className="px-2 py-1.5">Vendor</th><th className="px-2 py-1.5 text-right">Cost</th><th className="px-2 py-1.5">Notes</th><th></th></tr></thead>
          <tbody>
            {records.length === 0 && <tr><td colSpan={6} className="px-2 py-4 text-center text-muted-foreground">No service history yet.</td></tr>}
            {records.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="px-2 py-1.5">{format(new Date(m.serviceDate + "T00:00:00"), "dd MMM yy")}</td>
                <td className="px-2 py-1.5 capitalize">{m.category}</td>
                <td className="px-2 py-1.5">{m.vendor || "—"}</td>
                <td className="px-2 py-1.5 text-right">₹{m.cost.toLocaleString()}</td>
                <td className="px-2 py-1.5">{m.notes || "—"}</td>
                <td className="px-2 py-1.5"><button onClick={() => { if (confirm("Delete?")) deleteVehicleMaintenance(m.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocumentsTab({ vehicleId }: { vehicleId: string }) {
  useCloudData();
  const docs = getVehicleDocuments(vehicleId);
  const today = new Date();
  const docByType = (t: DocumentType) => docs.find((d) => d.docType === t);
  const [editType, setEditType] = useState<DocumentType>("insurance");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  const alertFor = (expiry: string) => {
    const days = differenceInDays(new Date(expiry + "T00:00:00"), today);
    if (days < 0) return { label: "EXPIRED", cls: "bg-destructive/15 text-destructive" };
    if (days <= 15) return { label: `${days}d`, cls: "bg-destructive/15 text-destructive" };
    if (days <= 30) return { label: `${days}d`, cls: "bg-warning/15 text-warning" };
    return null;
  };

  const save = () => {
    if (!expiryDate) return;
    saveVehicleDocument({ vehicleId, docType: editType, expiryDate, notes: notes.trim() });
    setExpiryDate(""); setNotes("");
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-card p-3 space-y-2">
        <h3 className="text-xs font-medium uppercase text-muted-foreground">Update Document</h3>
        <div className="grid grid-cols-2 gap-2">
          <select value={editType} onChange={(e) => setEditType(e.target.value as DocumentType)} className="rounded-md border border-input bg-secondary px-3 py-2 text-sm">
            {(Object.keys(DOC_LABELS) as DocumentType[]).map((t) => <option key={t} value={t}>{DOC_LABELS[t]}</option>)}
          </select>
          <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="rounded-md border border-input bg-secondary px-3 py-2 text-sm" />
        </div>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm" />
        <button onClick={save} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"><Plus className="h-3.5 w-3.5" /> Save</button>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {(Object.keys(DOC_LABELS) as DocumentType[]).map((t) => {
          const d = docByType(t);
          const alert = d ? alertFor(d.expiryDate) : null;
          return (
            <div key={t} className="rounded-md border bg-card p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium flex items-center gap-2">
                  {DOC_LABELS[t]}
                  {alert && <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${alert.cls}`}><AlertTriangle className="inline h-3 w-3 mr-0.5" />{alert.label}</span>}
                </p>
                <p className="text-xs text-muted-foreground">{d ? `Expires ${format(new Date(d.expiryDate + "T00:00:00"), "dd MMM yyyy")}${d.notes ? ` · ${d.notes}` : ""}` : "Not set"}</p>
              </div>
              {d && (
                <button onClick={() => { if (confirm("Remove?")) deleteVehicleDocument(d.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function download(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
