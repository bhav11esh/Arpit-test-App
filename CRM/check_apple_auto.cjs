
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkAppleAuto() {
    console.log('--- CHECKING APPLE AUTO VOLKSWAGEN ---');

    // 1. Search for Dealership
    const { data: dealerships, error } = await supabase
        .from('dealerships')
        .select('*')
        .or('name.ilike.%Apple%,name.ilike.%Volkswagen%');

    if (error) { console.error('Error:', error); return; }

    console.log(`Found ${dealerships.length} matches:`);
    dealerships.forEach(d => console.log(`- ${d.name} (ID: ${d.id})\n  Sheet: ${d.google_sheet_id}`));

    if (dealerships.length === 0) {
        console.log("No dealership found matching 'Apple' or 'Volkswagen'.");
        return;
    }

    // 2. Check metrics for each
    for (const d of dealerships) {
        // Mappings
        const { data: mappings } = await supabase.from('mappings').select('*').eq('dealership_id', d.id);
        const codes = mappings && mappings.length > 0 ? mappings.map(m => m.id) : [d.id];

        console.log(`\nDealership: ${d.name}`);
        console.log(`- Mappings: ${mappings.length} (Codes: ${codes.join(', ')})`);

        // Count
        const { count } = await supabase
            .from('deliveries')
            .select('*', { count: 'exact', head: true })
            .in('showroom_code', codes);

        console.log(`- Delivery Count: ${count}`);
    }
}

checkAppleAuto();
