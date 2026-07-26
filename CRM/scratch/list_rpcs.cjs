const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function listRpcs() {
  const { data, error } = await supabase
    .from('pgrst_rpc')
    .select('*');
    
  if (error) {
    console.log('Error querying pgrst_rpc:', error.message);
    
    // Try querying a basic table
    const { data: data2, error: error2 } = await supabase.rpc('get_table_info', { table_name: 'users' });
    if (error2) {
      console.log('Error calling get_table_info:', error2.message);
    } else {
      console.log('get_table_info works! Result:', data2);
    }
    return;
  }

  console.log('pgrst_rpc works!');
  console.log(data);
}

listRpcs();
