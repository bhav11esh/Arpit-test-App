-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'PHOTOGRAPHER')),
  active BOOLEAN DEFAULT true,
  cluster_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clusters table
CREATE TABLE IF NOT EXISTS public.clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dealerships table
CREATE TABLE IF NOT EXISTS public.dealerships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('CUSTOMER_PAID', 'DEALER_PAID')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mappings table
CREATE TABLE IF NOT EXISTS public.mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  dealership_id UUID NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  photographer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mapping_type TEXT NOT NULL CHECK (mapping_type IN ('PRIMARY', 'SECONDARY')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cluster_id, dealership_id, photographer_id, mapping_type)
);

-- Deliveries table
CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  showroom_code TEXT NOT NULL,
  cluster_code TEXT NOT NULL,
  showroom_type TEXT NOT NULL CHECK (showroom_type IN ('PRIMARY', 'SECONDARY')),
  timing TEXT,
  delivery_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'UNASSIGNED' CHECK (status IN ('ASSIGNED', 'UNASSIGNED', 'REJECTED', 'POSTPONED_CANCELED', 'DONE')),
  assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('CUSTOMER_PAID', 'DEALER_PAID')),
  footage_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  decision_state TEXT CHECK (decision_state IN ('WAITING', 'ACCEPTED', 'REJECTED_BY_ALL')),
  rejected_by_all BOOLEAN DEFAULT false,
  rejected_by_all_timestamp TIMESTAMPTZ,
  unassignment_reason TEXT,
  unassignment_timestamp TIMESTAMPTZ,
  unassignment_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  creation_index INTEGER
);

-- Screenshots table
CREATE TABLE IF NOT EXISTS public.screenshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('PAYMENT', 'FOLLOW')),
  file_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Reel tasks table
CREATE TABLE IF NOT EXISTS public.reel_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  assigned_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reel_link TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED')),
  reassigned_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaves table
CREATE TABLE IF NOT EXISTS public.leaves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photographer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  half TEXT NOT NULL CHECK (half IN ('FIRST_HALF', 'SECOND_HALF')),
  applied_by TEXT NOT NULL CHECK (applied_by IN ('PHOTOGRAPHER', 'ADMIN')),
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(photographer_id, date, half)
);

-- Log events table
CREATE TABLE IF NOT EXISTS public.log_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  actor_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geofence breaches table
CREATE TABLE IF NOT EXISTS public.geofence_breaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  expected_time TIMESTAMPTZ NOT NULL,
  breach_time TIMESTAMPTZ NOT NULL,
  distance_from_target DOUBLE PRECISION NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deliveries_date ON public.deliveries(date);
CREATE INDEX IF NOT EXISTS idx_deliveries_assigned_user ON public.deliveries(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_cluster_code ON public.deliveries(cluster_code);
CREATE INDEX IF NOT EXISTS idx_screenshots_delivery_id ON public.screenshots(delivery_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_user_id ON public.screenshots(user_id);
CREATE INDEX IF NOT EXISTS idx_reel_tasks_delivery_id ON public.reel_tasks(delivery_id);
CREATE INDEX IF NOT EXISTS idx_reel_tasks_assigned_user ON public.reel_tasks(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_leaves_photographer_date ON public.leaves(photographer_id, date);
CREATE INDEX IF NOT EXISTS idx_log_events_actor ON public.log_events(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_log_events_created_at ON public.log_events(created_at);
CREATE INDEX IF NOT EXISTS idx_mappings_cluster ON public.mappings(cluster_id);
CREATE INDEX IF NOT EXISTS idx_mappings_photographer ON public.mappings(photographer_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofence_breaches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can insert users"
  ON public.users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update users"
  ON public.users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- RLS Policies for clusters (admin only)
CREATE POLICY "Admins can manage clusters"
  ON public.clusters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- RLS Policies for dealerships (admin only)
CREATE POLICY "Admins can manage dealerships"
  ON public.dealerships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- RLS Policies for mappings (admin only)
CREATE POLICY "Admins can manage mappings"
  ON public.mappings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- RLS Policies for deliveries
CREATE POLICY "Photographers can view their assigned deliveries"
  ON public.deliveries FOR SELECT
  USING (
    assigned_user_id::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

CREATE POLICY "Photographers can view unassigned deliveries in their cluster"
  ON public.deliveries FOR SELECT
  USING (
    (status = 'UNASSIGNED' AND cluster_code IN (
      SELECT cluster_code FROM public.users WHERE id::text = auth.uid()::text
    )) OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

CREATE POLICY "Photographers can update their assigned deliveries"
  ON public.deliveries FOR UPDATE
  USING (
    assigned_user_id::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can manage all deliveries"
  ON public.deliveries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- RLS Policies for screenshots
CREATE POLICY "Users can view screenshots for their deliveries"
  ON public.screenshots FOR SELECT
  USING (
    user_id::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.deliveries d
      JOIN public.users u ON d.assigned_user_id = u.id
      WHERE d.id = screenshots.delivery_id
      AND (u.id::text = auth.uid()::text OR u.role = 'ADMIN')
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
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- RLS Policies for reel_tasks
CREATE POLICY "Users can view their reel tasks"
  ON public.reel_tasks FOR SELECT
  USING (
    assigned_user_id::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can manage all reel tasks"
  ON public.reel_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- RLS Policies for leaves
CREATE POLICY "Photographers can view their own leaves"
  ON public.leaves FOR SELECT
  USING (
    photographer_id::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

CREATE POLICY "Photographers can create their own leaves"
  ON public.leaves FOR INSERT
  WITH CHECK (
    photographer_id::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can manage all leaves"
  ON public.leaves FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- RLS Policies for log_events (admin only)
CREATE POLICY "Admins can view all logs"
  ON public.log_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

CREATE POLICY "Authenticated users can create logs"
  ON public.log_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for geofence_breaches
CREATE POLICY "Users can view their own breaches"
  ON public.geofence_breaches FOR SELECT
  USING (
    user_id::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

CREATE POLICY "Users can create breach records"
  ON public.geofence_breaches FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clusters_updated_at BEFORE UPDATE ON public.clusters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dealerships_updated_at BEFORE UPDATE ON public.dealerships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mappings_updated_at BEFORE UPDATE ON public.mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reel_tasks_updated_at BEFORE UPDATE ON public.reel_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.screenshots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.log_events;
