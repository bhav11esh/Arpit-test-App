const dates = [
    "25-09-2025", "23.1.2026-1", "23.1.2026-2", "25-01-2026_1",
    "1-1-2026", "11.1.2026", "12-1-26", "14-01-2023", "29.01.2026"
];

console.log("--- Testing Akshaya Date Formats ---");

function parseDate(dateStr) {
    // Current logic in DealershipsConfigScreen.tsx
    // 1. Strip _ suffix
    let clean = dateStr.replace(/_\d+$/, '').trim();

    // 2. Regex
    // ^(\d{1,2})[\s\-\/\.\u2013\u2014]+(\d{1,2})[\s\-\/\.\u2013\u2014]+(\d{2,4})
    const regex = /^(\d{1,2})[\s\-\/\.\u2013\u2014]+(\d{1,2})[\s\-\/\.\u2013\u2014]+(\d{2,4})/;

    const match = clean.match(regex);
    if (match) {
        let [_, d, m, y] = match;
        if (y.length === 2) y = "20" + y;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return "FAILED";
}

dates.forEach(d => {
    console.log(`"${d}" -> ${parseDate(d)}`);
});
