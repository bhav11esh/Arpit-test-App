import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function searchRE() {
  const { data, error } = await supabase
    .from('deliveries')
    .select('showroom_code, delivery_name')
    .ilike('delivery_name', '%Royal Enfield%')
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Search Result:', data);
  
  const { data: data2 } = await supabase
    .from('deliveries')
    .select('showroom_code')
    .limit(10);
  console.log('Sample Codes:', data2);
}

searchRE();
