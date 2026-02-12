require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkIndices() {
    console.log('--- Checking Indices for Bharat Toyota ---');

    const { data: allDeliveries } = await supabase
        .from('deliveries')
        .select('delivery_name')
        .ilike('delivery_name', '%Bharat%IMPORT%');

    if (!allDeliveries || allDeliveries.length === 0) {
        console.log('No imports found.');
        return;
    }

    const indices = [];
    allDeliveries.forEach(d => {
        // Format: DATE_NAME_INDEX_IMPORT
        // Extract index between last underscore and _IMPORT
        // e.g. ..._102_IMPORT
        const match = d.delivery_name.match(/_(\d+)_IMPORT$/);
        if (match) {
            indices.push(parseInt(match[1], 10));
        }
    });

    indices.sort((a, b) => a - b);

    const maxIndex = indices[indices.length - 1];
    console.log(`Min Index: ${indices[0]}`);
    console.log(`Max Index: ${maxIndex}`);
    console.log(`Total Count: ${indices.length}`);

    const missing = [];
    for (let i = 1; i <= maxIndex; i++) {
        if (!indices.includes(i)) {
            missing.push(i);
        }
    }

    if (missing.length > 0) {
        console.log(`❌ MISSING INDICES (Rows skipped/failed): ${missing.join(', ')}`);
    } else {
        console.log('✅ No gap in indices found (1 to Max).');
    }
}

checkIndices();
