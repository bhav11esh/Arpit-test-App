
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function deleteRequestedThree() {
    console.log('--- PURGING DATA FOR REQUESTED 3 DEALERSHIPS ---');

    const targets = [
        { name: 'Pavan Hyundai', pattern: '%Pavan%' },
        { name: 'Skoda Karr', id: 'b3034732-d979-4c69-861e-84d3a32adfe4' }, // Known ID from previous steps
        { name: 'Royal Enfield Teknik', pattern: '%Teknik%' }
    ];

    for (const target of targets) {
        console.log(`\nProcessing ${target.name}...`);

        let showroomCodes = [];

        // 1. Resolve IDs/Showroom Codes
        if (target.id) {
            // Get mappings for this specific ID
            const { data: mappings } = await supabase.from('mappings').select('id').eq('dealership_id', target.id);
            showroomCodes = mappings && mappings.length > 0 ? mappings.map(m => m.id) : [target.id];
        } else {
            // Find by name pattern
            const { data: dealerships } = await supabase.from('dealerships').select('id, name').ilike('name', target.pattern);

            if (!dealerships || dealerships.length === 0) {
                console.log(`- No dealership found matching ${target.pattern}`);
                continue;
            }

            console.log(`- Found ${dealerships.length} matches: ${dealerships.map(d => d.name).join(', ')}`);

            for (const d of dealerships) {
                const { data: mappings } = await supabase.from('mappings').select('id').eq('dealership_id', d.id);
                const codes = mappings && mappings.length > 0 ? mappings.map(m => m.id) : [d.id];
                showroomCodes.push(...codes);
            }
        }

        if (showroomCodes.length === 0) {
            console.log('- No showroom codes to target.');
            continue;
        }

        console.log(`- Targeting Showroom Codes: ${showroomCodes.join(', ')}`);

        // 2. Count before delete (by code)
        const { count: countByCode } = await supabase
            .from('deliveries')
            .select('*', { count: 'exact', head: true })
            .in('showroom_code', showroomCodes);

        console.log(`- Existing Records (by code): ${countByCode}`);

        // 3. Delete by code
        if (countByCode > 0) {
            const { error: delErr, count: deleted } = await supabase
                .from('deliveries')
                .delete({ count: 'exact' })
                .in('showroom_code', showroomCodes);

            if (delErr) console.error(`- Error deleting: ${delErr.message}`);
            else console.log(`- DELETED ${deleted} records.`);
        } else {
            console.log('- Nothing to delete.');
        }

        // 4. Cleanup by Name Pattern (Safety Net)
        // If pattern known, use it to catch any unmapped stragglers (like my previous imports with constructed names)
        let namePattern = target.pattern;
        if (!namePattern && target.name === 'Skoda Karr') namePattern = '%Karr%'; // Infer pattern for Karr

        if (namePattern) {
            // Be careful with broad patterns like %Skoda%, specifically target Karr
            if (target.name === 'Skoda Karr') namePattern = '%SKODA_KARR%';

            const { count: countByName } = await supabase
                .from('deliveries')
                .select('*', { count: 'exact', head: true })
                .ilike('delivery_name', namePattern);

            if (countByName > 0) {
                console.log(`- Found ${countByName} additional records by name pattern ${namePattern}`);
                const { count: deletedName } = await supabase
                    .from('deliveries')
                    .delete({ count: 'exact' })
                    .ilike('delivery_name', namePattern);
                console.log(`- DELETED ${deletedName} records by name pattern.`);
            }
        }
    }

    console.log('\n--- PURGE COMPLETE ---');
}

deleteRequestedThree();
