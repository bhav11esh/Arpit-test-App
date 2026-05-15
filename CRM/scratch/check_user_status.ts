
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
    const email = 'sahiltamang@gmail.com';
    console.log(`Checking user: ${email}`);

    // 1. Check Auth
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    const authUser = users.find(u => u.email === email);
    
    if (authError) {
        console.error('Auth error:', authError);
    } else if (authUser) {
        console.log(`Auth User found: ID=${authUser.id}`);
    } else {
        console.log('Auth User NOT found');
    }

    // 2. Check DB
    const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (dbError) {
        console.error('DB error:', dbError.message);
    } else if (dbUser) {
        console.log(`DB User found: ID=${dbUser.id}, Email=${dbUser.email}, Name=${dbUser.name}, Role=${dbUser.role}, Active=${dbUser.active}`);
    } else {
        console.log('DB User NOT found');
    }
}

checkUser();
