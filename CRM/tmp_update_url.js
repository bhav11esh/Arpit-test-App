
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateVolkswagenUrl() {
  const newUrl = 'https://script.google.com/macros/s/AKfycbw0iMcJa6Eyhx4r5ybp2iBHRukHIJBM4yAxp0ndNoPscjiI96aMa7Q8ZM2l3-RBb9xe/exec';
  
  // 1. Find the dealership
  const { data: dealerships, error: fetchError } = await supabase
    .from('dealerships')
    .select('id, name')
    .ilike('name', '%Volkswagen%');

  if (fetchError) {
    console.error('Error fetching dealerships:', fetchError);
    return;
  }

  if (!dealerships || dealerships.length === 0) {
    console.error('No dealership found matching "Volkswagen"');
    return;
  }

  const target = dealerships[0];
  console.log(`Found dealership: ${target.name} (ID: ${target.id})`);

  // 2. Update the URL
  const { error: updateError } = await supabase
    .from('dealerships')
    .update({ google_sync_url: newUrl })
    .eq('id', target.id);

  if (updateError) {
    console.error('Error updating URL:', updateError);
    return;
  }

  console.log(`Successfully updated googleSyncUrl for ${target.name}`);
}

updateVolkswagenUrl();
