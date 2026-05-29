import type { Bill, Company, Payment } from "./store";

function tipsLabel(rate: number): string {
  if (!rate) return "No Tips";
  return `₹${rate} per Unit`;
}

export function exportInvoicePDF(bill: Bill) {
  const w = window.open("", "_blank");
  if (!w) return;
  const subtotal = bill.items.reduce((s, i) => s + i.total, 0);
  const totalQty = bill.items.reduce((s, i) => s + i.quantity, 0);
  const tipsBase = bill.vehicleCapacity > 0 ? bill.vehicleCapacity : totalQty;

  const itemRows = bill.items.map((i) =>
    `<tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb">${i.productName}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">${i.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">₹${i.price.toLocaleString()}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">₹${i.total.toLocaleString()}</td>
    </tr>`
  ).join("");

  w.document.write(`<!DOCTYPE html><html><head><title>Invoice #${bill.id}</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#111}
    h1{margin:0 0 4px;font-size:24px}
    .muted{color:#6b7280;font-size:12px}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;margin:16px 0;padding:12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px}
    .meta div b{color:#374151}
    table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
    th{padding:8px;text-align:left;border-bottom:2px solid #111;font-size:11px;text-transform:uppercase;color:#374151;letter-spacing:0.5px}
    .breakup{margin-top:16px;padding:14px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb}
    .row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}
    .row.total{border-top:2px solid #111;margin-top:8px;padding-top:8px;font-size:16px;font-weight:bold}
    .pay{margin-top:12px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px}
    .due{color:#b45309;font-weight:bold}
    .paid{color:#047857;font-weight:bold}
    .tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:#fef3c7;color:#92400e}
  </style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:2px solid #111;padding-bottom:10px">
    <div><h1>SJ Minerals Invoice</h1><p class="muted">${new Date(bill.createdAt).toLocaleString()}</p></div>
    <div style="text-align:right">
      <p class="muted" style="margin:0;font-size:10px;letter-spacing:1px;text-transform:uppercase">Invoice No.</p>
      <p style="margin:2px 0 0;font-size:20px;font-weight:bold;font-family:ui-monospace,Menlo,monospace;color:#111">${bill.invoiceNumber || bill.id.slice(-10).toUpperCase()}</p>
    </div>
  </div>

  <div class="meta">
    <div><b>Company:</b> ${bill.companyName || "Walk-in"}</div>
    <div><b>Driver:</b> ${bill.driverName || "—"}</div>
    <div><b>Vehicle No:</b> ${bill.vehicleNumber || "—"}</div>
    <div><b>Capacity:</b> ${bill.vehicleCapacity > 0 ? `${bill.vehicleCapacity} units` : "—"}</div>
    <div><b>Payment Mode:</b> ${bill.paymentMode.toUpperCase()}</div>
    <div><b>Date:</b> ${new Date(bill.createdAt).toLocaleDateString()}</div>
  </div>

  <h3 style="margin:16px 0 4px;font-size:14px">Product Details</h3>
  <table>
    <thead><tr>
      <th>Product</th>
      <th style="text-align:center">Qty</th>
      <th style="text-align:right">Rate/Unit</th>
      <th style="text-align:right">Total</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="breakup">
    <div class="row"><span>Subtotal (Products)</span><span>₹${subtotal.toLocaleString()}</span></div>
    <div class="row">
      <span>Tips <span class="tag">${tipsLabel(bill.tipsRate)}</span></span>
      <span>₹${bill.tipsAmount.toLocaleString()}</span>
    </div>
    ${bill.tipsRate > 0 ? `<div class="row muted" style="font-size:11px"><span>↳ ₹${bill.tipsRate} × ${tipsBase} units</span><span></span></div>` : ""}
    ${bill.passEnabled ? `<div class="row"><span>Pass <span class="tag" style="background:#dbeafe;color:#1e40af">Included</span></span><span>₹${(bill.passAmount || 0).toLocaleString()}</span></div>` : `<div class="row muted" style="font-size:11px"><span>Pass</span><span>Not Included</span></div>`}
    <div class="row total"><span>Grand Total</span><span>₹${bill.totalAmount.toLocaleString()}</span></div>
  </div>

  <div class="pay">
    <div class="row"><span>Grand Total</span><span>₹${bill.totalAmount.toLocaleString()}</span></div>
    <div class="row"><span>Paid Amount</span><span class="paid">₹${bill.paidAmount.toLocaleString()}</span></div>
    ${bill.outstandingAmount > 0
      ? `<div class="row"><span>Outstanding Balance</span><span class="due">₹${bill.outstandingAmount.toLocaleString()}</span></div>`
      : `<div class="row"><span>Status</span><span class="paid">PAID IN FULL</span></div>`}
  </div>

  <p class="muted" style="margin-top:20px;text-align:center">Thank you for your business.</p>
  <script>setTimeout(()=>window.print(),300)</script></body></html>`);
  w.document.close();
}

