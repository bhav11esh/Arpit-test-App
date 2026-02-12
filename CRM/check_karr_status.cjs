
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkKarrStatus() {
    console.log('--- CHECKING SKODA KARR STATUS ---');

    const ID = 'b3034732-d979-4c69-861e-84d3a32adfe4';
    const NAME_PATTERNS = ['%Karr%', '%SKODA_KARR%'];

    // 1. Check by ID
    const { count: countById } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .eq('showroom_code', ID);

    console.log(`Count by Showroom Code (${ID}): ${countById}`);

    // 2. Check by Patterns
    for (const pattern of NAME_PATTERNS) {
        const { count } = await supabase
            .from('deliveries')
            .select('*', { count: 'exact', head: true })
            .ilike('delivery_name', pattern);
        console.log(`Count by Pattern '${pattern}': ${count}`);
    }
}

checkKarrStatus();
