import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState, useMemo } from "react";
import {
  getBills, getCompanies, getCompanyOutstanding,
  getHitachiEntries, getHitachiFuel, getOperators, getAllCompanyPayments,
  getCompanyAging,
} from "../lib/store";
import { Building2, Users, Settings, Search, Wallet, FileDown, AlertTriangle, LineChart as LineChartIcon } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { format } from "date-fns";


type ReportType = "company" | "vehicle" | "hitachi" | "operator" | "ledger" | "aging" | "analytics";
type FilterType = "daily" | "weekly" | "monthly" | "custom";
type Preset = "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "lastMonth";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
  validateSearch: (s: Record<string, unknown>) => ({
    tab: (s.tab as ReportType) || undefined,
    from: typeof s.from === "string" ? s.from : undefined,
    to: typeof s.to === "string" ? s.to : undefined,
    preset: (s.preset as Preset) || undefined,
  }),
});

const sod = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const eod = (d: Date) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };
const isoDate = (d: Date) => format(d, "yyyy-MM-dd");

function presetRange(p: Preset): { start: Date; end: Date } {
  const now = new Date();
  if (p === "today") return { start: sod(now), end: eod(now) };
  if (p === "yesterday") { const y = new Date(now); y.setDate(y.getDate()-1); return { start: sod(y), end: eod(y) }; }
  if (p === "last7") { const s = new Date(now); s.setDate(s.getDate()-6); return { start: sod(s), end: eod(now) }; }
  if (p === "last30") { const s = new Date(now); s.setDate(s.getDate()-29); return { start: sod(s), end: eod(now) }; }
  if (p === "thisMonth") return { start: sod(new Date(now.getFullYear(), now.getMonth(), 1)), end: eod(now) };
  return { start: sod(new Date(now.getFullYear(), now.getMonth()-1, 1)), end: eod(new Date(now.getFullYear(), now.getMonth(), 0)) };
}

function rangeFor(filter: FilterType, custom: { start: Date; end: Date } | null): { start: Date; end: Date } {
  const now = new Date();
  if (filter === "custom" && custom) return custom;
  if (filter === "daily") return { start: sod(now), end: eod(now) };
  if (filter === "weekly") { const s = new Date(now); s.setDate(s.getDate()-7); return { start: sod(s), end: eod(now) }; }
  if (filter === "monthly") { const s = new Date(now); s.setMonth(s.getMonth()-1); return { start: sod(s), end: eod(now) }; }
  return { start: sod(now), end: eod(now) };
}

