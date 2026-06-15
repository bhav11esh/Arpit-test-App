import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function deleteExtra() {
  const { data, error } = await supabase
    .from('deliveries')
    .delete()
    .eq('showroom_code', 'Nandi toyota')
    .eq('delivery_name', 'Test delivery');
    
  if (error) {
    console.error('Error deleting:', error);
  } else {
    console.log('Successfully deleted test record');
  }
}

deleteExtra();
