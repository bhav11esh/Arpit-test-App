const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkUser() {
    console.log('--- Checking User ID ---');
    const email = 'arpitmudgal24@gmail.com';

    // Check in Auth users (cant access directly via client usually, but service role can?)
    // Actually, check in public.users table first
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (user) {
        console.log(`User Found in public.users:`);
        console.log(`ID: ${user.id}`);
        console.log(`Name: ${user.name}`);
        console.log(`Role: ${user.role}`);
    } else {
        console.log('User not found in public.users');
        console.log(error);

        // Try auth.users via admin api
        const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
        const authUser = users.find(u => u.email === email);
        if (authUser) {
            console.log(`User Found in auth.users: ${authUser.id}`);
        }
    }
}

checkUser();
