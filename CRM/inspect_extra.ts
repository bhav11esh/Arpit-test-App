import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function inspectExtra() {
  const { data, error } = await supabase.from('deliveries').select('*').eq('showroom_code', 'Nandi toyota');
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Extra Record Info:');
  console.log(JSON.stringify(data, null, 2));
}

inspectExtra();
