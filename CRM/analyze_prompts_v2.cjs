const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    try {
        const today = '2026-02-08';
        console.log('Target Date:', today);

        // Fetch everything independently
        const { data: dealerships } = await supabase.from('dealerships').select('id, name');
        const { data: profiles } = await supabase.from('profiles').select('id, name, email');
        const { data: mappings } = await supabase.from('dealership_photographer_mappings').select('*');
        const { data: clusters } = await supabase.from('clusters').select('*');
        const { data: leaves } = await supabase.from('leaves').select('*').eq('date', today);

        const targetDealerships = dealerships.filter(d =>
            d.name.includes('PPS Mahindra') || d.name.includes('Khivraj Triumph')
        );

        for (const d of targetDealerships) {
            console.log(`\n--- ${d.name} ---`);
            const mapping = mappings.find(m => m.dealership_id === d.id);
            const cluster = clusters.find(c => c.id === mapping?.cluster_id);
            console.log('Cluster:', cluster?.name);

            const primaryMapping = mappings.find(m => m.dealership_id === d.id && m.mapping_type === 'PRIMARY');
            const primary = profiles.find(p => p.id === primaryMapping?.photographer_id);

            if (primary) {
                const leave = leaves.some(l => l.photographer_id === primary.id);
                console.log(`Primary: ${primary.name} (${leave ? 'ON LEAVE' : 'WORKING'})`);

                if (leave) {
                    console.log('Result: Prompt goes to ALL cluster members (Failover active)');
                } else {
                    console.log(`Result: Prompt goes ONLY to ${primary.name} (Primary is Working)`);
                }
            } else {
                console.log('Primary: UNASSIGNED (Orphaned)');
                console.log('Result: Prompt goes to ALL cluster members');
            }
        }
    } catch (e) {
        console.error(e);
    }
}

run();
