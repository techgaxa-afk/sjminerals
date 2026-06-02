## Goal

Make the Company module a true parent → multiple-vehicle account with a consolidated ledger (opening balance + manual adjustments + bills + payments), redesign the billing workflow to Company → Vehicle → Product, and harden cloud persistence so nothing relies on optimistic local cache without confirmed Supabase writes.

---

## 1. Schema changes (single migration)

```sql
-- Companies: add manual opening balance
ALTER TABLE public.companies
  ADD COLUMN opening_balance numeric NOT NULL DEFAULT 0;

-- Vehicles: status flag
ALTER TABLE public.vehicles
  ADD COLUMN status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active','inactive'));

-- New table: manual credit / debit adjustments per company
CREATE TABLE public.credit_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  amount numeric NOT NULL,            -- positive = adds to outstanding (debit), negative = reduces
  reason text NOT NULL DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_adjustments TO authenticated;
GRANT ALL ON public.credit_adjustments TO service_role;
ALTER TABLE public.credit_adjustments ENABLE ROW LEVEL SECURITY;
-- read: any authenticated user, write: admin/staff (mirrors existing tables)
```

Realtime publication added for `credit_adjustments`.

## 2. Outstanding-balance formula

```
outstanding(company) =
    opening_balance
  + Σ(bills.totalAmount where companyId)
  - Σ(bills.paidAmount)              -- payments already roll into paid_amount
  + Σ(credit_adjustments.amount)
```

Replace `getCompanyOutstanding` accordingly.

## 3. Store (`src/lib/store.ts`)

- Add `openingBalance` to `Company`, `status` to `Vehicle`, new `CreditAdjustment` type + CRUD + realtime wiring.
- Rewrite `bg()` so failed writes:
  - revert the optimistic cache change,
  - surface via a new event bus consumed by a toast layer.
- Add awaited `*Async` variants for forms that need a confirmed result (`saveCompanyAsync`, `saveVehicleAsync`, `saveBillAsync`, `savePaymentAsync`, `saveExpenseAsync`, …). Existing call sites switch to the async versions and await before closing dialogs.
- Add `saveCreditAdjustment`, `getCreditAdjustmentsByCompany`.

## 4. Toast / error layer

Use existing `sonner` (already in template). Add a single subscriber in `AppLayout` that listens to store error events and shows `toast.error(...)` with the Supabase message. Add `toast.success(...)` to form submit handlers (companies, vehicles, bills, payments, expenses, products, operators, hitachi).

## 5. Companies list (`src/routes/companies.tsx`)

- Add **Opening Balance** field to the form.
- Card outstanding uses new formula.

## 6. Company detail page (`src/routes/companies.$id.tsx`)

Tabs: Overview · Vehicles · Invoices · Payments · Adjustments · Ledger.

- **Overview**: Company info, Opening Balance, Total Sales, Total Paid, Outstanding, # bills, last bill/payment dates, "Receive Payment" and "Add Adjustment" buttons.
- **Vehicles**: list + add/edit/delete inline (number, capacity, driver, status). Reuses `saveVehicle`/`updateVehicle`/`deleteVehicle`.
- **Invoices**: all bills across all vehicles — invoice #, date, vehicle, products summary, total, paid, outstanding, status, View / Edit / PDF.
- **Payments**: payment history with date, amount, notes, linked bill/invoice.
- **Adjustments**: list manual credit adjustments + form (amount, reason, date).
- **Ledger**: chronological table (Date | Description | Debit | Credit | Balance) combining opening balance row + invoices + payments + adjustments.

"Receive Payment" modal: date, amount, method (cash/UPI/split with cash+upi split), notes → calls `saveCompanyPayment` (FIFO across outstanding bills) and shows toast.

## 7. Billing workflow (`src/routes/billing.tsx`)

Stepper:
1. **Company** — search/select from companies list, or "+ New Company" inline.
2. **Vehicle** — list of that company's active vehicles, or "+ New Vehicle" inline. Selecting auto-fills vehicle number, driver, capacity.
3. **Products** — existing 2-col grid. On select, quantity defaults to `vehicleCapacity` (editable).
4. Tips/pass/payment as today.

Legacy free-text vehicle lookup kept as a fallback for back-compat.

## 8. Persistence audit

For every module (Companies, Vehicles, Bills, Payments, Expenses, Products, Hitachi machines/entries/fuel, Operators, Credit Adjustments):

- Confirm `loadAll()` pulls the table.
- Confirm save/update/delete go through the new awaited helpers.
- Confirm realtime subscription exists.
- Error toast on failure, success toast on success.

## 9. Out of scope (for this turn)

- Reworking the existing PDF exports beyond minor field additions (opening balance line in company statement).
- Migrating historical data — `opening_balance` defaults to 0, users enter previous dues manually as requested.
- Auth/RLS changes — current policies already cover the new table pattern.

---

## Technical notes

- `credit_adjustments.amount` is signed so the same table covers "add previous due" (positive) and "manual credit" (negative).
- Awaited writes return `{ data, error }`-style; UI handlers `if (error) toast.error(error.message); return;` before closing dialogs, so failed writes no longer "disappear on refresh".
- Realtime continues to reconcile any external changes.
- Total file impact: 1 migration, `store.ts`, `companies.tsx`, `companies.$id.tsx`, `billing.tsx`, `AppLayout.tsx` (toast bridge), small touch-ups in `bills.tsx`, `expenses.tsx`, `products.tsx`, `hitachi.tsx` for success/error toasts.
