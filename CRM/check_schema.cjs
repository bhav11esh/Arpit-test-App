const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log('--- DETAILED TABLE SCHEMA CHECK ---');

  const tables = ['reels', 'push_subscriptions', 'notifications', 'log_events'];
  
  for (const table of tables) {
    const { data, error } = await supabase.rpc('get_table_info', { t_name: table }); // Custom RPC or try SQL
    if (error) {
      // Direct SQL via RPC if enabled
      const { data: sqlData, error: sqlError } = await supabase.rpc('exec_sql', { 
        sql_query: `SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = '${table}'`
      });
      if (sqlError) {
        console.log(`Table '${table}': Could not determine schema (${sqlError.message})`);
      } else {
        console.log(`Table '${table}' location:`, sqlData);
      }
    } else {
      console.log(`Table '${table}' Info:`, data);
    }
  }
}

check();
