
CREATE TABLE public.company_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text,
  reference_number text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_payments_company_id ON public.company_payments(company_id);
CREATE INDEX idx_company_payments_payment_date ON public.company_payments(payment_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_payments TO authenticated;
GRANT ALL ON public.company_payments TO service_role;

ALTER TABLE public.company_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read company_payments" ON public.company_payments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "staff insert company_payments" ON public.company_payments
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "staff update company_payments" ON public.company_payments
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "admin delete company_payments" ON public.company_payments
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE TRIGGER trg_company_payments_updated
  BEFORE UPDATE ON public.company_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.company_payments;
