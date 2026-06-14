-- RLS policies that reference public.has_role require EXECUTE for the calling role.
-- Re-grant to authenticated; keep PUBLIC/anon revoked.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;