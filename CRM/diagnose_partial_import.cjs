
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function diagnosePartial() {
    console.log('--- DIAGNOSING PARTIAL IMPORT (SKODA KARR) ---');

    // Search by pattern as ID search returned 0
    const { data: records, error } = await supabase
        .from('deliveries')
        .select('date, delivery_name')
        .ilike('delivery_name', '%Karr%')
        .order('date', { ascending: true });

    if (error) { console.error('Supabase Error:', error); return; }

    console.log(`Found ${records?.length} records.`);

    if (!records || records.length === 0) {
        console.log("No records found.");
        return;
    }

    console.log(`First Record Date: ${records[0].date}`);
    console.log(`Last Record Date: ${records[records.length - 1].date}`);

    console.log('All Dates in DB:');
    records.forEach((r, i) => console.log(`${i + 1}. ${r.date}`));
}

diagnosePartial();
