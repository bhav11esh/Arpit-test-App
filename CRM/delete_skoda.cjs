
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function deleteSkoda() {
    console.log('--- PURGING SKODA KARR DATA ---');

    // 1. Find Skoda Dealership
    const { data: dealerships, error: dError } = await supabase
        .from('dealerships')
        .select('id, name')
        .ilike('name', '%Skoda%'); // Assuming PPS Skoda is the one, user said Skoda Karr

    // User said "Skoda Karr", but DB has "PPS Skoda" based on previous log check.
    // Let's be careful. Check verify output from previous step.
    // The previous step output was truncated but showed a dealership ID starting with 7e38...
    // I will use that ID loop or name query again to be safe.

    if (dError || !dealerships || dealerships.length === 0) {
        console.error('Skoda dealership not found:', dError);
        return;
    }

    // Check if any match "Karr" specifically? Or assume the one found is correct.
    // The prompt says "Skoda Karr".
    // I'll filter by name or process all "Skoda" if unsure, but likely it's "PPS Skoda" which is often Karr.
    // Let's just process all found "Skoda" dealerships to be thorough as with RE.

    console.log(`Found ${dealerships.length} dealerships to purge:`);
    dealerships.forEach(d => console.log(`- ${d.name} (${d.id})`));

    for (const dealership of dealerships) {
        console.log(`\nProcessing ${dealership.name}...`);

        // 2. Count before delete
        // Check mappings too
        const { data: mappings } = await supabase.from('mappings').select('id').eq('dealership_id', dealership.id);
        const code = mappings && mappings.length > 0 ? mappings[0].id : dealership.id;

        const { count: countByCode } = await supabase
            .from('deliveries')
            .select('*', { count: 'exact', head: true })
            .eq('showroom_code', code);

        const namePattern = `%${dealership.name.replace(/\s+/g, '_').toUpperCase()}%`;
        const { count: countByName } = await supabase
            .from('deliveries')
            .select('*', { count: 'exact', head: true })
            .ilike('delivery_name', namePattern);

        console.log(`Existing Records:`);
        console.log(`- By showroom_code (${code}): ${countByCode}`);
        console.log(`- By delivery_name pattern (${namePattern}): ${countByName}`);

        // 3. Delete by showroom_code
        if (countByCode > 0) {
            const { error: delCodeErr, count: deletedCode } = await supabase
                .from('deliveries')
                .delete({ count: 'exact' })
                .eq('showroom_code', code);
            console.log(`Deleted ${deletedCode} records by showroom_code.`);
        }

        // 4. Delete remaining by name pattern
        if (countByName > 0) {
            const { error: delNameErr, count: deletedName } = await supabase
                .from('deliveries')
                .delete({ count: 'exact' })
                .ilike('delivery_name', namePattern);
            console.log(`Deleted ${deletedName} records by name pattern.`);
        }
    }

    console.log('\n--- DELETION COMPLETE ---');
}

deleteSkoda();
