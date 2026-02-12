const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkAman() {
    console.log('Checking for user "Aman"...');
    // 1. Find Aman
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .ilike('name', '%Aman%');

    if (userError) {
        console.error('Error fetching users:', userError);
        return;
    }

    if (!users || users.length === 0) {
        console.log('No user found matching "Aman"');
        return;
    }

    const aman = users[0];
    console.log('Found User:', aman);

    // 2. Fetch deliveries for 2026-02-05
    console.log('\nFetching deliveries for 2026-02-05...');
    const { data: deliveries, error: delError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('date', '2026-02-05');

    if (delError) {
        console.error('Error fetching deliveries:', delError);
        return;
    }

    console.log(`Found ${deliveries.length} total deliveries for 2026-02-05.`);

    // 3. Filter for Aman
    const assignedToAman = deliveries.filter(d => d.assigned_user_id === aman.id);
    console.log(`\nDeliveries assigned to Aman (${assignedToAman.length}):`);
    assignedToAman.forEach(d => {
        console.log(`- [${d.id}] ${d.delivery_name} | Status: ${d.status} | Timing: ${d.timing}`);
    });

    // 4. Check Unassigned in his cluster
    const unassignedInCluster = deliveries.filter(d =>
        d.status === 'UNASSIGNED' && d.cluster_code === aman.cluster_code
    );
    console.log(`\nUnassigned deliveries in Aman's cluster (${aman.cluster_code}): ${unassignedInCluster.length}`);
    unassignedInCluster.forEach(d => {
        console.log(`- [${d.id}] ${d.delivery_name} | Timing: ${d.timing}`);
    });

}

checkAman();
