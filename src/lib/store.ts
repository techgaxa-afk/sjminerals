import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

// ============ Types (unchanged shape) ============
export interface Product {
  id: string; name: string; price: number; unit: string;
  tipsEnabled: boolean; tipsRate: number; createdAt: string;
}
export interface Company {
  id: string; name: string; contactNumber: string;
  address: string; notes: string; openingBalance: number; createdAt: string;
}
export interface Vehicle {
  id: string; companyId: string; vehicleNumber: string;
  vehicleCapacity: number; driverName: string; status: "active" | "inactive" | "maintenance"; createdAt: string;
}
export interface CreditAdjustment {
  id: string; companyId: string; amount: number; reason: string; date: string; createdAt: string;
}

export interface BillItem {
  productId: string; productName: string; price: number; quantity: number;
  total: number; tipsRate: number; tipsAmount: number;
}
export interface Bill {
  id: string; invoiceNumber: string; items: BillItem[]; totalAmount: number;
  paymentMode: "cash" | "upi" | "credit" | "split";
  paidAmount: number; outstandingAmount: number;
  companyId: string; companyName: string; driverName: string;
  vehicleNumber: string; vehicleCapacity: number;
  tipsRate: number; tipsAmount: number;
  splitPayment?: boolean; cashAmount?: number; upiAmount?: number;
  passEnabled?: boolean; passAmount?: number;
  createdAt: string;
}
export interface Payment {
  id: string; billId: string; companyId: string; amount: number;
  date: string; notes: string; createdAt: string;
}
export interface HitachiMachine { id: string; name: string; hourlyRate: number; createdAt: string; }
export interface Operator { id: string; name: string; phone: string; hourlySalaryRate: number; createdAt: string; }
export interface HitachiEntry {
  id: string; machineId: string; machineName: string; date: string;
  startingHours: number; endingHours: number; totalHours: number;
  operatorId: string; operatorName: string; shift: "A" | "B";
  machineRevenue: number; operatorSalary: number; notes: string; createdAt: string;
}
export interface HitachiFuel {
  id: string; machineId: string; machineName: string; liters: number;
  hourReading: number; date: string; createdAt: string;
}
export type ExpenseCategory = "fuel" | "salary" | "maintenance" | "miscellaneous" | "tips" | "food";
export interface Expense {
  id: string; category: ExpenseCategory; amount: number; date: string; notes: string;
  linkedBillId?: string; linkedCompanyId?: string; linkedOperatorId?: string; linkedMachineId?: string;
  createdAt: string;
}
export interface JCBLog {
  id: string; date: string; startTime: string; endTime: string;
  totalHours: number; hourlyRate: number; totalCost: number; notes: string; createdAt: string;
}

// ============ Cache + subscriptions ============
type Cache = {
  products: Product[];
  companies: Company[];
  vehicles: Vehicle[];
  bills: Omit<Bill, "items">[];
  billItems: (BillItem & { id: string; billId: string })[];
  payments: Payment[];
  hitachi_machines: HitachiMachine[];
  hitachi_entries: HitachiEntry[];
  hitachi_fuel: HitachiFuel[];
  operators: Operator[];
  expenses: Expense[];
  credit_adjustments: CreditAdjustment[];
};
const cache: Cache = {
  products: [], companies: [], vehicles: [], bills: [], billItems: [], payments: [],
  hitachi_machines: [], hitachi_entries: [], hitachi_fuel: [], operators: [], expenses: [],
  credit_adjustments: [],
};
let version = 0;
const listeners = new Set<() => void>();
function bump() { version++; listeners.forEach((l) => l()); }
function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
function getVersion() { return version; }
export function useCloudData(): number {
  return useSyncExternalStore(subscribe, getVersion, getVersion);
}

// ===== Error toast bridge (subscribed by AppLayout) =====
type WriteErrorListener = (msg: string) => void;
const errorListeners = new Set<WriteErrorListener>();
export function onWriteError(l: WriteErrorListener) { errorListeners.add(l); return () => { errorListeners.delete(l); }; }
function emitError(msg: string) { errorListeners.forEach((l) => { try { l(msg); } catch { /* noop */ } }); }

function uid(): string {
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return (crypto as any).randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0; const v = c === "x" ? r : (r & 0x3) | 0x8; return v.toString(16);
  });
}


// ============ Mappers (db <-> ts) ============
const mapProduct = (r: any): Product => ({
  id: r.id, name: r.name, price: Number(r.price), unit: r.unit,
  tipsEnabled: !!r.tips_enabled, tipsRate: Number(r.tips_rate) || 0, createdAt: r.created_at,
});
const productToDb = (p: Product) => ({
  id: p.id, name: p.name, price: p.price, unit: p.unit,
  tips_enabled: p.tipsEnabled, tips_rate: p.tipsRate,
});
const mapCompany = (r: any): Company => ({
  id: r.id, name: r.name, contactNumber: r.contact_number ?? "",
  address: r.address ?? "", notes: r.notes ?? "",
  openingBalance: Number(r.opening_balance) || 0, createdAt: r.created_at,
});
const companyToDb = (c: Company) => ({
  id: c.id, name: c.name, contact_number: c.contactNumber,
  address: c.address ?? "", notes: c.notes ?? "",
  opening_balance: c.openingBalance || 0,
});
const mapVehicle = (r: any): Vehicle => ({
  id: r.id, companyId: r.company_id, vehicleNumber: r.vehicle_number,
  vehicleCapacity: Number(r.vehicle_capacity) || 0, driverName: r.driver_name ?? "",
  status: r.status === "inactive" ? "inactive" : r.status === "maintenance" ? "maintenance" : "active",
  createdAt: r.created_at,
});
const vehicleToDb = (v: Vehicle) => ({
  id: v.id, company_id: v.companyId, vehicle_number: v.vehicleNumber,
  vehicle_capacity: v.vehicleCapacity, driver_name: v.driverName,
  status: v.status || "active",
});
const mapCreditAdjustment = (r: any): CreditAdjustment => ({
  id: r.id, companyId: r.company_id, amount: Number(r.amount) || 0,
  reason: r.reason ?? "", date: r.date, createdAt: r.created_at,
});
const creditAdjustmentToDb = (a: CreditAdjustment) => ({
  id: a.id, company_id: a.companyId, amount: a.amount, reason: a.reason, date: a.date,
});

