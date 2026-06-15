const fs = require('fs');

const rawData = JSON.parse(fs.readFileSync('skoda_raw.json', 'utf8'));
const crmData = JSON.parse(fs.readFileSync('pps_skoda_crm.json', 'utf8'));

// Result accumulator
const report = {
  totalSheetRows: rawData.data.length - 1, // Subtract header
  totalCrmRecords: crmData.length,
  perfectMatches: 0,
  discrepancies: [],
  missingInCRM: [],
  multipleMatches: []
};

function normalizeDate(d) {
  if (!d) return null;
  // Handle DD-MM-YY or DD-MM-YYYY
  const trimmed = d.trim().split(' ')[0]; // Remove any trailing info like _1, _2
  const parts = trimmed.split(/[-/]/);
  if (parts.length === 3) {
    let day = parts[0].padStart(2, '0');
    let month = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }
  return d;
}

const crmMap = new Map();
crmData.forEach(record => {
  const link = (record.footage_link || '').toLowerCase().trim();
  if (link) {
    if (!crmMap.has(link)) crmMap.set(link, []);
    crmMap.get(link).push(record);
  }
});

const matchedCrmIds = new Set();

rawData.data.forEach((row, index) => {
  if (index === 0) return; // Skip header
  
  const sheetDateRaw = row[0];
  const sheetLinkRaw = row[1];
  const sheetCustomer = row[6] || '';
  
  if (!sheetLinkRaw) return;

  const sheetLink = sheetLinkRaw.toLowerCase().trim();
  const sheetDate = normalizeDate(sheetDateRaw);

  const matches = crmMap.get(sheetLink) || [];

  if (matches.length === 0) {
    report.missingInCRM.push({ row: index + 1, date: sheetDateRaw, customer: sheetCustomer, link: sheetLinkRaw });
  } else if (matches.length > 1) {
    report.multipleMatches.push({ row: index + 1, matchCount: matches.length, details: row });
    matches.forEach(m => matchedCrmIds.add(m.id));
  } else {
    const record = matches[0];
    matchedCrmIds.add(record.id);
    const errors = [];
    
    const recordDate = record.delivery_date ? record.delivery_date.substring(0, 10) : null;
    if (sheetDate && recordDate && sheetDate !== recordDate) {
      errors.push(`Date mismatch: Sheet(${sheetDate}) vs CRM(${recordDate})`);
    }

    if (errors.length > 0) {
      report.discrepancies.push({
        row: index + 1,
        crmId: record.id,
        errors,
        sheetDetails: { date: sheetDateRaw, customer: sheetCustomer },
        crmDetails: { date: recordDate }
      });
    } else {
      report.perfectMatches++;
    }
  }
});

const unmatchedCrm = crmData.filter(r => !matchedCrmIds.has(r.id));
report.extraInCRM = unmatchedCrm.map(r => ({ id: r.id, name: r.delivery_name, date: r.delivery_date }));

fs.writeFileSync('pps_skoda_audit_results.json', JSON.stringify(report, null, 2));
console.log('Audit complete.');
console.log(`Matches: ${report.perfectMatches}/${report.totalSheetRows}`);
console.log(`Missing in CRM: ${report.missingInCRM.length}`);
console.log(`Extra in CRM: ${report.extraInCRM.length}`);
console.log(`Discrepancies: ${report.discrepancies.length}`);
