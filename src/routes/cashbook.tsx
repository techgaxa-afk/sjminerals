import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useMemo, useState } from "react";
import {
  getBills, getExpenses, getAllCompanyPayments, useCloudData,
} from "../lib/store";
import { Banknote, CreditCard, Download, FileText, FileSpreadsheet, Search } from "lucide-react";
import { format, startOfDay, startOfWeek, startOfMonth } from "date-fns";

export const Route = createFileRoute("/cashbook")({
  component: CashbookPage,
});

type Mode = "cash" | "upi";
type TxType = "Cash Sale" | "UPI Sale" | "Collection" | "Expense" | "Credit Expense" | "Adjustment";
interface LedgerRow {
  id: string;
  date: string; // ISO
  type: TxType;
  reference: string;
  credit: number;
  debit: number;
  mode: Mode;
  running?: number;
}

type Range = "all" | "today" | "week" | "month" | "custom";
type ModeFilter = "all" | "cash" | "upi";

function CashbookPage() {
  useCloudData();
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [range, setRange] = useState<Range>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");

  const allRows = useMemo<LedgerRow[]>(() => {
    const rows: LedgerRow[] = [];
    // Sales from bills
    getBills().forEach((b) => {
      const ref = b.invoiceNumber || b.id.slice(-6).toUpperCase();
      if (b.splitPayment) {
        if ((b.cashAmount ?? 0) > 0) rows.push({ id: `${b.id}-cs`, date: b.createdAt, type: "Cash Sale", reference: `${ref} · ${b.companyName}`, credit: b.cashAmount ?? 0, debit: 0, mode: "cash" });
        if ((b.upiAmount ?? 0) > 0) rows.push({ id: `${b.id}-us`, date: b.createdAt, type: "UPI Sale", reference: `${ref} · ${b.companyName}`, credit: b.upiAmount ?? 0, debit: 0, mode: "upi" });
      } else if (b.paymentMode === "cash" && (b.paidAmount ?? 0) > 0) {
        rows.push({ id: `${b.id}-cs`, date: b.createdAt, type: "Cash Sale", reference: `${ref} · ${b.companyName}`, credit: b.paidAmount ?? 0, debit: 0, mode: "cash" });
      } else if (b.paymentMode === "upi" && (b.paidAmount ?? 0) > 0) {
        rows.push({ id: `${b.id}-us`, date: b.createdAt, type: "UPI Sale", reference: `${ref} · ${b.companyName}`, credit: b.paidAmount ?? 0, debit: 0, mode: "upi" });
      }
    });
    // Collections from company_payments (active only)
    getAllCompanyPayments().forEach((p) => {
      if (p.status === "reversed") return;
      const method = (p.paymentMethod || "cash").toLowerCase();
      if (method !== "cash" && method !== "upi") return;
      rows.push({
        id: `cp-${p.id}`,
        date: p.paymentDate || p.createdAt,
        type: "Collection",
        reference: `${p.receiptNumber || p.referenceNumber || p.id.slice(-6).toUpperCase()}`,
        credit: p.amount,
        debit: 0,
        mode: method as Mode,
      });
    });
    // Expenses
    const cashRun: Record<string, number> = {};
    void cashRun;
    getExpenses().forEach((e) => {
      const m: Mode = e.paymentMode === "upi" ? "upi" : "cash";
      rows.push({
        id: `e-${e.id}`,
        date: e.date + "T00:00:00",
        type: "Expense",
        reference: `${e.category}${e.notes ? ` · ${e.notes}` : ""}`,
        credit: 0,
        debit: e.amount,
        mode: m,
      });
    });
    // Sort chronologically (asc)
    rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    // Compute running balance per mode and tag credit expenses
    let runCash = 0, runUpi = 0;
    rows.forEach((r) => {
      const delta = r.credit - r.debit;
      if (r.mode === "cash") { runCash += delta; r.running = runCash; }
      else { runUpi += delta; r.running = runUpi; }
      if (r.type === "Expense" && (r.running ?? 0) < 0) r.type = "Credit Expense";
    });
    return rows;
  }, []);

  // Filter
  const filtered = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;
    if (range === "today") start = startOfDay(now);
    else if (range === "week") start = startOfWeek(now, { weekStartsOn: 1 });
    else if (range === "month") start = startOfMonth(now);
    else if (range === "custom") {
      if (from) start = new Date(from + "T00:00:00");
      if (to) end = new Date(to + "T23:59:59");
    }
    const q = search.trim().toLowerCase();
    return allRows.filter((r) => {
      const t = new Date(r.date).getTime();
      if (start && t < start.getTime()) return false;
      if (end && t > end.getTime()) return false;
      if (modeFilter !== "all" && r.mode !== modeFilter) return false;
      if (q && !r.reference.toLowerCase().includes(q) && !r.type.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allRows, range, from, to, modeFilter, search]);

  // Opening balance = sum of running deltas BEFORE the filter window's first row
  const summary = useMemo(() => {
    const filteredIds = new Set(filtered.map((r) => r.id));
    let opening = 0, credits = 0, debits = 0;
    let stopped = false;
    for (const r of allRows) {
      if (filteredIds.has(r.id)) { stopped = true; }
      const delta = r.credit - r.debit;
      if (!stopped) opening += delta;
      if (filteredIds.has(r.id)) { credits += r.credit; debits += r.debit; }
    }
    const closing = opening + credits - debits;
    return { opening, credits, debits, closing };
  }, [allRows, filtered]);

  // Recompute window-running based on opening
  const rowsWithWindowRunning = useMemo(() => {
    let bal = summary.opening;
    return filtered.map((r) => {
      bal += r.credit - r.debit;
      return { ...r, windowRunning: bal };
    });
  }, [filtered, summary.opening]);

  const exportCSV = () => {
    const header = ["Date", "Type", "Reference", "Mode", "Credit", "Debit", "Running Balance"];
    const lines = [header.join(",")];
    lines.push(["", "Opening Balance", "", "", "", "", summary.opening].map(csvCell).join(","));
    rowsWithWindowRunning.forEach((r) => {
      lines.push([
        format(new Date(r.date), "yyyy-MM-dd HH:mm"),
        r.type,
        r.reference,
        r.mode.toUpperCase(),
        r.credit || "",
        r.debit || "",
        r.windowRunning,
      ].map(csvCell).join(","));
    });
    lines.push(["", "Closing Balance", "", "", summary.credits, summary.debits, summary.closing].map(csvCell).join(","));
    download(`cashbook-${Date.now()}.csv`, "text/csv;charset=utf-8;", lines.join("\n"));
  };

  const exportExcel = () => {
    // HTML table that Excel can open natively (.xls)
    const rowsHtml = rowsWithWindowRunning.map((r) => `<tr><td>${format(new Date(r.date), "yyyy-MM-dd HH:mm")}</td><td>${esc(r.type)}</td><td>${esc(r.reference)}</td><td>${r.mode.toUpperCase()}</td><td>${r.credit || ""}</td><td>${r.debit || ""}</td><td>${r.windowRunning}</td></tr>`).join("");
    const html = `<html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Mode</th><th>Credit</th><th>Debit</th><th>Running Balance</th></tr></thead><tbody><tr><td></td><td>Opening Balance</td><td colspan="4"></td><td>${summary.opening}</td></tr>${rowsHtml}<tr><td></td><td>Closing Balance</td><td colspan="2"></td><td>${summary.credits}</td><td>${summary.debits}</td><td>${summary.closing}</td></tr></tbody></table></body></html>`;
    download(`cashbook-${Date.now()}.xls`, "application/vnd.ms-excel", html);
  };

  const exportPDF = () => {
    const rowsHtml = rowsWithWindowRunning.map((r) => {
      const neg = r.windowRunning < 0;
      return `<tr><td>${format(new Date(r.date), "yyyy-MM-dd HH:mm")}</td><td>${esc(r.type)}</td><td>${esc(r.reference)}</td><td>${r.mode.toUpperCase()}</td><td style="text-align:right;color:#15803d">${r.credit ? "₹" + r.credit.toLocaleString() : ""}</td><td style="text-align:right;color:#b91c1c">${r.debit ? "₹" + r.debit.toLocaleString() : ""}</td><td style="text-align:right;${neg ? "color:#b91c1c;font-weight:bold" : ""}">₹${r.windowRunning.toLocaleString()}${neg ? " OVERDRAWN" : ""}</td></tr>`;
    }).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Cashbook</title><style>body{font-family:system-ui,sans-serif;padding:16px;color:#111}h1{margin:0 0 8px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f3f4f6}.sum{margin:12px 0;display:flex;gap:16px;font-size:13px}.sum div{padding:6px 10px;border:1px solid #ddd;border-radius:6px}@media print{button{display:none}}</style></head><body><h1>Cashbook Ledger</h1><div class="sum"><div>Opening: ₹${summary.opening.toLocaleString()}</div><div>Credits: ₹${summary.credits.toLocaleString()}</div><div>Debits: ₹${summary.debits.toLocaleString()}</div><div>Closing: ₹${summary.closing.toLocaleString()}</div></div><table><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Mode</th><th>Credit</th><th>Debit</th><th>Running Balance</th></tr></thead><tbody>${rowsHtml}</tbody></table><button onclick="window.print()">Print / Save as PDF</button><script>setTimeout(()=>window.print(),300)</script></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="module-header mb-0">Cashbook</h1>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground hover:bg-muted"><Download className="h-3.5 w-3.5" /> CSV</button>
            <button onClick={exportExcel} className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground hover:bg-muted"><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</button>
            <button onClick={exportPDF} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"><FileText className="h-3.5 w-3.5" /> PDF</button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="stat-card">
            <p className="text-[10px] text-muted-foreground uppercase">Opening Balance</p>
            <p className={`text-xl font-bold ${summary.opening < 0 ? "text-destructive" : "text-foreground"}`}>₹{summary.opening.toLocaleString()}</p>
          </div>
          <div className="stat-card border-success/30 bg-success/5">
            <p className="text-[10px] text-success uppercase">Total Credits</p>
            <p className="text-xl font-bold text-success">₹{summary.credits.toLocaleString()}</p>
          </div>
          <div className="stat-card border-destructive/30 bg-destructive/5">
            <p className="text-[10px] text-destructive uppercase">Total Debits</p>
            <p className="text-xl font-bold text-destructive">₹{summary.debits.toLocaleString()}</p>
          </div>
          <div className={`stat-card ${summary.closing < 0 ? "border-destructive/40 bg-destructive/5" : "border-primary/30 bg-primary/5"}`}>
            <div className="flex items-center justify-between">
              <p className={`text-[10px] uppercase ${summary.closing < 0 ? "text-destructive" : "text-primary"}`}>Closing Balance</p>
              {summary.closing < 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">OVERDRAWN</span>}
            </div>
            <p className={`text-xl font-bold ${summary.closing < 0 ? "text-destructive" : "text-primary"}`}>₹{summary.closing.toLocaleString()}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="stat-card space-y-2">
          <div className="flex flex-wrap gap-2">
            {(["all", "cash", "upi"] as ModeFilter[]).map((m) => (
              <button key={m} onClick={() => setModeFilter(m)} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border transition-colors ${modeFilter === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                {m === "cash" ? <Banknote className="h-3.5 w-3.5" /> : m === "upi" ? <CreditCard className="h-3.5 w-3.5" /> : null}
                {m === "all" ? "All Modes" : m.toUpperCase()}
              </button>
            ))}
            <div className="w-px bg-border mx-1" />
            {(["all", "today", "week", "month", "custom"] as Range[]).map((r) => (
              <button key={r} onClick={() => setRange(r)} className={`rounded-md px-3 py-1.5 text-xs font-medium border transition-colors ${range === r ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                {r === "all" ? "All Time" : r === "today" ? "Today" : r === "week" ? "This Week" : r === "month" ? "This Month" : "Custom"}
              </button>
            ))}
          </div>
          {range === "custom" && (
            <div className="flex gap-2 flex-wrap">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border border-input bg-secondary px-3 py-2 text-sm" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border border-input bg-secondary px-3 py-2 text-sm" />
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reference or type..." className="w-full rounded-md border border-input bg-secondary pl-9 pr-3 py-2 text-sm" />
          </div>
        </div>

        {/* Ledger table */}
        <div className="stat-card overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-2 font-medium">Date</th>
                <th className="py-2 pr-2 font-medium">Type</th>
                <th className="py-2 pr-2 font-medium">Reference</th>
                <th className="py-2 pr-2 font-medium">Mode</th>
                <th className="py-2 pr-2 font-medium text-right">Credit (+)</th>
                <th className="py-2 pr-2 font-medium text-right">Debit (-)</th>
                <th className="py-2 pl-2 font-medium text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/60 bg-secondary/40">
                <td colSpan={6} className="py-2 pr-2 italic text-muted-foreground">Opening Balance</td>
                <td className={`py-2 pl-2 text-right font-semibold ${summary.opening < 0 ? "text-destructive" : "text-foreground"}`}>₹{summary.opening.toLocaleString()}</td>
              </tr>
              {rowsWithWindowRunning.map((r) => {
                const neg = r.windowRunning < 0;
                return (
                  <tr key={r.id} className="border-b border-border/40">
                    <td className="py-2 pr-2 whitespace-nowrap">{format(new Date(r.date), "dd MMM yy, HH:mm")}</td>
                    <td className="py-2 pr-2">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${typeColor(r.type)}`}>{r.type}</span>
                    </td>
                    <td className="py-2 pr-2">{r.reference}</td>
                    <td className="py-2 pr-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${r.mode === "upi" ? "bg-primary/15 text-primary" : "bg-success/15 text-success"}`}>{r.mode.toUpperCase()}</span>
                    </td>
                    <td className="py-2 pr-2 text-right text-success">{r.credit ? `+₹${r.credit.toLocaleString()}` : ""}</td>
                    <td className="py-2 pr-2 text-right text-destructive">{r.debit ? `-₹${r.debit.toLocaleString()}` : ""}</td>
                    <td className={`py-2 pl-2 text-right font-semibold ${neg ? "text-destructive" : "text-foreground"}`}>
                      ₹{r.windowRunning.toLocaleString()}
                      {neg && <span className="ml-1 text-[9px] font-bold px-1 py-0.5 rounded bg-destructive/20 text-destructive">OVERDRAWN</span>}
                    </td>
                  </tr>
                );
              })}
              {rowsWithWindowRunning.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No transactions in selected range.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Try parseISO for completeness */}
        <span className="hidden">{parseISO("2020-01-01").toString()}</span>
      </div>
    </AppLayout>
  );
}

function typeColor(t: TxType): string {
  switch (t) {
    case "Cash Sale": return "bg-success/15 text-success";
    case "UPI Sale": return "bg-primary/15 text-primary";
    case "Collection": return "bg-indigo-500/15 text-indigo-500";
    case "Expense": return "bg-destructive/15 text-destructive";
    case "Credit Expense": return "bg-orange-500/20 text-orange-500";
    case "Adjustment": return "bg-warning/15 text-warning";
  }
}

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);
}
function download(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
