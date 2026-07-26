const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: 'C:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const pId = 'bc268775-f79f-4400-b10b-bea4ba1dc762'; // Mallikarjun
  const { data: deliveries, error } = await supabase
    .from('deliveries')
    .select('date, status')
    .eq('assigned_user_id', pId)
    .eq('status', 'DONE')
    .is('deleted_at', null)
    .gte('date', '2026-05-01')
    .lte('date', '2026-05-31');

  if (error) {
    console.error(error);
    return;
  }

  const counts = {};
  deliveries.forEach(d => {
    const day = new Date(d.date).getDay();
    if (day === 2) {
      counts[d.date] = (counts[d.date] || 0) + 1;
    }
  });

  console.log('Tuesday deliveries for Mallikarjun in May 2026:', counts);
}

run();
