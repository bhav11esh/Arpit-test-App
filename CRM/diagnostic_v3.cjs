const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    console.log('--- START DIAGNOSTIC ---');

    const results = {};

    try {
        // 1. Check Deliveries Columns
        const cols = ['received_amount', 'customer_phone', 'rapido_charge'];
        results.deliveries = {};
        for (const col of cols) {
            const { error } = await supabase.from('deliveries').select(col).limit(1);
            if (error) {
                results.deliveries[col] = { status: 'MISSING', error: error.message };
            } else {
                results.deliveries[col] = { status: 'EXISTS' };
            }
        }

        // 2. Check a random select to see what columns ARE there
        const { data, error: colError } = await supabase.from('deliveries').select('*').limit(1);
        if (colError) {
            results.all_columns = { error: colError.message };
        } else if (data && data.length > 0) {
            results.all_columns = Object.keys(data[0]);
        } else {
            results.all_columns = 'NO_DATA';
        }

    } catch (err) {
        results.fatal_error = err.message;
    }

    console.log(JSON.stringify(results, null, 2));
    console.log('--- END DIAGNOSTIC ---');
}

check();
