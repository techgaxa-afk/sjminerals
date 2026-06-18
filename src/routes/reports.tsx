import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState, useMemo } from "react";
import {
  getBills, getCompanies, getCompanyOutstanding,
  getHitachiEntries, getHitachiFuel, getOperators, getAllCompanyPayments,
  getCompanyAging, getExpenses, getHitachiCostBreakdown, getProductCategorySales,
  type Expense, type ExpenseCategory, type ExpensePaymentMode, type HitachiCostRow,
} from "../lib/store";
import { EXPENSE_CATEGORIES } from "../lib/expense-categories";

import { Building2, Users, Settings, Search, Wallet, FileDown, AlertTriangle, LineChart as LineChartIcon, Calendar as CalendarIcon, Receipt, FileSpreadsheet, Printer, Package } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval } from "date-fns";


type ReportType = "company" | "vehicle" | "hitachi" | "operator" | "ledger" | "aging" | "analytics" | "expenses" | "category";
type FilterType = "daily" | "weekly" | "monthly" | "custom";
type Preset = "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "lastMonth";

const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  fuel: "Fuel", salary: "Salary", tips: "Tips", food: "Food",
  maintenance: "Maintenance", repairs: "Repairs", rental: "Rental",
  pass_purchase: "Pass Purchase", miscellaneous: "Other",
};

