import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanup() {
  const { data } = await supabase.from('deliveries').select('id, showroom_code, delivery_name').ilike('showroom_code', 'Nandi %');
  console.log('Found records:', data);
  
  if (data && data.length > 0) {
    for (const record of data) {
      if (record.showroom_code !== 'NANDI_TOYOTA') {
         console.log('Deleting extra record:', record.id, record.showroom_code);
         const { error } = await supabase.from('deliveries').delete().eq('id', record.id);
         if (error) console.error('Delete error:', error);
         else console.log('Successfully deleted');
      }
    }
  }
}

cleanup();
