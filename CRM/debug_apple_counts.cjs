const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function debugCounts() {
    console.log('--- Debugging Total Counts for Apple Auto ---');

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 1. Exact Match
    const { count: exactCount } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .eq('showroom_code', 'APPLE_AUTO_VOLKSWAGEN');

    console.log(`Exact Match (APPLE_AUTO_VOLKSWAGEN): ${exactCount}`);

    // 2. Contains Apple/Volks
    const { data: looseMatches } = await supabase
        .from('deliveries')
        .select('showroom_code, delivery_name')
        .or('delivery_name.ilike.%APPLE%,delivery_name.ilike.%VOLKS%')
        .gt('created_at', oneDayAgo);

    console.log(`Loose Matches (Last 24h): ${looseMatches.length}`);

    // Group by showroom_code
    const counts = {};
    looseMatches.forEach(d => {
        counts[d.showroom_code] = (counts[d.showroom_code] || 0) + 1;
    });

    console.table(counts);

    // 3. Check for failed imports (maybe duplicates?)
    // Note: The script stops importing if it hits duplicates or errors?
    // User says "only limited records".
}

debugCounts();
