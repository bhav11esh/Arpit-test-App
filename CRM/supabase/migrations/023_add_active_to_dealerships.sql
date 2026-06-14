-- Migration 023: Add active column to dealerships
-- Description: Adds a boolean active column to public.dealerships defaulting to true.

ALTER TABLE public.dealerships ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
