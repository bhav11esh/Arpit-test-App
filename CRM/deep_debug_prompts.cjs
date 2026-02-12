
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const today = '2026-02-08';
    console.log(`--- Deep Debug PPS/Khivraj for ${today} ---`);

    // 1. Get Dealerships IDs
    const { data: dealers } = await supabase
        .from('dealerships')
        .select('id, name')
        .or('name.ilike.%PPS Mahindra%,name.ilike.%Khivraj Triumph%');

    const pps = dealers.find(d => d.name.includes('PPS'));
    const khivraj = dealers.find(d => d.name.includes('Khivraj'));

    console.log('PPS ID:', pps?.id);
    console.log('Khivraj ID:', khivraj?.id);

    // 2. Check Deliveries
    const { data: deliveries } = await supabase
        .from('deliveries')
        .select('*')
        .eq('date', today)
        .or(`showroom_code.ilike.%PPS%,showroom_code.ilike.%Khivraj%`);

    console.log('\n--- Deliveries Found ---');
    if (deliveries.length === 0) console.log('NO DELIVERIES FOUND!');

    deliveries.forEach(d => {
        console.log(`\nDelivery: ${d.delivery_name}`);
        console.log(`  Showroom Code: '${d.showroom_code}'`);
        console.log(`  Cluster Code:  '${d.cluster_code}'`);
        console.log(`  Timing:        ${d.timing}`);
        console.log(`  Status:        ${d.status}`);
    });

    // 3. Check Finalization Logs
    const codes = [...new Set(deliveries.map(d => d.showroom_code))];
    const { data: logs } = await supabase
        .from('log_events')
        .select('*')
        .eq('type', 'SHOWROOM_FINALIZED')
        .in('target_id', codes)
        .gte('created_at', `${today}T00:00:00Z`);

    console.log('\n--- Finalization Logs ---');
    if (logs.length === 0) console.log('No finalization logs found.');
    logs.forEach(l => console.log(`Logged: ${l.target_id} by ${l.actor_user_id}`));
}

check();
