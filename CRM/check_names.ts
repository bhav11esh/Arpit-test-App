import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkNames() {
  const { data, error } = await supabase.from('dealerships').select('name');
  if (error) return;
  console.log('NAMES_LIST:' + JSON.stringify(data.map(d => d.name)));
}

checkNames();
