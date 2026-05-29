
-- =========================================================
-- 1) Lock down SECURITY DEFINER functions
-- =========================================================
ALTER FUNCTION public.set_updated_at() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- =========================================================
-- 2) Replace "true" write policies with role-gated policies
--    Reads stay open to authenticated; writes require admin or staff.
-- =========================================================
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'bills','bill_items','payments','companies','operators','expenses',
    'hitachi_entries','hitachi_fuel','hitachi_machines','products'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth insert %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth update %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth delete %1$s" ON public.%1$I', t);

    EXECUTE format($f$
      CREATE POLICY "staff insert %1$s" ON public.%1$I
      FOR INSERT TO authenticated
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'staff'::public.app_role)
      )
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "staff update %1$s" ON public.%1$I
      FOR UPDATE TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'staff'::public.app_role)
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'staff'::public.app_role)
      )
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "admin delete %1$s" ON public.%1$I
      FOR DELETE TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'staff'::public.app_role)
      )
    $f$, t);
  END LOOP;
END $$;

-- =========================================================
-- 3) Realtime — restrict channel subscriptions to authenticated
-- =========================================================
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can read realtime messages" ON realtime.messages;
CREATE POLICY "authenticated can read realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);
