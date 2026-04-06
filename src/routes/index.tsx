import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState, useMemo } from "react";
import { getBills, getExpenses, getJCBLogs, getDateRange } from "../lib/store";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";
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
    const jcbLogs = getJCBLogs().filter((l) => new Date(l.createdAt) >= start);
    const expenses = getExpenses().filter((e) => new Date(e.date) >= start);

    const totalRevenue = bills.reduce((s, b) => s + b.totalAmount, 0) + jcbLogs.reduce((s, l) => s + l.totalCost, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    const expenseByCategory = expenses.reduce(
      (acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Revenue by day
    const revenueByDay: Record<string, number> = {};
    bills.forEach((b) => {
      const day = format(parseISO(b.createdAt), "MMM dd");
      revenueByDay[day] = (revenueByDay[day] || 0) + b.totalAmount;
    });
    jcbLogs.forEach((l) => {
      const day = format(parseISO(l.createdAt), "MMM dd");
      revenueByDay[day] = (revenueByDay[day] || 0) + l.totalCost;
    });

    return {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      billCount: bills.length,
      expenseByCategory,
      revenueChart: Object.entries(revenueByDay).map(([name, value]) => ({ name, value })),
    };
  }, [filter, start]);

  const COLORS = ["oklch(0.75 0.16 70)", "oklch(0.65 0.18 145)", "oklch(0.6 0.2 25)", "oklch(0.6 0.15 250)"];
  const pieData = Object.entries(stats.expenseByCategory).map(([name, value]) => ({ name, value }));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="module-header mb-0">Dashboard</h1>
          <div className="flex gap-1 rounded-md bg-secondary p-1">
            {(["daily", "weekly", "monthly"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="h-4 w-4 text-success" />
              Total Revenue
            </div>
            <p className="text-2xl font-bold text-foreground">₹{stats.totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.billCount} bills</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Total Expenses
            </div>
            <p className="text-2xl font-bold text-foreground">₹{stats.totalExpenses.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              Net Profit
            </div>
            <p className={`text-2xl font-bold ${stats.netProfit >= 0 ? "text-success" : "text-destructive"}`}>
              ₹{stats.netProfit.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="stat-card">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Revenue Trend
            </h3>
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
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
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
