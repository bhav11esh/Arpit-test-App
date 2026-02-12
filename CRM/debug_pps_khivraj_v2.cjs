
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const today = '2026-02-08';
    console.log(`Checking Deliveries for ${today} in Whitefield-Indiranagar...`);

    // 1. Get all deliveries for this cluster
    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('showroom_code')
        .eq('date', today)
        .eq('cluster_code', 'Whitefield-Indiranagar');

    if (error) { console.error(error); return; }

    const codes = [...new Set(deliveries.map(d => d.showroom_code))];
    console.log('Active Showrooms by Delivery Code:', codes);

    // 2. Check Dealership Names (to see if they match the codes)
    const { data: dealers } = await supabase
        .from('dealerships')
        .select('name')
        .or('name.ilike.%PPS Mahindra%,name.ilike.%Khivraj Triumph%');

    console.log('Target Dealerships:', dealers.map(d => d.name));
}

check();
