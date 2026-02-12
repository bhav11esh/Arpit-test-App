
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
    console.log('--- VERIFYING PAVAN HYUNDAI ---');
    const { count: countByName } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .ilike('delivery_name', '%Pavan%');
    console.log(`Pavan Hyundai Records: ${countByName}`);

    console.log('\n--- IDENTIFYING ROYAL ENFIELD ---');
    const { data: dealerships } = await supabase
        .from('dealerships')
        .select('*')
        .ilike('name', '%Royal Enfield%');

    console.log('Royal Enfield Dealerships:', dealerships);

    if (dealerships && dealerships.length > 0) {
        for (const d of dealerships) {
            const { count } = await supabase
                .from('deliveries')
                .select('*', { count: 'exact', head: true })
                .eq('showroom_code', d.id);
            console.log(`- ${d.name} (${d.id}): ${count} deliveries (by showroom_code)`);
        }
    }
}

verify();
