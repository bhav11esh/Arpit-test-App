const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_tables'); // Check if this RPC exists or use a better way
  if (error) {
    // Fallback: try to select from known tables to see which ones fail
    const tables = ['users', 'clusters', 'dealerships', 'mappings', 'deliveries', 'reels', 'push_subscriptions', 'notifications', 'log_events'];
    for (const table of tables) {
      const { error: tableError } = await supabase.from(table).select('*', { count: 'exact', head: true });
      console.log(`Table '${table}':`, tableError ? `MISSING (${tableError.message})` : 'EXISTS');
    }
  } else {
    console.log('Tables:', data);
  }
}

check();
