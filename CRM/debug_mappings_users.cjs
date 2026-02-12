const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPhotographerMappings() {
    try {
        const { data: users } = await supabase.from('profiles').select('id, name').or('name.ilike.%Aman%,name.ilike.%Mallikarjun%');
        console.log('--- USERS ---');
        users.forEach(u => console.log(`${u.name}: ${u.id}`));

        const ids = users.map(u => u.id);
        const { data: mappings } = await supabase.from('mappings').select('*, dealerships(name), clusters(name)').in('photographer_id', ids);

        console.log('\n--- MAPPINGS FOR THESE USERS ---');
        console.log(JSON.stringify(mappings, null, 2));

    } catch (err) {
        console.error(err);
    }
}

checkPhotographerMappings();
