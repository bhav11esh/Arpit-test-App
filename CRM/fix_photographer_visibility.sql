-- Enable public read access to users who are PHOTOGRAPHERS
-- This is required for the Live Booking app (which runs anonymously) 
-- to display the assigned photographer's name and phone number.

-- 1. Enable RLS on users table (just in case it wasn't enabled, though it likely is)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Create the policy
-- "FOR SELECT" means it only allows reading data
-- "TO public" means anonymous users (and everyone else) can use it
-- "USING (role = 'PHOTOGRAPHER')" restricts it to ONLY rows where the user is a photographer
-- This protects Admin data from being publicly visible.

CREATE POLICY "Allow public read access to photographers"
ON public.users
FOR SELECT
TO public
USING (role = 'PHOTOGRAPHER');
