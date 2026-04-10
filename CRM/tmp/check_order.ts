
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey!);

async function checkOrder() {
    const { data: users } = await supabase
        .from('users')
        .select('name, role, active, city')
        .eq('active', true)
        .eq('role', 'PHOTOGRAPHER')
        .order('name', { ascending: true });

    console.log('--- Active Photographers (Ordered) ---');
    console.table(users);
}

checkOrder();
