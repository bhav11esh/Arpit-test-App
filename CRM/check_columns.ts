import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkSchemaVerbose() {
  const { data, error } = await supabase
    .from('dealerships')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Print keys to see all columns
  console.log('Columns:', Object.keys(data[0]));
  console.log('Sample Name:', data[0].name);
}

checkSchemaVerbose();
