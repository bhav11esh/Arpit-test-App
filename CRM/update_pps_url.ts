import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function updateUrl() {
  const url = 'https://script.google.com/macros/s/AKfycbwUeW2SjRCo_ovUOxIcmver4dFUoFwWlneiNr4H06nDUAV7oO2vQibPPfU_EDvT3mgj7g/exec';
  const showroomCode = 'PPS_MAHINDRA';

  console.log(`Updating google_sync_url for ${showroomCode}...`);
  
  // Try updating by showroom_code if id is unknown/uuid
  const { data, error } = await supabase
    .from('dealerships')
    .update({ google_sync_url: url })
    .eq('id', '7b7adbe8-9443-4e41-996b-0442e971480f');

  if (error) {
    console.error('Error updating URL:', error);
  } else {
    console.log('Successfully updated google_sync_url.');
  }
}

updateUrl();
