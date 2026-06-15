import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkAll() {
  console.log('Fetching all dealerships...');
  const { data, error } = await supabase.from('dealerships').select('*');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Number of dealerships:', data.length);
  const ppsMatches = data.filter(d => 
    d.showroom_code === 'PPS_MAHINDRA' || 
    d.name === 'PPS Mahindra' || 
    d.id === 'PPS_MAHINDRA'
  );

  console.log('PPS Mahindra Matches found:', ppsMatches.length);
  ppsMatches.forEach(d => {
    console.log(`ID: ${d.id}, Name: ${d.name}, Code: ${d.showroom_code}, URL: ${d.google_sync_url}`);
  });
}

checkAll();
