-- Add google_sheet_id column to dealerships table
ALTER TABLE dealerships ADD COLUMN IF NOT EXISTS google_sheet_id TEXT;

-- Update the existing records if you have a list, otherwise they will be NULL by default
-- UPDATE dealerships SET google_sheet_id = 'YOUR_ID' WHERE name = 'Bimal Nexa';
