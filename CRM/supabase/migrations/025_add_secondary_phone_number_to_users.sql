-- Migration 025: Add secondary_phone_number column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS secondary_phone_number TEXT;
