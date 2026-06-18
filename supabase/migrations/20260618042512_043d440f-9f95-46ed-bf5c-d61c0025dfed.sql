-- Hitachi cost analytics: machine type/rental rate + expense allocation to a machine + expanded categories.

-- Expand expense categories to include repairs and rental (for hitachi cost tracking)
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_category_check;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_category_check
  CHECK (category = ANY (ARRAY['fuel'::text, 'salary'::text, 'tips'::text, 'food'::text, 'maintenance'::text, 'repairs'::text, 'rental'::text, 'miscellaneous'::text]));

-- Hitachi machines: type (owned/rented) and optional rental rate per hour
ALTER TABLE public.hitachi_machines ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'owned';
ALTER TABLE public.hitachi_machines DROP CONSTRAINT IF EXISTS hitachi_machines_type_check;
ALTER TABLE public.hitachi_machines ADD CONSTRAINT hitachi_machines_type_check
  CHECK (type = ANY (ARRAY['owned'::text, 'rented'::text]));
ALTER TABLE public.hitachi_machines ADD COLUMN IF NOT EXISTS rental_rate numeric NOT NULL DEFAULT 0;

-- Expenses: allocation target + optional hitachi machine reference
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS allocate_to text NOT NULL DEFAULT 'general';
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_allocate_to_check;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_allocate_to_check
  CHECK (allocate_to = ANY (ARRAY['general'::text, 'hitachi'::text]));

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS hitachi_machine_id uuid REFERENCES public.hitachi_machines(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS expenses_hitachi_machine_id_idx
  ON public.expenses (hitachi_machine_id) WHERE hitachi_machine_id IS NOT NULL;