const mapBill = (r: any): Omit<Bill, "items"> => ({
  id: r.id, invoiceNumber: r.invoice_number ?? "",
  totalAmount: Number(r.total_amount) || 0, paymentMode: r.payment_mode,
  paidAmount: Number(r.paid_amount) || 0, outstandingAmount: Number(r.outstanding_amount) || 0,
  companyId: r.company_id, companyName: r.company_name, driverName: r.driver_name ?? "",
  vehicleNumber: r.vehicle_number, vehicleCapacity: Number(r.vehicle_capacity) || 0,
  tipsRate: Number(r.tips_rate) || 0, tipsAmount: Number(r.tips_amount) || 0,
  splitPayment: !!r.split_payment, cashAmount: Number(r.cash_amount) || 0, upiAmount: Number(r.upi_amount) || 0,
  passEnabled: !!r.pass_enabled, passAmount: Number(r.pass_amount) || 0,
  createdAt: r.created_at,
});
const billToDb = (b: Omit<Bill, "items">) => ({
  id: b.id, invoice_number: b.invoiceNumber || null,
  total_amount: b.totalAmount, payment_mode: b.paymentMode,
  paid_amount: b.paidAmount, outstanding_amount: b.outstandingAmount,
  company_id: b.companyId, company_name: b.companyName, driver_name: b.driverName,
  vehicle_number: b.vehicleNumber, vehicle_capacity: b.vehicleCapacity,
  tips_rate: b.tipsRate, tips_amount: b.tipsAmount,
  split_payment: !!b.splitPayment, cash_amount: b.cashAmount ?? 0, upi_amount: b.upiAmount ?? 0,
  pass_enabled: !!b.passEnabled, pass_amount: b.passAmount ?? 0,
});
const mapBillItem = (r: any) => ({
  id: r.id, billId: r.bill_id, productId: r.product_id ?? "", productName: r.product_name,
  price: Number(r.price) || 0, quantity: Number(r.quantity) || 0, total: Number(r.total) || 0,
  tipsRate: Number(r.tips_rate) || 0, tipsAmount: Number(r.tips_amount) || 0,
});
const billItemToDb = (i: BillItem & { id: string; billId: string }) => ({
  id: i.id, bill_id: i.billId, product_id: i.productId || null, product_name: i.productName,
  price: i.price, quantity: i.quantity, total: i.total, tips_rate: i.tipsRate, tips_amount: i.tipsAmount,
});
const mapPayment = (r: any): Payment => ({
  id: r.id, billId: r.bill_id, companyId: r.company_id, amount: Number(r.amount) || 0,
  date: r.date, notes: r.notes ?? "", createdAt: r.created_at,
});
const paymentToDb = (p: Payment) => ({
  id: p.id, bill_id: p.billId, company_id: p.companyId, amount: p.amount, date: p.date, notes: p.notes,
});
const mapMachine = (r: any): HitachiMachine => ({
  id: r.id, name: r.name, hourlyRate: Number(r.hourly_rate) || 0, createdAt: r.created_at,
});
const machineToDb = (m: HitachiMachine) => ({ id: m.id, name: m.name, hourly_rate: m.hourlyRate });
const mapOperator = (r: any): Operator => ({
  id: r.id, name: r.name, phone: r.phone ?? "", hourlySalaryRate: Number(r.hourly_salary_rate) || 0, createdAt: r.created_at,
});
const operatorToDb = (o: Operator) => ({ id: o.id, name: o.name, phone: o.phone, hourly_salary_rate: o.hourlySalaryRate });
const mapEntry = (r: any): HitachiEntry => ({
  id: r.id, machineId: r.machine_id, machineName: r.machine_name, date: r.date,
  startingHours: Number(r.starting_hours) || 0, endingHours: Number(r.ending_hours) || 0,
  totalHours: Number(r.total_hours) || 0,
  operatorId: r.operator_id ?? "", operatorName: r.operator_name ?? "",
  shift: r.shift === "B" ? "B" : "A",
  machineRevenue: Number(r.machine_revenue) || 0, operatorSalary: Number(r.operator_salary) || 0,
  notes: r.notes ?? "", createdAt: r.created_at,
});
const entryToDb = (e: HitachiEntry) => ({
  id: e.id, machine_id: e.machineId, machine_name: e.machineName, date: e.date,
  starting_hours: e.startingHours, ending_hours: e.endingHours, total_hours: e.totalHours,
  operator_id: e.operatorId || null, operator_name: e.operatorName,
  shift: e.shift, machine_revenue: e.machineRevenue, operator_salary: e.operatorSalary, notes: e.notes,
});
const mapFuel = (r: any): HitachiFuel => ({
  id: r.id, machineId: r.machine_id, machineName: r.machine_name,
  liters: Number(r.liters) || 0, hourReading: Number(r.hour_reading) || 0,
  date: r.date, createdAt: r.created_at,
});
const fuelToDb = (f: HitachiFuel) => ({
  id: f.id, machine_id: f.machineId, machine_name: f.machineName,
  liters: f.liters, hour_reading: f.hourReading, date: f.date,
});
const mapExpense = (r: any): Expense => ({
  id: r.id, category: r.category, amount: Number(r.amount) || 0, date: r.date, notes: r.notes ?? "",
  linkedBillId: r.linked_bill_id ?? undefined, linkedCompanyId: r.linked_company_id ?? undefined,
  linkedOperatorId: r.linked_operator_id ?? undefined, linkedMachineId: r.linked_machine_id ?? undefined,
  createdAt: r.created_at,
});
const expenseToDb = (e: Expense) => ({
  id: e.id, category: e.category, amount: e.amount, date: e.date, notes: e.notes,
  linked_bill_id: e.linkedBillId || null, linked_company_id: e.linkedCompanyId || null,
  linked_operator_id: e.linkedOperatorId || null, linked_machine_id: e.linkedMachineId || null,
});

