const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envStr = fs.readFileSync('.env', 'utf8');
const url = envStr.match(/VITE_SUPABASE_URL=([^\r\n]+)/)[1].trim();
const key = envStr.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const sql = fs.readFileSync('supabase/migrations/020_city_weekoffs.sql', 'utf8');
  console.log('Applying migration 020 via RPC (exec_sql)...');
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  if (error) {
    console.error('Error applying migration:', error);
  } else {
    console.log('Migration applied successfully:', data);
  }
}
run();
