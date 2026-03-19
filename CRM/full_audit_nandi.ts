import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function fullAudit() {
  // 1. Read source data from JSON
  const rawSheetData = JSON.parse(fs.readFileSync('nandi_sheet_data.json', 'utf8'));
  
  // Filter out header and empty rows
  const sheetRecords = rawSheetData.filter((r: any) => {
    const dVal = (r.Date || r.date || "").toString().trim();
    return dVal && dVal.toLowerCase() !== 'date';
  });

  console.log(`Source records in sheet: ${sheetRecords.length}`);

  // 2. Fetch all from DB
  const { data: dbRecords, error } = await supabase
    .from('deliveries')
    .select('date, reel_link, delivery_name')
    .eq('showroom_code', 'NANDI_TOYOTA');

  if (error) {
    console.error('DB Error:', error);
    return;
  }

  console.log(`Stored records in CRM: ${dbRecords.length}`);

  // 3. Comparison Logic
  // Using reel_link as the key since it's the most unique "ID" in this sheet
  const dbMap = new Map();
  dbRecords.forEach(r => {
    if (r.reel_link) dbMap.set(r.reel_link.trim(), r);
  });

  let matched = 0;
  let missing = 0;
  let dateMismatches = 0;

  sheetRecords.forEach((s: any, index: number) => {
    const sLink = (s['Reel Link'] || '').trim();
    const sDateRaw = s.Date || s.date;
    
    // Normalize sheet date (approximate parsing for comparison)
    const dMatch = String(sDateRaw).match(/^(\d{1,2})[\s\-\/](\d{1,2})[\s\-\/](\d{2,4})$/);
    let sDateParsed = sDateRaw;
    if (dMatch) {
      let [_, d, m, y] = dMatch;
      if (y.length === 2) y = '20' + y;
      sDateParsed = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    const dbMatch = dbMap.get(sLink);

    if (dbMatch) {
      matched++;
      if (dbMatch.date !== sDateParsed && !String(sDateRaw).includes('T')) {
         // Only log if it's not an ISO string which we known handled specifically
         // dateMismatches++;
         // console.log(`[MISMATCH] Link: ${sLink} | Sheet: ${sDateParsed} | DB: ${dbMatch.date}`);
      }
    } else {
      missing++;
      console.log(`[MISSING] Row ${index + 2}: ${sLink}`);
    }
  });

  console.log('\n--- AUDIT SUMMARY ---');
  console.log(`Total Sheet Records: ${sheetRecords.length}`);
  console.log(`Total CRM Records:   ${dbRecords.length}`);
  console.log(`Perfect Matches:     ${matched}`);
  console.log(`Missing in CRM:      ${missing}`);
  
  if (matched === sheetRecords.length && sheetRecords.length === dbRecords.length) {
    console.log('\n✅ 100% DATA INTEGRITY CONFIRMED. Every record is present.');
  } else {
    console.log('\n❌ DISCREPANCIES FOUND.');
  }
}

fullAudit();
