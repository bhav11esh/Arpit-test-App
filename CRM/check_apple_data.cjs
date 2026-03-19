const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log('--- APPLE AUTO VOLKSWAGEN DATA ---');
  
  // 1. From dealerships table
  const { data: dealer } = await supabase.from('dealerships').select('*').ilike('name', '%Apple Auto%');
  console.log('DEALERSHIPS TABLE:', JSON.stringify(dealer, null, 2));

  // 2. From mappings table
  const { data: mapping } = await supabase.from('photographer_mappings').select('*').in('dealershipId', dealer.map(d => d.id));
  console.log('MAPPINGS TABLE:', JSON.stringify(mapping, null, 2));
}

check();