// ============ Bootstrap (cloud load + realtime) ============
let loaded = false;
let loadingPromise: Promise<void> | null = null;
export function isLoaded() { return loaded; }
export async function loadAll(): Promise<void> {
  if (loaded) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const [
      products, companies, vehicles, bills, billItems, payments, machines, operators, entries, fuel, expenses, adjustments,
    ] = await Promise.all([
      supabase.from("products").select("*"),
      supabase.from("companies").select("*"),
      supabase.from("vehicles").select("*"),
      supabase.from("bills").select("*"),
      supabase.from("bill_items").select("*"),
      supabase.from("payments").select("*"),
      supabase.from("hitachi_machines").select("*"),
      supabase.from("operators").select("*"),
      supabase.from("hitachi_entries").select("*"),
      supabase.from("hitachi_fuel").select("*"),
      supabase.from("expenses").select("*"),
      supabase.from("credit_adjustments").select("*"),
    ]);
    cache.products = (products.data ?? []).map(mapProduct);
    cache.companies = (companies.data ?? []).map(mapCompany);
    cache.vehicles = (vehicles.data ?? []).map(mapVehicle);
    cache.bills = (bills.data ?? []).map(mapBill);
    cache.billItems = (billItems.data ?? []).map(mapBillItem);
    cache.payments = (payments.data ?? []).map(mapPayment);
    cache.hitachi_machines = (machines.data ?? []).map(mapMachine);
    cache.operators = (operators.data ?? []).map(mapOperator);
    cache.hitachi_entries = (entries.data ?? []).map(mapEntry);
    cache.hitachi_fuel = (fuel.data ?? []).map(mapFuel);
    cache.expenses = (expenses.data ?? []).map(mapExpense);
    cache.credit_adjustments = (adjustments.data ?? []).map(mapCreditAdjustment);
    loaded = true;
    bump();
    setupRealtime();
  })();
  return loadingPromise;
}


let realtimeReady = false;
function setupRealtime() {
  if (realtimeReady) return;
  realtimeReady = true;
  const tables: Array<{ table: keyof Cache | string; map: (r: any) => any; key: keyof Cache }> = [
    { table: "products", map: mapProduct, key: "products" },
    { table: "companies", map: mapCompany, key: "companies" },
    { table: "vehicles", map: mapVehicle, key: "vehicles" },
    { table: "bills", map: mapBill, key: "bills" },
    { table: "bill_items", map: mapBillItem, key: "billItems" },
    { table: "payments", map: mapPayment, key: "payments" },
    { table: "hitachi_machines", map: mapMachine, key: "hitachi_machines" },
    { table: "hitachi_entries", map: mapEntry, key: "hitachi_entries" },
    { table: "hitachi_fuel", map: mapFuel, key: "hitachi_fuel" },
    { table: "operators", map: mapOperator, key: "operators" },
    { table: "expenses", map: mapExpense, key: "expenses" },
    { table: "credit_adjustments", map: mapCreditAdjustment, key: "credit_adjustments" },
  ];
  for (const t of tables) {
    supabase.channel(`rt-${t.table}`).on(
      "postgres_changes",
      { event: "*", schema: "public", table: t.table as string },
      (payload: any) => {
        const arr = cache[t.key] as any[];
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const row = t.map(payload.new);
          const idx = arr.findIndex((x: any) => x.id === row.id);
          if (idx >= 0) arr[idx] = row; else arr.push(row);
        } else if (payload.eventType === "DELETE") {
          const id = payload.old?.id;
          const idx = arr.findIndex((x: any) => x.id === id);
          if (idx >= 0) arr.splice(idx, 1);
        }
        bump();
      },
    ).subscribe();
  }
}

export function resetStore() {
  cache.products = []; cache.companies = []; cache.vehicles = []; cache.bills = []; cache.billItems = [];
  cache.payments = []; cache.hitachi_machines = []; cache.hitachi_entries = [];
  cache.hitachi_fuel = []; cache.operators = []; cache.expenses = []; cache.credit_adjustments = [];
  loaded = false; loadingPromise = null;
  bump();
}

// Fire-and-forget write helper. On failure: surface a toast via emitError + log.
// (Realtime will reconcile cache from server state on reconnect.)
function bg(promise: any, label = "save"): void {
  Promise.resolve(promise)
    .then((res: any) => {
      if (res?.error) {
        console.error(`[store:${label}]`, res.error);
        emitError(res.error.message || `Cloud ${label} failed`);
      }
    })
    .catch((e) => {
      console.error(`[store:${label}]`, e);
      emitError(e?.message || `Cloud ${label} failed`);
    });
}


// ============ Products ============
export function getProducts(): Product[] { return cache.products.slice(); }
export function saveProduct(p: Omit<Product, "id" | "createdAt">): Product {
  const product: Product = { ...p, id: uid(), createdAt: new Date().toISOString() };
  cache.products.push(product); bump();
  bg(supabase.from("products").insert(productToDb(product)));
  return product;
}
export function updateProduct(id: string, updates: Partial<Product>): void {
  cache.products = cache.products.map((p) => (p.id === id ? { ...p, ...updates } : p));
  bump();
  const merged = cache.products.find((p) => p.id === id);
  if (merged) bg(supabase.from("products").update(productToDb(merged)).eq("id", id));
}
export function deleteProduct(id: string): void {
  cache.products = cache.products.filter((p) => p.id !== id); bump();
  bg(supabase.from("products").delete().eq("id", id));
}

// ============ Companies ============
export function getCompanies(): Company[] { return cache.companies.slice(); }
export async function saveCompany(c: Omit<Company, "id" | "createdAt">): Promise<Company> {
  // Duplicate-name guard (case-insensitive, trimmed)
  const normalized = c.name.trim().toLowerCase();
  if (!normalized) throw new Error("Company name is required");
  const dup = cache.companies.find((x) => x.name.trim().toLowerCase() === normalized);
  if (dup) throw new Error(`Company "${dup.name}" already exists`);

  const company: Company = { ...c, name: c.name.trim(), id: uid(), createdAt: new Date().toISOString() };
  const payload = companyToDb(company);
  console.log("[COMPANY STEP 1] inserting company", payload);
  const insertRes = await supabase.from("companies").insert(payload).select("id").single();
  if (insertRes.error) {
    console.error("COMPANY INSERT FAILED", insertRes.error);
    emitError(insertRes.error.message || "Company insert failed");
    throw insertRes.error;
  }
  console.log("[COMPANY STEP 2] company inserted", insertRes.data?.id);
  const verify = await supabase.from("companies").select("id").eq("id", company.id).single();
  if (verify.error) {
    console.error("COMPANY VERIFY FAILED", verify.error);
    emitError(verify.error.message || "Company verify failed");
    throw verify.error;
  }
  console.log("[COMPANY STEP 3] company verified", verify.data);
  cache.companies.push(company); bump();
  return company;
}

