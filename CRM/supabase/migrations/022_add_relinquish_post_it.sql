-- Migration 022: Add relinquish_post_it RPC
-- Description: Allows photographers to unassign claimed post-its/bounties and return them to the marketplace.

CREATE OR REPLACE FUNCTION public.relinquish_post_it(p_task_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
    -- Ensure task exists, is currently assigned to this user, status is PENDING, and original_user_id is not null (meaning it is a post-it)
    UPDATE public.reel_tasks
    SET 
        is_post_it = true,
        failed_claimants = array_append(COALESCE(failed_claimants, '{}'::UUID[]), p_user_id),
        assigned_user_id = original_user_id,
        claim_deadline = NULL
    WHERE id = p_task_id
      AND assigned_user_id = p_user_id
      AND status = 'PENDING'
      AND original_user_id IS NOT NULL;
      
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Task not eligible for relinquishing.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
