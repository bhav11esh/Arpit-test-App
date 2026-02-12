const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findTrueMappings() {
    try {
        // 1. Get the dealerships
        const { data: dealerships } = await supabase
            .from('dealerships')
            .select('id, name');

        const pps = dealerships.find(d => d.name.includes('PPS Mahindra'));
        const khivraj = dealerships.find(d => d.name.includes('Khivraj Triumph'));

        console.log(`PPS Mahindra ID: ${pps?.id}`);
        console.log(`Khivraj Triumph ID: ${khivraj?.id}`);

        // 2. Get mappings for these IDs
        const ids = [];
        if (pps) ids.push(pps.id);
        if (khivraj) ids.push(khivraj.id);

        if (ids.length === 0) return console.log('Showrooms not found in DB');

        const { data: m } = await supabase
            .from('mappings')
            .select('*, profiles(name)')
            .in('dealership_id', ids);

        console.log('Mappings Found:');
        console.log(JSON.stringify(m, null, 2));

    } catch (err) {
        console.error(err);
    }
}

findTrueMappings();
