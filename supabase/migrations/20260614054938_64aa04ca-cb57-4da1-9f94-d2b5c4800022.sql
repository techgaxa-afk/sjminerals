-- Lock down SECURITY DEFINER functions so signed-in users cannot probe them directly.
-- handle_new_user is only meant to fire from the auth.users trigger.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- has_role is used inside RLS policies; PostgREST callers should not invoke it directly.
-- RLS evaluation runs as the policy owner and still resolves the SECURITY DEFINER function,
-- so revoking EXECUTE from end-user roles does not break policy checks.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;