export function updateCompany(id: string, updates: Partial<Company>): void {
  cache.companies = cache.companies.map((c) => (c.id === id ? { ...c, ...updates } : c));
  bump();
  const merged = cache.companies.find((c) => c.id === id);
  if (merged) bg(supabase.from("companies").update(companyToDb(merged)).eq("id", id));
}
export async function deleteCompany(id: string): Promise<void> {
  const billCount = cache.bills.filter((b) => b.companyId === id).length;
  if (billCount > 0) {
    throw new Error(`Cannot delete: ${billCount} bill${billCount === 1 ? "" : "s"} linked to this company. Delete the bills first.`);
  }
  const res = await supabase.from("companies").delete().eq("id", id);
  if (res.error) {
    const msg = res.error.code === "23503"
      ? "Cannot delete: bills or payments reference this company."
      : res.error.message || "Delete failed";
    emitError(msg);
    throw new Error(msg);
  }
  cache.companies = cache.companies.filter((c) => c.id !== id);
  bump();
}
export function getCompanyByVehicle(vehicleNumber: string): Company | undefined {
  const v = cache.vehicles.find((x) => x.vehicleNumber.toLowerCase() === vehicleNumber.toLowerCase());
  if (v) return cache.companies.find((c) => c.id === v.companyId);
  return undefined;
}

// ============ Vehicles ============
export function getVehicles(): Vehicle[] { return cache.vehicles.slice(); }
export function getVehiclesByCompany(companyId: string): Vehicle[] {
  return cache.vehicles.filter((v) => v.companyId === companyId);
}
export function getVehicleByNumber(vehicleNumber: string): Vehicle | undefined {
  return cache.vehicles.find((v) => v.vehicleNumber.toLowerCase() === vehicleNumber.toLowerCase());
}
function isDuplicateVehicle(companyId: string, vehicleNumber: string, excludeId?: string): boolean {
  const vn = vehicleNumber.trim().toLowerCase();
  return cache.vehicles.some(
    (x) => x.companyId === companyId && x.vehicleNumber.trim().toLowerCase() === vn && x.id !== excludeId,
  );
}
export async function saveVehicle(v: Omit<Vehicle, "id" | "createdAt">): Promise<Vehicle> {
  const trimmedNumber = v.vehicleNumber.trim();
  if (!trimmedNumber) throw new Error("Vehicle number is required");
  if (isDuplicateVehicle(v.companyId, trimmedNumber)) {
    throw new Error("Vehicle number already exists for this company");
  }
  const vehicle: Vehicle = { ...v, vehicleNumber: trimmedNumber, id: uid(), createdAt: new Date().toISOString() };
  const payload = vehicleToDb(vehicle);
  const insertRes = await supabase.from("vehicles").insert(payload).select("id").single();
  if (insertRes.error) {
    console.error("VEHICLE INSERT FAILED", insertRes.error);
    const msg = insertRes.error.code === "23505"
      ? "Vehicle number already exists for this company"
      : insertRes.error.message || "Vehicle insert failed";
    emitError(msg);
    throw new Error(msg);
  }
  const verify = await supabase.from("vehicles").select("id").eq("id", vehicle.id).single();
  if (verify.error) {
    emitError(verify.error.message || "Vehicle verify failed");
    throw verify.error;
  }
  cache.vehicles.push(vehicle); bump();
  return vehicle;
}
export function updateVehicle(id: string, updates: Partial<Vehicle>): void {
  const existing = cache.vehicles.find((v) => v.id === id);
  if (!existing) return;
  const nextNumber = (updates.vehicleNumber ?? existing.vehicleNumber).trim();
  const nextCompanyId = updates.companyId ?? existing.companyId;
  if (!nextNumber) throw new Error("Vehicle number is required");
  if (isDuplicateVehicle(nextCompanyId, nextNumber, id)) {
    throw new Error("Vehicle number already exists for this company");
  }
  const normalized = { ...updates, vehicleNumber: nextNumber };
  cache.vehicles = cache.vehicles.map((v) => (v.id === id ? { ...v, ...normalized } : v));
  bump();
  const merged = cache.vehicles.find((v) => v.id === id);
  if (merged) bg(supabase.from("vehicles").update(vehicleToDb(merged)).eq("id", id));
}
export async function deleteVehicle(id: string): Promise<void> {
  const vehicle = cache.vehicles.find((v) => v.id === id);
  if (vehicle) {
    const billCount = cache.bills.filter(
      (b) => b.companyId === vehicle.companyId
        && (b.vehicleNumber || "").trim().toLowerCase() === vehicle.vehicleNumber.trim().toLowerCase(),
    ).length;
    if (billCount > 0) {
      throw new Error(`Cannot delete: ${billCount} bill${billCount === 1 ? "" : "s"} linked to this vehicle.`);
    }
  }
  const res = await supabase.from("vehicles").delete().eq("id", id);
  if (res.error) {
    emitError(res.error.message || "Delete failed");
    throw new Error(res.error.message || "Delete failed");
  }
  cache.vehicles = cache.vehicles.filter((v) => v.id !== id);
  bump();
}

// Count helpers for delete-warning UI
export function countBillsByCompany(companyId: string): number {
  return cache.bills.filter((b) => b.companyId === companyId).length;
}
export function countBillsByVehicle(companyId: string, vehicleNumber: string): number {
  const vn = (vehicleNumber || "").trim().toLowerCase();
  return cache.bills.filter((b) => b.companyId === companyId && (b.vehicleNumber || "").trim().toLowerCase() === vn).length;
}

// ============ Bills ============
function assembleBill(b: Omit<Bill, "items">): Bill {
  const items = cache.billItems.filter((i) => i.billId === b.id).map((i) => ({
    productId: i.productId, productName: i.productName, price: i.price, quantity: i.quantity,
    total: i.total, tipsRate: i.tipsRate, tipsAmount: i.tipsAmount,
  }));
  return { ...b, items };
}
export function getBills(): Bill[] { return cache.bills.map(assembleBill); }
export function getBillsByCompany(companyId: string): Bill[] {
  return cache.bills.filter((b) => b.companyId === companyId).map(assembleBill);
}
export function getBillsByVehicle(companyId: string, vehicleNumber: string): Bill[] {
  const vn = (vehicleNumber || "").trim().toLowerCase();
  if (!vn) return [];
  return cache.bills
    .filter((b) => b.companyId === companyId && (b.vehicleNumber || "").trim().toLowerCase() === vn)
    .map(assembleBill);
}
export function getVehicleTotals(companyId: string, vehicleNumber: string): { sales: number; paid: number; due: number } {
  const bills = getBillsByVehicle(companyId, vehicleNumber);
  const sales = bills.reduce((s, b) => s + (b.totalAmount || 0), 0);
  const paid = bills.reduce((s, b) => s + (b.paidAmount || 0), 0);
  return { sales, paid, due: Math.max(0, sales - paid) };
}

