const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyMigration() {
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '015_auto_create_reel_tasks.sql');
  console.log(`Reading migration from: ${migrationPath}`);
  
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('Applying migration via RPC (exec_sql)...');
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('Error applying migration:', error.message);
    process.exit(1);
  } else {
    console.log('Migration applied successfully!');
  }
}

applyMigration();
