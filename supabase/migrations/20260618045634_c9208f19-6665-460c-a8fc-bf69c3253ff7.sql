DROP POLICY IF EXISTS "ops insert operators" ON public.operators;
DROP POLICY IF EXISTS "ops update operators" ON public.operators;

CREATE POLICY "admin staff insert operators" ON public.operators
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::text, 'staff'::text]));

CREATE POLICY "admin staff update operators" ON public.operators
  FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::text, 'staff'::text]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::text, 'staff'::text]));