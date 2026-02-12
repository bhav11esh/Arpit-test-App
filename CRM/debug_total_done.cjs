const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function debugTotalDone() {
    console.log('--- Debugging Total DONE Deliveries ---');

    const { count, error } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'DONE');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Total DONE Deliveries: ${count}`);
}

debugTotalDone();
