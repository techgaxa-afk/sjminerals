
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS opening_balance numeric NOT NULL DEFAULT 0;
ALTER TABLE public.vehicles  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='vehicles_status_check') THEN
    ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_status_check CHECK (status IN ('active','inactive'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.credit_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  amount numeric NOT NULL,
  reason text NOT NULL DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_adjustments TO authenticated;
GRANT ALL ON public.credit_adjustments TO service_role;
ALTER TABLE public.credit_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read credit_adjustments" ON public.credit_adjustments;
CREATE POLICY "auth read credit_adjustments" ON public.credit_adjustments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "staff insert credit_adjustments" ON public.credit_adjustments;
CREATE POLICY "staff insert credit_adjustments" ON public.credit_adjustments
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "staff update credit_adjustments" ON public.credit_adjustments;
CREATE POLICY "staff update credit_adjustments" ON public.credit_adjustments
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "staff delete credit_adjustments" ON public.credit_adjustments;
CREATE POLICY "staff delete credit_adjustments" ON public.credit_adjustments
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_adjustments;
