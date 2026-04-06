import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "../components/AppLayout";
import { useState } from "react";
import { getJCBLogs, saveJCBLog, type JCBLog } from "../lib/store";
import { Plus, Clock, Search } from "lucide-react";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/jcb")({
  component: JCBPage,
});

function JCBPage() {
  const [logs, setLogs] = useState<JCBLog[]>(getJCBLogs);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [hourlyRate, setHourlyRate] = useState("800");
  const [notes, setNotes] = useState("");

  const sorted = [...logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const filtered = sorted.filter((l) => l.date.includes(search) || l.notes.toLowerCase().includes(search.toLowerCase()));

  const calcHours = () => {
    if (!startTime || !endTime) return 0;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const diff = (eh * 60 + em - sh * 60 - sm) / 60;
    return Math.max(0, Math.round(diff * 100) / 100);
  };

  const totalHours = calcHours();
  const totalCost = totalHours * Number(hourlyRate || 0);

  const handleSave = () => {
    if (!startTime || !endTime || totalHours <= 0) return;
    saveJCBLog({ date, startTime, endTime, totalHours, hourlyRate: Number(hourlyRate), totalCost, notes: notes.trim() });
    setLogs(getJCBLogs());
    setShowForm(false);
    setStartTime("");
    setEndTime("");
    setNotes("");
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="module-header mb-0">JCB Tracker</h1>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Log
          </button>
        </div>

        {showForm && (
          <div className="stat-card space-y-3">
            <h3 className="text-sm font-semibold text-foreground">New JCB Log</h3>
            <div>
              <label className="field-label">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Start Time</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="field-label">End Time</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="field-label">Hourly Rate (₹)</label>
              <input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            {totalHours > 0 && (
              <div className="rounded-md bg-primary/10 border border-primary/20 p-3 text-sm">
                <p className="text-muted-foreground">Hours: <span className="font-semibold text-foreground">{totalHours}h</span></p>
                <p className="text-muted-foreground">Total: <span className="font-bold text-primary">₹{totalCost.toLocaleString()}</span></p>
              </div>
            )}
            <div>
              <label className="field-label">Notes</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Save</button>
              <button onClick={() => setShowForm(false)} className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-muted transition-colors">Cancel</button>
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search logs..." className="w-full rounded-md border border-input bg-secondary pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <div className="space-y-2">
          {filtered.map((log) => (
            <div key={log.id} className="stat-card flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" /> {log.startTime} – {log.endTime}</p>
                <p className="text-xs text-muted-foreground">{format(parseISO(log.date + "T00:00:00"), "dd MMM yyyy")} · {log.totalHours}h @ ₹{log.hourlyRate}/hr</p>
                {log.notes && <p className="text-xs text-muted-foreground mt-0.5">{log.notes}</p>}
              </div>
              <p className="font-bold text-primary">₹{log.totalCost.toLocaleString()}</p>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No JCB logs yet.</p>}
        </div>
      </div>
    </AppLayout>
  );
}
