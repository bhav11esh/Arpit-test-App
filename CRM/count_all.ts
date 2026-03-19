import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function countAll() {
  const { count, error } = await supabase.from('deliveries').select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Total Deliveries in DB:', count);
}

countAll();
