const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function resolveCluster() {
    try {
        // 1. Get all base data
        const { data: dealerships } = await supabase.from('dealerships').select('*');
        const { data: profiles } = await supabase.from('profiles').select('*');
        const { data: mappings } = await supabase.from('dealership_photographer_mappings').select('*');
        const { data: clusters } = await supabase.from('clusters').select('*');

        console.log(`Total Dealerships: ${dealerships.length}`);
        dealerships.forEach(d => console.log(` - ${d.name}`));

        // 2. Find Mallikarjun's ID
        const mUser = profiles.find(p => p.name.includes('Mallikarjun'));
        if (!mUser) return console.log('Mallikarjun profile not found');
        console.log(`\nMallikarjun ID: ${mUser.id}`);

        // 3. Find Mallikarjun's cluster assignments
        const mMappings = mappings.filter(m => m.photographer_id === mUser.id);
        const clusterIds = [...new Set(mMappings.map(m => m.cluster_id))];

        for (const cId of clusterIds) {
            const cluster = clusters.find(c => c.id === cId);
            console.log(`\nCluster: ${cluster?.name || cId}`);

            const membersMappings = mappings.filter(m => m.cluster_id === cId);
            const memberIds = [...new Set(membersMappings.map(m => m.photographer_id))];
            const memberUsers = profiles.filter(p => memberIds.includes(p.id));

            console.log('Photographers in this cluster:');
            memberUsers.forEach(u => console.log(` - ${u.name} (${u.email})`));

            const showroomsInCluster = dealerships.filter(d => {
                const mapping = mappings.find(m => m.dealership_id === d.id && m.cluster_id === cId);
                return !!mapping;
            });
            console.log('Showrooms in this cluster:');
            showroomsInCluster.forEach(s => console.log(` - ${s.name}`));
        }

    } catch (err) {
        console.error(err);
    }
}

resolveCluster();
