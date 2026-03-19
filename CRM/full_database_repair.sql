-- 1. Create REELS table if missing
CREATE TABLE IF NOT EXISTS public.reels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assigned_user_id UUID REFERENCES public.users(id),
    showroom_code TEXT,
    google_drive_link TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create PUSH_SUBSCRIPTIONS table if missing
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    subscription_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create NOTIFICATIONS table if missing
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL, -- DAY_CLOSURE, REEL_BACKLOG, SYSTEM, GEOFENCE_BREACH
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Create LOG_EVENTS table if missing
CREATE TABLE IF NOT EXISTS public.log_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    actor_user_id UUID REFERENCES public.users(id),
    target_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Set up RLS and Grants (Allowing Authenticated users to view/interact)
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_events ENABLE ROW LEVEL SECURITY;

-- Simple "Allow Authenticated" policies (Admin vs Photographer handled in app logic)
DO $$
BEGIN
    -- Reels
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reels' AND policyname = 'Allow Authenticated') THEN
        CREATE POLICY "Allow Authenticated" ON public.reels FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    -- Push Subscriptions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'Allow Authenticated') THEN
        CREATE POLICY "Allow Authenticated" ON public.push_subscriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    -- Notifications
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Allow Authenticated') THEN
        CREATE POLICY "Allow Authenticated" ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    -- Log Events
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'log_events' AND policyname = 'Allow Authenticated') THEN
        CREATE POLICY "Allow Authenticated" ON public.log_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Enable Grants for PostgREST
GRANT ALL ON TABLE public.reels TO authenticated, service_role;
GRANT ALL ON TABLE public.push_subscriptions TO authenticated, service_role;
GRANT ALL ON TABLE public.notifications TO authenticated, service_role;
GRANT ALL ON TABLE public.log_events TO authenticated, service_role;

-- 6. RPC: run_system_audit
CREATE OR REPLACE FUNCTION public.run_system_audit(target_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    missing_updates JSONB;
    reel_backlogs JSONB;
BEGIN
    -- Identify photographers with pending deliveries for the date
    SELECT jsonb_agg(row_to_json(t))
    INTO missing_updates
    FROM (
        SELECT 
            assigned_user_id as "userId",
            u.name,
            count(*) as "deliveryCount"
        FROM deliveries d
        JOIN users u ON d.assigned_user_id = u.id
        WHERE d.date = target_date
        AND d.status NOT IN ('DONE', 'REJECTED')
        GROUP BY assigned_user_id, u.name
    ) t;

    -- Identify reel backlogs (Pending reels from 2+ days ago)
    SELECT jsonb_agg(row_to_json(t))
    INTO reel_backlogs
    FROM (
        SELECT 
            assigned_user_id as "userId",
            u.name,
            count(*) as "taskCount"
        FROM reels r
        JOIN users u ON r.assigned_user_id = u.id
        WHERE r.status = 'PENDING'
        AND r.created_at < (now() - interval '2 days')
        GROUP BY assigned_user_id, u.name
    ) t;

    result := jsonb_build_object(
        'missingUpdates', COALESCE(missing_updates, '[]'::jsonb),
        'reelBacklogs', COALESCE(reel_backlogs, '[]'::jsonb)
    );

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_system_audit(DATE) TO authenticated, service_role;
