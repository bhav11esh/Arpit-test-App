const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log('--- Checking Venkatesh ---');
    const { data: venkatesh } = await supabase.from('users').select('id').ilike('name', '%Venkatesh%').single();
    if (venkatesh) {
        console.log(`Venkatesh ID: ${venkatesh.id}`);
        const { data: mappings } = await supabase.from('mappings').select('*, dealerships(name), clusters(name)').eq('photographer_id', venkatesh.id);
        if (mappings.length > 0) {
            console.log('Venkatesh Assignments:');
            mappings.forEach(m => console.log(`- ${m.dealerships.name} (${m.clusters.name})`));
        } else {
            console.log('Venkatesh has NO assignments.');
        }
    } else {
        console.log('Venkatesh user not found.');
    }

    console.log('\n--- Deep History Check for PPS Mahindra ---');
    const { data: history } = await supabase
        .from('deliveries')
        .select('date, assigned_user_id, status')
        .ilike('showroom_code', '%PPS%')
        .not('assigned_user_id', 'is', null)
        .order('date', { ascending: false })
        .limit(50); // Increased limit

    if (history && history.length > 0) {
        console.log(`Found ${history.length} historical assignments.`);
        const userIds = [...new Set(history.map(h => h.assigned_user_id))];
        const { data: users } = await supabase.from('users').select('id, name').in('id', userIds);
        const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));

        history.forEach(h => {
            console.log(`${h.date}: Assigned to ${userMap[h.assigned_user_id]}`);
        });
    } else {
        console.log('No history found even with limit 50.');
    }
}

check();
