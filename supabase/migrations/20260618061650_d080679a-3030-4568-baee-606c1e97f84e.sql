
ALTER TABLE public.operators
  ADD COLUMN IF NOT EXISTS normal_shift_salary numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS single_shift_salary numeric NOT NULL DEFAULT 0;

-- Backfill existing operators: move legacy hourly rate into normal shift salary
UPDATE public.operators
SET normal_shift_salary = hourly_salary_rate
WHERE normal_shift_salary = 0 AND hourly_salary_rate > 0;

ALTER TABLE public.hitachi_entries
  ADD COLUMN IF NOT EXISTS shift_type text NOT NULL DEFAULT 'normal'
    CHECK (shift_type IN ('normal','single'));
