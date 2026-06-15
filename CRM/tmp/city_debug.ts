
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey!);

async function checkCities() {
    const { data: users } = await supabase
        .from('users')
        .select('name, city');

    console.log('--- City Debugging ---');
    users?.forEach(u => {
        if (u.city) {
            console.log(`- '${u.name}': '${u.city}' (length: ${u.city.length}) [${Array.from(u.city).map(c => c.charCodeAt(0)).join(',')}]`);
        } else {
            console.log(`- '${u.name}': NULL`);
        }
    });
}

checkCities();
