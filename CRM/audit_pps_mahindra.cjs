const fs = require('fs');
const path = require('path');

// Load data
const rawData = JSON.parse(fs.readFileSync('pps_mahindra_raw.json', 'utf8')).data;
const crmData = JSON.parse(fs.readFileSync('pps_mahindra_crm.json', 'utf8'));
const userMap = JSON.parse(fs.readFileSync('user_map.json', 'utf8'));

// Helper to normalize URLs
function normalizeUrl(url) {
  if (!url) return '';
  try {
    let clean = url.trim().split('?')[0]; // Remove query params (?usp=sharing etc)
    if (clean.endsWith('/')) clean = clean.slice(0, -1);
    // Handle drive.google.com/u/5/ folders
    clean = clean.replace(/\/u\/\d+\//, '/');
    return clean.toLowerCase();
  } catch (e) {
    return (url || '').trim().toLowerCase();
  }
}

// Helper to normalize phone numbers
function normalizePhone(phone) {
  if (!phone) return '';
  let s = String(phone).replace(/\D/g, '');
  if (s.startsWith('91') && s.length > 10) s = s.substring(2);
  return s;
}

// Helper to normalize dates
function normalizeDate(dateStr) {
  if (!dateStr) return '';
  
  // Handle ISO strings like 2025-10-09T18:30:00.000Z
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    
    // If it's 18:30 UTC, it's the next day in India (which is what we want)
    if (dateStr.includes('18:30:00')) {
        const nextDay = new Date(d);
        nextDay.setUTCDate(d.getUTCDate() + 1);
        return `${nextDay.getUTCFullYear()}-${String(nextDay.getUTCMonth() + 1).padStart(2, '0')}-${String(nextDay.getUTCDate()).padStart(2, '0')}`;
    }
    return `${y}-${m}-${day}`;
  }

  // Handle DD-MM-YYYY or DD/MM/YYYY
  const match = dateStr.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (match) {
    let day = match[1].padStart(2, '0');
    let month = match[2].padStart(2, '0');
    let year = match[3];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }

  // Handle YYYY-MM-DD
  const matchY = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (matchY) {
    return `${matchY[1]}-${matchY[2].padStart(2, '0')}-${matchY[3].padStart(2, '0')}`;
  }

  return dateStr;
}

const auditResults = {
  totalSheetRows: rawData.length - 1,
  totalCrmRecords: crmData.length,
  perfectMatches: 0,
  discrepancies: [],
  missingInCRM: [],
  multipleMatches: []
};

// Start from index 1 (skip header)
for (let i = 1; i < rawData.length; i++) {
  const row = rawData[i];
  const sheetPhone = normalizePhone(row[0]);
  const sheetDate = normalizeDate(row[1]);
  const sheetFootage = normalizeUrl(row[2]);
  const sheetReel = normalizeUrl(row[3]);
  const sheetPhotographer = (row[4] || '').trim().toLowerCase();

  // Find in CRM by Footage Link (most unique)
  let matches = crmData.filter(c => normalizeUrl(c.footage_link) === sheetFootage);
  
  // If no match by footage, try Reel Link if it exists
  if (matches.length === 0 && sheetReel) {
    matches = crmData.filter(c => normalizeUrl(c.reel_link) === sheetReel);
  }

  if (matches.length === 0) {
    auditResults.missingInCRM.push({
      row: i + 1,
      details: {
        phone: row[0],
        date: row[1],
        footage: row[2],
        photographer: row[4]
      }
    });
    continue;
  }

  if (matches.length > 1) {
    auditResults.multipleMatches.push({
      row: i + 1,
      matchCount: matches.length,
      details: {
        footage: row[2]
      },
      ids: matches.map(m => m.id)
    });
  }

  const crm = matches[0];
  const crmPhone = normalizePhone(crm.customer_phone);
  const crmDate = crm.date; // already YYYY-MM-DD
  const crmPhotographer = (userMap[crm.assigned_user_id] || '').trim().toLowerCase();

  const discrepancies = [];

  if (sheetDate && crmDate && sheetDate !== crmDate) {
    discrepancies.push(`Date mismatch: Sheet(${sheetDate}) vs CRM(${crmDate})`);
  }

  // Phone check only if sheet has phone
  if (sheetPhone && crmPhone && sheetPhone !== crmPhone) {
    discrepancies.push(`Phone mismatch: Sheet(${sheetPhone}) vs CRM(${crmPhone})`);
  }

  // Photographer check
  // Note: some photographers might be logged as "Venkatesh" in sheet and "Venkatesh M" in CRM
  if (sheetPhotographer && crmPhotographer && !crmPhotographer.includes(sheetPhotographer) && !sheetPhotographer.includes(crmPhotographer)) {
    discrepancies.push(`Photographer mismatch: Sheet("${sheetPhotographer}") vs CRM("${crmPhotographer}")`);
  }

  if (discrepancies.length > 0) {
    auditResults.discrepancies.push({
      row: i + 1,
      crmId: crm.id,
      errors: discrepancies,
      sheetDetails: {
          date: row[1],
          phone: row[0],
          photographer: row[4]
      },
      crmDetails: {
          date: crm.date,
          phone: crm.customer_phone,
          photographer: userMap[crm.assigned_user_id]
      }
    });
  } else {
    auditResults.perfectMatches++;
  }
}

console.log('--- PPS Mahindra Audit Report ---');
console.log(`Total Sheet Rows: ${auditResults.totalSheetRows}`);
console.log(`Total CRM Records: ${auditResults.totalCrmRecords}`);
console.log(`Perfect Matches: ${auditResults.perfectMatches}`);
console.log(`Missing in CRM: ${auditResults.missingInCRM.length}`);
console.log(`Multiple Matches (Duplicates): ${auditResults.multipleMatches.length}`);
console.log(`Discrepancies (Data Mismatch): ${auditResults.discrepancies.length}`);

if (auditResults.missingInCRM.length > 0) {
  console.log('\n--- Missing in CRM Details ---');
  auditResults.missingInCRM.forEach(m => {
    console.log(`Row ${m.row}: ${m.details.date} | ${m.details.footage}`);
  });
}

if (auditResults.discrepancies.length > 0) {
  console.log('\n--- Discrepancy Details ---');
  auditResults.discrepancies.forEach(d => {
    console.log(`Row ${d.row} (CRM ID: ${d.crmId}):`);
    d.errors.forEach(e => console.log(`  - ${e}`));
  });
}

if (auditResults.multipleMatches.length > 0) {
  console.log('\n--- Multiple Matches (Duplicate links in Source Sheet) ---');
  auditResults.multipleMatches.forEach(m => {
    console.log(`Row ${m.row}: ${m.matchCount} matches found for link ${m.details.footage}`);
    console.log(`  IDs: ${m.ids.join(', ')}`);
  });
}

fs.writeFileSync('audit_pps_mahindra_results.json', JSON.stringify(auditResults, null, 2));
