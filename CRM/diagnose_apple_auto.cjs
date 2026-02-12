
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function diagnoseAppleAuto() {
    console.log('--- DIAGNOSING APPLE AUTO ---');

    // Find Dealership
    const { data: d } = await supabase
        .from('dealerships')
        .select('*')
        .ilike('name', '%Apple%')
        .single();

    if (!d) { console.log('Dealership not found'); return; }

    console.log(`Dealership: ${d.name}`);
    console.log(`ID: ${d.id}`);
    console.log(`Sheet ID: ${d.google_sheet_id}`);

    if (!d.google_sheet_id) {
        console.log('CRITICAL: No Google Sheet ID configured!');
        return;
    }

    // Try to fetch from Google Sheet to see if it works
    const SYNC_URL = process.env.VITE_GOOGLE_SYNC_URL || "https://script.google.com/macros/s/AKfycbwtapQ7MAE7RGPRwuqFCzs43jA1UjdyP1S-qn2CmbEMoR7S2wpy3s6dBj-d43OHJqKo/exec";

    try {
        console.log('Testing Google Sheet Connection...');
        const response = await fetch(SYNC_URL, {
            method: 'POST',
            body: JSON.stringify({ sheetId: d.google_sheet_id, action: 'read' })
        });
        const result = await response.json();

        if (result.status !== 'success') {
            console.error('API Error:', result.message);
        } else {
            console.log(`API Success. Received ${result.data.length} rows.`);
            if (result.data.length > 0) {
                console.log('Sample Row Keys:', Object.keys(result.data[0]));
            }
        }
    } catch (e) {
        console.error('Fetch failed:', e);
    }
}

diagnoseAppleAuto();
