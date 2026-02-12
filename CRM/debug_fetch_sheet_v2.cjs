const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function fetchRawSheet() {
    console.log('--- Debugging Raw Sheet Data V2 ---');

    // 1. Get Dealership directly by name
    const { data: dealership, error: dErr } = await supabase
        .from('dealerships')
        .select('google_sheet_id, name')
        .ilike('name', '%Apple Auto%')
        .single(); // Assuming unique name or we take first

    if (dErr || !dealership) { console.error('Dealership not found:', dErr); return; }

    if (!dealership.google_sheet_id) {
        console.error(`No Google Sheet ID for ${dealership.name}`);
        return;
    }

    const googleSyncUrl = "https://script.google.com/macros/s/AKfycbwtapQ7MAE7RGPRwuqFCzs43jA1UjdyP1S-qn2CmbEMoR7S2wpy3s6dBj-d43OHJqKo/exec";
    console.log(`Fetching from Sheet: ${dealership.name} (ID: ...${dealership.google_sheet_id.substr(-5)})`);
    console.log(`URL: ${googleSyncUrl}`);

    // 2. Fetch Data
    try {
        const response = await fetch(googleSyncUrl, {
            method: 'POST',
            body: JSON.stringify({
                sheetId: dealership.google_sheet_id,
                action: 'read'
            })
        });

        const result = await response.json();

        if (result.status !== 'success') {
            console.error('API Error:', result.message);
            return;
        }

        const rows = result.data;
        console.log(`Received ${rows.length} rows.`);

        // 3. Save to file
        fs.writeFileSync('raw_sheet_dump.json', JSON.stringify(rows, null, 2));
        console.log('Saved raw data to raw_sheet_dump.json');

        // 4. Preview first 5 dates
        console.log('First 5 Dates in Raw Data:');
        rows.slice(0, 5).forEach((r, i) => {
            console.log(`Row ${i + 1}: Date="${r['Date']}"`);
        });

    } catch (e) {
        console.error('Fetch failed:', e);
    }
}

fetchRawSheet();
