-- Migration 007: Phase 6.1 Data Integrity & Multi-City Access

-- 1. Add deleted_at to deliveries for 'Safe Delete' flow
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_deliveries_deleted_at ON public.deliveries(deleted_at);

-- 2. Add city field to core entities for multi-city isolation
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.dealerships ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.clusters ADD COLUMN IF NOT EXISTS city TEXT;

-- 3. Update RLS Policies for Multi-City Admin Isolation
-- We need to ensure that an ADMIN can only see data belonging to their assigned city.
-- (Note: Super-admins could have city = 'GLOBAL' or similar, but for now we follow the '1 admin per city' rule)

-- Drop old admin manage policies and recreate with city check
DROP POLICY IF EXISTS "Admins can manage all deliveries" ON public.deliveries;
CREATE POLICY "Admins can manage their city deliveries"
  ON public.deliveries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid() 
      AND public.users.role = 'ADMIN'
      -- Safe-guard: If city is null, maybe they are global, or we restrict them. 
      -- Following the '1 admin per city' rule:
      AND (public.users.city = 'GLOBAL' OR public.users.city = (
        -- For deliveries, we might need a way to map showroom_code to a city.
        -- Simpler: Add city directly to deliveries, or join with dealerships.
        SELECT city FROM public.dealerships WHERE get_showroom_code(public.dealerships.name) = get_showroom_code(public.deliveries.showroom_code) LIMIT 1
      ))
    )
  );

-- Helper function if not exists (to handle the bracket naming convention in SQL)
CREATE OR REPLACE FUNCTION get_showroom_code(dealership_name TEXT)
RETURNS TEXT AS $$
DECLARE
  matches TEXT[];
BEGIN
  matches := regexp_matches(dealership_name, '\(([^)]+)\)');
  IF matches IS NOT NULL AND array_length(matches, 1) > 0 THEN
    RETURN UPPER(matches[1]);
  END IF;
  RETURN UPPER(regexp_replace(regexp_replace(dealership_name, '[^A-Za-z0-9]+', '_', 'g'), '^_+|_+$', '', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update other Admin policies for city isolation
DROP POLICY IF EXISTS "Admins can manage dealerships" ON public.dealerships;
CREATE POLICY "Admins can manage their city dealerships"
  ON public.dealerships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid() 
      AND public.users.role = 'ADMIN'
      AND (public.users.city = 'GLOBAL' OR public.users.city = public.dealerships.city)
    )
  );

DROP POLICY IF EXISTS "Admins can manage clusters" ON public.clusters;
CREATE POLICY "Admins can manage their city clusters"
  ON public.clusters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid() 
      AND public.users.role = 'ADMIN'
      AND (public.users.city = 'GLOBAL' OR public.users.city = public.clusters.city)
    )
  );
