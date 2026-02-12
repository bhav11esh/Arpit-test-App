const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runReport() {
    try {
        const { data: m } = await supabase.from('mappings').select('*, dealerships(name), profiles(name), clusters(name)');

        console.log('--- ALL MAPPINGS ---');
        m.forEach(x => {
            console.log(`[${x.clusters?.name || 'No Cluster'}] ${x.dealerships?.name}: ${x.profiles?.name} (${x.mapping_type})`);
        });

    } catch (err) {
        console.error(err);
    }
}

runReport();
