-- Migration: 029_fix_empty_reel_link_trigger.sql
-- Description: Ensures empty string ('') in reel_link is treated as NULL so newly added deliveries without reels become PENDING tasks instead of RESOLVED.

CREATE OR REPLACE FUNCTION public.handle_done_delivery_reel_task()
RETURNS TRIGGER AS $$
DECLARE
    existing_count INTEGER;
    deadline_val TIMESTAMPTZ;
    is_post_it_val BOOLEAN := false;
    original_user_id_val UUID := NULL;
    reassigned_reason_val TEXT := NULL;
    post_it_reward_val INTEGER := NULL;
    dealership_rate INTEGER;
    task_status TEXT := 'PENDING';
BEGIN
    -- Only trigger if status transitioned to DONE (or inserted as DONE)
    IF (TG_OP = 'INSERT' AND NEW.status = 'DONE') OR 
       (TG_OP = 'UPDATE' AND NEW.status = 'DONE' AND (
           (OLD.status IS NULL OR OLD.status != 'DONE') OR
           (OLD.assigned_user_id IS NULL AND NEW.assigned_user_id IS NOT NULL)
       )) THEN
        
        -- Check if assigned_user_id is set
        IF NEW.assigned_user_id IS NOT NULL THEN
            -- Check if a reel task already exists for this delivery
            SELECT COUNT(*) INTO existing_count FROM public.reel_tasks WHERE delivery_id = NEW.id;
            
            IF existing_count = 0 THEN
                -- Calculate deadline date (EOD of delivery date: 23:59:59 in IST)
                deadline_val := (NEW.date + TIME '23:59:59') AT TIME ZONE 'Asia/Kolkata';
                
                -- If received_amount is exactly 700, deadline is next day EOD
                IF NEW.received_amount = 700 THEN
                    deadline_val := deadline_val + INTERVAL '1 day';
                END IF;
                
                -- Determine task status (RESOLVED if reel_link is present and non-empty)
                IF NULLIF(TRIM(COALESCE(NEW.reel_link, '')), '') IS NOT NULL THEN
                    task_status := 'RESOLVED';
                    
                    INSERT INTO public.reel_tasks (
                        delivery_id,
                        assigned_user_id,
                        status,
                        deadline,
                        reel_link
                    ) VALUES (
                        NEW.id,
                        NEW.assigned_user_id,
                        task_status,
                        deadline_val,
                        NEW.reel_link
                    );
                ELSE
                    -- PENDING task. Check if it's already a 4-day breach
                    IF ((NEW.date + INTERVAL '4 days') AT TIME ZONE 'Asia/Kolkata') < NOW() THEN
                        is_post_it_val := true;
                        original_user_id_val := NEW.assigned_user_id;
                        reassigned_reason_val := 'AUTO: 4-Day Breach (Post-it)';
                        
                        -- Query dealership rate to determine reward
                        SELECT rate_per_delivery INTO dealership_rate
                        FROM public.dealerships ds
                        WHERE UPPER(REGEXP_REPLACE(ds.name, '[^A-Z0-9]+', '_', 'g')) = UPPER(REGEXP_REPLACE(NEW.showroom_code, '[^A-Z0-9]+', '_', 'g'))
                           OR NEW.showroom_code ILIKE '%' || ds.name || '%'
                           OR ds.name ILIKE '%' || NEW.showroom_code || '%'
                        LIMIT 1;
                        
                        IF (NEW.payment_type = 'CUSTOMER_PAID' AND COALESCE(NEW.received_amount, 0) > 1999) OR
                           (NEW.payment_type = 'DEALER_PAID' AND COALESCE(dealership_rate, 0) > 1999) THEN
                            post_it_reward_val := 500;
                        ELSE
                            post_it_reward_val := 250;
                        END IF;
                    END IF;
                    
                    INSERT INTO public.reel_tasks (
                        delivery_id,
                        assigned_user_id,
                        status,
                        deadline,
                        reel_link,
                        is_post_it,
                        original_user_id,
                        reassigned_reason,
                        post_it_reward
                    ) VALUES (
                        NEW.id,
                        NEW.assigned_user_id,
                        'PENDING',
                        deadline_val,
                        NULL,
                        is_post_it_val,
                        original_user_id_val,
                        reassigned_reason_val,
                        post_it_reward_val
                    );
                END IF;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