// Generate invoice number: SSDDMMYYYY (sequence-per-day + DDMMYYYY).
// Increments until unique within current cache.
function nextInvoiceNumber(now: Date): string {
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = String(now.getFullYear());
  const dayKey = `${dd}${mm}${yyyy}`;
  const existing = new Set(cache.bills.map((b) => b.invoiceNumber).filter(Boolean));
  // Start from count-of-bills-today + 1, then bump until unique
  const sameDay = cache.bills.filter((b) => (b.invoiceNumber || "").endsWith(dayKey)).length;
  let seq = sameDay + 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const num = `${String(seq).padStart(2, "0")}${dayKey}`;
    if (!existing.has(num)) return num;
    seq++;
  }
}

export async function saveBill(b: Omit<Bill, "id" | "createdAt" | "invoiceNumber">): Promise<Bill> {
  const { items, ...rest } = b;
  const now = new Date();
  const billRow: Omit<Bill, "items"> = {
    ...rest,
    id: uid(),
    createdAt: now.toISOString(),
    invoiceNumber: nextInvoiceNumber(now),
  };
  const stampedItems = items.map((item) => ({ ...item, id: uid(), billId: billRow.id }));
  const paymentDate = now.toISOString().split("T")[0];
  const paymentRows: Payment[] = [];

  if ((billRow.paidAmount ?? 0) > 0) {
    if (billRow.splitPayment) {
      if ((billRow.cashAmount ?? 0) > 0) {
        paymentRows.push({
          id: uid(),
          billId: billRow.id,
          companyId: billRow.companyId,
          amount: billRow.cashAmount ?? 0,
          date: paymentDate,
          notes: "Initial cash payment",
          createdAt: billRow.createdAt,
        });
      }
      if ((billRow.upiAmount ?? 0) > 0) {
        paymentRows.push({
          id: uid(),
          billId: billRow.id,
          companyId: billRow.companyId,
          amount: billRow.upiAmount ?? 0,
          date: paymentDate,
          notes: "Initial UPI payment",
          createdAt: billRow.createdAt,
        });
      }
    } else {
      paymentRows.push({
        id: uid(),
        billId: billRow.id,
        companyId: billRow.companyId,
        amount: billRow.paidAmount,
        date: paymentDate,
        notes: `Initial ${billRow.paymentMode} payment`,
        createdAt: billRow.createdAt,
      });
    }
  }

  try {
    const payload = billToDb(billRow);
    console.log("[STEP 1] bill insert");
    console.log("[STEP 1 PAYLOAD]", payload);
    const billRes = await supabase
      .from("bills")
      .insert(payload)
      .select("id")
      .single();
    console.log("[STEP 1 RESULT]", billRes);
    if (billRes.error) throw billRes.error;

    const returnedBillId = billRes.data?.id;
    console.log("[RETURNED BILL ID]", returnedBillId);
    if (!returnedBillId) throw new Error("Bill insert returned no id");

    const verify = await supabase
      .from("bills")
      .select("id")
      .eq("id", returnedBillId)
      .single();
    if (verify.error) throw verify.error;
    console.log("[STEP 2] bill verified");
    console.log("[STEP 2 RESULT]", verify.data);

    const itemsPayload = stampedItems.map((item) => billItemToDb({ ...item, billId: returnedBillId }));
    console.log("[BILL ITEMS PAYLOAD]", itemsPayload);
    if (itemsPayload.length > 0) {
      const itemsRes = await supabase
        .from("bill_items")
        .insert(itemsPayload);
      if (itemsRes.error) throw itemsRes.error;
    }
    console.log("[STEP 3] bill items inserted");

    const paymentPayload = paymentRows.map((payment) => paymentToDb({ ...payment, billId: returnedBillId }));
    console.log("[PAYMENT PAYLOAD]", paymentPayload);
    if (paymentPayload.length > 0) {
      const paymentsRes = await supabase
        .from("payments")
        .insert(paymentPayload);
      if (paymentsRes.error) throw paymentsRes.error;
    }
    console.log("[STEP 4] payments inserted");

    if (billRow.companyId) {
      const companyRes = await supabase
        .from("companies")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", billRow.companyId);
      if (companyRes.error) throw companyRes.error;
    }
    console.log("[STEP 5] outstanding updated");

    const persistedBill = { ...billRow, id: returnedBillId };
    const persistedItems = stampedItems.map((item) => ({ ...item, billId: returnedBillId }));
    const persistedPayments = paymentRows.map((payment) => ({ ...payment, billId: returnedBillId }));

    const billIndex = cache.bills.findIndex((row) => row.id === persistedBill.id);
    if (billIndex >= 0) cache.bills[billIndex] = persistedBill;
    else cache.bills.push(persistedBill);

    for (const item of persistedItems) {
      const itemIndex = cache.billItems.findIndex((row) => row.id === item.id);
      if (itemIndex >= 0) cache.billItems[itemIndex] = item;
      else cache.billItems.push(item);
    }

    for (const payment of persistedPayments) {
      const paymentIndex = cache.payments.findIndex((row) => row.id === payment.id);
      if (paymentIndex >= 0) cache.payments[paymentIndex] = payment;
      else cache.payments.push(payment);
    }

    bump();
    return assembleBill(persistedBill);
  } catch (error) {
    console.error("SAVE BILL FAILED", error);
    throw error;
  }
}
export function updateBill(id: string, updates: Partial<Bill>): void {
  const { items, invoiceNumber: _ignore, ...rest } = updates; // invoice number is immutable
  cache.bills = cache.bills.map((b) => (b.id === id ? { ...b, ...rest } : b));
  if (items) {
    cache.billItems = cache.billItems.filter((i) => i.billId !== id);
    const stamped = items.map((i) => ({ ...i, id: uid(), billId: id }));
    cache.billItems.push(...stamped);
    bg((async () => {
      const del = await supabase.from("bill_items").delete().eq("bill_id", id);
      if (del.error) return del;
      if (stamped.length) return supabase.from("bill_items").insert(stamped.map(billItemToDb));
      return { error: null };
    })(), "update-items");
  }
  bump();
  const merged = cache.bills.find((b) => b.id === id);
  if (merged) bg(supabase.from("bills").update(billToDb(merged)).eq("id", id), "bill-update");
}
export function deleteBill(id: string): void {
  cache.bills = cache.bills.filter((b) => b.id !== id);
  cache.billItems = cache.billItems.filter((i) => i.billId !== id);
  cache.expenses = cache.expenses.filter((e) => e.linkedBillId !== id);
  cache.payments = cache.payments.filter((p) => p.billId !== id);
  bump();
  bg(supabase.from("payments").delete().eq("bill_id", id));
  bg(supabase.from("expenses").delete().eq("linked_bill_id", id));
  bg(supabase.from("bill_items").delete().eq("bill_id", id));
  bg(supabase.from("bills").delete().eq("id", id));
}
export function getExpensesByBill(billId: string): Expense[] {
  return cache.expenses.filter((e) => e.linkedBillId === billId);
}

