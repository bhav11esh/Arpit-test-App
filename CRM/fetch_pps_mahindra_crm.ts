import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function fetchCRMDATA() {
  console.log('Fetching CRM data for PPS Mahindra...');
  
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .eq('showroom_code', 'PPS_MAHINDRA');

  if (error) {
    console.error('Error fetching CRM data:', error);
    return;
  }

  fs.writeFileSync('pps_mahindra_crm.json', JSON.stringify(data, null, 2));
  console.log(`Successfully fetched ${data.length} records from CRM.`);
}

fetchCRMDATA();
