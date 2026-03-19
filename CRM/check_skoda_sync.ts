import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkSkodaSync() {
  const { data, error } = await supabase
    .from('dealerships')
    .select('*')
    .eq('id', 'PPS_SKODA')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('PPS Skoda Config:', data);
}

checkSkodaSync();
