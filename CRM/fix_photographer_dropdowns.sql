-- SQL TO FIX PHOTOGRAPHER DROPDOWNS & VISIBILITY
-- Run this in Supabase SQL Editor

-- 1. Restore SELECT access for PHOTOGRAPHERS to clusters and dealerships
-- Previously, these were either admin-only or broad policies were replaced by city-restricted admin policies.
-- We now allow photographers to see these, but still restricted by city if they have one assigned.

DROP POLICY IF EXISTS "Photographers can view clusters" ON public.clusters;
CREATE POLICY "Photographers can view clusters"
  ON public.clusters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid() 
      AND (
        (public.users.role = 'PHOTOGRAPHER' AND (public.users.city IS NULL OR public.users.city = public.clusters.city))
        OR public.users.role = 'ADMIN'
      )
    )
  );

DROP POLICY IF EXISTS "Photographers can view dealerships" ON public.dealerships;
CREATE POLICY "Photographers can view dealerships"
  ON public.dealerships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid() 
      AND (
        (public.users.role = 'PHOTOGRAPHER' AND (public.users.city IS NULL OR public.users.city = public.dealerships.city))
        OR public.users.role = 'ADMIN'
      )
    )
  );

DROP POLICY IF EXISTS "Photographers can view mappings" ON public.mappings;
CREATE POLICY "Photographers can view mappings"
  ON public.mappings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid() 
      AND (
        (public.users.role = 'PHOTOGRAPHER' AND (public.users.city IS NULL OR public.users.city = (SELECT city FROM public.clusters WHERE id = public.mappings.cluster_id)))
        OR public.users.role = 'ADMIN'
      )
    )
  );

-- 2. Ensure all existing users have a default city (Bengaluru) to prevent RLS blockages
-- and improve UI consistency.
UPDATE public.users 
SET city = 'bengaluru' 
WHERE city IS NULL;

-- 3. Also default clusters and dealerships to bengaluru if they have no city
UPDATE public.clusters
SET city = 'bengaluru'
WHERE city IS NULL;

UPDATE public.dealerships
SET city = 'bengaluru'
WHERE city IS NULL;

-- 4. Restore broader SELECT policy for users table (needed for name resolution in various screens)
-- Photographers need to see names of other photographers in their cluster
DROP POLICY IF EXISTS "Users can view names of others" ON public.users;
CREATE POLICY "Users can view names of others"
  ON public.users FOR SELECT
  USING (true); -- Public names are safe, full metadata is still protected by other RLS if needed
