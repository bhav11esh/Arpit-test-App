import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkCodes() {
  console.log('Fetching unique showroom codes...');
  const { data, error } = await supabase
    .from('deliveries')
    .select('showroom_code');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const uniqueCodes = Array.from(new Set(data.map(r => r.showroom_code)));
  console.log('Showroom codes found:', uniqueCodes);
}

checkCodes();
