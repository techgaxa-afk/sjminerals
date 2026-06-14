CREATE UNIQUE INDEX IF NOT EXISTS vehicles_company_vehicle_number_unique
ON public.vehicles (company_id, lower(vehicle_number));