const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: 'C:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function printMalliModel() {
  const pId = 'bc268775-f79f-4400-b10b-bea4ba1dc762'; // Mallikarjun
  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, role, payout_model, fixed_start_date, fixed_end_date')
    .eq('id', pId)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('--- MALLIKARJUN USER DETAILS ---');
  console.log(user);
}

printMalliModel();
