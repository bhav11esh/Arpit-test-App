const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyAuditMigration() {
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '006_enterprise_audit_rpc.sql');
  console.log(`Reading migration from: ${migrationPath}`);
  
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('Applying updated RPC via exec_sql...');
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('Error applying RPC update:', error.message);
    process.exit(1);
  } else {
    console.log('System Audit RPC updated successfully!');
  }
}

applyAuditMigration();
