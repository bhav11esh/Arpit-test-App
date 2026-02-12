const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function listUsers() {
    console.log('Listing all users...');

    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, role')
        .order('name');

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Found ${users.length} users:`);
    users.forEach(u => {
        console.log(`- ${u.name} | ${u.role} | ${u.id}`);
    });
}

listUsers();
