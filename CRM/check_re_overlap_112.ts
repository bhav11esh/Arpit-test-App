import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkOverlap112() {
  const link = 'https://drive.google.com/drive/folders/1HHqLdvizxiw3q3jcfcqyvb3eitfgujq'; 
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .ilike('footage_link', `%${link}%`);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Matches for Link 112:', data.length);
  data.forEach(d => console.log(`Date: ${d.date}`));
}

checkOverlap112();
