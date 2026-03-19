import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function inspectDiscrepancies() {
  const ids = [
    '529ff4e0-e159-4064-b811-430bc07beaa9', // Row 91 (approx)
    '3687c29a-cf08-40aa-98de-e546b3bab243'  // Row 112 (approx)
  ];
  
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .in('id', ids);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Detailed Records:', JSON.stringify(data, null, 2));
}

inspectDiscrepancies();
