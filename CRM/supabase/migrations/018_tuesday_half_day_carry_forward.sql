-- Ensure column exists first
ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS converted_to_working_day BOOLEAN DEFAULT FALSE;

-- Migration 018: Tuesday Half-Day Carry-Forward Credits
CREATE OR REPLACE FUNCTION public.reconcile_photographer_tuesday_leaves(
    p_photographer_id UUID,
    p_month_date DATE
)
RETURNS VOID AS $$
DECLARE
    v_month_start DATE;
    v_month_end DATE;
    v_available_credits INT := 0;
    v_leave_record RECORD;
BEGIN
    v_month_start := date_trunc('month', p_month_date)::DATE;
    v_month_end := (date_trunc('month', p_month_date) + INTERVAL '1 month - 1 day')::DATE;

    -- 1. Calculate total carry forward halves earned on Tuesdays in this month
    -- 1 delivery = 1 credit (half day), >= 2 deliveries = 2 credits (full day)
    SELECT COALESCE(SUM(
        CASE 
            WHEN delivery_count = 1 THEN 1
            WHEN delivery_count >= 2 THEN 2
            ELSE 0
        END
    ), 0) INTO v_available_credits
    FROM (
        SELECT date, COUNT(*) as delivery_count
        FROM public.deliveries
        WHERE assigned_user_id = p_photographer_id
          AND date >= v_month_start
          AND date <= v_month_end
          AND status = 'DONE'
          AND EXTRACT(DOW FROM date) = 2
          AND deleted_at IS NULL
        GROUP BY date
    ) t;

    -- 2. Reset all converted flags for this month first
    UPDATE public.leaves
    SET converted_to_working_day = FALSE
    WHERE photographer_id = p_photographer_id
      AND date >= v_month_start
      AND date <= v_month_end;

    -- 3. Apply credits to leaves chronologically (excluding Tuesdays)
    IF v_available_credits > 0 THEN
        FOR v_leave_record IN 
            SELECT id 
            FROM public.leaves
            WHERE photographer_id = p_photographer_id
              AND date >= v_month_start
              AND date <= v_month_end
              AND EXTRACT(DOW FROM date) != 2
            ORDER BY date ASC, half ASC
        LOOP
            IF v_available_credits > 0 THEN
                UPDATE public.leaves
                SET converted_to_working_day = TRUE
                WHERE id = v_leave_record.id;
                
                v_available_credits := v_available_credits - 1;
            ELSE
                EXIT;
            END IF;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up historical system-inserted dummy SEND_UPDATE_COMPLETED events
DELETE FROM public.log_events 
WHERE target_id = 'SYSTEM_AUTO_CONVERT' 
  AND (metadata->>'reason' = 'converted_tuesday_leave_no_penalty' 
       OR metadata->>'reason' = 'converted_leave_no_penalty');
