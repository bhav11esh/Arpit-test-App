import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function compare() {
  const sheetData = JSON.parse(fs.readFileSync('nandi_sheet_data.json', 'utf8'));
  const { data: dbRecords } = await supabase.from('deliveries').select('*').eq('showroom_code', 'NANDI_TOYOTA');
  
  console.log(`Sheet rows (total): ${sheetData.length}`);
  console.log(`DB records (NANDI_TOYOTA): ${dbRecords?.length}`);

  const nandiToyotaRecords = dbRecords || [];

  // Find names in sheet that are NOT in DB
  // Use Reel Link as unique ID if possible
  const dbReels = new Set(nandiToyotaRecords.map(r => r.reel_link).filter(l => l));
  const missingFromDb = sheetData.filter((r: any) => {
    const reel = r["Reel Link"];
    return reel && !dbReels.has(reel);
  });

  console.log(`\nRows in Sheet but missing from DB (by Reel Link): ${missingFromDb.length}`);
  missingFromDb.forEach((r: any) => {
    console.log(`Name: ${r["Customer Name"]} | Date: ${r["Date"]} | Reel: ${r["Reel Link"]}`);
  });

  // Find extra records in DB
  const sheetReels = new Set(sheetData.map((r: any) => r["Reel Link"]).filter((l: any) => l));
  const extraInDb = nandiToyotaRecords.filter(r => r.reel_link && !sheetReels.has(r.reel_link));
  console.log(`\nRecords in DB but missing from Sheet (by Reel Link): ${extraInDb.length}`);
  extraInDb.forEach((r: any) => {
    console.log(`Name: ${r.delivery_name} | Date: ${r.date} | Reel: ${r.reel_link}`);
  });
}

compare();
