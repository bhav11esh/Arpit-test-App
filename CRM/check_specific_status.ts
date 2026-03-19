import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkSpecifics() {
  const ids = [
    'APPLE_AUTO_VOLKSWAGEN',
    'BHARAT_TOYOTA',
    'KATARIA_NEXA',
    'KTM_POPULAR',
    'NANDI_TOYOTA'
  ];

  console.log('Checking specific dealerships...');
  const { data, error } = await supabase
    .from('dealerships')
    .select('id, name, google_sync_url')
    .in('id', ids);

  if (error) {
    console.error('Error:', error);
    return;
  }

  data.forEach(d => {
    console.log(`- ID: ${d.id}, Name: ${d.name}, URL: ${d.google_sync_url || 'NULL'}`);
  });

  // Also check by name as fallback
  const names = ['Apple Auto', 'Bharat Toyota', 'Kataria Nexa', 'KTM Popular', 'Nandi Toyota'];
  const { data: data2 } = await supabase
    .from('dealerships')
    .select('id, name, google_sync_url')
    .in('name', names);

  if (data2) {
    data2.forEach(d => {
       if (!ids.includes(d.id)) {
         console.log(`- (Name Match) ID: ${d.id}, Name: ${d.name}, URL: ${d.google_sync_url || 'NULL'}`);
       }
    });
  }
}

checkSpecifics();
