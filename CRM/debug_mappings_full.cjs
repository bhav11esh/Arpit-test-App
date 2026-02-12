const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMappings() {
    try {
        const { data: dealerships } = await supabase.from('dealerships').select('id, name');
        const { data: profiles } = await supabase.from('profiles').select('id, name, email');
        const { data: mappings } = await supabase.from('mappings').select('*');
        const { data: clusters } = await supabase.from('clusters').select('id, name');
        const { data: leaves } = await supabase.from('leaves').select('*').eq('date', '2026-02-08');

        const targetNames = ['PPS Mahindra', 'Khivraj Triumph'];
        const targets = dealerships.filter(d => targetNames.some(name => d.name.includes(name)));

        console.log('--- DETAILED MAPPING REPORT ---');
        for (const d of targets) {
            console.log(`\nDealership: ${d.name} (${d.id})`);
            const dMappings = mappings.filter(m => m.dealership_id === d.id);

            if (dMappings.length === 0) {
                console.log(' - NO MAPPINGS FOUND AT ALL');
                continue;
            }

            for (const m of dMappings) {
                const user = profiles.find(p => p.id === m.photographer_id);
                const cluster = clusters.find(c => c.id === m.cluster_id);
                const isOnLeave = leaves.some(l => l.photographer_id === m.photographer_id);
                console.log(` - Photographer: ${user?.name} (${m.mapping_type}) | Cluster: ${cluster?.name} | Status: ${isOnLeave ? 'ON LEAVE' : 'WORKING'}`);
            }
        }

    } catch (err) {
        console.error(err);
    }
}

checkMappings();
