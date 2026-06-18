## Bill Date & Audit Trail — Implementation Plan

### 1. Database migration
Add columns to `public.bills`:
- `bill_date date NOT NULL DEFAULT CURRENT_DATE`
- `created_by uuid NULL` (references auth.users)
- `updated_by uuid NULL`
- `updated_at timestamptz NULL`

Backfill: `UPDATE bills SET bill_date = DATE(created_at) WHERE bill_date IS NULL;` (run as part of migration before NOT NULL).

Index: `CREATE INDEX bills_bill_date_idx ON public.bills(bill_date);`

Add trigger `bills_set_audit_fields` BEFORE INSERT/UPDATE:
- On INSERT: set `created_by = auth.uid()` if null
- On UPDATE: set `updated_by = auth.uid()`, `updated_at = now()` (never touches created_*).

Audit log entries written via existing `log_audit_event` from the app on create/update/delete (entity_type='bill').

No changes to invoice numbers, totals, payments, ledgers.

### 2. Types
Regenerate `src/integrations/supabase/types.ts` after migration approval (auto).

### 3. Store layer (`src/lib/store.ts`)
- Extend `Bill` type with `billDate: string`, `createdBy?: string`, `updatedBy?: string`, `updatedAt?: string`.
- `saveBill()`: include `bill_date`, `created_by` on insert; `updated_by`, `updated_at` on update.
- All aggregations that currently group by `createdAt` switch to `billDate ?? DATE(createdAt)`:
  - Dashboard daily/weekly/monthly
  - Reports (daily/weekly/monthly/custom/category/vehicle/company/aging/ledger/profitability/pass collection)
  - Profitability page
  - Cashbook (keep payment date logic untouched; only bill-derived rows use billDate)
- Add helper `getBackdatedBillStats()` returning today & this-month counts where `billDate < DATE(createdAt)`.

### 4. UI — New Bill (`src/routes/billing.tsx`)
- Add mandatory `<input type="date">` Bill Date, default today, `max={today}`.
- Validate: not future. Block submit otherwise.
- Role gating: if user lacks `admin`/`staff` AND date < today → disable date input (operators must use today).

### 5. UI — Bills list (`src/routes/bills.tsx`)
- Columns: Bill No, Bill Date, Customer, Vehicle, Amount, Created On, Created By.
- Sort toggles for Bill Date & Created On.
- Filter radio "Date Type: Bill Date / Created Date" (default Bill Date) applied to existing date-range filter.
- Resolve `created_by` UUID → display name via `profiles` lookup (already loaded for users page; add lightweight cache in store).

### 6. UI — Bill detail / receipt modal (`src/components/ReceiptModal.tsx`)
- Show Bill Date, Created On, Created By, Last Updated On, Last Updated By.

### 7. UI — Edit bill
- Allow Bill Date edit (same role rules as create).
- On save, emit audit log entry capturing old → new bill_date when changed.

### 8. PDF (`src/lib/pdf.ts`)
- Render `Bill Date: <billDate>` and `Printed On: <today>` in header.

### 9. Audit log
- On create: `log_audit_event('bill.create', 'bill', billId, { invoiceNo, billDate })`
- On update: include `{ changes: { billDate: [old,new], ... } }`
- On delete: `log_audit_event('bill.delete', 'bill', billId, { invoiceNo })`

### 10. Dashboard card
- Add "Backdated Bills" card on `src/routes/index.tsx`:
  - Today: N bills with `billDate < today_of_creation`
  - Month: N
  - Click → `/bills?backdated=1` (filter pre-applied)

### 11. Admin setting "Allow Backdated Bills"
- Lightweight: store in `localStorage` (`settings.allowBackdated`, default true), surfaced on `/users` admin page as a toggle (admin only). When disabled, Bill Date input is locked to today for everyone.
- Operators/viewers always locked to today regardless of setting.

### 12. Safety
- Migration backfills before adding NOT NULL.
- All grouping uses `billDate ?? DATE(createdAt)` fallback.
- Invoice numbering, totals, payments, ledger SQL untouched.
- TypeScript clean.

### Execution order
1. Create migration (await approval).
2. Update `store.ts` (Bill type, save logic, aggregations, helpers).
3. Update billing.tsx, bills.tsx, ReceiptModal, pdf.ts, index.tsx (dashboard card), users.tsx (admin toggle).
4. Verify build.
