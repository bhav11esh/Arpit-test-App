
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkShowrooms() {
    const today = '2026-02-08';

    const { data: cluster } = await supabase.from('clusters').select('id').ilike('name', '%Whitefield%').single();
    const { data: mappings } = await supabase.from('mappings').select('dealership_id').eq('cluster_id', cluster.id);
    const dealerIds = [...new Set(mappings.map(m => m.dealership_id))];
    const { data: dealerships } = await supabase.from('dealerships').select('name').in('id', dealerIds);
    const { data: logs } = await supabase.from('log_events').select('target_id').eq('type', 'SHOWROOM_FINALIZED').gte('created_at', `${today}T00:00:00Z`);

    const finalized = new Set(logs.map(l => l.target_id));

    console.log("FINAL_RESULTS_START");
    dealerships.forEach(d => {
        const code = d.name.match(/\(([^)]+)\)/)?.[1] || d.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        console.log(`${finalized.has(code) ? 'LOGGED' : 'PENDING'}|${d.name}`);
    });
    console.log("FINAL_RESULTS_END");
}

checkShowrooms();
