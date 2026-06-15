-- Add monitoring columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_gps_status TEXT CHECK (last_gps_status IN ('ON', 'OFF', 'UNKNOWN'));

-- Index for admin monitoring queries
CREATE INDEX IF NOT EXISTS idx_users_last_active ON public.users(last_active);
