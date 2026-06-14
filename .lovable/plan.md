# Phase 2 — Financial Operations Upgrade

Builds on existing AR system. Will not touch AR math, payment storage, receipt numbering, audit log, or aging logic.

## 1. Auto Receipt Workflow
After `saveCompanyPayment` succeeds, open a Receipt modal:
- Live preview (iframe of receipt HTML)
- **Download** — saves `RCPT-YYYY-NNNNN.pdf` via existing `exportReceiptPDF`
- **Print** — same export (opens print dialog)
- **Share** — `navigator.share` (Web Share API) with text fallback (copy link/details to clipboard) when unavailable

## 2. Management Dashboard
Add to `/` (existing cards retained):
- **Credit Limit Exceeded** card — count of companies where outstanding > creditLimit (links to a filterable list inside the card)
- Confirm Total Receivables / Overdue / Today's / This Month already render (they do)
- Top Outstanding table already exists; expand from 5 to 10 rows and add Last Payment column

## 3. Analytics Report Tab
New tab `Analytics` in `/reports`:
- **Monthly Collections** — bar chart, last 12 months of `company_payments.amount` (active only)
- **Outstanding Trend** — line chart, total outstanding snapshot per month-end (computed from bills + payments history)
- **Collection Performance** — grouped bar: Invoiced vs Collected per month, plus collection-rate %

## 4. User Roles (RBAC)
Roles & default permissions:

| Role | Bills | Payments | Reports | Companies/Vehicles | Users | Hitachi/Expenses |
|---|---|---|---|---|---|---|
| admin | full | full + reverse | full | full | manage | full |
| accountant | view | full + reverse | full | view | — | view |
| operator | create/edit | view only | view | view | — | full |
| viewer | view | view | view | view | — | view |

Implementation:
- Migration: `ALTER TYPE public.app_role ADD VALUE 'accountant'`, `'operator'`, `'viewer'`
- Helper SQL function `has_any_role(uid, roles[])` reused in RLS write policies; existing write policies updated from `has_role(uid,'admin') OR has_role(uid,'staff')` → `has_any_role(...)` per table (admin always wins; accountant gains write on `company_payments` + `credit_adjustments` only; operator gains write on `bills`, `bill_items`, `hitachi_*`, `expenses`, `vehicles`; viewer write nowhere)
- Update `useUserRoles` to return `roles[]` + helpers `isAdmin / isAccountant / isOperator / isViewer / can(area)` 
- Client gates: hide nav items + write buttons by role; route components show a polite "Read-only" notice if user lacks write
- Keep `handle_new_user` admin-first-user logic; new users default to `viewer`

## 5. Financial Data Protection
- Remove **Delete** button from Payment History row
- Keep **Reverse** (already implemented, audit-logged)
- Reversal history view: payment row already shows `REVERSED` badge + reason tooltip; add an expandable details strip on click showing `reversal_reason`, `reversed_at`, and `reversed_by` (resolved via profiles)
- `deleteCompanyPayment` kept in store but no UI calls it

## Files to modify
- `supabase/migrations/<new>.sql` — enum values, `has_any_role`, updated RLS for ~10 tables
- `src/hooks/use-roles.tsx` — extended role helpers
- `src/lib/store.ts` — none (AR untouched)
- `src/components/AppLayout.tsx` — nav items gated by role
- `src/routes/index.tsx` — Credit-Limit-Exceeded card, Top-Outstanding +5 rows + Last Payment
- `src/routes/reports.tsx` — Analytics tab + 3 charts
- `src/routes/companies.$id.tsx` — Receipt modal post-save; remove delete button; expandable reversal details
- `src/routes/users.tsx` — expose 4 toggles instead of 2

## Out of scope (will not change)
- AR totals, aging, statement, ledger math
- `company_payments` schema, `audit_log`, `receipt_counters`, `next_receipt_number`
- Existing realtime sync, CSV/PDF exports

## Decisions needed before I start
1. **Operator write on payments?** Plan says no (accountant-only) — confirm.
2. **Default role for new sign-ups?** Plan says `viewer` (must be promoted). Alternative: `operator`.
3. **Migration scope** — OK to rewrite write-RLS on the 10 business tables in one migration?
