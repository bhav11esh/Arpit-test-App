-- Migration 018: Create penalty forgiveness table
CREATE TABLE IF NOT EXISTS public.penalty_forgiveness (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photographer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Format 'YYYY-MM' (e.g. '2026-05')
  penalty_type TEXT NOT NULL CHECK (penalty_type IN ('EMERGENCY_LEAVE', 'SEND_UPDATE')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(photographer_id, month, penalty_type)
);

-- Enable RLS
ALTER TABLE public.penalty_forgiveness ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can view their own penalty forgiveness"
  ON public.penalty_forgiveness FOR SELECT
  USING (
    photographer_id::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can manage all penalty forgiveness"
  ON public.penalty_forgiveness FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- Enable realtime for this table too
ALTER PUBLICATION supabase_realtime ADD TABLE public.penalty_forgiveness;
