const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkDealerships() {
  const { data: dealerships, error } = await supabase
    .from('dealerships')
    .select('*')
    .ilike('name', '%Skoda%');
    
  if (error) {
    console.error('Error fetching dealerships:', error);
    return;
  }
  
  console.log('Skoda Dealerships:');
  console.log(dealerships);
  
  const { data: allDealerships } = await supabase
    .from('dealerships')
    .select('id, name, sync_url');
  console.log('\nAll Dealerships:');
  console.log(allDealerships);
}

checkDealerships();
