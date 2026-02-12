-- 1. Ensure RLS is enabled
ALTER TABLE "public"."live_bookings" ENABLE ROW LEVEL SECURITY;

-- 2. Drop any old restrictive policies
DROP POLICY IF EXISTS "Enable all for everyone" ON "public"."live_bookings";
DROP POLICY IF EXISTS "Enable read for everyone" ON "public"."live_bookings";
DROP POLICY IF EXISTS "Enable update for everyone" ON "public"."live_bookings";
DROP POLICY IF EXISTS "Enable insert for everyone" ON "public"."live_bookings";

-- 3. Create a truly universal policy for both ANON and AUTHENTICATED users
-- This allows anyone to Read, Insert, and Update any row.
CREATE POLICY "Universal Access" ON "public"."live_bookings"
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 4. Verify publication for real-time (optional but recommended)
-- If publication doesn't exist, this might error, which is fine.
-- ALTER PUBLICATION supabase_realtime ADD TABLE live_bookings;
