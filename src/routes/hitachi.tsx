import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useMemo, useState } from "react";
import {
  getHitachiMachines, saveHitachiMachine, updateHitachiMachine, deleteHitachiMachine,
  getHitachiEntries, saveHitachiEntry, updateHitachiEntry, deleteHitachiEntry, getHitachiEntriesByMachine,
  getHitachiFuel, saveHitachiFuel,
  getOperators, saveOperator, updateOperator, deleteOperator,
  saveExpense,
  getMachineRentalLedger, getRentalPaymentsByMachine, saveHitachiRentalPayment,
  type HitachiMachine, type HitachiEntry, type Operator,
} from "../lib/store";
import { Plus, Search, Settings, Fuel, Users, Clock, Trash2, Pencil, X, ChevronDown, ChevronUp, Wallet } from "lucide-react";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/hitachi")({
  component: HitachiPage,
});

type Tab = "entries" | "machines" | "fuel" | "operators";

function HitachiPage() {
  const [tab, setTab] = useState<Tab>("entries");
  const [machines, setMachines] = useState(getHitachiMachines);
  const [entries, setEntries] = useState(getHitachiEntries);
  const [fuels, setFuels] = useState(getHitachiFuel);
  const [operators, setOperators] = useState(getOperators);
  const [search, setSearch] = useState("");

  // Entry form
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editEntryId, setEditEntryId] = useState<string | null>(null);
  const [entryMachineId, setEntryMachineId] = useState("");
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startHrs, setStartHrs] = useState("");
  const [endHrs, setEndHrs] = useState("");
  const [entryOperatorId, setEntryOperatorId] = useState("");
  const [entryShiftType, setEntryShiftType] = useState<"normal" | "single">("normal");
  const [entryShift, setEntryShift] = useState<"A" | "B">("A");
  const [entryNotes, setEntryNotes] = useState("");
  // Owned extras
  const [maintCost, setMaintCost] = useState("");
  const [dieselLiters, setDieselLiters] = useState("");
  const [dieselCost, setDieselCost] = useState("");
  const [ownerTips, setOwnerTips] = useState("");
  // Rented extras
  const [dieselPaid, setDieselPaid] = useState("");
  const [rentalPaymentMade, setRentalPaymentMade] = useState("");

  // Machine form
  const [showMachineForm, setShowMachineForm] = useState(false);
  const [editMachineId, setEditMachineId] = useState<string | null>(null);
  const [machineName, setMachineName] = useState("");
  const [machineType, setMachineType] = useState<"owned" | "rented">("owned");
  const [machineRentalRate, setMachineRentalRate] = useState("");
  // Optional informational fields
  const [machinePurchaseDate, setMachinePurchaseDate] = useState("");
  const [machineEngineNumber, setMachineEngineNumber] = useState("");
  const [machineOwnerName, setMachineOwnerName] = useState("");
  const [machineOwnerPhone, setMachineOwnerPhone] = useState("");
  const [machineRemarks, setMachineRemarks] = useState("");

  // Fuel form
  const [showFuelForm, setShowFuelForm] = useState(false);
  const [fuelMachineId, setFuelMachineId] = useState("");
  const [fuelLiters, setFuelLiters] = useState("");
  const [fuelHrs, setFuelHrs] = useState("");
  const [fuelDate, setFuelDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Operator form
  const [showOperatorForm, setShowOperatorForm] = useState(false);
  const [editOpId, setEditOpId] = useState<string | null>(null);
  const [opName, setOpName] = useState("");
  const [opPhone, setOpPhone] = useState("");
  const [opNormalSalary, setOpNormalSalary] = useState("");
  const [opSingleSalary, setOpSingleSalary] = useState("");

  const [expandedMachine, setExpandedMachine] = useState<string | null>(null);

  // Payment dialog
  const [payMachineId, setPayMachineId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [payMode, setPayMode] = useState("cash");
  const [payNotes, setPayNotes] = useState("");

  const totalHours = Math.max(0, Number(endHrs || 0) - Number(startHrs || 0));
  const selectedMachine = machines.find((m) => m.id === entryMachineId);
  const isRented = selectedMachine?.type === "rented";
  const selectedOperator = operators.find((o) => o.id === entryOperatorId);
  const operatorSalary = selectedOperator
    ? (entryShiftType === "single" ? selectedOperator.singleShiftSalary : selectedOperator.normalShiftSalary) || 0
    : 0;
  const rentalCharge = isRented ? totalHours * (selectedMachine?.rentalRate || 0) : 0;
  const machineRevenue = !isRented ? totalHours * (selectedMachine?.hourlyRate || 0) : 0;
  const netRentalPayable = Math.max(0, rentalCharge - Number(dieselPaid || 0));
  const balanceOutstanding = Math.max(0, netRentalPayable - Number(rentalPaymentMade || 0));

  const resetEntryForm = () => {
    setShowEntryForm(false); setEditEntryId(null);
    setStartHrs(""); setEndHrs(""); setEntryNotes("");
    setEntryMachineId(""); setEntryOperatorId("");
    setMaintCost(""); setDieselLiters(""); setDieselCost(""); setOwnerTips("");
    setDieselPaid(""); setRentalPaymentMade("");
  };

  const handleSaveEntry = () => {
    if (!entryMachineId || !startHrs || !endHrs || totalHours <= 0) return;
    const machine = machines.find((m) => m.id === entryMachineId);
    const operator = operators.find((o) => o.id === entryOperatorId);
    const rented = machine?.type === "rented";
    const data: Omit<HitachiEntry, "id" | "createdAt"> = {
      machineId: entryMachineId, machineName: machine?.name || "", date: entryDate,
      startingHours: Number(startHrs), endingHours: Number(endHrs), totalHours,
      operatorId: entryOperatorId, operatorName: operator?.name || "",
      shiftType: entryShiftType, shift: entryShiftType === "normal" ? entryShift : "A",
      machineRevenue: rented ? 0 : totalHours * (machine?.hourlyRate || 0),
      operatorSalary, notes: entryNotes.trim(),
      maintenanceCost: rented ? 0 : Number(maintCost || 0),
      dieselLiters: Number(dieselLiters || 0),
      dieselCost: rented ? 0 : Number(dieselCost || 0),
      tips: rented ? 0 : Number(ownerTips || 0),
      rentalCharge: rented ? totalHours * (machine?.rentalRate || 0) : 0,
      dieselPaid: rented ? Number(dieselPaid || 0) : 0,
      rentalPaymentMade: rented ? Number(rentalPaymentMade || 0) : 0,
    };
    if (editEntryId) {
      updateHitachiEntry(editEntryId, data);
    } else {
      saveHitachiEntry(data);
      // Auto-expenses
      if (operatorSalary > 0) {
        saveExpense({
          category: "salary", amount: operatorSalary, date: entryDate,
          notes: `Operator ${operator?.name || ""} - ${machine?.name || ""} - ${totalHours}hrs`,
          paymentMode: "cash", linkedOperatorId: entryOperatorId, linkedMachineId: entryMachineId,
          allocateTo: "hitachi", hitachiMachineId: entryMachineId,
        });
      }
      if (!rented) {
        if (Number(maintCost || 0) > 0) {
          saveExpense({
            category: "maintenance", amount: Number(maintCost), date: entryDate,
            notes: `Maintenance · ${machine?.name || ""}`, paymentMode: "cash",
            linkedMachineId: entryMachineId, allocateTo: "hitachi", hitachiMachineId: entryMachineId,
          });
        }
        if (Number(dieselCost || 0) > 0) {
          saveExpense({
            category: "fuel", amount: Number(dieselCost), date: entryDate,
            notes: `Diesel · ${machine?.name || ""}${dieselLiters ? ` · ${dieselLiters}L` : ""}`,
            paymentMode: "cash", linkedMachineId: entryMachineId,
            allocateTo: "hitachi", hitachiMachineId: entryMachineId,
          });
        }
        if (Number(ownerTips || 0) > 0) {
          saveExpense({
            category: "tips", amount: Number(ownerTips), date: entryDate,
            notes: `Operator Tips · ${operator?.name || ""}`, paymentMode: "cash",
            linkedOperatorId: entryOperatorId, linkedMachineId: entryMachineId,
            allocateTo: "hitachi", hitachiMachineId: entryMachineId,
          });
        }
      }
    }
    setEntries(getHitachiEntries());
    resetEntryForm();
  };

  const startEditEntry = (e: HitachiEntry) => {
    setEditEntryId(e.id); setEntryMachineId(e.machineId); setEntryDate(e.date);
    setStartHrs(String(e.startingHours)); setEndHrs(String(e.endingHours));
    setEntryOperatorId(e.operatorId);
    setEntryShiftType(e.shiftType || "normal");
    setEntryShift(e.shift); setEntryNotes(e.notes);
    setMaintCost(e.maintenanceCost ? String(e.maintenanceCost) : "");
    setDieselLiters(e.dieselLiters ? String(e.dieselLiters) : "");
    setDieselCost(e.dieselCost ? String(e.dieselCost) : "");
    setOwnerTips(e.tips ? String(e.tips) : "");
    setDieselPaid(e.dieselPaid ? String(e.dieselPaid) : "");
    setRentalPaymentMade(e.rentalPaymentMade ? String(e.rentalPaymentMade) : "");
    setShowEntryForm(true);
  };

  const resetMachineForm = () => {
    setShowMachineForm(false); setEditMachineId(null);
    setMachineName(""); setMachineType("owned"); setMachineRentalRate("");
    setMachinePurchaseDate(""); setMachineEngineNumber("");
    setMachineOwnerName(""); setMachineOwnerPhone(""); setMachineRemarks("");
  };

  const handleSaveMachine = () => {
    if (!machineName.trim()) return;
    if (machineType === "rented" && !Number(machineRentalRate || 0)) return;
    const data = {
      name: machineName.trim(),
      hourlyRate: 0, // legacy column, unused under new rules
      type: machineType,
      rentalRate: machineType === "rented" ? Number(machineRentalRate || 0) : 0,
      purchaseDate: machineType === "owned" ? (machinePurchaseDate || undefined) : undefined,
      engineNumber: machineType === "owned" ? (machineEngineNumber.trim() || undefined) : undefined,
      ownerName: machineType === "rented" ? (machineOwnerName.trim() || undefined) : undefined,
      ownerPhone: machineType === "rented" ? (machineOwnerPhone.trim() || undefined) : undefined,
      remarks: machineRemarks.trim() || undefined,
    };
    if (editMachineId) updateHitachiMachine(editMachineId, data);
    else saveHitachiMachine(data);
    setMachines(getHitachiMachines());
    resetMachineForm();
  };

  const startEditMachine = (m: HitachiMachine) => {
    setEditMachineId(m.id); setMachineName(m.name);
    setMachineType(m.type === "rented" ? "rented" : "owned");
    setMachineRentalRate(m.type === "rented" ? String(m.rentalRate ?? "") : "");
    setMachinePurchaseDate(m.purchaseDate ?? "");
    setMachineEngineNumber(m.engineNumber ?? "");
    setMachineOwnerName(m.ownerName ?? "");
    setMachineOwnerPhone(m.ownerPhone ?? "");
    setMachineRemarks(m.remarks ?? "");
    setShowMachineForm(true);
  };

  const handleSaveFuel = () => {
    if (!fuelMachineId || !fuelLiters) return;
    const machine = machines.find((m) => m.id === fuelMachineId);
    saveHitachiFuel({ machineId: fuelMachineId, machineName: machine?.name || "", liters: Number(fuelLiters), hourReading: Number(fuelHrs || 0), date: fuelDate });
    setFuels(getHitachiFuel());
    setShowFuelForm(false); setFuelLiters(""); setFuelHrs("");
  };

  const resetOpForm = () => { setShowOperatorForm(false); setEditOpId(null); setOpName(""); setOpPhone(""); setOpNormalSalary(""); setOpSingleSalary(""); };

  const handleSaveOperator = () => {
    if (!opName.trim()) return;
    const normalSalary = Number(opNormalSalary || 0);
    const singleSalary = Number(opSingleSalary || 0);
    const payload = {
      name: opName.trim(), phone: opPhone.trim(),
      hourlySalaryRate: normalSalary,
      normalShiftSalary: normalSalary, singleShiftSalary: singleSalary,
    };
    if (editOpId) updateOperator(editOpId, payload);
    else saveOperator(payload);
    setOperators(getOperators());
    resetOpForm();
  };

  const startEditOp = (o: Operator) => {
    setEditOpId(o.id); setOpName(o.name); setOpPhone(o.phone);
    setOpNormalSalary(String(o.normalShiftSalary || o.hourlySalaryRate || ""));
    setOpSingleSalary(String(o.singleShiftSalary || ""));
    setShowOperatorForm(true);
  };

  const resetPaymentForm = () => {
    setPayMachineId(null); setPayAmount(""); setPayMode("cash"); setPayNotes("");
    setPayDate(format(new Date(), "yyyy-MM-dd"));
  };

  const handleSavePayment = () => {
    if (!payMachineId || !Number(payAmount || 0)) return;
    const m = machines.find((x) => x.id === payMachineId);
    saveHitachiRentalPayment({
      machineId: payMachineId, machineName: m?.name || "",
      amount: Number(payAmount), paymentDate: payDate, paymentMode: payMode, notes: payNotes.trim(),
    });
    resetPaymentForm();
  };

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [entries],
  );
  const filteredEntries = sortedEntries.filter((e) =>
    e.machineName.toLowerCase().includes(search.toLowerCase()) ||
    e.operatorName.toLowerCase().includes(search.toLowerCase()),
  );

  const tabs: { id: Tab; label: string; icon: typeof Clock }[] = [
    { id: "entries", label: "Daily Log", icon: Clock },
    { id: "machines", label: "Machines", icon: Settings },
    { id: "fuel", label: "Fuel", icon: Fuel },
    { id: "operators", label: "Operators", icon: Users },
  ];

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="module-header">Hitachi Module</h1>

        <div className="flex gap-1 rounded-md bg-secondary p-1 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* Daily Entries */}
        {tab === "entries" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 mr-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search entries..." className="w-full rounded-md border border-input bg-secondary pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <button onClick={() => { resetEntryForm(); setShowEntryForm(true); }} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Log</button>
            </div>

            {showEntryForm && (
              <div className="stat-card space-y-3">
                <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-foreground">{editEntryId ? "Edit" : "New"} Daily Entry</h3><button onClick={resetEntryForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="field-label">Machine *</label>
                    <select value={entryMachineId} onChange={(e) => setEntryMachineId(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">Select...</option>
                      {machines.map((m) => <option key={m.id} value={m.id}>{m.name} {m.type === "rented" ? `(Rented · ₹${m.rentalRate}/hr)` : "(Owned)"}</option>)}
                    </select>
                  </div>
                  <div><label className="field-label">Date</label><input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="field-label">Start HRs</label><input type="number" value={startHrs} onChange={(e) => setStartHrs(e.target.value)} placeholder="0" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  <div><label className="field-label">End HRs</label><input type="number" value={endHrs} onChange={(e) => setEndHrs(e.target.value)} placeholder="0" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  <div><label className="field-label">Total HRs</label><div className="rounded-md bg-primary/10 border border-primary/20 px-3 py-2 text-sm font-bold text-primary">{totalHours > 0 ? totalHours : "—"}</div></div>
                </div>

                {totalHours > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {!isRented && machineRevenue > 0 && (
                      <div className="rounded-md bg-success/10 border border-success/20 p-2 text-center">
                        <p className="text-xs text-muted-foreground">Machine Value</p>
                        <p className="font-bold text-sm text-success">₹{machineRevenue.toLocaleString()}</p>
                      </div>
                    )}
                    <div className="rounded-md bg-warning/10 border border-warning/20 p-2 text-center">
                      <p className="text-xs text-muted-foreground">Operator Cost ({entryShiftType === "single" ? "Single" : "Normal"})</p>
                      <p className="font-bold text-sm text-warning">₹{operatorSalary.toLocaleString()}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div><label className="field-label">Operator</label>
                    <select value={entryOperatorId} onChange={(e) => setEntryOperatorId(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">Select...</option>
                      {operators.map((o) => <option key={o.id} value={o.id}>{o.name} (N:₹{o.normalShiftSalary || o.hourlySalaryRate} / S:₹{o.singleShiftSalary})</option>)}
                    </select>
                  </div>
                  <div><label className="field-label">Shift Type</label>
                    <div className="flex gap-2">
                      <button onClick={() => setEntryShiftType("normal")} className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${entryShiftType === "normal" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>Normal Shift</button>
                      <button onClick={() => setEntryShiftType("single")} className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${entryShiftType === "single" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>Single Shift</button>
                    </div>
                  </div>
                </div>
                {entryShiftType === "normal" && (
                  <div><label className="field-label">Shift *</label>
                    <div className="flex gap-2">
                      <button onClick={() => setEntryShift("A")} className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${entryShift === "A" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>Shift A</button>
                      <button onClick={() => setEntryShift("B")} className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${entryShift === "B" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>Shift B</button>
                    </div>
                  </div>
                )}

                {/* OWNED extras */}
                {selectedMachine && !isRented && (
                  <div className="rounded-md border border-border p-3 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground">Owned Machine — Optional Cost Tracking</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="field-label">Maintenance Expense (₹)</label><input type="number" value={maintCost} onChange={(e) => setMaintCost(e.target.value)} placeholder="0" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                      <div><label className="field-label">Diesel Used (Liters)</label><input type="number" value={dieselLiters} onChange={(e) => setDieselLiters(e.target.value)} placeholder="0" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                      <div><label className="field-label">Diesel Cost (₹)</label><input type="number" value={dieselCost} onChange={(e) => setDieselCost(e.target.value)} placeholder="0" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                      <div><label className="field-label">Operator Tips (₹)</label><input type="number" value={ownerTips} onChange={(e) => setOwnerTips(e.target.value)} placeholder="0" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                    </div>
                    <p className="text-xs text-muted-foreground">Amounts above auto-create expense records (Maintenance / Fuel / Tips) allocated to this machine. New entries only.</p>
                  </div>
                )}

                {/* RENTED extras */}
                {selectedMachine && isRented && (
                  <div className="rounded-md border border-border p-3 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground">Rented Machine — Charges & Payment</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="field-label">Rental Charge (auto)</label>
                        <div className="rounded-md bg-secondary px-3 py-2 text-sm font-bold text-foreground">₹{rentalCharge.toLocaleString()}</div>
                      </div>
                      <div><label className="field-label">Diesel Cost Paid (₹)</label><input type="number" value={dieselPaid} onChange={(e) => setDieselPaid(e.target.value)} placeholder="0" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                      <div>
                        <label className="field-label">Net Rental Payable</label>
                        <div className="rounded-md bg-warning/10 border border-warning/20 px-3 py-2 text-sm font-bold text-warning">₹{netRentalPayable.toLocaleString()}</div>
                      </div>
                      <div><label className="field-label">Rental Payment Made (₹)</label><input type="number" value={rentalPaymentMade} onChange={(e) => setRentalPaymentMade(e.target.value)} placeholder="0" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                      <div className="col-span-2">
                        <label className="field-label">Balance Outstanding (this entry)</label>
                        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm font-bold text-destructive">₹{balanceOutstanding.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div><label className="field-label">Notes</label><input value={entryNotes} onChange={(e) => setEntryNotes(e.target.value)} placeholder="Optional" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                <div className="flex gap-2">
                  <button onClick={handleSaveEntry} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Save</button>
                  <button onClick={resetEntryForm} className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-muted">Cancel</button>
                </div>
              </div>
            )}

            {filteredEntries.map((e) => {
              const m = machines.find((x) => x.id === e.machineId);
              const rented = m?.type === "rented" || e.rentalCharge > 0;
              return (
                <div key={e.id} className="stat-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{e.machineName} <span className="text-xs text-muted-foreground">· {rented ? "Rented" : "Owned"}</span></p>
                      <p className="text-xs text-muted-foreground">{format(parseISO(e.date + "T00:00:00"), "dd MMM yyyy")} · {e.operatorName || "—"} · {e.shiftType === "single" ? "Single Shift" : `Normal Shift - Shift ${e.shift}`}</p>
                      <p className="text-xs text-muted-foreground">{e.startingHours} → {e.endingHours} HRs</p>
                      {rented && e.rentalCharge > 0 && <p className="text-xs text-warning">Rental: ₹{e.rentalCharge.toLocaleString()} · Diesel Paid: ₹{e.dieselPaid.toLocaleString()} · Paid: ₹{e.rentalPaymentMade.toLocaleString()}</p>}
                      {!rented && (e.maintenanceCost > 0 || e.dieselCost > 0 || e.tips > 0) && (
                        <p className="text-xs text-muted-foreground">Maint ₹{e.maintenanceCost.toLocaleString()} · Diesel ₹{e.dieselCost.toLocaleString()} ({e.dieselLiters || 0}L) · Tips ₹{e.tips.toLocaleString()}</p>
                      )}
                      {e.operatorSalary > 0 && <p className="text-xs text-warning">Salary: ₹{e.operatorSalary.toLocaleString()}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-primary">{e.totalHours} HRs</p>
                      <button onClick={() => startEditEntry(e)} className="rounded-md p-1 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => { deleteHitachiEntry(e.id); setEntries(getHitachiEntries()); }} className="rounded-md p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredEntries.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No entries yet.</p>}
          </div>
        )}

        {/* Machines */}
        {tab === "machines" && (
          <div className="space-y-3">
            <button onClick={() => { resetMachineForm(); setShowMachineForm(true); }} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Add Machine</button>

            {showMachineForm && (
              <div className="stat-card space-y-3">
                <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-foreground">{editMachineId ? "Edit" : "New"} Machine</h3><button onClick={resetMachineForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button></div>
                <input value={machineName} onChange={(e) => setMachineName(e.target.value)} placeholder="Machine Name/ID *" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <div>
                  <label className="field-label">Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setMachineType("owned")} className={`rounded-md border p-2 text-xs font-medium ${machineType === "owned" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>Owned</button>
                    <button onClick={() => setMachineType("rented")} className={`rounded-md border p-2 text-xs font-medium ${machineType === "rented" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>Rented</button>
                  </div>
                </div>
                {machineType === "rented" && (
                  <div>
                    <label className="field-label">Rental Rate (₹/hr) *</label>
                    <input type="number" value={machineRentalRate} onChange={(e) => setMachineRentalRate(e.target.value)} placeholder="Amount paid to owner per hour" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                )}
                {machineType === "owned" && (
                  <p className="text-xs text-muted-foreground">Owned machines have no hourly rental charge.</p>
                )}
                <button onClick={handleSaveMachine} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Save</button>
              </div>
            )}

            {machines.map((m) => {
              const isExp = expandedMachine === m.id;
              const mEntries = isExp ? getHitachiEntriesByMachine(m.id) : [];
              const totalHrs = mEntries.reduce((s, e) => s + e.totalHours, 0);
              const rented = m.type === "rented";
              const ledger = isExp && rented ? getMachineRentalLedger(m.id) : null;
              const payments = isExp && rented ? getRentalPaymentsByMachine(m.id) : [];
              return (
                <div key={m.id} className="stat-card">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedMachine(isExp ? null : m.id)}>
                    <div>
                      <p className="font-medium text-foreground flex items-center gap-2"><Settings className="h-4 w-4 text-primary" /> {m.name}</p>
                      <p className="text-xs text-muted-foreground">{rented ? `Rented · ₹${m.rentalRate}/hr` : "Owned"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={(ev) => { ev.stopPropagation(); startEditMachine(m); }} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                      <button onClick={(ev) => { ev.stopPropagation(); deleteHitachiMachine(m.id); setMachines(getHitachiMachines()); }} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                      {isExp ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                  {isExp && (
                    <div className="mt-3 border-t border-border pt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-md bg-secondary p-2 text-center"><p className="text-xs text-muted-foreground">Total HRs</p><p className="font-bold text-sm text-foreground">{totalHrs}</p></div>
                        {rented && ledger && (
                          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2 text-center">
                            <p className="text-xs text-muted-foreground">Outstanding</p>
                            <p className="font-bold text-sm text-destructive">₹{ledger.outstanding.toLocaleString()}</p>
                          </div>
                        )}
                      </div>

                      {rented && ledger && (
                        <>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-md bg-secondary p-2"><p className="text-xs text-muted-foreground">Rental Charges</p><p className="font-semibold text-xs">₹{ledger.totalRentalCharges.toLocaleString()}</p></div>
                            <div className="rounded-md bg-secondary p-2"><p className="text-xs text-muted-foreground">Diesel Paid</p><p className="font-semibold text-xs">₹{ledger.totalDieselPaid.toLocaleString()}</p></div>
                            <div className="rounded-md bg-secondary p-2"><p className="text-xs text-muted-foreground">Payments</p><p className="font-semibold text-xs">₹{ledger.totalPayments.toLocaleString()}</p></div>
                          </div>

                          <button
                            onClick={(ev) => { ev.stopPropagation(); resetPaymentForm(); setPayMachineId(m.id); }}
                            className="w-full flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                          >
                            <Wallet className="h-4 w-4" /> Make Payment
                          </button>

                          {payMachineId === m.id && (
                            <div className="rounded-md border border-border p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-foreground">New Rental Payment</p>
                                <button onClick={resetPaymentForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div><label className="field-label">Date</label><input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                                <div><label className="field-label">Amount *</label><input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                                <div><label className="field-label">Mode</label>
                                  <select value={payMode} onChange={(e) => setPayMode(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                                    <option value="cash">Cash</option>
                                    <option value="upi">UPI</option>
                                    <option value="bank">Bank Transfer</option>
                                    <option value="cheque">Cheque</option>
                                  </select>
                                </div>
                                <div><label className="field-label">Notes</label><input value={payNotes} onChange={(e) => setPayNotes(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                              </div>
                              <button onClick={handleSavePayment} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Save Payment</button>
                            </div>
                          )}

                          <div className="rounded-md border border-border overflow-hidden">
                            <p className="bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground">Ledger</p>
                            <div className="max-h-72 overflow-y-auto">
                              <table className="w-full text-xs">
                                <thead className="bg-secondary/50 text-muted-foreground">
                                  <tr>
                                    <th className="px-2 py-1 text-left">Date</th>
                                    <th className="px-2 py-1 text-left">Description</th>
                                    <th className="px-2 py-1 text-right">Debit</th>
                                    <th className="px-2 py-1 text-right">Credit</th>
                                    <th className="px-2 py-1 text-right">Balance</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ledger.rows.map((r, i) => (
                                    <tr key={i} className="border-t border-border">
                                      <td className="px-2 py-1">{format(parseISO(r.date + "T00:00:00"), "dd MMM")}</td>
                                      <td className="px-2 py-1">{r.description}</td>
                                      <td className="px-2 py-1 text-right text-warning">{r.debit > 0 ? `₹${r.debit.toLocaleString()}` : ""}</td>
                                      <td className="px-2 py-1 text-right text-success">{r.credit > 0 ? `₹${r.credit.toLocaleString()}` : ""}</td>
                                      <td className="px-2 py-1 text-right font-semibold">₹{r.balance.toLocaleString()}</td>
                                    </tr>
                                  ))}
                                  {ledger.rows.length === 0 && (
                                    <tr><td colSpan={5} className="px-2 py-3 text-center text-muted-foreground">No ledger entries.</td></tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {payments.length > 0 && (
                            <div className="rounded-md border border-border p-2 space-y-1">
                              <p className="text-xs font-semibold text-muted-foreground">Payment History</p>
                              {payments.slice().sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)).map((p) => (
                                <div key={p.id} className="flex items-center justify-between text-xs">
                                  <span>{format(parseISO(p.paymentDate + "T00:00:00"), "dd MMM yyyy")} · {p.paymentMode}{p.notes ? ` · ${p.notes}` : ""}</span>
                                  <span className="font-semibold text-success">₹{p.amount.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {machines.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No machines yet.</p>}
          </div>
        )}

        {/* Fuel */}
        {tab === "fuel" && (
          <div className="space-y-3">
            <button onClick={() => setShowFuelForm(!showFuelForm)} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Add Fuel</button>

            {showFuelForm && (
              <div className="stat-card space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Fuel Entry</h3>
                <select value={fuelMachineId} onChange={(e) => setFuelMachineId(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Select Machine *</option>
                  {machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="field-label">Liters</label><input type="number" value={fuelLiters} onChange={(e) => setFuelLiters(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  <div><label className="field-label">Hour Reading</label><input type="number" value={fuelHrs} onChange={(e) => setFuelHrs(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                </div>
                <div><label className="field-label">Date</label><input type="date" value={fuelDate} onChange={(e) => setFuelDate(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                <button onClick={handleSaveFuel} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Save</button>
              </div>
            )}

            {[...fuels].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((f) => (
              <div key={f.id} className="stat-card flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground flex items-center gap-2"><Fuel className="h-4 w-4 text-chart-3" /> {f.machineName}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(f.date + "T00:00:00"), "dd MMM yyyy")} · HR: {f.hourReading}</p>
                </div>
                <p className="font-bold text-foreground">{f.liters}L</p>
              </div>
            ))}
            {fuels.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No fuel entries.</p>}
          </div>
        )}

        {/* Operators */}
        {tab === "operators" && (
          <div className="space-y-3">
            <button onClick={() => { resetOpForm(); setShowOperatorForm(true); }} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Add Operator</button>

            {showOperatorForm && (
              <div className="stat-card space-y-3">
                <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-foreground">{editOpId ? "Edit" : "New"} Operator</h3><button onClick={resetOpForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button></div>
                <input value={opName} onChange={(e) => setOpName(e.target.value)} placeholder="Operator Name *" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <input value={opPhone} onChange={(e) => setOpPhone(e.target.value)} placeholder="Phone" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="field-label">Normal Shift Salary (₹)</label><input type="number" value={opNormalSalary} onChange={(e) => setOpNormalSalary(e.target.value)} placeholder="0" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  <div><label className="field-label">Single Shift Salary (₹)</label><input type="number" value={opSingleSalary} onChange={(e) => setOpSingleSalary(e.target.value)} placeholder="0" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                </div>
                <button onClick={handleSaveOperator} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Save</button>
              </div>
            )}

            {operators.map((o) => {
              const shifts = entries.filter((e) => e.operatorId === o.id);
              const totalSalary = shifts.reduce((s, e) => s + e.operatorSalary, 0);
              return (
                <div key={o.id} className="stat-card flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{o.name}</p>
                    <p className="text-xs text-muted-foreground">{o.phone || "No phone"} · Normal ₹{o.normalShiftSalary || o.hourlySalaryRate} / Single ₹{o.singleShiftSalary} · {shifts.length} shifts</p>
                    {totalSalary > 0 && <p className="text-xs text-warning">Total Salary: ₹{totalSalary.toLocaleString()}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEditOp(o)} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => { deleteOperator(o.id); setOperators(getOperators()); }} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              );
            })}
            {operators.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No operators yet.</p>}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
