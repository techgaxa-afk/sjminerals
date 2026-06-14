# Accounts Receivable Upgrade — Plan

This is a large, multi-area change. I'll do it in one migration + a focused code pass. Scope below.

## 1. Database migration (single migration)

- `companies`: add `credit_limit numeric NOT NULL DEFAULT 0`.
- `company_payments`: add `receipt_number text UNIQUE`, `status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','reversed'))`, `reversal_reason text`, `reversed_at timestamptz`, `reversed_by uuid`.
- Backfill existing rows with sequential receipt numbers `RCPT-YYYY-00001` based on `payment_date` year.
- DB function `public.next_receipt_number()` (SECURITY DEFINER, `SET search_path = public`) that returns the next `RCPT-YYYY-NNNNN` using a yearly sequence table (`receipt_counters(year int pk, last_number int)`).
- New table `public.audit_log` (id, ts, user_id, action text, entity_type text, entity_id uuid, details jsonb) with GRANTs + RLS (read: authenticated; insert: authenticated via `auth.uid()`; no update/delete).
- Index `company_payments(status)` and `company_payments(payment_date desc)`.

## 2. Store layer (`src/lib/store.ts`)

- `Company` type: add `creditLimit`.
- `CompanyPayment` type: add `receiptNumber`, `status`, `reversalReason`, `reversedAt`.
- `saveCompanyPayment`: call `next_receipt_number` RPC; validate amount > 0 and date ≤ today; reject duplicate receipt numbers (DB-enforced).
- New `reverseCompanyPayment(id, reason)` — sets status=reversed, writes audit row. `deleteCompanyPayment` kept for admin-only hard delete (still wired from UI as a fallback).
- Filter reversed payments out of `getCompanyTotalPaid`, `getCompanyOutstanding`, dashboard collected. Keep them visible in history.
- New helpers: `getAgingBuckets()` returning per-company `{current, d30, d60, d90, d90plus, total}` using oldest unpaid invoice age (based on bill `createdAt` and remaining `outstandingAmount`); `getRecentPayments(n)`.
- `writeAuditLog(action, entityType, entityId, details)` helper used by payment/adjustment mutations.

## 3. UI

### Company card (`companies.tsx`)
- Show `Outstanding ₹X / Limit ₹Y` when `creditLimit > 0`; red "CREDIT LIMIT EXCEEDED" badge when over.
- Keep Last Payment line (already there).

### Company form
- Add Credit Limit input.

### Company Details (`companies.$id.tsx`)
- Replace existing PDF "Statement" with a richer customer statement: header (name/address/contact), date-range picker (default: opening → today), Opening Balance row, transactions (Date / Ref / Description / Debit / Credit / Balance), Closing Balance, Outstanding, Last Payment Date. Buttons: Print, Download PDF.
- Payment history row: show `REVERSED` badge for reversed; action menu becomes Edit / Reverse / (admin) Delete; receipt number column; Print Receipt / Download Receipt PDF actions.
- Payment dialog: block negative/zero amounts and future dates client-side; display generated receipt number after save.

### Reports (`reports.tsx`)
- New "Aging" tab: table grouped by bucket (Current / 1–30 / 31–60 / 61–90 / 90+), per-company row sorted by total desc, bucket totals at footer, CSV export.

### Dashboard (`index.tsx`)
- Widgets: Today's Collections, This Month Collections, Outstanding Receivables, Overdue Receivables (sum of 30+ buckets), Top 10 Outstanding, Recent Payments (latest 5 active). Reuse existing card grid; replace/augment existing tiles.

### PDF (`src/lib/pdf.ts`)
- `exportCustomerStatementPDF(company, rows, openingBalance, closingBalance, period)`.
- `exportReceiptPDF(company, payment)`.

## 4. Validation & guards

- Client zod-like checks in dialogs; server-side guarded by CHECK constraints (amount > 0) and unique receipt index.
- Idempotency for double-submit: disable Save button while in-flight (already partially handled; ensure consistent).

## 5. Final audit (returned to user)

- I'll run the migration, then verify each item against actual store/UI code and report `✓`/`✗` per the user's checklist, listing any gaps left for a follow-up.

## Out of scope / follow-ups

- Per-user role gating of "Delete payment" (currently any staff) — keep as-is unless requested.
- Backdated aging beyond bill `createdAt` (no separate due date column on bills yet) — aging uses invoice date.
- Email delivery of statements/receipts — not in this pass.

Confirm and I'll execute migration + code in one go.
