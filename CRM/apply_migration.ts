import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyMigration() {
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '007_data_integrity_v6.sql');
  console.log(`Reading migration from: ${migrationPath}`);
  
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('Applying migration via RPC (exec_sql)...');
  
  // Note: This requires a stored procedure 'exec_sql' to exist in Supabase.
  // If it doesn't exist, we might need a different approach or the user has to run it in the dashboard.
  // However, I'll try to run the individual ALTER statements if exec_sql fails.
  
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('Error applying migration via RPC:', error.message);
    console.log('Attempting to apply core ALTER statements manually...');
    
    const coreStatements = [
      'ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;',
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS city TEXT;',
      'ALTER TABLE public.dealerships ADD COLUMN IF NOT EXISTS city TEXT;',
      'ALTER TABLE public.clusters ADD COLUMN IF NOT EXISTS city TEXT;'
    ];
    
    for (const stmt of coreStatements) {
      console.log(`Running: ${stmt}`);
      const { error: stmtError } = await supabase.rpc('exec_sql', { sql_query: stmt });
      if (stmtError) {
        console.error(`Failed: ${stmtError.message}`);
      } else {
        console.log('Success');
      }
    }
    
    // Also assign Bengaluru to everything existing
    console.log('Assigning "bengaluru" to existing records...');
    const assignments = [
       "UPDATE public.users SET city = 'bengaluru' WHERE city IS NULL;",
       "UPDATE public.clusters SET city = 'bengaluru' WHERE city IS NULL;",
       "UPDATE public.dealerships SET city = 'bengaluru' WHERE city IS NULL;"
    ];
    for (const stmt of assignments) {
      const { error: stmtError } = await supabase.rpc('exec_sql', { sql_query: stmt });
      if (stmtError) console.error(`Failed assignment: ${stmtError.message}`);
      else console.log('Successfully assigned bengaluru');
    }
  } else {
    console.log('Migration applied successfully!');
  }
}

applyMigration();
