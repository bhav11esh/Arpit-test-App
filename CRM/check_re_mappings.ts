import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkREMappings() {
  const dealershipId = '15ifWqj2hJDFPvP-n8_HSh-wE-xmz7y72l5K'; 
  const { data, error } = await supabase
    .from('mappings')
    .select('*')
    .eq('dealershipId', dealershipId);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('RE Mappings:', data);
}

checkREMappings();
