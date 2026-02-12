const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUser() {
    const email = 'sahithundru@gmail.com';
    console.log(`Checking user: ${email}`);

    // 1. Get User from DB
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (error) {
        console.error('Error fetching user from DB:', error);
    } else {
        console.log('DB User Record:', user);
    }

    // 2. Check Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    const authUser = authData.users.find(u => u.email === email);

    if (authUser) {
        console.log('Auth User Found:', { id: authUser.id, email: authUser.email });
        if (user && user.id !== authUser.id) {
            console.error('MISMATCH: DB ID (' + user.id + ') does not match Auth ID (' + authUser.id + ')');
        } else {
            console.log('IDs Match.');
        }
    } else {
        console.log('Auth User NOT found.');
    }
}

checkUser();
