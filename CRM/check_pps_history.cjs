const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log('Checking historical deliveries for PPS Mahindra...');

    // Find dealership code/name variations
    // Based on previous logs, it might be 'PPS Mahindra' or 'PPS_MAHINDRA'
    const variations = ['PPS Mahindra', 'PPS_MAHINDRA', 'PPS%'];

    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('date, delivery_name, assigned_user_id, status, showroom_code')
        .or(`showroom_code.ilike.PPS Mahindra,showroom_code.ilike.%PPS%`)
        .not('assigned_user_id', 'is', null)
        .order('date', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (deliveries.length === 0) {
        console.log('No historical assignments found.');
    } else {
        console.log('Found historical assignments:');
        const userIds = [...new Set(deliveries.map(d => d.assigned_user_id))];
        const { data: users } = await supabase.from('users').select('id, name').in('id', userIds);
        const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));

        deliveries.forEach(d => {
            console.log(`${d.date}: ${d.showroom_code} -> ${userMap[d.assigned_user_id]} (${d.status})`);
        });
    }
}

check();
