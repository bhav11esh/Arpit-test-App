-- Migration 011: Allow Photographers to READ configuration tables
-- This is required for the Earnings Tracker and other UI components to function correctly for photographers.

-- 1. Dealerships: Allow all authenticated users to view
DROP POLICY IF EXISTS "Photographers can view dealerships" ON public.dealerships;
CREATE POLICY "Photographers can view dealerships"
  ON public.dealerships FOR SELECT
  USING (auth.role() = 'authenticated');

-- 2. Clusters: Allow all authenticated users to view
DROP POLICY IF EXISTS "Photographers can view clusters" ON public.clusters;
CREATE POLICY "Photographers can view clusters"
  ON public.clusters FOR SELECT
  USING (auth.role() = 'authenticated');

-- 3. Mappings: Allow all authenticated users to view
DROP POLICY IF EXISTS "Photographers can view mappings" ON public.mappings;
CREATE POLICY "Photographers can view mappings"
  ON public.mappings FOR SELECT
  USING (auth.role() = 'authenticated');
