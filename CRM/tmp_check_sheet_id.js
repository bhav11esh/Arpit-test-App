
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function check() {
  const { data } = await supabase.from('dealerships').select('google_sheet_id').ilike('name', '%Volkswagen%');
  console.log('SHEET_ID_START');
  console.log(data?.[0]?.google_sheet_id);
  console.log('SHEET_ID_END');
}
check();
