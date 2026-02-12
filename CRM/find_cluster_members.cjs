const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findClusterMembers() {
    try {
        // 1. Find Mallikarjun's ID
        const { data: users } = await supabase.from('profiles').select('id, name').ilike('name', '%Mallikarjun%');
        if (!users || users.length === 0) return console.log('Mallikarjun not found');
        const mId = users[0].id;

        // 2. Find his cluster
        const { data: mMappings } = await supabase.from('dealership_photographer_mappings').select('clusterId').eq('photographerId', mId).limit(1);
        if (!mMappings || mMappings.length === 0) return console.log('Mallikarjun has no cluster mappings');
        const clusterId = mMappings[0].clusterId;

        // 3. Find cluster name
        const { data: cluster } = await supabase.from('clusters').select('name').eq('id', clusterId).single();
        console.log(`\nCluster: ${cluster?.name || clusterId}`);

        // 4. Find all members
        const { data: allMappings } = await supabase.from('dealership_photographer_mappings').select('photographerId').eq('clusterId', clusterId);
        const uniqueIds = [...new Set(allMappings.map(x => x.photographerId))];

        const { data: members } = await supabase.from('profiles').select('name').in('id', uniqueIds);
        console.log(`\nPhotographers in this cluster who should see prompts (because Mallikarjun is on leave):`);
        members.forEach(p => console.log(` - ${p.name}`));

    } catch (err) {
        console.error('Failed:', err);
    }
}

findClusterMembers();
