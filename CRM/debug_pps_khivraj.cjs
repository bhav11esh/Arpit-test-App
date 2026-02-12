
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const today = '2026-02-08';
    const clusterName = 'Whitefield-Indiranagar';
    console.log(`Checking PPS/Khivraj for ${today} in ${clusterName}...`);

    // 1. Get Cluster ID
    const { data: cluster } = await supabase.from('clusters').select('id').eq('name', clusterName).single();
    if (!cluster) { console.log('Cluster not found!'); return; }

    // 2. Find Dealerships
    const { data: dealers } = await supabase
        .from('dealerships')
        .select('id, name')
        .or('name.ilike.%PPS Mahindra%,name.ilike.%Khivraj Triumph%');

    console.log('\n--- Dealerships Found ---');
    dealers.forEach(d => console.log(`${d.id}: ${d.name}`));

    // 3. Check Mappings
    const dealerIds = dealers.map(d => d.id);
    const { data: mappings } = await supabase
        .from('mappings')
        .select('dealership_id, mapping_type, photographer_id')
        .in('dealership_id', dealerIds)
        .eq('cluster_id', cluster.id);

    console.log('\n--- Mappings ---');
    if (mappings.length === 0) console.log('NO MAPPINGS FOUND (Should fallback to unmapped logic)');

    const { data: users } = await supabase.from('users').select('id, name');
    const uMap = Object.fromEntries(users.map(u => [u.id, u.name]));

    mappings.forEach(m => {
        const d = dealers.find(x => x.id === m.dealership_id);
        console.log(`${d?.name} -> ${m.mapping_type} -> ${uMap[m.photographer_id]}`);
    });

    // 4. Check Deliveries
    console.log('\n--- Deliveries Today ---');
    const { data: deliveries } = await supabase
        .from('deliveries')
        .select('id, showroom_code, cluster_code, delivery_name')
        .eq('date', today)
        .eq('cluster_code', clusterName)
        .or(`showroom_code.in.(${dealers.map(d =>
            d.name.match(/\\(([^)]+)\\)/)?.[1] || d.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
        ).join(',')})`);

    if (deliveries.length === 0) {
        // Fallback check by name matching manually if Supabase filter failed
        console.log('No direct match. Checking all deliveries for cluster...');
        const { data: all } = await supabase.from('deliveries').select('showroom_code').eq('date', today).eq('cluster_code', clusterName);
        console.log('All showroom codes today:', [...new Set(all.map(d => d.showroom_code))]);
    } else {
        deliveries.forEach(d => console.log(`[${d.showroom_code}] ${d.delivery_name}`));
    }
}

check();
