import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState } from "react";
import { getExpenses, saveExpense, type Expense, type ExpenseCategory } from "../lib/store";
import { Plus, Search, Fuel, Users, Wrench, MoreHorizontal, Coins } from "lucide-react";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/expenses")({
  component: ExpensesPage,
});

const CATEGORIES: { value: ExpenseCategory; label: string; icon: typeof Fuel }[] = [
  { value: "fuel", label: "Fuel", icon: Fuel },
  { value: "salary", label: "Salary", icon: Users },
  { value: "maintenance", label: "Maint.", icon: Wrench },
  { value: "miscellaneous", label: "Misc", icon: MoreHorizontal },
  { value: "tips", label: "Tips", icon: Coins },
];

function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>(getExpenses);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<ExpenseCategory | "all">("all");
  const [category, setCategory] = useState<ExpenseCategory>("fuel");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");

  const sorted = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const filtered = sorted.filter((e) => {
    const matchSearch = e.notes.toLowerCase().includes(search.toLowerCase()) || e.category.includes(search.toLowerCase());
    const matchCat = filterCat === "all" || e.category === filterCat;
    return matchSearch && matchCat;
  });

  const handleSave = () => {
    if (!amount.trim()) return;
    saveExpense({ category, amount: Number(amount), date, notes: notes.trim() });
    setExpenses(getExpenses());
    setShowForm(false);
    setAmount("");
    setNotes("");
  };

  const getCatIcon = (cat: ExpenseCategory) => {
    const c = CATEGORIES.find((c) => c.value === cat);
    return c ? c.icon : MoreHorizontal;
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="module-header mb-0">Expenses</h1>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"><Plus className="h-4 w-4" /> Add</button>
        </div>

        {showForm && (
          <div className="stat-card space-y-3">
            <h3 className="text-sm font-semibold text-foreground">New Expense</h3>
            <div>
              <label className="field-label">Category</label>
              <div className="grid grid-cols-5 gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c.value} onClick={() => setCategory(c.value)} className={`flex flex-col items-center gap-1 rounded-md border p-2 text-xs font-medium transition-colors ${category === c.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                    <c.icon className="h-4 w-4" />{c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="field-label">Amount (₹)</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="field-label">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            </div>
            <div><label className="field-label">Notes</label><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div className="flex gap-2">
              <button onClick={handleSave} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Save</button>
              <button onClick={() => setShowForm(false)} className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-muted transition-colors">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search expenses..." className="w-full rounded-md border border-input bg-secondary pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value as ExpenseCategory | "all")} className="rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="all">All</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
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
                    <p className="font-medium text-foreground capitalize">{exp.category}</p>
                    <p className="text-xs text-muted-foreground">{format(parseISO(exp.date + "T00:00:00"), "dd MMM yyyy")}{exp.notes ? ` · ${exp.notes}` : ""}</p>
                  </div>
                </div>
                <p className="font-bold text-destructive">-₹{exp.amount.toLocaleString()}</p>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No expenses found.</p>}
        </div>
      </div>
    </AppLayout>
  );
}
