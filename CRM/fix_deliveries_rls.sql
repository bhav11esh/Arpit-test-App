-- Fix deliveries INSERT RLS policy for admins
-- The existing "Admins can manage all deliveries" policy uses FOR ALL with only USING,
-- which does NOT apply to INSERT (INSERT requires WITH CHECK, not USING).
-- This patch explicitly adds an INSERT policy with WITH CHECK for admins.

-- Drop the old catch-all policy if it exists, then recreate it properly
DROP POLICY IF EXISTS "Admins can manage all deliveries" ON public.deliveries;

-- Recreate as separate policies per operation so both USING and WITH CHECK are covered
CREATE POLICY "Admins can select all deliveries"
  ON public.deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can insert deliveries"
  ON public.deliveries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update all deliveries"
  ON public.deliveries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can delete all deliveries"
  ON public.deliveries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );
