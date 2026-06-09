-- Migration 019: Automatic Tuesday Carry-Forward Triggers
-- Description: Automatically runs the reconcile_photographer_tuesday_leaves function when deliveries or leaves change.

CREATE OR REPLACE FUNCTION public.trigger_reconcile_tuesday_leaves()
RETURNS TRIGGER AS $$
DECLARE
    v_photographer_id UUID;
    v_date DATE;
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF TG_TABLE_NAME = 'deliveries' THEN
            v_photographer_id := OLD.assigned_user_id;
            v_date := OLD.date;
        ELSE
            v_photographer_id := OLD.photographer_id;
            v_date := OLD.date;
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        IF TG_TABLE_NAME = 'deliveries' THEN
            v_photographer_id := NEW.assigned_user_id;
            v_date := NEW.date;
        ELSE
            v_photographer_id := NEW.photographer_id;
            v_date := NEW.date;
        END IF;
    ELSE -- UPDATE
        IF TG_TABLE_NAME = 'deliveries' THEN
            v_photographer_id := NEW.assigned_user_id;
            v_date := NEW.date;
            
            -- If assigned user changed, also reconcile for OLD photographer
            IF OLD.assigned_user_id IS NOT NULL AND (NEW.assigned_user_id IS NULL OR OLD.assigned_user_id != NEW.assigned_user_id) THEN
                PERFORM public.reconcile_photographer_tuesday_leaves(OLD.assigned_user_id, OLD.date);
            END IF;
            -- If date changed, also reconcile for OLD date
            IF OLD.date IS NOT NULL AND OLD.date != NEW.date THEN
                PERFORM public.reconcile_photographer_tuesday_leaves(COALESCE(NEW.assigned_user_id, OLD.assigned_user_id), OLD.date);
            END IF;
        ELSE
            v_photographer_id := NEW.photographer_id;
            v_date := NEW.date;
            
            -- If photographer changed, also reconcile for OLD photographer
            IF OLD.photographer_id IS NOT NULL AND OLD.photographer_id != NEW.photographer_id THEN
                PERFORM public.reconcile_photographer_tuesday_leaves(OLD.photographer_id, OLD.date);
            END IF;
            -- If date changed, also reconcile for OLD date
            IF OLD.date IS NOT NULL AND OLD.date != NEW.date THEN
                PERFORM public.reconcile_photographer_tuesday_leaves(NEW.photographer_id, OLD.date);
            END IF;
        END IF;
    END IF;

    IF v_photographer_id IS NOT NULL AND v_date IS NOT NULL THEN
        PERFORM public.reconcile_photographer_tuesday_leaves(v_photographer_id, v_date);
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop triggers if they exist
DROP TRIGGER IF EXISTS trg_reconcile_tuesday_leaves_deliveries ON public.deliveries;
DROP TRIGGER IF EXISTS trg_reconcile_tuesday_leaves_leaves ON public.leaves;

-- Create trigger on public.deliveries to automatically reconcile when status, user, date, or deleted_at changes
CREATE TRIGGER trg_reconcile_tuesday_leaves_deliveries
AFTER INSERT OR DELETE OR UPDATE OF assigned_user_id, date, status, deleted_at ON public.deliveries
FOR EACH ROW EXECUTE FUNCTION public.trigger_reconcile_tuesday_leaves();

-- Create trigger on public.leaves to automatically reconcile when user, date, or half changes
CREATE TRIGGER trg_reconcile_tuesday_leaves_leaves
AFTER INSERT OR DELETE OR UPDATE OF photographer_id, date, half ON public.leaves
FOR EACH ROW EXECUTE FUNCTION public.trigger_reconcile_tuesday_leaves();

-- Reconcile all existing photographer leaves retrospectively
DO $$
DECLARE
    v_rec RECORD;
BEGIN
    FOR v_rec IN 
        SELECT DISTINCT photographer_id, date_trunc('month', date)::DATE as month_date
        FROM public.leaves
    LOOP
        BEGIN
            PERFORM public.reconcile_photographer_tuesday_leaves(v_rec.photographer_id, v_rec.month_date);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipping reconciliation for photographer % month %: %', v_rec.photographer_id, v_rec.month_date, SQLERRM;
        END;
    END LOOP;
END;
$$;
