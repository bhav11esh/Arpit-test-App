const fs = require('fs');

const rawData = JSON.parse(fs.readFileSync('roastea_raw.json', 'utf8'));
const crmData = JSON.parse(fs.readFileSync('roastea_crm.json', 'utf8'));

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
  const parts = d.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return d;
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
  const sheetLink = (row['Footage link'] || '').toLowerCase();
  const sheetDate = normalizeDate(row['Date']);

  if (!sheetLink) return;

  const matches = crmMap.get(sheetLink) || [];

  if (matches.length === 0) {
    report.missingInCRM.push({ row: index + 2, details: row });
  } else if (matches.length > 1) {
    report.multipleMatches.push({ row: index + 2, matchCount: matches.length, details: row });
  } else {
    const record = matches[0];
    const errors = [];
    
    const recordDate = record.delivery_date ? record.delivery_date.substring(0, 10) : null;
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

fs.writeFileSync('roastea_audit_results.json', JSON.stringify(report, null, 2));
console.log('Roastea Audit Complete.');
console.log(`Matches: ${report.perfectMatches}/${report.totalSheetRows}`);
