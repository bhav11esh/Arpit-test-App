
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
    console.log('Checking database...');
    const start = Date.now();
    try {
        const { data, error } = await supabase.from('users').select('*');
        const duration = Date.now() - start;

        if (error) {
            console.error('Database error:', error);
        } else {
            console.log(`Found ${data?.length || 0} users in ${duration}ms`);
            data?.forEach(u => console.log(`- ${u.name} (${u.role}, active: ${u.active})`));
        }
    } catch (e) {
        console.error('Fetch caught error:', e);
    }
}

check();
