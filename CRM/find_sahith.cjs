const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findSahith() {
    console.log('Searching for Sahith...');

    // Search by partial email
    const { data: byEmail, error: emailError } = await supabase
        .from('users')
        .select('id, email, name, role, cluster_code')
        .ilike('email', '%sahith%');

    if (byEmail && byEmail.length > 0) {
        console.log('Found by Email:', byEmail);
    } else {
        console.log('Not found by email.');
    }

    // Search by partial name
    const { data: byName, error: nameError } = await supabase
        .from('users')
        .select('id, email, name, role, cluster_code')
        .ilike('name', '%sahith%');

    if (byName && byName.length > 0) {
        console.log('Found by Name:', byName);
    } else {
        console.log('Not found by name.');
    }
}

findSahith();
