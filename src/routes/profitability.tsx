import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useMemo, useState } from "react";
import {
  getBills, getExpenses, getCompanies, getCompanyOutstanding,
  useCloudData, type Bill, type Expense,
} from "../lib/store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { TrendingUp, TrendingDown, AlertTriangle, Download, FileText, FileSpreadsheet, Truck, Building2, Fuel } from "lucide-react";
import { format, startOfDay, startOfWeek, startOfMonth } from "date-fns";

export const Route = createFileRoute("/profitability")({
  component: ProfitabilityPage,
});

type Range = "all" | "today" | "week" | "month" | "custom";

interface TripRow {
  id: string;
  date: string;
  invoice: string;
  company: string;
  vehicle: string;
  driver: string;
  revenue: number;
  fuel: number;
  driverCost: number;
  maintenance: number;
  other: number;
  totalCost: number;
  profit: number;
  profitPct: number;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const pct = (n: number) => `${n.toFixed(1)}%`;

function ProfitabilityPage() {
  useCloudData();
  const [range, setRange] = useState<Range>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tab, setTab] = useState("trips");

  const { startTs, endTs } = useMemo(() => {
    const now = new Date();
    if (range === "today") return { startTs: startOfDay(now).getTime(), endTs: Infinity };
    if (range === "week") return { startTs: startOfWeek(now, { weekStartsOn: 1 }).getTime(), endTs: Infinity };
    if (range === "month") return { startTs: startOfMonth(now).getTime(), endTs: Infinity };
    if (range === "custom") {
      const s = from ? new Date(from + "T00:00:00").getTime() : -Infinity;
      const e = to ? new Date(to + "T23:59:59").getTime() : Infinity;
      return { startTs: s, endTs: e };
    }
    return { startTs: -Infinity, endTs: Infinity };
  }, [range, from, to]);

  const trips: TripRow[] = useMemo(() => {
    const bills = getBills();
    const exps = getExpenses();
    const byBill: Record<string, Expense[]> = {};
    exps.forEach((e) => {
      if (!e.linkedBillId) return;
      (byBill[e.linkedBillId] ||= []).push(e);
    });
    return bills
      .filter((b: Bill) => {
        const t = new Date(b.createdAt).getTime();
        return t >= startTs && t <= endTs;
      })
      .map((b: Bill) => {
        const linked = byBill[b.id] || [];
        let fuel = 0, driverCost = 0, maintenance = 0, other = 0;
        linked.forEach((e) => {
          if (e.category === "fuel") fuel += e.amount;
          else if (e.category === "salary") driverCost += e.amount;
          else if (e.category === "maintenance") maintenance += e.amount;
          else other += e.amount;
        });
        const totalCost = fuel + driverCost + maintenance + other;
        const profit = b.totalAmount - totalCost;
        return {
          id: b.id,
          date: b.createdAt,
          invoice: b.invoiceNumber || b.id.slice(-6).toUpperCase(),
          company: b.companyName,
          vehicle: b.vehicleNumber,
          driver: b.driverName,
          revenue: b.totalAmount,
          fuel, driverCost, maintenance, other, totalCost,
          profit,
          profitPct: b.totalAmount > 0 ? (profit / b.totalAmount) * 100 : 0,
        };
      });
  }, [startTs, endTs]);

  const totals = useMemo(() => {
    const revenue = trips.reduce((s, t) => s + t.revenue, 0);
    const cost = trips.reduce((s, t) => s + t.totalCost, 0);
    const profit = revenue - cost;
    const lossTrips = trips.filter((t) => t.profit < 0).length;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { revenue, cost, profit, lossTrips, margin };
  }, [trips]);

