
const { createClient } = require('@supabase/supabase-js');
// Native fetch used
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function importPavan() {
    console.log('--- RE-IMPORTING PAVAN HYUNDAI DATA ---');

    const SYNC_URL = "https://script.google.com/macros/s/AKfycbwtapQ7MAE7RGPRwuqFCzs43jA1UjdyP1S-qn2CmbEMoR7S2wpy3s6dBj-d43OHJqKo/exec";
    if (!SYNC_URL) { console.error('Missing VITE_GOOGLE_SYNC_URL'); return; }

    // 1. Get Dealership & Cluster
    const { data: dealerships, error: dError } = await supabase
        .from('dealerships')
        .select('*')
        .ilike('name', '%Pavan%');

    if (dError || dealerships.length === 0) { console.error('Dealership not found'); return; }

    const dealership = dealerships[0];
    const sheetId = dealership.google_sheet_id;
    console.log(`Using Dealership: ${dealership.name} (${dealership.id})`);
    console.log(`Sheet ID: ...${sheetId?.substr(-5)}`);

    if (!sheetId) { console.error('No Sheet ID configured'); return; }

    // 2. Fetch Data
    console.log(`Fetching from Google Cloud Function...`);
    let rows = [];
    try {
        const response = await fetch(SYNC_URL, {
            method: 'POST',
            body: JSON.stringify({ sheetId, action: 'read' })
        });
        const result = await response.json();

        if (result.status !== 'success') { console.error('API Error:', result.message); return; }

        rows = result.data;
        console.log(`Received ${rows.length} rows.`);
        console.log(`Sheet Name: ${result.sheetName || 'Unknown'}`);
    } catch (e) {
        console.error('Fetch failed:', e);
        return;
    }

    // 3. Find Mappings for Showroom/Cluster Codes
    // Pavan Hyundai likely maps directly or needs looking up
    const { data: mappings } = await supabase.from('mappings').select('*').eq('dealership_id', dealership.id);
    let defaultShowroom = mappings?.[0]; // If mappings exist, use first

    // If no mappings, fallback to using dealership ID as code (common pattern for new/unmapped)
    // But usually we need a cluster. Let's try to find cluster for this dealership.
    let clusterCode = 'UNKNOWN';
    let showroomCode = dealership.id;

    if (defaultShowroom) {
        showroomCode = defaultShowroom.id; // Correct code from mapping table
        const { data: clusters } = await supabase.from('clusters').select('name').eq('id', defaultShowroom.cluster_id).single();
        if (clusters) clusterCode = clusters.name;
    } else {
        // Fallback: Check if there's a cluster named 'Pavan' or similar? Or just assign UNKNOWN
        console.warn('No mappings found. Using dealership ID as showroom_code and default UNKNOWN cluster.');
    }

    console.log(`Targeting Showroom Code: ${showroomCode}`);
    console.log(`Targeting Cluster Code: ${clusterCode}`);

    // Pre-fetch photographers for matching
    const { data: photographers } = await supabase.from('users').select('id, name');

    // 4. Parse & Insert
    let imported = 0;
    let skipped = 0;

    const existingNames = new Set(); // Since we wiped, this starts empty, but let's be safe against running twice

    for (const [index, row] of rows.entries()) {
        // Find keys case-insensitively
        const getVal = (k) => {
            const actual = Object.keys(row).find(key => key.trim().toLowerCase() === k.toLowerCase());
            return actual ? row[actual] : null;
        };

        const dateVal = getVal('Date');
        const footageLink = getVal('Footage Link');
        const reelLink = getVal('Reel Link');
        const photographerNameRaw = getVal('Photographer');

        if (!dateVal || dateVal === 'Date' || dateVal === 'Original Dates') continue;

        // Parse Date
        let dateStr = String(dateVal).trim().replace(/_\d+$/, '');
        let finalDate = '';

        // Try DD-MM-YYYY
        const dmy = dateStr.match(/^(\d{1,2})[\s\-\/\.]+(\d{1,2})[\s\-\/\.]+(\d{2,4})/);
        if (dmy) {
            let [_, d, m, y] = dmy;
            if (y.length === 2) y = '20' + y;
            let dNum = parseInt(d);
            let mNum = parseInt(m);
            if (mNum > 12 && dNum <= 12) { [dNum, mNum] = [mNum, dNum]; } // Swap
            finalDate = `${y}-${String(mNum).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
        } else {
            // ISO fallback
            const D = new Date(dateStr);
            if (!isNaN(D)) finalDate = D.toISOString().split('T')[0];
            else continue;
        }

        // Match Photographer
        let photographer = null;
        if (photographerNameRaw) {
            photographer = photographers.find(p =>
                p.name.toLowerCase() === photographerNameRaw.toLowerCase() ||
                p.name.toLowerCase().startsWith(photographerNameRaw.toLowerCase()) ||
                photographerNameRaw.toLowerCase().startsWith(p.name.toLowerCase())
            );
        }

        // Construct Name
        const suffix = photographerNameRaw ? `_${photographerNameRaw.replace(/\s+/g, '_').toUpperCase()}` : '';
        const deliveryName = `${finalDate}_${dealership.name.replace(/\s+/g, '_').toUpperCase()}${suffix}_${index + 1}_IMPORT`;

        if (existingNames.has(deliveryName)) { skipped++; continue; }
        existingNames.add(deliveryName);

        // Insert
        const { error: insErr } = await supabase.from('deliveries').insert({
            date: finalDate,
            showroom_code: showroomCode,
            cluster_code: clusterCode,
            showroom_type: 'PRIMARY',
            delivery_name: deliveryName,
            status: 'DONE',
            assigned_user_id: photographer?.id || null,
            footage_link: footageLink || null,
            reel_link: reelLink || null,
            payment_type: dealership.payment_type || 'CUSTOMER_PAID'
        });

        if (insErr) {
            console.error(`Error inserting ${deliveryName}:`, insErr.message);
        } else {
            imported++;
        }
    }

    console.log(`\nImport Summary:`);
    console.log(`- Fetched: ${rows.length}`);
    console.log(`- Imported: ${imported}`);
    console.log(`- Skipped (Duplicates/Invalid): ${skipped + (rows.length - imported - skipped)}`);
}

importPavan();
