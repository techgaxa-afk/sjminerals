import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  getCompanies, getBillsByCompany, getCompanyPayments,
  getCompanyOutstanding, saveCompanyPayment, updateCompanyPayment, deleteCompanyPayment,
  getCompanyTotalSales, getCompanyTotalPaid,
  getVehiclesByCompany, saveVehicle, updateVehicle, deleteVehicle,
  getCreditAdjustmentsByCompany, saveCreditAdjustment, deleteCreditAdjustment,
  useCloudData, type Bill, type Vehicle, type CompanyPayment,
} from "../lib/store";
import { exportInvoicePDF, exportCompanyStatementPDF } from "../lib/pdf";
import { ArrowLeft, Building2, Truck, Phone, MapPin, Plus, X, FileText, Download, Pencil, Wallet, TrendingUp, BadgeCheck, FileDown, Trash2, Scale } from "lucide-react";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/companies/$id")({
  validateSearch: (s: Record<string, unknown>) => ({ pay: s.pay === 1 || s.pay === "1" ? 1 : undefined }),
  component: CompanyDetailsPage,
});

type Tab = "overview" | "vehicles" | "invoices" | "payments" | "adjustments" | "ledger";

function CompanyDetailsPage() {
  useCloudData();
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const company = getCompanies().find((c) => c.id === id);

  const [tab, setTab] = useState<Tab>("overview");
  const [showPayForm, setShowPayForm] = useState(false);

  useEffect(() => {
    if (search.pay === 1) {
      setShowPayForm(true);
      navigate({ to: "/companies/$id", params: { id }, search: { pay: undefined }, replace: true });
    }
  }, [search.pay, id, navigate]);

  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({
    paymentDate: new Date().toISOString().split("T")[0],
    amount: "",
    paymentMethod: "Cash" as "Cash" | "UPI" | "Bank Transfer" | "Cheque",
    referenceNumber: "",
    notes: "",
  });

  // Vehicle form state
  const [vehForm, setVehForm] = useState<{ id?: string; vehicleNumber: string; vehicleCapacity: string; driverName: string } | null>(null);

  // Adjustment form
  const [adjForm, setAdjForm] = useState<{ amount: string; reason: string; date: string } | null>(null);

  const bills = useMemo(() => getBillsByCompany(id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [id]);
  const payments = useMemo<CompanyPayment[]>(
    () => getCompanyPayments(id).sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()),
    [id],
  );
  const vehicles = useMemo(() => getVehiclesByCompany(id), [id]);
  const adjustments = useMemo(() => getCreditAdjustmentsByCompany(id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [id]);
  const outstanding = getCompanyOutstanding(id);
  const totalSales = getCompanyTotalSales(id);
  const totalPaid = getCompanyTotalPaid(id);
  const lastPayment = payments[0];

  if (!company) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Link to="/companies" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
          <p className="text-sm text-muted-foreground">Company not found.</p>
        </div>
      </AppLayout>
    );
  }

  const resetPayForm = () => {
    setPayForm({
      paymentDate: new Date().toISOString().split("T")[0],
      amount: "", paymentMethod: "Cash", referenceNumber: "", notes: "",
    });
    setEditingPaymentId(null);
    setShowPayForm(false);
  };

  const handleSavePayment = async () => {
    const amt = Number(payForm.amount);
    if (!amt || amt <= 0) { toast.error("Amount must be greater than zero"); return; }
    if (!payForm.paymentDate) { toast.error("Date is required"); return; }
    try {
      if (editingPaymentId) {
        await updateCompanyPayment(editingPaymentId, {
          amount: amt,
          paymentDate: payForm.paymentDate,
          paymentMethod: payForm.paymentMethod,
          referenceNumber: payForm.referenceNumber.trim() || undefined,
          notes: payForm.notes.trim() || undefined,
        });
        toast.success("Payment updated");
      } else {
        await saveCompanyPayment({
          companyId: id,
          amount: amt,
          paymentDate: payForm.paymentDate,
          paymentMethod: payForm.paymentMethod,
          referenceNumber: payForm.referenceNumber.trim() || undefined,
          notes: payForm.notes.trim() || undefined,
        });
        toast.success(`Payment of ₹${amt.toLocaleString()} recorded`);
      }
      resetPayForm();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save payment");
    }
  };

  const handleEditPayment = (p: CompanyPayment) => {
    setEditingPaymentId(p.id);
    setPayForm({
      paymentDate: p.paymentDate,
      amount: String(p.amount),
      paymentMethod: (["Cash", "UPI", "Bank Transfer", "Cheque"].includes(p.paymentMethod || "") ? p.paymentMethod : "Cash") as any,
      referenceNumber: p.referenceNumber || "",
      notes: p.notes || "",
    });
    setShowPayForm(true);
    setTab("payments");
  };

  const handleDeletePayment = async (p: CompanyPayment) => {
    if (!confirm("Delete this payment?\nThis action cannot be undone.")) return;
    try {
      await deleteCompanyPayment(p.id);
      toast.success("Payment deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete payment");
    }
  };

  const handleSaveVehicle = async () => {
    if (!vehForm || !vehForm.vehicleNumber.trim()) { toast.error("Vehicle number required"); return; }
    const data = {
      vehicleNumber: vehForm.vehicleNumber.trim(),
      vehicleCapacity: Number(vehForm.vehicleCapacity) || 0,
      driverName: vehForm.driverName.trim(),
    };
    try {
      if (vehForm.id) { updateVehicle(vehForm.id, data); toast.success("Vehicle updated"); }
      else { await saveVehicle({ ...data, companyId: id, status: "active" }); toast.success("Vehicle added"); }
      setVehForm(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save vehicle");
    }
  };

  const handleDeleteVehicle = async (v: Vehicle) => {
    if (!confirm(`Delete vehicle ${v.vehicleNumber}?`)) return;
    try {
      await deleteVehicle(v.id);
      toast.success("Vehicle deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete vehicle");
    }
  };

  const handleSaveAdjustment = () => {
    if (!adjForm) return;
    const amt = Number(adjForm.amount);
    if (!amt || amt === 0) { toast.error("Enter a non-zero amount"); return; }
    saveCreditAdjustment({ companyId: id, amount: amt, reason: adjForm.reason.trim(), date: adjForm.date });
    toast.success(amt > 0 ? "Debit adjustment added" : "Credit adjustment added");
    setAdjForm(null);
  };

  const handleDeleteAdjustment = (aid: string) => {
    if (!confirm("Delete this adjustment?")) return;
    deleteCreditAdjustment(aid);
    toast.success("Adjustment deleted");
  };

  // Ledger combining all vehicles under this company
  type LedgerRow = { date: string; description: string; debit: number; credit: number; balance: number };
  const ledger: LedgerRow[] = useMemo(() => {
    const events: { ts: number; date: string; description: string; debit: number; credit: number }[] = [];
    const opening = company?.openingBalance || 0;
    if (opening !== 0) {
      events.push({
        ts: new Date(company!.createdAt).getTime(),
        date: company!.createdAt,
        description: "Opening balance / previous outstanding",
        debit: opening > 0 ? opening : 0,
        credit: opening < 0 ? -opening : 0,
      });
    }
    const asc = [...bills].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    asc.forEach((b) => events.push({
      ts: new Date(b.createdAt).getTime(),
      date: b.createdAt,
      description: `Invoice ${b.invoiceNumber || b.id.slice(-6).toUpperCase()}${b.vehicleNumber ? ` · ${b.vehicleNumber}` : ""} — ${b.items.map((it) => it.productName).join(", ") || "Sale"}`,
      debit: b.totalAmount || 0, credit: 0,
    }));
    payments.forEach((p) => events.push({
      ts: new Date(p.paymentDate).getTime(),
      date: p.paymentDate,
      description: `Payment received${p.paymentMethod ? ` [${p.paymentMethod}]` : ""}${p.referenceNumber ? ` (Ref: ${p.referenceNumber})` : ""}${p.notes ? ` — ${p.notes}` : ""}`,
      debit: 0, credit: p.amount || 0,
    }));
    adjustments.forEach((a) => events.push({
      ts: new Date(a.createdAt).getTime(),
      date: a.createdAt,
      description: `Adjustment${a.reason ? ` — ${a.reason}` : ""}`,
      debit: a.amount > 0 ? a.amount : 0,
      credit: a.amount < 0 ? -a.amount : 0,
    }));
    events.sort((a, b) => a.ts - b.ts);
    let bal = 0;
    return events.map((e) => { bal += e.debit - e.credit; return { date: e.date, description: e.description, debit: e.debit, credit: e.credit, balance: bal }; });
  }, [bills, payments, adjustments, company]);

  const billStatus = (b: Bill): { label: string; cls: string } => {
    if ((b.outstandingAmount || 0) <= 0) return { label: "Paid", cls: "bg-success/20 text-success" };
    if ((b.paidAmount || 0) > 0) return { label: "Partial", cls: "bg-warning/20 text-warning" };
    return { label: "Credit", cls: "bg-destructive/20 text-destructive" };
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <Link to="/companies" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to companies</Link>

        {/* Header */}
        <div className="stat-card space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-semibold text-foreground flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> {company.name}</h1>
              {company.contactNumber && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Phone className="h-3 w-3" /> {company.contactNumber}</p>}
              {company.address && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {company.address}</p>}
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Truck className="h-3 w-3" /> {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={`text-xs font-semibold px-2 py-1 rounded ${outstanding <= 0 ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}>
                {outstanding <= 0 ? <span className="inline-flex items-center gap-1"><BadgeCheck className="h-3 w-3" /> Settled</span> : `Due ₹${outstanding.toLocaleString()}`}
              </span>
              <button onClick={() => exportCompanyStatementPDF(company, bills, payments as any, outstanding)} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[11px] text-foreground hover:bg-secondary/70"><FileDown className="h-3 w-3" /> Statement</button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-2">
          <div className="stat-card"><p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Total Sales</p><p className="font-bold text-foreground">₹{totalSales.toLocaleString()}</p></div>
          <div className="stat-card"><p className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="h-3 w-3" /> Total Paid</p><p className="font-bold text-success">₹{totalPaid.toLocaleString()}</p></div>
          <div className="stat-card"><p className="text-xs text-muted-foreground">Outstanding</p><p className="font-bold text-warning">₹{outstanding.toLocaleString()}</p></div>
          <div className="stat-card"><p className="text-xs text-muted-foreground">Invoices</p><p className="font-bold text-foreground">{bills.length}</p></div>
          <div className="stat-card col-span-2"><p className="text-xs text-muted-foreground">Last Payment</p>
            <p className="font-bold text-foreground">{lastPayment ? `₹${lastPayment.amount.toLocaleString()} · ${format(parseISO(lastPayment.paymentDate), "dd MMM yyyy")}` : "—"}</p>
          </div>
        </div>

        {/* Receive payment */}
        <div>
          {!showPayForm ? (
            <button onClick={() => { resetPayForm(); setShowPayForm(true); }} className="w-full flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" /> Receive Payment
            </button>
          ) : (
            <div className="stat-card space-y-3">
              <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-foreground">{editingPaymentId ? "Edit Payment" : "Receive Payment"}</h3><button onClick={resetPayForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="field-label">Date *</label><input type="date" value={payForm.paymentDate} onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                <div><label className="field-label">Amount *</label><input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} placeholder="₹" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              </div>
              <div>
                <label className="field-label">Payment Method</label>
                <div className="grid grid-cols-4 gap-1 rounded-md bg-secondary p-1">
                  {(["Cash", "UPI", "Bank Transfer", "Cheque"] as const).map((m) => (
                    <button key={m} onClick={() => setPayForm({ ...payForm, paymentMethod: m })} className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${payForm.paymentMethod === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{m}</button>
                  ))}
                </div>
              </div>
              <div><label className="field-label">Reference Number</label><input value={payForm.referenceNumber} onChange={(e) => setPayForm({ ...payForm, referenceNumber: e.target.value })} placeholder="UPI ref / cheque no. / txn id" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="field-label">Notes</label><input value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} placeholder="Optional" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <button onClick={handleSavePayment} className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">{editingPaymentId ? "Update" : "Save"} Payment</button>
            </div>
          )}
        </div>


        {/* Tabs */}
        <div className="flex gap-1 rounded-md bg-secondary p-1 overflow-x-auto">
          {(["overview", "vehicles", "invoices", "payments", "adjustments", "ledger"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize whitespace-nowrap transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Recent activity</p>
            {ledger.slice(-8).reverse().map((r, i) => (
              <div key={i} className="stat-card flex items-center justify-between text-sm">
                <div>
                  <p className="text-foreground">{r.description}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(r.date), "dd MMM yyyy")}</p>
                </div>
                <p className={`font-medium ${r.debit > 0 ? "text-warning" : "text-success"}`}>{r.debit > 0 ? `+₹${r.debit.toLocaleString()}` : `-₹${r.credit.toLocaleString()}`}</p>
              </div>
            ))}
            {ledger.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No activity yet.</p>}
          </div>
        )}

        {tab === "vehicles" && (
          <div className="space-y-2">
            {vehForm === null ? (
              <button onClick={() => setVehForm({ vehicleNumber: "", vehicleCapacity: "", driverName: "" })} className="w-full flex items-center justify-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary/70 transition-colors"><Plus className="h-4 w-4" /> Add Vehicle</button>
            ) : (
              <div className="stat-card space-y-2">
                <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-foreground">{vehForm.id ? "Edit" : "New"} Vehicle</h3><button onClick={() => setVehForm(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button></div>
                <input value={vehForm.vehicleNumber} onChange={(e) => setVehForm({ ...vehForm, vehicleNumber: e.target.value })} placeholder="Vehicle Number *" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={vehForm.driverName} onChange={(e) => setVehForm({ ...vehForm, driverName: e.target.value })} placeholder="Driver Name" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  <input type="number" step="0.01" value={vehForm.vehicleCapacity} onChange={(e) => setVehForm({ ...vehForm, vehicleCapacity: e.target.value })} placeholder="Capacity (tons)" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <button onClick={handleSaveVehicle} className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">{vehForm.id ? "Update" : "Save"} Vehicle</button>
              </div>
            )}
            {vehicles.map((v) => (
              <div key={v.id} className="stat-card flex items-start justify-between">
                <div>
                  <p className="font-medium text-foreground flex items-center gap-1.5"><Truck className="h-4 w-4 text-primary" /> {v.vehicleNumber}</p>
                  {v.driverName && <p className="text-xs text-muted-foreground">Driver: {v.driverName}</p>}
                  {v.vehicleCapacity > 0 && <p className="text-xs text-muted-foreground">Capacity: {v.vehicleCapacity} tons</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setVehForm({ id: v.id, vehicleNumber: v.vehicleNumber, vehicleCapacity: String(v.vehicleCapacity), driverName: v.driverName })} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => handleDeleteVehicle(v)} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-secondary"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
            {vehicles.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No vehicles yet.</p>}
          </div>
        )}

        {tab === "invoices" && (
          <div className="space-y-2">
            {bills.map((b) => {
              const st = billStatus(b);
              return (
                <div key={b.id} className="stat-card space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm text-foreground flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-primary" /> <span className="font-mono text-xs tracking-wider">{b.invoiceNumber || b.id.slice(-6).toUpperCase()}</span></p>
                      <p className="text-xs text-muted-foreground">{format(parseISO(b.createdAt), "dd MMM yyyy · HH:mm")}</p>
                      {b.vehicleNumber && <p className="text-xs text-muted-foreground flex items-center gap-1"><Truck className="h-3 w-3" /> {b.vehicleNumber}{b.driverName ? ` · ${b.driverName}` : ""}</p>}
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.items.map((it) => `${it.productName} ×${it.quantity}`).join(", ")}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${st.cls}`}>{st.label}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><p className="text-muted-foreground">Total</p><p className="font-semibold text-foreground">₹{b.totalAmount.toLocaleString()}</p></div>
                    <div><p className="text-muted-foreground">Paid</p><p className="font-semibold text-success">₹{(b.paidAmount || 0).toLocaleString()}</p></div>
                    <div><p className="text-muted-foreground">Due</p><p className="font-semibold text-warning">₹{(b.outstandingAmount || 0).toLocaleString()}</p></div>
                  </div>
                  <div className="flex gap-2 pt-1 border-t border-border">
                    <button onClick={() => exportInvoicePDF(b)} className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-secondary px-2 py-1.5 text-xs text-foreground hover:bg-secondary/70"><Download className="h-3 w-3" /> PDF</button>
                    <button onClick={() => navigate({ to: "/bills" })} className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-secondary px-2 py-1.5 text-xs text-foreground hover:bg-secondary/70"><Pencil className="h-3 w-3" /> Edit</button>
                  </div>
                </div>
              );
            })}
            {bills.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No invoices yet.</p>}
          </div>
        )}

        {tab === "payments" && (
          <div className="space-y-2">
            <div className="stat-card grid grid-cols-12 gap-1 text-[10px] font-medium text-muted-foreground uppercase">
              <span className="col-span-2">Date</span>
              <span className="col-span-2 text-right">Amount</span>
              <span className="col-span-2">Method</span>
              <span className="col-span-2">Reference</span>
              <span className="col-span-2">Notes</span>
              <span className="col-span-2 text-right">Actions</span>
            </div>
            {payments.map((p) => (
              <div key={p.id} className="stat-card grid grid-cols-12 gap-1 items-center text-xs">
                <span className="col-span-2 text-muted-foreground">{format(parseISO(p.paymentDate), "dd MMM yy")}</span>
                <span className="col-span-2 text-right font-medium text-success">₹{p.amount.toLocaleString()}</span>
                <span className="col-span-2 text-foreground">{p.paymentMethod || "—"}</span>
                <span className="col-span-2 text-foreground truncate" title={p.referenceNumber}>{p.referenceNumber || "—"}</span>
                <span className="col-span-2 text-muted-foreground truncate" title={p.notes}>{p.notes || "—"}</span>
                <span className="col-span-2 flex items-center justify-end gap-1">
                  <button onClick={() => handleEditPayment(p)} className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDeletePayment(p)} className="rounded-md p-1 text-muted-foreground hover:text-destructive hover:bg-secondary"><Trash2 className="h-3.5 w-3.5" /></button>
                </span>
              </div>
            ))}
            {payments.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No payments recorded.</p>}
          </div>
        )}


        {tab === "adjustments" && (
          <div className="space-y-2">
            {adjForm === null ? (
              <button onClick={() => setAdjForm({ amount: "", reason: "", date: new Date().toISOString().split("T")[0] })} className="w-full flex items-center justify-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary/70 transition-colors"><Plus className="h-4 w-4" /> Add Adjustment</button>
            ) : (
              <div className="stat-card space-y-2">
                <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Scale className="h-4 w-4 text-primary" /> New Adjustment</h3><button onClick={() => setAdjForm(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="field-label">Date</label><input type="date" value={adjForm.date} onChange={(e) => setAdjForm({ ...adjForm, date: e.target.value })} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  <div><label className="field-label">Amount (₹) *</label><input type="number" value={adjForm.amount} onChange={(e) => setAdjForm({ ...adjForm, amount: e.target.value })} placeholder="+ debit / - credit" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                </div>
                <div><label className="field-label">Reason</label><input value={adjForm.reason} onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })} placeholder="e.g. Discount, write-off, prior due" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                <p className="text-[11px] text-muted-foreground">Positive amount increases outstanding (debit); negative reduces it (credit).</p>
                <button onClick={handleSaveAdjustment} className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Save Adjustment</button>
              </div>
            )}
            {adjustments.map((a) => (
              <div key={a.id} className="stat-card flex items-start justify-between text-sm">
                <div>
                  <p className="text-foreground">{a.reason || "Adjustment"}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(a.date), "dd MMM yyyy")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${a.amount > 0 ? "text-warning" : "text-success"}`}>{a.amount > 0 ? "+" : ""}₹{a.amount.toLocaleString()}</span>
                  <button onClick={() => handleDeleteAdjustment(a.id)} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-secondary"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
            {adjustments.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No adjustments recorded.</p>}
          </div>
        )}

        {tab === "ledger" && (
          <div className="space-y-2">
            <div className="stat-card grid grid-cols-12 gap-1 text-[10px] font-medium text-muted-foreground uppercase">
              <span className="col-span-2">Date</span>
              <span className="col-span-5">Description</span>
              <span className="col-span-2 text-right">Debit</span>
              <span className="col-span-1 text-right">Credit</span>
              <span className="col-span-2 text-right">Balance</span>
            </div>
            {ledger.map((r, i) => (
              <div key={i} className="stat-card grid grid-cols-12 gap-1 items-center text-xs">
                <span className="col-span-2 text-muted-foreground">{format(parseISO(r.date), "dd MMM yy")}</span>
                <span className="col-span-5 text-foreground truncate" title={r.description}>{r.description}</span>
                <span className="col-span-2 text-right text-warning">{r.debit > 0 ? `₹${r.debit.toLocaleString()}` : "—"}</span>
                <span className="col-span-1 text-right text-success">{r.credit > 0 ? `₹${r.credit.toLocaleString()}` : "—"}</span>
                <span className="col-span-2 text-right font-semibold text-foreground">₹{r.balance.toLocaleString()}</span>
              </div>
            ))}
            {ledger.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No ledger entries.</p>}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
