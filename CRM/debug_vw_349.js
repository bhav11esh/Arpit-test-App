const parseDate = (dStr) => {
    if (!dStr) return null;
    const trimmed = typeof dStr === 'string' ? dStr.trim() : dStr;
    let result = null;
    
    if (typeof trimmed === 'string' && trimmed.includes('T') && trimmed.includes('Z')) {
        try {
            const date = new Date(trimmed);
            if (!isNaN(date.getTime())) {
                const localDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
                result = localDate.toISOString().split('T')[0];
            }
        } catch (e) {}
    }

    if (!result) {
        const dmyMatch = String(trimmed).match(/^(\d{1,2})\s*[\s\-\.\/]\s*(\d{1,2})\s*[\s\-\.\/]\s*(\d{2,4})/);
        if (dmyMatch) {
            let [_, d, m, y] = dmyMatch;
            if (y.length === 2) y = '20' + y;
            result = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
    }

    if (!result) {
        try {
            const nativeDate = new Date(trimmed);
            if (!isNaN(nativeDate.getTime())) {
                result = nativeDate.toISOString().split('T')[0];
            }
        } catch (e) {}
    }

    if (result) {
        const yearNum = parseInt(result.split('-')[0]);
        if (yearNum < 2020 || yearNum > 2100) return null;
    }

    return result;
};

const headers = ["Customer Name","Vehicle Name","License Plate","Chassis Number","Date","Footage Link","Photographer","Reel Link","Invoice Sent?"];
const rawRow = ["","","","","2026-08-02T18:30:00.000Z","","AKHIL",""];

const row = {};
headers.forEach((h, i) => {
    if (h) row[h] = rawRow[i];
});

console.log('Row Object:', JSON.stringify(row, null, 2));

const rawDate = row["Date"] || row["date"] || "";
const parsedDate = parseDate(rawDate);

console.log('Parsed Date:', parsedDate);

const hasData = Object.keys(row).some(key => {
    if (key.toLowerCase() === 'date' || key === '_parsedDate') return false;
    return !!row[key];
});

console.log('Has Data:', hasData);
