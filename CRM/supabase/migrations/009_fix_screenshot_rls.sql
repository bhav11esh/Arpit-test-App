-- Fix RLS Policy for Screenshots (Allow Fraud Detection uploads)
-- V1 FIX: Relax the INSERT policy and update constraints
ALTER TABLE public.screenshots ALTER COLUMN delivery_id DROP NOT NULL;

-- Fix type constraint
ALTER TABLE public.screenshots DROP CONSTRAINT IF EXISTS screenshots_type_check;
ALTER TABLE public.screenshots ADD CONSTRAINT screenshots_type_check CHECK (type IN ('PAYMENT', 'FOLLOW', 'FRAUD_DETECTION'));

-- Drop old and new policy names to ensure idempotency
DROP POLICY IF EXISTS "Users can upload screenshots for their deliveries" ON public.screenshots;
DROP POLICY IF EXISTS "Users can upload screenshots" ON public.screenshots;

CREATE POLICY "Users can upload screenshots"
  ON public.screenshots FOR INSERT
  WITH CHECK (
    user_id::text = auth.uid()::text
  );

-- V1 FIX: Allow photographers to delete their own screenshots (soft or hard)
DROP POLICY IF EXISTS "Users can delete their own screenshots" ON public.screenshots;

CREATE POLICY "Users can delete their own screenshots"
  ON public.screenshots FOR UPDATE
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

-- Ensure SELECT also handles the user_id correctly
DROP POLICY IF EXISTS "Users can view screenshots for their deliveries" ON public.screenshots;
DROP POLICY IF EXISTS "Users can view screenshots" ON public.screenshots;

CREATE POLICY "Users can view screenshots"
  ON public.screenshots FOR SELECT
  USING (
    user_id::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );
