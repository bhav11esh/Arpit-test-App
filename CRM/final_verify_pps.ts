import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function verify() {
  const url = 'https://script.google.com/macros/s/AKfycbwUeW2SjRCo_ovUOxIcmver4dFUoFwWlneiNr4H06nDUAV7oO2vQibPPfU_EDvT3mgj7g/exec';
  const id = '7b7adbe8-9443-4e41-996b-0442e971480f';

  console.log('Verifying current state...');
  const { data: initial } = await supabase.from('dealerships').select('*').eq('id', id).single();
  console.log('Initial URL:', initial.google_sync_url);

  if (initial.google_sync_url !== url) {
    console.log('Updating to:', url);
    const { error } = await supabase
      .from('dealerships')
      .update({ google_sync_url: url })
      .eq('id', id);
    if (error) console.error('Update Error:', error);
  }

  const { data: final } = await supabase.from('dealerships').select('*').eq('id', id).single();
  console.log('Final URL:', final.google_sync_url);
}

verify();
