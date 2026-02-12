const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClusterMappings() {
    try {
        const { data: clusters } = await supabase.from('clusters').select('*').ilike('name', '%Whitefield%');
        if (!clusters || clusters.length === 0) return console.log('Cluster not found');

        const clusterId = clusters[0].id;
        console.log(`Cluster: ${clusters[0].name} (${clusterId})`);

        const { data: mappings } = await supabase
            .from('mappings')
            .select('*, dealerships(name), profiles(name)')
            .eq('cluster_id', clusterId);

        console.log('\nMappings in this cluster:');
        mappings.forEach(m => {
            console.log(`- ${m.dealerships?.name}: ${m.mapping_type} | Photographer: ${m.profiles?.name || 'NONE'}`);
        });

    } catch (err) {
        console.error(err);
    }
}

checkClusterMappings();
