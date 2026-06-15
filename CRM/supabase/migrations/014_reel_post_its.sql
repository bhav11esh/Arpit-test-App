-- Migration: 014_reel_post_its.sql
-- Description: Adds columns to reel_tasks for the marketplace feature and creates RPCs for auto-reassignment and claiming.

-- 1. Add Post-it columns to reel_tasks
ALTER TABLE public.reel_tasks
ADD COLUMN IF NOT EXISTS is_post_it BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS original_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS claim_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failed_claimants UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS post_it_reward INTEGER;

-- 2. Create RPC to refresh the post-its pool (Move 4-day breached reels & return failed claims)
CREATE OR REPLACE FUNCTION public.refresh_post_its()
RETURNS void AS $$
BEGIN
    -- Return failed claims to the pool
    UPDATE public.reel_tasks rt
    SET 
        is_post_it = true,
        failed_claimants = array_append(COALESCE(rt.failed_claimants, '{}'::UUID[]), rt.assigned_user_id),
        assigned_user_id = rt.original_user_id, -- Assign back to original to remove from claimant's queue
        claim_deadline = NULL
    WHERE rt.status = 'PENDING'
      AND rt.is_post_it = false
      AND rt.original_user_id IS NOT NULL
      AND rt.claim_deadline IS NOT NULL
      AND rt.claim_deadline < NOW();

    -- Move 4-day breached reels into the pool
    -- We join deliveries to check the delivery date and dealership rates
    UPDATE public.reel_tasks rt
    SET 
        is_post_it = true,
        original_user_id = rt.assigned_user_id,
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
      AND (
        -- Only if it was never reassigned normally (meaning original user is to blame)
        rt.reassigned_reason IS NULL OR rt.reassigned_reason NOT LIKE 'AUTO:%'
      )
      -- Deadline is strictly > 4 days (i.e. 4 days + 1 ms)
      -- If delivery was on 1st, 1st+4 = 5th. So if current date is > 5th, it breaches.
      AND (d.date + INTERVAL '4 days') < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create RPC to securely claim a post-it
CREATE OR REPLACE FUNCTION public.claim_post_it(p_task_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
    -- Ensure task exists, is a post-it, and user is not in failed_claimants
    UPDATE public.reel_tasks
    SET 
        is_post_it = false,
        assigned_user_id = p_user_id,
        claim_deadline = NOW() + INTERVAL '24 hours'
    WHERE id = p_task_id
      AND is_post_it = true
      AND status = 'PENDING'
      AND (failed_claimants IS NULL OR NOT (p_user_id = ANY(failed_claimants)))
      AND (original_user_id IS NULL OR original_user_id != p_user_id);
      
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Task not available for claiming or you are not eligible.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
