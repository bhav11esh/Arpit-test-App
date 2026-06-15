const dates = [
    "30-11-2025",
    "03--12-2025",
    "04-12-2025",
    "7/12/2025",
    "7/12/2025-2",
    "12-12-2025",
    "13-12-25",
    "25-12-2025",
    "12-01-2026"
];

console.log("--- Testing Kataria Date Formats ---");

function parseDate(dateStr) {
    // Current logic in DealershipsConfigScreen.tsx

    // 1. Strip _ suffix and now - suffix (Wait, I need to check if I added - suffix stripping? No, I only added _ suffix stripping in V4.3)
    // The user has "7/12/2025-2".

    // Let's implement what is currently in the file:
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
