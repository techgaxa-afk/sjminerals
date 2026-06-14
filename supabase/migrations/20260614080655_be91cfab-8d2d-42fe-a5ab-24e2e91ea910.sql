
-- 1. Companies: credit limit
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS credit_limit numeric NOT NULL DEFAULT 0;

-- 2. Company payments: receipt + reversal fields
ALTER TABLE public.company_payments
  ADD COLUMN IF NOT EXISTS receipt_number text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS reversal_reason text,
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reversed_by uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'company_payments_status_check'
  ) THEN
    ALTER TABLE public.company_payments
      ADD CONSTRAINT company_payments_status_check CHECK (status IN ('active','reversed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'company_payments_amount_positive'
  ) THEN
    ALTER TABLE public.company_payments
      ADD CONSTRAINT company_payments_amount_positive CHECK (amount > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_company_payments_status ON public.company_payments(status);
CREATE INDEX IF NOT EXISTS idx_company_payments_date_desc ON public.company_payments(payment_date DESC);

-- 3. Receipt counter table + generator
CREATE TABLE IF NOT EXISTS public.receipt_counters (
  year int PRIMARY KEY,
  last_number int NOT NULL DEFAULT 0
);

GRANT SELECT ON public.receipt_counters TO authenticated;
GRANT ALL ON public.receipt_counters TO service_role;

ALTER TABLE public.receipt_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "receipt_counters read" ON public.receipt_counters;
CREATE POLICY "receipt_counters read" ON public.receipt_counters
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.next_receipt_number(_year int DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  y int := COALESCE(_year, EXTRACT(year FROM now())::int);
  n int;
BEGIN
  INSERT INTO public.receipt_counters(year, last_number)
    VALUES (y, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_number = public.receipt_counters.last_number + 1
  RETURNING last_number INTO n;
  RETURN 'RCPT-' || y::text || '-' || lpad(n::text, 5, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.next_receipt_number(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_receipt_number(int) TO authenticated, service_role;

-- 4. Backfill receipt numbers for existing payments
DO $$
DECLARE
  r record;
  yr int;
  cnt int;
  receipt text;
BEGIN
  FOR r IN
    SELECT id, payment_date
    FROM public.company_payments
    WHERE receipt_number IS NULL
    ORDER BY payment_date, created_at
  LOOP
    yr := EXTRACT(year FROM r.payment_date)::int;
    INSERT INTO public.receipt_counters(year, last_number)
      VALUES (yr, 1)
    ON CONFLICT (year) DO UPDATE
      SET last_number = public.receipt_counters.last_number + 1
    RETURNING last_number INTO cnt;
    receipt := 'RCPT-' || yr::text || '-' || lpad(cnt::text, 5, '0');
    UPDATE public.company_payments SET receipt_number = receipt WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS company_payments_receipt_number_unique
  ON public.company_payments(receipt_number);

-- 5. Audit log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb
);

GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log read authenticated" ON public.audit_log;
CREATE POLICY "audit_log read authenticated" ON public.audit_log
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "audit_log insert self" ON public.audit_log;
CREATE POLICY "audit_log insert self" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_ts_desc ON public.audit_log(ts DESC);