// ============ Payments ============
export function getPayments(): Payment[] { return cache.payments.slice(); }
export function savePayment(p: Omit<Payment, "id" | "createdAt">): Payment {
  const payment: Payment = { ...p, id: uid(), createdAt: new Date().toISOString() };
  cache.payments.push(payment);
  const bill = cache.bills.find((b) => b.id === p.billId);
  if (bill) {
    const newPaid = (bill.paidAmount || 0) + p.amount;
    const newOut = Math.max(0, bill.totalAmount - newPaid);
    cache.bills = cache.bills.map((b) => b.id === p.billId ? { ...b, paidAmount: newPaid, outstandingAmount: newOut } : b);
    bg(supabase.from("bills").update({ paid_amount: newPaid, outstanding_amount: newOut }).eq("id", p.billId), "bill-paid-update");
  }
  bump();
  bg((async () => {
    const payload = paymentToDb(payment);
    console.log("[savePayment] inserting payment for bill", p.billId, payload);
    const res = await supabase.from("payments").insert(payload);
    if (res.error) console.error("[savePayment] payment insert failed", res.error, payload);
    return res;
  })(), "payment");
  return payment;
}
export function getPaymentsByBill(billId: string): Payment[] { return cache.payments.filter((p) => p.billId === billId); }
export function getPaymentsByCompany(companyId: string): Payment[] { return cache.payments.filter((p) => p.companyId === companyId); }

// Allocate a single payment across the company's oldest outstanding bills (FIFO).
// Creates one Payment row per allocated bill so existing per-bill linkage stays intact.
export function saveCompanyPayment(input: { companyId: string; amount: number; date: string; notes: string }): Payment[] {
  let remaining = input.amount;
  const created: Payment[] = [];
  const bills = cache.bills
    .filter((b) => b.companyId === input.companyId && (b.outstandingAmount || 0) > 0)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  for (const b of bills) {
    if (remaining <= 0) break;
    const apply = Math.min(remaining, b.outstandingAmount || 0);
    if (apply <= 0) continue;
    created.push(savePayment({ billId: b.id, companyId: input.companyId, amount: apply, date: input.date, notes: input.notes }));
    remaining -= apply;
  }
  // If anything remains (overpayment / no outstanding bills), record it against the most recent bill, or a standalone row.
  if (remaining > 0) {
    const fallback = cache.bills.filter((b) => b.companyId === input.companyId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    created.push(savePayment({ billId: fallback?.id ?? "", companyId: input.companyId, amount: remaining, date: input.date, notes: input.notes + (fallback ? " (advance)" : " (no bill)") }));
  }
  return created;
}


// ============ Hitachi Machines ============
export function getHitachiMachines(): HitachiMachine[] { return cache.hitachi_machines.slice(); }
export function saveHitachiMachine(m: Omit<HitachiMachine, "id" | "createdAt">): HitachiMachine {
  const machine: HitachiMachine = { ...m, id: uid(), createdAt: new Date().toISOString() };
  cache.hitachi_machines.push(machine); bump();
  bg(supabase.from("hitachi_machines").insert(machineToDb(machine)));
  return machine;
}
export function updateHitachiMachine(id: string, updates: Partial<HitachiMachine>): void {
  cache.hitachi_machines = cache.hitachi_machines.map((m) => (m.id === id ? { ...m, ...updates } : m));
  bump();
  const merged = cache.hitachi_machines.find((m) => m.id === id);
  if (merged) bg(supabase.from("hitachi_machines").update(machineToDb(merged)).eq("id", id));
}
export function deleteHitachiMachine(id: string): void {
  cache.hitachi_machines = cache.hitachi_machines.filter((m) => m.id !== id); bump();
  bg(supabase.from("hitachi_machines").delete().eq("id", id));
}

// ============ Hitachi Entries ============
export function getHitachiEntries(): HitachiEntry[] { return cache.hitachi_entries.slice(); }
export function saveHitachiEntry(e: Omit<HitachiEntry, "id" | "createdAt">): HitachiEntry {
  const entry: HitachiEntry = { ...e, id: uid(), createdAt: new Date().toISOString() };
  cache.hitachi_entries.push(entry); bump();
  bg(supabase.from("hitachi_entries").insert(entryToDb(entry)));
  return entry;
}
export function updateHitachiEntry(id: string, updates: Partial<HitachiEntry>): void {
  cache.hitachi_entries = cache.hitachi_entries.map((e) => (e.id === id ? { ...e, ...updates } : e));
  bump();
  const merged = cache.hitachi_entries.find((e) => e.id === id);
  if (merged) bg(supabase.from("hitachi_entries").update(entryToDb(merged)).eq("id", id));
}
export function deleteHitachiEntry(id: string): void {
  cache.hitachi_entries = cache.hitachi_entries.filter((e) => e.id !== id); bump();
  bg(supabase.from("hitachi_entries").delete().eq("id", id));
}
export function getHitachiEntriesByMachine(machineId: string): HitachiEntry[] {
  return cache.hitachi_entries.filter((e) => e.machineId === machineId);
}

// ============ Hitachi Fuel ============
export function getHitachiFuel(): HitachiFuel[] { return cache.hitachi_fuel.slice(); }
export function saveHitachiFuel(f: Omit<HitachiFuel, "id" | "createdAt">): HitachiFuel {
  const fuel: HitachiFuel = { ...f, id: uid(), createdAt: new Date().toISOString() };
  cache.hitachi_fuel.push(fuel); bump();
  bg(supabase.from("hitachi_fuel").insert(fuelToDb(fuel)));
  return fuel;
}

// ============ Operators ============
export function getOperators(): Operator[] { return cache.operators.slice(); }
export function saveOperator(o: Omit<Operator, "id" | "createdAt">): Operator {
  const operator: Operator = { ...o, id: uid(), createdAt: new Date().toISOString() };
  cache.operators.push(operator); bump();
  bg(supabase.from("operators").insert(operatorToDb(operator)));
  return operator;
}
export function updateOperator(id: string, updates: Partial<Operator>): void {
  cache.operators = cache.operators.map((o) => (o.id === id ? { ...o, ...updates } : o));
  bump();
  const merged = cache.operators.find((o) => o.id === id);
  if (merged) bg(supabase.from("operators").update(operatorToDb(merged)).eq("id", id));
}
export function deleteOperator(id: string): void {
  cache.operators = cache.operators.filter((o) => o.id !== id); bump();
  bg(supabase.from("operators").delete().eq("id", id));
}

// ============ Expenses ============
export function getExpenses(): Expense[] { return cache.expenses.slice(); }
export function saveExpense(e: Omit<Expense, "id" | "createdAt">): Expense {
  const expense: Expense = { ...e, id: uid(), createdAt: new Date().toISOString() };
  cache.expenses.push(expense); bump();
  bg(supabase.from("expenses").insert(expenseToDb(expense)));
  return expense;
}
export function updateExpense(id: string, updates: Partial<Expense>): void {
  cache.expenses = cache.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e));
  bump();
  const merged = cache.expenses.find((e) => e.id === id);
  if (merged) bg(supabase.from("expenses").update(expenseToDb(merged)).eq("id", id));
}
export function deleteExpense(id: string): void {
  cache.expenses = cache.expenses.filter((e) => e.id !== id); bump();
  bg(supabase.from("expenses").delete().eq("id", id));
}

