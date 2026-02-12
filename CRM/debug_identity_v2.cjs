const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function debugIdentityV2() {
    console.log('--- Identitfying Users & Clusters ---');

    const ids = [
        '6c1d0f86-9cf4-4028-9e96-2919800f5190', // 180 (Akhil?)
        'bc268775-f79f-4400-b10b-bea4ba1dc762', // 56 (Mallikarjun?)
        '8f053ed2-788b-4fa9-99f5-88ac1f4c85af', // 31 (Unknown)
        '4247126e-71f1-4472-98a0-544219a597b9'  // 1 (Sathick?)
    ];

    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, role, cluster_id')
        .in('id', ids);

    if (error) { console.error(error); return; }

    console.table(users);
}

debugIdentityV2();
