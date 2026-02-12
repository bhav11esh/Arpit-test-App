
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function deletePPSMahindra() {
    console.log('--- PURGING PPS MAHINDRA DATA ---');

    // Target Name Pattern based on previous finding
    const NAME_PATTERN = '%PPS_MAHINDRA%';
    // ID found earlier: 11d27b2a-8d82-4b86-9ac5-b0ab77b02f2c
    const DEALERSHIP_ID = '11d27b2a-8d82-4b86-9ac5-b0ab77b02f2c';

    // 1. Count before delete
    // Check mappings
    const { data: mappings } = await supabase.from('mappings').select('id').eq('dealership_id', DEALERSHIP_ID);
    const codes = mappings && mappings.length > 0 ? mappings.map(m => m.id) : [DEALERSHIP_ID];

    console.log(`Checking codes: ${codes.join(', ')}`);

    const { count: countByCode } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .in('showroom_code', codes);

    const { count: countByName } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .ilike('delivery_name', NAME_PATTERN);

    console.log(`Existing Records:`);
    console.log(`- By showroom_code: ${countByCode}`);
    console.log(`- By delivery_name pattern (${NAME_PATTERN}): ${countByName}`);

    // 2. Delete by showroom_code
    if (countByCode > 0) {
        const { error: delCodeErr, count: deletedCode } = await supabase
            .from('deliveries')
            .delete({ count: 'exact' })
            .in('showroom_code', codes);
        console.log(`Deleted ${deletedCode} records by showroom_code.`);
    }

    // 3. Delete remaining by name pattern
    if (countByName > 0) {
        const { error: delNameErr, count: deletedName } = await supabase
            .from('deliveries')
            .delete({ count: 'exact' })
            .ilike('delivery_name', NAME_PATTERN);
        console.log(`Deleted ${deletedName} records by name pattern.`);
    }

    console.log('\n--- DELETION COMPLETE ---');
}

deletePPSMahindra();
