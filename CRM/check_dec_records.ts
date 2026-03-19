import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function checkDec() {
  const { data, error } = await supabase
    .from('deliveries')
    .select('id, date, delivery_name')
    .eq('showroom_code', 'NANDI_TOYOTA')
    .in('date', ['2026-12-02', '2026-12-03']);
    
  if (data) {
    console.log('Records on Dec 2 and 3:');
    data.forEach(r => console.log(`${r.date}: ${r.delivery_name}`));
  }
}

checkDec();
