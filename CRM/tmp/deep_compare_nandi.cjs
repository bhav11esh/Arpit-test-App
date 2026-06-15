
const fs = require('fs');

const crmData = JSON.parse(fs.readFileSync('tmp/crm_data_nandi.json', 'utf8'));
const sheetData = JSON.parse(fs.readFileSync('nandi_sheet_data.json', 'utf8'));

// Normalization helpers
const normUrl = (url) => String(url || "").trim().toLowerCase().split('?')[0].replace(/\/$/, "");
const normName = (name) => String(name || "").trim().toLowerCase();
const normDate = (date) => {
    if (!date) return "";
    const s = String(date).trim();
    if (s.match(/^\d{4}-\d{2}-\d{1,2}$/)) {
        const [y, m, d] = s.split('-');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const parts = s.split(/[-/]/);
    if (parts.length === 3) {
        if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return s;
};

// Photographer Alias Map (known legacy users imported to CRM)
const photogAliases = {
    'ajmal': ['ajmal', 'md kaif', 'md ali', 'kaif', 'amal', 'asif', 'manoj m', 'abhigyan', 'aaron', 'joseph', 'nithin'],
    'sahith undru': ['sahith undru', 'sahith', 'sahith '],
    'mallikarjun': ['mallikarjun', 'mallikarjun ']
};

const isSamePhotog = (crmName, sheetName) => {
    const crm = normName(crmName);
    const sheet = normName(sheetName);
    if (crm === sheet) return true;
    for (const [key, aliases] of Object.entries(photogAliases)) {
        if (crm === key && aliases.includes(sheet)) return true;
    }
    return false;
};

// PRE-PROCESS: Count link occurrences in sheet to identify unique identifiers
const footageCounts = {};
const reelCounts = {};
sheetData.forEach(s => {
    const fl = normUrl(s["Footage Link"]);
    const rl = normUrl(s["Reel Link"]);
    if (fl && fl !== "only photos" && fl !== "only photos ") footageCounts[fl] = (footageCounts[fl] || 0) + 1;
    if (rl) reelCounts[rl] = (reelCounts[rl] || 0) + 1;
});

console.log(`Starting Line-by-Line Audit (397 CRM vs ${sheetData.length} Sheet records)`);

const report = [];
let perfectMatches = 0;
let partialMatches = 0;

crmData.forEach((crm, i) => {
    const crmDate = normDate(crm.date);
    const crmFootage = normUrl(crm.footage_link);
    const crmReel = normUrl(crm.reel_link);
    
    let match = null;
    let matchType = "";

    // 1. Match by Unique Footage Link
    if (crmFootage && crmFootage !== "only photos" && footageCounts[crmFootage] === 1) {
        match = sheetData.find(s => normUrl(s["Footage Link"]) === crmFootage);
        if (match) matchType = "Unique Link (Footage)";
    }

    // 2. Match by Unique Reel Link
    if (!match && crmReel && reelCounts[crmReel] === 1) {
        match = sheetData.find(s => normUrl(s["Reel Link"]) === crmReel);
        if (match) matchType = "Unique Link (Reel)";
    }

    // 3. Fallback: Non-unique Link + Date + Photographer
    if (!match) {
        match = sheetData.find(s => {
            const sameLink = normUrl(s["Footage Link"]) === crmFootage || normUrl(s["Reel Link"]) === crmReel;
            const sameDate = normDate(s["Date"]) === crmDate;
            const samePhotog = isSamePhotog(crm.photographer, s["Photographer"]);
            return sameLink && sameDate && samePhotog;
        });
        if (match) matchType = "Link + Date + User";
    }

    if (match) {
        const dateDiff = normDate(match["Date"]) !== crmDate;
        const photogDiff = !isSamePhotog(crm.photographer, match["Photographer"]);
        
        if (dateDiff || photogDiff) {
            partialMatches++;
            report.push({
                crm_index: i + 1,
                status: "DATA_MISMATCH",
                match_type: matchType,
                crm_date: crm.date,
                sheet_date: match["Date"],
                crm_photog: crm.photographer,
                sheet_photog: match["Photographer"],
                links: crm.footage_link || crm.reel_link
            });
        } else {
            perfectMatches++;
        }
    } else {
        report.push({
            crm_index: i + 1,
            status: "MISSING_IN_SHEET",
            crm_date: crm.date,
            crm_photog: crm.photographer,
            links: crm.footage_link || crm.reel_link
        });
    }
});

const summary = {
    total_crm: crmData.length,
    perfect_matches: perfectMatches,
    data_mismatches: partialMatches,
    missing_in_sheet: report.filter(r => r.status === "MISSING_IN_SHEET").length
};

fs.writeFileSync('tmp/audit_line_by_line.json', JSON.stringify({ summary, details: report }, null, 2));

console.log("\n--- AUDIT SUMMARY ---");
console.log(JSON.stringify(summary, null, 2));

if (report.length > 0) {
    console.log("\n--- SAMPLES OF DISCREPANCIES ---");
    console.table(report.slice(0, 15).map(r => ({
        Idx: r.crm_index,
        Date: `${r.crm_date} vs ${r.sheet_date || 'N/A'}`,
        Photog: `${r.crm_photog} vs ${r.sheet_photog || 'N/A'}`,
        Issue: r.status
    })));
}
