const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function verifyData() {
    console.log('--- Verifying Sheet vs Database ---');

    // 1. Load Raw Sheet Data
    if (!fs.existsSync('raw_sheet_dump.json')) {
        console.error('raw_sheet_dump.json not found. Run debug_fetch_sheet_v2.cjs first.');
        return;
    }
    const rawData = JSON.parse(fs.readFileSync('raw_sheet_dump.json', 'utf8'));
    console.log(`Loaded ${rawData.length} rows from Sheet Dump.`);

    // 2. Load DB Data
    const { data: dbData, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('showroom_code', 'APPLE_AUTO_VOLKSWAGEN');

    if (error) { console.error('DB Error:', error); return; }
    console.log(`Loaded ${dbData.length} rows from Database.`);

    // 3. Compare
    let missingCount = 0;
    let matchCount = 0;

    // Helper to normalize strings for comparison
    const norm = (str) => str ? str.trim().toLowerCase() : '';

    console.log('\n--- check for missing rows ---');

    rawData.forEach((row, index) => {
        // Sheet Keys based on previous dump or inspection
        // Assuming keys: 'Date', 'Footage Link', 'Reel Link', 'Photographer' (or 'Photographer Name')
        // We need to check keys from the dump.

        // Let's assume standard keys for now, based on previous logs/screenshots
        const sDate = row['Date'];
        const sFootage = row['Footage Link'];
        const sReel = row['Reel Link'];
        const sPhotog = row['Photographer Name'] || row['Photographer'];

        // Skip empty rows if mostly empty
        if (!sDate && !sFootage) return;

        // Try to find in DB
        // Matching logic: Date AND (Footage Link OR Reel Link)
        // Date format might differ (DD-MM-YYYY vs YYYY-MM-DD)

        // Simple fuzzy match for now
        const found = dbData.find(d => {
            // Check Link (Strongest signal)
            if (sFootage && d.footage_link && norm(d.footage_link) === norm(sFootage)) return true;
            if (sReel && d.reel_link && norm(d.reel_link) === norm(sReel)) return true;
            return false;
        });

        if (found) {
            matchCount++;
        } else {
            missingCount++;
            console.log(`[MISSING] Row ${index + 2} (approx): Date=${sDate}, Photog=${sPhotog}, Link=${sFootage?.substr(0, 20)}...`);
        }
    });

    console.log(`\nSummary:`);
    console.log(`Total Sheet Rows: ${rawData.length}`);
    console.log(`Matched in DB: ${matchCount}`);
    console.log(`Missing from DB: ${missingCount}`);
    console.log(`Total DB Rows: ${dbData.length}`);
}

verifyData();
