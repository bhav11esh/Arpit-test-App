import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function updateSkoda() {
  const url = 'https://script.google.com/macros/s/AKfycbyqiwNwDYDPQT8Evhps6_gsPUHBNYjMhLpF-ltr72XKEIm7mH46AwDdd8lpXbCgPqcTBQ/exec';
  const id = 'b3034732-d979-4c69-861e-84d3a32adfe4'; // Skoda Karr ID

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

updateSkoda();
