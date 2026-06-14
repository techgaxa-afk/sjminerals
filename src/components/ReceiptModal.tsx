import { useMemo } from "react";
import { X, Download, Printer, Share2, Receipt as ReceiptIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { exportReceiptPDF } from "@/lib/pdf";
import type { CompanyPayment, Company } from "@/lib/store";

export function ReceiptModal({
  payment, company, onClose,
}: { payment: CompanyPayment; company: Company; onClose: () => void }) {
  const preview = useMemo(() => buildReceiptHTML(payment, company), [payment, company]);

  const handlePrintOrDownload = () => exportReceiptPDF(payment, company);

  const handleShare = async () => {
    const text = `Receipt ${payment.receiptNumber || payment.id.slice(-8)}\n${company.name}\nAmount: ₹${payment.amount.toLocaleString()}\nDate: ${format(parseISO(payment.paymentDate), "dd MMM yyyy")}\nMethod: ${payment.paymentMethod || "—"}${payment.referenceNumber ? `\nRef: ${payment.referenceNumber}` : ""}`;
    const shareData = { title: `Receipt ${payment.receiptNumber || ""}`, text } as ShareData;
    try {
      if (navigator.share && navigator.canShare?.(shareData) !== false) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Receipt copied to clipboard");
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error("Unable to share");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col rounded-lg bg-card border border-border" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <ReceiptIcon className="h-4 w-4 text-primary" /> Payment Received
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 bg-muted/30">
          <iframe
            title="Receipt preview"
            srcDoc={preview}
            className="w-full h-[420px] rounded-md border border-border bg-white"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-border p-3">
          <button onClick={handlePrintOrDownload} className="flex items-center justify-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary/80">
            <Download className="h-3.5 w-3.5" /> Download
          </button>
          <button onClick={handlePrintOrDownload} className="flex items-center justify-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary/80">
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button onClick={handleShare} className="flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        </div>
      </div>
    </div>
  );
}

function buildReceiptHTML(p: CompanyPayment, c: Company): string {
  const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]!));
  const date = format(parseISO(p.paymentDate), "dd MMM yyyy");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:20px;color:#0f172a;background:#fff}
    .wrap{max-width:480px;margin:0 auto;border:1px solid #e2e8f0;border-radius:8px;padding:20px}
    h1{font-size:18px;margin:0 0 4px;color:#0f172a}
    .meta{color:#64748b;font-size:12px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
    td{padding:6px 0;border-bottom:1px dashed #e2e8f0}
    td:last-child{text-align:right;font-weight:600;color:#0f172a}
    .total{font-size:18px;font-weight:700;color:#16a34a;text-align:right;margin-top:12px}
    .footer{margin-top:20px;text-align:center;color:#94a3b8;font-size:11px}
    .reversed{color:#dc2626;font-weight:700;text-align:center;margin-top:8px;border:1px dashed #dc2626;padding:6px;border-radius:4px}
  </style></head><body><div class="wrap">
    <h1>Payment Receipt</h1>
    <div class="meta">Receipt No: <strong>${esc(p.receiptNumber || p.id.slice(-8))}</strong> · ${date}</div>
    <div style="font-weight:600;font-size:14px">${esc(c.name)}</div>
    ${c.address ? `<div style="font-size:12px;color:#64748b">${esc(c.address)}</div>` : ""}
    ${c.contactNumber ? `<div style="font-size:12px;color:#64748b">${esc(c.contactNumber)}</div>` : ""}
    <table>
      <tr><td>Amount</td><td>₹${p.amount.toLocaleString()}</td></tr>
      <tr><td>Payment Method</td><td>${esc(p.paymentMethod || "—")}</td></tr>
      ${p.referenceNumber ? `<tr><td>Reference</td><td>${esc(p.referenceNumber)}</td></tr>` : ""}
      ${p.notes ? `<tr><td>Notes</td><td>${esc(p.notes)}</td></tr>` : ""}
    </table>
    <div class="total">₹${p.amount.toLocaleString()}</div>
    ${p.status === "reversed" ? `<div class="reversed">REVERSED${p.reversalReason ? ` — ${esc(p.reversalReason)}` : ""}</div>` : ""}
    <div class="footer">Thank you for your payment.</div>
  </div></body></html>`;
}
