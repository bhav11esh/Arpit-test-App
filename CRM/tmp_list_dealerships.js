
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function list() {
  const { data } = await supabase.from('dealerships').select('id, name, google_sheet_id');
  console.log(JSON.stringify(data, null, 2));
}
list();
