const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: 'C:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function printMalliLeaves() {
  const malliId = 'bc268775-f79f-4400-b10b-bea4ba1dc762';
  
  const { data: leaves } = await supabase
    .from('leaves')
    .select('*')
    .eq('photographer_id', malliId)
    .gte('date', '2026-05-01')
    .lte('date', '2026-05-31');

  console.log(`--- Leaves for Mallikarjun in May 2026 (Count: ${leaves.length}) ---`);
  console.table(leaves);
  
  const { data: deliveries } = await supabase
    .from('deliveries')
    .select('date, showroom_code')
    .eq('assigned_user_id', malliId)
    .eq('status', 'DONE')
    .gte('date', '2026-05-01')
    .lte('date', '2026-05-31')
    .is('deleted_at', null);

  const workedTuesdays = Array.from(new Set(
    deliveries.filter(d => new Date(d.date).getDay() === 2).map(d => d.date)
  )).sort();
  console.log('\nTuesdays Worked:', workedTuesdays);
}

printMalliLeaves();
