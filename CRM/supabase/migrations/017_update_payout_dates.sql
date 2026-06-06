-- Migration to update payout dates in users table

-- Drop joining_date column if it exists
ALTER TABLE public.users
DROP COLUMN IF EXISTS joining_date;

-- Add fixed_start_date column
ALTER TABLE public.users
ADD COLUMN fixed_start_date DATE;

-- Add fixed_end_date column
ALTER TABLE public.users
ADD COLUMN fixed_end_date DATE;
