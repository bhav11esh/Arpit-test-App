const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

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
    // Using a simple query if possible. 
    // If exec_sql RPC doesn't exist, we might be stuck without dashboard access.
    // However, I'll try to use the RPC name 'exec_sql' which is common in these setups.
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: stmt });
    
    if (error) {
      console.error(`Failed: ${error.message}`);
    } else {
      console.log('Success');
    }
  }
}

applyMigration();
