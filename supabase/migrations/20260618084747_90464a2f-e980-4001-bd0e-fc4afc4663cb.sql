
-- Helper: roles allowed to READ any business data
-- Using has_any_role with all role names; viewer is read-only.

-- ============ hitachi_rental_payments: drop public-role policies, recreate as authenticated ============
DROP POLICY IF EXISTS "auth read hitachi_rental_payments" ON public.hitachi_rental_payments;
DROP POLICY IF EXISTS "ops insert hitachi_rental_payments" ON public.hitachi_rental_payments;
DROP POLICY IF EXISTS "ops update hitachi_rental_payments" ON public.hitachi_rental_payments;
DROP POLICY IF EXISTS "admin delete hitachi_rental_payments" ON public.hitachi_rental_payments;

CREATE POLICY "auth read hitachi_rental_payments" ON public.hitachi_rental_payments
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','staff','accountant','operator','viewer']));
CREATE POLICY "ops insert hitachi_rental_payments" ON public.hitachi_rental_payments
  FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "ops update hitachi_rental_payments" ON public.hitachi_rental_payments
  FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','staff','operator']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "admin delete hitachi_rental_payments" ON public.hitachi_rental_payments
  FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','staff']));

-- ============ Tighten SELECT (replace USING (true) with role check) ============
DO $$
DECLARE
  r record;
  tables text[] := ARRAY[
    'bills','bill_items','companies','company_payments','credit_adjustments',
    'expenses','hitachi_entries','hitachi_fuel','hitachi_machines',
    'operators','payments','products','vehicles','vehicle_documents','vehicle_maintenance'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- drop any existing "auth read <t>" style SELECT policies that allow true
    FOR r IN
      SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename=t AND cmd='SELECT'
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, t);
    END LOOP;
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY[''admin'',''staff'',''accountant'',''operator'',''viewer'']))',
      'auth read ' || t, t
    );
  END LOOP;
END $$;

-- ============ receipt_counters: require a role ============
DROP POLICY IF EXISTS "receipt_counters read" ON public.receipt_counters;
CREATE POLICY "receipt_counters read" ON public.receipt_counters
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin','staff','accountant','operator','viewer']));
