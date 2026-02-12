const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch'); // You might need to install this or use built-in fetch if node 18+
const fs = require('fs');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function fetchRawSheet() {
    console.log('--- Debugging Raw Sheet Data ---');

    // 1. Get Dealership & Sheet ID
    // First get mapping to find dealership_id
    const { data: mapping, error: mErr } = await supabase
        .from('mappings')
        .select('dealership_id')
        .eq('id', 'APPLE_AUTO_VOLKSWAGEN')
        .single();

    if (mErr || !mapping) { console.error('Mapping not found:', mErr); return; }

    const { data: dealership, error: dErr } = await supabase
        .from('dealerships')
        .select('google_sheet_id, name')
        .eq('id', mapping.dealership_id)
        .single();

    if (dErr || !dealership) { console.error('Dealership not found:', dErr); return; }

    if (!dealership.google_sheet_id) {
        console.error(`No Google Sheet ID for ${dealership.name}`);
        return;
    }

    console.log(`Fetching from Sheet: ${dealership.name} (ID: ...${dealership.google_sheet_id.substr(-5)})`);
    console.log(`URL: ${process.env.VITE_GOOGLE_SYNC_URL}`);

    // 2. Fetch Data
    try {
        const response = await fetch(process.env.VITE_GOOGLE_SYNC_URL, {
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
            console.log(`Row ${i + 1}: Date="${r['Date']}", Photographer="${r['Photographer']}"`);
        });

    } catch (e) {
        console.error('Fetch failed:', e);
    }
}

fetchRawSheet();
