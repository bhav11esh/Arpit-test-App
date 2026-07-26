const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: 'C:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function printForgiven() {
  const { data: forgiven, error } = await supabase
    .from('penalty_forgiveness')
    .select('*');

  if (error) {
    console.error('Error fetching penalty forgiveness:', error);
    return;
  }

  console.log('--- PENALTY FORGIVENESS RECORDS ---');
  console.table(forgiven);
}

printForgiven();
