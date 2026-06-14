
CREATE TABLE public.drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL DEFAULT '',
  license_number TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drivers TO authenticated;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read drivers" ON public.drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY "ops insert drivers" ON public.drivers FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "ops update drivers" ON public.drivers FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin','staff','operator'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "admin delete drivers" ON public.drivers FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin','staff']));
CREATE TRIGGER set_drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.driver_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  txn_type TEXT NOT NULL CHECK (txn_type IN ('advance','settlement')),
  amount NUMERIC NOT NULL DEFAULT 0,
  txn_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_transactions TO authenticated;
GRANT ALL ON public.driver_transactions TO service_role;
ALTER TABLE public.driver_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read driver_txn" ON public.driver_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "ops insert driver_txn" ON public.driver_transactions FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "ops update driver_txn" ON public.driver_transactions FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin','staff','operator'])) WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "admin delete driver_txn" ON public.driver_transactions FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin','staff']));
CREATE INDEX driver_txn_driver_idx ON public.driver_transactions(driver_id);
CREATE INDEX driver_txn_date_idx ON public.driver_transactions(txn_date DESC);
CREATE TRIGGER set_driver_txn_updated_at BEFORE UPDATE ON public.driver_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.bills ADD COLUMN driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL;
CREATE INDEX bills_driver_idx ON public.bills(driver_id);
