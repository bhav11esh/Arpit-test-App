const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('photographer_mappings').select('*', { count: 'exact', head: true });
  console.log('photographer_mappings count:', data, error);
  
  const { data: cols } = await supabase.rpc('get_table_columns', { table_name: 'photographer_mappings' });
  console.log('Columns:', cols);
}

check();
