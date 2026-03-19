import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function fetchSkodaCrm() {
  console.log('Fetching CRM data for SKODA_KARR...');
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .eq('showroom_code', 'SKODA_KARR');

  if (error) {
    console.error('Error fetching CRM data:', error);
    return;
  }

  fs.writeFileSync('skoda_crm.json', JSON.stringify(data, null, 2));
  console.log(`Successfully fetched ${data.length} records from CRM.`);
}

fetchSkodaCrm();
