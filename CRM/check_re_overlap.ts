import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkOverlap() {
  const link = 'https://drive.google.com/drive/folders/1mnfJuZ3kqjQwDbsEqRe7atu9dvGVt7Oz'; 
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .ilike('footage_link', `%${link}%`);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Matches for Link:', data.length);
  data.forEach(d => console.log(`Date: ${d.date}`));
}

checkOverlap();
