const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSahith() {
    const email = 'Sahithundru@gmail.com';
    console.log(`Updating cluster_code for: ${email}`);

    const { data, error } = await supabase
        .from('users')
        .update({ cluster_code: 'Whitefield-Indiranagar' })
        .eq('email', email) // Note: email casing might matter, assuming strict match or trying both
        .select();

    if (error) {
        console.error('Error updating user:', error);
    } else {
        console.log('User updated successfully:', data);
    }
}

fixSahith();
