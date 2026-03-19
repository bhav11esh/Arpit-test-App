import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function fetchRecords() {
  console.log('Fetching KHIVRAJ_TRIUMPH records...');
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .in('showroom_code', ['KHIVRAJ_TRIUMPH', 'TRIUMPH_POPULAR']);

  if (error) {
    console.error('Error:', error);
    return;
  }

  fs.writeFileSync('triumph_crm_check.json', JSON.stringify(data, null, 2));
  console.log(`Fetched ${data.length} records.`);
}

fetchRecords();
