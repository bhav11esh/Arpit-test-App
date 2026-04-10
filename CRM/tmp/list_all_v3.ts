
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey!);

async function listAll() {
    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, role, active, city')
        .order('name');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${users?.length} users.`);
    users?.forEach(u => {
        console.log(`- ${u.name} (ID: ${u.id}) [${u.role}] active:${u.active} city:${u.city}`);
    });
}

listAll();
