import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
    console.log('Checking database schema for deliveries table...');

    // Try to select the specific columns
    const { data, error } = await supabase
        .from('deliveries')
        .select('id, received_amount, customer_phone, rapido_charge')
        .limit(1);

    if (error) {
        console.error('Schema Error:', error.message);
        if (error.hint) console.error('Hint:', error.hint);
        if (error.details) console.error('Details:', error.details);
    } else {
        console.log('Success! Columns exist.');
        console.log('Sample data:', data);
    }

    // Also check screenshots table constraint if possible (though we can't easily check constraints via JS client easily)
}

checkSchema();
