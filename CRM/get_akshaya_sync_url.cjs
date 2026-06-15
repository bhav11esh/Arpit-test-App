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
    .select('google_sync_url')
    .ilike('name', '%Akshaya Mercedes%')
    .single();
    
  if (dealer) {
    console.log('AKSHAYA_SYNC_URL:' + dealer.google_sync_url);
  } else {
    console.log('Dealer not found');
  }
}

check();
