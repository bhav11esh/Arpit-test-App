
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function deleteRoyalEnfield() {
    console.log('--- PURGING ROYAL ENFIELD DATA ---');

    // 1. Find All Royal Enfield Dealerships
    const { data: dealerships, error: dError } = await supabase
        .from('dealerships')
        .select('id, name')
        .ilike('name', '%Royal Enfield%');

    if (dError || dealerships.length === 0) {
        console.error('No Royal Enfield dealerships found:', dError);
        return;
    }

    console.log(`Found ${dealerships.length} dealerships to purge:`);
    dealerships.forEach(d => console.log(`- ${d.name} (${d.id})`));

    for (const dealership of dealerships) {
        console.log(`\nProcessing ${dealership.name}...`);

        // 2. Count before delete
        const { count: countByCode } = await supabase
            .from('deliveries')
            .select('*', { count: 'exact', head: true })
            .eq('showroom_code', dealership.id);

        // Check by name pattern (e.g., specific to this dealership if name is unique enough, or broad catch)
        // Using dealership name in delivery_name is safer
        const namePattern = `%${dealership.name.replace(/\s+/g, '_').toUpperCase()}%`;
        const { count: countByName } = await supabase
            .from('deliveries')
            .select('*', { count: 'exact', head: true })
            .ilike('delivery_name', namePattern);

        console.log(`Existing Records:`);
        console.log(`- By showroom_code (${dealership.id}): ${countByCode}`);
        console.log(`- By delivery_name pattern (${namePattern}): ${countByName}`);

        // 3. Delete by showroom_code
        if (countByCode > 0) {
            const { error: delCodeErr, count: deletedCode } = await supabase
                .from('deliveries')
                .delete({ count: 'exact' })
                .eq('showroom_code', dealership.id);

            if (delCodeErr) console.error('Error deleting by code:', delCodeErr);
            else console.log(`Deleted ${deletedCode} records by showroom_code.`);
        }

        // 4. Delete remaining by unique name pattern
        if (countByName > 0) {
            const { error: delNameErr, count: deletedName } = await supabase
                .from('deliveries')
                .delete({ count: 'exact' })
                .ilike('delivery_name', namePattern);

            if (delNameErr) console.error('Error deleting by name pattern:', delNameErr);
            else console.log(`Deleted ${deletedName} records by name pattern.`);
        }
    }

    console.log('\n--- DELETION COMPLETE ---');
}

deleteRoyalEnfield();
