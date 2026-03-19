import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data } = await supabase
    .from('deliveries')
    .select('id, date, delivery_name')
    .eq('showroom_code', 'NANDI_TOYOTA')
    .eq('date', '2026-03-12');
  if (data) {
    console.log('March 12 Records:');
    data.forEach(r => console.log(`- ${r.delivery_name}`));
  }
}

check();
