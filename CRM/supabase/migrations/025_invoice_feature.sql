-- Add billing configuration columns to dealerships table
ALTER TABLE public.dealerships ADD COLUMN IF NOT EXISTS billing_company_name TEXT;
ALTER TABLE public.dealerships ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE public.dealerships ADD COLUMN IF NOT EXISTS billing_state TEXT DEFAULT 'Karnataka';
ALTER TABLE public.dealerships ADD COLUMN IF NOT EXISTS billing_email TEXT;
ALTER TABLE public.dealerships ADD COLUMN IF NOT EXISTS billing_phone TEXT;
ALTER TABLE public.dealerships ADD COLUMN IF NOT EXISTS next_invoice_number INTEGER DEFAULT 100000;

-- Add is_invoice_billing column to deliveries table
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS is_invoice_billing BOOLEAN DEFAULT false;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealership_id UUID REFERENCES public.dealerships(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    billing_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    total_amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'DRAFT', -- 'DRAFT', 'SENT', 'PAID', 'VOID'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Admins can manage invoices
CREATE POLICY "Admins can manage invoices"
  ON public.invoices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );
