-- Restrict realtime channel subscriptions to admin/staff only.
DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can read realtime messages" ON realtime.messages;

CREATE POLICY "Staff can subscribe to realtime"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
  );