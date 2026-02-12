require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const userDatesRaw = `24-09-2025_1,03-09-2025,24-09-2025_2,24-09-2025_3,24-09-2025_4,25-09-2025_1,25-09-2025_2,25-09-2025_3,24-09-2025_5,26-09-2025_1,26-09-2025_2,28-09-2025_1,28-09-2025_2,29-09-2025_1,29-09-2025_2,29-09-2025_3,01-10-2025_1,01-10-2025_2,01-10-2025_3,01-10-2025_4,01-10-2025_5,02-10-2025_1,02-10-2025_2,02-10-2025_3,02-10-2025_4,03-10-25-1,03-10-25-2,03-10-25-3,08-10-2025,08-10-2025,10-10-2025,10-11-2025,10-12-2025,10-13-2025,10-14-2025,10-15-2025,10-16-2025,11-10-2025,12-10-2025,12-11-2025,12-12-2025,13-10-2025,15-10-2025,15-10-2025,16-10-2025,16-10-2025,17-10-2025,17-10-2025,18-10-2025,20/10/25,22/10/25,22/10/25,22/10/25,23/10/25,23/10/25,23/10/25,24/10/2025,24/10/2025,24/10/2025,25/10/2025,27/10/2025,06/11/2025,06/11/2025,06/11/2025,09/11/2025,09/11/0205,09/11/2025,10/11/2025,10/11/2025,12/11/2025,14-11-2025,17-11-2025,21-11-2025,21-11-2025,21-11-2025,21-11-2025,24-11-2025,26-11-2025,27-11-2025,27-11-2025,27-11-2025,30-11-2025,30-11-2025,30-11-2025,01-12-2025,05-12-2025,05-12-2025,05-12-2025,05-12-2025,07-12-2025,08-12-2025,08-12-2025,08-12-2025,10-12-25_1,12-12-25_1,13-12-25_1,14-12-25_1,14-12-25,17-12-25_1,17-12-2025_2,17-12-2025_3,18-12-2025,21-12-2025_1,21-12-2025_2,22-12-2025_1,22-12-2025_1,22-12-2025_2,24-12-2025_1,24-12-2025_2,25-12-2025_1,25-12-2025_2,25-12-2025_3,25-12-2025_4,25-12-2025_5,28-12-2025_1,28-12-2025_2,29-12-2025,30-12-2025,31-12-2025,31-12-2025,31-12-2025,01-01-2026,01-01-2026,01-01-2026,05-01-2026,05-01-2026,06-01-2026,07-01-2026,08-01-2026,09-01-2026,11-01-2026,11-01-2026,11-01-2026,14-01-2026,14-01-2026,14-01-2026,15-01-2026,15-01-2026,15-01-2026,15-01-2026,15-01-2026,15-01-2026,19-01-2026,19-01-2026,20-01-2026,21-01-2026,21-01-2026,21-01-2026,21-01-2026,21-01-2026,21-01-2026,21-01-2026,22-01-2026,22-01-2026,23-01-2026,23-01-2026,23-01-2026,23-01-2026,23-01-2026,23-01-2026,25-01-2026,25-01-2026,25-01-2026,26-01-2026,29-01-2026,30-01-2026,30-01-2026,30-01-2026,30-01-2026,01-02-2026,01-02-2026,05.02.2026,05.02.2026,05.02.2026,05.02.2026,06.02.2026,06.02.2026,06.02.2026,06.02.2026,06.02.2026,06.02.2026,07.02.2026,08.02.2026,08.02.2026,09.02.2026,25-09-2025,25-09-2025,23-09-2025,24-09-2025,08-09-2025,26-09-2025,12-12-2025,17-10-2025,17-10-2025,17-10-2025,23-10-2025,24-10-2025,24-10-2025,24-10-2025,26-10-2025,26-10-2025,31-10-2025,02-11-2025,07-11-2025,07-11-2025,08-11-2025,08-11-2025,09-11-2025,14-11-2025,17-11-2025,22-11-2025,23-11-2025,23-11-2025,23-11-2025,23-11-2025,26-11-2025,28-11-2025,02-12-2025,03-12-2025,04-12-2025,06-12-2025,08-12-2025,11-12-2025,14/12/2025,14/12/2025,14/12/2025,21-12-2025,8-1-2026,15/1/2026,15/1/2026,15/1/2026,1-2-2026,1-2-2026,6-2-2026_1,6-2-2026_2,8-2-2026_1,8-2-2026_2`;

function parseUserDate(str) {
    let clean = str.replace(/(_\d+)|(-\d+)$/, '').trim();
    const match = clean.match(/^(\d{1,2})[\s\-\/\.]+(\d{1,2})[\s\-\/\.]+(\d{2,4})/);
    if (match) {
        let [_, d, m, y] = match;
        if (y.length === 2) y = '20' + y;

        let dNum = parseInt(d, 10);
        let mNum = parseInt(m, 10);

        // V4.6 Logic (Swap mismatch)
        if (mNum > 12 && dNum <= 12) {
            const temp = dNum;
            dNum = mNum;
            mNum = temp;
        }

        return `${y}-${String(mNum).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
    }
    return null;
}

async function checkPavanMissing() {
    const result = { missing: [], totalUser: 0, totalDb: 0, badDates: [] };

    // 1. Process User List
    const userItems = userDatesRaw.split(',').map(s => s.trim()).filter(s => s !== '');
    result.totalUser = userItems.length;

    const userCounts = {};
    const unparsed = [];
    userItems.forEach(raw => {
        const parsed = parseUserDate(raw);
        // Check for suspicious years
        if (parsed) {
            const y = parseInt(parsed.substring(0, 4));
            if (y < 2020) result.badDates.push({ raw, parsed });

            userCounts[parsed] = (userCounts[parsed] || 0) + 1;
        } else {
            unparsed.push(raw);
        }
    });

    if (unparsed.length > 0) {
        result.unparsed = unparsed;
    }

    // 2. Fetch DB Data
    const { data: dbDeliveries, error } = await supabase
        .from('deliveries')
        .select('date')
        .ilike('delivery_name', '%Pavan%');

    if (error) {
        console.error("DB Error:", error);
        return;
    }
    result.totalDb = dbDeliveries.length;

    const dbCounts = {};
    dbDeliveries.forEach(d => {
        dbCounts[d.date] = (dbCounts[d.date] || 0) + 1;
    });

    // 3. Compare
    let missingTotal = 0;
    for (const [date, count] of Object.entries(userCounts)) {
        const dbCount = dbCounts[date] || 0;
        if (dbCount < count) {
            const diff = count - dbCount;
            result.missing.push({ date, diff, userHas: count, dbHas: dbCount });
            missingTotal += diff;
        }
    }

    // Check extra in DB (often clues)
    for (const [date, count] of Object.entries(dbCounts)) {
        const userCount = userCounts[date] || 0;
        if (count > userCount) {
            const diff = count - userCount;
            result.missing.push({ type: 'EXTRA_IN_DB', date, diff });
        }
    }

    result.missingTotal = missingTotal;
    fs.writeFileSync('pavan_result.json', JSON.stringify(result, null, 2));
}

checkPavanMissing();
