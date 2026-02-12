
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data: users } = await supabase.from('users').select('id, name');
    const uMap = Object.fromEntries(users.map(u => [u.id, u.name]));

    const { data: mappings } = await supabase.from('mappings').select('dealership_id, photographer_id').eq('cluster_id', '66cc64bd-77f1-4384-9388-7fec926ccc41').eq('mapping_type', 'PRIMARY');
    console.log('--- MAPPINGS ---');
    for (const m of mappings) {
        const { data: d } = await supabase.from('dealerships').select('name').eq('id', m.dealership_id).single();
        console.log(`${d.name}: ${uMap[m.photographer_id]}`);
    }

    const { data: leaves } = await supabase.from('leaves').select('photographer_id, half').eq('date', '2026-02-08');
    console.log('--- LEAVES ---');
    leaves.forEach(l => console.log(`${uMap[l.photographer_id]}: ${l.half}`));
}
check();
