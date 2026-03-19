const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  console.log('--- ANON USER RPC CHECK ---');
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase.rpc('run_system_audit', { target_date: today });
  
  if (error) {
    console.log('RPC Error:', error.code, error.message);
  } else {
    console.log('RPC Results:', data);
  }
}

check();
