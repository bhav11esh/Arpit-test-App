const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function fixImportCodes() {
    console.log('--- Fixing Imported Showroom Codes ---');

    // 1. Get all deliveries from last 24 hours that might be affected
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Fetch distinct showroom_codes that look like UUIDs (simple regex check for length and hyphens)
    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('showroom_code')
        .gt('created_at', oneDayAgo);

    if (error) return console.error('Error fetching deliveries:', error);

    const distinctCodes = [...new Set(deliveries.map(d => d.showroom_code))];
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const badCodes = distinctCodes.filter(code => uuidPattern.test(code));

    console.log(`Found ${badCodes.length} potentially incorrect UUID codes:`, badCodes);

    for (const badCode of badCodes) {
        // Try to resolve what this UUID actually is (Mapping ID or Dealership ID)

        let correctCode = null;
        let dealershipName = 'Unknown';

        // Check if it's a Mapping ID
        const { data: mapping } = await supabase.from('mappings').select('*').eq('id', badCode).single();

        if (mapping) {
            const { data: dealership } = await supabase.from('dealerships').select('name').eq('id', mapping.dealership_id).single();
            if (dealership) {
                dealershipName = dealership.name;
            }
        }

        if (dealershipName === 'Unknown') {
            // Check if it's a Dealership ID
            const { data: dealership } = await supabase.from('dealerships').select('name').eq('id', badCode).single();
            if (dealership) {
                dealershipName = dealership.name;
            }
        }

        if (dealershipName !== 'Unknown') {
            // Derive the correct code formatting logic matching DealershipsConfigScreen/ViewScreen
            correctCode = dealershipName.match(/\(([^)]+)\)/)?.[1] ||
                dealershipName.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

            console.log(`Mapping UUID ${badCode} -> Dealership "${dealershipName}" -> Correct Code "${correctCode}"`);

            if (correctCode) {
                // UPDATE
                const { error: updateError, count } = await supabase
                    .from('deliveries')
                    .update({ showroom_code: correctCode })
                    .eq('showroom_code', badCode)
                    .select('*', { count: 'exact' });

                if (updateError) {
                    console.error(`Failed to update ${badCode}:`, updateError);
                } else {
                    console.log(`✅ Fixed ${count} records!`);
                }
            }
        } else {
            console.warn(`Could not resolve UUID ${badCode} to a dealership name.`);
        }
    }
}

fixImportCodes();
