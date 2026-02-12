const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMappings() {
    try {
        const { data: dealerships } = await supabase.from('dealerships').select('id, name');
        const { data: profiles } = await supabase.from('profiles').select('id, name');
        const { data: mappings } = await supabase.from('mappings').select('*');
        const { data: leaves } = await supabase.from('leaves').select('*').eq('date', '2026-02-08');

        const targets = dealerships.filter(d => d.name.includes('PPS Mahindra') || d.name.includes('Khivraj Triumph'));

        console.log('--- MAPPING ANALYSIS ---');
        for (const d of targets) {
            console.log(`\nShowroom: ${d.name}`);
            const dMappings = mappings.filter(m => m.dealership_id === d.id);

            const primary = dMappings.find(m => m.mapping_type === 'PRIMARY');
            const secondaries = dMappings.filter(m => m.mapping_type === 'SECONDARY');

            if (primary) {
                const pUser = profiles.find(u => u.id === primary.photographer_id);
                const isOnLeave = leaves.some(l => l.photographer_id === primary.photographer_id);
                console.log(`Primary Assignment: ${pUser?.name || 'Unknown'} (${isOnLeave ? 'ON LEAVE' : 'WORKING'})`);
            } else {
                console.log('Primary Assignment: NONE (Orphaned)');
            }

            console.log('Secondary Assignments:');
            secondaries.forEach(s => {
                const sUser = profiles.find(u => u.id === s.photographer_id);
                console.log(` - ${sUser?.name || 'Unknown'}`);
            });
        }

    } catch (err) {
        console.error(err);
    }
}

checkMappings();
