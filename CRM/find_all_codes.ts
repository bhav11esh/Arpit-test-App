import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function findCodes() {
  console.log('Finding all unique showroom codes in deliveries...');
  const { data, error } = await supabase
    .from('deliveries')
    .select('showroom_code');

  if (error) return;

  const codes = [...new Set(data.map(d => d.showroom_code))];
  console.log('Codes:', codes);
}

findCodes();
