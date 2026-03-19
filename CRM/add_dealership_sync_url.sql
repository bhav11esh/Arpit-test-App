-- Add google_sync_url column to dealerships table
ALTER TABLE dealerships ADD COLUMN IF NOT EXISTS google_sync_url TEXT;

-- Update Akshaya Mercedes with the provided V7.8 URL
UPDATE dealerships 
SET google_sync_url = 'https://script.google.com/macros/s/AKfycbzcfiAInjwPevisgq0BluCbHacAh8eCKhlcAdhXQJ1uMfzq5XYY3p55j63dVxb5R4DLWA/exec'
WHERE name ILIKE '%Akshaya Mercedes%';
