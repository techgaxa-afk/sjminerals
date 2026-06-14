
-- Add new role values (compared as text in policies to avoid same-tx enum-use restriction)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';

-- Helper: text-based role check that works with any current/future role
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = ANY(_roles)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, text[]) TO authenticated, service_role;

-- Permission groups
-- ops_writers  = admin, staff, operator   -> bills, bill_items, hitachi_*, expenses, operators, products, payments
-- ar_writers   = admin, staff, accountant -> company_payments, credit_adjustments
-- master_writers = admin, staff           -> companies, vehicles

-- ===== bills =====
DROP POLICY IF EXISTS "staff insert bills" ON public.bills;
DROP POLICY IF EXISTS "staff update bills" ON public.bills;
DROP POLICY IF EXISTS "admin delete bills" ON public.bills;
CREATE POLICY "ops insert bills" ON public.bills FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "ops update bills" ON public.bills FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff','operator']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "admin delete bills" ON public.bills FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']));

-- ===== bill_items =====
DROP POLICY IF EXISTS "staff insert bill_items" ON public.bill_items;
DROP POLICY IF EXISTS "staff update bill_items" ON public.bill_items;
DROP POLICY IF EXISTS "admin delete bill_items" ON public.bill_items;
CREATE POLICY "ops insert bill_items" ON public.bill_items FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "ops update bill_items" ON public.bill_items FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff','operator']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "admin delete bill_items" ON public.bill_items FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']));

-- ===== hitachi_entries =====
DROP POLICY IF EXISTS "staff insert hitachi_entries" ON public.hitachi_entries;
DROP POLICY IF EXISTS "staff update hitachi_entries" ON public.hitachi_entries;
DROP POLICY IF EXISTS "admin delete hitachi_entries" ON public.hitachi_entries;
CREATE POLICY "ops insert hitachi_entries" ON public.hitachi_entries FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "ops update hitachi_entries" ON public.hitachi_entries FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff','operator']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "admin delete hitachi_entries" ON public.hitachi_entries FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']));

-- ===== hitachi_fuel =====
DROP POLICY IF EXISTS "staff insert hitachi_fuel" ON public.hitachi_fuel;
DROP POLICY IF EXISTS "staff update hitachi_fuel" ON public.hitachi_fuel;
DROP POLICY IF EXISTS "admin delete hitachi_fuel" ON public.hitachi_fuel;
CREATE POLICY "ops insert hitachi_fuel" ON public.hitachi_fuel FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "ops update hitachi_fuel" ON public.hitachi_fuel FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff','operator']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "admin delete hitachi_fuel" ON public.hitachi_fuel FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']));

-- ===== hitachi_machines =====
DROP POLICY IF EXISTS "staff insert hitachi_machines" ON public.hitachi_machines;
DROP POLICY IF EXISTS "staff update hitachi_machines" ON public.hitachi_machines;
DROP POLICY IF EXISTS "admin delete hitachi_machines" ON public.hitachi_machines;
CREATE POLICY "ops insert hitachi_machines" ON public.hitachi_machines FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "ops update hitachi_machines" ON public.hitachi_machines FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff','operator']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "admin delete hitachi_machines" ON public.hitachi_machines FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']));

-- ===== expenses =====
DROP POLICY IF EXISTS "staff insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "staff update expenses" ON public.expenses;
DROP POLICY IF EXISTS "admin delete expenses" ON public.expenses;
CREATE POLICY "ops insert expenses" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "ops update expenses" ON public.expenses FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff','operator']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "admin delete expenses" ON public.expenses FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']));

-- ===== operators =====
DROP POLICY IF EXISTS "staff insert operators" ON public.operators;
DROP POLICY IF EXISTS "staff update operators" ON public.operators;
DROP POLICY IF EXISTS "admin delete operators" ON public.operators;
CREATE POLICY "ops insert operators" ON public.operators FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "ops update operators" ON public.operators FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff','operator']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "admin delete operators" ON public.operators FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']));

-- ===== products =====
DROP POLICY IF EXISTS "staff insert products" ON public.products;
DROP POLICY IF EXISTS "staff update products" ON public.products;
DROP POLICY IF EXISTS "admin delete products" ON public.products;
CREATE POLICY "ops insert products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "ops update products" ON public.products FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff','operator']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff','operator']));
CREATE POLICY "admin delete products" ON public.products FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']));

-- ===== payments (legacy) =====
DROP POLICY IF EXISTS "staff insert payments" ON public.payments;
DROP POLICY IF EXISTS "staff update payments" ON public.payments;
DROP POLICY IF EXISTS "admin delete payments" ON public.payments;
CREATE POLICY "ar insert payments" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff','accountant']));
CREATE POLICY "ar update payments" ON public.payments FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff','accountant']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff','accountant']));
CREATE POLICY "admin delete payments" ON public.payments FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']));

-- ===== company_payments =====
DROP POLICY IF EXISTS "staff insert company_payments" ON public.company_payments;
DROP POLICY IF EXISTS "staff update company_payments" ON public.company_payments;
DROP POLICY IF EXISTS "admin delete company_payments" ON public.company_payments;
CREATE POLICY "ar insert company_payments" ON public.company_payments FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff','accountant']));
CREATE POLICY "ar update company_payments" ON public.company_payments FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff','accountant']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff','accountant']));
CREATE POLICY "admin delete company_payments" ON public.company_payments FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']));

-- ===== credit_adjustments =====
DROP POLICY IF EXISTS "staff insert credit_adjustments" ON public.credit_adjustments;
DROP POLICY IF EXISTS "staff update credit_adjustments" ON public.credit_adjustments;
DROP POLICY IF EXISTS "staff delete credit_adjustments" ON public.credit_adjustments;
CREATE POLICY "ar insert credit_adjustments" ON public.credit_adjustments FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff','accountant']));
CREATE POLICY "ar update credit_adjustments" ON public.credit_adjustments FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff','accountant']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff','accountant']));
CREATE POLICY "admin delete credit_adjustments" ON public.credit_adjustments FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']));

-- ===== companies & vehicles: master records, admin/staff only =====
DROP POLICY IF EXISTS "staff insert companies" ON public.companies;
DROP POLICY IF EXISTS "staff update companies" ON public.companies;
DROP POLICY IF EXISTS "admin delete companies" ON public.companies;
CREATE POLICY "master insert companies" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff']));
CREATE POLICY "master update companies" ON public.companies FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff']));
CREATE POLICY "admin delete companies" ON public.companies FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']));

DROP POLICY IF EXISTS "staff insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "staff update vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "staff delete vehicles" ON public.vehicles;
CREATE POLICY "master insert vehicles" ON public.vehicles FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff']));
CREATE POLICY "master update vehicles" ON public.vehicles FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','staff']));
CREATE POLICY "admin delete vehicles" ON public.vehicles FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','staff']));
