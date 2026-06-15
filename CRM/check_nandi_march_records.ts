import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data, error } = await supabase
    .from('deliveries')
    .select('date, delivery_name')
    .eq('showroom_code', 'NANDI_TOYOTA')
    .or('delivery_name.ilike.%jena%,delivery_name.ilike.%raman%,delivery_name.ilike.%manjunath%');
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Found records:');
  console.table(data);
}

check();
