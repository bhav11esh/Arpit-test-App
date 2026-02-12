
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkStatus() {
    const today = '2026-02-08';
    console.log(`--- Status Report for ${today} ---`);

    // 1. Get Cluster
    const { data: cluster } = await supabase.from('clusters').select('id, name').ilike('name', '%Whitefield%').single();
    console.log(`Cluster: ${cluster.name}`);

    // 2. Get All User Names
    const { data: users } = await supabase.from('users').select('id, name');
    const userMap = new Map(users.map(u => [u.id, u.name]));

    // 3. Get All Primary Mappings in this Cluster
    const { data: mappings } = await supabase
        .from('mappings')
        .select('dealership_id, photographer_id')
        .eq('cluster_id', cluster.id)
        .eq('mapping_type', 'PRIMARY');

    console.log('\n--- Primary Mappings ---');
    for (const m of mappings) {
        const { data: d } = await supabase.from('dealerships').select('name').eq('id', m.dealership_id).single();
        const photographer = userMap.get(m.photographer_id) || 'Unknown';
        console.log(`${d.name.padEnd(30)} -> ${photographer}`);
    }

    // 4. Get All Leaves for Today
    const { data: leaves } = await supabase
        .from('leaves')
        .select('photographer_id, half')
        .eq('date', today);

    console.log('\n--- Leaves Today ---');
    if (leaves.length === 0) {
        console.log('No one is on leave today.');
    } else {
        // Group by photographer
        const grouped = leaves.reduce((acc, l) => {
            const name = userMap.get(l.photographer_id) || 'Unknown';
            if (!acc[name]) acc[name] = [];
            acc[name].push(l.half);
            return acc;
        }, {});

        for (const [name, halves] of Object.entries(grouped)) {
            console.log(`${name.padEnd(20)}: ${halves.join(', ')}`);
        }
    }
}

checkStatus().catch(console.error);
