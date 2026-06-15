import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

async function check() {
    console.log('Verifying Triumph Popular dealership sync URL...');
    try {
        const { data, error } = await supabase
            .from('dealerships')
            .select('name, google_sync_url')
            .eq('name', 'Triumph Popular')
            .single();

        if (error) {
            console.error('Database error:', error);
        } else {
            console.log('Verification Result:', JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error('Fetch caught error:', e);
    }
}

check();
