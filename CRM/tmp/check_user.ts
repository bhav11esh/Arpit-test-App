
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser(name: string) {
    console.log(`Checking user: ${name}`);

    const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .ilike('name', `%${name}%`);

    if (userError) {
        console.error('User Error:', userError);
        return;
    }

    console.log('--- Users Table ---');
    console.table(users);

    if (users && users.length > 0) {
        const userIds = users.map(u => u.id);
        
        const { data: mappings, error: mappingError } = await supabase
            .from('mappings')
            .select('*')
            .in('photographerId', userIds);
            
        if (mappingError) {
            console.error('Mapping Error:', mappingError);
        } else {
            console.log('--- Mappings Table ---');
            console.table(mappings);
        }
    }
}

const userName = process.argv[2] || "Manu Edayan";
checkUser(userName);
