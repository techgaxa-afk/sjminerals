REVOKE EXECUTE ON FUNCTION public.next_receipt_number(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_receipt_number(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, jsonb) TO authenticated, service_role;