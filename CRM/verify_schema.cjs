const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
    const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns in deliveries table:', Object.keys(data[0]));
        console.log('Has reel_link:', Object.keys(data[0]).includes('reel_link'));
    } else {
        console.log('No data found in deliveries table to inspect schema.');
    }
}

checkSchema();
