const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

let envConfig = {};
if (fs.existsSync('.env')) envConfig = { ...envConfig, ...dotenv.parse(fs.readFileSync('.env')) };
if (fs.existsSync('.env.local')) envConfig = { ...envConfig, ...dotenv.parse(fs.readFileSync('.env.local')) };

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: dealer } = await supabase
    .from('dealerships')
    .select('*')
    .ilike('name', '%Akshaya Mercedes%')
    .single();
    
  if (dealer) {
    console.log('Dealer Config:', JSON.stringify(dealer, null, 2));
    
    // Also count current records in DB
    const showroomCode = (name) => {
        const matches = name.match(/\(([^)]+)\)/);
        return matches ? matches[1].toUpperCase() : name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    };
    const code = showroomCode(dealer.name);
    const { count, error } = await supabase
      .from('deliveries')
      .select('*', { count: 'exact', head: true })
      .eq('showroom_code', code);
      
    console.log('CRM Record Count:', count);
  } else {
    console.log('Dealer not found');
  }
}

check();
