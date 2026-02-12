const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log('Checking photographers in Whitefield-Indiranagar...');

    // Get Cluster ID
    const { data: cluster } = await supabase.from('clusters').select('id').eq('name', 'Whitefield-Indiranagar').single();
    if (!cluster) return console.log('Cluster not found');

    // Get Mappings
    const { data: mappings } = await supabase
        .from('mappings')
        .select('photographer_id, dealership_id')
        .eq('cluster_id', cluster.id);

    if (!mappings || mappings.length === 0) return console.log('No mappings found');

    // Get Users
    const userIds = [...new Set(mappings.map(m => m.photographer_id))];
    const { data: users } = await supabase.from('users').select('id, name').in('id', userIds);
    const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));

    // Get Dealerships
    const dealerIds = mappings.map(m => m.dealership_id);
    const { data: dealerships } = await supabase.from('dealerships').select('id, name').in('id', dealerIds);
    const dealerMap = Object.fromEntries(dealerships.map(d => [d.id, d.name]));

    console.log('\nCurrent Assignments:');
    mappings.forEach(m => {
        console.log(`${dealerMap[m.dealership_id]} => ${userMap[m.photographer_id]}`);
    });
}
check();
