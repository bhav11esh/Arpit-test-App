-- Migration 026: Add payment and platform payment screenshot metadata to deliveries
-- These columns store date, time, and amount metadata extracted from verified payment screenshots.

ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS payment_screenshot_date TEXT;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS payment_screenshot_time TEXT;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS payment_screenshot_amount NUMERIC;

ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS platform_payment_screenshot_date TEXT;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS platform_payment_screenshot_time TEXT;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS platform_payment_screenshot_amount NUMERIC;
