const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: 'C:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllMappings() {
  const { data: dealerships } = await supabase.from('dealerships').select('id, name');
  const { data: mappings } = await supabase.from('mappings').select('*');
  const { data: users } = await supabase.from('users').select('id, name');

  const userMap = {};
  users.forEach(u => { userMap[u.id] = u.name; });

  const dealerMap = {};
  dealerships.forEach(d => { dealerMap[d.id] = d.name; });

  console.log('--- DEALERSHIP TO PHOTOGRAPHER MAPPINGS ---');
  mappings.forEach(m => {
    console.log(`Dealer: ${dealerMap[m.dealership_id]} | Photog: ${userMap[m.photographer_id]} | Type: ${m.mapping_type}`);
  });
}

checkAllMappings();
