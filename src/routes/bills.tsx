import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState, useMemo, useEffect } from "react";
import {
  getBills, updateBill, deleteBill, savePayment, getPaymentsByBill,
  getProducts, getExpensesByBill, saveExpense, deleteExpense,
  getBillRefDate, getUserNameCached, prefetchUserNames, getAllowBackdatedBills,
  type Bill, type BillItem,
} from "../lib/store";
import { useUserRoles } from "@/hooks/use-roles";
import { Search, Banknote, CreditCard, FileDown, Truck, AlertTriangle, X, Pencil, Check, Trash2, Eye, Plus, Minus, Coins, CheckSquare, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { exportInvoicePDF } from "../lib/pdf";


export const Route = createFileRoute("/bills")({
  component: BillsPage,
});

const TIPS_OPTIONS = [
  { label: "No Tips", value: 0 },
  { label: "₹50 per Unit", value: 50 },
  { label: "₹100 per Unit", value: 100 },
];

interface EditForm {
  items: BillItem[];
  companyName: string;
  driverName: string;
  vehicleNumber: string;
  vehicleCapacity: number;
  tipsRate: number;
  paymentMode: "cash" | "upi" | "credit" | "split";
  paidAmount: number;
  splitEnabled: boolean;
  cashAmount: number;
  upiAmount: number;
  passEnabled: boolean;
  passAmount: number;
  billDate: string;
}


const DEFAULT_PASS_AMOUNT = 1600;

function BillsPage() {
  const products = getProducts();
  const { isAdmin, isStaff } = useUserRoles();
  const canBackdate = (isAdmin || isStaff) && getAllowBackdatedBills();
  const today = new Date().toISOString().slice(0, 10);

  type SortKey = "billDate" | "createdAt";
  type DateType = "billDate" | "createdAt";
  const [sortKey, setSortKey] = useState<SortKey>("billDate");
  const [dateType, setDateType] = useState<DateType>("billDate");

  const sortBills = (rows: Bill[]) =>
    [...rows].sort((a, b) => {
      const av = sortKey === "billDate" ? new Date(getBillRefDate(a)).getTime() : new Date(a.createdAt).getTime();
      const bv = sortKey === "billDate" ? new Date(getBillRefDate(b)).getTime() : new Date(b.createdAt).getTime();
      return bv - av;
    });

  const [bills, setBills] = useState<Bill[]>(() => sortBills(getBills()));
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [backdatedOnly, setBackdatedOnly] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [editBill, setEditBill] = useState<Bill | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [payBillId, setPayBillId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const refresh = () => setBills(sortBills(getBills()));

  useEffect(() => { setBills((rows) => sortBills(rows)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sortKey]);

  useEffect(() => {
    const ids = Array.from(new Set(bills.map((b) => b.createdBy).filter(Boolean) as string[]));
    if (ids.length > 0) prefetchUserNames(ids);
  }, [bills]);

  // Pre-applied filter from dashboard link (?backdated=1)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("backdated") === "1") setBackdatedOnly(true);
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());

  const filtered = useMemo(() => bills.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (b.companyName || "").toLowerCase().includes(q) ||
      (b.invoiceNumber || "").toLowerCase().includes(q) ||
      b.id.includes(search) ||
      (b.vehicleNumber || "").toLowerCase().includes(q) ||
      (b.driverName || "").toLowerCase().includes(q);
    const matchDate = !dateFilter || (dateType === "billDate"
      ? getBillRefDate(b).startsWith(dateFilter)
      : b.createdAt.startsWith(dateFilter));
    const matchBack = !backdatedOnly || (b.billDate && b.createdAt && b.billDate < b.createdAt.slice(0, 10));
    return matchSearch && matchDate && matchBack;

  }), [bills, search, dateFilter]);

  const handlePayment = (billId: string, companyId?: string) => {
    if (!payAmount.trim() || Number(payAmount) <= 0) return;
    savePayment({ billId, companyId: companyId || "", amount: Number(payAmount), date: new Date().toISOString().split("T")[0], notes: "Payment" });
    refresh(); setPayBillId(null); setPayAmount("");
  };

  const openEdit = (b: Bill) => {
    setEditBill(b);
    setEditForm({
      items: b.items.map((i) => ({ ...i })),
      companyName: b.companyName, driverName: b.driverName,
      vehicleNumber: b.vehicleNumber, vehicleCapacity: b.vehicleCapacity,
      tipsRate: b.tipsRate || 0, paymentMode: b.paymentMode,
      paidAmount: b.paidAmount,
      splitEnabled: b.splitPayment ?? (b.paymentMode === "split"),
      cashAmount: b.cashAmount ?? 0,
      upiAmount: b.upiAmount ?? 0,
      passEnabled: !!b.passEnabled,
      passAmount: b.passAmount ?? DEFAULT_PASS_AMOUNT,
      billDate: getBillRefDate(b),
    });
  };


  const editSubtotal = editForm ? editForm.items.reduce((s, i) => s + i.total, 0) : 0;
  const editTotalQty = editForm ? editForm.items.reduce((s, i) => s + i.quantity, 0) : 0;
  const editTipsBase = editForm ? (editForm.vehicleCapacity > 0 ? editForm.vehicleCapacity : editTotalQty) : 0;
  const editTipsAmount = editForm ? editForm.tipsRate * editTipsBase : 0;
  const editPassAmount = editForm && editForm.passEnabled ? (Number(editForm.passAmount) || 0) : 0;
  const editGrandTotal = editSubtotal + editTipsAmount + editPassAmount;
  const editPaid = editForm
    ? (editForm.splitEnabled
        ? Math.min(editGrandTotal, editForm.cashAmount + editForm.upiAmount)
        : (editForm.paymentMode === "credit" ? editForm.paidAmount : editGrandTotal))
    : 0;
  const editOutstanding = Math.max(0, editGrandTotal - editPaid);

  const updateEditQty = (productId: string, qty: number) => {
    if (!editForm) return;
    if (qty <= 0) {
      setEditForm({ ...editForm, items: editForm.items.filter((i) => i.productId !== productId) });
      return;
    }
    setEditForm({
      ...editForm,
      items: editForm.items.map((i) => i.productId === productId ? { ...i, quantity: qty, total: qty * i.price } : i),
    });
  };

  const addEditProduct = (productId: string) => {
    if (!editForm) return;
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    if (editForm.items.find((i) => i.productId === productId)) return;
    const qty = editForm.vehicleCapacity > 0 ? editForm.vehicleCapacity : 1;
    setEditForm({
      ...editForm,
      items: [...editForm.items, {
        productId, productName: p.name, price: p.price,
        quantity: qty, total: p.price * qty, tipsRate: 0, tipsAmount: 0,
      }],
    });
  };

  const saveEdit = () => {
    if (!editBill || !editForm) return;
    if (editForm.billDate > today) { alert("Bill Date cannot be in the future"); return; }
    if (!canBackdate && editForm.billDate !== getBillRefDate(editBill)) {
      alert("You are not allowed to change Bill Date"); return;
    }
    const mode: "cash" | "upi" | "credit" | "split" = editForm.splitEnabled ? "split" : editForm.paymentMode;
    const paid = editPaid;
    const outstanding = Math.max(0, editGrandTotal - paid);
    const cashAmt = editForm.splitEnabled ? editForm.cashAmount : (editForm.paymentMode === "cash" ? paid : 0);
    const upiAmt = editForm.splitEnabled ? editForm.upiAmount : (editForm.paymentMode === "upi" ? paid : 0);

    updateBill(editBill.id, {
      items: editForm.items,
      totalAmount: editGrandTotal,
      companyName: editForm.companyName,
      driverName: editForm.driverName,
      vehicleNumber: editForm.vehicleNumber,
      vehicleCapacity: editForm.vehicleCapacity,
      tipsRate: editForm.tipsRate,
      tipsAmount: editTipsAmount,
      paymentMode: mode,
      paidAmount: paid,
      outstandingAmount: outstanding,
      splitPayment: editForm.splitEnabled,
      cashAmount: cashAmt,
      upiAmount: upiAmt,
      passEnabled: editForm.passEnabled,
      passAmount: editPassAmount,
      billDate: editForm.billDate,
    });

    // Replace tips expense
    getExpensesByBill(editBill.id).filter((e) => e.category === "tips").forEach((e) => deleteExpense(e.id));
    if (editTipsAmount > 0) {
      saveExpense({
        category: "tips", amount: editTipsAmount,
        date: editForm.billDate,
        notes: `Tips ₹${editForm.tipsRate}/unit × ${editTipsBase} — ${editForm.companyName || editForm.vehicleNumber || "Walk-in"} — Bill #${editBill.id}`,
        paymentMode: "cash",
        linkedBillId: editBill.id, linkedCompanyId: editBill.companyId,
      });
    }

    setEditBill(null); setEditForm(null); refresh();
  };


  const confirmDelete = () => {
    if (!deleteId) return;
    deleteBill(deleteId);
    setDeleteId(null); refresh();
  };


  const allVisibleSelected = filtered.length > 0 && filtered.every((b) => selected.has(b.id));
  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((b) => next.delete(b.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((b) => next.add(b.id));
        return next;
      });
    }
  };

  const selectedBills = useMemo(() => bills.filter((b) => selected.has(b.id)), [bills, selected]);
  const creditCount = selectedBills.filter((b) => b.outstandingAmount > 0).length;

  const performBulkDelete = () => {
    const ids = Array.from(selected);
    const invoiceNumbers = selectedBills.map((b) => b.invoiceNumber || b.id.slice(-6).toUpperCase());
    ids.forEach((id) => deleteBill(id));
    try {
      console.info(`[AUDIT] Bulk delete ${ids.length} invoices @ ${new Date().toISOString()}:`, invoiceNumbers);
    } catch { /* noop */ }
    clearSelection();
    setBulkConfirm(false);
    refresh();
  };

  const exportSelectedPDFs = async () => {
    for (const b of selectedBills) {
      // eslint-disable-next-line no-await-in-loop
      await exportInvoicePDF(b);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4 pb-24">
        <h1 className="module-header">Bill History</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice #, company, vehicle..." className="w-full rounded-md border border-input bg-secondary pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs">
          <span className="font-medium text-muted-foreground">Date Type:</span>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="radio" checked={dateType === "billDate"} onChange={() => setDateType("billDate")} /> Bill Date
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="radio" checked={dateType === "createdAt"} onChange={() => setDateType("createdAt")} /> Created Date
          </label>
          <span className="ml-3 font-medium text-muted-foreground">Sort:</span>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="rounded border border-input bg-secondary px-2 py-1 text-xs">
            <option value="billDate">Bill Date</option>
            <option value="createdAt">Created On</option>
          </select>
          <label className="ml-auto flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={backdatedOnly} onChange={(e) => setBackdatedOnly(e.target.checked)} />
            Backdated only
          </label>
        </div>


        {filtered.length > 0 && (
          <div className="flex items-center justify-between rounded-md border border-border bg-secondary/40 px-3 py-2">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
              <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} className="h-4 w-4 rounded border-border accent-primary" />
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
              Select All ({filtered.length})
            </label>
            <span className="text-xs text-muted-foreground">Selected: <span className="font-semibold text-foreground">{selected.size}</span></span>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((bill) => {
            const isSel = selected.has(bill.id);
            return (
            <div key={bill.id} className={`stat-card transition-colors ${isSel ? "border-primary bg-primary/5" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 flex items-start gap-2">
                  <input type="checkbox" checked={isSel} onChange={() => toggleSelect(bill.id)} className="mt-1 h-4 w-4 rounded border-border accent-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-mono font-semibold text-primary tracking-wider">INV {bill.invoiceNumber || bill.id.slice(-6).toUpperCase()}</p>
                  <p className="font-medium text-foreground truncate">{bill.companyName || "Walk-in"}</p>
                  {bill.vehicleNumber && <p className="text-xs text-muted-foreground flex items-center gap-1"><Truck className="h-3 w-3" /> {bill.vehicleNumber} {bill.vehicleCapacity > 0 && `(${bill.vehicleCapacity}t)`}</p>}
                  {bill.driverName && <p className="text-xs text-muted-foreground">Driver: {bill.driverName}</p>}
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Bill: {format(parseISO(getBillRefDate(bill) + "T00:00:00"), "dd MMM yyyy")}{bill.billDate && bill.createdAt && bill.billDate < bill.createdAt.slice(0,10) && <span className="ml-1 rounded bg-warning/15 text-warning px-1 py-0.5 text-[10px] font-semibold">BACKDATED</span>}</p>
                  <p className="text-[10px] text-muted-foreground/80">Created {format(parseISO(bill.createdAt), "dd MMM yyyy, hh:mm a")}{bill.createdBy ? ` · ${getUserNameCached(bill.createdBy)}` : ""}</p>
                  {bill.updatedAt && <p className="text-[10px] text-muted-foreground/80">Updated {format(parseISO(bill.updatedAt), "dd MMM yyyy, hh:mm a")}{bill.updatedBy ? ` · ${getUserNameCached(bill.updatedBy)}` : ""}</p>}

                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">₹{bill.totalAmount.toLocaleString()}</p>
                  <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    {bill.paymentMode === "cash" ? <Banknote className="h-3 w-3" /> : bill.paymentMode === "credit" ? <AlertTriangle className="h-3 w-3 text-warning" /> : <CreditCard className="h-3 w-3" />}
                    {bill.paymentMode.toUpperCase()}
                  </div>
                  {bill.outstandingAmount > 0 && <p className="text-xs font-semibold text-warning">Due: ₹{bill.outstandingAmount.toLocaleString()}</p>}
                  {bill.tipsAmount > 0 && <p className="text-xs text-warning">Tips: ₹{bill.tipsAmount.toLocaleString()}</p>}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button onClick={() => setViewId(viewId === bill.id ? null : bill.id)} className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs text-foreground hover:bg-secondary/80"><Eye className="h-3 w-3" /> View</button>
                <button onClick={() => openEdit(bill)} className="flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-1 text-xs text-primary hover:bg-primary/20"><Pencil className="h-3 w-3" /> Edit</button>
                <button onClick={() => setDeleteId(bill.id)} className="flex items-center gap-1 rounded-md bg-destructive/10 border border-destructive/20 px-2 py-1 text-xs text-destructive hover:bg-destructive/20"><Trash2 className="h-3 w-3" /> Delete</button>
                <button onClick={() => exportInvoicePDF(bill)} className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs text-foreground hover:bg-secondary/80"><FileDown className="h-3 w-3" /> PDF</button>
              </div>

              {viewId === bill.id && (() => {
                const subtotal = bill.items.reduce((s, i) => s + i.total, 0);
                const totalQty = bill.items.reduce((s, i) => s + i.quantity, 0);
                const tipsBase = bill.vehicleCapacity > 0 ? bill.vehicleCapacity : totalQty;
                const tipsLabel = !bill.tipsRate ? "No Tips" : `₹${bill.tipsRate} per Unit`;
                return (
                <div className="mt-3 border-t border-border pt-3 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Product Details</p>
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-1 text-xs">
                      <span className="font-medium text-muted-foreground">Product</span>
                      <span className="text-muted-foreground text-center">Qty</span>
                      <span className="text-muted-foreground text-right">Rate</span>
                      <span className="text-muted-foreground text-right">Total</span>
                      {bill.items.map((item, i) => (
                        <div key={i} className="contents">
                          <span className="text-foreground">{item.productName}</span>
                          <span className="text-foreground text-center">{item.quantity}</span>
                          <span className="text-foreground text-right">₹{item.price.toLocaleString()}</span>
                          <span className="text-foreground text-right font-medium">₹{item.total.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-md bg-secondary/50 border border-border p-2.5 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">₹{subtotal.toLocaleString()}</span></div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tips <span className="ml-1 inline-block rounded bg-warning/20 text-warning px-1.5 py-0.5 text-[10px] font-semibold">{tipsLabel}</span></span>
                      <span className="text-warning">₹{bill.tipsAmount.toLocaleString()}</span>
                    </div>
                    {bill.tipsRate > 0 && <div className="flex justify-between text-[11px] text-muted-foreground"><span>↳ ₹{bill.tipsRate} × {tipsBase} units</span><span /></div>}
                    {bill.passEnabled && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Pass</span><span className="text-primary">₹{(bill.passAmount || 0).toLocaleString()}</span></div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-border"><span className="font-semibold text-foreground">Grand Total</span><span className="font-bold text-primary">₹{bill.totalAmount.toLocaleString()}</span></div>
                  </div>

                  <div className="rounded-md bg-secondary/30 border border-border p-2.5 space-y-1 text-sm">
                    {bill.splitPayment && (
                      <>
                        <div className="flex justify-between text-xs"><span className="text-muted-foreground flex items-center gap-1"><Banknote className="h-3 w-3 text-success" /> Cash</span><span className="text-success">₹{(bill.cashAmount || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-muted-foreground flex items-center gap-1"><CreditCard className="h-3 w-3 text-primary" /> UPI</span><span className="text-primary">₹{(bill.upiAmount || 0).toLocaleString()}</span></div>
                        <div className="border-t border-border/50" />
                      </>
                    )}
                    <div className="flex justify-between"><span className="text-muted-foreground">Paid Amount</span><span className="text-success font-medium">₹{bill.paidAmount.toLocaleString()}</span></div>
                    {bill.outstandingAmount > 0
                      ? <div className="flex justify-between"><span className="text-muted-foreground">Outstanding Balance</span><span className="text-warning font-bold">₹{bill.outstandingAmount.toLocaleString()}</span></div>
                      : <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-success font-bold">PAID IN FULL</span></div>}
                    {bill.splitPayment && bill.outstandingAmount > 0 && <p className="text-xs text-warning text-center">PARTIALLY PAID (Split)</p>}
                  </div>

                  {bill.paymentMode === "credit" && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Payment History</p>
                      <p className="text-xs text-foreground">Initial: ₹{bill.paidAmount.toLocaleString()}</p>
                      {getPaymentsByBill(bill.id).map((p) => (
                        <p key={p.id} className="text-xs text-success">+₹{p.amount.toLocaleString()} on {p.date}</p>
                      ))}
                      {bill.outstandingAmount > 0 && (
                        payBillId === bill.id ? (
                          <div className="flex items-center gap-1 mt-1">
                            <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="₹" className="w-24 rounded border border-input bg-secondary px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                            <button onClick={() => handlePayment(bill.id, bill.companyId)} className="rounded bg-success px-2 py-1 text-xs text-success-foreground">Pay</button>
                            <button onClick={() => setPayBillId(null)} className="text-muted-foreground"><X className="h-3 w-3" /></button>
                          </div>
                        ) : (
                          <button onClick={() => { setPayBillId(bill.id); setPayAmount(""); }} className="mt-1 rounded bg-warning/10 border border-warning/20 px-2 py-1 text-xs text-warning hover:bg-warning/20">Add Payment</button>
                        )
                      )}
                    </div>
                  )}
                </div>
                );
              })()}
            </div>
          );
          })}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No bills found.</p>}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-3 sm:bottom-4">
          <div className="mx-auto max-w-2xl rounded-lg border border-primary/40 bg-card shadow-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-sm font-medium text-foreground">
              Selected: <span className="text-primary font-bold">{selected.size}</span> Bill{selected.size === 1 ? "" : "s"}
              {creditCount > 0 && <span className="ml-2 text-xs text-warning">({creditCount} with outstanding)</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={exportSelectedPDFs} className="flex-1 sm:flex-none flex items-center justify-center gap-1 rounded-md bg-secondary px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary/80"><FileDown className="h-3.5 w-3.5" /> Export PDFs</button>
              <button onClick={() => setBulkConfirm(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-1 rounded-md bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90"><Trash2 className="h-3.5 w-3.5" /> Delete Selected</button>
              <button onClick={clearSelection} className="rounded-md bg-secondary px-3 py-2 text-xs text-foreground hover:bg-secondary/80">Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirm */}
      {bulkConfirm && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-sm w-full p-4 space-y-3">
            <h3 className="font-semibold text-foreground">Delete Selected Bills?</h3>
            <p className="text-sm text-muted-foreground">You are about to delete <span className="font-bold text-foreground">{selected.size} bill{selected.size === 1 ? "" : "s"}</span>. This action cannot be undone.</p>
            {creditCount > 0 && (
              <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                {creditCount} selected bill{creditCount === 1 ? "" : "s"} contain outstanding balances. Deleting will reduce receivables.
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setBulkConfirm(false)} className="flex-1 rounded-md bg-secondary px-3 py-2 text-sm text-foreground">Cancel</button>
              <button onClick={performBulkDelete} className="flex-1 rounded-md bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground">Delete Bills</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editBill && editForm && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-lg w-full max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Edit Invoice {editBill.invoiceNumber || `#${editBill.id.slice(-6)}`}</h2>
              <button onClick={() => { setEditBill(null); setEditForm(null); }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-4">
              {/* Company details */}
              <div className="space-y-2">
                <label className="field-label">Company Details</label>
                <div className="grid grid-cols-2 gap-2">
                  <input value={editForm.companyName} onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })} placeholder="Company" className="rounded border border-input bg-secondary px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                  <input value={editForm.driverName} onChange={(e) => setEditForm({ ...editForm, driverName: e.target.value })} placeholder="Driver" className="rounded border border-input bg-secondary px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                  <input value={editForm.vehicleNumber} onChange={(e) => setEditForm({ ...editForm, vehicleNumber: e.target.value })} placeholder="Vehicle" className="rounded border border-input bg-secondary px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                  <input type="number" value={editForm.vehicleCapacity || ""} onChange={(e) => setEditForm({ ...editForm, vehicleCapacity: Number(e.target.value) || 0 })} placeholder="Capacity" className="rounded border border-input bg-secondary px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <label className="field-label">Products</label>
                {editForm.items.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between border-b border-border/50 pb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">₹{item.price} × {item.quantity} = ₹{item.total.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateEditQty(item.productId, item.quantity - 1)} className="rounded bg-secondary p-1"><Minus className="h-3 w-3" /></button>
                      <input type="number" value={item.quantity} onChange={(e) => updateEditQty(item.productId, Number(e.target.value) || 0)} className="w-12 text-center rounded border border-input bg-secondary px-1 py-0.5 text-xs" />
                      <button onClick={() => updateEditQty(item.productId, item.quantity + 1)} className="rounded bg-secondary p-1"><Plus className="h-3 w-3" /></button>
                    </div>
                  </div>
                ))}
                <select onChange={(e) => { if (e.target.value) { addEditProduct(e.target.value); e.target.value = ""; } }} className="w-full rounded border border-input bg-secondary px-2 py-1.5 text-xs text-foreground">
                  <option value="">+ Add Product...</option>
                  {products.filter((p) => !editForm.items.find((i) => i.productId === p.id)).map((p) => <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>)}
                </select>
              </div>

              {/* Tips */}
              <div className="space-y-2">
                <label className="field-label flex items-center gap-1.5"><Coins className="h-3.5 w-3.5 text-warning" /> Tips</label>
                <select value={editForm.tipsRate} onChange={(e) => setEditForm({ ...editForm, tipsRate: Number(e.target.value) })} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  {TIPS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {editTipsAmount > 0 && (
                  <div className="rounded-md bg-warning/10 border border-warning/20 px-3 py-2 flex justify-between text-sm">
                    <span className="text-warning">₹{editForm.tipsRate} × {editTipsBase}</span>
                    <span className="text-warning font-bold">₹{editTipsAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Payment */}
              <div className="space-y-2">
                <label className="field-label">Payment Mode</label>
                <div className={editForm.splitEnabled ? "opacity-50 pointer-events-none" : ""}>
                  <div className="flex gap-2">
                    {(["cash", "upi", "credit"] as const).map((m) => (
                      <button key={m} onClick={() => setEditForm({ ...editForm, paymentMode: m })} className={`flex-1 rounded-md border px-2 py-2 text-xs font-medium ${editForm.paymentMode === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{m.toUpperCase()}</button>
                    ))}
                  </div>
                  {editForm.paymentMode === "credit" && !editForm.splitEnabled && (
                    <input type="number" value={editForm.paidAmount || ""} onChange={(e) => setEditForm({ ...editForm, paidAmount: Number(e.target.value) || 0 })} placeholder="Paid Amount" className="mt-2 w-full rounded border border-input bg-secondary px-3 py-2 text-sm text-foreground" />
                  )}
                </div>
                <button onClick={() => setEditForm({ ...editForm, splitEnabled: !editForm.splitEnabled })} className={`w-full text-xs rounded-md border px-3 py-2 font-medium ${editForm.splitEnabled ? "border-primary bg-primary/10 text-primary" : "border-dashed border-border text-muted-foreground"}`}>
                  {editForm.splitEnabled ? "✓ Split Payment Enabled" : "+ Enable Split Payment"}
                </button>
                {editForm.splitEnabled && (
                  <div className="rounded-md border border-primary/30 bg-secondary/30 p-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground flex items-center gap-1"><Banknote className="h-3 w-3 text-success" /> Cash</label>
                        <input type="number" value={editForm.cashAmount || ""} onChange={(e) => setEditForm({ ...editForm, cashAmount: Number(e.target.value) || 0 })} placeholder="0" className="w-full rounded border border-input bg-secondary px-2 py-1.5 text-sm text-foreground" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground flex items-center gap-1"><CreditCard className="h-3 w-3 text-primary" /> UPI</label>
                        <input type="number" value={editForm.upiAmount || ""} onChange={(e) => setEditForm({ ...editForm, upiAmount: Number(e.target.value) || 0 })} placeholder="0" className="w-full rounded border border-input bg-secondary px-2 py-1.5 text-sm text-foreground" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Pass */}
              <div className="space-y-2">
                <button onClick={() => setEditForm({ ...editForm, passEnabled: !editForm.passEnabled, passAmount: editForm.passAmount || DEFAULT_PASS_AMOUNT })} className={`w-full text-xs rounded-md border px-3 py-2 font-medium ${editForm.passEnabled ? "border-primary bg-primary/10 text-primary" : "border-dashed border-border text-muted-foreground"}`}>
                  {editForm.passEnabled ? `✓ Pass Added (₹${(Number(editForm.passAmount) || 0).toLocaleString()})` : "+ Add Pass (₹1600)"}
                </button>
                {editForm.passEnabled && (
                  <div className="rounded-md border border-primary/30 bg-secondary/30 p-2">
                    <label className="text-xs text-muted-foreground">Pass Amount (₹)</label>
                    <input type="number" value={editForm.passAmount || ""} onChange={(e) => setEditForm({ ...editForm, passAmount: Number(e.target.value) || 0 })} placeholder="0" className="w-full rounded border border-input bg-secondary px-2 py-1.5 text-sm text-foreground" />
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="rounded-md border border-border bg-secondary/50 p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">₹{editSubtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tips ({editForm.tipsRate ? `₹${editForm.tipsRate}/unit × ${editTipsBase}` : "No Tips"})</span><span className="text-warning">₹{editTipsAmount.toLocaleString()}</span></div>
                {editForm.passEnabled && <div className="flex justify-between"><span className="text-muted-foreground">Pass</span><span className="text-primary">₹{editPassAmount.toLocaleString()}</span></div>}
                <div className="flex justify-between pt-1 border-t border-border"><span className="font-semibold text-foreground">Grand Total</span><span className="font-bold text-primary">₹{editGrandTotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="text-success">₹{editPaid.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Outstanding</span><span className={`font-bold ${editOutstanding > 0 ? "text-warning" : "text-success"}`}>₹{editOutstanding.toLocaleString()}</span></div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => { setEditBill(null); setEditForm(null); }} className="flex-1 rounded-md bg-secondary px-3 py-2 text-sm text-foreground">Cancel</button>
                <button onClick={saveEdit} className="flex-1 flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><Check className="h-4 w-4" /> Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-sm w-full p-4 space-y-3">
            <h3 className="font-semibold text-foreground">Delete this bill?</h3>
            <p className="text-sm text-muted-foreground">This will remove the invoice, linked tips expense, and payment history. This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className="flex-1 rounded-md bg-secondary px-3 py-2 text-sm text-foreground">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 rounded-md bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground">Delete</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
