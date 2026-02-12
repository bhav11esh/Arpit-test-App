
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function healthCheck() {
    console.log('--- SYSTEM HEALTH CHECK ---');

    console.log('Verifying core tables are INTACT...');

    // 1. Dealerships
    const { count: dealerships } = await supabase.from('dealerships').select('*', { count: 'exact', head: true });
    console.log(`[OK] Dealerships Count: ${dealerships} (Should be > 0)`);

    // 2. Mappings
    const { count: mappings } = await supabase.from('mappings').select('*', { count: 'exact', head: true });
    console.log(`[OK] Mappings Count: ${mappings} (Should be > 0)`);

    // 3. Users (Photographers)
    const { count: users } = await supabase.from('users').select('*', { count: 'exact', head: true });
    console.log(`[OK] Users Count: ${users} (Should be > 0)`);

    console.log('\nVerifying TARGET delivery rows are DELETED...');

    // 4. Pavan Deliveries
    const { count: pavan } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).ilike('delivery_name', '%Pavan%');
    console.log(`[CHECK] Pavan Hyundai Deliveries: ${pavan}`);

    // 5. Skoda Karr Deliveries (ID: b3034732...)
    const { count: karr } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('showroom_code', 'b3034732-d979-4c69-861e-84d3a32adfe4');
    console.log(`[CHECK] Skoda Karr Deliveries: ${karr}`);

    // 6. RE Teknik Deliveries
    // Find Teknik dealership(s)
    const { data: re } = await supabase.from('dealerships').select('id').ilike('name', '%Teknik%');
    if (re && re.length > 0) {
        let total = 0;
        for (const d of re) {
            const { count } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('showroom_code', d.id);
            total += count;
        }
        console.log(`[CHECK] Royal Enfield Teknik Deliveries: ${total}`);
    } else {
        console.log(`[CHECK] Royal Enfield Teknik Deliveries: (Dealership not found)`);
    }

}

healthCheck();
