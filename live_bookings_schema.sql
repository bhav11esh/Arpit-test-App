-- Create the live_bookings table
CREATE TABLE IF NOT EXISTS public.live_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  table_name TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'OPTED_IN', 'ARRIVED', 'PAID', 'COMPLETED', 'CANCELLED', 'NOT_PAID')),
  qr_params JSONB,
  drive_link TEXT,
  hardcopy_filenames TEXT,
  hardcopy_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  photographer_id UUID REFERENCES public.users(id),
  activation_code TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_bookings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (from the website)
DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.live_bookings;
CREATE POLICY "Allow anonymous inserts" ON public.live_bookings
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users to view all bookings
DROP POLICY IF EXISTS "Allow authenticated selects" ON public.live_bookings;
CREATE POLICY "Allow authenticated selects" ON public.live_bookings
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to update bookings
DROP POLICY IF EXISTS "Allow authenticated updates" ON public.live_bookings;
CREATE POLICY "Allow authenticated updates" ON public.live_bookings
  FOR UPDATE TO authenticated USING (true);

-- Add the activation_code column if it doesn't already exist (This is the most important line!)
ALTER TABLE public.live_bookings ADD COLUMN IF NOT EXISTS activation_code TEXT;

-- Reset policies to be 100% sure everything is correct
DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.live_bookings;
CREATE POLICY "Allow anonymous inserts" ON public.live_bookings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated selects" ON public.live_bookings;
CREATE POLICY "Allow authenticated selects" ON public.live_bookings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated updates" ON public.live_bookings;
CREATE POLICY "Allow authenticated updates" ON public.live_bookings FOR UPDATE TO authenticated USING (true);
