DROP INDEX IF EXISTS public.companies_vehicle_number_unique;
ALTER TABLE public.companies DROP COLUMN IF EXISTS driver_name;
ALTER TABLE public.companies DROP COLUMN IF EXISTS vehicle_number;
ALTER TABLE public.companies DROP COLUMN IF EXISTS vehicle_capacity;