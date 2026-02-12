const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function debug() {
    console.log('--- Debugging Filters & User Assignment ---');

    // 1. Check Dealership Names vs Codes
    const { data: dealerships } = await supabase.from('dealerships').select('*').or('name.ilike.%Bimal%,name.ilike.%Volk%');

    console.log('\n[1] Dealership Code Generation Logic Test:');
    dealerships.forEach(d => {
        const viewScreenCode = d.name.match(/\(([^)]+)\)/)?.[1] ||
            d.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        console.log(`\nName: "${d.name}"`);
        console.log(`ID:   ${d.id}`);
        console.log(`ViewScreen Expects: "${viewScreenCode}"`);
    });

    // 2. Check Database Codes
    const { data: deliveries } = await supabase
        .from('deliveries')
        .select('showroom_code')
        .or('delivery_name.ilike.%BIMAL%,delivery_name.ilike.%VOLK%')
        .limit(5);

    if (deliveries.length > 0) {
        console.log(`\nActual DB Code Example: "${deliveries[0].showroom_code}"`);
    }

    // 3. User Assignment Logic Test
    console.log('\n[2] User Assignment Logic Test:');
    const { data: users } = await supabase.from('users').select('id, name, role').eq('active', true).eq('role', 'PHOTOGRAPHER');

    const testInputs = ['', ' ', 'Abhigyan', 'abhigyan'];

    console.log(`Total Photographers: ${users.length}`);
    console.log('First 3 Photographers:', users.slice(0, 3).map(u => u.name));

    testInputs.forEach(input => {
        const photographerName = String(input || '').trim();
        const match = users.find(p =>
            p.name.toLowerCase() === photographerName.toLowerCase() ||
            p.name.toLowerCase().startsWith(photographerName.toLowerCase()) ||
            photographerName.toLowerCase().startsWith(p.name.toLowerCase())
        );
        console.log(`Input: "${input}" -> Match: ${match ? match.name : 'null'}`);
    });
}

debug();
