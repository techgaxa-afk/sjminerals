import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState, useMemo } from "react";
import {
  getBills, updateBill, deleteBill, savePayment, getPaymentsByBill,
  getProducts, getExpensesByBill, saveExpense, deleteExpense,
  type Bill, type BillItem,
} from "../lib/store";
import { Search, Banknote, CreditCard, FileDown, Truck, AlertTriangle, X, Pencil, Check, Trash2, Eye, Plus, Minus, Coins } from "lucide-react";
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
  paymentMode: "cash" | "upi" | "credit";
  paidAmount: number;
}

function BillsPage() {
  const products = getProducts();
  const [bills, setBills] = useState(() => getBills().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);
  const [editBill, setEditBill] = useState<Bill | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [payBillId, setPayBillId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");

  const refresh = () => setBills(getBills().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

  const filtered = useMemo(() => bills.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (b.companyName || "").toLowerCase().includes(q) ||
      b.id.includes(search) ||
      (b.vehicleNumber || "").toLowerCase().includes(q) ||
      (b.driverName || "").toLowerCase().includes(q);
    const matchDate = !dateFilter || b.createdAt.startsWith(dateFilter);
    return matchSearch && matchDate;
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
    });
  };

  const editSubtotal = editForm ? editForm.items.reduce((s, i) => s + i.total, 0) : 0;
  const editTotalQty = editForm ? editForm.items.reduce((s, i) => s + i.quantity, 0) : 0;
  const editTipsBase = editForm ? (editForm.vehicleCapacity > 0 ? editForm.vehicleCapacity : editTotalQty) : 0;
  const editTipsAmount = editForm ? editForm.tipsRate * editTipsBase : 0;
  const editGrandTotal = editSubtotal + editTipsAmount;
  const editOutstanding = editForm ? Math.max(0, editGrandTotal - (editForm.paymentMode === "credit" ? editForm.paidAmount : editGrandTotal)) : 0;

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
    const paid = editForm.paymentMode === "credit" ? editForm.paidAmount : editGrandTotal;
    const outstanding = Math.max(0, editGrandTotal - paid);

    updateBill(editBill.id, {
      items: editForm.items,
      totalAmount: editGrandTotal,
      companyName: editForm.companyName,
      driverName: editForm.driverName,
      vehicleNumber: editForm.vehicleNumber,
      vehicleCapacity: editForm.vehicleCapacity,
      tipsRate: editForm.tipsRate,
      tipsAmount: editTipsAmount,
      paymentMode: editForm.paymentMode,
      paidAmount: paid,
      outstandingAmount: outstanding,
    });

    // Replace tips expense
    getExpensesByBill(editBill.id).filter((e) => e.category === "tips").forEach((e) => deleteExpense(e.id));
    if (editTipsAmount > 0) {
      saveExpense({
        category: "tips", amount: editTipsAmount,
        date: new Date().toISOString().split("T")[0],
        notes: `Tips ₹${editForm.tipsRate}/unit × ${editTipsBase} — ${editForm.companyName || editForm.vehicleNumber || "Walk-in"} — Bill #${editBill.id}`,
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

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="module-header">Bill History</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, driver, vehicle..." className="w-full rounded-md border border-input bg-secondary pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <div className="space-y-2">
          {filtered.map((bill) => (
            <div key={bill.id} className="stat-card">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{bill.companyName || "Walk-in"}</p>
                  {bill.vehicleNumber && <p className="text-xs text-muted-foreground flex items-center gap-1"><Truck className="h-3 w-3" /> {bill.vehicleNumber} {bill.vehicleCapacity > 0 && `(${bill.vehicleCapacity}t)`}</p>}
                  {bill.driverName && <p className="text-xs text-muted-foreground">Driver: {bill.driverName}</p>}
                  <p className="text-xs text-muted-foreground">{format(parseISO(bill.createdAt), "dd MMM yyyy, hh:mm a")}</p>
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
                    <div className="flex justify-between pt-1 border-t border-border"><span className="font-semibold text-foreground">Grand Total</span><span className="font-bold text-primary">₹{bill.totalAmount.toLocaleString()}</span></div>
                  </div>

                  <div className="rounded-md bg-secondary/30 border border-border p-2.5 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Paid Amount</span><span className="text-success font-medium">₹{bill.paidAmount.toLocaleString()}</span></div>
                    {bill.outstandingAmount > 0
                      ? <div className="flex justify-between"><span className="text-muted-foreground">Outstanding Balance</span><span className="text-warning font-bold">₹{bill.outstandingAmount.toLocaleString()}</span></div>
                      : <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-success font-bold">PAID IN FULL</span></div>}
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
          ))}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No bills found.</p>}
        </div>
      </div>

      {/* Edit Modal */}
      {editBill && editForm && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-lg w-full max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Edit Bill #{editBill.id.slice(-6)}</h2>
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
                <div className="flex gap-2">
                  {(["cash", "upi", "credit"] as const).map((m) => (
                    <button key={m} onClick={() => setEditForm({ ...editForm, paymentMode: m })} className={`flex-1 rounded-md border px-2 py-2 text-xs font-medium ${editForm.paymentMode === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{m.toUpperCase()}</button>
                  ))}
                </div>
                {editForm.paymentMode === "credit" && (
                  <input type="number" value={editForm.paidAmount || ""} onChange={(e) => setEditForm({ ...editForm, paidAmount: Number(e.target.value) || 0 })} placeholder="Paid Amount" className="w-full rounded border border-input bg-secondary px-3 py-2 text-sm text-foreground" />
                )}
              </div>

              {/* Summary */}
              <div className="rounded-md border border-border bg-secondary/50 p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">₹{editSubtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tips ({editForm.tipsRate ? `₹${editForm.tipsRate}/unit × ${editTipsBase}` : "No Tips"})</span><span className="text-warning">₹{editTipsAmount.toLocaleString()}</span></div>
                <div className="flex justify-between pt-1 border-t border-border"><span className="font-semibold text-foreground">Grand Total</span><span className="font-bold text-primary">₹{editGrandTotal.toLocaleString()}</span></div>
                {editForm.paymentMode === "credit" && <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="text-success">₹{(editForm.paidAmount || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Outstanding</span><span className="font-bold text-warning">₹{editOutstanding.toLocaleString()}</span></div>
                </>}
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
