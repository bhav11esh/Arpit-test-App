-- SAFE DATA RESET SCRIPT
-- RUN THIS IN SUPABASE SQL EDITOR TO CLEAR OLD DELIVERY DATA
-- THIS PRESERVES CLUSTERS, DEALERSHIPS, MAPPINGS, AND USERS.

-- 1. Clear related experimental data first (Foreign Key dependencies)
TRUNCATE TABLE public.delivery_logs CASCADE;
TRUNCATE TABLE public.screenshots CASCADE;
TRUNCATE TABLE public.reels CASCADE;

-- 2. Clear the main deliveries table
TRUNCATE TABLE public.deliveries CASCADE;

-- 3. (Optional) Reset any auto-incrementing ID sequences if needed
-- ALTER SEQUENCE deliveries_id_seq RESTART WITH 1;

-- VERIFICATION: The following should return 0
SELECT count(*) FROM public.deliveries;
