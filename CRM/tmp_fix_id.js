
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fixSheetId() {
  const correctId = '15W2h5GAgVeMPGCscmX_7izo0wB73I5IHTEeLqENMZIA';
  const { data: dealerships } = await supabase.from('dealerships').select('id, name').ilike('name', '%Volkswagen%');
  
  if (dealerships && dealerships.length > 0) {
    const { error } = await supabase
      .from('dealerships')
      .update({ google_sheet_id: correctId })
      .eq('id', dealerships[0].id);
      
    if (error) console.error('Error:', error);
    else console.log('Successfully fixed Google Sheet ID for', dealerships[0].name);
  }
}
fixSheetId();
