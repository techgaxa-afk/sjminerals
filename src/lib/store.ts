export interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  tipsEnabled: boolean;
  tipsRate: number; // tips per unit
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  driverName: string;
  vehicleNumber: string; // UNIQUE identifier
  vehicleCapacity: number; // in tons/units
  contactNumber: string;
  createdAt: string;
}

export interface BillItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  total: number;
  tipsRate: number;
  tipsAmount: number;
}

export interface Bill {
  id: string;
  items: BillItem[];
  totalAmount: number;
  paymentMode: "cash" | "upi" | "credit" | "split";
  paidAmount: number;
  outstandingAmount: number;
  companyId: string;
  companyName: string;
  driverName: string;
  vehicleNumber: string;
  vehicleCapacity: number;
  tipsRate: number; // 0 | 50 | 100 per unit
  tipsAmount: number;
  splitPayment?: boolean;
  cashAmount?: number;
  upiAmount?: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  billId: string;
  companyId: string;
  amount: number;
  date: string;
  notes: string;
  createdAt: string;
}

export interface HitachiMachine {
  id: string;
  name: string;
  hourlyRate: number; // earning rate
  createdAt: string;
}

export interface Operator {
  id: string;
  name: string;
  phone: string;
  hourlySalaryRate: number;
  createdAt: string;
}

export interface HitachiEntry {
  id: string;
  machineId: string;
  machineName: string;
  date: string;
  startingHours: number;
  endingHours: number;
  totalHours: number;
  operatorId: string;
  operatorName: string;
  shift: "A" | "B";
  machineRevenue: number;
  operatorSalary: number;
  notes: string;
  createdAt: string;
}

export interface HitachiFuel {
  id: string;
  machineId: string;
  machineName: string;
  liters: number;
  hourReading: number;
  date: string;
  createdAt: string;
}

export type ExpenseCategory = "fuel" | "salary" | "maintenance" | "miscellaneous" | "tips";

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  notes: string;
  linkedBillId?: string;
  linkedCompanyId?: string;
  linkedOperatorId?: string;
  linkedMachineId?: string;
  createdAt: string;
}

