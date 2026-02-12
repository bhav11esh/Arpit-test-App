
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function purgeKarrFinal() {
    console.log('--- PURGE SKODA KARR (RE-RUN) ---');

    const PATTERNS = ['%Karr%', '%SKODA_KARR%'];
    const ID = 'b3034732-d979-4c69-861e-84d3a32adfe4';

    // 1. Delete by Showroom Code
    const { count: countById } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('showroom_code', ID);

    if (countById > 0) {
        console.log(`Deleting ${countById} records by Showroom Code (${ID})...`);
        const { error, count: deleted } = await supabase.from('deliveries').delete({ count: 'exact' }).eq('showroom_code', ID);
        if (error) console.error('Error:', error);
        else console.log(`Deleted ${deleted} records.`);
    }

    // 2. Delete by Patterns (Cleanup)
    for (const pattern of PATTERNS) {
        const { count: initialCount } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).ilike('delivery_name', pattern);
        if (initialCount > 0) {
            console.log(`Deleting ${initialCount} records matching '${pattern}'...`);
            const { error, count: deleted } = await supabase.from('deliveries').delete({ count: 'exact' }).ilike('delivery_name', pattern);
            if (error) console.error('Error:', error);
            else console.log(`Deleted ${deleted} records.`);
        }
    }

    console.log('\n--- VERIFICATION ---');
    const { count: finalId } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('showroom_code', ID);
    console.log(`Final Count by ID: ${finalId}`);

    for (const pattern of PATTERNS) {
        const { count } = await supabase.from('deliveries').select('*', { count: 'exact', head: true }).ilike('delivery_name', pattern);
        console.log(`Final Count by '${pattern}': ${count}`);
    }
}

purgeKarrFinal();
