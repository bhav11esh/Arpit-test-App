-- Migration 013: Add RPC to fetch photographer missing updates for leave calendar
CREATE OR REPLACE FUNCTION public.get_photographer_missing_updates(
    p_photographer_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(missing_date DATE) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE dates AS (
        SELECT p_start_date AS d
        UNION ALL
        SELECT (d + INTERVAL '1 day')::DATE FROM dates WHERE d < p_end_date
    )
    SELECT d.d FROM dates d
    WHERE d.d < public.get_operational_date(NOW()) -- only past operational days
      -- Not on full day leave
      AND (
          SELECT count(*) FROM public.leaves l 
          WHERE l.photographer_id = p_photographer_id AND l.date = d.d
      ) < 2
      -- Did not send update
      AND NOT EXISTS (
          SELECT 1 FROM public.log_events le 
          WHERE le.actor_user_id = p_photographer_id 
            AND public.get_operational_date(le.created_at) = d.d 
            AND le.type = 'SEND_UPDATE_COMPLETED'
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
