const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkBimalVolks() {
    console.log('--- Checking Bimal Nexa & Volkswagen Codes ---');

    // 1. Get Dealerships to see what the "Expected" code logic produces
    const { data: dealerships } = await supabase.from('dealerships').select('*').or('name.ilike.%Bimal Nexa%,name.ilike.%Volk%');

    console.log('\n--- Dealership Configs ---');
    dealerships.forEach(d => {
        const derivedCode = d.name.match(/\(([^)]+)\)/)?.[1] ||
            d.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        console.log(`Dealership: "${d.name}"`);
        console.log(`   ID: ${d.id}`);
        console.log(`   Expected Code (ViewScreen): "${derivedCode}"`);
    });

    // 2. Check Actual Deliveries
    console.log('\n--- Actual Deliveries (Last 24h) ---');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: deliveries } = await supabase
        .from('deliveries')
        .select('id, delivery_name, showroom_code')
        .gt('created_at', oneDayAgo)
        .or('delivery_name.ilike.%BIMAL%,delivery_name.ilike.%VOLK%')
        .limit(20);

    deliveries.forEach(d => {
        console.log(`[${d.delivery_name}] -> saved showroom_code: "${d.showroom_code}"`);
    });

    // 3. Check for specific mismatches
    console.log('\n--- Summary of Showroom Codes Used ---');
    const { data: allDeals } = await supabase
        .from('deliveries')
        .select('showroom_code')
        .gt('created_at', oneDayAgo);

    const codeCounts = {};
    allDeals.forEach(d => {
        codeCounts[d.showroom_code] = (codeCounts[d.showroom_code] || 0) + 1;
    });
    console.table(codeCounts);
}

checkBimalVolks();
