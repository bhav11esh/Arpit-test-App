import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function listNullUrls() {
  console.log('Fetching dealerships with null sync URLs...');
  const { data, error } = await supabase
    .from('dealerships')
    .select('name, google_sync_url, showroom_code')
    .is('google_sync_url', null);

  if (error) {
    console.error('Error fetching dealerships:', error);
    return;
  }

  console.log('\n--- Dealerships with NULL Sync URLs ---');
  if (data.length === 0) {
    console.log('No dealerships found with null URLs.');
  } else {
    data.forEach(d => {
      console.log(`- ${d.name} (Code: ${d.showroom_code || 'N/A'})`);
    });
  }
}

listNullUrls();
