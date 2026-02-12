
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUser(email) {
    console.log(`Checking user: ${email}`);
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error listing users:', error);
        return;
    }

    const user = users.find(u => u.email === email);
    if (user) {
        console.log('--- USER FOUND IN AUTH ---');
        console.log(`ID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Email confirmed: ${!!user.email_confirmed_at}`);
        console.log(`Last sign in: ${user.last_sign_in_at}`);
        console.log(`Metadata:`, user.user_metadata);
    } else {
        console.log('--- USER NOT FOUND IN AUTH ---');
    }

    // Also check public.users table
    const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (dbError) {
        if (dbError.code === 'PGRST116') {
            console.log('--- USER NOT FOUND IN public.users TABLE ---');
        } else {
            console.error('Error checking public.users table:', dbError);
        }
    } else {
        console.log('--- USER FOUND IN public.users TABLE ---');
        console.log(`ID: ${dbUser.id}`);
        console.log(`Name: ${dbUser.name}`);
        console.log(`Role: ${dbUser.role}`);
    }
}

const emailToCheck = process.argv[2] || 'aka246966@gmail.com';
checkUser(emailToCheck);
