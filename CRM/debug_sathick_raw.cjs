const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function debugSathickNames() {
    console.log('--- Debugging Sathick Name Origins ---');

    const sathickId = '4247126e-71f1-4472-98a0-544219a597b9';

    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('delivery_name')
        .eq('showroom_code', 'APPLE_AUTO_VOLKSWAGEN')
        .eq('assigned_user_id', sathickId);

    if (error) { console.error(error); return; }

    const rawNames = {};
    deliveries.forEach(d => {
        // Extract the part between DEALERSHIP and IMPORT/Index
        // Format: DATE_DEALERSHIP_RAWNAME_INDEX_IMPORT
        // Example: 2025-11-29_APPLE_AUTO_VOLKSWAGEN_SATHICK_198_IMPORT

        const parts = d.delivery_name.split('_');
        // Find "APPLE" "AUTO" "VOLKSWAGEN"
        // The raw name is after Volkswagen.
        // But Volkswagen might be split?
        // Let's just look for known patterns

        // Match suffix
        let raw = 'UNKNOWN';
        if (d.delivery_name.includes('_SATHICK_')) raw = 'SATHICK';
        else if (d.delivery_name.includes('_S_')) raw = 'S';
        else if (d.delivery_name.includes('_SA_')) raw = 'SA';
        else {
            // fallback extraction
            const match = d.delivery_name.match(/VOLKSWAGEN_(.*)_\d+_IMPORT/);
            if (match) raw = match[1];
        }

        rawNames[raw] = (rawNames[raw] || 0) + 1;
    });

    console.log('Raw Name Distribution for Sathick Assignments:', rawNames);
}

debugSathickNames();
