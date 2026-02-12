
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function verifyFinal() {
    console.log('--- FINAL VERIFICATION ---');

    // 1. Pavan Hyundai
    const { count: pavanCount } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .ilike('delivery_name', '%Pavan%');
    console.log(`Pavan Hyundai Records: ${pavanCount}`);

    // 2. Royal Enfield
    const { data: dealerships } = await supabase
        .from('dealerships')
        .select('*')
        .ilike('name', '%Royal Enfield%');

    console.log(`\nRoyal Enfield Dealerships found: ${dealerships.length}`);

    let totalRE = 0;
    for (const d of dealerships) {
        // Get mappings to find correct showroom_code
        const { data: mappings } = await supabase.from('mappings').select('id').eq('dealership_id', d.id);
        const showroomCodes = mappings && mappings.length > 0 ? mappings.map(m => m.id) : [d.id];

        const { count } = await supabase
            .from('deliveries')
            .select('*', { count: 'exact', head: true })
            .in('showroom_code', showroomCodes);

        console.log(`- ${d.name} (Codes: ${showroomCodes.join(', ')}): ${count}`);
        totalRE += count;
    }
    console.log(`Total Royal Enfield (by Showroom Code): ${totalRE}`);

    // Check by name pattern for RE to be sure (handle underscores)
    const { count: reNameCount } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .ilike('delivery_name', '%ROYAL_ENFIELD%');
    console.log(`Royal Enfield by Name Pattern (%ROYAL_ENFIELD%): ${reNameCount}`);

    // 3. Skoda Karr
    const { data: skodaDealerships } = await supabase
        .from('dealerships')
        .select('*')
        .ilike('name', '%Skoda%');

    console.log(`\nSkoda Dealerships found: ${skodaDealerships.length}`);

    let totalSkoda = 0;
    for (const d of skodaDealerships) {
        const { data: mappings } = await supabase.from('mappings').select('id').eq('dealership_id', d.id);
        const showroomCodes = mappings && mappings.length > 0 ? mappings.map(m => m.id) : [d.id];

        const { count } = await supabase
            .from('deliveries')
            .select('*', { count: 'exact', head: true })
            .in('showroom_code', showroomCodes);

        console.log(`- ${d.name} (Codes: ${showroomCodes.join(', ')}): ${count}`);
        totalSkoda += count;
    }
    console.log(`Total Skoda (by Showroom Code): ${totalSkoda}`);
}

verifyFinal();
