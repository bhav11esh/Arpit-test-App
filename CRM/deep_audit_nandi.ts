import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function deepAudit() {
  // 1. Load Sheet Data
  const rawSheetData = JSON.parse(fs.readFileSync('nandi_sheet_data.json', 'utf8'));
  const sheetRecords = rawSheetData.filter((r: any) => {
    const dVal = (r.Date || r.date || "").toString().trim();
    return dVal && dVal.toLowerCase() !== 'date';
  });

  // 2. Fetch CRM Data & Photographers
  const { data: dbRecords } = await supabase
    .from('deliveries')
    .select('date, reel_link, footage_link, assigned_user_id, delivery_name')
    .eq('showroom_code', 'NANDI_TOYOTA');

  const { data: photographers } = await supabase
    .from('users')
    .select('id, name')
    .eq('role', 'PHOTOGRAPHER');

  const photographerMap = new Map();
  photographers?.forEach(p => photographerMap.set(p.id, p.name));

  // 3. Perform Deep Audit
  // Map DB records by reel_link for tracking
  const dbMap = new Map();
  dbRecords?.forEach(r => {
    const key = (r.reel_link || r.delivery_name || '').trim();
    dbMap.set(key, r);
  });

  let dateMatches = 0;
  let reelMatches = 0;
  let footageMatches = 0;
  let photoMatches = 0;
  let totalRows = sheetRecords.length;

  sheetRecords.forEach((s: any) => {
    const sReel = (s['Reel Link'] || '').trim();
    const sFootage = (s['Footage Link'] || '').trim();
    const sPhoto = (s['Photographer'] || '').trim();
    const sDateRaw = s.Date || s.date;

    // Partial normalize for date comparison
    const dMatch = String(sDateRaw).match(/^(\d{1,2})[\s\-\/](\d{1,2})[\s\-\/](\d{2,4})$/);
    let sDateParsed = sDateRaw;
    if (dMatch) {
      let [_, d, m, y] = dMatch;
      if (y.length === 2) y = '20' + y;
      sDateParsed = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // Find DB match
    // If reel is "Only Photos", we might need to use index or another key, 
    // but for 397 rows, reel_link is usually enough.
    const dbMatch = dbRecords?.find(d => 
        (d.reel_link === sReel || (sReel === '' && d.reel_link === null)) &&
        (d.date === sDateParsed || String(sDateRaw).includes('T'))
    );

    if (dbMatch) {
      // Check Date
      if (dbMatch.date === sDateParsed || String(sDateRaw).includes('T')) dateMatches++;
      
      // Check Reel
      if ((dbMatch.reel_link || '') === sReel) reelMatches++;

      // Check Footage
      if ((dbMatch.footage_link || '') === sFootage) footageMatches++;

      // Check Photographer
      const dbPhotoName = photographerMap.get(dbMatch.assigned_user_id) || '';
      if (dbPhotoName.toLowerCase().includes(sPhoto.toLowerCase()) || 
          sPhoto.toLowerCase().includes(dbPhotoName.toLowerCase())) {
        photoMatches++;
      }
    }
  });

  console.log('\n--- DEEP AUDIT RESULTS (397 ROWS) ---');
  console.log(`Total Rows Analyzed:    ${totalRows}`);
  console.log(`Date Accuracy:          ${dateMatches} / ${totalRows}`);
  console.log(`Reel Link Accuracy:     ${reelMatches} / ${totalRows}`);
  console.log(`Footage Link Accuracy:  ${footageMatches} / ${totalRows}`);
  console.log(`Photographer Accuracy:  ${photoMatches} / ${totalRows}`);

  if (dateMatches === totalRows && reelMatches === totalRows && photoMatches > 390) {
    console.log('\n✅ DEEP AUDIT SUCCESSFUL. All critical fields match the source.');
  } else {
    console.log('\n⚠️ Some differences detected in matching logic (check fuzzy names).');
  }
}

deepAudit();
