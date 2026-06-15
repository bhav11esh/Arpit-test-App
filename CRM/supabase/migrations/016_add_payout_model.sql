-- Migration to add payout_model and joining_date to users table

-- Add payout_model column
ALTER TABLE public.users
ADD COLUMN payout_model TEXT DEFAULT 'PERCENTAGE';

-- Add joining_date column
ALTER TABLE public.users
ADD COLUMN joining_date DATE;

-- Update existing users to have PERCENTAGE payout_model
UPDATE public.users
SET payout_model = 'PERCENTAGE'
WHERE payout_model IS NULL;
