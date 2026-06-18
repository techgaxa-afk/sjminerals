
-- ===== app_settings (singleton) =====
CREATE TABLE IF NOT EXISTS public.app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  allow_backdated_bills boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO authenticated;
GRANT UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings read auth" ON public.app_settings;
CREATE POLICY "app_settings read auth" ON public.app_settings
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','staff','accountant','operator','viewer']));

DROP POLICY IF EXISTS "app_settings admin update" ON public.app_settings;
CREATE POLICY "app_settings admin update" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_settings (id, allow_backdated_bills) VALUES (true, true)
  ON CONFLICT (id) DO NOTHING;

-- ===== bill_date_audit =====
CREATE TABLE IF NOT EXISTS public.bill_date_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  old_bill_date date,
  new_bill_date date NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bill_date_audit_bill_id_idx ON public.bill_date_audit(bill_id);

GRANT SELECT ON public.bill_date_audit TO authenticated;
GRANT ALL ON public.bill_date_audit TO service_role;
ALTER TABLE public.bill_date_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bill_date_audit read admin/staff" ON public.bill_date_audit;
CREATE POLICY "bill_date_audit read admin/staff" ON public.bill_date_audit
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']));
-- No INSERT/UPDATE/DELETE policies: trigger writes via SECURITY DEFINER.

-- ===== Trigger: enforce backdating rules + record audit =====
CREATE OR REPLACE FUNCTION public.bills_enforce_backdate_and_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean;
  is_staff boolean;
  is_accountant boolean;
  is_operator boolean;
  allow_back boolean;
  diff_days int;
  new_date date;
  old_date date;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_date := COALESCE(NEW.bill_date, CURRENT_DATE);
    old_date := NULL;
  ELSE
    new_date := NEW.bill_date;
    old_date := OLD.bill_date;
  END IF;

  -- Only validate when a date is being set/changed and is in the past
  IF uid IS NOT NULL AND new_date IS NOT NULL AND new_date < CURRENT_DATE
     AND (TG_OP = 'INSERT' OR new_date IS DISTINCT FROM old_date) THEN

    is_admin := public.has_role(uid, 'admin');
    is_staff := public.has_role(uid, 'staff');
    is_accountant := public.has_role(uid, 'accountant');
    is_operator := public.has_role(uid, 'operator');

    SELECT allow_backdated_bills INTO allow_back FROM public.app_settings WHERE id = true;
    allow_back := COALESCE(allow_back, true);

    IF NOT is_admin THEN
      IF NOT allow_back THEN
        RAISE EXCEPTION 'Backdated bills are disabled by the administrator.';
      END IF;
      diff_days := (CURRENT_DATE - new_date);
      IF is_operator AND NOT (is_staff OR is_accountant) THEN
        RAISE EXCEPTION 'Operators cannot create backdated bills.';
      END IF;
      IF (is_staff OR is_accountant) AND diff_days > 30 THEN
        RAISE EXCEPTION 'Staff/Accountant users can only create bills up to 30 days in the past.';
      END IF;
      IF NOT (is_staff OR is_accountant OR is_operator) THEN
        RAISE EXCEPTION 'You are not allowed to create bills.';
      END IF;
    END IF;
  END IF;

  -- Record audit when bill_date changes (UPDATE) or on INSERT with backdate
  IF TG_OP = 'UPDATE' AND new_date IS DISTINCT FROM old_date THEN
    INSERT INTO public.bill_date_audit (bill_id, old_bill_date, new_bill_date, changed_by)
    VALUES (NEW.id, old_date, new_date, uid);
  ELSIF TG_OP = 'INSERT' AND new_date IS NOT NULL AND new_date < CURRENT_DATE THEN
    INSERT INTO public.bill_date_audit (bill_id, old_bill_date, new_bill_date, changed_by)
    VALUES (NEW.id, NULL, new_date, uid);
  END IF;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.bills_enforce_backdate_and_audit() FROM PUBLIC;

DROP TRIGGER IF EXISTS bills_enforce_backdate_trg ON public.bills;
CREATE TRIGGER bills_enforce_backdate_trg
  AFTER INSERT OR UPDATE OF bill_date ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.bills_enforce_backdate_and_audit();

-- updated_at trigger for app_settings
DROP TRIGGER IF EXISTS app_settings_set_updated_at ON public.app_settings;
CREATE TRIGGER app_settings_set_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
