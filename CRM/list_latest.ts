import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function listLatest() {
  const { data, error } = await supabase
    .from('deliveries')
    .select('id, delivery_name, showroom_code, assigned_user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Latest 20 deliveries:');
  console.table(data);
}

listLatest();
