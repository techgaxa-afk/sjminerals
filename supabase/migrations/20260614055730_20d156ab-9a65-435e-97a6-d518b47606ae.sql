ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_status_check;
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_status_check
  CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'maintenance'::text]));