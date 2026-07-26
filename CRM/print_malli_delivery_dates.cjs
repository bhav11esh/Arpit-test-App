const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: 'C:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function printDates() {
  const pId = 'bc268775-f79f-4400-b10b-bea4ba1dc762'; // Mallikarjun
  const { data: deliveries } = await supabase
    .from('deliveries')
    .select('date, showroom_code')
    .eq('assigned_user_id', pId)
    .eq('status', 'DONE')
    .is('deleted_at', null)
    .gte('date', '2026-05-01')
    .lte('date', '2026-05-31');

  const countsByDate = {};
  deliveries.forEach(d => {
    countsByDate[d.date] = (countsByDate[d.date] || 0) + 1;
  });

  console.log('--- Deliveries by Date ---');
  const sortedDates = Object.keys(countsByDate).sort();
  sortedDates.forEach(date => {
    const dayOfWeek = new Date(date).getDay();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    console.log(`${date} (${days[dayOfWeek]}): ${countsByDate[date]} deliveries`);
  });
}

printDates();
