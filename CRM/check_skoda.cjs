
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkSkoda() {
    console.log('--- CHECKING SKODA ---');

    // Find Dealership
    const { data: dealerships } = await supabase
        .from('dealerships')
        .select('*')
        .ilike('name', '%Skoda%');

    console.log('Skoda Dealerships:', dealerships);

    if (dealerships) {
        for (const d of dealerships) {
            const { count } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('showroom_code', d.id);
            console.log(`- ${d.name} (${d.id}): ${count} deliveries (by code)`);

            // Need mappings to be sure of code?
            const { data: mappings } = await supabase.from('mappings').select('id').eq('dealership_id', d.id);
            console.log(`  Mappings:`, mappings);
        }
    }
}

checkSkoda();
