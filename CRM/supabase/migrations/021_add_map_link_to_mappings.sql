-- Migration 021: Add map_link column to mappings table
-- Description: Adds a nullable map_link column to the public.mappings table if it does not already exist.

ALTER TABLE public.mappings ADD COLUMN IF NOT EXISTS map_link TEXT;
