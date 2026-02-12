const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function identifyUsers() {
    console.log('--- Identifying Users ---');

    // 1. Identify the heavy hitter
    const targetId = '6c1d0f86-9cf4-4028-9e96-2919800f5190';
    const { data: user1, error: e1 } = await supabase
        .from('users')
        .select('*')
        .eq('id', targetId)
        .single();

    if (user1) console.log(`ID ${targetId} is: "${user1.name}" (${user1.role})`);
    else console.log(`ID ${targetId} NOT FOUND in public.users`);

    // 2. Search for Mallikarjun
    const { data: mallikarjuns, error: e2 } = await supabase
        .from('users')
        .select('*')
        .ilike('name', '%Mallikarjun%');

    console.log(`\nFound ${mallikarjuns?.length || 0} users named "Mallikarjun":`);
    mallikarjuns?.forEach(u => {
        console.log(`- ${u.name} (ID: ${u.id}, Role: ${u.role})`);
    });

    // 3. Check Assignments count for each Mallikarjun in Apple Auto
    if (mallikarjuns) {
        for (const m of mallikarjuns) {
            const { count } = await supabase
                .from('deliveries')
                .select('*', { count: 'exact', head: true })
                .eq('showroom_code', 'APPLE_AUTO_VOLKSWAGEN')
                .eq('assigned_user_id', m.id);
            console.log(`  -> Assigned in Apple Auto: ${count}`);
        }
    }
}

identifyUsers();
