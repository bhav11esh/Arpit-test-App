
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
    console.log('--- Inspecting Pavan Hyundai Records ---');

    // 1. Find dealership
    const { data: dealerships, error: dError } = await supabase.from('dealerships').select('*').ilike('name', '%Pavan%');
    if (dError) { console.error('Error fetching dealership:', dError); return; }
    console.log('Dealerships found:', dealerships);

    if (dealerships && dealerships.length > 0) {
        const d = dealerships[0];
        console.log(`Using Dealership: ${d.name} (ID: ${d.id})`);

        // 2. Count by showroom_code
        const { count: countByCode, error: cError } = await supabase
            .from('deliveries')
            .select('*', { count: 'exact', head: true })
            .eq('showroom_code', d.id);

        if (cError) console.error('Error counting by code:', cError);
        console.log(`Deliveries with showroom_code='${d.id}':`, countByCode);

        // 3. Count by delivery_name like %Pavan%
        const { count: countByName, error: nError } = await supabase
            .from('deliveries')
            .select('*', { count: 'exact', head: true })
            .ilike('delivery_name', '%Pavan%');

        if (nError) console.error('Error counting by name:', nError);
        console.log(`Deliveries with delivery_name like '%Pavan%':`, countByName);

        // 4. Sample some valid ones
        const { data: samples } = await supabase
            .from('deliveries')
            .select('id, delivery_name, showroom_code, cluster_code, date')
            .eq('showroom_code', d.id)
            .limit(5);
        console.log('Sample deliveries (by showroom_code):', samples);

        // 5. Sample some name-based ones
        const { data: nameSamples } = await supabase
            .from('deliveries')
            .select('id, delivery_name, showroom_code, cluster_code, date')
            .ilike('delivery_name', '%Pavan%')
            .limit(5);
        console.log('Sample deliveries (by name matching Pavan):', nameSamples);
    } else {
        console.log('No "Pavan" dealership found.');
    }
}

inspect();
