import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyMigration() {
  console.log('Using Supabase URL:', supabaseUrl);
  
  const coreStatements = [
    'ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;',
    'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS city TEXT;',
    'ALTER TABLE public.dealerships ADD COLUMN IF NOT EXISTS city TEXT;',
    'ALTER TABLE public.clusters ADD COLUMN IF NOT EXISTS city TEXT;',
    "UPDATE public.users SET city = 'bengaluru' WHERE city IS NULL;",
    "UPDATE public.clusters SET city = 'bengaluru' WHERE city IS NULL;",
    "UPDATE public.dealerships SET city = 'bengaluru' WHERE city IS NULL;"
  ];
  
  console.log('Applying core schema changes...');
  
  for (const stmt of coreStatements) {
    console.log(`Running: ${stmt}`);
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: stmt });
      if (error) {
        console.error(`Failed: ${error.message}`);
      } else {
        console.log('Success');
      }
    } catch (e) {
      console.error(`Runtime error: ${e.message}`);
    }
  }
}

applyMigration();
