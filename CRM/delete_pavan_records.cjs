
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function deletePavan() {
    console.log('--- PURGING PAVAN HYUNDAI DATA ---');

    // 1. Find Dealership
    const { data: dealerships, error: dError } = await supabase
        .from('dealerships')
        .select('id, name')
        .ilike('name', '%Pavan%');

    if (dError || dealerships.length === 0) {
        console.error('Pavan Hyundai dealership not found:', dError);
        return;
    }

    const dealership = dealerships[0];
    console.log(`Targeting Dealership: ${dealership.name} (${dealership.id})`);

    // 2. Count before delete
    // Check by showroom_code (which should match dealership.id)
    const { count: countByCode } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .eq('showroom_code', dealership.id);

    // Check by name pattern
    const { count: countByName } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .ilike('delivery_name', '%Pavan%');

    console.log(`\nExisting Records:`);
    console.log(`- By showroom_code (${dealership.id}): ${countByCode}`);
    console.log(`- By delivery_name (%Pavan%): ${countByName}`);

    // 3. Delete by showroom_code
    if (countByCode > 0) {
        const { error: delCodeErr, count: deletedCode } = await supabase
            .from('deliveries')
            .delete({ count: 'exact' })
            .eq('showroom_code', dealership.id);

        if (delCodeErr) console.error('Error deleting by code:', delCodeErr);
        else console.log(`Deleted ${deletedCode} records by showroom_code.`);
    }

    // 4. Delete remaining by name (cleanup)
    if (countByName > 0) {
        const { error: delNameErr, count: deletedName } = await supabase
            .from('deliveries')
            .delete({ count: 'exact' })
            .ilike('delivery_name', '%Pavan%');

        if (delNameErr) console.error('Error deleting by name:', delNameErr);
        else console.log(`Deleted ${deletedName} records by delivery_name pattern.`);
    }

    console.log('\n--- DELETION COMPLETE ---');
}

deletePavan();
