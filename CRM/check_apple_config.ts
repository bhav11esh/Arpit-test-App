import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkAppleConfig() {
  console.log('Checking Apple Auto config...');
  const { data, error } = await supabase
    .from('dealerships')
    .select('*')
    .ilike('name', '%Apple Auto%')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Apple Auto Config:', data);
}

checkAppleConfig();
