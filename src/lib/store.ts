export interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  contactDetails: string;
  address: string;
  createdAt: string;
}

export interface Driver {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  companyId: string;
  number: string;
  capacity: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  address: string;
  createdAt: string;
}

export interface BillItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  total: number;
}

export interface Bill {
  id: string;
  items: BillItem[];
  totalAmount: number;
  paymentMode: "cash" | "upi" | "credit";
  paidAmount: number;
  outstandingAmount: number;
  customerName: string;
  companyName: string;
  companyId?: string;
  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  vehicleNumber: string;
  vehicleCapacity: string;
  customerId?: string;
  tipsAmount: number;
  tipsPerUnit: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  billId: string;
  companyId?: string;
  amount: number;
  date: string;
  notes: string;
  createdAt: string;
}

export interface HitachiMachine {
  id: string;
  name: string;
  hourlyRate: number;
  createdAt: string;
}

export interface HitachiEntry {
  id: string;
  machineId: string;
  machineName: string;
  date: string;
  startingKM: number;
  endingKM: number;
  totalKM: number;
  operatorId: string;
  operatorName: string;
  shift: "day" | "night";
  notes: string;
  createdAt: string;
}

export interface HitachiFuel {
  id: string;
  machineId: string;
  machineName: string;
  liters: number;
  kmReading: number;
  date: string;
  createdAt: string;
}

export interface Operator {
  id: string;
  name: string;
  phone: string;
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
  createdAt: string;
}

