const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fullDump() {
    try {
        const { data: dealerships } = await supabase.from('dealerships').select('id, name');
        const { data: mappings } = await supabase.from('mappings').select('*');
        const { data: clusters } = await supabase.from('clusters').select('id, name');

        console.log('--- ALL DEALERSHIPS ---');
        dealerships.forEach(d => console.log(`ID: ${d.id} | Name: ${d.name}`));

        console.log('\n--- ALL MAPPINGS ---');
        mappings.forEach(m => {
            const d = dealerships.find(x => x.id === m.dealership_id);
            const c = clusters.find(x => x.id === m.cluster_id);
            console.log(`Dealer: ${d?.name || m.dealership_id} | Type: ${m.mapping_type} | Cluster: ${c?.name || m.cluster_id}`);
        });

    } catch (err) {
        console.error(err);
    }
}

fullDump();