  const vehicleRows = useMemo(() => {
    const map: Record<string, { vehicle: string; trips: number; revenue: number; cost: number; fuel: number }> = {};
    trips.forEach((t) => {
      const key = t.vehicle || "—";
      const r = (map[key] ||= { vehicle: key, trips: 0, revenue: 0, cost: 0, fuel: 0 });
      r.trips++; r.revenue += t.revenue; r.cost += t.totalCost; r.fuel += t.fuel;
    });
    return Object.values(map)
      .map((r) => ({
        ...r,
        profit: r.revenue - r.cost,
        profitPct: r.revenue > 0 ? ((r.revenue - r.cost) / r.revenue) * 100 : 0,
        fuelPct: r.revenue > 0 ? (r.fuel / r.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [trips]);

  const customerRows = useMemo(() => {
    const companies = getCompanies();
    const map: Record<string, { id: string; name: string; trips: number; revenue: number; cost: number }> = {};
    trips.forEach((t) => {
      const bill = getBills().find((b) => b.id === t.id);
      const cid = bill?.companyId || "—";
      const r = (map[cid] ||= { id: cid, name: t.company, trips: 0, revenue: 0, cost: 0 });
      r.trips++; r.revenue += t.revenue; r.cost += t.totalCost;
    });
    return Object.values(map)
      .map((r) => ({
        ...r,
        profit: r.revenue - r.cost,
        outstanding: companies.find((c) => c.id === r.id) ? Math.max(0, getCompanyOutstanding(r.id)) : 0,
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [trips]);

  const driverRows = useMemo(() => {
    const map: Record<string, { name: string; trips: number; revenue: number; cost: number }> = {};
    trips.forEach((t) => {
      const key = t.driver || "—";
      const r = (map[key] ||= { name: key, trips: 0, revenue: 0, cost: 0 });
      r.trips++; r.revenue += t.revenue; r.cost += t.totalCost;
    });
    return Object.values(map)
      .map((r) => ({ ...r, profit: r.revenue - r.cost }))
      .sort((a, b) => b.profit - a.profit);
  }, [trips]);

  const topVehicle = vehicleRows[0];
  const topCustomer = customerRows[0];
  const topDriver = driverRows[0];
  const topRevVehicle = useMemo(() => [...vehicleRows].sort((a, b) => b.revenue - a.revenue)[0], [vehicleRows]);

  const downloadCSV = (rows: Record<string, any>[], filename: string) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const esc = (v: any) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };
  const downloadExcel = (rows: Record<string, any>[], filename: string) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const html = `<table border="1"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${headers.map((h) => `<td>${r[h] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };
  const downloadPDF = (rows: Record<string, any>[], title: string) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`<html><head><title>${title}</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:6px;text-align:left}th{background:#f3f4f6}</style></head><body><h2>${title}</h2><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${headers.map((h) => `<td>${r[h] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody></table><script>window.print()</script></body></html>`);
    w.document.close();
  };

  const currentExport = () => {
    if (tab === "trips") return trips.map((t) => ({ Date: format(new Date(t.date), "yyyy-MM-dd"), Invoice: t.invoice, Customer: t.company, Vehicle: t.vehicle, Driver: t.driver, Revenue: Math.round(t.revenue), Fuel: Math.round(t.fuel), DriverCost: Math.round(t.driverCost), Maintenance: Math.round(t.maintenance), Other: Math.round(t.other), Profit: Math.round(t.profit), "Profit%": t.profitPct.toFixed(1) }));
    if (tab === "vehicles") return vehicleRows.map((r) => ({ Vehicle: r.vehicle, Trips: r.trips, Revenue: Math.round(r.revenue), Expenses: Math.round(r.cost), Profit: Math.round(r.profit), "Profit%": r.profitPct.toFixed(1), "Fuel%": r.fuelPct.toFixed(1) }));
    if (tab === "customers") return customerRows.map((r) => ({ Customer: r.name, Trips: r.trips, Revenue: Math.round(r.revenue), Expenses: Math.round(r.cost), Profit: Math.round(r.profit), Outstanding: Math.round(r.outstanding) }));
    return driverRows.map((r) => ({ Driver: r.name, Trips: r.trips, Revenue: Math.round(r.revenue), Expenses: Math.round(r.cost), Profit: Math.round(r.profit) }));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Trip Profitability</h1>
            <p className="text-sm text-muted-foreground">Profit by trip, vehicle, customer and driver</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={range} onChange={(e) => setRange(e.target.value as Range)} className="rounded-md border border-input bg-background px-3 py-1.5 text-sm">
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="custom">Custom</option>
            </select>
            {range === "custom" && (
              <>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
              </>
            )}
            <button onClick={() => downloadCSV(currentExport(), `${tab}.csv`)} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-secondary"><Download className="h-3.5 w-3.5" />CSV</button>
            <button onClick={() => downloadExcel(currentExport(), `${tab}.xls`)} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-secondary"><FileSpreadsheet className="h-3.5 w-3.5" />Excel</button>
            <button onClick={() => downloadPDF(currentExport(), `${tab[0].toUpperCase() + tab.slice(1)} Profitability`)} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-secondary"><FileText className="h-3.5 w-3.5" />PDF</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Card icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} label="Total Profit" value={inr(totals.profit)} valueClass={totals.profit < 0 ? "text-destructive" : ""} />
          <Card icon={<TrendingUp className="h-4 w-4 text-blue-600" />} label="Profit Margin" value={pct(totals.margin)} />
          <Card icon={<AlertTriangle className="h-4 w-4 text-destructive" />} label="Loss Trips" value={String(totals.lossTrips)} valueClass={totals.lossTrips > 0 ? "text-destructive" : ""} />
          <Card icon={<Truck className="h-4 w-4 text-amber-600" />} label="Top Vehicle" value={topVehicle?.vehicle || "—"} sub={topVehicle ? inr(topVehicle.profit) : ""} />
          <Card icon={<Building2 className="h-4 w-4 text-purple-600" />} label="Top Customer" value={topCustomer?.name || "—"} sub={topCustomer ? inr(topCustomer.profit) : ""} />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Card icon={<Truck className="h-4 w-4 text-cyan-600" />} label="Top Driver" value={topDriver?.name || "—"} sub={topDriver ? inr(topDriver.profit) : ""} />
          <Card icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} label="Highest Revenue Vehicle" value={topRevVehicle?.vehicle || "—"} sub={topRevVehicle ? inr(topRevVehicle.revenue) : ""} />
          <Card icon={<TrendingDown className="h-4 w-4 text-destructive" />} label="Total Expenses" value={inr(totals.cost)} />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="trips">Trips</TabsTrigger>
            <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="drivers">Drivers</TabsTrigger>
            <TabsTrigger value="fuel"><Fuel className="h-3.5 w-3.5 mr-1" />Fuel</TabsTrigger>
          </TabsList>

          <TabsContent value="trips">
            <div className="rounded-lg border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Invoice</th>
                    <th className="px-3 py-2 text-left">Customer</th>
                    <th className="px-3 py-2 text-left">Vehicle</th>
                    <th className="px-3 py-2 text-right">Revenue</th>
                    <th className="px-3 py-2 text-right">Fuel</th>
                    <th className="px-3 py-2 text-right">Driver</th>
                    <th className="px-3 py-2 text-right">Other</th>
                    <th className="px-3 py-2 text-right">Profit</th>
                    <th className="px-3 py-2 text-right">%</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.length === 0 && <tr><td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">No trips in range</td></tr>}
                  {trips.map((t) => (
                    <tr key={t.id} className={`border-t ${t.profit < 0 ? "bg-destructive/5" : ""}`}>
                      <td className="px-3 py-2">{format(new Date(t.date), "dd MMM")}</td>
                      <td className="px-3 py-2 font-medium">{t.invoice}</td>
                      <td className="px-3 py-2">{t.company}</td>
                      <td className="px-3 py-2">{t.vehicle}</td>
                      <td className="px-3 py-2 text-right">{inr(t.revenue)}</td>
                      <td className="px-3 py-2 text-right">{inr(t.fuel)}</td>
                      <td className="px-3 py-2 text-right">{inr(t.driverCost)}</td>
                      <td className="px-3 py-2 text-right">{inr(t.maintenance + t.other)}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${t.profit < 0 ? "text-destructive" : "text-emerald-600"}`}>{inr(t.profit)}</td>
                      <td className="px-3 py-2 text-right">{pct(t.profitPct)}</td>
                      <td className="px-3 py-2">{t.profit < 0 && <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">LOSS</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="vehicles">
            <SimpleTable
              headers={["Vehicle", "Trips", "Revenue", "Expenses", "Profit", "Profit %"]}
              rows={vehicleRows.map((r) => [r.vehicle, r.trips, inr(r.revenue), inr(r.cost), <span className={r.profit < 0 ? "text-destructive font-semibold" : "text-emerald-600 font-semibold"}>{inr(r.profit)}</span>, pct(r.profitPct)])}
            />
          </TabsContent>

          <TabsContent value="customers">
            <SimpleTable
              headers={["Customer", "Trips", "Revenue", "Expenses", "Profit", "Outstanding"]}
              rows={customerRows.map((r) => [r.name, r.trips, inr(r.revenue), inr(r.cost), <span className={r.profit < 0 ? "text-destructive font-semibold" : "text-emerald-600 font-semibold"}>{inr(r.profit)}</span>, inr(r.outstanding)])}
            />
          </TabsContent>

          <TabsContent value="drivers">
            <SimpleTable
              headers={["Driver", "Trips", "Revenue", "Expenses", "Profit"]}
              rows={driverRows.map((r) => [r.name, r.trips, inr(r.revenue), inr(r.cost), <span className={r.profit < 0 ? "text-destructive font-semibold" : "text-emerald-600 font-semibold"}>{inr(r.profit)}</span>])}
            />
          </TabsContent>

          <TabsContent value="fuel">
            <SimpleTable
              headers={["Vehicle", "Trips", "Revenue", "Fuel Cost", "Fuel %"]}
              rows={vehicleRows.map((r) => [r.vehicle, r.trips, inr(r.revenue), inr(r.fuel), pct(r.fuelPct)])}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function Card({ icon, label, value, sub, valueClass }: { icon: React.ReactNode; label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className={`mt-1 text-lg font-bold ${valueClass || ""}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase">
          <tr>{headers.map((h, i) => <th key={i} className={`px-3 py-2 ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={headers.length} className="px-3 py-6 text-center text-muted-foreground">No data</td></tr>}
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              {r.map((c, j) => <td key={j} className={`px-3 py-2 ${j === 0 ? "text-left" : "text-right"}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
