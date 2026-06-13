const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envStr = fs.readFileSync('.env', 'utf8');
const url = envStr.match(/VITE_SUPABASE_URL=([^\r\n]+)/)[1].trim();
const key = envStr.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  // We check if public.exec_sql exists by getting its definition
  const { data, error } = await supabase.rpc('pg_get_functiondef', { func_name: 'public.exec_sql(text)' });
  console.log('Signature public.exec_sql(text):', { data, error });

  const { data: data2, error: error2 } = await supabase.rpc('pg_get_functiondef', { func_name: 'exec_sql' });
  console.log('Signature exec_sql:', { data2, error2 });
}
run();
