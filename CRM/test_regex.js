
const testStrings = [
    "13-08 2025",
    "04-08–25",
    "14 - 08 - 2025",
    "22-01-2026",
    "05-02-2026"
];

console.log("--- Testing Regex ---");

const regex = /^(\d{1,2})[\s\-\/\.\u2013\u2014]+(\d{1,2})[\s\-\/\.\u2013\u2014]+(\d{2,4})/;

testStrings.forEach(dateStr => {
    const match = dateStr.match(regex);
    if (match) {
        let [_, d, m, y] = match;
        if (y.length === 2) y = `20${y}`;
        const finalDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        console.log(`✅ Parsed "${dateStr}" -> "${finalDate}"`);
    } else {
        console.log(`❌ Failed to parse "${dateStr}"`);
    }
});
