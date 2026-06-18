import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useEffect, useMemo, useState } from "react";
import {
  getBackdatedBills, getUserNameCached, prefetchUserNames, useCloudData,
} from "../lib/store";
import { useUserRoles } from "@/hooks/use-roles";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { AlertTriangle, FileDown, Printer } from "lucide-react";

export const Route = createFileRoute("/reports/backdated")({
  component: BackdatedReportPage,
});

type FilterType = "daily" | "weekly" | "monthly" | "custom";

function BackdatedReportPage() {
  useCloudData();
  const { isAdmin, isStaff } = useUserRoles();
  const allowed = isAdmin || isStaff;

  const [filter, setFilter] = useState<FilterType>("monthly");
  const today = new Date();
  const [from, setFrom] = useState<string>(format(startOfMonth(today), "yyyy-MM-dd"));
  const [to, setTo] = useState<string>(format(endOfMonth(today), "yyyy-MM-dd"));

  useEffect(() => {
    const t = new Date();
    if (filter === "daily") { const d = format(t, "yyyy-MM-dd"); setFrom(d); setTo(d); }
    else if (filter === "weekly") { setFrom(format(startOfWeek(t, { weekStartsOn: 1 }), "yyyy-MM-dd")); setTo(format(endOfWeek(t, { weekStartsOn: 1 }), "yyyy-MM-dd")); }
    else if (filter === "monthly") { setFrom(format(startOfMonth(t), "yyyy-MM-dd")); setTo(format(endOfMonth(t), "yyyy-MM-dd")); }
  }, [filter]);

  const rows = useMemo(() => {
    const fromMs = new Date(from + "T00:00:00").getTime();
    const toMs = new Date(to + "T23:59:59").getTime();
    return getBackdatedBills()
      .filter((b) => {
        const created = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return created >= fromMs && created <= toMs;
      })
      .map((b) => {
        const createdDay = (b.createdAt || "").slice(0, 10);
        const days = Math.round(
          (new Date(createdDay + "T00:00:00").getTime() - new Date(b.billDate + "T00:00:00").getTime()) / 86400000,
        );
        return {
          id: b.id,
          invoiceNo: b.invoiceNumber || b.id.slice(-6).toUpperCase(),
          billDate: b.billDate,
          createdAt: b.createdAt,
          days,
          createdBy: b.createdBy ?? null,
          customer: b.companyName || "Walk-in",
          amount: b.totalAmount || 0,
        };
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [from, to]);

  useEffect(() => { void prefetchUserNames(rows.map((r) => r.createdBy)); }, [rows]);

  const exportCSV = () => {
    const header = ["Invoice No","Bill Date","Created On","Days Difference","Created By","Customer","Amount"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push([
        r.invoiceNo,
        r.billDate,
        r.createdAt ? format(parseISO(r.createdAt), "yyyy-MM-dd HH:mm") : "",
        r.days,
        getUserNameCached(r.createdBy).replace(/,/g, " "),
        r.customer.replace(/,/g, " "),
        r.amount,
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `backdated-bills-${from}_to_${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    // Excel-friendly TSV (.xls opens fine in Excel)
    const header = ["Invoice No","Bill Date","Created On","Days Difference","Created By","Customer","Amount"];
    const lines = [header.join("\t")];
    for (const r of rows) {
      lines.push([
        r.invoiceNo, r.billDate,
        r.createdAt ? format(parseISO(r.createdAt), "yyyy-MM-dd HH:mm") : "",
        String(r.days),
        getUserNameCached(r.createdBy),
        r.customer, String(r.amount),
      ].join("\t"));
    }
    const blob = new Blob([lines.join("\n")], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `backdated-bills-${from}_to_${to}.xls`; a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = () => window.print();

  if (!allowed) {
    return (
      <AppLayout>
        <div className="p-6 text-sm text-muted-foreground">You do not have access to this report.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="module-header mb-0 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" /> Backdated Bills Report</h1>
          <div className="flex gap-2 print:hidden">
            <button onClick={exportCSV} className="rounded-md bg-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"><FileDown className="h-3.5 w-3.5" /> CSV</button>
            <button onClick={exportExcel} className="rounded-md bg-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"><FileDown className="h-3.5 w-3.5" /> Excel</button>
            <button onClick={printPDF} className="rounded-md bg-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"><Printer className="h-3.5 w-3.5" /> PDF / Print</button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2 print:hidden">
          <div className="flex gap-1 rounded-md bg-secondary p-1">
            {(["daily","weekly","monthly","custom"] as FilterType[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-3 py-1 text-xs font-medium capitalize ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{f}</button>
            ))}
          </div>
          {filter === "custom" && (
            <>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border border-input bg-secondary px-2 py-1 text-xs" />
              <span className="text-xs text-muted-foreground">to</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border border-input bg-secondary px-2 py-1 text-xs" />
            </>
          )}
          <div className="ml-auto text-xs text-muted-foreground">{rows.length} bills · {from} → {to}</div>
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-xs">
            <thead className="bg-secondary text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-left">Invoice No</th>
                <th className="px-2 py-2 text-left">Bill Date</th>
                <th className="px-2 py-2 text-left">Created On</th>
                <th className="px-2 py-2 text-right">Days</th>
                <th className="px-2 py-2 text-left">Created By</th>
                <th className="px-2 py-2 text-left">Customer</th>
                <th className="px-2 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-2 py-1.5 font-mono">{r.invoiceNo}</td>
                  <td className="px-2 py-1.5">{format(parseISO(r.billDate + "T00:00:00"), "dd MMM yyyy")}</td>
                  <td className="px-2 py-1.5">{r.createdAt ? format(parseISO(r.createdAt), "dd MMM yyyy HH:mm") : "—"}</td>
                  <td className="px-2 py-1.5 text-right font-semibold text-warning">{r.days}</td>
                  <td className="px-2 py-1.5">{getUserNameCached(r.createdBy)}</td>
                  <td className="px-2 py-1.5">{r.customer}</td>
                  <td className="px-2 py-1.5 text-right">₹{r.amount.toLocaleString()}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-2 py-6 text-center text-muted-foreground">No backdated bills in this range.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
