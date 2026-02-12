const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check2020() {
    console.log('--- Checking for 2020 Records ---');

    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('showroom_code', 'APPLE_AUTO_VOLKSWAGEN')
        .ilike('date', '2020%');

    if (error) { console.error(error); return; }

    console.log(`Found ${deliveries.length} records in 2020.`);
    if (deliveries.length > 0) {
        console.log('Sample:', deliveries[0].delivery_name);
    }
}

check2020();
