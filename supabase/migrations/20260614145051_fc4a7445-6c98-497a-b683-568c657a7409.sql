
-- Drop driver tables and bills.driver_id
ALTER TABLE public.bills DROP COLUMN IF EXISTS driver_id;
DROP TABLE IF EXISTS public.driver_transactions CASCADE;
DROP TABLE IF EXISTS public.drivers CASCADE;

-- Vehicle maintenance log
CREATE TABLE public.vehicle_maintenance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('fuel','service','tyres','battery','repairs','other')),
  vendor TEXT NOT NULL DEFAULT '',
  cost NUMERIC NOT NULL DEFAULT 0,
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_maintenance TO authenticated;
GRANT ALL ON public.vehicle_maintenance TO service_role;
ALTER TABLE public.vehicle_maintenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read veh_maint" ON public.vehicle_maintenance FOR SELECT TO authenticated USING (true);
CREATE POLICY "ops insert veh_maint" ON public.vehicle_maintenance FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "ops update veh_maint" ON public.vehicle_maintenance FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin','staff','operator'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "admin delete veh_maint" ON public.vehicle_maintenance FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin','staff']));
CREATE INDEX veh_maint_vehicle_idx ON public.vehicle_maintenance(vehicle_id);
CREATE INDEX veh_maint_date_idx ON public.vehicle_maintenance(service_date DESC);
CREATE TRIGGER set_veh_maint_updated_at BEFORE UPDATE ON public.vehicle_maintenance FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Vehicle documents
CREATE TABLE public.vehicle_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('insurance','fc','permit','pollution','road_tax')),
  expiry_date DATE NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vehicle_id, doc_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_documents TO authenticated;
GRANT ALL ON public.vehicle_documents TO service_role;
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read veh_docs" ON public.vehicle_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "ops insert veh_docs" ON public.vehicle_documents FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "ops update veh_docs" ON public.vehicle_documents FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin','staff','operator'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "admin delete veh_docs" ON public.vehicle_documents FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin','staff']));
CREATE INDEX veh_docs_vehicle_idx ON public.vehicle_documents(vehicle_id);
CREATE TRIGGER set_veh_docs_updated_at BEFORE UPDATE ON public.vehicle_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
