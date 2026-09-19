-- Migration: 030_fix_refresh_post_its_claim_deadline.sql
-- Description: Prevents refresh_post_its() from resetting active 24h claimed/assigned bounties back to post-it pool while claim_deadline is active.

CREATE OR REPLACE FUNCTION public.refresh_post_its()
RETURNS void AS $$
BEGIN
    -- 1. Return failed claims to the pool (if 24-hour deadline has expired)
    UPDATE public.reel_tasks rt
    SET 
        is_post_it = true,
        failed_claimants = array_append(COALESCE(rt.failed_claimants, '{}'::UUID[]), rt.assigned_user_id),
        assigned_user_id = COALESCE(rt.original_user_id, rt.assigned_user_id),
        claim_deadline = NULL
    WHERE rt.status = 'PENDING'
      AND rt.is_post_it = false
      AND rt.claim_deadline IS NOT NULL
      AND rt.claim_deadline < NOW();

    -- 2. Move 4-day breached reels into the pool (only if not currently claimed/assigned with active claim_deadline)
    UPDATE public.reel_tasks rt
    SET 
        is_post_it = true,
        original_user_id = COALESCE(rt.original_user_id, rt.assigned_user_id),
        reassigned_reason = 'AUTO: 4-Day Breach (Post-it)',
        post_it_reward = (
            SELECT CASE 
                WHEN d.payment_type = 'CUSTOMER_PAID' AND COALESCE(d.received_amount, 0) > 1999 THEN 500
                WHEN d.payment_type = 'DEALER_PAID' AND COALESCE(ds.rate_per_delivery, 0) > 1999 THEN 500
                ELSE 250
            END
            FROM public.deliveries d
            LEFT JOIN public.dealerships ds ON (
                UPPER(REGEXP_REPLACE(ds.name, '[^A-Z0-9]+', '_', 'g')) = UPPER(REGEXP_REPLACE(d.showroom_code, '[^A-Z0-9]+', '_', 'g'))
                OR d.showroom_code ILIKE '%' || ds.name || '%'
                OR ds.name ILIKE '%' || d.showroom_code || '%'
            )
            WHERE d.id = rt.delivery_id
            LIMIT 1
        )
    FROM public.deliveries d
    WHERE rt.delivery_id = d.id
      AND rt.status = 'PENDING'
      AND rt.is_post_it = false
      AND rt.claim_deadline IS NULL
      AND (
        rt.reassigned_reason IS NULL OR rt.reassigned_reason NOT LIKE 'AUTO:%'
      )
      AND (d.date + INTERVAL '4 days') < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
