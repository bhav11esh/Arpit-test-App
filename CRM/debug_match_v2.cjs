const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function debugMatchV2() {
    console.log('--- Debugging Missing Matches V2 ---');

    // 1. Load Raw Sheet Data
    const rawData = JSON.parse(fs.readFileSync('raw_sheet_dump.json', 'utf8'));

    // Rows identified as missing in previous step:
    // Row 26 (index 25)
    // Row 37 (index 36)

    // Let's verify indexes (User "Row 26" might be 1-indexed header + data)
    // Script output "Row 26 (approx)" was likely index + 2.
    // So target index 24. Let's check a range.

    const targets = [24, 25, 35, 36];

    console.log('Target Rows from Sheet:');
    targets.forEach(i => {
        const r = rawData[i];
        if (r) console.log(`Index ${i}: Date="${r['Date']}", Link="${r['Footage Link']}"`);
    });

    // 2. Fetch specific dates from DB to see why they didn't match
    const dates = ["2025-07-27", "2025-08-14"]; // Normalized guess

    const { data: dbData, error } = await supabase
        .from('deliveries')
        .select('id, date, footage_link, reel_link, delivery_name')
        .eq('showroom_code', 'APPLE_AUTO_VOLKSWAGEN')
        .in('date', dates);

    if (error) { console.error('DB Error:', error); return; }

    console.log('\nPotential DB Matches:');
    dbData.forEach(d => {
        console.log(`DB ID: ${d.id}, Date: ${d.date}, Name: ${d.delivery_name}`);
        console.log(`   Link: ${d.footage_link}`);
    });
}

debugMatchV2();
