import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState, useMemo } from "react";
import {
  getBills, getCompanies, getDrivers, getVehicles, getDateRange,
  getHitachiEntries, getHitachiFuel, getOperators,
} from "../lib/store";
import { Building2, Users, Truck, Settings, Search, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

type ReportType = "company" | "driver" | "vehicle" | "hitachi" | "operator";
type FilterType = "daily" | "weekly" | "monthly";

function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("company");
  const [filter, setFilter] = useState<FilterType>("monthly");
  const [search, setSearch] = useState("");
  const { start } = getDateRange(filter);

  const data = useMemo(() => {
    const bills = getBills().filter((b) => new Date(b.createdAt) >= start);
    const companies = getCompanies();
    const drivers = getDrivers();
    const vehicles = getVehicles();
    const hitachiEntries = getHitachiEntries().filter((e) => new Date(e.createdAt) >= start);
    const hitachiFuel = getHitachiFuel().filter((f) => new Date(f.createdAt) >= start);
    const ops = getOperators();

    if (reportType === "company") {
      return companies.map((c) => {
        const cBills = bills.filter((b) => b.companyId === c.id);
        return {
          id: c.id,
          name: c.name,
          trips: cBills.length,
          revenue: cBills.reduce((s, b) => s + b.totalAmount, 0),
          outstanding: cBills.filter((b) => b.paymentMode === "credit").reduce((s, b) => s + (b.outstandingAmount || 0), 0),
        };
      }).filter((r) => r.trips > 0 || r.name.toLowerCase().includes(search.toLowerCase()));
    }

    if (reportType === "driver") {
      return drivers.map((d) => {
        const dBills = bills.filter((b) => b.driverId === d.id);
        return {
          id: d.id,
          name: d.name,
          trips: dBills.length,
          revenue: dBills.reduce((s, b) => s + b.totalAmount, 0),
          outstanding: dBills.filter((b) => b.paymentMode === "credit").reduce((s, b) => s + (b.outstandingAmount || 0), 0),
        };
      }).filter((r) => r.trips > 0 || r.name.toLowerCase().includes(search.toLowerCase()));
    }

    if (reportType === "vehicle") {
      return vehicles.map((v) => {
        const vBills = bills.filter((b) => b.vehicleId === v.id);
        return {
          id: v.id,
          name: `${v.number} (${v.capacity})`,
          trips: vBills.length,
          revenue: vBills.reduce((s, b) => s + b.totalAmount, 0),
          outstanding: vBills.filter((b) => b.paymentMode === "credit").reduce((s, b) => s + (b.outstandingAmount || 0), 0),
        };
      }).filter((r) => r.trips > 0 || r.name.toLowerCase().includes(search.toLowerCase()));
    }

    if (reportType === "hitachi") {
      const machineMap = new Map<string, { name: string; totalKM: number; totalFuel: number; entries: number }>();
      hitachiEntries.forEach((e) => {
        const existing = machineMap.get(e.machineId) || { name: e.machineName, totalKM: 0, totalFuel: 0, entries: 0 };
        existing.totalKM += e.totalKM;
        existing.entries += 1;
        machineMap.set(e.machineId, existing);
      });
      hitachiFuel.forEach((f) => {
        const existing = machineMap.get(f.machineId) || { name: f.machineName, totalKM: 0, totalFuel: 0, entries: 0 };
        existing.totalFuel += f.liters;
        machineMap.set(f.machineId, existing);
      });
      return Array.from(machineMap.entries()).map(([id, d]) => ({
        id,
        name: d.name,
        trips: d.entries,
        revenue: d.totalKM,
        outstanding: d.totalFuel,
        isHitachi: true,
      }));
    }

    // operator
    return ops.map((o) => {
      const oEntries = hitachiEntries.filter((e) => e.operatorId === o.id);
      const machineSet = new Set(oEntries.map((e) => e.machineName));
      return {
        id: o.id,
        name: o.name,
        trips: oEntries.length,
        revenue: 0,
        outstanding: 0,
        machines: Array.from(machineSet).join(", "),
        isOperator: true,
      };
    }).filter((r) => r.trips > 0 || r.name.toLowerCase().includes(search.toLowerCase()));
  }, [reportType, filter, start, search]);

  const reportTabs: { id: ReportType; label: string; icon: typeof Building2 }[] = [
    { id: "company", label: "Company", icon: Building2 },
    { id: "driver", label: "Driver", icon: Users },
    { id: "vehicle", label: "Vehicle", icon: Truck },
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

        {/* Report Table */}
        <div className="space-y-2">
          {/* Header */}
          <div className="stat-card grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground">
            <span>Name</span>
            <span className="text-center">{reportType === "hitachi" ? "Entries" : reportType === "operator" ? "Shifts" : "Trips"}</span>
            <span className="text-right">{reportType === "hitachi" ? "Total KM" : reportType === "operator" ? "—" : "Revenue"}</span>
            <span className="text-right">{reportType === "hitachi" ? "Fuel (L)" : reportType === "operator" ? "Machines" : "Outstanding"}</span>
          </div>

          {(data as any[]).map((r: any) => (
            <div key={r.id} className="stat-card grid grid-cols-4 gap-2 items-center">
              <span className="font-medium text-sm text-foreground truncate">{r.name}</span>
              <span className="text-center text-sm text-foreground">{r.trips}</span>
              <span className="text-right text-sm font-medium text-foreground">
                {r.isOperator ? "—" : r.isHitachi ? r.revenue.toLocaleString() : `₹${r.revenue.toLocaleString()}`}
              </span>
              <span className={`text-right text-sm font-medium ${r.isHitachi || r.isOperator ? "text-foreground" : r.outstanding > 0 ? "text-warning" : "text-success"}`}>
                {r.isOperator ? (r.machines || "—") : r.isHitachi ? `${r.outstanding}L` : `₹${r.outstanding.toLocaleString()}`}
              </span>
            </div>
          ))}

          {data.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No data for this period.</p>}

          {/* Totals for non-hitachi */}
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
