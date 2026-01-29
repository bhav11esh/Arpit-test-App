-- Fix infinite recursion in users table RLS policies
-- The issue: Policies that check if user is admin by querying users table
-- Solution: Create a security definer function that bypasses RLS

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;

-- Create a security definer function to check if current user is admin
-- This function bypasses RLS, preventing infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id::text = auth.uid()::text 
    AND role = 'ADMIN'
    AND active = true
  );
$$;

-- Create a security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role::text FROM public.users
  WHERE id::text = auth.uid()::text
  LIMIT 1;
$$;

-- Recreate users policies using the function (no recursion)
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (id::text = auth.uid()::text);

CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert users"
  ON public.users FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update users"
  ON public.users FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Also fix other policies that reference users table to use the function
-- This prevents recursion in other tables too

-- Drop and recreate clusters policy
DROP POLICY IF EXISTS "Admins can manage clusters" ON public.clusters;
CREATE POLICY "Admins can manage clusters"
  ON public.clusters FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Drop and recreate dealerships policy
DROP POLICY IF EXISTS "Admins can manage dealerships" ON public.dealerships;
CREATE POLICY "Admins can manage dealerships"
  ON public.dealerships FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Drop and recreate mappings policy
DROP POLICY IF EXISTS "Admins can manage mappings" ON public.mappings;
CREATE POLICY "Admins can manage mappings"
  ON public.mappings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Fix deliveries policies
DROP POLICY IF EXISTS "Photographers can view their assigned deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Photographers can view unassigned deliveries in their cluster" ON public.deliveries;
DROP POLICY IF EXISTS "Photographers can update their assigned deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Admins can manage all deliveries" ON public.deliveries;

CREATE POLICY "Photographers can view their assigned deliveries"
  ON public.deliveries FOR SELECT
  USING (
    assigned_user_id::text = auth.uid()::text OR
    public.is_admin()
  );

CREATE POLICY "Photographers can view unassigned deliveries in their cluster"
  ON public.deliveries FOR SELECT
  USING (
    (status = 'UNASSIGNED' AND cluster_code IN (
      SELECT cluster_code FROM public.users 
      WHERE id::text = auth.uid()::text
      LIMIT 1
    )) OR
    public.is_admin()
  );

CREATE POLICY "Photographers can update their assigned deliveries"
  ON public.deliveries FOR UPDATE
  USING (
    assigned_user_id::text = auth.uid()::text OR
    public.is_admin()
  )
  WITH CHECK (
    assigned_user_id::text = auth.uid()::text OR
    public.is_admin()
  );

CREATE POLICY "Admins can manage all deliveries"
  ON public.deliveries FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Fix screenshots policies
DROP POLICY IF EXISTS "Users can view screenshots for their deliveries" ON public.screenshots;
DROP POLICY IF EXISTS "Users can upload screenshots for their deliveries" ON public.screenshots;
DROP POLICY IF EXISTS "Admins can manage all screenshots" ON public.screenshots;

CREATE POLICY "Users can view screenshots for their deliveries"
  ON public.screenshots FOR SELECT
  USING (
    user_id::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.id = screenshots.delivery_id
      AND (d.assigned_user_id::text = auth.uid()::text OR public.is_admin())
    )
  );

CREATE POLICY "Users can upload screenshots for their deliveries"
  ON public.screenshots FOR INSERT
  WITH CHECK (
    user_id::text = auth.uid()::text AND
    EXISTS (
      SELECT 1 FROM public.deliveries
      WHERE id = screenshots.delivery_id
      AND assigned_user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Admins can manage all screenshots"
  ON public.screenshots FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Fix reel_tasks policies
DROP POLICY IF EXISTS "Users can view their reel tasks" ON public.reel_tasks;
DROP POLICY IF EXISTS "Admins can manage all reel tasks" ON public.reel_tasks;

CREATE POLICY "Users can view their reel tasks"
  ON public.reel_tasks FOR SELECT
  USING (
    assigned_user_id::text = auth.uid()::text OR
    public.is_admin()
  );

CREATE POLICY "Admins can manage all reel tasks"
  ON public.reel_tasks FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Fix leaves policies
DROP POLICY IF EXISTS "Photographers can view their own leaves" ON public.leaves;
DROP POLICY IF EXISTS "Photographers can create their own leaves" ON public.leaves;
DROP POLICY IF EXISTS "Admins can manage all leaves" ON public.leaves;

CREATE POLICY "Photographers can view their own leaves"
  ON public.leaves FOR SELECT
  USING (
    photographer_id::text = auth.uid()::text OR
    public.is_admin()
  );

CREATE POLICY "Photographers can create their own leaves"
  ON public.leaves FOR INSERT
  WITH CHECK (
    photographer_id::text = auth.uid()::text OR
    public.is_admin()
  );

CREATE POLICY "Admins can manage all leaves"
  ON public.leaves FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Fix log_events policies
DROP POLICY IF EXISTS "Admins can view all logs" ON public.log_events;
DROP POLICY IF EXISTS "Authenticated users can create logs" ON public.log_events;

CREATE POLICY "Admins can view all logs"
  ON public.log_events FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Authenticated users can create logs"
  ON public.log_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix geofence_breaches policies
DROP POLICY IF EXISTS "Users can view their own breaches" ON public.geofence_breaches;
DROP POLICY IF EXISTS "Users can create breach records" ON public.geofence_breaches;

CREATE POLICY "Users can view their own breaches"
  ON public.geofence_breaches FOR SELECT
  USING (
    user_id::text = auth.uid()::text OR
    public.is_admin()
  );

CREATE POLICY "Users can create breach records"
  ON public.geofence_breaches FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);
