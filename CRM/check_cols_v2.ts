import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkCols() {
  const { data, error } = await supabase.from('dealerships').select('*').limit(1);
  if (error) {
     console.error(error);
     return;
  }
  console.log('COLUMNS_LIST:' + Object.keys(data[0]).join(','));
}

checkCols();
