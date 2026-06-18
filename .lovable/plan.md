# Hitachi Cost Analytics & Cost-Per-Hour System

Owned Hitachis are cost centers (not revenue). Material sales remain the only revenue source. This plan adds a machine type, expense allocation to a machine, and a new analytics tab with cost-per-hour math, alerts, filters, and exports.

## 1. Database changes (one migration)

`hitachi_machines`
- add `type text not null default 'owned' check (type in ('owned','rented'))`
- add `rental_rate numeric` (per-hour rental, used for rented machines when no explicit rental expense is logged)

`expenses`
- add `allocate_to text not null default 'general' check (allocate_to in ('general','hitachi'))`
- add `hitachi_machine_id uuid references public.hitachi_machines(id) on delete set null`
- add `subcategory text` (free-form: fuel/maintenance/salary/repairs/rental/other — already covered by `category` but kept for clarity if needed; otherwise reuse existing `category`)

Index: `create index on public.expenses (hitachi_machine_id) where hitachi_machine_id is not null;`

RLS unchanged (existing expenses policies still apply). No new tables, so no new GRANTs needed.

## 2. Shared constants

Extend `src/lib/expense-categories.ts`:
- add `repairs` and `rental` to `EXPENSE_CATEGORIES`.
- export `HITACHI_ALLOCATABLE_CATEGORIES = ["fuel","maintenance","salary","repairs","rental"]`.

Add runtime warning at startup if DB has unknown categories (already implemented for current set).

## 3. Hitachi master UI (`src/routes/hitachi.tsx`)

In the machine create/edit dialog:
- Type radio: Owned / Rented.
- Rental rate input (₹/hr), shown only for Rented.

## 4. Expense form (`src/routes/expenses.tsx`)

Add to create/edit dialog:
- "Allocate To" select: `General Expense` or one machine from the active hitachi list.
- When a machine is selected, restrict category options to `HITACHI_ALLOCATABLE_CATEGORIES`.
- Save `allocate_to` + `hitachi_machine_id` via store.

Filters: add "Machine" filter on the expenses list.

## 5. New Analytics tab in Reports

Add `"hitachi"` to `ReportType` in `src/routes/reports.tsx`. Tab label: "Hitachi Analytics". Reuses existing date filter (Daily/Weekly/Monthly/Custom) and export plumbing.

### Summary cards
- Total Hitachi Hours (sum of `hitachi_entries.hours` in range)
- Total Fuel Cost
- Total Maintenance Cost
- Total Salary Cost
- Average Cost Per Hour (total cost across all machines ÷ total hours)

### Machine performance table
Columns: Machine, Type, Hours Worked, Fuel, Maintenance, Salary, Rental, Total Cost, Cost/Hour.

Formulas:
- Owned: `total = fuel + maintenance + salary + repairs`
- Rented: `total = rental + fuel + salary + repairs` where `rental` = sum of category=rental expenses allocated to that machine, plus `rental_rate * hours` if no rental expenses exist
- `cost_per_hour = total / hours` (guard divide-by-zero → display "—")

### Sub-sections
- **Maintenance analytics**: lifetime maintenance, current month maintenance, maintenance/hr.
- **Fuel analytics**: fuel cost, fuel/hr.

### Alerts
- High maintenance: machine maintenance/hr > 1.5× fleet median.
- High fuel: machine fuel/hr > 1.5× fleet median.
- Zero hours: machines with no entries in range.

### Exports
- PDF (print window, reuse pattern from expenses report)
- Excel (.xls HTML blob)
- CSV

## 6. Store layer (`src/lib/store.ts`)

- Extend `Hitachi` type with `type`, `rental_rate`.
- Extend `Expense` type with `allocate_to`, `hitachi_machine_id`.
- Add `getHitachiCostBreakdown(range, machineId?)` helper that returns per-machine aggregates used by the analytics tab.
- Validation: block save if `allocate_to='hitachi'` but `hitachi_machine_id` missing, or if category not in `HITACHI_ALLOCATABLE_CATEGORIES` when allocated to a machine.

## 7. Verification

- `bunx tsc --noEmit` clean
- Add a hitachi machine (owned + rented), log fuel/maintenance/salary/repairs/rental expenses against it, log hitachi hours, then confirm analytics totals and cost/hour match hand calculation
- Exports open in PDF/Excel/CSV

## Files touched
- `supabase/migrations/<new>.sql` (created)
- `src/lib/expense-categories.ts`
- `src/lib/store.ts`
- `src/routes/hitachi.tsx`
- `src/routes/expenses.tsx`
- `src/routes/reports.tsx`
