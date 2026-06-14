import { createFileRoute, Link } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState, useMemo } from "react";
import { getBills, getExpenses, getHitachiEntries, getDateRange, getCompanies, getCompanyOutstanding, getPayments, getAllCompanyPayments, getRecentPayments, getCompanyAging, useCloudData, hasLocalDataToImport, hasImportedLocal, importFromLocalStorage, getCashSales, getUpiSales, getCashExpenses, getUpiExpenses, getRecentActivity, type ActivityKind } from "../lib/store";
import { exportReportPDF } from "../lib/pdf";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Calendar, FileDown, AlertTriangle, Banknote, CreditCard, FileText, Wallet, CloudUpload, Receipt, Clock, Activity, RotateCcw } from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

type FilterType = "daily" | "weekly" | "monthly";

function DashboardPage() {
  useCloudData();
  const [filter, setFilter] = useState<FilterType>("daily");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const showImport = hasLocalDataToImport() && !hasImportedLocal();
  const { start } = getDateRange(filter);

  const handleImport = async () => {
    if (!confirm("Push existing data from this device to the cloud? This runs only once.")) return;
    setImporting(true); setImportMsg(null);
    try {
      const res = await importFromLocalStorage();
      const total = Object.values(res.inserted).reduce((s, n) => s + n, 0);
      setImportMsg(`Imported ${total} records to cloud.`);
    } catch (e: any) {
      setImportMsg(`Import failed: ${e?.message ?? e}`);
    } finally { setImporting(false); }
  };

  const stats = useMemo(() => {
    const bills = getBills().filter((b) => new Date(b.createdAt) >= start);
    const expenses = getExpenses().filter((e) => new Date(e.date) >= start);
    const hitachiEntries = getHitachiEntries().filter((e) => new Date(e.createdAt) >= start);
    const payments = getPayments().filter((p) => new Date(p.createdAt) >= start);
    const companyPaymentsInRange = getAllCompanyPayments().filter((p) => new Date(p.paymentDate) >= start);

    const totalRevenue = bills.reduce((s, b) => s + b.totalAmount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const companies = getCompanies();
    const totalOutstanding = companies.reduce((s, c) => s + Math.max(0, getCompanyOutstanding(c.id)), 0);
    const totalTips = bills.reduce((s, b) => s + (b.tipsAmount || 0), 0);

    // Cash / UPI / Credit breakdown (split-aware)
    let cashSales = 0, upiSales = 0;
    let creditBillsCount = 0;
    bills.forEach((b) => {
      if (b.splitPayment) {
        cashSales += b.cashAmount || 0;
        upiSales += b.upiAmount || 0;
      } else if (b.paymentMode === "cash") {
        cashSales += b.paidAmount;
      } else if (b.paymentMode === "upi") {
        upiSales += b.paidAmount;
      }
      if (b.paymentMode === "credit" || (b.outstandingAmount || 0) > 0) creditBillsCount++;
    });
    // Collected = bill-level payments + standalone company ledger payments in the period
    const collectedToday =
      payments.reduce((s, p) => s + p.amount, 0) +
      companyPaymentsInRange.reduce((s, p) => s + p.amount, 0);

    const expenseByCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    const revenueByDay: Record<string, number> = {};
    bills.forEach((b) => {
      const day = format(parseISO(b.createdAt), "MMM dd");
      revenueByDay[day] = (revenueByDay[day] || 0) + b.totalAmount;
    });

    const companyOutstandings = companies.map((c) => ({
      id: c.id, name: c.name, vehicle: "",
      outstanding: getCompanyOutstanding(c.id),
      creditLimit: c.creditLimit || 0,
      lastPaymentDate: getAllCompanyPayments()
        .filter((p) => p.companyId === c.id && p.status !== "reversed")
        .map((p) => p.paymentDate)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0],
    })).filter((c) => c.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding).slice(0, 10);

    return {
      totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses,
      billCount: bills.length, totalOutstanding, totalTips,
      cashSales, upiSales, creditBillsCount, collectedToday,
      hitachiEntries: hitachiEntries.length, expenseByCategory,
      revenueChart: Object.entries(revenueByDay).map(([name, value]) => ({ name, value })),
      companyOutstandings,
      bills: bills.map((b) => ({ customerName: b.companyName || "Walk-in", totalAmount: b.totalAmount, createdAt: b.createdAt })),
      expenses: expenses.map((e) => ({ category: e.category, amount: e.amount, date: e.date, notes: e.notes })),
    };
  }, [filter, start]);

  const collectionStats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const all = getAllCompanyPayments().filter((p) => p.status !== "reversed");
    const today = all.filter((p) => new Date(p.paymentDate).getTime() >= startOfDay.getTime()).reduce((s, p) => s + p.amount, 0);
    const month = all.filter((p) => new Date(p.paymentDate).getTime() >= startOfMonth.getTime()).reduce((s, p) => s + p.amount, 0);
    const companies = getCompanies();
    const outstanding = companies.reduce((s, c) => s + Math.max(0, getCompanyOutstanding(c.id)), 0);
    const overdue = companies.reduce((s, c) => {
      const b = getCompanyAging(c.id);
      return s + b.d30 + b.d60 + b.d90 + b.d90plus;
    }, 0);
    const creditExceeded = companies.filter((c) => (c.creditLimit || 0) > 0 && getCompanyOutstanding(c.id) > (c.creditLimit || 0));
    const allBills = getBills();
    const breakdown = (since: Date) => {
      const list = allBills.filter((b) => new Date(b.createdAt).getTime() >= since.getTime());
      let cash = 0, upi = 0, credit = 0;
      list.forEach((b) => {
        if (b.paymentMode === "credit" || (b.outstandingAmount || 0) > 0) credit++;
        else if (b.splitPayment) {
          if ((b.cashAmount || 0) >= (b.upiAmount || 0)) cash++; else upi++;
        } else if (b.paymentMode === "cash") cash++;
        else if (b.paymentMode === "upi") upi++;
      });
      return { count: list.length, cash, upi, credit };
    };
    const todayInv = breakdown(startOfDay);
    const monthInv = breakdown(startOfMonth);
    const availableCash = getCashSales() - getCashExpenses();
    const availableUpi = getUpiSales() - getUpiExpenses();
    const cashSalesToday = getCashSales(startOfDay);
    const upiSalesToday = getUpiSales(startOfDay);
    const cashExpToday = getCashExpenses(startOfDay);
    const upiExpToday = getUpiExpenses(startOfDay);
    return {
      today, month, outstanding, overdue, creditExceeded,
      todayInv, monthInv,
      availableCash, availableUpi,
      cashSalesToday, upiSalesToday, cashExpToday, upiExpToday,
      netCashToday: cashSalesToday - cashExpToday,
      netUpiToday: upiSalesToday - upiExpToday,
    };
  }, []);

  const recentPayments = useMemo(() => {
    const companies = getCompanies();
    const nameOf = (id: string) => companies.find((c) => c.id === id)?.name ?? "—";
    return getRecentPayments(10).map((p) => ({ ...p, companyName: nameOf(p.companyId) }));
  }, []);

  const recentActivity = useMemo(() => getRecentActivity(10), []);

  const handleExportReport = () => { exportReportPDF(filter, stats); };

  const COLORS = ["oklch(0.75 0.16 70)", "oklch(0.65 0.18 145)", "oklch(0.6 0.2 25)", "oklch(0.6 0.15 250)", "oklch(0.65 0.18 50)"];
  const pieData = Object.entries(stats.expenseByCategory).map(([name, value]) => ({ name, value }));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="module-header mb-0">Dashboard</h1>
          <div className="flex items-center gap-2">
            <button onClick={handleExportReport} className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"><FileDown className="h-3.5 w-3.5" /> Export</button>
            <div className="flex gap-1 rounded-md bg-secondary p-1">
              {(["daily", "weekly", "monthly"] as FilterType[]).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{f}</button>
              ))}
            </div>
          </div>
        </div>

        {showImport && (
          <div className="rounded-md border border-primary/40 bg-primary/5 p-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm">
              <div className="font-medium text-foreground flex items-center gap-2"><CloudUpload className="h-4 w-4 text-primary" /> Local data detected</div>
              <p className="text-xs text-muted-foreground">Push existing bills, companies and records from this device to the cloud (one time).</p>
            </div>
            <button onClick={handleImport} disabled={importing} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {importing ? "Importing…" : "Import to cloud"}
            </button>
          </div>
        )}
        {importMsg && <div className="rounded-md border border-success/30 bg-success/5 p-2 text-xs text-success">{importMsg}</div>}

        {/* Cash & UPI Flow Today */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="stat-card border-success/30 bg-success/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-success"><Banknote className="h-4 w-4" /> Cash Flow Today</div>
              {collectionStats.availableCash <= 0 ? (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">NO CASH AVAILABLE</span>
              ) : collectionStats.availableCash < 1000 ? (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-warning/20 text-warning">LOW CASH BALANCE</span>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-[10px] text-muted-foreground">Sales</p><p className="text-sm font-bold text-success">₹{collectionStats.cashSalesToday.toLocaleString()}</p></div>
              <div><p className="text-[10px] text-muted-foreground">Expenses</p><p className="text-sm font-bold text-destructive">₹{collectionStats.cashExpToday.toLocaleString()}</p></div>
              <div><p className="text-[10px] text-muted-foreground">Net</p><p className={`text-sm font-bold ${collectionStats.netCashToday >= 0 ? "text-success" : "text-destructive"}`}>₹{collectionStats.netCashToday.toLocaleString()}</p></div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Available Cash: <span className="font-semibold text-foreground">₹{collectionStats.availableCash.toLocaleString()}</span></p>
          </div>
          <div className="stat-card border-primary/30 bg-primary/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary"><CreditCard className="h-4 w-4" /> UPI Flow Today</div>
              {collectionStats.availableUpi <= 0 ? (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">NO UPI BALANCE</span>
              ) : collectionStats.availableUpi < 1000 ? (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-warning/20 text-warning">LOW UPI BALANCE</span>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-[10px] text-muted-foreground">Sales</p><p className="text-sm font-bold text-primary">₹{collectionStats.upiSalesToday.toLocaleString()}</p></div>
              <div><p className="text-[10px] text-muted-foreground">Expenses</p><p className="text-sm font-bold text-destructive">₹{collectionStats.upiExpToday.toLocaleString()}</p></div>
              <div><p className="text-[10px] text-muted-foreground">Net</p><p className={`text-sm font-bold ${collectionStats.netUpiToday >= 0 ? "text-success" : "text-destructive"}`}>₹{collectionStats.netUpiToday.toLocaleString()}</p></div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Available UPI: <span className="font-semibold text-foreground">₹{collectionStats.availableUpi.toLocaleString()}</span></p>
          </div>
        </div>

        {/* Period totals + Invoice breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="stat-card border-success/30 bg-success/5">
            <div className="flex items-center gap-2 text-xs mb-1 text-success"><Banknote className="h-3.5 w-3.5" /> Cash Sales</div>
            <p className="text-xl font-bold text-success">₹{stats.cashSales.toLocaleString()}</p>
          </div>
          <div className="stat-card border-primary/30 bg-primary/5">
            <div className="flex items-center gap-2 text-xs mb-1 text-primary"><CreditCard className="h-3.5 w-3.5" /> UPI Sales</div>
            <p className="text-xl font-bold text-primary">₹{stats.upiSales.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-xs mb-1 text-muted-foreground"><FileText className="h-3.5 w-3.5 text-primary" /> Today's Invoices</div>
            <p className="text-xl font-bold text-foreground">{collectionStats.todayInv.count}</p>
            <p className="text-[10px] text-muted-foreground">Cash: {collectionStats.todayInv.cash} · UPI: {collectionStats.todayInv.upi} · Credit: {collectionStats.todayInv.credit}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-xs mb-1 text-muted-foreground"><Calendar className="h-3.5 w-3.5 text-primary" /> This Month Invoices</div>
            <p className="text-xl font-bold text-foreground">{collectionStats.monthInv.count}</p>
            <p className="text-[10px] text-muted-foreground">Cash: {collectionStats.monthInv.cash} · UPI: {collectionStats.monthInv.upi} · Credit: {collectionStats.monthInv.credit}</p>
          </div>
        </div>

        <div className="stat-card border-warning/30 bg-warning/5">
          <div className="flex items-center gap-2 text-xs mb-1 text-warning"><AlertTriangle className="h-3.5 w-3.5" /> Credit / Outstanding</div>
          <p className="text-xl font-bold text-warning">₹{stats.totalOutstanding.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{stats.creditBillsCount} credit bills</p>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="stat-card">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingUp className="h-3.5 w-3.5 text-success" /> Revenue</div>
            <p className="text-xl font-bold text-foreground">₹{stats.totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{stats.billCount} bills</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingDown className="h-3.5 w-3.5 text-destructive" /> Expenses</div>
            <p className="text-xl font-bold text-foreground">₹{stats.totalExpenses.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><DollarSign className="h-3.5 w-3.5 text-primary" /> Net Profit</div>
            <p className={`text-xl font-bold ${stats.netProfit >= 0 ? "text-success" : "text-destructive"}`}>₹{stats.netProfit.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Wallet className="h-3.5 w-3.5 text-success" /> Collected</div>
            <p className="text-xl font-bold text-success">₹{stats.collectedToday.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground"><FileText className="h-3 w-3 inline" /> payments in period</p>
          </div>
        </div>

        {stats.companyOutstandings.length > 0 && (
          <div className="stat-card">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Top Outstanding Companies</h3>
            {stats.companyOutstandings.map((c) => {
              const exceeded = c.creditLimit > 0 && c.outstanding > c.creditLimit;
              return (
                <div key={c.id} className="flex justify-between items-center text-sm py-1.5 border-b border-border/50 last:border-0 gap-2">
                  <span className="text-foreground truncate flex items-center gap-1.5">
                    {c.name}
                    {exceeded && <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-destructive/20 text-destructive">LIMIT</span>}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">{c.lastPaymentDate ? `Last: ${format(parseISO(c.lastPaymentDate), "dd MMM")}` : "No payments"}</span>
                  <span className="font-bold text-warning whitespace-nowrap">₹{c.outstanding.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* AR Collection Widgets */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="stat-card border-success/30 bg-success/5">
            <div className="flex items-center gap-2 text-xs mb-1 text-success"><Wallet className="h-3.5 w-3.5" /> Today's Collections</div>
            <p className="text-xl font-bold text-success">₹{collectionStats.today.toLocaleString()}</p>
          </div>
          <div className="stat-card border-primary/30 bg-primary/5">
            <div className="flex items-center gap-2 text-xs mb-1 text-primary"><Calendar className="h-3.5 w-3.5" /> This Month</div>
            <p className="text-xl font-bold text-primary">₹{collectionStats.month.toLocaleString()}</p>
          </div>
          <div className="stat-card border-warning/30 bg-warning/5">
            <div className="flex items-center gap-2 text-xs mb-1 text-warning"><AlertTriangle className="h-3.5 w-3.5" /> Receivables</div>
            <p className="text-xl font-bold text-warning">₹{collectionStats.outstanding.toLocaleString()}</p>
          </div>
          <div className="stat-card border-destructive/30 bg-destructive/5">
            <div className="flex items-center gap-2 text-xs mb-1 text-destructive"><Clock className="h-3.5 w-3.5" /> Overdue (30+ d)</div>
            <p className="text-xl font-bold text-destructive">₹{collectionStats.overdue.toLocaleString()}</p>
          </div>
          <div className="stat-card border-destructive/30 bg-destructive/5">
            <div className="flex items-center gap-2 text-xs mb-1 text-destructive"><AlertTriangle className="h-3.5 w-3.5" /> Limit Exceeded</div>
            <p className="text-xl font-bold text-destructive">{collectionStats.creditExceeded.length}</p>
            <p className="text-[10px] text-muted-foreground truncate" title={collectionStats.creditExceeded.map((c) => c.name).join(", ")}>{collectionStats.creditExceeded.map((c) => c.name).join(", ") || "none"}</p>
          </div>
        </div>

        {/* Recent Payments */}
        {recentPayments.length > 0 && (
          <div className="stat-card">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Recent Payments</h3>
            <div className="overflow-x-auto">
              <div className="min-w-[560px] space-y-1">
                <div className="grid gap-2 text-[10px] font-medium text-muted-foreground uppercase px-1" style={{ gridTemplateColumns: "1.2fr 1.4fr 2fr 1fr 1fr" }}>
                  <span>Date</span>
                  <span>Receipt</span>
                  <span>Company</span>
                  <span className="text-right">Amount</span>
                  <span>Method</span>
                </div>
                {recentPayments.map((p) => (
                  <div key={p.id} className="grid gap-2 items-center text-xs py-1.5 px-1 border-b border-border/40 last:border-0" style={{ gridTemplateColumns: "1.2fr 1.4fr 2fr 1fr 1fr" }}>
                    <span className="text-muted-foreground">{format(parseISO(p.paymentDate), "dd MMM yy")}</span>
                    <span className="font-mono text-[10px] text-foreground truncate">{p.receiptNumber || "—"}</span>
                    <span className="text-foreground truncate">{p.companyName}</span>
                    <span className="text-right font-medium text-success">₹{p.amount.toLocaleString()}</span>
                    <span className="text-foreground">{p.paymentMethod || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div className="stat-card">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Recent Activity</h3>
            <div className="space-y-1">
              {recentActivity.map((a) => {
                const kindMeta: Record<ActivityKind, { icon: typeof FileText; cls: string }> = {
                  invoice:  { icon: FileText,  cls: "text-primary" },
                  payment:  { icon: Receipt,   cls: "text-success" },
                  expense:  { icon: TrendingDown, cls: "text-destructive" },
                  reversal: { icon: RotateCcw, cls: "text-warning" },
                };
                const m = kindMeta[a.kind];
                const Icon = m.icon;
                return (
                  <div key={a.id} className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-border/40 last:border-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${m.cls}`} />
                      <span className="text-foreground truncate">{a.label}</span>
                      <span className="font-mono text-[10px] text-muted-foreground truncate">{a.ref}</span>
                    </div>
                    <span className={`font-medium whitespace-nowrap ${m.cls}`}>{a.kind === "expense" || a.kind === "reversal" ? "-" : "+"}₹{a.amount.toLocaleString()}</span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:inline">{formatDistanceToNow(new Date(a.time), { addSuffix: true })}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="stat-card">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2"><Calendar className="h-4 w-4" /> Revenue Trend</h3>
            {stats.revenueChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.revenueChart}>
                  <XAxis dataKey="name" tick={{ fill: "oklch(0.6 0.02 250)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "oklch(0.6 0.02 250)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "oklch(0.22 0.012 250)", border: "1px solid oklch(0.3 0.015 250)", borderRadius: 6, color: "oklch(0.93 0.01 80)" }} />
                  <Bar dataKey="value" fill="oklch(0.75 0.16 70)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No revenue data yet</p>
            )}
          </div>
          <div className="stat-card">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Expenses by Category</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }: any) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "oklch(0.22 0.012 250)", border: "1px solid oklch(0.3 0.015 250)", borderRadius: 6, color: "oklch(0.93 0.01 80)" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No expense data yet</p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
