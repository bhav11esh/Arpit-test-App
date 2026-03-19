const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  console.log('--- ANON USER TABLE CHECK ---');
  const tables = ['reels', 'push_subscriptions', 'notifications', 'log_events'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`Table '${table}':`, error.code === '42P01' ? 'NOT FOUND' : `ERROR (${error.code}: ${error.message})`);
    } else {
      console.log(`Table '${table}': VISIBLE`);
    }
  }
}

check();
