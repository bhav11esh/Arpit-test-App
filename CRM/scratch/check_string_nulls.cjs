const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkNulls() {
  console.log('Checking for literal string "null"...');
  
  // 1. Check screenshots table
  const { data: screens, error: err1 } = await supabase
    .from('screenshots')
    .select('id, delivery_id, user_id, showroom_code')
    .limit(1000);
    
  if (err1) {
    console.error('Error fetching screenshots:', err1);
  } else {
    const stringNulls = screens.filter(s => s.delivery_id === 'null' || s.user_id === 'null' || s.showroom_code === 'null');
    console.log(`Found ${stringNulls.length} screenshots with literal "null"`);
    if (stringNulls.length > 0) {
      console.log('First 3:', stringNulls.slice(0,3));
    }
  }
}

checkNulls();