// ============ Credit Adjustments ============
export function getCreditAdjustments(): CreditAdjustment[] { return cache.credit_adjustments.slice(); }
export function getCreditAdjustmentsByCompany(companyId: string): CreditAdjustment[] {
  return cache.credit_adjustments.filter((a) => a.companyId === companyId);
}
export function saveCreditAdjustment(a: Omit<CreditAdjustment, "id" | "createdAt">): CreditAdjustment {
  const adj: CreditAdjustment = { ...a, id: uid(), createdAt: new Date().toISOString() };
  cache.credit_adjustments.push(adj); bump();
  bg(supabase.from("credit_adjustments").insert(creditAdjustmentToDb(adj)), "save adjustment");
  return adj;
}
export function deleteCreditAdjustment(id: string): void {
  cache.credit_adjustments = cache.credit_adjustments.filter((a) => a.id !== id); bump();
  bg(supabase.from("credit_adjustments").delete().eq("id", id), "delete adjustment");
}

// ============ Dashboard helpers ============
export function getDateRange(filter: "daily" | "weekly" | "monthly"): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  if (filter === "daily") start.setHours(0, 0, 0, 0);
  else if (filter === "weekly") start.setDate(start.getDate() - 7);
  else start.setMonth(start.getMonth() - 1);
  return { start, end };
}
// Outstanding = opening balance + Σ bill outstanding + Σ adjustments (signed)
export function getCompanyOutstanding(companyId: string): number {
  const company = cache.companies.find((c) => c.id === companyId);
  const opening = company?.openingBalance || 0;
  const bills = cache.bills.filter((b) => b.companyId === companyId)
    .reduce((s, b) => s + (b.outstandingAmount ?? 0), 0);
  const adj = cache.credit_adjustments.filter((a) => a.companyId === companyId)
    .reduce((s, a) => s + (a.amount ?? 0), 0);
  return opening + bills + adj;
}
export function getJCBLogs(): JCBLog[] { return []; }


// ============ Import / Export ============
export function exportData(): string {
  return JSON.stringify({
    products: getProducts(), bills: getBills(), expenses: getExpenses(),
    companies: getCompanies(), payments: getPayments(),
    hitachiMachines: getHitachiMachines(), hitachiEntries: getHitachiEntries(),
    hitachiFuel: getHitachiFuel(), operators: getOperators(),
    exportedAt: new Date().toISOString(),
  });
}

