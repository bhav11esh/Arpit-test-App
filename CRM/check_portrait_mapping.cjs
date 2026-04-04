const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

let envConfig = {};
if (fs.existsSync('.env')) envConfig = { ...envConfig, ...dotenv.parse(fs.readFileSync('.env')) };
if (fs.existsSync('.env.local')) envConfig = { ...envConfig, ...dotenv.parse(fs.readFileSync('.env.local')) };

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log('--- CHECKING PORTRAIT SHOOT MAPPINGS ---');
  
  // Get dealership ID
  const { data: dealer } = await supabase.from('dealerships').select('id').eq('name', 'Portrait Shoot').single();
  if (!dealer) {
    console.error('Dealership not found');
    return;
  }
  
  // Get mappings
  const { data: mappings } = await supabase
    .from('mappings')
    .select('*, users(name)')
    .eq('dealership_id', dealer.id);
    
  console.log('Mappings:', JSON.stringify(mappings, null, 2));
}

check();
