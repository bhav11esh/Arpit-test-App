const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function debugTimestamps() {
    console.log('--- Debugging Timestamps for Apple Auto ---');

    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('created_at')
        .eq('showroom_code', 'APPLE_AUTO_VOLKSWAGEN')
        .order('created_at', { ascending: true }); // Earliest first

    if (error) { console.error(error); return; }

    if (deliveries.length > 0) {
        console.log(`First Created: ${deliveries[0].created_at}`);
        console.log(`Last Created: ${deliveries[deliveries.length - 1].created_at}`);

        const start = new Date(deliveries[0].created_at);
        const end = new Date(deliveries[deliveries.length - 1].created_at);
        const diffMs = end - start;
        console.log(`Import Duration: ${diffMs / 1000} seconds`);
        console.log(`Records per second: ${deliveries.length / (diffMs / 1000)}`);
    }
}

debugTimestamps();