export function exportReportPDF(filter: string, stats: any) {
  const w = window.open("", "_blank");
  if (!w) return;
  const billRows = (stats.bills || []).map((b: any) =>
    `<tr><td style="padding:4px 8px;border-bottom:1px solid #ddd">${b.customerName || b.companyName || "—"}</td>
     <td style="padding:4px 8px;border-bottom:1px solid #ddd;text-align:right">₹${b.totalAmount.toLocaleString()}</td>
     <td style="padding:4px 8px;border-bottom:1px solid #ddd">${new Date(b.createdAt).toLocaleDateString()}</td></tr>`
  ).join("");

  w.document.write(`<!DOCTYPE html><html><head><title>SJ Minerals ${filter} Report</title>
  <style>body{font-family:system-ui;max-width:700px;margin:0 auto;padding:20px}
  h1{color:#333} table{width:100%;border-collapse:collapse;margin-top:12px}
  th{padding:6px 8px;text-align:left;border-bottom:2px solid #999;color:#666;font-size:12px}
  .stat{display:inline-block;margin:8px 16px 8px 0;padding:10px 16px;border:1px solid #ddd;border-radius:8px}</style></head><body>
  <h1>SJ Minerals ${filter.charAt(0).toUpperCase() + filter.slice(1)} Report</h1>
  <div class="stat"><small style="color:#999">Revenue</small><br><strong>₹${stats.totalRevenue.toLocaleString()}</strong></div>
  <div class="stat"><small style="color:#999">Expenses</small><br><strong>₹${stats.totalExpenses.toLocaleString()}</strong></div>
  <div class="stat"><small style="color:#999">Net Profit</small><br><strong>₹${stats.netProfit.toLocaleString()}</strong></div>
  <div class="stat"><small style="color:#999">Outstanding</small><br><strong>₹${stats.totalOutstanding.toLocaleString()}</strong></div>
  <h3>Transactions</h3>
  <table><thead><tr><th>Company</th><th style="text-align:right">Amount</th><th>Date</th></tr></thead>
  <tbody>${billRows}</tbody></table>
  <script>setTimeout(()=>window.print(),300)</script></body></html>`);
  w.document.close();
}

export function exportCompanyStatementPDF(
  company: Company,
  bills: Bill[],
  payments: Payment[],
  outstanding: number,
) {
  const w = window.open("", "_blank");
  if (!w) return;
  const totalSales = bills.reduce((s, b) => s + (b.totalAmount || 0), 0);
  const totalPaid = bills.reduce((s, b) => s + (b.paidAmount || 0), 0);

  type Row = { ts: number; date: string; desc: string; debit: number; credit: number };
  const events: Row[] = [];
  const ordered = [...bills].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  ordered.forEach((b, i) => events.push({
    ts: new Date(b.createdAt).getTime(),
    date: b.createdAt,
    desc: `Invoice #${i + 1} — ${b.items.map((it) => `${it.productName} ×${it.quantity}`).join(", ") || "Sale"}${b.passEnabled ? " + Pass" : ""}`,
    debit: b.totalAmount || 0, credit: 0,
  }));
  payments.forEach((p) => events.push({
    ts: new Date(p.createdAt).getTime(),
    date: p.createdAt,
    desc: `Payment received${p.notes ? ` — ${p.notes}` : ""}`,
    debit: 0, credit: p.amount || 0,
  }));
  events.sort((a, b) => a.ts - b.ts);
  let bal = 0;
  const ledgerRows = events.map((e) => {
    bal += e.debit - e.credit;
    return `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px">${new Date(e.date).toLocaleDateString()}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px">${e.desc}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;color:#b45309">${e.debit > 0 ? `₹${e.debit.toLocaleString()}` : "—"}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;color:#047857">${e.credit > 0 ? `₹${e.credit.toLocaleString()}` : "—"}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:600">₹${bal.toLocaleString()}</td>
    </tr>`;
  }).join("");

  w.document.write(`<!DOCTYPE html><html><head><title>${company.name} Statement</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;max-width:760px;margin:0 auto;padding:24px;color:#111}
    h1{margin:0 0 4px;font-size:22px}
    .muted{color:#6b7280;font-size:12px}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;margin:14px 0;padding:12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px}
    .stats{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}
    .stat{flex:1;min-width:140px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px}
    .stat small{color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
    .stat strong{display:block;margin-top:4px;font-size:16px}
    table{width:100%;border-collapse:collapse;margin-top:6px}
    th{padding:8px;text-align:left;border-bottom:2px solid #111;font-size:11px;text-transform:uppercase;color:#374151;letter-spacing:0.5px}
    h3{margin:18px 0 6px;font-size:14px}
  </style></head><body>
  <h1>${company.name} — Account Statement</h1>
  <p class="muted">Generated ${new Date().toLocaleString()}</p>

  <div class="meta">
    <div><b>Driver:</b> ${company.driverName || "—"}</div>
    <div><b>Vehicle:</b> ${company.vehicleNumber || "—"}</div>
    <div><b>Capacity:</b> ${company.vehicleCapacity > 0 ? `${company.vehicleCapacity} tons` : "—"}</div>
    <div><b>Contact:</b> ${company.contactNumber || "—"}</div>
  </div>

  <div class="stats">
    <div class="stat"><small>Total Sales</small><strong>₹${totalSales.toLocaleString()}</strong></div>
    <div class="stat"><small>Total Paid</small><strong style="color:#047857">₹${totalPaid.toLocaleString()}</strong></div>
    <div class="stat"><small>Outstanding</small><strong style="color:#b45309">₹${outstanding.toLocaleString()}</strong></div>
    <div class="stat"><small>Invoices</small><strong>${bills.length}</strong></div>
  </div>

  <h3>Running Ledger</h3>
  <table>
    <thead><tr>
      <th>Date</th><th>Description</th>
      <th style="text-align:right">Debit</th>
      <th style="text-align:right">Credit</th>
      <th style="text-align:right">Balance</th>
    </tr></thead>
    <tbody>${ledgerRows || `<tr><td colspan="5" style="padding:14px;text-align:center;color:#6b7280">No activity.</td></tr>`}</tbody>
  </table>

  <p class="muted" style="margin-top:24px;text-align:center">SJ Minerals · Confidential</p>
  <script>setTimeout(()=>window.print(),300)</script></body></html>`);
  w.document.close();
}
