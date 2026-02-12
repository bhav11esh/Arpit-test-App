
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkAppleMapping() {
    console.log('--- CHECKING APPLE AUTO MAPPING ---');

    // Apple Auto ID: 4e2d6e16-bb54-4071-9e75-bf55d37d6684
    const DEALERSHIP_ID = '4e2d6e16-bb54-4071-9e75-bf55d37d6684';
    const MAPPING_ID = '00fae552-c7c0-42cc-870f-b277ec92e533';

    // Check Mapping entry
    const { data: mapping } = await supabase.from('mappings').select('*').eq('id', MAPPING_ID).single();
    console.log('Mapping Entry:', mapping);

    if (mapping) {
        // Check if Cluster exists
        if (mapping.cluster_id) {
            const { data: cluster } = await supabase.from('clusters').select('*').eq('id', mapping.cluster_id).single();
            console.log('Cluster:', cluster);
        } else {
            console.log('Mapping has NO cluster_id.');
        }
    } else {
        console.log('Mapping ID explicitly NOT FOUND in mappings table?');
        // Check finding by dealership again
        const { data: m2 } = await supabase.from('mappings').select('*').eq('dealership_id', DEALERSHIP_ID);
        console.log('Mappings found by Dealership ID:', m2);
    }
}

checkAppleMapping();
