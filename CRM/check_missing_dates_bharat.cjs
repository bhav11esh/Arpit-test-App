require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const userDatesRaw = `08-08-2025,04-09-2025,04-09-2025,04-09-2025,04-09-2025,04-09-2025,04-09-2025,05-09-2025,05-09-2025,05-09-2025,05-09-2025,05-09-2025,05-09-2025,07-09-2025,07-09-2025,13-09-2025,14-09-2025,21-09-2025,24-09-2025,24-09-2025,24-09-2025,24-09-2025,25-09-2025,25-09-2025,25-09-2025,25-09-2025,25-09-2025,26-09-2025,26-09-2025,26-09-2025,26-09-2025,27-09-2025,27-09-2025,28-09-2025,29-09-2025,29-09-2025,29-09-2025,29-09-2025,29-09-2025,29-09-2025,29-09-2025,29-09-2025,29-09-2025,29-09-2025,29-09-2025,29-09-2025,29-09-2025,30-09-2025,07-10-2025,10-10-2025,13-10-2025,15-10-2025,15-10-2025,15-10-2025,16-10-2025,17-10-2025,18-10-2025,18-10-2025,19-10-2025,19-10-2025,19-10-2025,23-10-2025,24-10-2025,24-10-2025,24-10-2025,24-10-2025,24-10-2025,25-10-2025,25-10-2025,25-10-2025,27-10-2025,29-10-2025,30-10-2025,30-10-2025,31-10-2025,31-10-2025,31-10-2025,31-10-2025,31-10-2025,31-10-2025,1-11-2025,1-11-2025,3-11-2025,3-11-2025,3-11-2025,05-11-2025,05-11-2025,7-11-2025,10-11-2025,10-11-2025,10-11-2025,13-11-2025,13-11-2026,14-11-2025,14-11-2026,14-11-2027,17-11-2025,19-11-2025,21-11-2025,21-11-2026,22-11-2025,24-11-2025,24-11-2025,26-11-2025,26-11-2025,27-11-2025,27-11-2025,27-11-2025,27-11-2025,28-11-2025,28-11-2025,30-11-2025,30-11-2025,30-11-2025,1-12-2025,1-12-2025,3-12-2025,3-12-2025,5-12-2025,12-12-2025,12-12-2025,12-12-2025,14-12-2025,14-12-2025,14-12-2025,13-12-2025,15-12-2025,15-12-2025_2,20-12-2025,21-12-2025,8-1-2026,8-1-2026,12-1-26,14-1-2026,21-1-2026,21-1-2026,21-1-2026,22-1-2026,23-1-2026,23-1-2026,28-1-2026_1,28-1-2026_2,28-1-2026_3,28-1-2026_4,6-2-2026`;

function parseUserDate(str) {
    // Remove suffixes like _1, _2
    let clean = str.replace(/_\d+$/, '').trim();

    // Parse DD-MM-YYYY or D-M-YYYY etc.
    const match = clean.match(/^(\d{1,2})[\s\-\/\.]+(\d{1,2})[\s\-\/\.]+(\d{2,4})/);
    if (match) {
        let [_, d, m, y] = match;
        if (y.length === 2) y = '20' + y;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return null;
}

async function checkMissing() {
    console.log("--- Checking for Missing Rows ---");

    // 1. Process User List
    const userItems = userDatesRaw.split(',').map(s => s.trim()).filter(s => s !== '' && s !== 'Orignal Dates');
    console.log(`User provided ${userItems.length} dates.`);

    const userCounts = {};
    userItems.forEach(raw => {
        const parsed = parseUserDate(raw);
        if (parsed) {
            userCounts[parsed] = (userCounts[parsed] || 0) + 1;
        } else {
            console.log(`⚠️ Could not parse user date: "${raw}"`);
        }
    });

    // 2. Fetch DB Data
    const { data: dbDeliveries } = await supabase
        .from('deliveries')
        .select('date')
        .ilike('delivery_name', '%Bharat%');

    console.log(`DB has ${dbDeliveries.length} rows.`);

    const dbCounts = {};
    dbDeliveries.forEach(d => {
        dbCounts[d.date] = (dbCounts[d.date] || 0) + 1;
    });

    // 3. Compare
    console.log("\n--- DISCREPANCIES ---");
    let missingTotal = 0;

    for (const [date, count] of Object.entries(userCounts)) {
        const dbCount = dbCounts[date] || 0;
        if (dbCount < count) {
            const diff = count - dbCount;
            console.log(`❌ MISSING ${diff} row(s) for date: ${date}`);
            missingTotal += diff;
        } else if (dbCount > count) {
            console.log(`⚠️ EXTRA ${dbCount - count} row(s) in DB for date: ${date} (Duplicates?)`);
        }
    }

    if (missingTotal === 0) {
        console.log("✅ No missing dates found based on counts!");
    } else {
        console.log(`\nTotal Missing Rows: ${missingTotal}`);
    }
}

checkMissing();
