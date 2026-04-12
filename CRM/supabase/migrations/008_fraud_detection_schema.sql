-- Migration 008: Fraud Detection Schema & Storage Cleanup Support
-- Adds showroom_code for non-delivery linked uploads and expands screenshot types.

-- 1. Add showroom_code to screenshots table
ALTER TABLE public.screenshots ADD COLUMN IF NOT EXISTS showroom_code TEXT;

-- 2. Expand screenshot_type enum (if using native postgres enum)
-- Note: In this project, screenshot_type is usually handled via CHECK constraint or just TEXT in DB
-- Let's ensure the column can handle the new types and has proper indexes.
CREATE INDEX IF NOT EXISTS idx_screenshots_showroom_code ON public.screenshots(showroom_code);
CREATE INDEX IF NOT EXISTS idx_screenshots_type ON public.screenshots(type);

-- 3. Update RLS for non-delivery linked screenshots (Admins only)
-- Photographers can already create screenshots, but let's ensure they can't delete them.
DROP POLICY IF EXISTS "Photographers can upload screenshots" ON public.screenshots;
CREATE POLICY "Photographers can upload screenshots"
  ON public.screenshots FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can delete screenshots" ON public.screenshots;
CREATE POLICY "Admins can delete screenshots"
  ON public.screenshots FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid() AND public.users.role = 'ADMIN'
    )
  );
