const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function debug() {
    console.log('--- Debugging Bimal Showroom Code Mismatch ---');

    console.log('\n[1] All Dealerships & Expected Codes:');
    const { data: dealerships } = await supabase.from('dealerships').select('id, name');

    dealerships.forEach(d => {
        const expectedCode = d.name.match(/\(([^)]+)\)/)?.[1] ||
            d.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        console.log(`"${d.name}" -> Expected: "${expectedCode}"`);
    });

    console.log('\n[2] Recent Import Deliveries (Last 50):');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: deliveries } = await supabase
        .from('deliveries')
        .select('id, delivery_name, showroom_code')
        .gt('created_at', oneDayAgo)
        .order('created_at', { ascending: false })
        .limit(50);

    // Group by showroom_code
    const counts = {};
    const examples = {};

    deliveries.forEach(d => {
        counts[d.showroom_code] = (counts[d.showroom_code] || 0) + 1;
        if (!examples[d.showroom_code]) examples[d.showroom_code] = d.delivery_name;
    });

    console.table(counts);
    console.log('Examples:', examples);
}

debug();
