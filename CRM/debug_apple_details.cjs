const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function debugDetails() {
    console.log('--- Debugging Details for Apple Auto ---');

    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('showroom_code', 'APPLE_AUTO_VOLKSWAGEN');

    if (error) { console.error(error); return; }

    console.log(`Total: ${deliveries.length}`);

    // Check showroom_type
    const types = {};
    const rejectionMode = { rejected: 0, pending: 0, null: 0 };

    deliveries.forEach(d => {
        // Showroom Type
        types[d.showroom_type] = (types[d.showroom_type] || 0) + 1;

        // Rejected Status
        if (d.rejected_by_all === true) rejectionMode.rejected++;
        else if (d.rejected_by_all === false) rejectionMode.pending++;
        else rejectionMode.null++;
    });

    console.log('Showroom Types:', types);
    console.log('Rejection Stats:', rejectionMode);
}

debugDetails();
