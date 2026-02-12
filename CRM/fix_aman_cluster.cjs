const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function fixAmanCluster() {
    console.log('--- 🔧 FIXING AMAN CLUSTER ---');

    // 1. Get Aman
    const { data: users } = await supabase
        .from('users')
        .select('*')
        .ilike('name', '%Aman%');

    if (!users || !users.length) {
        console.error('❌ Aman not found');
        return;
    }
    const aman = users[0];
    console.log(`Current Cluster: ${aman.cluster_code}`);

    // 2. Update to 'Whitefield-Indiranagar'
    const { data, error } = await supabase
        .from('users')
        .update({ cluster_code: 'Whitefield-Indiranagar' })
        .eq('id', aman.id)
        .select();

    if (error) {
        console.error('❌ Update failed:', error);
    } else {
        console.log('✅ Update successful:', data[0].cluster_code);
    }
}

fixAmanCluster();
