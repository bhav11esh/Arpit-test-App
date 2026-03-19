const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
    console.log('--- DATABASE SCHEMA DIAGNOSTIC ---');

    // 1. Check Deliveries Table
    console.log('\n[1/2] Checking "deliveries" table columns...');
    const { data: delData, error: delError } = await supabase
        .from('deliveries')
        .select('*')
        .limit(1);

    if (delError) {
        console.error('Deliveries Table Error:', delError.message);
    } else if (delData && delData.length >= 0) {
        const columns = Object.keys(delData[0] || {});
        console.log('Available columns:', columns.join(', '));

        const required = ['received_amount', 'customer_phone', 'rapido_charge'];
        required.forEach(col => {
            if (columns.includes(col)) {
                console.log(`✅ Column "${col}": EXISTS`);
            } else {
                console.log(`❌ Column "${col}": MISSING`);
            }
        });
    }

    // 2. Check Screenshots Table for RAPIDO type
    console.log('\n[2/2] Checking "screenshots" table for "RAPIDO" type...');
    // We can't check constraints directly, but we can try to insert a dummy (and then delete it or just catch the error)
    // Or just check if the type is allowed in a select if there are any
    const { data: screenData, error: screenError } = await supabase
        .from('screenshots')
        .select('type')
        .limit(10);

    if (screenError) {
        console.error('Screenshots Table Error:', screenError.message);
    } else {
        const types = new Set((screenData || []).map(s => s.type));
        console.log('Existing screenshot types in DB:', Array.from(types).join(', '));
    }
}

checkSchema();
