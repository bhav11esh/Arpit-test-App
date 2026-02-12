
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkPPSSkoda() {
    console.log('--- CHECKING PPS SKODA ---');

    // TPS Skoda ID from previous logs
    const ID = '7e38ff33-3db5-4f10-85ee-798355973816';

    // Check Dealership Name to be sure
    const { data: d } = await supabase.from('dealerships').select('name').eq('id', ID).single();
    console.log(`Target: ${d?.name} (${ID})`);

    // Check mappings
    const { data: mappings } = await supabase.from('mappings').select('id').eq('dealership_id', ID);
    const codes = mappings && mappings.length > 0 ? mappings.map(m => m.id) : [ID];

    console.log(`Checking codes: ${codes.join(', ')}`);

    const { count: countByCode } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .in('showroom_code', codes);

    // Check by name pattern just in case
    const NAME_PATTERN = '%PPS_SKODA%'; /// Assuming standard naming convention I used if I imported it before
    const { count: countByName } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .ilike('delivery_name', NAME_PATTERN);

    console.log(`Existing Records:`);
    console.log(`- By showroom_code: ${countByCode}`);
    console.log(`- By delivery_name pattern (${NAME_PATTERN}): ${countByName}`);
}

checkPPSSkoda();
