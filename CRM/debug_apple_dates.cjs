const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function debugDates() {
    console.log('--- Debugging Date Formats for Apple Auto ---');

    const { data: deliveries, error } = await supabase
        .from('deliveries')
        .select('id, date, created_at')
        .eq('showroom_code', 'APPLE_AUTO_VOLKSWAGEN')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error:', error);
        return;
    }

    // Check date format YYYY-MM-DD
    const regex = /^\d{4}-\d{2}-\d{2}$/;

    let validCount = 0;
    let invalidCount = 0;
    const invalidExamples = [];

    deliveries.forEach(d => {
        if (regex.test(d.date)) {
            validCount++;
        } else {
            invalidCount++;
            if (invalidExamples.length < 5) invalidExamples.push(d);
        }
    });

    console.log(`Total: ${deliveries.length}`);
    console.log(`Valid Dates (YYYY-MM-DD): ${validCount}`);
    console.log(`Invalid Dates: ${invalidCount}`);

    if (invalidExamples.length > 0) {
        console.log('Invalid Examples:', invalidExamples);
    }

    // Also check for duplicates in IDs?
    const ids = new Set(deliveries.map(d => d.id));
    console.log(`Unique IDs: ${ids.size}`);
}

debugDates();
