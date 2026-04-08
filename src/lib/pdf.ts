import type { Bill } from "./store";
import { format, parseISO } from "date-fns";

function createPDFWindow(title: string, content: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { text-align: center; border-bottom: 2px solid #d97706; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 24px; color: #92400e; margin-bottom: 4px; }
  .header p { font-size: 12px; color: #666; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
  .info-item { font-size: 13px; }
  .info-item .label { color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-item .value { font-weight: 600; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #fef3c7; color: #92400e; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
  .total-row { background: #fffbeb; font-weight: bold; font-size: 15px; }
  .credit-badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .footer { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #999; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
  .print-btn { background: #d97706; color: white; border: none; padding: 10px 24px; border-radius: 6px; cursor: pointer; font-size: 14px; margin-bottom: 20px; }
</style></head><body>
<button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
${content}
</body></html>`);
  win.document.close();
}

export function exportInvoicePDF(bill: Bill) {
  const dateStr = format(parseISO(bill.createdAt), "dd MMM yyyy, hh:mm a");
  const itemsHtml = bill.items.map((item) =>
    `<tr><td>${item.productName}</td><td style="text-align:center">${item.quantity}</td><td style="text-align:right">₹${item.price.toLocaleString()}</td><td style="text-align:right">₹${item.total.toLocaleString()}</td></tr>`
  ).join("");

  const creditInfo = bill.paymentMode === "credit" ? `
    <tr><td colspan="3" style="text-align:right;font-size:13px">Paid Amount</td><td style="text-align:right;font-size:13px;color:#16a34a">₹${(bill.paidAmount || 0).toLocaleString()}</td></tr>
    <tr><td colspan="3" style="text-align:right;font-size:13px">Outstanding</td><td style="text-align:right;font-size:13px;color:#dc2626;font-weight:bold">₹${(bill.outstandingAmount || 0).toLocaleString()}</td></tr>
  ` : "";

  const tipsRow = bill.tipsAmount > 0 ? `<tr><td colspan="3" style="text-align:right;font-size:12px;color:#666">Tips (₹${bill.tipsPerUnit}/unit)</td><td style="text-align:right;font-size:12px;color:#666">₹${bill.tipsAmount.toLocaleString()}</td></tr>` : "";

  const content = `
    <div class="header">
      <h1>MinePOS</h1>
      <p>Mining Service Invoice</p>
    </div>
    <div class="info-grid">
      <div class="info-item"><div class="label">Invoice ID</div><div class="value">${bill.id}</div></div>
      <div class="info-item"><div class="label">Date & Time</div><div class="value">${dateStr}</div></div>
      <div class="info-item"><div class="label">Customer</div><div class="value">${bill.customerName}</div></div>
      <div class="info-item"><div class="label">Company</div><div class="value">${bill.companyName || "—"}</div></div>
      <div class="info-item"><div class="label">Driver</div><div class="value">${bill.driverName || "—"}</div></div>
      <div class="info-item"><div class="label">Vehicle</div><div class="value">${bill.vehicleNumber || "—"} ${bill.vehicleCapacity ? `(${bill.vehicleCapacity})` : ""}</div></div>
      <div class="info-item"><div class="label">Payment Mode</div><div class="value">${bill.paymentMode.toUpperCase()} ${bill.paymentMode === "credit" ? '<span class="credit-badge">CREDIT</span>' : ""}</div></div>
    </div>
    <table>
      <thead><tr><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${itemsHtml}
      ${tipsRow}
      <tr class="total-row"><td colspan="3" style="text-align:right">Grand Total</td><td style="text-align:right">₹${bill.totalAmount.toLocaleString()}</td></tr>
      ${creditInfo}
      </tbody>
    </table>
    <div class="footer">Thank you for your business! — MinePOS</div>
  `;

  createPDFWindow(`Invoice-${bill.id}`, content);
}

export function exportReportPDF(
  filter: string,
  stats: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    billCount: number;
    bills: { customerName: string; totalAmount: number; createdAt: string }[];
    expenses: { category: string; amount: number; date: string; notes: string }[];
  }
) {
  const billRows = stats.bills.map((b) =>
    `<tr><td>${format(parseISO(b.createdAt), "dd MMM yyyy")}</td><td>${b.customerName}</td><td style="text-align:right">₹${b.totalAmount.toLocaleString()}</td></tr>`
  ).join("");

  const expenseRows = stats.expenses.map((e) =>
    `<tr><td>${e.date}</td><td>${e.category}</td><td>${e.notes || "—"}</td><td style="text-align:right">₹${e.amount.toLocaleString()}</td></tr>`
  ).join("");

  const content = `
    <div class="header">
      <h1>MinePOS Report</h1>
      <p>${filter.charAt(0).toUpperCase() + filter.slice(1)} Report — ${format(new Date(), "dd MMM yyyy")}</p>
    </div>
    <div class="info-grid" style="margin-bottom:32px">
      <div class="info-item"><div class="label">Total Revenue</div><div class="value" style="color:#16a34a;font-size:18px">₹${stats.totalRevenue.toLocaleString()}</div></div>
      <div class="info-item"><div class="label">Total Expenses</div><div class="value" style="color:#dc2626;font-size:18px">₹${stats.totalExpenses.toLocaleString()}</div></div>
      <div class="info-item"><div class="label">Net Profit</div><div class="value" style="color:${stats.netProfit >= 0 ? "#16a34a" : "#dc2626"};font-size:18px">₹${stats.netProfit.toLocaleString()}</div></div>
      <div class="info-item"><div class="label">Total Bills</div><div class="value" style="font-size:18px">${stats.billCount}</div></div>
    </div>
    <h2 style="font-size:16px;margin-bottom:12px;color:#92400e">Sales Transactions</h2>
    <table>
      <thead><tr><th>Date</th><th>Customer</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${billRows || '<tr><td colspan="3" style="text-align:center;color:#999">No transactions</td></tr>'}</tbody>
    </table>
    <h2 style="font-size:16px;margin:24px 0 12px;color:#92400e">Expense Transactions</h2>
    <table>
      <thead><tr><th>Date</th><th>Category</th><th>Notes</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${expenseRows || '<tr><td colspan="4" style="text-align:center;color:#999">No expenses</td></tr>'}</tbody>
    </table>
    <div class="footer">Generated by MinePOS — ${format(new Date(), "dd MMM yyyy, hh:mm a")}</div>
  `;

  createPDFWindow(`Report-${filter}`, content);
}
