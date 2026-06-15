const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables (URL or SERVICE KEY)');
    process.exit(1);
}

// USE SERVICE KEY TO BYPASS RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    console.log('--- ADMIN DIAGNOSTIC ---');

    // 1. Check all tables in public schema
    const { data: tables, error: tableError } = await supabase
        .from('deliveries')
        .select('id, delivery_name, received_amount, customer_phone, rapido_charge', { count: 'exact' })
        .limit(5);

    if (tableError) {
        console.error('Deliveries Table Error:', tableError);
    } else {
        console.log('Total deliveries found (with service key):', tables?.length);
        console.log('Deliveries sample:', JSON.stringify(tables, null, 2));
    }

    // 2. Try to search for the specific one again
    const { data: specific } = await supabase
        .from('deliveries')
        .select('*')
        .ilike('delivery_name', '%Bharat Toyota%')
        .limit(5);

    console.log('Deliveries matching "Bharat Toyota":', JSON.stringify(specific, null, 2));
}

check();
