import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkFinal() {
  const ids = [
    'APPLE_AUTO_VOLKSWAGEN',
    'BHARAT_TOYOTA',
    'KATARIA_NEXA',
    'KTM_POPULAR',
    'NANDI_TOYOTA'
  ];

  const { data, error } = await supabase
    .from('dealerships')
    .select('*')
    .in('id', ids);

  if (error) return;

  data.forEach(d => {
    console.log(`DEALER_CHECK:${d.id}|${d.name}|${d.google_sync_url || 'NULL'}`);
  });
}

checkFinal();
