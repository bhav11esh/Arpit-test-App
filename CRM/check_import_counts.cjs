const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkImportCounts() {
    console.log('--- Checking Import Counts (Last 24 Hours) ---');

    // Get deliveries created in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('showroom_code')
        .gt('created_at', oneDayAgo);

    if (error) return console.error('Error:', error);

    // Group by showroom_code
    const counts = {};
    deliveries.forEach(d => {
        counts[d.showroom_code] = (counts[d.showroom_code] || 0) + 1;
    });

    // Resolve Names
    console.log('\n--- Counts by Showroom ---');
    for (const [code, count] of Object.entries(counts)) {
        // Try to find mapping to get dealership name
        // The showroom_code MIGHT be a UUID (mapping_id) OR a string code

        let name = code;

        // 1. Try as Mapping ID
        const { data: mapping } = await supabase.from('mappings').select('dealership_id').eq('id', code).single();

        if (mapping) {
            const { data: dealership } = await supabase.from('dealerships').select('name').eq('id', mapping.dealership_id).single();
            if (dealership) name = `${dealership.name} (Mapping ID)`;
        } else {
            // 2. Try as Dealership ID directly (if code was saved as dealership id)
            const { data: dealership } = await supabase.from('dealerships').select('name').eq('id', code).single();
            if (dealership) name = `${dealership.name} (Dealership ID)`;
        }

        console.log(`[${count}] records -> ${name} (${code})`);
    }
}

checkImportCounts();
