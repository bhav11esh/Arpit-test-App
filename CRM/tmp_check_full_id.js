
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function check() {
  const { data } = await supabase.from('dealerships').select('google_sheet_id').ilike('name', '%Volkswagen%');
  console.log('FULL_ID_IN_DB:', data?.[0]?.google_sheet_id);
}
check();
