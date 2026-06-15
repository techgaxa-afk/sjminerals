
-- 1. Tighten audit_log SELECT to admin/staff
DROP POLICY IF EXISTS "audit_log read authenticated" ON public.audit_log;
CREATE POLICY "audit_log read admin staff" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']));

-- 2. Remove broad INSERT policy; writes go through SECURITY DEFINER fn below
DROP POLICY IF EXISTS "audit_log insert self" ON public.audit_log;

-- 3. SECURITY DEFINER function to record audit entries safely as auth.uid()
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action text,
  _entity_type text,
  _entity_id uuid,
  _details jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  INSERT INTO public.audit_log(action, entity_type, entity_id, user_id, details)
  VALUES (_action, _entity_type, _entity_id, auth.uid(), COALESCE(_details, '{}'::jsonb));
END;
$$;

-- 4. Lock down EXECUTE on SECURITY DEFINER functions: revoke from PUBLIC/anon
REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.next_receipt_number(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_receipt_number(integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, text[]) TO authenticated;
