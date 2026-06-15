
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDealershipData() {
  const { data, error } = await supabase
    .from('dealerships')
    .select('*')
    .ilike('name', '%Volkswagen%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Dealership Data:');
  console.log(JSON.stringify(data, null, 2));
}

checkDealershipData();
