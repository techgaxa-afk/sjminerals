
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS bill_date date,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.bills SET bill_date = (created_at AT TIME ZONE 'UTC')::date WHERE bill_date IS NULL;

ALTER TABLE public.bills ALTER COLUMN bill_date SET NOT NULL;
ALTER TABLE public.bills ALTER COLUMN bill_date SET DEFAULT CURRENT_DATE;

CREATE INDEX IF NOT EXISTS bills_bill_date_idx ON public.bills(bill_date);
CREATE INDEX IF NOT EXISTS bills_created_by_idx ON public.bills(created_by);

CREATE OR REPLACE FUNCTION public.bills_set_audit_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN
      NEW.created_by := auth.uid();
    END IF;
    IF NEW.bill_date IS NULL THEN
      NEW.bill_date := CURRENT_DATE;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
    NEW.updated_by := auth.uid();
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bills_set_audit_fields_trg ON public.bills;
CREATE TRIGGER bills_set_audit_fields_trg
BEFORE INSERT OR UPDATE ON public.bills
FOR EACH ROW EXECUTE FUNCTION public.bills_set_audit_fields();
