-- Add phone_number column to users table (photographers are users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT;