// Legacy JCB (kept for backward compat)
export interface JCBLog {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  hourlyRate: number;
  totalCost: number;
  notes: string;
  createdAt: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getStore<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setStore<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Products
export function getProducts(): Product[] { return getStore<Product>("pos_products"); }
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

// Companies
export function getCompanies(): Company[] { return getStore<Company>("pos_companies"); }
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

// Drivers
export function getDrivers(): Driver[] { return getStore<Driver>("pos_drivers"); }
export function getDriversByCompany(companyId: string): Driver[] { return getDrivers().filter((d) => d.companyId === companyId); }
export function saveDriver(d: Omit<Driver, "id" | "createdAt">): Driver {
  const drivers = getDrivers();
  const driver: Driver = { ...d, id: generateId(), createdAt: new Date().toISOString() };
  drivers.push(driver);
  setStore("pos_drivers", drivers);
  return driver;
}
export function updateDriver(id: string, updates: Partial<Driver>): void {
  setStore("pos_drivers", getDrivers().map((d) => (d.id === id ? { ...d, ...updates } : d)));
}
export function deleteDriver(id: string): void {
  setStore("pos_drivers", getDrivers().filter((d) => d.id !== id));
}

// Vehicles
export function getVehicles(): Vehicle[] { return getStore<Vehicle>("pos_vehicles"); }
export function getVehiclesByCompany(companyId: string): Vehicle[] { return getVehicles().filter((v) => v.companyId === companyId); }
export function saveVehicle(v: Omit<Vehicle, "id" | "createdAt">): Vehicle {
  const vehicles = getVehicles();
  const vehicle: Vehicle = { ...v, id: generateId(), createdAt: new Date().toISOString() };
  vehicles.push(vehicle);
  setStore("pos_vehicles", vehicles);
  return vehicle;
}
export function updateVehicle(id: string, updates: Partial<Vehicle>): void {
  setStore("pos_vehicles", getVehicles().map((v) => (v.id === id ? { ...v, ...updates } : v)));
}
export function deleteVehicle(id: string): void {
  setStore("pos_vehicles", getVehicles().filter((v) => v.id !== id));
}

// Customers
export function getCustomers(): Customer[] { return getStore<Customer>("pos_customers"); }
export function saveCustomer(c: Omit<Customer, "id" | "createdAt">): Customer {
  const customers = getCustomers();
  const customer: Customer = { ...c, id: generateId(), createdAt: new Date().toISOString() };
  customers.push(customer);
  setStore("pos_customers", customers);
  return customer;
}
export function updateCustomer(id: string, updates: Partial<Customer>): void {
  setStore("pos_customers", getCustomers().map((c) => (c.id === id ? { ...c, ...updates } : c)));
}
export function deleteCustomer(id: string): void {
  setStore("pos_customers", getCustomers().filter((c) => c.id !== id));
}

// Bills
export function getBills(): Bill[] {
  return getStore<Bill>("pos_bills").map((b) => ({
    ...b,
    paidAmount: b.paidAmount ?? b.totalAmount,
    outstandingAmount: b.outstandingAmount ?? 0,
    tipsAmount: b.tipsAmount ?? 0,
    tipsPerUnit: b.tipsPerUnit ?? 0,
  }));
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
export function getBillsByCustomer(customerId: string): Bill[] {
  return getBills().filter((b) => b.customerId === customerId);
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
  // Update the bill's outstanding
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

// Hitachi Daily Entries
export function getHitachiEntries(): HitachiEntry[] { return getStore<HitachiEntry>("pos_hitachi_entries"); }
export function saveHitachiEntry(e: Omit<HitachiEntry, "id" | "createdAt">): HitachiEntry {
  const entries = getHitachiEntries();
  const entry: HitachiEntry = { ...e, id: generateId(), createdAt: new Date().toISOString() };
  entries.push(entry);
  setStore("pos_hitachi_entries", entries);
  return entry;
}
export function getHitachiEntriesByMachine(machineId: string): HitachiEntry[] {
  return getHitachiEntries().filter((e) => e.machineId === machineId);
}

// Hitachi Fuel
export function getHitachiFuel(): HitachiFuel[] { return getStore<HitachiFuel>("pos_hitachi_fuel"); }
export function saveHitachiFuel(f: Omit<HitachiFuel, "id" | "createdAt">): HitachiFuel {
  const fuels = getHitachiFuel();
  const fuel: HitachiFuel = { ...f, id: generateId(), createdAt: new Date().toISOString() };
  fuels.push(fuel);
  setStore("pos_hitachi_fuel", fuels);
  return fuel;
}

// Operators
export function getOperators(): Operator[] { return getStore<Operator>("pos_operators"); }
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

// Legacy JCB
export function getJCBLogs(): JCBLog[] { return getStore<JCBLog>("pos_jcb_logs"); }
export function saveJCBLog(l: Omit<JCBLog, "id" | "createdAt">): JCBLog {
  const logs = getJCBLogs();
  const log: JCBLog = { ...l, id: generateId(), createdAt: new Date().toISOString() };
  logs.push(log);
  setStore("pos_jcb_logs", logs);
  return log;
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

// Company outstanding helpers
export function getCompanyOutstanding(companyId: string): number {
  return getBillsByCompany(companyId)
    .filter((b) => b.paymentMode === "credit")
    .reduce((s, b) => s + (b.outstandingAmount ?? 0), 0);
}

export function exportData(): string {
  return JSON.stringify({
    products: getProducts(),
    bills: getBills(),
    jcbLogs: getJCBLogs(),
    expenses: getExpenses(),
    customers: getCustomers(),
    companies: getCompanies(),
    drivers: getDrivers(),
    vehicles: getVehicles(),
    payments: getPayments(),
    hitachiMachines: getHitachiMachines(),
    hitachiEntries: getHitachiEntries(),
    hitachiFuel: getHitachiFuel(),
    operators: getOperators(),
    exportedAt: new Date().toISOString(),
  });
}

export function importData(json: string): void {
  const data = JSON.parse(json);
  if (data.products) setStore("pos_products", data.products);
  if (data.bills) setStore("pos_bills", data.bills);
  if (data.jcbLogs) setStore("pos_jcb_logs", data.jcbLogs);
  if (data.expenses) setStore("pos_expenses", data.expenses);
  if (data.customers) setStore("pos_customers", data.customers);
  if (data.companies) setStore("pos_companies", data.companies);
  if (data.drivers) setStore("pos_drivers", data.drivers);
  if (data.vehicles) setStore("pos_vehicles", data.vehicles);
  if (data.payments) setStore("pos_payments", data.payments);
  if (data.hitachiMachines) setStore("pos_hitachi_machines", data.hitachiMachines);
  if (data.hitachiEntries) setStore("pos_hitachi_entries", data.hitachiEntries);
  if (data.hitachiFuel) setStore("pos_hitachi_fuel", data.hitachiFuel);
  if (data.operators) setStore("pos_operators", data.operators);
}
