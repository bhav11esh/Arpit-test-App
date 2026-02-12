const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    try {
        const { data: profiles } = await supabase.from('profiles').select('*').limit(1);
        const { data: dealerships } = await supabase.from('dealerships').select('*').limit(1);
        const { data: mappings } = await supabase.from('mappings').select('*').limit(1);

        console.log('--- PROFILES ---');
        console.log(Object.keys(profiles[0] || {}));
        console.log('--- DEALERSHIPS ---');
        console.log(Object.keys(dealerships[0] || {}));
        console.log('--- MAPPINGS ---');
        console.log(Object.keys(mappings[0] || {}));

    } catch (err) {
        console.error(err);
    }
}

checkSchema();
