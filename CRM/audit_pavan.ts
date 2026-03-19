import fs from 'fs';
import path from 'path';

interface SheetRow {
  date: string;
  phone: string;
  footage: string;
  reel: string;
  photographer: string;
}

interface CRMRow {
  id: string;
  date: string;
  customer_phone: string | null;
  footage_link: string | null;
  reel_link: string | null;
  delivery_name: string;
}

function normalizeUrl(url: string | null): string {
  if (!url) return '';
  return url.trim().toLowerCase().replace(/\/$/, '');
}

function normalizePhone(phone: string | null): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

async function runAudit() {
  const sheetDataPath = path.resolve('pavan_hyundai_raw.json');
  const crmDataPath = path.resolve('pavan_hyundai_crm.json');

  if (!fs.existsSync(sheetDataPath) || !fs.existsSync(crmDataPath)) {
    console.error('Data files missing!');
    return;
  }

  const rawSheet: any[][] = JSON.parse(fs.readFileSync(sheetDataPath, 'utf8'));
  const rawCRM: CRMRow[] = JSON.parse(fs.readFileSync(crmDataPath, 'utf8'));

  // Skip header row
  const sheetRows: SheetRow[] = rawSheet.slice(1).map((row, index) => ({
    date: row[0] || '',
    phone: row[1] || '',
    footage: row[2] || '',
    reel: row[3] || '',
    photographer: row[4] || '',
  }));

  console.log(`Total Sheet Rows: ${sheetRows.length}`);
  console.log(`Total CRM Rows: ${rawCRM.length}`);

  const discrepancies: string[] = [];
  const missingInCRM: SheetRow[] = [];

  sheetRows.forEach((sRow, idx) => {
    // Find matching row in CRM
    // Matching logic: Try matching by footage link first as it should be relatively unique
    const sFootage = normalizeUrl(sRow.footage);
    const sReel = normalizeUrl(sRow.reel);
    
    const matches = rawCRM.filter(cRow => {
      const cFootage = normalizeUrl(cRow.footage_link);
      const cReel = normalizeUrl(cRow.reel_link);
      
      if (sFootage && cFootage === sFootage) return true;
      if (sReel && cReel === sReel) return true;
      return false;
    });

    if (matches.length === 0) {
      missingInCRM.push(sRow);
      discrepancies.push(`Row ${idx + 2}: Missing in CRM (Sheet Date: ${sRow.date}, Footage: ${sRow.footage})`);
    } else if (matches.length > 1) {
      discrepancies.push(`Row ${idx + 2}: Multiple matches in CRM (${matches.length} found)`);
    } else {
      const cRow = matches[0];
      const detailDiffs: string[] = [];

      // Check Phone
      const sPhone = normalizePhone(sRow.phone);
      const cPhone = normalizePhone(cRow.customer_phone);
      if (sPhone && sPhone !== cPhone) {
        detailDiffs.push(`Phone mismatch: Sheet(${sPhone}) vs CRM(${cPhone})`);
      }

      // Check Links (if we matched by one, check the other)
      const cFootage = normalizeUrl(cRow.footage_link);
      const cReel = normalizeUrl(cRow.reel_link);
      if (sFootage && cFootage !== sFootage) {
        detailDiffs.push(`Footage mismatch: Sheet(${sFootage}) vs CRM(${cFootage})`);
      }
      if (sReel && cReel !== sReel) {
        detailDiffs.push(`Reel mismatch: Sheet(${sReel}) vs CRM(${cReel})`);
      }

      if (detailDiffs.length > 0) {
        discrepancies.push(`Row ${idx + 2} (${cRow.delivery_name}): ${detailDiffs.join(', ')}`);
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
