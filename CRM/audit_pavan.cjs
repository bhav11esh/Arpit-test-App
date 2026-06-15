const fs = require('fs');
const path = require('path');

function normalizeUrl(url) {
  if (url === null || url === undefined) return '';
  const s = String(url).trim();
  return s.toLowerCase().replace(/\/$/, '');
}

function normalizePhone(phone) {
  if (phone === null || phone === undefined) return '';
  return String(phone).replace(/\D/g, '');
}

function runAudit() {
  const sheetDataPath = path.resolve('pavan_hyundai_raw.json');
  const crmDataPath = path.resolve('pavan_hyundai_crm.json');

  if (!fs.existsSync(sheetDataPath) || !fs.existsSync(crmDataPath)) {
    console.error('Data files missing!');
    process.exit(1);
  }

  const rawSheet = JSON.parse(fs.readFileSync(sheetDataPath, 'utf8'));
  const rawCRM = JSON.parse(fs.readFileSync(crmDataPath, 'utf8'));

  // Skip header row
  const sheetRows = rawSheet.slice(1).map((row, index) => ({
    date: row[0] || '',
    phone: row[1] || '',
    footage: row[2] || '',
    reel: row[3] || '',
    photographer: row[4] || '',
    rowIndex: index + 2
  }));

  console.log(`Total Sheet Rows: ${sheetRows.length}`);
  console.log(`Total CRM Rows: ${rawCRM.length}`);

  const discrepancies = [];
  const missingInCRM = [];

  sheetRows.forEach((sRow) => {
    const sFootage = normalizeUrl(sRow.footage);
    const sReel = normalizeUrl(sRow.reel);
    
    // Find matching row in CRM
    const matches = rawCRM.filter(cRow => {
      const cFootage = normalizeUrl(cRow.footage_link);
      const cReel = normalizeUrl(cRow.reel_link);
      
      if (sFootage && cFootage === sFootage) return true;
      if (sReel && cReel === sReel) return true;
      return false;
    });

    if (matches.length === 0) {
      if (sFootage || sReel) { // Only report if there was something to match
        missingInCRM.push(sRow);
        discrepancies.push(`Row ${sRow.rowIndex}: Missing in CRM (Sheet Date: ${sRow.date}, Footage: ${sRow.footage || 'N/A'})`);
      }
    } else if (matches.length > 1) {
      const ids = matches.map(m => m.id).join(', ');
      const names = matches.map(m => m.delivery_name).join(', ');
      discrepancies.push(`Row ${sRow.rowIndex}: Multiple matches in CRM (${matches.length} found). IDs: ${ids}. Names: ${names}`);
    } else {
      const cRow = matches[0];
      const detailDiffs = [];

      // Check Phone
      const sPhone = normalizePhone(sRow.phone);
      const cPhone = normalizePhone(cRow.customer_phone);
      if (sPhone && sPhone !== cPhone) {
        detailDiffs.push(`Phone mismatch: Sheet(${sPhone}) vs CRM(${cPhone})`);
      }

      // Check Links
      const cFootage = normalizeUrl(cRow.footage_link);
      const cReel = normalizeUrl(cRow.reel_link);
      if (sFootage && cFootage !== sFootage) {
        detailDiffs.push(`Footage mismatch: Sheet(${sFootage}) vs CRM(${cFootage})`);
      }
      if (sReel && cReel !== sReel) {
        detailDiffs.push(`Reel mismatch: Sheet(${sReel}) vs CRM(${cReel})`);
      }

      if (detailDiffs.length > 0) {
        discrepancies.push(`Row ${sRow.rowIndex} (${cRow.delivery_name}): ${detailDiffs.join(', ')}`);
      }
    }
  });

  console.log('\n--- AUDIT REPORT ---');
  console.log(`Missing in CRM: ${missingInCRM.length}`);
  console.log(`Total Issues found: ${discrepancies.length}`);
  
  if (discrepancies.length > 0) {
    console.log('\nDetails:');
    discrepancies.forEach(d => console.log(d));
  } else {
    console.log('\nAll details accurately captured! 100% Parity.');
  }
}

runAudit();
