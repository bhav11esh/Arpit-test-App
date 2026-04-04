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
    .select('google_sheet_id')
    .ilike('name', '%Akshaya Mercedes%')
    .single();
    
  if (dealer) {
    console.log('AKSHAYA_SHEET_ID_START:' + dealer.google_sheet_id.substring(0, 20));
    console.log('AKSHAYA_SHEET_ID_END:' + dealer.google_sheet_id.substring(20));
  } else {
    console.log('Dealer not found');
  }
}

check();
