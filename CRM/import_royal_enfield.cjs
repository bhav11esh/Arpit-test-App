
const { createClient } = require('@supabase/supabase-js');
// Native fetch used
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function importRoyalEnfield() {
    console.log('--- RE-IMPORTING ALL ROYAL ENFIELD DATA ---');

    // Hardcode for reliability as per Pavan fix
    const SYNC_URL = "https://script.google.com/macros/s/AKfycbwtapQ7MAE7RGPRwuqFCzs43jA1UjdyP1S-qn2CmbEMoR7S2wpy3s6dBj-d43OHJqKo/exec";

    // DEBUG: Check connection
    const { data: allD, error: allErr } = await supabase.from('dealerships').select('id, name').limit(5);
    if (allErr) console.error('Connection Error:', allErr);
    else console.log('Connection OK. Sample dealerships:', allD.map(d => d.name));

    console.log('Fetching Royal Enfield dealerships...');
    // 1. Find Royal Enfield Dealerships
    const { data: dealerships, error: dError } = await supabase
        .from('dealerships')
        .select('*')
        .ilike('name', '%Royal Enfield%');

    if (dError) console.error('Query Error:', dError);
    if (!dealerships) console.error('Dealerships is null/undefined');
    else console.log(`Found ${dealerships.length} dealerships.`);

    if (!dealerships || dealerships.length === 0) { console.error('No Royal Enfield dealerships found (Query returned 0)'); return; }

    console.log('Fetching photographers...');
    // Pre-fetch photographers
    const { data: photographers } = await supabase.from('users').select('id, name');
    console.log(`Found ${photographers?.length} photographers.`);

    console.log('Starting Loop...');

    for (const dealership of dealerships) {
        if (!dealership.google_sheet_id) {
            console.log(`Skipping ${dealership.name}: No Google Sheet ID.`);
            continue;
        }

        console.log(`\nProcessing: ${dealership.name} (ID: ...${dealership.google_sheet_id.substr(-5)})`);

        // 2. Fetch Data
        let rows = [];
        try {
            const response = await fetch(SYNC_URL, {
                method: 'POST',
                body: JSON.stringify({ sheetId: dealership.google_sheet_id, action: 'read' })
            });
            const result = await response.json();

            if (result.status !== 'success') {
                console.error(`API Error for ${dealership.name}:`, result.message);
                continue;
            }

            rows = result.data;
            console.log(`Received ${rows.length} rows.`);
        } catch (e) {
            console.error(`Fetch failed for ${dealership.name}:`, e);
            continue;
        }

        // 3. Resolve Mappings
        const { data: mappings } = await supabase.from('mappings').select('*').eq('dealership_id', dealership.id);
        const defaultShowroom = mappings?.[0];

        let clusterCode = 'UNKNOWN';
        let showroomCode = defaultShowroom ? defaultShowroom.id : dealership.id;

        if (defaultShowroom) {
            const { data: clusters } = await supabase.from('clusters').select('name').eq('id', defaultShowroom.cluster_id).single();
            if (clusters) clusterCode = clusters.name;
        } else {
            // Try to lookup cluster by name if mapping missing? 
            // Logic in component uses dealership name regex cleaning if standard mapping fails
            // But for safety, using dealership ID as showroom code is standard fullback for unmapped
        }

        console.log(`  -> Showroom: ${showroomCode}, Cluster: ${clusterCode}`);

        // 4. Import Rows
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
                assigned_user_id: photographer?.id || null, // V1 Fix: Use NULL for unassigned
                footage_link: footageLink || null,
                reel_link: reelLink || null,
                payment_type: dealership.payment_type || 'CUSTOMER_PAID'
            });

            if (insErr) {
                // Ignore duplicates if re-running
                if (insErr.code !== '23505') console.error(`    Insert Error (${deliveryName}):`, insErr.message);
                else skipped++;
            } else {
                imported++;
            }
        }
        console.log(`Completed ${dealership.name}: ${imported} imported, ${skipped} skipped.`);
    }
}

importRoyalEnfield().catch(e => console.error("FATAL SCRIPT ERROR:", e));
