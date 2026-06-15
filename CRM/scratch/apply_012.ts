
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyMigration() {
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '012_harden_audit_rpc.sql');
  console.log(`Reading migration from: ${migrationPath}`);
  
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('Applying migration via RPC (exec_sql)...');
  
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('Error applying migration via RPC:', JSON.stringify(error, null, 2));
    console.log('NOTE: This requires "exec_sql" RPC to exist in your Supabase project.');
  } else {
    console.log('Migration applied successfully!');
  }
}

applyMigration();
