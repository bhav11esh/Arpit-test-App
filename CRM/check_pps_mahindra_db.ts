import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkDB() {
  console.log('Checking unique showroom codes in deliveries table...');
  const { data: codes, error: codeError } = await supabase
    .from('deliveries')
    .select('showroom_code')
    .limit(1000);

  if (codeError) {
    console.error('Error fetching codes:', codeError);
    return;
  }

  const uniqueCodes = [...new Set(codes.map(c => c.showroom_code))];
  console.log('Unique showroom codes found:', uniqueCodes);

  // Also try searching for a specific link from the PPS Mahindra sheet
  const sampleLink = "https://drive.google.com/drive/folders/1McG4B6tanNDOL0_sz77DbZqFqPtA7CAD?usp=drive_link";
  console.log(`Searching for record with link: ${sampleLink}`);
  
  const { data: record, error: recordError } = await supabase
    .from('deliveries')
    .select('*')
    .or(`google_drive_folder.eq.${sampleLink},reel_link.eq.${sampleLink}`);

  if (recordError) {
    console.error('Error searching for record:', recordError);
  } else if (record && record.length > 0) {
    console.log('Match found in CRM:', record[0]);
    console.log('Correct showroom_code for this record:', record[0].showroom_code);
  } else {
    console.log('No match found for sample link.');
  }
}

checkDB();
