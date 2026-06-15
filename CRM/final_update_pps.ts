import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function finalUpdate() {
  const url = 'https://script.google.com/macros/s/AKfycbwUeW2SjRCo_ovUOxIcmver4dFUoFwWlneiNr4H06nDUAV7oO2vQibPPfU_EDvT3mgj7g/exec';
  const id = '7b7adbe8-9443-4e41-996b-0442e971480f';

  console.log(`Setting URL for ID ${id}...`);
  const { data, error } = await supabase
    .from('dealerships')
    .update({ google_sync_url: url })
    .eq('id', id)
    .select();

  if (error) {
    console.error('Update Error:', JSON.stringify(error, null, 2));
  } else {
    console.log('Update Success! Result:', JSON.stringify(data, null, 2));
  }
}

finalUpdate().catch(e => console.error('Caught Exception:', e));
