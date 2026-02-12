const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function fixYear() {
    console.log('--- Fixing Apple Auto Year to 2024 ---');

    // 1. Fetch all 2025 records
    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('showroom_code', 'APPLE_AUTO_VOLKSWAGEN')
        .ilike('date', '2025%');

    if (error) { console.error(error); return; }

    console.log(`Found ${deliveries.length} records in 2025.`);

    let updatedCount = 0;
    for (const d of deliveries) {
        const newDate = d.date.replace('2025', '2024');
        const { error: updateError } = await supabase
            .from('deliveries')
            .update({ date: newDate })
            .eq('id', d.id);

        if (!updateError) updatedCount++;
        else console.error(`Failed to update ${d.id}:`, updateError.message);
    }

    console.log(`Successfully updated ${updatedCount} records to 2024.`);
}

fixYear();
