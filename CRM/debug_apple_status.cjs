const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function debugStatus() {
    console.log('--- Debugging Status for Apple Auto ---');

    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('status')
        .eq('showroom_code', 'APPLE_AUTO_VOLKSWAGEN');

    if (error) {
        console.error('Error:', error);
        return;
    }

    const counts = {};
    deliveries.forEach(d => {
        counts[d.status] = (counts[d.status] || 0) + 1;
    });

    console.table(counts);
}

debugStatus();
