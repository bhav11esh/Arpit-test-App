const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function dumpUsers() {
    const { data: users, error } = await supabase
        .from('users')
        .select('id, email, name, role, cluster_code');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('All Users:', JSON.stringify(users, null, 2));
    }
}

dumpUsers();
