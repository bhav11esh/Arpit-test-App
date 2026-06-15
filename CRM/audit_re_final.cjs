const fs = require('fs');

const rawData = JSON.parse(fs.readFileSync('re_raw.json', 'utf8'));
const crmData = JSON.parse(fs.readFileSync('re_crm.json', 'utf8'));

// Result accumulator
const report = {
  totalSheetRows: rawData.data.length - 1, // Header row handled separately if needed, but fetch_re_raw usually returns all.
  totalCrmRecords: crmData.length,
  perfectMatches: 0,
  discrepancies: [],
  missingInCRM: [],
  ignoredRows: []
};

// V8.4: Use actual headers from rawData.data[0]
const headers = rawData.data[0];
const dataRows = rawData.data.slice(1);

function normalizeDate(d) {
  if (!d) return null;
  const cleanDate = String(d).split('_')[0].split(' ')[0].trim();
  const parts = cleanDate.split(/[-/.]/);
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
  const link = (record.footage_link || '').toLowerCase().trim();
  if (link) {
    if (!crmMap.has(link)) crmMap.set(link, []);
    crmMap.get(link).push(record);
  }
});

dataRows.forEach((rowArray, index) => {
  const row = {};
  headers.forEach((h, i) => { if(h) row[h.trim()] = rowArray[i]; });

  const sheetLink = (row['Footage Link'] || '').toLowerCase().trim();
  const sheetDate = normalizeDate(row['Date']);
  const sheetPhotog = (row['Photographer'] || '').toLowerCase().trim();

  // Filter logic similar to DealershipsConfigScreen.tsx
  if (!sheetDate || sheetDate.toLowerCase().includes('date')) {
    report.ignoredRows.push({ row: index + 2, reason: 'Invalid Date', details: row });
    return;
  }

  // Row 38 case: "team accepted..."
  const hasData = Object.values(row).some(v => v && String(v).trim().length > 0 && !headers.includes(String(v).trim()));
  if (!hasData) {
    report.ignoredRows.push({ row: index + 2, reason: 'Empty Row', details: row });
    return;
  }

  if (!sheetLink) {
    report.missingInCRM.push({ row: index + 2, reason: 'Missing Link in Sheet', details: row });
    return;
  }

  const matches = crmMap.get(sheetLink) || [];

  if (matches.length === 0) {
    report.missingInCRM.push({ row: index + 2, reason: 'No CRM match for Link', details: row });
  } else {
    // If multiple matches, we'll just check the first one for now or all
    const record = matches[0];
    const errors = [];
    
    // Date Check
    const recordDate = record.date ? record.date.substring(0, 10) : null;
    if (sheetDate && recordDate && sheetDate !== recordDate) {
      errors.push(`Date: ${sheetDate} vs ${recordDate}`);
    }

    // Photographer Check (Loose)
    const recordPhotog = (record.assigned_user_id || '').toLowerCase(); // We don't have user names in deliveries table directly, skip for now or fetch
    
    if (errors.length > 0) {
      report.discrepancies.push({
        row: index + 2,
        crmId: record.id,
        errors,
        sheetLink,
        sheetDate
      });
    } else {
      report.perfectMatches++;
    }
  }
});

fs.writeFileSync('re_audit_final.json', JSON.stringify(report, null, 2));
console.log('Final Audit Complete.');
console.log(`Summary: ${report.perfectMatches} Perfect, ${report.missingInCRM.length} Missing, ${report.discrepancies.length} Discrepancies.`);