// One-time push of any localStorage data from this device into cloud
export async function importFromLocalStorage(): Promise<{ inserted: Record<string, number> }> {
  const read = <T,>(k: string): T[] => {
    try { const d = localStorage.getItem(k); return d ? JSON.parse(d) : []; } catch { return []; }
  };
  const out: Record<string, number> = {};

  const lp = read<any>("pos_products");
  if (lp.length) {
    const rows = lp.map((p) => ({
      id: p.id?.length === 36 ? p.id : uid(),
      name: p.name, price: Number(p.price) || 0, unit: p.unit || "load",
      tips_enabled: !!p.tipsEnabled, tips_rate: Number(p.tipsRate) || 0,
    }));
    const { error } = await supabase.from("products").upsert(rows, { onConflict: "id" });
    if (!error) out.products = rows.length;
  }

  const lc = read<any>("pos_companies");
  const companyIdMap = new Map<string, string>();
  if (lc.length) {
    const rows = lc.map((c) => {
      const id = c.id?.length === 36 ? c.id : uid();
      companyIdMap.set(c.id, id);
      return {
        id, name: c.name, driver_name: c.driverName ?? "", vehicle_number: c.vehicleNumber ?? "",
        vehicle_capacity: Number(c.vehicleCapacity) || 0,
        contact_number: c.contactNumber ?? c.contactDetails ?? "",
      };
    });
    const { error } = await supabase.from("companies").upsert(rows, { onConflict: "id" });
    if (!error) out.companies = rows.length;
  }

  const lo = read<any>("pos_operators");
  const operatorIdMap = new Map<string, string>();
  if (lo.length) {
    const rows = lo.map((o) => {
      const id = o.id?.length === 36 ? o.id : uid();
      operatorIdMap.set(o.id, id);
      return { id, name: o.name, phone: o.phone ?? "", hourly_salary_rate: Number(o.hourlySalaryRate) || 0 };
    });
    const { error } = await supabase.from("operators").upsert(rows, { onConflict: "id" });
    if (!error) out.operators = rows.length;
  }

  const lm = read<any>("pos_hitachi_machines");
  const machineIdMap = new Map<string, string>();
  if (lm.length) {
    const rows = lm.map((m) => {
      const id = m.id?.length === 36 ? m.id : uid();
      machineIdMap.set(m.id, id);
      return { id, name: m.name, hourly_rate: Number(m.hourlyRate) || 0 };
    });
    const { error } = await supabase.from("hitachi_machines").upsert(rows, { onConflict: "id" });
    if (!error) out.hitachi_machines = rows.length;
  }

  const lb = read<any>("pos_bills");
  const billIdMap = new Map<string, string>();
  if (lb.length) {
    const billRows = lb.map((b) => {
      const id = b.id?.length === 36 ? b.id : uid();
      billIdMap.set(b.id, id);
      return {
        id, total_amount: Number(b.totalAmount) || 0,
        payment_mode: b.paymentMode || "cash",
        paid_amount: Number(b.paidAmount ?? b.totalAmount) || 0,
        outstanding_amount: Number(b.outstandingAmount) || 0,
        company_id: companyIdMap.get(b.companyId) ?? b.companyId ?? uid(),
        company_name: b.companyName ?? "",
        driver_name: b.driverName ?? "",
        vehicle_number: b.vehicleNumber ?? "",
        vehicle_capacity: Number(b.vehicleCapacity) || 0,
        tips_rate: Number(b.tipsRate) || 0, tips_amount: Number(b.tipsAmount) || 0,
        split_payment: !!b.splitPayment, cash_amount: Number(b.cashAmount) || 0, upi_amount: Number(b.upiAmount) || 0,
        created_at: b.createdAt || new Date().toISOString(),
      };
    });
    const { error } = await supabase.from("bills").upsert(billRows, { onConflict: "id" });
    if (!error) out.bills = billRows.length;

    const itemRows: any[] = [];
    lb.forEach((b: any) => {
      const newBillId = billIdMap.get(b.id)!;
      (b.items || []).forEach((i: any) => {
        itemRows.push({
          id: uid(), bill_id: newBillId, product_id: null,
          product_name: i.productName, price: Number(i.price) || 0,
          quantity: Number(i.quantity) || 0, total: Number(i.total) || 0,
          tips_rate: Number(i.tipsRate) || 0, tips_amount: Number(i.tipsAmount) || 0,
        });
      });
    });
    if (itemRows.length) {
      const { error: e2 } = await supabase.from("bill_items").upsert(itemRows, { onConflict: "id" });
      if (!e2) out.bill_items = itemRows.length;
    }
  }

  const lpay = read<any>("pos_payments");
  if (lpay.length) {
    const rows = lpay.map((p) => ({
      id: p.id?.length === 36 ? p.id : uid(),
      bill_id: billIdMap.get(p.billId) ?? p.billId,
      company_id: companyIdMap.get(p.companyId) ?? p.companyId,
      amount: Number(p.amount) || 0, date: p.date || new Date().toISOString().split("T")[0],
      notes: p.notes ?? "",
    }));
    const { error } = await supabase.from("payments").upsert(rows, { onConflict: "id" });
    if (!error) out.payments = rows.length;
  }

  const le = read<any>("pos_expenses");
  if (le.length) {
    const rows = le.map((e) => ({
      id: e.id?.length === 36 ? e.id : uid(),
      category: e.category, amount: Number(e.amount) || 0,
      date: e.date || new Date().toISOString().split("T")[0], notes: e.notes ?? "",
      linked_bill_id: e.linkedBillId ? (billIdMap.get(e.linkedBillId) ?? e.linkedBillId) : null,
      linked_company_id: e.linkedCompanyId ? (companyIdMap.get(e.linkedCompanyId) ?? e.linkedCompanyId) : null,
      linked_operator_id: e.linkedOperatorId ? (operatorIdMap.get(e.linkedOperatorId) ?? e.linkedOperatorId) : null,
      linked_machine_id: e.linkedMachineId ? (machineIdMap.get(e.linkedMachineId) ?? e.linkedMachineId) : null,
    }));
    const { error } = await supabase.from("expenses").upsert(rows, { onConflict: "id" });
    if (!error) out.expenses = rows.length;
  }

  const lent = read<any>("pos_hitachi_entries");
  if (lent.length) {
    const rows = lent.map((e) => ({
      id: e.id?.length === 36 ? e.id : uid(),
      machine_id: machineIdMap.get(e.machineId) ?? e.machineId,
      machine_name: e.machineName,
      date: e.date || new Date().toISOString().split("T")[0],
      starting_hours: Number(e.startingHours) || 0, ending_hours: Number(e.endingHours) || 0,
      total_hours: Number(e.totalHours) || 0,
      operator_id: e.operatorId ? (operatorIdMap.get(e.operatorId) ?? e.operatorId) : null,
      operator_name: e.operatorName ?? "", shift: e.shift === "B" ? "B" : "A",
      machine_revenue: Number(e.machineRevenue) || 0, operator_salary: Number(e.operatorSalary) || 0,
      notes: e.notes ?? "",
    }));
    const { error } = await supabase.from("hitachi_entries").upsert(rows, { onConflict: "id" });
    if (!error) out.hitachi_entries = rows.length;
  }

  const lf = read<any>("pos_hitachi_fuel");
  if (lf.length) {
    const rows = lf.map((f) => ({
      id: f.id?.length === 36 ? f.id : uid(),
      machine_id: machineIdMap.get(f.machineId) ?? f.machineId,
      machine_name: f.machineName, liters: Number(f.liters) || 0,
      hour_reading: Number(f.hourReading) || 0,
      date: f.date || new Date().toISOString().split("T")[0],
    }));
    const { error } = await supabase.from("hitachi_fuel").upsert(rows, { onConflict: "id" });
    if (!error) out.hitachi_fuel = rows.length;
  }

  localStorage.setItem("pos_cloud_import_done", "1");
  // Reload cache from cloud
  loaded = false; loadingPromise = null;
  await loadAll();
  return { inserted: out };
}

export function hasImportedLocal(): boolean {
  return localStorage.getItem("pos_cloud_import_done") === "1";
}

export function hasLocalDataToImport(): boolean {
  const keys = ["pos_products","pos_companies","pos_bills","pos_payments","pos_expenses","pos_hitachi_machines","pos_hitachi_entries","pos_hitachi_fuel","pos_operators"];
  return keys.some((k) => {
    try { const d = localStorage.getItem(k); return d && JSON.parse(d).length > 0; } catch { return false; }
  });
}
