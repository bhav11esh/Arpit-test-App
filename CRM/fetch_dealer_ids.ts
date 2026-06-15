import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function fetchDealers() {
  const { data, error } = await supabase
    .from('dealerships')
    .select('id, name, showroom_code');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('DEALER_INFO:' + JSON.stringify(data));
}

fetchDealers();
