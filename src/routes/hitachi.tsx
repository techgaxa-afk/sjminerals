import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState } from "react";
import {
  getHitachiMachines, saveHitachiMachine, updateHitachiMachine, deleteHitachiMachine,
  getHitachiEntries, saveHitachiEntry, getHitachiEntriesByMachine,
  getHitachiFuel, saveHitachiFuel,
  getOperators, saveOperator, deleteOperator,
  type HitachiMachine, type HitachiEntry, type HitachiFuel, type Operator,
} from "../lib/store";
import { Plus, Search, Settings, Fuel, Users, Clock, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
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
  const [entryMachineId, setEntryMachineId] = useState("");
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startKM, setStartKM] = useState("");
  const [endKM, setEndKM] = useState("");
  const [entryOperatorId, setEntryOperatorId] = useState("");
  const [entryShift, setEntryShift] = useState<"day" | "night">("day");
  const [entryNotes, setEntryNotes] = useState("");

  // Machine form
  const [showMachineForm, setShowMachineForm] = useState(false);
  const [machineName, setMachineName] = useState("");
  const [machineRate, setMachineRate] = useState("");

  // Fuel form
  const [showFuelForm, setShowFuelForm] = useState(false);
  const [fuelMachineId, setFuelMachineId] = useState("");
  const [fuelLiters, setFuelLiters] = useState("");
  const [fuelKM, setFuelKM] = useState("");
  const [fuelDate, setFuelDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Operator form
  const [showOperatorForm, setShowOperatorForm] = useState(false);
  const [opName, setOpName] = useState("");
  const [opPhone, setOpPhone] = useState("");

  // Expanded machine
  const [expandedMachine, setExpandedMachine] = useState<string | null>(null);

  const totalKM = Number(endKM || 0) - Number(startKM || 0);

  const handleSaveEntry = () => {
    if (!entryMachineId || !startKM || !endKM || totalKM <= 0) return;
    const machine = machines.find((m) => m.id === entryMachineId);
    const operator = operators.find((o) => o.id === entryOperatorId);
    saveHitachiEntry({
      machineId: entryMachineId,
      machineName: machine?.name || "",
      date: entryDate,
      startingKM: Number(startKM),
      endingKM: Number(endKM),
      totalKM,
      operatorId: entryOperatorId,
      operatorName: operator?.name || "",
      shift: entryShift,
      notes: entryNotes.trim(),
    });
    setEntries(getHitachiEntries());
    setShowEntryForm(false);
    setStartKM(""); setEndKM(""); setEntryNotes("");
  };

  const handleSaveMachine = () => {
    if (!machineName.trim()) return;
    saveHitachiMachine({ name: machineName.trim(), hourlyRate: Number(machineRate || 0) });
    setMachines(getHitachiMachines());
    setShowMachineForm(false);
    setMachineName(""); setMachineRate("");
  };

  const handleSaveFuel = () => {
    if (!fuelMachineId || !fuelLiters) return;
    const machine = machines.find((m) => m.id === fuelMachineId);
    saveHitachiFuel({ machineId: fuelMachineId, machineName: machine?.name || "", liters: Number(fuelLiters), kmReading: Number(fuelKM || 0), date: fuelDate });
    setFuels(getHitachiFuel());
    setShowFuelForm(false);
    setFuelLiters(""); setFuelKM("");
  };

  const handleSaveOperator = () => {
    if (!opName.trim()) return;
    saveOperator({ name: opName.trim(), phone: opPhone.trim() });
    setOperators(getOperators());
    setShowOperatorForm(false);
    setOpName(""); setOpPhone("");
  };

  const sortedEntries = [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const filteredEntries = sortedEntries.filter((e) => e.machineName.toLowerCase().includes(search.toLowerCase()) || e.operatorName.toLowerCase().includes(search.toLowerCase()));

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

        {/* Tabs */}
        <div className="flex gap-1 rounded-md bg-secondary p-1 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* Daily Entries Tab */}
        {tab === "entries" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 mr-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search entries..." className="w-full rounded-md border border-input bg-secondary pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <button onClick={() => setShowEntryForm(!showEntryForm)} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Log</button>
            </div>

            {showEntryForm && (
              <div className="stat-card space-y-3">
                <h3 className="text-sm font-semibold text-foreground">New Daily Entry</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="field-label">Machine *</label>
                    <select value={entryMachineId} onChange={(e) => setEntryMachineId(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">Select...</option>
                      {machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div><label className="field-label">Date</label><input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="field-label">Start KM</label><input type="number" value={startKM} onChange={(e) => setStartKM(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  <div><label className="field-label">End KM</label><input type="number" value={endKM} onChange={(e) => setEndKM(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  <div><label className="field-label">Total KM</label><div className="rounded-md bg-primary/10 border border-primary/20 px-3 py-2 text-sm font-bold text-primary">{totalKM > 0 ? totalKM : "—"}</div></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="field-label">Operator</label>
                    <select value={entryOperatorId} onChange={(e) => setEntryOperatorId(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">Select...</option>
                      {operators.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                  <div><label className="field-label">Shift</label>
                    <div className="flex gap-2">
                      <button onClick={() => setEntryShift("day")} className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${entryShift === "day" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>Day</button>
                      <button onClick={() => setEntryShift("night")} className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${entryShift === "night" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>Night</button>
                    </div>
                  </div>
                </div>
                <div><label className="field-label">Notes</label><input value={entryNotes} onChange={(e) => setEntryNotes(e.target.value)} placeholder="Optional" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                <div className="flex gap-2">
                  <button onClick={handleSaveEntry} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Save</button>
                  <button onClick={() => setShowEntryForm(false)} className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-muted">Cancel</button>
                </div>
              </div>
            )}

            {filteredEntries.map((e) => (
              <div key={e.id} className="stat-card flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{e.machineName}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(e.date + "T00:00:00"), "dd MMM yyyy")} · {e.shift === "day" ? "☀️" : "🌙"} {e.shift} shift</p>
                  <p className="text-xs text-muted-foreground">{e.startingKM} → {e.endingKM} KM · Operator: {e.operatorName || "—"}</p>
                  {e.notes && <p className="text-xs text-muted-foreground mt-0.5">{e.notes}</p>}
                </div>
                <p className="font-bold text-primary">{e.totalKM} KM</p>
              </div>
            ))}
            {filteredEntries.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No entries yet.</p>}
          </div>
        )}

        {/* Machines Tab */}
        {tab === "machines" && (
          <div className="space-y-3">
            <button onClick={() => setShowMachineForm(!showMachineForm)} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Add Machine</button>

            {showMachineForm && (
              <div className="stat-card space-y-3">
                <h3 className="text-sm font-semibold text-foreground">New Machine</h3>
                <input value={machineName} onChange={(e) => setMachineName(e.target.value)} placeholder="Machine Name/ID *" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="number" value={machineRate} onChange={(e) => setMachineRate(e.target.value)} placeholder="Hourly Rate (₹)" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <button onClick={handleSaveMachine} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Save</button>
              </div>
            )}

            {machines.map((m) => {
              const isExp = expandedMachine === m.id;
              const mEntries = isExp ? getHitachiEntriesByMachine(m.id) : [];
              const mFuels = isExp ? fuels.filter((f) => f.machineId === m.id) : [];
              const totalKM = mEntries.reduce((s, e) => s + e.totalKM, 0);
              const totalFuel = mFuels.reduce((s, f) => s + f.liters, 0);
              return (
                <div key={m.id} className="stat-card">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedMachine(isExp ? null : m.id)}>
                    <div>
                      <p className="font-medium text-foreground flex items-center gap-2"><Settings className="h-4 w-4 text-primary" /> {m.name}</p>
                      <p className="text-xs text-muted-foreground">₹{m.hourlyRate}/hr</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); deleteHitachiMachine(m.id); setMachines(getHitachiMachines()); }} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                      {isExp ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                  {isExp && (
                    <div className="mt-3 border-t border-border pt-3 grid grid-cols-3 gap-2">
                      <div className="rounded-md bg-secondary p-2 text-center"><p className="text-xs text-muted-foreground">Total KM</p><p className="font-bold text-sm text-foreground">{totalKM}</p></div>
                      <div className="rounded-md bg-secondary p-2 text-center"><p className="text-xs text-muted-foreground">Fuel Used</p><p className="font-bold text-sm text-foreground">{totalFuel}L</p></div>
                      <div className="rounded-md bg-secondary p-2 text-center"><p className="text-xs text-muted-foreground">Entries</p><p className="font-bold text-sm text-foreground">{mEntries.length}</p></div>
                    </div>
                  )}
                </div>
              );
            })}
            {machines.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No machines yet.</p>}
          </div>
        )}

        {/* Fuel Tab */}
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
                  <div><label className="field-label">KM Reading</label><input type="number" value={fuelKM} onChange={(e) => setFuelKM(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                </div>
                <div><label className="field-label">Date</label><input type="date" value={fuelDate} onChange={(e) => setFuelDate(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                <button onClick={handleSaveFuel} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Save</button>
              </div>
            )}

            {[...fuels].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((f) => (
              <div key={f.id} className="stat-card flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground flex items-center gap-2"><Fuel className="h-4 w-4 text-chart-3" /> {f.machineName}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(f.date + "T00:00:00"), "dd MMM yyyy")} · KM: {f.kmReading}</p>
                </div>
                <p className="font-bold text-foreground">{f.liters}L</p>
              </div>
            ))}
            {fuels.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No fuel entries.</p>}
          </div>
        )}

        {/* Operators Tab */}
        {tab === "operators" && (
          <div className="space-y-3">
            <button onClick={() => setShowOperatorForm(!showOperatorForm)} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Add Operator</button>

            {showOperatorForm && (
              <div className="stat-card space-y-3">
                <h3 className="text-sm font-semibold text-foreground">New Operator</h3>
                <input value={opName} onChange={(e) => setOpName(e.target.value)} placeholder="Operator Name *" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <input value={opPhone} onChange={(e) => setOpPhone(e.target.value)} placeholder="Phone" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <button onClick={handleSaveOperator} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Save</button>
              </div>
            )}

            {operators.map((o) => {
              const shifts = entries.filter((e) => e.operatorId === o.id);
              return (
                <div key={o.id} className="stat-card flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{o.name}</p>
                    <p className="text-xs text-muted-foreground">{o.phone || "No phone"} · {shifts.length} shifts</p>
                  </div>
                  <button onClick={() => { deleteOperator(o.id); setOperators(getOperators()); }} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
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
