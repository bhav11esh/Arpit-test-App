import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function listAll() {
  const { data, error } = await supabase.from('dealerships').select('*');
  if (error) return;
  
  console.log('ALL_DEALERSHIPS:' + JSON.stringify(data));
}

listAll();
