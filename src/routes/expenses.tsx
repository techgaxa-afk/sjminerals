import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState, useMemo } from "react";
import {
  getExpenses, saveExpense, updateExpense, deleteExpense,
  getCashSales, getUpiSales, getCashExpenses, getUpiExpenses,
  useCloudData,
  type Expense, type ExpenseCategory, type ExpensePaymentMode,
} from "../lib/store";
import { Plus, Search, Fuel, Users, Wrench, MoreHorizontal, Coins, Pencil, Trash2, X, UtensilsCrossed, Banknote, CreditCard } from "lucide-react";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/expenses")({
  component: ExpensesPage,
});

const CATEGORIES: { value: ExpenseCategory; label: string; icon: typeof Fuel }[] = [
  { value: "fuel", label: "Fuel", icon: Fuel },
  { value: "salary", label: "Salary", icon: Users },
  { value: "tips", label: "Tips", icon: Coins },
  { value: "food", label: "Food", icon: UtensilsCrossed },
  { value: "maintenance", label: "Maint.", icon: Wrench },
  { value: "miscellaneous", label: "Other", icon: MoreHorizontal },
];

function ExpensesPage() {
  useCloudData();
  const [expenses, setExpenses] = useState<Expense[]>(getExpenses);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<ExpenseCategory | "all">("all");
  const [filterMode, setFilterMode] = useState<ExpensePaymentMode | "all">("all");
  const [category, setCategory] = useState<ExpenseCategory>("fuel");
  const [paymentMode, setPaymentMode] = useState<ExpensePaymentMode>("cash");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sorted = [...expenses].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const filtered = sorted.filter((e) => {
    const matchSearch = e.notes.toLowerCase().includes(search.toLowerCase()) || e.category.includes(search.toLowerCase());
    const matchCat = filterCat === "all" || e.category === filterCat;
    const matchMode = filterMode === "all" || e.paymentMode === filterMode;
    return matchSearch && matchCat && matchMode;
  });

  const resetForm = () => {
    setShowForm(false); setEditingId(null);
    setAmount(""); setNotes(""); setCategory("fuel"); setPaymentMode("cash"); setError(null);
  };

  const handleSave = () => {
    setError(null);
    const amt = Number(amount);
    if (!amount.trim() || !(amt > 0)) { setError("Amount must be greater than zero."); return; }
    if (!date) { setError("Date is required."); return; }
    if (!paymentMode) { setError("Payment mode is required."); return; }

    // Balance validation (exclude the current row when editing so user can edit without false-positive)
    const editingAmt = editingId ? (expenses.find((e) => e.id === editingId)?.amount ?? 0) : 0;
    const editingMode = editingId ? expenses.find((e) => e.id === editingId)?.paymentMode : undefined;

    if (paymentMode === "cash") {
      const available = getCashSales() - getCashExpenses() + (editingMode === "cash" ? editingAmt : 0);
      if (amt > available) {
        setError(`Insufficient Cash Balance. Available Cash: ₹${available.toLocaleString()}`);
        return;
      }
    } else {
      const available = getUpiSales() - getUpiExpenses() + (editingMode === "upi" ? editingAmt : 0);
      if (amt > available) {
        setError(`Insufficient UPI Balance. Available UPI: ₹${available.toLocaleString()}`);
        return;
      }
    }

    if (editingId) updateExpense(editingId, { category, amount: amt, date, notes: notes.trim(), paymentMode });
    else saveExpense({ category, amount: amt, date, notes: notes.trim(), paymentMode });
    setExpenses(getExpenses());
    resetForm();
  };

  const startEdit = (e: Expense) => {
    setEditingId(e.id); setCategory(e.category); setAmount(String(e.amount));
    setDate(e.date); setNotes(e.notes); setPaymentMode(e.paymentMode || "cash");
    setError(null); setShowForm(true);
  };

  const handleDelete = (id: string) => { deleteExpense(id); setExpenses(getExpenses()); };

  const getCatIcon = (cat: ExpenseCategory) => {
    const c = CATEGORIES.find((c) => c.value === cat);
    return c ? c.icon : MoreHorizontal;
  };

  const availableCash = getCashSales() - getCashExpenses();
  const availableUpi = getUpiSales() - getUpiExpenses();

  const analytics = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let today = 0, month = 0, cash = 0, upi = 0;
    const byCat: Record<string, number> = {};
    expenses.forEach((e) => {
      const t = new Date(e.date).getTime();
      if (t >= startOfDay) today += e.amount;
      if (t >= startOfMonth) {
        month += e.amount;
        byCat[e.category] = (byCat[e.category] || 0) + e.amount;
      }
      if (e.paymentMode === "upi") upi += e.amount; else cash += e.amount;
    });
    return { today, month, cash, upi, byCat };
  }, [expenses]);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="module-header mb-0">Expenses</h1>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"><Plus className="h-4 w-4" /> Add</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="stat-card border-success/30 bg-success/5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-xs text-success"><Banknote className="h-3.5 w-3.5" /> Available Cash</div>
              {availableCash <= 0 ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">NO CASH</span>
                : availableCash < 1000 ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-warning/20 text-warning">LOW</span> : null}
            </div>
            <p className="text-xl font-bold text-success">₹{availableCash.toLocaleString()}</p>
          </div>
          <div className="stat-card border-primary/30 bg-primary/5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-xs text-primary"><CreditCard className="h-3.5 w-3.5" /> Available UPI</div>
              {availableUpi <= 0 ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">NO UPI</span>
                : availableUpi < 1000 ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-warning/20 text-warning">LOW</span> : null}
            </div>
            <p className="text-xl font-bold text-primary">₹{availableUpi.toLocaleString()}</p>
          </div>
        </div>

        {/* Quick Expense Analytics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="stat-card">
            <p className="text-[10px] text-muted-foreground uppercase">Today</p>
            <p className="text-lg font-bold text-destructive">₹{analytics.today.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="text-[10px] text-muted-foreground uppercase">This Month</p>
            <p className="text-lg font-bold text-destructive">₹{analytics.month.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="text-[10px] text-muted-foreground uppercase">Cash (All)</p>
            <p className="text-lg font-bold text-success">₹{analytics.cash.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="text-[10px] text-muted-foreground uppercase">UPI (All)</p>
            <p className="text-lg font-bold text-primary">₹{analytics.upi.toLocaleString()}</p>
          </div>
        </div>

        {/* Category totals — this month */}
        <div className="stat-card">
          <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">Categories · This Month</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIES.map((c) => (
              <div key={c.value} className="flex items-center justify-between rounded-md bg-secondary/50 px-2 py-1.5 text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground"><c.icon className="h-3.5 w-3.5" />{c.label}</span>
                <span className="font-semibold text-foreground">₹{(analytics.byCat[c.value] || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {showForm && (
          <div className="stat-card space-y-3">
            <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-foreground">{editingId ? "Edit" : "New"} Expense</h3><button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button></div>
            <div>
              <label className="field-label">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c.value} onClick={() => setCategory(c.value)} className={`flex flex-col items-center gap-1 rounded-md border p-2 text-xs font-medium transition-colors ${category === c.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                    <c.icon className="h-4 w-4" />{c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="field-label">Amount (₹)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="field-label">Payment Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setPaymentMode("cash")} className={`flex items-center justify-center gap-1.5 rounded-md border p-2 text-xs font-medium transition-colors ${paymentMode === "cash" ? "border-success bg-success/10 text-success" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  <Banknote className="h-4 w-4" /> Cash
                </button>
                <button onClick={() => setPaymentMode("upi")} className={`flex items-center justify-center gap-1.5 rounded-md border p-2 text-xs font-medium transition-colors ${paymentMode === "upi" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  <CreditCard className="h-4 w-4" /> UPI
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Available {paymentMode === "cash" ? "Cash" : "UPI"}: ₹{(paymentMode === "cash" ? availableCash : availableUpi).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="field-label">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="field-label">Notes</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive whitespace-pre-line">{error}</div>}
            <div className="flex gap-2">
              <button onClick={handleSave} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Save</button>
              <button onClick={resetForm} className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-muted transition-colors">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search expenses..." className="w-full rounded-md border border-input bg-secondary pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value as ExpenseCategory | "all")} className="rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={filterMode} onChange={(e) => setFilterMode(e.target.value as ExpensePaymentMode | "all")} className="rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="all">All Modes</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
          </select>
        </div>

        <div className="space-y-2">
          {filtered.map((exp) => {
            const Icon = getCatIcon(exp.category);
            return (
              <div key={exp.id} className="stat-card flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-secondary p-2"><Icon className="h-4 w-4 text-muted-foreground" /></div>
                  <div>
                    <p className="font-medium text-foreground capitalize flex items-center gap-2">
                      {exp.category}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${exp.paymentMode === "upi" ? "bg-primary/15 text-primary" : "bg-success/15 text-success"}`}>{(exp.paymentMode || "cash").toUpperCase()}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{format(parseISO(exp.date + "T00:00:00"), "dd MMM yyyy")}{exp.notes ? ` · ${exp.notes}` : ""}</p>
                    <p className="text-[10px] text-muted-foreground">Logged {format(new Date(exp.createdAt), "dd MMM, hh:mm a")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-destructive">-₹{exp.amount.toLocaleString()}</p>
                  <button onClick={() => startEdit(exp)} className="rounded-md p-1 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(exp.id)} className="rounded-md p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No expenses found.</p>}
        </div>
      </div>
    </AppLayout>
  );
}
