const fs = require('fs');

const rawData = JSON.parse(fs.readFileSync('re_raw.json', 'utf8'));
const crmData = JSON.parse(fs.readFileSync('re_crm.json', 'utf8'));

// Result accumulator
const report = {
  totalSheetRows: rawData.data.length,
  totalCrmRecords: crmData.length,
  perfectMatches: 0,
  discrepancies: [],
  missingInCRM: [],
  multipleMatches: []
};

function normalizeDate(d) {
  if (!d) return null;
  // Handle "28-12-2025_1" or "30-12-2025" or "1-1-2026_1"
  const cleanDate = d.split('_')[0].split(' ')[0];
  const parts = cleanDate.split(/[-/]/);
  if (parts.length === 3) {
    let day = parts[0].padStart(2, '0');
    let month = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }
  return cleanDate;
}

const crmMap = new Map();
crmData.forEach(record => {
  const link = (record.footage_link || '').toLowerCase();
  if (link) {
    if (!crmMap.has(link)) crmMap.set(link, []);
    crmMap.get(link).push(record);
  }
});

rawData.data.forEach((row, index) => {
  const sheetLink = (row['Footage Link'] || '').toLowerCase();
  const sheetDate = normalizeDate(row['Date']);

  if (!sheetLink || sheetLink.includes('team accepted')) return;

  const matches = crmMap.get(sheetLink) || [];

  if (matches.length === 0) {
    report.missingInCRM.push({ row: index + 2, details: row });
  } else if (matches.length > 1) {
    report.multipleMatches.push({ row: index + 2, matchCount: matches.length, details: row });
  } else {
    const record = matches[0];
    const errors = [];
    
    const recordDate = record.date ? record.date.substring(0, 10) : null;
    if (sheetDate && recordDate && sheetDate !== recordDate) {
      errors.push(`Date mismatch: Sheet(${sheetDate}) vs CRM(${recordDate})`);
    }

    if (errors.length > 0) {
      report.discrepancies.push({
        row: index + 2,
        crmId: record.id,
        errors,
        sheetDetails: { date: row['Date'] },
        crmDetails: { date: recordDate }
      });
    } else {
      report.perfectMatches++;
    }
  }
});

fs.writeFileSync('re_audit_results.json', JSON.stringify(report, null, 2));
console.log('Royal Enfield Audit Complete.');
console.log(`Matches: ${report.perfectMatches}/${report.totalSheetRows}`);
