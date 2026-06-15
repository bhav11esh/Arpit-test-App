-- Migration 010: Fix Screenshots Constraints
-- This migration drops the legacy/misnamed screenshot_url_check and ensures delivery_id can be null for FRAUD_DETECTION.

-- 1. Drop any legacy check constraints that might be blocking uploads
ALTER TABLE public.screenshots DROP CONSTRAINT IF EXISTS screenshots_screenshot_url_check;
ALTER TABLE public.screenshots DROP CONSTRAINT IF EXISTS screenshots_file_url_check;
ALTER TABLE public.screenshots DROP CONSTRAINT IF EXISTS screenshots_delivery_id_check;
ALTER TABLE public.screenshots DROP CONSTRAINT IF EXISTS screenshots_type_check;

-- 2. Ensure delivery_id is nullable (already true in 008, but reinforced here)
ALTER TABLE public.screenshots ALTER COLUMN delivery_id DROP NOT NULL;

-- 3. Add modern type check including all current types
-- types: PAYMENT, FOLLOW, RAPIDO, PLATFORM_PAYMENT, FRAUD_DETECTION
ALTER TABLE public.screenshots ADD CONSTRAINT screenshots_type_check 
  CHECK (type IN ('PAYMENT', 'FOLLOW', 'RAPIDO', 'PLATFORM_PAYMENT', 'FRAUD_DETECTION'));

-- 4. Add data integrity check: Either delivery_id OR showroom_code must be present
-- This ensures that every screenshot is linked to SOMETHING.
ALTER TABLE public.screenshots ADD CONSTRAINT screenshots_link_check 
  CHECK (
    (delivery_id IS NOT NULL AND showroom_code IS NULL) OR 
    (delivery_id IS NULL AND showroom_code IS NOT NULL) OR
    (type = 'FRAUD_DETECTION' AND showroom_code IS NOT NULL)
  );

-- 5. Add URL validation check (General purpose)
ALTER TABLE public.screenshots ADD CONSTRAINT screenshots_file_url_check 
  CHECK (char_length(file_url) > 0);
