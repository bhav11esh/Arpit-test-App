const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDebug() {
    try {
        const today = '2026-02-08';

        // 1. Get Users
        const { data: users } = await supabase.from('profiles').select('id, name').order('name');
        console.log('--- USERS ---');
        users?.filter(u => /Aman|Mallikarjun|Sahith/i.test(u.name)).forEach(u => console.log(`${u.name}: ${u.id}`));

        // 2. Get Leaves for Today
        const { data: leaves } = await supabase.from('leaves').select('*').eq('date', today);
        console.log(`\n--- LEAVES TODAY (${today}) ---`);
        if (leaves && leaves.length > 0) {
            leaves.forEach(l => {
                const userName = users?.find(u => u.id === l.photographer_id)?.name || l.photographer_id;
                console.log(`- ${userName} (${l.half}): Applied by ${l.applied_by}`);
            });
        } else {
            console.log('No leaves found for today.');
        }

        // 3. Delivery Stats
        const { data: dealerships } = await supabase.from('dealerships').select('id, name');
        const { data: deliveries } = await supabase.from('deliveries').select('showroom_code').eq('date', today);

        const loggedCodes = new Set(deliveries?.map(d => d.showroom_code) || []);
        const pendingShowrooms = dealerships?.filter(d => {
            const code = d.name.match(/\(([^)]+)\)/)?.[1] || d.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || d.id;
            return !loggedCodes.has(code);
        }) || [];

        console.log(`\n--- DELIVERY STATS ---`);
        console.log(`Pending Showrooms: ${pendingShowrooms.length} of ${dealerships?.length || 0}`);
        console.log('Pending List:');
        pendingShowrooms.slice(0, 5).forEach(s => console.log(`- ${s.name}`));
        if (pendingShowrooms.length > 5) console.log(`... and ${pendingShowrooms.length - 5} more`);

    } catch (err) {
        console.error('Debug failed:', err);
    }
}

runDebug();
