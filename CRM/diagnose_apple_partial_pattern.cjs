
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function diagnoseApplePartialPattern() {
    console.log('--- DIAGNOSING PARTIAL IMPORT (APPLE AUTO - PATTERN SEARCH) ---');

    const { data: records, error } = await supabase
        .from('deliveries')
        .select('date, delivery_name, showroom_code')
        .ilike('delivery_name', '%Apple%')
        .order('date', { ascending: true });

    if (error) { console.error('Supabase Error:', error); return; }

    const codes = {};
    records.forEach(r => {
        codes[r.showroom_code] = (codes[r.showroom_code] || 0) + 1;
    });

    // Print ONLY the distribution first to ensure it's seen
    console.log('DISTRIBUTION:');
    console.log(JSON.stringify(codes, null, 2));

    // Sort keys by count to find the batch of approx 252 (or large batch)
    const sortedCodes = Object.keys(codes).sort((a, b) => codes[b] - codes[a]);
    if (sortedCodes.length > 0) {
        const mainCode = sortedCodes[0];
        console.log(`\nAnalyzing Records for Code: ${mainCode} (Count: ${codes[mainCode]})`);

        const mainRecords = records.filter(r => r.showroom_code === mainCode);
        console.log(`First Record Date: ${mainRecords[0].date}`);
        console.log(`Last Record Date: ${mainRecords[mainRecords.length - 1].date}`);

        console.log('--- Last 10 Records of this Batch ---');
        const last10 = mainRecords.slice(-10);
        last10.forEach((r, i) => console.log(`${mainRecords.length - 10 + i + 1}. ${r.date} | ${r.delivery_name}`));
    }
}

diagnoseApplePartialPattern();
