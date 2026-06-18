
DROP POLICY IF EXISTS "ops insert hitachi_machines" ON public.hitachi_machines;
DROP POLICY IF EXISTS "ops update hitachi_machines" ON public.hitachi_machines;
CREATE POLICY "staff insert hitachi_machines" ON public.hitachi_machines
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff']));
CREATE POLICY "staff update hitachi_machines" ON public.hitachi_machines
  FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff']));

DROP POLICY IF EXISTS "ops insert products" ON public.products;
DROP POLICY IF EXISTS "ops update products" ON public.products;
CREATE POLICY "staff insert products" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff']));
CREATE POLICY "staff update products" ON public.products
  FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff']));
