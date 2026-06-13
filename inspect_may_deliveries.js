const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function inspectMay() {
  console.log('Fetching May 2026 deliveries...');
  const { data: deliveries, error } = await supabase
    .from('deliveries')
    .select(`
      id,
      date,
      showroom_code,
      delivery_name,
      status,
      assigned_user_id,
      received_amount,
      rapido_charge
    `)
    .gte('date', '2026-05-01')
    .lte('date', '2026-05-31')
    .is('deleted_at', null);

  if (error) {
    console.error('Error fetching deliveries:', error);
    return;
  }

  console.log(`Fetched ${deliveries.length} done/other deliveries for May 2026.`);

  // Load user map
  const { data: users } = await supabase.from('users').select('id, name, email');
  const userMap = {};
  users.forEach(u => {
    userMap[u.id] = u.name;
  });

  // Group deliveries by showroom
  const grouped = {};
  deliveries.forEach(d => {
    const code = d.showroom_code;
    if (!grouped[code]) grouped[code] = [];
    grouped[code].push(d);
  });

  console.log('\n--- Deliveries by Showroom Code and Photographer assignment ---');
  for (const [code, rows] of Object.entries(grouped)) {
    console.log(`Showroom: ${code} (${rows.length} deliveries)`);
    // Count assignments
    const assignments = {};
    rows.forEach(r => {
      const name = userMap[r.assigned_user_id] || 'UNASSIGNED';
      assignments[name] = (assignments[name] || 0) + 1;
    });
    console.log('  Assignments:', assignments);
  }

  // Find deliveries containing "Mallikarjun" or similar in metadata or user map
  console.log('\n--- Check deliveries specifically assigned to Mallikarjun (bc268775-f79f-4400-b10b-bea4ba1dc762) ---');
  const malliId = 'bc268775-f79f-4400-b10b-bea4ba1dc762';
  const malliDeliveries = deliveries.filter(d => d.assigned_user_id === malliId);
  console.log(`Total deliveries assigned to Mallikarjun: ${malliDeliveries.length}`);
  
  // Print unique showrooms for Mallikarjun
  const malliShowrooms = {};
  malliDeliveries.forEach(d => {
    malliShowrooms[d.showroom_code] = (malliShowrooms[d.showroom_code] || 0) + 1;
  });
  console.log('Mallikarjun assigned showrooms:', malliShowrooms);
}

inspectMay();
