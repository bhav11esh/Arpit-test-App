import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function listNonStandard() {
  const { data, error } = await supabase
    .from('deliveries')
    .select('id, delivery_name, showroom_code, assigned_user_id, created_at')
    .neq('showroom_code', 'NANDI_TOYOTA');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Non-standard showroom deliveries:');
  console.table(data);
}

listNonStandard();
