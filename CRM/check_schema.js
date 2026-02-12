const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    const { data, error } = await supabase.from('live_bookings').select('*').limit(0);
    if (error) {
        console.log('Error:', error.message);
    } else {
        console.log('Table exists. Columns returned:', Object.keys(data[0] || {}).join(', '));

        const { data: cols, error: err2 } = await supabase.from('live_bookings').select('activation_code').limit(0);
        if (err2) {
            console.log('activation_code column status: MISSING (' + err2.message + ')');
        } else {
            console.log('activation_code column status: EXISTS');
        }
    }
}
check();
