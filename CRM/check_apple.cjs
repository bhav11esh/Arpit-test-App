const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: dealerships, error } = await supabase.from('dealerships').select('*').ilike('name', '%APPLE%');
  if (error) console.error(error);
  const fs = require('fs');
  fs.writeFileSync('apple_details.json', JSON.stringify(dealerships, null, 2), 'utf8');
  console.log('Saved 8 records to apple_details.json');
}

check();
