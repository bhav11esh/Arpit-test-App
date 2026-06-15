
const fs = require('fs');
const sheetData = JSON.parse(fs.readFileSync('nandi_sheet_data.json', 'utf8'));

const normUrl = (url) => String(url || "").trim().toLowerCase().split('?')[0].replace(/\/$/, "");

const footageMap = {};
const reelMap = {};

const duplicateFootage = [];
const duplicateReels = [];

sheetData.forEach((row, index) => {
    const footage = normUrl(row["Footage Link"]);
    const reel = normUrl(row["Reel Link"]);

    if (footage && footage !== "only photos" && footage !== "only photos ") {
        if (!footageMap[footage]) footageMap[footage] = [];
        footageMap[footage].push({ index: index + 2, date: row["Date"], photog: row["Photographer"] });
    }

    if (reel) {
        if (!reelMap[reel]) reelMap[reel] = [];
        reelMap[reel].push({ index: index + 2, date: row["Date"], photog: row["Photographer"] });
    }
});

Object.entries(footageMap).forEach(([link, occurrences]) => {
    if (occurrences.length > 1) {
        duplicateFootage.push({ link, occurrences });
    }
});

Object.entries(reelMap).forEach(([link, occurrences]) => {
    if (occurrences.length > 1) {
        duplicateReels.push({ link, occurrences });
    }
});

console.log('--- DUPLICATE FOOTAGE LINKS ---');
duplicateFootage.forEach(d => {
    console.log(`Link: ${d.link}`);
    console.log(`Rows: ${d.occurrences.map(o => o.index).join(', ')}`);
});

console.log('\n--- DUPLICATE REEL LINKS ---');
duplicateReels.forEach(d => {
    console.log(`Link: ${d.link}`);
    console.log(`Rows: ${d.occurrences.map(o => o.index).join(', ')}`);
});

console.log(`\nTotal duplicate footage links: ${duplicateFootage.length}`);
console.log(`Total duplicate reel links: ${duplicateReels.length}`);
