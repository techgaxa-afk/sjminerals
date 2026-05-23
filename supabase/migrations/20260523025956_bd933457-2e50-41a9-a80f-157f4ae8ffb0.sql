ALTER TABLE public.bills 
ADD COLUMN IF NOT EXISTS pass_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS pass_amount numeric NOT NULL DEFAULT 0;