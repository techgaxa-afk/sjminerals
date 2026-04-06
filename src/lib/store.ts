export interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
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
  paymentMode: "cash" | "upi";
  customerName: string;
  companyName: string;
  vehicleNumber: string;
  vehicleCapacity: string;
  customerId?: string;
  createdAt: string;
}

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

export type ExpenseCategory = "fuel" | "salary" | "maintenance" | "miscellaneous";

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
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
export function getProducts(): Product[] {
  return getStore<Product>("pos_products");
}
export function saveProduct(p: Omit<Product, "id" | "createdAt">): Product {
  const products = getProducts();
  const product: Product = { ...p, id: generateId(), createdAt: new Date().toISOString() };
  products.push(product);
  setStore("pos_products", products);
  return product;
}
export function updateProduct(id: string, updates: Partial<Product>): void {
  const products = getProducts().map((p) => (p.id === id ? { ...p, ...updates } : p));
  setStore("pos_products", products);
}
export function deleteProduct(id: string): void {
  setStore("pos_products", getProducts().filter((p) => p.id !== id));
}

// Customers
export function getCustomers(): Customer[] {
  return getStore<Customer>("pos_customers");
}
export function saveCustomer(c: Omit<Customer, "id" | "createdAt">): Customer {
  const customers = getCustomers();
  const customer: Customer = { ...c, id: generateId(), createdAt: new Date().toISOString() };
  customers.push(customer);
  setStore("pos_customers", customers);
  return customer;
}
export function updateCustomer(id: string, updates: Partial<Customer>): void {
  const customers = getCustomers().map((c) => (c.id === id ? { ...c, ...updates } : c));
  setStore("pos_customers", customers);
}
export function deleteCustomer(id: string): void {
  setStore("pos_customers", getCustomers().filter((c) => c.id !== id));
}

// Bills
export function getBills(): Bill[] {
  return getStore<Bill>("pos_bills");
}
export function saveBill(b: Omit<Bill, "id" | "createdAt">): Bill {
  const bills = getBills();
  const bill: Bill = { ...b, id: generateId(), createdAt: new Date().toISOString() };
  bills.push(bill);
  setStore("pos_bills", bills);
  return bill;
}
export function getBillsByCustomer(customerId: string): Bill[] {
  return getBills().filter((b) => b.customerId === customerId);
}

// JCB Logs
export function getJCBLogs(): JCBLog[] {
  return getStore<JCBLog>("pos_jcb_logs");
}
export function saveJCBLog(l: Omit<JCBLog, "id" | "createdAt">): JCBLog {
  const logs = getJCBLogs();
  const log: JCBLog = { ...l, id: generateId(), createdAt: new Date().toISOString() };
  logs.push(log);
  setStore("pos_jcb_logs", logs);
  return log;
}

// Expenses
export function getExpenses(): Expense[] {
  return getStore<Expense>("pos_expenses");
}
export function saveExpense(e: Omit<Expense, "id" | "createdAt">): Expense {
  const expenses = getExpenses();
  const expense: Expense = { ...e, id: generateId(), createdAt: new Date().toISOString() };
  expenses.push(expense);
  setStore("pos_expenses", expenses);
  return expense;
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

export function exportData(): string {
  return JSON.stringify({
    products: getProducts(),
    bills: getBills(),
    jcbLogs: getJCBLogs(),
    expenses: getExpenses(),
    customers: getCustomers(),
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
}
