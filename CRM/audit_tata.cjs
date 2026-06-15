const fs = require('fs');

const rawData = JSON.parse(fs.readFileSync('tata_raw.json', 'utf8'));
const crmData = JSON.parse(fs.readFileSync('tata_crm.json', 'utf8'));

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
  
  // Handle ISO strings from Google Sheets
  if (typeof dateVal === 'string' && dateVal.includes('T')) {
    return dateVal.substring(0, 10);
  }
  
  // Handle DD-MM-YYYY or DD/MM/YYYY
  const str = String(dateVal).trim().split(' ')[0];
  const parts = str.split(/[-/.]/);
  
  if (parts.length === 3) {
    let day = parts[0].padStart(2, '0');
    let month = parts[1].padStart(2, '0');
    let year = parts[2];
    
    if (year.length === 2) year = '20' + year;
    
    // Check if it's YYYY-MM-DD (ISO)
    if (day.length === 4) {
      return `${day}-${month}-${year.padStart(2, '0')}`;
    }
    
    return `${year}-${month}-${day}`;
  }
  
  return null;
}

const matchedCrmIds = new Set();

rawData.data.forEach((row, index) => {
  if (index === 0) return; // Skip header
  
  const sheetCustomer = row[0] || '';
  const sheetDateRaw = row[2];
  const sheetLinkRaw = row[3];
  
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
      // Discarding minor date mismatches if they look like timezone shifts
      if (Math.abs(new Date(sheetDate) - new Date(recordDate)) > 86400000) {
         errors.push(`Date mismatch: Sheet(${sheetDate}) vs CRM(${recordDate})`);
      }
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

fs.writeFileSync('tata_audit_results.json', JSON.stringify(report, null, 2));
console.log('Audit complete.');
console.log(`Matches: ${report.perfectMatches}/${report.totalSheetRows}`);
console.log(`Missing in CRM: ${report.missingInCRM.length}`);
console.log(`Extra in CRM: ${report.extraInCRM.length}`);
console.log(`Discrepancies: ${report.discrepancies.length}`);
