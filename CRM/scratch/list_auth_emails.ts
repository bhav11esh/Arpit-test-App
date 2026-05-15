
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function listAll() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) console.error(error);
    users.forEach(u => console.log(`- ${u.email}`));
}
listAll();
