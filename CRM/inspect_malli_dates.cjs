const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: 'C:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function inspectMalliDates() {
  const malliId = 'bc268775-f79f-4400-b10b-bea4ba1dc762';
  
  // Fetch Mallikarjun's DONE deliveries in May 2026
  const { data: deliveries } = await supabase
    .from('deliveries')
    .select('date, showroom_code')
    .eq('assigned_user_id', malliId)
    .eq('status', 'DONE')
    .gte('date', '2026-05-01')
    .lte('date', '2026-05-31')
    .is('deleted_at', null);

  const deliveryDates = Array.from(new Set(deliveries.map(d => d.date))).sort();
  console.log(`Mallikarjun's delivery dates in DB (${deliveryDates.length} unique days):`);
  console.log(deliveryDates);

  // Fetch Mallikarjun's leaves in May 2026
  const { data: leaves } = await supabase
    .from('leaves')
    .select('date, half, type')
    .eq('photographer_id', malliId)
    .gte('date', '2026-05-01')
    .lte('date', '2026-05-31');

  console.log('\nMallikarjun\'s leaves/off-days in May 2026:');
  console.table(leaves);
}

inspectMalliDates();
