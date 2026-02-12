
const { createClient } = require('@supabase/supabase-js');
// Native fetch used
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function importKarr() {
    console.log('--- RE-IMPORTING SKODA KARR DATA ---');

    // Hardcode for reliability
    const SYNC_URL = "https://script.google.com/macros/s/AKfycbwtapQ7MAE7RGPRwuqFCzs43jA1UjdyP1S-qn2CmbEMoR7S2wpy3s6dBj-d43OHJqKo/exec";
    const ID = 'b3034732-d979-4c69-861e-84d3a32adfe4';
    const SHEET_ID = '1LjJpX9lSeWcaaTD7EgjiMPqi_0-FZPA55ze0QBiv9U4';
    const NAME = 'Skoda Karr';

    // Pre-fetch photographers
    const { data: photographers } = await supabase.from('users').select('id, name');

    console.log(`Processing: ${NAME} (ID: ...${SHEET_ID.substr(-5)})`);

    // 1. Fetch Data
    let rows = [];
    try {
        const response = await fetch(SYNC_URL, {
            method: 'POST',
            body: JSON.stringify({ sheetId: SHEET_ID, action: 'read' })
        });
        const result = await response.json();

        if (result.status !== 'success') {
            console.error(`API Error for ${NAME}:`, result.message);
            return;
        }

        rows = result.data;
        console.log(`Received ${rows.length} rows.`);
    } catch (e) {
        console.error(`Fetch failed for ${NAME}:`, e);
        return;
    }

    // 2. Resolve Mappings
    const { data: mappings } = await supabase.from('mappings').select('*').eq('dealership_id', ID);

    let clusterCode = 'UNKNOWN';
    let showroomCode = mappings && mappings.length > 0 ? mappings[0].id : ID;

    if (mappings && mappings.length > 0) {
        const { data: clusters } = await supabase.from('clusters').select('name').eq('id', mappings[0].cluster_id).single();
        if (clusters) clusterCode = clusters.name;
    }

    console.log(`  -> Showroom: ${showroomCode}, Cluster: ${clusterCode}`);

    // Get Dealership details for payment type
    const { data: dData } = await supabase.from('dealerships').select('payment_type').eq('id', ID).single();
    const paymentType = dData?.payment_type || 'CUSTOMER_PAID';

    // 3. Import Rows
    let imported = 0;
    let skipped = 0;
    const existingNames = new Set();

    for (const [index, row] of rows.entries()) {
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
        const dmy = dateStr.match(/^(\d{1,2})[\s\-\/\.]+(\d{1,2})[\s\-\/\.]+(\d{2,4})/);
        if (dmy) {
            let [_, d, m, y] = dmy;
            if (y.length === 2) y = '20' + y;
            let dNum = parseInt(d);
            let mNum = parseInt(m);
            if (mNum > 12 && dNum <= 12) { [dNum, mNum] = [mNum, dNum]; }
            finalDate = `${y}-${String(mNum).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
        } else {
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
        const deliveryName = `${finalDate}_${NAME.replace(/\s+/g, '_').toUpperCase()}${suffix}_${index + 1}_IMPORT`;

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
            payment_type: paymentType
        });

        if (insErr) {
            if (insErr.code !== '23505') console.error(`    Insert Error (${deliveryName}):`, insErr.message);
            else skipped++;
        } else {
            imported++;
        }
    }
    console.log(`Completed ${NAME}: ${imported} imported, ${skipped} skipped.`);
}

importKarr().catch(e => console.error("FATAL SCRIPT ERROR:", e));
