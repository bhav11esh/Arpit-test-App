const fs = require('fs');

const rawData = JSON.parse(fs.readFileSync('triumph_raw.json', 'utf8'));
const crmData = JSON.parse(fs.readFileSync('triumph_crm_check.json', 'utf8'));

const report = {
  totalSheetRows: rawData.data.length - 1,
  totalCrmRecords: crmData.length,
  perfectMatches: 0,
  discrepancies: [],
  missingInCRM: [],
  multipleMatches: [],
  extraInCRM: []
};

// Map CRM records by footage link
const crmMap = new Map();
crmData.forEach(record => {
  const link = (record.footage_link || "").toLowerCase().trim();
  if (!crmMap.has(link)) crmMap.set(link, []);
  crmMap.get(link).push(record);
});

function normalizeDate(dateVal) {
  if (!dateVal) return null;
  const str = String(dateVal).trim();
  // ... simple normalization ...
  return str;
}

const matchedCrmIds = new Set();

rawData.data.forEach((row, index) => {
  if (index === 0) return; // Skip header
  
  const sheetDate = row[0];
  const sheetCustomer = row[1];
  const sheetLinkRaw = row[2];
  
  if (!sheetLinkRaw) return;

  const sheetLink = sheetLinkRaw.toLowerCase().trim();

  const matches = crmMap.get(sheetLink) || [];

  if (matches.length === 0) {
    report.missingInCRM.push({ row: index + 1, date: sheetDate, customer: sheetCustomer, link: sheetLinkRaw });
  } else {
    const record = matches[0];
    matchedCrmIds.add(record.id);
    report.perfectMatches++;
  }
});

const unmatchedCrm = crmData.filter(r => !matchedCrmIds.has(r.id));
report.extraInCRM = unmatchedCrm.length;

fs.writeFileSync('triumph_audit_results.json', JSON.stringify(report, null, 2));
console.log('Audit complete.');
console.log(`Matches: ${report.perfectMatches}/${report.totalSheetRows}`);
console.log(`Missing in CRM: ${report.missingInCRM.length}`);
console.log(`Extra in CRM: ${report.extraInCRM}`);
