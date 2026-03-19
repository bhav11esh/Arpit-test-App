import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function listDealerships() {
  const { data, error } = await supabase.from('dealerships').select('*');
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.table(data.map(d => ({id: d.id, name: d.name, sheetId: d.googleSheetId})));
}

listDealerships();
