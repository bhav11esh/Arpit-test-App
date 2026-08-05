-- Migration 028: Admin Leaves, RLS Protection and Bengaluru Week-off
-- Description: Enables admins to apply for leaves, restricts admin leaves from photographers (via RLS), and configures Wednesday week-off for Bengaluru admins.

-- 1. Ensure city_weekoffs table exists
CREATE TABLE IF NOT EXISTS public.city_weekoffs (
  city TEXT PRIMARY KEY,
  weekoff_day_index INTEGER NOT NULL CHECK (weekoff_day_index BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on city_weekoffs if not already
ALTER TABLE public.city_weekoffs ENABLE ROW LEVEL SECURITY;

-- Recreate city weekoff policies
DROP POLICY IF EXISTS "Anyone can view city weekoffs" ON public.city_weekoffs;
CREATE POLICY "Anyone can view city weekoffs"
  ON public.city_weekoffs FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage city weekoffs" ON public.city_weekoffs;
CREATE POLICY "Admins can manage city weekoffs"
  ON public.city_weekoffs FOR ALL
  USING (public.is_admin());

-- Seed default for bengaluru (2 = Tuesday) if not exists
INSERT INTO public.city_weekoffs (city, weekoff_day_index)
VALUES ('bengaluru', 2)
ON CONFLICT (city) DO NOTHING;

-- 2. Helper to fetch user role by ID without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role_by_id(user_id UUID)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role::text FROM public.users WHERE id = user_id LIMIT 1;
$$;

-- 3. Update trigger function to check week-off date
CREATE OR REPLACE FUNCTION public.check_leave_date_not_on_weekoff()
RETURNS TRIGGER AS $$
DECLARE
    v_city TEXT;
    v_role TEXT;
    v_weekoff_day INT := 2; -- Default to Tuesday
    v_date_dow INT;
BEGIN
    -- Look up user city and role
    SELECT city, role INTO v_city, v_role FROM public.users WHERE id = NEW.photographer_id;
    
    -- Look up city weekoff day index
    IF v_city IS NOT NULL THEN
        -- If Bengaluru and Admin, weekoff is Wednesday (3)
        IF LOWER(v_city) = 'bengaluru' AND v_role = 'ADMIN' THEN
            v_weekoff_day := 3; -- Wednesday
        ELSE
            SELECT COALESCE(
                (SELECT weekoff_day_index FROM public.city_weekoffs WHERE LOWER(city) = LOWER(v_city)),
                2
            ) INTO v_weekoff_day;
        END IF;
    END IF;

    -- Calculate day of week (0=Sunday, 1=Monday, 2=Tuesday, etc.)
    v_date_dow := EXTRACT(DOW FROM NEW.date)::INT;

    IF v_date_dow = v_weekoff_day THEN
        RAISE EXCEPTION 'Cannot apply leave on weekoff day (DOW %).', v_weekoff_day;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger if needed
DROP TRIGGER IF EXISTS trg_check_leave_date_not_on_weekoff ON public.leaves;
CREATE TRIGGER trg_check_leave_date_not_on_weekoff
BEFORE INSERT OR UPDATE OF date, photographer_id ON public.leaves
FOR EACH ROW EXECUTE FUNCTION public.check_leave_date_not_on_weekoff();

-- 4. Update reconcile_photographer_tuesday_leaves function to handle admin weekoff
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
    v_role TEXT;
    v_weekoff_day INT := 2; -- Default to Tuesday
BEGIN
    v_month_start := date_trunc('month', p_month_date)::DATE;
    v_month_end := (date_trunc('month', p_month_date) + INTERVAL '1 month - 1 day')::DATE;

    -- Look up photographer city and role
    SELECT city, role INTO v_city, v_role FROM public.users WHERE id = p_photographer_id;
    
    -- Look up city weekoff day index
    IF v_city IS NOT NULL THEN
        -- If Bengaluru and Admin, weekoff is Wednesday (3)
        IF LOWER(v_city) = 'bengaluru' AND v_role = 'ADMIN' THEN
            v_weekoff_day := 3;
        ELSE
            SELECT COALESCE(
                (SELECT weekoff_day_index FROM public.city_weekoffs WHERE LOWER(city) = LOWER(v_city)),
                2
            ) INTO v_weekoff_day;
        END IF;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Restrict Admin leaves from photographers using database RLS
DROP POLICY IF EXISTS "Photographers can view their own leaves" ON public.leaves;
DROP POLICY IF EXISTS "Photographers can create their own leaves" ON public.leaves;
DROP POLICY IF EXISTS "Admins can manage all leaves" ON public.leaves;
DROP POLICY IF EXISTS "Leaves select policy" ON public.leaves;
DROP POLICY IF EXISTS "Leaves insert policy" ON public.leaves;
DROP POLICY IF EXISTS "Leaves delete policy" ON public.leaves;

-- SELECT: Photographers can view own leaves; Admins can view photographers' + own leaves; Super Admin can view all
CREATE POLICY "Leaves select policy"
ON public.leaves FOR SELECT
USING (
  public.get_user_role() = 'SUPER_ADMIN'
  OR 
  (public.get_user_role() = 'PHOTOGRAPHER' AND photographer_id::text = auth.uid()::text)
  OR
  (public.is_admin() AND (
    photographer_id::text = auth.uid()::text 
    OR 
    public.get_user_role_by_id(photographer_id) = 'PHOTOGRAPHER'
  ))
);

-- INSERT: Same permissions as SELECT
CREATE POLICY "Leaves insert policy"
ON public.leaves FOR INSERT
WITH CHECK (
  public.get_user_role() = 'SUPER_ADMIN'
  OR
  (public.get_user_role() = 'PHOTOGRAPHER' AND photographer_id::text = auth.uid()::text)
  OR
  (public.is_admin() AND (
    photographer_id::text = auth.uid()::text 
    OR 
    public.get_user_role_by_id(photographer_id) = 'PHOTOGRAPHER'
  ))
);

-- DELETE: Admins can delete photographer leaves + own leaves; Super Admin can delete all
CREATE POLICY "Leaves delete policy"
ON public.leaves FOR DELETE
USING (
  public.get_user_role() = 'SUPER_ADMIN'
  OR
  (public.is_admin() AND (
    photographer_id::text = auth.uid()::text 
    OR 
    public.get_user_role_by_id(photographer_id) = 'PHOTOGRAPHER'
  ))
);
