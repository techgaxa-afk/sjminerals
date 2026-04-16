import type { Bill } from "./store";

export function exportInvoicePDF(bill: Bill) {
  const w = window.open("", "_blank");
  if (!w) return;
  const itemRows = bill.items.map((i) =>
    `<tr><td style="padding:6px 8px;border-bottom:1px solid #ddd">${i.productName}</td>
     <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:center">${i.quantity}</td>
     <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:right">₹${i.price}</td>
     <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:right">₹${i.total.toLocaleString()}</td></tr>`
  ).join("");

  w.document.write(`<!DOCTYPE html><html><head><title>Invoice #${bill.id}</title>
  <style>body{font-family:system-ui;max-width:600px;margin:0 auto;padding:20px}
  h1{color:#333;margin:0 0 4px} table{width:100%;border-collapse:collapse;margin-top:12px}
  th{padding:8px;text-align:left;border-bottom:2px solid #999;color:#666;font-size:12px}
  .total{font-size:18px;font-weight:bold}</style></head><body>
  <h1>MinePOS Invoice</h1>
  <p style="color:#999;font-size:12px;margin:0">#${bill.id} · ${new Date(bill.createdAt).toLocaleString()}</p>
  <hr style="margin:12px 0">
  <p><strong>Company:</strong> ${bill.companyName || "Walk-in"}</p>
  <p><strong>Driver:</strong> ${bill.driverName || "—"}</p>
  <p><strong>Vehicle:</strong> ${bill.vehicleNumber || "—"} ${bill.vehicleCapacity > 0 ? `(${bill.vehicleCapacity} tons)` : ""}</p>
  <p><strong>Payment:</strong> ${bill.paymentMode.toUpperCase()}</p>
  <table><thead><tr><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>${itemRows}</tbody></table>
  ${bill.tipsAmount > 0 ? `<p style="margin-top:8px">Tips: <strong>₹${bill.tipsAmount.toLocaleString()}</strong></p>` : ""}
  <p style="margin-top:12px" class="total">Grand Total: ₹${bill.totalAmount.toLocaleString()}</p>
  ${bill.paymentMode === "credit" ? `<p>Paid: ₹${bill.paidAmount.toLocaleString()} | Outstanding: ₹${bill.outstandingAmount.toLocaleString()}</p>` : ""}
  <script>setTimeout(()=>window.print(),300)</script></body></html>`);
  w.document.close();
}

export function exportReportPDF(filter: string, stats: any) {
  const w = window.open("", "_blank");
  if (!w) return;
  const billRows = (stats.bills || []).map((b: any) =>
    `<tr><td style="padding:4px 8px;border-bottom:1px solid #ddd">${b.customerName}</td>
     <td style="padding:4px 8px;border-bottom:1px solid #ddd;text-align:right">₹${b.totalAmount.toLocaleString()}</td>
     <td style="padding:4px 8px;border-bottom:1px solid #ddd">${new Date(b.createdAt).toLocaleDateString()}</td></tr>`
  ).join("");

  w.document.write(`<!DOCTYPE html><html><head><title>MinePOS ${filter} Report</title>
  <style>body{font-family:system-ui;max-width:700px;margin:0 auto;padding:20px}
  h1{color:#333} table{width:100%;border-collapse:collapse;margin-top:12px}
  th{padding:6px 8px;text-align:left;border-bottom:2px solid #999;color:#666;font-size:12px}
  .stat{display:inline-block;margin:8px 16px 8px 0;padding:10px 16px;border:1px solid #ddd;border-radius:8px}</style></head><body>
  <h1>MinePOS ${filter.charAt(0).toUpperCase() + filter.slice(1)} Report</h1>
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
