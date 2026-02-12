
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function findMissingDate() {
    console.log('--- DIAGNOSING MISSING SKODA KARR RECORD ---');

    const rawInput = "14-11-25,14-11-25,14-11-25,14-11-25,16-11-25,16-11-25,16-11-25,17-11-25,18-11-25,18-11-25,19-11-25,19-11-25,21-11-2025-1,21-11-2025-2,21-11-2025_3,22-11-2025-1,22-11-2025-2,23-11-2025-1,23-11-2025-2,25-11-2025,26-11-2025,27-11-2025_1,27-11-2025_2,27-11-2025_3,28-11-2025_1,28-11-2025_2,28-11-2025_3,28-11-2025_4,28-11-2025_5,28-11-2025_6,29.11.2025_1,29.11.2025_2,30-11-2025,27-11-2025,27-11-2025,3-12-2025,5-12-2025_1,5-12-2025_2,5-12-2025_3,5-12-2025_4,7-12-2025_1,7-12-2025_2,6-12-2025_1,13-12-2025,14-12-2025_1,14-12-2025_2,14-12-2025_3,11-12-2025_1,11-12-2025_2,12-12-2025_1,12-12-2025_2,12-12-2025_3,12-12-2025_4,15-12-2025_1,15-12-2025_2,15-12-2025_3,17-12-2025_1,17-12-2025_2,19-12-2025,20-12-2025,21-12-2025,23-12-2025,24-12-2025,22-12-2025_1,22-12-2025_2,22-12-2025_3,22-12-2025_4,22-12-2025_5,23-12-2025,28-12-2025,26-12-2025 -1,26-12-2025 -2,25-12-2025_1,25-12-2025_2,25-12-2025_3,25-12-2025_4,25-12-2025_5,25-12-2025_6,31-12-2025,03-01-2026,4-1-2026,08-01-2026,06-01-2026,09-01-0226,15-01-26_1,15-01-26_2,15-01-26_3,15-01-26_4,15-01-26_5,11-01-2026_1,11-01-2026_2,16-01-2026,17-01-2026,19-01-2026,23-01-2026,23-01-2026,23-01-2026,25-01-2026,25-01-2026,21-01-2026,21-01-2026,26-01-2026,28-01-2026,29.01.2026,29-01-2026,30-01-2026,31-01-2026,31-01-2026,01-02-2026,01-02-2026,01-02-2026,05-02-2026,5.2.2026,06-02-2026-1,06-02-2026-2,06-02-2026-3,06-02-2026-4,06-02-2026-5,06-02-2026-6,07-02-2026,9.2.2025,09-02-2026,30-11-2025,11-12-2025_1,11-12-2025_2,16-12-2025,01-02-2026";

    const userDates = rawInput.split(',').map(s => s.trim());
    console.log(`User provided ${userDates.length} date entries.`);

    function normalizeDate(str) {
        let clean = str;

        // 1. Handle Dot separators (replace with -)
        clean = clean.replace(/\./g, '-');

        // 2. Remove typical suffixes like _1, -1, _2
        // REGEX FIXED: Only remove 1 or 2 digit suffixes to protect the year (e.g. 2026-1 vs 2026)
        // This assumes no index is > 99
        clean = clean.replace(/[-_]\d{1,2}$/, '');

        // 3. Typo fix
        if (clean.includes('0226')) clean = clean.replace('0226', '2026');

        // 4. Split
        const parts = clean.split('-');

        if (parts.length < 3) {
            console.log(`[FAIL-SPLIT] "${str}" -> "${clean}"`);
            return 'INVALID';
        }

        let d = parseInt(parts[0]);
        let m = parseInt(parts[1]);
        let y = parseInt(parts[2]);

        if (isNaN(d) || isNaN(m) || isNaN(y)) {
            console.log(`[FAIL-NAN] "${str}" -> "${clean}"`);
            return 'INVALID';
        }

        if (y < 100) y += 2000;

        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    const userCounts = {};
    let invalidCount = 0;

    userDates.forEach(raw => {
        const norm = normalizeDate(raw);
        if (norm === 'INVALID') {
            invalidCount++;
        } else {
            userCounts[norm] = (userCounts[norm] || 0) + 1;
        }
    });

    console.log(`Parsed successfully. Invalid: ${invalidCount}`);

    // Since I deleted the DB records, I can't compare directly.
    // But I can simulate the IMPORT LOGIC to see if any date is REJECTED by common logic/Supabase
    // or if duplicates cause issues.

    // Sort and print unique dates to help user spot weird ones
    const sortedUnique = Object.keys(userCounts).sort();
    console.log('\n--- PARSED DATES FROM USER INPUT ---');
    sortedUnique.forEach(d => {
        console.log(`${d}: ${userCounts[d]} occurrences`);
    });

    // Check for weird years
    console.log('\n--- POTENTIAL ISSUES ---');
    sortedUnique.forEach(d => {
        const y = parseInt(d.split('-')[0]);
        if (y < 2024 || y > 2026) {
            console.log(`[WARN] Unusual Year: ${d}`);
        }
    });
}

findMissingDate();