// Legacy kept for backward compat
export interface JCBLog {
  id: string; date: string; startTime: string; endTime: string;
  totalHours: number; hourlyRate: number; totalCost: number; notes: string; createdAt: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getStore<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function setStore<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Products
export function getProducts(): Product[] {
  return getStore<Product>("pos_products").map((p) => ({
    ...p,
    tipsEnabled: p.tipsEnabled ?? false,
    tipsRate: p.tipsRate ?? 0,
  }));
}
export function saveProduct(p: Omit<Product, "id" | "createdAt">): Product {
  const products = getProducts();
  const product: Product = { ...p, id: generateId(), createdAt: new Date().toISOString() };
  products.push(product);
  setStore("pos_products", products);
  return product;
}
export function updateProduct(id: string, updates: Partial<Product>): void {
  setStore("pos_products", getProducts().map((p) => (p.id === id ? { ...p, ...updates } : p)));
}
export function deleteProduct(id: string): void {
  setStore("pos_products", getProducts().filter((p) => p.id !== id));
}

// Companies (flat: name, driverName, vehicleNumber, vehicleCapacity, contactNumber)
export function getCompanies(): Company[] {
  return getStore<Company>("pos_companies").map((c) => ({
    ...c,
    vehicleCapacity: Number(c.vehicleCapacity) || 0,
    driverName: c.driverName ?? "",
    vehicleNumber: c.vehicleNumber ?? "",
    contactNumber: c.contactNumber ?? (c as any).contactDetails ?? "",
  }));
}
export function saveCompany(c: Omit<Company, "id" | "createdAt">): Company {
  const companies = getCompanies();
  const company: Company = { ...c, id: generateId(), createdAt: new Date().toISOString() };
  companies.push(company);
  setStore("pos_companies", companies);
  return company;
}
export function updateCompany(id: string, updates: Partial<Company>): void {
  setStore("pos_companies", getCompanies().map((c) => (c.id === id ? { ...c, ...updates } : c)));
}
export function deleteCompany(id: string): void {
  setStore("pos_companies", getCompanies().filter((c) => c.id !== id));
}
export function getCompanyByVehicle(vehicleNumber: string): Company | undefined {
  return getCompanies().find((c) => c.vehicleNumber.toLowerCase() === vehicleNumber.toLowerCase());
}

// Bills
export function getBills(): Bill[] {
  return getStore<Bill>("pos_bills").map((b) => ({
    ...b,
    paidAmount: b.paidAmount ?? b.totalAmount,
    outstandingAmount: b.outstandingAmount ?? 0,
    tipsAmount: b.tipsAmount ?? 0,
    tipsRate: b.tipsRate ?? 0,
    vehicleCapacity: Number(b.vehicleCapacity) || 0,
  }));
}
export function deleteBill(id: string): void {
  setStore("pos_bills", getStore<Bill>("pos_bills").filter((b) => b.id !== id));
  // remove linked tips expense and payments
  setStore("pos_expenses", getExpenses().filter((e) => e.linkedBillId !== id));
  setStore("pos_payments", getPayments().filter((p) => p.billId !== id));
}
export function getExpensesByBill(billId: string): Expense[] {
  return getExpenses().filter((e) => e.linkedBillId === billId);
}
export function saveBill(b: Omit<Bill, "id" | "createdAt">): Bill {
  const bills = getStore<Bill>("pos_bills");
  const bill: Bill = { ...b, id: generateId(), createdAt: new Date().toISOString() };
  bills.push(bill);
  setStore("pos_bills", bills);
  return bill;
}
export function updateBill(id: string, updates: Partial<Bill>): void {
  setStore("pos_bills", getStore<Bill>("pos_bills").map((b) => (b.id === id ? { ...b, ...updates } : b)));
}
export function getBillsByCompany(companyId: string): Bill[] {
  return getBills().filter((b) => b.companyId === companyId);
}

// Payments
export function getPayments(): Payment[] { return getStore<Payment>("pos_payments"); }
export function savePayment(p: Omit<Payment, "id" | "createdAt">): Payment {
  const payments = getPayments();
  const payment: Payment = { ...p, id: generateId(), createdAt: new Date().toISOString() };
  payments.push(payment);
  setStore("pos_payments", payments);
  const bills = getStore<Bill>("pos_bills");
  const bill = bills.find((b) => b.id === p.billId);
  if (bill) {
    const totalPaid = payments.filter((pay) => pay.billId === p.billId).reduce((s, pay) => s + pay.amount, 0) + (bill.paidAmount || 0);
    const outstanding = Math.max(0, bill.totalAmount - totalPaid);
    setStore("pos_bills", bills.map((b) => b.id === p.billId ? { ...b, outstandingAmount: outstanding } : b));
  }
  return payment;
}
export function getPaymentsByBill(billId: string): Payment[] {
  return getPayments().filter((p) => p.billId === billId);
}
export function getPaymentsByCompany(companyId: string): Payment[] {
  return getPayments().filter((p) => p.companyId === companyId);
}

// Hitachi Machines
export function getHitachiMachines(): HitachiMachine[] { return getStore<HitachiMachine>("pos_hitachi_machines"); }
export function saveHitachiMachine(m: Omit<HitachiMachine, "id" | "createdAt">): HitachiMachine {
  const machines = getHitachiMachines();
  const machine: HitachiMachine = { ...m, id: generateId(), createdAt: new Date().toISOString() };
  machines.push(machine);
  setStore("pos_hitachi_machines", machines);
  return machine;
}
export function updateHitachiMachine(id: string, updates: Partial<HitachiMachine>): void {
  setStore("pos_hitachi_machines", getHitachiMachines().map((m) => (m.id === id ? { ...m, ...updates } : m)));
}
export function deleteHitachiMachine(id: string): void {
  setStore("pos_hitachi_machines", getHitachiMachines().filter((m) => m.id !== id));
}

// Hitachi Entries (Hours-based)
export function getHitachiEntries(): HitachiEntry[] {
  return getStore<HitachiEntry>("pos_hitachi_entries").map((e) => ({
    ...e,
    startingHours: e.startingHours ?? (e as any).startingKM ?? 0,
    endingHours: e.endingHours ?? (e as any).endingKM ?? 0,
    totalHours: e.totalHours ?? (e as any).totalKM ?? 0,
    machineRevenue: e.machineRevenue ?? 0,
    operatorSalary: e.operatorSalary ?? 0,
    shift: ((e as any).shift === "day" || (e as any).shift === "A") ? "A" as const : "B" as const,
  }));
}
export function saveHitachiEntry(e: Omit<HitachiEntry, "id" | "createdAt">): HitachiEntry {
  const entries = getHitachiEntries();
  const entry: HitachiEntry = { ...e, id: generateId(), createdAt: new Date().toISOString() };
  entries.push(entry);
  setStore("pos_hitachi_entries", entries);
  return entry;
}
export function updateHitachiEntry(id: string, updates: Partial<HitachiEntry>): void {
  setStore("pos_hitachi_entries", getHitachiEntries().map((e) => (e.id === id ? { ...e, ...updates } : e)));
}
export function deleteHitachiEntry(id: string): void {
  setStore("pos_hitachi_entries", getHitachiEntries().filter((e) => e.id !== id));
}
export function getHitachiEntriesByMachine(machineId: string): HitachiEntry[] {
  return getHitachiEntries().filter((e) => e.machineId === machineId);
}

// Hitachi Fuel
export function getHitachiFuel(): HitachiFuel[] {
  return getStore<HitachiFuel>("pos_hitachi_fuel").map((f) => ({
    ...f,
    hourReading: f.hourReading ?? (f as any).kmReading ?? 0,
  }));
}
export function saveHitachiFuel(f: Omit<HitachiFuel, "id" | "createdAt">): HitachiFuel {
  const fuels = getHitachiFuel();
  const fuel: HitachiFuel = { ...f, id: generateId(), createdAt: new Date().toISOString() };
  fuels.push(fuel);
  setStore("pos_hitachi_fuel", fuels);
  return fuel;
}

// Operators
export function getOperators(): Operator[] {
  return getStore<Operator>("pos_operators").map((o) => ({
    ...o,
    hourlySalaryRate: o.hourlySalaryRate ?? 0,
  }));
}
export function saveOperator(o: Omit<Operator, "id" | "createdAt">): Operator {
  const operators = getOperators();
  const operator: Operator = { ...o, id: generateId(), createdAt: new Date().toISOString() };
  operators.push(operator);
  setStore("pos_operators", operators);
  return operator;
}
export function updateOperator(id: string, updates: Partial<Operator>): void {
  setStore("pos_operators", getOperators().map((o) => (o.id === id ? { ...o, ...updates } : o)));
}
export function deleteOperator(id: string): void {
  setStore("pos_operators", getOperators().filter((o) => o.id !== id));
}

// Expenses
export function getExpenses(): Expense[] { return getStore<Expense>("pos_expenses"); }
export function saveExpense(e: Omit<Expense, "id" | "createdAt">): Expense {
  const expenses = getExpenses();
  const expense: Expense = { ...e, id: generateId(), createdAt: new Date().toISOString() };
  expenses.push(expense);
  setStore("pos_expenses", expenses);
  return expense;
}
export function updateExpense(id: string, updates: Partial<Expense>): void {
  setStore("pos_expenses", getExpenses().map((e) => (e.id === id ? { ...e, ...updates } : e)));
}
export function deleteExpense(id: string): void {
  setStore("pos_expenses", getExpenses().filter((e) => e.id !== id));
}

// Dashboard helpers
export function getDateRange(filter: "daily" | "weekly" | "monthly"): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  if (filter === "daily") start.setHours(0, 0, 0, 0);
  else if (filter === "weekly") start.setDate(start.getDate() - 7);
  else start.setMonth(start.getMonth() - 1);
  return { start, end };
}

