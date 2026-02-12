
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkAndPurgePPSSkodaFull() {
    console.log('--- FINAL PURGE FOR PPS SKODA (RE-RUN) ---');

    // Broader patterns to catch everything user might have imported
    const PATTERNS = ['%PPS_SKODA%', '%SKODA_PPS%', '%PPS SKODA%', '%SKODA PPS%'];

    for (const pattern of PATTERNS) {
        // 1. Check current count
        const { count: initialCount } = await supabase
            .from('deliveries')
            .select('*', { count: 'exact', head: true })
            .ilike('delivery_name', pattern);

        console.log(`Initial Count for ${pattern}: ${initialCount}`);

        if (initialCount > 0) {
            // 2. Delete
            const { error, count: deleted } = await supabase
                .from('deliveries')
                .delete({ count: 'exact' })
                .ilike('delivery_name', pattern);

            if (error) console.error(`Deletion Error for ${pattern}:`, error);
            else console.log(`Deleted ${deleted} records for ${pattern}.`);
        }
    }

    // final verify
    console.log('\n--- VERIFICATION ---');
    let totalLeft = 0;
    for (const pattern of PATTERNS) {
        const { count: finalCount } = await supabase
            .from('deliveries')
            .select('*', { count: 'exact', head: true })
            .ilike('delivery_name', pattern);

        console.log(`Final Count for ${pattern}: ${finalCount}`);
        totalLeft += finalCount;
    }
    console.log(`Total Remaining: ${totalLeft}`);
}

checkAndPurgePPSSkodaFull();
