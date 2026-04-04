
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDealershipData() {
  const { data, error } = await supabase
    .from('dealerships')
    .select('*')
    .ilike('name', '%Volkswagen%');

  if (error) {
    console.error('SERVER_ERROR:', error);
    return;
  }

  if (data && data.length > 0) {
    const d = data[0];
    console.log('---BEGIN_CONFIG---');
    console.log('NAME:', d.name);
    console.log('SHEET_ID:', d.google_sheet_id);
    console.log('SYNC_URL:', d.google_sync_url);
    console.log('---END_CONFIG---');
  } else {
    console.log('NOT_FOUND');
  }
}

checkDealershipData();
