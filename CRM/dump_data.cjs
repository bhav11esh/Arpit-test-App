const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    try {
        const { data: clusters } = await supabase.from('clusters').select('*');
        const { data: dealerships } = await supabase.from('dealerships').select('*');
        const { data: mappings } = await supabase.from('mappings').select('*');
        const { data: profiles } = await supabase.from('profiles').select('*');

        const result = {
            clusters,
            dealerships,
            mappings,
            profiles
        };

        fs.writeFileSync('all_data_dump.json', JSON.stringify(result, null, 2));
        console.log('SUCCESS: Data dumped to all_data_dump.json');
    } catch (err) {
        fs.writeFileSync('error.txt', err.message);
    }
}

check();
