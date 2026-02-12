
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function purgeAppleFinal() {
    console.log('--- PURGE APPLE AUTO VOLKSWAGEN ---');

    // We found the code is 'APPLE_AUTO_VOLKSWAGEN'
    const CODES = ['APPLE_AUTO_VOLKSWAGEN', '4e2d6e16-bb54-4071-9e75-bf55d37d6684'];
    const PATTERNS = ['%Apple%', '%Volkswagen%'];

    // 1. Delete by Showroom Code
    for (const code of CODES) {
        const { count: count } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('showroom_code', code);

        if (count > 0) {
            console.log(`Deleting ${count} records by Showroom Code (${code})...`);
            const { error, count: deleted } = await supabase.from('deliveries').delete({ count: 'exact' }).eq('showroom_code', code);
            if (error) console.error('Error:', error);
            else console.log(`Deleted ${deleted} records.`);
        }
    }

    // 2. Delete by Patterns (Cleanup safe matches)
    // Be careful with '%Volkswagen%' if other dealers exist. 
    // Stick to '%Apple%' or verified pattern from diagnosis.
    // Diagnosis showed '2026-02-08_APPLE_AUTO_VOLKSWAG...'

    const SAFE_PATTERNS = ['%APPLE_AUTO_VOLKSWAG%'];

    for (const pattern of SAFE_PATTERNS) {
        const { count: initialCount } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).ilike('delivery_name', pattern);
        if (initialCount > 0) {
            console.log(`Deleting ${initialCount} records matching '${pattern}'...`);
            const { error, count: deleted } = await supabase.from('deliveries').delete({ count: 'exact' }).ilike('delivery_name', pattern);
            if (error) console.error('Error:', error);
            else console.log(`Deleted ${deleted} records.`);
        }
    }

    console.log('\n--- VERIFICATION ---');
    for (const code of CODES) {
        const { count } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('showroom_code', code);
        console.log(`Final Count by Code '${code}': ${count}`);
    }
}

purgeAppleFinal();
