-- CLEAN SLATE FOR PRODUCTION (REMOVES ALL TEST DATA)
-- Run this in your Supabase SQL Editor to clear the Spreadsheet and Gallery views.

-- 1. Clear Reel Tasks
DELETE FROM public.reel_tasks;

-- 2. Clear Screenshots (Audit Galleries)
DELETE FROM public.screenshots;

-- 3. Clear Deliveries (The main spreadsheet data)
DELETE FROM public.deliveries;

-- OPTIONAL: If you also want to clear customer bookings from the portrait view:
-- DELETE FROM public.live_bookings;

-- OPTIONAL: Reset ID sequences so new records start from ID 1
-- ALTER SEQUENCE deliveries_id_seq RESTART WITH 1;
-- ALTER SEQUENCE reel_tasks_id_seq RESTART WITH 1;
-- ALTER SEQUENCE screenshots_id_seq RESTART WITH 1;
