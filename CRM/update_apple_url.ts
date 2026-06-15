import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function updateApple() {
  const url = 'https://script.google.com/macros/s/AKfycbw0iMcJa6Eyhx4r5ybp2iBHRukHIJBM4yAxp0ndNoPscjiI96aMa7Q8ZM2l3-RBb9xe/exec';
  const id = 'APPLE_AUTO_VOLKSWAGEN';

  console.log(`Updating google_sync_url for ${id}...`);
  const { data, error } = await supabase
    .from('dealerships')
    .update({ google_sync_url: url })
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Successfully updated:', data);
  }
}

updateApple();
