import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function findAjmal() {
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .ilike('delivery_name', '%ajmal%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Found records for Ajmal:');
  console.table(data);
}

findAjmal();
