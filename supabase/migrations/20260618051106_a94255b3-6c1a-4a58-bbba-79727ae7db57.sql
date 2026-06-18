ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_category text NULL CHECK (product_category IN ('BOULDERS','K.K'));
ALTER TABLE public.bill_items ADD COLUMN IF NOT EXISTS product_category text NULL CHECK (product_category IN ('BOULDERS','K.K'));
CREATE INDEX IF NOT EXISTS idx_bill_items_category ON public.bill_items(product_category) WHERE product_category IS NOT NULL;