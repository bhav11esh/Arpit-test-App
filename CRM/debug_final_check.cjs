const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function finalCheck() {
    const today = '2026-02-08';

    // 1. Get All Dealerships
    const { data: dealerships } = await supabase.from('dealerships').select('id, name');

    // 2. Get Deliveries for Today
    const { data: deliveries } = await supabase.from('deliveries').select('showroom_code, status').eq('date', today);

    const loggedCodes = new Set(deliveries.map(d => d.showroom_code));
    const pending = dealerships.filter(d => {
        const code = d.name.match(/\(([^)]+)\)/)?.[1] || d.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || d.id;
        return !loggedCodes.has(code);
    });

    console.log(`\n--- PENDING SHOWROOMS (${today}) ---`);
    console.log(`Count: ${pending.length}`);
    pending.forEach(p => console.log(`- ${p.name}`));

    // 3. Get ALL Leaves Today with user names
    const { data: profiles } = await supabase.from('profiles').select('id, name');
    const { data: leaves } = await supabase.from('leaves').select('*').eq('date', today);

    console.log(`\n--- ALL LEAVES TODAY (${today}) ---`);
    leaves.forEach(l => {
        const name = profiles.find(p => p.id === l.photographer_id)?.name || 'Unknown';
        console.log(`- ${name} [${l.photographer_id}]: ${l.half}`);
    });
}

finalCheck();
