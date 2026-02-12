const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function revertYear() {
    console.log('--- Reverting Apple Auto Year to 2025 ---');

    // 1. Fetch all 2024 records
    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('showroom_code', 'APPLE_AUTO_VOLKSWAGEN')
        .gte('date', '2024-01-01')
        .lte('date', '2024-12-31');

    if (error) { console.error(error); return; }

    console.log(`Found ${deliveries.length} records in 2024.`);

    let updatedCount = 0;
    for (const d of deliveries) {
        // d.date is "2024-08-18"
        // Replace 2024 with 2025
        const newDate = d.date.replace('2024', '2025');
        const { error: updateError } = await supabase
            .from('deliveries')
            .update({ date: newDate })
            .eq('id', d.id);

        if (!updateError) updatedCount++;
        else console.error(`Failed to update ${d.id}:`, updateError.message);
    }

    console.log(`Successfully reverted ${updatedCount} records to 2025.`);
}

revertYear();
