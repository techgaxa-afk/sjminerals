ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS invoice_number text;
CREATE UNIQUE INDEX IF NOT EXISTS bills_invoice_number_unique ON public.bills (invoice_number) WHERE invoice_number IS NOT NULL;