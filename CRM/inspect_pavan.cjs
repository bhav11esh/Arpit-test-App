
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
    console.log('--- Inspecting Pavan Hyundai ---');

    const { data: dealerships } = await supabase.from('dealerships').select('*').ilike('name', '%Pavan%');
    console.log('Dealerships:', dealerships);

    if (dealerships && dealerships.length > 0) {
        const d = dealerships[0];
        const { count: countByCode } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('showroom_code', d.id); // Assuming id is code, or check mapping
        console.log(`Deliveries with showroom_code/id matching dealership id ${d.id}:`, countByCode);

        // Check with delivery_name
        const { data: deliveriesByName } = await supabase.from('deliveries').select('id, delivery_name, showroom_code').ilike('delivery_name', '%Pavan%').limit(5);
        console.log('Deliveries with delivery_name like %Pavan% (first 5):', deliveriesByName);

        const { count: countByName } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).ilike('delivery_name', '%Pavan%');
        console.log('Total deliveries with delivery_name like %Pavan%:', countByName);
    }
}

inspect();
