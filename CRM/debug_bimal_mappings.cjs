const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function debugMappings() {
    console.log('--- Debugging Bimal Mappings ---');

    // 1. All Dealerships matching Bimal
    const { data: dealerships } = await supabase.from('dealerships').select('*').ilike('name', '%Bimal%');
    console.log(`\nFound ${dealerships.length} Bimal Dealerships:`);
    dealerships.forEach(d => console.log(`[${d.id}] "${d.name}"`));

    const dealershipIds = dealerships.map(d => d.id);

    // 2. Mappings pointing to these dealerships
    const { data: mappings } = await supabase
        .from('mappings')
        .select('id, dealership_id, cluster_id')
        .in('dealership_id', dealershipIds);

    console.log(`\nFound ${mappings.length} Mappings:`);

    // Get Cluster Names
    const { data: clusters } = await supabase.from('clusters').select('id, name');
    const cMap = Object.fromEntries(clusters.map(c => [c.id, c.name]));

    for (const m of mappings) {
        const d = dealerships.find(x => x.id === m.dealership_id);
        const clusterName = cMap[m.cluster_id] || 'Unknown Cluster';

        console.log(`Mapping ID: ${m.id}`);
        console.log(`  -> Dealership: "${d.name}" (${d.id})`);
        console.log(`  -> Cluster: "${clusterName}"`);

        // Calculate Expected Code for this specific mapping path
        const code = d.name.match(/\(([^)]+)\)/)?.[1] ||
            d.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        console.log(`  -> Derived Code: "${code}"`);
    }

    // 3. Confirm Delivery Codes again
    const { data: deliveries } = await supabase
        .from('deliveries')
        .select('showroom_code')
        .ilike('delivery_name', '%BIMAL%')
        .limit(1);

    if (deliveries.length > 0) {
        console.log(`\nSample Delivery Code: "${deliveries[0].showroom_code}"`);
    }
}

debugMappings();
