
-- 1) receipt_counters: explicitly deny write access from the API.
-- Writes are performed via SECURITY DEFINER function public.next_receipt_number().
REVOKE INSERT, UPDATE, DELETE ON public.receipt_counters FROM anon, authenticated;

DROP POLICY IF EXISTS "Deny all writes on receipt_counters" ON public.receipt_counters;
CREATE POLICY "Deny all writes on receipt_counters"
ON public.receipt_counters
AS RESTRICTIVE
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- 2) Realtime: drop the unscoped staff/admin subscribe policy on realtime.messages.
DROP POLICY IF EXISTS "Staff can subscribe to realtime" ON realtime.messages;
