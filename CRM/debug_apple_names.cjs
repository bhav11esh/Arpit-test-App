const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function debugUserNames() {
    const ids = [
        '6c1d0f86-9cf4-4028-9e96-2919800f5190', // 180 assignments
        '0222038c-4753-4f84-8e7d-5abf93c58fb3', // from earlier log
        '4247126e-71f1-4472-98a0-544219a597b9',
        'cdcef715-35f3-41ba-b3e3-4fb76dc15953',
        'ad1989ea-1c4b-4861-a068-15a122e2ce2d'  // check just in case
    ];

    console.log('--- Resolving User Names ---');
    const { data: users, error } = await supabase
        .from('users')
        .select('id, name')
        .in('id', ids);

    if (error) console.error(error);
    else console.table(users);
}

debugUserNames();
