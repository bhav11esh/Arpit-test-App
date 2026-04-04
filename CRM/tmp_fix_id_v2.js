
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });
// Use SERVICE ROLE KEY for administrative update
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
  const correctId = '15W2h5GAgVeMPGCscmX_7izo0wB73I5IHTEeLqENMZIA';
  const dealershipId = '4e2d6e16-bb54-4071-9e75-bf55d37d6684';
  
  console.log('Attempting update with Service Role Key...');
  const { data, error } = await supabase
    .from('dealerships')
    .update({ google_sheet_id: correctId })
    .eq('id', dealershipId)
    .select();
    
  if (error) {
    console.error('Update Error:', error);
  } else {
    console.log('Update Success:', JSON.stringify(data, null, 2));
  }
}
fix();
