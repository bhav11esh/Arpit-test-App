
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey!);

async function debugRole() {
    const { data: users } = await supabase
        .from('users')
        .select('name, role')
        .ilike('name', '%Manu%');

    console.log('--- Role Debugging ---');
    users?.forEach(u => {
        console.log(`- '${u.name}': '${u.role}' [${Array.from(u.role).map(c => c.charCodeAt(0)).join(',')}]`);
    });
}

debugRole();
