-- Enterprise Scalability: Audit RPC and Performance Indexes
-- This migration moves the heavy audit logic to the server side and adds critical indexes.

-- 1. Create the Audit RPC
CREATE OR REPLACE FUNCTION public.run_system_audit(target_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    two_days_ago DATE;
    missing_updates JSONB;
    reel_backlogs JSONB;
BEGIN
    two_days_ago := target_date - INTERVAL '2 days';

    -- A. Find Missing Updates (Today)
    -- Logic: Photographers who are NOT on leave AND (have pending deliveries OR have zero presence despite Primary mapping)
    WITH checked_in_photographers AS (
        SELECT DISTINCT actor_user_id
        FROM public.log_events
        WHERE type = 'SEND_UPDATE_COMPLETED'
          AND created_at::DATE = target_date
    ),
    photographer_breaches AS (
        SELECT 
            u.id as user_id,
            u.name,
            COUNT(d.id) FILTER (WHERE d.status != 'DONE') as pending_count,
            EXISTS (
                SELECT 1 FROM public.mappings m 
                WHERE m.photographer_id = u.id AND m.mapping_type = 'PRIMARY'
            ) as has_primary,
            (u.id IN (SELECT actor_user_id FROM checked_in_photographers)) as has_checked_in
        FROM public.users u
        LEFT JOIN public.deliveries d ON d.assigned_user_id = u.id AND d.date = target_date
        WHERE u.role = 'PHOTOGRAPHER' AND u.active = true
          AND NOT EXISTS (
              SELECT 1 FROM public.leaves l 
              WHERE l.photographer_id = u.id AND l.date = target_date
          )
        GROUP BY u.id, u.name
    )
    SELECT jsonb_agg(jsonb_build_object(
        'userId', user_id,
        'name', name,
        'deliveryCount', pending_count
    ))
    INTO missing_updates
    FROM photographer_breaches
    WHERE pending_count > 0 
       OR (pending_count = 0 AND has_primary AND NOT has_checked_in AND NOT EXISTS (
           SELECT 1 FROM public.deliveries d2 
           WHERE d2.assigned_user_id = user_id AND d2.date = target_date
       ));

    -- B. Find Reel Backlogs (D-2 or older)
    SELECT jsonb_agg(jsonb_build_object(
        'userId', u.id,
        'name', u.name,
        'taskCount', count(*)
    ))
    INTO reel_backlogs
    FROM public.reel_tasks r
    JOIN public.deliveries d ON r.delivery_id = d.id
    JOIN public.users u ON r.assigned_user_id = u.id
    WHERE r.status = 'PENDING'
      AND d.date <= two_days_ago
    GROUP BY u.id, u.name;

    RETURN jsonb_build_object(
        'missingUpdates', COALESCE(missing_updates, '[]'::jsonb),
        'reelBacklogs', COALESCE(reel_backlogs, '[]'::jsonb)
    );
END;
$$;

-- 2. Add Composite Indexes for high-volume scale
CREATE INDEX IF NOT EXISTS idx_deliveries_showroom_status_date ON public.deliveries (showroom_code, status, date);
CREATE INDEX IF NOT EXISTS idx_deliveries_assigned_date ON public.deliveries (assigned_user_id, date);
CREATE INDEX IF NOT EXISTS idx_log_events_type_created ON public.log_events (type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reel_tasks_status ON public.reel_tasks (status) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_screenshots_delivery_deleted ON public.screenshots (delivery_id, deleted_at) WHERE deleted_at IS NULL;
