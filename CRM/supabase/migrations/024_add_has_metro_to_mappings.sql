-- Migration 024: Add has_metro column to mappings table
ALTER TABLE public.mappings ADD COLUMN IF NOT EXISTS has_metro BOOLEAN DEFAULT false;
