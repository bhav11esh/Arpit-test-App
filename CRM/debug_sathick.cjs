const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function debugSathick() {
    console.log('--- Debugging Sathick Assignments ---');

    // Sathick's ID from previous debug
    const sathickId = '4247126e-71f1-4472-98a0-544219a597b9';

    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('delivery_name, date')
        .eq('showroom_code', 'APPLE_AUTO_VOLKSWAGEN')
        .eq('assigned_user_id', sathickId)
        .limit(10); // Check first 10

    if (error) { console.error(error); return; }

    console.log(`Found records assigned to Sathick:`);
    deliveries.forEach(d => {
        console.log(`- ${d.date}: ${d.delivery_name}`);
    });
}

debugSathick();
