import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState, useMemo } from "react";
import { getBills, getExpenses, getHitachiEntries, getDateRange, getCompanies, getCompanyOutstanding, getPayments } from "../lib/store";
import { exportReportPDF } from "../lib/pdf";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Calendar, FileDown, AlertTriangle, Banknote, CreditCard, FileText, Wallet } from "lucide-react";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

type FilterType = "daily" | "weekly" | "monthly";

function DashboardPage() {
  const [filter, setFilter] = useState<FilterType>("daily");
  const { start } = getDateRange(filter);

  const stats = useMemo(() => {
    const bills = getBills().filter((b) => new Date(b.createdAt) >= start);
    const expenses = getExpenses().filter((e) => new Date(e.date) >= start);
    const hitachiEntries = getHitachiEntries().filter((e) => new Date(e.createdAt) >= start);
    const payments = getPayments().filter((p) => new Date(p.createdAt) >= start);

    const totalRevenue = bills.reduce((s, b) => s + b.totalAmount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const totalOutstanding = bills.reduce((s, b) => s + (b.outstandingAmount || 0), 0);
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
    const collectedToday = payments.reduce((s, p) => s + p.amount, 0);

    const expenseByCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    const revenueByDay: Record<string, number> = {};
    bills.forEach((b) => {
      const day = format(parseISO(b.createdAt), "MMM dd");
      revenueByDay[day] = (revenueByDay[day] || 0) + b.totalAmount;
    });

    const companies = getCompanies();
    const companyOutstandings = companies.map((c) => ({
      name: c.name, vehicle: c.vehicleNumber,
      outstanding: getCompanyOutstanding(c.id),
    })).filter((c) => c.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding).slice(0, 5);

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
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><AlertTriangle className="h-3.5 w-3.5 text-warning" /> Outstanding</div>
            <p className="text-xl font-bold text-warning">₹{stats.totalOutstanding.toLocaleString()}</p>
          </div>
        </div>

        {stats.companyOutstandings.length > 0 && (
          <div className="stat-card">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Top Outstanding Companies</h3>
            {stats.companyOutstandings.map((c) => (
              <div key={c.name} className="flex justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                <span className="text-foreground">{c.name} <span className="text-xs text-muted-foreground">{c.vehicle}</span></span>
                <span className="font-bold text-warning">₹{c.outstanding.toLocaleString()}</span>
              </div>
            ))}
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
