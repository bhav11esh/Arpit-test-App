-- Fix Audit Leave Aggregation
-- Aggregates multiple half-day records into FULL_DAY for the system audit report.

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
                SELECT 
                    CASE 
                        WHEN count(*) >= 2 THEN 'FULL_DAY'
                        WHEN count(*) = 1 THEN MAX(l.half)
                        ELSE NULL
                    END
                FROM public.leaves l 
                WHERE l.photographer_id = u.id AND l.date = target_date
            )
        ))
        FROM public.users u
        WHERE u.role = 'PHOTOGRAPHER' AND u.active = true
          AND NOT EXISTS (
              SELECT 1 FROM public.log_events le 
              WHERE le.actor_user_id = u.id AND le.created_at::date = target_date 
                AND le.type = 'SEND_UPDATE_COMPLETED'
          )
    );

    -- B. Find Reel Backlogs (2+ Days Old)
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
