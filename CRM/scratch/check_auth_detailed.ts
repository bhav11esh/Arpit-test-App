
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkAuth() {
    const email = 'sahiltamang@gmail.com';
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    console.log('Searching for email:', email);
    const user = users.find(u => u.email === email);
    if (user) {
        console.log('User found in Auth:', user.id);
    } else {
        console.log('User NOT found in Auth list. Total users listed:', users.length);
        // Try searching specifically if possible (Supabase doesn't have a direct search by email in admin auth easily, but let's check metadata)
    }
}
checkAuth();
