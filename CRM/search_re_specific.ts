import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function searchSpecificId() {
  const footageId = '1OVXgGdOfY-M7vA096n_q9Z-N38OAsZid'; 
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .ilike('footage_link', `%${footageId}%`);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Specific Search Result:', data);
}

searchSpecificId();
