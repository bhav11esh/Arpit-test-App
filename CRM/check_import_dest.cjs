const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkRecentDeliveries() {
    console.log('--- Checking Recent Import Deliveries ---');

    // Get last 10 deliveries created
    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('id, delivery_name, showroom_code, cluster_code, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${deliveries.length} recent deliveries:`);
    deliveries.forEach(d => {
        console.log(`[${d.created_at}] ${d.delivery_name} -> Showroom: ${d.showroom_code} | Cluster: ${d.cluster_code}`);
    });

    console.log('\n--- Checking Mappings for Apple Auto & Bimal ---');
    // Check mappings 
    const { data: mappings } = await supabase.from('mappings').select('id, dealership_id, cluster_id');

    // Get Dealership Names
    const { data: dealerships } = await supabase.from('dealerships').select('id, name');

    // Helper
    const getDealershipName = (id) => dealerships.find(d => d.id === id)?.name || id;

    mappings.forEach(m => {
        const dName = getDealershipName(m.dealership_id);
        if (dName.includes('Apple') || dName.includes('Bimal')) {
            console.log(`Mapping ID (Showroom Code): ${m.id} -> Dealership: ${dName}`);
        }
    });
}

checkRecentDeliveries();
