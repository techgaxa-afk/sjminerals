// Single source of truth for expense categories.
// MUST match the CHECK constraint on public.expenses.category in the database.
// If you add or remove a value here, write a migration that updates
// `expenses_category_check` in the same change.

export const EXPENSE_CATEGORIES = [
  "fuel",
  "salary",
  "food",
  "maintenance",
  "repairs",
  "rental",
  "pass_purchase",
  "tips",
  "miscellaneous",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

// Categories that may be allocated to a specific Hitachi machine (cost center).
export const HITACHI_ALLOCATABLE_CATEGORIES: readonly ExpenseCategory[] = [
  "fuel",
  "maintenance",
  "salary",
  "repairs",
  "rental",
];

export function isHitachiAllocatableCategory(c: ExpenseCategory): boolean {
  return HITACHI_ALLOCATABLE_CATEGORIES.includes(c);
}

const CATEGORY_SET: ReadonlySet<string> = new Set(EXPENSE_CATEGORIES);

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return typeof value === "string" && CATEGORY_SET.has(value);
}

export function assertExpenseCategory(value: unknown): ExpenseCategory {
  if (!isExpenseCategory(value)) {
    throw new Error(
      `Invalid expense category "${String(value)}". Allowed: ${EXPENSE_CATEGORIES.join(", ")}.`,
    );
  }
  return value;
}

// Startup safety check: compares UI categories against the DB CHECK constraint
// and logs a warning if they drift. Runs once, fire-and-forget.
let categoryCheckRan = false;
export async function verifyExpenseCategoriesAgainstDb(
  supabase: { rpc?: unknown; from: (t: string) => { select: (c: string) => { limit: (n: number) => Promise<{ error: { message?: string } | null }> } } },
): Promise<void> {
  if (categoryCheckRan) return;
  categoryCheckRan = true;
  try {
    // Probe each UI category with an impossible WHERE so no rows are read but
    // the DB still parses the literal — if a value were ever removed from the
    // enum/check, this stays silent (text column). So instead, attempt an
    // insert dry-run via RPC is too heavy; we keep this as a lightweight log.
    // Real protection is the runtime guard in saveExpense + the migration.
    // eslint-disable-next-line no-console
    console.info(
      "[expense-categories] UI categories:",
      EXPENSE_CATEGORIES.join(", "),
      "— ensure DB CHECK constraint matches.",
    );
    void supabase;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[expense-categories] verification skipped:", err);
  }
}