function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("company");
  const [filter, setFilter] = useState<FilterType>("monthly");
  const [search, setSearch] = useState("");
  const { start } = getDateRange(filter);

  const allBillsInRange = useMemo(() => getBills().filter((b) => new Date(b.createdAt) >= start), [start]);
  const passStats = useMemo(() => {
    const passBills = allBillsInRange.filter((b) => b.passEnabled);
    return {
      count: passBills.length,
      total: passBills.reduce((s, b) => s + (b.passAmount || 0), 0),
    };
  }, [allBillsInRange]);

  const data = useMemo(() => {
    const bills = allBillsInRange;
    const companies = getCompanies();
    const hitachiEntries = getHitachiEntries().filter((e) => new Date(e.createdAt) >= start);
    const hitachiFuel = getHitachiFuel().filter((f) => new Date(f.createdAt) >= start);
    const ops = getOperators();

    if (reportType === "company") {
      return companies.map((c) => {
        const cBills = bills.filter((b) => b.companyId === c.id);
        return {
          id: c.id, name: c.name, sub: c.contactNumber,
          trips: cBills.length,
          revenue: cBills.reduce((s, b) => s + b.totalAmount, 0),
          outstanding: getCompanyOutstanding(c.id),
        };
      }).filter((r) => r.trips > 0 || r.name.toLowerCase().includes(search.toLowerCase()));
    }

    if (reportType === "vehicle") {
      const vehicleMap = new Map<string, { name: string; trips: number; revenue: number; outstanding: number }>();
      bills.forEach((b) => {
        if (!b.vehicleNumber) return;
        const existing = vehicleMap.get(b.vehicleNumber) || { name: `${b.vehicleNumber} (${b.vehicleCapacity})`, trips: 0, revenue: 0, outstanding: 0 };
        existing.trips += 1;
        existing.revenue += b.totalAmount;
        existing.outstanding += b.outstandingAmount || 0;
        vehicleMap.set(b.vehicleNumber, existing);
      });
      return Array.from(vehicleMap.entries()).map(([id, d]) => ({
        id, name: d.name, sub: "", trips: d.trips, revenue: d.revenue, outstanding: d.outstanding,
      })).filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
    }

    if (reportType === "hitachi") {
      const machineMap = new Map<string, { name: string; totalHrs: number; totalRev: number; totalFuel: number; entries: number }>();
      hitachiEntries.forEach((e) => {
        const existing = machineMap.get(e.machineId) || { name: e.machineName, totalHrs: 0, totalRev: 0, totalFuel: 0, entries: 0 };
        existing.totalHrs += e.totalHours;
        existing.totalRev += e.machineRevenue;
        existing.entries += 1;
        machineMap.set(e.machineId, existing);
      });
      hitachiFuel.forEach((f) => {
        const existing = machineMap.get(f.machineId) || { name: f.machineName, totalHrs: 0, totalRev: 0, totalFuel: 0, entries: 0 };
        existing.totalFuel += f.liters;
        machineMap.set(f.machineId, existing);
      });
      return Array.from(machineMap.entries()).map(([id, d]) => ({
        id, name: d.name, sub: "", trips: d.entries, revenue: d.totalRev, outstanding: d.totalFuel, isHitachi: true,
      }));
    }

    // operator
    return ops.map((o) => {
      const oEntries = hitachiEntries.filter((e) => e.operatorId === o.id);
      const totalHrs = oEntries.reduce((s, e) => s + e.totalHours, 0);
      const totalSalary = oEntries.reduce((s, e) => s + e.operatorSalary, 0);
      return {
        id: o.id, name: o.name, sub: `₹${o.hourlySalaryRate}/hr`,
        trips: oEntries.length, revenue: totalHrs, outstanding: totalSalary, isOperator: true,
      };
    }).filter((r) => r.trips > 0 || r.name.toLowerCase().includes(search.toLowerCase()));
  }, [reportType, filter, start, search, allBillsInRange]);

  const ledger = useMemo(() => {
    if (reportType !== "ledger") return [];
    const companies = getCompanies();
    const nameOf = (id: string) => companies.find((c) => c.id === id)?.name ?? "—";
    const rows = getAllCompanyPayments()
      .filter((p) => new Date(p.paymentDate) >= start)
      .map((p) => ({
        id: p.id,
        date: p.paymentDate,
        company: nameOf(p.companyId),
        amount: p.amount,
        method: p.paymentMethod,
        reference: p.referenceNumber ?? "",
        notes: p.notes ?? "",
      }))
      .filter((r) => !search || r.company.toLowerCase().includes(search.toLowerCase()) || r.reference.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return rows;
  }, [reportType, start, search]);

  const ledgerTotal = useMemo(() => ledger.reduce((s, r) => s + r.amount, 0), [ledger]);

  const aging = useMemo(() => {
    if (reportType !== "aging") return [];
    return getCompanies()
      .map((c) => {
        const b = getCompanyAging(c.id);
        return { id: c.id, name: c.name, ...b };
      })
      .filter((r) => r.total > 0 && (!search || r.name.toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => b.total - a.total);
  }, [reportType, search]);

  const agingTotals = useMemo(
    () => aging.reduce(
      (acc, r) => ({
        current: acc.current + r.current,
        d30: acc.d30 + r.d30,
        d60: acc.d60 + r.d60,
        d90: acc.d90 + r.d90,
        d90plus: acc.d90plus + r.d90plus,
        total: acc.total + r.total,
      }),
      { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0, total: 0 },
    ),
    [aging],
  );

  const exportLedgerCSV = () => {
    const headers = ["Date", "Company", "Amount", "Method", "Reference", "Notes"];
    const escape = (v: string | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [headers.join(",")].concat(
      ledger.map((r) => [r.date, r.company, r.amount.toString(), r.method, r.reference, r.notes].map(escape).join(","))
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `payment-ledger-${filter}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const analytics = useMemo(() => {
    if (reportType !== "analytics") return { monthly: [] as { month: string; collected: number; invoiced: number; outstanding: number; rate: number }[] };
    const now = new Date();
    const months: { key: string; month: string; collected: number; invoiced: number; outstanding: number; rate: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: format(d, "MMM yy"), collected: 0, invoiced: 0, outstanding: 0, rate: 0 });
    }
    const idx = (d: Date) => months.findIndex((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
    getAllCompanyPayments().filter((p) => p.status !== "reversed").forEach((p) => {
      const i = idx(new Date(p.paymentDate)); if (i >= 0) months[i].collected += p.amount;
    });
    getBills().forEach((b) => { const i = idx(new Date(b.createdAt)); if (i >= 0) months[i].invoiced += b.totalAmount || 0; });
    let running = 0;
    months.forEach((m) => { running += m.invoiced - m.collected; m.outstanding = Math.max(0, running); m.rate = m.invoiced > 0 ? Math.round((m.collected / m.invoiced) * 100) : 0; });
    return { monthly: months };
  }, [reportType]);

  const reportTabs: { id: ReportType; label: string; icon: typeof Building2 }[] = [
    { id: "company", label: "Company", icon: Building2 },
    { id: "vehicle", label: "Vehicle", icon: Building2 },
    { id: "hitachi", label: "Hitachi", icon: Settings },
    { id: "operator", label: "Operator", icon: Users },
    { id: "ledger", label: "Ledger", icon: Wallet },
    { id: "aging", label: "Aging", icon: AlertTriangle },
    { id: "analytics", label: "Analytics", icon: LineChartIcon },
  ];

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="module-header">Reports</h1>

        <div className="flex gap-1 rounded-md bg-secondary p-1 overflow-x-auto">
          {reportTabs.map((t) => (
            <button key={t.id} onClick={() => setReportType(t.id)} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${reportType === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full rounded-md border border-input bg-secondary pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex gap-1 rounded-md bg-secondary p-1">
            {(["daily", "weekly", "monthly"] as FilterType[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{f}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="stat-card">
            <p className="text-xs text-muted-foreground">Pass Collections</p>
            <p className="font-bold text-primary">₹{passStats.total.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground">Pass Used</p>
            <p className="font-bold text-foreground">{passStats.count} bill{passStats.count === 1 ? "" : "s"}</p>
          </div>
        </div>


        {reportType === "ledger" ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{ledger.length} payment{ledger.length === 1 ? "" : "s"} · ₹{ledgerTotal.toLocaleString()}</p>
              <button
                onClick={exportLedgerCSV}
                disabled={ledger.length === 0}
                className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                <FileDown className="h-3.5 w-3.5" /> Export CSV
              </button>
            </div>
            <div className="stat-card grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
              <span className="col-span-2">Date</span>
              <span className="col-span-3">Company</span>
              <span className="col-span-2 text-right">Amount</span>
              <span className="col-span-2">Method</span>
              <span className="col-span-3">Reference</span>
            </div>
            {ledger.map((r) => (
              <div key={r.id} className="stat-card grid grid-cols-12 gap-2 items-center">
                <span className="col-span-2 text-xs text-foreground">{r.date}</span>
                <span className="col-span-3 text-sm text-foreground truncate">{r.company}</span>
                <span className="col-span-2 text-right text-sm font-medium text-success">₹{r.amount.toLocaleString()}</span>
                <span className="col-span-2 text-xs capitalize text-foreground">{r.method}</span>
                <span className="col-span-3 text-xs text-muted-foreground truncate">{r.reference || "—"}</span>
              </div>
            ))}
            {ledger.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No payments for this period.</p>}
            {ledger.length > 0 && (
              <div className="stat-card grid grid-cols-12 gap-2 items-center border-primary/30">
                <span className="col-span-5 font-bold text-sm text-foreground">Total</span>
                <span className="col-span-2 text-right text-sm font-bold text-success">₹{ledgerTotal.toLocaleString()}</span>
                <span className="col-span-5" />
              </div>
            )}
          </div>
        ) : reportType === "analytics" ? (
          <div className="space-y-4">
            <div className="stat-card">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Monthly Collections (last 12 months)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.015 250)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "oklch(0.6 0.02 250)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "oklch(0.6 0.02 250)" }} />
                  <Tooltip contentStyle={{ background: "oklch(0.22 0.012 250)", border: "1px solid oklch(0.3 0.015 250)", borderRadius: 6 }} />
                  <Bar dataKey="collected" fill="oklch(0.65 0.18 145)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="stat-card">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Outstanding Trend</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={analytics.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.015 250)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "oklch(0.6 0.02 250)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "oklch(0.6 0.02 250)" }} />
                  <Tooltip contentStyle={{ background: "oklch(0.22 0.012 250)", border: "1px solid oklch(0.3 0.015 250)", borderRadius: 6 }} />
                  <Line type="monotone" dataKey="outstanding" stroke="oklch(0.65 0.18 50)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="stat-card">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Collection Performance — Invoiced vs Collected</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={analytics.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.015 250)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "oklch(0.6 0.02 250)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "oklch(0.6 0.02 250)" }} />
                  <Tooltip contentStyle={{ background: "oklch(0.22 0.012 250)", border: "1px solid oklch(0.3 0.015 250)", borderRadius: 6 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="invoiced" fill="oklch(0.75 0.16 70)" radius={[4,4,0,0]} />
                  <Bar dataKey="collected" fill="oklch(0.65 0.18 145)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                {analytics.monthly.slice(-3).map((m) => (
                  <div key={m.month} className="rounded-md bg-secondary p-2">
                    <p className="text-muted-foreground">{m.month}</p>
                    <p className="font-bold text-foreground">{m.rate}% collected</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : reportType === "aging" ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{aging.length} compan{aging.length === 1 ? "y" : "ies"} with outstanding · Sorted by total DESC</p>
            <div className="overflow-x-auto">
              <div className="min-w-[760px] space-y-2">
                <div className="stat-card grid gap-2 text-[10px] font-medium text-muted-foreground uppercase" style={{ gridTemplateColumns: "2fr repeat(6,1fr)" }}>
                  <span>Company</span>
                  <span className="text-right">Current</span>
                  <span className="text-right">1–30 d</span>
                  <span className="text-right">31–60 d</span>
                  <span className="text-right">61–90 d</span>
                  <span className="text-right">90+ d</span>
                  <span className="text-right">Total</span>
                </div>
                {aging.map((r) => (
                  <div key={r.id} className="stat-card grid gap-2 items-center text-xs" style={{ gridTemplateColumns: "2fr repeat(6,1fr)" }}>
                    <span className="font-medium text-foreground truncate">{r.name}</span>
                    <span className="text-right text-foreground">₹{r.current.toLocaleString()}</span>
                    <span className="text-right text-foreground">₹{r.d30.toLocaleString()}</span>
                    <span className="text-right text-warning">₹{r.d60.toLocaleString()}</span>
                    <span className="text-right text-warning">₹{r.d90.toLocaleString()}</span>
                    <span className="text-right text-destructive font-medium">₹{r.d90plus.toLocaleString()}</span>
                    <span className="text-right font-bold text-foreground">₹{r.total.toLocaleString()}</span>
                  </div>
                ))}
                {aging.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No outstanding balances.</p>}
                {aging.length > 0 && (
                  <div className="stat-card grid gap-2 items-center border-primary/30" style={{ gridTemplateColumns: "2fr repeat(6,1fr)" }}>
                    <span className="font-bold text-sm text-foreground">Total</span>
                    <span className="text-right text-sm font-bold text-foreground">₹{agingTotals.current.toLocaleString()}</span>
                    <span className="text-right text-sm font-bold text-foreground">₹{agingTotals.d30.toLocaleString()}</span>
                    <span className="text-right text-sm font-bold text-warning">₹{agingTotals.d60.toLocaleString()}</span>
                    <span className="text-right text-sm font-bold text-warning">₹{agingTotals.d90.toLocaleString()}</span>
                    <span className="text-right text-sm font-bold text-destructive">₹{agingTotals.d90plus.toLocaleString()}</span>
                    <span className="text-right text-sm font-bold text-primary">₹{agingTotals.total.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="stat-card grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground">
              <span>Name</span>
              <span className="text-center">{reportType === "hitachi" ? "Entries" : reportType === "operator" ? "Shifts" : "Trips"}</span>
              <span className="text-right">{reportType === "hitachi" ? "Revenue" : reportType === "operator" ? "Total HRs" : "Revenue"}</span>
              <span className="text-right">{reportType === "hitachi" ? "Fuel (L)" : reportType === "operator" ? "Total Salary" : "Outstanding"}</span>
            </div>

            {(data as any[]).map((r: any) => (
              <div key={r.id} className="stat-card grid grid-cols-4 gap-2 items-center">
                <div>
                  <span className="font-medium text-sm text-foreground truncate block">{r.name}</span>
                  {r.sub && <span className="text-xs text-muted-foreground">{r.sub}</span>}
                </div>
                <span className="text-center text-sm text-foreground">{r.trips}</span>
                <span className="text-right text-sm font-medium text-foreground">
                  {r.isOperator ? r.revenue : r.isHitachi ? `₹${r.revenue.toLocaleString()}` : `₹${r.revenue.toLocaleString()}`}
                </span>
                <span className={`text-right text-sm font-medium ${!r.isHitachi && !r.isOperator && r.outstanding > 0 ? "text-warning" : "text-foreground"}`}>
                  {r.isOperator ? `₹${r.outstanding.toLocaleString()}` : r.isHitachi ? `${r.outstanding}L` : `₹${r.outstanding.toLocaleString()}`}
                </span>
              </div>
            ))}

            {data.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No data for this period.</p>}

            {data.length > 0 && !["hitachi", "operator"].includes(reportType) && (
              <div className="stat-card grid grid-cols-4 gap-2 items-center border-primary/30">
                <span className="font-bold text-sm text-foreground">Total</span>
                <span className="text-center text-sm font-bold text-foreground">{(data as any[]).reduce((s: number, r: any) => s + r.trips, 0)}</span>
                <span className="text-right text-sm font-bold text-primary">₹{(data as any[]).reduce((s: number, r: any) => s + r.revenue, 0).toLocaleString()}</span>
                <span className="text-right text-sm font-bold text-warning">₹{(data as any[]).reduce((s: number, r: any) => s + r.outstanding, 0).toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
