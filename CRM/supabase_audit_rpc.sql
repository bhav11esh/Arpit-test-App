-- Function to run system audit for photographers
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
    -- 1. Identify photographers who have NOT completed their deliveries for the day
    -- (Deliveries in non-DONE status for today)
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
        AND d.status != 'DONE'
        AND d.status != 'REJECTED'
        GROUP BY assigned_user_id, u.name
    ) t;

    -- 2. Identify reel backlogs (Pending reels from 2+ days ago)
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

    -- Combine results
    result := jsonb_build_object(
        'missingUpdates', COALESCE(missing_updates, '[]'::jsonb),
        'reelBacklogs', COALESCE(reel_backlogs, '[]'::jsonb)
    );

    RETURN result;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.run_system_audit(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_system_audit(DATE) TO service_role;
