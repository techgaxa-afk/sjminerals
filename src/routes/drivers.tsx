import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useMemo, useState } from "react";
import {
  getDrivers, saveDriver, updateDriver, deleteDriver,
  getDriverTransactions, saveDriverTransaction, deleteDriverTransaction,
  getDriverBalance, getDriverStats, useCloudData,
  type Driver, type DriverTxnType,
} from "../lib/store";
import { Plus, Search, Users, X, Download, FileText, FileSpreadsheet, Trash2, Pencil, ArrowRightLeft, IndianRupee, BookOpen } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/drivers")({
  component: DriversPage,
});

function DriversPage() {
  useCloudData();
  const drivers = getDrivers();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [openDriverId, setOpenDriverId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Transaction form
  const [txnType, setTxnType] = useState<DriverTxnType>("advance");
  const [txnAmount, setTxnAmount] = useState("");
  const [txnDate, setTxnDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [txnNotes, setTxnNotes] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return drivers.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (!q) return true;
      return d.name.toLowerCase().includes(q) || d.mobile.includes(q) || d.licenseNumber.toLowerCase().includes(q);
    });
  }, [drivers, search, statusFilter]);

  const dashboard = useMemo(() => {
    const total = drivers.length;
    let advances = 0, settlements = 0;
    drivers.forEach((d) => {
      getDriverTransactions(d.id).forEach((t) => {
        if (t.txnType === "advance") advances += t.amount; else settlements += t.amount;
      });
    });
    return { total, advances, settlements, outstanding: advances - settlements };
  }, [drivers]);

  const topDrivers = useMemo(() => {
    return drivers.map((d) => ({ d, ...getDriverStats(d.id) }))
      .sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [drivers]);

  const resetForm = () => {
    setShowForm(false); setEditingId(null); setError(null);
    setName(""); setMobile(""); setLicenseNumber(""); setAddress(""); setStatus("active");
  };

  const handleSave = () => {
    setError(null);
    if (!name.trim()) { setError("Driver name is required."); return; }
    if (editingId) updateDriver(editingId, { name: name.trim(), mobile: mobile.trim(), licenseNumber: licenseNumber.trim(), address: address.trim(), status });
    else saveDriver({ name: name.trim(), mobile: mobile.trim(), licenseNumber: licenseNumber.trim(), address: address.trim(), status });
    resetForm();
  };

  const startEdit = (d: Driver) => {
    setEditingId(d.id); setName(d.name); setMobile(d.mobile);
    setLicenseNumber(d.licenseNumber); setAddress(d.address); setStatus(d.status);
    setError(null); setShowForm(true);
  };

  const handleAddTxn = () => {
    if (!openDriverId) return;
    const amt = Number(txnAmount);
    if (!(amt > 0)) return;
    saveDriverTransaction({ driverId: openDriverId, txnType, amount: amt, date: txnDate, notes: txnNotes.trim() });
    setTxnAmount(""); setTxnNotes("");
  };

  const openDriver = openDriverId ? drivers.find((d) => d.id === openDriverId) : null;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="module-header mb-0">Drivers</h1>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Add Driver</button>
        </div>

        {/* Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="stat-card"><div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" /> Total Drivers</div><p className="text-xl font-bold text-foreground">{dashboard.total}</p></div>
          <div className="stat-card border-warning/30 bg-warning/5"><div className="flex items-center gap-1.5 text-xs text-warning"><ArrowRightLeft className="h-3.5 w-3.5" /> Total Advances</div><p className="text-xl font-bold text-warning">₹{dashboard.advances.toLocaleString()}</p></div>
          <div className="stat-card border-success/30 bg-success/5"><div className="flex items-center gap-1.5 text-xs text-success"><IndianRupee className="h-3.5 w-3.5" /> Total Settlements</div><p className="text-xl font-bold text-success">₹{dashboard.settlements.toLocaleString()}</p></div>
          <div className={`stat-card ${dashboard.outstanding > 0 ? "border-destructive/30 bg-destructive/5" : "border-primary/30 bg-primary/5"}`}>
            <div className={`flex items-center gap-1.5 text-xs ${dashboard.outstanding > 0 ? "text-destructive" : "text-primary"}`}><BookOpen className="h-3.5 w-3.5" /> Outstanding</div>
            <p className={`text-xl font-bold ${dashboard.outstanding > 0 ? "text-destructive" : "text-primary"}`}>₹{dashboard.outstanding.toLocaleString()}</p>
          </div>
        </div>

        {/* Top drivers */}
        {topDrivers.length > 0 && (
          <div className="stat-card">
            <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">Top Drivers</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-1.5 pr-2">Driver</th><th className="py-1.5 pr-2 text-right">Trips</th><th className="py-1.5 pr-2 text-right">Revenue</th><th className="py-1.5 text-right">Profit</th></tr></thead>
                <tbody>
                  {topDrivers.map((t) => (
                    <tr key={t.d.id} className="border-b border-border/40">
                      <td className="py-1.5 pr-2">{t.d.name}</td>
                      <td className="py-1.5 pr-2 text-right">{t.trips}</td>
                      <td className="py-1.5 pr-2 text-right">₹{t.revenue.toLocaleString()}</td>
                      <td className={`py-1.5 text-right font-semibold ${t.profit < 0 ? "text-destructive" : "text-success"}`}>₹{t.profit.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showForm && (
          <div className="stat-card space-y-3">
            <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">{editingId ? "Edit" : "New"} Driver</h3><button onClick={resetForm}><X className="h-4 w-4 text-muted-foreground" /></button></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="field-label">Driver Name *</label><input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm" /></div>
              <div><label className="field-label">Mobile</label><input value={mobile} onChange={(e) => setMobile(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm" /></div>
              <div><label className="field-label">License Number</label><input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm" /></div>
              <div>
                <label className="field-label">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as "active" | "inactive")} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm">
                  <option value="active">Active</option><option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="sm:col-span-2"><label className="field-label">Address</label><textarea value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm" rows={2} /></div>
            </div>
            {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}
            <div className="flex gap-2"><button onClick={handleSave} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Save</button><button onClick={resetForm} className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground">Cancel</button></div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search drivers..." className="w-full rounded-md border border-input bg-secondary pl-9 pr-3 py-2 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="rounded-md border border-input bg-secondary px-3 py-2 text-sm">
            <option value="all">All Statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Driver list */}
        <div className="space-y-2">
          {filtered.map((d) => {
            const bal = getDriverBalance(d.id);
            return (
              <div key={d.id} className="stat-card flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setOpenDriverId(d.id)}>
                  <div className="rounded-md bg-secondary p-2"><Users className="h-4 w-4 text-muted-foreground" /></div>
                  <div>
                    <p className="font-medium text-foreground flex items-center gap-2">{d.name}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${d.status === "active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{d.status.toUpperCase()}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{d.mobile || "—"} · {d.licenseNumber || "No license"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase">Balance</p>
                    <p className={`text-sm font-bold ${bal > 0 ? "text-destructive" : "text-success"}`}>₹{bal.toLocaleString()}</p>
                  </div>
                  <button onClick={() => setOpenDriverId(d.id)} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground" title="Ledger"><BookOpen className="h-4 w-4" /></button>
                  <button onClick={() => startEdit(d)} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { if (confirm(`Delete ${d.name}? All transactions will be removed.`)) deleteDriver(d.id); }} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No drivers found.</p>}
        </div>
      </div>

      {/* Ledger Drawer */}
      {openDriver && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end" onClick={() => setOpenDriverId(null)}>
          <div className="w-full max-w-2xl bg-background h-full overflow-y-auto p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">{openDriver.name}</h2>
                <p className="text-xs text-muted-foreground">{openDriver.mobile} · {openDriver.licenseNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => exportLedger(openDriver, "csv")} className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1.5 text-xs"><Download className="h-3 w-3" /> CSV</button>
                <button onClick={() => exportLedger(openDriver, "xls")} className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1.5 text-xs"><FileSpreadsheet className="h-3 w-3" /> Excel</button>
                <button onClick={() => exportLedger(openDriver, "pdf")} className="flex items-center gap-1 rounded-md bg-primary px-2 py-1.5 text-xs text-primary-foreground"><FileText className="h-3 w-3" /> PDF</button>
                <button onClick={() => setOpenDriverId(null)}><X className="h-4 w-4" /></button>
              </div>
            </div>

            {/* Add transaction */}
            <div className="stat-card space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase">Add Transaction</h3>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setTxnType("advance")} className={`rounded-md border p-2 text-xs font-medium ${txnType === "advance" ? "border-warning bg-warning/10 text-warning" : "border-border text-muted-foreground"}`}>Advance</button>
                <button onClick={() => setTxnType("settlement")} className={`rounded-md border p-2 text-xs font-medium ${txnType === "settlement" ? "border-success bg-success/10 text-success" : "border-border text-muted-foreground"}`}>Settlement</button>
              </div>
              <input type="number" value={txnAmount} onChange={(e) => setTxnAmount(e.target.value)} placeholder="Amount" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm" />
              <input type="date" value={txnDate} onChange={(e) => setTxnDate(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm" />
              <input value={txnNotes} onChange={(e) => setTxnNotes(e.target.value)} placeholder="Notes (optional)" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm" />
              <button onClick={handleAddTxn} className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Add {txnType === "advance" ? "Advance" : "Settlement"}</button>
            </div>

            {/* Ledger */}
            <div className="stat-card overflow-x-auto">
              <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">Ledger</h3>
              <LedgerTable driverId={openDriver.id} />
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function LedgerTable({ driverId }: { driverId: string }) {
  useCloudData();
  const txns = getDriverTransactions(driverId);
  let running = 0;
  return (
    <table className="w-full text-xs">
      <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-1.5 pr-2">Date</th><th className="py-1.5 pr-2">Reference</th><th className="py-1.5 pr-2 text-right">Advance</th><th className="py-1.5 pr-2 text-right">Settlement</th><th className="py-1.5 text-right">Balance</th><th></th></tr></thead>
      <tbody>
        {txns.map((t) => {
          running += t.txnType === "advance" ? t.amount : -t.amount;
          return (
            <tr key={t.id} className="border-b border-border/40">
              <td className="py-1.5 pr-2 whitespace-nowrap">{format(new Date(t.date + "T00:00:00"), "dd MMM yy")}</td>
              <td className="py-1.5 pr-2">{t.notes || "—"}</td>
              <td className="py-1.5 pr-2 text-right text-warning">{t.txnType === "advance" ? `₹${t.amount.toLocaleString()}` : ""}</td>
              <td className="py-1.5 pr-2 text-right text-success">{t.txnType === "settlement" ? `₹${t.amount.toLocaleString()}` : ""}</td>
              <td className={`py-1.5 text-right font-semibold ${running > 0 ? "text-destructive" : "text-foreground"}`}>₹{running.toLocaleString()}</td>
              <td className="py-1.5 pl-2"><button onClick={() => { if (confirm("Delete transaction?")) deleteDriverTransaction(t.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button></td>
            </tr>
          );
        })}
        {txns.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No transactions yet.</td></tr>}
      </tbody>
    </table>
  );
}

function exportLedger(driver: Driver, fmt: "csv" | "xls" | "pdf") {
  const txns = getDriverTransactions(driver.id);
  let running = 0;
  const rows = txns.map((t) => {
    running += t.txnType === "advance" ? t.amount : -t.amount;
    return {
      date: t.date,
      ref: t.notes || "",
      advance: t.txnType === "advance" ? t.amount : 0,
      settlement: t.txnType === "settlement" ? t.amount : 0,
      balance: running,
    };
  });

  if (fmt === "csv") {
    const lines = [["Date", "Reference", "Advance", "Settlement", "Balance"].join(",")];
    rows.forEach((r) => lines.push([r.date, csv(r.ref), r.advance || "", r.settlement || "", r.balance].join(",")));
    download(`driver-${driver.name}-${Date.now()}.csv`, "text/csv;charset=utf-8;", lines.join("\n"));
  } else if (fmt === "xls") {
    const html = `<html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr><th>Date</th><th>Reference</th><th>Advance</th><th>Settlement</th><th>Balance</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r.date}</td><td>${esc(r.ref)}</td><td>${r.advance || ""}</td><td>${r.settlement || ""}</td><td>${r.balance}</td></tr>`).join("")}</tbody></table></body></html>`;
    download(`driver-${driver.name}-${Date.now()}.xls`, "application/vnd.ms-excel", html);
  } else {
    const body = rows.map((r) => `<tr><td>${r.date}</td><td>${esc(r.ref)}</td><td style="text-align:right">${r.advance ? "₹" + r.advance.toLocaleString() : ""}</td><td style="text-align:right">${r.settlement ? "₹" + r.settlement.toLocaleString() : ""}</td><td style="text-align:right">₹${r.balance.toLocaleString()}</td></tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${driver.name} — Driver Ledger</title><style>body{font-family:system-ui,sans-serif;padding:16px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:6px 8px}th{background:#f3f4f6;text-align:left}@media print{button{display:none}}</style></head><body><h1>${driver.name} — Driver Ledger</h1><p>${driver.mobile} · ${driver.licenseNumber}</p><table><thead><tr><th>Date</th><th>Reference</th><th>Advance</th><th>Settlement</th><th>Balance</th></tr></thead><tbody>${body}</tbody></table><button onclick="window.print()">Print / Save as PDF</button><script>setTimeout(()=>window.print(),300)</script></body></html>`;
    const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); }
  }
}

function csv(s: string | number): string { const v = String(s ?? ""); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }
function esc(s: string): string { return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string); }
function download(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
