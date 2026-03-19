const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    console.log('--- REEL TASKS SCHEMA CHECK ---');

    const { data, error } = await supabase
        .from('reel_tasks')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching reel_tasks:', error);

        // Check if table exists by trying to list columns (hacky select)
        const { error: existError } = await supabase.from('reel_tasks').select('id').limit(1);
        console.log('Table exists check error:', existError);
    } else {
        console.log('Reel Tasks successfully fetched.');
        if (data && data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
        } else {
            console.log('No data in reel_tasks, but table seems to exist.');
        }
    }
}

check();
