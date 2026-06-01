-- 1. Add address and notes to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';

-- 2. Create vehicles table (child of company)
CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vehicle_number text NOT NULL,
  vehicle_capacity numeric NOT NULL DEFAULT 0,
  driver_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS vehicles_vehicle_number_unique ON public.vehicles (lower(vehicle_number));
CREATE INDEX IF NOT EXISTS vehicles_company_id_idx ON public.vehicles (company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "staff insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "staff update vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "staff delete vehicles" ON public.vehicles;

CREATE POLICY "auth read vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff insert vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'staff'::app_role));
CREATE POLICY "staff update vehicles" ON public.vehicles FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'staff'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'staff'::app_role));
CREATE POLICY "staff delete vehicles" ON public.vehicles FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'staff'::app_role));

DROP TRIGGER IF EXISTS vehicles_updated_at ON public.vehicles;
CREATE TRIGGER vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Merge duplicate companies (same name, case-insensitive)
DO $$
DECLARE
  rec RECORD;
  canonical_id uuid;
BEGIN
  FOR rec IN
    SELECT lower(trim(name)) AS key, array_agg(id ORDER BY created_at ASC) AS ids
    FROM public.companies
    WHERE name IS NOT NULL AND trim(name) <> ''
    GROUP BY lower(trim(name))
    HAVING count(*) > 1
  LOOP
    canonical_id := rec.ids[1];
    UPDATE public.bills SET company_id = canonical_id WHERE company_id = ANY(rec.ids) AND company_id <> canonical_id;
    UPDATE public.payments SET company_id = canonical_id WHERE company_id = ANY(rec.ids) AND company_id <> canonical_id;
    UPDATE public.expenses SET linked_company_id = canonical_id WHERE linked_company_id = ANY(rec.ids) AND linked_company_id <> canonical_id;
    DELETE FROM public.companies WHERE id = ANY(rec.ids) AND id <> canonical_id;
  END LOOP;
END $$;

-- 4. Backfill vehicles from remaining companies (those that had a vehicle_number directly)
INSERT INTO public.vehicles (company_id, vehicle_number, vehicle_capacity, driver_name)
SELECT c.id, c.vehicle_number, c.vehicle_capacity, c.driver_name
FROM public.companies c
WHERE c.vehicle_number IS NOT NULL AND trim(c.vehicle_number) <> ''
  AND NOT EXISTS (SELECT 1 FROM public.vehicles v WHERE lower(v.vehicle_number) = lower(c.vehicle_number));

-- 4b. Backfill vehicles found only on bills (in case bill referenced a vehicle that isn't on the canonical company row)
INSERT INTO public.vehicles (company_id, vehicle_number, vehicle_capacity, driver_name)
SELECT DISTINCT ON (lower(b.vehicle_number))
  b.company_id, b.vehicle_number, b.vehicle_capacity, b.driver_name
FROM public.bills b
WHERE b.vehicle_number IS NOT NULL AND trim(b.vehicle_number) <> ''
  AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = b.company_id)
  AND NOT EXISTS (SELECT 1 FROM public.vehicles v WHERE lower(v.vehicle_number) = lower(b.vehicle_number))
ORDER BY lower(b.vehicle_number), b.created_at DESC;

-- 5. Security fix: new sign-ups no longer auto-receive 'staff' role.
-- The very first user still becomes admin (bootstrap). All subsequent users
-- have no role until an admin explicitly grants 'staff' or 'admin' via user_roles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));

  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count <= 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  -- Subsequent users get NO role; admin must promote them via user_roles before they can write any data.
  RETURN NEW;
END;
$$;