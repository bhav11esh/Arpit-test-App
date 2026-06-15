import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function fetchRECrm() {
  console.log('Fetching CRM data for ROYAL_ENFIELD_TEKNIK_MOTORS...');
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .eq('showroom_code', 'ROYAL_ENFIELD_TEKNIK_MOTORS');

  if (error) {
    console.error('Error fetching CRM data:', error);
    return;
  }

  fs.writeFileSync('re_crm.json', JSON.stringify(data, null, 2));
  console.log(`Successfully fetched ${data.length} records from CRM.`);
}

fetchRECrm();
