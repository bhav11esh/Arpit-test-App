import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkSkodaRecords() {
  const { data, error } = await supabase
    .from('deliveries')
    .select('showroom_code')
    .ilike('delivery_name', '%Skoda%')
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Skoda records found with codes:', data);
  
  const { data: data2 } = await supabase
    .from('deliveries')
    .select('showroom_code')
    .ilike('footage_link', '%1uU-YZhZ0OK%')
    .limit(10);
  console.log('Skoda records found with sheet link ID:', data2);
}

checkSkodaRecords();
