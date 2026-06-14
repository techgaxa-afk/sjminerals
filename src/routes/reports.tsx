import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState, useMemo } from "react";
import {
  getBills, getCompanies, getDateRange, getCompanyOutstanding,
  getHitachiEntries, getHitachiFuel, getOperators, getAllCompanyPayments,
} from "../lib/store";
import { Building2, Users, Settings, Search, Wallet, FileDown } from "lucide-react";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

type ReportType = "company" | "vehicle" | "hitachi" | "operator" | "ledger";
type FilterType = "daily" | "weekly" | "monthly";

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

  const reportTabs: { id: ReportType; label: string; icon: typeof Building2 }[] = [
    { id: "company", label: "Company", icon: Building2 },
    { id: "vehicle", label: "Vehicle", icon: Building2 },
    { id: "hitachi", label: "Hitachi", icon: Settings },
    { id: "operator", label: "Operator", icon: Users },
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
      </div>
    </AppLayout>
  );
}
