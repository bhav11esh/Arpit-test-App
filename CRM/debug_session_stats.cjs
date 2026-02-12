const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findUsersAndStats() {
    // 1. Find the photographers
    const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('id, name, email');

    console.log('All Registered Users:');
    users.forEach(u => {
        if (u.name.includes('Aman') || u.name.includes('Mallikarjun') || u.name.includes('Sahith')) {
            console.log(`- ${u.name} (${u.id}) [${u.email}]`);
        }
    });

    const today = '2026-02-08';

    // 2. Count dealerships and deliveries
    const { data: dealerships } = await supabase.from('dealerships').select('id, name');
    const { data: deliveries } = await supabase.from('deliveries').select('showroom_code').eq('date', today);

    const loggedShowroomCodes = new Set(deliveries.map(d => d.showroom_code));

    // Helper to match dealership name to code (since codes aren't explicitly in dealerships table but derived in UI)
    const pendingShowrooms = dealerships.filter(dealership => {
        const nameBasedCode = dealership.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        const showroomCode = dealership.name.match(/\(([^)]+)\)/)?.[1] || nameBasedCode || dealership.id;
        return !loggedShowroomCodes.has(showroomCode);
    });

    console.log(`\nDelivery Stats for ${today}:`);
    console.log(`- Total Showrooms: ${dealerships.length}`);
    console.log(`- Logged Showrooms: ${loggedShowroomCodes.size}`);
    console.log(`- Pending Showrooms: ${pendingShowrooms.length}`);
    console.log('\nPending Showroom List:');
    pendingShowrooms.forEach(s => console.log(`  - ${s.name}`));
}

findUsersAndStats();
