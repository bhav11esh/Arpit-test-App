const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: 'C:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const pId = 'bc268775-f79f-4400-b10b-bea4ba1dc762'; // Mallikarjun
  const { data: leaves, error } = await supabase
    .from('leaves')
    .select('*')
    .eq('photographer_id', pId)
    .gte('date', '2026-05-01')
    .lte('date', '2026-05-31')
    .order('date', { ascending: true })
    .order('half', { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  console.log('Leaves for Mallikarjun in May 2026:', leaves.map(l => ({
    date: l.date,
    half: l.half,
    applied_at: l.applied_at,
    converted: l.converted_to_working_day
  })));
}

run();
