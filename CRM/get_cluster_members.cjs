const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function dumpCluster() {
    const { data: d } = await supabase.from('dealerships').select('id, name').ilike('name', '%PPS Mahindra%');
    if (!d || d.length === 0) return console.log('Dealership not found');

    const { data: m } = await supabase.from('dealership_photographer_mappings').select('cluster_id').eq('dealership_id', d[0].id).single();
    if (!m) return console.log('Mapping not found');

    console.log('Cluster ID:', m.cluster_id);

    const { data: clusterMappings } = await supabase.from('dealership_photographer_mappings').select('photographer_id').eq('cluster_id', m.cluster_id);
    const ids = [...new Set(clusterMappings.map(x => x.photographer_id))];

    const { data: members } = await supabase.from('profiles').select('name').in('id', ids);
    console.log('Recipients for PPS Mahindra & Khivraj Triumph (since Mallikarjun is on leave):');
    members.forEach(p => console.log(' - ' + p.name));
}

dumpCluster();
