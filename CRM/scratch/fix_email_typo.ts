
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function fixEmail() {
    const wrongEmail = 'sahiltanang@gmail.com'; // The one in Auth
    const correctEmail = 'sahiltamang@gmail.com'; // The one the user wants

    console.log(`Fixing email typo: ${wrongEmail} -> ${correctEmail}`);

    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const authUser = users.find(u => u.email === wrongEmail);
    if (!authUser) {
        console.log('User with wrong email NOT found in Auth. Maybe already fixed?');
        return;
    }

    console.log(`Found User ID: ${authUser.id}. Updating email...`);

    const { data, error } = await supabase.auth.admin.updateUserById(authUser.id, {
        email: correctEmail,
        email_confirm: true // Ensure it stays confirmed
    });

    if (error) {
        console.error('Error updating email:', error);
    } else {
        console.log('✅ Email successfully updated in Auth system!');
    }
}

fixEmail();
