
-- 1) Extend hitachi_entries with optional cost-tracking columns (NULL-safe defaults)
ALTER TABLE public.hitachi_entries
  ADD COLUMN IF NOT EXISTS maintenance_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS diesel_liters numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS diesel_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tips numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rental_charge numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS diesel_paid numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rental_payment_made numeric NOT NULL DEFAULT 0;

-- 2) New table: rental payments to machine owner (partial-pay history)
CREATE TABLE IF NOT EXISTS public.hitachi_rental_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.hitachi_machines(id) ON DELETE CASCADE,
  machine_name text NOT NULL DEFAULT '',
  amount numeric NOT NULL CHECK (amount >= 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_mode text NOT NULL DEFAULT 'cash',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hitachi_rental_payments TO authenticated;
GRANT ALL ON public.hitachi_rental_payments TO service_role;

ALTER TABLE public.hitachi_rental_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read hitachi_rental_payments"
  ON public.hitachi_rental_payments FOR SELECT
  USING (true);

CREATE POLICY "ops insert hitachi_rental_payments"
  ON public.hitachi_rental_payments FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','staff','operator']));

CREATE POLICY "ops update hitachi_rental_payments"
  ON public.hitachi_rental_payments FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['admin','staff','operator']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','staff','operator']));

CREATE POLICY "admin delete hitachi_rental_payments"
  ON public.hitachi_rental_payments FOR DELETE
  USING (has_any_role(auth.uid(), ARRAY['admin','staff']));

CREATE INDEX IF NOT EXISTS hitachi_rental_payments_machine_idx
  ON public.hitachi_rental_payments (machine_id, payment_date DESC);
