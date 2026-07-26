-- Migration 020: City-level Week-offs Configuration & Validation
-- Description: Configures week-off days at the city level, enforces validation at the database level when applying leaves, and aligns the carry-forward credits logic.

-- 1. Create City Week-offs Table
CREATE TABLE IF NOT EXISTS public.city_weekoffs (
  city TEXT PRIMARY KEY,
  weekoff_day_index INTEGER NOT NULL CHECK (weekoff_day_index BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday, 2=Tuesday, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.city_weekoffs ENABLE ROW LEVEL SECURITY;

-- Select policy: Anyone can view
CREATE POLICY "Anyone can view city weekoffs"
  ON public.city_weekoffs FOR SELECT
  USING (true);

-- Manage policy: Admins only
CREATE POLICY "Admins can manage city weekoffs"
  ON public.city_weekoffs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- Seed default for bengaluru (2 = Tuesday)
INSERT INTO public.city_weekoffs (city, weekoff_day_index)
VALUES ('bengaluru', 2)
ON CONFLICT (city) DO NOTHING;

-- 2. Create Trigger Function to reject leave applications on a photographer's week-off
CREATE OR REPLACE FUNCTION public.check_leave_date_not_on_weekoff()
RETURNS TRIGGER AS $$
DECLARE
    v_city TEXT;
    v_weekoff_day INT := 2; -- Default to Tuesday
    v_date_dow INT;
BEGIN
    -- Look up photographer city
    SELECT city INTO v_city FROM public.users WHERE id = NEW.photographer_id;
    
    -- Look up city weekoff day index
    IF v_city IS NOT NULL THEN
        SELECT COALESCE(
            (SELECT weekoff_day_index FROM public.city_weekoffs WHERE LOWER(city) = LOWER(v_city)),
            2
        ) INTO v_weekoff_day;
    END IF;

    -- Calculate day of week (0=Sunday, 1=Monday, 2=Tuesday, etc.)
    v_date_dow := EXTRACT(DOW FROM NEW.date)::INT;

    IF v_date_dow = v_weekoff_day THEN
        RAISE EXCEPTION 'Cannot apply leave on weekoff day (DOW %).', v_weekoff_day;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trg_check_leave_date_not_on_weekoff ON public.leaves;

-- Create Trigger
CREATE TRIGGER trg_check_leave_date_not_on_weekoff
BEFORE INSERT OR UPDATE OF date, photographer_id ON public.leaves
FOR EACH ROW EXECUTE FUNCTION public.check_leave_date_not_on_weekoff();

-- 3. Update reconcile_photographer_tuesday_leaves function to dynamically resolve the week-off
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
    v_city TEXT;
    v_weekoff_day INT := 2; -- Default to Tuesday
BEGIN
    v_month_start := date_trunc('month', p_month_date)::DATE;
    v_month_end := (date_trunc('month', p_month_date) + INTERVAL '1 month - 1 day')::DATE;

    -- Look up photographer city
    SELECT city INTO v_city FROM public.users WHERE id = p_photographer_id;
    
    -- Look up city weekoff day index
    IF v_city IS NOT NULL THEN
        SELECT COALESCE(
            (SELECT weekoff_day_index FROM public.city_weekoffs WHERE LOWER(city) = LOWER(v_city)),
            2
        ) INTO v_weekoff_day;
    END IF;

    -- 1. Calculate total carry forward halves earned on weekoff days in this month
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
          AND EXTRACT(DOW FROM date) = v_weekoff_day
          AND deleted_at IS NULL
        GROUP BY date
    ) t;

    -- 2. Reset all converted flags for this month first
    UPDATE public.leaves
    SET converted_to_working_day = FALSE
    WHERE photographer_id = p_photographer_id
      AND date >= v_month_start
      AND date <= v_month_end;

    -- 3. Apply credits to leaves chronologically (excluding weekoff day)
    IF v_available_credits > 0 THEN
        FOR v_leave_record IN 
            SELECT id 
            FROM public.leaves
            WHERE photographer_id = p_photographer_id
              AND date >= v_month_start
              AND date <= v_month_end
              AND EXTRACT(DOW FROM date) != v_weekoff_day
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
-- Trigger helper updates automatically since it references public.reconcile_photographer_tuesday_leaves
$$ LANGUAGE plpgsql SECURITY DEFINER;
