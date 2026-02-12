const dates = [
    "26/11/2025",
    "27/11/2025",
    "03-12-2025",
    "05-12-2025",
    "05-13-2025" // The problematic date
];

console.log("--- Testing KTM Date Formats ---");

function parseDate(dateStr) {
    let clean = dateStr.replace(/(_\d+)|(-\d+)$/, '').trim();

    // Current regex: ^(\d{1,2})[\s\-\/\.\u2013\u2014]+(\d{1,2})[\s\-\/\.\u2013\u2014]+(\d{2,4})
    const regex = /^(\d{1,2})[\s\-\/\.\u2013\u2014]+(\d{1,2})[\s\-\/\.\u2013\u2014]+(\d{2,4})/;

    const match = clean.match(regex);
    if (match) {
        let [_, part1, part2, y] = match;

        let d = parseInt(part1, 10);
        let m = parseInt(part2, 10);

        if (y.length === 2) y = "20" + y;

        // Proposed Fix: Logic to swap if Month > 12
        if (m > 12 && d <= 12) {
            console.log(`⚠️ Detected Ambiguous Date: ${clean} (Month ${m} > 12). Swapping D/M.`);
            const temp = d;
            d = m;
            m = temp;
        }

        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return "FAILED";
}

dates.forEach(d => {
    console.log(`"${d}" -> ${parseDate(d)}`);
});
