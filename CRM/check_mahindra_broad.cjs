
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkMahindraBroadly() {
    console.log('--- CHECKING ALL MAHINDRA DEALERSHIPS ---');

    // 1. Find all dealerships with 'Mahindra' in name
    const { data: dealerships, error } = await supabase
        .from('dealerships')
        .select('*')
        .ilike('name', '%Mahindra%');

    if (error) { console.error('Error:', error); return; }

    console.log(`Found ${dealerships.length} matches:`);
    dealerships.forEach(d => console.log(`- ${d.name} (${d.id})`));

    // 2. Count Records for EACH match
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

        // Also check by name pattern just in case
        const namePattern = `%${d.name.replace(/\s+/g, '_').toUpperCase()}%`;
        const { count: countByName } = await supabase
            .from('deliveries')
            .select('*', { count: 'exact', head: true })
            .ilike('delivery_name', namePattern);
        console.log(`- Name Pattern Count (${namePattern}): ${countByName}`);
    }
}

checkMahindraBroadly();
