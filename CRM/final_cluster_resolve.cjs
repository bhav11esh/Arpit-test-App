const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function finalResolve() {
    try {
        const { data: d } = await supabase.from('dealerships').select('*');
        const { data: m } = await supabase.from('mappings').select('*');
        const { data: p } = await supabase.from('profiles').select('*');
        const { data: c } = await supabase.from('clusters').select('*');

        const mUser = p.find(x => x.name.includes('Mallikarjun'));
        if (!mUser) return console.log('Mallikarjun not found');

        const pps = d.find(x => x.name.includes('PPS Mahindra'));
        const ppsMapping = m.find(x => x.dealership_id === pps.id);
        const cluster = c.find(x => x.id === ppsMapping.cluster_id);

        console.log(`\nShowroom: PPS Mahindra / Khivraj Triumph`);
        console.log(`Cluster: ${cluster?.name}`);
        console.log(`Primary Assignment: ${mUser.name}`);

        const clusterMembersIds = [...new Set(m.filter(x => x.cluster_id === cluster.id).map(x => x.photographer_id))];
        const clusterMembers = p.filter(x => clusterMembersIds.includes(x.id));

        console.log(`\nPhotographers in this cluster (Who should see prompts because Primary is on leave):`);
        clusterMembers.forEach(u => {
            if (u.id !== mUser.id) {
                console.log(` - ${u.name} (${u.email})`);
            }
        });

    } catch (err) {
        console.error(err);
    }
}

finalResolve();