export function getCompanyOutstanding(companyId: string): number {
  const bills = getBillsByCompany(companyId);
  return bills.reduce((s, b) => s + (b.outstandingAmount ?? 0), 0);
}

// Legacy JCB
export function getJCBLogs(): JCBLog[] { return getStore<JCBLog>("pos_jcb_logs"); }

export function exportData(): string {
  return JSON.stringify({
    products: getProducts(),
    bills: getBills(),
    expenses: getExpenses(),
    companies: getCompanies(),
    payments: getPayments(),
    hitachiMachines: getHitachiMachines(),
    hitachiEntries: getHitachiEntries(),
    hitachiFuel: getHitachiFuel(),
    operators: getOperators(),
    jcbLogs: getJCBLogs(),
    exportedAt: new Date().toISOString(),
  });
}

export function importData(json: string): void {
  const data = JSON.parse(json);
  if (data.products) setStore("pos_products", data.products);
  if (data.bills) setStore("pos_bills", data.bills);
  if (data.expenses) setStore("pos_expenses", data.expenses);
  if (data.companies) setStore("pos_companies", data.companies);
  if (data.payments) setStore("pos_payments", data.payments);
  if (data.hitachiMachines) setStore("pos_hitachi_machines", data.hitachiMachines);
  if (data.hitachiEntries) setStore("pos_hitachi_entries", data.hitachiEntries);
  if (data.hitachiFuel) setStore("pos_hitachi_fuel", data.hitachiFuel);
  if (data.operators) setStore("pos_operators", data.operators);
  if (data.jcbLogs) setStore("pos_jcb_logs", data.jcbLogs);
}