type ReportSearch = { tab?: ReportType; from?: string; to?: string; preset?: Preset };
export const Route = createFileRoute("/reports")({
  component: ReportsPage,
  validateSearch: (s: Record<string, unknown>): ReportSearch => ({
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

// Expenses tab uses calendar-period semantics (current week / current month)
function expensesRange(filter: FilterType, custom: { start: Date; end: Date } | null): { start: Date; end: Date } {
  const now = new Date();
  if (filter === "custom" && custom) return custom;
  if (filter === "daily") return { start: sod(now), end: eod(now) };
  if (filter === "weekly") return { start: sod(startOfWeek(now, { weekStartsOn: 1 })), end: eod(endOfWeek(now, { weekStartsOn: 1 })) };
  if (filter === "monthly") return { start: sod(startOfMonth(now)), end: eod(endOfMonth(now)) };
  return { start: sod(now), end: eod(now) };
}

function ReportsPage() {
  const sp = Route.useSearch();
  const navigate = Route.useNavigate();
  const [reportType, setReportType] = useState<ReportType>(sp.tab || "company");
  const initFilter: FilterType = sp.from && sp.to ? "custom" : sp.preset ? "custom" : "monthly";
  const [filter, setFilter] = useState<FilterType>(initFilter);
  const [searchText, setSearchText] = useState("");
  const today = new Date();
  const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth()-1);
  const initCustom = sp.from && sp.to
    ? { start: sod(new Date(sp.from)), end: eod(new Date(sp.to)) }
    : sp.preset ? presetRange(sp.preset) : null;
  const [fromDate, setFromDate] = useState<string>(sp.from || (initCustom ? isoDate(initCustom.start) : isoDate(monthAgo)));
  const [toDate, setToDate] = useState<string>(sp.to || (initCustom ? isoDate(initCustom.end) : isoDate(today)));
  const [appliedCustom, setAppliedCustom] = useState<{ start: Date; end: Date } | null>(initCustom);
  const [dateError, setDateError] = useState("");

  const { start, end } = useMemo(
    () => (reportType === "expenses" ? expensesRange(filter, appliedCustom) : rangeFor(filter, appliedCustom)),
    [filter, appliedCustom, reportType],
  );

  const applyPreset = (p: Preset) => {
    const r = presetRange(p);
    setFromDate(isoDate(r.start));
    setToDate(isoDate(r.end));
    setAppliedCustom(r);
    setFilter("custom");
    setDateError("");
  };
  const applyCustom = () => {
    const f = new Date(fromDate); const t = new Date(toDate);
    if (isNaN(f.getTime()) || isNaN(t.getTime()) || t < f) { setDateError("Invalid date range"); return; }
    setDateError("");
    setAppliedCustom({ start: sod(f), end: eod(t) });
    setFilter("custom");
  };

  const periodLabel = useMemo(() => {
    const s = format(start, "dd MMM yyyy"); const e = format(end, "dd MMM yyyy");
    return s === e ? s : `${s} - ${e}`;
  }, [start, end]);

  // keep URL in sync when switching report type so dashboard back/forward works
  useMemo(() => { navigate({ search: (prev) => ({ ...prev, tab: reportType }), replace: true }); }, [reportType]); // eslint-disable-line


  const allBillsInRange = useMemo(() => getBills().filter((b) => (new Date(b.createdAt) >= start && new Date(b.createdAt) <= end)), [start, end]);
  const passStats = useMemo(() => {
    const passBills = allBillsInRange.filter((b) => b.passEnabled);
    return {
      count: passBills.length,
      total: passBills.reduce((s, b) => s + (b.passAmount || 0), 0),
    };
  }, [allBillsInRange]);

  const categoryReport = useMemo(() => {
    const sales = getProductCategorySales(start, end);
    return {
      BOULDERS: { quantity: sales.BOULDERS.quantity, bills: sales.BOULDERS.billIds.size },
      "K.K": { quantity: sales["K.K"].quantity, bills: sales["K.K"].billIds.size },
    };
  }, [start, end]);

  const exportCategoryCSV = () => {
    const rows = [
      ["Category", "Quantity Sold", "Number of Bills"],
      ["BOULDERS", String(categoryReport.BOULDERS.quantity), String(categoryReport.BOULDERS.bills)],
      ["K.K", String(categoryReport["K.K"].quantity), String(categoryReport["K.K"].bills)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `category-${isoDate(start)}_${isoDate(end)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  const exportCategoryExcel = () => {
    const rows = `
      <tr><th>Category</th><th>Quantity Sold</th><th>Number of Bills</th></tr>
      <tr><td>BOULDERS</td><td>${categoryReport.BOULDERS.quantity}</td><td>${categoryReport.BOULDERS.bills}</td></tr>
      <tr><td>K.K</td><td>${categoryReport["K.K"].quantity}</td><td>${categoryReport["K.K"].bills}</td></tr>`;
    const html = `<html><head><meta charset="utf-8"></head><body><table border="1">${rows}</table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `category-${isoDate(start)}_${isoDate(end)}.xls`; a.click();
    URL.revokeObjectURL(url);
  };
  const exportCategoryPDF = () => {
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`<html><head><title>Product Category Report</title>
      <style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%;margin-top:12px}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f3f3f3}</style>
      </head><body>
      <h2>Product Category Sales</h2>
      <p>${periodLabel}</p>
      <table><tr><th>Category</th><th>Quantity Sold</th><th>Number of Bills</th></tr>
      <tr><td>BOULDERS</td><td>${categoryReport.BOULDERS.quantity}</td><td>${categoryReport.BOULDERS.bills}</td></tr>
      <tr><td>K.K</td><td>${categoryReport["K.K"].quantity}</td><td>${categoryReport["K.K"].bills}</td></tr>
      </table>
      <script>setTimeout(()=>window.print(),300)</script>
      </body></html>`);
    w.document.close();
  };

  const data = useMemo(() => {
    const bills = allBillsInRange;
    const companies = getCompanies();
    const hitachiEntries = getHitachiEntries().filter((e) => (new Date(e.createdAt) >= start && new Date(e.createdAt) <= end));
    const hitachiFuel = getHitachiFuel().filter((f) => (new Date(f.createdAt) >= start && new Date(f.createdAt) <= end));
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
      }).filter((r) => r.trips > 0 || r.name.toLowerCase().includes(searchText.toLowerCase()));
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
      })).filter((r) => r.name.toLowerCase().includes(searchText.toLowerCase()));
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
        id: o.id, name: o.name, sub: `N:₹${o.normalShiftSalary || o.hourlySalaryRate} / S:₹${o.singleShiftSalary}`,
        trips: oEntries.length, revenue: totalHrs, outstanding: totalSalary, isOperator: true,
      };
    }).filter((r) => r.trips > 0 || r.name.toLowerCase().includes(searchText.toLowerCase()));
  }, [reportType, start, end, searchText, allBillsInRange]);

  const ledger = useMemo(() => {
    if (reportType !== "ledger") return [];
    const companies = getCompanies();
    const nameOf = (id: string) => companies.find((c) => c.id === id)?.name ?? "—";
    const rows = getAllCompanyPayments()
      .filter((p) => (new Date(p.paymentDate) >= start && new Date(p.paymentDate) <= end))
      .map((p) => ({
        id: p.id,
        date: p.paymentDate,
        company: nameOf(p.companyId),
        amount: p.amount,
        method: p.paymentMethod,
        reference: p.referenceNumber ?? "",
        notes: p.notes ?? "",
      }))
      .filter((r) => !searchText || r.company.toLowerCase().includes(searchText.toLowerCase()) || r.reference.toLowerCase().includes(searchText.toLowerCase()))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return rows;
  }, [reportType, start, end, searchText]);

  const ledgerTotal = useMemo(() => ledger.reduce((s, r) => s + r.amount, 0), [ledger]);

  const aging = useMemo(() => {
    if (reportType !== "aging") return [];
    return getCompanies()
      .map((c) => {
        const b = getCompanyAging(c.id);
        return { id: c.id, name: c.name, ...b };
      })
      .filter((r) => r.total > 0 && (!searchText || r.name.toLowerCase().includes(searchText.toLowerCase())))
      .sort((a, b) => b.total - a.total);
  }, [reportType, searchText]);

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
    const lines = [
      `Payment Ledger`,
      `Period: ${periodLabel}`,
      ``,
      headers.join(","),
    ].concat(
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

  // =========== Expenses report ===========
  const [expCatFilter, setExpCatFilter] = useState<ExpenseCategory | "all">("all");
  const [expModeFilter, setExpModeFilter] = useState<ExpensePaymentMode | "all">("all");

  const expReport = useMemo(() => {
    if (reportType !== "expenses") return null;
    const all = getExpenses().filter((e) => {
      const t = new Date(e.date + "T00:00:00").getTime();
      return t >= start.getTime() && t <= end.getTime();
    });
    const filtered = all.filter((e) => {
      const matchCat = expCatFilter === "all" || e.category === expCatFilter;
      const matchMode = expModeFilter === "all" || e.paymentMode === expModeFilter;
      const q = searchText.trim().toLowerCase();
      const matchSearch = !q || e.notes.toLowerCase().includes(q) || e.category.includes(q);
      return matchCat && matchMode && matchSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = all.reduce((s, e) => s + e.amount, 0);
    const cash = all.filter((e) => e.paymentMode === "cash").reduce((s, e) => s + e.amount, 0);
    const upi = all.filter((e) => e.paymentMode === "upi").reduce((s, e) => s + e.amount, 0);

    const byCat: { category: ExpenseCategory; label: string; total: number; pct: number }[] = EXPENSE_CATEGORIES.map((c) => {
      const sum = all.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0);
      return { category: c, label: CATEGORY_LABEL[c], total: sum, pct: total > 0 ? (sum / total) * 100 : 0 };
    }).sort((a, b) => b.total - a.total);

    // Trend buckets
    type Bucket = { label: string; cash: number; upi: number; total: number };
    let buckets: Bucket[] = [];
    const addToBucket = (b: Bucket, e: Expense) => {
      b.total += e.amount;
      if (e.paymentMode === "upi") b.upi += e.amount; else b.cash += e.amount;
    };
    if (filter === "monthly") {
      const days = eachDayOfInterval({ start, end });
      buckets = days.map((d) => ({ label: format(d, "dd MMM"), cash: 0, upi: 0, total: 0 }));
      all.forEach((e) => {
        const d = new Date(e.date + "T00:00:00");
        const idx = Math.floor((sod(d).getTime() - sod(start).getTime()) / 86400000);
        if (idx >= 0 && idx < buckets.length) addToBucket(buckets[idx], e);
      });
    } else if (filter === "weekly") {
      const days = eachDayOfInterval({ start, end });
      buckets = days.map((d) => ({ label: format(d, "EEE dd"), cash: 0, upi: 0, total: 0 }));
      all.forEach((e) => {
        const d = new Date(e.date + "T00:00:00");
        const idx = Math.floor((sod(d).getTime() - sod(start).getTime()) / 86400000);
        if (idx >= 0 && idx < buckets.length) addToBucket(buckets[idx], e);
      });
    } else if (filter === "daily") {
      buckets = [{ label: format(start, "dd MMM"), cash, upi, total }];
    } else {
      // custom: by day if <= 60 days else by month
      const spanDays = Math.ceil((end.getTime() - start.getTime()) / 86400000);
      if (spanDays <= 60) {
        const days = eachDayOfInterval({ start, end });
        buckets = days.map((d) => ({ label: format(d, "dd MMM"), cash: 0, upi: 0, total: 0 }));
        all.forEach((e) => {
          const d = new Date(e.date + "T00:00:00");
          const idx = Math.floor((sod(d).getTime() - sod(start).getTime()) / 86400000);
          if (idx >= 0 && idx < buckets.length) addToBucket(buckets[idx], e);
        });
      } else {
        const months = eachMonthOfInterval({ start, end });
        buckets = months.map((d) => ({ label: format(d, "MMM yy"), cash: 0, upi: 0, total: 0 }));
        all.forEach((e) => {
          const d = new Date(e.date + "T00:00:00");
          const i = months.findIndex((m) => m.getFullYear() === d.getFullYear() && m.getMonth() === d.getMonth());
          if (i >= 0) addToBucket(buckets[i], e);
        });
      }
    }

    // Insights
    const topCat = byCat[0];
    const dayMap = new Map<string, number>();
    all.forEach((e) => dayMap.set(e.date, (dayMap.get(e.date) || 0) + e.amount));
    let topDay: { date: string; amount: number } | null = null;
    dayMap.forEach((v, k) => { if (!topDay || v > topDay.amount) topDay = { date: k, amount: v }; });
    const daysSpan = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
    const avgPerDay = total / daysSpan;
    const ratio = total > 0 ? `${Math.round((cash / total) * 100)}% / ${Math.round((upi / total) * 100)}%` : "—";

    return {
      all, filtered, total, cash, upi, count: all.length,
      byCat, buckets, topCat, topDay: topDay as { date: string; amount: number } | null, avgPerDay, ratio,
    };
  }, [reportType, start, end, expCatFilter, expModeFilter, searchText, filter]);

  const escCsv = (v: string | number | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  const exportExpensesCSV = () => {
    if (!expReport) return;
    const headers = ["Date", "Category", "Notes", "Payment Mode", "Amount"];
    const lines = [
      `Expenses Report`, `Period: ${periodLabel}`, ``,
      headers.join(","),
      ...expReport.filtered.map((e) => [e.date, CATEGORY_LABEL[e.category], e.notes, e.paymentMode, e.amount].map(escCsv).join(",")),
      "",
      ["Total", "", "", "", expReport.filtered.reduce((s, e) => s + e.amount, 0)].map(escCsv).join(","),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `expenses-${filter}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportExpensesExcel = () => {
    if (!expReport) return;
    const rows = expReport.filtered.map((e) =>
      `<tr><td>${e.date}</td><td>${CATEGORY_LABEL[e.category]}</td><td>${(e.notes || "").replace(/</g, "&lt;")}</td><td>${e.paymentMode}</td><td>${e.amount}</td></tr>`
    ).join("");
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"/></head><body>
      <h3>Expenses Report — ${periodLabel}</h3>
      <table border="1"><thead><tr><th>Date</th><th>Category</th><th>Notes</th><th>Payment Mode</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
    </body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `expenses-${filter}-${new Date().toISOString().split("T")[0]}.xls`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportExpensesPDF = () => {
    if (!expReport) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const rows = expReport.filtered.map((e) =>
      `<tr><td>${e.date}</td><td>${CATEGORY_LABEL[e.category]}</td><td>${(e.notes || "").replace(/</g, "&lt;")}</td><td>${e.paymentMode.toUpperCase()}</td><td style="text-align:right">₹${e.amount.toLocaleString()}</td></tr>`
    ).join("");
    const catRows = expReport.byCat.map((c) =>
      `<tr><td>${c.label}</td><td style="text-align:right">₹${c.total.toLocaleString()}</td><td style="text-align:right">${c.pct.toFixed(1)}%</td></tr>`
    ).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>Expenses Report</title>
      <style>body{font-family:system-ui,-apple-system,sans-serif;padding:20px;color:#111}
      h1{margin:0 0 4px;font-size:20px}h3{margin:18px 0 6px;font-size:14px}
      .muted{color:#6b7280;font-size:12px}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}
      th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left}
      th{background:#f3f4f6}
      .sum{display:flex;gap:12px;margin:10px 0}
      .card{flex:1;border:1px solid #e5e7eb;border-radius:6px;padding:10px}
      .card .l{font-size:11px;color:#6b7280;text-transform:uppercase}
      .card .v{font-size:16px;font-weight:bold}
      </style></head><body>
      <h1>Expenses Report</h1><p class="muted">Period: ${periodLabel}</p>
      <div class="sum">
        <div class="card"><div class="l">Total</div><div class="v">₹${expReport.total.toLocaleString()}</div></div>
        <div class="card"><div class="l">Cash</div><div class="v">₹${expReport.cash.toLocaleString()}</div></div>
        <div class="card"><div class="l">UPI</div><div class="v">₹${expReport.upi.toLocaleString()}</div></div>
        <div class="card"><div class="l">Transactions</div><div class="v">${expReport.count}</div></div>
      </div>
      <h3>Category Breakdown</h3>
      <table><thead><tr><th>Category</th><th style="text-align:right">Amount</th><th style="text-align:right">%</th></tr></thead><tbody>${catRows}</tbody></table>
      <h3>Detail (${expReport.filtered.length})</h3>
      <table><thead><tr><th>Date</th><th>Category</th><th>Notes</th><th>Mode</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
      <script>setTimeout(()=>window.print(),300)</script>
      </body></html>`);
    w.document.close();
  };

  // ============ Hitachi Analytics ============
  const hitachiCost: HitachiCostRow[] = useMemo(() => getHitachiCostBreakdown(start, end), [start, end]);
  const [hSearch, setHSearch] = useState("");
  const [hSort, setHSort] = useState<"cost" | "costPerHour" | "hours" | "fuel" | "name">("cost");
  const [hTypeFilter, setHTypeFilter] = useState<"all" | "owned" | "rented">("all");

  const hitachiFiltered = useMemo(() => {
    const q = hSearch.trim().toLowerCase();
    let rows = hitachiCost.filter((r) => (hTypeFilter === "all" ? true : r.type === hTypeFilter));
    if (q) rows = rows.filter((r) => r.machineName.toLowerCase().includes(q));
    const cmp = (a: HitachiCostRow, b: HitachiCostRow): number => {
      if (hSort === "name") return a.machineName.localeCompare(b.machineName);
      if (hSort === "hours") return b.hours - a.hours;
      if (hSort === "fuel") return b.fuel - a.fuel;
      if (hSort === "costPerHour") return (b.costPerHour ?? 0) - (a.costPerHour ?? 0);
      return b.total - a.total;
    };
    return rows.slice().sort(cmp);
  }, [hitachiCost, hSearch, hSort, hTypeFilter]);

  const hitachiSummary = useMemo(() => {
    const totals = hitachiCost.reduce(
      (acc, r) => {
        acc.hours += r.hours; acc.operationalValue += r.operationalValue; acc.fuel += r.fuel;
        acc.maintenance += r.maintenance; acc.repairs += r.repairs;
        acc.rental += r.rental; acc.salary += r.salary; acc.cost += r.total;
        if (r.type === "owned") acc.ownedCost += r.total; else acc.rentedCost += r.total;
        return acc;
      },
      { hours: 0, operationalValue: 0, fuel: 0, maintenance: 0, repairs: 0, rental: 0, salary: 0, cost: 0, ownedCost: 0, rentedCost: 0 },
    );
    const ranked = hitachiCost.filter((r) => r.hours > 0 || r.total > 0);
    const withHours = ranked.filter((r) => r.hours > 0);
    const sortBy = (fn: (r: HitachiCostRow) => number) =>
      ranked.slice().sort((a, b) => fn(b) - fn(a))[0] ?? null;
    return {
      ...totals,
      costPerHour: totals.hours > 0 ? totals.cost / totals.hours : 0,
      operationalValuePerHour: totals.hours > 0 ? totals.operationalValue / totals.hours : 0,
      highestCost: sortBy((r) => r.total),
      highestFuel: sortBy((r) => r.fuel),
      highestMaint: sortBy((r) => r.maintenance),
      highestRepairs: sortBy((r) => r.repairs),
      highestCph: withHours.slice().sort((a, b) => (b.costPerHour ?? 0) - (a.costPerHour ?? 0))[0] ?? null,
      lowestCph: withHours.slice().sort((a, b) => (a.costPerHour ?? 0) - (b.costPerHour ?? 0))[0] ?? null,
      mostUsed: sortBy((r) => r.hours),
      leastUsed: withHours.slice().sort((a, b) => a.hours - b.hours)[0] ?? null,
      topFuel: sortBy((r) => r.fuel),
    };
  }, [hitachiCost]);

  // Maintenance lifetime (all-time) for owned machines
  const ownedLifetimeMaint = useMemo(() => {
    const all = getHitachiCostBreakdown();
    return all.filter((r) => r.type === "owned").reduce((s, r) => s + r.maintenance, 0);
  }, [hitachiCost]);
  const monthlyMaint = useMemo(() => {
    const now = new Date();
    const ms = sod(new Date(now.getFullYear(), now.getMonth(), 1));
    const me = eod(now);
    return getHitachiCostBreakdown(ms, me).reduce((s, r) => s + r.maintenance, 0);
  }, [hitachiCost]);

  const hitachiAlerts = useMemo(() => {
    const list: { level: "warn" | "danger"; msg: string }[] = [];
    hitachiCost.forEach((r) => {
      if (r.hours > 0) {
        const mPh = r.maintenance / r.hours;
        const fPh = r.fuel / r.hours;
        const rPh = r.repairs / r.hours;
        if (mPh > 500) list.push({ level: "warn", msg: `${r.machineName}: high maintenance/hr ₹${mPh.toFixed(0)}` });
        if (fPh > 500) list.push({ level: "warn", msg: `${r.machineName}: high fuel/hr ₹${fPh.toFixed(0)}` });
        if (rPh > 300) list.push({ level: "warn", msg: `${r.machineName}: high repairs/hr ₹${rPh.toFixed(0)}` });
      }
      if (r.hours === 0 && r.total > 0) {
        list.push({ level: "warn", msg: `${r.machineName}: expenses recorded but 0 hours` });
      }
    });
    return list;
  }, [hitachiCost]);

  const hitachiCsvHeaders = [
    "Machine", "Type", "Hours", "Fuel", "Maintenance", "Repairs",
    "Rental", "Salary", "Total Cost", "Cost/Hr", "Fuel/Hr", "Maint/Hr", "Operational Value",
  ];
  const hitachiCsvRows = () => hitachiFiltered.map((r) => [
    r.machineName, r.type, r.hours, r.fuel, r.maintenance, r.repairs,
    r.rental, r.salary, r.total,
    r.costPerHour ? r.costPerHour.toFixed(2) : "",
    r.fuelPerHour ? r.fuelPerHour.toFixed(2) : "",
    r.maintenancePerHour ? r.maintenancePerHour.toFixed(2) : "",
    r.operationalValue,
  ]);

  const exportHitachiCSV = () => {
    const lines = [
      `Hitachi Analytics`, `Period: ${periodLabel}`, ``,
      hitachiCsvHeaders.join(","),
      ...hitachiCsvRows().map((r) => r.map(escCsv).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `hitachi-${filter}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const exportHitachiExcel = () => {
    const rows = hitachiCsvRows().map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"/></head><body>
      <h3>Hitachi Analytics — ${periodLabel}</h3>
      <table border="1"><thead><tr>${hitachiCsvHeaders.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
    </body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `hitachi-${filter}-${new Date().toISOString().split("T")[0]}.xls`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const exportHitachiPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const rows = hitachiCsvRows().map((r) => `<tr>${r.map((c, i) => `<td style="text-align:${i < 2 ? "left" : "right"}">${typeof c === "number" ? (i > 1 ? `₹${Number(c).toLocaleString()}` : c) : c}</td>`).join("")}</tr>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>Hitachi Analytics</title>
      <style>body{font-family:system-ui,-apple-system,sans-serif;padding:20px;color:#111}
      h1{margin:0 0 4px;font-size:20px}h3{margin:18px 0 6px;font-size:14px}
      .muted{color:#6b7280;font-size:12px}
      table{width:100%;border-collapse:collapse;font-size:11px;margin-top:6px}
      th,td{border:1px solid #e5e7eb;padding:5px 7px}
      th{background:#f3f4f6;text-align:left}
      .sum{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0}
      .card{border:1px solid #e5e7eb;border-radius:6px;padding:8px}
      .card .l{font-size:10px;color:#6b7280;text-transform:uppercase}
      .card .v{font-size:14px;font-weight:bold}
      </style></head><body>
      <h1>Hitachi Analytics</h1><p class="muted">Period: ${periodLabel} · Cost & efficiency only — no revenue/profit</p>
      <div class="sum">
        <div class="card"><div class="l">Hours</div><div class="v">${hitachiSummary.hours.toFixed(1)}</div></div>
        <div class="card"><div class="l">Total Cost</div><div class="v">₹${hitachiSummary.cost.toLocaleString()}</div></div>
        <div class="card"><div class="l">Cost/Hr</div><div class="v">₹${hitachiSummary.costPerHour.toFixed(0)}</div></div>
        <div class="card"><div class="l">Fuel</div><div class="v">₹${hitachiSummary.fuel.toLocaleString()}</div></div>
        <div class="card"><div class="l">Maintenance</div><div class="v">₹${hitachiSummary.maintenance.toLocaleString()}</div></div>
        <div class="card"><div class="l">Repairs</div><div class="v">₹${hitachiSummary.repairs.toLocaleString()}</div></div>
        <div class="card"><div class="l">Rental</div><div class="v">₹${hitachiSummary.rental.toLocaleString()}</div></div>
        <div class="card"><div class="l">Owned vs Rented</div><div class="v">₹${hitachiSummary.ownedCost.toLocaleString()} / ₹${hitachiSummary.rentedCost.toLocaleString()}</div></div>
      </div>
      <table><thead><tr>${hitachiCsvHeaders.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
      <script>setTimeout(()=>window.print(),300)</script>
      </body></html>`);
    w.document.close();
  };



  const reportTabs: { id: ReportType; label: string; icon: typeof Building2 }[] = [
    { id: "company", label: "Company", icon: Building2 },
    { id: "vehicle", label: "Vehicle", icon: Building2 },
    { id: "hitachi", label: "Hitachi", icon: Settings },
    { id: "operator", label: "Operator", icon: Users },
    { id: "ledger", label: "Ledger", icon: Wallet },
    { id: "aging", label: "Aging", icon: AlertTriangle },
    { id: "analytics", label: "Analytics", icon: LineChartIcon },
    { id: "expenses", label: "Expenses", icon: Receipt },
    { id: "category", label: "Product Category", icon: Package },
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

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search..." className="w-full rounded-md border border-input bg-secondary pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex gap-1 rounded-md bg-secondary p-1">
            {(["daily", "weekly", "monthly", "custom"] as FilterType[]).map((f) => (
              <button key={f} onClick={() => { setFilter(f); if (f !== "custom") setAppliedCustom(null); }} className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{f}</button>
            ))}
          </div>
        </div>

        {filter === "custom" && (
          <div className="stat-card space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-muted-foreground">From</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-md border border-input bg-secondary px-2 py-1 text-xs text-foreground" />
              <label className="text-xs text-muted-foreground">To</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-md border border-input bg-secondary px-2 py-1 text-xs text-foreground" />
              <button onClick={applyCustom} className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90">Apply</button>
              {dateError && <span className="text-xs text-destructive">{dateError}</span>}
            </div>
            <div className="flex flex-wrap gap-1">
              {([
                ["today","Today"],["yesterday","Yesterday"],["last7","Last 7 Days"],
                ["last30","Last 30 Days"],["thisMonth","This Month"],["lastMonth","Last Month"],
              ] as [Preset,string][]).map(([p,l]) => (
                <button key={p} onClick={() => applyPreset(p)} className="rounded-md bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/80">{l}</button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarIcon className="h-3.5 w-3.5" /> Period: <span className="text-foreground font-medium">{periodLabel}</span>
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
        ) : reportType === "expenses" && expReport ? (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="stat-card">
                <p className="text-[10px] text-muted-foreground uppercase">Total Expenses</p>
                <p className="text-lg font-bold text-destructive">₹{expReport.total.toLocaleString()}</p>
              </div>
              <div className="stat-card">
                <p className="text-[10px] text-muted-foreground uppercase">Cash Expenses</p>
                <p className="text-lg font-bold text-success">₹{expReport.cash.toLocaleString()}</p>
              </div>
              <div className="stat-card">
                <p className="text-[10px] text-muted-foreground uppercase">UPI Expenses</p>
                <p className="text-lg font-bold text-primary">₹{expReport.upi.toLocaleString()}</p>
              </div>
              <div className="stat-card">
                <p className="text-[10px] text-muted-foreground uppercase">Transactions</p>
                <p className="text-lg font-bold text-foreground">{expReport.count}</p>
              </div>
            </div>

            {/* Quick insights */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="stat-card">
                <p className="text-[10px] text-muted-foreground uppercase">Top Category</p>
                <p className="text-sm font-bold text-foreground">{expReport.topCat ? expReport.topCat.label : "—"}</p>
                <p className="text-xs text-muted-foreground">{expReport.topCat ? `₹${expReport.topCat.total.toLocaleString()} (${expReport.topCat.pct.toFixed(1)}%)` : ""}</p>
              </div>
              <div className="stat-card">
                <p className="text-[10px] text-muted-foreground uppercase">Highest Day</p>
                <p className="text-sm font-bold text-foreground">{expReport.topDay ? format(new Date(expReport.topDay.date + "T00:00:00"), "dd MMM yyyy") : "—"}</p>
                <p className="text-xs text-muted-foreground">{expReport.topDay ? `₹${expReport.topDay.amount.toLocaleString()}` : ""}</p>
              </div>
              <div className="stat-card">
                <p className="text-[10px] text-muted-foreground uppercase">Avg / Day</p>
                <p className="text-sm font-bold text-foreground">₹{Math.round(expReport.avgPerDay).toLocaleString()}</p>
              </div>
              <div className="stat-card">
                <p className="text-[10px] text-muted-foreground uppercase">Cash vs UPI</p>
                <p className="text-sm font-bold text-foreground">{expReport.ratio}</p>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="stat-card">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Category Breakdown</h3>
              <div className="space-y-2">
                {expReport.byCat.map((c) => (
                  <div key={c.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground font-medium">{c.label}</span>
                      <span className="text-muted-foreground">₹{c.total.toLocaleString()} · {c.pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 rounded bg-secondary overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, c.pct)}%` }} />
                    </div>
                  </div>
                ))}
                {expReport.byCat.every((c) => c.total === 0) && (
                  <p className="text-center text-xs text-muted-foreground py-4">No expenses in this period.</p>
                )}
              </div>
            </div>

            {/* Trend */}
            <div className="stat-card">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Expense Trend</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={expReport.buckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.015 250)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "oklch(0.6 0.02 250)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "oklch(0.6 0.02 250)" }} />
                  <Tooltip contentStyle={{ background: "oklch(0.22 0.012 250)", border: "1px solid oklch(0.3 0.015 250)", borderRadius: 6 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="cash" stackId="a" name="Cash" fill="oklch(0.65 0.18 145)" radius={[0,0,0,0]} />
                  <Bar dataKey="upi" stackId="a" name="UPI" fill="oklch(0.65 0.18 250)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={expReport.buckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.015 250)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "oklch(0.6 0.02 250)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "oklch(0.6 0.02 250)" }} />
                  <Tooltip contentStyle={{ background: "oklch(0.22 0.012 250)", border: "1px solid oklch(0.3 0.015 250)", borderRadius: 6 }} />
                  <Line type="monotone" dataKey="total" name="Total" stroke="oklch(0.65 0.18 50)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Detail table */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{expReport.filtered.length} expense{expReport.filtered.length === 1 ? "" : "s"}</p>
                <div className="flex gap-2 flex-wrap">
                  <select value={expCatFilter} onChange={(e) => setExpCatFilter(e.target.value as ExpenseCategory | "all")} className="rounded-md border border-input bg-secondary px-2 py-1 text-xs text-foreground">
                    <option value="all">All Categories</option>
                    {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                  </select>
                  <select value={expModeFilter} onChange={(e) => setExpModeFilter(e.target.value as ExpensePaymentMode | "all")} className="rounded-md border border-input bg-secondary px-2 py-1 text-xs text-foreground">
                    <option value="all">All Modes</option>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                  </select>
                  <button onClick={exportExpensesCSV} disabled={expReport.filtered.length === 0} className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80 disabled:opacity-50">
                    <FileDown className="h-3.5 w-3.5" /> CSV
                  </button>
                  <button onClick={exportExpensesExcel} disabled={expReport.filtered.length === 0} className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80 disabled:opacity-50">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                  </button>
                  <button onClick={exportExpensesPDF} disabled={expReport.filtered.length === 0} className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80 disabled:opacity-50">
                    <Printer className="h-3.5 w-3.5" /> PDF
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[720px] space-y-2">
                  <div className="stat-card grid gap-2 text-[10px] font-medium text-muted-foreground uppercase" style={{ gridTemplateColumns: "1fr 1fr 2fr 1fr 1fr" }}>
                    <span>Date</span>
                    <span>Category</span>
                    <span>Notes</span>
                    <span>Mode</span>
                    <span className="text-right">Amount</span>
                  </div>
                  {expReport.filtered.map((e) => (
                    <div key={e.id} className="stat-card grid gap-2 items-center text-xs" style={{ gridTemplateColumns: "1fr 1fr 2fr 1fr 1fr" }}>
                      <span className="text-foreground">{format(new Date(e.date + "T00:00:00"), "dd MMM yyyy")}</span>
                      <span className="text-foreground">{CATEGORY_LABEL[e.category]}</span>
                      <span className="text-muted-foreground truncate">{e.notes || "—"}</span>
                      <span className={`text-[10px] font-bold ${e.paymentMode === "upi" ? "text-primary" : "text-success"}`}>{e.paymentMode.toUpperCase()}</span>
                      <span className="text-right font-medium text-destructive">₹{e.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  {expReport.filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No expenses for this period.</p>}
                  {expReport.filtered.length > 0 && (
                    <div className="stat-card grid gap-2 items-center border-primary/30" style={{ gridTemplateColumns: "1fr 1fr 2fr 1fr 1fr" }}>
                      <span className="font-bold text-sm text-foreground col-span-4">Total</span>
                      <span className="text-right text-sm font-bold text-destructive">₹{expReport.filtered.reduce((s, e) => s + e.amount, 0).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : reportType === "hitachi" ? (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="stat-card">
                <p className="text-[10px] text-muted-foreground uppercase">Total Hours</p>
                <p className="text-lg font-bold text-foreground">{hitachiSummary.hours.toFixed(1)}</p>
              </div>
              <div className="stat-card">
                <p className="text-[10px] text-muted-foreground uppercase">Total Operating Cost</p>
                <p className="text-lg font-bold text-destructive">₹{hitachiSummary.cost.toLocaleString()}</p>
              </div>
              <div className="stat-card">
                <p className="text-[10px] text-muted-foreground uppercase">Cost Per Hour</p>
                <p className="text-lg font-bold text-foreground">₹{hitachiSummary.costPerHour.toFixed(0)}</p>
              </div>
              <div className="stat-card">
                <p className="text-[10px] text-muted-foreground uppercase">Fuel Cost</p>
                <p className="text-sm font-bold text-foreground">₹{hitachiSummary.fuel.toLocaleString()}</p>
              </div>
              <div className="stat-card">
                <p className="text-[10px] text-muted-foreground uppercase">Maintenance Cost</p>
                <p className="text-sm font-bold text-foreground">₹{hitachiSummary.maintenance.toLocaleString()}</p>
              </div>
              <div className="stat-card">
                <p className="text-[10px] text-muted-foreground uppercase">Repairs Cost</p>
                <p className="text-sm font-bold text-foreground">₹{hitachiSummary.repairs.toLocaleString()}</p>
              </div>
              <div className="stat-card">
                <p className="text-[10px] text-muted-foreground uppercase">Rental Cost</p>
                <p className="text-sm font-bold text-foreground">₹{hitachiSummary.rental.toLocaleString()}</p>
              </div>
              <div className="stat-card">
                <p className="text-[10px] text-muted-foreground uppercase">Owned vs Rented Cost</p>
                <p className="text-sm font-bold text-foreground">₹{hitachiSummary.ownedCost.toLocaleString()} <span className="text-muted-foreground">/</span> ₹{hitachiSummary.rentedCost.toLocaleString()}</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground italic">
              Operational Value (Hours × Internal Hourly Rate) is an internal benchmark only — not customer revenue. Quarry revenue comes from material sales, tracked under Bills.
            </p>

            {/* Controls */}
            <div className="flex flex-wrap gap-2 items-center">
              <select value={hTypeFilter} onChange={(e) => setHTypeFilter(e.target.value as "all" | "owned" | "rented")} className="rounded-md border border-input bg-secondary px-2 py-1 text-xs text-foreground">
                <option value="all">All Types</option>
                <option value="owned">Owned</option>
                <option value="rented">Rented</option>
              </select>
              <select value={hSort} onChange={(e) => setHSort(e.target.value as typeof hSort)} className="rounded-md border border-input bg-secondary px-2 py-1 text-xs text-foreground">
                <option value="cost">Sort: Total Cost</option>
                <option value="costPerHour">Sort: Cost/Hr</option>
                <option value="hours">Sort: Hours</option>
                <option value="fuel">Sort: Fuel</option>
                <option value="name">Sort: Name</option>
              </select>
              <input value={hSearch} onChange={(e) => setHSearch(e.target.value)} placeholder="Search machine..." className="rounded-md border border-input bg-secondary px-2 py-1 text-xs text-foreground flex-1 min-w-[140px]" />
              <button onClick={exportHitachiCSV} disabled={hitachiFiltered.length === 0} className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80 disabled:opacity-50">
                <FileDown className="h-3.5 w-3.5" /> CSV
              </button>
              <button onClick={exportHitachiExcel} disabled={hitachiFiltered.length === 0} className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80 disabled:opacity-50">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
              </button>
              <button onClick={exportHitachiPDF} disabled={hitachiFiltered.length === 0} className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80 disabled:opacity-50">
                <Printer className="h-3.5 w-3.5" /> PDF
              </button>
            </div>

            {/* Machine performance table */}
            <div className="overflow-x-auto">
              <div className="min-w-[1200px] space-y-2">
                <div className="stat-card grid gap-2 text-[10px] font-medium text-muted-foreground uppercase" style={{ gridTemplateColumns: "1.5fr 0.7fr repeat(11,1fr)" }}>
                  <span>Machine</span><span>Type</span>
                  <span className="text-right">Hours</span>
                  <span className="text-right">Fuel</span>
                  <span className="text-right">Maint</span>
                  <span className="text-right">Repairs</span>
                  <span className="text-right">Salary</span>
                  <span className="text-right">Rental</span>
                  <span className="text-right">Total Cost</span>
                  <span className="text-right">Cost/Hr</span>
                  <span className="text-right">Fuel/Hr</span>
                  <span className="text-right">Maint/Hr</span>
                  <span className="text-right">Op. Value</span>
                </div>
                {hitachiFiltered.map((r) => (
                  <div key={r.machineId} className="stat-card grid gap-2 items-center text-xs" style={{ gridTemplateColumns: "1.5fr 0.7fr repeat(11,1fr)" }}>
                    <span className="font-medium text-foreground truncate">{r.machineName}</span>
                    <span className={`text-[10px] font-bold uppercase ${r.type === "owned" ? "text-primary" : "text-warning"}`}>{r.type}</span>
                    <span className="text-right text-foreground">{r.hours.toFixed(1)}</span>
                    <span className="text-right text-foreground">₹{r.fuel.toLocaleString()}</span>
                    <span className="text-right text-foreground">₹{r.maintenance.toLocaleString()}</span>
                    <span className="text-right text-foreground">₹{r.repairs.toLocaleString()}</span>
                    <span className="text-right text-foreground">₹{r.salary.toLocaleString()}</span>
                    <span className="text-right text-foreground">₹{r.rental.toLocaleString()}</span>
                    <span className="text-right text-destructive font-medium">₹{r.total.toLocaleString()}</span>
                    <span className="text-right text-foreground">{r.costPerHour !== null ? `₹${r.costPerHour.toFixed(0)}` : "—"}</span>
                    <span className="text-right text-foreground">{r.fuelPerHour !== null ? `₹${r.fuelPerHour.toFixed(0)}` : "—"}</span>
                    <span className="text-right text-foreground">{r.maintenancePerHour !== null ? `₹${r.maintenancePerHour.toFixed(0)}` : "—"}</span>
                    <span className="text-right text-muted-foreground">₹{r.operationalValue.toLocaleString()}</span>
                  </div>
                ))}
                {hitachiFiltered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No machines for this period.</p>}
              </div>
            </div>

            {/* Owned Maintenance Analytics */}
            <div className="stat-card">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Efficiency Dashboard</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Lifetime Maintenance (Owned)</p>
                  <p className="text-sm font-bold text-foreground">₹{ownedLifetimeMaint.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">This Month Maintenance</p>
                  <p className="text-sm font-bold text-foreground">₹{monthlyMaint.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Maintenance/Hr</p>
                  <p className="text-sm font-bold text-foreground">₹{hitachiSummary.hours > 0 ? (hitachiSummary.maintenance / hitachiSummary.hours).toFixed(0) : "0"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Fuel/Hr</p>
                  <p className="text-sm font-bold text-foreground">₹{hitachiSummary.hours > 0 ? (hitachiSummary.fuel / hitachiSummary.hours).toFixed(0) : "0"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Repairs/Hr</p>
                  <p className="text-sm font-bold text-foreground">₹{hitachiSummary.hours > 0 ? (hitachiSummary.repairs / hitachiSummary.hours).toFixed(0) : "0"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Avg Cost/Hr</p>
                  <p className="text-sm font-bold text-foreground">₹{hitachiSummary.costPerHour.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Most Expensive/Hr</p>
                  <p className="text-sm font-bold text-foreground">{hitachiSummary.highestCph ? hitachiSummary.highestCph.machineName : "—"}</p>
                  <p className="text-[10px] text-muted-foreground">{hitachiSummary.highestCph ? `₹${(hitachiSummary.highestCph.costPerHour ?? 0).toFixed(0)}/hr` : ""}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Most Efficient</p>
                  <p className="text-sm font-bold text-success">{hitachiSummary.lowestCph ? hitachiSummary.lowestCph.machineName : "—"}</p>
                  <p className="text-[10px] text-muted-foreground">{hitachiSummary.lowestCph ? `₹${(hitachiSummary.lowestCph.costPerHour ?? 0).toFixed(0)}/hr` : ""}</p>
                </div>
              </div>
            </div>

            {/* Fuel Analytics */}
            <div className="stat-card">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Fuel Analytics</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Total Fuel Cost</p>
                  <p className="text-sm font-bold text-foreground">₹{hitachiSummary.fuel.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Fuel/Hr</p>
                  <p className="text-sm font-bold text-foreground">₹{hitachiSummary.hours > 0 ? (hitachiSummary.fuel / hitachiSummary.hours).toFixed(0) : "0"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Top Fuel Machine</p>
                  <p className="text-sm font-bold text-foreground">{hitachiSummary.topFuel ? hitachiSummary.topFuel.machineName : "—"}</p>
                  <p className="text-xs text-muted-foreground">{hitachiSummary.topFuel ? `₹${hitachiSummary.topFuel.fuel.toLocaleString()}` : ""}</p>
                </div>
              </div>
            </div>

            {/* Rankings */}
            <div className="stat-card">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Machine Rankings</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {[
                  ["Highest Fuel Cost", hitachiSummary.highestFuel, (r: HitachiCostRow) => `₹${r.fuel.toLocaleString()}`],
                  ["Highest Maintenance", hitachiSummary.highestMaint, (r: HitachiCostRow) => `₹${r.maintenance.toLocaleString()}`],
                  ["Highest Repairs", hitachiSummary.highestRepairs, (r: HitachiCostRow) => `₹${r.repairs.toLocaleString()}`],
                  ["Highest Cost/Hr", hitachiSummary.highestCph, (r: HitachiCostRow) => `₹${(r.costPerHour ?? 0).toFixed(0)}/hr`],
                  ["Lowest Cost/Hr", hitachiSummary.lowestCph, (r: HitachiCostRow) => `₹${(r.costPerHour ?? 0).toFixed(0)}/hr`],
                  ["Most Used", hitachiSummary.mostUsed, (r: HitachiCostRow) => `${r.hours.toFixed(1)} hrs`],
                  ["Least Used", hitachiSummary.leastUsed, (r: HitachiCostRow) => `${r.hours.toFixed(1)} hrs`],
                  ["Highest Total Cost", hitachiSummary.highestCost, (r: HitachiCostRow) => `₹${r.total.toLocaleString()}`],
                ].map(([label, row, fmt]) => {
                  const r = row as HitachiCostRow | null;
                  const f = fmt as (r: HitachiCostRow) => string;
                  return (
                    <div key={label as string} className="rounded-md bg-secondary p-2">
                      <p className="text-[10px] text-muted-foreground uppercase">{label as string}</p>
                      <p className="font-bold text-foreground">{r ? r.machineName : "—"}</p>
                      <p className="text-muted-foreground">{r ? f(r) : ""}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Alerts */}
            {hitachiAlerts.length > 0 && (
              <div className="stat-card border-warning/30">
                <h3 className="text-sm font-medium text-warning mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Alerts</h3>
                <div className="space-y-1.5">
                  {hitachiAlerts.map((a, i) => (
                    <p key={i} className={`text-xs ${a.level === "danger" ? "text-destructive" : "text-warning"}`}>• {a.msg}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : reportType === "category" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-end gap-2">
              <button onClick={exportCategoryCSV} className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80"><FileDown className="h-3.5 w-3.5" /> CSV</button>
              <button onClick={exportCategoryExcel} className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80"><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</button>
              <button onClick={exportCategoryPDF} className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80"><Printer className="h-3.5 w-3.5" /> PDF</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(["BOULDERS", "K.K"] as const).map((cat) => (
                <div key={cat} className="stat-card">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2"><Package className="h-4 w-4 text-primary" /> {cat}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Quantity Sold</p>
                      <p className="text-2xl font-bold text-foreground">{categoryReport[cat].quantity.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Number of Bills</p>
                      <p className="text-2xl font-bold text-foreground">{categoryReport[cat].bills}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Quantity is based only on billed quantities. Assigning a category to an existing product can include its linked historical bill quantities without changing bill rows.</p>
          </div>
        ) : (

          <div className="space-y-2">
            <div className="stat-card grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground">
              <span>Name</span>
              <span className="text-center">{reportType === "operator" ? "Shifts" : "Trips"}</span>
              <span className="text-right">{reportType === "operator" ? "Total HRs" : "Revenue"}</span>
              <span className="text-right">{reportType === "operator" ? "Total Salary" : "Outstanding"}</span>

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
