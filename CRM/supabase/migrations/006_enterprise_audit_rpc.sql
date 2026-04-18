-- Enterprise Scalability: Audit RPC and Performance Indexes
-- This migration moves the heavy audit logic to the server side and adds critical indexes.

-- 1. Create the Audit RPC
CREATE OR REPLACE FUNCTION public.run_system_audit(target_date DATE)
RETURNS JSONB AS $$
DECLARE
    two_days_ago DATE;
    missing_updates JSONB;
    reel_backlogs JSONB;
BEGIN
    -- V1 SPEC: Reel backlog is 2+ days old (D-2)
    two_days_ago := target_date - 2;

    -- A. Find Missing Send Updates (Not on leave, day not closed)
    -- V1 RULE: Include all active photographers who haven't sent update, exclude if on full-day leave
    missing_updates := (
        SELECT jsonb_agg(jsonb_build_object(
            'userId', u.id,
            'name', u.name,
            'deliveryCount', (
                SELECT count(*) FROM public.deliveries d 
                WHERE d.assigned_user_id = u.id AND d.date = target_date 
                  AND d.status != 'DONE' AND d.deleted_at IS NULL
            ),
            'leaveType', (
                SELECT l.half FROM public.leaves l 
                WHERE l.photographer_id = u.id AND l.date = target_date
                LIMIT 1
            )
        ))
        FROM public.users u
        WHERE u.role = 'PHOTOGRAPHER' AND u.active = true
          -- Exclude if day already closed (log event exists)
          AND NOT EXISTS (
              SELECT 1 FROM public.log_events le 
              WHERE le.actor_user_id = u.id AND le.created_at::date = target_date 
                AND le.type = 'SEND_UPDATE_COMPLETED'
          )
    );

    -- B. Find Reel Backlogs (2+ Days Old)
    -- V1 FIX: Use proper aggregation to capture all users with backlogs
    WITH backlog_counts AS (
        SELECT u.id, u.name, count(*) as task_count
        FROM public.reel_tasks r
        JOIN public.deliveries d ON r.delivery_id = d.id
        JOIN public.users u ON r.assigned_user_id = u.id
        WHERE r.status = 'PENDING'
          AND d.date <= two_days_ago
          AND d.deleted_at IS NULL
        GROUP BY u.id, u.name
    )
    SELECT jsonb_agg(jsonb_build_object(
        'userId', id,
        'name', name,
        'taskCount', task_count
    ))
    INTO reel_backlogs
    FROM backlog_counts;

    RETURN jsonb_build_object(
        'missingUpdates', COALESCE(missing_updates, '[]'::jsonb),
        'reelBacklogs', COALESCE(reel_backlogs, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add Composite Indexes for high-volume scale
CREATE INDEX IF NOT EXISTS idx_deliveries_showroom_status_date ON public.deliveries (showroom_code, status, date);
CREATE INDEX IF NOT EXISTS idx_deliveries_assigned_date ON public.deliveries (assigned_user_id, date);
CREATE INDEX IF NOT EXISTS idx_log_events_type_created ON public.log_events (type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reel_tasks_status ON public.reel_tasks (status) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_screenshots_delivery_deleted ON public.screenshots (delivery_id, deleted_at) WHERE deleted_at IS NULL;
