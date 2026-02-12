
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkPPSMahindra() {
    console.log('--- CHECKING PPS MAHINDRA ---');

    // 1. Find Dealership
    const { data: dealerships, error } = await supabase
        .from('dealerships')
        .select('*')
        .ilike('name', '%PPS Mahindra%');

    if (error) { console.error('Error:', error); return; }

    console.log(`Found ${dealerships.length} matches:`);
    dealerships.forEach(d => console.log(`- ${d.name} (${d.id})`));

    if (dealerships.length === 0) {
        // Try broader search if specific fails
        console.log('Trying broader search for %Mahindra%...');
        const { data: broad } = await supabase.from('dealerships').select('*').ilike('name', '%Mahindra%');
        broad.forEach(d => console.log(`- ${d.name} (${d.id})`));
        return;
    }

    // 2. Count Records
    for (const d of dealerships) {
        // Check mappings
        const { data: mappings } = await supabase.from('mappings').select('id').eq('dealership_id', d.id);
        const codes = mappings && mappings.length > 0 ? mappings.map(m => m.id) : [d.id];

        const { count: countByCode } = await supabase
            .from('deliveries')
            .select('*', { count: 'exact', head: true })
            .in('showroom_code', codes);

        console.log(`\nDealership: ${d.name}`);
        console.log(`- ID: ${d.id}`);
        console.log(`- Mapped Codes: ${codes.join(', ')}`);
        console.log(`- Delivery Count: ${countByCode}`);
    }
}

checkPPSMahindra();
